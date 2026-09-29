# T04 — R4 Ledger Fault Injection & Recovery | Codex Implementation Instructions

**Single execution task:** `T04-ledger-recovery`. Read sibling `T04_Architecture_Freeze.md` completely first; it is controlling authority together with the canonical baseline. Codex implements/self-tests/publishes, **does not independently accept**. STOP after publication; no T05.

## 0. Preflight — no writes until all checks finish

1. In `D:\Harness\harness-plugin\dsh-risk-advisor`, inspect exact branch, `git status --short`, index, untracked drift, `git rev-parse HEAD`, `git remote -v`, and `git ls-remote origin refs/heads/main`. Expected starting checkpoint `3c3fd9d540caa654bb3aaf8378536cfde74ead3e`. Safely fast-forward only if expected, never reset/clean/rebase/force-push or stage unrelated user work. Protect `docs/risk-advisor-current/`, untracked `docs/tasks/T01-approval-ui/T01_Final_Runtime_Gate_Instructions.md`, and any other detected drift.
2. Inspect `D:\Harness\deepseek-harness` **read-only**: expected `master`/`origin/master @ ddefc45fbc7f8e46dd73185e68295696d1297887`; record existing `build.log`, `install.log`, `t0-*`, `undefined/` and any new protected drift. Do not write/install/build in the Core tree; stop if event/runtime semantics materially differ.
3. Read `docs/baseline/risk-advisor-v1-architecture-v1.2.md` §§3.6, 7.9–10, 12, 17, 37, 46/R4, Test Matrix global P0 and Areas E/F, Risk Engine Contract §11, T02/T03 implementations and accepted execution reports, and `docs/governance/Collaboration_Workflow.md`. Preserve T01 deployed Browser and T03 genuine PTC producer `NOT_RUN`.
4. Reinspect real Harness seams in `packages/core/{tools,session}/src` and `packages/interaction/user-approval/src`: exact result/exec shape, `tool/result.message` identity, event seq, `snapshotEvents()`, source ownership, approval event pair, Cordis effect cleanup, and whether a transparent `tools/execute` dispatch marker is safely supported. Clarify **committed Session snapshot vs persisted disk** in report. STOP on any material frozen-contract contradiction.
5. Place the two supplied exact docs under `docs/tasks/T04-ledger-recovery/` and preserve them in the scoped task commit. Keep canonical `docs/baseline/**` immutable unless a separate ChatGPT architecture decision is requested.

## 1. Implement only minimum R4 Host capability

A. Build a bounded Session-owned Ledger state/reducer and immutable sanitized query DTOs. Separate source-qualified durable `seq` identity, exact live ToolExecution/token identity, execution lifecycle, independent approval record, and ledger health/provenance. Duplicate source feed/snapshot delivery is idempotent; a conflicting same-provenance fact is explicit DEGRADED. Distinct source event seqs and distinct live occurrences must never collapse merely due to equal `callId`. No whole raw event/argument/output/prompt retention in exported records.

B. Add narrowly scoped real observers/adapters: preserve T02 `tools/pre-execute` semantics and `riskAdvisorCorrelation` read-only facade; watch the committed `session/event(session,event)` feed and final `tools/result` without changing native outcomes. If an exact internal callback at the existing T02 capture point is needed to transport its newly minted `ExecutionId`, keep it plugin-private and prove exact object/token identity. Do **not** manufacture an ExecutionId in replay, deduce a token from callId, or merge two colliding candidates. `tools/execute` must delegate `next()` once and return the original result only if safely used for dispatch evidence; otherwise record unknown dispatch and declare E-002 PARTIAL.

C. Define a canonical replay/reconciliation path for a single trusted immutable Session snapshot and a bounded post-commit feed: install/buffer first, obtain a snapshot/watermark, fold source `seq` once, then reconcile unseen callbacks. Missing/gapped source, incomplete snapshot, conflicting terminal, overflow, and unprovable cut degrade rather than produce an apparently complete history. Repeat replay and interleaving fault injection must not duplicate final results, fabricate source events or revive old generation.

