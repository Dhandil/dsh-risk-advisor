import type { Domain, DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import {
  assertGuidanceRevisionCapacity,
  canonicalGuidanceJson,
  guidanceDigestFor,
  guidanceDomainSpec,
  guidanceIdFor,
  guidanceRevisionKey,
  guidanceRevisionSchema,
  GuidanceCapacityError,
  MAX_GUIDANCE_IDENTITIES,
  MAX_GUIDANCE_PENDING_PATTERN_HANDOFFS,
  MAX_GUIDANCE_REVISIONS,
  renderGuidance,
} from './guidance-schema.ts'
import type {
  GuidanceSemanticV1,
  GuidanceState,
  GuidanceRevisionKind,
  RenderedGuidanceV1,
  VerifiedHistoricalGuidanceRevisionV1,
} from './guidance-schema.ts'
import type { PatternGuidanceSnapshot, PatternRuntime } from './pattern-store.ts'
import type { PatternRevisionKind, PatternState, VerifiedExperiencePatternRevisionV1 } from './pattern-schema.ts'
import { patternRevisionKey, patternRevisionSchema } from './pattern-schema.ts'

export type GuidanceRuntimeStatus = 'READY' | 'UNAVAILABLE' | 'CAPACITY_EXCEEDED' | 'CONFLICTED'

export interface GuidanceDiagnostics {
  readonly status: () => GuidanceRuntimeStatus
  readonly guidanceIds: () => readonly string[]
  /** The currently eligible active revision, suppressed during source/writer lag. */
  readonly current: (guidanceId: string) => VerifiedHistoricalGuidanceRevisionV1 | undefined
  readonly currentForPattern: (patternId: string) => VerifiedHistoricalGuidanceRevisionV1 | undefined
  readonly revisions: (guidanceId: string) => readonly VerifiedHistoricalGuidanceRevisionV1[]
  readonly render: (guidanceId: string) => RenderedGuidanceV1 | undefined
  readonly reasonCodes: () => readonly string[]
}

type GuidanceDomain = Domain<typeof guidanceDomainSpec>
type GuidanceTable = ReturnType<GuidanceDomain['table']>

class GuidanceConflictError extends Error {}

function freeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value
  Object.freeze(value)
  for (const child of Object.values(value as Record<string, unknown>)) freeze(child)
  return value
}

function sameJson(left: unknown, right: unknown): boolean {
  return canonicalGuidanceJson(left) === canonicalGuidanceJson(right)
}

function assertSourceCapacity(snapshots: readonly PatternGuidanceSnapshot[]): void {
  if (snapshots.length > MAX_GUIDANCE_IDENTITIES) throw new GuidanceCapacityError('guidance-identity-capacity-exceeded')
  let revisions = 0
  for (const snapshot of snapshots) {
    revisions += snapshot.revisions.length
    if (revisions > MAX_GUIDANCE_REVISIONS) throw new GuidanceCapacityError('guidance-revision-capacity-exceeded')
  }
}

function validatePatternSnapshots(
  rawSnapshots: readonly PatternGuidanceSnapshot[],
): readonly PatternGuidanceSnapshot[] {
  assertSourceCapacity(rawSnapshots)
  const seen = new Set<string>()
  const result: PatternGuidanceSnapshot[] = []
  for (const snapshot of rawSnapshots) {
    if (seen.has(snapshot.patternId) || snapshot.revisions.length === 0) {
      throw new GuidanceConflictError('guidance-pattern-source-identity-invalid')
    }
    seen.add(snapshot.patternId)
    const revisions: VerifiedExperiencePatternRevisionV1[] = []
    for (let index = 0; index < snapshot.revisions.length; index += 1) {
      const raw = snapshot.revisions[index]
      assertGuidanceRevisionCapacity(raw)
      const revision = patternRevisionSchema.parse(raw)
      if (revision.patternId !== snapshot.patternId
        || revision.revisionNumber !== index + 1
        || revision.revisionId !== patternRevisionKey(snapshot.patternId, index + 1)
        || (index === 0
          ? revision.previousRevisionId !== undefined || revision.revisionKind !== 'INITIAL' || revision.state !== 'QUALIFIED'
          : revision.previousRevisionId !== revisions[index - 1]!.revisionId || revision.revisionKind === 'INITIAL')) {
        throw new GuidanceConflictError('guidance-pattern-source-lineage-invalid')
      }
      const prior = revisions[index - 1]
      if (revision.revisionKind === 'SUPPORT_UPDATE' && prior?.state !== 'QUALIFIED'
        || revision.revisionKind === 'SUSPENSION' && prior?.state === 'INVALIDATED'
        || revision.revisionKind === 'REQUALIFICATION' && prior?.state !== 'SUSPENDED'
        || revision.revisionKind === 'INVALIDATION' && (prior === undefined || prior.state === 'INVALIDATED')) {
        throw new GuidanceConflictError('guidance-pattern-source-transition-invalid')
      }
      revisions.push(freeze(revision))
    }
    result.push(Object.freeze({ patternId: snapshot.patternId, revisions: Object.freeze(revisions) }))
  }
  return Object.freeze(result.sort((a, b) => a.patternId.localeCompare(b.patternId)))
}

