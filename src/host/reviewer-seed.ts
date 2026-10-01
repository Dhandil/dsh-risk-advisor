import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import type { ExecutionId } from './correlation.ts'
import type { RuleEvaluation, RuleOperationKind, RuleParserConfidence } from './rule-engine.ts'
import { SecretRedactor } from './redactor.ts'

export interface ReviewerOperationSeed {
  readonly schemaVersion: 1
  readonly executionId: ExecutionId
  readonly toolName: string
  readonly operationKind: RuleOperationKind
  readonly operationText?: string
  readonly resourceHints: readonly string[]
  readonly requestedPermission?: 'workspace-write' | 'danger-full-access'
  readonly parserConfidence: RuleParserConfidence
  readonly mutating: boolean | 'unknown'
  readonly externalEffect: boolean | 'unknown'
  readonly networkEffect: 'none' | 'read' | 'write' | 'unknown'
  readonly truncated: boolean
}

export interface DirectUserContext {
  readonly messages: readonly string[]
  readonly historyOmitted: boolean
  readonly degraded: boolean
  readonly userChars: number
}

export interface ReviewerSeedCapture {
  readonly seed: ReviewerOperationSeed
  readonly redactionFailed: boolean
}

const TOOL_TEXT_LIMIT = 4096
const TOOL_NAME_LIMIT = 128
const RESOURCE_LIMIT = 512
const MAX_RESOURCES = 8
const MAX_TOTAL_TEXT = 12_000
const RING_MESSAGES = 4
const RING_CHARS = 8_000
const SEED_TTL_MS = 10 * 60 * 1000
const MAX_SEEDS = 256

export function captureReviewerSeed(
  executionId: ExecutionId,
  exec: ToolExecution,
  evaluation: RuleEvaluation,
  redactor = new SecretRedactor(),
): ReviewerSeedCapture {
  let redactionFailed = false
  const operationKind = evaluation.operationKind
  const extracted = allowlistedOperationFields(exec.name, exec.arguments, operationKind)
  const operationText = extracted.operationText === undefined
    ? undefined
    : redactBounded(extracted.operationText, TOOL_TEXT_LIMIT, redactor, () => { redactionFailed = true })
  const resourceHints = extracted.resourceHints
    .slice(0, MAX_RESOURCES)
    .map(item => redactBounded(item, RESOURCE_LIMIT, redactor, () => { redactionFailed = true }))
    .filter((item): item is string => item !== undefined)
  const rawToolName = bound(exec.name, TOOL_NAME_LIMIT)
  const toolName = rawToolName.value
  const total = [toolName, operationText ?? '', ...resourceHints].join('').length
  const truncated = extracted.truncated || rawToolName.truncated || total > MAX_TOTAL_TEXT
  const compactResources = truncateTotal(resourceHints, MAX_TOTAL_TEXT - toolName.length - (operationText?.length ?? 0))
  const seed: ReviewerOperationSeed = Object.freeze({
    schemaVersion: 1,
    executionId,
    toolName,
    operationKind,
    ...operationText === undefined ? {} : { operationText },
    resourceHints: Object.freeze(compactResources.values),
    ...evaluation.requestedPermission === undefined ? {} : { requestedPermission: evaluation.requestedPermission },
    parserConfidence: evaluation.parserConfidence,
    mutating: evaluation.mutating,
    externalEffect: evaluation.externalEffect,
    networkEffect: evaluation.networkEffect,
    truncated: truncated || compactResources.truncated,
  })
  return Object.freeze({ seed, redactionFailed })
}

export class ReviewerSeedStore {
  private readonly values = new Map<ExecutionId, { seed: ReviewerOperationSeed; createdAt: number }>()
  private active = true

  constructor(private readonly clock: () => number = () => Date.now()) {}

  capture(executionId: ExecutionId | undefined, exec: ToolExecution, evaluation: RuleEvaluation): ReviewerSeedCapture | undefined {
    if (!this.active || executionId === undefined) return undefined
    this.sweep()
    const captured = captureReviewerSeed(executionId, exec, evaluation)
    if (captured.redactionFailed) {
      this.values.delete(executionId)
      return captured
    }
    if (this.values.size >= MAX_SEEDS && !this.values.has(executionId)) {
      const oldest = this.values.keys().next().value as ExecutionId | undefined
      if (oldest !== undefined) this.values.delete(oldest)
    }
    this.values.delete(executionId)
    this.values.set(executionId, { seed: captured.seed, createdAt: this.clock() })
    return captured
  }

  get(executionId: ExecutionId): ReviewerOperationSeed | undefined {
    if (!this.active) return undefined
    this.sweep()
    return this.values.get(executionId)?.seed
  }

  dispose(): void {
    this.active = false
    this.values.clear()
  }

  private sweep(): void {
    const now = this.clock()
    for (const [id, entry] of this.values) if (!Number.isFinite(now) || now - entry.createdAt >= SEED_TTL_MS) this.values.delete(id)
  }
}

export class DirectUserRing {
  private readonly states = new WeakMap<Session, RingState>()
  private active = true

  constructor(private readonly redactor = new SecretRedactor()) {}

