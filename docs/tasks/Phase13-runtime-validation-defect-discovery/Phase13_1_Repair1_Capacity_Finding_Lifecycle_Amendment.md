# Risk Advisor Phase 13.1 — Repair1 Capacity & Finding-Lifecycle Amendment

## Status

`RISK_ADVISOR_PHASE13_1_REVIEW_BLOCKED_REPAIR1_AUTHORIZED`

Repair only validation infrastructure.

No Risk Advisor product source or semantics change is authorized.

## R1 — Separate structural capacity from run policy

The validation format/runtime must support the already frozen Phase 13 campaign scale while remaining bounded.

Freeze structural limits:

```
PHASE13_STRUCTURAL_MAX_SCENARIOS = 512
PHASE13_STRUCTURAL_MAX_TOOL_EXECUTIONS = 4096
PHASE13_STRUCTURAL_MAX_LEDGER_RECORDS = 8192
PHASE13_STRUCTURAL_MAX_LEDGER_BYTES = 32 * 1024 * 1024
```

Existing per-line bound may remain 16 KiB.

These are format/harness safety ceilings, not targets.

Freeze Phase 13.1 smoke policy separately:

```
PHASE13_1_SMOKE_MAX_SCENARIOS = 30
PHASE13_1_SMOKE_MAX_TOOL_EXECUTIONS = 100
```

The generic manifest parser and ledger verifier use structural limits.

The 13.1 smoke runner uses the smoke policy.

Future phase runners must receive an explicit run policy bounded by the structural ceiling.

Conceptual policy:

```ts
interface Phase13RunPolicy {
  readonly maxScenarios: number
  readonly maxToolExecutions: number
}
```

A runner must stop with campaign/environment policy failure if its plan exceeds its current run policy, even though the manifest format itself supports a larger valid campaign.

Do not silently default a generic future campaign to the 13.1 smoke cap.

## R2 — Required scale-readiness proofs

Add non-product execution proofs that the infrastructure can represent/verify at least:

- 300 scenarios;
- 1500 STEP_RESULT rows;
- a completed hash-chain ledger at that scale.

This proof may generate synthetic ledger rows; it must not execute 1500 Tools in Repair1.

Also prove the structural format supports 2000 Tool-result rows for the future soak lane.

The bounded Repair1 test run remains small.

## R3 — Finding disappearance is not automatically a defect

Remove the invariant:

```
prior ID absent now => STALE_OR_RESURRECTED_FINDING
```

A prior Finding may disappear legitimately.

Default Session-set observation must distinguish:

- current membership;
- retired/disappeared identity;
- later resurrection.

A disappearance alone is not P1 unless an explicit phase/scenario lifecycle oracle requires preservation.

## R4 — True resurrection tracking

Maintain validation-local per-Session Finding identity history.

Conceptually:

```
activeFindingIds
retiredFindingIds
```

When an ID was observed active and later becomes absent:

- record it locally as retired;
- do not emit a Product defect merely because it retired.

If a retired ID later becomes visible again in the same Product runtime generation:

- emit `RESURRECTED_FINDING`;
- classify as P1 unless a later phase Freeze explicitly defines a valid generation-reset exception.

Do not call simple disappearance “resurrection.”

## R5 — Optional preservation expectation

To support ordinary deterministic scenarios without confusing them with TTL/capacity tests, the validation manifest may carry a validation-only lifecycle expectation.

Frozen minimal form:

```ts
findingLifetime:
  | 'NO_ASSERTION'
  | 'PRESERVE_PRIOR'
  | 'ALLOW_PRIOR_REMOVAL'
```

Default for existing 13.1 smoke steps may be `NO_ASSERTION` unless the test explicitly needs preservation.

Semantics:

- `NO_ASSERTION`: disappearance itself is not graded.
- `ALLOW_PRIOR_REMOVAL`: same as no defect on disappearance, intended for future TTL/capacity cases.
- `PRESERVE_PRIOR`: disappearance of a prior active Finding is a lifecycle correctness issue.

This field belongs to validation truth only and must not be inferred from Product output.

Do not add Product imports to the oracle.

## R6 — Wrong-session detection remains strict

Repair1 must preserve:

- execution owner mapping;
- actual execution Finding must belong to its Session snapshot;
- a Finding ID observed in two different Sessions is a blocker;
- cross-Session attribution remains P0/P1 according to existing campaign policy.

Legitimate retirement in Session A must not allow the same Finding identity to appear in Session B.

## R7 — Ledger compatibility

If `findingLifetime` or new lifecycle issue code is recorded in STEP_RESULT:

- add it to the bounded explicit ledger schema;
- keep privacy/raw-field restrictions;
- keep canonical hash chain;
- keep existing Phase 13.1 evidence replayable only under the candidate schema version if compatibility cannot be exact.

Do not loosen ledger validation to arbitrary payload keys.

## R8 — Product boundary remains frozen

Repair1 may modify only files under:

`validation/phase13/`

Do not modify:

- `src/`;
- existing product tests;
- package/lock;
- root tsconfig/vitest/bundle config;
- benchmarks;
- Harness Core.

## Required Repair1 proofs

- **K1** generic manifest parser accepts a valid 300-scenario / 1500-step plan.
- **K2** generic manifest parser rejects plans above 512 scenarios or 4096 steps.
- **K3** 13.1 smoke policy still rejects/blocks >30 scenarios or >100 Tool executions.
- **K4** synthetic completed ledger with 300 scenarios / 1500 STEP_RESULT rows verifies successfully.
- **K5** ledger rejects >8192 records and >32 MiB.
- **K6** infrastructure representation supports a 2000-step future soak plan.
- **K7** normal prior-Finding disappearance alone emits no stale/resurrection Product defect.
- **K8** retired Finding reappearance emits `RESURRECTED_FINDING`.
- **K9** `PRESERVE_PRIOR` explicitly detects unexpected disappearance.
- **K10** `ALLOW_PRIOR_REMOVAL` permits TTL/capacity-like disappearance.
- **K11** wrong-session detection remains blocking after retirement/history tracking.
- **K12** H1-H18 remain PASS under the repaired harness.

## Verification boundary

Run only:

1. Repair1 K1-K12;
2. H1-H18;
3. bounded 13.1 smoke <=100 Tool executions;
4. Phase 12.1/12.2 focused regressions;
5. P3/P7;
6. relevant P10 boundary/lifecycle/privacy checks;
7. validation TypeScript/static scope/privacy checks.

Do not run:

- complete `pnpm test`;
- Phase 13.2 high-volume Tool campaign;
- real provider/model calls.

After Repair1 source/provenance review passes, Phase 13.1 may be accepted without a repository Full because the accepted Product executable remains byte-unchanged; acceptance concerns the validation instrument, not Product semantics.
