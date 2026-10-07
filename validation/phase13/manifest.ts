import { canonicalJson, sha256Hex } from './canonical.ts'
import { PHASE13_OPERATION_REFS } from './operations.ts'
import {
  PHASE13_GENERATOR_VERSION,
  parsePhase13ManifestV1,
  type ExpectedProcess,
  type ExpectedSignal,
  type F2Settlement,
  type Phase13ManifestV1,
  type Phase13ScenarioV1,
  type Phase13StepV1,
} from './schema.ts'

export const REQUIRED_SMOKE_FAMILIES = Object.freeze([
  'success-no-finding',
  'isolated-failure-no-f1',
  'exact-repeat-f1',
  'changed-operation-no-f1',
  'success-breaks-retry-chain',
  'direct-f2-matched',
  'direct-f2-fault-fixture',
  'async-f2-matched',
  'async-f2-fault-fixture',
  'unsupported-verification',
  'two-session-isolation',
  'deterministic-replay-ledger',
] as const)

export interface SmokeManifestOptions {
  readonly campaignRunId: string
  readonly seed: string
}

function step(
  stepId: string,
  operationRef: string,
  f1: ExpectedSignal,
  f2: ExpectedSignal = 'NOT_EXPECTED',
  f2Settlement: F2Settlement = 'NONE',
  expectedProcess: ExpectedProcess = operationRef === 'read-failure' || operationRef === 'read-different-failure' ? 'FAILURE' : 'SUCCESS',
): Phase13StepV1 {
  return { stepId, operationRef, expectedProcess, expected: { f1, f2 }, f2Settlement, opportunity: 'NONE', findingLifetime: 'NO_ASSERTION' }
}

function scenario(scenarioId: string, family: string, sessionKey: string, steps: readonly Phase13StepV1[]): Phase13ScenarioV1 {
  return { scenarioId, family, sessionKey, steps }
}

/** Generate the bounded Phase 13.1 smoke plan without consulting subject output. */
export function generateSmokeManifest(options: SmokeManifestOptions): Phase13ManifestV1 {
  const seedDigest = sha256Hex(`${PHASE13_GENERATOR_VERSION}|${options.seed}`)
  const a = `session-${seedDigest.slice(0, 8)}-a`
  const b = `session-${seedDigest.slice(8, 16)}-b`
  const scenarios: Phase13ScenarioV1[] = [
    scenario('scenario-success', 'success-no-finding', `session-${seedDigest.slice(16, 24)}-s`, [step('step-001', 'read-success', 'NOT_EXPECTED')]),
    scenario('scenario-isolated-failure', 'isolated-failure-no-f1', `session-${seedDigest.slice(24, 32)}-i`, [step('step-002', 'read-failure', 'NOT_EXPECTED')]),
    scenario('scenario-exact-repeat', 'exact-repeat-f1', `session-${seedDigest.slice(32, 40)}-r`, [
      step('step-003', 'read-failure', 'NOT_EXPECTED'), step('step-004', 'read-failure', 'EXPECTED'),
    ]),
    scenario('scenario-changed-operation', 'changed-operation-no-f1', `session-${seedDigest.slice(40, 48)}-c`, [
      step('step-005', 'read-failure', 'NOT_EXPECTED'), step('step-006', 'read-different-failure', 'NOT_EXPECTED'),
    ]),
    scenario('scenario-success-break', 'success-breaks-retry-chain', `session-${seedDigest.slice(48, 56)}-b`, [
      step('step-007', 'read-failure', 'NOT_EXPECTED'), step('step-008', 'read-success', 'NOT_EXPECTED'), step('step-009', 'read-failure', 'NOT_EXPECTED'),
    ]),
    scenario('scenario-direct-match', 'direct-f2-matched', `session-${seedDigest.slice(0, 8)}-dm`, [step('step-010', 'write-match', 'NOT_EXPECTED', 'NOT_EXPECTED', 'DIRECT')]),
    scenario('scenario-direct-fault', 'direct-f2-fault-fixture', `session-${seedDigest.slice(8, 16)}-df`, [step('step-011', 'write-mismatch-fault', 'NOT_EXPECTED', 'EXPECTED', 'DIRECT')]),
    scenario('scenario-async-match', 'async-f2-matched', `session-${seedDigest.slice(16, 24)}-am`, [step('step-012', 'bash-mkdir-match', 'NOT_EXPECTED', 'NOT_EXPECTED', 'ASYNC_SUPPORTED')]),
    scenario('scenario-async-fault', 'async-f2-fault-fixture', `session-${seedDigest.slice(24, 32)}-af`, [step('step-013', 'bash-mkdir-mismatch-fault', 'NOT_EXPECTED', 'EXPECTED', 'ASYNC_SUPPORTED')]),
    scenario('scenario-unsupported', 'unsupported-verification', `session-${seedDigest.slice(32, 40)}-u`, [step('step-014', 'bash-unsupported', 'NOT_EXPECTED')]),
    scenario('scenario-session-a', 'two-session-isolation', a, [step('step-015', 'read-failure', 'NOT_EXPECTED'), step('step-016', 'read-failure', 'EXPECTED')]),
    scenario('scenario-session-b', 'two-session-isolation', b, [step('step-017', 'read-failure', 'NOT_EXPECTED'), step('step-018', 'read-failure', 'EXPECTED')]),
    scenario('scenario-replay-ledger', 'deterministic-replay-ledger', `session-${seedDigest.slice(56, 64)}-l`, [step('step-019', 'read-success', 'NOT_EXPECTED')]),
  ]
  return parsePhase13ManifestV1({
    schemaVersion: 1,
    generatorVersion: PHASE13_GENERATOR_VERSION,
    campaignRunId: options.campaignRunId,
    seed: options.seed,
    lane: 'A',
    scenarios,
  }, PHASE13_OPERATION_REFS)
}

export function canonicalManifestJson(manifest: Phase13ManifestV1): string {
  return canonicalJson(manifest)
}

export function manifestSha256(manifest: Phase13ManifestV1): string {
  return sha256Hex(canonicalManifestJson(manifest))
}
