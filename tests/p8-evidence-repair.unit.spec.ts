import { describe, expect, it } from 'vitest'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { ActiveExecutionIndex } from '../src/host/correlation.ts'
import { ApprovalAssessmentCoordinator } from '../src/host/assessment-envelope.ts'
import { EvidenceCollector } from '../src/host/evidence-collector.ts'
import { mergeEvidenceAssessment, overlayEvidenceContext, type RiskAssessment, type RiskContextSnapshot } from '../src/host/risk-engine.ts'
import type { EvidenceSnapshotV1 } from '../src/host/evidence-types.ts'

function context(toolName: string, outside: boolean): RiskContextSnapshot {
  const ruleEvaluation = {
    schemaVersion: 1, rulesetVersion: 'phase4-v1', executionId: 'e1', status: 'READY', operationKind: toolName === 'write' ? 'filesystem-write' : 'shell', parserConfidence: 'high', mutating: true, externalEffect: false, networkEffect: 'none', requestedPermission: undefined, workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown', failureContext: { isRetry: false, retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: 'unknown', degraded: false }, findings: [], reasonCodes: [],
  } as never
  const features = [
    { id: 'scope.canonicalTargetsKnown', value: 'unknown' as const, source: 'DETERMINISTIC' as const, strength: 'DETERMINISTIC' as const },
    { id: 'scope.workspaceOnly', value: 'unknown' as const, source: 'DETERMINISTIC' as const, strength: 'DETERMINISTIC' as const },
    { id: 'scope.outsideWorkspace', value: outside, source: 'DETERMINISTIC' as const, strength: 'DETERMINISTIC' as const },
    { id: 'scope.pathAliasObserved', value: 'unknown' as const, source: 'DETERMINISTIC' as const, strength: 'DETERMINISTIC' as const },
    { id: 'scope.targetCountKnown', value: 'unknown' as const, source: 'DETERMINISTIC' as const, strength: 'DETERMINISTIC' as const },
    { id: 'recovery.rollbackMechanismKnown', value: 'unknown' as const, source: 'DETERMINISTIC' as const, strength: 'DETERMINISTIC' as const },
    { id: 'recovery.reversible', value: 'unknown' as const, source: 'DETERMINISTIC' as const, strength: 'DETERMINISTIC' as const },
    { id: 'privilege.minimumScopeEvidenceAvailable', value: false, source: 'DETERMINISTIC' as const, strength: 'DETERMINISTIC' as const },
  ]
  return { schemaVersion: 1, contextId: 'c1', executionId: 'e1', seed: { schemaVersion: 1, executionId: 'e1', toolName, operationText: toolName, resourceHints: [], requestedPermission: 'workspace-write', truncated: false } as never, ruleEvaluation, failureSummary: { executionId: 'e1', retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: 'unknown', truncated: false, reasonCodes: [] } as never, directUser: { messages: [], historyOmitted: false, degraded: false } as never, ledger: { health: 'HEALTHY', sourceComplete: true, truncated: false, issueCodes: [] }, features: { schemaVersion: 1, features }, degraded: false, historyOmitted: false }
}

function snapshot(facts: Partial<EvidenceSnapshotV1['facts']>): EvidenceSnapshotV1 {
  return { schemaVersion: 1, evidenceId: 'ev1', executionId: 'e1', status: 'COMPLETE', observedAt: 1, facts: { targetCountKnown: true, canonicalTargetsKnown: true, workspaceContained: true, pathAliasObserved: false, versionControlled: true, exactTargetsClean: true, checkpointAvailable: 'unknown', rollbackMechanismKnown: true, packageManifestPresent: 'unknown', packageManifestValid: 'unknown', lifecycleScriptsPresent: 'unknown', ...facts }, counts: { evidenceItems: 1, fileReads: 0, evidenceChars: 0, directoryEntries: 0 }, truncated: false, reasonCodes: [] }
}

function assessment(contextValue: RiskContextSnapshot): RiskAssessment {
  const dimension = (name: string, verdict: string, source = 'UNKNOWN') => ({ dimension: name, verdict, source, evidenceQuality: 'MEDIUM', basisFeatureIds: [], basisEventIds: [], reasons: [] })
  return { schemaVersion: 1, assessmentId: 'a1', executionId: 'e1', contextId: contextValue.contextId, createdAt: 1, status: 'PARTIAL', dimensions: { risk: dimension('RISK', 'LOW', 'RULE'), authorization: dimension('AUTHORIZATION', 'UNKNOWN'), necessity: dimension('NECESSITY', 'UNKNOWN'), privilege: dimension('PRIVILEGE', 'UNKNOWN'), alternatives: dimension('ALTERNATIVES', 'NO_KNOWN_SAFER_ALTERNATIVE', 'RULE'), evidenceQuality: dimension('EVIDENCE_QUALITY', 'MEDIUM', 'RULE') }, aggregate: { recommendation: 'NEED_MORE_INFORMATION', hazardLevel: 'LOW', attention: 'ELEVATED', primaryReasonCodes: [] }, findings: [], alternatives: [], uncertainties: [], evidence: { featureIds: [], eventIds: [], counts: { authoritative: 0, deterministic: 0, inferred: 0, judge: 0 }, ledgerHealth: 'HEALTHY' }, provenance: { rulesetVersion: 'phase4-v1', featureSchemaVersion: 1, contextBuilderVersion: 'phase5-context-v1', aggregatorVersion: 'phase5-aggregator-v1', judge: { invoked: false, dimensions: [] } } } as never
}

