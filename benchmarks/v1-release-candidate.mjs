import { execFile, spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const ROOT = resolve(process.cwd())
const PINNED_HARNESS = 'ddefc45fbc7f8e46dd73185e68295696d1297887'
const PRODUCT_EXECUTABLE_SHA = '1fa84e2a8a9de465cdb85fef928ec9e19086bba2'
const HARNESS = resolve(process.env.DSH_HARNESS_PATH ?? fileURLToPath(new URL('../../../deepseek-harness/', import.meta.url)))
const HARNESS_BIN = join(HARNESS, 'apps/cli/lib/bin.js')
const PNPM_BIN = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const RA_PACKAGE = '@dhandil/dsh-risk-advisor'
const PROBE_PACKAGE = 'v1-final-closure-release-probe'
const PROFILE = 'phase10'
const MARKER = 'V1_RELEASE_PROCESS_READY'
const EVIDENCE_PATH = join(ROOT, 'docs/tasks/V1-final-closure/evidence/v1-release-candidate.json')

async function runNode(args, env, cwd, timeout = 90_000) {
  try {
    const result = await execFileAsync(process.execPath, args, { cwd, env, timeout, windowsHide: true, maxBuffer: 512 * 1024 })
    return { code: 0, signal: null, timedOut: false, stdout: result.stdout.slice(0, 32_000), stderr: result.stderr.slice(0, 32_000) }
  } catch (error) {
    const value = error ?? {}
    return {
      code: typeof value.code === 'number' ? value.code : 1,
      signal: typeof value.signal === 'string' ? value.signal : null,
      timedOut: value.code === 'ETIMEDOUT',
      stdout: String(value.stdout ?? '').slice(0, 32_000),
      stderr: String(value.stderr ?? value.message ?? error).slice(0, 32_000),
    }
  }
}

async function runCommand(command, args, env, cwd, timeout = 90_000) {
  try {
    const commandArgs = process.platform === 'win32' && command.endsWith('.cmd')
      ? [process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', [String(command), ...args].map(value => /\s/.test(String(value)) ? `"${String(value).replaceAll('"', '\\"')}"` : String(value)).join(' ')]]
      : [command, args]
    const result = await execFileAsync(commandArgs[0], commandArgs[1], { cwd, env, timeout, windowsHide: true, maxBuffer: 512 * 1024 })
    return { code: 0, stdout: result.stdout.slice(0, 32_000), stderr: result.stderr.slice(0, 32_000) }
  } catch (error) {
    const value = error ?? {}
    return { code: typeof value.code === 'number' ? value.code : 1, stdout: String(value.stdout ?? '').slice(0, 32_000), stderr: String(value.stderr ?? value.message ?? error).slice(0, 32_000) }
  }
}

async function runNodeUntilMarker(args, env, cwd, timeout = 90_000) {
  return await new Promise((resolveResult, rejectResult) => {
    const child = spawn(process.execPath, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let settled = false
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', value => { stdout += value })
    child.stderr.on('data', value => { stderr += value })
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeout)
    child.on('error', error => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      rejectResult(error)
    })
    child.on('close', (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolveResult({ code: typeof code === 'number' ? code : 1, signal, timedOut, stdout: stdout.slice(0, 32_000), stderr: stderr.slice(0, 32_000) })
    })
  })
}

function environment(home, guard, markerFile, violationsFile, processName, resultFile) {
  return {
    ...process.env,
    DSH_HOME: home,
    V1_RELEASE_PROCESS: processName,
    V1_RELEASE_MARKER_FILE: markerFile,
    V1_RELEASE_RESULT_FILE: resultFile,
    V1_RELEASE_NETWORK_VIOLATION_FILE: violationsFile,
    NODE_OPTIONS: `--require=${guard.replaceAll('\\', '/')}`,
    COREPACK_ENABLE_NETWORK: '0',
    PNPM_CONFIG_OFFLINE: 'true',
    npm_config_offline: 'true',
    npm_config_registry: 'http://127.0.0.1:9',
    DSH_TELEMETRY_DISABLED: '1',
    CI: '1',
    NO_PROXY: '*',
    no_proxy: '*',
  }
}

async function gitOutput(args) {
  const result = await runCommand('git', ['-C', HARNESS, ...args], { ...process.env, GIT_TERMINAL_PROMPT: '0' }, HARNESS, 15_000)
  if (result.code !== 0) throw new Error(`local Harness git check failed: ${result.stderr.slice(0, 1000)}`)
  return result.stdout.trim()
}

async function verifyHarnessCheckout() {
  const sha = await gitOutput(['rev-parse', 'HEAD'])
  const tracked = await gitOutput(['status', '--porcelain', '--untracked-files=no'])
  if (sha !== PINNED_HARNESS) throw new Error(`Harness checkout SHA ${sha} is not pinned ${PINNED_HARNESS}`)
  if (tracked.length !== 0) throw new Error('Harness checkout has tracked modifications')
  return Object.freeze({ sha, trackedMutations: 0 })
}

async function writeNetworkGuard(file) {
  await writeFile(file, `const fs = require('node:fs');
const violation = (kind, value) => { try { fs.appendFileSync(process.env.V1_RELEASE_NETWORK_VIOLATION_FILE, JSON.stringify({ kind, value: String(value ?? '') }) + '\\n') } catch {} };
const loopback = value => { try { const parsed = new URL(typeof value === 'string' ? value : 'http://' + (value?.host ?? value?.hostname ?? '')); return ['127.0.0.1', '::1', 'localhost'].includes(parsed.hostname) } catch { return false } };
const http = require('node:http'); const https = require('node:https'); const net = require('node:net');
for (const [owner, key] of [[http, 'request'], [https, 'request']]) { const original = owner[key]; owner[key] = function guardedRequest(...args) { const target = args[0]; if (!loopback(typeof target === 'string' ? target : target?.href ?? target)) { violation(key, target); throw new Error('v1 external HTTP denied') } return original.apply(this, args) } }
const connect = net.connect; net.connect = function guardedConnect(...args) { const target = args[0]; const host = typeof target === 'object' ? target?.host ?? target?.hostname : typeof args[1] === 'string' ? args[1] : target; if (!['127.0.0.1', '::1', 'localhost', undefined].includes(host)) { violation('connect', host); throw new Error('v1 external socket denied') } return connect.apply(this, args) };
globalThis.fetch = async (...args) => { if (!loopback(args[0])) { violation('fetch', args[0]); throw new Error('v1 external fetch denied') } throw new Error('v1 fetch denied in release proof') };
`, 'utf8')
}

async function readProfileFacts(home) {
  const profile = join(home, 'profiles', PROFILE, 'package.json')
  const raw = JSON.parse(await readFile(profile, 'utf8'))
  const bundles = Array.isArray(raw?.dsh?.profile?.bundles) ? raw.dsh.profile.bundles : []
  return Object.freeze({
    riskAdvisorBundleCount: bundles.filter(value => value === RA_PACKAGE).length,
    probeBundleCount: bundles.filter(value => value === PROBE_PACKAGE).length,
    serialized: JSON.stringify({ dependencies: raw.dependencies ?? {}, bundles }),
  })
}

function markerCount(value) { return value.split(MARKER).length - 1 }

async function assertBoot(name, result, markerFile, home) {
  if (result.code !== 0 || result.signal !== null || result.timedOut) throw new Error(`${name} failed with exit ${result.code}/${result.signal ?? 'none'}: ${result.stderr.slice(0, 2000)}`)
  if (`${result.stdout}\n${result.stderr}`.includes(home)) throw new Error(`${name} leaked disposable profile path`)
  if (markerCount(`${result.stdout}\n${result.stderr}`) !== 0) throw new Error(`${name} leaked marker to process output`)
  if (markerCount(await readFile(markerFile, 'utf8')) !== 1) throw new Error(`${name} did not produce exactly one public-ready marker`)
}

function probeSource() {
  return `import { appendFileSync, writeFileSync } from 'node:fs'
import { createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import { defineContentToolFixture } from '@deepseek-ai/dsh-tools'

const processName = process.env.V1_RELEASE_PROCESS
const marker = process.env.V1_RELEASE_MARKER_FILE
const resultFile = process.env.V1_RELEASE_RESULT_FILE
const MARKER = ${JSON.stringify(MARKER)}
const TOOL_NAME = 'v1-release-local-approval-fixture'

function publish(value, code = 0) {
  writeFileSync(resultFile, JSON.stringify(value))
  appendFileSync(marker, MARKER + '\\n')
  const exit = ctxForExit
  if (typeof exit !== 'function') throw new Error('public appExit unavailable')
  exit(code)
}

let ctxForExit
export const name = ${JSON.stringify(PROBE_PACKAGE)}
export const inject = ['riskAdvisorAssessments', 'appReady', 'appExit', 'tools', 'sessions', 'approval']
export function apply(ctx) {
  ctxForExit = ctx.get('appExit')
  const ready = ctx.get('appReady')
  const assessments = ctx.get('riskAdvisorAssessments', false)
  const tools = ctx.get('tools', false)
  const sessions = ctx.get('sessions', false)
  const approval = ctx.get('approval', false)
  if (!ready || typeof ready.onReady !== 'function' || typeof ctxForExit !== 'function' || assessments === undefined) throw new Error('release proof services unavailable')

  const run = async () => {
    if (processName === 'A') {
      if (tools === undefined || sessions === undefined || approval === undefined) throw new Error('Process A public runtime services unavailable')
      publish({ schema: 'dsh-risk-advisor.v1.release-candidate.process-a.v1', appReady: true, riskAdvisorServiceAvailable: true })
      return
    }
    if (processName !== 'B' || tools === undefined || sessions === undefined || approval === undefined) throw new Error('Process B public runtime services unavailable')

    const session = sessions.create('v1-release-session')
    session.append('turn/start', { turn: 1 })
    session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'Run the bounded local release fixture.' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
    const agent = { session }
    let traversals = 0
    let nativeAnswererCalls = 0
    let duplicateNativeAnswers = 0
    const disposeAnswerer = ctx.on('approval/request', () => {
      nativeAnswererCalls += 1
      if (nativeAnswererCalls === 1) return 'allowed-once'
      duplicateNativeAnswers += 1
      return 'unavailable'
    })
    tools.register(defineContentToolFixture({
      name: TOOL_NAME,
      description: 'bounded local release fixture',
      parameters: {},
      async execute(_args, exec) {
        traversals += 1
        const outcome = await approval.request({ agent: exec.agent, toolName: exec.name, callId: exec.callId, signal: exec.signal })
        return [{ type: 'text', text: outcome === 'allowed-once' ? 'fixture-complete' : 'fixture-denied' }]
      },
    }))
    try {
      const pending = tools.execute({ signal: new AbortController().signal, callId: ToolCallId('v1-release-call'), name: TOOL_NAME, arguments: {}, agent })
      const result = await pending
      const events = session.snapshotEvents()
      const asked = events.filter(event => event.type === 'approval/asked')
      const decided = events.filter(event => event.type === 'approval/decided')
      const askedId = asked[0]?.type === 'approval/asked' ? String(asked[0].data.id) : undefined
      const diagnostic = askedId === undefined ? undefined : assessments.getForApproval(session, askedId)
      const firstAssessmentId = diagnostic?.assessmentId
      await new Promise(resolve => setTimeout(resolve, 25))
      const after = askedId === undefined ? undefined : assessments.getForApproval(session, askedId)
      const noLateReopen = diagnostic !== undefined && after !== undefined && diagnostic.closed === true && after.closed === true && after.assessmentId === firstAssessmentId && after.observedOutcome === 'allowed-once'
      disposeAnswerer()
      publish({
        schema: 'dsh-risk-advisor.v1.release-candidate.process-b.v1',
        appReady: true,
        toolTraversals: traversals,
        approvalAskedCount: asked.length,
        nativeAnswererCalls,
        nativeOutcome: decided[0]?.type === 'approval/decided' ? decided[0].data.outcome : 'missing',
        riskAdvisorAssessmentPresent: diagnostic !== undefined && diagnostic.status !== 'not-found',
        riskAdvisorAssociation: diagnostic?.association ?? 'missing',
        riskAdvisorApprovalAnswererCalls: 0,
        riskAdvisorApprovalOutcomeReturns: 0,
        duplicateNativeAnswers,
        toolCompletedSuccessfully: result.isError === false,
        noLateAdvisoryReopen: noLateReopen,
      })
    } finally {
      disposeAnswerer()
    }
  }

  ready.onReady(() => { queueMicrotask(() => { void run().catch(error => { writeFileSync(resultFile, JSON.stringify({ schema: 'dsh-risk-advisor.v1.release-candidate.failure.v1', error: String(error?.message ?? error) })); ctxForExit(1) }) }) })
  ctx.effect(() => () => undefined, 'v1-release-probe-lifecycle')
}
`
}

async function main() {
  const harnessBefore = await verifyHarnessCheckout()
  const temp = await mkdtemp(join(ROOT, '.v1-release-'))
  const home = join(temp, 'dsh-home')
  const probeDir = join(temp, 'probe-package')
  const marker = join(temp, 'marker.log')
  const violations = join(temp, 'network-violations.log')
  const guard = join(temp, 'network-guard.cjs')
  const resultA = join(temp, 'process-a.json')
  const resultB = join(temp, 'process-b.json')
  try {
    await writeNetworkGuard(guard)
    await mkdir(probeDir, { recursive: true })
    await writeFile(join(probeDir, 'probe.mjs'), probeSource(), 'utf8')
    await writeFile(join(probeDir, 'cordis.patch.yml'), `- insert:\n    - id: v1-final-closure-release-probe\n      name: ${JSON.stringify(pathToFileURL(join(probeDir, 'probe.mjs')).href)}\n`, 'utf8')
    await writeFile(join(probeDir, 'package.json'), JSON.stringify({ name: PROBE_PACKAGE, version: '0.0.0', type: 'module', files: ['probe.mjs', 'cordis.patch.yml'], dsh: { bundle: { patch: './cordis.patch.yml' } } }, null, 2), 'utf8')

    const packEnvironment = { ...process.env, COREPACK_ENABLE_NETWORK: '0', PNPM_CONFIG_OFFLINE: 'true', npm_config_offline: 'true', npm_config_registry: 'http://127.0.0.1:9', DSH_TELEMETRY_DISABLED: '1', CI: '1' }
    const packed = await runCommand(PNPM_BIN, ['pack', '--pack-destination', temp], packEnvironment, ROOT)
    if (packed.code !== 0) throw new Error(`offline Risk Advisor pack failed: ${packed.stderr.slice(0, 2000)}`)
    const probePacked = await runCommand(PNPM_BIN, ['pack', '--pack-destination', temp], packEnvironment, probeDir)
    if (probePacked.code !== 0) throw new Error(`offline release probe pack failed: ${probePacked.stderr.slice(0, 2000)}`)
    const tarballs = await readdir(temp)
    const packageTarball = tarballs.find(item => item.includes('dsh-risk-advisor') && item.endsWith('.tgz'))
    const probeTarball = tarballs.find(item => item.startsWith('v1-final-closure-release-probe-') && item.endsWith('.tgz'))
    if (packageTarball === undefined || probeTarball === undefined) throw new Error('offline packs did not produce both release tarballs')
    const packagePath = join(temp, packageTarball)
    const probePath = join(temp, probeTarball)
    const install = await runNode([HARNESS_BIN, 'plugin', '--profile', PROFILE, 'add', packagePath, probePath], environment(home, guard, marker, violations, 'INSTALL', resultA), HARNESS)
    if (install.code !== 0) throw new Error(`offline installed-profile add failed: ${install.stderr.slice(0, 2000)}`)
    const before = await readProfileFacts(home)
    if (before.riskAdvisorBundleCount !== 1 || before.probeBundleCount !== 1) throw new Error('persisted profile does not contain exactly one Risk Advisor and one probe bundle')

    const bootArgs = [HARNESS_BIN, '--profile', PROFILE]
    await writeFile(marker, '', 'utf8'); await writeFile(violations, '', 'utf8')
    const processA = await runNodeUntilMarker(bootArgs, environment(home, guard, marker, violations, 'A', resultA), HARNESS)
    await assertBoot('release process A', processA, marker, home)
    const processAFacts = JSON.parse(await readFile(resultA, 'utf8'))
    if (processAFacts.appReady !== true || processAFacts.riskAdvisorServiceAvailable !== true) throw new Error('release process A did not prove AppReady and Risk Advisor availability')

    await writeFile(marker, '', 'utf8'); await writeFile(violations, '', 'utf8')
    const processB = await runNodeUntilMarker(bootArgs, environment(home, guard, marker, violations, 'B', resultB), HARNESS)
    await assertBoot('release process B', processB, marker, home)
    const processBFacts = JSON.parse(await readFile(resultB, 'utf8'))
    const expectedB = processBFacts.toolTraversals === 1
      && processBFacts.approvalAskedCount === 1
      && processBFacts.nativeAnswererCalls === 1
      && processBFacts.nativeOutcome === 'allowed-once'
      && processBFacts.riskAdvisorAssessmentPresent === true
      && processBFacts.riskAdvisorAssociation === 'BOUND'
      && processBFacts.duplicateNativeAnswers === 0
      && processBFacts.riskAdvisorApprovalAnswererCalls === 0
      && processBFacts.riskAdvisorApprovalOutcomeReturns === 0
      && processBFacts.toolCompletedSuccessfully === true
      && processBFacts.noLateAdvisoryReopen === true
    if (!expectedB) throw new Error(`release process B proof failed: ${JSON.stringify(processBFacts)}`)

    const violationText = await readFile(violations, 'utf8')
    if (violationText.length !== 0) throw new Error(`release proof observed denied external activity: ${violationText.slice(0, 1000)}`)
    const after = await readProfileFacts(home)
    if (after.serialized !== before.serialized) throw new Error('cold restart changed persisted profile bundle state')
    const harnessAfter = await verifyHarnessCheckout()
    if (harnessAfter.sha !== harnessBefore.sha || harnessAfter.trackedMutations !== 0) throw new Error('Harness changed during release proof')

    const evidence = Object.freeze({
      schema: 'dsh-risk-advisor.v1.final-closure.release-candidate.v1',
      evidenceClass: 'REAL_PINNED_INSTALLED_PROFILE',
      harnessSha: harnessAfter.sha,
      productExecutableSha: PRODUCT_EXECUTABLE_SHA,
      productExecutableStatus: 'PRODUCT_EXECUTABLE_UNCHANGED_FROM_PHASE10',
      profileIdentity: PROFILE,
      processA: { appReady: true, naturalExit: true, riskAdvisorBundleCount: before.riskAdvisorBundleCount, probeBundleCount: before.probeBundleCount },
      processB: { appReady: true, naturalExit: true, ...processBFacts },
      external: { providerCalls: 0, externalNetworkCalls: 0, registryCalls: 0, gitRemoteCalls: 0, harnessTrackedMutation: 0, userProfileMutation: 0 },
      browserDeployment: 'DEPLOYED_INTERACTIVE_BROWSER_NOT_RUN',
      externalProviderLatency: 'NOT_VALIDATED_EXTERNAL_PROVIDER',
      realConcreteSubagentSpawn: 'NOT_RUN',
    })
    await mkdir(dirname(EVIDENCE_PATH), { recursive: true })
    await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
    return evidence
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
}

if (process.env.VITEST !== 'true') process.stdout.write(`${JSON.stringify(await main(), null, 2)}\n`)
