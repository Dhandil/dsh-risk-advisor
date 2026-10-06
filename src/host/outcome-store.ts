import type { DomainFacility, Domain } from '@deepseek-ai/dsh-storage-domain'
import type { ExecutionId } from './correlation.ts'
import { MAX_EXPERIENCE_EPISODES, experienceEpisodeSchema } from './experience-schema.ts'
import type { ExperienceEpisodeV1 } from './experience-schema.ts'
import {
  MAX_OUTCOME_EPISODE_REVISIONS,
  MAX_OUTCOME_REVISIONS,
  MAX_PENDING_VERIFIER_HANDOFFS,
  outcomeDomainSpec,
  outcomeRevisionKey,
  outcomeRevisionSchema,
  postconditionEvidenceSchema,
} from './outcome-schema.ts'
import type { OutcomeEpisodeId, OutcomeRevisionV1, OutcomeStatus } from './outcome-schema.ts'
import type { VerificationAdapterId } from './expected-effect.ts'
import type { VerificationRecordV1 } from './verification-store.ts'

export type OutcomeRuntimeStatus = 'READY' | 'UNAVAILABLE' | 'CAPACITY_EXCEEDED' | 'CONFLICTED'

export interface OutcomeDiagnostics {
  readonly status: () => OutcomeRuntimeStatus
  readonly revisionCount: () => number
  readonly current: (episodeId: string) => OutcomeRevisionV1 | undefined
  readonly revisions: (episodeId: string) => readonly OutcomeRevisionV1[]
  readonly reasonCodes: () => readonly string[]
}

/** Internal, read-only source seam for the downstream Pattern projection. */
export interface OutcomePatternSnapshot {
  readonly episode: ExperienceEpisodeV1
  readonly revisions: readonly OutcomeRevisionV1[]
}

export type OutcomePatternListener = (snapshot: OutcomePatternSnapshot) => void

type OutcomeDomain = Domain<typeof outcomeDomainSpec>
type EvidenceSnapshot = NonNullable<OutcomeRevisionV1['postconditionEvidence']>
type EmittedRevisionKind = 'INITIAL' | 'POSTCONDITION_UPDATE'
type EmittedOutcomeStatus = Exclude<OutcomeStatus, 'INVALIDATED'>
type EmittedRuleId = Exclude<OutcomeRevisionV1['ruleId'], 'outcome-v1-invalidation'>

const SAFE_CODE = /^[A-Za-z0-9_.:-]{1,128}$/
const ADAPTERS: readonly VerificationAdapterId[] = Object.freeze([
  'tool.write.v1', 'tool.edit.v1', 'shell.mkdir.v1', 'shell.copy-file.v1',
  'git.branch-switch.v1', 'package.node-resolve.v1',
])

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value
  Object.freeze(value)
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  return value
}

function safeCodes(values: readonly unknown[]): string[] {
  const result: string[] = []
  for (const value of values) {
    if (typeof value !== 'string' || !SAFE_CODE.test(value) || result.includes(value)) continue
    result.push(value)
    if (result.length >= 32) break
  }
  return result
}

function evidenceFrom(record: VerificationRecordV1): EvidenceSnapshot | undefined {
  const parsed = postconditionEvidenceSchema.safeParse({
    source: record.source,
    adapterId: record.adapterId,
    status: record.status,
    semanticSuccess: record.semanticSuccess,
    evidenceQuality: record.evidenceQuality,
    reasonCodes: safeCodes(record.reasonCodes),
    observedAt: record.observedAt,
    durationMs: record.durationMs,
  })
  return parsed.success ? deepFreeze(parsed.data) : undefined
}

