# Risk Advisor — Phase 7: Known Postcondition Verification | Preflight

**Verdict:** `PHASE7_PREFLIGHT_READY`  
**Date:** 2026-10-02  
**Repository:** `Dhandil/dsh-risk-advisor`  
**Accepted Phase-6 remote baseline:** `3608b1ac8c3af41ba59722715ed091d8aa408daf`  
**Accepted Phase-6 executable SHA:** `9583e9318f56083dcce52bb171a0cb4488862faf`  
**Accepted complete regression:** 200 tests PASS  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, strictly read-only.

## 1. Formal Phase-7 scope

The frozen roadmap defines Phase 7 as:

```text
Known Postcondition Verification
├── file write/edit
├── mkdir/copy
├── git
└── pnpm/npm

controlled read-only verification only
```

Phase 7 exists to separate:

```text
processSuccess
from
semanticSuccess
```

It does not implement generic behavior-chain reasoning, arbitrary investigation, Phase-8 Evidence Collector, or Deep Judge.

## 2. Authoritative semantic boundary

The Product Spec and Architecture freeze these rules:

```text
exit 0
≠
semantic success
```

Deterministic semantic verification is allowed only when:

```text
reliable Expected Effect
+
read-only observable postcondition
+
bounded verifier
```

Expected Effect authority order:

```text
1. Tool Contract
2. Known Operation Adapter
3. Agent Claim              # check target only; not proof
4. LLM Inference            # soft only; never hard semantic failure
```

Unknown or unsafe verification must return:

```text
semanticSuccess = unknown
```

Verification must be:

- read-only;
- bounded;
- no privilege expansion;
- no automatic network;
- predefined TypeScript / registered adapter only;
- never LLM-generated checker code + exec/eval.

## 3. Current execution/outcome starting point

Current Phase-2 projection intentionally freezes:

```ts
interface Phase2ExecutionOutcome {
  terminalStatus: 'SUCCESS' | 'FAILURE' | 'UNKNOWN'
  processSuccess?: true | false | 'unknown'
  semanticSuccess: 'unknown'
  failures: ExplicitFailureFact[]
}
```

Phase 7 is therefore the first phase allowed to widen `semanticSuccess` to:

```text
true | false | unknown
```

and introduce a deterministic semantic-failure projection.

Do not make process failure disappear when semantic verification exists. Tool/guardrail/timeout/system outcomes retain their existing authority.

## 4. `tools/result` is the primary live verification trigger

Pinned Harness proves that `tools/result` receives:

```ts
exec: Readonly<ToolExecution>
result: Readonly<ToolExecutionResult>
```

and successful live results retain:

```ts
result.value: JsonValue
```

That canonical value is deliberately omitted from durable `tool/result` session events.

Consequences:

- Phase 7 may inspect structured canonical result values at the live seam;
- raw model-facing text does not need to be parsed for supported adapters;
- verification must immediately reduce any sensitive/raw value to a bounded VerificationRecord;
- raw `value`, file content, stdout/stderr and arguments must not be retained by the verification store;
- live-value verification cannot be reconstructed from ordinary durable `tool/result` alone.

`tools/result` observer failures are contained by Harness and cannot veto the tool result.

## 5. Direct `write` Tool Contract is a strong Phase-7 adapter

Pinned `dsh-tool-fs` declares successful `write` canonical output:

```ts
{
  path: string
  operation: 'create' | 'update'
  before: string | null
  after: string
}
```

The tool returns this value only after `ctx.fs.writeText(...)` completes.

Therefore Phase 7 can verify direct `write` without any new filesystem read:

```text
captured expected content / target
+
successful canonical write result
→
Tool Contract Verification
```

At `tools/result`, compare the expected effect while raw values are still ephemeral, then retain only bounded facts such as:

```text
adapter=fs.write.v1
targetIdentity=bounded/hash-or-opaque-local-id
result=MATCHED|MISMATCHED|UNKNOWN
semanticSuccess
reasonCodes
```

Do not persist `content`, `before` or `after`.

Because the tool contract itself owns atomic completion, a matched successful direct write does not require an extra stat/read probe.

