# Phase 14.1 Repair1 — Execution Report

**Status:** `RISK_ADVISOR_PHASE14_1_IMPLEMENTATION_READY_FOR_ARCHITECTURE_REVIEW`

**Starting main:** `55c1247b0cd7c2fee9edff6cedb706cd0d0c6303`

**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

**Previously failing candidate:** `0697fa2f117c4dca3f7a0f8320f01ab78972838a`

**Repair candidate tested:** `2cf79c7283a5ea9c9c567446a259bb84e7a4f32e`

**Implementation branch:** `codex/phase14-1-runtime-risk-awareness-impl`

## Repair

The earlier Full run exposed a Phase 1B regression: a uniquely correlated approval could lose its diagnostic `assessmentId` when Phase 5 scoring was unavailable. Repair1 preserves an ID already owned by the matching Runtime Risk base, including an unavailable base; if no shared ID exists, it preserves the prior diagnostic behavior by assigning an ID to a `BOUND` approval. Phase 5 scoring remains governed by the existing `phase5Bound` condition, so this repair does not fabricate or start an assessment when required inputs are unavailable. Ambiguous and unbound associations still receive no ID.

Added a focused regression proving that approval reuses the exact Runtime Risk diagnostic ID for an unavailable base and does not expose an assessment. The existing P1B-01/P1B-04 regressions also pass. The prior `Phase14_1_Execution_Report.md` remains unchanged and continues to record the original candidate's Full failure.

## Gates

| Gate | Result |
| --- | --- |
| Exact repair candidate and pinned Harness verification | PASS |
| Phase 14.1 Host/Client/Tool focused tests | 19 tests / 3 files PASS |
| Phase 1B, Phase 1C, P3, P6, P10, Phase 11.1–11.4, Phase 12.1–12.2 regressions | 253 tests / 29 files PASS |
| TypeScript typecheck | PASS |
| Production build, declarations, Host/Client bundles | PASS |
| Package export/declaration/dependency contract and `npm pack --dry-run` | PASS; 70 package entries |
| Static, boundary, privacy, persistence and diff checks | PASS |
| Fresh complete `pnpm test` on exact candidate `2cf79c7` | **PASS; 473 tests / 68 files; exit 0** |

The Full run used a detached worktree at the exact repair candidate after `pnpm install --frozen-lockfile` passed. It ran the complete configured sequence from R1 through Phase 14.1 once. No repair or rerun followed the Full run. Post-Full tracked status was clean; no executable, test, package, configuration or benchmark changes followed the tested candidate.

## Repository state

The repair changes only `src/host/assessment-envelope.ts` and `tests/p14-1-runtime-risk-awareness.spec.ts`. The accepted Harness remains at the pinned SHA with its tracked tree clean. The original checkout's pre-existing untracked `lib/`, `node_modules/` and `.vitest-cache/` remain untouched and uncommitted. No Phase 13 campaign was run. No Acceptance Report was created.
