import { describe, expect, it } from 'vitest'
import * as publicApi from '../src/index.ts'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { PreToolDecision, ToolExecution, ToolExecutionResult, ToolExecutionToken } from '@deepseek-ai/dsh-tools'
import {
  type LedgerApprovalFact,
  type LedgerEvidenceRef,
  type LedgerTerminalClaim,
} from '../src/index.ts'
import {
  projectApprovalOutcome,
  projectGuardReturnedDenial,
  projectPtcProjection,
  projectPreExecuteDecision,
  projectShellResult,
  projectTerminalClaim,
  projectTerminalClaims,
} from '../src/host/explicit-failure.ts'
import { foldLedgerSnapshot, LedgerController } from '../src/host/ledger.ts'
import { replayPtcSnapshot } from '../src/host/ptc-replay.ts'

function ref(seq = 1, type = 'tools/result', provenance: LedgerEvidenceRef['provenance'] = 'LIVE_FINAL'): LedgerEvidenceRef {
  return { seq, type, provenance }
}

function claim(isError: boolean, code?: string, provenance: LedgerTerminalClaim['provenance'] = 'LIVE_FINAL'): LedgerTerminalClaim {
  return {
    isError,
    provenance,
    evidence: ref(1, 'tools/result', provenance),
    ...(code === undefined ? {} : { error: { name: 'HarnessError', code } }),
  }
}

type SourceEvent = { type: string; data: Record<string, unknown> }

function events(...sources: SourceEvent[]): readonly SessionEvent[] {
  return sources.map((source, seq) => ({ type: source.type, data: source.data, seq, time: seq }) as unknown as SessionEvent)
}

