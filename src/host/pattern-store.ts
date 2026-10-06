import type { Domain, DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { experienceEpisodeSchema } from './experience-schema.ts'
import type { ExperienceEpisodeV1 } from './experience-schema.ts'
import { outcomeRevisionKey } from './outcome-schema.ts'
import type { OutcomeRevisionV1 } from './outcome-schema.ts'
import { qualifyOutcome } from './outcome-store.ts'
import type { OutcomePatternSnapshot, OutcomeRuntime } from './outcome-store.ts'
import {
  MAX_OUTCOME_EPISODE_REVISIONS,
  MAX_OUTCOME_REVISIONS,
  outcomeRevisionSchema,
} from './outcome-schema.ts'
import {
  MAX_EXPERIENCE_EPISODES,
  experienceEpisodeKey,
} from './experience-schema.ts'
import {
  comparePatternRefs,
  MAX_PATTERN_DELTA_REFERENCES_PER_ARRAY,
  MAX_PATTERN_IDENTITIES,
  MAX_PATTERN_PENDING_OUTCOME_HANDOFFS,
  MAX_PATTERN_PROVENANCE_REFERENCES,
  MAX_PATTERN_REVISIONS,
  MIN_PATTERN_SUPPORT,
  MIN_PATTERN_UTC_DATES,
  patternDomainSpec,
  patternIdentityFor,
  patternProvenanceDigest,
  patternReferenceKey,
  patternRevisionKey,
  patternRevisionSchema,
  supportedPatternEvidence,
} from './pattern-schema.ts'
import type {
  PatternEvidenceRefV1,
  PatternRevisionKind,
  PatternState,
  PatternStatus,
  VerifiedExperiencePatternRevisionV1,
} from './pattern-schema.ts'

type PatternDomain = Domain<typeof patternDomainSpec>
type PatternTable = ReturnType<PatternDomain['table']>

export interface PatternDiagnostics {
  readonly status: () => PatternStatus
  readonly patternIds: () => readonly string[]
  readonly current: (patternId: string) => VerifiedExperiencePatternRevisionV1 | undefined
  readonly revisions: (patternId: string) => readonly VerifiedExperiencePatternRevisionV1[]
  readonly reasonCodes: () => readonly string[]
}

/** Host-private immutable source view for the Phase 11.4 Guidance projection. */
export interface PatternGuidanceSnapshot {
  readonly patternId: string
  readonly revisions: readonly VerifiedExperiencePatternRevisionV1[]
}

export type PatternGuidanceListener = (revision: VerifiedExperiencePatternRevisionV1) => void

interface EpisodeSource {
  readonly episode: ExperienceEpisodeV1
  readonly revisions: readonly OutcomeRevisionV1[]
}

interface EpisodeContribution {
  readonly episode: ExperienceEpisodeV1
  readonly support?: PatternEvidenceRefV1
  readonly contradiction?: PatternEvidenceRefV1
}

interface PatternProjection {
  state: PatternState
  readonly support: Map<string, PatternEvidenceRefV1>
  readonly contradictions: Map<string, PatternEvidenceRefV1>
  readonly revisions: VerifiedExperiencePatternRevisionV1[]
}

interface PatternTransition {
  readonly state: PatternState
  readonly kind: PatternRevisionKind
}

class PatternConflictError extends Error {}
class PatternCapacityError extends Error {}

/**
 * Classify frozen bounded-count violations before Zod can turn them into a
 * generic validation failure. This is also used while recovering persisted
 * rows, where the input has not yet passed the revision schema.
 */
function assertPatternRevisionCapacity(value: unknown): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return
  const row = value as Record<string, unknown>
  if (typeof row.revisionNumber === 'number' && row.revisionNumber > MAX_PATTERN_REVISIONS) {
    throw new PatternCapacityError('pattern-revision-capacity-exceeded')
  }
  for (const field of ['supportCount', 'supportUtcDateCount', 'contradictionEpisodeCount'] as const) {
    const count = row[field]
    if (typeof count === 'number' && Number.isFinite(count) && count > MAX_PATTERN_DELTA_REFERENCES_PER_ARRAY) {
      throw new PatternCapacityError(`pattern-${field}-capacity-exceeded`)
    }
  }
  for (const field of ['supportAdded', 'supportRemoved', 'contradictionsAdded', 'triggerRefs'] as const) {
    const refs = row[field]
    if (Array.isArray(refs) && refs.length > MAX_PATTERN_DELTA_REFERENCES_PER_ARRAY) {
      throw new PatternCapacityError(`pattern-${field}-capacity-exceeded`)
    }
  }
}

function freeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value
  Object.freeze(value)
  for (const child of Object.values(value as Record<string, unknown>)) freeze(child)
  return value
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function reference(episodeId: string, outcomeRevisionId: string): PatternEvidenceRefV1 {
  return Object.freeze({ episodeId, outcomeRevisionId })
}

function sortRefs(values: Iterable<PatternEvidenceRefV1>): PatternEvidenceRefV1[] {
  return [...values].sort(comparePatternRefs)
}

function uniqueRefs(values: Iterable<PatternEvidenceRefV1>): PatternEvidenceRefV1[] {
  const byKey = new Map<string, PatternEvidenceRefV1>()
  for (const value of values) byKey.set(patternReferenceKey(value), value)
  return sortRefs(byKey.values())
}