function guidanceMapping(kind: PatternRevisionKind): { readonly revisionKind: GuidanceRevisionKind; readonly state: GuidanceState } {
  switch (kind) {
    case 'INITIAL': return { revisionKind: 'INITIAL_ACTIVE', state: 'ACTIVE' }
    case 'SUPPORT_UPDATE': return { revisionKind: 'REFRESH_ACTIVE', state: 'ACTIVE' }
    case 'REQUALIFICATION': return { revisionKind: 'REACTIVATION_ACTIVE', state: 'ACTIVE' }
    case 'SUSPENSION': return { revisionKind: 'WITHDRAW_SUSPENDED', state: 'WITHDRAWN' }
    case 'INVALIDATION': return { revisionKind: 'WITHDRAW_INVALIDATED', state: 'WITHDRAWN' }
  }
}

function buildGuidanceRevision(
  pattern: VerifiedExperiencePatternRevisionV1,
  previousRevisionId?: string,
): VerifiedHistoricalGuidanceRevisionV1 {
  const guidanceId = guidanceIdFor(pattern.patternId)
  const mapping = guidanceMapping(pattern.revisionKind)
  const semantic: GuidanceSemanticV1 = Object.freeze({
    schemaVersion: 1,
    guidanceId,
    revisionId: guidanceRevisionKey(guidanceId, pattern.revisionNumber),
    revisionNumber: pattern.revisionNumber,
    ...(previousRevisionId === undefined ? {} : { previousRevisionId }),
    patternId: pattern.patternId,
    patternRevisionId: pattern.revisionId,
    patternState: pattern.state as PatternState,
    patternRevisionKind: pattern.revisionKind,
    revisionKind: mapping.revisionKind,
    state: mapping.state,
    ...(mapping.state === 'ACTIVE' ? {
      contentCode: 'VERIFIED_PATTERN_CONTEXT_V1' as const,
      evidenceStrength: 'QUALIFIED_PATTERN' as const,
      supportCount: pattern.supportCount,
      supportUtcDateCount: pattern.supportUtcDateCount,
    } : {}),
    patternProvenanceDigest: pattern.provenanceDigest,
  })
  assertGuidanceRevisionCapacity(semantic)
  return freeze(guidanceRevisionSchema.parse({ ...semantic, guidanceDigest: guidanceDigestFor(semantic) }))
}

/** Host-owned, fixed-content append-only projection of validated Pattern history. */
export class GuidanceRuntime {
  private handle: GuidanceDomain | undefined
  private table: GuidanceTable | undefined
  private opening: Promise<void> | undefined
  private closeTask: Promise<void> | undefined
  private generation = 0
  private accepting = false
  private detaching = false
  private queueFaulted = false
  private queueDrainScheduled = false
  private writeTail: Promise<void> = Promise.resolve()
  private readonly pendingPatternRevisions: VerifiedExperiencePatternRevisionV1[] = []
  private readonly guidanceChains = new Map<string, VerifiedHistoricalGuidanceRevisionV1[]>()
  private readonly identitiesByPattern = new Map<string, string>()
  private patterns: PatternRuntime | undefined
  private unsubscribePattern: (() => void) | undefined
  private currentStatus: GuidanceRuntimeStatus = 'UNAVAILABLE'
  private currentReasons: readonly string[] = Object.freeze(['STORAGE_ABSENT'])
  private projectionDirty = false

