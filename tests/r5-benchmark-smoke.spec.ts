import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-approval.mjs'

describe('T05 R5 benchmark smoke', () => {
  it('runs the real pinned-runtime, component, and controlled-simulation smoke paths', async () => {
    const output = await main({ smoke: true })
    expect(output.run.mode).toBe('SMOKE')
    expect(output.realApproval.approvalE2eMs.baseline.summary.n).toBe(8)
    expect(output.realApproval.approvalE2eMs.treatment.summary.n).toBe(8)
    expect(output.nonClaims.timeToFirstAssessment).toBe('NOT_MEASURABLE_NOT_IMPLEMENTED')
  }, 600000)
})
