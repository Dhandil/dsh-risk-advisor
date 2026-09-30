# Risk Advisor — Phase 3: Retry / Escalation Analyzer | Preflight

**Verdict:** `PHASE3_PREFLIGHT_READY`  
**Date:** 2026-09-30  
**Repository:** `Dhandil/dsh-risk-advisor`  
**Accepted Phase-2 product baseline:** `0f84111a969ea4fd6148eb9e59d24c5cf101035d`  
**Last accepted executable SHA:** `a664f321c0d8e7ed9d619a8065c68ca24e2df0fa`  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, read-only.

## 1. Authority and formal scope

The technical Source of Truth remains `docs/baseline/risk-advisor-v1-architecture-v1.2.md`.

Its frozen roadmap defines Product Phase 3 as:

```text
operationFingerprint
retryOf
sameRootCause
permissionEscalation
bounded FailureChainSummary
```

Phase 3 does not include Rule Engine, shell risk parsing/fail-closed rules, RiskAssessment, Judge/LLM, Browser product UI, semantic postcondition verification, Evidence Collector, Deep Judge, or final Hardening.

## 2. Current repository fact

There is no existing Phase-3 implementation. Remote search found no product code for:

- `operationFingerprint`
- `retryOf`
- `sameRootCause`
- `permissionEscalation`
- `FailureChainSummary`

Older `docs/discussion/risk-advisor-execution-ledger-v1.0.md` contains conceptual Relation Analyzer material, but it is not executable product truth and several details predate the accepted Phase-1/2 safety boundaries. It may inform terminology only when consistent with the frozen v1.2 architecture and current source.

## 3. Foundations Phase 3 may reuse

### Phase 1 / 1A

Current live execution foundation already provides:

- one exact Phase-1 `ExecutionId` mint owner;
- exact `ToolExecution` object lifecycle;
- bounded raw argument access at pre-execute;
- exact Session ownership;
- stable private `operationHash` for exact complete input;
- closed Phase-1A normalization for `read` / `write`;
- optional `requestedPermission` on supported write calls;
- five-minute absolute snapshot TTL and bounded entry count;
- no public raw args / paths / hashes.

`operationHash` MUST NOT be reused as `operationFingerprint`: it intentionally includes exact canonical arguments and requested permission, while a retry fingerprint must ignore controlled retry-variant fields such as permission/justification.

### Phase 2

Accepted Phase 2 provides:

- exact live terminal `tools/result`;
- ToolRuntime success/error;
- structured timeout and cancellation codes;
- strict shell foreground process evidence;
- structured shell sandbox mode/denial facts;
- conflict-fail-closed behavior;
- bounded committed Session replay;
- PTC nested evidence;
- internal explicit-failure projection helpers;
- package-root authority surface closed.

Phase 3 should reuse Phase-2 internal classification semantics instead of creating a second failure taxonomy.

## 4. Critical boundary: relation recovery is live-exact only

Accepted Phase 2 deliberately keeps F-006 and F-013 PARTIAL: the pinned public Harness seams do not prove a positive exact identity between one live Phase-1 `ExecutionId` and a durable `tool/call/tool/result` occurrence.

Therefore Product Phase 3 must not infer:

```text
durable callId / tool / timestamp
→ historical Phase-1 ExecutionId
→ retryOf
```

The initial Phase-3 relation graph is:

- exact live;
- same Host generation;
- exact Session-object scoped;
- derived only from executions observed with a real Phase-1 ExecutionId.

After HMR/restart/runtime-state loss, unavailable relation state stays unavailable/degraded. Durable facts may still exist in Phase 2, but they cannot recreate a Phase-3 `retryOf` edge without a future exact cross-plane witness.

This is not an architecture revision; it is the consequence of the already accepted F-006/F-013 boundary.

## 5. Controlled fingerprint scope

The V1 DoD says `operationFingerprint` must identify retries in a **controlled scope**. Phase 3 should implement a deliberately conservative first scope.

Recommended closed adapters:

### `read`

Fingerprint semantics:

```text
tool = read
file_path exact lexical value
offset
limit
```

No filesystem resolution or canonical-path discovery in Phase 3.

### `write`

Fingerprint semantics:

```text
tool = write
file_path exact lexical value
content digest
```

Explicitly omit:

```text
sandbox_permissions
justification
```

so a one-shot permission retry of the exact write can match.

The raw content itself must never enter relation state or diagnostics.

### `bash` / `pwsh`

Pinned argument shape is:

```text
command
description
timeoutMs?
workdir?
run_in_background?
sandbox_permissions?
justification?
```

Phase-3 fingerprint semantics should include only:

```text
tool family
exact command string
exact workdir value / absence
run_in_background value / absence
```