## 6. Direct `edit` Tool Contract is also feasible without post-read

Pinned `dsh-tool-fs` successful `edit` canonical value is:

```ts
{
  path: string
  before: string
  after: string
}
```

`ctx.fs.editText(...)` atomically applies the literal replacement before returning.

Phase 7 may verify a captured direct-edit Expected Effect against that canonical value in-memory.

Requirements to freeze next:

- exact allowed argument schema;
- own-data-property/no-accessor reads;
- `old_string` / `new_string` / `replace_all` semantics;
- no full before/after retention;
- bounded comparison work;
- fail closed if result shape or captured expected effect is not exact.

No extra disk read is required for a Tool-Contract-backed direct edit.

## 7. Why generic `ctx.fs` post-read is not automatically safe

Pinned Harness exposes provider-neutral `ctx.fs` with:

```text
resolve
stat
lstat
readText
listDir
contains
...
```

However the pinned `dsh-fs-sandbox` contract explicitly confines **mutations** while reads/listings/metadata remain unconfined.

Therefore:

```text
read-only
does not automatically imply
no privilege expansion
```

A Risk Advisor verifier that blindly calls `ctx.fs.stat/readText` could observe a path that the original execution's effective sandbox boundary did not authorize as an equivalent observation.

Phase 7 must not use generic Host `node:fs` or generic `ctx.fs` reads merely because they are read-only.

If observation authority cannot be shown to be compatible with the original execution boundary, the adapter result is `UNKNOWN`.

Phase 8 owns general canonical-path/stat/list/config evidence. Phase 7 must not silently implement Phase 8 under another name.

## 8. `mkdir` / `copy` are conditional, not automatically safe

The roadmap names mkdir/copy, but the current Risk Advisor closed tool adapters do not expose first-class `mkdir` or `copy` tools. They can appear inside shell commands.

That means verification would require both:

```text
high-confidence shell operation recognition
+
bounded read-only observed-effect check
```

Preflight conclusion:

- do not claim mkdir/copy support from command prefix alone;
- only a simple, single, high-confidence recognized command may receive a Known Adapter;
- shell chaining, wrappers, substitution, env injection, encoded/dynamic execution or parser degradation → `unknown`;
- if no non-expanding observation seam is proven for the target, semanticSuccess remains `unknown` even for a recognized mkdir/copy.

Architecture Freeze must decide the exact initially-supported mkdir/copy forms. An empty/very small subset is valid if that is the only sound option.

## 9. Reuse the accepted Phase-4 shell parser

Current RuleEngine already contains the accepted bounded splitter/tokenizer and ambiguity detection used for:

- shell chaining;
- dynamic execution;
- encoded execution;
- environment injection;
- install / git / destructive forms.

Phase 7 must not create a second generic shell parser whose interpretation can drift from Phase 4.

Recommended implementation direction:

```text
package-private shared bounded shell parse module
        ├── Phase 4 RuleEngine
        └── Phase 7 ExpectedEffectRegistry
```

Refactoring is allowed only if a focused regression proves Phase-4 RuleEvaluation outputs remain byte/structure-equivalent for the accepted corpus.

Phase-7 adapter eligibility should require the parser's highest-confidence simple single-command form.

## 10. Git adapter feasibility

Git semantic verification is possible in principle through predefined read-only commands, but it is not yet automatically safe for arbitrary Git operations.

Problems to freeze:

- expected effect differs for checkout/switch/restore/reset/status-related operations;
- shell quoting must not interpolate arbitrary untrusted fragments unsafely;
- some Git configurations/features can launch helpers (for example fsmonitor or external integrations);
- verifier subprocess must not inherit an unsafe ambient environment;
- verifier must not contact a remote.

Initial Phase-7 Git support must therefore use a closed command/expected-effect vocabulary and hard-coded read-only verifier recipes.

Examples that may be freeze candidates after exact-source review:

```text
simple local branch/commit state
simple working-tree state predicate
```

but no generic `git <anything>` adapter.

If safe verifier construction cannot be proven for a recognized command, return UNKNOWN.

## 11. pnpm/npm install adapter feasibility

