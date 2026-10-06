import { existsSync } from 'node:fs'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { ExperienceRuntime, createExperienceEpisode } from '../src/host/experience-store.ts'
import { experienceEpisodeKey } from '../src/host/experience-schema.ts'
import { ExpectedEffectRegistry } from '../src/host/expected-effect.ts'
import { MAX_OUTCOME_EPISODE_REVISIONS, MAX_OUTCOME_REVISIONS, outcomeDomainSpec, outcomeRevisionKey, outcomeRevisionSchema } from '../src/host/outcome-schema.ts'
import type { OutcomeRevisionV1 } from '../src/host/outcome-schema.ts'
import { OutcomeRuntime, qualifyOutcome } from '../src/host/outcome-store.ts'
import { PostconditionVerifier } from '../src/host/postcondition-verifier.ts'
import type { VerificationRecordV1, VerificationStatus } from '../src/host/verification-store.ts'
import {
  createExecutionFixture,
  createJsonStorageFixture,
  failureResult,
  observeApproval,
  successResult,
} from './p11-1-experience-fixtures.ts'
import type { ExecutionFixture, JsonStorageFixture } from './p11-1-experience-fixtures.ts'
import type { ToolExecutionResult } from '@deepseek-ai/dsh-tools'

const tempRoots: string[] = []

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function storage(root?: string): Promise<JsonStorageFixture> {
  const fixture = await createJsonStorageFixture(root)
  if (!tempRoots.includes(fixture.root)) tempRoots.push(fixture.root)
  return fixture
}

interface Pair {
  readonly experience: ExperienceRuntime
  readonly outcomes: OutcomeRuntime
}

function pairFor(execution: ExecutionFixture): Pair {
  const outcomes = new OutcomeRuntime()
  const experience = new ExperienceRuntime(execution.rules.diagnostics, execution.failureChain.diagnostics, {
    onCommitted: episode => outcomes.observeEpisodeCommitted(episode),
    onCommitFailed: id => outcomes.observeEpisodeCommitFailed(id),
  })
  return { experience, outcomes }
}

async function attachPair(pair: Pair, backing: JsonStorageFixture): Promise<void> {
  await pair.experience.attach(backing.facility)
  await pair.experience.drain()
  await pair.outcomes.attach(backing.facility, pair.experience.snapshotEpisodes())
}

async function closePair(pair: Pair, backing: JsonStorageFixture): Promise<void> {
  pair.experience.stopAccepting()
  await pair.experience.drain()
  await pair.outcomes.detach()
  await pair.experience.detach()
  await backing.close()
}

function verification(
  execution: ExecutionFixture,
  status: VerificationStatus = 'MATCHED',
  options: Partial<Pick<VerificationRecordV1, 'source' | 'adapterId' | 'semanticSuccess' | 'evidenceQuality' | 'reasonCodes' | 'observedAt' | 'durationMs'>> = {},
): VerificationRecordV1 {
  return {
    schemaVersion: 1,
    executionId: execution.executionId,
    source: options.source ?? 'known-adapter',
    adapterId: options.adapterId ?? 'shell.mkdir.v1',
    status,
    semanticSuccess: options.semanticSuccess ?? (status === 'MATCHED' ? true : status === 'MISMATCHED' ? false : 'unknown'),
    evidenceQuality: options.evidenceQuality ?? 'medium',
    reasonCodes: options.reasonCodes ?? [status === 'MATCHED' ? 'POSTCONDITION_MATCHED' : status === 'MISMATCHED' ? 'POSTCONDITION_MISMATCH' : 'VERIFIER_RESULT_UNSUPPORTED'],
    observedAt: options.observedAt ?? 1_800_000_000_000,
    durationMs: options.durationMs ?? 3,
  }
}

async function settle(
  execution: ExecutionFixture,
  pair: Pair,
  result: ToolExecutionResult = successResult(),
  beforeEpisode?: () => void,
): Promise<void> {
  execution.failureChain.observeResult(execution.exec, result)
  beforeEpisode?.()
  pair.experience.observeResult(execution.exec, result, execution.index, execution.executionId)
  execution.index.observeResult(execution.exec, result)
  await pair.experience.drain()
  await pair.outcomes.drain()
}

async function waitForRevision(pair: Pair, episodeId: string, count = 1): Promise<OutcomeRevisionV1> {
  await vi.waitFor(() => expect(pair.outcomes.diagnostics.revisions(episodeId)).toHaveLength(count))
  return pair.outcomes.diagnostics.current(episodeId)!
}

