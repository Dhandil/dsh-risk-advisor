import type { EvidenceSnapshotV1 } from './evidence-types.ts'

/**
 * The single Phase-8 materiality predicate shared by A3 and the Phase-9
 * trigger. Collection status alone is not evidence; at least one bounded
 * Phase-8 fact must have resolved to a non-unknown value.
 */
export function isMaterialEvidence(snapshot: EvidenceSnapshotV1): boolean {
  const facts = snapshot.facts
  return facts.canonicalTargetsKnown !== 'unknown'
    || facts.workspaceContained !== 'unknown'
    || facts.pathAliasObserved !== 'unknown'
    || facts.versionControlled !== 'unknown'
    || facts.exactTargetsClean !== 'unknown'
    || facts.rollbackMechanismKnown !== 'unknown'
    || facts.packageManifestPresent !== 'unknown'
    || facts.packageManifestValid !== 'unknown'
    || facts.lifecycleScriptsPresent !== 'unknown'
}
