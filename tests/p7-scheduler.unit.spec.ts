import { describe, expect, it, vi } from 'vitest'
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

  it('turns timeout into UNKNOWN and fences late completion', async () => {
    vi.useFakeTimers()
    try {
      const scheduler = new VerificationScheduler()
      const completed: VerificationRecordV1[] = []
      scheduler.enqueue(job('timeout', () => new Promise(() => {}), record => completed.push(record)))
      await vi.advanceTimersByTimeAsync(5000)
      expect(completed).toHaveLength(1)
      expect(completed[0]!.reasonCodes).toEqual(['VERIFIER_TIMEOUT'])
      await scheduler.dispose()
    } finally {
      vi.useRealTimers()
    }
  })
})
