# Risk Advisor — Product Phase 3: Retry / Escalation Analyzer | Architecture Freeze

**Status:** FROZEN FOR IMPLEMENTATION; final acceptance belongs to ChatGPT Web.  
**Date:** 2026-09-30  
**Task directory:** `docs/tasks/Phase3-retry-escalation-analyzer/`  
**Architecture checkpoint:** `1eb7f5a1a7b89b5386f6cd38083f0ddd1319891c` (Phase-3 preflight publication).  
**Accepted pre-Phase-3 product baseline:** `0f84111a969ea4fd6148eb9e59d24c5cf101035d`.  
**Last accepted executable SHA:** `a664f321c0d8e7ed9d619a8065c68ca24e2df0fa`.  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, STRICTLY READ-ONLY.

## 1. Objective

Implement the frozen V1 roadmap's **Phase 3 — Retry / Escalation Analyzer**:

```text
operationFingerprint
retryOf
sameRootCause
permissionEscalation
bounded FailureChainSummary
```

Phase 3 is a derived fact layer. It does not make risk, authorization, necessity, privilege, recommendation, semantic-success, or Harness approval decisions.

## 2. Non-negotiable ownership boundaries

- Phase 1/T02 remains the sole `ExecutionId` mint owner.
- Phase 3 never mints, rewrites or revives an `ExecutionId`.
- Structural parent/root ownership remains Phase-1/T02/T03 responsibility. `retryOf` is a semantic relation and must never alter parent/root.
- Phase 2 remains the failure/process evidence authority. Phase 3 reuses its internal structured classification semantics and must not fork a second error-code taxonomy.
- Native Approval remains authoritative and untouched.
- Phase 3 owns no Browser route and no LLM/provider/subagent work.

## 3. Exact-live relation scope

The first Product Phase-3 implementation is **exact-live and generation-local**.

A relation may be derived only when:

- both executions were observed in the same mounted Risk Advisor Host generation;
- each has an exact Phase-1 `ExecutionId`;
- both belong to the exact same Session object;
- the earlier execution was captured before the later execution;
- required evidence is retained and unconflicted.

F-006 and F-013 remain PARTIAL. A durable `tool/call`, `tool/result`, callId, rootCallId, timestamp, tool name or apparent uniqueness is not enough to reconstruct a historical Phase-1 relation.

After HMR/restart/runtime-state loss:

```text
relation state lost
→ NOT_FOUND / EXPIRED / DEGRADED
```

Never:

```text
durable callId
→ guessed executionId
→ retryOf
```

## 4. Phase-3 state model

Use one analyzer per Host generation.

Recommended bounded state:

```ts
interface RelationRecord {
  executionId: ExecutionId
  session: WeakRef<Session>
  ordinal: number
  createdAt: number

  fingerprint?: string
  requestedPermission?: SandboxMode

  outcome?: RelationOutcomeFact
  evidenceState: 'PENDING' | 'SETTLED' | 'CONFLICTED' | 'UNSUPPORTED'
  reasonCodes: string[]
}
```

Exact names may vary.

Required bounds:

- per exact Session: max 128 retained relation records;
- global retained records: max 512;
- absolute relation TTL: **5 minutes from capture**;
- max 8 entries returned in one retry/failure chain;
- query does not refresh TTL;
- prefer evicting expired/settled records; never evict an active record merely to invent room;
- if capacity prevents capture, mark unavailable/capacity-exceeded and continue native execution;
- dispose/HMR clears state and makes late callbacks inert.

Use an injectable monotonic clock for deterministic tests.

The five-minute window is the Phase-3 definition of the architecture's “时间接近” condition and intentionally aligns with the accepted Phase-1A live snapshot horizon.

## 5. Safe fingerprint capture

`operationFingerprint` is a private derived semantic grouping digest.

It is:

- SHA-256;
- versioned;
- deterministic;
- Session-independent;
- not execution identity;
- not authorization;
- not a TOCTOU token;
- not a Browser/public diagnostic field.

Fingerprint capture occurs at exact live pre-execute while bounded parsed arguments still exist.

Do not retain raw values solely for fingerprinting.

### 5.1 Argument safety

Fingerprint adapters must use fail-closed bounded reads:

- plain object / null-prototype object only;
- own data properties only;
- no getters/accessors;
- bounded key count;
- bounded string/number values;
- reject unknown keys for the controlled adapter;
- reject malformed/unsupported values rather than dropping them and creating a false match.

A fingerprint failure means `UNSUPPORTED`, not “use a weaker hash”.

## 6. Controlled fingerprint adapters

### 6.1 `read`

Closed recognized fields:

```text
file_path
offset?
limit?
```

Fingerprint tuple contains:

```text
v1
read
file_path exact lexical string
offset / absence
limit / absence
```

No path resolution/canonicalization in Phase 3.

### 6.2 `write`

Closed recognized fields:

```text
file_path
content
sandbox_permissions?
justification?
```

Fingerprint tuple contains:

```text
v1
write
file_path exact lexical string
content
```

The final fingerprint is the SHA-256 digest; raw content/path must not be retained in relation state or diagnostics.

Exclude retry-variant fields:

```text
sandbox_permissions
justification
```

Validate any supplied `sandbox_permissions` against the pinned closed target vocabulary before retaining it as a separate permission fact.

### 6.3 `bash` / `pwsh`

Pinned closed fields:

```text
command
description
timeoutMs?
workdir?
run_in_background?
sandbox_permissions?
justification?
```

Fingerprint tuple contains:

```text
v1
toolName (bash | pwsh)
command exact string
workdir exact string / absence
run_in_background boolean / absence
```

Exclude:

```text
description
timeoutMs
sandbox_permissions
justification
```

Rationale:

- description is presentation-only;
- timeout is a controlled retry parameter;
- sandbox permission/reason are escalation parameters.

Phase 3 does not parse or normalize shell command semantics. Command string equivalence is exact.

Therefore `pnpm install` and `pnpm install --force` are different initial fingerprints. Do not introduce shell parsing to make them equal.

### 6.4 Unknown tools

Unknown/malformed tools have no fingerprint and no inferred retry relation.

## 7. Ordering and retryOf

Relations are derived from retained facts; they do not mutate execution records.

For current execution `C`:

1. require supported fingerprint;
2. inspect only exact same Session history with lower capture ordinal;
3. locate the **nearest** earlier record with the same fingerprint;
4. require `C.createdAt - P.createdAt <= 5 minutes`;
5. require `P` to have already settled with a proven failed outcome before `C` was captured;
6. if those conditions hold, `C.retryOf = P.executionId`;
7. otherwise no retry edge.

Do not skip over a nearest matching execution:

- nearest matching SUCCESS → no retry;
- nearest matching PENDING/UNKNOWN/CONFLICTED/UNSUPPORTED → no retry and report degraded/insufficient relation evidence where appropriate;
- do not reach backward to an older failure.

Two overlapping/concurrent same-fingerprint calls are not retries merely because one later fails.

By construction `retryOf` always points to a lower ordinal in the same exact Session, so cycles are forbidden.

## 8. Proven failure for relation eligibility

A previous execution is relation-eligible as failed only from exact, unconflicted, structured live evidence.

Accepted categories include:

- Phase-2 exact ToolRuntime terminal failure;
- exact structured timeout/cancellation/tool/system code classification;
- exact unconflicted shell `processSuccess=false`;
- exact structured shell `SANDBOX_DENIED`;
- exact structured shell `SANDBOX_UNAVAILABLE`.

Do not classify relation eligibility from:

- error/reason text;
- stdout/stderr;
- command output;
- approval reason;
- arbitrary exception message;
- durable unbound approval fact;
- UNKNOWN/conflicted terminal or shell evidence.

Approval rejection/cancellation/unavailable may become relation failure evidence only when an existing exact binding proves it belongs to that Phase-1 execution. If not, leave it outside the execution's failure signature.

## 9. Failure signature and sameRootCause

Phase 3 uses a private bounded `FailureSignature`.

A known signature may contain only:

```text
failure kind
structured sanitized error code when present
```

and one fixed local marker:

```text
PROCESS_FAILURE
```

for exact unconflicted shell `processSuccess=false`.

Rules:

- specific Phase-2 kind with sufficient structured identity → known;
- generic `TOOL_ERROR` requires a structured error code to be treated as a known root-cause signature;
- generic TOOL_ERROR without code → root cause unknown;
- conflicts/degraded source → unknown.

