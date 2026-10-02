import { describe, expect, it } from 'vitest'
import { DeepJudgeScheduler } from '../src/host/deep-judge-scheduler.ts'

describe('Phase 9 scheduler lifecycle', () => {
  it('keeps duplicate keys fenced, bounds saturation, and drains on dispose', async () => {
    const scheduler = new DeepJudgeScheduler(1, 1)
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const run = async (signal: AbortSignal) => { await Promise.race([gate, new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true }))]); return { ok: true } as const }
    const first = scheduler.enqueue('a', run)
    await new Promise(resolve => setTimeout(resolve, 0))
    const duplicate = await scheduler.enqueue('a', run)
    expect(duplicate).toMatchObject({ ok: false, failure: 'DEEP_JUDGE_SUPERSEDED' })
    const second = scheduler.enqueue('b', run)
    const third = await scheduler.enqueue('c', run)
    expect(third).toMatchObject({ ok: false, failure: 'DEEP_JUDGE_QUEUE_SATURATED' })
    await scheduler.dispose()
    release()
    await expect(first).resolves.toMatchObject({ ok: true })
    await expect(second).resolves.toMatchObject({ ok: false, failure: 'DEEP_JUDGE_GENERATION_DISPOSED' })
    expect(scheduler.activeCount).toBe(0)
  })

  it('cancellation aborts the owned job and quiesces before disposal returns', async () => {
    const scheduler = new DeepJudgeScheduler(1, 0)
    let settled = false
    const result = scheduler.enqueue('cancel', signal => new Promise(resolve => signal.addEventListener('abort', () => { settled = true; resolve({ ok: false, failure: 'DEEP_JUDGE_ABORTED' as const }) }, { once: true })))
    await new Promise(resolve => setTimeout(resolve, 0))
    scheduler.cancel('cancel', 'DEEP_JUDGE_NATIVE_DECISION')
    await expect(result).resolves.toMatchObject({ ok: false, failure: 'DEEP_JUDGE_ABORTED' })
    expect(settled).toBe(true)
    await scheduler.dispose()
  })
})
