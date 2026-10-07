import { TruthLedger, readVerifiedLedger } from './ledger.ts'
import { canonicalJson } from './canonical.ts'
import { operationByRef } from './operations.ts'
import { generateSmokeManifest, manifestSha256 } from './manifest.ts'
import { gradeStep, isDeterministicProductBlocker } from './oracle.ts'
import { settleVerification } from './capture.ts'
import { Phase13Subject } from './subject.ts'
import { Phase13Workspace } from './workspace.ts'
import {
  enforcePhase13RunPolicy,
  PHASE13_1_SMOKE_POLICY,
  type FindingLifetimeExpectation,
  type Phase13ManifestV1,
  type Phase13RunPolicy,
  type Phase13ScenarioV1,
  type Phase13StepV1,
} from './schema.ts'
import { summarizeVerifiedLedger, type Phase13Summary } from './summary.ts'

export type CampaignStatus = 'RUNNING' | 'COMPLETE' | 'BLOCKED_P0' | 'BLOCKED_P1' | 'BLOCKED_CAPTURE' | 'BLOCKED_LEDGER' | 'BLOCKED_ENVIRONMENT'

export interface CampaignResult {
  readonly status: CampaignStatus
  readonly manifest: Phase13ManifestV1
  readonly manifestSha256: string
  readonly scenarioCount: number
  readonly toolExecutionCount: number
  readonly ledgerHeadHash: string
  readonly ledgerPath: string
  readonly workspacePath: string
  readonly summary?: Phase13Summary
  readonly blocker?: string
}

function sessionIdentitySet(values: readonly string[]): Set<string> {
  return new Set(values)
}

export interface SessionFindingHistory {
  readonly activeBySession: Map<string, Set<string>>
  readonly retiredBySession: Map<string, Set<string>>
}

export function findingOwnerIssues(
  sessionKey: string,
  executionId: string | undefined,
  executionOwners: ReadonlyMap<string, string>,
  knownFindingOwners: Map<string, string>,
  findingIds: readonly string[],
  beforeIds: readonly string[],
  sessionIds: readonly string[],
  findingLifetime: FindingLifetimeExpectation,
  history: SessionFindingHistory,
): string[] {
  const issues: string[] = []
  if (executionId !== undefined && executionOwners.get(executionId) !== sessionKey) issues.push('WRONG_SESSION_FINDING')
  const sessionSet = sessionIdentitySet(sessionIds)
  const actualSet = sessionIdentitySet(findingIds)
  if (findingIds.length !== actualSet.size || sessionIds.length !== sessionSet.size) issues.push('DUPLICATE_FINDING')
  if (findingIds.some(id => !sessionSet.has(id))) issues.push('WRONG_SESSION_FINDING')
  const beforeSet = sessionIdentitySet(beforeIds)
  if (sessionIds.some(id => !beforeSet.has(id) && !actualSet.has(id))) issues.push('UNRELATED_SESSION_MUTATION')

  const active = new Set(history.activeBySession.get(sessionKey) ?? [])
  const retired = history.retiredBySession.get(sessionKey) ?? new Set<string>()
  const previouslyRetired = new Set(retired)
  for (const id of beforeIds) active.add(id)
  const priorActive = [...active]
  if (findingLifetime === 'PRESERVE_PRIOR' && priorActive.some(id => !sessionSet.has(id))) {
    issues.push('FINDING_LIFETIME_VIOLATION')
  }
  for (const id of priorActive) {
    if (!sessionSet.has(id)) {
      active.delete(id)
      retired.add(id)
    }
  }
  for (const id of [...beforeIds, ...sessionIds]) {
    if (previouslyRetired.has(id)) issues.push('RESURRECTED_FINDING')
  }
  for (const id of sessionIds) active.add(id)
  history.activeBySession.set(sessionKey, active)
  history.retiredBySession.set(sessionKey, retired)

  for (const findingId of sessionIds) {
    const owner = knownFindingOwners.get(findingId)
    if (owner !== undefined && owner !== sessionKey) issues.push('WRONG_SESSION_FINDING')
    else if (owner === undefined) knownFindingOwners.set(findingId, sessionKey)
  }
  for (const findingId of findingIds) {
    if (!sessionSet.has(findingId)) issues.push('WRONG_SESSION_FINDING')
  }
  return [...new Set(issues)]
}