For the current direct retry edge:

```text
sameRootCause = true
```

only when previous and current are both failed with equal known signatures.

```text
sameRootCause = false
```

only when both are failed with two known different signatures.

Otherwise:

```text
sameRootCause = 'unknown'
```

A pending or successful current retry does not have a root cause to compare, so it is `unknown`.

## 10. Permission escalation

Pinned ordered sandbox vocabulary:

```text
read-only
<
workspace-write
<
danger-full-access
```

Tool-facing escalation targets are only:

```text
workspace-write
danger-full-access
```

`permissionEscalation` is evaluated only for a proven direct `retryOf` relation.

Known prior level may come from:

1. prior explicit, validated requested sandbox permission; or
2. exact unconflicted prior shell sandbox result mode.

Known current target comes from the current execution's validated explicit `sandbox_permissions`.

Then:

- current target strictly wider than prior known level → `true`;
- both levels known and current is equal/narrower → `false`;
- either level unavailable/conflicted/unsupported → `'unknown'`.

Important:

- absence of prior `sandbox_permissions` is **not** equivalent to `read-only`;
- absence of current explicit permission is not proof that effective privilege did not change, therefore return `unknown` rather than a false certainty;
- never parse approval reason text to discover the target mode.

Phase 3 detects that a retry requested a wider sandbox capability. It does **not** conclude that the wider permission is necessary, proportional, authorized, or excessive. Those are later phases.

## 11. FailureChainSummary contract

Expose one read-only fact query owned by the runtime analyzer.

Recommended contract:

```ts
type RelationSummaryStatus =
  | 'READY'
  | 'UNSUPPORTED'
  | 'DEGRADED'
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'CAPACITY_EXCEEDED'

interface FailureChainEntry {
  readonly executionId: string
  readonly failureKind?: ExplicitFailureKind | 'PROCESS_FAILURE'
  readonly errorCode?: string
}

interface FailureChainSummary {
  readonly executionId: string
  readonly status: RelationSummaryStatus
  readonly retryOf?: string
  readonly retryCount: number
  readonly recentFailureCount: number
  readonly sameRootCause: boolean | 'unknown'
  readonly permissionEscalation: boolean | 'unknown'
  readonly truncated: boolean
  readonly reasonCodes: readonly string[]
  readonly recent: readonly FailureChainEntry[]
}
```

Semantics:

- chain order = oldest retained retry ancestor → current;
- max `recent.length = 8`;
- `retryCount` = number of proven retry edges in the retained chain;
- `recentFailureCount` = number of proven failed executions in that retained chain;
- if older relation history is unavailable due cap/TTL, set `truncated=true` and do not imply completeness;
- no risk/recommendation/authorization/necessity/privilege conclusion.

The DTO must be deeply frozen/detached.

Never expose:

- operationFingerprint;
- operationHash;
- raw arguments;
- path/content/command/workdir;
- requested permission string;
- justification/reason;
- stdout/stderr/tool output;
- Session/event/ToolExecution/token;
- raw exception text.

## 12. Derived-query behavior

Prefer deriving `retryOf`, chain and current relation facts from bounded retained relation records at query time rather than storing mutable semantic edges.

Benefits:

- a later conflicting duplicate result automatically invalidates prior certainty;
- no relation cycle can be introduced;
- no last-writer-wins relation state;
- relation semantics remain a pure projection over retained facts.

Implementation may cache safely only if observable semantics are identical and conflict invalidation is proven.

## 13. Integration point

Use the existing Phase-1 exact execution owner rather than adding duplicate listeners/identity.

Permitted internal change:

- extend the private `CorrelationHooks.retire` callback to receive the exact final `ToolExecutionResult`;
- create one `RetryEscalationAnalyzer` inside `apply(ctx)`;
- in the existing exact capture hook, after an ExecutionId exists, notify Foundation and Phase 3;
- in the existing exact result hook, notify Foundation and Phase 3, then let T02 retire its own active index as today;
- provide a frozen read-only Context diagnostic, e.g. `riskAdvisorFailureChain.get(executionId)`.

The analyzer may keep an exact `WeakMap<ToolExecution, ExecutionId>` for observation correlation, but it is never an ID mint owner.

