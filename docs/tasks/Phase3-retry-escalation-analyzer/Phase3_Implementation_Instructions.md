# Risk Advisor — Phase 3: Retry / Escalation Analyzer | Implementation Instructions

**Authority:** `Phase3_Architecture_Freeze.md` is frozen and authoritative.  
**Architecture checkpoint:** `aa10f4705140fdf0a361767fc9ddaed15c500e6c`.  
**Accepted pre-Phase-3 product baseline:** `0f84111a969ea4fd6148eb9e59d24c5cf101035d`.  
**Last accepted executable:** `a664f321c0d8e7ed9d619a8065c68ca24e2df0fa`.  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, read-only.  
**Final acceptance authority:** ChatGPT Web.

## 1. Start safely

1. Sync `main`.
2. Record exact HEAD / origin/main / ls-remote / status.
3. Confirm the Phase-3 task directory contains Preflight, Architecture Freeze and these instructions.
4. Preserve unrelated/untracked drift.
5. No reset --hard, clean, rebase, force push or broad formatter pass.
6. Harness Core remains read-only.

If remote history advanced incompatibly, stop with `PHASE3_BLOCKED_REMOTE_DRIFT`.

## 2. Implement only Phase 3

Implement:

```text
operationFingerprint
retryOf
sameRootCause
permissionEscalation
bounded FailureChainSummary
```

Expected new module:

```text
src/host/retry-escalation.ts
```

or a similarly narrow Host-only module.

Minimal expected integration changes:

- `src/index.ts`
- internal correlation hook plumbing
- package script for `test:p3`
- focused Phase-3 tests
- Execution Report

Do not add Browser/Client Phase-3 UI.

## 3. Fingerprint adapter

Implement a private versioned SHA-256 fingerprint.

Controlled tools only:

### read

Include:

```text
read
file_path
offset/absence
limit/absence
```

### write

Include:

```text
write
file_path
content
```

Exclude:

```text
sandbox_permissions
justification
```

Do not retain content after hashing.

### bash / pwsh

Include:

```text
toolName
command
workdir/absence
run_in_background/absence
```

Exclude:

```text
description
timeoutMs
sandbox_permissions
justification
```

Do not parse shell syntax.

Do not treat different command strings as equivalent.

### argument safety

Use closed/fail-closed access:

- plain/null-prototype object;
- own data properties only;
- reject accessors;
- reject unknown keys;
- enforce bounded strings/counts/numbers;
- validate requested sandbox mode against `workspace-write | danger-full-access`;
- malformed input = unsupported/no fingerprint.

No weak fallback fingerprint.

## 4. Relation records and bounds

One analyzer per Host generation.

Use exact Phase-1 ExecutionId supplied by the existing correlation owner.

Bounds:

- max 128 records per exact Session;
- max 512 global retained records;
- absolute TTL 5 minutes;
- max 8 returned chain entries;
- query does not refresh TTL;
- monotonic injectable clock;
- dispose makes old generation inert.

Prefer evicting expired/settled records. Do not evict active records simply to manufacture capacity.

No disk persistence.

## 5. Integration

Do not create a second identity listener/owner.

Preferred shape:

- instantiate analyzer in `apply(ctx)`;
- extend internal `CorrelationHooks.retire` to receive the exact `ToolExecutionResult`;
- on existing capture callback: Foundation capture + analyzer exact start observation;
- on existing result callback: Foundation retire + analyzer exact result observation;
- T02 continues owning actual active-index retirement.

The analyzer may maintain:

```text
WeakMap<ToolExecution, ExecutionId>
```

only as observation correlation.

Provide one frozen read-only Context service, e.g.:

```text
riskAdvisorFailureChain.get(executionId)
```

Do not expose mutation/projector/fingerprint functions at package root.

## 6. Reuse Phase-2 failure semantics

Do not copy Phase-2 classification tables.

Reuse/refactor package-internal helpers from `explicit-failure.ts` as needed.

Exact result facts should reduce to a private bounded relation outcome containing only what Phase 3 needs:

