import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { PreToolDecision, ToolExecution, ToolExecutionResult, ToolExecutionToken } from '@deepseek-ai/dsh-tools'
import type { ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import {
  PTC_REPLAY_LIMITS,
  replayPtcSnapshot,
  type PtcReplayProjection,
} from './ptc-replay.ts'
import {
  makePhase2ApprovalProjection,
  projectPtcProjection,
  projectShellResult,
  projectTerminalClaims,
  type Phase2ExecutionOutcomeRecord,
  type Phase2LedgerSnapshot,
  type ShellEvidence,
} from './explicit-failure.ts'

export const LEDGER_LIMITS = Object.freeze({
  maxRetainedFacts: 128,
  maxSourceEvents: 10_000,
  maxIssues: 128,
  defaultQueryLimit: 128,
})

export type LedgerHealth = 'HEALTHY' | 'DEGRADED' | 'RECOVERED'
export type LedgerProvenance =
  | 'LIVE_FINAL'
  | 'LIVE_START'
  | 'DURABLE_SOURCE'
  | 'CONFIRMATION'
  | 'REPLAY_RECOVERED'
  | 'UNKNOWN'
export type ExecutionLifecycle = 'PREPARING' | 'DISPATCHING' | 'SETTLED' | 'INCOMPLETE' | 'UNRESOLVED'
export type ApprovalLifecycle = 'PENDING' | 'DECIDED' | 'STALE' | 'UNBOUND' | 'AMBIGUOUS'

export interface LedgerEvidenceRef {
  readonly seq: number
  readonly type: string
  readonly provenance: LedgerProvenance
}

export interface LedgerIssue {
  readonly code: string
  readonly seq?: number
  readonly provenance: LedgerProvenance
}

export interface LedgerTerminalClaim {
  readonly isError: boolean
  readonly provenance: Extract<LedgerProvenance, 'LIVE_FINAL' | 'DURABLE_SOURCE' | 'CONFIRMATION'>
  readonly evidence?: LedgerEvidenceRef
  readonly error?: { readonly name: string; readonly code: string }
}

export interface LedgerExecutionFact {
  readonly sessionId: string
  readonly occurrence: {
    readonly kind: 'DURABLE' | 'LIVE'
    readonly callSeq?: number
    readonly liveOrdinal?: number
    readonly turn?: number
    readonly step?: number
    readonly callId?: string
    readonly toolName?: string
  }
  readonly lifecycle: ExecutionLifecycle
  readonly health: LedgerHealth
  readonly provenance: LedgerProvenance
  readonly source: readonly LedgerEvidenceRef[]
  readonly terminal?: LedgerTerminalClaim
  readonly terminalClaims: readonly LedgerTerminalClaim[]
  readonly confirmations: readonly LedgerEvidenceRef[]
  readonly issueCodes: readonly string[]
}

export interface LedgerApprovalFact {
  readonly sessionId: string
  readonly approvalId: string
  readonly toolName?: string
  readonly callId?: string
  readonly lifecycle: ApprovalLifecycle
  readonly health: LedgerHealth
  readonly provenance: LedgerProvenance
  readonly outcome?: ApprovalOutcome
  readonly binding: 'UNBOUND' | 'AMBIGUOUS'
  readonly source: readonly LedgerEvidenceRef[]
  readonly issueCodes: readonly string[]
}

export interface LedgerQueryOptions {
  readonly limit?: number
}

export interface LedgerSnapshot {
  readonly sessionId: string
  readonly health: LedgerHealth
  readonly sourceWatermark: number
  readonly sourceComplete: boolean
  readonly truncated: boolean
  readonly issues: readonly LedgerIssue[]
  readonly executions: readonly LedgerExecutionFact[]
  readonly approvals: readonly LedgerApprovalFact[]
  readonly ptc?: PtcReplayProjection
}

interface Scope {
  readonly turn: number
  readonly step: number
}

interface SourceCall {
  readonly kind: 'call'
  readonly seq: number
  readonly scope: Scope
  readonly callId: string
  readonly name: string
}

interface SourceResult {
  readonly kind: 'result'
  readonly seq: number
  readonly scope: Scope
  readonly callId: string
  readonly isError: boolean
  readonly error?: { readonly name: string; readonly code: string }
}

interface SourceApprovalAsked {
  readonly kind: 'approval-asked'
  readonly seq: number
  readonly id: string
  readonly toolName: string
  readonly callId?: string
}

interface SourceApprovalDecided {
  readonly kind: 'approval-decided'
  readonly seq: number
  readonly id: string
  readonly outcome: ApprovalOutcome
}

type BoundaryType = 'turn/start' | 'turn/end' | 'step/start' | 'step/end'

interface SourceBoundary {
  readonly kind: 'boundary'
  readonly seq: number
  readonly type: BoundaryType
  readonly turn: number
  readonly step?: number
}

type SourceFact = SourceCall | SourceResult | SourceApprovalAsked | SourceApprovalDecided | SourceBoundary

interface SourceScopeAudit {
  readonly invalidSeqs: ReadonlySet<number>
  readonly issues: readonly LedgerIssue[]
}

interface SourceEntry {
  readonly seq: number
  readonly type: string
  readonly fingerprint: string
  readonly fact?: SourceFact
}

interface LiveRecord {
  readonly session: Session
  readonly exec: ToolExecution
  readonly token: ToolExecutionToken
  readonly ordinal: number
  readonly callId: string | undefined
  readonly toolName: string
  readonly rootCallId: string | undefined
  dispatchObserved: boolean
  finalClaims: LedgerTerminalClaim[]
  shellEvidence?: ShellEvidence
  issueCodes: Set<string>
}

interface LedgerState {
  readonly session: Session | undefined
  readonly sessionId: string
  readonly sourceEntries: Map<string, SourceEntry>
  readonly liveRecords: Set<LiveRecord>
  readonly liveApprovalIds: Set<string>
  readonly issues: LedgerIssue[]
  sourceWatermark: number
  feedLastSeq: number | undefined
  feedStarted: boolean
  hydrated: boolean
  snapshotComplete: boolean
  sawRecoverableGap: boolean
  recovered: boolean
  hardDegraded: boolean
  ptc?: PtcReplayProjection
}

const IDENTIFIER_LIMIT = 512

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values])
}

