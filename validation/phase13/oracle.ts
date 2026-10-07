import { F1_KIND, F2_KIND, type ExpectedSignal, type OpportunityLabel, type Phase13ExpectedV1 } from './schema.ts'

export type Classification = 'TP' | 'FP' | 'FN' | 'TN' | 'NA' | 'UNSCORABLE'
export type OracleIssue =
  | 'DUPLICATE_FINDING'
  | 'UNEXPECTED_SIGNAL_ON_NOT_APPLICABLE'
  | 'PROCESS_CLASS_MISMATCH'
  | 'FROZEN_CONTRACT_MISMATCH'

export interface SignalGrade {
  readonly classification: Classification
  readonly issueCodes: readonly OracleIssue[]
}

export interface StepGrade {
  readonly f1: SignalGrade
  readonly f2: SignalGrade
  readonly issueCodes: readonly OracleIssue[]
  readonly opportunity: OpportunityLabel
}

/** Independent contract classifier: inputs are labels and observed kinds only. */
export function classifySignal(
  expected: ExpectedSignal,
  actualCount: number,
  evidenceScorable = true,
): SignalGrade {
  if (!Number.isSafeInteger(actualCount) || actualCount < 0) return { classification: 'UNSCORABLE', issueCodes: [] }
  if (!evidenceScorable) return { classification: 'UNSCORABLE', issueCodes: [] }
  if (expected === 'NOT_APPLICABLE') {
    return actualCount === 0
      ? { classification: 'NA', issueCodes: [] }
      : { classification: 'UNSCORABLE', issueCodes: ['UNEXPECTED_SIGNAL_ON_NOT_APPLICABLE'] }
  }
  if (actualCount > 1) return { classification: 'UNSCORABLE', issueCodes: ['DUPLICATE_FINDING'] }
  if (expected === 'EXPECTED') return { classification: actualCount === 1 ? 'TP' : 'FN', issueCodes: [] }
  return { classification: actualCount === 0 ? 'TN' : 'FP', issueCodes: [] }
}

export function gradeStep(
  expected: Phase13ExpectedV1,
  actualKinds: readonly string[],
  evidenceScorable = true,
  expectedProcess?: 'SUCCESS' | 'FAILURE' | 'EITHER',
  processObserved?: 'SUCCESS' | 'FAILURE' | 'UNKNOWN',
  opportunity: OpportunityLabel = 'NONE',
  f2EvidenceScorable = evidenceScorable,
): StepGrade {
  const f1 = classifySignal(expected.f1, actualKinds.filter(kind => kind === F1_KIND).length, evidenceScorable)
  const f2 = classifySignal(expected.f2, actualKinds.filter(kind => kind === F2_KIND).length, f2EvidenceScorable)
  const issueCodes: OracleIssue[] = [...f1.issueCodes, ...f2.issueCodes]
  if (expectedProcess !== undefined && expectedProcess !== 'EITHER' && processObserved !== expectedProcess) issueCodes.push('PROCESS_CLASS_MISMATCH')
  if (f1.classification === 'FP' || f1.classification === 'FN' || f2.classification === 'FP' || f2.classification === 'FN') issueCodes.push('FROZEN_CONTRACT_MISMATCH')
  return Object.freeze({
    f1,
    f2,
    issueCodes: Object.freeze([...new Set(issueCodes)]),
    opportunity,
  })
}

export function isDeterministicProductBlocker(grade: StepGrade): boolean {
  return grade.issueCodes.includes('DUPLICATE_FINDING')
    || grade.issueCodes.includes('UNEXPECTED_SIGNAL_ON_NOT_APPLICABLE')
    || grade.issueCodes.includes('PROCESS_CLASS_MISMATCH')
    || grade.issueCodes.includes('FROZEN_CONTRACT_MISMATCH')
}