function trustedRevision(
  episode: ExperienceEpisodeV1,
  revision: OutcomeRevisionV1,
  status: 'VERIFIED_SUCCESS' | 'VERIFIED_FAILURE',
): boolean {
  const evidence = revision.postconditionEvidence
  if (evidence === undefined
    || revision.status !== status
    || revision.ruleId !== 'outcome-v1-postcondition'
    || !supportedPatternEvidence(evidence.source, evidence.adapterId)
    || evidence.reasonCodes.includes('VERIFICATION_CONFLICT')) return false
  const expectedStatus = status === 'VERIFIED_SUCCESS' ? 'MATCHED' : 'MISMATCHED'
  const expectedSemantic = status === 'VERIFIED_SUCCESS'
  if (evidence.status !== expectedStatus
    || evidence.semanticSuccess !== expectedSemantic
    || (evidence.evidenceQuality !== 'high' && evidence.evidenceQuality !== 'medium')) return false
  const qualification = qualifyOutcome(episode, evidence)
  return qualification.status === status
    && qualification.ruleId === 'outcome-v1-postcondition'
    && sameJson(qualification.reasonCodes, revision.reasonCodes)
}

function validateSourceSnapshot(snapshot: OutcomePatternSnapshot): EpisodeSource {
  const episode = experienceEpisodeSchema.parse(snapshot.episode)
  if (episode.episodeId !== experienceEpisodeKey(episode.sourceExecutionId)) {
    throw new PatternConflictError('pattern-source-episode-key-mismatch')
  }
  if (snapshot.revisions.length === 0 || snapshot.revisions.length > MAX_OUTCOME_EPISODE_REVISIONS) {
    throw new PatternConflictError('pattern-source-outcome-chain-size-invalid')
  }
  const revisions = snapshot.revisions.map(raw => outcomeRevisionSchema.parse(raw))
  for (let index = 0; index < revisions.length; index += 1) {
    const revision = revisions[index]!
    if (revision.episodeId !== episode.episodeId
      || revision.revisionId !== outcomeRevisionKey(episode.episodeId, index + 1)
      || revision.revisionNumber !== index + 1
      || (index === 0 ? revision.previousRevisionId !== undefined : revision.previousRevisionId !== revisions[index - 1]!.revisionId)) {
      throw new PatternConflictError('pattern-source-outcome-lineage-invalid')
    }
    if (revision.status === 'INVALIDATED'
      || revision.revisionKind === 'INVALIDATION'
      || revision.revisionKind === 'REQUALIFICATION'
      || revision.ruleId === 'outcome-v1-invalidation') {
      throw new PatternConflictError('pattern-source-reserved-outcome-value')
    }
    const qualification = qualifyOutcome(episode, revision.postconditionEvidence)
    if (qualification.status !== revision.status
      || qualification.ruleId !== revision.ruleId
      || !sameJson(qualification.reasonCodes, revision.reasonCodes)) {
      throw new PatternConflictError('pattern-source-outcome-qualification-invalid')
    }
  }
  return Object.freeze({ episode: freeze(episode), revisions: Object.freeze(revisions.map(freeze)) })
}

function trustedReference(
  episode: ExperienceEpisodeV1,
  revisions: readonly OutcomeRevisionV1[],
  revisionId: string,
  patternId: string,
  status: 'VERIFIED_SUCCESS' | 'VERIFIED_FAILURE',
): boolean {
  const revision = revisions.find(item => item.revisionId === revisionId)
  if (revision === undefined || !trustedRevision(episode, revision, status)) return false
  return patternIdentityFor(episode, revision.postconditionEvidence!) === patternId
}

function supportValidAtRevision(
  episode: ExperienceEpisodeV1,
  revisions: readonly OutcomeRevisionV1[],
  revisionId: string,
  patternId: string,
): boolean {
  const index = revisions.findIndex(item => item.revisionId === revisionId)
  if (index < 0 || !trustedReference(episode, revisions, revisionId, patternId, 'VERIFIED_SUCCESS')) return false
  return !revisions.slice(0, index + 1).some(revision =>
    trustedRevision(episode, revision, 'VERIFIED_FAILURE')
      && patternIdentityFor(episode, revision.postconditionEvidence!) === patternId,
  )
}

function dateKey(episode: ExperienceEpisodeV1): number {
  return Math.floor(episode.observedAt / 86_400_000)
}

function supportDateCount(
  support: ReadonlyMap<string, PatternEvidenceRefV1>,
  episodes: ReadonlyMap<string, EpisodeSource>,
): number {
  const days = new Set<number>()
  for (const episodeId of support.keys()) {
    const source = episodes.get(episodeId)
    if (source !== undefined) days.add(dateKey(source.episode))
  }
  return days.size
}

function meetsMinimum(
  support: ReadonlyMap<string, PatternEvidenceRefV1>,
  contradictions: ReadonlyMap<string, PatternEvidenceRefV1>,
  episodes: ReadonlyMap<string, EpisodeSource>,
): boolean {
  return support.size >= MIN_PATTERN_SUPPORT
    && supportDateCount(support, episodes) >= MIN_PATTERN_UTC_DATES
    && contradictions.size === 0
}

