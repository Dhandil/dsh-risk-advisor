import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-phase8.mjs'

describe('Phase 8 real local evidence benchmark full', () => {
  it('covers real local bounded paths without provider or remote calls', async () => {
    const output = await main({ smoke: false })
    expect(output.run.samples).toBe(2)
    for (const path of Object.values(output.paths)) expect(path).toHaveLength(2)
    expect(output.paths.copyNear1MiB.every(item => item.fixtureBytes === 1024 * 1024 - 1)).toBe(true)
    expect(output.nonClaims).toEqual({ provider: 'PROVIDER_NOT_USED', network: 'NETWORK_NOT_USED', registry: 'REGISTRY_NOT_USED', gitRemote: 'GIT_REMOTE_NOT_USED' })
  }, 600000)
})