  readonly diagnostics: GuidanceDiagnostics = Object.freeze({
    status: () => this.readStatus(),
    guidanceIds: () => this.readGuidanceIds(),
    current: (id: string) => this.readCurrent(id),
    currentForPattern: (patternId: string) => this.readCurrent(guidanceIdFor(patternId)),
    revisions: (id: string) => Object.freeze([...(this.guidanceChains.get(id) ?? [])]),
    render: (id: string) => {
      const revision = this.readCurrent(id)
      return revision === undefined ? undefined : renderGuidance(revision)
    },
    reasonCodes: () => { this.readStatus(); return this.currentReasons },
  })

  /** Subscribe before taking the source snapshot; notifications buffer throughout open/replay. */
  attach(storageDomain: DomainFacility, patterns: PatternRuntime): Promise<void> {
    if (this.closeTask !== undefined) return this.closeTask.then(() => this.attach(storageDomain, patterns))
    if (this.handle !== undefined && !this.detaching) return Promise.resolve()
    if (this.opening !== undefined && !this.detaching) return this.opening
    this.patterns = patterns
    if (patterns.diagnostics.status() !== 'READY') {
      this.setStatus('UNAVAILABLE', ['PATTERN_SOURCE_UNAVAILABLE'])
      return Promise.resolve()
    }

    const generation = ++this.generation
    this.detaching = false
    this.accepting = false
    this.queueFaulted = false
    this.projectionDirty = false
    this.pendingPatternRevisions.splice(0)
    this.guidanceChains.clear()
    this.identitiesByPattern.clear()
    this.setStatus('UNAVAILABLE', ['STORAGE_OPENING'])
    const opening = (async () => {
      let opened: GuidanceDomain | undefined
      try {
        this.unsubscribePattern = patterns.subscribeGuidance(revision => this.observePatternRevision(revision))
        const baseline = validatePatternSnapshots(patterns.guidanceSnapshot())
        opened = await storageDomain.open(guidanceDomainSpec)
        if (generation !== this.generation || this.detaching) {
          await opened.close()
          return
        }
        this.handle = opened
        this.table = opened.table('revisions')
        this.loadGuidanceHistory()
        await this.reconcileSnapshot(baseline)
        this.accepting = true
        while (this.pendingPatternRevisions.length > 0 && !this.queueFaulted && !this.detaching && generation === this.generation) {
          this.pendingPatternRevisions.shift()
          const latest = validatePatternSnapshots(patterns.guidanceSnapshot())
          await this.reconcileSnapshot(latest)
        }
        if (this.queueFaulted) throw new Error('guidance-notification-handoff-capacity-exceeded')
        if (this.detaching || generation !== this.generation) return
        if (patterns.diagnostics.status() !== 'READY') throw new Error('pattern-guidance-source-unavailable')
        this.projectionDirty = false
        this.setStatus('READY')
        if (this.pendingPatternRevisions.length > 0) this.scheduleQueueDrain()
      } catch (error) {
        this.unsubscribePattern?.()
        this.unsubscribePattern = undefined
        this.accepting = false
        if (opened !== undefined) {
          try { await opened.close() } catch { /* Preserve the original Guidance open failure. */ }
        }
        if (this.handle === opened) {
          this.handle = undefined
          this.table = undefined
        }
        this.guidanceChains.clear()
        this.identitiesByPattern.clear()
        const capacity = error instanceof GuidanceCapacityError
        const conflict = error instanceof GuidanceConflictError
          || (error instanceof Error && /conflict|mismatch|lineage|digest|divergent|invalid/.test(error.message))
        this.setStatus(capacity ? 'CAPACITY_EXCEEDED' : conflict ? 'CONFLICTED' : 'UNAVAILABLE',
          error instanceof Error ? [error.message] : ['GUIDANCE_OPEN_FAILED'])
      }
    })()
    const settled = opening.finally(() => { if (this.opening === settled) this.opening = undefined })
    this.opening = settled
    return settled
  }

  async drain(): Promise<void> {
    const opening = this.opening
    if (opening !== undefined) await opening
    while (this.queueDrainScheduled || this.pendingPatternRevisions.length > 0) {
      this.scheduleQueueDrain()
      await this.writeTail
      if (!this.accepting) break
    }
    await this.writeTail
  }

