import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { HarnessError, ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { defineContentToolFixture, defineTool } from '@deepseek-ai/dsh-tools'
import { SessionId } from '@deepseek-ai/dsh-session'
import type { Phase13OperationV1 } from './operations.ts'
import type { PublicCorrelationDiagnostic, PublicLiveCorrectionDiagnostic, PublicVerificationDiagnostic } from './capture.ts'
import { captureExecutionId, captureFindings, captureSessionFindingIds } from './capture.ts'

export interface SubjectStepResult {
  readonly executionId?: string
  readonly executionCapture: 'VALID' | 'CAPTURE_INVALID'
  readonly diagnosticCapture: 'VALID' | 'CAPTURE_INVALID'
  readonly captureReason?: string
  readonly actualProcess: 'SUCCESS' | 'FAILURE' | 'UNKNOWN'
  readonly actualKinds: readonly string[]
  readonly actualFindingIds: readonly string[]
  readonly beforeSessionFindingIds: readonly string[]
  readonly afterSessionFindingIds: readonly string[]
  readonly afterSessionTruncated: boolean
  readonly verificationStatus?: 'MATCHED' | 'MISMATCHED' | 'UNKNOWN' | 'UNAVAILABLE'
  readonly verificationCapture: 'VALID' | 'CAPTURE_INVALID' | 'NOT_REQUIRED' | 'MISSING'
}

interface ProbeRow { readonly executionId?: string; readonly reason?: string }

function callId(value: string): string {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(value)) throw new TypeError('phase13-call-id-invalid')
  return value
}

/** Real pinned Harness + product wiring, with only synthetic deterministic tools and shell capability. */
export class Phase13Subject {
  readonly ctx = new Context()
  private readonly probes = new Map<string, ProbeRow>()
  private readonly sessions = new Map<string, { readonly session: any; readonly agent: Agent }>()
  private readonly operationsByCallId = new Map<string, Phase13OperationV1>()
  private readonly completedCalls = new Set<string>()
  private disposed = false

  private constructor() {}

  static async create(): Promise<Phase13Subject> {
    const subject = new Phase13Subject()
    await subject.ctx.plugin(SessionStore)
    await subject.ctx.plugin(SystemPrompt)
    await subject.ctx.plugin(ToolRuntime)
    subject.installSyntheticCapabilities()
    // Subject first; this observer is explicitly mounted after Risk Advisor.
    const { apply } = await import('../../src/index.ts')
    apply(subject.ctx)
    subject.ctx.on('tools/pre-execute', (exec, next) => {
      const id = String(exec.callId)
      if (subject.operationsByCallId.has(id)) {
        const result = captureExecutionId(subject.ctx.get('riskAdvisorCorrelation') as PublicCorrelationDiagnostic, exec.agent?.session, id)
        subject.probes.set(id, result.status === 'FOUND' ? { executionId: result.executionId } : { reason: result.reason })
      }
      return next()
    })
    subject.registerTools()
    return subject
  }

  private installSyntheticCapabilities(): void {
    const shell = {
      sandboxMode: 'workspace-write',
      resolve(request: Record<string, unknown>) { return request },
      async run(spec: Record<string, unknown>) {
        const env = spec.env as Record<string, string> | undefined
        const target = env?.RA_TARGET ?? ''
        const status = target.endsWith('phase13-fault') ? 'MISMATCHED' : 'MATCHED'
        return { exitCode: 0, stdout: { text: status, truncated: false }, stderr: { text: '', truncated: false }, sandbox: { mode: 'workspace-write', denied: false } }
      },
    }
    const sandboxPolicy = {
      resolve: ({ session, mode }: { session: { readonly meta?: { readonly cwd?: string } }; mode: 'read-only' | 'workspace-write' | 'danger-full-access' }) => ({ mode, workspaceRoot: session.meta?.cwd ?? '/tmp/dsh-risk-advisor-phase13-unavailable' }),
    }
    this.ctx.provide('shell', shell)
    this.ctx.provide('sandboxPolicy', sandboxPolicy)
  }

  private registerTools(): void {
    this.ctx.tools.register(defineContentToolFixture({
      name: 'read', description: 'Phase 13 bounded synthetic read fixture',
      parameters: { file_path: { type: 'string', required: true } },
      async execute(_args, exec) {
        const operation = (exec as unknown as { callId: string }).callId
        const current = thisSubject.operationsByCallId.get(String(operation))
        if (current?.behavior === 'FAIL') throw new HarnessError('PHASE13_SYNTHETIC_FAILURE', 'TOOL_TIMEOUT')
        return [{ type: 'text' as const, text: 'synthetic-ok' }]
      },
    }))
    const thisSubject = this
    this.ctx.tools.register(defineTool({
      name: 'write', description: 'Phase 13 bounded direct verifier fixture',
      parameters: { file_path: { type: 'string', required: true }, content: { type: 'string', required: true } },
      output: { schema: { type: 'object', additionalProperties: true }, render: () => [{ type: 'text' as const, text: 'synthetic-write' }] },
      async execute(args, exec) {
        const current = thisSubject.operationsByCallId.get(String(exec.callId))
        return { path: args.file_path, operation: 'create', before: null, after: current?.behavior === 'WRITE_MISMATCH' ? 'controlled-wrong-content' : args.content }
      },
    }))
    this.ctx.tools.register(defineTool({
      name: 'bash', description: 'Phase 13 bounded synthetic shell fixture',
      parameters: { command: { type: 'string', required: true }, description: { type: 'string' } },
      output: { schema: { type: 'object', additionalProperties: true }, render: () => [{ type: 'text' as const, text: 'synthetic-shell' }] },
      async execute(_args) {
        return { kind: 'foreground', exitCode: 0, stdout: { text: '', truncated: false }, stderr: { text: '', truncated: false }, sandbox: { mode: 'workspace-write', denied: false } }
      },
    }))
  }

