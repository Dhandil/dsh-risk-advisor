import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-phase7.mjs'

describe('Phase 7 local verifier benchmark full', () => {
  it('measures the bounded local verifier suite without external calls', async () => {
    const output = await main({ smoke: false })
    expect(output.run).toMatchObject({ benchmark: 'R5_PHASE7_REAL_LOCAL_VERIFIER', realLocalExecution: true, labels: ['LOCAL_VERIFIER_ONLY', 'NETWORK_NOT_USED', 'PROVIDER_NOT_USED'] })
    expect(output.direct.write).toHaveLength(output.run.samples)
    expect(output.direct.edit).toHaveLength(output.run.samples)
    for (const path of Object.values(output.paths)) {
      expect(path).toHaveLength(output.run.samples)
      expect(path.every(item => item.status === 'MATCHED' && item.semanticSuccess === true && item.checkerExecutions === 1)).toBe(true)
    }
    expect(output.scheduler.completed).toBe(10)
    expect(output.scheduler.saturated).toBe('VERIFIER_QUEUE_SATURATED')
    expect(output.timeout.published).toBe('VERIFIER_TIMEOUT')
    expect(output.timeout.activeAfterTimeout).toBe(1)
    expect(output.timeout.elapsedMs).toBeGreaterThanOrEqual(5000)
    expect(output.paths.copyNear1MiB[0].fixtureBytes).toBe(1024 * 1024 - 1)
    expect(output.nonClaims.gitRemote).toBe('GIT_REMOTE_NOT_USED')
  }, 600000)
})