  /** Stop intake and drain/close Guidance while the Pattern source remains open. */
  async detach(): Promise<void> {
    if (this.closeTask !== undefined) return this.closeTask
    this.accepting = false
    this.detaching = true
    this.projectionDirty = true
    const generation = ++this.generation
    this.unsubscribePattern?.()
    this.unsubscribePattern = undefined
    this.setStatus('UNAVAILABLE', ['STORAGE_CLOSING'])
    const closing = (async () => {
      const opening = this.opening
      if (opening !== undefined) await opening
      await this.writeTail
      const handle = this.handle
      this.handle = undefined
      this.table = undefined
      this.patterns = undefined
      this.pendingPatternRevisions.splice(0)
      this.guidanceChains.clear()
      this.identitiesByPattern.clear()
      if (handle !== undefined) await handle.close()
      if (generation === this.generation) this.setStatus('UNAVAILABLE', ['STORAGE_CLOSED'])
    })()
    const settled = closing.catch(() => {
      if (generation === this.generation) this.setStatus('UNAVAILABLE', ['STORAGE_CLOSE_FAILED'])
    }).finally(() => { if (this.closeTask === settled) this.closeTask = undefined })
    this.closeTask = settled
    return settled
  }

  private readStatus(): GuidanceRuntimeStatus {
    if (this.currentStatus === 'READY' && this.patterns?.diagnostics.status() !== 'READY') {
      this.accepting = false
      this.projectionDirty = true
      this.setStatus('UNAVAILABLE', ['PATTERN_SOURCE_UNAVAILABLE'])
    }
    return this.currentStatus
  }

  private readGuidanceIds(): readonly string[] {
    if (this.readStatus() !== 'READY' || this.projectionDirty) return Object.freeze([])
    return Object.freeze([...this.guidanceChains.keys()].sort())
  }

  private readCurrent(guidanceId: string): VerifiedHistoricalGuidanceRevisionV1 | undefined {
    if (this.readStatus() !== 'READY' || this.projectionDirty) return undefined
    const patternId = [...this.identitiesByPattern.entries()].find(([, id]) => id === guidanceId)?.[0]
    if (patternId === undefined) return undefined
    const row = this.guidanceChains.get(guidanceId)?.at(-1)
    if (row === undefined || row.state !== 'ACTIVE' || row.patternState !== 'QUALIFIED') return undefined
    try {
      const latest = this.patterns?.guidanceSnapshot().find(item => item.patternId === patternId)?.revisions.at(-1)
      if (latest === undefined || latest.state !== 'QUALIFIED'
        || latest.revisionId !== row.patternRevisionId
        || latest.provenanceDigest !== row.patternProvenanceDigest
        || latest.revisionNumber !== row.revisionNumber) return undefined
      return row
    } catch {
      this.accepting = false
      this.projectionDirty = true
      this.setStatus('UNAVAILABLE', ['PATTERN_SOURCE_UNAVAILABLE'])
      return undefined
    }
  }

  private setStatus(status: GuidanceRuntimeStatus, reasons: readonly string[] = []): void {
    this.currentStatus = status
    this.currentReasons = Object.freeze([...reasons])
  }

  private observePatternRevision(revision: VerifiedExperiencePatternRevisionV1): void {
    if (this.detaching || this.queueFaulted || this.currentStatus === 'CONFLICTED' || this.currentStatus === 'CAPACITY_EXCEEDED') return
    if (this.patterns?.diagnostics.status() !== 'READY') {
      this.markSourceUnavailable()
      return
    }
    if (this.pendingPatternRevisions.length >= MAX_GUIDANCE_PENDING_PATTERN_HANDOFFS) {
      this.queueFaulted = true
      this.accepting = false
      this.pendingPatternRevisions.splice(0)
      this.projectionDirty = true
      this.setStatus('UNAVAILABLE', ['GUIDANCE_NOTIFICATION_HANDOFF_CAPACITY_EXCEEDED'])
      return
    }
    this.pendingPatternRevisions.push(revision)
    this.projectionDirty = true
    if (this.accepting) {
      this.setStatus('UNAVAILABLE', ['GUIDANCE_RECONCILING_PATTERN'])
      this.scheduleQueueDrain()
    }
  }

  private markSourceUnavailable(): void {
    this.accepting = false
    this.queueFaulted = true
    this.pendingPatternRevisions.splice(0)
    this.projectionDirty = true
    this.setStatus('UNAVAILABLE', ['PATTERN_SOURCE_UNAVAILABLE'])
  }

