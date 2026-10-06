import { mkdtemp } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { Context } from '@deepseek-ai/cordis'
import { Storage } from '@deepseek-ai/dsh-storage'
import { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { JsonStorageBackend } from '@deepseek-ai/dsh-storage-json'
import { ActiveExecutionIndex } from '../src/host/correlation.ts'
import type { ExecutionId } from '../src/host/correlation.ts'
import { RetryEscalationAnalyzer } from '../src/host/retry-escalation.ts'
import { RuleEngine } from '../src/host/rule-engine.ts'
import type { ExperienceRuntime } from '../src/host/experience-store.ts'

export interface ExecutionFixture {
  readonly session: Session
  readonly exec: ToolExecution
  readonly executionId: ExecutionId
  readonly index: ActiveExecutionIndex
  readonly rules: RuleEngine
  readonly failureChain: RetryEscalationAnalyzer
}

export function createExecutionFixture(options: {
  readonly name?: string
  readonly arguments?: unknown
  readonly callId?: string
  readonly sessionId?: string
} = {}): ExecutionFixture {
  const session = {
    id: options.sessionId ?? `p11-session-${randomUUID()}`,
    header: { cwd: tmpdir() },
  } as unknown as Session
  const callId = options.callId ?? `p11-call-${randomUUID()}`
  const exec = {
    name: options.name ?? 'p11-experience-probe',
    arguments: options.arguments ?? {},
    callId,
    rootCallId: callId,
    agent: { session },
    signal: new AbortController().signal,
    token: Symbol('p11-tool-token'),
  } as unknown as ToolExecution
  const index = new ActiveExecutionIndex()
  const executionId = index.observePreExecute(exec)
  if (executionId === undefined) throw new Error('fixture execution was not observed')
  const rules = new RuleEngine()
  const failureChain = new RetryEscalationAnalyzer()
  failureChain.observePreExecute(exec, executionId)
  rules.observePreExecute(exec, executionId, failureChain.diagnostics.get(executionId))
  return { session, exec, executionId, index, rules, failureChain }
}

export function observeApproval(fixture: ExecutionFixture, outcome: 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable', id = 'approval-private-sentinel'): void {
  fixture.index.observeSessionEvent(fixture.session, {
    type: 'approval/asked',
    data: { id, toolName: fixture.exec.name, callId: fixture.exec.callId },
  } as unknown as SessionEvent)
  fixture.index.observeSessionEvent(fixture.session, {
    type: 'approval/decided',
    data: { id, outcome },
  } as unknown as SessionEvent)
}

export function successResult(value: unknown = { ok: true }): ToolExecutionResult {
  return { isError: false, value: value as never, content: [{ type: 'text', text: 'safe result' }] }
}

export function failureResult(options: { readonly name?: string; readonly code?: string; readonly message?: string; readonly reason?: string; readonly content?: string } = {}): ToolExecutionResult {
  return {
    isError: true,
    error: {
      message: options.message ?? 'private-result-message-sentinel',
      info: {
        name: options.name ?? 'ProbeFailure',
        code: options.code ?? 'PROBE_FAILURE',
        ...options.reason === undefined ? {} : { reason: options.reason },
      },
    },
    content: [{ type: 'text', text: options.content ?? 'private-output-sentinel' }],
  }
}

export function observeSettled(fixture: ExecutionFixture, runtime: ExperienceRuntime, result: ToolExecutionResult, verifier?: (exec: ToolExecution, result: ToolExecutionResult) => void): void {
  fixture.failureChain.observeResult(fixture.exec, result)
  verifier?.(fixture.exec, result)
  runtime.observeResult(fixture.exec, result, fixture.index, fixture.executionId)
  fixture.index.observeResult(fixture.exec, result)
}

export interface JsonStorageFixture {
  readonly root: string
  readonly ctx: Context
  readonly backend: JsonStorageBackend
  readonly facility: DomainFacility
  close(): Promise<void>
}

export async function createJsonStorageFixture(root?: string): Promise<JsonStorageFixture> {
  const storageRoot = root ?? await mkdtemp(join(tmpdir(), 'ra-p11-1-storage-'))
  const ctx = new Context()
  await ctx.plugin(Storage)
  const backend = new JsonStorageBackend(storageRoot)
  const unregister = ctx.storage.backend.register('json', backend)
  const facility = new DomainFacility(ctx, { backend: 'json' })
  return {
    root: storageRoot,
    ctx,
    backend,
    facility,
    async close() {
      unregister()
      await backend.close()
      await ctx.fiber.dispose()
    },
  }
}

export interface FakeStorageFixture {
  readonly facility: DomainFacility
  readonly records: Map<string, unknown>
  readonly calls: { readonly put: { key: string; value: unknown }[]; closed: number }
}

export function createFakeStorageFixture(options: {
  readonly size?: number
  readonly seed?: readonly (readonly [string, unknown])[]
  readonly beforeOpen?: () => Promise<void>
  readonly open?: () => Promise<never>
  readonly put?: (key: string, value: unknown) => Promise<void>
} = {}): FakeStorageFixture {
  const records = new Map<string, unknown>(options.seed)
  const calls = { put: [] as { key: string; value: unknown }[], closed: 0 }
  const table = {
    get: (key: string) => records.get(key),
    entries: () => [...records.entries()][Symbol.iterator](),
    keys: () => [...records.keys()][Symbol.iterator](),
    get size() { return options.size ?? records.size },
    async put(key: string, value: unknown) {
      calls.put.push({ key, value })
      await options.put?.(key, value)
      records.set(key, value)
    },
    async delete(key: string) { return records.delete(key) },
    async update(key: string, update: (value: unknown) => unknown) {
      const next = update(records.get(key))
      records.set(key, next)
      return next
    },
  }
  const domain = {
    name: 'risk_advisor_experience',
    table: () => table,
    async close() { calls.closed += 1 },
  }
  const facility = {
    async open() {
      await options.beforeOpen?.()
      if (options.open !== undefined) return await options.open()
      return domain
    },
  } as unknown as DomainFacility
  return { facility, records, calls }
}
