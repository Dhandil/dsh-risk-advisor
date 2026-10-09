# Phase 14.1 Runtime Risk Awareness — Execution Report

**Status:** `RISK_ADVISOR_PHASE14_1_FULL_TEST_FAILED`

**Starting main:** `55c1247b0cd7c2fee9edff6cedb706cd0d0c6303`

**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

**Implementation candidate:** `0697fa2f117c4dca3f7a0f8320f01ab78972838a`

**Implementation branch:** `codex/phase14-1-runtime-risk-awareness-impl`

## Implemented scope

The candidate adds a process-local, bounded Phase 14.1 assessment runtime keyed by exact Session identity and ExecutionId. The existing pre-execution observer captures the shared Phase 5 context and schedules deterministic scoring without awaiting it. A uniquely correlated Native Approval claims the same A1 base, while its existing Judge/Evidence continuation remains in the coordinator. A read-only `risk-advisor/runtime-risk` route projects only the sanitized assessment. The Client adds the order-20 session dock, uses reactive native approval status for immediate duplicate suppression, and revalidates Host ownership after settlement. Online Correction remains at order 10.

The ordinary Tool path does not answer approvals, alter dispatch/results, invoke a model/Judge/verifier, or write persistence. Runtime records and queues are bounded; result handling only scrubs or ages advisory state.

## Gate results

| Gate | Result |
| --- | --- |
| Product anchor and reviewed architecture on `origin/main`; branch base equals `origin/main` | PASS |
| Harness exact pinned SHA | PASS |
| Phase 14.1 focused Host, Client, and pinned ToolRuntime tests | 18 tests / 3 files PASS |
| Phase 11 E1–E14, O1–O15, P1–P17 and Repair1; Phase 12.1 C/R/S; Phase 12.2 U/L; Phase 13.2 F1; P6/P10 regressions | 239 tests / 27 files PASS |
| TypeScript typecheck | PASS |
| Production TypeScript declarations and Host/Client bundles, built to a task-owned temporary output directory to preserve the existing `lib/` artifacts | PASS |
| Package, static/boundary, privacy and persistence checks | PASS |
| `git diff --check` | PASS |
| One fresh `pnpm test` invocation on the exact implementation candidate | **FAIL; stopped at Phase 1B** |

The Full invocation ran in a detached worktree at the exact candidate after `pnpm install --frozen-lockfile` passed. It executed 13 test files and 93 tests before the script stopped: 12 files passed, 1 failed; 91 tests passed and 2 failed. The suites reached were R1–R5 and P1A–P1B. Later suites were not run by this invocation. Exit code: `1`. The command was not repaired or rerun.

The failures are P1B-01 and P1B-04 in `tests/p1b-assessment-envelope.unit.spec.ts`. Both expect an `assessmentId` for a successfully correlated approval whose Phase 5 assessment is unavailable. The prior coordinator assigned an ID whenever correlation was `BOUND`; this candidate assigns the fallback ID only when `phase5Bound` is true. Consequently the unavailable-but-bound legacy diagnostic loses its ID. This is a regression against the unchanged Phase 1B contract. No repair is included in this report.

## Repository and local artifact state

The implementation candidate is on its independent branch; `origin/main` remains `55c1247b0cd7c2fee9edff6cedb706cd0d0c6303`. Harness remains at the pinned SHA. The lockfile, Harness tree, Web Profile, and package dependency/export/peer contracts are unchanged. No Phase 13 campaign was run.

The pre-existing untracked `node_modules/`, `lib/`, and `.vitest-cache/` were not staged or committed. One local side effect was discovered: a direct `tsc --noEmit` invocation updated the existing untracked `lib/tsconfig.tsbuildinfo`, and Vitest wrote its result cache under `.vitest-cache/`. Both remain local and untracked; neither was deleted or included in the candidate. Subsequent declaration and bundle builds used a temporary output directory. The Full install ran in the detached test worktree, leaving the original `node_modules/` in place.

This candidate is submitted for architecture review with the Full failure recorded. It is not accepted and is not ready for final acceptance review.