function firstManifestBlocker(manifest: Phase13ManifestV1, scenario: Phase13ScenarioV1, step: Phase13StepV1, issueCodes: readonly string[], actualKinds: readonly string[], ledgerHeadHash: string) {
  return {
    generatorVersion: manifest.generatorVersion,
    seed: manifest.seed,
    scenarioId: scenario.scenarioId,
    scenario: {
      scenarioId: scenario.scenarioId,
      family: scenario.family,
      sessionKey: scenario.sessionKey,
      steps: scenario.steps.slice(0, scenario.steps.findIndex(item => item.stepId === step.stepId) + 1).map(item => ({
        stepId: item.stepId, operationRef: item.operationRef, expectedProcess: item.expectedProcess,
        expected: item.expected, f2Settlement: item.f2Settlement, opportunity: item.opportunity,
        findingLifetime: item.findingLifetime,
      })),
    },
    expected: step.expected,
    actual: { kinds: actualKinds.slice(0, 16), issueCodes: issueCodes.slice(0, 16) },
    ledgerHeadHash,
  }
}

export function blockedStatus(issues: readonly string[]): CampaignStatus | undefined {
  if (issues.includes('CAPTURE_INVALID')) return 'BLOCKED_CAPTURE'
  if (issues.includes('LEDGER_INTEGRITY_INVALID')) return 'BLOCKED_LEDGER'
  if (issues.includes('ENVIRONMENT_FAILURE')) return 'BLOCKED_ENVIRONMENT'
  if (issues.includes('WRONG_SESSION_FINDING')) return 'BLOCKED_P0'
  if (issues.length > 0) return 'BLOCKED_P1'
  return undefined
}