function referenceDeltas(
  before: ReadonlyMap<string, PatternEvidenceRefV1>,
  after: ReadonlyMap<string, PatternEvidenceRefV1>,
): { readonly added: PatternEvidenceRefV1[]; readonly removed: PatternEvidenceRefV1[] } {
  const added: PatternEvidenceRefV1[] = []
  const removed: PatternEvidenceRefV1[] = []
  for (const [episodeId, prior] of before) {
    const next = after.get(episodeId)
    if (next === undefined || !sameJson(prior, next)) removed.push(prior)
  }
  for (const [episodeId, next] of after) {
    const prior = before.get(episodeId)
    if (prior === undefined || !sameJson(prior, next)) added.push(next)
  }
  return { added: sortRefs(added), removed: sortRefs(removed) }
}

function countRowRefs(revision: VerifiedExperiencePatternRevisionV1): number {
  return revision.supportAdded.length + revision.supportRemoved.length
    + revision.contradictionsAdded.length + revision.triggerRefs.length
}

/** Host-owned deterministic materialization over immutable Episode and Outcome history. */
export class PatternRuntime {
  private handle: PatternDomain | undefined
  private table: PatternTable | undefined
  private opening: Promise<void> | undefined
  private closeTask: Promise<void> | undefined
  private generation = 0
  private detaching = false
  private accepting = false
  private queueDrainScheduled = false
  private queueFaulted = false
  private writeTail: Promise<void> = Promise.resolve()
  private readonly pendingSnapshots: OutcomePatternSnapshot[] = []
  private readonly sources = new Map<string, EpisodeSource>()
  private readonly episodeGroups = new Map<string, Map<string, EpisodeContribution>>()
  private readonly groups = new Map<string, Map<string, EpisodeContribution>>()
  private readonly projections = new Map<string, PatternProjection>()
  private readonly patternChains = new Map<string, VerifiedExperiencePatternRevisionV1[]>()
  private readonly guidanceListeners = new Set<PatternGuidanceListener>()
  private outcome: OutcomeRuntime | undefined
  private experienceReady: () => boolean = () => true
  private unsubscribeOutcome: (() => void) | undefined
  private currentStatus: PatternStatus = 'UNAVAILABLE'
  private currentReasons: readonly string[] = Object.freeze(['STORAGE_ABSENT'])
  private provenanceReferences = 0

  readonly diagnostics: PatternDiagnostics = Object.freeze({
    status: () => this.readStatus(),
    patternIds: () => this.readPatternIds(),
    current: (id: string) => this.readCurrent(id),
    revisions: (id: string) => this.readRevisions(id),
    reasonCodes: () => { this.readStatus(); return this.currentReasons },
  })

  /** Complete validated chains are visible only while the Pattern source is READY. */
  guidanceSnapshot(): readonly PatternGuidanceSnapshot[] {
    if (this.readStatus() !== 'READY') throw new Error('pattern-guidance-source-unavailable')
    return Object.freeze([...this.patternChains.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([patternId, revisions]) => Object.freeze({
        patternId,
        revisions: Object.freeze([...revisions]),
      })))
  }

  /** Subscribe only while READY; append notifications follow durable commit and projection install. */
  subscribeGuidance(listener: PatternGuidanceListener): () => void {
    if (this.readStatus() !== 'READY') throw new Error('pattern-guidance-source-unavailable')
    this.guidanceListeners.add(listener)
    return () => { this.guidanceListeners.delete(listener) }
  }

  /** Subscribe before taking the source snapshot so no durable Outcome append is missed. */
  attach(storageDomain: DomainFacility, outcome: OutcomeRuntime, experienceReady: () => boolean = () => true): Promise<void> {
    if (this.closeTask !== undefined) return this.closeTask.then(() => this.attach(storageDomain, outcome, experienceReady))
    if (this.handle !== undefined && !this.detaching) return Promise.resolve()
    if (this.opening !== undefined && !this.detaching) return this.opening
    this.experienceReady = experienceReady
    this.outcome = outcome
    if (!this.sourcesReady()) {
      this.setStatus('UNAVAILABLE', [this.experienceIsReady() ? 'OUTCOME_SOURCE_UNAVAILABLE' : 'EXPERIENCE_SOURCE_UNAVAILABLE'])
      return Promise.resolve()
    }
    const generation = ++this.generation
    this.detaching = false
    this.accepting = false
    this.queueFaulted = false
    this.pendingSnapshots.splice(0)
    this.sources.clear()
    this.episodeGroups.clear()
    this.groups.clear()
    this.projections.clear()
    this.patternChains.clear()
    this.provenanceReferences = 0
    this.currentReasons = Object.freeze(['STORAGE_OPENING'])
    this.currentStatus = 'UNAVAILABLE'
    const opening = (async () => {
      let opened: PatternDomain | undefined
      try {
        this.unsubscribeOutcome = outcome.subscribePattern(snapshot => this.observeOutcomeSnapshot(snapshot))
        const baseline = outcome.patternSnapshot()
        this.replaceSourceBaseline(baseline)
        opened = await storageDomain.open(patternDomainSpec)
        if (generation !== this.generation || this.detaching) {
          await opened.close()
          return
        }
        this.handle = opened
        this.table = opened.table('revisions')
        this.loadPatternHistory()
        this.rebuildContributions()
        const ids = new Set([...this.patternChains.keys(), ...this.groups.keys()])
        for (const id of [...ids].sort()) {
          if (this.detaching || generation !== this.generation) return
          await this.reconcilePattern(id, this.triggerRefsFor(id))
        }
        while (this.pendingSnapshots.length > 0 && !this.queueFaulted && !this.detaching && generation === this.generation) {
          const next = this.pendingSnapshots.shift()!
          await this.applyOutcomeSnapshot(next)
        }
        if (this.queueFaulted) throw new Error('pattern-notification-handoff-capacity-exceeded')
        if (this.detaching || generation !== this.generation) return
        this.accepting = true
        this.setStatus('READY')
        if (this.pendingSnapshots.length > 0) this.scheduleQueueDrain()
      } catch (error) {
        this.unsubscribeOutcome?.()
        this.unsubscribeOutcome = undefined
        this.accepting = false
        if (opened !== undefined) {
          try { await opened.close() } catch { /* Keep the original Pattern open failure. */ }
        }
        if (this.handle === opened) {
          this.handle = undefined
          this.table = undefined
        }
        const conflict = error instanceof PatternConflictError
          || (error instanceof Error && /conflict|mismatch|lineage|digest|reference/.test(error.message))
        const capacity = error instanceof PatternCapacityError
        this.setStatus(capacity ? 'CAPACITY_EXCEEDED' : conflict ? 'CONFLICTED' : 'UNAVAILABLE',
          error instanceof Error ? [error.message] : ['PATTERN_OPEN_FAILED'])
        this.sources.clear()
        this.episodeGroups.clear()
        this.groups.clear()
        this.projections.clear()
        this.patternChains.clear()
        this.provenanceReferences = 0
      }
    })()
    const settled = opening.finally(() => { if (this.opening === settled) this.opening = undefined })
    this.opening = settled
    return settled
  }

