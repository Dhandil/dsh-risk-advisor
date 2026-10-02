import { describe, expect, it } from 'vitest'
import { VerificationScheduler, type VerificationJob } from '../src/host/verification-scheduler.ts'
import type { VerificationRecordV1 } from '../src/host/verification-store.ts'

function job(id: string, run: (signal: AbortSignal) => Promise<VerificationRecordV1>, complete: (record: VerificationRecordV1) => void): VerificationJob {
  return {
    executionId: id,
    session: {},
    generation: 1,
    run,
    unknown: reason => ({ schemaVersion: 1, executionId: id, adapterId: 'shell.mkdir.v1', source: 'known-adapter', status: 'UNKNOWN', semanticSuccess: 'unknown', evidenceQuality: 'low', reasonCodes: [reason], observedAt: 0, durationMs: 0 }),
    complete,
  }
}

describe('Phase 7 VerificationScheduler', () => {
  it('enforces two active jobs, eight pending jobs, and deterministic saturation', () => {
    const scheduler = new VerificationScheduler()
    const deferred = Array.from({ length: 10 }, () => Promise.withResolvers<VerificationRecordV1>())
    const completed: VerificationRecordV1[] = []
    for (let index = 0; index < 10; index += 1) {
      scheduler.enqueue(job(`job-${index}`, () => deferred[index]!.promise, record => completed.push(record)))
    }
    expect(scheduler.activeCount).toBe(2)
    expect(scheduler.pendingCount).toBe(8)
    scheduler.enqueue(job('saturated', async () => ({}) as never, record => completed.push(record)))
    expect(completed.at(-1)?.reasonCodes).toEqual(['VERIFIER_QUEUE_SATURATED'])
    void scheduler.dispose()
  })

  it('aborts active work on session/plugin disposal and reaches quiescence', async () => {
    const scheduler = new VerificationScheduler()
    let aborted = false
    const session = {}
    const completed: VerificationRecordV1[] = []
    const active = job('dispose', signal => new Promise(resolve => {
      if (signal.aborted) { aborted = true; resolve({} as VerificationRecordV1); return }
      signal.addEventListener('abort', () => { aborted = true; resolve({} as VerificationRecordV1) }, { once: true })
    }), record => completed.push(record))
    Object.assign(active, { session })
    scheduler.enqueue(active)
    scheduler.cancelSession(session)
    await scheduler.dispose()
    expect(aborted).toBe(true)
    expect(completed).toHaveLength(1)
    expect(scheduler.activeCount).toBe(0)
    expect(scheduler.pendingCount).toBe(0)
  })

  it('publishes timeout but keeps the underlying run and real slot owned until settle', async () => {
    const timers: (() => void)[] = []
    const scheduler = new VerificationScheduler({ setTimer: callback => { timers.push(callback); return timers.length }, clearTimer: () => {} })
    const completed: VerificationRecordV1[] = []
    const first = Promise.withResolvers<VerificationRecordV1>()
    const second = Promise.withResolvers<VerificationRecordV1>()
    const next = Promise.withResolvers<VerificationRecordV1>()
    let queuedStarted = false
    scheduler.enqueue(job('timeout-1', () => first.promise, record => completed.push(record)))
    scheduler.enqueue(job('timeout-2', () => second.promise, record => completed.push(record)))
    scheduler.enqueue(job('queued', () => { queuedStarted = true; return next.promise }, record => completed.push(record)))
    timers[0]!()
    timers[1]!()
    for (let index = 0; index < 4; index += 1) await Promise.resolve()
    expect(completed).toHaveLength(2)
    expect(completed.every(item => item.reasonCodes[0] === 'VERIFIER_TIMEOUT')).toBe(true)
    expect(scheduler.activeCount).toBe(2)
    expect(scheduler.pendingCount).toBe(1)
    first.resolve({} as VerificationRecordV1)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(queuedStarted).toBe(true)
    expect(scheduler.activeCount).toBe(2)
    expect(scheduler.pendingCount).toBe(0)
    second.resolve({} as VerificationRecordV1)
    next.resolve({} as VerificationRecordV1)
    await scheduler.dispose()
    expect(scheduler.activeCount).toBe(0)
  })

  it('fences and drains a generation before replacement work can publish', async () => {
    const scheduler = new VerificationScheduler()
    const oldRun = Promise.withResolvers<VerificationRecordV1>()
    const oldComplete: VerificationRecordV1[] = []
    scheduler.enqueue(job('old', signal => {
      signal.addEventListener('abort', () => { /* settle is controlled below */ }, { once: true })
      return oldRun.promise
    }, record => oldComplete.push(record)))
    const draining = scheduler.fenceAndDrain()
    expect(scheduler.activeCount).toBe(1)
    oldRun.resolve({} as VerificationRecordV1)
    await draining
    expect(scheduler.activeCount).toBe(0)
    expect(oldComplete).toHaveLength(1)
    await scheduler.dispose()
  })
})
