import type { ExecutionId } from './correlation.ts'

export type EvidenceCollectionStatus = 'COMPLETE' | 'PARTIAL' | 'UNAVAILABLE' | 'CANCELLED'
export type EvidenceReasonCode =
  | 'NO_TARGET_SEED'
  | 'TARGET_PLAN_UNSUPPORTED'
  | 'EXPLICIT_WORKDIR_UNRESOLVED'
  | 'TARGET_LIMIT'
  | 'TARGET_MISSING'
  | 'TARGET_RESOLUTION_FAILED'
  | 'TARGET_STAT_FAILED'
  | 'OUTSIDE_WORKSPACE'
  | 'PATH_ALIAS_OBSERVED'
  | 'DIRECTORY_TRUNCATED'
  | 'PACKAGE_MANIFEST_INVALID'
  | 'PACKAGE_MANIFEST_TOO_LARGE'
  | 'FS_CAPABILITY_UNAVAILABLE'
  | 'SHELL_CAPABILITY_UNAVAILABLE'
  | 'FS_GENERATION_STALE'
  | 'SHELL_GENERATION_STALE'
  | 'EVIDENCE_TIMEOUT'
  | 'EVIDENCE_CANCELLED'
  | 'GIT_CHECKER_UNAVAILABLE'
  | 'GIT_CHECKER_UNKNOWN'
  | 'CHECKPOINT_CAPABILITY_UNAVAILABLE'

export interface EvidenceFacts {
  readonly targetCountKnown: boolean
  readonly canonicalTargetsKnown: boolean | 'unknown'
  readonly workspaceContained: boolean | 'unknown'
  readonly pathAliasObserved: boolean | 'unknown'
  readonly versionControlled: boolean | 'unknown'
  readonly exactTargetsClean: boolean | 'unknown'
  readonly checkpointAvailable: boolean | 'unknown'
  readonly rollbackMechanismKnown: boolean | 'unknown'
  readonly packageManifestPresent: boolean | 'unknown'
  readonly packageManifestValid: boolean | 'unknown'
  readonly lifecycleScriptsPresent: boolean | 'unknown'
}

export interface EvidenceCounts {
  readonly evidenceItems: number
  readonly fileReads: number
  readonly evidenceChars: number
  readonly directoryEntries: number
}

export interface EvidenceSnapshotV1 {
  readonly schemaVersion: 1
  readonly evidenceId: string
  readonly executionId: ExecutionId
  readonly status: EvidenceCollectionStatus
  readonly observedAt: number
  readonly facts: EvidenceFacts
  readonly counts: EvidenceCounts
  readonly truncated: boolean
  readonly reasonCodes: readonly EvidenceReasonCode[]
}

export interface EvidenceDiagnostics {
  readonly get: (executionId: string) => EvidenceSnapshotV1 | undefined
  readonly snapshot: () => readonly EvidenceSnapshotV1[]
}

export function deepFreezeEvidence<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    Object.freeze(value)
    for (const child of Object.values(value as Record<string, unknown>)) deepFreezeEvidence(child)
  }
  return value
}

export const UNKNOWN_EVIDENCE_FACTS: EvidenceFacts = Object.freeze({
  targetCountKnown: false,
  canonicalTargetsKnown: 'unknown',
  workspaceContained: 'unknown',
  pathAliasObserved: 'unknown',
  versionControlled: 'unknown',
  exactTargetsClean: 'unknown',
  checkpointAvailable: 'unknown',
  rollbackMechanismKnown: 'unknown',
  packageManifestPresent: 'unknown',
  packageManifestValid: 'unknown',
  lifecycleScriptsPresent: 'unknown',
})