function episodeFor(execution: ExecutionFixture, result: ToolExecutionResult = successResult()): ReturnType<typeof createExperienceEpisode> {
  return createExperienceEpisode({
    executionId: execution.executionId,
    exec: execution.exec,
    result,
    observations: execution.index.snapshotObservations(),
    rules: execution.rules.diagnostics,
    failureChain: execution.failureChain.diagnostics,
    now: 1_800_000_000_000,
    platform: 'darwin',
  })
}

function revision(episodeId: string, revisionNumber: number): OutcomeRevisionV1 {
  return outcomeRevisionSchema.parse({
    schemaVersion: 1,
    revisionId: outcomeRevisionKey(episodeId, revisionNumber),
    episodeId,
    revisionNumber,
    ...(revisionNumber === 1 ? {} : { previousRevisionId: outcomeRevisionKey(episodeId, revisionNumber - 1) }),
    revisionKind: revisionNumber === 1 ? 'INITIAL' : 'POSTCONDITION_UPDATE',
    status: 'UNKNOWN',
    ruleId: 'outcome-v1-no-evidence',
    recordedAt: 1_800_000_000_000 + revisionNumber,
    reasonCodes: ['VERIFIER_EVIDENCE_ABSENT'],
  })
}

function fakeOutcomeFacility(options: {
  readonly seed?: readonly OutcomeRevisionV1[]
  readonly size?: number
  readonly open?: () => Promise<never>
  readonly entries?: () => IterableIterator<[string, OutcomeRevisionV1]>
  readonly put?: (key: string, value: OutcomeRevisionV1) => Promise<void>
  readonly read?: () => void
  readonly close?: () => Promise<void>
} = {}) {
  const records = new Map((options.seed ?? []).map(item => [item.revisionId, item]))
  const calls = { puts: 0, closes: 0 }
  const table = {
    get(key: string) { return records.get(key) },
    entries() {
      options.read?.()
      return options.entries?.() ?? [...records.entries()][Symbol.iterator]()
    },
    keys() { return [...records.keys()][Symbol.iterator]() },
    get size() { return options.size ?? records.size },
    async put(key: string, value: OutcomeRevisionV1) {
      calls.puts += 1
      await options.put?.(key, value)
      records.set(key, value)
    },
    async delete(key: string) { return records.delete(key) },
    async update(key: string, fn: (current: OutcomeRevisionV1) => OutcomeRevisionV1) {
      const next = fn(records.get(key)!)
      records.set(key, next)
      return next
    },
  }
  const domain = {
    name: 'risk_advisor_outcome',
    table() { return table },
    async close() { calls.closes += 1; await options.close?.() },
  }
  const facility = {
    async open() {
      if (options.open !== undefined) return options.open()
      return domain
    },
  } as unknown as DomainFacility
  return { facility, records, calls }
}

