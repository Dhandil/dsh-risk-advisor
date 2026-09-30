# Risk Advisor — Phase 2: Execution Ledger + Explicit Failure | Implementation Instructions

**Authority:** `Phase2_Architecture_Freeze.md` is frozen and authoritative for this task.  
**Architecture checkpoint:** `39e72721fd6d31d54ece06052f3cdea02ec72961`.  
**Accepted pre-Phase-2 product executable:** `9c7a4e54effe3455171aabb724724dd0e7eeb9b4`.  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, read-only.  
**Final acceptance authority:** ChatGPT Web.

## 1. Start and repository safety

1. Sync `Dhandil/dsh-risk-advisor` `main` normally.
2. Record exact `HEAD`, `origin/main`, `git ls-remote origin refs/heads/main`, branch and status before any write.
3. Confirm the Phase-2 task directory contains this instruction plus `Phase2_Preflight.md` and `Phase2_Architecture_Freeze.md`.
4. Preserve all unrelated user/untracked drift. No `reset --hard`, `clean`, force push, destructive checkout, or blanket formatting.
5. Keep `D:\Harness\deepseek-harness` / the pinned Harness source strictly read-only. Do not fetch/install/build/checkout/reset/clean/mutate Harness Core unless the user separately authorizes it.

If remote history advanced beyond the instruction publication, inspect the delta. Continue only when it is compatible and document it; otherwise stop with `PHASE2_BLOCKED_REMOTE_DRIFT`.

## 2. Implement exactly Phase 2

The task is **Execution Ledger product consolidation + Explicit Failure**. Do not reinterpret it as a new Ledger rewrite.

Primary expected files:

- `src/host/ledger.ts` — evolve existing T04 Ledger in place.
- optional new focused Host module such as `src/host/explicit-failure.ts` if this keeps classifier code isolated.
- `src/index.ts` — only minimal service/export/wiring changes.
- `tests/p2-explicit-failure.unit.spec.ts` — focused pure/component cases.
- `tests/p2-runtime.integration.spec.ts` — genuine pinned Host integration cases.
- `package.json` — add focused `test:p2` and include it in full `test`.
- `docs/tasks/Phase2-execution-ledger-explicit-failure/Execution_Report.md` — only after implementation evidence is complete.

Names may vary if repository conventions require, but scope may not.

Do not modify `src/client/**`, Phase-1 Browser bridge behavior, T01 fixture UI, baseline architecture/spec/contract files, Harness Core, or unrelated tasks.

## 3. P2A — consolidate the existing Ledger

Keep and reuse:

- exact `WeakMap<Session,...>` state ownership;
- exact live `ToolExecution` object/token private correlation;
- T04 live ordinal / durable occurrence distinction;
- `tools/pre-execute`, `tools/execute`, `tools/result`, `session/event` observers;
- committed source `(seq,type)` dedupe/conflict handling;
- source scope audit;
- snapshot recovery and source watermark;
- T03 `replayPtcSnapshot()` as the sole PTC durable projector;
- current caps and frozen detached diagnostics unless a test proves a concrete defect.

Do not create another `ExecutionId`. Do not turn durable occurrence seq/callId into a Phase-1 ExecutionId.

Refactor only when required to make the Phase-2 outcome/failure projection typed, testable and bounded. Preserve all R4 safety behavior.

## 4. P2B — add Explicit Failure projection

Implement the frozen typed semantics, preferably as pure helpers over sanitized evidence.

Minimum public/internal types should represent:

- terminal status: `SUCCESS | FAILURE | UNKNOWN`;
- optional `processSuccess: true | false | 'unknown'`;
- `semanticSuccess: 'unknown'` only;
- bounded `ExplicitFailureFact[]`;
- failure kind;
- evidence strength;
- provenance/evidence refs;
- optional sanitized `{name,code}` only.

Do not expose raw source objects or raw tool result values.

### 4.1 Generic terminal failure

For an exact final live result:

- `isError=false` → terminal status SUCCESS, but do not automatically claim process success for arbitrary tools;
- `isError=true` → terminal status FAILURE;
- if no more specific structured category is proven, emit `TOOL_ERROR / AUTHORITATIVE` with sanitized error identity when available.

