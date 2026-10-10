import { createHash } from 'node:crypto'
import { z } from 'zod'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'

const code = z.string().min(1).max(128).regex(/^[A-Za-z0-9_.:-]+$/)
const safeCount = z.number().int().min(0).max(1_000_000)
const safeTimestamp = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)
const unknownBoolean = z.union([z.boolean(), z.literal('unknown')])

export const experienceEpisodeSchema = z.object({
  schemaVersion: z.literal(1),
  episodeId: z.string().regex(/^ra-episode-v1_[a-f0-9]{64}$/),
  sourceExecutionId: z.string().min(1).max(128).regex(/^ra-execution-[A-Za-z0-9-]+$/),
  observedAt: safeTimestamp,
  runtime: z.object({
    platform: z.enum(['darwin', 'win32', 'linux', 'other']),
  }).strict(),
  operation: z.object({
    toolName: z.string().min(1).max(128).regex(/^[^\u0000-\u001f\u007f]+$/),
    kind: z.enum(['filesystem-read', 'filesystem-write', 'filesystem-edit', 'shell', 'network-read', 'unknown']),
    parserConfidence: z.enum(['high', 'medium', 'low']),
    mutating: unknownBoolean,
    externalEffect: unknownBoolean,
    networkEffect: z.enum(['none', 'read', 'write', 'unknown']),
    requestedPermission: z.enum(['workspace-write', 'danger-full-access']).optional(),
  }).strict(),
  approval: z.object({
    observed: z.boolean(),
    outcome: z.enum(['allowed-once', 'rejected', 'cancelled', 'unavailable']).optional(),
  }).strict(),
  terminal: z.object({
    isError: z.boolean(),
    error: z.object({
      name: z.string().min(1).max(128).regex(/^[A-Za-z][A-Za-z0-9_.-]*$/),
      code: z.string().min(1).max(128).regex(/^[A-Za-z0-9_.:-]+$/),
    }).strict().optional(),
  }).strict(),
  retry: z.object({
    status: z.enum(['READY', 'UNSUPPORTED', 'DEGRADED', 'NOT_FOUND', 'EXPIRED', 'CAPACITY_EXCEEDED']),
    retryCount: safeCount,
    recentFailureCount: safeCount,
    sameRootCause: unknownBoolean,
    permissionEscalation: unknownBoolean,
  }).strict(),
  provenance: z.object({
    source: z.literal('LIVE_TOOLS_RESULT'),
    ruleStatus: z.enum(['READY', 'DEGRADED', 'UNSUPPORTED', 'NOT_FOUND', 'EXPIRED', 'CAPACITY_EXCEEDED']),
    reasonCodes: z.array(code).max(32),
  }).strict(),
}).strict().superRefine((episode, context) => {
  if (episode.episodeId !== experienceEpisodeKey(episode.sourceExecutionId)) {
    context.addIssue({ code: 'custom', path: ['episodeId'], message: 'episodeId must be derived from sourceExecutionId' })
  }
})

export type ExperienceEpisodeV1 = Readonly<z.infer<typeof experienceEpisodeSchema>>
export type ExperienceEpisodeId = string & { readonly __experienceEpisodeId: unique symbol }

/** The frozen Phase 11.1 Host-platform normalization shared by all consumers. */
export function normalizeExperiencePlatform(value: unknown): ExperienceEpisodeV1['runtime']['platform'] {
  return value === 'darwin' || value === 'win32' || value === 'linux' ? value : 'other'
}

/** The frozen Phase 11.1 Tool-name normalization, including its unknown fallback. */
export function normalizeExperienceToolName(value: unknown): string {
  return typeof value === 'string' && value.length <= 128 && !/[\u0000-\u001f\u007f]/.test(value)
    ? value
    : 'unknown'
}

export const experienceDomainSpec = defineDomain({
  name: 'risk_advisor_experience',
  version: 1,
  layout: 'per-record',
  tables: {
    episodes: domainTable<ExperienceEpisodeId, ExperienceEpisodeV1>(experienceEpisodeSchema),
  },
})

export const MAX_EXPERIENCE_EPISODES = 10_000

export function experienceEpisodeKey(executionId: string): ExperienceEpisodeId {
  const digest = createHash('sha256').update(executionId, 'utf8').digest('hex')
  return `ra-episode-v1_${digest}` as ExperienceEpisodeId
}
