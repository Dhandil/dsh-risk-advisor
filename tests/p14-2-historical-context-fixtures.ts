import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { experienceDomainSpec, experienceEpisodeKey, experienceEpisodeSchema } from '../src/host/experience-schema.ts'
import type { ExperienceEpisodeId, ExperienceEpisodeV1 } from '../src/host/experience-schema.ts'
import type { ExecutionId } from '../src/host/correlation.ts'
import { OutcomeRuntime } from '../src/host/outcome-store.ts'
import { PatternRuntime } from '../src/host/pattern-store.ts'
import { GuidanceRuntime } from '../src/host/guidance-store.ts'
import type { VerificationRecordV1 } from '../src/host/verification-store.ts'
import { createJsonStorageFixture } from './p11-1-experience-fixtures.ts'

export interface QualifiedHistoryFixture {
  readonly root: string
  readonly backing: Awaited<ReturnType<typeof createJsonStorageFixture>>
  readonly episodes: readonly ExperienceEpisodeV1[]
  readonly outcomes: OutcomeRuntime
  readonly patterns: PatternRuntime
  readonly guidance: GuidanceRuntime
  close(): Promise<void>
}

export async function createQualifiedHistoryFixture(options: {
  readonly toolName?: string
  readonly platform?: ExperienceEpisodeV1['runtime']['platform']
  readonly kind?: ExperienceEpisodeV1['operation']['kind']
  readonly parserConfidence?: ExperienceEpisodeV1['operation']['parserConfidence']
  readonly mutating?: boolean | 'unknown'
  readonly externalEffect?: boolean | 'unknown'
  readonly networkEffect?: ExperienceEpisodeV1['operation']['networkEffect']
  readonly requestedPermission?: ExperienceEpisodeV1['operation']['requestedPermission']
  readonly evidenceSource?: VerificationRecordV1['source']
  readonly adapterId?: VerificationRecordV1['adapterId']
} = {}): Promise<QualifiedHistoryFixture> {
  const root = await mkdtemp(join(tmpdir(), 'ra-p14-2-history-'))
  const backing = await createJsonStorageFixture(root)
  const episodes = Object.freeze(Array.from({ length: 4 }, (_, index) => {
    const sourceExecutionId = `ra-execution-p14-2-${index + 1}`
    return experienceEpisodeSchema.parse({
      schemaVersion: 1,
      episodeId: experienceEpisodeKey(sourceExecutionId),
      sourceExecutionId,
      observedAt: Date.UTC(2026, 0, index + 1, 12),
      runtime: { platform: options.platform ?? 'darwin' },
      operation: {
        toolName: options.toolName ?? 'write',
        kind: options.kind ?? 'filesystem-write',
        parserConfidence: options.parserConfidence ?? 'high',
        mutating: options.mutating ?? true,
        externalEffect: options.externalEffect ?? false,
        networkEffect: options.networkEffect ?? 'none',
        ...(options.requestedPermission === undefined ? {} : { requestedPermission: options.requestedPermission }),
      },
      approval: { observed: false },
      terminal: { isError: false },
      retry: { status: 'READY', retryCount: 0, recentFailureCount: 0, sameRootCause: false, permissionEscalation: false },
      provenance: { source: 'LIVE_TOOLS_RESULT', ruleStatus: 'READY', reasonCodes: [] },
    })
  }))
  const domain = await backing.facility.open(experienceDomainSpec)
  const table = domain.table('episodes')
  for (const value of episodes) await table.put(value.episodeId as ExperienceEpisodeId, value)
  await domain.close()

  const outcomes = new OutcomeRuntime()
  await outcomes.attach(backing.facility, episodes)
  const patterns = new PatternRuntime()
  await patterns.attach(backing.facility, outcomes)
  const guidance = new GuidanceRuntime()
  await guidance.attach(backing.facility, patterns)
  for (const episode of episodes.slice(0, 3)) outcomes.observeVerification(verification(episode, options))
  await outcomes.drain()
  await patterns.drain()
  await guidance.drain()

  let closed = false
  return {
    root,
    backing,
    episodes,
    outcomes,
    patterns,
    guidance,
    async close() {
      if (closed) return
      closed = true
      await patterns.drain()
      await guidance.detach()
      await patterns.detach()
      await outcomes.detach()
      await backing.close()
      await rm(root, { recursive: true, force: true })
    },
  }
}

function verification(
  episode: ExperienceEpisodeV1,
  options: Parameters<typeof createQualifiedHistoryFixture>[0],
): VerificationRecordV1 {
  return {
    schemaVersion: 1,
    executionId: episode.sourceExecutionId as ExecutionId,
    source: options.evidenceSource ?? 'tool-contract',
    adapterId: options.adapterId ?? 'tool.write.v1',
    status: 'MATCHED',
    semanticSuccess: true,
    evidenceQuality: 'medium',
    reasonCodes: ['POSTCONDITION_MATCHED'],
    observedAt: episode.observedAt,
    durationMs: 1,
  }
}