function freezeObject<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value)
}

function compositeKey(fields: readonly (number | string)[]): string {
  return JSON.stringify(fields)
}

function safeString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length <= IDENTIFIER_LIMIT ? value : undefined
}

function safeInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function scopeOf(value: Record<string, unknown>): Scope | undefined {
  const turn = safeInteger(value.turn)
  const step = safeInteger(value.step)
  return turn === undefined || step === undefined ? undefined : { turn, step }
}

function errorIdentity(value: unknown): { readonly name: string; readonly code: string } | undefined {
  if (!record(value)) return undefined
  const info = record(value.info) ? value.info : value
  const name = safeString(value.name) ?? safeString(info.name)
  const code = safeString(value.code) ?? safeString(info.code)
  return name === undefined || code === undefined ? undefined : freezeObject({ name, code })
}

function sameClaim(a: LedgerTerminalClaim, b: LedgerTerminalClaim): boolean {
  return a.isError === b.isError
    && a.error?.name === b.error?.name
    && a.error?.code === b.error?.code
}

function sourceRef(seq: number, type: string, provenance: LedgerProvenance): LedgerEvidenceRef {
  return freezeObject({ seq, type, provenance })
}

function issue(code: string, seq: number | undefined, provenance: LedgerProvenance): LedgerIssue {
  return freezeObject({ code, ...seq === undefined ? {} : { seq }, provenance })
}

interface ParsedResult {
  readonly scope: Scope
  readonly callId: string
  readonly isError: boolean
  readonly error?: { readonly name: string; readonly code: string }
}

function parseResultMessage(data: Record<string, unknown>): ParsedResult | undefined {
  const scope = scopeOf(data)
  const message = record(data.message) ? data.message : undefined
  const content = message?.content
  if (scope === undefined || !Array.isArray(content)) return undefined
  const block = content.find(item => record(item) && item.type === 'tool-result')
  if (!record(block)) return undefined
  const callId = safeString(block.toolCallId)
  const isError = block.isError
  if (callId === undefined || typeof isError !== 'boolean') return undefined
  const error = isError ? errorIdentity(data.error) : undefined
  return { scope, callId, isError, ...error === undefined ? {} : { error } }
}

function parseBoundary(event: SessionEvent): SourceBoundary | undefined {
  if (!record(event.data)) return undefined
  if (event.type === 'turn/start' || event.type === 'turn/end') {
    const turn = safeInteger(event.data.turn)
    return turn === undefined ? undefined : { kind: 'boundary', seq: Number(event.seq), type: event.type, turn }
  }
  if (event.type === 'step/start' || event.type === 'step/end') {
    const scope = scopeOf(event.data)
    return scope === undefined
      ? undefined
      : { kind: 'boundary', seq: Number(event.seq), type: event.type, turn: scope.turn, step: scope.step }
  }
  return undefined
}

function parseFact(event: SessionEvent): SourceFact | undefined {
  if (!record(event.data)) return undefined
  switch (event.type) {
    case 'turn/start':
    case 'turn/end':
    case 'step/start':
    case 'step/end':
      return parseBoundary(event)
    case 'tool/call': {
      const scope = scopeOf(event.data)
      const callId = safeString(event.data.callId)
      const name = safeString(event.data.name)
      return scope === undefined || callId === undefined || name === undefined || typeof event.data.arguments !== 'string'
        ? undefined
        : { kind: 'call', seq: Number(event.seq), scope, callId, name }
    }
    case 'tool/result': {
      const parsed = parseResultMessage(event.data)
      return parsed === undefined ? undefined : { kind: 'result', seq: Number(event.seq), ...parsed }
    }
    case 'approval/asked': {
      const id = safeString(event.data.id)
      const toolName = safeString(event.data.toolName)
      const callId = event.data.callId === undefined ? undefined : safeString(event.data.callId)
      return id === undefined || toolName === undefined || (event.data.callId !== undefined && callId === undefined)
        ? undefined
        : { kind: 'approval-asked', seq: Number(event.seq), id, toolName, ...callId === undefined ? {} : { callId } }
    }
    case 'approval/decided': {
      const id = safeString(event.data.id)
      const outcome = event.data.outcome
      return id === undefined || !['allowed-once', 'rejected', 'cancelled', 'unavailable'].includes(String(outcome))
        ? undefined
        : { kind: 'approval-decided', seq: Number(event.seq), id, outcome: outcome as ApprovalOutcome }
    }
    default:
      return undefined
  }
}