D. Fault-fold missing START, full-exec-only live final, orphan durable result, duplicate/contradictory terminal, exact live-vs-durable confirmation/conflict, orphan/stale approval, missing/colliding binding, HMR/restart and unresolved R3 parent exactly as frozen. **`tools/result` is authoritative only for its exact observed runtime exec**. `tool/result`/`tool/ptc-dispatch` are durable source facts with their own provenance; do not double-create a result. A stale pending approval remains undecided by Risk Advisor. Reuse the already accepted T03 PTC replay projector for historical structural evidence; do not insert `root=self` or invent `retryOf`/`escalatesFrom`.

E. Keep bounded retention and safe query API (`health`, facts/history with enforced limit, exact Session isolation, source watermark, issue codes). Expose only detached frozen records, no mutators or object aliases. Record truncation/TTL as DEGRADED when missing information affects a query. Prefer modest, understandable modules/tests over a new general infrastructure framework. No database or disk persistence owned by RA in this phase; reconstruct from a trusted Harness Session source if available.

F. Wire only the necessary Host plugin `apply()` behavior and cleanup. On disposal/HMR old listeners become inert, new generation does not inherit old runtime WeakMaps; trusted replay can rebuild *historical facts* without restoring active execution identity. Maintain T01/T02/T03 externally observed contracts and package exports. Do not touch `src/client/**` or Harness Core. Stop for architecture decision rather than over-expanding into full Risk Engine, Provider, Browser or permanent Ledger.

## 2. Tests / fault-injection proof

Implement an `R4-01..R4-15` matrix **mapping one-to-one to canonical F-001..F-015** in Architecture Freeze; parameterization is preferable. Include minimal `E-001..E-007` proof at appropriate layer, labelling E-002 PARTIAL if dispatch marker remains unobserved. Explicitly test:

- Full exact live exec with missing RA start; start-only; orphan durable result; unknown verification; no fabricated start/failed outcome.
- Same source seq replayed identically vs conflicting same-source data; distinct seqs with equal payload; same-text IDs for *different Session objects*.
- Two terminals for one proven occurrence, unique live + durable confirmation-only, live/durable disagreement, and different occurrences sharing callId (no false conflict or last-writer-wins).
- Orphan/ambiguous/missing-callId approval, idempotent asked/decided and pending stale lifecycle; never call/return `ApprovalOutcome` as RA.
- Snapshot + feed overlap, source seq gap and deterministic reconciliation, new generation after HMR/disposal, late old result, simulated restart using trusted `snapshotEvents()` and repeat replay; zero historical active FOUND.
- R3 parent/root unresolved remains explicit (no root=self); bounded caps/privacy, frozen nested output, query limit/ordering; no T01/T02/T03 behavior change.

At least one actual pinned Host integration must mount `Context` + `SessionStore` + `ToolRuntime` + `ApprovalService` as appropriate, execute a harmless deterministic tool, observe real post-commit `approval/asked` and `tools/result`, and reconcile real `Session.append`/`snapshotEvents()` events. Pure fault fixtures may inject impossible duplicate/conflict/corrupt sequences and should be labelled pure/component, not genuine Harness-produced logs. For restart, state whether this is an in-process new-instance snapshot simulation or actually tested storage restoration; if no safe persistent fixture, the latter is `NOT_RUN`, not PASS. No model/provider or privileged operations.

Report for each F/E case: PASS / PARTIAL / NOT_RUN and **evidence level**. Specific required negative assertions: zero fake ExecutionId, zero result double count, zero last-writer-wins, zero auto-approval/denial/cancellation, zero secret/arguments/content leak, no cross-Session merge, no client/product regression.

## 3. Gates (in this exact order)