describe('Phase 11.2 Outcome qualification and append-only revisions', () => {
  it('O1/O2 qualifies only supported matched/true and mismatched/false verifier pairs', async () => {
    for (const [status, semanticSuccess, expected] of [
      ['MATCHED', true, 'VERIFIED_SUCCESS'],
      ['MISMATCHED', false, 'VERIFIED_FAILURE'],
    ] as const) {
      for (const evidenceQuality of ['high', 'medium'] as const) {
        const backing = await storage()
        const execution = createExecutionFixture()
        const pair = pairFor(execution)
        await attachPair(pair, backing)
        const record = verification(execution, status, { semanticSuccess, evidenceQuality })
        await settle(execution, pair, successResult(), () => pair.outcomes.observeVerification(record))
        const episode = pair.experience.snapshotEpisodes()[0]!
        const current = await waitForRevision(pair, episode.episodeId)
        expect(current.status).toBe(expected)
        expect(current.postconditionEvidence).toMatchObject({ status, semanticSuccess, evidenceQuality })
        await closePair(pair, backing)
      }
    }
  })

  it('O3/O4 keeps absent, unsupported, low-quality, mismatched-pair, and process-only evidence UNKNOWN', async () => {
    const execution = createExecutionFixture()
    const episode = episodeFor(execution)
    const cases = [
      undefined,
      { source: 'known-adapter', adapterId: 'vendor.unknown.v9', status: 'MATCHED', semanticSuccess: true, evidenceQuality: 'high', reasonCodes: ['POSTCONDITION_MATCHED'], observedAt: 1, durationMs: 1 },
      { source: 'known-adapter', adapterId: 'shell.mkdir.v1', status: 'MATCHED', semanticSuccess: true, evidenceQuality: 'low', reasonCodes: ['POSTCONDITION_MATCHED'], observedAt: 1, durationMs: 1 },
      { source: 'known-adapter', adapterId: 'shell.mkdir.v1', status: 'UNKNOWN', semanticSuccess: 'unknown', evidenceQuality: 'low', reasonCodes: ['VERIFIER_RESULT_UNSUPPORTED'], observedAt: 1, durationMs: 1 },
      { source: 'known-adapter', adapterId: 'shell.mkdir.v1', status: 'UNAVAILABLE', semanticSuccess: 'unknown', evidenceQuality: 'low', reasonCodes: ['VERIFIER_CAPABILITY_UNAVAILABLE'], observedAt: 1, durationMs: 1 },
      { source: 'known-adapter', adapterId: 'shell.mkdir.v1', status: 'MATCHED', semanticSuccess: false, evidenceQuality: 'high', reasonCodes: ['RESULT_SHAPE_UNSUPPORTED'], observedAt: 1, durationMs: 1 },
      { source: 'tool-contract', adapterId: 'shell.mkdir.v1', status: 'MATCHED', semanticSuccess: true, evidenceQuality: 'high', reasonCodes: ['POSTCONDITION_MATCHED'], observedAt: 1, durationMs: 1 },
    ] as const
    for (const raw of cases) {
      const evidence = raw === undefined ? undefined : raw as unknown as NonNullable<OutcomeRevisionV1['postconditionEvidence']>
      expect(qualifyOutcome(episode, evidence).status).toBe('UNKNOWN')
    }
    expect(qualifyOutcome(episodeFor(execution, successResult()), undefined).status).toBe('UNKNOWN')
    expect(qualifyOutcome(episodeFor(execution, failureResult()), undefined).status).toBe('UNKNOWN')
  })

  it('O5 does not turn approval decisions into goal outcomes; only the exact pre-dispatch code yields NOT_EXECUTED', async () => {
    for (const outcome of ['allowed-once', 'rejected', 'cancelled', 'unavailable'] as const) {
      const backing = await storage()
      const execution = createExecutionFixture()
      const pair = pairFor(execution)
      await attachPair(pair, backing)
      observeApproval(execution, outcome)
      await settle(execution, pair, outcome === 'allowed-once' ? successResult() : failureResult({ code: 'TOOL_ERROR' }))
      const episode = pair.experience.snapshotEpisodes()[0]!
      expect(pair.outcomes.diagnostics.current(episode.episodeId)?.status).toBe('UNKNOWN')
      await closePair(pair, backing)
    }
    const execution = createExecutionFixture()
    expect(qualifyOutcome(episodeFor(execution, failureResult({ code: 'ABORTED_BEFORE_DISPATCH' })), undefined).status).toBe('NOT_EXECUTED')
  })

  it('O6 never changes the Episode when later verifier evidence appends a revision', async () => {
    const backing = await storage()
    const execution = createExecutionFixture()
    const pair = pairFor(execution)
    await attachPair(pair, backing)
    await settle(execution, pair)
    const episode = pair.experience.snapshotEpisodes()[0]!
    const before = JSON.stringify(episode)
    pair.outcomes.observeVerification(verification(execution))
    await waitForRevision(pair, episode.episodeId, 2)
    expect(JSON.stringify(pair.experience.diagnostics.get(episode.episodeId))).toBe(before)
    await closePair(pair, backing)
  })

  it('O7 includes a synchronous tool-contract verifier callback in revision 1 after Episode durability', async () => {
    const backing = await storage()
    const execution = createExecutionFixture({ name: 'write', arguments: { file_path: '/private/path', content: 'expected content' } })
    const outcomes = new OutcomeRuntime()
    const registry = new ExpectedEffectRegistry()
    const episodePath = join(backing.root, 'risk_advisor_experience', 'episodes', `${experienceEpisodeKey(execution.executionId)}.json`)
    let verifierArrivedBeforeEpisode = false
    let durableAtEpisodeAcknowledgement = false
    const verifier = new PostconditionVerifier(registry, {
      onRecord: item => {
        verifierArrivedBeforeEpisode = !existsSync(episodePath)
        outcomes.observeVerification(item)
      },
    })
    const experience = new ExperienceRuntime(execution.rules.diagnostics, execution.failureChain.diagnostics, {
      onCommitted: episode => {
        durableAtEpisodeAcknowledgement = existsSync(episodePath)
        outcomes.observeEpisodeCommitted(episode)
      },
      onCommitFailed: id => outcomes.observeEpisodeCommitFailed(id),
    })
    await experience.attach(backing.facility)
    await experience.drain()
    await outcomes.attach(backing.facility, experience.snapshotEpisodes())
    registry.capture(execution.exec, execution.executionId)
    const result = successResult({ after: 'expected content', before: null, path: '/private/path', operation: 'create' })
    execution.failureChain.observeResult(execution.exec, result)
    verifier.observeResult(execution.exec, result)
    experience.observeResult(execution.exec, result, execution.index, execution.executionId)
    execution.index.observeResult(execution.exec, result)
    await experience.drain()
    await outcomes.drain()
    const episode = experience.snapshotEpisodes()[0]!
    expect(outcomes.diagnostics.revisions(episode.episodeId)).toHaveLength(1)
    expect(outcomes.diagnostics.current(episode.episodeId)).toMatchObject({ status: 'VERIFIED_SUCCESS', revisionKind: 'INITIAL' })
    expect(verifierArrivedBeforeEpisode).toBe(true)
    expect(durableAtEpisodeAcknowledgement).toBe(true)
    await verifier.dispose()
    experience.stopAccepting()
    await experience.drain()
    await outcomes.detach()
    await experience.detach()
    await backing.close()
  })

  it('O8 appends a linked revision for late shell verification and retains only read-only reserved enum vocabulary', async () => {
    const backing = await storage()
    const execution = createExecutionFixture({
      name: 'bash',
      arguments: { command: 'mkdir -p p11-late-outcome-target', description: 'late outcome verifier' },
    })
    const outcomes = new OutcomeRuntime()
    const registry = new ExpectedEffectRegistry()
    const started = Promise.withResolvers<void>()
    const shellResult = Promise.withResolvers<{ exitCode: number; stdout: { text: string; truncated: boolean }; stderr: { text: string; truncated: boolean } }>()
    const verifier = new PostconditionVerifier(registry, { onRecord: item => outcomes.observeVerification(item) })
    const experience = new ExperienceRuntime(execution.rules.diagnostics, execution.failureChain.diagnostics, {
      onCommitted: episode => outcomes.observeEpisodeCommitted(episode),
      onCommitFailed: id => outcomes.observeEpisodeCommitFailed(id),
    })
    await experience.attach(backing.facility)
    await experience.drain()
    await outcomes.attach(backing.facility, experience.snapshotEpisodes())
    verifier.attach({
      resolve: (request: Record<string, unknown>) => request,
      run: async () => { started.resolve(); return await shellResult.promise },
    })
    registry.capture(execution.exec, execution.executionId)
    const result = successResult({ kind: 'foreground', exitCode: 0 })
    execution.failureChain.observeResult(execution.exec, result)
    verifier.observeResult(execution.exec, result)
    experience.observeResult(execution.exec, result, execution.index, execution.executionId)
    execution.index.observeResult(execution.exec, result)
    await experience.drain()
    const episode = experience.snapshotEpisodes()[0]!
    await waitForRevision({ experience, outcomes }, episode.episodeId)
    expect(outcomes.diagnostics.current(episode.episodeId)?.status).toBe('UNKNOWN')
    await started.promise
    shellResult.resolve({ exitCode: 0, stdout: { text: 'MATCHED', truncated: false }, stderr: { text: '', truncated: false } })
    await vi.waitFor(() => expect(outcomes.diagnostics.revisions(episode.episodeId)).toHaveLength(2))
    const history = outcomes.diagnostics.revisions(episode.episodeId)
    expect(history.map(item => item.status)).toEqual(['UNKNOWN', 'VERIFIED_SUCCESS'])
    expect(history[1]).toMatchObject({ revisionKind: 'POSTCONDITION_UPDATE', previousRevisionId: history[0]!.revisionId })
    expect(history[0]!.status).toBe('UNKNOWN')
    expect(['INVALIDATED', 'INVALIDATION', 'REQUALIFICATION']).not.toContain(outcomes.diagnostics.current(episode.episodeId)?.status)
    expect(history.map(item => item.revisionKind)).not.toContain('INVALIDATION')
    expect(history.map(item => item.revisionKind)).not.toContain('REQUALIFICATION')
    expect('invalidate' in outcomes).toBe(false)
    await verifier.dispose()
    experience.stopAccepting()
    await experience.drain()
    await outcomes.detach()
    await experience.detach()
    await backing.close()
  })

  it('O14 fences and drains shell verification before capability close, then accepts a fresh generation', async () => {
    const execution = createExecutionFixture({ name: 'bash', arguments: { command: 'mkdir -p p11-fence-target' } })
    const registry = new ExpectedEffectRegistry()
    const verifier = new PostconditionVerifier(registry)
    const started = Promise.withResolvers<void>()
    const blocked = Promise.withResolvers<{ exitCode: number; stdout: { text: string; truncated: boolean }; stderr: { text: string; truncated: boolean } }>()
    let runs = 0
    verifier.attach({
      resolve: (request: Record<string, unknown>) => request,
      run: async () => {
        runs += 1
        if (runs === 1) { started.resolve(); return await blocked.promise }
        return { exitCode: 0, stdout: { text: 'MATCHED', truncated: false }, stderr: { text: '', truncated: false } }
      },
    })
    registry.capture(execution.exec, execution.executionId)
    verifier.observeResult(execution.exec, successResult({ kind: 'foreground', exitCode: 0 }))
    await started.promise
    const fenced = verifier.fenceAndDrain()
    expect(verifier.store.diagnostics.get(execution.executionId)?.reasonCodes).toEqual(['VERIFIER_ABORTED'])
    let drained = false
    void fenced.then(() => { drained = true })
    await Promise.resolve()
    expect(drained).toBe(false)
    blocked.resolve({ exitCode: 0, stdout: { text: 'MATCHED', truncated: false }, stderr: { text: '', truncated: false } })
    await fenced
    expect(drained).toBe(true)
    expect(verifier.store.diagnostics.get(execution.executionId)?.reasonCodes).toEqual(['VERIFIER_ABORTED'])

    const next = createExecutionFixture({ name: 'bash', arguments: { command: 'mkdir -p p11-fence-target-2' } })
    registry.capture(next.exec, next.executionId)
    verifier.observeResult(next.exec, successResult({ kind: 'foreground', exitCode: 0 }))
    await vi.waitFor(() => expect(verifier.store.diagnostics.get(next.executionId)?.status).toBe('MATCHED'))
    await verifier.dispose()
  })

  it('O9 records verifier conflict as UNKNOWN without overwrite or invalidation', async () => {
    const backing = await storage()
    const execution = createExecutionFixture()
    const pair = pairFor(execution)
    await attachPair(pair, backing)
    await settle(execution, pair)
    const episode = pair.experience.snapshotEpisodes()[0]!
    pair.outcomes.observeVerification(verification(execution, 'MATCHED'))
    await waitForRevision(pair, episode.episodeId, 2)
    pair.outcomes.observeVerification(verification(execution, 'MATCHED'))
    await pair.outcomes.drain()
    expect(pair.outcomes.diagnostics.revisions(episode.episodeId)).toHaveLength(2)
    pair.outcomes.observeVerification(verification(execution, 'MISMATCHED', { observedAt: 1_800_000_000_001 }))
    await waitForRevision(pair, episode.episodeId, 3)
    const history = pair.outcomes.diagnostics.revisions(episode.episodeId)
    expect(history.map(item => item.status)).toEqual(['UNKNOWN', 'VERIFIED_SUCCESS', 'UNKNOWN'])
    expect(history[2]).toMatchObject({ ruleId: 'outcome-v1-conflict', revisionKind: 'POSTCONDITION_UPDATE', reasonCodes: ['VERIFICATION_CONFLICT'] })
    expect(JSON.stringify(history)).not.toMatch(/INVALIDATED|INVALIDATION|REQUALIFICATION/)
    expect('invalidate' in pair.outcomes).toBe(false)
    await closePair(pair, backing)
  })

  it('O9 fails closed and preserves a divergent record already occupying the deterministic key', async () => {
    const execution = createExecutionFixture()
    const episode = episodeFor(execution)
    const fake = fakeOutcomeFacility()
    const outcomes = new OutcomeRuntime()
    await outcomes.attach(fake.facility, [])
    const key = outcomeRevisionKey(episode.episodeId, 1)
    const collision = { ...revision(episode.episodeId, 1), recordedAt: 1_700_000_000_000 }
    fake.records.set(key, collision)
    outcomes.observeEpisodeCommitted(episode)
    await vi.waitFor(() => expect(outcomes.diagnostics.status()).toBe('CONFLICTED'))
    expect(fake.records.get(key)).toEqual(collision)
    expect(outcomes.diagnostics.revisions(episode.episodeId)).toEqual([])
    await outcomes.detach()
  })

  it('O10 restores the same ordered, gap-free revision history after durable restart', async () => {
    const first = await storage()
    const execution = createExecutionFixture()
    const pair = pairFor(execution)
    await attachPair(pair, first)
    await settle(execution, pair)
    const episode = pair.experience.snapshotEpisodes()[0]!
    pair.outcomes.observeVerification(verification(execution))
    await waitForRevision(pair, episode.episodeId, 2)
    const before = JSON.stringify(pair.outcomes.diagnostics.revisions(episode.episodeId))
    const root = first.root
    await closePair(pair, first)

    const reopened = await storage(root)
    const second = pairFor(execution)
    await attachPair(second, reopened)
    expect(JSON.stringify(second.outcomes.diagnostics.revisions(episode.episodeId))).toBe(before)
    await closePair(second, reopened)
  })

  it('O10 fails closed on a schema-valid revision chain with a missing predecessor', async () => {
    const backing = await storage()
    const execution = createExecutionFixture()
    const episode = episodeFor(execution)
    const initialOnlyExperience = new ExperienceRuntime(execution.rules.diagnostics, execution.failureChain.diagnostics)
    await initialOnlyExperience.attach(backing.facility)
    initialOnlyExperience.observeResult(execution.exec, successResult(), execution.index, execution.executionId)
    await initialOnlyExperience.drain()
    await initialOnlyExperience.detach()
    const seedDomain = await backing.facility.open(outcomeDomainSpec)
    const gap = revision(episode.episodeId, 2)
    await seedDomain.table('revisions').put(gap.revisionId as never, gap)
    await seedDomain.close()

    const pair = pairFor(execution)
    await pair.experience.attach(backing.facility)
    await pair.experience.drain()
    await pair.outcomes.attach(backing.facility, pair.experience.snapshotEpisodes())
    expect(pair.outcomes.diagnostics.status()).toBe('CONFLICTED')
    expect(pair.outcomes.diagnostics.revisions(episode.episodeId)).toEqual([])
    await pair.experience.detach()
    await pair.outcomes.detach()
    await backing.close()
  })

  it('O10 fails closed on orphan references and malformed forked predecessor lineage', async () => {
    const execution = createExecutionFixture()
    const episode = episodeFor(execution)
    const orphanEpisode = episodeFor(createExecutionFixture())
    const orphan = fakeOutcomeFacility({ seed: [revision(orphanEpisode.episodeId, 1)] })
    const orphanRuntime = new OutcomeRuntime()
    await orphanRuntime.attach(orphan.facility, [episode])
    expect(orphanRuntime.diagnostics.status()).toBe('CONFLICTED')
    await orphanRuntime.detach()

    const forkedRows: [string, OutcomeRevisionV1][] = [
      [outcomeRevisionKey(episode.episodeId, 1), revision(episode.episodeId, 1)],
      [outcomeRevisionKey(episode.episodeId, 3), {
        ...revision(episode.episodeId, 3),
        previousRevisionId: outcomeRevisionKey(episode.episodeId, 1),
      }],
    ]
    const forked = fakeOutcomeFacility({ entries: () => forkedRows[Symbol.iterator]() })
    const forkedRuntime = new OutcomeRuntime()
    await forkedRuntime.attach(forked.facility, [episode])
    expect(['UNAVAILABLE', 'CONFLICTED']).toContain(forkedRuntime.diagnostics.status())
    expect(forkedRuntime.diagnostics.revisions(episode.episodeId)).toEqual([])
    await forkedRuntime.detach()
  })

  it('O11 conservatively recovers a missing first revision and never emits reserved values', async () => {
    const backing = await storage()
    const execution = createExecutionFixture()
    const episode = episodeFor(execution)
    const experienceOnly = new ExperienceRuntime(execution.rules.diagnostics, execution.failureChain.diagnostics)
    await experienceOnly.attach(backing.facility)
    experienceOnly.observeResult(execution.exec, successResult(), execution.index, execution.executionId)
    await experienceOnly.drain()
    await experienceOnly.detach()

    const reopened = new ExperienceRuntime(execution.rules.diagnostics, execution.failureChain.diagnostics)
    const outcomes = new OutcomeRuntime()
    await reopened.attach(backing.facility)
    await outcomes.attach(backing.facility, reopened.snapshotEpisodes())
    expect(outcomes.diagnostics.current(episode.episodeId)).toMatchObject({ revisionKind: 'INITIAL', status: 'UNKNOWN', ruleId: 'outcome-v1-no-evidence' })
    expect(JSON.stringify(outcomes.diagnostics.revisions(episode.episodeId))).not.toMatch(/INVALIDATED|INVALIDATION|REQUALIFICATION/)
    await outcomes.detach()
    await reopened.detach()
    await backing.close()
  })

  it('O12 persists no raw operation payload, execution identity, or approval/session identifiers in Outcome rows', async () => {
    const backing = await storage()
    const execution = createExecutionFixture({
      name: 'bash',
      arguments: {
        command: 'PRIVATE_COMMAND_SENTINEL',
        description: 'PRIVATE_DESCRIPTION_SENTINEL',
        workdir: '/PRIVATE_PATH_SENTINEL',
        prompt: 'PRIVATE_USER_MODEL_CONTENT_SENTINEL',
        secret: 'PRIVATE_CREDENTIAL_SENTINEL',
      },
      callId: 'PRIVATE_CALL_ID_SENTINEL',
      sessionId: 'PRIVATE_SESSION_ID_SENTINEL',
    })
    const pair = pairFor(execution)
    await attachPair(pair, backing)
    observeApproval(execution, 'allowed-once', 'PRIVATE_APPROVAL_ID_SENTINEL')
    execution.index.observeSessionEvent(execution.session, {
      type: 'approval/decided',
      data: { id: 'PRIVATE_APPROVAL_ID_SENTINEL', outcome: 'allowed-once', justification: 'PRIVATE_APPROVAL_JUSTIFICATION_SENTINEL' },
    } as never)
    const privateResult = {
      ...successResult({ stdout: 'PRIVATE_STDOUT_SENTINEL', stderr: 'PRIVATE_STDERR_SENTINEL', body: 'PRIVATE_RESULT_BODY_SENTINEL' }),
      content: [{ type: 'text' as const, text: 'PRIVATE_TOOL_OUTPUT_SENTINEL' }],
    }
    await settle(execution, pair, privateResult)
    const episode = pair.experience.snapshotEpisodes()[0]!
    pair.outcomes.observeVerification(verification(execution))
    const current = await waitForRevision(pair, episode.episodeId, 2)
    const serialized = await readFile(join(backing.root, 'risk_advisor_outcome', 'revisions', `${current.revisionId}.json`), 'utf8')
    for (const sentinel of [
      'PRIVATE_COMMAND_SENTINEL', 'PRIVATE_DESCRIPTION_SENTINEL', 'PRIVATE_PATH_SENTINEL',
      'PRIVATE_CALL_ID_SENTINEL', 'PRIVATE_SESSION_ID_SENTINEL', 'PRIVATE_APPROVAL_ID_SENTINEL',
      'PRIVATE_USER_MODEL_CONTENT_SENTINEL', 'PRIVATE_CREDENTIAL_SENTINEL',
      'PRIVATE_APPROVAL_JUSTIFICATION_SENTINEL', 'PRIVATE_STDOUT_SENTINEL', 'PRIVATE_STDERR_SENTINEL',
      'PRIVATE_RESULT_BODY_SENTINEL', 'PRIVATE_TOOL_OUTPUT_SENTINEL',
      execution.executionId,
    ]) expect(serialized).not.toContain(sentinel)
    expect(JSON.parse(serialized)).toMatchObject({ record: { episodeId: episode.episodeId, status: 'VERIFIED_SUCCESS' } })
    await closePair(pair, backing)
  })

  it('O13 preserves all per-Episode revisions and rejects appends at the 16-row cap', async () => {
    const backing = await storage()
    const execution = createExecutionFixture()
    const pair = pairFor(execution)
    await attachPair(pair, backing)
    await settle(execution, pair)
    const episode = pair.experience.snapshotEpisodes()[0]!
    const original = pair.outcomes.diagnostics.revisions(episode.episodeId)
    for (let index = 1; index < MAX_OUTCOME_EPISODE_REVISIONS; index += 1) {
      pair.outcomes.observeVerification(verification(execution, 'MATCHED', { observedAt: 1_800_000_000_000 + index }))
      await vi.waitFor(() => expect(pair.outcomes.diagnostics.revisions(episode.episodeId)).toHaveLength(index + 1))
    }
    const before = JSON.stringify(pair.outcomes.diagnostics.revisions(episode.episodeId))
    pair.outcomes.observeVerification(verification(execution, 'MISMATCHED', { observedAt: 1_800_000_000_100 }))
    await vi.waitFor(() => expect(pair.outcomes.diagnostics.status()).toBe('CAPACITY_EXCEEDED'))
    expect(pair.outcomes.diagnostics.revisions(episode.episodeId)).toHaveLength(MAX_OUTCOME_EPISODE_REVISIONS)
    expect(JSON.stringify(pair.outcomes.diagnostics.revisions(episode.episodeId))).toBe(before)
    expect(pair.outcomes.diagnostics.revisions(episode.episodeId)[0]).toEqual(original[0])
    await closePair(pair, backing)
  })

  it('O13 refuses writes when the global revision count is at its frozen cap', async () => {
    const execution = createExecutionFixture()
    const episode = episodeFor(execution)
    const fake = fakeOutcomeFacility({ size: MAX_OUTCOME_REVISIONS })
    const outcomes = new OutcomeRuntime()
    await outcomes.attach(fake.facility, [episode])
    outcomes.observeEpisodeCommitted(episode)
    await outcomes.drain()
    expect(outcomes.diagnostics.status()).toBe('CAPACITY_EXCEEDED')
    expect(outcomes.diagnostics.revisionCount()).toBe(MAX_OUTCOME_REVISIONS)
    expect(fake.calls.puts).toBe(0)
    await outcomes.detach()
  })

  it('O14 contains missing/open/read/write failures and drains a pending durable append before close', async () => {
    const execution = createExecutionFixture()
    const episode = episodeFor(execution)
    const absent = new OutcomeRuntime()
    expect(absent.diagnostics.status()).toBe('UNAVAILABLE')

    const openFailure = new OutcomeRuntime()
    await openFailure.attach(fakeOutcomeFacility({ open: async () => { throw new Error('private-open-error') } }).facility, [episode])
    expect(openFailure.diagnostics.status()).toBe('UNAVAILABLE')
    await openFailure.detach()

    const readFailure = new OutcomeRuntime()
    await readFailure.attach(fakeOutcomeFacility({ read: () => { throw new Error('private-read-error') } }).facility, [episode])
    expect(readFailure.diagnostics.status()).toBe('UNAVAILABLE')
    await readFailure.detach()

    const failedWrite = fakeOutcomeFacility({ put: async () => { throw new Error('private-write-error') } })
    const writeRuntime = new OutcomeRuntime()
    await writeRuntime.attach(failedWrite.facility, [])
    writeRuntime.observeEpisodeCommitted(episode)
    await vi.waitFor(() => expect(writeRuntime.diagnostics.reasonCodes()).toEqual(['STORAGE_WRITE_FAILED']))
    await writeRuntime.detach()

    const closeFailure = fakeOutcomeFacility({ close: async () => { throw new Error('private-close-error') } })
    const closeRuntime = new OutcomeRuntime()
    await closeRuntime.attach(closeFailure.facility, [])
    await closeRuntime.detach()
    expect(closeRuntime.diagnostics.status()).toBe('UNAVAILABLE')
    expect(closeRuntime.diagnostics.reasonCodes()).toEqual(['STORAGE_CLOSE_FAILED'])
    expect(closeFailure.calls.closes).toBe(1)

    const gate = Promise.withResolvers<void>()
    const delayed = fakeOutcomeFacility({ put: async () => await gate.promise })
    const draining = new OutcomeRuntime()
    await draining.attach(delayed.facility, [])
    draining.observeEpisodeCommitted(episode)
    await vi.waitFor(() => expect(delayed.calls.puts).toBe(1))
    const close = draining.detach()
    await Promise.resolve()
    expect(delayed.calls.closes).toBe(0)
    gate.resolve()
    await close
    expect(delayed.calls.closes).toBe(1)
    expect(delayed.records.get(outcomeRevisionKey(episode.episodeId, 1))?.status).toBe('UNKNOWN')
    expect(draining.diagnostics.status()).toBe('UNAVAILABLE')
  })
})
