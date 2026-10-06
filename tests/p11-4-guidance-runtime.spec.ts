import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { DomainFacility } from '@deepseek-ai/dsh-storage-domain'
import { experienceDomainSpec, experienceEpisodeKey, experienceEpisodeSchema } from '../src/host/experience-schema.ts'
import type { ExperienceEpisodeId, ExperienceEpisodeV1 } from '../src/host/experience-schema.ts'
import { assertGuidanceRevisionCapacity, guidanceDigestFor, guidanceDomainSpec, guidanceIdFor, guidanceRevisionKey, guidanceRevisionSchema, GuidanceCapacityError, MAX_GUIDANCE_IDENTITIES, MAX_GUIDANCE_PENDING_PATTERN_HANDOFFS, MAX_GUIDANCE_REVISIONS } from '../src/host/guidance-schema.ts'
import type { GuidanceSemanticV1, VerifiedHistoricalGuidanceRevisionV1 } from '../src/host/guidance-schema.ts'
import { GuidanceRuntime } from '../src/host/guidance-store.ts'
import { OutcomeRuntime } from '../src/host/outcome-store.ts'
import type { ExecutionId } from '../src/host/correlation.ts'
import { PatternRuntime } from '../src/host/pattern-store.ts'
import { patternRevisionKey } from '../src/host/pattern-schema.ts'
import type { VerifiedExperiencePatternRevisionV1 } from '../src/host/pattern-schema.ts'
import type { VerificationRecordV1 } from '../src/host/verification-store.ts'
import { createJsonStorageFixture } from './p11-1-experience-fixtures.ts'
import type { JsonStorageFixture } from './p11-1-experience-fixtures.ts'

const roots: string[] = []
const fixtures: Setup[] = []
afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(close))
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

interface Setup {
  readonly backing: JsonStorageFixture
  readonly outcomes: OutcomeRuntime
  readonly patterns: PatternRuntime
  guidance: GuidanceRuntime
  readonly episodes: readonly ExperienceEpisodeV1[]
  closed?: boolean
}

function episode(id: string, observedAt = Date.UTC(2026, 0, Number(id.match(/\d+/)?.[0] ?? 1))): ExperienceEpisodeV1 {
  const sourceExecutionId = `ra-execution-${id}`
  return experienceEpisodeSchema.parse({
    schemaVersion: 1,
    episodeId: experienceEpisodeKey(sourceExecutionId),
    sourceExecutionId,
    observedAt,
    runtime: { platform: 'darwin' },
    operation: {
      toolName: 'guidance-test-tool', kind: 'filesystem-write', parserConfidence: 'high',
      mutating: true, externalEffect: false, networkEffect: 'none', requestedPermission: 'workspace-write',
    },
    approval: { observed: true, outcome: 'allowed-once' },
    terminal: { isError: false },
    retry: { status: 'READY', retryCount: 0, recentFailureCount: 0, sameRootCause: false, permissionEscalation: false },
    provenance: { source: 'LIVE_TOOLS_RESULT', ruleStatus: 'READY', reasonCodes: [] },
  })
}

function verification(
  target: ExperienceEpisodeV1,
  status: VerificationRecordV1['status'] = 'MATCHED',
): VerificationRecordV1 {
  const matched = status === 'MATCHED'
  const mismatched = status === 'MISMATCHED'
  return {
    schemaVersion: 1,
    executionId: target.sourceExecutionId as ExecutionId,
    source: 'known-adapter',
    adapterId: 'shell.mkdir.v1',
    status,
    semanticSuccess: matched ? true : mismatched ? false : 'unknown',
    evidenceQuality: matched || mismatched ? 'medium' : 'low',
    reasonCodes: [matched ? 'POSTCONDITION_MATCHED' : mismatched ? 'POSTCONDITION_MISMATCH' : 'VERIFIER_RESULT_UNSUPPORTED'],
    observedAt: target.observedAt,
    durationMs: 1,
  }
}

