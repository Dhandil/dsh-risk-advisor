import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-phase7.mjs'

describe('Phase 7 local verifier benchmark smoke', () => {
  it('measures only implemented local paths', async () => {
    const output = await main({ smoke: true })
    expect(output.run).toMatchObject({ benchmark: 'R5_PHASE7_REAL_LOCAL_VERIFIER', realLocalExecution: true, labels: ['LOCAL_VERIFIER_ONLY', 'NETWORK_NOT_USED', 'PROVIDER_NOT_USED'] })
    expect(output.scheduler.completed).toBe(10)
    expect(output.scheduler.maxConcurrent).toBe(2)
    expect(output.scheduler.maxPending).toBe(8)
    expect(Object.keys(output.paths)).toEqual(['mkdir', 'copy', 'copyNear1MiB', 'git', 'package'])
    expect(output.paths.mkdir[0]).toMatchObject({ status: 'MATCHED', semanticSuccess: true, checkerExecutions: 1 })
    expect(output.paths.copyNear1MiB[0]).toMatchObject({ status: 'MATCHED', semanticSuccess: true, checkerExecutions: 1, fixtureBytes: 1024 * 1024 - 1 })
    expect(output.timeout.published).toBe('VERIFIER_TIMEOUT')
    expect(output.timeout.activeAfterTimeout).toBe(1)
    expect(output.timeout.elapsedMs).toBeGreaterThanOrEqual(5000)
    expect(output.nonClaims).toMatchObject({ provider: 'PROVIDER_NOT_USED', network: 'NETWORK_NOT_USED', registry: 'NETWORK_NOT_USED', gitRemote: 'GIT_REMOTE_NOT_USED' })
  }, 600000)
})
