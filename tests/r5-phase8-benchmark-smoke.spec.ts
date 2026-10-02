import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-phase8.mjs'

describe('Phase 8 real local evidence benchmark smoke', () => {
  it('uses disposable local filesystem and Git only', async () => {
    const output = await main({ smoke: true })
    expect(output.run).toMatchObject({ benchmark: 'R5_PHASE8_LOCAL_EVIDENCE', realLocalExecution: true, labels: ['LOCAL_EVIDENCE_ONLY', 'NETWORK_NOT_USED', 'PROVIDER_NOT_USED', 'REGISTRY_NOT_USED', 'GIT_REMOTE_NOT_USED'] })
    expect(output.paths.mkdir[0].status).toBe('MATCHED')
    expect(output.paths.copyNear1MiB[0].fixtureBytes).toBe(1024 * 1024 - 1)
    expect(output.paths.git[0]).toMatchObject({ repositoryAvailable: true, tracked: true, clean: true })
    expect(output.timeout.published).toBe('EVIDENCE_TIMEOUT')
    expect(output.saturation).toMatchObject({ maxConcurrent: 2, maxPending: 8, queue: 'EVIDENCE_QUEUE_SATURATED' })
  }, 600000)
})
