import { createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import { ActiveExecutionIndex } from '../src/host/correlation.ts'
import { OperationFoundation } from '../src/host/operation-foundation.ts'
import { RetryEscalationAnalyzer } from '../src/host/retry-escalation.ts'
import { RuleEngine } from '../src/host/rule-engine.ts'
import { ApprovalAssessmentCoordinator } from '../src/host/assessment-envelope.ts'
import type { EvidenceSnapshotV1 } from '../src/host/evidence-types.ts'
import type { LedgerDiagnostics } from '../src/host/ledger.ts'

function session(id: string): Session { return { id, header: { cwd: '/workspace' } } as unknown as Session }

const evidenceSnapshot = (executionId: string): EvidenceSnapshotV1 => ({
  schemaVersion: 1, evidenceId: `p10-evidence-${executionId}`, executionId, status: 'COMPLETE', observedAt: 1,
  facts: { targetCountKnown: true, canonicalTargetsKnown: true, workspaceContained: true, pathAliasObserved: false, versionControlled: true, exactTargetsClean: true, checkpointAvailable: 'unknown', rollbackMechanismKnown: 'unknown', packageManifestPresent: false, packageManifestValid: 'unknown', lifecycleScriptsPresent: false },
  counts: { evidenceItems: 1, fileReads: 0, evidenceChars: 0, directoryEntries: 0 }, truncated: false, reasonCodes: [],
})

function prepare(coordinator: ApprovalAssessmentCoordinator, sessionValue: Session, index: ActiveExecutionIndex, foundation: OperationFoundation, failures: RetryEscalationAnalyzer, rules: RuleEngine, approvalId: string, callIdValue: string): void {
  const callId = ToolCallId(callIdValue)
  const exec = { callId, rootCallId: callId, name: 'write', arguments: { file_path: 'safe.txt', content: 'bounded' }, signal: new AbortController().signal, token: Symbol(callIdValue), agent: { session: sessionValue } as unknown as Agent } as unknown as ToolExecution
  const executionId = index.observePreExecute(exec)!
  foundation.capture(exec, executionId)
  failures.observePreExecute(exec, executionId)
  rules.observePreExecute(exec, executionId, failures.diagnostics.get(executionId))
  coordinator.captureReviewerSeed(exec, executionId)
  coordinator.captureDeepJudgeParent(exec, executionId)
  const asked = { type: 'approval/asked', data: { id: approvalId, toolName: 'write', callId } } as unknown as SessionEvent
  expect(coordinator.observeSessionEvent(sessionValue, asked, index)).toBe('RECORDED')
}

function common(id: string) {
  const s = session(id)
  const index = new ActiveExecutionIndex()
  const foundation = new OperationFoundation()
  const failures = new RetryEscalationAnalyzer()
  const rules = new RuleEngine()
  const ledger = { snapshot: () => ({ sessionId: id, health: 'HEALTHY', sourceWatermark: 0, sourceComplete: true, truncated: false, issues: [], executions: [], approvals: [] }) } as unknown as LedgerDiagnostics
  return { s, index, foundation, failures, rules, ledger }
}

describe('Phase 10 native close fencing', () => {
  it('does not publish A3 after native close while held Evidence work releases late', async () => {
    const base = common('p10-native-close-a3')
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    let started!: () => void
    const startedPromise = new Promise<void>(resolve => { started = resolve })
    let cancelled = 0
    let drained = false
    const evidence = {
      canCollect: () => true,
      collect: (_id: string, callback: (value: EvidenceSnapshotV1) => void) => { started(); void gate.then(() => { drained = true; callback(evidenceSnapshot('p10-a3-execution')) }) },
      cancel: () => { cancelled += 1 },
    }
    const coordinator = new ApprovalAssessmentCoordinator(base.foundation.diagnostics, { rules: base.rules.diagnostics, failureChain: base.failures.diagnostics, ledger: base.ledger, evidence: evidence as never })
    try {
      prepare(coordinator, base.s, base.index, base.foundation, base.failures, base.rules, 'p10-a3-approval', 'p10-a3-call')
      await startedPromise
      const before = coordinator.diagnostics.getLatestForApproval(base.s, 'p10-a3-approval')!
      expect(coordinator.observeSessionEvent(base.s, { type: 'approval/decided', data: { id: 'p10-a3-approval', outcome: 'allowed-once' } } as unknown as SessionEvent, base.index)).toBe('DECIDED')
      release()
      await new Promise(resolve => setTimeout(resolve, 10))
      const after = coordinator.diagnostics.getLatestForApproval(base.s, 'p10-a3-approval')
      expect(after?.assessmentId).toBe(before.assessmentId)
      expect(after?.provenance.evidence).toBeUndefined()
      expect(cancelled).toBe(1)
      expect(drained).toBe(true)
      expect(coordinator.diagnostics.getForApproval(base.s, 'p10-a3-approval').closed).toBe(true)
    } finally { release(); await coordinator.dispose() }
  })

  it('does not publish A4 after native close while a held Deep runtime releases late', async () => {
    const base = common('p10-native-close-a4')
    const evidence = { canCollect: () => true, collect: (id: string, callback: (value: EvidenceSnapshotV1) => void) => queueMicrotask(() => callback(evidenceSnapshot(id))), cancel: () => undefined }
    let release!: (value: unknown) => void
    const result = new Promise(resolve => { release = resolve })
    let started = false
    let disposed = 0
    const provider = { name: 'spawn', capabilities: { agentOptions: true, outputSchema: true, depthLimit: true, toolFilter: true, persona: true }, inheritsParentContext: false }
    const deep = {
      getProvider: () => provider,
      start: async () => { started = true; return { result, dispose: async () => { disposed += 1 } } },
    }
    const coordinator = new ApprovalAssessmentCoordinator(base.foundation.diagnostics, { rules: base.rules.diagnostics, failureChain: base.failures.diagnostics, ledger: base.ledger, evidence: evidence as never, deepJudge: { enabled: true, isolationMode: 'trusted-parent-composition', timeoutMs: 5000, maxConcurrentJudges: 1, maxPendingJudges: 1, maxTokens: 128 } })
    await coordinator.attachSubagents(deep as never)
    try {
      coordinator.observeSessionEvent(base.s, { type: 'user/message', data: createUserMessage({ content: [{ type: 'text', text: 'Please write the bounded local file.' }], source: { kind: 'user' } }) } as unknown as SessionEvent, base.index)
      prepare(coordinator, base.s, base.index, base.foundation, base.failures, base.rules, 'p10-a4-approval', 'p10-a4-call')
      const deadline = Date.now() + 1000
      while (!started && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 2))
      expect(started).toBe(true)
      const before = coordinator.diagnostics.getLatestForApproval(base.s, 'p10-a4-approval')!
      expect(before.provenance.evidence?.invoked).toBe(true)
      expect(coordinator.observeSessionEvent(base.s, { type: 'approval/decided', data: { id: 'p10-a4-approval', outcome: 'allowed-once' } } as unknown as SessionEvent, base.index)).toBe('DECIDED')
      release({ stopReason: 'completed', structured: { schemaVersion: 1, results: [{ dimension: 'AUTHORIZATION', verdict: 'EXPLICITLY_AUTHORIZED', rationale: 'late', referencedFeatureIds: [] }], suggestedAlternatives: [] } })
      await new Promise(resolve => setTimeout(resolve, 20))
      const after = coordinator.diagnostics.getLatestForApproval(base.s, 'p10-a4-approval')
      expect(after?.assessmentId).toBe(before.assessmentId)
      expect(after?.provenance.deepJudge).toBeUndefined()
      expect(disposed).toBe(1)
    } finally { await coordinator.dispose() }
  })
})