  private scheduleQueueDrain(): void {
    if (this.queueDrainScheduled || this.detaching || !this.accepting || this.queueFaulted) return
    this.queueDrainScheduled = true
    const work = this.writeTail.then(async () => {
      while (this.pendingPatternRevisions.length > 0 && !this.detaching && !this.queueFaulted && this.accepting) {
        this.pendingPatternRevisions.shift()
        const patterns = this.patterns
        if (patterns === undefined || patterns.diagnostics.status() !== 'READY') {
          this.markSourceUnavailable()
          return
        }
        await this.reconcileSnapshot(validatePatternSnapshots(patterns.guidanceSnapshot()))
      }
    }).catch(error => {
      this.accepting = false
      this.projectionDirty = true
      const capacity = error instanceof GuidanceCapacityError
      const conflict = error instanceof GuidanceConflictError
        || (error instanceof Error && /conflict|mismatch|lineage|digest|divergent|invalid/.test(error.message))
      this.setStatus(capacity ? 'CAPACITY_EXCEEDED' : conflict ? 'CONFLICTED' : 'UNAVAILABLE',
        error instanceof Error ? [error.message] : ['GUIDANCE_WRITE_FAILED'])
    }).finally(() => {
      this.queueDrainScheduled = false
      if (this.pendingPatternRevisions.length > 0 && this.accepting && !this.detaching && !this.queueFaulted) {
        this.scheduleQueueDrain()
      } else if (this.accepting && !this.queueFaulted && !this.detaching) {
        const patterns = this.patterns
        if (patterns?.diagnostics.status() === 'READY') {
          try {
            this.assertCaughtUp(validatePatternSnapshots(patterns.guidanceSnapshot()))
            this.projectionDirty = false
            this.setStatus('READY')
          } catch (error) {
            this.accepting = false
            const capacity = error instanceof GuidanceCapacityError
            this.setStatus(capacity ? 'CAPACITY_EXCEEDED' : 'CONFLICTED', error instanceof Error ? [error.message] : ['GUIDANCE_RECONCILE_FAILED'])
          }
        } else this.markSourceUnavailable()
      }
    })
    this.writeTail = work.then(() => undefined, () => undefined)
    void work.catch(() => undefined)
  }

  private loadGuidanceHistory(): void {
    const table = this.table
    if (table === undefined) throw new Error('guidance-domain-unavailable')
    if (table.size > MAX_GUIDANCE_REVISIONS) throw new GuidanceCapacityError('guidance-revision-capacity-invalid')
    const grouped = new Map<string, VerifiedHistoricalGuidanceRevisionV1[]>()
    for (const [key, raw] of table.entries()) {
      assertGuidanceRevisionCapacity(raw)
      const revision = guidanceRevisionSchema.parse(raw)
      if (revision.revisionId !== key) throw new GuidanceConflictError('guidance-record-key-mismatch')
      const chain = grouped.get(revision.guidanceId) ?? []
      chain.push(freeze(revision))
      grouped.set(revision.guidanceId, chain)
    }
    if (grouped.size > MAX_GUIDANCE_IDENTITIES) throw new GuidanceCapacityError('guidance-identity-capacity-invalid')
    for (const [guidanceId, chain] of grouped) {
      chain.sort((left, right) => left.revisionNumber - right.revisionNumber)
      for (let index = 0; index < chain.length; index += 1) {
        if (chain[index]!.revisionNumber !== index + 1) throw new GuidanceConflictError('guidance-history-gap')
      }
      const patternId = chain[0]!.patternId
      if (guidanceId !== guidanceIdFor(patternId) || this.identitiesByPattern.has(patternId)) {
        throw new GuidanceConflictError('guidance-identity-conflict')
      }
      this.identitiesByPattern.set(patternId, guidanceId)
      this.guidanceChains.set(guidanceId, chain)
    }
  }

  private async reconcileSnapshot(rawSnapshots: readonly PatternGuidanceSnapshot[]): Promise<void> {
    const snapshots = validatePatternSnapshots(rawSnapshots)
    const sourceByPattern = new Map(snapshots.map(snapshot => [snapshot.patternId, snapshot] as const))
    for (const patternId of this.identitiesByPattern.keys()) {
      if (!sourceByPattern.has(patternId)) throw new GuidanceConflictError('guidance-orphaned-pattern-history')
    }
    for (const snapshot of snapshots) await this.reconcilePattern(snapshot)
    this.assertCaughtUp(snapshots)
  }

