# Phase 14.1 Repair2 — Execution Report

**Status:** `RISK_ADVISOR_PHASE14_1_REPAIR2_IMPLEMENTATION_READY_FOR_ARCHITECTURE_REVIEW`

**Review instruction:** `Phase14_1_Implementation_Architecture_Review.md` at `cf1ae64a97bc5116cffda48851be3708311c7fe8`

**Starting main:** `cf1ae64a97bc5116cffda48851be3708311c7fe8`

**Repair2 tested candidate:** `bd326bd6d0d550b2aa100bb7b176d2b5a4b227a1`

**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

**Implementation branch:** `codex/phase14-1-runtime-risk-awareness-impl`

## B1 — retain pending per-execution bases

The latest Session row now selects only the ordinary UI display record. Capturing a different ExecutionId no longer removes the previous unowned record or cancels its pending scorer. Older records remain indexed for exact approval reuse and single-flight scoring until settlement, TTL, disposal, or the existing permitted capacity eviction. The record/queue caps and latest-row projection remain unchanged; a capacity-full capture still fails conservatively instead of evicting pending work.

Deterministic tests cover two same-Session executions with both shared and distinct callIds, approval of A after B is captured, stable A assessment identity, one queued scorer per execution, and no A row resurrection after its approval completes.

## B2 — admit coordinator capacity before ownership transfer

`ApprovalAssessmentCoordinator` now performs its bounded record-capacity admission before calling `claimForApproval()`. If capacity rejects the event, the Runtime Risk base remains visible and unowned, and its queued scorer remains available. After capacity becomes available, the same approval can claim the completed base and reuses its exact assessment object and ID.

The focused capacity regression fills a one-record coordinator with an unclosed approval, verifies rejection leaves the target runtime row and scorer intact, then frees capacity and proves successful admission reuses that same base without rescoring.

## Gates

| Gate | Result |
| --- | --- |
| Phase 14.1 focused Host/Client/Tool tests, including B1/B2 proofs | 23 tests / 3 files PASS |
| Phase 1B, Phase 1C, P5, P6 and P10 related regressions | 117 tests / 24 files PASS |
| TypeScript typecheck | PASS |
| Production TypeScript declarations and Host/Client bundles | PASS |
| Package export/declaration/dependency contract and `npm pack --dry-run` | PASS; 70 package entries |
| Static, boundary, privacy, persistence and diff checks | PASS |
| One fresh complete `pnpm test` on exact candidate `bd326bd` | **PASS; 477 tests / 68 files; exit 0** |

The Full run used a detached worktree at the exact candidate after `pnpm install --frozen-lockfile` passed. The complete configured suite ran once. No source, test, package, configuration or benchmark changes followed the tested candidate; post-Full tracked status was clean.

An earlier local focused iteration on superseded candidate `93a78a9` exposed four overstrong test assertions: the fixture correctly returned a completed `DEGRADED` assessment, and its fake scheduler retained completed callback handles in its inspection Set. The test assertions were corrected to verify completed degraded scoring, stable IDs/object identity and remaining active work. No risk semantics were changed. The final candidate's focused gates and Full all pass.

## Scope and repository state

Repair2 changes only `src/host/runtime-risk-awareness.ts`, `src/host/assessment-envelope.ts` and `tests/p14-1-runtime-risk-awareness.spec.ts`. The previous failed Full report and Repair1 report are unchanged. Harness remains pinned with a clean tracked tree. No Harness, F1/F2, Phase 11, Phase 13.2, existing risk rule, approval decision, UI/RPC or package contract semantics were changed. No Acceptance Report was created and this branch was not merged into `main`.

The original untracked `lib/`, `node_modules/` and `.vitest-cache/` remain untouched. The previously retained Repair1 test worktree was preserved. Repair2 test worktrees were also retained without force cleanup.