  /** Drain owned projection writes without closing the Pattern domain. */
  async drain(): Promise<void> {
    const opening = this.opening
    if (opening !== undefined) await opening
    while (this.queueDrainScheduled || this.pendingSnapshots.length > 0) {
      this.scheduleQueueDrain()
      await this.writeTail
      if (this.currentStatus !== 'READY') break
    }
    await this.writeTail
  }

  /** Stop notifications, drain Pattern appends, and close the optional Pattern handle. */
  async detach(): Promise<void> {
    if (this.closeTask !== undefined) return this.closeTask
    this.accepting = false
    this.detaching = true
    const generation = ++this.generation
    this.unsubscribeOutcome?.()
    this.unsubscribeOutcome = undefined
    this.setStatus('UNAVAILABLE', ['STORAGE_CLOSING'])
    const closing = (async () => {
      const opening = this.opening
      if (opening !== undefined) await opening
      await this.writeTail
      const handle = this.handle
      this.handle = undefined
      this.table = undefined
      this.outcome = undefined
      this.sources.clear()
      this.episodeGroups.clear()
      this.groups.clear()
      this.projections.clear()
      this.patternChains.clear()
      this.guidanceListeners.clear()
      this.pendingSnapshots.splice(0)
      this.provenanceReferences = 0
      this.experienceReady = () => true
      if (handle !== undefined) await handle.close()
      if (generation === this.generation) this.setStatus('UNAVAILABLE', ['STORAGE_CLOSED'])
    })()
    const settled = closing.catch(() => {
      if (generation === this.generation) this.setStatus('UNAVAILABLE', ['STORAGE_CLOSE_FAILED'])
    }).finally(() => { if (this.closeTask === settled) this.closeTask = undefined })
    this.closeTask = settled
    return settled
  }

  private readStatus(): PatternStatus {
    if (this.currentStatus === 'READY' && !this.sourcesReady()) this.markSourcesUnavailable()
    return this.currentStatus
  }

  private markSourcesUnavailable(): void {
    this.accepting = false
    this.queueFaulted = true
    this.pendingSnapshots.splice(0)
    this.unsubscribeOutcome?.()
    this.unsubscribeOutcome = undefined
    this.setStatus('UNAVAILABLE', [this.experienceIsReady() ? 'OUTCOME_SOURCE_UNAVAILABLE' : 'EXPERIENCE_SOURCE_UNAVAILABLE'])
  }

  private experienceIsReady(): boolean {
    try { return this.experienceReady() } catch { return false }
  }

  private sourcesReady(): boolean {
    return this.experienceIsReady() && this.outcome?.diagnostics.status() === 'READY'
  }

  private readPatternIds(): readonly string[] {
    if (this.readStatus() !== 'READY') return Object.freeze([])
    return Object.freeze([...this.patternChains.keys()].sort())
  }

  private readCurrent(patternId: string): VerifiedExperiencePatternRevisionV1 | undefined {
    if (this.readStatus() !== 'READY') return undefined
    return this.patternChains.get(patternId)?.at(-1)
  }

  private readRevisions(patternId: string): readonly VerifiedExperiencePatternRevisionV1[] {
    return Object.freeze([...(this.patternChains.get(patternId) ?? [])])
  }

  private setStatus(status: PatternStatus, reasons: readonly string[] = []): void {
    this.currentStatus = status
    this.currentReasons = Object.freeze([...reasons])
  }