  private async reconcilePattern(snapshot: PatternGuidanceSnapshot): Promise<void> {
    const guidanceId = guidanceIdFor(snapshot.patternId)
    const existing = this.guidanceChains.get(guidanceId) ?? []
    if (existing.length > snapshot.revisions.length) throw new GuidanceConflictError('guidance-history-ahead-of-pattern')
    for (let index = 0; index < existing.length; index += 1) {
      const expected = buildGuidanceRevision(snapshot.revisions[index]!, index === 0 ? undefined : existing[index - 1]!.revisionId)
      if (!sameJson(existing[index], expected)) throw new GuidanceConflictError('guidance-pattern-prefix-divergent')
    }
    for (let index = existing.length; index < snapshot.revisions.length; index += 1) {
      const previous = index === 0 ? undefined : guidanceRevisionKey(guidanceId, index)
      const revision = buildGuidanceRevision(snapshot.revisions[index]!, previous)
      await this.appendGuidance(revision)
    }
  }

  private assertCaughtUp(snapshots: readonly PatternGuidanceSnapshot[]): void {
    const sourcePatterns = new Set(snapshots.map(item => item.patternId))
    if (sourcePatterns.size !== this.identitiesByPattern.size
      || [...this.identitiesByPattern.keys()].some(id => !sourcePatterns.has(id))) {
      throw new GuidanceConflictError('guidance-pattern-identity-set-mismatch')
    }
    for (const snapshot of snapshots) {
      const chain = this.guidanceChains.get(guidanceIdFor(snapshot.patternId))
      if (chain === undefined || chain.length !== snapshot.revisions.length) throw new GuidanceConflictError('guidance-projection-not-caught-up')
      const latestPattern = snapshot.revisions.at(-1)!
      const latestGuidance = chain.at(-1)!
      if (latestGuidance.patternRevisionId !== latestPattern.revisionId
        || latestGuidance.patternProvenanceDigest !== latestPattern.provenanceDigest
        || latestGuidance.state !== (latestPattern.state === 'QUALIFIED' ? 'ACTIVE' : 'WITHDRAWN')) {
        throw new GuidanceConflictError('guidance-latest-pattern-mismatch')
      }
    }
  }

  private async appendGuidance(revision: VerifiedHistoricalGuidanceRevisionV1): Promise<void> {
    const table = this.table
    if (table === undefined) throw new Error('guidance-domain-unavailable')
    assertGuidanceRevisionCapacity(revision)
    if (revision.revisionNumber > MAX_GUIDANCE_REVISIONS || table.size >= MAX_GUIDANCE_REVISIONS) {
      throw new GuidanceCapacityError('guidance-revision-capacity-exceeded')
    }
    const knownId = this.identitiesByPattern.get(revision.patternId)
    if (knownId === undefined && this.identitiesByPattern.size >= MAX_GUIDANCE_IDENTITIES) {
      throw new GuidanceCapacityError('guidance-identity-capacity-exceeded')
    }
    const parsed = freeze(guidanceRevisionSchema.parse(revision))
    const chain = this.guidanceChains.get(parsed.guidanceId) ?? []
    const prior = chain.at(-1)
    if (prior !== undefined && parsed.revisionNumber === prior.revisionNumber) {
      if (!sameJson(prior, parsed)) throw new GuidanceConflictError('guidance-memory-key-conflict')
      return
    }
    if (parsed.revisionNumber !== chain.length + 1
      || (chain.length === 0 ? parsed.previousRevisionId !== undefined : parsed.previousRevisionId !== chain.at(-1)!.revisionId)) {
      throw new GuidanceConflictError('guidance-append-lineage-invalid')
    }
    const existing = table.get(parsed.revisionId)
    if (existing !== undefined) {
      if (!sameJson(existing, parsed)) throw new GuidanceConflictError('guidance-revision-key-conflict')
    } else {
      await table.put(parsed.revisionId, parsed)
    }
    chain.push(parsed)
    this.guidanceChains.set(parsed.guidanceId, chain)
    this.identitiesByPattern.set(parsed.patternId, parsed.guidanceId)
  }
}
