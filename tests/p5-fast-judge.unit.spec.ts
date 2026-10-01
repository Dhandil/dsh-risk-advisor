import { describe, expect, it } from 'vitest'
import { SecretRedactor } from '../src/host/redactor.ts'
import { parseFastJudgeCandidate } from '../src/host/fast-judge.ts'
import { aggregateAssessment, type DimensionAssessment } from '../src/host/assessment-aggregator.ts'

function dimension<T extends string>(name: DimensionAssessment<T>['dimension'], verdict: T): DimensionAssessment<T> {
  return { dimension: name, verdict, source: verdict === 'UNKNOWN' ? 'UNKNOWN' : 'RULE', evidenceQuality: 'MEDIUM', basisFeatureIds: [], basisEventIds: [], reasons: [] }
}

describe('Phase 5 redaction and strict Judge protocol', () => {
  it('redacts frozen secret vocabulary deterministically and idempotently', () => {
    const redactor = new SecretRedactor()
    const input = 'Authorization: Bearer ghp_1234567890 password=secret https://u:p@example.test/?token=abc sk-proj-123456789'
    const once = redactor.redact(input).value
    expect(once).toContain('[REDACTED]')
    expect(redactor.redact(once).value).toBe(once)
    expect(once).not.toContain('123456789')
    expect(once).not.toContain('secret')
  })

  it('rejects fences, extra keys, malformed result sets, and unknown feature references', () => {
    const requested = ['AUTHORIZATION', 'NECESSITY'] as const
    const base = {
      schemaVersion: 1,
      results: [
        { dimension: 'AUTHORIZATION', verdict: 'EXPLICITLY_AUTHORIZED', rationale: 'goal matches', referencedFeatureIds: ['authorization.goalKnown'] },
        { dimension: 'NECESSITY', verdict: 'LIKELY_NECESSARY', rationale: 'bounded', referencedFeatureIds: ['authorization.goalKnown'] },
      ],
    }
    expect(parseFastJudgeCandidate(JSON.stringify(base), requested, new Set(['authorization.goalKnown']))).toMatchObject({ schemaVersion: 1 })
    expect(() => parseFastJudgeCandidate(`\`\`\`json\n${JSON.stringify(base)}\n\`\`\``, requested, new Set(['authorization.goalKnown']))).toThrow()
    expect(() => parseFastJudgeCandidate(JSON.stringify({ ...base, extra: true }), requested, new Set(['authorization.goalKnown']))).toThrow()
    expect(() => parseFastJudgeCandidate(JSON.stringify({ ...base, results: base.results.map(item => ({ ...item, referencedFeatureIds: ['unknown'] })) }), requested, new Set(['authorization.goalKnown']))).toThrow()
  })
})
describe('Phase 5 pure P0-P9 aggregator', () => {
  it('keeps the formal precedence and hazard separation', () => {
    const base = {
      risk: dimension('RISK', 'LOW' as const),
      authorization: dimension('AUTHORIZATION', 'EXPLICITLY_AUTHORIZED' as const),
      necessity: dimension('NECESSITY', 'LIKELY_NECESSARY' as const),
      privilege: dimension('PRIVILEGE', 'PROPORTIONATE' as const),
      alternatives: dimension('ALTERNATIVES', 'NO_KNOWN_SAFER_ALTERNATIVE' as const),
      evidenceQuality: dimension('EVIDENCE_QUALITY', 'MEDIUM' as const),
      assessmentStatus: 'COMPLETE' as const,
    }
    expect(aggregateAssessment({ ...base, authorization: dimension('AUTHORIZATION', 'EXPLICITLY_DENIED') }).recommendation).toBe('REJECT_RECOMMENDED')
    expect(aggregateAssessment({ ...base, risk: dimension('RISK', 'HIGH') }).hazardLevel).toBe('HIGH')
    expect(aggregateAssessment({ ...base, risk: dimension('RISK', 'UNKNOWN'), assessmentStatus: 'PARTIAL' }).recommendation).toBe('NEED_MORE_INFORMATION')
    expect(aggregateAssessment({ ...base, risk: dimension('RISK', 'HIGH'), alternatives: dimension('ALTERNATIVES', 'SAFER_ALTERNATIVE_AVAILABLE') }).recommendation).toBe('PREFER_SAFER_ALTERNATIVE')
    expect(aggregateAssessment({ ...base, risk: dimension('RISK', 'HIGH'), privilege: dimension('PRIVILEGE', 'EXCESSIVE'), necessity: dimension('NECESSITY', 'UNKNOWN') }).recommendation).toBe('NEED_MORE_INFORMATION')
    expect(aggregateAssessment(base).recommendation).toBe('APPROVE')
  })
})
