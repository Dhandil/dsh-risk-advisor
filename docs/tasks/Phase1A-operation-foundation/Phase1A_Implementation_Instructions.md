# Risk Advisor — Phase 1A Implementation Instructions (Codex)

**Authority:** Read adjacent `Phase1A_Architecture_Freeze.md` fully; it controls every implementation decision. This is the **first formal product implementation task**, not an exploratory Spike, and Codex is NOT the acceptance authority.  
**Task directory:** `docs/tasks/Phase1A-operation-foundation/`.  
**Expected plugin starting remote:** `39b50d18514988de64997ad3de5569bf5c795c1c`.  
**Pinned Harness:** local `ddefc45fbc7f8e46dd73185e68295696d1297887` strict read-only; newer upstream `4878cdab...` NOT_VALIDATED.

## 0. Preflight and scope protection

1. In `D:\Harness\harness-plugin\dsh-risk-advisor`, inspect HEAD/branch/status/index/untracked, `origin/main`, and `git ls-remote origin refs/heads/main`; safely sync only the plugin `main` if linear and compatible. STOP on unexplained divergence. No reset/clean/rebase/force-push. Preserve `docs/risk-advisor-current/`, untracked `docs/tasks/T01-approval-ui/T01_Final_Runtime_Gate_Instructions.md`, `.vitest-cache/`, `lib/`, `node_modules/`, `pnpm-lock.yaml`, and any new drift. Stage only Phase 1A scope.
2. In `D:\Harness\deepseek-harness`, read frozen HEAD/status and necessary **public source/types** only; no fetch/pull/checkout/install/build, no source or `.git` writes. Preserve `build.log`, `install.log`, `t0-*`, `undefined/` and all other drift. Do not switch to unvalidated Session V4.
3. Verify the two supplied exact Phase1A Markdown files are placed in this task directory. Read T06 proposal/gap and closure, canonical Architecture §§7–13/47, V1 Spec and Test Matrix P0 and Area A/B, and current actual `src/index.ts`, `correlation.ts`, `ledger.ts`, T02 runtime tests. Confirm exact pinned `ToolExecution` and `read`/`write` tool schemas before modifying anything. Discrepancy → STOP, do not silently change the freeze.

## 1. Implement the frozen same-object single-mint path

