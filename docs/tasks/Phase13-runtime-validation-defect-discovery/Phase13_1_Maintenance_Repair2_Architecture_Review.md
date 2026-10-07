# Risk Advisor Phase 13.1 Maintenance Repair2 — Architecture Review

## Verdict

`RISK_ADVISOR_PHASE13_1_MAINTENANCE_REPAIR2_ARCHITECTURE_APPROVED_MAIN_INTEGRATION_AUTHORIZED`

Maintenance Repair2 source and provenance review passed.

This repair changes only the Phase 13 validation instrument. The accepted Risk Advisor Product executable remains unchanged.

## Reviewed provenance

- Repair2 architecture baseline / current main:
  `f190a850ec493f5d5fe4c0441d55a2ca7b2862ce`
- Exact repaired validation candidate:
  `0904afe035232f6d9faab2fd539018b6e1c4263b`
- Repair2 execution report:
  `f26ea77d149aae76f07e200f86e6539f905354ef`
- Branch:
  `codex/phase13-1-maintenance-repair2`
- Pinned Harness:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`

Baseline -> candidate is exactly four modified files under `validation/phase13/`:

- `ledger.ts`
- `operations.ts`
- `phase13-1-validation-harness.spec.ts`
- `runner.ts`

Candidate -> report is exactly one docs-only execution report.

No Product `src/`, existing Product tests, package/lock, root config, benchmark, or Harness Core drift exists.

## Architecture findings

### 1. Verification capability is now validation-owned and explicit

Each operation has exactly one validation capability:

- `NONE`
- `DIRECT`
- `ASYNC_SUPPORTED`

The registry assigns the frozen mapping required by Repair2.

This metadata is owned by validation infrastructure and does not import Product expected-effect or verifier implementation.

### 2. Settlement compatibility is fail-fast before execution

`validateSettlementCapabilities()` runs after structural/run-policy validation and before workspace creation.

A mismatched manifest:

- returns `BLOCKED_VALIDATION`;
- creates no campaign workspace;
- runs 0 scenarios;
- runs 0 Tools.

Unsupported/NONE operations therefore cannot accidentally enter verifier settlement.

F2 EXPECTED with a NONE-capability operation is rejected.

### 3. Blocker taxonomy no longer collapses unknown issues into Product P1

The old fallback:

`any remaining issue => BLOCKED_P1`

is removed.

The accepted explicit taxonomy now separates:

- wrong Session -> `BLOCKED_P0`;
- frozen Product correctness issues -> `BLOCKED_P1`;
- capture -> `BLOCKED_CAPTURE`;
- ledger -> `BLOCKED_LEDGER`;
- environment -> `BLOCKED_ENVIRONMENT`;
- supported verifier missing -> `BLOCKED_UPSTREAM`;
- manifest/instrument mismatch or unknown issue -> `BLOCKED_VALIDATION`.

Therefore `UPSTREAM_VERIFICATION_MISSING` is no longer sufficient by itself to claim Product repair.

### 4. Upstream missing requires supported-operation proof

`UPSTREAM_VERIFICATION_MISSING` maps to `BLOCKED_UPSTREAM` only when the already-prevalidated operation capability is:

- `DIRECT`, or
- `ASYNC_SUPPORTED`.

With no supported capability proof, the same issue fails closed as `BLOCKED_VALIDATION`.

DIRECT settlement remains immediate and performs no sleep.

ASYNC_SUPPORTED settlement retains the accepted bounded polling/deadline path.

### 5. Minimal upstream reproducer is sufficient and bounded

For supported missing verification, the reproducer records:

- scenarioId;
- stepId;
- operationRef;
- verificationCapability;
- f2Settlement;
- expected F2 label;
- executionId presence boolean;
- verification settlement = MISSING;
- ledger head hash.

It deliberately does not persist the opaque executionId itself.

This is sufficient for architecture localization without expanding privacy scope.

### 6. Ledger terminal states are consistent

The ledger schema explicitly accepts:

- `BLOCKED_UPSTREAM`
- `BLOCKED_VALIDATION`

while preserving existing canonical/hash/sequence/privacy bounds.

## Evidence reviewed

Reported and source-consistent:

- M1-M15 + H1-H18 + K1-K12: **45/45 PASS**;
- bounded smoke: 13 scenarios / 19 Tool executions;
- smoke F1: 3 TP / 16 TN / 0 FP / 0 FN;
- smoke F2: 2 TP / 17 TN / 0 FP / 0 FN;
- P3/P7/P10/P12 focused regressions: **22 files / 141 tests PASS**;
- Phase 13 validation TypeScript: PASS;
- provider/model/LLM/Judge/Deep Judge/subagent calls: 0;
- complete `pnpm test`: not run, as instructed;
- Phase 13.2: not rerun.

The initial pnpm/TYY setup abort described in the execution report occurred before a gate ran and did not alter repository state; the actual reported focused gates were executed through the already-installed local binaries.

## Product status

Repair2 does not establish or repair a Risk Advisor Product defect.

The quarantined Phase 13.2 Campaign-1 remains non-authoritative for Product correctness.

After Repair2 reaches main and is accepted, Phase 13.2 must start a new campaign run rather than resume Campaign-1.

## Main integration authorization

Codex may advance `main` to the exact reviewed lineage.

Required exact lineage:

```
f190a850ec493f5d5fe4c0441d55a2ca7b2862ce
  -> 0904afe035232f6d9faab2fd539018b6e1c4263b
  -> f26ea77d149aae76f07e200f86e6539f905354ef
  -> <this docs-only Architecture Review commit>
```

Rules:

1. fast-forward-equivalent exact lineage only;
2. no squash;
3. no rebase;
4. no file modification;
5. no reimplementation;
6. do not rerun tests merely for integration;
7. verify `HEAD == origin/main == git ls-remote`;
8. do not rerun Phase 13.2 yet;
9. do not create the Repair2 Acceptance Report.

Return after exact main integration for final Repair2 Acceptance Review.
