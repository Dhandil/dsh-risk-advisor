# Risk Advisor Phase 11.3 — Implementation Instructions

## Authorized outcome

Implement exactly the frozen contract in:

`docs/tasks/Phase11-verified-experience-historical-guidance/Phase11_3_Verified_Experience_Pattern_Freeze.md`

Architecture Preflight baseline: `d5e05af73089f1853916757c64348c687711751e`

Pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`

These instructions are prospective. This document-only Architecture Preflight task does not authorize implementation. A separate user request must explicitly start Phase 11.3 implementation.

## 1. Preflight before implementation

1. Fetch `origin/main`; verify it contains this Preflight, Freeze, and Instructions.
2. Verify the Phase 11.3 docs-only change from `d5e05af73089f1853916757c64348c687711751e` has executable drift `0`.
3. Verify the exact pinned Harness SHA.
4. Preserve all user/untracked files, including `.vitest-cache/`, `lib/`, and `node_modules/`. Never reset, clean, stash, or delete them.
5. Require a clean tracked baseline or stop and report tracked drift. Create an implementation branch from then-current `origin/main`; do not rewrite accepted history.
6. Confirm Phase 11.1 E1–E14 and Phase 11.2 O1–O15 remain in the source test tree and preserve their contracts.

## 2. Implement only the Pattern layer

Add the Host-only Pattern schema/runtime and separate `risk_advisor_pattern` v1 `per-record` domain using the exact identity tuple/hash, eligibility, support threshold, contradiction rules, revision schema, deltas, provenance, caps, privacy, reconciliation, and lifecycle in the Freeze.

Pattern input may come only from a read-only snapshot of validated durable Episodes and complete Outcome chains plus internal notifications delivered after a durable Outcome append. Extend the existing Outcome-to-Pattern integration internally as required, but do not open a second Outcome domain handle. Buffer notifications across startup snapshot reconciliation with the frozen bounded cap. Do not read the process-local verifier or failure-chain store as Pattern evidence.

Enforce strict insert-only Pattern revisions on top of Storage Domain `put`: absent key inserts, identical existing content is idempotent, and divergent same-key content fails closed without overwrite. Validate every source chain, Pattern chain, key, delta, and digest on open. Reconcile missing/stale Pattern projection only by appending revisions; never mutate an Episode or Outcome record.

Pattern invalidation may be emitted only by the exact durable trusted-failure predicate frozen in §7. Do not add an invalidation method, caller-controlled event, request listener, or source from Browser/model, approval, assessment, Agent, or process/tool success. Pattern invalidation must never write an Outcome invalidation value.

Keep the scope strictly below Guidance. Do not implement Pattern-to-Guidance translation, Risk Assessment integration, Browser presentation, Agent context injection, Online Correction, command or permission changes, retries, or execution authority.

## 3. Preserve existing boundaries

Do not modify:

- `ExperienceEpisodeV1` schema, stored bytes, key, commit trigger, capacity, privacy, or lifecycle semantics;
- `OutcomeRevisionV1` schema, stored bytes, qualification precedence, key, append semantics, reserved invalidation values, capacity, privacy, or lifecycle semantics;
- Risk Assessment or assessment aggregation;
- Browser bridge, routes, or UI;
- Native Approval;
- Host execution/runtime authority;
- Harness Core or the pinned Harness SHA;
- Fast Judge, Deep Judge, or retry/failure-chain qualification behavior.

No new external dependency should be required. Do not change `pnpm-lock.yaml` unless a separately reviewed implementation necessity is demonstrated; the Freeze itself calls for existing Zod and Storage Domain APIs only.

## 4. Required tests

Implement every P1–P17 proof in the Freeze. In addition, preserve and run the existing Phase 11.1 E1–E14 and Phase 11.2 O1–O15 suites. Include the following particularly sensitive cases:

- exact positive and negative verifier pairs; each source/adapter mismatch and low-quality evidence is ineligible;
- three distinct Episodes on one UTC day remain unqualified; two successes remain unqualified; three Episodes spanning two UTC dates qualify;
- same Episode's multiple Outcome revisions count at most once;
- conflict/recovery-only/unknown current Outcome removes prior positive support but is never a success or failure witness;
- a durable verified failure before first qualification prevents formation; a durable verified failure after qualification appends an immutable terminal Pattern invalidation;
- later success does not erase a prior failure or reactivate that Pattern ID;
- source snapshot-to-subscription race has no lost notification; notification duplicates do not append duplicates;
- restart validates/replays deltas, provenance and digests; missing/stale projection is reconciled append-only;
- Pattern persistence failure/capacity does not affect Episode, Outcome, approval, assessment, Browser, or Tool behavior;
- persisted Pattern records contain no privacy sentinel payloads;
- lifecycle closes Pattern only after Outcome notifications and Pattern appends drain.

All fixtures must use isolated temporary Storage roots. Never use the user's real `$DSH_HOME/storages` for fixtures, reset, or destructive setup.

## 5. Gate order

Run implementation verification in this order:

1. Focused Phase 11.3 P1–P17 tests.
2. Phase 11.1 E1–E14 regression.
3. Phase 11.2 O1–O15 regression.
4. Affected existing V1 regressions, including relevant P1/P2/P3/P4/P6/P7/P10 suites.
5. Source and focused-test typecheck.
6. Production build.
7. Package, declaration, export, dependency, and static boundary gates.
8. Isolated durable restart/reconciliation proof and persisted privacy inspection.
9. Only after every preceding gate passes, run exactly one fresh complete `pnpm test` on the exact final executable candidate.

If Full fails, stop and report the exact result; do not fix and silently rerun. After a passing Full, executable/test/package/config/benchmark semantic drift is forbidden. Only a Phase 11.3 Execution Report may be added afterward.

## 6. Publication and reporting boundary

Whether implementation candidate/report publication is authorized must be established by the separate implementation request. If authorized, push the exact tested candidate fast-forward only, verify `HEAD == origin/main == git ls-remote`, and make any post-Full commit report-only.

Do not create `Acceptance_Report.md`, declare Phase 11.3 accepted, or start Phase 11.4. Final acceptance remains the user's architecture review authority.

## 7. Future implementation report

The future report should state the tested executable candidate, source/adapter eligibility, minimum-support and contradiction proof, Pattern provenance/recovery/privacy/capacity evidence, all E/O regressions, static/package results, one Full result, and remote identity if publication was authorized. Confirm that only report documentation changed after Full. Do not claim acceptance.
