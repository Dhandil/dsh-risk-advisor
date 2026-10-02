import { describe, expect, it } from 'vitest'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { RetryEscalationAnalyzer } from '../src/host/retry-escalation.ts'
import { ExpectedEffectRegistry } from '../src/host/expected-effect.ts'
import { PostconditionVerifier } from '../src/host/postcondition-verifier.ts'

const session = { id: 'p7-chain-session', header: { cwd: 'D:\\Harness\\p7-fixture' } } as unknown as Session
function exec(callId: string): ToolExecution {
  return { name: 'write', arguments: { file_path: 'a.txt', content: 'expected' }, callId, rootCallId: callId, agent: { session }, signal: new AbortController().signal, token: Symbol(callId) } as unknown as ToolExecution
}

describe('Phase 7 FailureChain overlay', () => {
  it('overlays deterministic semantic mismatch and makes it available only to future captures', () => {
    const chain = new RetryEscalationAnalyzer()
    const registry = new ExpectedEffectRegistry()
    const verifier = new PostconditionVerifier(registry, { onRecord: record => chain.observeVerification(record) })
    const first = exec('first')
    chain.observePreExecute(first, 'execution-first')
    registry.capture(first, 'execution-first')
    chain.observeResult(first, { isError: false, value: { path: 'a.txt', operation: 'update', before: 'x', after: 'wrong' }, content: [] })
    verifier.observeResult(first, { isError: false, value: { path: 'a.txt', operation: 'update', before: 'x', after: 'wrong' }, content: [] })
    expect(chain.diagnostics.get('execution-first')).toMatchObject({ status: 'READY', recent: [{ failureKind: 'SEMANTIC_FAILURE' }], recentFailureCount: 1 })

    const retry = exec('retry')
    chain.observePreExecute(retry, 'execution-retry')
    expect(chain.diagnostics.get('execution-retry')).toMatchObject({ retryOf: 'execution-first', recentFailureCount: 1 })
    void verifier.dispose()
  })

  it('does not create a retroactive retry edge when the semantic result is late', () => {
    const chain = new RetryEscalationAnalyzer()
    const first = exec('late-first')
    chain.observePreExecute(first, 'late-first')
    chain.observeResult(first, { isError: false, value: { text: 'success' }, content: [] })
    const later = exec('late-retry')
    chain.observePreExecute(later, 'late-retry')
    chain.observeVerification({ schemaVersion: 1, executionId: 'late-first', adapterId: 'tool.write.v1', source: 'tool-contract', status: 'MISMATCHED', semanticSuccess: false, evidenceQuality: 'high', reasonCodes: ['POSTCONDITION_MISMATCH'], observedAt: 1, durationMs: 0 })
    expect(chain.diagnostics.get('late-retry').retryOf).toBeUndefined()
  })
})