async function setup(options: { readonly count?: number; readonly guidance?: boolean; readonly facility?: DomainFacility } = {}): Promise<Setup> {
  const backing = await createJsonStorageFixture(await mkdtemp(join(tmpdir(), 'ra-p11-4-guidance-')))
  roots.push(backing.root)
  const episodes = Object.freeze(Array.from({ length: options.count ?? 5 }, (_, index) => episode(`g-${index + 1}`, Date.UTC(2026, 0, index + 1, 12))))
  const experience = await backing.facility.open(experienceDomainSpec)
  const table = experience.table('episodes')
  for (const value of episodes) await table.put(value.episodeId as ExperienceEpisodeId, value)
  await experience.close()
  const outcomes = new OutcomeRuntime()
  await outcomes.attach(backing.facility, episodes)
  await outcomes.drain()
  const patterns = new PatternRuntime()
  await patterns.attach(backing.facility, outcomes)
  const result: Setup = { backing, outcomes, patterns, guidance: new GuidanceRuntime(), episodes }
  fixtures.push(result)
  if (options.guidance !== false) await result.guidance.attach(options.facility ?? backing.facility, patterns)
  return result
}

async function record(set: Setup, target: ExperienceEpisodeV1, status: VerificationRecordV1['status'] = 'MATCHED', drainGuidance = true): Promise<void> {
  set.outcomes.observeVerification(verification(target, status))
  await set.outcomes.drain()
  await set.patterns.drain()
  if (drainGuidance) await set.guidance.drain()
}

async function qualify(set: Setup, count = 3): Promise<void> {
  for (const target of set.episodes.slice(0, count)) await record(set, target)
}

async function close(set: Setup): Promise<void> {
  if (set.closed) return
  set.closed = true
  await set.patterns.drain()
  await set.guidance.detach()
  await set.patterns.detach()
  await set.outcomes.detach()
  await set.backing.close()
}

function currentPattern(set: Setup) {
  const id = set.patterns.diagnostics.patternIds()[0]
  if (id === undefined) throw new Error('missing pattern')
  return set.patterns.diagnostics.current(id)!
}

function currentGuidance(set: Setup): VerifiedHistoricalGuidanceRevisionV1 | undefined {
  return set.guidance.diagnostics.currentForPattern(currentPattern(set).patternId)
}

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

function wrapOpen(
  base: DomainFacility,
  domainName: string,
  transform: (domain: unknown) => unknown,
): DomainFacility {
  const open = base.open.bind(base) as (spec: { readonly name?: string }) => Promise<unknown>
  return { async open(spec: { readonly name?: string }) {
    const domain = await open(spec)
    return spec.name === domainName ? transform(domain) : domain
  } } as unknown as DomainFacility
}

function withGuidanceGate(base: DomainFacility, gate: { readonly entered: () => void; readonly release: Promise<void> }): DomainFacility {
  const open = base.open.bind(base) as (spec: { readonly name?: string }) => Promise<unknown>
  return { async open(spec: { readonly name?: string }) {
    if (spec.name === 'risk_advisor_guidance') { gate.entered(); await gate.release }
    return open(spec)
  } } as unknown as DomainFacility
}

