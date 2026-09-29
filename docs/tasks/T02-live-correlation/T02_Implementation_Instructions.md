# T02 — R2 Live Correlation Integration | Codex Implementation Instructions

**Execute only task:** `T02-live-correlation`. Read sibling `T02_Architecture_Freeze.md` first, then the canonical T00 baseline documents. Codex is the **implementation/execution agent**, not the final acceptance authority. Complete a bounded task autonomously and STOP after publishing its execution report.

## 0. Preflight before any writes

1. Enter `D:\Harness\harness-plugin\dsh-risk-advisor`; inspect `git status --short`, branch, HEAD, `origin`, local/untracked drift and `git ls-remote origin refs/heads/main`. Expected starting checkpoint: `3615fd3bde79c91c547d39c53ce6f89404dfcf2e`. Fast-forward safely if appropriate; STOP on unexpected history/divergence or risk of overwriting drift. Never reset/clean/rebase/force push.
2. Inspect `D:\Harness\deepseek-harness` in **read-only** mode, pin expected `ddefc45fbc7f8e46dd73185e68295696d1297887`; record actual HEAD and existing untracked `build.log`, `install.log`, `t0-*` and other drift. If its source meaning differs materially from the frozen contract, STOP rather than patch Harness.
3. Read `docs/baseline/risk-advisor-v1-architecture-v1.2.md` §§7.1, 8, 12–13, R2; Test Matrix Area B/F and `docs/governance/Collaboration_Workflow.md`; retain T01's bounded R1 evidence and Live Browser NOT_RUN.
4. Inspect the actual Host seams and public type/runtime/plugin packaging: `packages/core/tools/src/index.ts`, `packages/core/session/src/index.ts`, `packages/interaction/user-approval/src/{index,types}.ts`, and relevant native Tool/Session/Approval tests. Verify post-commit `session/event(session,event)`, tools/pre-execute waterfall, result settlement and the public construction of isolated test Sessions/agents. Do not infer `req.agent.session` from an `approval/asked` payload that lacks it.
5. Persist the exact frozen instruction files in `docs/tasks/T02-live-correlation/` and stage them as task documents. Preserve any local untracked T01 final-runtime instruction and handoff folder; do not opportunistically stage unrelated user files.

## 1. Implement only the Host R2 slice

Build the minimal Host-side `ActiveExecutionIndex` / observation adapter using public Harness runtime capabilities. Choose small understandable files under `src/host/` (or one similarly focused folder); implement the Host entry in `src/index.ts`. Keep T01's Browser `src/client/**` unchanged except a **proven necessary** package/type build compatibility fix (report any such modification).

A. Capture each **observed actual ToolExecution traversal** at `tools/pre-execute`: generate a fresh RA ExecutionId, keep exact ToolExecution object identity (WeakMap or equivalent), obtain Session from `exec.agent?.session`, register an active `(Session identity,callId) -> Set<ExecutionId>` member. Register before delegating to `next()` exactly once. Missing Session must be explicitly unbound. Capture only bounded identity metadata; never turn `callId`, `rootCallId`, toolName or operationHash into ExecutionId. Any RA bookkeeping failure leaves the original pre-execute chain semantically unchanged.

B. Listen to **post-commit** `session/event` with its actual first-argument Session: on `approval/asked`, look up its optional `callId` against the active index; return/store FOUND / NOT_FOUND(reason) / AMBIGUOUS. Key a bounded observation by the exact Session plus durable approval `id`, and on matching `approval/decided` record closure. Do not append to Session, do not consume `approval/request`, do not make approval or tool policy decisions. Repeated approval ID is idempotent; a contradiction is explicit degraded/conflict, never last-writer-wins. If `approval/asked` is outside any observed traversal, leave it unbound rather than scan history.

C. Observe `tools/result` and remove **only the exact** execution that was registered at pre-execute; support same-key concurrent siblings. Preserve uniqueness across nested/parent executions and callId reuse. No removal at dispatch start or when pre-execute's `next()` returns. A late result for an unobserved/disposed execution is harmless and cannot remove a new generation's entry.

D. On dispose/HMR, detach listeners, release transient records and deactivate this generation. A fresh instance is intentionally empty: pending approvals from a lost execution degrade; no durable reconstruction of active state and no history fallback. Preserve explicit UNKNOWN/NOT_FOUND causes. Use bounded retention for recently closed **approval observations** without retaining secret arguments or inventing a full Ledger.

E. Make status/lookup observable to focused tests by a narrowly typed, read-only diagnostic seam. Any exposure outside Host must be sanitized; do not create a production HTTP endpoint, browser bridge or six-dimensional RiskAssessment in T02.

F. Keep Host/client build isolation correct. Inspect current `package.json`, `tsconfig.json`, `tsdown.config.ts`: a genuine Host entry may require Host-specific types; if necessary split Host/Client TS programs inside the plugin (no Harness changes), preserve tested `lib/index.js`, `lib/client.js`, declaration paths and existing T01 import/pack smoke. Do not put private Harness component imports in production code.