On terminal conflict, do not select a canonical winner or emit a false specific classifier. Degrade/unknown according to the freeze.

### 4.2 Timeout

Use the pinned structured code only:

`error.info.code === 'TOOL_TIMEOUT'` → `TIMEOUT / AUTHORITATIVE`.

No timeout message parsing.

### 4.3 Cancellation

- `ABORTED_BEFORE_DISPATCH` → `CANCELLED_BEFORE_DISPATCH / AUTHORITATIVE`.
- `ABORTED` → `CANCELLED_AFTER_DISPATCH / AUTHORITATIVE`.

Do not infer these stages from missing `tools/execute` alone.

### 4.4 Pre-execute decision trace

If you record a pre-execute decision, the observer must delegate `next()` exactly once and return the decision unchanged.

Do **not** label the observer-local returned value the globally final pre decision unless source/runtime evidence proves the observer owns the outermost effective view for the tested composition.

A positive `PRE_EXECUTE_DENIED` classification is allowed only when the effective denial is proven. Preserve `info.name/code` only; never retain/export `reason`.

Pre-execute `cancel` remains cancellation, not policy denial.

### 4.5 Guard returned denial

This is an evidence gate, not a test to force green.

Try to prove whether a public exact final-decision witness exists using only the pinned public API and supported Cordis listener semantics. `prepend:true` by itself is not sufficient to make a universal product claim because later prepended listeners can wrap it.

If and only if a complete public witness is genuinely proven, implement the deterministic path required by the freeze:

```text
effective pre-policy allowed
+ no approval rejected/cancelled/unavailable cause
+ caller not cancelled
+ tools/execute absent
+ tools/post-execute observed
+ final tools/result failure
= GUARDRAIL_DENIED / DETERMINISTIC
```

If that witness is not available, keep the general guard-returned path `UNKNOWN/PARTIAL`, add a focused negative test proving it is **not guessed**, and report the inherited limitation. Do not stop the rest of Phase 2 merely to manufacture a guard classifier.

Guard throw must remain separate and must not become `GUARDRAIL_DENIED`.

Do not use `internal/*` Cordis hooks, monkey patch ToolRuntime, private fields, source modification, reason-text matching, or plugin-load-order assumptions to close this gate.

### 4.6 Shell process adapter

Implement a strict structural adapter only for a tool/output shape proven by the pinned source/runtime, initially `bash` and/or `pwsh` foreground results.

Read only from the exact live successful `ToolExecutionResult.value` in memory. Validate a closed minimal shape before consuming it. Extract no more than:

- foreground marker if required by actual value shape;
- `exitCode`;
- `sandbox.mode` if bounded string/known enum is needed;
- `sandbox.denied`;
- `sandbox.enforcement` if bounded/known;
- `sandbox.runnerFailed` if present.

Do not copy stdout, stderr, spillPath, command, workdir, timeout text or the remaining value.

Derive:

- numeric exit 0 → `processSuccess=true`;
- numeric nonzero exit → `processSuccess=false`;
- null/missing/malformed/conflicted exit → `processSuccess='unknown'`;
- structured `sandbox.denied===true` → `SANDBOX_DENIED / AUTHORITATIVE`;
- structured `SANDBOX_UNAVAILABLE` tool failure → `SANDBOX_UNAVAILABLE / AUTHORITATIVE`.

A sandbox denial and process exit fact may coexist. Do not infer semantic success/failure.

Never parse stderr/EACCES/EPERM/EROFS inside Risk Advisor to classify a denial.

### 4.7 Approval failure facts

Reuse committed approval facts already observed by the exact Session-owned Ledger / Phase-1B lifecycle.

Map only:

- `rejected` → APPROVAL_REJECTED;
- `cancelled` → APPROVAL_CANCELLED;
- `unavailable` → APPROVAL_UNAVAILABLE;
- `allowed-once` → no failure.

Keep the approval fact independent when execution association is missing/ambiguous. Do not assign it as the cause of a specific execution without exact existing association.

Never register or answer `approval/request`.

## 5. P2C — replay / conflict / lifecycle integration

Preserve and extend T04 behavior:

- duplicate exact source event is idempotent;
- same source key with changed payload degrades;
- terminal conflicts preserve bounded contrary claims;
- committed-only result never fabricates a live start/ExecutionId;
- start without result remains incomplete, not auto-failed;
- replay same snapshot is deterministic;
- gapped feed reconciles only through trusted snapshot/source seq;
- old generation is inert after dispose;
- Session string collisions never merge exact Session-owned state;
- no native effect is replayed or retried by Risk Advisor.

Live↔durable equal callId remains separate unless a new exact public witness is proven. Keep F-006/F-013 PARTIAL otherwise.

## 6. PTC

Do not rewrite `src/host/ptc-replay.ts`. Use its accepted source-backed projection.

Add Phase-2 assertions that PTC child settled errors can contribute bounded terminal/failure evidence without becoming a second top-level result.

An actual native `run_code`/PTC producer integration may be added only if it is local, deterministic, uses already-installed pinned packages, requires no provider/network/dependency change, and does not broaden the task. If not run, preserve `real native PTC producer = NOT_RUN` exactly.

## 7. Privacy and exported diagnostics

All externally reachable diagnostics must be detached/frozen/bounded.

Explicitly prove absence of:

- raw args;
- shell command/code;
- stdout/stderr/content/value;
- spill paths;
- approval reason/justification;
- cwd/workspace paths;
- prompts/messages;
- raw Session/event;
- ToolExecution/token/Agent;
- arbitrary exception message/detail;
- secrets/credentials.

Sanitized error `name/code`, tool name, bounded IDs, enums/booleans and source refs are permitted only where already authorized by the freeze.

## 8. Required focused tests

Add focused Phase-2 tests covering at least the architecture matrix. Suggested IDs:

- `P2-01` exact normal terminal success; no failure; semanticSuccess unknown.
- `P2-02` generic exact ToolRuntime error → TOOL_ERROR.
- `P2-03` TOOL_TIMEOUT.
- `P2-04` ABORTED_BEFORE_DISPATCH.
- `P2-05` ABORTED after body invocation.
- `P2-06` proven pre-execute deny + sanitized info/no reason leak, or explicit unsupported proof if global effectiveness cannot be established.
- `P2-07` pre-execute cancel is cancellation.
- `P2-08` guard-returned denial positive only with complete public witness; otherwise UNKNOWN/PARTIAL negative proof.
- `P2-09` guard throw is not returned guard denial.
- `P2-10` foreground shell exit 0/nonzero processSuccess independent of ToolRuntime isError.
- `P2-11` structured sandbox.denied positive without stderr parsing.
- `P2-12` SANDBOX_UNAVAILABLE distinct from denial.
- `P2-13` approval rejected/cancelled/unavailable/allowed-once observations.
- `P2-14` orphan/ambiguous approval does not become execution cause.
- `P2-15` duplicate source idempotence.
- `P2-16` source/terminal conflict degrades and withholds false specificity.
- `P2-17` live + durable equal callId stays separate absent exact cross-plane witness.
- `P2-18` replay/live overlap preserves no-loss/no-false-merge boundary.
- `P2-19` PTC child terminal/failure evidence.
- `P2-20` dispose/HMR generation isolation.
- `P2-21` caps/truncation/observer-fault containment.
- `P2-22` frozen/privacy DTO proof.
- `P2-23` genuine pinned `Context + SessionStore + ToolRuntime + ApprovalService` integration and native noninterference.

Tests may be parameterized. Use the real pinned public APIs for positive runtime claims. Manually appended Session events are fault/component evidence only and must be labeled as such.

## 9. Regression and quality-gate order

Use this order:

1. implement the smallest slice;
2. run Phase-2 focused unit tests;
3. run Phase-2 focused integration tests;
4. run directly affected inherited suites (`test:r3`, `test:r4`, `test:p1a`, `test:p1b`, `test:p1c`) as needed while iterating;
5. run `pnpm run typecheck`;
6. run `pnpm run build`;
7. Host export smoke from built `lib/index.js` for the expected Phase-2 exports;
8. Client export smoke only to prove Phase-1C Client remains intact; do not add Phase-2 Client work;
9. `pnpm pack --dry-run --json`;
10. `git diff --check` / scope audit / privacy-secret scans;
11. confirm no Harness mutation and no unexpected executable drift;
12. commit the final executable/test state;
13. on that exact commit, run one fresh complete `pnpm test` as the final executable regression.

