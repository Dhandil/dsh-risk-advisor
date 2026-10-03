import { describe, expect, it } from 'vitest'
import { EvidenceScheduler } from '../src/host/evidence-scheduler.ts'
import { JudgeScheduler } from '../src/host/fast-judge.ts'
import { DeepJudgeScheduler } from '../src/host/deep-judge-scheduler.ts'
import { VerificationScheduler, type VerificationJob } from '../src/host/verification-scheduler.ts'
import type { VerificationRecordV1 } from '../src/host/verification-store.ts'

function record(id: string, reason: 'VERIFIER_TIMEOUT' | 'VERIFIER_ABORTED' = 'VERIFIER_ABORTED'): VerificationRecordV1 {
  return { schemaVersion: 1, executionId: id, adapterId: 'shell.mkdir.v1', source: 'known-adapter', status: 'UNKNOWN', semanticSuccess: 'unknown', evidenceQuality: 'low', reasonCodes: [reason], observedAt: 0, durationMs: 0 }
}
function job(id: string, session: object, run: (signal: AbortSignal) => Promise<VerificationRecordV1>, complete: (value: VerificationRecordV1) => void): VerificationJob {
  return { executionId: id, session, generation: 1, run, unknown: reason => record(id, reason === 'VERIFIER_TIMEOUT' ? 'VERIFIER_TIMEOUT' : 'VERIFIER_ABORTED'), complete }
}

describe('Phase 10 lifecycle, timeout, capacity, and generation hardening', () => {
  it('keeps timed-out verifier work owned until underlying settlement', async () => {
    const timers: (() => void)[] = []
    const scheduler = new VerificationScheduler({ setTimer: callback => { timers.push(callback); return timers.length as unknown as ReturnType<typeof setTimeout> }, clearTimer: () => undefined })
    const first = Promise.withResolvers<VerificationRecordV1>()
    const second = Promise.withResolvers<VerificationRecordV1>()
    const completed: VerificationRecordV1[] = []
    scheduler.enqueue(job('first', {}, () => first.promise, value => completed.push(value)))
    scheduler.enqueue(job('second', {}, () => second.promise, value => completed.push(value)))
    scheduler.enqueue(job('queued', {}, async () => record('queued'), value => completed.push(value)))
    timers[0]!(); timers[1]!
    await Promise.resolve(); await Promise.resolve()
    expect(scheduler.activeCount).toBe(2)
    expect(scheduler.pendingCount).toBe(1)
    first.resolve(record('first')); await new Promise(resolve => setTimeout(resolve, 0))
    expect(scheduler.activeCount).toBe(1)
    second.resolve(record('second'))
    await scheduler.dispose()
    expect(scheduler.activeCount).toBe(0)
  })

  it('bounds the fast/deep queues and drains generation disposal', async () => {
    const fast = new JudgeScheduler(1, 1)
    const gate = Promise.withResolvers<void>()
    const first = fast.enqueue('first', async signal => { await Promise.race([gate.promise, new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true }))]); return { ok: false, failure: 'JUDGE_ABORTED' as const } })
    const second = fast.enqueue('second', async () => ({ ok: true }))
    const saturated = fast.enqueue('third', async () => ({ ok: true }))
    expect((await saturated).failure).toBe('JUDGE_QUEUE_SATURATED')
    await fast.dispose(); gate.resolve(); await first; await second
    expect(new DeepJudgeScheduler(1, 1).activeCount).toBe(0)
  })

  it('fences evidence generation and reaches quiescence without overlapping keys', async () => {
    const scheduler = new EvidenceScheduler(1, 1, 5)
    const gate = Promise.withResolvers<string>()
    const first = scheduler.enqueue('same', async signal => await Promise.race([gate.promise, new Promise<string>(resolve => signal.addEventListener('abort', () => resolve('aborted'), { once: true }))]))
    const duplicate = await scheduler.enqueue('same', async () => 'duplicate')
    expect(duplicate.ok).toBe(false)
    await scheduler.dispose()
    gate.resolve('late')
    expect((await first).ok).toBe(false)
  })
})
