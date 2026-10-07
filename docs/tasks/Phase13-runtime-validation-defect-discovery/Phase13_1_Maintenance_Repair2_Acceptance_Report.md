# Risk Advisor Phase 13.1 Maintenance Repair2 — Final Acceptance Report

## Final status

`RISK_ADVISOR_PHASE13_1_MAINTENANCE_REPAIR2_FINAL_ACCEPTED_BASELINE_ADVANCED`

Phase 13.1 Maintenance Repair2 is accepted.

## Accepted validation candidate

- Exact accepted Repair2 candidate:
  `0904afe035232f6d9faab2fd539018b6e1c4263b`
- Repair2 execution report:
  `f26ea77d149aae76f07e200f86e6539f905354ef`
- Repair2 Architecture Review:
  `bccfa83805841a06451809a71ad7269664b7f18d`
- Pinned Harness:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Accepted Risk Advisor Product executable remains:
  `28d3d204376da0a43279b949a3ceea794212d10c`

No Risk Advisor Product executable was modified by Repair2.

## Accepted repair

Repair2 closes the validation-instrument defect discovered by the quarantined first Phase 13.2 campaign.

### Operation verification capability

Every validation-owned operation now declares exactly one capability:

- `NONE`
- `DIRECT`
- `ASYNC_SUPPORTED`

The mapping is validation-owned and does not import Product verifier implementation.

### Pre-execution compatibility gate

Before workspace creation or Tool execution, every manifest step is validated against its operation capability.

Invalid settlement/capability combinations:

- return `BLOCKED_VALIDATION`;
- execute 0 scenarios;
- execute 0 Tools;
- do not become Product defects.

NONE-capability operations cannot wait for a verifier and cannot declare F2 EXPECTED.

### Explicit blocker taxonomy

The former generic fallback:

`unknown issue => BLOCKED_P1`

is removed.

Accepted classification now separates:

- wrong Session -> `BLOCKED_P0`;
- frozen Product correctness defect -> `BLOCKED_P1`;
- capture defect -> `BLOCKED_CAPTURE`;
- ledger defect -> `BLOCKED_LEDGER`;
- environment defect -> `BLOCKED_ENVIRONMENT`;
- supported verifier record missing -> `BLOCKED_UPSTREAM`;
- manifest/instrument mismatch or unknown issue -> `BLOCKED_VALIDATION`.

Therefore `UPSTREAM_VERIFICATION_MISSING` is not itself sufficient to declare Product repair required.

### Supported upstream missing

A missing verification record may reach `BLOCKED_UPSTREAM` only after the step was already prevalidated as:

- DIRECT, or
- ASYNC_SUPPORTED.

DIRECT remains immediate and performs no wait.

ASYNC_SUPPORTED retains the accepted bounded 15-second public-diagnostics settlement path.

### Reproducer evidence

Supported upstream-missing evidence is bounded to:

- scenarioId;
- stepId;
- operationRef;
- verificationCapability;
- f2Settlement;
- expected F2 label;
- executionId presence boolean;
- MISSING settlement result;
- ledger head hash.

The opaque executionId itself is not persisted.

## Verification evidence

Source/provenance review accepted the reported evidence:

- M1-M15 + H1-H18 + K1-K12: **45/45 PASS**;
- bounded smoke: **13 scenarios / 19 Tool executions**;
- smoke F1: **3 TP / 16 TN / 0 FP / 0 FN**;
- smoke F2: **2 TP / 17 TN / 0 FP / 0 FN**;
- P3/P7/P10/P12 focused regressions: **22 files / 141 tests PASS**;
- Phase 13 validation TypeScript: PASS;
- repository TypeScript: PASS;
- provider/model/LLM/Judge/Deep Judge/subagent calls: **0**;
- complete `pnpm test`: not run, as instructed;
- Phase 13.2 canonical campaign: not rerun.

The initial pnpm no-TTY setup abort occurred before a verification gate ran and did not mutate repository state.

## Campaign-1 status

The first Phase 13.2 campaign remains quarantined.

Its result:

`UPSTREAM_VERIFICATION_MISSING`

after 6 scenarios / 26 Tool executions is not accepted as Product-defect evidence because the old validation harness could misclassify unsupported/mismatched settlement as Product P1.

Do not resume or append to the original Campaign-1 run.

A new canonical Phase 13.2 campaign must use:

- a new campaignRunId;
- the accepted Repair2 validation harness;
- prevalidated settlement capability;
- the same frozen zero-provider-cost policy unless separately amended.

## Provenance

Repair2 lineage:

- Repair2 architecture baseline:
  `f190a850ec493f5d5fe4c0441d55a2ca7b2862ce`
- exact accepted Repair2 candidate:
  `0904afe035232f6d9faab2fd539018b6e1c4263b`
- execution report:
  `f26ea77d149aae76f07e200f86e6539f905354ef`
- Architecture Review / exact main integration:
  `bccfa83805841a06451809a71ad7269664b7f18d`

The Repair2 candidate was integrated to main by exact fast-forward lineage.

From exact accepted candidate through Architecture Review, only two documentation files were added:

- `Phase13_1_Maintenance_Repair2_Execution_Report.md`
- `Phase13_1_Maintenance_Repair2_Architecture_Review.md`

There is no post-candidate validation-code or Product-code drift.

## Closure boundary

Phase 13.1 Maintenance Repair2 is closed and accepted.

This acceptance does not itself rerun Phase 13.2.

The next architecture/execution action may now authorize a **fresh Phase 13.2 canonical campaign rerun** with a new run ID using the repaired validation harness.

No active-intervention authority is introduced.
