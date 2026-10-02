import { performance } from 'node:perf_hooks'
import { ExpectedEffectRegistry } from '../lib/types/host/expected-effect.js'
import { PostconditionVerifier } from '../lib/types/host/postcondition-verifier.js'
import { VerificationScheduler } from '../lib/types/host/verification-scheduler.js'

const session = { id: 'r5-p7-session', header: { cwd: 'D:\\Harness\\p7-fixture' } }
const execution = (name, args, id) => ({ name, arguments: args, callId: id, rootCallId: id, agent: { session }, signal: new AbortController().signal, token: Symbol(id) })
const sample = (fn) => { const start = performance.now(); const result = fn(); return { durationMs: performance.now() - start, result } }

async function directPaths(samples) {
  const write = []; const edit = []
  for (let i = 0; i < samples; i += 1) {
    const registry = new ExpectedEffectRegistry()
    const verifier = new PostconditionVerifier(registry)
    const writeExec = execution('write', { file_path: `fixture-${i}.txt`, content: 'bounded' }, `write-${i}`)
    registry.capture(writeExec, `write-${i}`)
    write.push(sample(() => verifier.observeResult(writeExec, { isError: false, value: { path: 'fixture', operation: 'update', before: 'old', after: 'bounded' }, content: [] })))
    const editExec = execution('edit', { file_path: 'fixture.txt', old_string: 'old', new_string: 'new' }, `edit-${i}`)
    registry.capture(editExec, `edit-${i}`)
    edit.push(sample(() => verifier.observeResult(editExec, { isError: false, value: { path: 'fixture', before: 'old', after: 'new' }, content: [] })))
    await verifier.dispose()
  }
  return { write, edit }
}

async function schedulerPath(samples) {
  const scheduler = new VerificationScheduler()
  const completed = []
  const started = performance.now()
  for (let i = 0; i < samples; i += 1) scheduler.enqueue({
    executionId: `scheduler-${i}`,
    session,
    generation: 1,
    run: async () => ({ schemaVersion: 1, executionId: `scheduler-${i}`, adapterId: 'shell.mkdir.v1', source: 'known-adapter', status: 'MATCHED', semanticSuccess: true, evidenceQuality: 'medium', reasonCodes: ['POSTCONDITION_MATCHED'], observedAt: Date.now(), durationMs: 0 }),
    unknown: reason => ({ schemaVersion: 1, executionId: `scheduler-${i}`, adapterId: 'shell.mkdir.v1', source: 'known-adapter', status: 'UNKNOWN', semanticSuccess: 'unknown', evidenceQuality: 'low', reasonCodes: [reason], observedAt: Date.now(), durationMs: 0 }),
    complete: record => completed.push(record),
  })
  await new Promise(resolve => setTimeout(resolve, 0))
  await scheduler.dispose()
  return { elapsedMs: performance.now() - started, completed: completed.length, maxConcurrent: scheduler.maxConcurrent, maxPending: scheduler.maxPending }
}

export async function main({ smoke = true } = {}) {
  const samples = smoke ? 8 : 32
  return Object.freeze({
    run: Object.freeze({ benchmark: 'R5_PHASE7_LOCAL_VERIFIER', mode: smoke ? 'SMOKE' : 'FULL', samples, labels: ['LOCAL_VERIFIER_ONLY', 'NETWORK_NOT_USED', 'PROVIDER_NOT_USED'], testedAt: new Date().toISOString() }),
    direct: await directPaths(samples),
    scheduler: await schedulerPath(samples),
    nonClaims: Object.freeze({ provider: 'PROVIDER_NOT_USED', network: 'NETWORK_NOT_USED', registry: 'NETWORK_NOT_USED' }),
  })
}
