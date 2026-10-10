import { performance } from 'node:perf_hooks'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { ActiveExecutionIndex } from '../src/host/correlation.ts'
import { ApprovalAssessmentCoordinator } from '../src/host/assessment-envelope.ts'
import { ExpectedEffectRegistry } from '../src/host/expected-effect.ts'
import type { FoundationDiagnostics } from '../src/host/operation-foundation.ts'
import type { FailureChainDiagnostics, FailureChainSummary } from '../src/host/retry-escalation.ts'
import type { RuleDiagnostics, RuleEvaluation } from '../src/host/rule-engine.ts'
import type { LedgerDiagnostics } from '../src/host/ledger.ts'
import { RuntimeRiskAwarenessRuntime } from '../src/host/runtime-risk-awareness.ts'
import type { GuidanceDiagnostics } from '../src/host/guidance-store.ts'
import { handleRiskAdvisorRpc } from '../src/host/browser-bridge.ts'
import type { QualifiedPatternScaleFixture } from './p14-2-historical-context-fixtures.ts'

const sessionId = 'p14-3-real-qualified-performance'
const callId = 'p14-3-real-qualified-performance-call'
const approvalId = 'p14-3-real-qualified-performance-approval'

export interface ApprovalHistoryPerformanceProbe {
  readonly sample: (guidance: GuidanceDiagnostics, count: number) => Promise<{ p50Ms: number; p95Ms: number; p99Ms: number }>
  readonly dispose: () => Promise<void>
}

export function createApprovalHistoryPerformanceProbe(fixture: QualifiedPatternScaleFixture): ApprovalHistoryPerformanceProbe {
  const owner = { id: sessionId, header: { cwd: '/private/p14-3-performance-fixture' } } as unknown as Session
  const evaluations = new Map<string, RuleEvaluation>()
  const expectedEffects = new ExpectedEffectRegistry()
  const foundation = { get: (executionId: string) => ({ executionId, status: 'CAPTURED', toolKind: 'filesystem-write', reasonCodes: [],
    boundary: { workspaceContained: 'unknown', targetScope: 'unknown', sandboxActive: 'unknown', sandboxCovered: 'unknown', rollbackAvailable: 'unknown', checkpointAvailable: 'unknown' } }) } as unknown as FoundationDiagnostics
  const rules = { get: (id: string) => evaluations.get(id)! } as RuleDiagnostics
  const failureChain = { get: (id: string) => ({ executionId: id, status: 'READY', retryCount: 0, recentFailureCount: 0,
    sameRootCause: false, permissionEscalation: false, truncated: false, reasonCodes: Object.freeze([]), recent: Object.freeze([]) }) as FailureChainSummary } as FailureChainDiagnostics
  const ledger = { snapshot: (session: Session) => ({ sessionId: session.id, health: 'HEALTHY', sourceWatermark: 0, sourceComplete: true,
    truncated: false, issues: [], executions: [], approvals: [] }) } as unknown as LedgerDiagnostics
  const runtime = new RuntimeRiskAwarenessRuntime(foundation, rules, failureChain, ledger, {
    expectedEffects,
    schedule: () => () => undefined,
  })
  const coordinator = new ApprovalAssessmentCoordinator(foundation, { rules, failureChain, ledger, runtimeRisk: runtime })
  const index = new ActiveExecutionIndex()
  const execution: ToolExecution = {
    name: 'write', callId, rootCallId: callId, arguments: { file_path: '/private/p14-3-performance-fixture/file.txt', content: 'fixed-fixture' },
    signal: new AbortController().signal, token: Symbol('p14-3-performance'), agent: { session: owner },
  } as unknown as ToolExecution
  const executionId = index.observePreExecute(execution)!
  evaluations.set(executionId, Object.freeze({ schemaVersion: 1, rulesetVersion: 'phase4-v1', executionId, status: 'READY', operationKind: 'filesystem-write',
    parserConfidence: 'high', mutating: true, externalEffect: false, networkEffect: 'none', workspaceContained: 'unknown', sandboxCovered: 'unknown',
    reversible: 'unknown', failureContext: { isRetry: false, retryCount: 0, recentFailureCount: 0, sameRootCause: false, permissionEscalation: false, degraded: false },
    findings: Object.freeze([]), reasonCodes: Object.freeze([]) }) as RuleEvaluation)
  expectedEffects.capture(execution, executionId)
  runtime.capturePreExecute(execution, executionId)
  const recorded = coordinator.observeSessionEvent(owner, { type: 'approval/asked', data: { id: approvalId, toolName: 'write', callId } } as unknown as SessionEvent, index)
  if (recorded !== 'RECORDED') throw new Error(`approval-history-performance-setup-failed:${recorded}`)
  const sessions = { get: (candidate: string) => candidate === sessionId ? owner : undefined } as never

  return {
    async sample(guidance, count) {
      const episodeId = fixture.episodes[0]!.episodeId
      const patternId = fixture.patterns.diagnostics.patternIds().find(id => fixture.patterns.diagnostics.current(id)?.supportAdded.some(row => row.episodeId === episodeId))
      if (patternId === undefined || guidance.status() !== 'READY' || guidance.currentForPattern(patternId) === undefined) throw new Error('qualified-pattern-missing-during-approval-benchmark')
      const samples: number[] = []
      for (let index = 0; index < 200; index += 1) {
        const started = performance.now()
        const result = await handleRiskAdvisorRpc(sessions, coordinator, 'approval-historical-context', { sessionId, callId }, new AbortController().signal, runtime, guidance)
        samples.push(performance.now() - started)
        if (!result.ok || (result.value as { kind?: string }).kind !== 'VIEW') throw new Error('approval-history-benchmark-did-not-return-view')
      }
      samples.sort((a, b) => a - b)
      const metrics = {
        p50Ms: Number(samples[Math.ceil(samples.length * 0.50) - 1]!.toFixed(4)),
        p95Ms: Number(samples[Math.ceil(samples.length * 0.95) - 1]!.toFixed(4)),
        p99Ms: Number(samples[Math.ceil(samples.length * 0.99) - 1]!.toFixed(4)),
      }
      if (metrics.p95Ms > 5 || metrics.p99Ms > 10) throw new Error(`approval-history-benchmark-budget-exceeded:${count}:${JSON.stringify(metrics)}`)
      return metrics
    },
    async dispose() { await coordinator.dispose(); runtime.dispose(); expectedEffects.dispose() },
  }
}