function invalidFactFingerprint(event: SessionEvent): string {
  if (!record(event.data)) return event.type
  const data = event.data as unknown as Record<string, unknown>
  switch (event.type) {
    case 'tool/call':
      return JSON.stringify([event.type, safeInteger(data.turn), safeInteger(data.step), safeString(data.callId), safeString(data.name), typeof data.arguments])
    case 'tool/result': {
      const message = record(data.message) ? data.message : undefined
      const content = message?.content
      const block = Array.isArray(content)
        ? content.find(item => record(item) && item.type === 'tool-result')
        : undefined
      return JSON.stringify([
        event.type,
        safeInteger(data.turn),
        safeInteger(data.step),
        record(block) ? safeString(block.toolCallId) : undefined,
        record(block) && typeof block.isError === 'boolean' ? block.isError : undefined,
        errorIdentity(data.error),
      ])
    }
    case 'approval/asked':
      return JSON.stringify([event.type, safeString(data.id), safeString(data.toolName), data.callId === undefined ? undefined : safeString(data.callId)])
    case 'approval/decided':
      return JSON.stringify([event.type, safeString(data.id), typeof data.outcome === 'string' ? data.outcome : undefined])
    default:
      return event.type
  }
}

function fingerprintOf(event: SessionEvent, fact: SourceFact | undefined): string {
  return fact === undefined ? invalidFactFingerprint(event) : JSON.stringify(fact)
}

function terminalClaim(
  isError: boolean,
  provenance: Extract<LedgerProvenance, 'LIVE_FINAL' | 'DURABLE_SOURCE' | 'CONFIRMATION'>,
  evidence?: LedgerEvidenceRef,
  error?: { readonly name: string; readonly code: string },
): LedgerTerminalClaim {
  return freezeObject({
    isError,
    provenance,
    ...evidence === undefined ? {} : { evidence },
    ...error === undefined ? {} : { error },
  })
}

function emptyState(session?: Session, sessionId = 'unknown'): LedgerState {
  return {
    session,
    sessionId,
    sourceEntries: new Map(),
    liveRecords: new Set(),
    liveApprovalIds: new Set(),
    issues: [],
    sourceWatermark: -1,
    feedLastSeq: undefined,
    feedStarted: false,
    hydrated: false,
    snapshotComplete: false,
    sawRecoverableGap: false,
    recovered: false,
    hardDegraded: false,
  }
}

function addIssue(state: LedgerState, code: string, seq?: number, provenance: LedgerProvenance = 'UNKNOWN', hard = true): void {
  if (!state.issues.some(existing => existing.code === code && existing.seq === seq)) {
    if (state.issues.length < LEDGER_LIMITS.maxIssues) state.issues.push(issue(code, seq, provenance))
  }
  if (hard) state.hardDegraded = true
}

function markFeedOrder(state: LedgerState, seq: number, key: string): void {
  if (!state.feedStarted) {
    state.feedStarted = true
    if (seq !== 0 && !state.sourceEntries.has(key)) {
      state.sawRecoverableGap = true
      addIssue(state, 'SOURCE_GAP', seq, 'UNKNOWN', false)
    }
  } else if (state.feedLastSeq !== undefined && seq !== state.feedLastSeq + 1 && !state.sourceEntries.has(key)) {
    state.sawRecoverableGap = true
    addIssue(state, 'SOURCE_GAP', seq, 'UNKNOWN', false)
  }
  state.feedLastSeq = state.feedLastSeq === undefined ? seq : Math.max(state.feedLastSeq, seq)
}

function ingestEvent(state: LedgerState, event: SessionEvent): void {
  const seq = safeInteger(event.seq)
  if (seq === undefined) {
    addIssue(state, 'INVALID_SOURCE_SEQUENCE', undefined, 'UNKNOWN')
    return
  }
  const type = typeof event.type === 'string' ? event.type : 'unknown'
  const key = compositeKey([seq, type])
  const fact = parseFact(event)
  if (state.sourceEntries.size >= LEDGER_LIMITS.maxSourceEvents && !state.sourceEntries.has(key)) {
    addIssue(state, 'SOURCE_LIMIT_EXCEEDED', seq, 'UNKNOWN')
    return
  }
  const fingerprint = fingerprintOf(event, fact)
  const existing = state.sourceEntries.get(key)
  if (existing !== undefined) {
    if (existing.fingerprint !== fingerprint) addIssue(state, 'SOURCE_CONFLICT', seq, 'UNKNOWN')
    return
  }
  state.sourceEntries.set(key, freezeObject({ seq, type, fingerprint, ...fact === undefined ? {} : { fact } }))
  state.sourceWatermark = Math.max(state.sourceWatermark, seq)
  if (fact === undefined && [
    'turn/start', 'turn/end', 'step/start', 'step/end',
    'tool/call', 'tool/result', 'approval/asked', 'approval/decided',
  ].includes(type)) {
    addIssue(state, 'INVALID_SOURCE_FACT', seq, 'DURABLE_SOURCE')
  }
}

function sourceFacts(state: LedgerState): SourceFact[] {
  return [...state.sourceEntries.values()]
    .filter((entry): entry is SourceEntry & { readonly fact: SourceFact } => entry.fact !== undefined)
    .map(entry => entry.fact)
    .sort((a, b) => a.seq - b.seq)
}

