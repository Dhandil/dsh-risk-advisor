import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Session } from '@deepseek-ai/dsh-session'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { defineTool } from '@deepseek-ai/dsh-tools'
import type { ToolExecution, ToolExecutionResult, ToolExecutionToken } from '@deepseek-ai/dsh-tools'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { apply } from '../src/index.ts'
import {
  LiveCorrectionRuntime,
  liveCorrectionFindingId,
  LIVE_CORRECTION_TTL_MS,
} from '../src/host/live-correction.ts'
import { RetryEscalationAnalyzer } from '../src/host/retry-escalation.ts'
import type { FailureChainSummary } from '../src/host/retry-escalation.ts'
import type { VerificationRecordV1 } from '../src/host/verification-store.ts'

function owner(id: string): Session {
  return { id, header: { cwd: 'D:\\Harness\\p12-fixture' } } as unknown as Session
}

function exec(session: Session, id: string, command = 'pnpm test'): ToolExecution {
  return {
    callId: id,
    rootCallId: id,
    name: 'bash',
    arguments: { command, description: 'run tests' },
    agent: { session } as unknown as Agent,
    signal: new AbortController().signal,
    token: Symbol(id) as ToolExecutionToken,
  } as ToolExecution
}

function failedResult(code = 'TOOL_TIMEOUT'): ToolExecutionResult {
  return {
    isError: true,
    content: [],
    error: { message: 'private failure', info: { name: 'HarnessError', code } },
  } as ToolExecutionResult
}

function successResult(): ToolExecutionResult {
  return { isError: false, content: [], value: 'ok' } as ToolExecutionResult
}

function summary(id: string, overrides: Partial<FailureChainSummary> = {}): FailureChainSummary {
  return Object.freeze({
    executionId: id,
    status: 'READY',
    retryOf: 'prior',
    retryCount: 1,
    recentFailureCount: 2,
    sameRootCause: true,
    permissionEscalation: false,
    truncated: false,
    reasonCodes: Object.freeze([]),
    recent: Object.freeze([
      Object.freeze({ executionId: 'prior', failureKind: 'PROCESS_FAILURE' as const }),
      Object.freeze({ executionId: id, failureKind: 'PROCESS_FAILURE' as const }),
    ]),
    ...overrides,
  })
}

function mismatch(id: string, overrides: Partial<VerificationRecordV1> = {}): VerificationRecordV1 {
  return Object.freeze({
    schemaVersion: 1,
    executionId: id,
    adapterId: 'tool.write.v1',
    source: 'tool-contract',
    status: 'MISMATCHED',
    semanticSuccess: false,
    evidenceQuality: 'high',
    reasonCodes: Object.freeze(['POSTCONDITION_MISMATCH']),
    observedAt: 100,
    durationMs: 1,
    ...overrides,
  })
}

