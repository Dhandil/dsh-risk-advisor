import { createHash } from 'node:crypto'
import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { patternRevisionKey } from './pattern-schema.ts'
import type { PatternRevisionKind, PatternState } from './pattern-schema.ts'

const DIGEST = /^[a-f0-9]{64}$/
const GUIDANCE_ID = /^ra-guidance-v1_[a-f0-9]{64}$/
const GUIDANCE_REVISION_ID = /^ra-guidance-v1_[a-f0-9]{64}_[0-9]{8}$/
const PATTERN_ID = /^ra-pattern-v1_[a-f0-9]{64}$/
const ordinal = z.number().int().safe().min(1)
const boundedInteger = z.number().int().safe().min(0)

export type GuidanceRevisionKind =
  | 'INITIAL_ACTIVE'
  | 'REFRESH_ACTIVE'
  | 'REACTIVATION_ACTIVE'
  | 'WITHDRAW_SUSPENDED'
  | 'WITHDRAW_INVALIDATED'
export type GuidanceState = 'ACTIVE' | 'WITHDRAWN'

export interface GuidanceSemanticV1 {
  readonly schemaVersion: 1
  readonly guidanceId: string
  readonly revisionId: string
  readonly revisionNumber: number
  readonly previousRevisionId?: string | undefined
  readonly patternId: string
  readonly patternRevisionId: string
  readonly patternState: PatternState
  readonly patternRevisionKind: PatternRevisionKind
  readonly revisionKind: GuidanceRevisionKind
  readonly state: GuidanceState
  readonly contentCode?: 'VERIFIED_PATTERN_CONTEXT_V1' | undefined
  readonly evidenceStrength?: 'QUALIFIED_PATTERN' | undefined
  readonly supportCount?: number | undefined
  readonly supportUtcDateCount?: number | undefined
  readonly patternProvenanceDigest: string
}

export interface VerifiedHistoricalGuidanceRevisionV1 extends GuidanceSemanticV1 {
  readonly guidanceDigest: string
}

export function guidanceIdFor(patternId: string): string {
  if (!PATTERN_ID.test(patternId)) throw new Error('invalid-guidance-pattern-id')
  const tuple = JSON.stringify(['verified-historical-guidance-v1', patternId])
  const digest = createHash('sha256').update(tuple, 'utf8').digest('hex')
  return `ra-guidance-v1_${digest}`
}

export function guidanceRevisionKey(guidanceId: string, revisionNumber: number): string {
  const match = /^ra-guidance-v1_([a-f0-9]{64})$/.exec(guidanceId)
  if (match === null || !Number.isSafeInteger(revisionNumber) || revisionNumber < 1) {
    throw new Error('invalid-guidance-revision-key')
  }
  return `ra-guidance-v1_${match[1]}_${String(revisionNumber).padStart(8, '0')}`
}

function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue)
  if (typeof value !== 'object' || value === null) return value
  return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort()
    .map(key => [key, canonicalValue((value as Record<string, unknown>)[key])]))
}

export function canonicalGuidanceJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value))
}

export function guidanceDigestFor(value: GuidanceSemanticV1): string {
  return createHash('sha256').update(canonicalGuidanceJson(value), 'utf8').digest('hex')
}