  private replaceSourceBaseline(snapshots: readonly OutcomePatternSnapshot[]): void {
    if (snapshots.length > MAX_EXPERIENCE_EPISODES) throw new PatternConflictError('pattern-episode-capacity-invalid')
    this.sources.clear()
    const executionIds = new Set<string>()
    let revisionCount = 0
    for (const raw of snapshots) {
      const source = validateSourceSnapshot(raw)
      revisionCount += source.revisions.length
      if (revisionCount > MAX_OUTCOME_REVISIONS) throw new PatternConflictError('pattern-outcome-capacity-invalid')
      if (this.sources.has(source.episode.episodeId) || executionIds.has(source.episode.sourceExecutionId)) {
        throw new PatternConflictError('pattern-source-episode-identity-conflict')
      }
      executionIds.add(source.episode.sourceExecutionId)
      this.sources.set(source.episode.episodeId, source)
    }
  }

  private buildContributions(source: EpisodeSource): Map<string, EpisodeContribution> {
    const episode = source.episode
    const result = new Map<string, EpisodeContribution>()
    if (episode.episodeId !== experienceEpisodeKey(episode.sourceExecutionId)) return result
    if (episode.operation.kind === 'unknown'
      || episode.operation.parserConfidence !== 'high'
      || typeof episode.operation.mutating !== 'boolean'
      || typeof episode.operation.externalEffect !== 'boolean'
      || episode.operation.networkEffect === 'unknown') return result

    for (const revision of source.revisions) {
      const status = revision.status === 'VERIFIED_SUCCESS'
        ? 'VERIFIED_SUCCESS'
        : revision.status === 'VERIFIED_FAILURE'
          ? 'VERIFIED_FAILURE'
          : undefined
      if (status === undefined || !trustedRevision(episode, revision, status)) continue
      const evidence = revision.postconditionEvidence!
      const patternId = patternIdentityFor(episode, evidence)
      if (patternId === undefined) continue
      const existing = result.get(patternId)
      if (status === 'VERIFIED_FAILURE') {
        const contradiction = existing?.contradiction ?? reference(episode.episodeId, revision.revisionId)
        result.set(patternId, { episode, ...(existing?.support === undefined ? {} : { support: existing.support }), contradiction })
      } else if (existing === undefined) {
        result.set(patternId, { episode })
      }
    }

    const latest = source.revisions.at(-1)
    if (latest !== undefined && trustedRevision(episode, latest, 'VERIFIED_SUCCESS')) {
      const patternId = patternIdentityFor(episode, latest.postconditionEvidence!)
      const existing = patternId === undefined ? undefined : result.get(patternId)
      if (patternId !== undefined && existing !== undefined && existing.contradiction === undefined) {
        result.set(patternId, { episode, support: reference(episode.episodeId, latest.revisionId) })
      }
    }
    return result
  }

  private rebuildContributions(): void {
    this.episodeGroups.clear()
    this.groups.clear()
    for (const source of this.sources.values()) {
      const contributions = this.buildContributions(source)
      this.episodeGroups.set(source.episode.episodeId, contributions)
      for (const [patternId, contribution] of contributions) {
        let group = this.groups.get(patternId)
        if (group === undefined) {
          if (this.groups.size >= MAX_PATTERN_IDENTITIES) throw new PatternCapacityError('pattern-identity-capacity-exceeded')
          group = new Map()
          this.groups.set(patternId, group)
        }
        group.set(source.episode.episodeId, contribution)
      }
    }
  }

  private observeOutcomeSnapshot(snapshot: OutcomePatternSnapshot): void {
    if (this.detaching || this.queueFaulted || this.currentStatus === 'CONFLICTED' || this.currentStatus === 'CAPACITY_EXCEEDED') return
    if (!this.sourcesReady()) {
      this.markSourcesUnavailable()
      return
    }
    if (this.pendingSnapshots.length >= MAX_PATTERN_PENDING_OUTCOME_HANDOFFS) {
      this.queueFaulted = true
      this.accepting = false
      this.setStatus('UNAVAILABLE', ['PATTERN_NOTIFICATION_HANDOFF_CAPACITY_EXCEEDED'])
      this.pendingSnapshots.splice(0)
      return
    }
    this.pendingSnapshots.push(snapshot)
    if (this.accepting) this.scheduleQueueDrain()
  }

  private scheduleQueueDrain(): void {
    if (this.queueDrainScheduled || this.detaching || !this.accepting || this.currentStatus !== 'READY') return
    this.queueDrainScheduled = true
    const work = this.writeTail.then(async () => {
      while (this.pendingSnapshots.length > 0 && !this.detaching && !this.queueFaulted && this.currentStatus === 'READY') {
        const snapshot = this.pendingSnapshots.shift()!
        await this.applyOutcomeSnapshot(snapshot)
      }
    }).catch(error => {
      this.accepting = false
      const capacity = error instanceof PatternCapacityError
      const conflict = error instanceof PatternConflictError
      this.setStatus(capacity ? 'CAPACITY_EXCEEDED' : conflict ? 'CONFLICTED' : 'UNAVAILABLE',
        error instanceof Error ? [error.message] : ['PATTERN_WRITE_FAILED'])
    }).finally(() => {
      this.queueDrainScheduled = false
      if (this.pendingSnapshots.length > 0 && this.accepting && this.currentStatus === 'READY') this.scheduleQueueDrain()
    })
    this.writeTail = work.then(() => undefined, () => undefined)
    void work.catch(() => undefined)
  }