1. Focused pure reducer and fault tests; real source producer/integration; fix ordinary bugs inside freeze.
2. Architecture/transaction/lifecycle/scope audit: identity, session ownership, source order, snapshot watermark, evidence provenance, authoritative vs confirmation-only result, exact T02 diagnostics/privacy, T03 structural isolation, observer failure containment and bounded resources.
3. Before expensive regression: TypeScript typecheck, lint, build Host/Client, Host export smoke, `pnpm pack --dry-run --json`, staged/scope/secret audit and implementation `git diff --check`. Distinguish inherited lint/publint or historical Markdown hard-break warnings; never falsely claim an unqualified all-files PASS.
4. Finally run **one fresh applicable full project regression on the last executable state**: inherited T01 **9/9**, T02 **16/16**, T03 **17/17**, plus focused R4 suite. If it fails, fix and rerun relevant gates + fresh final regression before designating Tested SHA. No T04 Canonical Full infrastructure has been defined: `NOT_APPLICABLE`.
5. Audit `src/client/**` and prior accepted source behavior (ideally unchanged), checked-in file manifest and source privacy. Do not change executable after Tested SHA without retesting. If a provider/browser/network/persistent-run prerequisite blocks a proof, leave the precise case PARTIAL/NOT_RUN; do not mutate protected Harness or user's settings to force PASS.

## 4. Evidence report and normal publication

Create/update **only** `docs/tasks/T04-ledger-recovery/Execution_Report.md` as Codex's execution report, containing: outcome (`T04_R4_PUBLISHED_READY_FOR_REVIEW` / `T04_R4_PARTIAL` / `T04_ARCHITECTURE_DECISION_REQUIRED` / `T04_BLOCKED` / `T04_FAILED`); exact starting Plugin/Harness SHA, all protected drift, intended changed manifest; minimum ledger/provenance/fold and adapter decisions; F-001..F-015 and scoped E coverage with proof levels; source feed/snapshot and live integration methodology, actual persistence/restart levels, negative/failed evidence; regression/test command counts and quality gates; warnings and explicit remaining limitations; no Core edits, provider/network/privileged/browser calls count; T01 Live Browser and actual T03 PTC producer NOT_RUN; R5 NOT_RUN; Canonical Full NOT_APPLICABLE; executable Tested SHA; report-only/final remote SHA handoff; STOP.

Stage exact intended source/tests/config/frozen docs (not builds, secrets, unrelated drift); implementation commit after final gates; report-only commit separately where feasible. Normal `git push origin main`, then verify `git rev-parse HEAD == git rev-parse origin/main == git ls-remote origin refs/heads/main`. If publication fails report DELIVERY_BLOCKED, not PUBLISHED. The report need not embed its own uncreated commit SHA; include final SHA in terminal handoff. **Do not create `Acceptance_Report.md`, claim `ACCEPTED`, amend/rewrite history merely for report metadata, or advance to R5.** Final acceptance is ChatGPT Web's independent inspection of the actual pushed remote source and evidence.

## 5. STOP boundaries / compact Codex handoff

STOP if exact Session ownership or source/call occurrence cannot be proven; a positive match would rely on reused callId/rootCallId or nearest-event heuristics; implementing the task would require modifying Harness Core, native approval answerer, user's permanent settings, protected drift, or canonical baseline silently; replay must overwrite conflicting result; source payload would leak sensitive data; an actual persistent ledger/new policy engine/full RiskAssessment/LLM/browser bridge/benchmark is needed; or remote Git ancestry unexpectedly diverges. Preserve all source/evidence and return precise blocker/partial status.

```text
Outcome: T04_R4_PUBLISHED_READY_FOR_REVIEW / T04_R4_PARTIAL / BLOCKED
F-001..F-015 status + proof levels; scoped E-001..E-007:
Actual ToolRuntime/ApprovalService/Session integration:
Restart: snapshot simulation / true persistence evidence:
T01 9/9 + T02 16/16 + T03 17/17 + R4 focused:
Typecheck/lint/build/export/pack/diff/secret gates:
Tested SHA; implementation commit:
Execution_Report.md:
Final HEAD / origin/main / ls-remote SHA:
Protected drift; Live Browser / actual PTC producer / R5 NOT_RUN:
STOP; no R5. ChatGPT Web independently reviews.
```