Package-install verification is explicitly in V1 scope, but shell exit 0 is insufficient.

A sound adapter needs a bounded expected effect such as:

```text
package X should be resolvable/present in target project/profile
```

and a predefined read-only check.

Constraints:

- no registry/network access;
- no lifecycle scripts;
- no package execution;
- no arbitrary Node startup hooks/loaders from ambient environment;
- no use of package-manager commands that can mutate installation state;
- same/narrower sandbox policy than the original execution;
- bounded timeout/stdout;
- exact package name/profile parsing.

Architecture Freeze must choose a concrete verifier recipe or deliberately return UNKNOWN for package forms that cannot satisfy all constraints.

Do not infer semantic success merely because lockfile/package.json changed or `pnpm/npm` exited 0.

## 12. Shell verifier must inherit an explicit policy

Pinned `ctx.shell` supports predefined in-process callers and accepts an explicit:

```ts
sandboxPolicy?: SandboxExecutionPolicy
```

Pinned `ctx.sandboxPolicy.resolve({ session, mode })` can reconstruct a complete policy with the session workspace root.

If Phase 7 uses `ctx.shell` for a read-only checker:

- never rely on the agentless executor default;
- resolve policy from the exact execution's owning Session;
- the verifier mode must be the same or narrower than the original proven execution mode;
- never upgrade to `danger-full-access` just to verify;
- no approval request is allowed for a verifier;
- no user-supplied command string may be executed as verifier code;
- use a frozen command template / safe literal encoding only.

If the original effective mode is unavailable/unknown, shell verification that depends on a policy must return UNKNOWN.

## 13. ExpectedEffectRegistry should capture before result settlement

Phase 7 needs the operation's exact expected effect before Phase-1 Foundation retires ephemeral raw arguments.

Recommended lifecycle:

```text
tools/pre-execute
  → ExecutionId
  → ExpectedEffectRegistry.capture(exec, executionId)

tools/result
  → authoritative process result
  → PostconditionVerifier.observeResult(exec, result)
  → bounded VerificationRecord
  → Foundation / relation retirement proceeds
```

Expected Effect capture must use the same hostile-input discipline as Phase 4/5:

- exact supported tool name;
- plain/null-prototype objects;
- own data properties only;
- no getter/accessor invocation;
- bounded strings/arrays;
- no arbitrary recursion;
- no unknown-tool raw traversal.

## 14. Suggested ExpectedEffectV1

Architecture Freeze should define a closed union rather than free-form text.

Preflight candidate:

```ts
type ExpectedEffectV1 =
  | { source:'tool-contract'; adapterId:'fs.write.v1'; target:string; contentDigest:string }
  | { source:'tool-contract'; adapterId:'fs.edit.v1'; target:string; editDigest:string }
  | { source:'known-adapter'; adapterId:'shell.mkdir.v1'; ... }
  | { source:'known-adapter'; adapterId:'shell.copy.v1'; ... }
  | { source:'known-adapter'; adapterId:'git.<closed-id>'; ... }
  | { source:'known-adapter'; adapterId:'package-install.<closed-id>'; ... }
```

Do not retain full write/edit content in the registry if a digest/bounded structural fact is sufficient.

Cryptographic digests are local correlation aids only, not Browser evidence and not proof of canonical target identity.

## 15. Suggested VerificationRecordV1

Preflight candidate:

```ts
interface VerificationRecordV1 {
  schemaVersion: 1
  executionId: string
  adapterId: string
  status: 'MATCHED' | 'MISMATCHED' | 'UNKNOWN' | 'UNAVAILABLE'
  semanticSuccess: true | false | 'unknown'
  evidenceQuality: 'high' | 'medium' | 'low'
  reasonCodes: readonly VerificationReasonCode[]
  observedAt: number
  durationMs: number
}
```

Never store:

- raw Tool Arguments;
- write/edit content;
- before/after file content;
- stdout/stderr;
- package manifest body;
- Git diff/content;
- secrets;
- full verifier command output.

## 16. Hard semantic failure rule

Phase 7 may produce deterministic semantic failure only when all are true:

```text
processSuccess === true
AND ExpectedEffect authority is tool-contract or known-adapter
AND adapter completed coherently
AND observed postcondition deterministically mismatched
```

Then:

```text
semanticSuccess = false
failureType = semantic
rootCauseCategory = postcondition
```

Otherwise:

- process failure keeps its existing tool/guardrail/timeout/system meaning;
- verifier unavailable/timeout/unsafe/unsupported → semanticSuccess=unknown;
- verifier may never convert an existing process failure into semantic success;
- semantic mismatch does not rewrite the original ToolResult.

## 17. Phase-2 outcome integration

Do not fork a second competing execution-outcome model.

Recommended evolution:

```text
Phase2ExecutionOutcome
        +
VerificationRecord
        ↓
Phase7 ExecutionOutcome projection
```

or widen the existing internal projection while preserving every previous Phase-2 observable for records without verification.

Add `SEMANTIC_FAILURE` only as a deterministic new failure kind/category if the frozen contract requires it.

Prior Phase-2 tests must still prove:

- explicit tool failure remains explicit tool failure;
- timeout remains timeout;
- sandbox/guardrail classifications unchanged;
- semanticSuccess remains unknown when no reliable verification exists.

## 18. Retry / FailureChain integration

Phase 7 semantic failures must become useful evidence for **later** approvals.

Current `FailureChainSummary` has no semantic-failure field and current relation outcome is settled directly from `tools/result`.

Architecture Freeze must define how a post-result VerificationRecord enriches the relation without creating inconsistent double settlement.

Recommended direction:

- relation result remains one coherent outcome;
- a later VerificationRecord may refine an already process-successful relation into deterministic semantic failure;
- refinement must be one-way/idempotent and fenced by ExecutionId;
- duplicate/replayed identical verification is idempotent;
- conflicting verification degrades to UNKNOWN rather than last-writer-wins;
- `recentFailureCount`, retry relation and same-root-cause may then include the semantic failure for subsequent executions.

Do not modify an already-resolved Native approval or retroactively create an approval A3.

## 19. Phase 7 is post-execution history, not a retroactive approval stage

Known Postcondition verification occurs after tool execution settles.

The approval that allowed that execution is already resolved.

Therefore Phase 7 must not:

- reopen Native Approval;
- mutate the closed Phase-6 card into a new decision request;
- publish A3 to a closed approval;
- change the user's prior decision.

Its primary consumers are:

```text
ExecutionOutcome
Execution Ledger / Verification history
FailureChainSummary
future approval Context
future RiskAssessment
```

## 20. Durable Verification event is source-aligned and feasible

Pinned Harness supports package-owned log-only Session events through declaration merging of `SessionEventMap`; many existing packages use this pattern.

Preflight recommendation: Phase 7 should define a bounded plugin-owned event such as:

```text
risk-advisor/verification
```

carrying only a sanitized VerificationRecord identity/result, not raw evidence.

Benefits:

- Verification becomes a real typed ExecutionEvent source as required by architecture;
- future Risk Advisor restart/replay can recover known semantic outcomes;
- live value is reduced before durability;
- no raw canonical `result.value` is persisted.

Architecture Freeze must define:

- exact event name/version;
- append ownership;
- payload bounds;
- replay/idempotency key;
- conflict rule;
- whether event is appended only for MATCHED/MISMATCHED or also UNKNOWN;
- model-history non-surface proof.

Do not invent a second persistence database for Phase 7.

## 21. Async verifier scheduling

Direct write/edit Tool-Contract verification can be synchronous/local at `tools/result`.

Shell/git/package verifiers, if enabled, are asynchronous.

Pinned `tools/result` emit does not await observers, so async verification must be an owned side path:

- finite concurrency;
- finite pending queue;
- per-verification AbortController;
- hard timeout;
- generation fencing;
- Session/plugin disposal abort + drain;
- late completion after disposal ignored;
- no impact on original ToolResult latency/outcome.

Do not run an unbounded detached promise per tool result.

Numerical budgets must be frozen before implementation; do not copy Phase-5 Judge budgets by analogy.

## 22. Verification resource budget