- proven failed / success / unknown;
- known FailureSignature if available;
- validated shell sandbox mode when exact/unconflicted;
- process failure fact when exact/unconflicted.

If duplicate/conflicting exact results disagree on relation-relevant evidence, mark conflict and suppress retry/root-cause/permission certainty.

No reason/error-message/stdout/stderr heuristic.

## 7. retryOf

Derive relations from current retained facts.

For current execution:

- same exact Session object only;
- supported same fingerprint;
- nearest earlier matching fingerprint only;
- within 5 minutes;
- earlier attempt must already have settled with proven failure before current capture.

If nearest matching execution:

- succeeded → no retry;
- pending → no retry;
- unknown/conflicted → no retry, degraded/insufficient evidence;
- failed → direct `retryOf`.

Never skip the nearest matching execution to reach an older failure.

Concurrent overlapping calls are not retries.

Do not mutate structural parent/root.

## 8. sameRootCause

Private FailureSignature uses:

- specific Phase-2 failure kind;
- sanitized structured error code when present;
- fixed `PROCESS_FAILURE` marker for exact shell process failure.

Generic TOOL_ERROR without structured code = unknown root cause.

For direct retry:

- both failed + equal known signature → true;
- both failed + different known signature → false;
- otherwise → unknown.

A pending or successful current retry → unknown.

## 9. permissionEscalation

Only evaluate for a proven direct retry.

Ordered modes:

```text
read-only < workspace-write < danger-full-access
```

Prior known mode may come from:

- prior validated explicit requested permission; or
- prior exact unconflicted shell sandbox result mode.

Current mode comes from current validated explicit `sandbox_permissions`.

Result:

- strictly wider → true;
- both known equal/narrower → false;
- either side unknown/conflicted/absent → unknown.

Never treat missing prior permission as read-only.

Never parse approval reason text.

Do not conclude necessity/authorization/proportionality/excessiveness.

## 10. FailureChainSummary

Expose a detached/deeply frozen bounded summary.

Required semantics:

```text
executionId
status
retryOf?
retryCount
recentFailureCount
sameRootCause
permissionEscalation
truncated
reasonCodes[]
recent[] <= 8
```

Each recent entry may contain only:

```text
executionId
failureKind?
errorCode?
```

Never expose:

- fingerprint/hash;
- raw args;
- path/content/command/workdir;
- permission string;
- justification/reason;
- stdout/stderr/result;
- Session/event/ToolExecution/token;
- raw exception text.

## 11. HMR / recovery

On dispose/HMR:

- analyzer inactive;
- retained relation state cleared;
- late result callbacks inert.

Do not rebuild relations from Phase-2 durable occurrences.

A current execution after a generation change must not bind to an earlier historical call merely because sessionId/callId/fingerprint-looking data appears similar.

Preserve F-006/F-013 as PARTIAL.

## 12. Required focused tests

At minimum cover:

1. read fingerprint stable/correct;
2. write permission/justification ignored;
3. write content/target change breaks match;
4. bash/pwsh description/timeout/permission/justification ignored;
5. bash/pwsh command/workdir/background change breaks match;
6. extra/malformed/hostile/accessor/oversized → unsupported;
7. nearest prior failed match → retry;
8. nearest success blocks older failure;
9. nearest pending/unknown/conflict blocks older failure;
10. concurrent overlap not retry;
11. exact Session object isolation despite equal sessionId text;
12. 5-minute boundary;
13. backward-only relation / no cycle / no structural mutation;
14. sameRootCause true/false/unknown;
15. shell process failure eligibility;
16. relation evidence conflict fail-closed;
17. structured read-only→workspace-write and workspace-write→danger-full-access;
18. missing prior/current level → permission unknown;
19. known equal/narrower → false;
20. no textual heuristic;
21. per-session/global bounds;
22. max-8 chain truncation;
23. TTL no refresh;
24. dispose/HMR inertness;
25. durable history does not fabricate retry edge;
26. summary frozen/privacy;
27. real pinned Context + SessionStore + ToolRuntime + ApprovalService local deterministic integration;
28. Native Approval remains unchanged.