function auditSourceScope(state: LedgerState): SourceScopeAudit {
  const invalidSeqs = new Set<number>()
  const issues: LedgerIssue[] = []
  const pendingCalls = new Map<string, number>()
  const completedCalls = new Set<string>()
  const askedApprovals = new Set<string>()
  let openTurn: number | undefined
  let openStep: number | undefined
  let nextTurn = 1
  let nextStep = 1

  const fail = (seq: number, code = 'INVALID_SOURCE_SCOPE'): void => {
    invalidSeqs.add(seq)
    if (!issues.some(existing => existing.code === code && existing.seq === seq)) {
      issues.push(issue(code, seq, 'DURABLE_SOURCE'))
    }
  }
  const callKey = (turn: number, step: number, callId: string): string => compositeKey([turn, step, callId])
  const clearStepCalls = (turn: number | undefined, step: number | undefined): void => {
    if (turn === undefined || step === undefined) return
    const prefix = JSON.stringify([turn, step]).slice(0, -1)
    for (const key of pendingCalls.keys()) if (key.startsWith(`${prefix},`)) pendingCalls.delete(key)
    for (const key of completedCalls) if (key.startsWith(`${prefix},`)) completedCalls.delete(key)
  }

  for (const fact of sourceFacts(state)) {
    switch (fact.kind) {
      case 'boundary':
        switch (fact.type) {
          case 'turn/start':
            if (openTurn !== undefined || fact.turn !== nextTurn) fail(fact.seq)
            openTurn = fact.turn
            openStep = undefined
            nextStep = 1
            break
          case 'turn/end':
            if (openTurn !== fact.turn || openStep !== undefined) fail(fact.seq)
            clearStepCalls(openTurn, openStep)
            if (openTurn === fact.turn) openTurn = undefined
            openStep = undefined
            nextTurn = Math.max(nextTurn, fact.turn + 1)
            break
          case 'step/start':
            if (openTurn !== fact.turn || openStep !== undefined || fact.step !== nextStep) fail(fact.seq)
            if (openTurn === fact.turn && openStep === undefined) openStep = fact.step
            break
          case 'step/end':
            if (openTurn !== fact.turn || openStep !== fact.step) fail(fact.seq)
            if (openTurn === fact.turn && openStep === fact.step) {
              clearStepCalls(openTurn, openStep)
              openStep = undefined
              nextStep += 1
            }
            break
        }
        break
      case 'call':
        if (openTurn !== fact.scope.turn || openStep !== fact.scope.step) {
          fail(fact.seq)
        } else {
          const key = callKey(fact.scope.turn, fact.scope.step, fact.callId)
          pendingCalls.set(key, (pendingCalls.get(key) ?? 0) + 1)
        }
        break
      case 'result': {
        if (openTurn !== fact.scope.turn || openStep !== fact.scope.step) {
          fail(fact.seq)
          break
        }
        const key = callKey(fact.scope.turn, fact.scope.step, fact.callId)
        const pending = pendingCalls.get(key) ?? 0
        if (pending > 0) {
          if (pending === 1) pendingCalls.delete(key)
          else pendingCalls.set(key, pending - 1)
          completedCalls.add(key)
        } else if (completedCalls.has(key) || fact.error?.code === 'TOOL_NOT_STARTED') {
          // A second result after a committed result is retained as a
          // bounded terminal-conflict candidate by the reducer below.
        } else {
          fail(fact.seq)
        }
        break
      }
      case 'approval-asked':
        askedApprovals.add(fact.id)
        break
      case 'approval-decided':
        if (!askedApprovals.has(fact.id)) fail(fact.seq, 'INVALID_APPROVAL_ORDER')
        break
    }
  }
  return { invalidSeqs, issues: freezeArray(issues) }
}

function buildDurableClaim(result: SourceResult, provenance: 'DURABLE_SOURCE' | 'CONFIRMATION'): LedgerTerminalClaim {
  return terminalClaim(
    result.isError,
    provenance,
    sourceRef(result.seq, 'tool/result', provenance),
    result.error,
  )
}

function sourceRefs(...refs: readonly (LedgerEvidenceRef | undefined)[]): readonly LedgerEvidenceRef[] {
  return freezeArray(refs.filter((ref): ref is LedgerEvidenceRef => ref !== undefined))
}

function executionFact(input: {
  sessionId: string
  occurrence: LedgerExecutionFact['occurrence']
  lifecycle: ExecutionLifecycle
  health: LedgerHealth
  provenance: LedgerProvenance
  source: readonly LedgerEvidenceRef[]
  terminal?: LedgerTerminalClaim
  terminalClaims?: readonly LedgerTerminalClaim[]
  confirmations?: readonly LedgerEvidenceRef[]
  issueCodes?: readonly string[]
}): LedgerExecutionFact {
  return freezeObject({
    sessionId: input.sessionId,
    occurrence: freezeObject({ ...input.occurrence }),
    lifecycle: input.lifecycle,
    health: input.health,
    provenance: input.provenance,
    source: freezeArray(input.source),
    ...input.terminal === undefined ? {} : { terminal: input.terminal },
    terminalClaims: freezeArray(input.terminalClaims ?? []),
    confirmations: freezeArray(input.confirmations ?? []),
    issueCodes: freezeArray(input.issueCodes ?? []),
  })
}

