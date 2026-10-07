export type FixtureBehavior = 'FAIL' | 'SUCCESS' | 'WRITE_MATCH' | 'WRITE_MISMATCH' | 'SHELL_MATCH' | 'SHELL_MISMATCH'

export interface Phase13OperationV1 {
  readonly operationRef: string
  readonly toolName: 'read' | 'write' | 'bash'
  readonly arguments: Readonly<Record<string, string>>
  readonly behavior: FixtureBehavior
  readonly process: 'SUCCESS' | 'FAILURE'
  readonly fixtureClass: 'NORMAL' | 'FAULT_FIXTURE'
}

function operation(
  operationRef: string,
  toolName: Phase13OperationV1['toolName'],
  arguments_: Record<string, string>,
  behavior: FixtureBehavior,
  process: Phase13OperationV1['process'],
  fixtureClass: Phase13OperationV1['fixtureClass'] = 'NORMAL',
): Phase13OperationV1 {
  return Object.freeze({ operationRef, toolName, arguments: Object.freeze({ ...arguments_ }), behavior, process, fixtureClass })
}

/** Static validation-owned operations; choices never depend on product output. */
export const PHASE13_OPERATIONS: readonly Phase13OperationV1[] = Object.freeze([
  operation('read-failure', 'read', { file_path: 'fixture.txt' }, 'FAIL', 'FAILURE'),
  operation('read-success', 'read', { file_path: 'fixture.txt' }, 'SUCCESS', 'SUCCESS'),
  operation('read-different-failure', 'read', { file_path: 'other-fixture.txt' }, 'FAIL', 'FAILURE'),
  operation('write-match', 'write', { file_path: 'direct-match.txt', content: 'expected-content' }, 'WRITE_MATCH', 'SUCCESS'),
  operation('write-mismatch-fault', 'write', { file_path: 'direct-fault.txt', content: 'expected-content' }, 'WRITE_MISMATCH', 'SUCCESS', 'FAULT_FIXTURE'),
  operation('bash-mkdir-match', 'bash', { command: 'mkdir phase13-match', description: 'phase13 synthetic verification' }, 'SHELL_MATCH', 'SUCCESS'),
  operation('bash-mkdir-mismatch-fault', 'bash', { command: 'mkdir phase13-fault', description: 'phase13 controlled verifier fault' }, 'SHELL_MISMATCH', 'SUCCESS', 'FAULT_FIXTURE'),
  operation('bash-unsupported', 'bash', { command: 'printf phase13', description: 'phase13 unsupported verification' }, 'SUCCESS', 'SUCCESS'),
])

export const PHASE13_OPERATION_REFS = Object.freeze(PHASE13_OPERATIONS.map(item => item.operationRef))

export function operationByRef(operationRef: string): Phase13OperationV1 | undefined {
  return PHASE13_OPERATIONS.find(item => item.operationRef === operationRef)
}
