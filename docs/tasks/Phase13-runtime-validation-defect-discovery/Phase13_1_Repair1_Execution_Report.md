# Risk Advisor Phase 13.1 Repair1 Execution Report

## Provenance

- Repair baseline (`origin/main`): `8f08d3798c417f423b88bf2cd5b5eabdd864a634`
- Exact repaired candidate: `8ff9997dd8cb584ef079e1492759ea206477b966`
- Candidate parent: `8f08d3798c417f423b88bf2cd5b5eabdd864a634`
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Candidate branch: `codex/phase13-1-repair1`
- Runtime: Node `v24.21.0`; pnpm `11.7.0`

The implementation commit changes only six files under `validation/phase13/`. The report is a separate docs-only commit. Product source, existing product tests, package files, root configuration, benchmarks, and Harness Core were not changed.

## Repair results

- Structural manifest limits are 512 scenarios and 4096 Tool executions.
- Phase 13.1 smoke policy remains separately bounded at 30 scenarios and 100 Tool executions. Generic campaign execution requires an explicit run policy bounded by structural limits.
- Ledger limits are 8192 records and 32 MiB; the existing 16 KiB per-line limit remains.
- Synthetic proofs parse 300 scenarios / 1500 steps and verify a completed 2102-record hash-chain ledger containing 1500 `STEP_RESULT` rows.
- A 2000-step future soak manifest is accepted without executing those Tools.
- Finding disappearance retires an ID without raising a defect under `NO_ASSERTION` or `ALLOW_PRIOR_REMOVAL`; only a later observation of that retired ID emits `RESURRECTED_FINDING`.
- `PRESERVE_PRIOR` emits `FINDING_LIFETIME_VIOLATION` for an unexpected disappearance.
- Finding ownership persists after retirement; cross-Session reuse remains `WRONG_SESSION_FINDING` and maps to `BLOCKED_P0`.
- Validation-only `findingLifetime` is normalized to `NO_ASSERTION` for legacy-shaped manifest steps and recorded using the bounded ledger schema.

## Verification

- Repair1 K1–K12 and retained H1–H18: **30/30 tests passed** in `validation/phase13/phase13-1-validation-harness.spec.ts`.
- Bounded smoke evidence from H18 and K12: each run completed 13 scenarios / 19 Tool executions; neither exceeded the 30/100 policy.
- Focused regressions: **14 files, 127 tests passed**:
  - `tests/p12-1-live-correction.spec.ts`
  - `tests/p12-2-online-correction.spec.tsx`
  - `tests/p1c-browser-bridge.spec.ts`
  - `tests/p3-retry-escalation.unit.spec.ts`
  - `tests/p3-runtime.integration.spec.ts`
  - `tests/p7-expected-effect.unit.spec.ts`
  - `tests/p7-postcondition-verifier.unit.spec.ts`
  - `tests/p7-scheduler.unit.spec.ts`
  - `tests/p7-failure-chain.integration.spec.ts`
  - `tests/p7-runtime.integration.spec.ts`
  - `tests/p7-boundary.integration.spec.ts`
  - `tests/p10-boundary.integration.spec.ts`
  - `tests/p10-lifecycle-resource.integration.spec.ts`
  - `tests/p10-prompt-privacy.integration.spec.ts`
- Phase 13 validation TypeScript check: **PASS** (`tsc -p validation/phase13/tsconfig.json --noEmit`).
- Repository TypeScript check: **PASS** (`tsc --noEmit -p tsconfig.json`).
- `git diff --check`: **PASS**.
- Scope audit: **PASS**; implementation diff is limited to `validation/phase13/`.
- Complete `pnpm test`: **NOT RUN**, as instructed.
- Real provider/model calls: **NONE**.
- Phase 13.2: **NOT STARTED**.

Repair1 is published for architecture review. This report does not declare Phase 13.1 accepted.
