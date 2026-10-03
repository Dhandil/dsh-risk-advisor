import { execFile, spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const ROOT = resolve(process.cwd())
const PINNED_HARNESS = 'ddefc45fbc7f8e46dd73185e68295696d1297887'
const HARNESS = resolve(process.env.DSH_HARNESS_PATH ?? 'D:/Harness/deepseek-harness')
const HARNESS_BIN = join(HARNESS, 'apps/cli/lib/bin.js')
const PNPM_BIN = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const RA_PACKAGE = '@dhandil/dsh-risk-advisor'
const PROBE_PACKAGE = 'phase10-r1-cold-probe'
const MARKER = 'PHASE10_R1_PROBE_SERVICE_READY'

async function runNode(args, env, cwd, timeout = 60_000) {
  try {
    const result = await execFileAsync(process.execPath, args, { cwd, env, timeout, windowsHide: true, maxBuffer: 512 * 1024 })
    return { code: 0, stdout: result.stdout.slice(0, 32_000), stderr: result.stderr.slice(0, 32_000) }
  } catch (error) {
    const value = error ?? {}
    return { code: typeof value.code === 'number' ? value.code : 1, stdout: String(value.stdout ?? '').slice(0, 32_000), stderr: String(value.stderr ?? value.message ?? error).slice(0, 32_000) }
  }
}

async function runCommand(command, args, env, cwd, timeout = 60_000) {
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

async function runNodeUntilMarker(args, env, cwd, markerFile, timeout = 60_000) {
  return await new Promise((resolveResult, rejectResult) => {
    const child = spawn(process.execPath, args, { cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''; let stderr = ''; let stopped = false
    child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8')
    child.stdout.on('data', value => { stdout += value })
    child.stderr.on('data', value => { stderr += value })
    const deadline = Date.now() + timeout
    const timer = setInterval(async () => {
      if (Date.now() >= deadline) {
        clearInterval(timer); child.kill('SIGKILL'); rejectResult(new Error(`cold process marker timeout: ${stderr.slice(0, 1000)}`)); return
      }
      if (stopped) return
      try {
        if (exactMarkerCount(await readFile(markerFile, 'utf8')) === 1) {
          stopped = true
          child.kill('SIGTERM')
        }
      } catch { /* marker is not ready yet */ }
    }, 20)
    child.on('error', error => { clearInterval(timer); rejectResult(error) })
    child.on('close', (code, signal) => {
      clearInterval(timer)
      if (code === 0 || (stopped && signal === 'SIGTERM')) resolveResult({ code: 0, stdout: stdout.slice(0, 32_000), stderr: stderr.slice(0, 32_000) })
      else resolveResult({ code: typeof code === 'number' ? code : 1, stdout: stdout.slice(0, 32_000), stderr: stderr.slice(0, 32_000) })
    })
  })
}

function environment(home, guard, marker, violations) {
  return {
    ...process.env,
    DSH_HOME: home,
    PHASE10_MARKER_FILE: marker,
    PHASE10_NETWORK_VIOLATION_FILE: violations,
    NODE_OPTIONS: `--require=${guard.replaceAll('\\', '/')}`,
    COREPACK_ENABLE_NETWORK: '0', PNPM_CONFIG_OFFLINE: 'true', npm_config_offline: 'true', npm_config_registry: 'http://127.0.0.1:9',
    DSH_TELEMETRY_DISABLED: '1', CI: '1', NO_PROXY: '*', no_proxy: '*',
  }
}

async function gitOutput(args) {
  const result = await runCommand('git', ['-C', HARNESS, ...args], { ...process.env, GIT_TERMINAL_PROMPT: '0' }, HARNESS, 15_000)
  if (result.code !== 0) throw new Error(`local Harness git check failed: ${result.stderr.slice(0, 1000)}`)
  return result.stdout.trim()
}

async function verifyHarnessCheckout() {
  const head = await gitOutput(['rev-parse', 'HEAD'])
  const tracked = await gitOutput(['status', '--porcelain', '--untracked-files=no'])
  if (head !== PINNED_HARNESS) throw new Error(`Harness checkout SHA ${head} is not pinned ${PINNED_HARNESS}`)
  if (tracked.length !== 0) throw new Error('Harness checkout has tracked modifications')
  return { sha: head, trackedMutations: 0, source: 'local-git-only' }
}

async function writeNetworkGuard(file) {
  await writeFile(file, `const fs = require('node:fs');
const violation = (kind, value) => { try { fs.appendFileSync(process.env.PHASE10_NETWORK_VIOLATION_FILE, JSON.stringify({ kind, value: String(value ?? '') }) + '\\n') } catch {} };
const loopback = value => { try { const parsed = new URL(typeof value === 'string' ? value : 'http://' + (value?.host ?? value?.hostname ?? '')); return ['127.0.0.1', '::1', 'localhost'].includes(parsed.hostname) } catch { return false } };
const http = require('node:http'); const https = require('node:https'); const net = require('node:net');
for (const [owner, key] of [[http, 'request'], [https, 'request']]) { const original = owner[key]; owner[key] = function guardedRequest(...args) { const target = args[0]; if (!loopback(typeof target === 'string' ? target : target?.href ?? target)) { violation(key, target); throw new Error('phase10 external HTTP denied') } return original.apply(this, args) } }
const connect = net.connect; net.connect = function guardedConnect(...args) { const target = args[0]; const host = typeof target === 'object' ? target?.host ?? target?.hostname : typeof args[1] === 'string' ? args[1] : target; if (!['127.0.0.1', '::1', 'localhost', undefined].includes(host)) { violation('connect', host); throw new Error('phase10 external socket denied') } return connect.apply(this, args) };
globalThis.fetch = async (...args) => { if (!loopback(args[0])) { violation('fetch', args[0]); throw new Error('phase10 external fetch denied') } throw new Error('phase10 fetch denied in cold proof') };
`, 'utf8')
}

async function readProfileFacts(home) {
  const profile = join(home, 'profiles', 'phase10', 'package.json')
  const raw = JSON.parse(await readFile(profile, 'utf8'))
  const bundles = Array.isArray(raw?.dsh?.profile?.bundles) ? raw.dsh.profile.bundles : []
  return Object.freeze({
    riskAdvisorBundleCount: bundles.filter(value => value === RA_PACKAGE).length,
    probeBundleCount: bundles.filter(value => value === PROBE_PACKAGE).length,
    bundleNames: Object.freeze([...bundles]),
    serialized: JSON.stringify({ dependencies: raw.dependencies ?? {}, bundles }),
  })
}

function exactMarkerCount(value) { return value.split(MARKER).length - 1 }

function assertBoot(name, result, markerFile, violations, home) {
  if (result.code !== 0) throw new Error(`${name} failed with exit ${result.code}: stdout=${result.stdout.slice(0, 2000)} stderr=${result.stderr.slice(0, 2000)}`)
  const combined = `${result.stdout}\n${result.stderr}`
  if (combined.includes(home)) throw new Error(`${name} leaked disposable profile path`)
  const markerText = result.stdout + result.stderr
  if (exactMarkerCount(markerText) !== 0) throw new Error(`${name} leaked marker to process output`)
  return { code: result.code, markerFile, stdoutBytes: result.stdout.length, stderrBytes: result.stderr.length, violationBytes: violations }
}

export async function main() {
  const harness = await verifyHarnessCheckout()
  const temp = await mkdtemp(join(ROOT, '.phase10-cold-'))
  const home = join(temp, 'dsh-home')
  const probeDir = join(temp, 'probe-package')
  const marker = join(temp, 'marker.log')
  const violations = join(temp, 'network-violations.log')
  const guard = join(temp, 'network-guard.cjs')
  try {
    await writeNetworkGuard(guard)
    await mkdir(probeDir, { recursive: true })
    await writeFile(join(probeDir, 'probe.mjs'), `import { appendFileSync } from 'node:fs'\nexport const name = 'phase10-r1-cold-probe'\nexport const inject = ['riskAdvisorAssessments']\nexport function apply(ctx) {\n  if (ctx.get('riskAdvisorAssessments', false) === undefined) throw new Error('risk advisor service unavailable')\n  appendFileSync(process.env.PHASE10_MARKER_FILE, '${MARKER}\\n')\n  ctx.effect(() => () => undefined, 'phase10-r1-cold-probe-lifecycle')\n}\n`, 'utf8')
    await writeFile(join(probeDir, 'cordis.patch.yml'), `- insert:\n    - id: phase10-r1-cold-probe\n      name: ${JSON.stringify(pathToFileURL(join(probeDir, 'probe.mjs')).href)}\n`, 'utf8')
    await writeFile(join(probeDir, 'package.json'), JSON.stringify({ name: PROBE_PACKAGE, version: '0.0.0', type: 'module', files: ['probe.mjs', 'cordis.patch.yml'], dsh: { bundle: { patch: './cordis.patch.yml' } } }, null, 2), 'utf8')
    const packEnvironment = { ...process.env, COREPACK_ENABLE_NETWORK: '0', PNPM_CONFIG_OFFLINE: 'true', npm_config_offline: 'true', DSH_TELEMETRY_DISABLED: '1', CI: '1' }
    const packed = await runCommand(PNPM_BIN, ['pack', '--pack-destination', temp], packEnvironment, ROOT)
    if (packed.code !== 0) throw new Error(`offline Risk Advisor pack failed: ${packed.stdout.slice(0, 1000)} ${packed.stderr.slice(0, 2000)}`)
    const probePacked = await runCommand(PNPM_BIN, ['pack', '--pack-destination', temp], packEnvironment, probeDir)
    if (probePacked.code !== 0) throw new Error(`offline probe pack failed: ${probePacked.stdout.slice(0, 1000)} ${probePacked.stderr.slice(0, 2000)}`)
    const tarballs = await readdir(temp)
    const packageTarball = tarballs.find(item => item.includes('dsh-risk-advisor') && item.endsWith('.tgz'))
    const probeTarball = tarballs.find(item => item.startsWith('phase10-r1-cold-probe-') && item.endsWith('.tgz'))
    if (packageTarball === undefined || probeTarball === undefined) throw new Error('offline packs did not produce both tarballs')
    const packagePath = join(temp, packageTarball)
    const probePath = join(temp, probeTarball)
    const install = await runNode([HARNESS_BIN, 'plugin', '--profile', 'phase10', 'add', packagePath, probePath], environment(home, guard, marker, violations), HARNESS)
    if (install.code !== 0) throw new Error(`external offline bundle install failed: ${install.stderr.slice(0, 2000)}`)
    const before = await readProfileFacts(home)
    if (before.riskAdvisorBundleCount !== 1 || before.probeBundleCount !== 1) throw new Error(`profile bundle list is not exact: ${JSON.stringify(before.bundleNames)}`)
    await writeFile(marker, '', 'utf8'); await writeFile(violations, '', 'utf8')
    const bootArgs = [HARNESS_BIN, '--profile', 'phase10', '--help']
    const processA = await runNodeUntilMarker(bootArgs, environment(home, guard, marker, violations), HARNESS, marker)
    const markerA = exactMarkerCount(await readFile(marker, 'utf8'))
    if (markerA !== 1) throw new Error(`cold process A activation marker count was ${markerA}`)
    assertBoot('cold process A', processA, marker, 0, home)
    await writeFile(marker, '', 'utf8')
    const processB = await runNodeUntilMarker(bootArgs, environment(home, guard, marker, violations), HARNESS, marker)
    const markerB = exactMarkerCount(await readFile(marker, 'utf8'))
    if (markerB !== 1) throw new Error(`cold process B activation marker count was ${markerB}`)
    assertBoot('cold process B', processB, marker, 0, home)
    const violationText = await readFile(violations, 'utf8')
    if (violationText.length !== 0) throw new Error(`cold proof observed denied external network activity: ${violationText.slice(0, 1000)}`)
    const after = await readProfileFacts(home)
    if (after.serialized !== before.serialized) throw new Error('cold restart changed persisted profile bundle state')
    return Object.freeze({ schema: 'dsh-risk-advisor.phase10.cold-start.v2', evidenceClass: 'REAL_PINNED_RUNTIME', install: 'PASS', processA: 'PASS', processB: 'PASS', activationMarkerA: markerA, activationMarkerB: markerB, riskAdvisorBundleCountA: before.riskAdvisorBundleCount, riskAdvisorBundleCountB: after.riskAdvisorBundleCount, probeBundleCountA: before.probeBundleCount, probeBundleCountB: after.probeBundleCount, samePersistedProfile: true, networkGuardViolations: 0, providerCalls: 0, externalNetworkCalls: 0, registryCalls: 0, gitRemoteCalls: 0, harnessTrackedMutations: 0, harnessVerifiedSha: harness.sha })
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
}

if (process.env.VITEST !== 'true') process.stdout.write(`${JSON.stringify(await main(), null, 2)}\n`)
