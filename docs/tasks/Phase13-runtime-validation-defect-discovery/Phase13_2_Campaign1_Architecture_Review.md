# Risk Advisor Phase 13.2 Campaign-1 — Architecture Review

## Verdict

`RISK_ADVISOR_PHASE13_2_CAMPAIGN1_QUARANTINED_PHASE13_1_REPAIR2_REQUIRED`

The first Phase 13.2 canonical campaign stopped after 6 scenarios / 26 Tool executions with:

`UPSTREAM_VERIFICATION_MISSING`

The run correctly stopped and was not rerun or repaired in place.

However the returned token:

`RISK_ADVISOR_PHASE13_2_BLOCKED_PRODUCT_REPAIR_REQUIRED`

is **not accepted as a Product-defect classification**.

## Evidence currently available

User-reported campaign facts:

- campaign stopped at first blocker;
- 6 scenarios;
- 26 Tool executions;
- truth ledger verified VALID;
- capture failures: 0;
- provider/model/Judge/subagent calls: 0;
- no rerun;
- no repair;
- local docs-only report commit:
  `fed237c22c9d456eaa3d5cc27fefbb92fbec275c`;
- remote main remained:
  `962453701f6c9147d31fd9e7d9c3c6922b4c03b1`.

The report commit is local-only and is therefore not used as remote provenance evidence in this review.

The source defect below is independently established from accepted main.

## Source defect A — upstream-missing is collapsed into Product P1

Accepted validation runner currently implements:

```ts
if (issues.includes('CAPTURE_INVALID')) return 'BLOCKED_CAPTURE'
if (issues.includes('LEDGER_INTEGRITY_INVALID')) return 'BLOCKED_LEDGER'
if (issues.includes('ENVIRONMENT_FAILURE')) return 'BLOCKED_ENVIRONMENT'
if (issues.includes('WRONG_SESSION_FINDING')) return 'BLOCKED_P0'
if (issues.length > 0) return 'BLOCKED_P1'
```

Therefore:

`UPSTREAM_VERIFICATION_MISSING`

falls through to `BLOCKED_P1` even though it has not yet been localized as:

- Product verifier defect;
- invalid campaign settlement expectation;
- validation-instrument defect;
- environment/capability issue.

The Phase 13.2 Freeze explicitly required upstream verification absence to remain distinct from Online Correction F2 FN.

The current generic fallback violates that distinction.

## Source defect B — settlement expectation is not cross-validated against operation capability

The manifest truth contract currently allows a step to declare:

- `NONE`;
- `DIRECT`;
- `ASYNC_SUPPORTED`.

But the accepted operation registry has no independent validation metadata proving which settlement mode is valid for each operation.

Examples from accepted operations:

- `write-match` / `write-mismatch-fault` are direct verifier operations;
- `bash-mkdir-match` / `bash-mkdir-mismatch-fault` are async supported verifier operations;
- `bash-unsupported` intentionally has no supported ExpectedEffect and therefore may legitimately produce **no VerificationRecord at all**.

If an unsupported operation is accidentally labeled `ASYNC_SUPPORTED`, the current runner waits 15 seconds, records `UPSTREAM_VERIFICATION_MISSING`, and then the generic blocker mapping falsely converts that campaign-definition error into Product P1.

This must be impossible before another canonical campaign.

## Product status

No Risk Advisor Product defect is established by Campaign-1.

In particular:

- no F1 FP/FN was established;
- no F2 FP/FN was established;
- no duplicate Finding was established;
- no wrong-Session Finding was established;
- no resurrection/lifecycle defect was established;
- capture remained valid;
- ledger remained valid.

Campaign-1 is quarantined as validation evidence.

Do not use its partial confusion matrix for Product acceptance or rejection.

## Required action

Return to Phase 13.1 validation-instrument maintenance.

Repair2 must:

1. encode validation-owned operation verification capability;
2. reject manifest/step settlement mismatches before Tool execution;
3. replace generic unknown-issue -> Product P1 fallback with explicit blocker taxonomy;
4. classify `UPSTREAM_VERIFICATION_MISSING` as Product verifier defect candidate **only** when a prevalidated supported verifier operation was expected to settle;
5. classify invalid settlement declaration as validation-harness/manifest failure, never Product repair;
6. preserve existing independent-truth boundary and zero-provider campaign policy.

After Repair2 acceptance, run a **new** Phase 13.2 canonical campaign with a new run ID.

Do not resume or append to the quarantined Campaign-1 ledger.
