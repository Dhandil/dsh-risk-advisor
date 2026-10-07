# Risk Advisor Phase 13.2 — Fresh Canonical Campaign Rerun Authorization

## Status

`RISK_ADVISOR_PHASE13_2_FRESH_CANONICAL_RERUN_AUTHORIZED`

This document authorizes one fresh Phase 13.2 canonical Lane A campaign after accepted Phase 13.1 Maintenance Repair2.

## Baseline

- Current main:
  `b486778933afce89dfc698c2d55517c545791423`
- Accepted validation harness Repair2:
  `0904afe035232f6d9faab2fd539018b6e1c4263b`
- Repair2 Acceptance Report:
  `b486778933afce89dfc698c2d55517c545791423`
- Accepted Product executable:
  `28d3d204376da0a43279b949a3ceea794212d10c`
- Pinned Harness:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`

## Campaign-1 quarantine

The prior Phase 13.2 Campaign-1 remains quarantined.

Do not:

- resume its run;
- append to its ledger;
- reuse its campaignRunId;
- merge its partial metrics into the fresh campaign;
- treat its prior `UPSTREAM_VERIFICATION_MISSING` as accepted Product defect evidence.

Campaign-1 exists only as validation-instrument defect-discovery evidence.

## Fresh campaign identity

Use a new campaignRunId:

`phase13-lane-a-canonical-v2`

Frozen seed remains:

`phase13-lane-a-canonical-v1`

The seed is intentionally unchanged so the repaired harness can regenerate the same deterministic scenario semantics while using a new run identity.

The manifest must be regenerated under the accepted Repair2 harness and prevalidated before execution.

Record the new canonical manifest SHA-256 before the first Tool execution.

## Exact campaign scale

Run exactly:

- 300 scenarios;
- target exactly 1500 Tool executions;
- explicit policy:
  - maxScenarios = 300
  - maxToolExecutions = 1500

If a blocker is reached first, stop immediately and report the partial counts.

Do not compensate for a stopped run by starting another run without architecture review.

## Cost policy

Frozen:

- provider calls = 0;
- model calls = 0;
- LLM calls = 0;
- Judge calls = 0;
- Deep Judge calls = 0;
- subagent calls = 0.

Do not create a model-backed conversation to drive Lane A.

## Mandatory Repair2 preflight

Before Tool execution, prove:

1. exact main / accepted Repair2 candidate ancestry;
2. pinned Harness SHA;
3. canonical manifest regeneration succeeds;
4. manifest replay from the same seed/config is byte-identical;
5. settlement capability validation passes for every step;
6. run policy is exactly 300/1500;
7. provider/model counters remain zero.

If settlement capability validation fails:

- execute 0 Tools;
- return validation-harness blocked;
- do not patch in place.

## Execution boundary

Use only the accepted public-diagnostics seams:

- correlation lookup;
- Live Correction diagnostics;
- Verification diagnostics;
- independent immutable truth manifest;
- hash-chained ledger.

Do not modify:

- Product `src/`;
- validation harness;
- existing Product tests;
- package/lock/config;
- Harness Core.

Do not run complete `pnpm test`.

## Blocker mapping

Use the accepted Repair2 taxonomy.

### Product P0
- wrong Session Finding.

### Product P1
- deterministic frozen-contract FP/FN;
- duplicate Finding;
- unexpected signal on NOT_APPLICABLE;
- resurrected Finding;
- explicit Product-attributable lifetime/process mismatch.

### Upstream
- supported DIRECT/ASYNC operation missing a verification record after its frozen settlement rule.

Return upstream evidence separately; do not auto-label it as generic Product P1.

### Validation
- settlement capability mismatch;
- unknown/unclassified issue;
- validation instrument failure.

### Capture / ledger / environment
Use their explicit existing statuses.

## Evidence

Required local artifacts:

- regenerated canonical manifest;
- manifest SHA-256;
- truth ledger;
- ledger head hash;
- minimal reproducer if blocked;
- bounded summary.

Commit only one docs-only execution report.

The report must include:

- fresh campaignRunId;
- seed;
- manifest SHA;
- exact Product/validation/Harness identities;
- final scenario and Tool execution counts;
- F1 confusion matrix;
- F2 confusion matrix;
- duplicate/wrong-session/resurrection/lifetime counts;
- capture/upstream/environment counts;
- opportunity count by family;
- provider/model/Judge/subagent call counts;
- blocker and reproducer summary if stopped.

## Completion tokens

If full campaign completes cleanly:

`RISK_ADVISOR_PHASE13_2_CAMPAIGN_READY_FOR_ARCHITECTURE_REVIEW`

If Product correctness blocker:

`RISK_ADVISOR_PHASE13_2_BLOCKED_PRODUCT_REPAIR_REQUIRED`

If supported verifier record is missing:

`RISK_ADVISOR_PHASE13_2_BLOCKED_UPSTREAM_REVIEW_REQUIRED`

If validation instrument/manifest blocker:

`RISK_ADVISOR_PHASE13_2_BLOCKED_VALIDATION_HARNESS_REPAIR_REQUIRED`

If environment blocker:

`RISK_ADVISOR_PHASE13_2_ENVIRONMENT_BLOCKED`

Do not self-declare acceptance.