const guidanceRevisionBaseSchema = z.object({
  schemaVersion: z.literal(1),
  guidanceId: z.string().regex(GUIDANCE_ID),
  revisionId: z.string().regex(GUIDANCE_REVISION_ID),
  revisionNumber: ordinal,
  previousRevisionId: z.string().regex(GUIDANCE_REVISION_ID).optional(),
  patternId: z.string().regex(PATTERN_ID),
  patternRevisionId: z.string().regex(/^ra-pattern-v1_[a-f0-9]{64}_[0-9]{8}$/),
  patternState: z.enum(['QUALIFIED', 'SUSPENDED', 'INVALIDATED']),
  patternRevisionKind: z.enum(['INITIAL', 'SUPPORT_UPDATE', 'SUSPENSION', 'REQUALIFICATION', 'INVALIDATION']),
  revisionKind: z.enum(['INITIAL_ACTIVE', 'REFRESH_ACTIVE', 'REACTIVATION_ACTIVE', 'WITHDRAW_SUSPENDED', 'WITHDRAW_INVALIDATED']),
  state: z.enum(['ACTIVE', 'WITHDRAWN']),
  contentCode: z.literal('VERIFIED_PATTERN_CONTEXT_V1').optional(),
  evidenceStrength: z.literal('QUALIFIED_PATTERN').optional(),
  supportCount: boundedInteger.optional(),
  supportUtcDateCount: boundedInteger.optional(),
  patternProvenanceDigest: z.string().regex(DIGEST),
  guidanceDigest: z.string().regex(DIGEST),
}).strict()

export const guidanceRevisionSchema = guidanceRevisionBaseSchema.superRefine((revision, context) => {
  if (revision.guidanceId !== guidanceIdFor(revision.patternId)) {
    context.addIssue({ code: 'custom', path: ['guidanceId'], message: 'guidanceId must match pattern identity' })
  }
  // Application-cap overflow is classified by GuidanceRuntime before parse. Keep the
  // domain schema permissive enough that DomainFacility.open() does not mask that status.
  if (revision.revisionNumber <= MAX_GUIDANCE_REVISIONS
    && (revision.revisionId !== guidanceRevisionKey(revision.guidanceId, revision.revisionNumber)
      || revision.patternRevisionId !== patternRevisionKey(revision.patternId, revision.revisionNumber))) {
    context.addIssue({ code: 'custom', path: ['revisionId'], message: 'Guidance and Pattern identities must share the same ordinal' })
  }
  if (revision.revisionNumber === 1) {
    if (revision.previousRevisionId !== undefined
      || revision.patternState !== 'QUALIFIED'
      || revision.patternRevisionKind !== 'INITIAL'
      || revision.revisionKind !== 'INITIAL_ACTIVE'
      || revision.state !== 'ACTIVE') {
      context.addIssue({ code: 'custom', path: ['revisionKind'], message: 'revision 1 must map INITIAL / QUALIFIED to INITIAL_ACTIVE' })
    }
  } else if (revision.previousRevisionId !== guidanceRevisionKey(revision.guidanceId, revision.revisionNumber - 1)) {
    context.addIssue({ code: 'custom', path: ['previousRevisionId'], message: 'Guidance must point to its immediate predecessor' })
  }

  const expected = revision.patternRevisionKind === 'INITIAL'
    ? { patternState: 'QUALIFIED', revisionKind: 'INITIAL_ACTIVE', state: 'ACTIVE' }
    : revision.patternRevisionKind === 'SUPPORT_UPDATE'
      ? { patternState: 'QUALIFIED', revisionKind: 'REFRESH_ACTIVE', state: 'ACTIVE' }
      : revision.patternRevisionKind === 'REQUALIFICATION'
        ? { patternState: 'QUALIFIED', revisionKind: 'REACTIVATION_ACTIVE', state: 'ACTIVE' }
        : revision.patternRevisionKind === 'SUSPENSION'
          ? { patternState: 'SUSPENDED', revisionKind: 'WITHDRAW_SUSPENDED', state: 'WITHDRAWN' }
          : { patternState: 'INVALIDATED', revisionKind: 'WITHDRAW_INVALIDATED', state: 'WITHDRAWN' }
  if (revision.patternState !== expected.patternState
    || revision.revisionKind !== expected.revisionKind
    || revision.state !== expected.state) {
    context.addIssue({ code: 'custom', path: ['state'], message: 'Guidance state must match its exact Pattern transition' })
  }

  if (revision.state === 'ACTIVE') {
    if (revision.contentCode !== 'VERIFIED_PATTERN_CONTEXT_V1'
      || revision.evidenceStrength !== 'QUALIFIED_PATTERN'
      || revision.supportCount === undefined
      || revision.supportCount < 3
      || revision.supportUtcDateCount === undefined
      || revision.supportUtcDateCount < 2) {
      context.addIssue({ code: 'custom', path: ['contentCode'], message: 'active Guidance requires the frozen qualified payload' })
    }
  } else if (revision.contentCode !== undefined
    || revision.evidenceStrength !== undefined
    || revision.supportCount !== undefined
    || revision.supportUtcDateCount !== undefined) {
    context.addIssue({ code: 'custom', path: ['contentCode'], message: 'withdrawn Guidance cannot carry active payload' })
  }

  const { guidanceDigest, ...semantic } = revision
  if (guidanceDigestFor(semantic) !== guidanceDigest) {
    context.addIssue({ code: 'custom', path: ['guidanceDigest'], message: 'guidanceDigest does not match canonical semantic fields' })
  }
})

