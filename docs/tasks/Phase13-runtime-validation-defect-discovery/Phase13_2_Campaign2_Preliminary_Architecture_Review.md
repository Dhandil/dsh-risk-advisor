# Risk Advisor Phase 13.2 Campaign-2 — Preliminary Architecture Review

## Status

`RISK_ADVISOR_PHASE13_2_CAMPAIGN2_P1_DEFECT_LOCALIZATION_REQUIRED`

The fresh canonical campaign stopped correctly at its first deterministic blocker after 1 scenario / 5 Tool executions.

Reported blocker:

`FROZEN_CONTRACT_MISMATCH`

Reported symptom:

A5 changed-argument retry emitted F1 where the campaign truth expected no F1.

This is materially different from quarantined Campaign-1 because:

- Repair2 prevalidation passed;
- settlement capability prevalidation passed for the complete 300/1500 manifest;
- capture/ledger integrity were not reported as blockers;
- provider/model/Judge/subagent calls were zero;
- the blocker is a frozen-contract mismatch, not upstream verifier absence.

However Product Repair is **not yet authorized**.

## Why localization is required before Product repair

Accepted Product source already proves that retry fingerprints include relevant operation arguments.

Examples:

- read fingerprint includes `file_path`, `offset`, `limit`;
- write fingerprint includes `file_path`, `content`;
- bash/pwsh fingerprint includes `command`, `workdir`, `run_in_background`.

Existing P3 regression tests already prove:

- changed write content -> no `retryOf`;
- changed bash command -> no `retryOf`;
- changed bash workdir -> no `retryOf`;
- changed bash background mode -> no `retryOf`.

Therefore the Campaign-2 symptom has at least two materially different possible causes.

### Candidate A — campaign truth error

The changed argument may be a retry-variant field intentionally excluded from the fingerprint, such as:

- shell description;
- timeout;
- escalation permission/justification metadata.

If so, Product behavior may be correct and the A5 truth label is wrong.

### Candidate B — non-adjacent historical fingerprint reuse

The changed argument may differ from the immediately previous operation but equal a fingerprint used by an older failed execution in the same Session.

The current analyzer selects the nearest prior **matching fingerprint**, not necessarily the immediately previous Tool execution.

If the A5 step reconnects to an older matching failure across an intervening different fingerprint, Architecture must decide whether that behavior is consistent with frozen:

`STOP_EXACT_RETRY_PATH_V1`

and:

“repeated failure of the same exact operation fingerprint”

or whether “retry path” requires adjacency/continuation semantics that the analyzer currently lacks.

This distinction cannot be resolved safely from the high-level campaign token alone.

## Existing Product facts

Current retry relation behavior:

1. capture current operation fingerprint;
2. search Session history backward for nearest record with the **same fingerprint**;
3. if that record is an eligible settled failure, create `retryOf`;
4. intermediate operations with a different fingerprint do not, by themselves, block that same-fingerprint historical edge.

Current Live Correction F1 then trusts a READY FailureChainSummary with:

- retryOf present;
- retryCount >= 1;
- recentFailureCount >= 2;
- sameRootCause === true;
- !truncated.

Therefore a non-adjacent same-fingerprint relation can currently emit F1.

## Required read-only localization

Use only the preserved Campaign-2 evidence.

Do not rerun the campaign yet.

Produce one bounded defect-localization report containing the first scenario prefix through the failing fifth Tool execution.

For each of the five steps record only synthetic/bounded evidence:

- scenarioId;
- stepId;
- operationRef;
- Tool name;
- the exact validation-owned synthetic argument fields;
- expected F1 label;
- whether a F1 Finding appeared;
- FailureChainSummary:
  - status;
  - retryOf mapped to prior stepId if present;
  - retryCount;
  - recentFailureCount;
  - sameRootCause;
  - truncated;
  - reasonCodes;
- whether the current operation fingerprint is:
  - SAME_AS_IMMEDIATE_PRIOR;
  - DIFFERENT_FROM_IMMEDIATE_PRIOR;
  - SAME_AS_EARLIER_NON_ADJACENT;
  - UNIQUE_IN_PREFIX.

Do not print raw Product fingerprint hashes.

Also state whether the changed field is fingerprint-relevant under accepted Product rules.

## Decision table

### If changed field is fingerprint-irrelevant

Outcome:

`CAMPAIGN_TRUTH_DEFECT`

Return to Phase 13 validation manifest repair. No Product change.

### If fingerprint is unique in prefix but Product reports retryOf/F1

Outcome:

`PRODUCT_FINGERPRINT_RELATION_DEFECT`

Authorize Product repair.

### If fingerprint equals an older non-adjacent failure

Outcome:

`ARCHITECTURE_SEMANTICS_DECISION_REQUIRED`

Do not modify Product until Architecture decides whether non-adjacent exact-fingerprint reuse is valid V1 behavior.

### If evidence is incomplete

Outcome:

`CAMPAIGN_EVIDENCE_INSUFFICIENT`

Do not repair Product or validation truth.

## Scope

Localization is read-only.

Do not:

- modify Product source;
- modify validation harness;
- modify existing tests;
- run complete pnpm test;
- rerun Phase 13.2;
- call provider/model;
- start Phase 13.3.

A docs-only localization report may be committed on a branch for Architecture Review.
