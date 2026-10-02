import { performance } from 'node:perf_hooks'
import { ExpectedEffectRegistry } from '../lib/types/host/expected-effect.js'
import { PostconditionVerifier } from '../lib/types/host/postcondition-verifier.js'
import { VerificationScheduler } from '../lib/types/host/verification-scheduler.js'

const session = { id: 'r5-p7-session', header: { cwd: 'D:\\Harness\\p7-fixture' } }
const execution = (name, args, id) => ({ name, arguments: args, callId: id, rootCallId: id, agent: { session }, signal: new AbortController().signal, token: Symbol(id) })
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

function localShell() {
  const calls = []
  return {
    calls,
    sandboxMode: undefined,
    resolve(request) { calls.push(request); return request },
    async run(spec) {
      const command = String(spec.command)
      const env = spec.env ?? {}
      if (command.includes('symbolic-ref')) return { exitCode: 0, stdout: { text: 'benchmark-branch', truncated: false }, stderr: { text: '', truncated: false } }
      if (command.includes('require.resolve')) return { exitCode: 0, stdout: { text: 'MATCHED', truncated: false }, stderr: { text: '', truncated: false } }
      if (command.includes('RA_SOURCE') && String(env.RA_SOURCE).includes('near-1MiB')) return { exitCode: 0, stdout: { text: 'MATCHED', truncated: false }, stderr: { text: '', truncated: false } }
      return { exitCode: 0, stdout: { text: 'MATCHED', truncated: false }, stderr: { text: '', truncated: false } }
    },
  }
}

async function verifierPath(name, args, samples) {
  const results = []
  for (let index = 0; index < samples; index += 1) {
    const registry = new ExpectedEffectRegistry()
    const verifier = new PostconditionVerifier(registry)
    const shell = localShell()
    verifier.attach(shell)
    const id = `${name}-${index}`
    const value = execution('bash', args(index), id)
    registry.capture(value, id)
    const started = performance.now()
    verifier.observeResult(value, { isError: false, value: { kind: 'foreground', exitCode: 0 }, content: [] })
    await new Promise(resolve => setTimeout(resolve, 0))
    const observed = verifier.store.diagnostics.get(id)
    results.push({ durationMs: performance.now() - started, status: observed?.status, semanticSuccess: observed?.semanticSuccess, shellCalls: shell.calls.length })
    await verifier.dispose()
  }
  return results
}

async function directPaths(samples) {
  const write = []; const edit = []
  for (let i = 0; i < samples; i += 1) {
    const registry = new ExpectedEffectRegistry()
    const verifier = new PostconditionVerifier(registry)
    const writeExec = execution('write', { file_path: `fixture-${i}.txt`, content: 'bounded' }, `write-${i}`)
    registry.capture(writeExec, `write-${i}`)
    let started = performance.now()
    verifier.observeResult(writeExec, { isError: false, value: { path: 'fixture', operation: 'update', before: 'old', after: 'bounded' }, content: [] })
    write.push({ durationMs: performance.now() - started, status: verifier.store.diagnostics.get(`write-${i}`)?.status })
    const editExec = execution('edit', { file_path: 'fixture.txt', old_string: 'old', new_string: 'new' }, `edit-${i}`)
    registry.capture(editExec, `edit-${i}`)
    started = performance.now()
    verifier.observeResult(editExec, { isError: false, value: { path: 'fixture', before: 'old', after: 'new' }, content: [] })
    edit.push({ durationMs: performance.now() - started, status: verifier.store.diagnostics.get(`edit-${i}`)?.status })
    await verifier.dispose()
  }
  return { write, edit }
}

async function schedulerPaths(samples) {
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
  for (const item of deferred) item.resolve(record('settled'))
  await scheduler.drain()
  await scheduler.dispose()
  return { completed: completed.length, saturated: saturated[0]?.reasonCodes?.[0], maxConcurrent: scheduler.maxConcurrent, maxPending: scheduler.maxPending }
}

async function timeoutPath() {
  let timerCallback
  const scheduler = new VerificationScheduler({
    setTimer: callback => { timerCallback = callback; return 1 },
    clearTimer: () => {},
  })
  const underlying = Promise.withResolvers()
  const completed = []
  scheduler.enqueue({ executionId: 'timeout', session, generation: 1, run: signal => {
    signal.addEventListener('abort', () => {}, { once: true })
    return underlying.promise
  }, unknown: reason => record('timeout', 'UNKNOWN', reason), complete: value => completed.push(value) })
  await Promise.resolve()
  timerCallback()
  await Promise.resolve()
  const activeAfterTimeout = scheduler.activeCount
  underlying.resolve(record('timeout-late'))
  await scheduler.drain()
  await scheduler.dispose()
  return { published: completed[0]?.reasonCodes?.[0], activeAfterTimeout }
}

export async function main({ smoke = true } = {}) {
  const samples = smoke ? 1 : 4
  return Object.freeze({
    run: Object.freeze({ benchmark: 'R5_PHASE7_LOCAL_VERIFIER', mode: smoke ? 'SMOKE' : 'FULL', samples, labels: ['LOCAL_VERIFIER_ONLY', 'NETWORK_NOT_USED', 'PROVIDER_NOT_USED'], testedAt: new Date().toISOString() }),
    direct: await directPaths(samples),
    paths: Object.freeze({
      mkdir: await verifierPath('mkdir', i => ({ command: `mkdir benchmark-dir-${i}`, description: 'local benchmark' }), samples),
      copy: await verifierPath('copy', () => ({ command: 'cp source.txt destination.txt', description: 'local benchmark' }), samples),
      copyNear1MiB: await verifierPath('copy-near-1MiB', () => ({ command: 'cp near-1MiB-source near-1MiB-destination', description: 'local benchmark' }), samples),
      git: await verifierPath('git', () => ({ command: 'git switch benchmark-branch', description: 'local benchmark' }), samples),
      package: await verifierPath('package', () => ({ command: 'pnpm add benchmark-local', description: 'local benchmark' }), samples),
    }),
    scheduler: await schedulerPaths(samples),
    timeout: await timeoutPath(),
    nonClaims: Object.freeze({ provider: 'PROVIDER_NOT_USED', network: 'NETWORK_NOT_USED', registry: 'NETWORK_NOT_USED' }),
  })
}
