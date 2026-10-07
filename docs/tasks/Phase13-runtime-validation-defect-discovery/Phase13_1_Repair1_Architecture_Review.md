# Risk Advisor Phase 13.1 Repair1 — Architecture Review

## Verdict

`RISK_ADVISOR_PHASE13_1_REPAIR1_ARCHITECTURE_APPROVED_MAIN_INTEGRATION_AUTHORIZED`

Repair1 source and provenance review passed.

No repository Full is required for this validation-infrastructure repair because the accepted Risk Advisor Product executable remains byte-unchanged. Phase 13.1 is not yet finally accepted only because the reviewed implementation currently lives on the Repair1 branch rather than main.

## Reviewed provenance

- Repair1 architecture baseline / current main:
  `8f08d3798c417f423b88bf2cd5b5eabdd864a634`
- Exact repaired validation candidate:
  `8ff9997dd8cb584ef079e1492759ea206477b966`
- Repair1 execution report:
  `6112b962503d21a9db2ad245d3da0155f1e6ace3`
- Branch:
  `codex/phase13-1-repair1`
- Pinned Harness:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`

Baseline -> repaired candidate is exactly six modified files under `validation/phase13/`.

Candidate -> report is exactly one docs-only report.

No Product `src/`, existing Product tests, package/lock, root config, benchmark, or Harness Core drift exists.

## Repair1 acceptance findings

### Structural capacity vs run policy

The repaired harness now separates bounded format capacity from the Phase 13.1 smoke policy.

Structural ceilings:

- 512 scenarios;
- 4096 Tool executions;
- 8192 ledger records;
- 32 MiB ledger;
- existing 16 KiB per-line cap retained.

Phase 13.1 smoke remains independently bounded at:

- 30 scenarios;
- 100 Tool executions.

The generic runner requires an explicit `Phase13RunPolicy` and applies it before workspace/campaign execution.

This is sufficient to represent the frozen next-phase targets:

- Phase 13.2: 300+ scenarios / 1500+ Tool executions;
- future soak: 2000+ Tool executions.

Synthetic scale proofs do not execute those Tool workloads during Repair1.

### Finding lifecycle

The invalid invariant:

`prior Finding disappeared => stale/resurrection defect`

has been removed.

The validation harness now maintains per-Session:

- active Finding identities;
- retired Finding identities.

A normal disappearance retires the identity without a Product defect under `NO_ASSERTION` or `ALLOW_PRIOR_REMOVAL`.

Only a later reappearance of a previously retired identity emits:

`RESURRECTED_FINDING`

`PRESERVE_PRIOR` independently allows a scenario's predeclared truth contract to treat an unexpected disappearance as:

`FINDING_LIFETIME_VIOLATION`

These are validation-only expectations and do not alter Product semantics.

### Session ownership

Finding owner history survives retirement.

A Finding identity later observed under a different Session still emits:

`WRONG_SESSION_FINDING`

and remains a blocking P0 classification in the campaign controller.

Repair1 therefore does not trade lifecycle correctness for weaker cross-Session isolation.

### Ledger and truth boundary

The ledger remains:

- explicit-schema only;
- privacy bounded;
- canonical;
- hash chained;
- sequence checked;
- terminally verified.

The truth/oracle boundary remains independent from Product F1/F2/retry/verifier implementation logic.

Public Product diagnostics remain the only actual-output observation seam.

## Proof evidence reviewed

Reported and source-consistent:

- K1-K12 + H1-H18: **30/30 PASS**;
- required focused regressions: **14 files / 127 tests PASS**;
- validation TypeScript: PASS;
- repository TypeScript: PASS;
- static scope audit: PASS;
- complete `pnpm test`: not run, as required;
- real provider/model calls: none;
- Phase 13.2: not started.

The reviewed scale proofs include:

- 300 scenarios / 1500 steps accepted by the manifest format;
- a completed 300-scenario / 1500-STEP_RESULT synthetic ledger verified;
- a 2000-step future soak manifest accepted without Tool execution;
- structural overflow rejection.

## Main integration authorization

Codex may now advance `main` to the exact reviewed branch lineage.

Required resulting lineage, with no squash/rebase/reimplementation:

```
8f08d3798c417f423b88bf2cd5b5eabdd864a634
  -> 8ff9997dd8cb584ef079e1492759ea206477b966
  -> 6112b962503d21a9db2ad245d3da0155f1e6ace3
  -> <this docs-only architecture review commit>
```

Rules:

1. do not modify any file while advancing main;
2. use fast-forward-equivalent exact lineage only;
3. do not rerun tests merely for integration;
4. verify `HEAD == origin/main == git ls-remote`;
5. verify the repaired candidate content SHA remains exactly `8ff9997dd8cb584ef079e1492759ea206477b966` in ancestry;
6. do not start Phase 13.2 yet;
7. do not create the Phase 13.1 Acceptance Report.

After exact main integration, return for final Phase 13.1 Acceptance Review.
