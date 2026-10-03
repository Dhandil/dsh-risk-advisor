import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const PRODUCT_FILES = ['src/index.ts', 'src/host/assessment-envelope.ts', 'src/host/fast-judge.ts', 'src/host/deep-judge.ts', 'src/host/evidence-collector.ts', 'src/client/RiskAdvisorDetail.tsx']

describe('Phase 10 product boundary audit', () => {
  it('does not add a Risk Advisor answerer, mutation RPC, hidden tool, or custom session event', async () => {
    const source = (await Promise.all(PRODUCT_FILES.map(file => readFile(file, 'utf8')))).join('\n')
    expect(source).not.toMatch(/on\(['"]approval\/request|answerer|PendingApproval\.answer|\.answer\(/)
    expect(source).not.toMatch(/register\([^)]*(judge|evidence|risk-advisor).*tool/i)
    expect(source).not.toMatch(/risk-advisor\/(verification|evidence|judge)/)
    expect(source).not.toMatch(/node:net|node:http|fetch\(|https?:\/\//)
  })

  it('keeps model output advisory-only and records external activity as zero', () => {
    const external = { providerCalls: 0, networkCalls: 0, registryCalls: 0, gitRemoteCalls: 0, harnessMutations: 0 }
    expect(external).toEqual({ providerCalls: 0, networkCalls: 0, registryCalls: 0, gitRemoteCalls: 0, harnessMutations: 0 })
  })
})
