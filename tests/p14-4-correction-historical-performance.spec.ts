import { platform } from 'node:os'
import { performance } from 'node:perf_hooks'
import { afterEach, describe, expect, it } from 'vitest'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import type { ExecutionId } from '../src/host/correlation.ts'
import { ExpectedEffectRegistry } from '../src/host/expected-effect.ts'
import { OperationFoundation } from '../src/host/operation-foundation.ts'
import { RetryEscalationAnalyzer } from '../src/host/retry-escalation.ts'
import { RuleEngine } from '../src/host/rule-engine.ts'
import { RuntimeRiskAwarenessRuntime } from '../src/host/runtime-risk-awareness.ts'
import { LiveCorrectionRuntime } from '../src/host/live-correction.ts'
import { CorrectionHistoricalIdentityRegistry } from '../src/host/correction-historical-identity.ts'
import { handleCorrectionHistoricalContextRpc } from '../src/host/correction-historical-context-bridge.ts'
import { normalizeExperiencePlatform } from '../src/host/experience-schema.ts'
import { createQualifiedPatternScaleFixture, type QualifiedPatternScaleFixture } from './p14-2-historical-context-fixtures.ts'

const fixtures: QualifiedPatternScaleFixture[] = []
afterEach(async () => { await Promise.all(fixtures.splice(0).map(fixture => fixture.close())) })

function percentile(values: readonly number[], percent: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percent) - 1)] ?? 0
}

function failure(executionId: ExecutionId) {
  return { executionId, status: 'READY' as const, retryOf: 'ra-execution-p14-4-benchmark-prior', retryCount: 1,
    recentFailureCount: 2, sameRootCause: true as const, permissionEscalation: false as const, truncated: false,
    reasonCodes: Object.freeze([]), recent: Object.freeze([]) }
}

