import { createHash } from 'node:crypto'
import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type { ExperienceEpisodeV1 } from './experience-schema.ts'
import type { OutcomeRevisionV1 } from './outcome-schema.ts'

const DIGEST = /^[a-f0-9]{64}$/
const episodeIdSchema = z.string().regex(/^ra-episode-v1_[a-f0-9]{64}$/)
const outcomeRevisionIdSchema = z.string().regex(/^ra-outcome-v1_[a-f0-9]{64}_[0-9]{8}$/)
const patternIdSchema = z.string().regex(/^ra-pattern-v1_[a-f0-9]{64}$/)
const positiveOrdinal = z.number().int().min(1).max(300_000)
const safeCount = z.number().int().min(0).max(10_000)

export interface PatternEvidenceRefV1 {
  readonly episodeId: string
  readonly outcomeRevisionId: string
}

const evidenceRefSchema = z.object({
  episodeId: episodeIdSchema,
  outcomeRevisionId: outcomeRevisionIdSchema,
}).strict()

const refs = z.array(evidenceRefSchema).max(10_000)

const patternRevisionBaseSchema = z.object({
  schemaVersion: z.literal(1),
  patternId: patternIdSchema,
  revisionId: z.string().regex(/^ra-pattern-v1_[a-f0-9]{64}_[0-9]{8}$/),
  revisionNumber: positiveOrdinal,
  previousRevisionId: z.string().regex(/^ra-pattern-v1_[a-f0-9]{64}_[0-9]{8}$/).optional(),
  state: z.enum(['QUALIFIED', 'SUSPENDED', 'INVALIDATED']),
  revisionKind: z.enum(['INITIAL', 'SUPPORT_UPDATE', 'SUSPENSION', 'REQUALIFICATION', 'INVALIDATION']),
  minimumSupport: z.literal(3),
  supportCount: safeCount,
  supportUtcDateCount: safeCount,
  contradictionEpisodeCount: safeCount,
  supportAdded: refs,
  supportRemoved: refs,
  contradictionsAdded: refs,
  triggerRefs: refs,
  provenanceDigest: z.string().regex(DIGEST),
}).strict()

export const patternRevisionSchema = patternRevisionBaseSchema.superRefine((revision, context) => {
  if (revision.revisionId !== patternRevisionKey(revision.patternId, revision.revisionNumber)) {
    context.addIssue({ code: 'custom', path: ['revisionId'], message: 'revisionId must match patternId and revisionNumber' })
  }
  if (revision.revisionNumber === 1) {
    if (revision.previousRevisionId !== undefined || revision.revisionKind !== 'INITIAL' || revision.state !== 'QUALIFIED') {
      context.addIssue({ code: 'custom', path: ['previousRevisionId'], message: 'revision 1 must be INITIAL / QUALIFIED without a predecessor' })
    }
  } else {
    if (revision.previousRevisionId !== patternRevisionKey(revision.patternId, revision.revisionNumber - 1)) {
      context.addIssue({ code: 'custom', path: ['previousRevisionId'], message: 'revision must point to its immediate predecessor' })
    }
    if (revision.revisionKind === 'INITIAL') {
      context.addIssue({ code: 'custom', path: ['revisionKind'], message: 'only revision 1 may be INITIAL' })
    }
  }

  const expectedState = revision.revisionKind === 'SUSPENSION'
    ? 'SUSPENDED'
    : revision.revisionKind === 'INVALIDATION'
      ? 'INVALIDATED'
      : 'QUALIFIED'
  if (revision.state !== expectedState) {
    context.addIssue({ code: 'custom', path: ['state'], message: 'state does not match revision kind' })
  }

  const refKey = (ref: PatternEvidenceRefV1) => `${ref.episodeId}\u0000${ref.outcomeRevisionId}`
  for (const [field, values] of [
    ['supportAdded', revision.supportAdded],
    ['supportRemoved', revision.supportRemoved],
    ['contradictionsAdded', revision.contradictionsAdded],
    ['triggerRefs', revision.triggerRefs],
  ] as const) {
    const seen = new Set<string>()
    for (const value of values) {
      const key = refKey(value)
      if (seen.has(key)) {
        context.addIssue({ code: 'custom', path: [field], message: `${field} must not contain duplicate references` })
        break
      }
      seen.add(key)
    }
    for (let index = 1; index < values.length; index += 1) {
      if (comparePatternRefs(values[index - 1]!, values[index]!) >= 0) {
        context.addIssue({ code: 'custom', path: [field], message: `${field} must be strictly sorted` })
        break
      }
    }
  }

  if (revision.triggerRefs.length === 0) {
    context.addIssue({ code: 'custom', path: ['triggerRefs'], message: 'every revision must identify a durable trigger' })
  }

  const added = new Set(revision.supportAdded.map(refKey))
  if (revision.supportRemoved.some(ref => added.has(refKey(ref)))) {
    context.addIssue({ code: 'custom', path: ['supportRemoved'], message: 'a revision cannot add and remove the same support reference' })
  }
})