Architecture only says read-only + bounded; Phase 7 needs its own small budget.

Freeze should set explicit maxima for:

- verification wall-clock timeout;
- max concurrent verifiers;
- pending queue;
- stdout bytes;
- number of metadata/read probes;
- text bytes if any adapter truly requires content;
- max VerificationRecord count/TTL.

Phase 7 must stay materially smaller than Phase-8 Evidence Collector budgets and must not become a general evidence-gathering engine.

## 23. No automatic network

No verifier may:

- fetch package registry metadata;
- run `npm view`, `pnpm info`, `git fetch`, `git ls-remote`, remote status APIs, or web requests;
- contact arbitrary remotes;
- use a package manager mode that may transparently download missing state.

Local cache presence is not permission to reach the network.

Any verifier that cannot prove offline/local behavior must be disabled and return UNKNOWN.

## 24. No dynamic checker code

Explicitly prohibited:

```text
LLM/user/agent supplies checker source
→ Risk Advisor executes it
```

Also prohibited:

- `node -e <generated>`;
- `python -c <generated>`;
- `bash -c <agent checker>`;
- PowerShell expression/eval generated from operation output;
- dynamic module loading from the target repository.

Every verifier implementation is predefined product code with closed inputs.

## 25. Phase-8 boundary

Phase 8 owns general Evidence Collector capabilities:

```text
stat
list
canonical path
small config read
git state
checkpoint evidence
```

Phase 7 may use only the minimum observations frozen as part of a specific Known Postcondition Adapter.

It must not:

- expose general evidence tools;
- populate canonical workspace facts for Risk Engine;
- promote `workspaceContained`, `sandboxCovered`, or `reversible` based on Phase-7 probes;
- collect arbitrary files/configs to help Judge;
- add checkpoint/reversibility evidence.

## 26. Phase-5/6 interaction

Phase 7 does not alter the Phase-5 Fast Judge request for the already-finished operation.

For future approvals, bounded semantic failure may enter FailureChainSummary and therefore future Phase-5 context.

Browser Phase-6 current approval views remain approval-time advisory views; Phase 7 does not require a new Browser mutation channel.

Any later UI for historical semantic verification is outside the Phase-7 core scope unless separately frozen.

## 27. Adapter readiness matrix from current source

| Adapter family | Preflight status | Basis |
| --- | --- | --- |
| direct `write` | READY TO FREEZE | structured canonical Tool Contract value; no post-read required |
| direct `edit` | READY TO FREEZE | atomic edit canonical Tool Contract value; no post-read required |
| shell `mkdir` | CONDITIONAL | needs high-confidence parser + non-expanding observation seam |
| shell `copy` | CONDITIONAL | needs high-confidence parser + non-expanding observation seam |
| Git local state | CONDITIONAL | needs closed command vocabulary + hardened no-network/no-helper verifier |
| pnpm/npm install | CONDITIONAL | needs exact package target + predefined offline/non-executing verifier |
| unknown tool/complex shell | UNSUPPORTED → UNKNOWN | no reliable known postcondition |

The roadmap does not require fabricating support for every textual form. `unknown` is the correct result outside the frozen safe subset.

## 28. Mandatory Phase-7 focused proof areas

Architecture Freeze should require at minimum:

### Expected Effect capture

- write exact shape;
- edit exact shape;
- hostile accessor/getter rejected;
- unknown tool no raw traversal;
- complex/ambiguous shell not eligible;
- no raw content retained after capture.

### Tool Contract verification

- write matched;
- write mismatched malformed canonical value → UNKNOWN/UNAVAILABLE, not guessed;
- edit matched;
- edit mismatch;
- result.isError never becomes semantic success;
- no durable before/after content.

### Semantic outcome

- exit/process success + matched → semanticSuccess=true;
- exit/process success + deterministic mismatch → semanticSuccess=false + semantic failure;
- process failure + verifier result does not hide process failure;
- no adapter → unknown;
- verifier unavailable/timeout → unknown.

### Async/scheduler

- finite concurrency/queue;
- timeout/abort;
- dispose drains;
- late completion fenced;
- no original ToolResult delay/rewriting.