## 2. Required tests — state exact evidence level

Use table-driven pure regressions for R2-01..R2-12 from the freeze. Additionally add at least one **actual pinned Harness ToolRuntime + post-commit Session/ApprovalService** integration if the public test seams allow it safely; reuse native in-memory fixtures and a harmless local tool, not a real provider or privileged action. The live approval event must come from a real `session.append` (ideally from the ApprovalService inside an open turn). Simulate a tool body waiting on a deterministic barrier to verify that `approval/asked` sees the execution still active, and `tools/result` later removes it. Prove `tools/pre-execute` and `session/event` fire on the intended observable path. Do not mislabel manual callback invocation as an authentic integration test.

At minimum prove separately:

- unique match, distinct callIds, two Sessions sharing a callId, concurrent collision and exact-member retirement;
- finish/reuse (no historical match), missing callId/scope/orphan event and unavailable observation;
- in-body ask/representative sandbox-escalation timing, nested traversals without parent/root identity collapse;
- duplicate/simultaneous approval IDs, decided pairing, no mutation of native outcome;
- disposal/HMR and late old-generation result, new index NOT_FOUND rather than guessed FOUND;
- policy-never/bypassed observer/answerer-order independent outcomes where possible.

For any untestable source path, explain its concrete prerequisite and mark PARTIAL/NOT_RUN; do not change Harness Core or install a real provider merely to get PASS. R2 is **Host-side** and does not close the deferred T01 Live Browser gate. Do not run old seven-Spike harness or R3–R5.

## 3. Gates and execution order

1. Implement Host correlation and tests; self-test pure index behavior.
2. Run actual ToolRuntime/Session/Approval focused integration and negative controls; fix ordinary issues within the freeze.
3. Architecture / scope / lifecycle audit: zero native ApprovalOutcome writes; `next()` exactly once; no session append, no secret export, no historical fallback, no cross-session/last-wins, exact terminal cleanup; review current T01 Browser diff (ideally zero).
4. Low-cost gates **before** the final executable acceptance gate: TypeScript Host + Client, lint, build/export/package pack and `git diff --check` on intended new/modified implementation. Run relevant R1 regression to catch packaging/typing drift; record all exact commands and results. Preserve historical Markdown formatting rather than falsifying a full diff-check PASS.
5. Run the final applicable focused integrated test suite on the final executable state **once after static fixes**. Do not invent a Canonical Full (T02 = `NOT_APPLICABLE`) or claim T01 Live Browser PASS.
6. Stage exact intended source/tests/config/task docs, audit `git diff --cached --name-only` (no Harness/drift/artifacts/secrets). Commit implementation after gates, then write/update `docs/tasks/T02-live-correlation/Execution_Report.md` and commit report-only where feasible. No executable modification following Tested SHA without a relevant retest.
7. Normal `git push origin main`; verify `git rev-parse HEAD`, `git rev-parse origin/main`, and `git ls-remote origin refs/heads/main` match the intended final SHA. If publication fails, report DELIVERY_BLOCKED, not published.

## 4. Execution report (not acceptance)

`docs/tasks/T02-live-correlation/Execution_Report.md` shall contain: outcome (`T02_R2_PUBLISHED_READY_FOR_REVIEW` / `T02_R2_PARTIAL` / `T02_ARCHITECTURE_DECISION_REQUIRED` / `T02_BLOCKED` / `T02_FAILED`); start Plugin SHA, Harness SHA/status and protected drift; exact changed-file manifest; identity, listener lifecycle and event-association contract implemented; per-case R2-01..12 with test level/PASS/PARTIAL/NOT_RUN; real integration method and observations; test/build/type/lint/pack/diff results; any failures and limitations; T01 Live Browser remains NOT_RUN; provider/network/privileged/browser calls = 0 unless an expressly permitted disposable local simulation was used (distinguish clearly); R3–R5 NOT_RUN; Canonical Full NOT_APPLICABLE; executable Tested SHA, implementation commit and remote final SHA; STOP statement.

Do **not** generate `Acceptance_Report.md`, claim `ACCEPTED`, change baseline docs silently, or begin R3. ChatGPT Web independently reviews the pushed implementation/diff/evidence.

### Exact STOP conditions

Pinned seam materially differs; cannot obtain trusted Session identity; the design requires changing Harness Core, answerer order or native approval behavior; an unsafe Git or filesystem action is required; a real Host test cannot be staged without protected mutation; a new architectural decision outside the freeze is needed; remote history diverges. Preserve all artifacts/evidence, report the blocker, and stop without inventing success.

## 5. Compact Codex terminal handoff

```text
Outcome:
R2 case matrix (PASS/PARTIAL/NOT_RUN by evidence level):
Actual Host ToolRuntime + Session integration evidence:
R1 regression / T01 Live Browser status:
Typecheck / lint / build / package / diff gates:
Tested SHA:
Implementation commit:
Execution_Report.md path:
Final remote SHA and equality check:
Protected drift / explicit NOT_RUN / blockers:
STOP; no R3.
```
