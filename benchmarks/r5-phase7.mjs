import { performance } from 'node:perf_hooks'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile as execFileCallback } from 'node:child_process'
import { promisify } from 'node:util'
import { ExpectedEffectRegistry } from '../lib/types/host/expected-effect.js'
import { PostconditionVerifier } from '../lib/types/host/postcondition-verifier.js'
import { VerificationScheduler } from '../lib/types/host/verification-scheduler.js'

const execFile = promisify(execFileCallback)
const MAX_BUFFER = 8192
const shellPath = value => value.replaceAll('\\', '/')
const execution = (session, name, args, id) => ({ name, arguments: args, callId: id, rootCallId: id, agent: { session }, signal: new AbortController().signal, token: Symbol(id) })
const record = (id, status = 'MATCHED', reason = 'POSTCONDITION_MATCHED') => ({
  schemaVersion: 1,
  executionId: id,
  adapterId: 'shell.mkdir.v1',
  source: 'known-adapter',
  status,
  semanticSuccess: status === 'MATCHED' ? true : 'unknown',
  evidenceQuality: 'medium',
  reasonCodes: [reason],
  observedAt: Date.now(),
  durationMs: 0,
})

function shellOutput(text, exitCode = 0) {
  return { exitCode, timedOut: false, aborted: false, stdout: { text, truncated: false }, stderr: { text: '', truncated: false } }
}

function localShell(root) {
  const calls = []
  return {
    calls,
    sandboxMode: undefined,
    resolve(request) { calls.push({ ...request }); return request },
    async run(spec) {
      const command = String(spec.command)
      const cwd = typeof spec.workdir === 'string' ? spec.workdir : root
      const env = { ...process.env, ...(spec.env ?? {}) }
      calls.at(-1).executed = true
      if (command.startsWith('node -e ')) {
        const source = JSON.parse(command.slice('node -e '.length))
        try {
          const result = await execFile(process.execPath, ['-e', source], { cwd, env, maxBuffer: MAX_BUFFER })
          return shellOutput(result.stdout)
        } catch (error) {
          return shellOutput(String(error.stdout ?? ''), typeof error.code === 'number' ? error.code : null)
        }
      }
      if (command === 'git -c core.fsmonitor=false symbolic-ref --quiet --short HEAD') {
        try {
          const result = await execFile('git', ['-c', 'core.fsmonitor=false', 'symbolic-ref', '--quiet', '--short', 'HEAD'], { cwd, env, maxBuffer: MAX_BUFFER })
          return shellOutput(result.stdout)
        } catch (error) {
          return shellOutput(String(error.stdout ?? ''), typeof error.code === 'number' ? error.code : null)
        }
      }
      throw new Error(`unexpected frozen verifier command: ${command}`)
    },
  }
}

async function runVerifierPath(root, session, name, args, fixtureBytes = 0) {
  const registry = new ExpectedEffectRegistry()
  const verifier = new PostconditionVerifier(registry)
  const shell = localShell(root)
  verifier.attach(shell)
  const id = `${name}-${Math.random().toString(16).slice(2)}`
  const value = execution(session, 'bash', args, id)
  registry.capture(value, id)
  const started = performance.now()
  verifier.observeResult(value, { isError: false, value: { kind: 'foreground', exitCode: 0 }, content: [] })
  await verifier.scheduler.drain()
  const observed = verifier.store.diagnostics.get(id)
  const result = { durationMs: performance.now() - started, status: observed?.status, semanticSuccess: observed?.semanticSuccess, checkerExecutions: shell.calls.filter(call => call.executed === true).length, fixtureBytes }
  await verifier.dispose()
  return result
}

async function directPaths(root, session, samples) {
  const write = []; const edit = []
  for (let i = 0; i < samples; i += 1) {
    const registry = new ExpectedEffectRegistry()
    const verifier = new PostconditionVerifier(registry)
    const writeExec = execution(session, 'write', { file_path: `fixture-${i}.txt`, content: 'bounded' }, `write-${i}`)
    registry.capture(writeExec, `write-${i}`)
    let started = performance.now()
    verifier.observeResult(writeExec, { isError: false, value: { path: 'fixture', operation: 'update', before: 'old', after: 'bounded' }, content: [] })
    write.push({ durationMs: performance.now() - started, status: verifier.store.diagnostics.get(`write-${i}`)?.status })
    const editExec = execution(session, 'edit', { file_path: 'fixture.txt', old_string: 'old', new_string: 'new' }, `edit-${i}`)
    registry.capture(editExec, `edit-${i}`)
    started = performance.now()
    verifier.observeResult(editExec, { isError: false, value: { path: 'fixture', before: 'old', after: 'new' }, content: [] })
    edit.push({ durationMs: performance.now() - started, status: verifier.store.diagnostics.get(`edit-${i}`)?.status })
    await verifier.dispose()
  }
  return { write, edit }
}