The current inherited accepted full suite is 101 tests before Phase-2 additions. Do not hard-code the expected new total until the focused implementation is final; report exact suite/file counts.

If the final complete regression fails, do not hide or overwrite the attempt. Repair only within frozen scope, rerun affected focused/static gates, create a new executable commit if needed, then run a new final complete regression and report every failed/obsolete attempt clearly.

After the final passing full regression, **no executable/test/config/package semantic drift** is allowed. Only the Phase-2 `Execution_Report.md` and other explicitly required report-only documentation may change without invalidating the tested SHA.

Lint/publint remain honest `NOT_CONFIGURED` unless this task itself legitimately introduces them (it should not). Do not add dependencies merely to create a quality gate.

## 10. No real external side effects

During Phase 2:

- provider/model calls: 0;
- arbitrary network/product calls: 0;
- deployed Browser/profile: 0;
- real user filesystem/shell destructive work: 0;
- native approval authority changes: 0;
- Harness Core mutations: 0.

Harmless local fixture tool executions and local in-memory Session/Approval integration are allowed. Git fetch/push/remote verification are normal delivery operations.

## 11. Prohibited scope

Do not implement or modify:

- operation fingerprint / retry / sameRootCause / permission escalation / FailureChainSummary;
- Rule Engine / risk scoring / severity / recommendation / reversibility;
- ContextBuilder / SecretRedactor / LLM/Judge/provider;
- Product Risk Advisor Card / OperationPresentation;
- semantic verifier / ExpectedEffect / PostconditionRegistry;
- Evidence Collector / Deep Judge / final Hardening;
- Phase-1 Client bridge behavior except regression fixes strictly required by a Phase-2 regression and separately reported;
- Native Approval outcomes/policy/answerer;
- Harness Core;
- baseline architecture/spec/contracts;
- permanent database/audit storage.

Do not bump older OPEN/NOT_RUN claims merely because tests use synthetic fixtures.

## 12. STOP conditions

Stop and report `PHASE2_ARCHITECTURE_DECISION_REQUIRED` if:

- a second live ExecutionId owner appears necessary;
- a positive failure classification requires reason/stderr heuristic parsing;
- guardrail attribution requires private/internal Cordis/Harness hooks, monkey patching, or unverifiable listener-order assumptions;
- live↔durable join requires callId/time guessing;
- sandbox classification cannot be obtained without leaking raw content;
- Native Approval would be delayed/answered/changed;
- a required fix crosses into Phase 3+;
- Harness Core must change;
- privacy/bounds cannot be maintained;
- pinned source contradicts the Architecture Freeze materially.

## 13. Execution Report

After the executable acceptance state is frozen, create:

`docs/tasks/Phase2-execution-ledger-explicit-failure/Execution_Report.md`

The report must include:

1. outcome token;
2. start HEAD and final executable/tested SHA;
3. final report-only SHA after publication;
4. exact Harness pinned identity and mutation count (must be zero);
5. exact changed-file manifest;
6. implemented Phase-2 contract;
7. failure-category evidence table with AUTHORITATIVE / DETERMINISTIC / UNKNOWN/PARTIAL;
8. guard returned-denial result and whether the exact witness was actually proven;
9. sandbox adapter evidence and explicit no-stderr-heuristic statement;
10. F-006/F-013 status;
11. real PTC producer status;
12. disk/process restart status;
13. Browser/WebWorker/newer Harness status;
14. focused test counts;
15. final complete `pnpm test` count/result;
16. typecheck/build/export/pack/diff/privacy gates;
17. provider/network/browser calls count;
18. protected/unrelated drift preserved;
19. explicit Phase-3+ non-implementation statement;
20. `HEAD == origin/main == git ls-remote` verification after publication.

Allowed final implementation handoff tokens:

- `PHASE2_PUBLISHED_READY_FOR_REVIEW`
- `PHASE2_ARCHITECTURE_DECISION_REQUIRED`
- `PHASE2_BLOCKED`
- `PHASE2_PARTIAL_READY_FOR_REVIEW` only when a specifically frozen residual gate remains partial but the rest of the implementation is test-complete.

Do not write an Acceptance Report and do not declare `PHASE2_ACCEPTED`. Stop after push and remote verification for ChatGPT Web independent review.