function buildSnapshot(state: LedgerState, options: LedgerQueryOptions = {}): LedgerSnapshot {
  const requestedLimit = options.limit ?? LEDGER_LIMITS.defaultQueryLimit
  const limit = Number.isSafeInteger(requestedLimit) && requestedLimit >= 0
    ? Math.min(requestedLimit, LEDGER_LIMITS.maxRetainedFacts)
    : LEDGER_LIMITS.defaultQueryLimit
  const facts = sourceFacts(state)
  const scopeAudit = auditSourceScope(state)
  const invalidSourceSeqs = scopeAudit.invalidSeqs
  const calls = facts.filter((fact): fact is SourceCall => fact.kind === 'call')
  const results = facts.filter((fact): fact is SourceResult => fact.kind === 'result')
  const asked = facts.filter((fact): fact is SourceApprovalAsked => fact.kind === 'approval-asked')
  const decided = facts.filter((fact): fact is SourceApprovalDecided => fact.kind === 'approval-decided')
  const callsByIdentity = new Map<string, SourceCall[]>()
  for (const call of calls) {
    const key = compositeKey([call.scope.turn, call.scope.step, call.callId])
    const values = callsByIdentity.get(key) ?? []
    values.push(call)
    callsByIdentity.set(key, values)
  }
  const resultsByIdentity = new Map<string, SourceResult[]>()
  for (const result of results) {
    const key = compositeKey([result.scope.turn, result.scope.step, result.callId])
    const values = resultsByIdentity.get(key) ?? []
    values.push(result)
    resultsByIdentity.set(key, values)
  }

  const claimedResultSeqs = new Set<number>()
  const durableFacts: LedgerExecutionFact[] = []
  for (const call of calls) {
    const identity = compositeKey([call.scope.turn, call.scope.step, call.callId])
    const sameCalls = callsByIdentity.get(identity) ?? []
    const candidates = (resultsByIdentity.get(identity) ?? []).filter(result =>
      result.seq > call.seq && !invalidSourceSeqs.has(result.seq))
    const callSource = sourceRef(call.seq, 'tool/call', 'DURABLE_SOURCE')
    let fact: LedgerExecutionFact
    if (invalidSourceSeqs.has(call.seq)) {
      fact = executionFact({
        sessionId: state.sessionId,
        occurrence: { kind: 'DURABLE', callSeq: call.seq, turn: call.scope.turn, step: call.scope.step, callId: call.callId, toolName: call.name },
        lifecycle: 'UNRESOLVED',
        health: 'DEGRADED',
        provenance: 'DURABLE_SOURCE',
        source: [callSource],
        issueCodes: ['INVALID_SOURCE_SCOPE'],
      })
    } else if (sameCalls.length !== 1) {
      fact = executionFact({
        sessionId: state.sessionId,
        occurrence: { kind: 'DURABLE', callSeq: call.seq, turn: call.scope.turn, step: call.scope.step, callId: call.callId, toolName: call.name },
        lifecycle: 'UNRESOLVED',
        health: 'DEGRADED',
        provenance: 'DURABLE_SOURCE',
        source: [callSource],
        issueCodes: ['AMBIGUOUS_CALL_OCCURRENCE'],
      })
    } else if (candidates.length === 0) {
      fact = executionFact({
        sessionId: state.sessionId,
        occurrence: { kind: 'DURABLE', callSeq: call.seq, turn: call.scope.turn, step: call.scope.step, callId: call.callId, toolName: call.name },
        lifecycle: 'INCOMPLETE',
        health: 'DEGRADED',
        provenance: 'REPLAY_RECOVERED',
        source: [callSource],
        issueCodes: ['MISSING_RESULT'],
      })
    } else if (candidates.length === 1) {
      const result = candidates[0]!
      claimedResultSeqs.add(result.seq)
      const claim = buildDurableClaim(result, 'DURABLE_SOURCE')
      fact = executionFact({
        sessionId: state.sessionId,
        occurrence: { kind: 'DURABLE', callSeq: call.seq, turn: call.scope.turn, step: call.scope.step, callId: call.callId, toolName: call.name },
        lifecycle: 'SETTLED',
        health: 'HEALTHY',
        provenance: 'DURABLE_SOURCE',
        source: [callSource, claim.evidence!],
        terminal: claim,
        terminalClaims: [claim],
      })
    } else {
      fact = executionFact({
        sessionId: state.sessionId,
        occurrence: { kind: 'DURABLE', callSeq: call.seq, turn: call.scope.turn, step: call.scope.step, callId: call.callId, toolName: call.name },
        lifecycle: 'UNRESOLVED',
        health: 'DEGRADED',
        provenance: 'DURABLE_SOURCE',
        source: sourceRefs(callSource, ...candidates.map(result => sourceRef(result.seq, 'tool/result', 'DURABLE_SOURCE'))),
        terminalClaims: candidates.map(result => buildDurableClaim(result, 'DURABLE_SOURCE')),
        issueCodes: ['TERMINAL_CONFLICT'],
      })
      for (const result of candidates) claimedResultSeqs.add(result.seq)
    }
    durableFacts.push(fact)
  }

  for (const result of results) {
    const identity = compositeKey([result.scope.turn, result.scope.step, result.callId])
    const candidates = (callsByIdentity.get(identity) ?? []).filter(call => !invalidSourceSeqs.has(call.seq))
    if (claimedResultSeqs.has(result.seq)) continue
    const claim = buildDurableClaim(result, 'DURABLE_SOURCE')
    const invalidScope = invalidSourceSeqs.has(result.seq)
    durableFacts.push(executionFact({
      sessionId: state.sessionId,
      occurrence: { kind: 'DURABLE', turn: result.scope.turn, step: result.scope.step, callId: result.callId },
      lifecycle: 'UNRESOLVED',
      health: 'DEGRADED',
      provenance: 'DURABLE_SOURCE',
      source: [claim.evidence!],
      terminalClaims: [claim],
      issueCodes: [invalidScope
        ? 'INVALID_SOURCE_SCOPE'
        : candidates.length === 0 ? 'ORPHAN_DURABLE_RESULT' : 'AMBIGUOUS_RESULT_BINDING'],
    }))
  }

  const liveFacts: LedgerExecutionFact[] = []
  for (const live of [...state.liveRecords].sort((a, b) => a.ordinal - b.ordinal)) {
    const issues = [...live.issueCodes]
    const claims = [...live.finalClaims]
    const hasFinal = claims.length > 0
    liveFacts.push(executionFact({
      sessionId: state.sessionId,
      occurrence: {
        kind: 'LIVE',
        liveOrdinal: live.ordinal,
        toolName: live.toolName,
        ...live.callId === undefined ? {} : { callId: live.callId },
      },
      lifecycle: hasFinal ? 'SETTLED' : live.dispatchObserved ? 'DISPATCHING' : 'INCOMPLETE',
      health: issues.includes('RECOVERED_FROM_FULL_EXEC')
        ? 'RECOVERED'
        : !hasFinal || issues.length > 0 ? 'DEGRADED' : 'HEALTHY',
      provenance: hasFinal ? 'LIVE_FINAL' : 'LIVE_START',
      source: [sourceRef(live.ordinal, 'tools/pre-execute', 'LIVE_START'),
        ...claims.length === 0 ? [] : [sourceRef(live.ordinal, 'tools/result', 'LIVE_FINAL')]],
      ...claims.length === 1 ? { terminal: claims[0]! } : {},
      terminalClaims: claims,
      issueCodes: issues,
    }))
  }

  const approvalIds = new Set([...asked.map(item => item.id), ...decided.map(item => item.id)])
  const approvalFacts: LedgerApprovalFact[] = []
  for (const id of approvalIds) {
    const askedForId = asked.filter(item => item.id === id)
    const decidedForId = decided.filter(item => item.id === id)
    const askedFirst = askedForId[0]
    const source = sourceRefs(
      ...askedForId.map(item => sourceRef(item.seq, 'approval/asked', 'DURABLE_SOURCE')),
      ...decidedForId.map(item => sourceRef(item.seq, 'approval/decided', 'DURABLE_SOURCE')),
    )
    const duplicateAsked = askedForId.length > 1
      || askedForId.some(item => item.toolName !== askedFirst?.toolName || item.callId !== askedFirst?.callId)
    const conflictingDecisions = new Set(decidedForId.map(item => item.outcome)).size > 1
    const outcome = conflictingDecisions ? undefined : decidedForId[0]?.outcome
    const issues: string[] = []
    if (duplicateAsked) issues.push('AMBIGUOUS_APPROVAL')
    if (conflictingDecisions) issues.push('APPROVAL_CONFLICT')
    if (askedForId.length === 0) issues.push('ORPHAN_APPROVAL_DECISION')
    if (askedForId.some(item => invalidSourceSeqs.has(item.seq)) || decidedForId.some(item => invalidSourceSeqs.has(item.seq))) {
      issues.push('INVALID_SOURCE_SCOPE')
    }
    const liveAsked = state.liveApprovalIds.has(id)
    const lifecycle: ApprovalLifecycle = duplicateAsked || conflictingDecisions
      ? 'AMBIGUOUS'
      : askedForId.length === 0
        ? 'UNBOUND'
        : outcome === undefined
          ? liveAsked ? 'PENDING' : 'STALE'
          : 'DECIDED'
    if (lifecycle === 'STALE') issues.push('STALE_PENDING_APPROVAL')
    approvalFacts.push(freezeObject({
      sessionId: state.sessionId,
      approvalId: id,
      ...askedFirst?.toolName === undefined ? {} : { toolName: askedFirst.toolName },
      ...askedFirst?.callId === undefined ? {} : { callId: askedFirst.callId },
      lifecycle,
      health: issues.length === 0 ? 'HEALTHY' : 'DEGRADED',
      provenance: outcome === undefined ? 'REPLAY_RECOVERED' : 'DURABLE_SOURCE',
      ...outcome === undefined ? {} : { outcome },
      binding: duplicateAsked || askedForId.length === 0 ? 'AMBIGUOUS' as const : 'UNBOUND' as const,
      source,
      issueCodes: freezeArray(issues),
    }))
  }

  const executionCandidates = liveFacts.concat(durableFacts)
  const allCandidates: readonly (LedgerExecutionFact | LedgerApprovalFact)[] = [...executionCandidates, ...approvalFacts]
  const truncated = allCandidates.length > limit
  const selected = allCandidates.slice(0, limit)
  const executions = freezeArray(selected.filter((fact): fact is LedgerExecutionFact => 'occurrence' in fact))
  const approvals = freezeArray(selected.filter((fact): fact is LedgerApprovalFact => 'approvalId' in fact))
  const localIssues = truncated ? [issue('QUERY_LIMIT_CLAMPED', undefined, 'UNKNOWN')] : []
  const allIssues = [...state.issues, ...scopeAudit.issues, ...localIssues]
  const hasDegradedFact = [...executions, ...approvals].some(fact => fact.health === 'DEGRADED')
  const hasRecoveredFact = [...executions, ...approvals].some(fact => fact.health === 'RECOVERED')
  const unresolvedGap = state.sawRecoverableGap && !state.recovered
  const sourceScopeDegraded = scopeAudit.invalidSeqs.size > 0
  const health: LedgerHealth = state.hardDegraded || unresolvedGap || sourceScopeDegraded || truncated || hasDegradedFact
    ? 'DEGRADED'
    : state.recovered || hasRecoveredFact
      ? 'RECOVERED'
      : 'HEALTHY'
  return freezeObject({
    sessionId: state.sessionId,
    health,
    sourceWatermark: state.sourceWatermark,
    sourceComplete: state.snapshotComplete && !state.hardDegraded && !sourceScopeDegraded,
    truncated,
    issues: freezeArray(allIssues.slice(0, LEDGER_LIMITS.maxIssues)),
    executions,
    approvals,
    ...state.ptc === undefined ? {} : { ptc: state.ptc },
  })
}

