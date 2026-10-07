import type { Phase13ManifestV1 } from './schema.ts'

export type FixtureBehavior = 'FAIL' | 'SUCCESS' | 'WRITE_MATCH' | 'WRITE_MISMATCH' | 'SHELL_MATCH' | 'SHELL_MISMATCH'
export type ValidationVerificationCapability = 'NONE' | 'DIRECT' | 'ASYNC_SUPPORTED'

export interface Phase13OperationV1 {
  readonly operationRef: string
  readonly toolName: 'read' | 'write' | 'bash'
  readonly arguments: Readonly<Record<string, string>>
  readonly behavior: FixtureBehavior
  readonly process: 'SUCCESS' | 'FAILURE'
  readonly verificationCapability: ValidationVerificationCapability
  readonly fixtureClass: 'NORMAL' | 'FAULT_FIXTURE'
}

function operation(
  operationRef: string,
  toolName: Phase13OperationV1['toolName'],
  arguments_: Record<string, string>,
  behavior: FixtureBehavior,
  process: Phase13OperationV1['process'],
  verificationCapability: ValidationVerificationCapability,
  fixtureClass: Phase13OperationV1['fixtureClass'] = 'NORMAL',
): Phase13OperationV1 {
  return Object.freeze({ operationRef, toolName, arguments: Object.freeze({ ...arguments_ }), behavior, process, verificationCapability, fixtureClass })
}

/** Static validation-owned operations; choices never depend on product output. */
export const PHASE13_OPERATIONS: readonly Phase13OperationV1[] = Object.freeze([
  operation('read-failure', 'read', { file_path: 'fixture.txt' }, 'FAIL', 'FAILURE', 'NONE'),
  operation('read-success', 'read', { file_path: 'fixture.txt' }, 'SUCCESS', 'SUCCESS', 'NONE'),
  operation('read-different-failure', 'read', { file_path: 'other-fixture.txt' }, 'FAIL', 'FAILURE', 'NONE'),
  operation('write-match', 'write', { file_path: 'direct-match.txt', content: 'expected-content' }, 'WRITE_MATCH', 'SUCCESS', 'DIRECT'),
  operation('write-mismatch-fault', 'write', { file_path: 'direct-fault.txt', content: 'expected-content' }, 'WRITE_MISMATCH', 'SUCCESS', 'DIRECT', 'FAULT_FIXTURE'),
  operation('bash-mkdir-match', 'bash', { command: 'mkdir phase13-match', description: 'phase13 synthetic verification' }, 'SHELL_MATCH', 'SUCCESS', 'ASYNC_SUPPORTED'),
  operation('bash-mkdir-mismatch-fault', 'bash', { command: 'mkdir phase13-fault', description: 'phase13 controlled verifier fault' }, 'SHELL_MISMATCH', 'SUCCESS', 'ASYNC_SUPPORTED', 'FAULT_FIXTURE'),
  operation('bash-unsupported', 'bash', { command: 'printf phase13', description: 'phase13 unsupported verification' }, 'SUCCESS', 'SUCCESS', 'NONE'),
])

export const PHASE13_OPERATION_REFS = Object.freeze(PHASE13_OPERATIONS.map(item => item.operationRef))

export function operationByRef(operationRef: string): Phase13OperationV1 | undefined {
  return PHASE13_OPERATIONS.find(item => item.operationRef === operationRef)
}

export interface SettlementCapabilityIssue {
  readonly code: 'SETTLEMENT_CAPABILITY_MISMATCH' | 'OPERATION_REF_UNRESOLVED'
  readonly scenarioId: string
  readonly stepId: string
  readonly operationRef: string
}

/** Validate every step using validation-owned operation metadata before allocating a workspace. */
export function validateSettlementCapabilities(manifest: Phase13ManifestV1): SettlementCapabilityIssue | undefined {
  for (const scenario of manifest.scenarios) {
    for (const step of scenario.steps) {
      const operation = operationByRef(step.operationRef)
      if (operation === undefined) {
        return Object.freeze({ code: 'OPERATION_REF_UNRESOLVED', scenarioId: scenario.scenarioId, stepId: step.stepId, operationRef: step.operationRef })
      }
      if (step.f2Settlement !== operation.verificationCapability
        || (step.expected.f2 === 'EXPECTED' && operation.verificationCapability === 'NONE')) {
        return Object.freeze({ code: 'SETTLEMENT_CAPABILITY_MISMATCH', scenarioId: scenario.scenarioId, stepId: step.stepId, operationRef: step.operationRef })
      }
    }
  }
  return undefined
}
