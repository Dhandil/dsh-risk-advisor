import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-phase9.mjs'

describe('Phase 9 local Deep Judge benchmark full', () => {
  it('keeps the reviewer path local and deterministic', async () => {
    const output = await main({ smoke: false })
    expect(output.run.samples).toBe(2)
    expect(output.trigger.a4CandidateValidated).toBe(true)
    expect(output.lifecycle.browserStage).toBe('deep')
    expect(output.external).toEqual({ providerCalls: 0, networkCalls: 0, registryCalls: 0, gitRemoteCalls: 0 })
  }, 600000)
})
