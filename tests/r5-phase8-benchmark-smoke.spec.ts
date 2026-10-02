import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-phase8.mjs'

describe('Phase 8 real local evidence benchmark smoke', () => {
  it('uses disposable local filesystem and Git only', async () => {
    const output = await main({ smoke: true })
    expect(output.run).toMatchObject({ benchmark: 'R5_PHASE8_LOCAL_EVIDENCE', realLocalExecution: true, labels: ['LOCAL_EVIDENCE_ONLY', 'NETWORK_NOT_USED', 'PROVIDER_NOT_USED', 'REGISTRY_NOT_USED', 'GIT_REMOTE_NOT_USED'] })
    expect(output.paths.mkdir[0].status).toBe('COMPLETE')
    expect(output.paths.copyNear1MiB[0].fixtureBytes).toBe(1024 * 1024 - 1)
    expect(output.paths.git[0].states).toEqual(expect.arrayContaining([
      expect.objectContaining({ state: 'tracked-clean', versionControlled: true, exactTargetsClean: true }),
      expect.objectContaining({ state: 'tracked-dirty', versionControlled: true, exactTargetsClean: false }),
      expect.objectContaining({ state: 'untracked', versionControlled: false }),
      expect.objectContaining({ state: 'ignored', checker: expect.objectContaining({ ignored: true }) }),
    ]))
    expect(output.paths.git[0].fsmonitorDisabled).toBe(true)
    expect(output.paths.outside[0]).toMatchObject({ workspaceContained: false, contentRead: false })
    expect(output.paths.package[0]).toMatchObject({ status: 'COMPLETE', valid: true })
    expect(output.paths.packageOverLimit[0].reasonCodes).toContain('PACKAGE_MANIFEST_TOO_LARGE')
    expect(output.paths.directoryBudget[0]).toMatchObject({ retainedEntries: 200 })
    expect(output.timeout).toMatchObject({ result: 'TIMEOUT', activeAfterTimeout: 1, ownedUntilSettle: true })
    expect(output.saturation).toMatchObject({ maxConcurrent: 2, maxPending: 8, saturated: 1, realScheduler: true })
    expect(output.minimumScope).toMatchObject({ 'workspace-write': { privilege: 'PROPORTIONATE', reversible: true }, 'danger-full-access': { privilege: 'EXCESSIVE', reversible: true } })
    expect(output.staleGeneration).toEqual({ oldStatus: 'CANCELLED', newStatus: 'COMPLETE', oldSuccessPublished: false })
  }, 600000)
})
