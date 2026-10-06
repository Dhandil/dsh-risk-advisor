import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import type { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { experienceDomainSpec, experienceEpisodeKey, experienceEpisodeSchema } from '../src/host/experience-schema.ts'
import type { ExperienceEpisodeId, ExperienceEpisodeV1 } from '../src/host/experience-schema.ts'
import { OutcomeRuntime } from '../src/host/outcome-store.ts'
import { PatternRuntime } from '../src/host/pattern-store.ts'
import {
  MAX_PATTERN_DELTA_REFERENCES_PER_ARRAY,
  MAX_PATTERN_PENDING_OUTCOME_HANDOFFS,
  MAX_PATTERN_PROVENANCE_REFERENCES,
  MAX_PATTERN_REVISIONS,
  patternDomainSpec,
  patternIdentityFor,
  patternProvenanceDigest,
  patternRevisionKey,
} from '../src/host/pattern-schema.ts'
import type { VerifiedExperiencePatternRevisionV1 } from '../src/host/pattern-schema.ts'
import type { ExecutionId } from '../src/host/correlation.ts'
import type { VerificationRecordV1 } from '../src/host/verification-store.ts'
import { createJsonStorageFixture } from './p11-1-experience-fixtures.ts'
import type { JsonStorageFixture } from './p11-1-experience-fixtures.ts'

const roots: string[] = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })

interface Setup {
  readonly backing: JsonStorageFixture
  readonly outcomes: OutcomeRuntime
  readonly patterns: PatternRuntime
  readonly episodes: readonly ExperienceEpisodeV1[]
}

function makeEpisode(id: string, options: {
  readonly observedAt?: number
  readonly platform?: ExperienceEpisodeV1['runtime']['platform']
  readonly toolName?: string
  readonly kind?: ExperienceEpisodeV1['operation']['kind']
  readonly parserConfidence?: ExperienceEpisodeV1['operation']['parserConfidence']
  readonly mutating?: ExperienceEpisodeV1['operation']['mutating']
  readonly externalEffect?: ExperienceEpisodeV1['operation']['externalEffect']
  readonly networkEffect?: ExperienceEpisodeV1['operation']['networkEffect']
  readonly requestedPermission?: ExperienceEpisodeV1['operation']['requestedPermission'] | null
} = {}): ExperienceEpisodeV1 {
  const sourceExecutionId = `ra-execution-${id.replace(/[^A-Za-z0-9-]/g, '-')}`
  const operation = {
    toolName: options.toolName ?? 'pattern-test-tool',
    kind: options.kind ?? 'filesystem-write',
    parserConfidence: options.parserConfidence ?? 'high',
    mutating: options.mutating ?? true,
    externalEffect: options.externalEffect ?? false,
    networkEffect: options.networkEffect ?? 'none',
    ...(options.requestedPermission === null ? {} : { requestedPermission: options.requestedPermission ?? 'workspace-write' }),
  }
  return experienceEpisodeSchema.parse({
    schemaVersion: 1,
    episodeId: experienceEpisodeKey(sourceExecutionId),
    sourceExecutionId,
    observedAt: options.observedAt ?? Date.UTC(2026, 0, 1, 12),
    runtime: { platform: options.platform ?? 'darwin' },
    operation,
    approval: { observed: true, outcome: 'allowed-once' },
    terminal: { isError: false },
    retry: { status: 'READY', retryCount: 0, recentFailureCount: 0, sameRootCause: false, permissionEscalation: false },
    provenance: { source: 'LIVE_TOOLS_RESULT', ruleStatus: 'READY', reasonCodes: [] },
  })
}

async function setup(episodes: readonly ExperienceEpisodeV1[]): Promise<Setup> {
  const backing = await createJsonStorageFixture(await mkdtemp(join(tmpdir(), 'ra-p11-3-pattern-')))
  roots.push(backing.root)
  const experience = await backing.facility.open(experienceDomainSpec)
  const episodeTable = experience.table('episodes')
  for (const episode of episodes) await episodeTable.put(episode.episodeId as ExperienceEpisodeId, episode)
  await experience.close()
  const outcomes = new OutcomeRuntime()
  await outcomes.attach(backing.facility, episodes)
  return { backing, outcomes, patterns: new PatternRuntime(), episodes }
}

function verification(episode: ExperienceEpisodeV1, options: Partial<Pick<VerificationRecordV1,
  'source' | 'adapterId' | 'status' | 'semanticSuccess' | 'evidenceQuality' | 'reasonCodes' | 'observedAt' | 'durationMs'>> = {}): VerificationRecordV1 {
  const status = options.status ?? 'MATCHED'
  return {
    schemaVersion: 1,
    executionId: episode.sourceExecutionId as ExecutionId,
    source: options.source ?? 'known-adapter',
    adapterId: options.adapterId ?? 'shell.mkdir.v1',
    status,
    semanticSuccess: options.semanticSuccess ?? (status === 'MATCHED' ? true : status === 'MISMATCHED' ? false : 'unknown'),
    evidenceQuality: options.evidenceQuality ?? 'medium',
    reasonCodes: options.reasonCodes ?? [status === 'MATCHED' ? 'POSTCONDITION_MATCHED' : status === 'MISMATCHED' ? 'POSTCONDITION_MISMATCH' : 'VERIFIER_RESULT_UNSUPPORTED'],
    observedAt: options.observedAt ?? episode.observedAt,
    durationMs: options.durationMs ?? 1,
  }
}