export type VerifiedExperiencePatternRevisionV1 = Readonly<z.infer<typeof patternRevisionSchema>>
export type PatternStatus = 'READY' | 'UNAVAILABLE' | 'CAPACITY_EXCEEDED' | 'CONFLICTED'
export type PatternState = VerifiedExperiencePatternRevisionV1['state']
export type PatternRevisionKind = VerifiedExperiencePatternRevisionV1['revisionKind']

export const patternDomainSpec = defineDomain({
  name: 'risk_advisor_pattern',
  version: 1,
  layout: 'per-record',
  tables: {
    revisions: domainTable<string, VerifiedExperiencePatternRevisionV1>(patternRevisionSchema),
  },
})

export const MAX_PATTERN_IDENTITIES = 60_000
export const MAX_PATTERN_REVISIONS = 300_000
export const MAX_PATTERN_PROVENANCE_REFERENCES = 1_000_000
export const MAX_PATTERN_PENDING_OUTCOME_HANDOFFS = 512
export const MAX_PATTERN_DELTA_REFERENCES_PER_ARRAY = 10_000
export const MIN_PATTERN_SUPPORT = 3
export const MIN_PATTERN_UTC_DATES = 2

const TOOL_CONTRACT_ADAPTERS = new Set(['tool.write.v1', 'tool.edit.v1'])
const KNOWN_ADAPTERS = new Set([
  'shell.mkdir.v1',
  'shell.copy-file.v1',
  'git.branch-switch.v1',
  'package.node-resolve.v1',
])

export function supportedPatternEvidence(source: string, adapterId: string): boolean {
  return source === 'tool-contract'
    ? TOOL_CONTRACT_ADAPTERS.has(adapterId)
    : source === 'known-adapter' && KNOWN_ADAPTERS.has(adapterId)
}

export function eligiblePatternEpisode(episode: ExperienceEpisodeV1): boolean {
  return episode.runtime.platform !== undefined
    && episode.operation.kind !== 'unknown'
    && episode.operation.parserConfidence === 'high'
    && typeof episode.operation.mutating === 'boolean'
    && typeof episode.operation.externalEffect === 'boolean'
    && episode.operation.networkEffect !== 'unknown'
}

export function patternIdentityFor(
  episode: ExperienceEpisodeV1,
  evidence: NonNullable<OutcomeRevisionV1['postconditionEvidence']>,
): string | undefined {
  if (!eligiblePatternEpisode(episode) || !supportedPatternEvidence(evidence.source, evidence.adapterId)) return undefined
  const canonicalTuple = JSON.stringify([
    'operation-outcome-equivalence-v1',
    episode.runtime.platform,
    episode.operation.toolName,
    episode.operation.kind,
    episode.operation.parserConfidence,
    episode.operation.mutating,
    episode.operation.externalEffect,
    episode.operation.networkEffect,
    episode.operation.requestedPermission ?? null,
    evidence.source,
    evidence.adapterId,
  ])
  const digest = createHash('sha256').update(canonicalTuple, 'utf8').digest('hex')
  return `ra-pattern-v1_${digest}`
}

export function patternRevisionKey(patternId: string, revisionNumber: number): string {
  const match = /^ra-pattern-v1_([a-f0-9]{64})$/.exec(patternId)
  if (match === null || !Number.isSafeInteger(revisionNumber) || revisionNumber < 1 || revisionNumber > 300_000) {
    throw new Error('invalid-pattern-revision-key')
  }
  return `ra-pattern-v1_${match[1]}_${String(revisionNumber).padStart(8, '0')}`
}

export function patternReferenceKey(reference: PatternEvidenceRefV1): string {
  return `${reference.episodeId}\u0000${reference.outcomeRevisionId}`
}

export function comparePatternRefs(a: PatternEvidenceRefV1, b: PatternEvidenceRefV1): number {
  if (a.episodeId !== b.episodeId) return a.episodeId < b.episodeId ? -1 : 1
  if (a.outcomeRevisionId !== b.outcomeRevisionId) return a.outcomeRevisionId < b.outcomeRevisionId ? -1 : 1
  return 0
}

export function patternProvenanceDigest(
  state: PatternState,
  support: readonly PatternEvidenceRefV1[],
  contradictions: readonly PatternEvidenceRefV1[],
): string {
  const canonical = JSON.stringify({
    state,
    support: [...support].sort(comparePatternRefs),
    contradictions: [...contradictions].sort(comparePatternRefs),
  })
  return createHash('sha256').update(canonical, 'utf8').digest('hex')
}
