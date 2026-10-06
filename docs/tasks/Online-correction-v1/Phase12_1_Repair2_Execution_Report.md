# Risk Advisor Phase 12.1 Repair2 — Execution Report

## Candidate and baseline

- Starting `origin/main`: `48008a99b2d6c8f9b5a4a594b5a2c42ca06df152`
- Exact tested executable candidate: `9db1eae28f673dfe8c7770b8947dc9330d33be8c`
- Pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Candidate publication: fast-forward to `main` after all requested pre-Full gates passed.

## Repair

F2 conflict identities are retained in a generation-scoped tombstone set capped at 256 unique identities. A duplicate identity consumes no additional capacity. The next unique conflict latches generation-wide F2 saturation and clears the identity set; while saturated, all retained and future F2 Findings are suppressed from get, execution, session, render, and insertion surfaces. F1 insertion and diagnostics remain operational. Only runtime `dispose()` clears the saturation latch; TTL, Finding/association eviction, Session disposal, and replay do not.

The tombstone bound is internal and introduces no package export. F1 identity-conflict handling remains bounded by retained Finding payloads. No F1/F2 predicate, identity, wording, existing Finding/association bound, Failure Chain, verifier, Browser/UI, Approval/Risk, Pattern/Guidance, Agent context, persistence, or Harness Core behavior was otherwise changed.

## Repair2 proofs

- **S1:** 256 unique conflict tombstones are retained without exceeding the cap.
- **S2:** the 257th unique conflict saturates F2 and blocks future F2 Findings.
- **S3:** saturation suppresses an already-visible F2 from every read/render surface.
- **S4:** F1 continues to emit and remain readable during F2 saturation.
- **S5:** TTL expiry, capacity eviction, Session disposal, and replay do not clear saturation.
- **S6:** `dispose()` clears the ending generation's saturation; a fresh runtime can evaluate F2 normally.
- **S7:** duplicate conflict IDs consume no capacity and do not cause premature saturation.

## Verification

All gates ran against the exact candidate above in an isolated detached worktree with the pinned Harness checkout.

- Phase 12.1 focused C1–C20, Repair1 R1–R5, and Repair2 S1–S7: **PASS**, 1 file / 32 tests.
- Failure Chain P3 regression: **PASS**, 2 files / 17 tests.
- Postcondition Verifier P7 regression: **PASS**, 6 files / 26 tests.
- TypeScript typecheck: **PASS**.
- Production TypeScript build and `tsdown` bundles/declarations: **PASS**.
- Package contract and static boundary tests: **PASS**, 2 files / 4 tests.
- Package dry-run: **PASS**, 57 package files including Host/Client bundles and declarations; no tarball was produced.
- Static scope, whitespace, dependency-manifest, forbidden-boundary, package-declaration, and Harness pin checks: **PASS**. The executable/test diff contains only `src/host/live-correction.ts` and `tests/p12-1-live-correction.spec.ts`; package manifests and lockfile are unchanged.
- Pinned Harness SHA check: **PASS**, `ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Complete `pnpm test`: **NOT RUN**, as instructed; no Full attempt was consumed on this candidate.

The isolated verification worktree used the existing installed tool binaries directly so that dependency checks could not replace the developer checkout's preserved `node_modules/`. No dependency installation or modification of the developer checkout's pre-existing `.vitest-cache/`, `lib/`, or `node_modules/` was performed.

## Publication boundary

The exact candidate `9db1eae28f673dfe8c7770b8947dc9330d33be8c` was fast-forward published to `main`. This file is a separate docs-only Repair2 report, pushed after the candidate. A future architecture review may decide whether to authorize one fresh complete Full on this exact candidate. Phase 12.2 was not started; no `Acceptance_Report.md` was created, and this report does not declare Phase 12.1 accepted.
