import { describe, expect, it } from 'vitest'
import { normalizeDeepJudgeConfig, parseDeepJudgeCandidate } from '../src/host/deep-judge.ts'
import { getSubagentsCapability, preflightDeepJudgeProvider, type DeepJudgeSubagentRunLike } from '../src/host/deep-judge-subagent.ts'
import { DeepJudgeParentBindingStore } from '../src/host/deep-judge-parent.ts'

function candidate(dimension = 'AUTHORIZATION'): Record<string, unknown> {
  return {
    schemaVersion: 1,
    results: [{ dimension, verdict: 'EXPLICITLY_AUTHORIZED', rationale: 'bounded direct user goal', referencedFeatureIds: ['authorization.goalKnown'], proposedFacts: [{ statement: 'bounded hypothesis', status: 'HYPOTHESIS' }] }],
    suggestedAlternatives: [{ title: 'Narrower operation', description: 'Use a narrower bounded target.' }],
  }
}

describe('Phase 9 dependency recovery seam and config', () => {
  it('is disabled by default and requires the trusted isolation opt-in', () => {
    expect(normalizeDeepJudgeConfig(undefined)).toMatchObject({ enabled: false, valid: true })
    expect(normalizeDeepJudgeConfig({ enabled: true }).valid).toBe(false)
    expect(normalizeDeepJudgeConfig({ enabled: true, isolationMode: 'trusted-parent-composition' }).valid).toBe(true)
    expect(normalizeDeepJudgeConfig({ enabled: true, isolationMode: 'trusted-parent-composition', timeoutMs: 10001 }).valid).toBe(false)
  })

  it('uses erased optional lookup and fails closed for missing, throwing, or malformed runtimes', () => {
    expect(getSubagentsCapability({ get: () => undefined })).toBeUndefined()
    expect(getSubagentsCapability({ get: () => { throw new Error('missing') } })).toBeUndefined()
    expect(getSubagentsCapability({ get: () => ({ start() {} }) })).toBeUndefined()
    const runtime = { getProvider: () => undefined, start: async () => ({}) as DeepJudgeSubagentRunLike }
    expect(getSubagentsCapability({ get: () => runtime })).toBe(runtime)
    expect(preflightDeepJudgeProvider(runtime)).toMatchObject({ ok: false, failure: 'DEEP_JUDGE_PROVIDER_UNSUPPORTED' })
  })

  it('accepts only the exact spawn provider capability set', () => {
    const capabilities = { agentOptions: true, outputSchema: true, depthLimit: true, toolFilter: true, persona: true }
    const runtime = { getProvider: (name: string) => name === 'spawn' ? { name: 'spawn', capabilities, inheritsParentContext: false } : undefined, start: async () => ({}) as DeepJudgeSubagentRunLike }
    expect(preflightDeepJudgeProvider(runtime)).toMatchObject({ ok: true })
    expect(preflightDeepJudgeProvider({ ...runtime, getProvider: () => ({ name: 'other', capabilities, inheritsParentContext: false }) })).toMatchObject({ failure: 'DEEP_JUDGE_PROVIDER_UNSUPPORTED' })
    expect(preflightDeepJudgeProvider({ ...runtime, getProvider: () => ({ name: 'spawn', capabilities, inheritsParentContext: true }) })).toMatchObject({ failure: 'DEEP_JUDGE_PROVIDER_UNSUPPORTED' })
    for (const key of Object.keys(capabilities)) {
      const missing = { ...capabilities, [key]: false }
      expect(preflightDeepJudgeProvider({ ...runtime, getProvider: () => ({ name: 'spawn', capabilities: missing, inheritsParentContext: false }) })).toMatchObject({ failure: 'DEEP_JUDGE_PROVIDER_UNSUPPORTED' })
    }
  })

  it('strictly validates structured candidates and redacts free text', () => {
    const parsed = parseDeepJudgeCandidate(candidate(), ['AUTHORIZATION'], new Set(['authorization.goalKnown']))
    expect(parsed.results[0]?.verdict).toBe('EXPLICITLY_AUTHORIZED')
    expect(() => parseDeepJudgeCandidate({ ...candidate(), extra: true }, ['AUTHORIZATION'], new Set(['authorization.goalKnown']))).toThrow()
    expect(() => parseDeepJudgeCandidate({ ...candidate('RISK'), results: [{ ...candidate('RISK').results[0], verdict: 'APPROVE' }] }, ['RISK'], new Set(['authorization.goalKnown']))).toThrow()
    expect(() => parseDeepJudgeCandidate({ ...candidate(), results: [{ ...candidate().results[0], referencedFeatureIds: ['unknown'] }] }, ['AUTHORIZATION'], new Set(['authorization.goalKnown']))).toThrow()
  })

  it('bounds parent identity to exact session, TTL, and per-session capacity', () => {
    let now = 0
    const store = new DeepJudgeParentBindingStore(() => now)
    const session = { id: 'session-a' } as any
    const other = { id: 'session-b' } as any
    for (let i = 0; i < 129; i += 1) store.capture(`e-${i}`, session, { id: i })
    expect(store.size).toBe(128)
    expect(store.get('e-0', session)).toBeUndefined()
    expect(store.get('e-128', session)).toBeDefined()
    expect(store.get('e-128', other)).toBeUndefined()
    now = 10 * 60 * 1000
    expect(store.get('e-128', session)).toBeUndefined()
  })
})