function bracket(body: SourceEvent[]): readonly SessionEvent[] {
  return events(
    { type: 'turn/start', data: { turn: 1 } },
    { type: 'step/start', data: { turn: 1, step: 1 } },
    ...body,
    { type: 'step/end', data: { turn: 1, step: 1 } },
    { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
  )
}

function call(callId: string, name = 'p2-tool'): SourceEvent {
  return { type: 'tool/call', data: { turn: 1, step: 1, callId, name, arguments: '{"secret":"private"}' } }
}

function result(callId: string, isError = false): SourceEvent {
  return {
    type: 'tool/result',
    data: {
      turn: 1,
      step: 1,
      message: { role: 'tool', content: [{ type: 'tool-result', toolCallId: callId, isError, content: [] }] },
    },
  }
}

function sessionWith(source: readonly SessionEvent[] = []): Session {
  return { id: 'p2-session', snapshotEvents: () => source } as unknown as Session
}

function execution(session: Session, callId = 'p2-live', name = 'p2-tool'): ToolExecution {
  return {
    callId: ToolCallId(callId),
    rootCallId: ToolCallId(callId),
    name,
    arguments: { secret: 'private' },
    agent: { session } as unknown as Agent,
    signal: new AbortController().signal,
    token: Symbol('p2-token') as ToolExecutionToken,
  }
}

describe('Phase 2 explicit failure classifier', () => {
  it('P2-01/P2-02/P2-03/P2-04/P2-05 classify exact terminal evidence', () => {
    expect(projectTerminalClaim(claim(false)).outcome).toMatchObject({
      terminalStatus: 'SUCCESS', semanticSuccess: 'unknown', failures: [],
    })
    expect(projectTerminalClaim(claim(true, 'TOOL_FAILED')).outcome.failures[0]).toMatchObject({
      kind: 'TOOL_ERROR', strength: 'AUTHORITATIVE',
    })
    expect(projectTerminalClaim(claim(true, 'TOOL_TIMEOUT')).outcome.failures[0]).toMatchObject({ kind: 'TIMEOUT' })
    expect(projectTerminalClaim(claim(true, 'ABORTED_BEFORE_DISPATCH')).outcome.failures[0]).toMatchObject({ kind: 'CANCELLED_BEFORE_DISPATCH' })
    expect(projectTerminalClaim(claim(true, 'ABORTED')).outcome.failures[0]).toMatchObject({ kind: 'CANCELLED_AFTER_DISPATCH' })
  })

  it('P2-03 reads timeout identity only from the structured error.info code', () => {
    const session = sessionWith()
    const controller = new LedgerController()
    const exec = execution(session)
    controller.observePreExecute(exec)
    controller.observeResult(exec, {
      isError: true,
      content: [],
      error: { message: 'private timeout text', info: { name: 'ToolTimeoutError', code: 'TOOL_TIMEOUT', reason: 'private' } },
    } as ToolExecutionResult)
    expect(controller.phase2(session).executions[0]!.outcome.failures).toMatchObject([{ kind: 'TIMEOUT', error: { name: 'ToolTimeoutError', code: 'TOOL_TIMEOUT' } }])
    expect(JSON.stringify(controller.phase2(session))).not.toContain('private')
  })

  it('P2-06/P2-07 require an effective witness and keep cancel separate from denial', () => {
    const denied: PreToolDecision = { kind: 'deny', reason: 'private-reason', info: { name: 'PolicyError', code: 'POLICY_DENIED', reason: 'private-reason' } }
    expect(projectPreExecuteDecision(denied)).toBeUndefined()
    const fact = projectPreExecuteDecision(denied, { effective: true, evidence: [ref()] })
    expect(fact).toMatchObject({ kind: 'PRE_EXECUTE_DENIED', error: { name: 'PolicyError', code: 'POLICY_DENIED' } })
    expect(JSON.stringify(fact)).not.toContain('private-reason')
    expect(projectPreExecuteDecision({ kind: 'cancel' }, { effective: true, evidence: [ref()] })).toMatchObject({ kind: 'CANCELLED_BEFORE_DISPATCH' })
  })

  it('P2-06 delegates pre-execute exactly once and returns the decision unchanged', async () => {
    const controller = new LedgerController()
    const session = sessionWith()
    const exec = execution(session)
    const decision: PreToolDecision = { kind: 'cancel' }
    let calls = 0
    const returned = await controller.observePreExecuteAndContinue(exec, async () => {
      calls += 1
      return decision
    })
    expect(calls).toBe(1)
    expect(returned).toBe(decision)
  })

  it('P2-08/P2-09 do not guess guard denial or relabel guard throws', () => {
    expect(projectGuardReturnedDenial({
      effectivePrePolicyAllowed: true,
      approvalFailure: false,
      callerCancelled: false,
      executeObserved: false,
      postExecuteObserved: false,
      finalResultFailure: true,
      evidence: [ref()],
    })).toBeUndefined()
    expect(projectGuardReturnedDenial({
      effectivePrePolicyAllowed: true,
      approvalFailure: false,
      callerCancelled: false,
      executeObserved: false,
      postExecuteObserved: true,
      finalResultFailure: true,
      evidence: [ref()],
    })).toMatchObject({ kind: 'GUARDRAIL_DENIED', strength: 'DETERMINISTIC' })
    expect(projectTerminalClaim(claim(true, 'UNKNOWN_TOOL')).outcome.failures[0]!.kind).toBe('TOOL_ERROR')
  })

  it('P2-10/P2-11/P2-12 consume only the pinned foreground process and sandbox DTO', () => {
    const value = {
      kind: 'foreground',
      exitCode: 0,
      stdout: { text: 'secret stdout', spillPath: 'C:\\private\\stdout' },
      stderr: { text: 'secret stderr' },
      sandbox: { mode: 'workspace-write', denied: true, enforcement: 'full' },
    }
    const accepted = projectShellResult('bash', value, [ref()])!
    expect(accepted.evidence).toMatchObject({ processSuccess: true, sandbox: { denied: true, mode: 'workspace-write' } })
    expect(accepted.failures).toMatchObject([{ kind: 'SANDBOX_DENIED', strength: 'AUTHORITATIVE' }])
    expect(JSON.stringify(accepted)).not.toContain('secret')
    expect(projectShellResult('pwsh', { ...value, exitCode: 7 }, [ref()])!.evidence.processSuccess).toBe(false)
    expect(projectShellResult('bash', { ...value, exitCode: null, sandbox: { mode: 'workspace-write', denied: false, runnerFailed: true } }, [ref()])!.failures).toMatchObject([{ kind: 'SANDBOX_UNAVAILABLE' }])
    expect(projectTerminalClaim(claim(true, 'SANDBOX_UNAVAILABLE')).outcome.failures[0]!.kind).toBe('SANDBOX_UNAVAILABLE')
    expect(projectShellResult('bash', { kind: 'background', jobId: 'private-job' }, [ref()])).toBeUndefined()
  })

  it('F1 keeps repeated shell evidence idempotent and conflicts fail closed', () => {
    const shell = (exitCode: number | null, denied: boolean) => ({
      isError: false,
      content: [],
      value: {
        kind: 'foreground',
        exitCode,
        stdout: { text: 'private-output' },
        stderr: { text: 'private-error' },
        sandbox: { mode: 'workspace-write', denied, enforcement: 'full' },
      },
    } as unknown as ToolExecutionResult)

    const repeatedSession = sessionWith()
    const repeated = new LedgerController()
    const repeatedExec = execution(repeatedSession, 'repeat-shell', 'bash')
    repeated.observePreExecute(repeatedExec)
    repeated.observeResult(repeatedExec, shell(0, false))
    repeated.observeResult(repeatedExec, shell(0, false))
    const repeatedOutcome = repeated.phase2(repeatedSession).executions[0]!
    expect(repeatedOutcome.outcome.processSuccess).toBe(true)
    expect(repeatedOutcome.issueCodes).not.toContain('SHELL_EVIDENCE_CONFLICT')

    for (const [first, second] of [[0, 7], [7, 0]] as const) {
      const session = sessionWith()
      const controller = new LedgerController()
      const exec = execution(session, `exit-conflict-${first}-${second}`, 'bash')
      controller.observePreExecute(exec)
      controller.observeResult(exec, shell(first, false))
      controller.observeResult(exec, shell(second, false))
      const item = controller.phase2(session).executions[0]!
      expect(item.outcome.processSuccess).toBe('unknown')
      expect(item.outcome.failures).toEqual([])
      expect(item.issueCodes).toContain('SHELL_EVIDENCE_CONFLICT')
      expect(item.health).toBe('DEGRADED')
    }

    for (const [first, second] of [[false, true], [true, false]] as const) {
      const session = sessionWith()
      const controller = new LedgerController()
      const exec = execution(session, `sandbox-conflict-${first}-${second}`, 'bash')
      controller.observePreExecute(exec)
      controller.observeResult(exec, shell(0, first))
      controller.observeResult(exec, shell(0, second))
      const item = controller.phase2(session).executions[0]!
      expect(item.outcome.processSuccess).toBe('unknown')
      expect(item.outcome.failures).not.toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'SANDBOX_DENIED' })]))
      expect(item.issueCodes).toContain('SHELL_EVIDENCE_CONFLICT')
    }

    const terminalConflictSession = sessionWith()
    const terminalConflict = new LedgerController()
    const terminalConflictExec = execution(terminalConflictSession, 'terminal-conflict', 'bash')
    terminalConflict.observePreExecute(terminalConflictExec)
    terminalConflict.observeResult(terminalConflictExec, shell(0, true))
    terminalConflict.observeResult(terminalConflictExec, {
      isError: true,
      content: [],
      error: { message: 'private error', info: { name: 'ToolError', code: 'TOOL_FAILED' } },
    } as unknown as ToolExecutionResult)
    const terminalConflictItem = terminalConflict.phase2(terminalConflictSession).executions[0]!
    expect(terminalConflictItem.terminal.status).toBe('UNKNOWN')
    expect(terminalConflictItem.outcome.processSuccess).toBe('unknown')
    expect(terminalConflictItem.outcome.failures).not.toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'SANDBOX_DENIED' })]))
    expect(terminalConflictItem.issueCodes).toContain('TERMINAL_CONFLICT')
  })

  it('F2 keeps self-certified authority witnesses out of the package root', () => {
    for (const name of [
      'projectPreExecuteDecision',
      'projectGuardReturnedDenial',
      'projectApprovalOutcome',
      'projectPtcProjection',
      'projectShellResult',
      'projectTerminalClaim',
      'projectTerminalClaims',
    ]) {
      expect(name in publicApi).toBe(false)
    }
  })

  it('F3 accepts only the pinned bounded sandbox mode and enforcement enums', () => {
    const base = {
      kind: 'foreground',
      exitCode: 0,
      sandbox: { denied: false },
    }
    expect(projectShellResult('bash', { ...base, sandbox: { mode: 'read-only', denied: false, enforcement: 'full' } }, [ref()])).toBeDefined()
    expect(projectShellResult('bash', { ...base, sandbox: { mode: 'unexpected-mode', denied: false, enforcement: 'full' } }, [ref()])).toBeUndefined()
    expect(projectShellResult('bash', { ...base, sandbox: { mode: 'workspace-write', denied: false, enforcement: 'unexpected-enforcement' } }, [ref()])).toBeUndefined()
    expect(projectShellResult('bash', { ...base, sandbox: { mode: 'x'.repeat(1024), denied: false } }, [ref()])).toBeUndefined()
  })

  it('P2-13/P2-14 projects approval facts without changing native authority or binding causes', () => {
    const base: LedgerApprovalFact = {
      sessionId: 'p2-session', approvalId: 'approval-1', toolName: 'p2-tool', callId: 'call-1',
      lifecycle: 'DECIDED', health: 'HEALTHY', provenance: 'DURABLE_SOURCE', outcome: 'rejected',
      binding: 'UNBOUND', source: [ref(4, 'approval/decided', 'DURABLE_SOURCE')], issueCodes: [],
    }
    expect(projectApprovalOutcome(base)).toMatchObject({ kind: 'APPROVAL_REJECTED', strength: 'DETERMINISTIC' })
    expect(projectApprovalOutcome({ ...base, outcome: 'cancelled' })).toMatchObject({ kind: 'APPROVAL_CANCELLED' })
    expect(projectApprovalOutcome({ ...base, outcome: 'unavailable' })).toMatchObject({ kind: 'APPROVAL_UNAVAILABLE' })
    expect(projectApprovalOutcome({ ...base, outcome: 'allowed-once' })).toBeUndefined()
    expect(projectApprovalOutcome({ ...base, binding: 'AMBIGUOUS' })).toMatchObject({ kind: 'APPROVAL_REJECTED' })
  })

  it('P2-15/P2-16 preserves idempotence and degrades terminal conflicts', () => {
    const source = bracket([call('duplicate'), result('duplicate'), result('duplicate', true)])
    const first = foldLedgerSnapshot('p2-session', source)
    const second = foldLedgerSnapshot('p2-session', source)
    expect(second).toEqual(first)
    const projection = projectTerminalClaims(first.executions[0]!.terminalClaims)
    expect(projection.terminal.status).toBe('UNKNOWN')
    expect(projection.outcome.failures).toMatchObject([{ kind: 'UNKNOWN', strength: 'UNKNOWN' }])
  })

  it('P2-17/P2-18 keeps equal call IDs in separate live and durable facts', () => {
    const source = bracket([call('same'), result('same')])
    const session = sessionWith(source)
    const controller = new LedgerController()
    const exec = execution(session, 'same')
    controller.observePreExecute(exec)
    controller.observeResult(exec, { isError: false, content: [], value: 'ok' } as ToolExecutionResult)
    const projection = controller.phase2(session)
    expect(projection.executions.map(item => item.occurrence.kind)).toEqual(['LIVE', 'DURABLE'])
    expect(projection.executions.every(item => item.outcome.semanticSuccess === 'unknown')).toBe(true)
  })

  it('P2-19 reuses the accepted PTC projector and keeps child failures nested', () => {
    const source = bracket([
      call('root', 'run_code'),
      { type: 'tool/ptc-dispatch-start', data: { rootCallId: 'root', parentCallId: 'root', subCallId: 'child', name: 'echo', arguments: { secret: 'private' } } },
      { type: 'tool/ptc-dispatch', data: { rootCallId: 'root', parentCallId: 'root', subCallId: 'child', name: 'echo', isError: true, content: [{ type: 'text', text: 'private' }] } },
    ])
    const ptc = projectPtcProjection(replayPtcSnapshot('p2-session', source))
    expect(ptc.occurrences[0]!.outcome.failures).toMatchObject([{ kind: 'TOOL_ERROR', strength: 'DETERMINISTIC' }])
    expect(ptc.occurrences[0]!.occurrence.kind).toBe('tool/ptc-dispatch-start')
  })

  it('P2-20/P2-21/P2-22 preserves disposal, bounds and privacy', () => {
    const controller = new LedgerController()
    const session = sessionWith()
    const exec = execution(session)
    controller.observePreExecute(exec)
    controller.dispose()
    controller.observeResult(exec, { isError: true, content: [{ type: 'text', text: 'private' }], error: { message: 'private' } } as ToolExecutionResult)
    expect(controller.phase2(session).executions[0]!.outcome.terminalStatus).toBe('UNKNOWN')
    const limited = foldLedgerSnapshot('p2-session', bracket([call('one'), call('two')]), { limit: 1 })
    expect(limited.truncated).toBe(true)
    expect(JSON.stringify(foldLedgerSnapshot('p2-session', bracket([call('private'), result('private')])))).not.toContain('secret')
    const dto = controller.phase2(session)
    expect(Object.isFrozen(dto)).toBe(true)
    expect(Object.isFrozen(dto.executions)).toBe(true)
  })
})