function withGuidancePutGate(base: DomainFacility, gate: { readonly entered: () => void; readonly release: Promise<void> }): DomainFacility {
  return wrapOpen(base, 'risk_advisor_guidance', domain => {
    const table = (domain as { table(name: string): Record<string, unknown> }).table('revisions')
    let puts = 0
    const wrappedTable = new Proxy(table, {
      get(target, property) {
        if (property === 'put') return async (key: string, value: unknown) => {
          puts += 1
          if (puts >= 1) { gate.entered(); await gate.release }
          return (target.put as (key: string, value: unknown) => Promise<void>).call(target, key, value)
        }
        const value = Reflect.get(target, property, target) as unknown
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    return new Proxy(domain as object, {
      get(target, property) {
        if (property === 'table') return (name: string) => name === 'revisions' ? wrappedTable : (domain as { table(name: string): unknown }).table(name)
        const value = Reflect.get(target, property, target) as unknown
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
  })
}

function withGuidancePutCounter(base: DomainFacility, counter: { value: number }): DomainFacility {
  return wrapOpen(base, 'risk_advisor_guidance', domain => {
    const table = (domain as { table(name: string): Record<string, unknown> }).table('revisions')
    const wrappedTable = new Proxy(table, {
      get(target, property) {
        if (property === 'put') return async (key: string, value: unknown) => {
          counter.value += 1
          return (target.put as (key: string, value: unknown) => Promise<void>).call(target, key, value)
        }
        const value = Reflect.get(target, property, target) as unknown
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    return new Proxy(domain as object, {
      get(target, property) {
        if (property === 'table') return (name: string) => name === 'revisions' ? wrappedTable : (domain as { table(name: string): unknown }).table(name)
        const value = Reflect.get(target, property, target) as unknown
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
  })
}

describe('Phase 11.4 Verified Historical Guidance G1–G20', () => {
  it('G1 exposes no Guidance when Pattern is absent, unavailable, or not READY', async () => {
    const noSource = new GuidanceRuntime()
    await noSource.attach({ open: async () => { throw new Error('must-not-open') } } as unknown as DomainFacility, new PatternRuntime())
    expect(noSource.diagnostics.status()).toBe('UNAVAILABLE')
    expect(noSource.diagnostics.currentForPattern('ra-pattern-v1_' + 'a'.repeat(64))).toBeUndefined()
    const set = await setup({ guidance: false })
    await set.guidance.attach(set.backing.facility, set.patterns)
    expect(set.guidance.diagnostics.status()).toBe('READY')
    expect(set.guidance.diagnostics.guidanceIds()).toEqual([])
    await set.patterns.detach()
    expect(set.guidance.diagnostics.currentForPattern('ra-pattern-v1_' + 'a'.repeat(64))).toBeUndefined()
    expect(set.guidance.diagnostics.status()).toBe('UNAVAILABLE')
  })

  it('G2 creates Guidance only from a qualified durable Pattern, never from isolated E/O facts', async () => {
    const set = await setup()
    expect(set.outcomes.diagnostics.revisionCount()).toBeGreaterThan(0)
    expect(set.guidance.diagnostics.guidanceIds()).toEqual([])
    await qualify(set)
    expect(set.guidance.diagnostics.status()).toBe('READY')
    expect(set.guidance.diagnostics.guidanceIds()).toHaveLength(1)
    expect(currentGuidance(set)?.patternState).toBe('QUALIFIED')
  })

  it('G3 never exposes active Guidance for suspended or invalidated Pattern', async () => {
    const set = await setup()
    await qualify(set)
    const initial = currentGuidance(set)!
    await record(set, set.episodes[0]!, 'UNKNOWN')
    expect(currentPattern(set).state).toBe('SUSPENDED')
    expect(set.guidance.diagnostics.current(initial.guidanceId)).toBeUndefined()
    await record(set, set.episodes[3]!, 'MATCHED')
    expect(currentGuidance(set)?.state).toBe('ACTIVE')
    await record(set, set.episodes[4]!, 'MISMATCHED')
    expect(currentPattern(set).state).toBe('INVALIDATED')
    expect(set.guidance.diagnostics.current(initial.guidanceId)).toBeUndefined()
  })

  it('G4 derives deterministic safe identity and ordinal keys from the canonical Pattern tuple', async () => {
    const set = await setup()
    await qualify(set)
    const pattern = currentPattern(set)
    const tuple = JSON.stringify(['verified-historical-guidance-v1', pattern.patternId])
    const expectedId = `ra-guidance-v1_${createHash('sha256').update(tuple, 'utf8').digest('hex')}`
    const row = currentGuidance(set)!
    expect(guidanceIdFor(pattern.patternId)).toBe(expectedId)
    expect(row.guidanceId).toBe(expectedId)
    expect(row.revisionId).toBe(guidanceRevisionKey(expectedId, row.revisionNumber))
    expect(row.guidanceId).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(guidanceIdFor(pattern.patternId)).toBe(guidanceIdFor(pattern.patternId))
    const { guidanceDigest, ...semantic } = row
    const reordered = Object.fromEntries(Object.entries(semantic).reverse()) as unknown as GuidanceSemanticV1
    expect(guidanceDigestFor(reordered)).toBe(guidanceDigest)
  })

  it('G5 maps each Pattern revision to the exact same Guidance ordinal and immediate predecessor', async () => {
    const set = await setup()
    await qualify(set)
    const target = set.episodes[3]!
    await record(set, target)
    await record(set, set.episodes[0]!, 'UNKNOWN')
    await record(set, set.episodes[0]!, 'MATCHED')
    const pattern = set.patterns.diagnostics.revisions(currentPattern(set).patternId)
    const guidance = set.guidance.diagnostics.revisions(guidanceIdFor(currentPattern(set).patternId))
    expect(guidance).toHaveLength(pattern.length)
    for (let index = 0; index < pattern.length; index += 1) {
      expect(guidance[index]!.revisionNumber).toBe(pattern[index]!.revisionNumber)
      expect(guidance[index]!.patternRevisionId).toBe(pattern[index]!.revisionId)
      expect(guidance[index]!.previousRevisionId).toBe(index === 0 ? undefined : guidance[index - 1]!.revisionId)
      expect(guidance[index]!.revisionId).toBe(guidanceRevisionKey(guidance[index]!.guidanceId, index + 1))
    }
  })

  it('G6 renders only the frozen fixed wording and exact validated count interpolation', async () => {
    const set = await setup()
    await qualify(set)
    const row = currentGuidance(set)!
    expect(row.contentCode).toBe('VERIFIED_PATTERN_CONTEXT_V1')
    expect(set.guidance.diagnostics.render(row.guidanceId)).toEqual({
      title: 'Verified historical pattern',
      observation: 'A qualified verified-success pattern covers 3 distinct Episodes across 3 UTC dates.',
      contextCaveat: 'Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.',
      nextCheck: 'Independently verify the current target and expected postcondition.',
      authorityNotice: 'This guidance does not determine risk or grant permission or approval.',
    })
  })

  it('G7 exposes qualified strength and descriptive counts without probability, risk, or authorization semantics', async () => {
    const set = await setup()
    await qualify(set)
    const row = currentGuidance(set)!
    expect(row.evidenceStrength).toBe('QUALIFIED_PATTERN')
    expect(row.supportCount).toBe(3)
    expect(row.supportUtcDateCount).toBe(3)
    expect(Object.keys(row).some(key => /confidence|probability|riskScore|authorization/i.test(key))).toBe(false)
    expect(set.guidance.diagnostics.render(row.guidanceId)?.authorityNotice).toContain('does not determine risk or grant permission or approval')
  })

  it('G8 preserves exact Pattern revision and provenance digest without copying Episode/Outcome references', async () => {
    const set = await setup()
    await qualify(set)
    const pattern = currentPattern(set)
    const guidance = currentGuidance(set)!
    expect(guidance.patternRevisionId).toBe(pattern.revisionId)
    expect(guidance.patternProvenanceDigest).toBe(pattern.provenanceDigest)
    const persisted = JSON.stringify(set.guidance.diagnostics.revisions(guidance.guidanceId))
    expect(persisted).not.toContain('ra-episode-v1_')
    expect(persisted).not.toContain('ra-outcome-v1_')
  })

  it('G9 appends a refreshed active row for support changes and preserves older bytes', async () => {
    const set = await setup()
    await qualify(set)
    const old = currentGuidance(set)!
    const oldBytes = JSON.stringify(old)
    await record(set, set.episodes[3]!)
    const latest = currentGuidance(set)!
    expect(latest.revisionKind).toBe('REFRESH_ACTIVE')
    expect(latest.revisionNumber).toBe(old.revisionNumber + 1)
    expect(latest.supportCount).toBe(4)
    expect(JSON.stringify(set.guidance.diagnostics.revisions(old.guidanceId)[0])).toBe(oldBytes)
  })

  it('G10 durably withdraws on Pattern suspension without labeling it failure', async () => {
    const set = await setup()
    await qualify(set)
    const active = currentGuidance(set)!
    await record(set, set.episodes[0]!, 'UNKNOWN')
    const rows = set.guidance.diagnostics.revisions(active.guidanceId)
    expect(rows.at(-1)?.revisionKind).toBe('WITHDRAW_SUSPENDED')
    expect(rows.at(-1)?.state).toBe('WITHDRAWN')
    expect(rows.at(-1)?.patternState).toBe('SUSPENDED')
    expect(rows.at(-1)?.contentCode).toBeUndefined()
    expect(set.guidance.diagnostics.current(active.guidanceId)).toBeUndefined()
  })

  it('G11 durably withdraws terminal Pattern invalidation', async () => {
    const set = await setup()
    await qualify(set)
    const active = currentGuidance(set)!
    await record(set, set.episodes[3]!, 'MISMATCHED')
    const latest = set.guidance.diagnostics.revisions(active.guidanceId).at(-1)!
    expect(latest.revisionKind).toBe('WITHDRAW_INVALIDATED')
    expect(latest.state).toBe('WITHDRAWN')
    expect(latest.patternState).toBe('INVALIDATED')
    expect(set.guidance.diagnostics.current(active.guidanceId)).toBeUndefined()
  })

  it('G12 reactivates suspended Pattern identity and never reactivates invalidated history', async () => {
    const set = await setup()
    await qualify(set)
    const identity = currentGuidance(set)!.guidanceId
    await record(set, set.episodes[0]!, 'UNKNOWN')
    await record(set, set.episodes[3]!, 'MATCHED')
    expect(set.guidance.diagnostics.revisions(identity).at(-1)?.revisionKind).toBe('REACTIVATION_ACTIVE')
    await record(set, set.episodes[4]!, 'MISMATCHED')
    await record(set, set.episodes[1]!, 'MATCHED')
    expect(currentPattern(set).state).toBe('INVALIDATED')
    expect(set.guidance.diagnostics.current(identity)).toBeUndefined()
    expect(set.guidance.diagnostics.revisions(identity).at(-1)?.revisionKind).toBe('WITHDRAW_INVALIDATED')
  })

  it('G13 treats identical revisions idempotently and divergent same-key content as conflict without overwrite', async () => {
    const set = await setup()
    await qualify(set)
    const original = currentGuidance(set)!
    await set.guidance.detach()
    const latestPattern = set.patterns.guidanceSnapshot()[0]!.revisions.at(-1)!
    const source = new Proxy(set.patterns, {
      get(target, property) {
        if (property === 'subscribeGuidance') return (listener: (revision: typeof latestPattern) => void) => {
          const unsubscribe = target.subscribeGuidance(listener)
          listener(latestPattern)
          return unsubscribe
        }
        const value = Reflect.get(target, property, target) as unknown
        return typeof value === 'function' ? value.bind(target) : value
      },
    }) as PatternRuntime
    const writes = { value: 0 }
    const idempotent = new GuidanceRuntime()
    await idempotent.attach(withGuidancePutCounter(set.backing.facility, writes), source)
    expect(idempotent.diagnostics.status()).toBe('READY')
    expect(writes.value).toBe(0)
    await idempotent.detach()
    const domain = await set.backing.facility.open(guidanceDomainSpec)
    const table = domain.table('revisions')
    const { guidanceDigest: _digest, ...originalSemantic } = original
    const semantic = { ...originalSemantic, supportCount: original.supportCount! + 1 } as GuidanceSemanticV1
    const divergent = { ...semantic, guidanceDigest: guidanceDigestFor(semantic) }
    await table.put(original.revisionId, divergent as VerifiedHistoricalGuidanceRevisionV1)
    const changedBytes = JSON.stringify(table.get(original.revisionId))
    await domain.close()
    const reopened = new GuidanceRuntime()
    await reopened.attach(set.backing.facility, set.patterns)
    expect(reopened.diagnostics.status()).toBe('CONFLICTED')
    const verify = await set.backing.facility.open(guidanceDomainSpec)
    expect(JSON.stringify(verify.table('revisions').get(original.revisionId))).toBe(changedBytes)
    await verify.close()
    await reopened.detach()
  })

  it('G14 subscribes before snapshot and drains a durable concurrent Pattern update without loss', async () => {
    const set = await setup({ guidance: false })
    await qualify(set)
    const entered = deferred()
    const release = deferred()
    const gated = withGuidanceGate(set.backing.facility, { entered: () => entered.resolve(), release: release.promise })
    const attaching = set.guidance.attach(gated, set.patterns)
    await entered.promise
    await record(set, set.episodes[3]!, 'MATCHED', false)
    release.resolve()
    await attaching
    await set.guidance.drain()
    expect(set.guidance.diagnostics.status()).toBe('READY')
    expect(currentGuidance(set)?.supportCount).toBe(4)
    const patternChain = set.patterns.diagnostics.revisions(currentPattern(set).patternId)
    const guidanceChain = set.guidance.diagnostics.revisions(guidanceIdFor(currentPattern(set).patternId))
    expect(guidanceChain.map(row => row.patternRevisionId)).toEqual(patternChain.map(row => row.revisionId))
  })

  it('G15 rebuilds a missing projection by append-only replay and rejects a persisted history ahead of Pattern', async () => {
    const set = await setup()
    await qualify(set)
    const initial = currentGuidance(set)!
    await set.guidance.detach()
    await record(set, set.episodes[3]!, 'MATCHED', false)
    const replayed = new GuidanceRuntime()
    await replayed.attach(set.backing.facility, set.patterns)
    expect(replayed.diagnostics.current(initial.guidanceId)?.supportCount).toBe(4)
    expect(replayed.diagnostics.revisions(initial.guidanceId)).toHaveLength(2)
    await replayed.detach()

    const domain = await set.backing.facility.open(guidanceDomainSpec)
    const table = domain.table('revisions')
    const current = table.get(guidanceRevisionKey(initial.guidanceId, 2)) as VerifiedHistoricalGuidanceRevisionV1
    const { guidanceDigest: _digest, ...currentSemantic } = current
    const fakeSemantic = {
      ...currentSemantic,
      revisionNumber: 3,
      revisionId: guidanceRevisionKey(initial.guidanceId, 3),
      previousRevisionId: current.revisionId,
      patternRevisionId: patternRevisionKey(current.patternId, 3),
    } as GuidanceSemanticV1
    const fake = guidanceRevisionSchema.parse({ ...fakeSemantic, guidanceDigest: guidanceDigestFor(fakeSemantic) })
    await table.put(fake.revisionId, fake)
    await domain.close()
    const ahead = new GuidanceRuntime()
    await ahead.attach(set.backing.facility, set.patterns)
    expect(ahead.diagnostics.status()).toBe('CONFLICTED')
    await ahead.detach()
  })

  it('G16 classifies over-cap rows before application parsing and isolates optional storage failure', async () => {
    const set = await setup()
    await qualify(set)
    const original = currentGuidance(set)!
    await set.guidance.detach()
    const domain = await set.backing.facility.open(guidanceDomainSpec)
    const table = domain.table('revisions')
    const { guidanceDigest: _digest, ...originalSemantic } = original
    const semantic = { ...originalSemantic, supportCount: 10_001 } as GuidanceSemanticV1
    const overCap = { ...semantic, guidanceDigest: guidanceDigestFor(semantic) }
    // The Harness domain schema deliberately accepts the shape; runtime preflight owns cap classification.
    expect(guidanceRevisionSchema.safeParse(overCap).success).toBe(true)
    await table.put(original.revisionId, overCap as VerifiedHistoricalGuidanceRevisionV1)
    await domain.close()
    const capped = new GuidanceRuntime()
    await capped.attach(set.backing.facility, set.patterns)
    expect(capped.diagnostics.status()).toBe('CAPACITY_EXCEEDED')
    expect(capped.diagnostics.reasonCodes()).toContain('guidance-support-count-capacity-exceeded')
    await capped.detach()

    expect(() => assertGuidanceRevisionCapacity({ supportUtcDateCount: 10_001 })).toThrow(GuidanceCapacityError)
    const restore = await set.backing.facility.open(guidanceDomainSpec)
    await restore.table('revisions').put(original.revisionId, original)
    await restore.close()

    const tooManyIdentities = Array.from({ length: MAX_GUIDANCE_IDENTITIES + 1 }, (_, index) => ({
      patternId: `ra-pattern-v1_${String(index).padStart(64, 'a')}`,
      revisions: [],
    }))
    const oversizedSource = {
      diagnostics: { status: () => 'READY' },
      guidanceSnapshot: () => tooManyIdentities,
      subscribeGuidance: () => () => undefined,
    } as unknown as PatternRuntime
    const identityCapped = new GuidanceRuntime()
    await identityCapped.attach(set.backing.facility, oversizedSource)
    expect(identityCapped.diagnostics.status()).toBe('CAPACITY_EXCEEDED')
    expect(identityCapped.diagnostics.reasonCodes()).toContain('guidance-identity-capacity-exceeded')
    await identityCapped.detach()

    await record(set, set.episodes[3]!, 'MATCHED', false)
    const tableSizeCapped = new GuidanceRuntime()
    const writes = { value: 0 }
    const fullTable = wrapOpen(set.backing.facility, 'risk_advisor_guidance', domain => {
      const table = (domain as { table(name: string): Record<string, unknown> }).table('revisions')
      const wrappedTable = new Proxy(table, {
        get(target, property) {
          if (property === 'size') return MAX_GUIDANCE_REVISIONS
          if (property === 'put') return async (key: string, value: unknown) => {
            writes.value += 1
            return (target.put as (key: string, value: unknown) => Promise<void>).call(target, key, value)
          }
          const value = Reflect.get(target, property, target) as unknown
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
      return new Proxy(domain as object, {
        get(target, property) {
          if (property === 'table') return (name: string) => name === 'revisions' ? wrappedTable : (domain as { table(name: string): unknown }).table(name)
          const value = Reflect.get(target, property, target) as unknown
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    })
    await tableSizeCapped.attach(fullTable, set.patterns)
    expect(tableSizeCapped.diagnostics.status()).toBe('CAPACITY_EXCEEDED')
    expect(writes.value).toBe(0)
    await tableSizeCapped.detach()

    const handoff = new GuidanceRuntime()
    let notify: ((revision: VerifiedExperiencePatternRevisionV1) => void) | undefined
    const sourceWithCapture = new Proxy(set.patterns, {
      get(target, property) {
        if (property === 'subscribeGuidance') return (listener: (revision: VerifiedExperiencePatternRevisionV1) => void) => {
          notify = listener
          return target.subscribeGuidance(listener)
        }
        const value = Reflect.get(target, property, target) as unknown
        return typeof value === 'function' ? value.bind(target) : value
      },
    }) as PatternRuntime
    await handoff.attach(set.backing.facility, sourceWithCapture)
    const latestPattern = currentPattern(set)
    const notification = latestPattern
    for (let index = 0; index <= MAX_GUIDANCE_PENDING_PATTERN_HANDOFFS; index += 1) notify?.(notification)
    expect(handoff.diagnostics.status()).toBe('UNAVAILABLE')
    expect(handoff.diagnostics.reasonCodes()).toContain('GUIDANCE_NOTIFICATION_HANDOFF_CAPACITY_EXCEEDED')
    await handoff.detach()

    const isolated = new GuidanceRuntime()
    const failed = wrapOpen(set.backing.facility, 'risk_advisor_guidance', () => { throw new Error('optional storage unavailable') })
    await isolated.attach(failed, set.patterns)
    expect(isolated.diagnostics.status()).toBe('UNAVAILABLE')
    expect(set.patterns.diagnostics.status()).toBe('READY')
    await isolated.detach()
    expect(MAX_GUIDANCE_PENDING_PATTERN_HANDOFFS).toBe(512)
  })

  it('G17 persists only opaque ids, fixed codes, bounded counts, and Pattern provenance', async () => {
    const set = await setup()
    await qualify(set)
    const text = JSON.stringify(set.guidance.diagnostics.revisions(currentGuidance(set)!.guidanceId))
    for (const sentinel of ['ra-episode-v1_', 'ra-outcome-v1_', 'sourceExecutionId', 'command', 'arguments', 'cwd', 'stdout', 'stderr', 'approval', 'prompt', 'secret']) {
      expect(text).not.toContain(sentinel)
    }
    expect(text).toContain('VERIFIED_PATTERN_CONTEXT_V1')
  })

  it('G18 drains and closes Guidance before Pattern, with no subscriber surviving disposal', async () => {
    const closedDomains: string[] = []
    const backing = await createJsonStorageFixture(await mkdtemp(join(tmpdir(), 'ra-p11-4-order-')))
    roots.push(backing.root)
    // Install close tracing through a wrapper that observes each domain handle.
    const open = backing.facility.open.bind(backing.facility) as (spec: { readonly name?: string }) => Promise<unknown>
    const orderedFacility = { async open(spec: { readonly name?: string }) {
      const domain = await open(spec) as { close(): Promise<void> }
      return new Proxy(domain, { get(target, property) {
        if (property === 'close') return async () => { closedDomains.push(spec.name ?? ''); await target.close() }
        const value = Reflect.get(target, property, target) as unknown
        return typeof value === 'function' ? value.bind(target) : value
      } })
    } } as unknown as DomainFacility
    const episodes = [episode('life-1', Date.UTC(2026, 0, 1)), episode('life-2', Date.UTC(2026, 0, 2)), episode('life-3', Date.UTC(2026, 0, 3))]
    const exp = await orderedFacility.open(experienceDomainSpec)
    for (const value of episodes) await exp.table('episodes').put(value.episodeId as ExperienceEpisodeId, value)
    await exp.close()
    const outcomes = new OutcomeRuntime()
    await outcomes.attach(orderedFacility, episodes)
    const patterns = new PatternRuntime()
    await patterns.attach(orderedFacility, outcomes)
    const guidance = new GuidanceRuntime()
    const ordered: Setup = { backing, outcomes, patterns, guidance, episodes }
    fixtures.push(ordered)
    await guidance.attach(orderedFacility, patterns)
    for (const value of episodes) {
      outcomes.observeVerification(verification(value))
      await outcomes.drain()
      await patterns.drain()
      await guidance.drain()
    }
    await close(ordered)
    expect(closedDomains.indexOf('risk_advisor_guidance')).toBeLessThan(closedDomains.indexOf('risk_advisor_pattern'))
    expect(closedDomains.indexOf('risk_advisor_pattern')).toBeLessThan(closedDomains.indexOf('risk_advisor_outcome'))
  })

  it('G19 suppresses the old active row immediately while a refreshed Pattern write is pending', async () => {
    const entered = deferred()
    const release = deferred()
    const set = await setup()
    await qualify(set)
    const id = currentGuidance(set)!.guidanceId
    // Replace this generation with a runtime whose table pauses after its initial durable revision.
    await set.guidance.detach()
    const gated = new GuidanceRuntime()
    set.guidance = gated
    await gated.attach(withGuidancePutGate(set.backing.facility, { entered: () => entered.resolve(), release: release.promise }), set.patterns)
    await record(set, set.episodes[3]!, 'MATCHED', false)
    await entered.promise
    expect(gated.diagnostics.status()).toBe('UNAVAILABLE')
    expect(gated.diagnostics.current(id)).toBeUndefined()
    release.resolve()
    await gated.drain()
    expect(gated.diagnostics.status()).toBe('READY')
    expect(gated.diagnostics.current(id)?.supportCount).toBe(4)
  })

  it('G20 keeps the Guidance runtime outside Browser, Risk, Approval, Agent, and Harness authorities', async () => {
    const set = await setup()
    await qualify(set)
    expect(set.guidance.diagnostics.status()).toBe('READY')
    const forbidden = ['browser-bridge', 'risk-engine', 'assessment-envelope', 'user-approval', 'dsh-agent', 'deepseek-harness']
    const cwd = (globalThis as unknown as { readonly process: { cwd(): string } }).process.cwd()
    const source = await readFile(join(cwd, 'src/host/guidance-store.ts'), 'utf8')
    for (const moduleName of forbidden) expect(source).not.toContain(moduleName)
  })
})