async function schedulerPaths(session) {
  const scheduler = new VerificationScheduler()
  const completed = []
  const deferred = Array.from({ length: 10 }, () => Promise.withResolvers())
  for (let i = 0; i < deferred.length; i += 1) scheduler.enqueue({
    executionId: `saturation-${i}`,
    session,
    generation: 1,
    run: () => deferred[i].promise,
    unknown: reason => record(`saturation-${i}`, 'UNKNOWN', reason),
    complete: value => completed.push(value),
  })
  const saturated = []
  scheduler.enqueue({ executionId: 'saturated', session, generation: 1, run: async () => record('saturated'), unknown: reason => record('saturated', 'UNKNOWN', reason), complete: value => saturated.push(value) })
  const initialCounts = { active: scheduler.activeCount, pending: scheduler.pendingCount }
  for (const item of deferred) item.resolve(record('settled'))
  await scheduler.drain()
  await scheduler.dispose()
  return { completed: completed.length, saturated: saturated[0]?.reasonCodes?.[0], maxConcurrent: scheduler.maxConcurrent, maxPending: scheduler.maxPending, initialCounts }
}

async function timeoutPath(session) {
  const scheduler = new VerificationScheduler()
  const underlying = Promise.withResolvers()
  const completed = []
  scheduler.enqueue({ executionId: 'timeout', session, generation: 1, run: signal => {
    signal.addEventListener('abort', () => {}, { once: true })
    return underlying.promise
  }, unknown: reason => record('timeout', 'UNKNOWN', reason), complete: value => completed.push(value) })
  const started = performance.now()
  await new Promise(resolve => setTimeout(resolve, 5100))
  const activeAfterTimeout = scheduler.activeCount
  const published = completed[0]?.reasonCodes?.[0]
  underlying.resolve(record('timeout-late'))
  await scheduler.drain()
  await scheduler.dispose()
  return { published, activeAfterTimeout, elapsedMs: performance.now() - started }
}

async function gitLocalFixture(root) {
  await execFile('git', ['init', '--quiet'], { cwd: root, maxBuffer: MAX_BUFFER })
  await execFile('git', ['checkout', '--quiet', '-b', 'benchmark-branch'], { cwd: root, maxBuffer: MAX_BUFFER })
  const remotes = await execFile('git', ['remote'], { cwd: root, maxBuffer: MAX_BUFFER })
  if (remotes.stdout.trim() !== '') throw new Error('benchmark repository unexpectedly has a remote')
}

async function localVerifierPaths(root, session, samples) {
  const paths = { mkdir: [], copy: [], copyNear1MiB: [], git: [], package: [] }
  for (let index = 0; index < samples; index += 1) {
    const directory = join(root, `actual-directory-${index}`)
    await mkdir(directory)
    paths.mkdir.push(await runVerifierPath(root, session, 'mkdir', { command: `mkdir actual-directory-${index}`, description: 'real local mkdir benchmark' }))

    const smallSource = join(root, `small-source-${index}.txt`)
    const smallDestination = join(root, `small-destination-${index}.txt`)
    await writeFile(smallSource, Buffer.from('small local copy'))
    await writeFile(smallDestination, Buffer.from('small local copy'))
    paths.copy.push(await runVerifierPath(root, session, 'copy', { command: `cp ${shellPath(smallSource)} ${shellPath(smallDestination)}`, description: 'real local copy benchmark' }, Buffer.byteLength('small local copy')))

    const nearSource = join(root, `near-source-${index}.bin`)
    const nearDestination = join(root, `near-destination-${index}.bin`)
    const nearBytes = Buffer.alloc(1024 * 1024 - 1, 7)
    await writeFile(nearSource, nearBytes)
    await writeFile(nearDestination, nearBytes)
    paths.copyNear1MiB.push(await runVerifierPath(root, session, 'copy-near-1MiB', { command: `cp ${shellPath(nearSource)} ${shellPath(nearDestination)}`, description: 'real local near-1MiB copy benchmark' }, nearBytes.byteLength))

    if (index === 0) await gitLocalFixture(root)
    paths.git.push(await runVerifierPath(root, session, 'git', { command: 'git switch benchmark-branch', description: 'real local Git benchmark' }))

    const packageRoot = join(root, 'node_modules', 'benchmark-local')
    await mkdir(packageRoot, { recursive: true })
    await writeFile(join(packageRoot, 'package.json'), JSON.stringify({ name: 'benchmark-local', version: '1.0.0', main: 'index.js' }))
    await writeFile(join(packageRoot, 'index.js'), 'module.exports = 1\n')
    paths.package.push(await runVerifierPath(root, session, 'package', { command: 'pnpm add benchmark-local', description: 'real local Node resolution benchmark' }))
  }
  return paths
}

export async function main({ smoke = true } = {}) {
  const samples = smoke ? 1 : 2
  const root = await mkdtemp(join(tmpdir(), 'dsh-risk-advisor-p7-'))
  const session = { id: 'r5-p7-real-local-session', header: { cwd: root } }
  try {
    return Object.freeze({
      run: Object.freeze({ benchmark: 'R5_PHASE7_REAL_LOCAL_VERIFIER', mode: smoke ? 'SMOKE' : 'FULL', samples, labels: ['LOCAL_VERIFIER_ONLY', 'NETWORK_NOT_USED', 'PROVIDER_NOT_USED'], realLocalExecution: true, testedAt: new Date().toISOString() }),
      direct: await directPaths(root, session, samples),
      paths: await localVerifierPaths(root, session, samples),
      scheduler: await schedulerPaths(session),
      timeout: await timeoutPath(session),
      nonClaims: Object.freeze({ provider: 'PROVIDER_NOT_USED', network: 'NETWORK_NOT_USED', registry: 'NETWORK_NOT_USED', gitRemote: 'GIT_REMOTE_NOT_USED' }),
    })
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}
