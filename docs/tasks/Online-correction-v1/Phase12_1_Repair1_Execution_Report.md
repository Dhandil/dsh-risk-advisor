# Risk Advisor Phase 12.1 Repair1 — Execution Report

## Candidate and baseline

- Starting `origin/main`: `53b3fe31f560fdf6695b5b11698296f8a202ba83`
- Exact repaired executable candidate: `fb8a6b151323e5a330d4eb24e302365629212540`
- Pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Candidate was fast-forward pushed to `main` before this report-only change.

## Repair

`VERIFICATION_CONFLICT` now writes the deterministic F2 identity to the current runtime generation's conflict tombstone set even if its Finding payload or execution association has already expired. Conflict handling drops any live association. TTL expiry, capacity eviction, and Session disposal may remove Finding payloads and associations but do not clear conflict tombstones. F2 insertion and all diagnostic reads continue to suppress a tombstoned identity. `dispose()` clears the generation state; a newly constructed runtime can independently evaluate the same deterministic identity.

F1/F2 predicates and identity, wording, bounds, Failure Chain, verifier semantics, Browser/UI, Approval/Risk, Pattern/Guidance, Agent context, persistence, and Harness Core were not changed. No Phase 12.2 behavior was added.

## Repair1 proofs

- **R1:** mismatch, conflict, repeated settled-result association, and later mismatch leave the F2 suppressed.
- **R2:** TTL expiry removes the retained F2 payload; replayed association and later mismatch cannot restore it.
- **R3:** capacity eviction removes the retained F2 payload; replayed association and later mismatch cannot restore it.
- **R4:** unrelated, non-conflicted Findings still expire and are evicted normally.
- **R5:** disposing the runtime ends the generation; a new runtime can qualify the same deterministic F2 identity from fresh evidence.

## Verification

All gates were run against the exact candidate above in an isolated detached worktree with the pinned Harness checkout.

- Phase 12.1 focused suite, C1–C20 plus Repair1 R1–R5: **PASS**, 1 file / 25 tests.
- Failure Chain P3 regression: **PASS**, 2 files / 17 tests.
- Postcondition Verifier P7 regression: **PASS**, 6 files / 26 tests.
- TypeScript typecheck: **PASS**.
- Production TypeScript build and `tsdown` bundles/declarations: **PASS**.
- Package contract and static boundary tests: **PASS**, 2 files / 4 tests.
- Package dry-run: **PASS**, 57 package files including Host/Client bundles and declarations; no tarball was produced.
- Static scope, whitespace, dependency-manifest, forbidden-boundary, and Harness pin checks: **PASS**. The executable/test diff contains only `src/host/live-correction.ts` and `tests/p12-1-live-correction.spec.ts`; package manifests and lockfile are unchanged.
- Pinned Harness SHA check: **PASS**, `ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Complete `pnpm test`: **NOT RUN**, as required by the Repair1 instructions; no Full attempt was consumed on this candidate.

The verification worktree used the existing installed tool binaries directly because `pnpm run` attempted its dependency-status install path against the linked dependency directory and aborted before changing it. No dependency installation or modification of the developer checkout's pre-existing `lib/`, `node_modules/`, or `.vitest-cache/` was performed.

## Publication boundary

The exact candidate `fb8a6b151323e5a330d4eb24e302365629212540` was fast-forward published to `main` after all required pre-Full gates passed. This report is a separate docs-only Repair1 report. A future architecture review may decide whether to authorize one fresh complete Full on the repaired exact candidate. Phase 12.2 was not started; no `Acceptance_Report.md` was created, and this report does not declare Phase 12.1 accepted.