- Extract a **plugin-private shared installer** for the existing correlation observer. Keep exported `installCorrelation(ctx)` working exactly as before for current tests, and keep its public frozen `CorrelationDiagnostics` unchanged. `apply(ctx)` must install precisely one `ActiveExecutionIndex`, one correlation pre-execute observer and the existing Ledger once; wire optional private Foundation capture into the **same observer** immediately after `index.observePreExecute(exec)` returns the single mint's ID, **before** native `next()`.
- `OperationFoundation.capture(exec, returnedExecutionId)` must receive that exact execution object, never `lookup(session, callId)` or durable evidence as a substitute. Idempotent same-object WeakMap; no UUID/new mint in Foundation. For a result on the exact object, retire snapshot raw data and existing index record (without changing T02's finished-result behavior). Keep parent linkage only when the T02 exact parent-token witness exists; do not infer from `rootCallId`/callId.
- Keep normalizer, private SnapshotStore and BoundaryCollector within Host code; provide a separate sanitized read-only Foundation diagnostic, if useful, with no mutation/capture/raw access. Do not expose private callback/adapter capability in `ctx`. Failure in any observational stage must not stop `next()` or alter original decision/result. `next()` exactly once.

## 2. Private operation / normalization / boundary / lifetime

- Define the frozen private snapshot v1 and sanitized diagnostic as separate types. Implement bounded *early-stop* deep detach for JSON-like `exec.arguments` (16 KiB UTF-8 visited output budget, max depth 8, max 256 nodes, max 64 keys/object, max string 8192 characters); do not first stringify arbitrary unbounded input. Handle invalid/oversized/hostile/cyclic values with `unknown` and sanitized reason; do not throw across the observer. Do not mutate or freeze the runtime-owned original args.
- Write exactly two closed name-and-shape adapters initially: `read(file_path, offset?, limit?)` and `write(file_path, content, sandbox_permissions?, justification?)` per pinned source. They may classify requested kind only, not authenticate the tool implementation or assert actual effects. Reject unknown keys/types. Keep lexical targets only in private snapshot; never output raw path/content/justification or arbitrary payload in diagnostics. All other tools (including bash/pwsh/edit/run_code) remain `unknown` in this phase. Canonical hash is optional and private, produced only for fully admitted known-tool input; stable sorted keys, ordered arrays; never use it for ExecutionId, authority or historical joins.
- Collect `session.header.cwd?` only as **session creation cwd metadata**; do not treat it as workspace root or effective tool cwd. All unproven per-operation boundary and reversibility fields must explicitly be independent `unknown`/empty; requested permissions are not granted permissions and sandbox-active is not sandbox-covered. No filesystem/process/network inspection.
- Store at most 512 snapshots per generation, with 5-minute absolute TTL from capture. Reclaim expired and oldest settled entries before refusing a new capture; never evict an active entry merely to falsify availability. If all 512 are active, decline new snapshot with sanitized `CAPACITY_EXCEEDED`, while T02 correlation/native execution remains unaffected. On exact result immediately drop bounded raw args and retain only safe metadata until original TTL; on disposal/HMR clear everything. Use injectable clock in unit tests, not real five-minute waits. Avoid unbounded tombstone growth.

## 3. Proof implementation, in order

- New focused tests labelled P1A-01..P1A-13 from Architecture Freeze: exact single ID; same/different exec/collision; missing Session/callId/history; read/write/unknown/oversized invalid/hostile args; independently unknown boundary; canonical hash only when complete; capacity/TTL/settled-first eviction; result/dispose/HMR; exact nested token; `next()` exactly once despite injected faults; frozen privacy-safe facade; true pinned `Context + SessionStore + ToolRuntime + ApprovalService` integration with local deterministic fixture.
- Negative fixture: a later live traversal reuses an old completed historical callId; never map the Foundation to the old record or claim T04 F-006/007/013 confirmation. Do not manufacture native PTC producer proof via `Session.append`.
- Ensure mounted `apply(ctx)` produces no duplicate correlation observer or duplicate Native answerer and still retains T01 fixture, T02 correlation, T03 replay, T04 Ledger and T05 stats/benchmark code. Browser/live runner, provider/model calls, native producer, disk/process restart and new-upstream compatibility remain NOT_RUN.
- If interface behavior/retention affects R5 current-hook performance materially, document focused comparison separately without rewriting R5's simulated/performance status or hard-coding `T_sync`. Ordinary scope does not require a fresh full R5 benchmark.

## 4. Gates and release order

```text
Preflight/pinned public seam verification/protected drift
  → bounded source changes and P1A focused/self tests
  → architecture/P0/privacy/identity/lifecycle/scope audit
  → typecheck, available lint, build, Host export smoke, pack dry-run,
     git diff --check, staged path + secret/raw-payload audits
  → fix + rerun affected focused/static checks
  → EXACTLY ONE fresh complete project regression on final executable SHA:
     T01 9 + T02 16 + T03 17 + T04 21 + T05 pure 3 + P1A tests
  → NO EXECUTABLE DRIFT afterward (unless retest)
  → update ONE docs/tasks/Phase1A-operation-foundation/Execution_Report.md
  → implementation commit, separate report-only commit if feasible
  → push and verify HEAD == origin/main == git ls-remote origin refs/heads/main
  → STOP for ChatGPT Web independent source/commit/test audit
```

Additional focused source audits: preserve external `installCorrelation(ctx)` behavior and `CorrelationDiagnostics`, do not broaden public Host facade into raw data, do not edit `docs/baseline/**`, T00–T06 accepted reports or Client fixture; only Phase1A Host implementation/tests/scripts/docs are authorized. `lint`/`publint` may be honestly NOT_CONFIGURED; no need to change Harness to install them. No Canonical Full runner infrastructure exists in this plugin; complete `pnpm test` is its final executable regression, not PAH Canonical Full. Full R5 benchmark is separate and NOT_RUN unless separately justified.

## 5. Execution report and STOP

One `Execution_Report.md` under this Phase1A directory, recording: exact start and Tested SHA, final remote SHA in terminal handoff; public source seams and private integration decision; files changed; P1A proof matrix and real runtime integration; T01–T05 actual counts plus P1A count; all static/build/export/pack results; privacy/cap audit; failure non-interference; accepted/open inherited gates, protected drift, non-run providers/Browser/PTC/disk/Harness; report-only vs executable changes. Do NOT create an `Acceptance_Report.md`, do NOT self-announce ACCEPTED, do NOT start Phase1B or Phase1C.

STOP with `PHASE1A_ARCHITECTURE_DECISION_REQUIRED` if exact ID adapter isn't feasible without duplication, private Harness or upstream-only APIs are necessary, snapshot privacy/TTL cannot be enforced, P0/native behavior regresses, or unexpectedly divergent remote/protected drift requires user decision. Otherwise report one of `PHASE1A_PUBLISHED_READY_FOR_REVIEW`, `PHASE1A_PARTIAL`, `PHASE1A_BLOCKED` with honest non-claims and final SHA verification.

### Compact terminal handoff

```text
Outcome:
Pinned plugin/Harness baselines and protected drift:
Exact single-mint integration (actual source changes):
Private Snapshot / read-write adapter / Boundary / TTL-cap proof:
P1A focused count and real pinned integration:
Inherited complete T01–T05 regression and final aggregate count:
Typecheck / lint / build / Host export / pack / diff / privacy / scope:
NOT_RUN (Browser / provider / native PTC / disk restart / new upstream):
Tested / Implementation SHA:
Execution_Report.md:
Final remote SHA; HEAD/origin/main/ls-remote equality:
STOP; no Acceptance Report or Phase1B/1C.
```
