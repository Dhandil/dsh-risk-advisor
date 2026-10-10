import { performance } from 'node:perf_hooks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MAX_EXPERIENCE_EPISODES } from '../src/host/experience-schema.ts'
import type { QualifiedHistoryFixture, QualifiedPatternScaleFixture } from './p14-2-historical-context-fixtures.ts'
import { createQualifiedHistoryFixture, createQualifiedPatternScaleFixture } from './p14-2-historical-context-fixtures.ts'

const fixtures: QualifiedHistoryFixture[] = []
const scaleFixtures: QualifiedPatternScaleFixture[] = []
afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(fixture => fixture.close()))
  await Promise.all(scaleFixtures.splice(0).map(fixture => fixture.close()))
})

describe('Phase 14.2 H10 bounded exact Guidance lookup', () => {
  it('retains the 60,000-entry synthetic index-pressure proof and labels it as non-qualified history', async () => {
    const fixture = await createQualifiedHistoryFixture()
    fixtures.push(fixture)
    const patternId = fixture.patterns.diagnostics.patternIds()[0]!
    const identityIndex = (fixture.guidance as unknown as { readonly identitiesByPattern: Map<string, string> }).identitiesByPattern
    const snapshotSpy = vi.spyOn(fixture.patterns, 'guidanceSnapshot').mockImplementation(() => { throw new Error('full history snapshot must not be read on the bounded current path') })
    const measurements: Record<string, { p95Ms: number; p99Ms: number }> = {}

    for (const size of [1, 1_000, 60_000]) {
      while (identityIndex.size < size) {
        const ordinal = identityIndex.size
        const digest = ordinal.toString(16).padStart(64, '0')
        identityIndex.set(`ra-pattern-v1_${digest}`, `ra-guidance-v1_${digest}`)
      }
      const samples: number[] = []
      for (let index = 0; index < 2_000; index += 1) {
        const started = performance.now()
        expect(fixture.guidance.diagnostics.currentForPattern(patternId)).toMatchObject({ state: 'ACTIVE', patternState: 'QUALIFIED' })
        samples.push(performance.now() - started)
      }
      samples.sort((a, b) => a - b)
      measurements[String(size)] = {
        p95Ms: Number(samples[Math.ceil(samples.length * 0.95) - 1]!.toFixed(4)),
        p99Ms: Number(samples[Math.ceil(samples.length * 0.99) - 1]!.toFixed(4)),
      }
    }
    expect(snapshotSpy).not.toHaveBeenCalled()
    expect(measurements['60000']!.p95Ms).toBeLessThan(1)
    expect(measurements['60000']!.p99Ms).toBeLessThan(2)
    console.info(`P14.2 synthetic identity-index pressure (not qualified history; 1 real active row) exact-read latency ms: ${JSON.stringify(measurements)}`)
  })

  it('measures real trusted qualified Guidance at 1, 1,000, and the frozen Episode-capacity maximum of 3,333 identities', async () => {
    const maximumPatterns = Math.floor(MAX_EXPERIENCE_EPISODES / 3)
    const fixture = await createQualifiedPatternScaleFixture(maximumPatterns)
    scaleFixtures.push(fixture)
    expect(fixture.episodes).toHaveLength(maximumPatterns * 3)
    expect(fixture.episodes.length).toBeLessThanOrEqual(MAX_EXPERIENCE_EPISODES)

    const measurements: Record<string, { p95Ms: number; p99Ms: number }> = {}
    for (const patternCount of [1, 1_000, maximumPatterns]) {
      await fixture.qualifyThrough(patternCount)
      const guidance = await fixture.attachGuidance()
      const patternIds = fixture.patterns.diagnostics.patternIds()
      const guidanceIds = guidance.diagnostics.guidanceIds()
      expect(fixture.patterns.diagnostics.status()).toBe('READY')
      expect(guidance.diagnostics.status()).toBe('READY')
      expect(patternIds).toHaveLength(patternCount)
      expect(guidanceIds).toHaveLength(patternCount)

      for (const id of patternIds) {
        const pattern = fixture.patterns.diagnostics.current(id)
        const active = guidance.diagnostics.currentForPattern(id)
        expect(pattern).toMatchObject({ state: 'QUALIFIED', supportCount: 3, supportUtcDateCount: 2 })
        expect(pattern?.supportAdded).toHaveLength(3)
        expect(new Set(pattern?.supportAdded.map(reference => reference.episodeId)).size).toBe(3)
        expect(active).toMatchObject({
          state: 'ACTIVE',
          patternState: 'QUALIFIED',
          evidenceStrength: 'QUALIFIED_PATTERN',
          supportCount: 3,
          supportUtcDateCount: 2,
          patternRevisionId: pattern?.revisionId,
          patternProvenanceDigest: pattern?.provenanceDigest,
        })
      }

      const snapshotSpy = vi.spyOn(fixture.patterns, 'guidanceSnapshot').mockImplementation(() => {
        throw new Error('bounded current read must not scan the full qualified history snapshot')
      })
      const samples: number[] = []
      const results = []
      for (let index = 0; index < 2_000; index += 1) {
        const patternId = patternIds[index % patternIds.length]!
        const started = performance.now()
        results.push(guidance.diagnostics.currentForPattern(patternId))
        samples.push(performance.now() - started)
      }
      snapshotSpy.mockRestore()
      expect(snapshotSpy).not.toHaveBeenCalled()
      expect(results).toHaveLength(2_000)
      expect(results.every(result => result?.state === 'ACTIVE' && result.evidenceStrength === 'QUALIFIED_PATTERN')).toBe(true)
      samples.sort((a, b) => a - b)
      const measured = {
        p95Ms: Number(samples[Math.ceil(samples.length * 0.95) - 1]!.toFixed(4)),
        p99Ms: Number(samples[Math.ceil(samples.length * 0.99) - 1]!.toFixed(4)),
      }
      measurements[String(patternCount)] = measured
      expect(measured.p95Ms).toBeLessThan(1)
      expect(measured.p99Ms).toBeLessThan(2)

      if (patternCount !== maximumPatterns) await fixture.detachGuidance()
    }

    console.info(`P14.2 trusted qualified Pattern/Guidance Host exact-read latency ms: ${JSON.stringify({
      patterns: [1, 1_000, maximumPatterns],
      episodesAtMaximum: fixture.episodes.length,
      trustedOutcomeRevisionsAtMaximum: fixture.outcomes.diagnostics.revisionCount(),
      measurements,
    })}`)
  })
})