function buildPhase2Snapshot(state: LedgerState, snapshot: LedgerSnapshot): Phase2LedgerSnapshot {
  const liveByOrdinal = new Map<number, LiveRecord>()
  for (const live of state.liveRecords) liveByOrdinal.set(live.ordinal, live)
  const executions: Phase2ExecutionOutcomeRecord[] = snapshot.executions.map((fact) => {
    const projected = projectTerminalClaims(fact.terminalClaims)
    const live = fact.occurrence.kind === 'LIVE' && fact.occurrence.liveOrdinal !== undefined
      ? liveByOrdinal.get(fact.occurrence.liveOrdinal)
      : undefined
    const shell = live?.shellEvidence
    const mergedOutcome = shell === undefined
      ? projected.outcome
      : Object.freeze({
        terminalStatus: projected.outcome.terminalStatus,
        semanticSuccess: 'unknown' as const,
        processSuccess: shell.processSuccess,
        failures: freezeArray([...projected.outcome.failures, ...shell.failures]),
      })
    return Object.freeze({
      sessionId: fact.sessionId,
      occurrence: Object.freeze({ ...fact.occurrence }),
      lifecycle: fact.lifecycle,
      health: fact.health,
      provenance: fact.provenance,
      source: freezeArray(fact.source),
      terminal: projected.terminal,
      outcome: mergedOutcome,
      issueCodes: freezeArray(fact.issueCodes),
    })
  })
  return Object.freeze({
    sessionId: snapshot.sessionId,
    health: snapshot.health,
    sourceWatermark: snapshot.sourceWatermark,
    sourceComplete: snapshot.sourceComplete,
    truncated: snapshot.truncated,
    issues: freezeArray(snapshot.issues),
    executions: freezeArray(executions),
    approvals: freezeArray(snapshot.approvals.map(makePhase2ApprovalProjection)),
    ...snapshot.ptc === undefined ? {} : { ptc: projectPtcProjection(snapshot.ptc) },
  })
}

