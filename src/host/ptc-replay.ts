import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'

/** Conservative R3 safety caps. These are completeness guards, not latency targets. */
export const PTC_REPLAY_LIMITS = Object.freeze({
  maxSourceEvents: 10_000,
  maxPtcEvidence: 512,
  maxIssues: 128,
})

export type ReplayStatus = 'COMPLETE' | 'DEGRADED'

export interface EvidenceRef {
  readonly seq: number
  readonly type: 'tool/call' | 'tool/ptc-dispatch-start' | 'tool/ptc-dispatch'
}

export interface DurableOccurrenceRef {
  readonly sessionId: string
  readonly kind: 'tool/call' | 'tool/ptc-dispatch-start'
  readonly turn: number
  readonly step: number
  /** The source event sequence; for a PTC occurrence this is the start seq. */
  readonly seq: number
  readonly callId: string
  readonly name: string
}

export type EdgeResolution =
  | { readonly status: 'RECOVERED'; readonly target: DurableOccurrenceRef; readonly basis: readonly EvidenceRef[] }
  | { readonly status: 'CONFIRMED'; readonly target: DurableOccurrenceRef; readonly basis: readonly EvidenceRef[] }
  | { readonly status: 'AMBIGUOUS'; readonly candidates: readonly DurableOccurrenceRef[]; readonly reason: string }
  | { readonly status: 'UNRESOLVED'; readonly reason: string }

export type SettlementResolution =
  | {
      readonly status: 'PAIRED'
      readonly settlement: EvidenceRef
      readonly isError: boolean
      readonly basis: readonly EvidenceRef[]
    }
  | { readonly status: 'START_ONLY'; readonly reason: string }
  | { readonly status: 'SETTLE_ONLY'; readonly settlement: EvidenceRef; readonly reason: string }
  | { readonly status: 'AMBIGUOUS'; readonly candidateSeqs: readonly number[]; readonly reason: string }
  | { readonly status: 'UNRESOLVED'; readonly reason: string }

export interface PtcReplayOccurrence {
  readonly occurrence: DurableOccurrenceRef
  readonly parent: EdgeResolution
  readonly root: EdgeResolution
  readonly settlement: SettlementResolution
}

export interface PtcOrphanSettlement {
  readonly sessionId: string
  readonly turn: number
  readonly step: number
  readonly seq: number
  readonly subCallId: string
  readonly name: string
  readonly resolution: SettlementResolution
}

export interface ReplayIssue {
  readonly reason: string
  readonly seq?: number
}

export interface PtcReplayProjection {
  readonly sessionId: string
  readonly status: ReplayStatus
  readonly sourceEventCount: number
  readonly ptcStartCount: number
  readonly ptcSettleCount: number
  readonly occurrences: readonly PtcReplayOccurrence[]
  readonly orphanSettlements: readonly PtcOrphanSettlement[]
  readonly issues: readonly ReplayIssue[]
  readonly degradation?: { readonly status: 'DEGRADED'; readonly reason: string }
}

interface Scope {
  readonly turn: number
  readonly step: number
}

interface ToolCallOccurrence {
  readonly ref: DurableOccurrenceRef
}

interface PtcStartOccurrence {
  readonly ref: DurableOccurrenceRef
  readonly scope: Scope
  readonly rootCallId: string
  readonly parentCallId: string
  readonly subCallId: string
  readonly name: string
  readonly evidence: EvidenceRef
}

interface PtcSettleOccurrence {
  readonly scope: Scope
  readonly rootCallId: string
  readonly parentCallId: string
  readonly subCallId: string
  readonly name: string
  readonly seq: number
  readonly isError: boolean
  readonly evidence: EvidenceRef
}

const IDENTIFIER_LIMIT = 512

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values])
}

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > IDENTIFIER_LIMIT) return undefined
  return value
}

function integer(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : undefined
}

function compositeKey(fields: readonly (number | string)[]): string {
  return JSON.stringify(fields)
}

function scopeKey(scope: Scope): string {
  return compositeKey([scope.turn, scope.step])
}

function topCallKey(scope: Scope, callId: string): string {
  return compositeKey([scopeKey(scope), callId])
}