describe('Phase 8 final review repairs', () => {
  it('requires a locally resolvable question and does not publish A3 for no-material evidence', async () => {
    const session = { id: 'material-session', header: { cwd: '/workspace' } } as unknown as Session
    const execution = { name: 'write', arguments: { file_path: 'missing.txt', content: 'x' }, callId: 'call-1', rootCallId: 'root', signal: new AbortController().signal, token: Symbol(), agent: { session } } as unknown as ToolExecution
    const index = new ActiveExecutionIndex()
    const executionId = index.observePreExecute(execution)!
    const ruleEvaluation = { schemaVersion: 1, rulesetVersion: 'phase4-v1', executionId, status: 'READY', operationKind: 'filesystem-write', parserConfidence: 'high', mutating: true, externalEffect: false, networkEffect: 'none', workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown', failureContext: { isRetry: false, retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: 'unknown', degraded: false }, findings: [], reasonCodes: [] } as never
    const foundation = { get: () => ({ executionId, status: 'CAPTURED', toolKind: 'filesystem', reasonCodes: [], boundary: { workspaceContained: 'unknown', targetScope: 'unknown', sandboxActive: 'unknown', sandboxCovered: 'unknown', rollbackAvailable: 'unknown', checkpointAvailable: 'unknown' } }) } as never
    const rules = { get: () => ruleEvaluation } as never
    const failureChain = { get: () => ({ executionId, retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: 'unknown', truncated: false, reasonCodes: [] }) } as never
    const collector = new EvidenceCollector()
    collector.attachFs({
      resolve: async (value: string, options?: { cwd?: string }) => ({ targetKey: `${options?.cwd ?? '/workspace'}/${value}`, displayPath: `${options?.cwd ?? '/workspace'}/${value}` }),
      lstat: async () => undefined,
      stat: async () => undefined,
      contains: () => true,
      processPath: (value: { displayPath: string }) => value.displayPath,
      readBytes: async () => new Uint8Array(),
      listDir: async () => [],
    } as never)
    collector.seeds.capture(execution, executionId)
    const coordinator = new ApprovalAssessmentCoordinator(foundation, { rules, failureChain, evidence: collector })
    coordinator.captureReviewerSeed(execution, executionId)
    coordinator.observeSessionEvent(session, { type: 'approval/asked', data: { id: 'approval-1', toolName: 'write', callId: 'call-1' } } as never, index)
    const initial = coordinator.diagnostics.getForApproval(session, 'approval-1')
    await new Promise(resolve => setTimeout(resolve, 25))
    const final = coordinator.diagnostics.getForApproval(session, 'approval-1')
    expect(final.lifecycleStage).toBe('complete')
    expect(final.latestAssessmentId).toBe(initial.assessmentId)
    expect(final.assessment?.provenance.evidence).toBeUndefined()
    coordinator.dispose()
    await collector.dispose()
  })

  it('keeps read evidence from creating rollback or reversible claims', () => {
    const base = context('read', false)
    const projected = overlayEvidenceContext(base, snapshot({ rollbackMechanismKnown: true }))
    expect(projected.features.features.find(item => item.id === 'recovery.rollbackMechanismKnown')?.value).toBe('unknown')
    expect(projected.features.features.find(item => item.id === 'recovery.reversible')?.value).toBe(false)
  })

  it('proves minimum local scope without Git and raises confirmed outside mutation to HIGH', () => {
    const inside = overlayEvidenceContext(context('write', false), snapshot({ versionControlled: 'unknown' }))
    expect(inside.features.features.find(item => item.id === 'privilege.minimumScopeEvidenceAvailable')?.value).toBe(true)
    const outsideContext = overlayEvidenceContext(context('write', true), snapshot({ workspaceContained: false, canonicalTargetsKnown: true }))
    const merged = mergeEvidenceAssessment(assessment(context('write', true)), context('write', true), outsideContext, snapshot({ workspaceContained: false, canonicalTargetsKnown: true }), 'a3', 2)
    expect(merged.dimensions.risk.verdict).toBe('HIGH')
    expect(merged.dimensions.authorization.verdict).toBe('UNKNOWN')
    expect(merged.dimensions.necessity.verdict).toBe('UNKNOWN')
  })
})
