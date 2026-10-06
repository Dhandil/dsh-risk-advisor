import { createHash } from 'node:crypto'
import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import type { ExperienceEpisodeId } from './experience-schema.ts'

const episodeId = z.string().regex(/^ra-episode-v1_[a-f0-9]{64}$/)
const code = z.string().min(1).max(128).regex(/^[A-Za-z0-9_.:-]+$/)
const timestamp = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)
const positiveCount = z.number().int().min(1).max(16)
export type OutcomeStatus = 'VERIFIED_SUCCESS' | 'VERIFIED_FAILURE' | 'UNKNOWN' | 'NOT_EXECUTED' | 'INVALIDATED'
const adapters = [
  'tool.write.v1', 'tool.edit.v1', 'shell.mkdir.v1', 'shell.copy-file.v1',
  'git.branch-switch.v1', 'package.node-resolve.v1',
] as const

export const postconditionEvidenceSchema = z.object({
  source: z.enum(['tool-contract', 'known-adapter']),
  adapterId: z.string().min(1).max(128).regex(/^[A-Za-z0-9_.:-]+$/),
  status: z.enum(['MATCHED', 'MISMATCHED', 'UNKNOWN', 'UNAVAILABLE']),
  semanticSuccess: z.union([z.boolean(), z.literal('unknown')]),
  evidenceQuality: z.enum(['high', 'medium', 'low']),
  reasonCodes: z.array(code).max(32),
  observedAt: timestamp,
  durationMs: timestamp,
}).strict()

const outcomeRevisionBaseSchema = z.object({
  schemaVersion: z.literal(1),
  revisionId: z.string().regex(/^ra-outcome-v1_[a-f0-9]{64}_[0-9]{8}$/),
  episodeId,
  revisionNumber: positiveCount,
  previousRevisionId: z.string().regex(/^ra-outcome-v1_[a-f0-9]{64}_[0-9]{8}$/).optional(),
  revisionKind: z.enum(['INITIAL', 'POSTCONDITION_UPDATE', 'INVALIDATION', 'REQUALIFICATION']),
  status: z.enum(['VERIFIED_SUCCESS', 'VERIFIED_FAILURE', 'UNKNOWN', 'NOT_EXECUTED', 'INVALIDATED']),
  ruleId: z.enum([
    'outcome-v1-postcondition',
    'outcome-v1-no-evidence',
    'outcome-v1-not-executed',
    'outcome-v1-conflict',
    'outcome-v1-invalidation',
  ]),
  recordedAt: timestamp,
  reasonCodes: z.array(code).max(32),
  postconditionEvidence: postconditionEvidenceSchema.optional(),
}).strict()

export const outcomeRevisionSchema = outcomeRevisionBaseSchema.superRefine((revision, context) => {
  if (revision.revisionId !== outcomeRevisionKey(revision.episodeId, revision.revisionNumber)) {
    context.addIssue({ code: 'custom', path: ['revisionId'], message: 'revisionId must match episodeId and revisionNumber' })
  }
  if (revision.revisionNumber === 1) {
    if (revision.previousRevisionId !== undefined || revision.revisionKind !== 'INITIAL') {
      context.addIssue({ code: 'custom', path: ['previousRevisionId'], message: 'initial revision cannot have a predecessor' })
    }
  } else {
    if (revision.previousRevisionId !== outcomeRevisionKey(revision.episodeId, revision.revisionNumber - 1)) {
      context.addIssue({ code: 'custom', path: ['previousRevisionId'], message: 'revision must point to its immediate predecessor' })
    }
    if (revision.revisionKind === 'INITIAL') {
      context.addIssue({ code: 'custom', path: ['revisionKind'], message: 'only the first revision may be initial' })
    }
  }

  const expectedRule = revision.status === 'INVALIDATED'
    ? 'outcome-v1-invalidation'
    : revision.status === 'NOT_EXECUTED'
      ? 'outcome-v1-not-executed'
      : revision.status === 'UNKNOWN' && revision.reasonCodes.includes('VERIFICATION_CONFLICT')
        ? 'outcome-v1-conflict'
        : revision.status === 'UNKNOWN' && revision.postconditionEvidence === undefined
          ? 'outcome-v1-no-evidence'
          : 'outcome-v1-postcondition'
  if (revision.ruleId !== expectedRule) {
    context.addIssue({ code: 'custom', path: ['ruleId'], message: 'ruleId does not match qualification status/evidence' })
  }

  const evidence = revision.postconditionEvidence
  if (evidence !== undefined) {
    const toolContractAdapter = evidence.adapterId === 'tool.write.v1' || evidence.adapterId === 'tool.edit.v1'
    if (toolContractAdapter !== (evidence.source === 'tool-contract')
      && (revision.status === 'VERIFIED_SUCCESS' || revision.status === 'VERIFIED_FAILURE')) {
      context.addIssue({ code: 'custom', path: ['postconditionEvidence'], message: 'verified outcome requires a supported source/adapter pairing' })
    }
    if (revision.status === 'VERIFIED_SUCCESS'
      && !(adapters.includes(evidence.adapterId as typeof adapters[number])
        && evidence.status === 'MATCHED'
        && evidence.semanticSuccess === true
        && evidence.evidenceQuality !== 'low')) {
      context.addIssue({ code: 'custom', path: ['postconditionEvidence'], message: 'verified success requires conclusive matched evidence' })
    }
    if (revision.status === 'VERIFIED_FAILURE'
      && !(adapters.includes(evidence.adapterId as typeof adapters[number])
        && evidence.status === 'MISMATCHED'
        && evidence.semanticSuccess === false
        && evidence.evidenceQuality !== 'low')) {
      context.addIssue({ code: 'custom', path: ['postconditionEvidence'], message: 'verified failure requires conclusive mismatched evidence' })
    }
  } else if (revision.status === 'VERIFIED_SUCCESS' || revision.status === 'VERIFIED_FAILURE') {
    context.addIssue({ code: 'custom', path: ['postconditionEvidence'], message: 'verified outcome requires evidence snapshot' })
  }
})

export type OutcomeRevisionV1 = Readonly<z.infer<typeof outcomeRevisionSchema>>
export type OutcomeEpisodeId = ExperienceEpisodeId
export type OutcomeRevisionId = string & { readonly __outcomeRevisionId: unique symbol }

export const outcomeDomainSpec = defineDomain({
  name: 'risk_advisor_outcome',
  version: 1,
  layout: 'per-record',
  tables: {
    revisions: domainTable<OutcomeRevisionId, OutcomeRevisionV1>(outcomeRevisionSchema),
  },
})

export const MAX_OUTCOME_EPISODE_REVISIONS = 16
export const MAX_OUTCOME_REVISIONS = 100_000
export const MAX_PENDING_VERIFIER_HANDOFFS = 512

export function outcomeRevisionKey(episode: string, revisionNumber: number): OutcomeRevisionId {
  const digest = createHash('sha256').update(episode, 'utf8').digest('hex')
  const sequence = String(revisionNumber).padStart(8, '0')
  return `ra-outcome-v1_${digest}_${sequence}` as OutcomeRevisionId
}