Use parameterized tests where practical.

## 13. Public surface

Package root may export Phase-3 DTO/service **types** required by consumers.

Do not export:

- raw fingerprint helpers;
- relation mutators;
- failure-signature builders;
- caller-constructible authority projectors.

The supported product seam is the runtime-owned Context read-only query.

## 14. Quality-gate order

Use:

1. implement smallest slice;
2. Phase-3 focused unit/component tests;
3. Phase-3 runtime integration;
4. directly affected inherited suites while iterating;
5. typecheck;
6. build;
7. Host export smoke;
8. Client export regression smoke;
9. declaration/root-export audit;
10. `pnpm pack --dry-run --json`;
11. `git diff --check`, scope/privacy/secret checks;
12. commit final executable/test state;
13. run exactly one fresh complete `pnpm test` on that exact executable SHA.

Current accepted full baseline is 16 files / 116 tests before Phase-3 additions. Do not hard-code the final new total until implementation is complete.

If the fresh full fails, repair within scope, record the obsolete attempt honestly, create a new executable commit, and run a new final full.

After final passing full: no executable/test/config/package semantic drift; report-only docs may follow.

## 15. Side-effect limits

- provider/model calls: 0;
- external product/network calls: 0;
- deployed Browser/profile: 0;
- real destructive filesystem/shell effects: 0;
- Harness Core mutation: 0;
- Native Approval authority changes: 0.

Local deterministic fixture tools are allowed.

Do not add dependencies merely to manufacture lint/publint.

## 16. Prohibited scope

Do not implement:

- shell parsing/segment analysis;
- semantic command equivalence;
- `pnpm install` ↔ `pnpm install --force` matching;
- Rule Engine;
- destructive/path/workspace/credential/network/install rules;
- privilege “excessive” analysis;
- risk level/recommendation;
- ContextBuilder/Redactor/Judge/Provider;
- Browser Phase-3 UI;
- semantic verification/PostconditionRegistry;
- Evidence Collector/Deep Judge;
- durable guessed retry recovery;
- cross-session retry;
- persistent audit/DB;
- Harness Core changes.

## 17. STOP conditions

Stop with `PHASE3_ARCHITECTURE_DECISION_REQUIRED` if:

- relation requires a second ExecutionId mint;
- matching requires callId/time/tool guessing;
- controlled scope cannot be implemented without shell semantic parsing;
- permission escalation requires missing=read-only assumption;
- root-cause detection requires text parsing;
- raw sensitive operation data must be exposed/retained;
- Native Approval must change;
- Harness Core must change;
- Phase 4+ functionality is required;
- Phase-2 public-authority/conflict boundary would be weakened.

## 18. Execution Report

After executable state is frozen, create:

`docs/tasks/Phase3-retry-escalation-analyzer/Execution_Report.md`

Report:

1. outcome token;
2. start SHA;
3. final executable/tested SHA;
4. final report-only remote SHA;
5. Harness pinned identity/mutation=0;
6. changed-file manifest;
7. fingerprint supported scope;
8. explicit unsupported shell semantic equivalence;
9. retry relation contract;
10. sameRootCause contract;
11. permission escalation evidence table;
12. FailureChainSummary bounds/privacy;
13. HMR/restart relation behavior;
14. F-006/F-013 unchanged;
15. focused test counts;
16. fresh complete regression;
17. static/build/export/declaration/pack/privacy gates;
18. provider/network/browser counts;
19. Phase-4+ non-implementation;
20. HEAD/origin/ls-remote equality.

Allowed handoff:

- `PHASE3_PUBLISHED_READY_FOR_REVIEW`
- `PHASE3_ARCHITECTURE_DECISION_REQUIRED`
- `PHASE3_BLOCKED`

Do not generate an Acceptance Report and do not declare `PHASE3_ACCEPTED`.