  private async applyOutcomeSnapshot(raw: OutcomePatternSnapshot): Promise<void> {
    if (!this.sourcesReady()) {
      this.markSourcesUnavailable()
      return
    }
    const source = validateSourceSnapshot(raw)
    const episodeId = source.episode.episodeId
    const previous = this.sources.get(episodeId)
    if (previous !== undefined) {
      if (source.revisions.length < previous.revisions.length) return
      const commonLength = Math.min(source.revisions.length, previous.revisions.length)
      if (!sameJson(source.revisions.slice(0, commonLength), previous.revisions.slice(0, commonLength))) {
        throw new PatternConflictError('pattern-source-divergent-outcome-chain')
      }
      if (source.revisions.length === previous.revisions.length) {
        if (!sameJson(source, previous)) throw new PatternConflictError('pattern-source-divergent-episode')
        return
      }
    } else if (this.sources.size >= MAX_EXPERIENCE_EPISODES) {
      throw new PatternCapacityError('pattern-episode-capacity-exceeded')
    }

    const priorContributions = this.episodeGroups.get(episodeId) ?? new Map<string, EpisodeContribution>()
    const nextContributions = this.buildContributions(source)
    const affected = new Set([...priorContributions.keys(), ...nextContributions.keys()])
    for (const patternId of priorContributions.keys()) {
      const group = this.groups.get(patternId)
      group?.delete(episodeId)
      if (group?.size === 0) this.groups.delete(patternId)
    }
    this.sources.set(episodeId, source)
    this.episodeGroups.set(episodeId, nextContributions)
    for (const [patternId, contribution] of nextContributions) {
      let group = this.groups.get(patternId)
      if (group === undefined) {
        if (this.groups.size >= MAX_PATTERN_IDENTITIES) throw new PatternCapacityError('pattern-identity-capacity-exceeded')
        group = new Map()
        this.groups.set(patternId, group)
      }
      group.set(episodeId, contribution)
    }
    const trigger = reference(episodeId, source.revisions.at(-1)!.revisionId)
    for (const patternId of [...affected].sort()) await this.reconcilePattern(patternId, [trigger])
  }

  private triggerRefsFor(patternId: string): PatternEvidenceRefV1[] {
    const group = this.groups.get(patternId)
    if (group === undefined) return []
    return sortRefs([...group.keys()].flatMap(episodeId => {
      const source = this.sources.get(episodeId)
      const current = source?.revisions.at(-1)
      return current === undefined ? [] : [reference(episodeId, current.revisionId)]
    }))
  }

  private desiredProjection(patternId: string): {
    readonly support: Map<string, PatternEvidenceRefV1>
    readonly contradictions: Map<string, PatternEvidenceRefV1>
  } {
    const support = new Map<string, PatternEvidenceRefV1>()
    const contradictions = new Map<string, PatternEvidenceRefV1>()
    for (const [episodeId, contribution] of this.groups.get(patternId) ?? []) {
      if (contribution.support !== undefined) support.set(episodeId, contribution.support)
      if (contribution.contradiction !== undefined) contradictions.set(episodeId, contribution.contradiction)
    }
    return { support, contradictions }
  }

  private async reconcilePattern(patternId: string, triggerRefs: readonly PatternEvidenceRefV1[]): Promise<void> {
    const table = this.table
    if (table === undefined) throw new Error('pattern-domain-unavailable')
    const projection = this.projections.get(patternId)
    const desired = this.desiredProjection(patternId)
    if (projection === undefined) {
      if (desired.contradictions.size > 0 || !meetsMinimum(desired.support, desired.contradictions, this.sources)) return
      if (this.patternChains.size >= MAX_PATTERN_IDENTITIES) throw new PatternCapacityError('pattern-identity-capacity-exceeded')
      await this.appendRevision(patternId, undefined, desired.support, [], desired.contradictions, {
        state: 'QUALIFIED',
        kind: 'INITIAL',
        triggerRefs: triggerRefs.length > 0 ? triggerRefs : sortRefs(desired.support.values()),
      })
      return
    }
    if (projection.state === 'INVALIDATED') return

    const newContradictions = new Map<string, PatternEvidenceRefV1>()
    for (const [episodeId, value] of desired.contradictions) {
      const prior = projection.contradictions.get(episodeId)
      if (prior === undefined) newContradictions.set(episodeId, value)
      else if (!sameJson(prior, value)) throw new PatternConflictError('pattern-contradiction-witness-diverged')
    }
    const supportDelta = referenceDeltas(projection.support, desired.support)
    const changedSupport = supportDelta.added.length > 0 || supportDelta.removed.length > 0
    const changedContradictions = newContradictions.size > 0
    if (!changedSupport && !changedContradictions) return

    let transition: PatternTransition
    if (desired.contradictions.size > 0) {
      transition = { state: 'INVALIDATED', kind: 'INVALIDATION' }
    } else if (!meetsMinimum(desired.support, desired.contradictions, this.sources)) {
      transition = { state: 'SUSPENDED', kind: 'SUSPENSION' }
    } else if (projection.state === 'SUSPENDED') {
      transition = { state: 'QUALIFIED', kind: 'REQUALIFICATION' }
    } else {
      transition = { state: 'QUALIFIED', kind: 'SUPPORT_UPDATE' }
    }
    await this.appendRevision(patternId, projection, desired.support, supportDelta.removed, desired.contradictions, {
      ...transition,
      supportAdded: supportDelta.added,
      contradictionsAdded: sortRefs(newContradictions.values()),
      triggerRefs: triggerRefs.length > 0 ? triggerRefs : sortRefs([...supportDelta.added, ...supportDelta.removed, ...newContradictions.values()]),
    })
  }

