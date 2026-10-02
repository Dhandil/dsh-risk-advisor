import { describe, expect, it } from 'vitest'
import { DEEP_JUDGE_OUTPUT_SCHEMA, normalizeDeepJudgeConfig, parseDeepJudgeCandidate, requestedDeepJudgeDimensions } from '../src/host/deep-judge.ts'
import { getSubagentsCapability, preflightDeepJudgeProvider, type DeepJudgeSubagentRunLike } from '../src/host/deep-judge-subagent.ts'
import { DeepJudgeParentBindingStore } from '../src/host/deep-judge-parent.ts'
import { isMaterialEvidence } from '../src/host/evidence-materiality.ts'

function candidate(dimension = 'AUTHORIZATION'): Record<string, unknown> {
  return {
    schemaVersion: 1,
    results: [{ dimension, verdict: 'EXPLICITLY_AUTHORIZED', rationale: 'bounded direct user goal', referencedFeatureIds: ['authorization.goalKnown'], proposedFacts: [{ statement: 'bounded hypothesis', status: 'HYPOTHESIS' }] }],
    suggestedAlternatives: [{ title: 'Narrower operation', description: 'Use a narrower bounded target.' }],
  }
}

function conforms(value: unknown, schema: Record<string, any>): boolean {
  if (schema.const !== undefined && value !== schema.const) return false
  if (schema.enum !== undefined && (!Array.isArray(schema.enum) || !schema.enum.includes(value))) return false
  if (schema.type === 'integer') return Number.isSafeInteger(value)
  if (schema.type === 'string') return typeof value === 'string' && (schema.maxLength === undefined || value.length <= schema.maxLength)
  if (schema.type === 'array') {
    if (!Array.isArray(value) || (schema.minItems !== undefined && value.length < schema.minItems) || (schema.maxItems !== undefined && value.length > schema.maxItems)) return false
    return schema.items === undefined || value.every(item => conforms(item, schema.items))
  }
  if (schema.type === 'object') {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
    const record = value as Record<string, unknown>
    if ((schema.required ?? []).some((key: string) => !Object.hasOwn(record, key))) return false
    if (schema.additionalProperties === false && Object.keys(record).some(key => !Object.hasOwn(schema.properties ?? {}, key))) return false
    return Object.entries(record).every(([key, item]) => schema.properties?.[key] === undefined || conforms(item, schema.properties[key]))
  }
  return schema.type === undefined
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

  it('emits a complete frozen schema and proves valid/extra-field shapes', () => {
    expect(conforms(candidate(), DEEP_JUDGE_OUTPUT_SCHEMA)).toBe(true)
    expect(conforms({ ...candidate(), extra: true }, DEEP_JUDGE_OUTPUT_SCHEMA)).toBe(false)
    const extraResult = candidate()
    extraResult.results = [{ ...(extraResult.results as any[])[0], extra: true }]
    expect(conforms(extraResult, DEEP_JUDGE_OUTPUT_SCHEMA)).toBe(false)
    const malformedFact = candidate()
    malformedFact.results = [{ ...(malformedFact.results as any[])[0], proposedFacts: [{ statement: 'x', status: 'HYPOTHESIS', extra: true }] }]
    expect(conforms(malformedFact, DEEP_JUDGE_OUTPUT_SCHEMA)).toBe(false)
  })

  it('shares Phase-8 materiality rather than treating collection status as evidence', () => {
    const unknownFacts = { targetCountKnown: 'unknown', canonicalTargetsKnown: 'unknown', workspaceContained: 'unknown', pathAliasObserved: 'unknown', versionControlled: 'unknown', exactTargetsClean: 'unknown', checkpointAvailable: 'unknown', rollbackMechanismKnown: 'unknown', packageManifestPresent: 'unknown', packageManifestValid: 'unknown', lifecycleScriptsPresent: 'unknown' }
    expect(isMaterialEvidence({ status: 'COMPLETE', facts: unknownFacts } as any)).toBe(false)
    expect(isMaterialEvidence({ status: 'PARTIAL', facts: { ...unknownFacts, canonicalTargetsKnown: true } } as any)).toBe(true)
    const context = { snapshot: { directUser: { messages: ['bounded goal'] }, seed: { operationKind: 'shell', requestedPermission: 'workspace' }, ruleEvaluation: { findings: [] } } }
    const assessment = { dimensions: { risk: { verdict: 'UNKNOWN' }, authorization: { verdict: 'UNKNOWN' }, necessity: { verdict: 'UNKNOWN' }, privilege: { verdict: 'UNKNOWN' } } }
    expect(requestedDeepJudgeDimensions(context as any, assessment as any, { status: 'COMPLETE', facts: unknownFacts } as any)).toEqual([])
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
