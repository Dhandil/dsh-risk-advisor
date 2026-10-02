import { describe, expect, it } from 'vitest'
import { DeepJudgeScheduler } from '../src/host/deep-judge-scheduler.ts'
import { executeDeepJudge, normalizeDeepJudgeConfig } from '../src/host/deep-judge.ts'
import type { DeepJudgeSubagentRuntimeLike } from '../src/host/deep-judge-subagent.ts'

const capabilities = Object.freeze({ agentOptions: true, outputSchema: true, depthLimit: true, toolFilter: true, persona: true })

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

  it('holds the active slot through an abort-ignoring late start and late disposal', async () => {
    let release!: () => void
    const startGate = new Promise<void>(resolve => { release = resolve })
    let disposed = 0
    const runtime: DeepJudgeSubagentRuntimeLike = {
      getProvider: () => ({ name: 'spawn', capabilities, inheritsParentContext: false }),
      start: async () => {
        await startGate
        return { result: Promise.resolve({ stopReason: 'completed', structured: {} }), dispose: async () => { disposed += 1 } }
      },
    }
    const config = normalizeDeepJudgeConfig({ enabled: true, isolationMode: 'trusted-parent-composition', timeoutMs: 10 })
    const scheduler = new DeepJudgeScheduler(1, 1)
    const first = scheduler.enqueue('late', signal => executeDeepJudge(runtime, {}, '{}', ['AUTHORIZATION'], new Set(), config, signal))
    await new Promise(resolve => setTimeout(resolve, 25))
    let firstSettled = false
    void first.then(() => { firstSettled = true })
    const queued = scheduler.enqueue('queued', async () => ({ ok: true as const }))
    expect(scheduler.activeCount).toBe(1)
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(firstSettled).toBe(false)
    release()
    await expect(first).resolves.toMatchObject({ ok: false, failure: 'DEEP_JUDGE_TIMEOUT' })
    expect(disposed).toBe(1)
    await expect(queued).resolves.toMatchObject({ ok: true })
    await scheduler.dispose()
  })
})
