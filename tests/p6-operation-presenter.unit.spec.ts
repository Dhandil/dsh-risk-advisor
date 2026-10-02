import { describe, expect, it } from 'vitest'
import { parseBridgeRead } from '../src/bridge-contract.ts'
import { presentOperation } from '../src/host/presentation/operation-presenter.ts'
import { presentRiskAssessment } from '../src/host/presentation/risk-assessment-presenter.ts'
import type { ReviewerOperationSeed } from '../src/host/reviewer-seed.ts'
import type { RuleEvaluation } from '../src/host/rule-engine.ts'
import type { RiskAssessment } from '../src/host/risk-engine.ts'

function evaluation(operationKind: RuleEvaluation['operationKind']): RuleEvaluation {
  return {
    schemaVersion: 1, rulesetVersion: 'phase4-v1', executionId: 'exec-1', status: 'READY', operationKind,
    parserConfidence: 'high', mutating: operationKind === 'filesystem-read' ? false : 'unknown', externalEffect: operationKind === 'network-read',
    networkEffect: operationKind === 'network-read' ? 'read' : 'none', workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown',
    failureContext: { isRetry: false, retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: 'unknown', degraded: false },
    findings: [], reasonCodes: [],
  }
}

function seed(operationKind: RuleEvaluation['operationKind'], toolName: string): ReviewerOperationSeed {
  return { schemaVersion: 1, executionId: 'exec-1', toolName, operationKind, operationText: 'redacted-command', resourceHints: ['redacted-target'], parserConfidence: 'high', mutating: 'unknown', externalEffect: 'unknown', networkEffect: operationKind === 'network-read' ? 'read' : 'none', truncated: false }
}

function assessment(): RiskAssessment {
  const dimension = (name: 'RISK' | 'AUTHORIZATION' | 'NECESSITY' | 'PRIVILEGE' | 'ALTERNATIVES' | 'EVIDENCE_QUALITY', verdict: string) => ({ dimension: name, verdict, source: 'RULE' as const, evidenceQuality: 'MEDIUM' as const, basisFeatureIds: ['private-feature'], basisEventIds: ['private-event'], reasons: [{ code: 'SAFE_REASON', message: 'bounded safe reason', strength: 'DETERMINISTIC' as const }] })
  return {
    schemaVersion: 1, assessmentId: 'assessment-1', executionId: 'exec-1', contextId: 'context-1', createdAt: 1, status: 'PARTIAL',
    dimensions: { risk: dimension('RISK', 'UNKNOWN'), authorization: dimension('AUTHORIZATION', 'UNKNOWN'), necessity: dimension('NECESSITY', 'UNKNOWN'), privilege: dimension('PRIVILEGE', 'UNKNOWN'), alternatives: dimension('ALTERNATIVES', 'NO_KNOWN_SAFER_ALTERNATIVE'), evidenceQuality: dimension('EVIDENCE_QUALITY', 'MEDIUM') },
    aggregate: { recommendation: 'NEED_MORE_INFORMATION', hazardLevel: 'UNKNOWN', attentionLevel: 'ELEVATED', primaryReasonCodes: ['SAFE_REASON'], policyFlags: { explicitDenial: false, authorizationGap: true, excessivePrivilege: false, privilegeEscalation: false, saferAlternativeAvailable: false, criticalUnknowns: true, degradedEvidence: false, repeatedFailure: false, repeatedEscalation: false } },
    findings: [{ findingId: 'finding-1', dimension: 'RISK', severity: 'WARNING', code: 'SAFE_FINDING', title: 'Safe finding', detail: 'No secret or raw argument.', strength: 'DETERMINISTIC', basisFeatureIds: ['private-feature'], basisEventIds: ['private-event'] }],
    alternatives: [{ alternativeId: 'alternative-1', title: 'Safer route', description: 'Use a narrower read-only route.', source: 'MODEL_SUGGESTED', verification: 'UNVERIFIED', improvements: { lowerRisk: true, lowerPrivilege: true, narrowerScope: true, moreReversible: true } }],
    uncertainties: [{ uncertaintyId: 'u-1', code: 'CANONICAL_TARGETS_UNAVAILABLE', dimension: 'RISK', description: 'Canonical targets are not available.', impact: 'MEDIUM', resolvable: true }],
    evidence: { featureIds: ['private-feature'], eventIds: ['private-event'], counts: { authoritative: 0, deterministic: 1, inferred: 0, judge: 0 }, ledgerHealth: 'HEALTHY' },
    provenance: { rulesetVersion: 'phase4-v1', featureSchemaVersion: 1, contextBuilderVersion: 'phase5-context-v1', aggregatorVersion: 'phase5-aggregator-v1', judge: { invoked: false, dimensions: [] } },
  } as RiskAssessment
}

describe('Phase 6 Host presentation projections', () => {
  it.each([
    ['filesystem-read', 'read'], ['filesystem-write', 'write'], ['filesystem-edit', 'edit'], ['shell', 'bash'], ['network-read', 'web_fetch'], ['network-read', 'web_search'], ['unknown', 'unsupported-tool'],
  ] as const)('presents %s without raw argument traversal', (kind, toolName) => {
    const operation = presentOperation(toolName, seed(kind, toolName), evaluation(kind))
    expect(operation.schemaVersion).toBe(1)
    expect(operation.kind).toBe(kind)
    expect(JSON.stringify(operation)).not.toContain('password')
    expect(operation.workspaceContained).toBe('unknown')
    expect(operation.sandboxCovered).toBe('unknown')
    expect(operation.reversible).toBe('unknown')
    expect(Object.isFrozen(operation)).toBe(true)
  })

  it('projects six dimensions and preserves model suggested/unverified without private basis ids', () => {
    const projected = presentRiskAssessment(assessment())
    expect(projected.dimensions.risk.verdict).toBe('UNKNOWN')
    expect(projected.alternatives[0]).toMatchObject({ source: 'MODEL_SUGGESTED', verification: 'UNVERIFIED' })
    expect(JSON.stringify(projected)).not.toContain('private-feature')
    expect(JSON.stringify(projected)).not.toContain('private-event')
    expect(Object.isFrozen(projected)).toBe(true)
  })

  it('rejects a V2 ready view that carries a legacy assessor reason', () => {
    const value = {
      kind: 'VIEW', view: { schemaVersion: 2, sessionId: 's', callId: 'c', association: 'UNBOUND', status: 'unavailable', stage: 'complete', reasonCodes: ['ASSESSOR_NOT_IMPLEMENTED'], updatedAt: 1 },
    }
    expect(parseBridgeRead(value)).toBeUndefined()
  })
})