  private getSession(sessionKey: string, cwd: string): { readonly session: any; readonly agent: Agent } {
    const prior = this.sessions.get(sessionKey)
    if (prior !== undefined) return prior
    const session = this.ctx.sessions.create(SessionId(sessionKey), { meta: { cwd } })
    session.append('turn/start', { turn: 1 })
    const created = { session, agent: { session } as unknown as Agent }
    this.sessions.set(sessionKey, created)
    return created
  }

  async execute(input: {
    readonly scenarioId: string
    readonly sessionKey: string
    readonly cwd: string
    readonly stepId: string
    readonly operation: Phase13OperationV1
    readonly sequence: number
  }): Promise<SubjectStepResult> {
    if (this.disposed) throw new Error('phase13-subject-disposed')
    const syntheticCallId = callId(`p13-${input.sequence}-${input.stepId}`)
    if (this.completedCalls.has(syntheticCallId)) throw new Error('phase13-duplicate-call-id')
    this.completedCalls.add(syntheticCallId)
    this.operationsByCallId.set(syntheticCallId, input.operation)
    const { session, agent } = this.getSession(input.sessionKey, input.cwd)
    const live = this.ctx.get('riskAdvisorLiveCorrection') as PublicLiveCorrectionDiagnostic
    const verification = this.ctx.get('riskAdvisorVerification') as PublicVerificationDiagnostic
    const before = captureSessionFindingIds(live, session)
    const beforeIds = before.status === 'VALID' ? before.ids : []
    const args = { ...input.operation.arguments }
    let result: any
    try {
      result = await this.ctx.tools.execute({
        signal: new AbortController().signal,
        callId: ToolCallId(syntheticCallId),
        name: input.operation.toolName,
        arguments: args,
        agent,
      })
    } catch { result = { isError: true } }
    const captured = this.probes.get(syntheticCallId)
    this.probes.delete(syntheticCallId)
    this.operationsByCallId.delete(syntheticCallId)
    const findings = captured?.executionId === undefined
      ? undefined
      : captureFindings(live, session, captured.executionId)
    const actualFindings = findings?.status === 'VALID' ? findings.findings : []
    const afterIds = findings?.status === 'VALID' ? findings.sessionFindingIds : []
    const verificationValue = captured?.executionId === undefined || input.operation.toolName !== 'bash' || input.operation.behavior === 'SUCCESS'
      ? undefined
      : verification.get(captured.executionId)
    const verificationStatus = verificationValue !== undefined && ['MATCHED', 'MISMATCHED', 'UNKNOWN', 'UNAVAILABLE'].includes((verificationValue as { status?: string }).status ?? '')
      ? (verificationValue as { status: 'MATCHED' | 'MISMATCHED' | 'UNKNOWN' | 'UNAVAILABLE' }).status
      : undefined
    const isDirect = input.operation.toolName === 'write'
    const verificationCapture: SubjectStepResult['verificationCapture'] = !isDirect && input.operation.toolName !== 'bash'
      ? 'NOT_REQUIRED'
      : captured === undefined
        ? 'CAPTURE_INVALID'
        : isDirect || input.operation.behavior === 'SHELL_MATCH' || input.operation.behavior === 'SHELL_MISMATCH'
          ? verificationStatus === undefined ? 'MISSING' : 'VALID'
          : 'NOT_REQUIRED'
    return Object.freeze({
      ...(captured === undefined ? {} : { executionId: captured.executionId }),
      executionCapture: captured?.executionId === undefined ? 'CAPTURE_INVALID' : 'VALID',
      diagnosticCapture: before.status === 'VALID' && findings?.status === 'VALID' ? 'VALID' : 'CAPTURE_INVALID',
      ...(captured?.reason === undefined ? {} : { captureReason: captured.reason }),
      actualProcess: result?.isError === true ? 'FAILURE' : result?.isError === false ? 'SUCCESS' : 'UNKNOWN',
      actualKinds: Object.freeze(actualFindings.map(item => item.kind)),
      actualFindingIds: Object.freeze(actualFindings.map(item => item.findingId)),
      beforeSessionFindingIds: Object.freeze(beforeIds),
      afterSessionFindingIds: Object.freeze(afterIds),
      afterSessionTruncated: findings?.status === 'VALID' && findings.truncated,
      ...(verificationStatus === undefined ? {} : { verificationStatus }),
      verificationCapture,
    })
  }

  capturePublicState(sessionKey: string, executionId: string): { readonly actualKinds: readonly string[]; readonly actualFindingIds: readonly string[]; readonly sessionFindingIds: readonly string[]; readonly sessionTruncated: boolean } | undefined {
    const owner = this.sessions.get(sessionKey)
    if (owner === undefined) return undefined
    const live = this.ctx.get('riskAdvisorLiveCorrection') as PublicLiveCorrectionDiagnostic
    const findings = captureFindings(live, owner.session, executionId)
    if (findings.status !== 'VALID') return undefined
    return Object.freeze({
      actualKinds: Object.freeze(findings.findings.map(item => item.kind)),
      actualFindingIds: Object.freeze(findings.findings.map(item => item.findingId)),
      sessionFindingIds: findings.sessionFindingIds,
      sessionTruncated: findings.truncated,
    })
  }

  verificationDiagnostics(): PublicVerificationDiagnostic {
    return this.ctx.get('riskAdvisorVerification') as PublicVerificationDiagnostic
  }

  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    this.operationsByCallId.clear(); this.probes.clear(); this.sessions.clear()
    await this.ctx.fiber.dispose()
  }
}