export async function runPhase13Campaign(options: {
  readonly campaignRunId: string
  readonly seed: string
  readonly manifest?: Phase13ManifestV1
  readonly policy: Phase13RunPolicy
}): Promise<CampaignResult> {
  const manifest = options.manifest ?? generateSmokeManifest({ campaignRunId: options.campaignRunId, seed: options.seed })
  if (manifest.campaignRunId !== options.campaignRunId) throw new TypeError('manifest-run-id-mismatch')
  enforcePhase13RunPolicy(manifest, options.policy)
  const digest = manifestSha256(manifest)
  const workspace = await Phase13Workspace.create(options.campaignRunId)
  const ledgerPath = await workspace.resolveArtifactPath('truth-ledger.jsonl')
  let subject: Phase13Subject | undefined
  let ledger: TruthLedger | undefined
  let status: CampaignStatus = 'RUNNING'
  let blocker: string | undefined
  let scenarioCount = 0
  let toolExecutionCount = 0
  const executionOwners = new Map<string, string>()
  const findingOwners = new Map<string, string>()
  const findingHistory: SessionFindingHistory = { activeBySession: new Map(), retiredBySession: new Map() }
  try {
    subject = await Phase13Subject.create()
    ledger = await TruthLedger.create(ledgerPath, manifest.campaignRunId, {
      generatorVersion: manifest.generatorVersion, seed: manifest.seed, lane: manifest.lane,
      manifestSha256: digest, subjectBoundary: 'PINNED_HARNESS_PUBLIC_DIAGNOSTICS',
    })
    for (const scenario of manifest.scenarios) {
      if (status !== 'RUNNING') break
      scenarioCount += 1
      const scenarioRoot = await workspace.createScenario(scenario.scenarioId)
      await ledger.append('SCENARIO_START', { scenarioId: scenario.scenarioId, family: scenario.family, sessionKey: scenario.sessionKey })
      for (const step of scenario.steps) {
        try { await ledger.assertHealthy() }
        catch { status = 'BLOCKED_LEDGER'; blocker = 'LEDGER_INTEGRITY_INVALID'; break }
        if (toolExecutionCount >= options.policy.maxToolExecutions) { status = 'BLOCKED_ENVIRONMENT'; blocker = 'TOOL_EXECUTION_CAP_EXCEEDED'; break }
        const operation = operationByRef(step.operationRef)
        if (operation === undefined) { status = 'BLOCKED_ENVIRONMENT'; blocker = 'OPERATION_REF_UNRESOLVED'; break }
        toolExecutionCount += 1
        let execution
        try {
          execution = await subject.execute({
            scenarioId: scenario.scenarioId, sessionKey: scenario.sessionKey, cwd: scenarioRoot,
            stepId: step.stepId, operation, sequence: toolExecutionCount,
          })
        } catch {
          status = 'BLOCKED_ENVIRONMENT'; blocker = 'SUBJECT_EXECUTION_FAILED'
          const issueCodes = ['ENVIRONMENT_FAILURE']
          await ledger.append('STEP_RESULT', {
            scenarioId: scenario.scenarioId, stepId: step.stepId, family: scenario.family, sessionKey: scenario.sessionKey,
            operationRef: step.operationRef, executionCapture: 'CAPTURE_INVALID', expected: step.expected,
            actualKinds: [], actualFindingIds: [], processObserved: 'UNKNOWN',
            classification: { f1: 'UNSCORABLE', f2: 'UNSCORABLE' }, issueCodes, opportunity: step.opportunity,
            beforeSessionFindingIds: [], afterSessionFindingIds: [], afterSessionTruncated: false, findingLifetime: step.findingLifetime,
          })
          break
        }
        let actualKinds = [...execution.actualKinds]
        let actualFindingIds = [...execution.actualFindingIds]
        let afterSessionFindingIds = [...execution.afterSessionFindingIds]
        let afterSessionTruncated = execution.afterSessionTruncated
        const issueCodes: string[] = []
        let evidenceScorable = execution.executionCapture === 'VALID' && execution.diagnosticCapture === 'VALID'
        if (!evidenceScorable) issueCodes.push('CAPTURE_INVALID')
        if (execution.executionId !== undefined) executionOwners.set(execution.executionId, scenario.sessionKey)

        let verificationStatus = execution.verificationStatus
        let verificationScorable = true
        if (execution.executionId !== undefined && step.f2Settlement !== 'NONE') {
          const verification = await settleVerification(subject.verificationDiagnostics(), execution.executionId, step.f2Settlement)
          if (verification.status === 'SETTLED') verificationStatus = verification.verificationStatus
          else if (verification.status === 'MISSING' && step.f2Settlement === 'ASYNC_SUPPORTED') {
            verificationScorable = false; issueCodes.push('UPSTREAM_VERIFICATION_MISSING')
          } else if (verification.status === 'CAPTURE_INVALID') {
            verificationScorable = false; issueCodes.push('CAPTURE_INVALID')
          } else if (verification.status === 'MISSING') {
            verificationScorable = false; issueCodes.push('UPSTREAM_VERIFICATION_MISSING')
          }
          const refreshed = subject.capturePublicState(scenario.sessionKey, execution.executionId)
          if (refreshed === undefined) { verificationScorable = false; issueCodes.push('CAPTURE_INVALID') }
          else {
            actualKinds = [...refreshed.actualKinds]
            actualFindingIds = [...refreshed.actualFindingIds]
            afterSessionFindingIds = [...refreshed.sessionFindingIds]
            afterSessionTruncated = refreshed.sessionTruncated
          }
        }
        const ownerIssues = findingOwnerIssues(
          scenario.sessionKey, execution.executionId, executionOwners, findingOwners,
          actualFindingIds, execution.beforeSessionFindingIds, afterSessionFindingIds,
          step.findingLifetime, findingHistory,
        )
        issueCodes.push(...ownerIssues)
        if (afterSessionTruncated) { evidenceScorable = false; issueCodes.push('CAPTURE_INVALID') }
        if (execution.actualProcess === 'UNKNOWN') { evidenceScorable = false; issueCodes.push('ENVIRONMENT_FAILURE') }
        const processObserved = execution.actualProcess
        const grade = gradeStep(step.expected, actualKinds, evidenceScorable, step.expectedProcess, processObserved, step.opportunity, evidenceScorable && verificationScorable)
        const f2 = grade.f2
        issueCodes.push(...grade.issueCodes)
        const f1 = grade.f1
        const classification = { f1: f1.classification, f2: f2.classification }
        const blockerGrade = { ...grade, f2, issueCodes: grade.issueCodes }
        const stepIssues = [...new Set(issueCodes)]
        await ledger.append('STEP_RESULT', {
          scenarioId: scenario.scenarioId, stepId: step.stepId, family: scenario.family, sessionKey: scenario.sessionKey,
          operationRef: step.operationRef, executionCapture: execution.executionCapture, expected: step.expected,
          actualKinds, actualFindingIds, ...(verificationStatus === undefined ? {} : { verificationStatus }),
          processObserved, classification, issueCodes: stepIssues, opportunity: step.opportunity, findingLifetime: step.findingLifetime,
          beforeSessionFindingIds: execution.beforeSessionFindingIds, afterSessionFindingIds, afterSessionTruncated,
        })
        const deterministicBlocker = isDeterministicProductBlocker(blockerGrade)
        const campaignBlocker = blockedStatus(stepIssues)
        if (deterministicBlocker || campaignBlocker !== undefined) {
          status = campaignBlocker ?? 'BLOCKED_P1'
          blocker = stepIssues[0] ?? grade.issueCodes[0] ?? 'DETERMINISTIC_CONTRACT_MISMATCH'
          await workspace.writeArtifact('minimal-reproducer.json', `${canonicalJson(firstManifestBlocker(manifest, scenario, step, stepIssues, actualKinds, ledger.headHash))}\n`)
          break
        }
      }
      await ledger.append('SCENARIO_END', { scenarioId: scenario.scenarioId, status: status === 'RUNNING' ? 'COMPLETE' : status })
    }
    if (status === 'RUNNING') {
      await subject.dispose()
      subject = undefined
      try { await workspace.cleanupScenarios() }
      catch { status = 'BLOCKED_ENVIRONMENT'; blocker = 'WORKSPACE_CLEANUP_FAILED' }
    }
    if (status === 'RUNNING') status = 'COMPLETE'
    await ledger.append('RUN_END', { status, scenarioCount, toolExecutionCount, ...(blocker === undefined ? {} : { blocker }) })
    const verified = await readVerifiedLedger(ledgerPath, manifest.campaignRunId)
    if (verified.status !== 'VALID') {
      status = 'BLOCKED_LEDGER'; blocker = 'LEDGER_INTEGRITY_INVALID'
    }
    const summary = status === 'COMPLETE' && verified.status === 'VALID' ? summarizeVerifiedLedger(verified) : undefined
    return Object.freeze({ status, manifest, manifestSha256: digest, scenarioCount, toolExecutionCount, ledgerHeadHash: verified.status === 'VALID' ? verified.headHash : ledger.headHash, ledgerPath, workspacePath: workspace.root, ...(summary === undefined ? {} : { summary }), ...(blocker === undefined ? {} : { blocker }) })
  } catch (error) {
    if (status === 'RUNNING') status = 'BLOCKED_ENVIRONMENT'
    blocker = error instanceof Error ? error.message.slice(0, 160) : 'CAMPAIGN_FAILURE'
    if (ledger !== undefined && !blocker.startsWith('ledger-')) {
      try { await ledger.append('RUN_END', { status, scenarioCount, toolExecutionCount, blocker: 'ENVIRONMENT_FAILURE' }) } catch { status = 'BLOCKED_LEDGER' }
    }
    const verified = await readVerifiedLedger(ledgerPath, manifest.campaignRunId)
    return Object.freeze({ status, manifest, manifestSha256: digest, scenarioCount, toolExecutionCount, ledgerHeadHash: verified.status === 'VALID' ? verified.headHash : ledger?.headHash ?? '', ledgerPath, workspacePath: workspace.root, blocker })
  } finally {
    await subject?.dispose().catch(() => undefined)
  }
}

/** Phase 13.1 smoke wrapper keeps its run policy independent of structural format capacity. */
export async function runSmokeCampaign(options: {
  readonly campaignRunId: string
  readonly seed: string
  readonly manifest?: Phase13ManifestV1
}): Promise<CampaignResult> {
  return runPhase13Campaign({ ...options, policy: PHASE13_1_SMOKE_POLICY })
}
