# T06 — Spike Closure & Product Phase 1 Preflight | Codex Instructions

**Read sibling `T06_Architecture_Freeze.md` in full; it controls scope.** This is a docs-only stage transition and source audit, not R6, not coding. ChatGPT Web freezes architecture and independently accepts; Codex researches repository actuality, produces the four prescribed documents, publishes normally and stops.

## 0. Preflight and protection (before any task writes)

1. In `D:\Harness\harness-plugin\dsh-risk-advisor`, check `git status --short`, index/untracked, branch, HEAD, `origin/main`, `git ls-remote origin refs/heads/main`; expected starting remote SHA `9b453fdfcd06d70ad9497a99ed88609a9fb0c923`. Safely fast-forward only if needed and cleanly possible; STOP on unexpected executable drift/divergence. Do not reset/clean/rebase/force-push.
2. Protect plugin drift: `docs/risk-advisor-current/`, `docs/tasks/T01-approval-ui/T01_Final_Runtime_Gate_Instructions.md`, `.vitest-cache/`, `lib/`, `node_modules/`, untracked `pnpm-lock.yaml`, and any other observed changes. Exact staging only of new T06 task docs.
3. In `D:\Harness\deepseek-harness`, do **read-only** SHA/status/source inspection. Local frozen HEAD `ddefc45fbc7f8e46dd73185e68295696d1297887`; current newer upstream previously observed `4878cdabd87d4041bdaff61d04c966883b9fd07a` remains unvalidated. Do not fetch, pull, checkout, install, build or otherwise change either source or `.git`. Preserve `build.log`, `install.log`, `t0-*`, `undefined/` and newly discovered drift.
4. Place the two supplied exact T06 markdown files at `docs/tasks/T06-product-phase1-preflight/`, retaining their contents. Verify frozen canonical docs remain unchanged.

## 1. Source review and evidence reconciliation

Read **actual repository source**: `src/index.ts`, Host correlation/PTC/ledger, `src/client/**`, current `package.json` and tests; then governing `docs/baseline/*` (especially architecture §47 and §7/8/13/43–46, V1 spec, risk engine contract, test matrix P0 and Area A/B/E/F/J), `docs/governance/Collaboration_Workflow.md`, and the actual T00–T05 `Execution_Report.md` files. Observe that reports are Codex evidence, and final `ACCEPTED` statements are ChatGPT independent bounded decisions; avoid falsely promoting either to production release.

Build the source-grounded matrix explicitly distinguishing: `IMPLEMENTED_AND_BOUNDED`, `PARTIAL`, `FIXTURE_ONLY`, `NOT_IMPLEMENTED`, `BLOCKED_BY_UNVERIFIED_SEAM` and `NOT_RUN`. Every positive entry must give exact source file + symbol + test reference; every gap must identify its canonical requirement. If a report and the actual remote source disagree, record discrepancy; do not silently change the report or guess.

Required open-gate preservation: T01 deployed Live Browser; actual T03 PTC producer; T04 exact F-006/007/013 cross-plane witness; true disk/process restart; current public upstream Session V4 runtime; T05 direct `T_sync`/real Assessment/Context Builder/Judge/Publish latency and all six `UNDETERMINED` policy fields. Product assessment UI is not the T01 fixture. Separate Live/Durable facts do not prove two distinct invocations. No extra provider calls.

## 2. Deliver exactly four authored outputs (all in T06 task directory)

**A. `Spike_Closure_and_Open_Gates.md`:** brief chronology T00–T05 with latest tested/published SHAs where verifiable, accepted/partial evidence, test counts, genuine vs simulated vs NOT_RUN, owner and explicit closure criterion. Include release-level statement: Spike validation closed in bounded form; product V1 NOT_RELEASE_READY. Include no unverified numeric production thresholds.

**B. `Product_Phase1_Gap_Manifest.md`:** one-to-one Architecture §47 Phase 1 contract map. State what existing R2/R3/R4 code can be reused, what is fixture only, and what is missing. Examine access to exact ToolExecution witness without cloning mint logic; raw-arguments privacy; `OperationSnapshot` and `NormalizedOperation` closed adapters; `ExecutionBoundaryEvidence` truth/unknown; SnapshotStore ownership; `AssessmentEnvelope`/AssessmentStore; committed `approval/asked` coordinator; Host-to-Browser public transport and DTO; native fallback. Show dependencies and proposed test gates. Distinguish Phase 2 ledger existing partial reuse and Phase 2 formal Failure Analyzer still absent; don't claim Phase 2 is complete.

**C. `Phase1A_Architecture_Proposal.md`:** a precise, independently reviewable *proposal* for the smallest safe executable product step after T06: private exact-live Operation Foundation (Snapshot + Normalizer + Boundary + ephemeral store) that reuses T02 identity; no risk verdict/LLM/publisher/Browser/ApprovalOutcome. Specify available public type/contract evidence, proposed plugin-private integration (or STOP if exact witness not obtainable), DTO/privacy, cap/retention, unknown handling, test matrix including collisions, missing session/callId, invalid args, sandbox-active-not-covered, HMR/reentrancy, observer noninterference and regressions. State candidate Phase1B and 1C dependencies without executing them. List architectural decisions ChatGPT must approve.

**D. `Execution_Report.md`:** exact baseline checks, read paths, source-vs-report conflicts, four output identities, docs-only diff audit, protected drift, tests/benchmarks/provider/browser/native producer actual counts (`NOT_RUN` where applicable), scope blockers, implementation/docs Tested SHA if used, final remote HEAD/origin/ls-remote SHA and STOP. Do not create `Acceptance_Report.md`.

## 3. Quality and publish

- No source/test/config/package/baseline changes. No tests, builds or R5 rerun are required for docs-only T06. Use source reads, scoped document checks, references/links sanity, `git diff --check` with any intentional Markdown hard-break warning recorded accurately, and `git diff --name-status`/staged scope proof. No Harness writes.
- Do not edit T00–T05 accepted `Execution_Report.md`; historical statuses remain source records. No copying files into protected `docs/risk-advisor-current/`.
- Stage exactly the **two supplied T06 instructions plus four resulting documents**. Commit normally and push `origin main`; verify `git rev-parse HEAD == git rev-parse origin/main == git ls-remote origin refs/heads/main`. If self-referential report SHA cannot be embedded, give final SHA in terminal handoff rather than amending commits endlessly. Stop; do not start Phase1A on your own.
- If a material contradiction, required Core/source mutation, remote divergence, or unsafe preservation problem appears, keep current state and return `T06_ARCHITECTURE_DECISION_REQUIRED` / `T06_BLOCKED` instead of forcing publication.

## 4. Compact terminal handoff

```text
Outcome: T06_PHASE1_PREFLIGHT_READY_FOR_REVIEW / T06_ARCHITECTURE_DECISION_REQUIRED / T06_BLOCKED
Plugin baseline / Harness frozen SHA:
Docs created (exact 6-file T06 manifest):
T00–T05 closure/proof status; OPEN gates retained:
Phase 1 current implementation versus missing matrix:
Proposed Phase1A scope, public-seam blockers/STOP questions:
Docs-only source/quality/scope check; tests/benchmark/provider/browser: NOT_RUN:
Execution_Report.md:
Commit and final HEAD / origin/main / ls-remote equality:
Protected drift intact; no Phase1A implementation; no Acceptance Report:
STOP for ChatGPT Web independent acceptance.
```
