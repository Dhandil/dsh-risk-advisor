import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-phase10.mjs'

describe('Phase 10 benchmark full', () => {
  it('records bounded distributions with honest evidence classes', async () => {
    const output = await main({ smoke: false, writeArtifact: false })
    expect(output.run).toMatchObject({ mode: 'FULL', cheapSamples: 300, heavySamples: 100 })
    expect(output.realPinnedRuntime.baseline.summary.n).toBe(100)
    expect(output.realPinnedRuntime.treatment.summary.n).toBe(100)
    expect(output.local.distributions.contextBuilder.summary.n).toBe(300)
    expect(output.local.actualProductPath.fastJudge.summary.n).toBe(100)
    expect(output.local.actualProductPath.evidenceCollectorA3.summary.n).toBe(100)
    expect(output.local.actualProductPath.deepJudgeA4.summary.n).toBe(100)
    expect(output.local.actualProductPath.browserPresentationQuery.summary.n).toBe(100)
    expect(output.local.actualProductPath.composedA1ToA4Browser.summary.n).toBe(100)
    expect(output.structuralReviewer).toMatchObject({ evidenceClass: 'STRUCTURAL_LOCAL_REVIEWER', providerCalls: 0, networkCalls: 0 })
    expect(output.externalProvider).toEqual({ evidenceClass: 'NOT_VALIDATED_EXTERNAL_PROVIDER', status: 'NOT_RUN' })
    expect(output.privacy).toMatchObject({ evidenceClass: 'STRUCTURAL_PROMPT_INJECTION_HARDENING', canaryMatches: 0, rawFieldMatches: 0 })
    expect(output.privacy.canarySurfaces).toBeGreaterThanOrEqual(15)
  }, 600000)
})
