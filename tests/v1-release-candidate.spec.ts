import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('V1 final closure installed-profile release candidate', () => {
  it('accepts only bounded process A/B evidence from the repository-owned gate', async () => {
    const evidence = JSON.parse(await readFile('docs/tasks/V1-final-closure/evidence/v1-release-candidate.json', 'utf8')) as Record<string, any>
    expect(evidence.schema).toBe('dsh-risk-advisor.v1.final-closure.release-candidate.v1')
    expect(evidence.evidenceClass).toBe('REAL_PINNED_INSTALLED_PROFILE')
    expect(evidence.harnessSha).toBe('ddefc45fbc7f8e46dd73185e68295696d1297887')
    expect(evidence.productExecutableSha).toBe('1fa84e2a8a9de465cdb85fef928ec9e19086bba2')
    expect(evidence.productExecutableStatus).toBe('PRODUCT_EXECUTABLE_UNCHANGED_FROM_PHASE10')
    expect(evidence.processA).toMatchObject({ appReady: true, naturalExit: true, riskAdvisorBundleCount: 1, probeBundleCount: 1 })
    expect(evidence.processB).toMatchObject({ appReady: true, naturalExit: true, toolTraversals: 1, approvalAskedCount: 1, nativeAnswererCalls: 1, nativeOutcome: 'allowed-once', riskAdvisorAssessmentPresent: true, riskAdvisorAssociation: 'BOUND', duplicateNativeAnswers: 0, riskAdvisorApprovalAnswererCalls: 0, riskAdvisorApprovalOutcomeReturns: 0, toolCompletedSuccessfully: true, noLateAdvisoryReopen: true })
    expect(evidence.external).toEqual({ providerCalls: 0, externalNetworkCalls: 0, registryCalls: 0, gitRemoteCalls: 0, harnessTrackedMutation: 0, userProfileMutation: 0 })
    expect(JSON.stringify(evidence)).not.toMatch(/[A-Za-z]:\\|\\\\|rawPrompt|rawArgs|secret|password|token/i)
  })
})