function evidenceEqual(a: EvidenceSnapshot | undefined, b: EvidenceSnapshot | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function supportedEvidence(evidence: EvidenceSnapshot): boolean {
  if (!ADAPTERS.includes(evidence.adapterId as VerificationAdapterId)) return false
  const toolContract = evidence.adapterId === 'tool.write.v1' || evidence.adapterId === 'tool.edit.v1'
  return toolContract === (evidence.source === 'tool-contract')
}

export interface Qualification {
  readonly status: EmittedOutcomeStatus
  readonly ruleId: EmittedRuleId
  readonly reasonCodes: readonly string[]
}

/** Pure frozen Phase 11.2 V1 precedence. */
export function qualifyOutcome(
  episode: ExperienceEpisodeV1,
  evidence: EvidenceSnapshot | undefined,
): Qualification {
  if (episode.terminal.error?.code === 'ABORTED_BEFORE_DISPATCH') {
    return { status: 'NOT_EXECUTED', ruleId: 'outcome-v1-not-executed', reasonCodes: ['ABORTED_BEFORE_DISPATCH'] }
  }
  if (evidence === undefined) {
    return { status: 'UNKNOWN', ruleId: 'outcome-v1-no-evidence', reasonCodes: ['VERIFIER_EVIDENCE_ABSENT'] }
  }
  if (evidence.reasonCodes.includes('VERIFICATION_CONFLICT')) {
    return { status: 'UNKNOWN', ruleId: 'outcome-v1-conflict', reasonCodes: ['VERIFICATION_CONFLICT'] }
  }
  const reasons = safeCodes(evidence.reasonCodes)
  if (supportedEvidence(evidence)
    && evidence.status === 'MATCHED'
    && evidence.semanticSuccess === true
    && evidence.evidenceQuality !== 'low') {
    return { status: 'VERIFIED_SUCCESS', ruleId: 'outcome-v1-postcondition', reasonCodes: reasons.length > 0 ? reasons : ['POSTCONDITION_MATCHED'] }
  }
  if (supportedEvidence(evidence)
    && evidence.status === 'MISMATCHED'
    && evidence.semanticSuccess === false
    && evidence.evidenceQuality !== 'low') {
    return { status: 'VERIFIED_FAILURE', ruleId: 'outcome-v1-postcondition', reasonCodes: reasons.length > 0 ? reasons : ['POSTCONDITION_MISMATCH'] }
  }
  return {
    status: 'UNKNOWN',
    ruleId: 'outcome-v1-postcondition',
    reasonCodes: reasons.length > 0 ? reasons : ['VERIFIER_EVIDENCE_INCONCLUSIVE'],
  }
}

function sameEvidence(a: EvidenceSnapshot, b: EvidenceSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/** Host-only append-only qualification writer for one plugin generation. */
export class OutcomeRuntime {
  private handle: OutcomeDomain | undefined
  private table: ReturnType<OutcomeDomain['table']> | undefined
  private opening: Promise<void> | undefined
  private closeTask: Promise<void> | undefined
  private writeTail: Promise<void> = Promise.resolve()
  private lifecycleTail: Promise<void> = Promise.resolve()
  private generation = 0
  private accepting = false
  private detached = false
  private writeFaulted = false
  private pendingVerifier = new Map<ExecutionId, EvidenceSnapshot | undefined>()
  private latestObservedVerifier = new Map<ExecutionId, EvidenceSnapshot | undefined>()
  private executionToEpisode = new Map<ExecutionId, OutcomeEpisodeId>()
  private episodes = new Map<OutcomeEpisodeId, ExperienceEpisodeV1>()
  private chains = new Map<OutcomeEpisodeId, OutcomeRevisionV1[]>()
  private initialScheduled = new Set<OutcomeEpisodeId>()
  private readonly patternListeners = new Set<OutcomePatternListener>()
  private currentStatus: OutcomeRuntimeStatus = 'UNAVAILABLE'
  private currentReasons: readonly string[] = Object.freeze(['STORAGE_ABSENT'])

  readonly diagnostics: OutcomeDiagnostics = Object.freeze({
    status: () => this.currentStatus,
    revisionCount: () => this.readRevisionCount(),
    current: (id: string) => this.readCurrent(id),
    revisions: (id: string) => this.readRevisions(id),
    reasonCodes: () => this.currentReasons,
  })

  /** Return a validated, durable read-only snapshot without opening another domain handle. */
  patternSnapshot(): readonly OutcomePatternSnapshot[] {
    if (this.currentStatus !== 'READY') throw new Error('outcome-pattern-source-unavailable')
    const snapshots: OutcomePatternSnapshot[] = []
    for (const [episodeId, episode] of this.episodes) {
      const revisions = this.chains.get(episodeId)
      if (revisions === undefined || revisions.length === 0) throw new Error('outcome-pattern-source-incomplete')
      snapshots.push(Object.freeze({ episode, revisions: Object.freeze([...revisions]) }))
    }
    snapshots.sort((a, b) => a.episode.episodeId.localeCompare(b.episode.episodeId))
    return Object.freeze(snapshots)
  }

  /** Subscribe to append acknowledgements only; callbacks never run before Outcome durability. */
  subscribePattern(listener: OutcomePatternListener): () => void {
    if (this.currentStatus !== 'READY') throw new Error('outcome-pattern-source-unavailable')
    this.patternListeners.add(listener)
    return () => { this.patternListeners.delete(listener) }
  }

  /** Open the separate outcome domain and reconcile Episodes lacking revision 1. */
  attach(storageDomain: DomainFacility, episodeSnapshot: readonly ExperienceEpisodeV1[]): Promise<void> {
    if (!this.detached && this.handle !== undefined) return Promise.resolve()
    if (!this.detached && this.opening !== undefined) return this.opening
    const generation = ++this.generation
    this.accepting = false
    this.writeFaulted = false
    this.currentStatus = 'UNAVAILABLE'
    this.currentReasons = Object.freeze(['STORAGE_OPENING'])
    const opening = this.enqueueLifecycle(async () => {
      if (generation !== this.generation) return
      this.detached = false
      this.episodes.clear()
      this.executionToEpisode.clear()
      this.chains.clear()
      this.initialScheduled.clear()
      let openedDomain: OutcomeDomain | undefined
      try {
        if (episodeSnapshot.length > MAX_EXPERIENCE_EPISODES) throw new Error('episode-capacity-conflict')
        for (const raw of episodeSnapshot) {
          const episode = experienceEpisodeSchema.parse(raw)
          if (this.episodes.has(episode.episodeId as OutcomeEpisodeId)
            || this.executionToEpisode.has(episode.sourceExecutionId as ExecutionId)) {
            throw new Error('episode-identity-conflict')
          }
          const id = episode.episodeId as OutcomeEpisodeId
          this.episodes.set(id, deepFreeze(episode))
          this.executionToEpisode.set(episode.sourceExecutionId as ExecutionId, id)
        }
        const domain = await storageDomain.open(outcomeDomainSpec)
        openedDomain = domain
        if (generation !== this.generation || this.detached) {
          await domain.close()
          return
        }
        const table = domain.table('revisions')
        const grouped = new Map<OutcomeEpisodeId, OutcomeRevisionV1[]>()
        for (const [key, raw] of table.entries()) {
          const revision = outcomeRevisionSchema.parse(raw)
          if (revision.status === 'INVALIDATED'
            || revision.revisionKind === 'INVALIDATION'
            || revision.revisionKind === 'REQUALIFICATION'
            || revision.ruleId === 'outcome-v1-invalidation') {
            throw new Error('outcome-reserved-vocabulary-conflict')
          }
          if (revision.revisionId !== key || !this.episodes.has(revision.episodeId as OutcomeEpisodeId)) {
            throw new Error('outcome-key-or-episode-mismatch')
          }
          const id = revision.episodeId as OutcomeEpisodeId
          const chain = grouped.get(id) ?? []
          chain.push(deepFreeze(revision))
          grouped.set(id, chain)
        }
        for (const [id, chain] of grouped) {
          chain.sort((a, b) => a.revisionNumber - b.revisionNumber)
          if (chain.length > MAX_OUTCOME_EPISODE_REVISIONS) throw new Error('outcome-episode-revision-cap-invalid')
          for (let index = 0; index < chain.length; index += 1) {
            const revision = chain[index]!
            if (revision.revisionNumber !== index + 1
              || (index === 0 ? revision.previousRevisionId !== undefined : revision.previousRevisionId !== chain[index - 1]!.revisionId)) {
              throw new Error('outcome-lineage-conflict')
            }
            const qualification = qualifyOutcome(this.episodes.get(id)!, revision.postconditionEvidence)
            if (revision.status !== qualification.status
              || revision.ruleId !== qualification.ruleId
              || JSON.stringify(revision.reasonCodes) !== JSON.stringify(qualification.reasonCodes)) {
              throw new Error('outcome-qualification-conflict')
            }
          }
          this.chains.set(id, chain)
        }
        this.handle = domain
        this.table = table
        if (table.size >= MAX_OUTCOME_REVISIONS
          || [...this.chains.values()].some(chain => chain.length >= MAX_OUTCOME_EPISODE_REVISIONS)) {
          this.accepting = false
          this.setStatus('CAPACITY_EXCEEDED', 'OUTCOME_REVISION_CAPACITY_EXCEEDED')
          return
        }
        this.accepting = true
        this.setStatus('READY')
        for (const executionId of this.pendingVerifier.keys()) {
          if (!this.executionToEpisode.has(executionId)) {
            this.pendingVerifier.delete(executionId)
            this.latestObservedVerifier.delete(executionId)
          }
        }
        for (const [id, episode] of this.episodes) {
          if ((this.chains.get(id)?.length ?? 0) === 0) this.scheduleInitial(episode)
        }
        for (const [executionId, evidence] of this.pendingVerifier) {
          const id = this.executionToEpisode.get(executionId)
          if (id !== undefined && (this.chains.get(id)?.length ?? 0) > 0) {
            this.enqueueWrite(async () => { await this.appendRevision(id, 'POSTCONDITION_UPDATE', evidence) })
          }
        }
        await this.writeTail
      } catch (error) {
        if (openedDomain !== undefined) {
          try { await openedDomain.close() } catch { /* Preserve the original open/validation failure. */ }
        }
        this.handle = undefined
        this.table = undefined
        this.accepting = false
        this.pendingVerifier.clear()
        this.latestObservedVerifier.clear()
        this.executionToEpisode.clear()
        this.episodes.clear()
        this.chains.clear()
        this.initialScheduled.clear()
        const conflict = error instanceof Error && /conflict|mismatch/.test(error.message)
        this.setStatus(conflict ? 'CONFLICTED' : 'UNAVAILABLE', error instanceof Error && error.message === 'outcome-lineage-conflict' ? 'OUTCOME_LINEAGE_INVALID' : 'OUTCOME_OPEN_FAILED')
      }
    })
    const settled = opening.finally(() => { if (this.opening === settled) this.opening = undefined })
    this.opening = settled
    return settled
  }

  /** Called only after an Episode has durably committed in ExperienceRuntime. */
  observeEpisodeCommitted(raw: ExperienceEpisodeV1): void {
    if (!this.accepting && this.opening === undefined) return
    let episode: ExperienceEpisodeV1
    try { episode = experienceEpisodeSchema.parse(raw) } catch { return }
    const id = episode.episodeId as OutcomeEpisodeId
    const executionId = episode.sourceExecutionId as ExecutionId
    const priorEpisode = this.episodes.get(id)
    const priorId = this.executionToEpisode.get(executionId)
    if ((priorEpisode !== undefined && JSON.stringify(priorEpisode) !== JSON.stringify(episode))
      || (priorId !== undefined && priorId !== id)) {
      this.setStatus('CONFLICTED', 'OUTCOME_EPISODE_IDENTITY_CONFLICT')
      this.accepting = false
      return
    }
    this.episodes.set(id, deepFreeze(episode))
    this.executionToEpisode.set(executionId, id)
    if (this.accepting) this.scheduleInitial(episode)
  }

  /** Drop handoff data when Experience could not make the matching Episode durable. */
  observeEpisodeCommitFailed(executionId: ExecutionId): void {
    this.pendingVerifier.delete(executionId)
    this.latestObservedVerifier.delete(executionId)
  }

  /** Accept only sanitized verifier snapshots; the execution ID is memory-only. */
  observeVerification(record: VerificationRecordV1): void {
    if (!this.accepting && this.opening === undefined) return
    const executionId = record.executionId
    const episodeId = this.executionToEpisode.get(executionId)
    const awaitingDurability = episodeId === undefined || (this.chains.get(episodeId)?.length ?? 0) === 0
    if (awaitingDurability && this.pendingVerifier.size >= MAX_PENDING_VERIFIER_HANDOFFS && !this.pendingVerifier.has(executionId)) {
      this.setStatus('CAPACITY_EXCEEDED', 'VERIFIER_HANDOFF_CAPACITY_EXCEEDED')
      return
    }
    let evidence = evidenceFrom(record)
    const prior = this.latestObservedVerifier.get(executionId)
    if (prior !== undefined && evidence !== undefined && !sameEvidence(prior, evidence)) {
      evidence = postconditionEvidenceSchema.parse({
        ...evidence,
        status: 'UNKNOWN',
        semanticSuccess: 'unknown',
        evidenceQuality: 'low',
        reasonCodes: ['VERIFICATION_CONFLICT'],
      })
    }
    this.latestObservedVerifier.set(executionId, evidence)
    if (episodeId === undefined) {
      this.pendingVerifier.set(executionId, evidence)
      return
    }
    const chain = this.chains.get(episodeId)
    if (chain === undefined || chain.length === 0) {
      // Initial qualification has already been scheduled for a committed Episode.
      this.pendingVerifier.set(executionId, evidence)
      return
    }
    if (evidence !== undefined && evidenceEqual(chain[chain.length - 1]!.postconditionEvidence, evidence)) return
    this.enqueueWrite(async () => {
      const current = this.chains.get(episodeId)
      if (current === undefined || current.length === 0) {
        this.pendingVerifier.set(executionId, evidence)
        return
      }
      if (evidence !== undefined && evidenceEqual(current[current.length - 1]!.postconditionEvidence, evidence)) return
      await this.appendRevision(episodeId, 'POSTCONDITION_UPDATE', evidence)
    })
  }

  /** Stop accepting callbacks, drain owned writes, and close the domain. */
  async detach(): Promise<void> {
    if (this.closeTask !== undefined) return this.closeTask
    this.accepting = false
    this.detached = true
    const generation = ++this.generation
    this.setStatus('UNAVAILABLE', 'STORAGE_CLOSING')
    const closing = this.enqueueLifecycle(async () => {
      if (this.opening !== undefined) await this.opening
      await this.writeTail
      const handle = this.handle
      this.handle = undefined
      this.table = undefined
      this.pendingVerifier.clear()
      this.latestObservedVerifier.clear()
      this.executionToEpisode.clear()
      this.episodes.clear()
      this.chains.clear()
      this.initialScheduled.clear()
      this.patternListeners.clear()
      if (handle !== undefined) await handle.close()
      if (generation === this.generation) this.setStatus('UNAVAILABLE', 'STORAGE_CLOSED')
    })
    const settled = closing.catch(() => {
      if (generation === this.generation) this.setStatus('UNAVAILABLE', 'STORAGE_CLOSE_FAILED')
    }).finally(() => { if (this.closeTask === settled) this.closeTask = undefined })
    this.closeTask = settled
    return settled
  }

  /** Drain appends without closing, for coordinated Experience/Outcome teardown. */
  async drain(): Promise<void> {
    const opening = this.opening
    if (opening !== undefined) await opening
    await this.writeTail
  }

  private scheduleInitial(episode: ExperienceEpisodeV1): void {
    const id = episode.episodeId as OutcomeEpisodeId
    if (this.initialScheduled.has(id) || (this.chains.get(id)?.length ?? 0) > 0) return
    this.initialScheduled.add(id)
    this.enqueueWrite(async () => {
      if ((this.chains.get(id)?.length ?? 0) > 0) return
      const executionId = episode.sourceExecutionId as ExecutionId
      const evidence = this.pendingVerifier.get(executionId)
      await this.appendRevision(id, 'INITIAL', evidence)
      this.pendingVerifier.delete(executionId)
    })
  }

  private appendRevision(
    episodeId: OutcomeEpisodeId,
    revisionKind: EmittedRevisionKind,
    evidence: EvidenceSnapshot | undefined,
  ): Promise<void> {
    return this.appendRevisionInner(episodeId, revisionKind, evidence)
  }

  private async appendRevisionInner(
    episodeId: OutcomeEpisodeId,
    revisionKind: EmittedRevisionKind,
    evidence: EvidenceSnapshot | undefined,
  ): Promise<void> {
    const table = this.table
    const episode = this.episodes.get(episodeId)
    if (!this.accepting || this.writeFaulted || table === undefined || episode === undefined) return
    const chain = this.chains.get(episodeId) ?? []
    if (chain.length >= MAX_OUTCOME_EPISODE_REVISIONS || table.size >= MAX_OUTCOME_REVISIONS) {
      this.accepting = false
      this.setStatus('CAPACITY_EXCEEDED', 'OUTCOME_REVISION_CAPACITY_EXCEEDED')
      return
    }
    const revisionNumber = chain.length + 1
    const qualification = qualifyOutcome(episode, evidence)
    const revisionId = outcomeRevisionKey(episodeId, revisionNumber)
    const revision = deepFreeze(outcomeRevisionSchema.parse({
      schemaVersion: 1,
      revisionId,
      episodeId,
      revisionNumber,
      ...(revisionNumber === 1 ? {} : { previousRevisionId: chain[chain.length - 1]!.revisionId }),
      revisionKind,
      status: qualification.status,
      ruleId: qualification.ruleId,
      recordedAt: Date.now(),
      reasonCodes: qualification.reasonCodes,
      ...(evidence === undefined ? {} : { postconditionEvidence: evidence }),
    }))
    const existing = table.get(revisionId)
    if (existing !== undefined) {
      if (JSON.stringify(existing) !== JSON.stringify(revision)) {
        this.accepting = false
        this.setStatus('CONFLICTED', 'OUTCOME_REVISION_KEY_CONFLICT')
      }
      return
    }
    try {
      await table.put(revisionId, revision)
      const next = [...chain, revision]
      this.chains.set(episodeId, next)
      if (table.size >= MAX_OUTCOME_REVISIONS) {
        this.accepting = false
        this.setStatus('CAPACITY_EXCEEDED', 'OUTCOME_REVISION_CAPACITY_EXCEEDED')
      }
      const snapshot = Object.freeze({ episode, revisions: Object.freeze([...next]) })
      for (const listener of this.patternListeners) {
        try { listener(snapshot) } catch { /* Pattern is an optional downstream projection. */ }
      }
    } catch {
      this.writeFaulted = true
      this.accepting = false
      this.setStatus('UNAVAILABLE', 'STORAGE_WRITE_FAILED')
    }
  }

  private enqueueWrite(job: () => Promise<void>): void {
    const write = this.writeTail.then(async () => {
      await job()
    }).catch(() => {
      this.writeFaulted = true
      this.accepting = false
      this.setStatus('UNAVAILABLE', 'STORAGE_WRITE_FAILED')
    })
    this.writeTail = write.then(() => undefined, () => undefined)
    void write.catch(() => undefined)
  }

  private enqueueLifecycle(job: () => Promise<void>): Promise<void> {
    const operation = this.lifecycleTail.then(job)
    this.lifecycleTail = operation.then(() => undefined, () => undefined)
    void operation.catch(() => undefined)
    return operation
  }

  private readRevisionCount(): number {
    const table = this.table
    if (table === undefined) return 0
    try { return table.size } catch {
      this.accepting = false
      this.setStatus('UNAVAILABLE', 'STORAGE_READ_FAILED')
      return 0
    }
  }

  private readCurrent(episodeId: string): OutcomeRevisionV1 | undefined {
    return this.readRevisions(episodeId).at(-1)
  }

  private readRevisions(episodeId: string): readonly OutcomeRevisionV1[] {
    if (!/^ra-episode-v1_[a-f0-9]{64}$/.test(episodeId)) return Object.freeze([])
    const chain = this.chains.get(episodeId as OutcomeEpisodeId)
    return Object.freeze(chain === undefined ? [] : [...chain])
  }

  private setStatus(status: OutcomeRuntimeStatus, ...reasons: string[]): void {
    this.currentStatus = status
    this.currentReasons = Object.freeze(reasons)
  }
}