async function recordOutcome(set: Setup, episode: ExperienceEpisodeV1, options: Parameters<typeof verification>[1] = {}): Promise<void> {
  set.outcomes.observeVerification(verification(episode, options))
  await set.outcomes.drain()
  await set.patterns.drain()
}

async function close(set: Setup): Promise<void> {
  await set.patterns.detach()
  await set.outcomes.detach()
  await set.backing.close()
}

async function seedSuccesses(set: Setup, episodes: readonly ExperienceEpisodeV1[]): Promise<void> {
  for (const episode of episodes) await recordOutcome(set, episode)
}

function currentPatterns(set: Setup): readonly VerifiedExperiencePatternRevisionV1[] {
  return set.patterns.diagnostics.patternIds().map(id => set.patterns.diagnostics.current(id)!).filter(Boolean)
}

interface MutablePatternTable {
  get(key: string): unknown
  entries(): IterableIterator<[string, unknown]>
  readonly size: number
  put(key: string, value: unknown): Promise<void>
}

interface MutablePatternDomain {
  table(name: string): MutablePatternTable
  close(): Promise<void>
}

function withPatternDomain(
  backing: JsonStorageFixture,
  transform: (domain: MutablePatternDomain) => MutablePatternDomain,
): DomainFacility {
  const open = backing.facility.open.bind(backing.facility) as (spec: unknown) => Promise<unknown>
  return {
    async open(spec: unknown) {
      const domain = await open(spec) as MutablePatternDomain & { readonly name?: string }
      return domain.name === 'risk_advisor_pattern' ? transform(domain) : domain
    },
  } as unknown as DomainFacility
}