### Durable verification

- sanitized log-only event;
- replay reconstructs exact bounded result;
- duplicate identical event idempotent;
- conflict → degraded/unknown;
- deriveMessages/model history unchanged;
- no raw value/args/stdout/secret persisted.

### FailureChain

- semantic failure can inform a later retry;
- no A3/current approval resurrection;
- duplicate verification cannot double-increment failure count;
- prior Phase-3 retry/escalation semantics unchanged.

### Security

- no network;
- no privilege widening;
- no dynamic checker;
- no arbitrary shell fragments;
- no ambient startup hook that can execute repository code;
- Phase-8 facts remain untouched.

## 29. Validation / governance

Phase-7 implementation should follow the established order:

```text
Implementation
→ P7 focused
→ P6 regression
→ P5 regression
→ P4 regression
→ P3 regression
→ P2 regression
→ P1/R1-R5 affected regressions
→ typecheck/build
→ Host/Client exports as affected
→ declaration/pack/diff/privacy
→ durable-event/replay/security proof
→ executable commit
→ exactly one fresh complete pnpm test on exact SHA
→ report-only publication
```

After Full, no executable/test/config/package semantic drift.

## 30. STOP conditions

Stop with `PHASE7_ARCHITECTURE_DECISION_REQUIRED` if implementation would require:

- generic Host filesystem reads with broader observation authority than the original operation;
- Phase-8 general evidence collection;
- network access;
- arbitrary shell/user-generated checker execution;
- modifying Harness Core;
- rewriting original ToolResult;
- blocking ToolResult on asynchronous verification;
- reopening Native Approval / publishing A3;
- changing Phase-5 six-dimension/P0–P9 semantics;
- accepting parser-ambiguous shell commands as deterministic known adapters.

Unknown is always preferred over an unverifiable semantic claim.

## 31. Inherited evidence boundaries

Preserve unchanged unless Phase 7 directly and honestly closes one:

- F-006 PARTIAL;
- F-013 PARTIAL;
- general guard-returned denial PARTIAL/UNKNOWN where complete witness is absent;
- true cold disk/process restart NOT_RUN;
- real native PTC producer NOT_RUN;
- LIVE_BROWSER_NOT_RUN;
- APPROVAL_PLUGIN_COEXISTENCE_NOT_RUN;
- WebWorker NOT_VALIDATED;
- newer Harness/V4 NOT_VALIDATED;
- Phase-8 Evidence Collector NOT_IMPLEMENTED;
- Phase-9 Deep Judge NOT_IMPLEMENTED;
- real-provider Judge latency policy UNDETERMINED.

Phase-7 durable verification replay may improve semantic-outcome recovery, but it does not by itself close the broader cold-start/correlation limitations.

## 32. Preflight verdict

`PHASE7_PREFLIGHT_READY`

Current source proves enough public seams to begin Phase-7 architecture freeze:

- authoritative live `tools/result` with canonical structured `value`;
- exact ExecutionId / ToolExecution correlation already established;
- strong direct write/edit Tool Contracts;
- public provider-neutral `ctx.fs` and `ctx.shell` seams;
- explicit `ctx.sandboxPolicy` policy reconstruction;
- typed plugin-owned log-only Session event pattern;
- existing Execution Ledger / FailureChain integration points.

The Architecture Freeze must still settle before implementation:

1. exact ExpectedEffectV1 union;
2. exact VerificationRecord/event contract;
3. whether/which mkdir/copy forms are initially supported;
4. exact Git adapter subset and verifier recipes;
5. exact pnpm/npm adapter subset and offline verifier recipe;
6. verifier authority rule (same/narrower execution policy);
7. shared Phase-4 shell parser refactor boundary;
8. synchronous write/edit verification details;
9. async scheduler numeric budgets;
10. Verification → ExecutionOutcome → FailureChain refinement semantics;
11. durable replay/idempotency/conflict rules;
12. exact Phase-8 non-overlap.

This Preflight is documentation-only. It performs no filesystem verification, shell verifier execution, package/network call, provider call, Harness mutation, Phase-8 evidence collection or Phase-9 work.