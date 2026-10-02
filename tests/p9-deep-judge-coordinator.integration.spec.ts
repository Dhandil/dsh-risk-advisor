import { describe, expect, it } from 'vitest'
import { createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ActiveExecutionIndex } from '../src/host/correlation.ts'
import { OperationFoundation } from '../src/host/operation-foundation.ts'
import { RetryEscalationAnalyzer } from '../src/host/retry-escalation.ts'
import { RuleEngine } from '../src/host/rule-engine.ts'
import { ApprovalAssessmentCoordinator } from '../src/host/assessment-envelope.ts'
import type { EvidenceSnapshotV1 } from '../src/host/evidence-types.ts'
import type { LedgerDiagnostics } from '../src/host/ledger.ts'
import type { DeepJudgeSubagentStartRequestLike } from '../src/host/deep-judge-subagent.ts'

function session(id: string): Session { return { id, header: { cwd: '/workspace' } } as unknown as Session }

describe('Phase 9 A4 coordinator path', () => {
  it('runs after terminal evidence, preserves A1 identity chain, and publishes A4 from local structured output', async () => {
    const s = session('p9-session')
    const index = new ActiveExecutionIndex()
    const foundation = new OperationFoundation()
    const failures = new RetryEscalationAnalyzer()
    const rules = new RuleEngine()
    const ledger = { snapshot: () => ({ sessionId: 'p9-session', health: 'HEALTHY', sourceWatermark: 0, sourceComplete: true, truncated: false, issues: [], executions: [], approvals: [] }) } as unknown as LedgerDiagnostics
    const evidenceSnapshot: EvidenceSnapshotV1 = {
      schemaVersion: 1, evidenceId: 'evidence-p9', executionId: 'execution-p9', status: 'COMPLETE', observedAt: 1,
      facts: { targetCountKnown: true, canonicalTargetsKnown: true, workspaceContained: true, pathAliasObserved: false, versionControlled: true, exactTargetsClean: true, checkpointAvailable: 'unknown', rollbackMechanismKnown: 'unknown', packageManifestPresent: false, packageManifestValid: 'unknown', lifecycleScriptsPresent: false },
      counts: { evidenceItems: 1, fileReads: 0, evidenceChars: 0, directoryEntries: 0 }, truncated: false, reasonCodes: [],
    }
    const fakeEvidence = { canCollect: () => true, collect: (_id: string, callback: (snapshot: EvidenceSnapshotV1) => void) => { queueMicrotask(() => callback(evidenceSnapshot)) }, cancel: () => undefined } as any
    const requests: DeepJudgeSubagentStartRequestLike[] = []
    let disposed = 0
    const runtime = {
      getProvider: (name: string) => name === 'spawn' ? { name: 'spawn', capabilities: { agentOptions: true, outputSchema: true, depthLimit: true, toolFilter: true, persona: true }, inheritsParentContext: false } : undefined,
      start: async (_name: string, request: DeepJudgeSubagentStartRequestLike) => {
        requests.push(request)
        return { result: Promise.resolve({ stopReason: 'stop', structured: { schemaVersion: 1, results: [
          { dimension: 'AUTHORIZATION', verdict: 'EXPLICITLY_AUTHORIZED', rationale: 'direct bounded request', referencedFeatureIds: ['authorization.goalKnown'] },
          { dimension: 'NECESSITY', verdict: 'LIKELY_NECESSARY', rationale: 'operation matches goal', referencedFeatureIds: ['authorization.goalKnown'] },
        ], suggestedAlternatives: [] } }), dispose: async () => { disposed += 1 } }
      },
    }
    const coordinator = new ApprovalAssessmentCoordinator(foundation.diagnostics, {
      rules: rules.diagnostics, failureChain: failures.diagnostics, ledger, evidence: fakeEvidence,
      deepJudge: { enabled: true, isolationMode: 'trusted-parent-composition', timeoutMs: 1000, maxConcurrentJudges: 1, maxPendingJudges: 2, maxTokens: 128 },
    })
    coordinator.attachSubagents(runtime)
    coordinator.observeSessionEvent(s, { type: 'user/message', data: createUserMessage({ content: [{ type: 'text', text: 'Please read the bounded local file.' }], source: { kind: 'user' } }) } as unknown as SessionEvent, index)
    const agent = { session: s } as unknown as Agent
    const exec = { callId: ToolCallId('p9-call'), rootCallId: ToolCallId('p9-call'), name: 'read', arguments: { file_path: 'safe.txt' }, signal: new AbortController().signal, token: Symbol(), agent } as unknown as ToolExecution
    const executionId = index.observePreExecute(exec)!
    foundation.capture(exec, executionId)
    failures.observePreExecute(exec, executionId)
    rules.observePreExecute(exec, executionId, failures.diagnostics.get(executionId))
    coordinator.captureReviewerSeed(exec, executionId)
    coordinator.captureDeepJudgeParent(exec, executionId)
    expect(coordinator.observeSessionEvent(s, { type: 'approval/asked', data: { id: 'p9-approval', toolName: 'read', callId: ToolCallId('p9-call') } } as unknown as SessionEvent, index)).toBe('RECORDED')
    await new Promise(resolve => setTimeout(resolve, 20))
    const latest = coordinator.diagnostics.getLatestForApproval(s, 'p9-approval')!
    expect(latest.provenance.deepJudge?.providerName).toBe('spawn')
    expect(latest.provenance.deepJudge?.invoked).toBe(true)
    expect(latest.supersedesAssessmentId).toBeDefined()
    expect(latest.dimensions.authorization.verdict).toBe('EXPLICITLY_AUTHORIZED')
    expect(latest.alternatives).toHaveLength(0)
    expect(requests[0]).toMatchObject({ maxDepth: 1, toolFilter: { allow: [] } })
    expect(disposed).toBe(1)
    await coordinator.dispose()
  })
})