and omit:

```text
description
timeoutMs
sandbox_permissions
justification
```

This allows an exact command to be recognized across timeout/permission/reason changes without parsing shell semantics.

Phase 3 MUST NOT parse shell chaining, wrappers, command flags, targets, path semantics, encoded commands, or equivalence. Therefore:

```text
pnpm install
!=
pnpm install --force
```

for the initial Phase-3 fingerprint. The final V1 Case 12 semantic equivalence may be widened later only by a Phase-4-or-later proven shell semantic adapter.

Unknown tools, malformed shapes, unsupported extra keys, oversized strings, accessors/hostile objects or otherwise unprovable inputs produce no fingerprint and no retry inference.

## 6. Fingerprint representation

Use a versioned SHA-256 digest over a stable, bounded semantic tuple.

Properties:

- deterministic;
- exact Session-independent semantic grouping hint;
- never execution identity;
- never authorization;
- never exposed to Browser;
- never used as ActiveExecutionIndex key;
- raw command/path/content is not retained solely for fingerprinting.

A fingerprint collision must never silently join executions. The analyzer still requires exact same Session scope, earlier ordering and prior proven failure.

## 7. Retry relation preflight decision

Initial `retryOf` rule should be conservative:

1. current execution has a supported fingerprint;
2. search only the exact same Session object's earlier Phase-3 live history;
3. consider only the nearest earlier execution with the same fingerprint;
4. it must be within the frozen retry window;
5. the nearest matching execution must have a proven failure/process failure;
6. if it succeeded, is incomplete, conflicted, unknown or unsupported, do not skip past it to bind an older failure;
7. if all conditions hold, `retryOf = previous.executionId`.

This prevents a later ordinary repeat from reaching backward across a successful same-operation execution and falsely attaching to an old failure.

A retry relation must never mutate structural parent/root relations.

## 8. Failure eligibility and root-cause signature

A prior attempt may qualify as failed only from structured exact live evidence accepted by Phase 2, including:

- exact ToolRuntime terminal failure;
- structured timeout/cancellation/system/tool error;
- exact unconflicted shell `processSuccess=false`;
- exact structured shell sandbox denial/unavailable.

Do not use model-facing error text, stdout/stderr, approval reason text, command text, or arbitrary exception messages.

Approval failure may enter a specific execution's retry chain only if an existing exact execution binding proves that approval belongs to that execution. Current unbound/ambiguous Phase-2 durable approval facts are not enough by themselves.

For `sameRootCause`, use a bounded structured signature, not text:

- specific Phase-2 failure kind;
- sanitized structured error code when present;
- a fixed process-failure marker for exact unconflicted shell process failure.

`sameRootCause` semantics:

- `true`: retry relation exists and both attempts failed with the same known structured signature;
- `false`: retry relation exists and both failed with two known different signatures;
- `unknown`: current not failed yet/succeeded, either signature unavailable/conflicted, or evidence is degraded.

Generic `TOOL_ERROR` with no structured code should not be promoted to a precise same-root-cause claim.

## 9. Permission escalation evidence

Pinned sandbox escalation vocabulary is closed:

```text
read-only < workspace-write < danger-full-access
```

Pinned escalation targets exposed to tools are:

```text
workspace-write
danger-full-access
```

Phase 3 may derive `permissionEscalation` only on a proven retry relation and only from structured modes.

A prior permission baseline may come from:

1. an exact prior explicit requested sandbox mode; or
2. an exact, unconflicted prior shell sandbox result mode.

The current target may come from an exact supported `sandbox_permissions` argument.

Then:

- strictly wider current target → `true`;
- known equal/narrower target → `false`;
- missing/conflicted/unsupported prior or current level → `unknown`.

Do not infer an absent previous `sandbox_permissions` as `read-only`. Standing session policy may differ.

Do not parse approval reason text such as “escalate sandbox to …”.

This means a shell denial with structured prior sandbox mode can prove e.g. `read-only → workspace-write`, while a filesystem first attempt whose effective mode is not structurally observable may remain unknown until both explicit levels are known.

## 10. Relation state and bounds

Recommended initial product contract:

- exact Session-object scoped state;
- max 128 retained relation records per Session;
- five-minute absolute retry/relation window, aligned with the accepted Phase-1A live snapshot horizon;
- max 8 entries in a returned failure chain;
- monotonic local capture ordinal;
- no TTL refresh on query;
- no disk storage;
- clear/inert on dispose/HMR.

The five-minute window is a Phase-3 product decision to operationalize the architecture's “时间接近” requirement conservatively; it is not a claim about Harness.

## 11. Bounded FailureChainSummary

The public/read-only Phase-3 fact seam should contain only bounded derived facts, e.g.:

```ts
interface FailureChainSummary {
  executionId: string
  status: 'READY' | 'UNSUPPORTED' | 'DEGRADED' | 'NOT_FOUND' | 'EXPIRED'
  retryOf?: string
  retryCount: number
  recentFailureCount: number
  sameRootCause: boolean | 'unknown'
  permissionEscalation: boolean | 'unknown'
  truncated: boolean
  reasonCodes: readonly string[]
  recent: readonly {
    executionId: string
    failureKind?: ExplicitFailureKind | 'PROCESS_FAILURE'
    errorCode?: string
  }[]
}
```

Exact naming may change in the Architecture Freeze, but semantics must remain:

- fact context only;
- no risk level;
- no recommendation;
- no authorization conclusion;
- no raw args/path/content/command/workdir/justification/stdout/stderr;
- no fingerprint/hash;
- no Session/ToolExecution/token objects;
- detached/frozen/bounded.

## 12. Integration shape

The cleanest existing composition point is the Phase-1 exact correlation owner.

Phase 3 should avoid registering a second execution identity owner.

A likely implementation shape:

- instantiate one `RetryEscalationAnalyzer` per Host generation;
- extend the internal correlation hook so its existing exact pre-execute callback can notify the analyzer after the Phase-1 ExecutionId exists;
- extend the existing exact result callback to pass the exact final ToolExecutionResult to the analyzer before/while retiring Foundation state;
- analyzer keeps its own `WeakMap<ToolExecution, ExecutionId>` only as observation correlation, never as an ID mint;
- expose only a frozen read-only query facade such as `riskAdvisorFailureChain.get(executionId)`;
- do not expose mutation/projector helpers at package root.

No additional approval answerer or Browser route is required in Phase 3.

## 13. Test preflight

Minimum focused matrix should cover:

1. stable controlled fingerprints for reordered object keys / equivalent closed input;
2. write permission/justification omitted from fingerprint, content change changes fingerprint;
3. bash/pwsh description/timeout/permission/justification omitted;
4. bash/pwsh command/workdir/background differences change fingerprint;
5. malformed/unknown/hostile/oversized input → unsupported, no guess;
6. same Session + nearest prior failed same fingerprint → retry;
7. previous matching success blocks reaching back to older failure;
8. same sessionId text but different Session objects never relate;
9. five-minute boundary;
10. retry chain ordering/count/cycle prevention;
11. structural parent/root semantics untouched;
12. sameRootCause true / false / unknown table;
13. `read-only → workspace-write` and `workspace-write → danger-full-access` when structured evidence exists;
14. absent/ambiguous prior permission baseline → unknown;
15. no reason/stderr/command-text heuristic for root cause or permission escalation;
16. shell process failure retry eligibility;
17. conflict/degraded evidence suppresses retry/root-cause certainty as required;
18. max 128 history / max 8 summary entries / truncation;
19. TTL expiry and no query refresh;
20. dispose/HMR makes old generation inert;
21. runtime-state loss does not rebuild relation from durable callId;
22. DTO frozen/privacy;
23. genuine pinned Context + SessionStore + ToolRuntime + ApprovalService integration proving exact ExecutionId reuse and Native Approval noninterference;
24. all inherited 116 accepted tests remain green.

## 14. Explicitly out of scope

Do not implement in Phase 3:

- shell segmentation/equivalence/flag semantics;
- `pnpm install` vs `pnpm install --force` semantic equivalence;
- destructive/path/workspace/secret rules;
- privilege evaluation or “excessive” conclusion;
- Rule Engine;
- RiskAssessment/recommendation;
- ContextBuilder/Redactor/LLM/Judge;
- Browser failure-context UI;
- ExpectedEffect/semantic verification;
- Evidence Collector/Deep Judge;
- durable guessed relation reconstruction;
- cross-session retry inference;
- persistent relation database;
- Harness Core modification.

## 15. Open gates inherited

Phase 3 must preserve:

- F-006 exact Live↔Durable positive confirmation: PARTIAL;
- F-013 exact replay/live positive witness: PARTIAL;
- true disk/process restart: NOT_RUN;
- real native PTC producer: NOT_RUN;
- deployed Browser/profile: NOT_RUN;
- WebWorker: NOT_VALIDATED;
- newer Harness/V4: NOT_VALIDATED;
- T05 production assessment budgets: UNDETERMINED.

## 16. Preflight verdict

`PHASE3_PREFLIGHT_READY`

No source fact requires revising the frozen V1 roadmap. Phase 3 is implementable as a conservative exact-live relation layer on top of accepted Phase 1 and Phase 2.

The main architecture choice that must be frozen before implementation is the controlled fingerprint contract plus fail-closed relation/permission semantics above.