export interface LedgerDiagnostics {
  readonly snapshot: (session: Session, options?: LedgerQueryOptions) => LedgerSnapshot
  readonly phase2: (session: Session, options?: LedgerQueryOptions) => Phase2LedgerSnapshot
}

/** Host-only bounded ledger controller. Public consumers receive only its frozen query facade. */
export class LedgerController {
  private readonly states = new WeakMap<Session, LedgerState>()
  private readonly liveByExecution = new WeakMap<ToolExecution, LiveRecord>()
  private nextLiveOrdinal = 1
  private active = true

  private stateFor(session: Session): LedgerState {
    let state = this.states.get(session)
    if (state === undefined) {
      state = emptyState(session, String(session.id))
      this.states.set(session, state)
    }
    return state
  }

  private observeSource(session: Session, event: SessionEvent): void {
    if (!this.active) return
    const state = this.stateFor(session)
    const seq = safeInteger(event.seq)
    if (seq === undefined) {
      addIssue(state, 'INVALID_SOURCE_SEQUENCE', undefined, 'UNKNOWN')
      return
    }
    const key = compositeKey([seq, String(event.type)])
    markFeedOrder(state, seq, key)
    ingestEvent(state, event)
  }

  observeSessionEvent(session: Session, event: SessionEvent): void {
    try { this.observeSource(session, event) } catch { /* observer failures never veto committed append */ }
  }

  observePreExecute(exec: ToolExecution): void {
    if (!this.active) return
    try {
      const session = exec.agent?.session
      if (session === undefined || this.liveByExecution.has(exec)) return
      const state = this.stateFor(session)
      if (state.liveRecords.size >= LEDGER_LIMITS.maxRetainedFacts) {
        addIssue(state, 'LIVE_LIMIT_EXCEEDED', undefined, 'UNKNOWN')
        return
      }
      const record: LiveRecord = {
        session,
        exec,
        token: exec.token,
        ordinal: this.nextLiveOrdinal++,
        callId: safeString(exec.callId),
        toolName: safeString(exec.name) ?? 'unknown',
        rootCallId: safeString(exec.rootCallId),
        dispatchObserved: false,
        finalClaims: [],
        issueCodes: new Set(),
      }
      this.liveByExecution.set(exec, record)
      state.liveRecords.add(record)
    } catch { /* isolated observational failure */ }
  }

  observePreExecuteAndContinue(exec: ToolExecution, next: () => Promise<PreToolDecision>): Promise<PreToolDecision> {
    this.observePreExecute(exec)
    return next().then(decision => decision)
  }

  observeDispatch(exec: ToolExecution): void {
    if (!this.active) return
    const live = this.liveByExecution.get(exec)
    if (live !== undefined) live.dispatchObserved = true
  }

  observeDispatchAndContinue(exec: ToolExecution, next: () => Promise<ToolExecutionResult>): Promise<ToolExecutionResult> {
    this.observeDispatch(exec)
    return next()
  }