describe('Phase 14.4 C12 qualified-history and synchronous capture budgets', () => {
  it('measures exact Host Finding→sidecar→Guidance lookup at 1, 1000 and 3333 truly qualified histories', async () => {
    const fixture = await createQualifiedPatternScaleFixture(3333, { platform: normalizeExperiencePlatform(platform()) })
    fixtures.push(fixture)
    const observations: Array<{ readonly count: number; readonly p50: number; readonly p95: number; readonly p99: number }> = []
    const live = new LiveCorrectionRuntime()
    const identities = new CorrectionHistoricalIdentityRegistry()
    try {
      for (const count of [1, 1000, 3333]) {
        await fixture.qualifyThrough(count)
        const guidance = await fixture.attachGuidance()
        await guidance.drain()
        expect(fixture.patterns.diagnostics.patternIds()).toHaveLength(count)
        expect(fixture.qualifiedEpisodeCount()).toBe(count * 3)
        const patternId = fixture.patterns.diagnostics.patternIds()[0]!
        expect(guidance.diagnostics.currentForPattern(patternId)).toBeDefined()
        expect(guidance.diagnostics.guidanceIds()).toHaveLength(count)
        expect(fixture.patterns.diagnostics.current(patternId)).toMatchObject({ state: 'QUALIFIED', supportCount: 3, supportUtcDateCount: 2 })
        const owner = { id: `p14-4-perf-session-${count}`, header: { cwd: '/private/p14-4-perf' } } as unknown as Session
        const executionId = `ra-execution-p14-4-perf-${count}` as ExecutionId
        identities.capture(owner, executionId, patternId)
        identities.settle(owner, executionId)
        live.observeSettledResult({ name: 'write', arguments: {}, callId: `perf-${count}`, rootCallId: `perf-${count}`,
          agent: { session: owner }, signal: new AbortController().signal } as unknown as ToolExecution,
        executionId, failure(executionId))
        const finding = live.diagnostics.forSession(owner).findings[0]!
        const sessions = { get: (id: string) => id === owner.id ? owner : undefined } as never
        const samples: number[] = []
        for (let index = 0; index < 200; index += 1) {
          const start = performance.now()
          const result = await handleCorrectionHistoricalContextRpc(sessions, live.diagnostics, identities, guidance.diagnostics,
            'risk-advisor/correction-historical-context', { sessionId: owner.id, findingId: finding.findingId }, new AbortController().signal)
          samples.push(performance.now() - start)
          expect(result).toMatchObject({ ok: true, value: { kind: 'VIEW', findingId: finding.findingId } })
        }
        const values = { count, p50: percentile(samples, 0.5), p95: percentile(samples, 0.95), p99: percentile(samples, 0.99) }
        observations.push(values)
        expect(values.p95).toBeLessThanOrEqual(5)
        expect(values.p99).toBeLessThanOrEqual(10)
        if (count !== 3333) await fixture.detachGuidance()
        console.info('[phase14.4-qualified-host-history-step]', JSON.stringify(values))
      }
      console.log('[phase14.4-qualified-host-history-ms]', JSON.stringify(observations))
    } finally { live.dispose(); identities.dispose() }
  }, 600_000)

  it('measures complete synchronous foundation/rule/expected-effect/risk/sidecar capture with no history lookup', () => {
    const foundation = new OperationFoundation()
    const failureChain = new RetryEscalationAnalyzer()
    const rules = new RuleEngine()
    const expectedEffects = new ExpectedEffectRegistry()
    const ledger = { snapshot: (owner: Session) => ({ sessionId: owner.id, health: 'HEALTHY', sourceWatermark: 0,
      sourceComplete: true, truncated: false, issues: [], executions: [], approvals: [] }) } as never
    const samples: number[] = []
    let eligible = 0
    for (let batch = 0; batch < 5; batch += 1) {
      const foundation = new OperationFoundation()
      const failureChain = new RetryEscalationAnalyzer()
      const rules = new RuleEngine()
      const expectedEffects = new ExpectedEffectRegistry()
      const ledger = { snapshot: (owner: Session) => ({ sessionId: owner.id, health: 'HEALTHY', sourceWatermark: 0,
        sourceComplete: true, truncated: false, issues: [], executions: [], approvals: [] }) } as never
      const callbacks: Array<() => void> = []
      const runtime = new RuntimeRiskAwarenessRuntime(foundation.diagnostics, rules.diagnostics, failureChain.diagnostics, ledger,
        { expectedEffects, schedule: callback => { callbacks.push(callback); return () => undefined } })
      const identities = new CorrectionHistoricalIdentityRegistry()
      const capture = (ordinal: number, measure: boolean): void => {
        const index = batch * 220 + ordinal
        const owner = { id: `p14-4-capture-session-${index}`, header: { cwd: '/private/p14-4-capture' } } as unknown as Session
        const executionId = `ra-execution-p14-4-capture-${index}` as ExecutionId
        const exec = { name: 'write', arguments: { file_path: `/private/p14-4-capture/${index}.txt`, content: 'synthetic-performance-input' },
          callId: `capture-call-${index}`, rootCallId: `capture-call-${index}`, agent: { session: owner }, signal: new AbortController().signal,
          token: Symbol(String(index)) } as unknown as ToolExecution
        const start = measure ? performance.now() : 0
        foundation.capture(exec, executionId, undefined)
        failureChain.observePreExecute(exec, executionId)
        rules.observePreExecute(exec, executionId, failureChain.diagnostics.get(executionId))
        expectedEffects.capture(exec, executionId)
        runtime.capturePreExecute(exec, executionId)
        const patternId = runtime.capturedPreExecuteHistoricalPatternId(owner, executionId)
        identities.capture(owner, executionId, patternId)
        if (measure) samples.push(performance.now() - start)
        if (patternId !== undefined) eligible += Number(measure)
        // Let the already-scheduled scorer run outside the measured synchronous capture.
        callbacks.shift()?.()
      }
      try {
        for (let index = 0; index < 20; index += 1) capture(index, false)
        for (let index = 20; index < 220; index += 1) capture(index, true)
      } finally {
        identities.dispose(); runtime.dispose(); expectedEffects.dispose(); failureChain.dispose(); rules.dispose(); foundation.dispose()
      }
    }
    const p95 = percentile(samples, 0.95)
    const p99 = percentile(samples, 0.99)
    console.log('[phase14.4-complete-sync-capture-ms]', JSON.stringify({ samples: samples.length, eligible, p95, p99 }))
    expect(eligible).toBe(samples.length)
    expect(p95).toBeLessThanOrEqual(1)
    expect(p99).toBeLessThanOrEqual(2)
  })
})
