import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import { RetryEscalationAnalyzer } from '../src/host/retry-escalation.ts'
import { ExpectedEffectRegistry } from '../src/host/expected-effect.ts'

function owner(id: string): Session { return { id } as unknown as Session }
function exec(session: Session, id: string, name: string, args: unknown): ToolExecution {
  return { callId: id, rootCallId: id, name, arguments: args, agent: { session } as unknown as Agent, signal: new AbortController().signal, token: Symbol(id) } as ToolExecution
}
function failed(code = 'TOOL_TIMEOUT'): ToolExecutionResult { return { isError: true, content: [], error: { message: 'bounded', info: { name: 'HarnessError', code } } } as ToolExecutionResult }

describe('Phase 10 retry and semantic false-positive hardening', () => {
  it('does not correlate different sessions, changed targets, or unknown failures', () => {
    const analyzer = new RetryEscalationAnalyzer()
    const a = owner('a')
    const b = owner('b')
    const first = exec(a, 'first', 'read', { file_path: 'a.txt' })
    analyzer.observePreExecute(first, 'first'); analyzer.observeResult(first, failed())
    const differentSession = exec(b, 'different-session', 'read', { file_path: 'a.txt' })
    analyzer.observePreExecute(differentSession, 'different-session')
    expect(analyzer.diagnostics.get('different-session').retryOf).toBeUndefined()
    const differentTarget = exec(a, 'different-target', 'read', { file_path: 'b.txt' })
    analyzer.observePreExecute(differentTarget, 'different-target')
    expect(analyzer.diagnostics.get('different-target').retryOf).toBeUndefined()
    const unknown = exec(a, 'unknown', 'read', { file_path: 'a.txt' })
    analyzer.observePreExecute(unknown, 'unknown'); analyzer.observeResult(unknown, { isError: true, content: [], error: { message: 'no code' } } as ToolExecutionResult)
    expect(analyzer.diagnostics.get('unknown').sameRootCause).toBe('unknown')
  })

  it('captures only the six frozen local verification adapters and preserves identity', () => {
    const registry = new ExpectedEffectRegistry()
    const session = owner('effects')
    const valid = exec(session, 'mkdir', 'bash', { command: 'mkdir -p safe-dir', description: 'bounded' })
    registry.capture(valid, 'mkdir')
    const effect = registry.take(valid)
    expect(effect).toMatchObject({ executionId: 'mkdir', adapterId: 'shell.mkdir.v1', target: 'safe-dir' })
    expect(registry.take(valid)).toBeUndefined()

    const unsupported = exec(session, 'dynamic', 'bash', { command: 'bash -c "mkdir safe-dir"', description: 'bounded' })
    registry.capture(unsupported, 'dynamic')
    expect(registry.take(unsupported)).toBeUndefined()
    expect(effect).toBeDefined()
  })
})