function tupleKey(scope: Scope, rootCallId: string, parentCallId: string, subCallId: string, name: string): string {
  return compositeKey([scopeKey(scope), rootCallId, parentCallId, subCallId, name])
}

function subKey(scope: Scope, subCallId: string): string {
  return compositeKey([scopeKey(scope), subCallId])
}

function evidence(seq: number, type: EvidenceRef['type']): EvidenceRef {
  return Object.freeze({ seq, type })
}

function recovered(target: DurableOccurrenceRef, basis: readonly EvidenceRef[]): EdgeResolution {
  return Object.freeze({ status: 'RECOVERED', target, basis: freezeArray(basis) })
}

function ambiguousEdge(candidates: readonly DurableOccurrenceRef[], reason: string): EdgeResolution {
  return Object.freeze({ status: 'AMBIGUOUS', candidates: freezeArray(candidates), reason })
}

function unresolvedEdge(reason: string): EdgeResolution {
  return Object.freeze({ status: 'UNRESOLVED', reason })
}

function paired(settle: PtcSettleOccurrence, basis: readonly EvidenceRef[]): SettlementResolution {
  return Object.freeze({
    status: 'PAIRED',
    settlement: settle.evidence,
    isError: settle.isError,
    basis: freezeArray(basis),
  })
}

function startOnly(reason: string): SettlementResolution {
  return Object.freeze({ status: 'START_ONLY', reason })
}

function settleOnly(settle: PtcSettleOccurrence, reason: string): SettlementResolution {
  return Object.freeze({ status: 'SETTLE_ONLY', settlement: settle.evidence, reason })
}

function ambiguousSettlement(candidateSeqs: readonly number[], reason: string): SettlementResolution {
  return Object.freeze({ status: 'AMBIGUOUS', candidateSeqs: freezeArray(candidateSeqs), reason })
}

function unresolvedSettlement(reason: string): SettlementResolution {
  return Object.freeze({ status: 'UNRESOLVED', reason })
}

