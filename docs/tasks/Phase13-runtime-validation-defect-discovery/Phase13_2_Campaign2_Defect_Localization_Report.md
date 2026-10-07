# Phase 13.2 Campaign-2 — Read-only Defect Localization

## Classification

`CAMPAIGN_EVIDENCE_INSUFFICIENT`

## Scope and evidence

This report reads only the saved `phase13-lane-a-canonical-v2` manifest, truth ledger, and minimal reproducer. No campaign, tests, product/provider/model code, or provider/model calls were run. The campaign workspace contains no separate diagnostics artifact.

- Localization branch base: `527d9397a114c26399a9ffe9658fef1e02af523e`
- Campaign: `phase13-lane-a-canonical-v2`
- Seed: `phase13-lane-a-canonical-v1`
- Manifest SHA-256: `110d6aa6603aa906f861868161febb4dbe5a3a190484aa2764cf79b7b7602f4b`
- Saved ledger SHA-256: `471fd6a1a00fcd38c64b562dd1518b39bed4a47d1df5f13a9ebaf67c9554f5eb`
- Saved reproducer SHA-256: `f769c86f85e2dc77219b5af9a9afa4c505c72382160e0bd1af572d92a2db55405`
- Ledger records: 9; executed steps: 5; run end: `BLOCKED_P1`; blocker: `FROZEN_CONTRACT_MISMATCH`

The preserved manifest and reproducer include operation references and expected labels, but neither stores Tool names or synthetic arguments. The ledger stores per-step findings/classification but not `FailureChainSummary`. No saved diagnostics file supplies those fields. Accordingly, the requested chain and fingerprint relation fields cannot be reconstructed from this evidence without consulting sources or rerunning the campaign, both outside this read-only localization scope.

## First scenario: observed prefix

| stepId | operationRef | Tool name | Synthetic arguments | Expected F1 | Actual F1 |
| --- | --- | --- | --- | --- | --- |
| `lane-a-s000-A5-t01` | `read-failure` | Not preserved | Not preserved | `NOT_EXPECTED` | None |
| `lane-a-s000-A5-t02` | `read-different-failure` | Not preserved | Not preserved | `NOT_EXPECTED` | None |
| `lane-a-s000-A5-t03` | `read-success` | Not preserved | Not preserved | `NOT_EXPECTED` | None |
| `lane-a-s000-A5-t04` | `read-failure` | Not preserved | Not preserved | `NOT_EXPECTED` | None |
| `lane-a-s000-A5-t05` | `read-different-failure` | Not preserved | Not preserved | `NOT_EXPECTED` | `REPEATED_FAILURE_WITHOUT_PROGRESS` |

The final step is recorded as F1 `FP`, with issue code `FROZEN_CONTRACT_MISMATCH`. The first four steps have no actual F1 in their ledger records.

## Failure-chain and fingerprint fields

| stepId | FailureChainSummary status | retryOf → stepId | retryCount | recentFailureCount | sameRootCause | truncated | reasonCodes | Fingerprint relation | Changed field fingerprint-relevant? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `lane-a-s000-A5-t01` | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not derivable | Not assessable |
| `lane-a-s000-A5-t02` | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not derivable | Not assessable |
| `lane-a-s000-A5-t03` | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not derivable | Not assessable |
| `lane-a-s000-A5-t04` | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not derivable | Not assessable |
| `lane-a-s000-A5-t05` | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not preserved | Not derivable | Not assessable |

No raw fingerprint hash or opaque finding identity is reproduced here. The saved ledger has no prior emitted finding identity for steps 1–4 and one opaque identity on step 5; that is insufficient to recover the missing summary or fingerprint relation.

## Disposition

The persisted evidence confirms an unexpected F1 on step 5 but does not contain the Tool arguments or diagnostics needed to decide whether the campaign truth, product fingerprint relation, or architecture semantics explains it. No source/test files were changed; no test or campaign rerun occurred.