describe('Phase 12.1 live correction finding core', () => {
  it('C1 emits one F1 for a ready exact-operation same-signature retry chain', () => {
    const runtime = new LiveCorrectionRuntime({ clock: () => 10 })
    const session = owner('c1')
    runtime.observeSettledResult(exec(session, 'current'), 'current', summary('current'))
    const findings = runtime.diagnostics.forExecution('current')
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      kind: 'REPEATED_FAILURE_WITHOUT_PROGRESS',
      diagnosis: 'REPEATED_SAME_SIGNATURE_FAILURE',
      disposition: 'ADVISE',
      advisoryCode: 'STOP_EXACT_RETRY_PATH_V1',
      retryCount: 1,
      recentFailureCount: 2,
    })
  })

  it('C2 changed command/fingerprint does not enter the exact-operation retry relation', () => {
    const runtime = new LiveCorrectionRuntime()
    const analyzer = new RetryEscalationAnalyzer()
    const session = owner('c2')
    const first = exec(session, 'first', 'pnpm test')
    analyzer.observePreExecute(first, 'first')
    analyzer.observeResult(first, failedResult())
    const changed = exec(session, 'changed', 'pnpm test --force')
    analyzer.observePreExecute(changed, 'changed')
    analyzer.observeResult(changed, failedResult())
    const relation = analyzer.diagnostics.get('changed')
    expect(relation.retryOf).toBeUndefined()
    runtime.observeSettledResult(changed, 'changed', relation)
    expect(runtime.diagnostics.forExecution('changed')).toEqual([])
  })

  it('C3 a settled success breaks the same-fingerprint retry chain', () => {
    const runtime = new LiveCorrectionRuntime()
    const analyzer = new RetryEscalationAnalyzer()
    const session = owner('c3')
    const first = exec(session, 'first')
    analyzer.observePreExecute(first, 'first')
    analyzer.observeResult(first, failedResult())
    const succeeded = exec(session, 'succeeded')
    analyzer.observePreExecute(succeeded, 'succeeded')
    analyzer.observeResult(succeeded, successResult())
    const after = exec(session, 'after-success')
    analyzer.observePreExecute(after, 'after-success')
    analyzer.observeResult(after, failedResult())
    const relation = analyzer.diagnostics.get('after-success')
    expect(relation.retryOf).toBeUndefined()
    runtime.observeSettledResult(after, 'after-success', relation)
    expect(runtime.diagnostics.forExecution('after-success')).toHaveLength(0)
  })

  it('C4 degraded, truncated, unsupported and unknown-root relations fail closed', () => {
    const session = owner('c4')
    for (const [id, value] of [
      ['degraded', summary('degraded', { status: 'DEGRADED' })],
      ['truncated', summary('truncated', { truncated: true })],
      ['unsupported', summary('unsupported', { status: 'UNSUPPORTED' })],
      ['unknown-root', summary('unknown-root', { sameRootCause: 'unknown' })],
    ] as const) {
      const runtime = new LiveCorrectionRuntime()
      runtime.observeSettledResult(exec(session, id), id, value)
      expect(runtime.diagnostics.forExecution(id)).toHaveLength(0)
    }
  })

  it('C5 duplicate F1 observation is idempotent even when the clock advances', () => {
    let now = 1
    const runtime = new LiveCorrectionRuntime({ clock: () => now })
    const session = owner('c5')
    const value = exec(session, 'dup')
    runtime.observeSettledResult(value, 'dup', summary('dup'))
    now = 2
    runtime.observeSettledResult(value, 'dup', summary('dup'))
    expect(runtime.diagnostics.forExecution('dup')).toHaveLength(1)
  })

  it('C6 emits F2 for a supported high-quality direct postcondition mismatch', () => {
    const runtime = new LiveCorrectionRuntime()
    const session = owner('c6')
    runtime.observeSettledResult(exec(session, 'direct'), 'direct', undefined)
    runtime.observeVerification(mismatch('direct'))
    expect(runtime.diagnostics.forExecution('direct')).toEqual([
      expect.objectContaining({
        kind: 'POSTCONDITION_NOT_SATISFIED',
        diagnosis: 'VERIFIED_POSTCONDITION_MISMATCH',
        advisoryCode: 'INSPECT_UNSATISFIED_POSTCONDITION_V1',
        verifierSource: 'tool-contract',
        verifierAdapterId: 'tool.write.v1',
        evidenceQuality: 'high',
      }),
    ])
  })

  it('C7 accepts supported medium-quality known-adapter mismatch after result association exists', () => {
    const runtime = new LiveCorrectionRuntime()
    const session = owner('c7')
    runtime.observeSettledResult(exec(session, 'async'), 'async', undefined)
    runtime.observeVerification(mismatch('async', {
      adapterId: 'git.branch-switch.v1',
      source: 'known-adapter',
      evidenceQuality: 'medium',
    }))
    expect(runtime.diagnostics.forExecution('async')).toHaveLength(1)
  })

  it('C8 MATCHED/UNKNOWN/UNAVAILABLE/low-quality/unsupported records do not emit F2', () => {
    const session = owner('c8')
    const cases: VerificationRecordV1[] = [
      mismatch('matched', { status: 'MATCHED', semanticSuccess: true, reasonCodes: ['POSTCONDITION_MATCHED'] }),
      mismatch('unknown', { status: 'UNKNOWN', semanticSuccess: 'unknown', evidenceQuality: 'low', reasonCodes: ['VERIFIER_RESULT_UNSUPPORTED'] }),
      mismatch('unavailable', { status: 'UNAVAILABLE', semanticSuccess: 'unknown', evidenceQuality: 'low', reasonCodes: ['VERIFIER_CAPABILITY_UNAVAILABLE'] }),
      mismatch('low', { evidenceQuality: 'low' }),
      mismatch('unsupported-adapter', { adapterId: 'unknown.v1' as VerificationRecordV1['adapterId'] }),
    ]
    for (const value of cases) {
      const runtime = new LiveCorrectionRuntime()
      runtime.observeSettledResult(exec(session, value.executionId), value.executionId, undefined)
      runtime.observeVerification(value)
      expect(runtime.diagnostics.forExecution(value.executionId)).toHaveLength(0)
    }
  })

  it('C9 verifier conflict suppresses a previously emitted F2 without rewriting it', () => {
    const runtime = new LiveCorrectionRuntime()
    const session = owner('c9')
    runtime.observeSettledResult(exec(session, 'conflict'), 'conflict', undefined)
    runtime.observeVerification(mismatch('conflict'))
    const id = liveCorrectionFindingId('conflict', 'POSTCONDITION_NOT_SATISFIED')
    expect(runtime.diagnostics.get(id)).toBeDefined()
    runtime.observeVerification(mismatch('conflict', {
      status: 'UNKNOWN',
      semanticSuccess: 'unknown',
      evidenceQuality: 'low',
      reasonCodes: ['VERIFICATION_CONFLICT'],
      observedAt: 101,
    }))
    expect(runtime.diagnostics.get(id)).toBeUndefined()
    expect(runtime.diagnostics.forExecution('conflict')).toHaveLength(0)
    runtime.observeVerification(mismatch('conflict', { observedAt: 102 }))
    expect(runtime.diagnostics.forExecution('conflict')).toHaveLength(0)
  })

  it('C10 product wiring associates direct synchronous verifier results before publication', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    apply(ctx)
    const session = ctx.sessions.create('p12-direct-order')
    session.append('turn/start', { turn: 1 })
    const agent = { session } as unknown as Agent
    let executionId: string | undefined
    ctx.on('tools/pre-execute', (tool, next) => {
      const found = ctx.get('riskAdvisorCorrelation').lookup(tool.agent?.session, tool.callId)
      if (found.status === 'FOUND') executionId = found.executionId
      return next()
    })
    ctx.tools.register(defineTool({
      name: 'write',
      description: 'p12 mismatch fixture',
      parameters: { file_path: { type: 'string', required: true }, content: { type: 'string', required: true } },
      output: { schema: { type: 'object', additionalProperties: true }, render: () => [{ type: 'text' as const, text: 'fixture' }] },
      async execute(args) {
        return { path: args.file_path, operation: 'create', before: null, after: 'wrong-content' }
      },
    }))
    try {
      await ctx.tools.execute({
        signal: new AbortController().signal,
        callId: ToolCallId('p12-order-write'),
        name: 'write',
        arguments: { file_path: 'out.txt', content: 'expected-content' },
        agent,
      })
      expect(executionId).toBeDefined()
      expect(ctx.get('riskAdvisorLiveCorrection').forExecution(executionId!)).toEqual([
        expect.objectContaining({ kind: 'POSTCONDITION_NOT_SATISFIED' }),
      ])
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('C11 finding identity is deterministic and partitioned by kind', () => {
    expect(liveCorrectionFindingId('same', 'REPEATED_FAILURE_WITHOUT_PROGRESS'))
      .toBe(liveCorrectionFindingId('same', 'REPEATED_FAILURE_WITHOUT_PROGRESS'))
    expect(liveCorrectionFindingId('same', 'REPEATED_FAILURE_WITHOUT_PROGRESS'))
      .not.toBe(liveCorrectionFindingId('same', 'POSTCONDITION_NOT_SATISFIED'))
    expect(liveCorrectionFindingId('same', 'POSTCONDITION_NOT_SATISFIED')).toMatch(/^ra-correction-v1_[a-f0-9]{64}$/)
  })

  it('C12 renderer output is fixed and contains no free-form input', () => {
    const runtime = new LiveCorrectionRuntime()
    const session = owner('c12')
    runtime.observeSettledResult(exec(session, 'render'), 'render', summary('render'))
    const id = liveCorrectionFindingId('render', 'REPEATED_FAILURE_WITHOUT_PROGRESS')
    expect(runtime.diagnostics.render(id)).toBe('The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.')
  })

  it('C13 retained Finding state excludes raw command/path/output/prompt/secret sentinels', () => {
    const runtime = new LiveCorrectionRuntime()
    const session = owner('private-secret-command-path-output-prompt')
    runtime.observeSettledResult(exec(session, 'privacy'), 'privacy', summary('privacy'))
    runtime.observeVerification(mismatch('privacy'))
    const text = JSON.stringify(runtime.diagnostics.forExecution('privacy'))
    for (const sentinel of ['pnpm test', 'D:\\Harness', 'stdout', 'stderr', 'prompt', 'secret', 'file_path', 'command']) {
      expect(text).not.toContain(sentinel)
    }
  })

  it('C14 TTL and per-session/global/association bounds degrade only correction state', () => {
    let now = 0
    const runtime = new LiveCorrectionRuntime({ clock: () => now, maxPerSession: 1, maxGlobal: 2, maxAssociations: 1 })
    const a = owner('a')
    const b = owner('b')
    const c = owner('c')
    runtime.observeSettledResult(exec(a, 'a1'), 'a1', summary('a1'))
    runtime.observeSettledResult(exec(a, 'a2'), 'a2', summary('a2'))
    expect(runtime.diagnostics.forSession(a).findings).toHaveLength(1)
    expect(runtime.diagnostics.forSession(a).truncated).toBe(true)
    runtime.observeSettledResult(exec(b, 'b1'), 'b1', summary('b1'))
    expect(runtime.diagnostics.forSession(b).findings).toHaveLength(1)
    runtime.observeSettledResult(exec(c, 'c1'), 'c1', summary('c1'))
    const retained = [
      ...runtime.diagnostics.forSession(a).findings,
      ...runtime.diagnostics.forSession(b).findings,
      ...runtime.diagnostics.forSession(c).findings,
    ]
    expect(retained).toHaveLength(2)
    expect(runtime.diagnostics.forSession(a).truncated || runtime.diagnostics.forSession(b).truncated).toBe(true)
    runtime.observeVerification(mismatch('a2'))
    expect(runtime.diagnostics.forExecution('a2').some(item => item.kind === 'POSTCONDITION_NOT_SATISFIED')).toBe(false)
    now = LIVE_CORRECTION_TTL_MS
    expect(runtime.diagnostics.forSession(a).findings).toHaveLength(0)
    expect(runtime.diagnostics.forSession(b).findings).toHaveLength(0)
    expect(runtime.diagnostics.forSession(c).findings).toHaveLength(0)
  })

  it('C15 session disposal removes only that session findings and associations', () => {
    const runtime = new LiveCorrectionRuntime()
    const a = owner('c15-a')
    const b = owner('c15-b')
    runtime.observeSettledResult(exec(a, 'a'), 'a', summary('a'))
    runtime.observeSettledResult(exec(b, 'b'), 'b', summary('b'))
    runtime.disposeSession(a)
    expect(runtime.diagnostics.forSession(a).findings).toHaveLength(0)
    expect(runtime.diagnostics.forSession(b).findings).toHaveLength(1)
    runtime.observeVerification(mismatch('a'))
    expect(runtime.diagnostics.forExecution('a')).toHaveLength(0)
  })

  it('C16 runtime dispose clears state and ignores later result/verifier observations', () => {
    const runtime = new LiveCorrectionRuntime()
    const session = owner('c16')
    runtime.observeSettledResult(exec(session, 'before'), 'before', summary('before'))
    runtime.dispose()
    expect(runtime.diagnostics.forExecution('before')).toHaveLength(0)
    runtime.observeSettledResult(exec(session, 'after'), 'after', summary('after'))
    runtime.observeVerification(mismatch('after'))
    expect(runtime.diagnostics.forExecution('after')).toHaveLength(0)
  })

  it('C17 source has no execution/approval/risk mutation or browser route dependency', async () => {
    const cwd = (globalThis as unknown as { process: { cwd(): string } }).process.cwd()
    const source = await readFile(join(cwd, 'src/host/live-correction.ts'), 'utf8')
    for (const forbidden of ['browser-bridge', 'assessment-envelope', 'risk-engine', 'user-approval', 'tools/pre-execute', 'retry(', 'cancel(', 'replan']) {
      expect(source).not.toContain(forbidden)
    }
  })

  it('C18 source has no Pattern/Guidance/LLM/model authority', async () => {
    const cwd = (globalThis as unknown as { process: { cwd(): string } }).process.cwd()
    const source = await readFile(join(cwd, 'src/host/live-correction.ts'), 'utf8')
    for (const forbidden of ['pattern-store', 'guidance-store', 'dsh-llm', 'FastJudge', 'DeepJudge', 'embedding']) {
      expect(source).not.toContain(forbidden)
    }
  })

  it('C19 F1 consumes an immutable summary without mutating existing Failure Chain data', () => {
    const runtime = new LiveCorrectionRuntime()
    const session = owner('c19')
    const value = summary('immutable')
    const before = JSON.stringify(value)
    runtime.observeSettledResult(exec(session, 'immutable'), 'immutable', value)
    expect(JSON.stringify(value)).toBe(before)
  })

  it('C20 Phase 12.1 diagnostics remain Host-only and package bridge contract is unchanged', async () => {
    const cwd = (globalThis as unknown as { process: { cwd(): string } }).process.cwd()
    const index = await readFile(join(cwd, 'src/index.ts'), 'utf8')
    const bridge = await readFile(join(cwd, 'src/bridge-contract.ts'), 'utf8')
    expect(index).toContain("ctx.provide('riskAdvisorLiveCorrection', liveCorrection.diagnostics)")
    expect(bridge).not.toContain('LiveCorrection')
    expect(bridge).not.toContain('ra-correction-v1_')
  })
})