  private async appendRevision(
    patternId: string,
    prior: PatternProjection | undefined,
    support: ReadonlyMap<string, PatternEvidenceRefV1>,
    supportRemoved: readonly PatternEvidenceRefV1[],
    contradictions: ReadonlyMap<string, PatternEvidenceRefV1>,
    transition: PatternTransition & {
      readonly supportAdded?: readonly PatternEvidenceRefV1[]
      readonly contradictionsAdded?: readonly PatternEvidenceRefV1[]
      readonly triggerRefs: readonly PatternEvidenceRefV1[]
    },
  ): Promise<void> {
    const table = this.table
    if (table === undefined || !this.accepting && this.opening === undefined) return
    const chain = this.patternChains.get(patternId) ?? []
    if (chain.length >= MAX_PATTERN_REVISIONS || table.size >= MAX_PATTERN_REVISIONS) {
      throw new PatternCapacityError('pattern-revision-capacity-exceeded')
    }
    const revisionNumber = chain.length + 1
    const supportRefs = sortRefs(support.values())
    const contradictionRefs = sortRefs(contradictions.values())
    const supportAdded = transition.supportAdded ?? (prior === undefined ? supportRefs : referenceDeltas(prior.support, support).added)
    const contradictionsAdded = transition.contradictionsAdded ?? (prior === undefined ? contradictionRefs : contradictionRefs.filter(ref => !prior.contradictions.has(ref.episodeId)))
    const supportAddedRefs = sortRefs(supportAdded)
    const supportRemovedRefs = sortRefs(supportRemoved)
    const contradictionsAddedRefs = sortRefs(contradictionsAdded)
    const triggerRefs = uniqueRefs(transition.triggerRefs)
    const supportCount = support.size
    const supportUtcDateCount = supportDateCount(support, this.sources)
    const contradictionEpisodeCount = contradictions.size
    const rowRefs = supportAddedRefs.length + supportRemovedRefs.length
      + contradictionsAddedRefs.length + triggerRefs.length
    assertPatternRevisionCapacity({
      revisionNumber,
      supportCount,
      supportUtcDateCount,
      contradictionEpisodeCount,
      supportAdded: supportAddedRefs,
      supportRemoved: supportRemovedRefs,
      contradictionsAdded: contradictionsAddedRefs,
      triggerRefs,
    })
    if (this.provenanceReferences + rowRefs > MAX_PATTERN_PROVENANCE_REFERENCES) {
      throw new PatternCapacityError('pattern-provenance-capacity-exceeded')
    }
    const revision = freeze(patternRevisionSchema.parse({
      schemaVersion: 1,
      patternId,
      revisionId: patternRevisionKey(patternId, revisionNumber),
      revisionNumber,
      ...(revisionNumber === 1 ? {} : { previousRevisionId: chain[chain.length - 1]!.revisionId }),
      state: transition.state,
      revisionKind: transition.kind,
      minimumSupport: MIN_PATTERN_SUPPORT,
      supportCount,
      supportUtcDateCount,
      contradictionEpisodeCount,
      supportAdded: supportAddedRefs,
      supportRemoved: supportRemovedRefs,
      contradictionsAdded: contradictionsAddedRefs,
      triggerRefs,
      provenanceDigest: patternProvenanceDigest(transition.state, supportRefs, contradictionRefs),
    }))
    const existing = table.get(revision.revisionId)
    if (existing !== undefined) {
      if (!sameJson(existing, revision)) throw new PatternConflictError('pattern-revision-key-conflict')
    } else {
      await table.put(revision.revisionId, revision)
    }
    const nextChain = [...chain, revision]
    this.patternChains.set(patternId, nextChain)
    this.projections.set(patternId, {
      state: revision.state,
      support: new Map(support),
      contradictions: new Map(contradictions),
      revisions: nextChain,
    })
    this.provenanceReferences += rowRefs
    if (this.currentStatus === 'READY') {
      for (const listener of this.guidanceListeners) {
        try { listener(revision) } catch { /* Guidance is an optional downstream projection. */ }
      }
    }
  }