  observe(session: Session, event: SessionEvent): void {
    if (!this.active) return
    const state = this.states.get(session) ?? this.createState(session)
    const seq = readSeq(event)
    if (state.nextSeq !== undefined && seq !== undefined && seq !== state.nextSeq) state.historyOmitted = true
    if (seq !== undefined) state.nextSeq = seq + 1
    if (state.firstEvent) {
      state.firstEvent = false
      const firstLiveSeq = readNumber((session as unknown as { firstLiveSeq?: unknown }).firstLiveSeq)
      if (firstLiveSeq !== undefined && seq !== firstLiveSeq) state.historyOmitted = true
      if (firstLiveSeq === undefined) state.historyOmitted = true
    }
    if (event.type !== 'user/message' || event.data.source.kind !== 'user') return
    const text = textFromContent(event.data.content)
    if (text.length === 0) return
    let safe: string
    try { safe = this.redactor.redact(text.slice(0, RING_CHARS)).value } catch { state.degraded = true; state.historyOmitted = true; return }
    if (text.length > safe.length || text.length > RING_CHARS) state.historyOmitted = true
    state.messages.push(safe)
    while (state.messages.length > RING_MESSAGES) { state.messages.shift(); state.historyOmitted = true }
    while (totalChars(state.messages) > RING_CHARS) { state.messages.shift(); state.historyOmitted = true }
  }

  snapshot(session: Session): DirectUserContext {
    if (!this.active) return Object.freeze({ messages: Object.freeze([]), historyOmitted: true, degraded: true, userChars: 0 })
    const state = this.states.get(session)
    if (state === undefined) return Object.freeze({ messages: Object.freeze([]), historyOmitted: true, degraded: false, userChars: 0 })
    const messages = Object.freeze([...state.messages])
    return Object.freeze({ messages, historyOmitted: state.historyOmitted, degraded: state.degraded, userChars: totalChars(messages) })
  }

  disposeSession(session: Session): void { this.states.delete(session) }
  dispose(): void { this.active = false }

  private createState(session: Session): RingState {
    const state: RingState = { messages: [], historyOmitted: false, degraded: false, firstEvent: true, nextSeq: undefined }
    this.states.set(session, state)
    return state
  }
}

interface RingState {
  readonly messages: string[]
  historyOmitted: boolean
  degraded: boolean
  firstEvent: boolean
  nextSeq: number | undefined
}

interface Extraction {
  readonly operationText?: string
  readonly resourceHints: readonly string[]
  readonly truncated: boolean
}

function allowlistedOperationFields(toolName: string, args: unknown, operationKind: RuleOperationKind): Extraction {
  if (operationKind === 'shell' || /^(?:bash|pwsh|shell|run_shell|command|exec)$/i.test(toolName)) {
    const command = firstString(args, ['command', 'cmd', 'script', 'shell'])
    const workdir = firstString(args, ['workdir', 'cwd', 'working_directory'])
    return { ...command === undefined ? {} : { operationText: command }, resourceHints: workdir === undefined ? [] : [workdir], truncated: command !== undefined && command.length > TOOL_TEXT_LIMIT }
  }
  if (/^(?:read|write|edit|read_file|write_file|edit_file)$/i.test(toolName)) {
    const path = firstString(args, ['path', 'file_path', 'filePath', 'target'])
    return { resourceHints: path === undefined ? [] : [path], truncated: path !== undefined && path.length > RESOURCE_LIMIT }
  }
  if (/^(?:web_fetch|fetch)$/i.test(toolName)) {
    const url = firstString(args, ['url', 'uri'])
    return { ...url === undefined ? {} : { operationText: url }, resourceHints: url === undefined ? [] : [url], truncated: url !== undefined && url.length > TOOL_TEXT_LIMIT }
  }
  if (/^(?:web_search|search)$/i.test(toolName)) {
    const queries = firstStringArray(args, ['queries', 'query'])
    return { resourceHints: queries.slice(0, 4), truncated: queries.length > 4 || queries.some(item => item.length > RESOURCE_LIMIT) }
  }
  return { resourceHints: [], truncated: false }
}

function firstString(value: unknown, keys: readonly string[]): string | undefined {
  if (!isPlainObject(value)) return undefined
  for (const key of keys) if (typeof value[key] === 'string') return value[key]
  return undefined
}

function firstStringArray(value: unknown, keys: readonly string[]): string[] {
  if (!isPlainObject(value)) return []
  for (const key of keys) {
    if (typeof value[key] === 'string') return [value[key]]
    if (Array.isArray(value[key])) return value[key].filter((item): item is string => typeof item === 'string')
  }
  return []
}

function redactBounded(value: string | undefined, limit: number, redactor: SecretRedactor, onFailure: () => void): string | undefined {
  if (value === undefined) return undefined
  try { return bound(redactor.redact(value).value, limit).value } catch { onFailure(); return undefined }
}

function bound(value: string, limit: number): { readonly value: string; readonly truncated: boolean } {
  return value.length <= limit ? { value, truncated: false } : { value: value.slice(0, limit), truncated: true }
}

function truncateTotal(values: readonly string[], remaining: number): { readonly values: readonly string[]; readonly truncated: boolean } {
  const result: string[] = []
  let left = Math.max(0, remaining)
  let truncated = false
  for (const value of values) {
    if (left <= 0) { truncated = true; break }
    const next = value.slice(0, left)
    result.push(next)
    if (next.length !== value.length) truncated = true
    left -= next.length
  }
  return { values: result, truncated }
}

function textFromContent(content: readonly ContentBlock[]): string {
  return content.filter((block): block is ContentBlock & { type: 'text' } => block.type === 'text').map(block => block.text).join('')
}

function totalChars(values: readonly string[]): number { return values.reduce((total, value) => total + value.length, 0) }
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  try { return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null } catch { return false }
}
function readNumber(value: unknown): number | undefined { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined }
function readSeq(event: SessionEvent): number | undefined { return readNumber((event as unknown as { seq?: unknown }).seq) }
