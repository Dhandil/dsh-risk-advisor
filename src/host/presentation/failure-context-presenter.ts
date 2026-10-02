import type { FailureContextPresentationV1 } from '../../bridge-contract.ts'
import type { FailureChainSummary } from '../retry-escalation.ts'

const COUNT_LIMIT = 1_000_000

export function presentFailureContext(summary: FailureChainSummary): FailureContextPresentationV1 {
  return Object.freeze({
    schemaVersion: 1,
    retryCount: count(summary.retryCount),
    recentFailureCount: count(summary.recentFailureCount),
    sameRootCause: summary.sameRootCause,
    permissionEscalation: summary.permissionEscalation,
    truncated: summary.truncated,
  })
}

function count(value: number): number { return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, COUNT_LIMIT) : COUNT_LIMIT }