  private loadPatternHistory(): void {
    const table = this.table
    if (table === undefined) throw new Error('pattern-domain-unavailable')
    if (table.size > MAX_PATTERN_REVISIONS) throw new PatternCapacityError('pattern-revision-capacity-invalid')
    const grouped = new Map<string, VerifiedExperiencePatternRevisionV1[]>()
    this.provenanceReferences = 0
    for (const [key, raw] of table.entries()) {
      assertPatternRevisionCapacity(raw)
      const revision = patternRevisionSchema.parse(raw)
      if (revision.revisionId !== key) throw new PatternConflictError('pattern-record-key-mismatch')
      const chain = grouped.get(revision.patternId) ?? []
      chain.push(freeze(revision))
      grouped.set(revision.patternId, chain)
      this.provenanceReferences += countRowRefs(revision)
    }
    if (grouped.size > MAX_PATTERN_IDENTITIES) throw new PatternCapacityError('pattern-identity-capacity-invalid')
    if (this.provenanceReferences > MAX_PATTERN_PROVENANCE_REFERENCES) throw new PatternCapacityError('pattern-provenance-capacity-invalid')
    for (const [patternId, chain] of grouped) {
      chain.sort((a, b) => a.revisionNumber - b.revisionNumber)
      if (chain.length > MAX_PATTERN_REVISIONS) throw new PatternCapacityError('pattern-chain-capacity-invalid')
      const projection: PatternProjection = {
        state: 'QUALIFIED',
        support: new Map(),
        contradictions: new Map(),
        revisions: chain,
      }
      for (let index = 0; index < chain.length; index += 1) {
        const revision = chain[index]!
        if (revision.revisionNumber !== index + 1
          || revision.revisionId !== patternRevisionKey(patternId, index + 1)
          || (index === 0 ? revision.previousRevisionId !== undefined : revision.previousRevisionId !== chain[index - 1]!.revisionId)) {
          throw new PatternConflictError('pattern-revision-lineage-invalid')
        }
        if (index > 0 && projection.state === 'INVALIDATED') throw new PatternConflictError('pattern-invalidated-chain-continued')
        this.validateTriggerRefs(patternId, revision.triggerRefs)
        for (const ref of revision.supportRemoved) {
          const active = projection.support.get(ref.episodeId)
          if (active === undefined || !sameJson(active, ref)) throw new PatternConflictError('pattern-support-removal-invalid')
          projection.support.delete(ref.episodeId)
        }
        for (const ref of revision.supportAdded) {
          if (!this.validateSupportReference(ref, patternId) || projection.support.has(ref.episodeId)) {
            throw new PatternConflictError('pattern-support-reference-invalid')
          }
          projection.support.set(ref.episodeId, ref)
        }
        for (const ref of revision.contradictionsAdded) {
          if (!this.validateContradictionReference(ref, patternId) || projection.contradictions.has(ref.episodeId)) {
            throw new PatternConflictError('pattern-contradiction-reference-invalid')
          }
          projection.contradictions.set(ref.episodeId, ref)
        }
        projection.state = revision.state
        const dateCount = supportDateCount(projection.support, this.sources)
        if (revision.supportCount !== projection.support.size
          || revision.supportUtcDateCount !== dateCount
          || revision.contradictionEpisodeCount !== projection.contradictions.size
          || revision.provenanceDigest !== patternProvenanceDigest(revision.state, sortRefs(projection.support.values()), sortRefs(projection.contradictions.values()))) {
          throw new PatternConflictError('pattern-provenance-digest-or-count-invalid')
        }
        const qualifies = meetsMinimum(projection.support, projection.contradictions, this.sources)
        if ((revision.state === 'QUALIFIED' && !qualifies)
          || (revision.state === 'SUSPENDED' && (qualifies || projection.contradictions.size > 0))
          || (revision.state === 'INVALIDATED' && projection.contradictions.size === 0)) {
          throw new PatternConflictError('pattern-state-evidence-mismatch')
        }
        if (revision.revisionKind === 'SUPPORT_UPDATE' && (index === 0 || chain[index - 1]!.state !== 'QUALIFIED')) {
          throw new PatternConflictError('pattern-support-update-transition-invalid')
        }
        if (revision.revisionKind === 'SUSPENSION' && index > 0 && chain[index - 1]!.state === 'INVALIDATED') {
          throw new PatternConflictError('pattern-suspension-transition-invalid')
        }
        if (revision.revisionKind === 'REQUALIFICATION' && (index === 0 || chain[index - 1]!.state !== 'SUSPENDED')) {
          throw new PatternConflictError('pattern-requalification-transition-invalid')
        }
        if (revision.revisionKind === 'INVALIDATION'
          && (index === 0 || chain[index - 1]!.state === 'INVALIDATED' || revision.contradictionsAdded.length === 0)) {
          throw new PatternConflictError('pattern-invalidation-transition-invalid')
        }
        if (revision.revisionKind === 'INITIAL' && (index !== 0 || !qualifies || projection.contradictions.size !== 0)) {
          throw new PatternConflictError('pattern-initial-qualification-invalid')
        }
      }
      this.patternChains.set(patternId, chain)
      this.projections.set(patternId, projection)
    }
  }

  private validateTriggerRefs(patternId: string, values: readonly PatternEvidenceRefV1[]): void {
    for (const ref of values) {
      const source = this.sources.get(ref.episodeId)
      if (source === undefined
        || !source.revisions.some(revision => revision.revisionId === ref.outcomeRevisionId)
        || !source.revisions.some(revision => revision.postconditionEvidence !== undefined
          && patternIdentityFor(source.episode, revision.postconditionEvidence) === patternId)) {
        throw new PatternConflictError('pattern-trigger-reference-orphaned')
      }
    }
  }

  private validateSupportReference(ref: PatternEvidenceRefV1, patternId: string): boolean {
    const source = this.sources.get(ref.episodeId)
    return source !== undefined
      && supportValidAtRevision(source.episode, source.revisions, ref.outcomeRevisionId, patternId)
  }

  private validateContradictionReference(ref: PatternEvidenceRefV1, patternId: string): boolean {
    const source = this.sources.get(ref.episodeId)
    if (source === undefined || !trustedReference(source.episode, source.revisions, ref.outcomeRevisionId, patternId, 'VERIFIED_FAILURE')) return false
    const firstFailure = source.revisions.find(revision => trustedRevision(source.episode, revision, 'VERIFIED_FAILURE')
      && patternIdentityFor(source.episode, revision.postconditionEvidence!) === patternId)
    return firstFailure?.revisionId === ref.outcomeRevisionId
  }
}
