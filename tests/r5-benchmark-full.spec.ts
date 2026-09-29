import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-approval.mjs'

describe('T05 R5 benchmark full run', () => {
  it('runs the required real pinned-runtime sample, component, and simulation paths', async () => {
    const output = await main({ smoke: false })
    expect(output.run.mode).toBe('FULL')
    expect(output.realApproval.approvalE2eMs.baseline.summary.n).toBe(300)
    expect(output.realApproval.approvalE2eMs.treatment.summary.n).toBe(300)
    expect(output.nonClaims.timeToFinalAssessment).toBe('NOT_MEASURABLE_NOT_IMPLEMENTED')
  }, 1800000)
})