function withPatternGetConflict(backing: JsonStorageFixture, conflictKey: string): DomainFacility {
  return withPatternDomain(backing, domain => {
    const table = domain.table('revisions')
    const first = [...table.entries()].map(([, value]) => value as VerifiedExperiencePatternRevisionV1)[0]
    const conflicting = first === undefined ? { divergent: true } : {
      ...first,
      revisionId: conflictKey,
      revisionNumber: 2,
      previousRevisionId: first.revisionId,
      revisionKind: 'SUPPORT_UPDATE',
    }
    const wrappedTable = new Proxy(table, {
      get(target, property) {
        if (property === 'get') return (key: string) => key === conflictKey ? conflicting : target.get(key)
        const value = Reflect.get(target, property, target) as unknown
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    return new Proxy(domain, {
      get(target, property) {
        if (property === 'table') return (name: string) => name === 'revisions' ? wrappedTable : target.table(name)
        const value = Reflect.get(target, property, target) as unknown
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
  })
}

function qualifiedId(set: Setup): string {
  const qualified = currentPatterns(set).find(item => item.state === 'QUALIFIED')
  if (qualified === undefined) throw new Error('expected a qualified Pattern')
  return qualified.patternId
}

describe('Phase 11.3 Verified Experience Pattern P1–P17', () => {
  it('P1 fails closed on missing/forked Pattern history and unavailable durable Outcome sources', async () => {
    const episodes = [makeEpisode('p1-1', { observedAt: Date.UTC(2026, 0, 1) }), makeEpisode('p1-2', { observedAt: Date.UTC(2026, 0, 2) }), makeEpisode('p1-3', { observedAt: Date.UTC(2026, 0, 3) })]
    const set = await setup(episodes)
    await seedSuccesses(set, episodes)
    await set.patterns.attach(set.backing.facility, set.outcomes)
    const first = set.patterns.diagnostics.revisions(qualifiedId(set))[0]!
    await set.patterns.detach()
    const domain = await set.backing.facility.open(patternDomainSpec)
    const table = domain.table('revisions')
    await table.put(patternRevisionKey(first.patternId, 3), {
      ...first,
      revisionId: patternRevisionKey(first.patternId, 3),
      revisionNumber: 3,
      previousRevisionId: patternRevisionKey(first.patternId, 2),
      revisionKind: 'SUPPORT_UPDATE',
    })
    await domain.close()
    const reopened = new PatternRuntime()
    await reopened.attach(set.backing.facility, set.outcomes)
    expect(reopened.diagnostics.status()).toBe('CONFLICTED')
    expect(reopened.diagnostics.patternIds()).toEqual([])
    await reopened.detach()
    const experienceUnavailable = new PatternRuntime()
    await experienceUnavailable.attach(set.backing.facility, set.outcomes, () => false)
    expect(experienceUnavailable.diagnostics.status()).toBe('UNAVAILABLE')
    expect(experienceUnavailable.diagnostics.reasonCodes()).toEqual(['EXPERIENCE_SOURCE_UNAVAILABLE'])
    await experienceUnavailable.detach()
    await set.outcomes.detach()
    await set.backing.close()

    const unavailable = new PatternRuntime()
    await unavailable.attach(set.backing.facility, new OutcomeRuntime())
    expect(unavailable.diagnostics.status()).toBe('UNAVAILABLE')
    expect(unavailable.diagnostics.patternIds()).toEqual([])
  })

  it('P2 hashes the exact equivalence tuple and partitions differing operation/evidence dimensions', () => {
    const episode = makeEpisode('p2-base')
    const evidence = {
      source: 'known-adapter', adapterId: 'shell.mkdir.v1', status: 'MATCHED', semanticSuccess: true,
      evidenceQuality: 'medium', reasonCodes: ['POSTCONDITION_MATCHED'], observedAt: 1, durationMs: 1,
    } as const
    const first = patternIdentityFor(episode, evidence as never)!
    expect(patternIdentityFor(episode, evidence as never)).toBe(first)
    const tuple = JSON.stringify([
      'operation-outcome-equivalence-v1', 'darwin', 'pattern-test-tool', 'filesystem-write', 'high',
      true, false, 'none', 'workspace-write', 'known-adapter', 'shell.mkdir.v1',
    ])
    expect(first).toBe(`ra-pattern-v1_${createHash('sha256').update(tuple, 'utf8').digest('hex')}`)
    expect(patternIdentityFor(makeEpisode('p2-different-tool', { toolName: 'other-tool' }), evidence as never)).not.toBe(first)
    expect(patternIdentityFor(makeEpisode('p2-different-permission', { requestedPermission: 'danger-full-access' }), evidence as never)).not.toBe(first)
    expect(patternIdentityFor(makeEpisode('p2-different-platform', { platform: 'linux' }), evidence as never)).not.toBe(first)
    expect(patternIdentityFor(makeEpisode('p2-different-kind', { kind: 'filesystem-edit' }), evidence as never)).not.toBe(first)
    expect(patternIdentityFor(makeEpisode('p2-different-mutating', { mutating: false }), evidence as never)).not.toBe(first)
    expect(patternIdentityFor(makeEpisode('p2-different-external', { externalEffect: true }), evidence as never)).not.toBe(first)
    expect(patternIdentityFor(makeEpisode('p2-different-network', { networkEffect: 'write' }), evidence as never)).not.toBe(first)
    expect(patternIdentityFor(makeEpisode('p2-ineligible-kind', { kind: 'unknown' }), evidence as never)).toBeUndefined()
    expect(patternIdentityFor(makeEpisode('p2-ineligible-confidence', { parserConfidence: 'medium' }), evidence as never)).toBeUndefined()
    expect(patternIdentityFor(makeEpisode('p2-ineligible-typed-fact', { mutating: 'unknown' }), evidence as never)).toBeUndefined()
    expect(patternIdentityFor(episode, { ...evidence, adapterId: 'shell.copy-file.v1' } as never)).not.toBe(first)
    expect(patternIdentityFor(episode, { ...evidence, source: 'tool-contract' } as never)).toBeUndefined()
    expect(first).toMatch(/^ra-pattern-v1_[a-f0-9]{64}$/)
  })

  it('P3/P6 forms only from three current trusted successes spanning two UTC dates', async () => {
    const sameDay = [1, 2, 3].map(index => makeEpisode(`p3-sameday-${index}`, { observedAt: Date.UTC(2026, 0, 1, index) }))
    const set = await setup(sameDay)
    await seedSuccesses(set, sameDay)
    await set.patterns.attach(set.backing.facility, set.outcomes)
    expect(set.patterns.diagnostics.patternIds()).toEqual([])
    await close(set)

    const two = [1, 2].map(index => makeEpisode(`p6-two-${index}`, { observedAt: Date.UTC(2026, 0, index) }))
    const belowMinimum = await setup(two)
    await seedSuccesses(belowMinimum, two)
    await belowMinimum.patterns.attach(belowMinimum.backing.facility, belowMinimum.outcomes)
    expect(belowMinimum.patterns.diagnostics.patternIds()).toEqual([])
    await close(belowMinimum)

    const acrossDays = [
      makeEpisode('p3-day1-a', { observedAt: Date.UTC(2026, 0, 1, 12) }),
      makeEpisode('p3-day1-b', { observedAt: Date.UTC(2026, 0, 1, 13) }),
      makeEpisode('p3-day2-c', { observedAt: Date.UTC(2026, 0, 2, 1) }),
    ]
    const next = await setup(acrossDays)
    await seedSuccesses(next, acrossDays.slice(0, 2))
    await next.patterns.attach(next.backing.facility, next.outcomes)
    expect(next.patterns.diagnostics.patternIds()).toEqual([])
    await recordOutcome(next, acrossDays[2]!)
    expect(currentPatterns(next)).toHaveLength(1)
    expect(currentPatterns(next)[0]).toMatchObject({ state: 'QUALIFIED', supportCount: 3, supportUtcDateCount: 2 })
    await close(next)
  })

  it('P4/P5 never treats approval, process success, unknown, conflict, unsupported, or recovery evidence as support', async () => {
    const episodes = [1, 2, 3].map(index => makeEpisode(`p4-${index}`, { observedAt: Date.UTC(2026, 0, index) }))
    const set = await setup(episodes)
    await recordOutcome(set, episodes[0]!, { status: 'MATCHED', semanticSuccess: true, evidenceQuality: 'low' })
    await recordOutcome(set, episodes[1]!, { status: 'MATCHED', semanticSuccess: false, evidenceQuality: 'high' })
    await recordOutcome(set, episodes[2]!, { status: 'MATCHED', semanticSuccess: true, source: 'tool-contract', adapterId: 'shell.mkdir.v1' })
    await set.patterns.attach(set.backing.facility, set.outcomes)
    expect(set.patterns.diagnostics.patternIds()).toEqual([])
    expect(episodes.every(episode => episode.approval.outcome === 'allowed-once' && !episode.terminal.isError)).toBe(true)
    await close(set)

    for (const [source, adapterId] of [
      ['tool-contract', 'shell.mkdir.v1'],
      ['known-adapter', 'tool.write.v1'],
      ['known-adapter', 'shell.unregistered.v1'],
    ] as const) {
      expect(patternIdentityFor(episodes[0]!, { ...verification(episodes[0]!), source, adapterId } as never)).toBeUndefined()
    }

    const recoveryOnly = await setup(episodes)
    await recoveryOnly.patterns.attach(recoveryOnly.backing.facility, recoveryOnly.outcomes)
    expect(recoveryOnly.outcomes.diagnostics.revisions(episodes[0]!.episodeId)[0]?.status).toBe('UNKNOWN')
    expect(recoveryOnly.patterns.diagnostics.patternIds()).toEqual([])
    await close(recoveryOnly)

    const uncertain = await setup(episodes)
    await recordOutcome(uncertain, episodes[0]!, { status: 'UNKNOWN', semanticSuccess: 'unknown', reasonCodes: ['VERIFICATION_CONFLICT'] as never })
    await recordOutcome(uncertain, episodes[1]!, { status: 'UNAVAILABLE', semanticSuccess: 'unknown' })
    await recordOutcome(uncertain, episodes[2]!, { status: 'MATCHED', semanticSuccess: true, evidenceQuality: 'low' })
    await uncertain.patterns.attach(uncertain.backing.facility, uncertain.outcomes)
    expect(uncertain.patterns.diagnostics.patternIds()).toEqual([])
    expect(uncertain.outcomes.diagnostics.revisions(episodes[0]!.episodeId).at(-1)?.status).toBe('UNKNOWN')
    expect(uncertain.outcomes.diagnostics.revisions(episodes[1]!.episodeId).at(-1)?.status).toBe('UNKNOWN')
    await close(uncertain)
  })

  it('P7 deduplicates Episodes and equivalent Outcome observations', async () => {
    const episodes = [1, 2, 3].map(index => makeEpisode(`p7-${index}`, { observedAt: Date.UTC(2026, 0, index) }))
    const set = await setup(episodes)
    const duplicate = verification(episodes[0]!)
    set.outcomes.observeVerification(duplicate)
    await set.outcomes.drain()
    set.outcomes.observeVerification(duplicate)
    await set.outcomes.drain()
    await recordOutcome(set, episodes[1]!)
    await set.patterns.attach(set.backing.facility, set.outcomes)
    expect(set.patterns.diagnostics.patternIds()).toEqual([])
    await recordOutcome(set, episodes[2]!)
    expect(currentPatterns(set)[0]?.supportCount).toBe(3)
    expect(set.outcomes.diagnostics.revisions(episodes[0]!.episodeId)).toHaveLength(2)
    await close(set)
  })

  it('P8 persists resolvable provenance references and a reproducible digest', async () => {
    const episodes = [1, 2, 3].map(index => makeEpisode(`p8-${index}`, { observedAt: Date.UTC(2026, 0, index) }))
    const set = await setup(episodes)
    await seedSuccesses(set, episodes)
    await set.patterns.attach(set.backing.facility, set.outcomes)
    const id = qualifiedId(set)
    const revision = set.patterns.diagnostics.current(id)!
    const references = revision.supportAdded
    expect(references).toHaveLength(3)
    for (const ref of references) {
      expect(set.outcomes.diagnostics.revisions(ref.episodeId).some(row => row.revisionId === ref.outcomeRevisionId && row.status === 'VERIFIED_SUCCESS')).toBe(true)
    }
    expect(revision.provenanceDigest).toBe(patternProvenanceDigest('QUALIFIED', references, []))
    await close(set)
  })

  it('P9 blocks first formation when any trusted failure already exists for the identity', async () => {
    const episodes = [1, 2, 3, 4].map(index => makeEpisode(`p9-${index}`, { observedAt: Date.UTC(2026, 0, index) }))
    const set = await setup(episodes)
    await seedSuccesses(set, episodes.slice(0, 3))
    await recordOutcome(set, episodes[3]!, { status: 'MISMATCHED', semanticSuccess: false })
    await set.patterns.attach(set.backing.facility, set.outcomes)
    expect(set.patterns.diagnostics.patternIds()).toEqual([])
    await close(set)
  })

  it('P10 appends terminal invalidation after trusted failure and keeps the prior revision unchanged', async () => {
    const episodes = [1, 2, 3, 4, 5].map(index => makeEpisode(`p10-${index}`, { observedAt: Date.UTC(2026, 0, index) }))
    const set = await setup(episodes)
    await seedSuccesses(set, episodes.slice(0, 3))
    await set.patterns.attach(set.backing.facility, set.outcomes)
    const id = qualifiedId(set)
    const prior = JSON.stringify(set.patterns.diagnostics.revisions(id)[0])
    await recordOutcome(set, episodes[3]!, { status: 'MISMATCHED', semanticSuccess: false })
    expect(set.patterns.diagnostics.current(id)).toMatchObject({ state: 'INVALIDATED', revisionKind: 'INVALIDATION', contradictionEpisodeCount: 1 })
    expect(JSON.stringify(set.patterns.diagnostics.revisions(id)[0])).toBe(prior)
    const count = set.patterns.diagnostics.revisions(id).length
    await recordOutcome(set, episodes[4]!)
    expect(set.patterns.diagnostics.revisions(id)).toHaveLength(count)
    expect(set.patterns.diagnostics.current(id)?.state).toBe('INVALIDATED')
    await close(set)
  })

  it('P11 suspends when current success becomes conflict and requalifies only after new trusted support', async () => {
    const episodes = [1, 2, 3, 4].map(index => makeEpisode(`p11-${index}`, { observedAt: Date.UTC(2026, 0, index) }))
    const set = await setup(episodes)
    await seedSuccesses(set, episodes.slice(0, 3))
    await set.patterns.attach(set.backing.facility, set.outcomes)
    const id = qualifiedId(set)
    await recordOutcome(set, episodes[0]!, { status: 'UNKNOWN', semanticSuccess: 'unknown', evidenceQuality: 'low' })
    expect(set.patterns.diagnostics.current(id)).toMatchObject({ state: 'SUSPENDED', supportCount: 2, revisionKind: 'SUSPENSION' })
    await recordOutcome(set, episodes[3]!)
    expect(set.patterns.diagnostics.current(id)).toMatchObject({ state: 'QUALIFIED', supportCount: 3, revisionKind: 'REQUALIFICATION' })
    expect(set.patterns.diagnostics.revisions(id).map(row => row.state)).toEqual(['QUALIFIED', 'SUSPENDED', 'QUALIFIED'])
    await close(set)
  })

  it('P12 leaves append-only history and no-ops equivalent evidence; divergent stored keys fail closed', async () => {
    const episodes = [1, 2, 3, 4].map(index => makeEpisode(`p12-${index}`, { observedAt: Date.UTC(2026, 0, index) }))
    const set = await setup(episodes)
    await seedSuccesses(set, episodes.slice(0, 3))
    await set.patterns.attach(set.backing.facility, set.outcomes)
    const id = qualifiedId(set)
    const before = set.patterns.diagnostics.revisions(id).length
    const duplicate = verification(episodes[0]!)
    set.outcomes.observeVerification(duplicate)
    await set.outcomes.drain()
    await set.patterns.drain()
    expect(set.patterns.diagnostics.revisions(id)).toHaveLength(before)
    await close(set)

    const reopened = await setup(episodes)
    await seedSuccesses(reopened, episodes.slice(0, 3))
    const firstRuntime = new PatternRuntime()
    await firstRuntime.attach(reopened.backing.facility, reopened.outcomes)
    const patternId = firstRuntime.diagnostics.patternIds()[0]!
    await firstRuntime.detach()
    const conflictFacility = withPatternGetConflict(reopened.backing, patternRevisionKey(patternId, 2))
    const conflictRuntime = new PatternRuntime()
    await conflictRuntime.attach(conflictFacility, reopened.outcomes)
    await recordOutcome({ ...reopened, patterns: conflictRuntime }, episodes[3]!)
    expect(conflictRuntime.diagnostics.status()).toBe('CONFLICTED')
    expect(conflictRuntime.diagnostics.revisions(patternId)).toHaveLength(1)
    expect(await readdir(join(reopened.backing.root, 'risk_advisor_pattern', 'revisions'))).toHaveLength(1)
    await conflictRuntime.detach()
    await reopened.outcomes.detach()
    await reopened.backing.close()
  })

  it('P13 restarts with identical provenance and reconciles a missing projection without changing source bytes', async () => {
    const episodes = [1, 2, 3].map(index => makeEpisode(`p13-${index}`, { observedAt: Date.UTC(2026, 0, index) }))
    const set = await setup(episodes)
    await seedSuccesses(set, episodes)
    await set.patterns.attach(set.backing.facility, set.outcomes)
    const id = qualifiedId(set)
    const before = JSON.stringify(set.patterns.diagnostics.revisions(id))
    const outcomeBytes = await Promise.all(episodes.map(async episode => {
      const rows = set.outcomes.diagnostics.revisions(episode.episodeId)
      return JSON.stringify(rows)
    }))
    await set.patterns.detach()
    await set.outcomes.detach()

    const restartedOutcomes = new OutcomeRuntime()
    await restartedOutcomes.attach(set.backing.facility, episodes)
    const restartedPatterns = new PatternRuntime()
    await restartedPatterns.attach(set.backing.facility, restartedOutcomes)
    expect(JSON.stringify(restartedPatterns.diagnostics.revisions(id))).toBe(before)
    expect(await Promise.all(episodes.map(async episode => JSON.stringify(restartedOutcomes.diagnostics.revisions(episode.episodeId))))).toEqual(outcomeBytes)
    await restartedPatterns.detach()
    await restartedOutcomes.detach()

    const projectionDomain = await set.backing.facility.open(patternDomainSpec)
    const projectionTable = projectionDomain.table('revisions')
    for (const key of [...projectionTable.keys()]) await projectionTable.delete(key)
    await projectionDomain.close()
    const rebuiltOutcomes = new OutcomeRuntime()
    await rebuiltOutcomes.attach(set.backing.facility, episodes)
    const rebuiltPatterns = new PatternRuntime()
    await rebuiltPatterns.attach(set.backing.facility, rebuiltOutcomes)
    expect(rebuiltPatterns.diagnostics.current(id)).toMatchObject({ state: 'QUALIFIED', supportCount: 3 })
    expect(rebuiltPatterns.diagnostics.revisions(id)).toHaveLength(1)
    await rebuiltPatterns.detach()
    await rebuiltOutcomes.detach()
    await set.backing.close()
  })

  it('P14 persists only opaque provenance references and no source/private sentinels', async () => {
    const episodes = [1, 2, 3].map(index => makeEpisode(`p14-private-execution-${index}`, {
      observedAt: Date.UTC(2026, 0, index),
      toolName: 'private-command-sentinel',
    }))
    const set = await setup(episodes)
    for (const episode of episodes) await recordOutcome(set, episode, { reasonCodes: ['private-verifier-payload-sentinel'] as never })
    await set.patterns.attach(set.backing.facility, set.outcomes)
    const files = await readdir(join(set.backing.root, 'risk_advisor_pattern', 'revisions'))
    const persisted = (await Promise.all(files.map(file => readFile(join(set.backing.root, 'risk_advisor_pattern', 'revisions', file), 'utf8')))).join('\n')
    for (const sentinel of ['private-command-sentinel', 'private-verifier-payload-sentinel', 'private-execution', 'sourceExecutionId', 'toolName']) {
      expect(persisted).not.toContain(sentinel)
    }
    expect(createHash('sha256').update('private-command-sentinel').digest('hex')).not.toContain('private-command')
    await close(set)
  })

  it('P15 isolates Pattern open/write/capacity failures from durable Outcome and V1 sources', async () => {
    const episodes = [1, 2, 3].map(index => makeEpisode(`p15-${index}`, { observedAt: Date.UTC(2026, 0, index) }))
    const healthChange = await setup(episodes)
    await seedSuccesses(healthChange, episodes)
    const health = { ready: true }
    const healthBound = new PatternRuntime()
    await healthBound.attach(healthChange.backing.facility, healthChange.outcomes, () => health.ready)
    expect(healthBound.diagnostics.patternIds()).toHaveLength(1)
    health.ready = false
    expect(healthBound.diagnostics.status()).toBe('UNAVAILABLE')
    expect(healthBound.diagnostics.patternIds()).toEqual([])
    expect(healthChange.outcomes.diagnostics.status()).toBe('READY')
    await close({ ...healthChange, patterns: healthBound })

    const openFailure = await setup(episodes)
    await seedSuccesses(openFailure, episodes)
    const absent = new PatternRuntime()
    const noOpen: DomainFacility = { open: async () => { throw new Error('pattern-open-failed') } } as unknown as DomainFacility
    await absent.attach(noOpen, openFailure.outcomes)
    expect(absent.diagnostics.status()).toBe('UNAVAILABLE')
    expect(openFailure.outcomes.diagnostics.status()).toBe('READY')
    await absent.detach()
    await close(openFailure)

    const readFailure = await setup(episodes)
    await seedSuccesses(readFailure, episodes)
    const failingReadFacility = withPatternDomain(readFailure.backing, domain => {
      const table = domain.table('revisions')
      const unreadableTable = new Proxy(table, {
        get(target, property) {
          if (property === 'entries') return () => { throw new Error('pattern-read-failed') }
          const value = Reflect.get(target, property, target) as unknown
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
      return new Proxy(domain, {
        get(target, property) {
          if (property === 'table') return (name: string) => name === 'revisions' ? unreadableTable : target.table(name)
          const value = Reflect.get(target, property, target) as unknown
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    })
    const unreadable = new PatternRuntime()
    await unreadable.attach(failingReadFacility, readFailure.outcomes)
    expect(unreadable.diagnostics.status()).toBe('UNAVAILABLE')
    expect(readFailure.outcomes.diagnostics.status()).toBe('READY')
    await unreadable.detach()
    await close(readFailure)

    const writeFailure = await setup(episodes)
    await seedSuccesses(writeFailure, episodes)
    const failingFacility = withPatternDomain(writeFailure.backing, domain => {
      const table = domain.table('revisions')
      const wrappedTable = new Proxy(table, {
        get(target, property) {
          if (property === 'put') return async () => { throw new Error('pattern-write-failed') }
          const value = Reflect.get(target, property, target) as unknown
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
      return new Proxy(domain, {
        get(target, property) {
          if (property === 'table') return (name: string) => name === 'revisions' ? wrappedTable : target.table(name)
          const value = Reflect.get(target, property, target) as unknown
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    })
    const broken = new PatternRuntime()
    await broken.attach(failingFacility, writeFailure.outcomes)
    expect(broken.diagnostics.status()).toBe('UNAVAILABLE')
    expect(writeFailure.outcomes.diagnostics.status()).toBe('READY')
    const durableBefore = episodes.map(episode => JSON.stringify(writeFailure.outcomes.diagnostics.revisions(episode.episodeId)))
    await broken.detach()
    const repaired = new PatternRuntime()
    await repaired.attach(writeFailure.backing.facility, writeFailure.outcomes)
    expect(repaired.diagnostics.patternIds()).toHaveLength(1)
    expect(episodes.map(episode => JSON.stringify(writeFailure.outcomes.diagnostics.revisions(episode.episodeId)))).toEqual(durableBefore)
    await repaired.detach()
    await writeFailure.outcomes.detach()
    await writeFailure.backing.close()

    const closeFailure = await setup(episodes)
    await seedSuccesses(closeFailure, episodes)
    const closeFailingFacility = withPatternDomain(closeFailure.backing, domain => new Proxy(domain, {
      get(target, property) {
        if (property === 'close') return async () => { await target.close(); throw new Error('pattern-close-failed') }
        const value = Reflect.get(target, property, target) as unknown
        return typeof value === 'function' ? value.bind(target) : value
      },
    }))
    const closeRuntime = new PatternRuntime()
    await closeRuntime.attach(closeFailingFacility, closeFailure.outcomes)
    expect(closeRuntime.diagnostics.status()).toBe('READY')
    await closeRuntime.detach()
    expect(closeRuntime.diagnostics.status()).toBe('UNAVAILABLE')
    expect(closeFailure.outcomes.diagnostics.status()).toBe('READY')
    await close(closeFailure)

    const capped = await setup(episodes)
    await seedSuccesses(capped, episodes)
    const capFacility = withPatternDomain(capped.backing, domain => {
      const table = domain.table('revisions')
      const cappedTable = new Proxy(table, {
        get(target, property) {
          if (property === 'size') return MAX_PATTERN_REVISIONS
          const value = Reflect.get(target, property, target) as unknown
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
      return new Proxy(domain, {
        get(target, property) {
          if (property === 'table') return (name: string) => name === 'revisions' ? cappedTable : target.table(name)
          const value = Reflect.get(target, property, target) as unknown
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    })
    const capacity = new PatternRuntime()
    await capacity.attach(capFacility, capped.outcomes)
    expect(capacity.diagnostics.status()).toBe('CAPACITY_EXCEEDED')
    expect(capped.outcomes.diagnostics.status()).toBe('READY')
    await capacity.detach()
    await close(capped)

    const provenanceEpisodes = [...episodes, makeEpisode('p15-provenance-extra', { observedAt: Date.UTC(2026, 0, 4) })]
    const provenance = await setup(provenanceEpisodes)
    await seedSuccesses(provenance, provenanceEpisodes.slice(0, 3))
    await provenance.patterns.attach(provenance.backing.facility, provenance.outcomes)
    const provenanceId = qualifiedId(provenance)
    const provenanceRuntime = provenance.patterns as unknown as { provenanceReferences: number }
    provenanceRuntime.provenanceReferences = MAX_PATTERN_PROVENANCE_REFERENCES
    await recordOutcome(provenance, provenanceEpisodes[3]!)
    expect(provenance.patterns.diagnostics.status()).toBe('CAPACITY_EXCEEDED')
    expect(provenance.patterns.diagnostics.revisions(provenanceId)).toHaveLength(1)
    expect(provenance.outcomes.diagnostics.status()).toBe('READY')
    await close(provenance)
  })

  it('P16 subscribes before snapshot reconciliation, drains handoffs, and closes cleanly', async () => {
    const episodes = [1, 2, 3].map(index => makeEpisode(`p16-${index}`, { observedAt: Date.UTC(2026, 0, index) }))
    const set = await setup(episodes)
    let enteredOpen!: () => void
    let releaseOpen!: () => void
    const entered = new Promise<void>(resolve => { enteredOpen = resolve })
    const gate = new Promise<void>(resolve => { releaseOpen = resolve })
    const open = set.backing.facility.open.bind(set.backing.facility) as (spec: unknown) => Promise<unknown>
    const delayedFacility = {
      async open(spec: unknown) {
        const handle = await open(spec)
        if ((spec as { name?: string }).name === 'risk_advisor_pattern') {
          enteredOpen()
          await gate
        }
        return handle
      },
    } as unknown as DomainFacility
    const attach = set.patterns.attach(delayedFacility, set.outcomes)
    await entered
    for (const episode of episodes) {
      set.outcomes.observeVerification(verification(episode))
      await set.outcomes.drain()
    }
    releaseOpen()
    await attach
    expect(currentPatterns(set)).toMatchObject([{ state: 'QUALIFIED', supportCount: 3 }])
    const id = qualifiedId(set)
    const revisionCount = set.patterns.diagnostics.revisions(id).length
    await set.patterns.detach()
    expect(set.outcomes.diagnostics.status()).toBe('READY')
    const reopened = new PatternRuntime()
    await reopened.attach(set.backing.facility, set.outcomes)
    set.outcomes.observeVerification(verification(episodes[0]!, { status: 'UNKNOWN', semanticSuccess: 'unknown' }))
    await set.outcomes.drain()
    await reopened.drain()
    expect(reopened.diagnostics.revisions(id)).toHaveLength(revisionCount + 1)
    await reopened.detach()
    await set.outcomes.detach()
    await set.backing.close()

    const overflowEpisodes = Array.from({ length: MAX_PATTERN_PENDING_OUTCOME_HANDOFFS + 1 }, (_, index) => makeEpisode(`p16-overflow-${index}`, {
      observedAt: Date.UTC(2026, 0, index + 1),
    }))
    const overflow = await setup(overflowEpisodes)
    let releaseOverflow!: () => void
    let enteredOverflow!: () => void
    const overflowEntered = new Promise<void>(resolve => { enteredOverflow = resolve })
    const overflowGate = new Promise<void>(resolve => { releaseOverflow = resolve })
    const overflowOpen = overflow.backing.facility.open.bind(overflow.backing.facility) as (spec: unknown) => Promise<unknown>
    const overflowFacility = {
      async open(spec: unknown) {
        const handle = await overflowOpen(spec)
        if ((spec as { name?: string }).name === 'risk_advisor_pattern') {
          enteredOverflow()
          await overflowGate
        }
        return handle
      },
    } as unknown as DomainFacility
    const overflowAttach = overflow.patterns.attach(overflowFacility, overflow.outcomes)
    await overflowEntered
    for (const episode of overflowEpisodes) {
      overflow.outcomes.observeVerification(verification(episode))
      await overflow.outcomes.drain()
    }
    releaseOverflow()
    await overflowAttach
    expect(overflow.patterns.diagnostics.status()).toBe('UNAVAILABLE')
    expect(overflow.outcomes.diagnostics.status()).toBe('READY')
    await close(overflow)
  }, 30_000)

  it('P15 classifies frozen Pattern bounds before schema parsing and does not append an oversized delta', async () => {
    const episodes = [1, 2, 3].map(index => makeEpisode(`p15-delta-${index}`, { observedAt: Date.UTC(2026, 0, index) }))
    const set = await setup(episodes)
    await seedSuccesses(set, episodes)
    await set.patterns.attach(set.backing.facility, set.outcomes)
    const patternId = qualifiedId(set)
    const baseRevision = set.patterns.diagnostics.revisions(patternId)[0]!
    await set.patterns.detach()

    const syntheticRef = (index: number) => {
      const digest = createHash('sha256').update(`p15-capacity-${index}`).digest('hex')
      return {
        episodeId: `ra-episode-v1_${digest}`,
        outcomeRevisionId: `ra-outcome-v1_${digest}_00000001`,
      }
    }
    const oversizedRefs = Array.from({ length: MAX_PATTERN_DELTA_REFERENCES_PER_ARRAY + 1 }, (_, index) => syntheticRef(index))
    const malformedCapacityRows: readonly (readonly [string, unknown])[] = [
      ...(['supportAdded', 'supportRemoved', 'contradictionsAdded', 'triggerRefs'] as const).map(field => [field, oversizedRefs] as const),
      ...(['supportCount', 'supportUtcDateCount', 'contradictionEpisodeCount'] as const).map(field => [field, MAX_PATTERN_DELTA_REFERENCES_PER_ARRAY + 1] as const),
      ['revisionNumber', MAX_PATTERN_REVISIONS + 1],
    ]

    for (const [field, value] of malformedCapacityRows) {
      const candidate = { ...baseRevision, [field]: value }
      let writes = 0
      const candidateFacility = withPatternDomain(set.backing, domain => {
        const table = domain.table('revisions')
        const candidateTable = new Proxy(table, {
          get(target, property) {
            if (property === 'entries') return () => [[baseRevision.revisionId, candidate] as [string, unknown]][Symbol.iterator]()
            if (property === 'put') return async (key: string, row: unknown) => {
              writes += 1
              await target.put(key, row as VerifiedExperiencePatternRevisionV1)
            }
            const result = Reflect.get(target, property, target) as unknown
            return typeof result === 'function' ? result.bind(target) : result
          },
        })
        return new Proxy(domain, {
          get(target, property) {
            if (property === 'table') return (name: string) => name === 'revisions' ? candidateTable : target.table(name)
            const result = Reflect.get(target, property, target) as unknown
            return typeof result === 'function' ? result.bind(target) : result
          },
        })
      })
      const reader = new PatternRuntime()
      await reader.attach(candidateFacility, set.outcomes)
      expect(reader.diagnostics.status(), field).toBe('CAPACITY_EXCEEDED')
      expect(writes, `${field} must not be rewritten during failed open`).toBe(0)
      await reader.detach()
    }

    const appendPatterns = new PatternRuntime()
    const appendSet = { ...set, patterns: appendPatterns }
    await appendPatterns.attach(set.backing.facility, set.outcomes)
    const internals = appendPatterns as unknown as {
      readonly projections: Map<string, { readonly support: Map<string, { episodeId: string; outcomeRevisionId: string }> }>
    }
    const projection = internals.projections.get(patternId)
    if (projection === undefined) throw new Error('expected the Pattern projection to be restored')
    for (let index = 0; index < MAX_PATTERN_DELTA_REFERENCES_PER_ARRAY; index += 1) {
      const ref = syntheticRef(index)
      projection.support.set(ref.episodeId, ref)
    }

    await recordOutcome(appendSet, episodes[0]!, { status: 'UNKNOWN', semanticSuccess: 'unknown' })
    expect(appendPatterns.diagnostics.status()).toBe('CAPACITY_EXCEEDED')
    expect(appendPatterns.diagnostics.reasonCodes()).toContain('pattern-supportRemoved-capacity-exceeded')
    expect(appendPatterns.diagnostics.revisions(patternId)).toHaveLength(1)
    expect(set.outcomes.diagnostics.status()).toBe('READY')
    await appendPatterns.detach()

    const durable = await set.backing.facility.open(patternDomainSpec)
    const durableRows = [...durable.table('revisions').entries()]
    expect(durableRows).toHaveLength(1)
    expect(durableRows[0]).toEqual([baseRevision.revisionId, baseRevision])
    await durable.close()
    await set.outcomes.detach()
    await set.backing.close()
  }, 30_000)

  it('P17 keeps Pattern internal to Host and leaves risk, approval, browser, and execution paths untouched', async () => {
    expect(patternDomainSpec.name).toBe('risk_advisor_pattern')
    expect(patternDomainSpec.version).toBe(1)
    expect(MAX_PATTERN_REVISIONS).toBe(300_000)
    expect(PatternRuntime.prototype).not.toHaveProperty('invalidate')
    expect(PatternRuntime.prototype).not.toHaveProperty('toGuidance')
    expect(PatternRuntime.prototype).not.toHaveProperty('applyRisk')
  })
})