Do not expose pure authority/projector helpers from the package root.

## 14. Reuse Phase-2 classifier semantics

Phase 3 may refactor `src/host/explicit-failure.ts` to add package-internal reusable classification helpers.

Requirements:

- no new package-root authority-bearing projector exports;
- no duplicate error code table in Phase 3;
- no behavioral regression to Phase-2 `riskAdvisorLedger.phase2(session)`;
- no reason/stderr heuristic.

## 15. Mandatory focused tests

At minimum:

1. read fingerprint stability and field sensitivity;
2. write fingerprint ignores permission/justification but changes with content or target;
3. bash/pwsh fingerprint ignores description/timeout/permission/justification;
4. bash/pwsh command/workdir/background differences do not match;
5. unsupported/extra/malformed/oversized/accessor inputs produce no fingerprint;
6. same exact Session, nearest prior proven failure, same fingerprint → retryOf;
7. nearest matching success blocks older failure;
8. nearest matching pending/unknown/conflicted fact does not bind older failure;
9. overlapping same-fingerprint executions are not retries;
10. same sessionId text across different Session objects never relates;
11. five-minute window boundary;
12. relation always points backward; no structural parent/root mutation;
13. retry chain ordering/count and max-8 truncation;
14. sameRootCause true/false/unknown matrix;
15. shell process failure is retry-eligible;
16. conflicting terminal/shell evidence suppresses relation certainty;
17. `read-only → workspace-write` and `workspace-write → danger-full-access` when exact structured evidence exists;
18. unknown prior mode or absent current explicit permission → permissionEscalation unknown;
19. equal/narrower known modes → false;
20. no approval reason/error/stderr heuristic;
21. max-128 Session history and max-512 global capacity behavior;
22. absolute TTL does not refresh on query;
23. dispose/HMR old generation inert;
24. runtime loss/durable replay does not fabricate retry relation;
25. DTO frozen/privacy/no fingerprint/raw data leakage;
26. genuine pinned Context + SessionStore + ToolRuntime + ApprovalService integration with harmless local tools, proving exact ExecutionId reuse and Native Approval noninterference;
27. inherited Phase-2 focused/R4/Phase-1 suites and final full regression remain green.

Tests may be parameterized; do not inflate count for its own sake.

## 16. Explicit out of scope

Do NOT implement:

- shell segmentation/parsing/equivalence;
- `pnpm install` ↔ `pnpm install --force` semantic matching;
- path canonicalization/filesystem probing;
- destructive/system/path/workspace/secret/install/network rules;
- “privilege excessive” or minimum-privilege evaluation;
- Rule Engine;
- RiskAssessment/recommendation;
- ContextBuilder/Redactor/Judge/Provider;
- Browser failure-context UI;
- ExpectedEffect/semantic verification;
- Evidence Collector/Deep Judge;
- cross-session relations;
- durable guessed relation recovery;
- persistent relation DB/audit;
- Harness Core change.

## 17. STOP conditions

Stop with `PHASE3_ARCHITECTURE_DECISION_REQUIRED` if implementation would require:

- a second ExecutionId owner;
- matching by callId/time/tool instead of exact live identity;
- shell semantic parsing to meet the controlled fingerprint contract;
- raw args/output/path/command retention in the public summary;
- approval reason/error text heuristics;
- treating missing permission as read-only;
- changing Native Approval;
- modifying Harness Core;
- entering Phase 4+;
- rebuilding retry edges from durable history without an exact witness;
- weakening Phase-2 conflict/privacy/public-authority boundaries.

## 18. Acceptance

Codex may report implementation handoff only. It must not self-declare Phase 3 accepted.

ChatGPT Web independently reviews:

- exact remote diff;
- fingerprint safety;
- retry false-positive prevention;
- permission evidence;
- FailureChainSummary bounds/privacy;
- F-006/F-013 preservation;
- fresh final complete regression;
- report-only publication relation.

Allowed implementation handoff tokens include:

- `PHASE3_PUBLISHED_READY_FOR_REVIEW`
- `PHASE3_ARCHITECTURE_DECISION_REQUIRED`
- `PHASE3_BLOCKED`
- precise PARTIAL status only when a frozen optional capability remains unsupported without compromising the core contract.
