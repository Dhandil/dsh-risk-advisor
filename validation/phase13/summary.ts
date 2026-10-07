import type { LedgerVerification } from './ledger.ts'
import type { Classification, SignalGrade } from './oracle.ts'

export interface SignalMetrics {
  readonly expectedPositives: number
  readonly expectedNegatives: number
  readonly TP: number
  readonly FP: number
  readonly FN: number
  readonly TN: number
  readonly NA: number
  readonly unscorable: number
  readonly precision: number | 'N/A'
  readonly recall: number | 'N/A'
}

export interface Phase13Summary {
  readonly scenarioCount: number
  readonly toolExecutionCount: number
  readonly findingCount: number
  readonly duplicateCount: number
  readonly wrongSessionCount: number
  readonly resurrectedFindingCount: number
  readonly findingLifetimeViolationCount: number
  readonly captureFailures: number
  readonly upstreamVerificationMissing: number
  readonly environmentFailures: number
  readonly opportunityCandidateCount: number
  readonly ledgerHeadHash: string
  readonly f1: SignalMetrics
  readonly f2: SignalMetrics
}

function metrics(rows: readonly Record<string, unknown>[], field: 'f1' | 'f2'): SignalMetrics {
  let expectedPositives = 0; let expectedNegatives = 0
  let TP = 0; let FP = 0; let FN = 0; let TN = 0; let NA = 0; let unscorable = 0
  for (const row of rows) {
    const expected = row.expected
    const classification = row.classification
    if (expected === null || typeof expected !== 'object' || classification === null || typeof classification !== 'object') continue
    const label = (expected as Record<string, unknown>)[field]
    const result = (classification as Record<string, unknown>)[field]
    if (label === 'EXPECTED') expectedPositives += 1
    if (label === 'NOT_EXPECTED') expectedNegatives += 1
    switch (result as Classification) {
      case 'TP': TP += 1; break
      case 'FP': FP += 1; break
      case 'FN': FN += 1; break
      case 'TN': TN += 1; break
      case 'NA': NA += 1; break
      case 'UNSCORABLE': unscorable += 1; break
    }
  }
  const precisionDenominator = TP + FP
  const recallDenominator = TP + FN
  return Object.freeze({
    expectedPositives, expectedNegatives, TP, FP, FN, TN, NA, unscorable,
    precision: precisionDenominator === 0 ? 'N/A' : TP / precisionDenominator,
    recall: recallDenominator === 0 ? 'N/A' : TP / recallDenominator,
  })
}

/** Metrics are available only from a completed, integrity-verified ledger. */
export function summarizeVerifiedLedger(verification: LedgerVerification): Phase13Summary {
  if (verification.status !== 'VALID' || !verification.completed) throw new Error('metrics-require-verified-complete-ledger')
  const terminal = [...verification.records].reverse().find(record => record.type === 'RUN_END')
  if (terminal?.payload.status !== 'COMPLETE') throw new Error('metrics-require-complete-campaign')
  const rows = verification.records.filter(record => record.type === 'STEP_RESULT').map(record => record.payload)
  const scenarios = verification.records.filter(record => record.type === 'SCENARIO_END').length
  const countIssue = (code: string) => rows.filter(row => Array.isArray(row.issueCodes) && row.issueCodes.includes(code)).length
  const findings = rows.reduce((total, row) => total + (Array.isArray(row.actualKinds) ? row.actualKinds.length : 0), 0)
  const opportunities = rows.filter(row => row.opportunity === 'OUT_OF_SCOPE_USEFUL_WARNING_CANDIDATE').length
  return Object.freeze({
    scenarioCount: scenarios,
    toolExecutionCount: rows.length,
    findingCount: findings,
    duplicateCount: countIssue('DUPLICATE_FINDING'),
    wrongSessionCount: countIssue('WRONG_SESSION_FINDING'),
    resurrectedFindingCount: countIssue('RESURRECTED_FINDING'),
    findingLifetimeViolationCount: countIssue('FINDING_LIFETIME_VIOLATION'),
    captureFailures: countIssue('CAPTURE_INVALID'),
    upstreamVerificationMissing: countIssue('UPSTREAM_VERIFICATION_MISSING'),
    environmentFailures: countIssue('ENVIRONMENT_FAILURE'),
    opportunityCandidateCount: opportunities,
    ledgerHeadHash: verification.headHash,
    f1: metrics(rows, 'f1'),
    f2: metrics(rows, 'f2'),
  })
}

export function isStepGrade(value: unknown): value is { readonly f1: SignalGrade; readonly f2: SignalGrade } {
  return value !== null && typeof value === 'object' && 'f1' in value && 'f2' in value
}
