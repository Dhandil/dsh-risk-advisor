import { readFile, readdir, symlink, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { captureExecutionId, PHASE13_VERIFICATION_POLL_INTERVAL_MS, PHASE13_VERIFICATION_SETTLE_DEADLINE_MS, settleVerification } from './capture.ts'
import { canonicalJson } from './canonical.ts'
import { TruthLedger, readVerifiedLedger, verifyLedgerText } from './ledger.ts'
import { canonicalManifestJson, generateSmokeManifest, manifestSha256, REQUIRED_SMOKE_FAMILIES } from './manifest.ts'
import { operationByRef, PHASE13_OPERATION_REFS } from './operations.ts'
import { classifySignal, gradeStep } from './oracle.ts'
import { runSmokeCampaign } from './runner.ts'
import { summarizeVerifiedLedger } from './summary.ts'
import { Phase13Subject } from './subject.ts'
import { ManifestValidationError, parsePhase13ManifestV1 } from './schema.ts'
import { Phase13Workspace } from './workspace.ts'

const projectRoot = process.cwd()
const allocatedRunIds = new Set<string>()

async function workspace(runId: string): Promise<Phase13Workspace> {
  const created = await Phase13Workspace.create(runId)
  allocatedRunIds.add(runId)
  return created
}

afterEach(async () => {
  for (const runId of allocatedRunIds) {
    try { await (await Phase13Workspace.openExisting(runId)).cleanup() }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
  }
  allocatedRunIds.clear()
})

describe('Phase 13.1 independent validation harness', () => {
  it('H1 rejects invalid schema, unknown keys, duplicate identities and unresolved operations; freezes valid manifests', () => {
    const valid = generateSmokeManifest({ campaignRunId: 'h1-valid', seed: 'explicit-seed' })
    expect(Object.isFrozen(valid)).toBe(true)
    expect(Object.isFrozen(valid.scenarios[0]!.steps[0])).toBe(true)
    expect(() => parsePhase13ManifestV1({ ...valid, extra: true }, PHASE13_OPERATION_REFS)).toThrow(ManifestValidationError)
    expect(() => parsePhase13ManifestV1({ ...valid, campaignRunId: '../escape' }, PHASE13_OPERATION_REFS)).toThrow(ManifestValidationError)
    const duplicateScenario = { ...valid, scenarios: [valid.scenarios[0], valid.scenarios[0]] }
    expect(() => parsePhase13ManifestV1(duplicateScenario, PHASE13_OPERATION_REFS)).toThrow('duplicate-scenario-id')
    const first = valid.scenarios[0]!
    const duplicateStep = { ...valid, scenarios: [{ ...first, steps: [first.steps[0], first.steps[0]] }] }
    expect(() => parsePhase13ManifestV1(duplicateStep, PHASE13_OPERATION_REFS)).toThrow('duplicate-step-id')
    const unresolved = { ...valid, scenarios: [{ ...first, steps: [{ ...first.steps[0]!, operationRef: 'missing-operation' }] }] }
    expect(() => parsePhase13ManifestV1(unresolved, PHASE13_OPERATION_REFS)).toThrow('unresolved-operation-ref')
    const overStepCap = { ...valid, scenarios: [{ ...first, steps: Array.from({ length: 101 }, (_, index) => ({ ...first.steps[0]!, stepId: `h1-over-${index}` })) }] }
    expect(() => parsePhase13ManifestV1(overStepCap, PHASE13_OPERATION_REFS)).toThrow('step-count')
    const overScenarioCap = { ...valid, scenarios: Array.from({ length: 31 }, (_, index) => ({ ...first, scenarioId: `h1-scenario-${index}`, sessionKey: `h1-session-${index}`, steps: [{ ...first.steps[0]!, stepId: `h1-cap-step-${index}` }] })) }
    expect(() => parsePhase13ManifestV1(overScenarioCap, PHASE13_OPERATION_REFS)).toThrow('scenario-count')
  })

  it('H2 generates byte-identical canonical manifests for replay and varies from the explicit seed', () => {
    const a = generateSmokeManifest({ campaignRunId: 'h2-run', seed: 'seed-alpha' })
    const replay = generateSmokeManifest({ campaignRunId: 'h2-run', seed: 'seed-alpha' })
    const b = generateSmokeManifest({ campaignRunId: 'h2-run', seed: 'seed-beta' })
    expect(canonicalManifestJson(a)).toBe(canonicalManifestJson(replay))
    expect(manifestSha256(a)).toBe(manifestSha256(replay))
    expect(canonicalManifestJson(a)).not.toBe(canonicalManifestJson(b))
    expect(canonicalJson({ z: 1, a: 2 })).toBe('{"a":2,"z":1}')
  })

  it('H3 keeps the independent truth and metrics modules behind the product-import firewall', async () => {
    const files = ['schema.ts', 'manifest.ts', 'operations.ts', 'canonical.ts', 'oracle.ts', 'ledger.ts', 'summary.ts']
    const forbidden = /(?:\.\.\/\.\.\/src\/|src\/host\/(?:live-correction|retry-escalation|expected-effect|postcondition-verifier|verification-store)|OnlineCorrection|rendered advisory)/i
    const sources = await Promise.all(files.map(file => readFile(join(projectRoot, 'validation/phase13', file), 'utf8')))
    for (const source of sources) expect(source).not.toMatch(forbidden)
    expect(sources[4]).toContain('classifySignal')
    expect(sources[6]).toContain('summarizeVerifiedLedger')
  })

  it('H4 mounts the validation observer after Risk Advisor and captures one public execution identity', async () => {
    const root = await workspace('h4-capture')
    const cwd = await root.createScenario('h4-scenario')
    const subject = await Phase13Subject.create()
    try {
      const result = await subject.execute({ scenarioId: 'h4-scenario', sessionKey: 'h4-session', cwd, stepId: 'h4-step', operation: operationByRef('read-success')!, sequence: 1 })
      expect(result.executionCapture).toBe('VALID')
      expect(result.executionId).toMatch(/^ra-execution-/)
      expect(result.actualProcess).toBe('SUCCESS')
    } finally { await subject.dispose() }
  })

  it('H5 makes NOT_FOUND and AMBIGUOUS capture unscorable instead of an FN or TN', () => {
    for (const status of ['NOT_FOUND', 'AMBIGUOUS'] as const) {
      const captured = captureExecutionId({ lookup: () => ({ status }) }, {}, 'synthetic-call')
      expect(captured.status).toBe('CAPTURE_INVALID')
      const grade = gradeStep({ f1: 'EXPECTED', f2: 'NOT_EXPECTED' }, [], false)
      expect(grade.f1.classification).toBe('UNSCORABLE')
      expect(grade.f2.classification).toBe('UNSCORABLE')
    }
  })

  it('H6 grades F1 immediately after Tool settlement with no sleep path', async () => {
    const root = await workspace('h6-immediate')
    const cwd = await root.createScenario('h6-scenario')
    const subject = await Phase13Subject.create()
    try {
      const result = await subject.execute({ scenarioId: 'h6-scenario', sessionKey: 'h6-session', cwd, stepId: 'h6-step', operation: operationByRef('read-failure')!, sequence: 1 })
      expect(result.actualProcess).toBe('FAILURE')
      expect(gradeStep({ f1: 'NOT_EXPECTED', f2: 'NOT_EXPECTED' }, result.actualKinds).f1.classification).toBe('TN')
      const runnerSource = await readFile(join(projectRoot, 'validation/phase13/runner.ts'), 'utf8')
      expect(runnerSource).not.toMatch(/setTimeout|sleep\(/)
      expect(runnerSource).toMatch(/await subject\.execute[\s\S]*?gradeStep/)
    } finally { await subject.dispose() }
  })

  it('H7 settles DIRECT and ASYNC_SUPPORTED through public verification diagnostics at the frozen bounded interval', async () => {
    let reads = 0
    const direct = await settleVerification({ get: () => ({ status: 'MATCHED' }) }, 'opaque-id', 'DIRECT')
    expect(direct).toEqual({ status: 'SETTLED', verificationStatus: 'MATCHED' })
    let now = 0
    const asyncResult = await settleVerification({ get: () => ++reads > 1 ? { status: 'MISMATCHED' } : undefined }, 'opaque-id', 'ASYNC_SUPPORTED', {
      now: () => now,
      wait: async milliseconds => { expect(milliseconds).toBeLessThanOrEqual(100); now += milliseconds },
    })
    expect(asyncResult).toEqual({ status: 'SETTLED', verificationStatus: 'MISMATCHED' })
    expect(PHASE13_VERIFICATION_SETTLE_DEADLINE_MS).toBe(15_000)
    expect(PHASE13_VERIFICATION_POLL_INTERVAL_MS).toBeGreaterThanOrEqual(25)
    expect(PHASE13_VERIFICATION_POLL_INTERVAL_MS).toBeLessThanOrEqual(100)
  })

  it('H8 applies exact EXPECTED, NOT_EXPECTED and NOT_APPLICABLE rules', () => {
    expect(classifySignal('EXPECTED', 1).classification).toBe('TP')
    expect(classifySignal('EXPECTED', 0).classification).toBe('FN')
    expect(classifySignal('NOT_EXPECTED', 0).classification).toBe('TN')
    expect(classifySignal('NOT_EXPECTED', 1).classification).toBe('FP')
    expect(classifySignal('NOT_APPLICABLE', 0).classification).toBe('NA')
    expect(classifySignal('NOT_APPLICABLE', 1).issueCodes).toContain('UNEXPECTED_SIGNAL_ON_NOT_APPLICABLE')
    expect(classifySignal('EXPECTED', 2).issueCodes).toContain('DUPLICATE_FINDING')
  })

  it('H9 opportunity candidates stay outside F1/F2 precision and recall', async () => {
    const runA = await completeLedger('h9-with-opportunity', 'OUT_OF_SCOPE_USEFUL_WARNING_CANDIDATE')
    const runB = await completeLedger('h9-without-opportunity', 'NONE')
    const a = summarizeVerifiedLedger(await readVerifiedLedger(runA.path, runA.runId))
    const b = summarizeVerifiedLedger(await readVerifiedLedger(runB.path, runB.runId))
    expect(a.opportunityCandidateCount).toBe(1)
    expect(b.opportunityCandidateCount).toBe(0)
    expect(a.f1).toEqual(b.f1)
    expect(a.f2).toEqual(b.f2)
  })

  it('H10 verifies hash continuity and rejects mutation, deletion, truncation and duplicate RUN_END', async () => {
    const run = await completeLedger('h10-ledger', 'NONE')
    const original = await readFile(run.path, 'utf8')
    expect(verifyLedgerText(original, run.runId).status).toBe('VALID')
    expect(verifyLedgerText(original.replace('"status":"COMPLETE"', '"status":"BLOCKED_P1"'), run.runId).status).toBe('LEDGER_INTEGRITY_INVALID')
    const lines = original.trimEnd().split('\n')
    expect(verifyLedgerText(`${lines.filter((_, index) => index !== 1).join('\n')}\n`, run.runId).status).toBe('LEDGER_INTEGRITY_INVALID')
    expect(verifyLedgerText(original.slice(0, -4), run.runId).status).toBe('LEDGER_INTEGRITY_INVALID')
    expect(verifyLedgerText(`${original}${lines.at(-1)}\n`, run.runId).status).toBe('LEDGER_INTEGRITY_INVALID')
  })

  it('H11 rejects raw/private ledger fields and bounded-payload overflow without appending them', async () => {
    const root = await workspace('h11-privacy')
    const path = await root.resolveArtifactPath('truth-ledger.jsonl')
    const ledger = await TruthLedger.create(path, 'h11-privacy', { generatorVersion: 'phase13-generator-v1', seed: 'h11-seed', lane: 'A', manifestSha256: '0'.repeat(64), subjectBoundary: 'PINNED_HARNESS_PUBLIC_DIAGNOSTICS' })
    await expect(ledger.append('SCENARIO_START', { scenarioId: 'safe', command: 'DO_NOT_PERSIST' })).rejects.toThrow('ledger-forbidden-key')
    await expect(ledger.append('SCENARIO_START', { values: Array.from({ length: 129 }, (_, index) => index) })).rejects.toThrow('ledger-array-cap')
    await expect(ledger.append('SCENARIO_START', { marker: '/Users/sentinel/private' })).rejects.toThrow('ledger-string-unbounded-or-path')
    await ledger.append('RUN_END', { status: 'COMPLETE', scenarioCount: 0, toolExecutionCount: 0 })
    expect((await readVerifiedLedger(path, 'h11-privacy')).status).toBe('VALID')
  })

  it('H12 rejects absolute/traversal paths and symlink mutation or cleanup outside the temporary root', async () => {
    const root = await workspace('h12-containment')
    const scenario = await root.createScenario('h12-scenario')
    await expect(root.resolveScenarioPath('h12-scenario', '../outside')).rejects.toThrow('containment')
    await expect(root.resolveScenarioPath('h12-scenario', '/tmp/outside')).rejects.toThrow('containment')
    await symlink('/tmp', join(scenario, 'escape'))
    await expect(root.resolveScenarioPath('h12-scenario', 'escape/sentinel')).rejects.toThrow('containment')
    await symlink('/tmp', join(scenario, 'leaf-link'))
    await expect(root.writeScenarioFile('h12-scenario', 'leaf-link', 'must-not-write')).rejects.toThrow('containment')
    await expect(root.cleanup()).rejects.toThrow('containment')
    await unlink(join(scenario, 'escape'))
    await unlink(join(scenario, 'leaf-link'))
    await root.cleanup()
  })

  it('H13 resets each scenario to its declared deterministic baseline', async () => {
    const root = await workspace('h13-reset')
    await root.createScenario('h13-scenario')
    await root.writeScenarioFile('h13-scenario', 'old.txt', 'stale')
    await root.resetScenario('h13-scenario', { 'baseline.txt': 'baseline-v1', 'nested/seed.txt': 'nested-seed' })
    expect(await root.readScenarioFile('h13-scenario', 'baseline.txt')).toBe('baseline-v1')
    expect(await root.readScenarioFile('h13-scenario', 'nested/seed.txt')).toBe('nested-seed')
    await expect(root.readScenarioFile('h13-scenario', 'old.txt')).rejects.toThrow()
  })

  it('H14 calculates precision/recall and represents empty denominators as N/A', async () => {
    const run = await completeLedger('h14-metrics', 'NONE', { f1: 'EXPECTED', f2: 'NOT_APPLICABLE' }, { f1: 'TP', f2: 'NA' })
    const summary = summarizeVerifiedLedger(await readVerifiedLedger(run.path, run.runId))
    expect(summary.f1).toMatchObject({ expectedPositives: 1, TP: 1, precision: 1, recall: 1 })
    expect(summary.f2.precision).toBe('N/A')
    expect(summary.f2.recall).toBe('N/A')
  })

  it('H15 stops at the first deterministic FN and writes a minimal reproducer', async () => {
    const runId = 'h15-blocker'
    const badManifest = parsePhase13ManifestV1({
      schemaVersion: 1, generatorVersion: 'phase13-generator-v1', campaignRunId: runId, seed: 'h15-seed', lane: 'A',
      scenarios: [
        { scenarioId: 'scenario-blocking-fn', family: 'fault-fixture-proof', sessionKey: 'session-h15-a', steps: [
          { stepId: 'step-fn', operationRef: 'read-failure', expectedProcess: 'FAILURE', expected: { f1: 'EXPECTED', f2: 'NOT_EXPECTED' }, f2Settlement: 'NONE', opportunity: 'NONE' },
        ] },
        { scenarioId: 'scenario-must-not-run', family: 'after-blocker', sessionKey: 'session-h15-b', steps: [
          { stepId: 'step-skipped', operationRef: 'read-success', expectedProcess: 'SUCCESS', expected: { f1: 'NOT_EXPECTED', f2: 'NOT_EXPECTED' }, f2Settlement: 'NONE', opportunity: 'NONE' },
        ] },
      ],
    }, PHASE13_OPERATION_REFS)
    const result = await runSmokeCampaign({ campaignRunId: runId, seed: 'h15-seed', manifest: badManifest })
    allocatedRunIds.add(runId)
    expect(result.status, result.blocker).toBe('BLOCKED_P1')
    expect(result.scenarioCount).toBe(1)
    expect(result.toolExecutionCount).toBe(1)
    const reproducer = JSON.parse(await readFile(join(result.workspacePath, 'minimal-reproducer.json'), 'utf8')) as { scenarioId: string; ledgerHeadHash: string }
    expect(reproducer.scenarioId).toBe('scenario-blocking-fn')
    expect(reproducer.ledgerHeadHash).toMatch(/^[a-f0-9]{64}$/)
    const verifiedOnce = await readVerifiedLedger(result.ledgerPath, runId)
    const verifiedReplay = await readVerifiedLedger(result.ledgerPath, runId)
    expect(verifiedOnce.status).toBe('VALID')
    expect(verifiedReplay.status).toBe('VALID')
    if (verifiedOnce.status === 'VALID' && verifiedReplay.status === 'VALID') expect(verifiedReplay.headHash).toBe(verifiedOnce.headHash)
    expect(new Set(await readdir(result.workspacePath))).toEqual(new Set(['minimal-reproducer.json', 'scenario-blocking-fn', 'truth-ledger.jsonl']))
  })

  it('H16 capture, environment and unresolved async verification stay unscorable, never FN/TN', async () => {
    const grade = gradeStep({ f1: 'EXPECTED', f2: 'NOT_EXPECTED' }, [], false)
    expect(grade.f1.classification).toBe('UNSCORABLE')
    expect(grade.f2.classification).toBe('UNSCORABLE')
    const asyncMissing = gradeStep({ f1: 'NOT_EXPECTED', f2: 'EXPECTED' }, [], true, 'SUCCESS', 'SUCCESS', 'NONE', false)
    expect(asyncMissing.f1.classification).toBe('TN')
    expect(asyncMissing.f2.classification).toBe('UNSCORABLE')
    let now = 0
    const missing = await settleVerification({ get: () => undefined }, 'opaque-id', 'ASYNC_SUPPORTED', {
      now: () => now,
      wait: async milliseconds => { now += milliseconds },
    })
    expect(missing).toEqual({ status: 'MISSING' })
    expect(now).toBe(PHASE13_VERIFICATION_SETTLE_DEADLINE_MS)
    expect((await readFile(join(projectRoot, 'validation/phase13/runner.ts'), 'utf8'))).toContain('UPSTREAM_VERIFICATION_MISSING')
  })

  it('H17 runs two independent Sessions concurrently without cross-attributing Findings', async () => {
    const root = await workspace('h17-sessions')
    const cwdA = await root.createScenario('h17-a')
    const cwdB = await root.createScenario('h17-b')
    const subject = await Phase13Subject.create()
    try {
      await Promise.all([
        subject.execute({ scenarioId: 'h17-a', sessionKey: 'h17-session-a', cwd: cwdA, stepId: 'first-a', operation: operationByRef('read-failure')!, sequence: 1 }),
        subject.execute({ scenarioId: 'h17-b', sessionKey: 'h17-session-b', cwd: cwdB, stepId: 'first-b', operation: operationByRef('read-failure')!, sequence: 2 }),
      ])
      const [secondA, secondB] = await Promise.all([
        subject.execute({ scenarioId: 'h17-a', sessionKey: 'h17-session-a', cwd: cwdA, stepId: 'second-a', operation: operationByRef('read-failure')!, sequence: 3 }),
        subject.execute({ scenarioId: 'h17-b', sessionKey: 'h17-session-b', cwd: cwdB, stepId: 'second-b', operation: operationByRef('read-failure')!, sequence: 4 }),
      ])
      expect(secondA.actualKinds, canonicalJson(secondA)).toEqual(['REPEATED_FAILURE_WITHOUT_PROGRESS'])
      expect(secondB.actualKinds, canonicalJson(secondB)).toEqual(['REPEATED_FAILURE_WITHOUT_PROGRESS'])
      expect(secondA.actualFindingIds[0]).not.toBe(secondB.actualFindingIds[0])
      expect(secondA.afterSessionFindingIds).toContain(secondA.actualFindingIds[0])
      expect(secondB.afterSessionFindingIds).toContain(secondB.actualFindingIds[0])
      expect(secondA.afterSessionFindingIds).not.toContain(secondB.actualFindingIds[0])
      expect(secondB.afterSessionFindingIds).not.toContain(secondA.actualFindingIds[0])
    } finally { await subject.dispose() }
  })

  it('H18 runs deterministic bounded smoke across all required families and returns a verified hash-chain head', async () => {
    const runId = 'h18-smoke'
    const result = await runSmokeCampaign({ campaignRunId: runId, seed: 'phase13-smoke-seed-v1' })
    allocatedRunIds.add(runId)
    process.stdout.write(`[PHASE13_SMOKE] ${JSON.stringify({ status: result.status, scenarios: result.scenarioCount, toolExecutions: result.toolExecutionCount, manifestSha256: result.manifestSha256, ledgerHeadHash: result.ledgerHeadHash, f1: result.summary?.f1, f2: result.summary?.f2 })}\n`)
    expect(result.status, JSON.stringify({ blocker: result.blocker, scenarios: result.scenarioCount, steps: result.toolExecutionCount, summary: result.summary })).toBe('COMPLETE')
    expect(result.toolExecutionCount).toBeLessThanOrEqual(100)
    expect(result.scenarioCount).toBeLessThanOrEqual(30)
    const families = new Set(result.manifest.scenarios.map(scenario => scenario.family))
    for (const family of REQUIRED_SMOKE_FAMILIES) expect(families.has(family)).toBe(true)
    const replay = await runSmokeCampaign({ campaignRunId: 'h18-replay', seed: 'phase13-smoke-seed-v1' })
    allocatedRunIds.add('h18-replay')
    expect(replay.manifest.scenarios.map(({ scenarioId, family, steps }) => ({ scenarioId, family, steps })))
      .toEqual(result.manifest.scenarios.map(({ scenarioId, family, steps }) => ({ scenarioId, family, steps })))
    expect(result.summary?.ledgerHeadHash).toBe(result.ledgerHeadHash)
    expect(result.ledgerHeadHash).toMatch(/^[a-f0-9]{64}$/)
    const verifiedOnce = await readVerifiedLedger(result.ledgerPath, runId)
    const verifiedReplay = await readVerifiedLedger(result.ledgerPath, runId)
    expect(verifiedOnce.status).toBe('VALID')
    expect(verifiedReplay.status).toBe('VALID')
    if (verifiedOnce.status === 'VALID' && verifiedReplay.status === 'VALID') expect(verifiedReplay.headHash).toBe(verifiedOnce.headHash)
    expect(new Set(await readdir(result.workspacePath))).toEqual(new Set(['truth-ledger.jsonl']))
    expect(result.manifest.scenarios.every(scenario => scenario.steps.every(step => operationByRef(step.operationRef) !== undefined))).toBe(true)
    const changed = (await import('node:child_process')).execFileSync('git', ['diff', '--name-only', 'origin/main', '--', 'src', 'package.json', 'pnpm-lock.yaml', 'tsconfig.json', 'vitest.config.ts'], { cwd: projectRoot, encoding: 'utf8' })
    expect(changed.trim()).toBe('')
  })
})

async function completeLedger(runId: string, opportunity: 'NONE' | 'OUT_OF_SCOPE_USEFUL_WARNING_CANDIDATE', expected = { f1: 'NOT_EXPECTED', f2: 'NOT_APPLICABLE' }, classification = { f1: 'TN', f2: 'NA' }) {
  const root = await workspace(runId)
  const path = await root.resolveArtifactPath('truth-ledger.jsonl')
  const ledger = await TruthLedger.create(path, runId, { generatorVersion: 'phase13-generator-v1', seed: 'explicit', lane: 'A', manifestSha256: '0'.repeat(64), subjectBoundary: 'PINNED_HARNESS_PUBLIC_DIAGNOSTICS' })
  await ledger.append('SCENARIO_START', { scenarioId: 'scenario-001', family: 'test-family', sessionKey: 'session-001' })
  await ledger.append('STEP_RESULT', {
    scenarioId: 'scenario-001', stepId: 'step-001', family: 'test-family', sessionKey: 'session-001', operationRef: 'read-success',
    executionCapture: 'VALID', expected, actualKinds: [], actualFindingIds: [], processObserved: 'SUCCESS', classification,
    issueCodes: [], opportunity, beforeSessionFindingIds: [], afterSessionFindingIds: [], afterSessionTruncated: false,
  })
  await ledger.append('SCENARIO_END', { scenarioId: 'scenario-001', status: 'COMPLETE' })
  await ledger.append('RUN_END', { status: 'COMPLETE', scenarioCount: 1, toolExecutionCount: 1 })
  return { path, runId }
}
