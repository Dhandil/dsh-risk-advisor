import { performance } from 'node:perf_hooks'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { QualifiedHistoryFixture } from './p14-2-historical-context-fixtures.ts'
import { createQualifiedHistoryFixture } from './p14-2-historical-context-fixtures.ts'

const fixtures: QualifiedHistoryFixture[] = []
afterEach(async () => { await Promise.all(fixtures.splice(0).map(fixture => fixture.close())) })

describe('Phase 14.2 H10 bounded exact Guidance lookup', () => {
  it('measures p95/p99 exact reads at 1, 1,000, and 60,000 identity-index entries without a full snapshot scan', async () => {
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
    console.info(`P14.2 exact Guidance read latency ms: ${JSON.stringify(measurements)}`)
  })
})