function emptyProjection(sessionId: string, sourceEventCount: number, reason: string): PtcReplayProjection {
  const issue = Object.freeze({ reason })
  return Object.freeze({
    sessionId,
    status: 'DEGRADED',
    sourceEventCount,
    ptcStartCount: 0,
    ptcSettleCount: 0,
    occurrences: freezeArray([]),
    orphanSettlements: freezeArray([]),
    issues: freezeArray([issue]),
    degradation: Object.freeze({ status: 'DEGRADED', reason }),
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Replay the exact immutable event snapshot owned by one trusted Session. */
export function replayPtcSession(session: Session): PtcReplayProjection {
  return replayPtcSnapshot(String(session.id), session.snapshotEvents())
}

/**
 * Replay a source-shaped snapshot without retaining the source array.
 * This is also the labelled synthetic-fixture seam used by R3 tests.
 */
export function replayPtcSnapshot(sessionIdValue: string, events: readonly SessionEvent[]): PtcReplayProjection {
  const sessionId = nonEmptyString(sessionIdValue)
  if (sessionId === undefined) return emptyProjection('unavailable', events.length, 'INVALID_SESSION_ID')
  if (events.length > PTC_REPLAY_LIMITS.maxSourceEvents) {
    return emptyProjection(sessionId, events.length, 'LIMIT_EXCEEDED')
  }

  const issues: ReplayIssue[] = []
  let degradationReason: string | undefined
  const addIssue = (reason: string, seq?: number): void => {
    if (issues.length < PTC_REPLAY_LIMITS.maxIssues) issues.push(Object.freeze({ reason, ...seq === undefined ? {} : { seq } }))
    degradationReason ??= reason
  }
  const scopeOf = (turn: number | undefined, step: number | undefined): Scope | undefined =>
    turn === undefined || step === undefined ? undefined : { turn, step }
  const currentScopeMatches = (scope: Scope | undefined, data: Record<string, unknown>): boolean => {
    const turn = integer(data.turn)
    const step = integer(data.step)
    return scope !== undefined && turn === scope.turn && step === scope.step
  }

  const topCalls: ToolCallOccurrence[] = []
  const starts: PtcStartOccurrence[] = []
  const settles: PtcSettleOccurrence[] = []
  let currentTurn: number | undefined
  let currentStep: number | undefined

  for (let index = 0; index < events.length; index += 1) {
    const raw = events[index] as unknown
    if (!isRecord(raw)) {
      addIssue('INVALID_EVENT_ENVELOPE', index)
      continue
    }
    const seq = integer(raw.seq)
    if (seq === undefined || seq !== index) {
      addIssue(seq === undefined ? 'INVALID_SEQUENCE' : 'NON_CONTIGUOUS_SEQUENCE', seq)
      continue
    }
    if (typeof raw.type !== 'string' || !isRecord(raw.data)) {
      addIssue('INVALID_EVENT_ENVELOPE', seq)
      continue
    }
    const data = raw.data
    const current = scopeOf(currentTurn, currentStep)

    switch (raw.type) {
      case 'turn/start': {
        const turn = integer(data.turn)
        if (turn === undefined) {
          addIssue('INVALID_TURN_SCOPE', seq)
          break
        }
        if (currentTurn !== undefined || currentStep !== undefined) addIssue('TURN_START_OVERLAP', seq)
        currentTurn = turn
        currentStep = undefined
        break
      }
      case 'step/start': {
        const turn = integer(data.turn)
        const step = integer(data.step)
        if (turn === undefined || step === undefined || currentTurn !== turn || currentStep !== undefined) {
          addIssue('INVALID_STEP_SCOPE', seq)
          currentStep = undefined
          break
        }
        currentStep = step
        break
      }
      case 'step/end': {
        const turn = integer(data.turn)
        const step = integer(data.step)
        if (turn === undefined || step === undefined || currentTurn !== turn || currentStep !== step) {
          addIssue('STEP_END_MISMATCH', seq)
        }
        currentStep = undefined
        break
      }
      case 'turn/end': {
        const turn = integer(data.turn)
        if (turn === undefined || currentTurn !== turn || currentStep !== undefined) addIssue('TURN_END_MISMATCH', seq)
        currentStep = undefined
        currentTurn = undefined
        break
      }
      case 'tool/call': {
        if (!currentScopeMatches(current, data)) {
          addIssue('TOOL_CALL_OUT_OF_SCOPE', seq)
          break
        }
        const callId = nonEmptyString(data.callId)
        const name = nonEmptyString(data.name)
        if (callId === undefined || name === undefined || typeof data.arguments !== 'string') {
          addIssue('INVALID_TOOL_CALL_IDENTITY', seq)
          break
        }
        topCalls.push({
          ref: Object.freeze({
            sessionId,
            kind: 'tool/call',
            turn: current!.turn,
            step: current!.step,
            seq,
            callId,
            name,
          }),
        })
        break
      }
      case 'tool/ptc-dispatch-start': {
        if (current === undefined) {
          addIssue('PTC_OUT_OF_SCOPE', seq)
          break
        }
        if (starts.length + settles.length >= PTC_REPLAY_LIMITS.maxPtcEvidence) {
          addIssue('LIMIT_EXCEEDED', seq)
          break
        }
        const rootCallId = nonEmptyString(data.rootCallId)
        const parentCallId = nonEmptyString(data.parentCallId)
        const subCallId = nonEmptyString(data.subCallId)
        const name = nonEmptyString(data.name)
        if (rootCallId === undefined || parentCallId === undefined || subCallId === undefined || name === undefined) {
          addIssue('INVALID_PTC_IDENTITY', seq)
          break
        }
        const ref = Object.freeze({
          sessionId,
          kind: 'tool/ptc-dispatch-start' as const,
          turn: current.turn,
          step: current.step,
          seq,
          callId: subCallId,
          name,
        })
        starts.push({
          ref,
          scope: current,
          rootCallId,
          parentCallId,
          subCallId,
          name,
          evidence: evidence(seq, 'tool/ptc-dispatch-start'),
        })
        break
      }
      case 'tool/ptc-dispatch': {
        if (current === undefined) {
          addIssue('PTC_OUT_OF_SCOPE', seq)
          break
        }
        if (starts.length + settles.length >= PTC_REPLAY_LIMITS.maxPtcEvidence) {
          addIssue('LIMIT_EXCEEDED', seq)
          break
        }
        const rootCallId = nonEmptyString(data.rootCallId)
        const parentCallId = nonEmptyString(data.parentCallId)
        const subCallId = nonEmptyString(data.subCallId)
        const name = nonEmptyString(data.name)
        if (rootCallId === undefined || parentCallId === undefined || subCallId === undefined || name === undefined
          || typeof data.isError !== 'boolean') {
          addIssue('INVALID_PTC_SETTLEMENT', seq)
          break
        }
        settles.push({
          scope: current,
          rootCallId,
          parentCallId,
          subCallId,
          name,
          seq,
          isError: data.isError,
          evidence: evidence(seq, 'tool/ptc-dispatch'),
        })
        break
      }
      default:
        break
    }
  }

  const topByCall = new Map<string, ToolCallOccurrence[]>()
  for (const call of topCalls) {
    const key = topCallKey({ turn: call.ref.turn, step: call.ref.step }, call.ref.callId)
    const entries = topByCall.get(key) ?? []
    entries.push(call)
    topByCall.set(key, entries)
  }
  const startsBySub = new Map<string, PtcStartOccurrence[]>()
  const startsByTuple = new Map<string, PtcStartOccurrence[]>()
  const settlesByTuple = new Map<string, PtcSettleOccurrence[]>()
  const tuplesBySub = new Map<string, Set<string>>()
  for (const start of starts) {
    const bySubKey = subKey(start.scope, start.subCallId)
    const bySub = startsBySub.get(bySubKey) ?? []
    bySub.push(start)
    startsBySub.set(bySubKey, bySub)
    const tuple = tupleKey(start.scope, start.rootCallId, start.parentCallId, start.subCallId, start.name)
    const byTuple = startsByTuple.get(tuple) ?? []
    byTuple.push(start)
    startsByTuple.set(tuple, byTuple)
    const tuples = tuplesBySub.get(bySubKey) ?? new Set<string>()
    tuples.add(tuple)
    tuplesBySub.set(bySubKey, tuples)
  }
  for (const settle of settles) {
    const tuple = tupleKey(settle.scope, settle.rootCallId, settle.parentCallId, settle.subCallId, settle.name)
    const byTuple = settlesByTuple.get(tuple) ?? []
    byTuple.push(settle)
    settlesByTuple.set(tuple, byTuple)
    const bySubKey = subKey(settle.scope, settle.subCallId)
    const tuples = tuplesBySub.get(bySubKey) ?? new Set<string>()
    tuples.add(tuple)
    tuplesBySub.set(bySubKey, tuples)
  }

  const parentByStart = new Map<PtcStartOccurrence, EdgeResolution>()
  const rootByStart = new Map<PtcStartOccurrence, EdgeResolution>()

  const parentFor = (start: PtcStartOccurrence): EdgeResolution => {
    const topKey = topCallKey(start.scope, start.parentCallId)
    const allTop = topByCall.get(topKey) ?? []
    const priorTop = allTop.filter(candidate => candidate.ref.seq < start.ref.seq)
    if (start.parentCallId === start.rootCallId) {
      if (priorTop.length === 1) return recovered(priorTop[0]!.ref, [start.evidence, evidence(priorTop[0]!.ref.seq, 'tool/call')])
      if (priorTop.length > 1) return ambiguousEdge(priorTop.map(candidate => candidate.ref), 'MULTIPLE_PARENT_OCCURRENCES')
      return unresolvedEdge(allTop.length > 0 ? 'PARENT_OCCURRENCE_NOT_PRECEDING' : 'NO_PARENT_OCCURRENCE')
    }

    const allNested = startsBySub.get(subKey(start.scope, start.parentCallId)) ?? []
    const priorNested = allNested.filter(candidate => candidate.ref.seq < start.ref.seq)
    const consistent = priorNested.filter(candidate => candidate.rootCallId === start.rootCallId)
    if (consistent.length === 1) {
      return recovered(consistent[0]!.ref, [start.evidence, consistent[0]!.evidence])
    }
    if (consistent.length > 1) return ambiguousEdge(consistent.map(candidate => candidate.ref), 'MULTIPLE_PARENT_OCCURRENCES')
    if (priorNested.length > 0) return unresolvedEdge('PARENT_ROOT_MISMATCH')
    return unresolvedEdge(allNested.length > 0 ? 'PARENT_OCCURRENCE_NOT_PRECEDING' : 'NO_PARENT_OCCURRENCE')
  }

  for (const start of starts) parentByStart.set(start, parentFor(start))

  const resolvingRoots = new Set<PtcStartOccurrence>()
  const rootFor = (start: PtcStartOccurrence): EdgeResolution => {
    const cached = rootByStart.get(start)
    if (cached !== undefined) return cached
    if (resolvingRoots.has(start)) {
      const cycle = unresolvedEdge('PARENT_CYCLE')
      rootByStart.set(start, cycle)
      return cycle
    }
    resolvingRoots.add(start)
    const rootKey = topCallKey(start.scope, start.rootCallId)
    const rootCandidates = (topByCall.get(rootKey) ?? []).filter(candidate => candidate.ref.seq < start.ref.seq)
    let result: EdgeResolution
    if (rootCandidates.length === 0) {
      result = unresolvedEdge((topByCall.get(rootKey) ?? []).length > 0
        ? 'ROOT_OCCURRENCE_NOT_PRECEDING'
        : 'NO_ROOT_OCCURRENCE')
    } else if (rootCandidates.length > 1) {
      result = ambiguousEdge(rootCandidates.map(candidate => candidate.ref), 'MULTIPLE_ROOT_OCCURRENCES')
    } else {
      const root = rootCandidates[0]!
      const parent = parentByStart.get(start)!
      if (parent.status === 'AMBIGUOUS') {
        result = unresolvedEdge('PARENT_AMBIGUOUS')
      } else if (parent.status === 'UNRESOLVED') {
        result = unresolvedEdge('PARENT_UNRESOLVED')
      } else if (parent.target.kind === 'tool/call') {
        result = parent.target.seq === root.ref.seq
          ? recovered(root.ref, [start.evidence, evidence(root.ref.seq, 'tool/call')])
          : unresolvedEdge('PARENT_ROOT_INCONSISTENT')
      } else {
        const parentStart = starts.find(candidate => candidate.ref.seq === parent.target.seq
          && candidate.scope.turn === parent.target.turn && candidate.scope.step === parent.target.step)
        const parentRoot = parentStart === undefined ? unresolvedEdge('PARENT_TARGET_MISSING') : rootFor(parentStart)
        result = parentRoot.status === 'RECOVERED' && parentRoot.target.seq === root.ref.seq
          ? recovered(root.ref, [start.evidence, ...parentRoot.basis])
          : parentRoot.status === 'AMBIGUOUS'
            ? unresolvedEdge('PARENT_ROOT_AMBIGUOUS')
            : unresolvedEdge('PARENT_ROOT_INCONSISTENT')
      }
    }
    resolvingRoots.delete(start)
    rootByStart.set(start, result)
    return result
  }

  const invalidSettlementSeqs = new Set<number>()
  const recordInvalidSettlementOrder = (settle: PtcSettleOccurrence): void => {
    if (invalidSettlementSeqs.has(settle.seq)) return
    invalidSettlementSeqs.add(settle.seq)
    addIssue('PTC_SETTLEMENT_BEFORE_START', settle.seq)
  }

  const settlementFor = (start: PtcStartOccurrence): SettlementResolution => {
    const key = tupleKey(start.scope, start.rootCallId, start.parentCallId, start.subCallId, start.name)
    const startsForTuple = startsByTuple.get(key) ?? []
    const settlesForTuple = settlesByTuple.get(key) ?? []
    const structuralTuples = tuplesBySub.get(subKey(start.scope, start.subCallId))
    if ((structuralTuples?.size ?? 0) > 1) return unresolvedSettlement('CONTRADICTORY_STRUCTURAL_TUPLE')
    if (startsForTuple.length > 1) {
      return ambiguousSettlement(settlesForTuple.map(settle => settle.seq), 'MULTIPLE_START_OCCURRENCES')
    }
    if (settlesForTuple.length === 0) return startOnly('NO_SETTLEMENT')
    if (settlesForTuple.length > 1) return ambiguousSettlement(settlesForTuple.map(settle => settle.seq), 'MULTIPLE_SETTLEMENTS')
    const settle = settlesForTuple[0]!
    if (start.ref.seq >= settle.seq) {
      recordInvalidSettlementOrder(settle)
      return unresolvedSettlement('SETTLEMENT_BEFORE_START')
    }
    return paired(settle, [start.evidence, settle.evidence])
  }

  const occurrenceResults: PtcReplayOccurrence[] = starts.map((start) => Object.freeze({
    occurrence: start.ref,
    parent: parentByStart.get(start)!,
    root: rootFor(start),
    settlement: settlementFor(start),
  }))

  const orphanResults: PtcOrphanSettlement[] = []
  for (const settle of settles) {
    const key = tupleKey(settle.scope, settle.rootCallId, settle.parentCallId, settle.subCallId, settle.name)
    const startsForTuple = startsByTuple.get(key) ?? []
    const structuralTuples = tuplesBySub.get(subKey(settle.scope, settle.subCallId))
    if ((structuralTuples?.size ?? 0) > 1) {
      orphanResults.push(Object.freeze({
        sessionId,
        turn: settle.scope.turn,
        step: settle.scope.step,
        seq: settle.seq,
        subCallId: settle.subCallId,
        name: settle.name,
        resolution: unresolvedSettlement('CONTRADICTORY_STRUCTURAL_TUPLE'),
      }))
      continue
    }
    const settlesForTuple = settlesByTuple.get(key) ?? []
    if (startsForTuple.length === 1 && settlesForTuple.length === 1) {
      const start = startsForTuple[0]!
      if (start.ref.seq < settle.seq) continue
      recordInvalidSettlementOrder(settle)
      orphanResults.push(Object.freeze({
        sessionId,
        turn: settle.scope.turn,
        step: settle.scope.step,
        seq: settle.seq,
        subCallId: settle.subCallId,
        name: settle.name,
        resolution: unresolvedSettlement('SETTLEMENT_BEFORE_START'),
      }))
      continue
    }
    const resolution = startsForTuple.length === 0
      ? settleOnly(settle, 'NO_START_OCCURRENCE')
      : startsForTuple.length > 1
        ? ambiguousSettlement(startsForTuple.map(start => start.ref.seq), 'MULTIPLE_START_OCCURRENCES')
        : ambiguousSettlement(settlesForTuple.map(candidate => candidate.seq), 'MULTIPLE_SETTLEMENTS')
    orphanResults.push(Object.freeze({
      sessionId,
      turn: settle.scope.turn,
      step: settle.scope.step,
      seq: settle.seq,
      subCallId: settle.subCallId,
      name: settle.name,
      resolution,
    }))
  }

  const status: ReplayStatus = degradationReason === undefined ? 'COMPLETE' : 'DEGRADED'
  const suppressEdge = (edge: EdgeResolution): EdgeResolution =>
    edge.status === 'UNRESOLVED' ? edge : unresolvedEdge('SOURCE_DEGRADED')
  const suppressSettlement = (settlement: SettlementResolution): SettlementResolution =>
    settlement.status === 'UNRESOLVED' ? settlement : unresolvedSettlement('SOURCE_DEGRADED')
  const finalOccurrences = degradationReason === undefined
    ? occurrenceResults
    : occurrenceResults.map(item => Object.freeze({
      occurrence: item.occurrence,
      parent: suppressEdge(item.parent),
      root: suppressEdge(item.root),
      settlement: suppressSettlement(item.settlement),
    }))
  const finalOrphans = degradationReason === undefined
    ? orphanResults
    : orphanResults.map(item => Object.freeze({
      sessionId: item.sessionId,
      turn: item.turn,
      step: item.step,
      seq: item.seq,
      subCallId: item.subCallId,
      name: item.name,
      resolution: suppressSettlement(item.resolution),
    }))
  const frozenIssues = freezeArray(issues)
  return Object.freeze({
    sessionId,
    status,
    sourceEventCount: events.length,
    ptcStartCount: starts.length,
    ptcSettleCount: settles.length,
    occurrences: freezeArray(finalOccurrences),
    orphanSettlements: freezeArray(finalOrphans),
    issues: frozenIssues,
    ...degradationReason === undefined ? {} : {
      degradation: Object.freeze({ status: 'DEGRADED' as const, reason: degradationReason }),
    },
  })
}
