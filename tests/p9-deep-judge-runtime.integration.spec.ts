import { describe, expect, it } from 'vitest'
import { executeDeepJudge, normalizeDeepJudgeConfig } from '../src/host/deep-judge.ts'
import type { DeepJudgeSubagentStartRequestLike, DeepJudgeSubagentRuntimeLike, DeepJudgeSubagentRunLike } from '../src/host/deep-judge-subagent.ts'

const capabilities = Object.freeze({ agentOptions: true, outputSchema: true, depthLimit: true, toolFilter: true, persona: true })
const config = normalizeDeepJudgeConfig({ enabled: true, isolationMode: 'trusted-parent-composition', timeoutMs: 100, maxConcurrentJudges: 1, maxPendingJudges: 2, maxTokens: 128, reviewer: { provider: 'mock', model: 'local' } })

function runtime(result: unknown, requests: DeepJudgeSubagentStartRequestLike[], disposed: { count: number }): DeepJudgeSubagentRuntimeLike {
  return {
    getProvider: name => name === 'spawn' ? { name: 'spawn', capabilities, inheritsParentContext: false } : undefined,
    start: async (_name, request) => {
      requests.push(request)
      return {
        result: Promise.resolve({ structured: result, stopReason: 'stop' }),
        dispose: async () => { disposed.count += 1 },
      }
    },
  }
}

describe('Phase 9 structural public-seam integration', () => {
  it('captures exact request fields, consumes structured output, and disposes the run', async () => {
    const requests: DeepJudgeSubagentStartRequestLike[] = []
    const disposed = { count: 0 }
    const result = { schemaVersion: 1, results: [{ dimension: 'AUTHORIZATION', verdict: 'EXPLICITLY_AUTHORIZED', rationale: 'bounded', referencedFeatureIds: ['authorization.goalKnown'] }], suggestedAlternatives: [] }
    const value = await executeDeepJudge(runtime(result, requests, disposed), { liveAgent: true }, '{"bounded":true}', ['AUTHORIZATION'], new Set(['authorization.goalKnown']), config, new AbortController().signal)
    expect(value.ok).toBe(true)
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({ parent: { liveAgent: true }, label: 'Risk Advisor Deep Judge', maxDepth: 1, toolFilter: { allow: [] }, persona: expect.stringContaining('untrusted data'), outputSchema: expect.any(Object), agentOptions: { maxTokens: 128, provider: 'mock', model: 'local' } })
    expect(requests[0]?.signal).toBeInstanceOf(AbortSignal)
    expect(disposed.count).toBe(1)
  })

  it('does not parse a non-structured result and preserves provider boundary failures', async () => {
    const disposed = { count: 0 }
    const badRuntime: DeepJudgeSubagentRuntimeLike = {
      getProvider: () => ({ name: 'spawn', capabilities, inheritsParentContext: false }),
      start: async () => ({ result: Promise.resolve({ stopReason: 'stop' }), dispose: async () => { disposed.count += 1 } }),
    }
    await expect(executeDeepJudge(badRuntime, {}, '{}', ['AUTHORIZATION'], new Set(), config, new AbortController().signal)).resolves.toMatchObject({ ok: false, failure: 'DEEP_JUDGE_INVALID_OUTPUT' })
    expect(disposed.count).toBe(1)
    const unsupported = { getProvider: () => ({ name: 'spawn', capabilities: { ...capabilities, persona: false }, inheritsParentContext: false }), start: async () => ({}) as DeepJudgeSubagentRunLike }
    await expect(executeDeepJudge(unsupported, {}, '{}', ['AUTHORIZATION'], new Set(), config, new AbortController().signal)).resolves.toMatchObject({ failure: 'DEEP_JUDGE_PROVIDER_UNSUPPORTED' })
  })

  it('times out with bounded ownership and disposes returned work', async () => {
    let disposed = 0
    const slow: DeepJudgeSubagentRuntimeLike = {
      getProvider: () => ({ name: 'spawn', capabilities, inheritsParentContext: false }),
      start: async () => ({ result: new Promise<never>(() => undefined), dispose: async () => { disposed += 1 } }),
    }
    const short = normalizeDeepJudgeConfig({ enabled: true, isolationMode: 'trusted-parent-composition', timeoutMs: 10 })
    await expect(executeDeepJudge(slow, {}, '{}', ['AUTHORIZATION'], new Set(), short, new AbortController().signal)).resolves.toMatchObject({ ok: false, failure: 'DEEP_JUDGE_TIMEOUT' })
    expect(disposed).toBe(1)
  })
})