export const guidanceDomainSpec = defineDomain({
  name: 'risk_advisor_guidance',
  version: 1,
  layout: 'per-record',
  tables: {
    revisions: domainTable<string, VerifiedHistoricalGuidanceRevisionV1>(guidanceRevisionSchema),
  },
})

export const MAX_GUIDANCE_IDENTITIES = 60_000
export const MAX_GUIDANCE_REVISIONS = 300_000
export const MAX_GUIDANCE_PENDING_PATTERN_HANDOFFS = 512
export const MAX_GUIDANCE_SUPPORT_COUNT = 10_000
export const MAX_GUIDANCE_UTC_DATE_COUNT = 10_000

export class GuidanceCapacityError extends Error {}

/** Run before schema.parse: application caps must retain CAPACITY_EXCEEDED classification. */
export function assertGuidanceRevisionCapacity(value: unknown): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return
  const row = value as Record<string, unknown>
  if (typeof row.revisionNumber === 'number' && Number.isFinite(row.revisionNumber) && row.revisionNumber > MAX_GUIDANCE_REVISIONS) {
    throw new GuidanceCapacityError('guidance-revision-capacity-exceeded')
  }
  if (typeof row.supportCount === 'number' && Number.isFinite(row.supportCount) && row.supportCount > MAX_GUIDANCE_SUPPORT_COUNT) {
    throw new GuidanceCapacityError('guidance-support-count-capacity-exceeded')
  }
  if (typeof row.supportUtcDateCount === 'number' && Number.isFinite(row.supportUtcDateCount) && row.supportUtcDateCount > MAX_GUIDANCE_UTC_DATE_COUNT) {
    throw new GuidanceCapacityError('guidance-utc-date-count-capacity-exceeded')
  }
}

export interface RenderedGuidanceV1 {
  readonly title: 'Verified historical pattern'
  readonly observation: string
  readonly contextCaveat: 'Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.'
  readonly nextCheck: 'Independently verify the current target and expected postcondition.'
  readonly authorityNotice: 'This guidance does not determine risk or grant permission or approval.'
}

export function renderGuidance(revision: VerifiedHistoricalGuidanceRevisionV1): RenderedGuidanceV1 | undefined {
  if (revision.state !== 'ACTIVE' || revision.contentCode !== 'VERIFIED_PATTERN_CONTEXT_V1'
    || revision.evidenceStrength !== 'QUALIFIED_PATTERN'
    || revision.supportCount === undefined || revision.supportUtcDateCount === undefined) return undefined
  return Object.freeze({
    title: 'Verified historical pattern',
    observation: `A qualified verified-success pattern covers ${revision.supportCount} distinct Episodes across ${revision.supportUtcDateCount} UTC dates.`,
    contextCaveat: 'Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.',
    nextCheck: 'Independently verify the current target and expected postcondition.',
    authorityNotice: 'This guidance does not determine risk or grant permission or approval.',
  })
}