  observeResult(exec: Readonly<ToolExecution>, result: Readonly<ToolExecutionResult>): void {
    if (!this.active) return
    try {
      let live = this.liveByExecution.get(exec)
      const session = exec.agent?.session
      if (live === undefined && session !== undefined) {
        const state = this.stateFor(session)
        if (state.liveRecords.size >= LEDGER_LIMITS.maxRetainedFacts) {
          addIssue(state, 'LIVE_LIMIT_EXCEEDED', undefined, 'UNKNOWN')
          return
        }
        const recovered: LiveRecord = {
          session,
          exec: exec as ToolExecution,
          token: exec.token,
          ordinal: this.nextLiveOrdinal++,
          callId: safeString(exec.callId),
          toolName: safeString(exec.name) ?? 'unknown',
          rootCallId: safeString(exec.rootCallId),
          dispatchObserved: false,
          finalClaims: [],
          issueCodes: new Set(['MISSING_START', 'RECOVERED_FROM_FULL_EXEC']),
        }
        live = recovered
        this.liveByExecution.set(exec as ToolExecution, live)
        state.liveRecords.add(live)
      }
      if (live === undefined) return
      const error = errorIdentity(result.error)
      const claim = terminalClaim(result.isError, 'LIVE_FINAL', sourceRef(live.ordinal, 'tools/result', 'LIVE_FINAL'), error)
      if (!result.isError) {
        const shell = projectShellResult(
          live.toolName,
          result.value,
          [sourceRef(live.ordinal, 'tools/result', 'LIVE_FINAL')],
        )
        if (shell !== undefined) live.shellEvidence = shell.evidence
      }
      const prior = live.finalClaims[0]
      if (prior === undefined) live.finalClaims.push(claim)
      else if (!sameClaim(prior, claim)) {
        live.finalClaims.push(claim)
        live.issueCodes.add('TERMINAL_CONFLICT')
        addIssue(this.stateFor(live.session), 'TERMINAL_CONFLICT', undefined, 'LIVE_FINAL')
      }
    } catch { /* isolated observational failure */ }
  }

  observeApprovalAsked(session: Session, id: string): void {
    if (!this.active) return
    this.stateFor(session).liveApprovalIds.add(id)
  }

  private ensureSnapshot(session: Session): void {
    const state = this.stateFor(session)
    const snapshot = session.snapshotEvents()
    let contiguous = snapshot.length <= LEDGER_LIMITS.maxSourceEvents
    for (let index = 0; index < snapshot.length; index += 1) {
      const event = snapshot[index]!
      if (safeInteger(event.seq) !== index) {
        contiguous = false
        addIssue(state, 'INVALID_SOURCE_SEQUENCE', safeInteger(event.seq), 'DURABLE_SOURCE')
      }
      ingestEvent(state, event)
    }
    state.snapshotComplete = contiguous && snapshot.length <= LEDGER_LIMITS.maxSourceEvents && !state.hardDegraded
    state.hydrated = true
    state.sourceWatermark = snapshot.length - 1
    state.ptc = replayPtcSnapshot(String(session.id), snapshot)
    if (contiguous && state.sawRecoverableGap && !state.hardDegraded) state.recovered = true
  }

  snapshot(session: Session, options: LedgerQueryOptions = {}): LedgerSnapshot {
    if (this.active) {
      try { this.ensureSnapshot(session) } catch {
        const state = this.stateFor(session)
        addIssue(state, 'SNAPSHOT_UNAVAILABLE', undefined, 'UNKNOWN')
      }
    }
    const state = this.stateFor(session)
    return buildSnapshot(state, options)
  }

  phase2(session: Session, options: LedgerQueryOptions = {}): Phase2LedgerSnapshot {
    const snapshot = this.snapshot(session, options)
    return buildPhase2Snapshot(this.stateFor(session), snapshot)
  }

  dispose(): void {
    this.active = false
  }
}

/** Pure source-shaped fold used by bounded fault tests and restart simulation. */
export function foldLedgerSnapshot(
  sessionId: string,
  events: readonly SessionEvent[],
  options: LedgerQueryOptions = {},
): LedgerSnapshot {
  const state = emptyState(undefined, sessionId)
  let contiguous = events.length <= LEDGER_LIMITS.maxSourceEvents
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!
    if (safeInteger(event.seq) !== index) {
      contiguous = false
      addIssue(state, 'INVALID_SOURCE_SEQUENCE', safeInteger(event.seq), 'DURABLE_SOURCE')
    }
    ingestEvent(state, event)
  }
  state.snapshotComplete = contiguous && events.length <= LEDGER_LIMITS.maxSourceEvents && !state.hardDegraded
  state.hydrated = true
  state.sourceWatermark = events.length - 1
  state.ptc = replayPtcSnapshot(sessionId, events)
  return buildSnapshot(state, options)
}

/** Install the R4 observers and expose only a frozen read-only query facade. */
export function installLedger(ctx: Context): LedgerDiagnostics {
  const controller = new LedgerController()
  ctx.on('tools/pre-execute', (exec, next) => controller.observePreExecuteAndContinue(exec, next))
  ctx.on('tools/execute', (exec, next) => controller.observeDispatchAndContinue(exec, next))
  ctx.on('tools/result', (exec, result) => { controller.observeResult(exec, result) })
  ctx.on('session/event', (session, event) => {
    controller.observeSessionEvent(session, event)
    if (event.type === 'approval/asked') controller.observeApprovalAsked(session, String(event.data.id))
  })
  ctx.effect(() => () => { controller.dispose() }, 'risk-advisor-ledger-generation')
  const diagnostics = Object.freeze({
    snapshot: controller.snapshot.bind(controller),
    phase2: controller.phase2.bind(controller),
  })
  ctx.provide('riskAdvisorLedger', diagnostics)
  return diagnostics
}

export { PTC_REPLAY_LIMITS }
