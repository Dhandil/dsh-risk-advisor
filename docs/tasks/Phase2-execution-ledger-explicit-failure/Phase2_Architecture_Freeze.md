# Risk Advisor — Product Phase 2: Execution Ledger + Explicit Failure | Architecture Freeze

**Status:** FROZEN FOR CODEX IMPLEMENTATION; final acceptance belongs to ChatGPT Web.  
**Date:** 2026-09-30  
**Task directory:** `docs/tasks/Phase2-execution-ledger-explicit-failure/`  
**Architecture checkpoint:** `01bd33ec64b6eac70562d805d45469393efc691e` (Phase 2 preflight publication).  
**Accepted product baseline before Phase 2 docs:** `4ad6269b69d0ed33ae9be675513ad10b1ae3ee3a`.  
**Last accepted executable SHA:** `9c7a4e54effe3455171aabb724724dd0e7eeb9b4`.  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, STRICTLY READ-ONLY.

## 1. Objective

Implement the frozen V1 roadmap's **Phase 2 — Execution Ledger + Explicit Failure** as a product Host capability.

Phase 2 has two responsibilities:

1. promote the already validated T03/T04 live/committed-source Ledger foundation into the product architecture without duplicating it; and
2. add a typed, evidence-backed **Explicit Failure projection** that reports only failures the pinned Harness evidence can actually prove.

Phase 2 is still advisory/observational. It does not authorize, deny, retry, escalate, score risk, call a model, verify semantic postconditions, or replace Native Approval.

## 2. Mandatory reuse: one Ledger, one live identity owner

The existing `src/host/ledger.ts` and `src/host/ptc-replay.ts` are the Phase-2 foundation. They were built for T03/T04 fault/recovery validation and must be evolved in place rather than replaced.

Frozen ownership:

- `ActiveExecutionIndex` / Phase 1 remains the **sole live ExecutionId mint owner**.
- T04 Ledger live ordinals and durable occurrence references are **evidence identities**, not alternate `ExecutionId`s.
- Replay never revives Phase-1 active identity and never mints a historical Phase-1 `ExecutionId`.
- Do not create a second Session replay store, second PTC projector, second approval authority, second active call index, or full Event-Sourcing database.

The architecture-level `ExecutionEvent` vocabulary is a semantic normalization contract. It does **not** require rewriting validated T04 source folding into a second event log.

## 3. Source-of-truth hierarchy

Within one live generation:

1. exact live `tools/result(exec,result)` is authoritative for that exact live ToolExecution terminal outcome;
2. exact live pipeline observations (`pre-execute`, `execute`, `post-execute`) are runtime trace facts;
3. committed `session/event` / trusted `session.snapshotEvents()` are committed Session source and replay facts;
4. PTC child source is `tool/ptc-dispatch-start` + `tool/ptc-dispatch`;
5. Phase-1 exact active identity and Phase-1B exact approval association are reused only through their existing owners.

A committed Session observation is not a claim that disk flush has completed. True disk/process restart remains outside Phase 2 acceptance unless separately executed and evidenced.

## 4. Live↔durable reconciliation boundary

The T04 safety decision is preserved:

- equal Session id text is not exact Session identity;
- equal `callId`, `rootCallId`, tool name, arguments, timestamp, turn/step proximity or apparent uniqueness is not a cross-plane invocation witness;
- current pinned public Harness seams do not prove positive exact live↔durable same-invocation identity;
- therefore F-006/F-013 remain PARTIAL unless implementation discovers and proves a public exact witness without Harness modification.

Do not force-merge Live and Durable facts to satisfy a test count. Unproven correlation must remain separate/ambiguous/degraded.

## 5. Phase-2 internal contract

Phase 2 may refine names, but the semantics below are frozen.

### 5.1 Terminal fact

```ts
type TerminalStatus = 'SUCCESS' | 'FAILURE' | 'UNKNOWN'

interface ExecutionTerminalFact {
  status: TerminalStatus
  provenance: LedgerProvenance
  error?: { name: string; code: string }
  evidence: readonly LedgerEvidenceRef[]
}
```

`ToolExecutionResult.isError` determines the exact ToolRuntime terminal status for a proven live result. Conflicting terminal claims never select a winner; they degrade the projection and withhold false certainty.

### 5.2 Explicit failure fact

```ts
type ExplicitFailureKind =
  | 'TOOL_ERROR'
  | 'PRE_EXECUTE_DENIED'
  | 'CANCELLED_BEFORE_DISPATCH'
  | 'CANCELLED_AFTER_DISPATCH'
  | 'GUARDRAIL_DENIED'
  | 'TIMEOUT'
  | 'SANDBOX_DENIED'
  | 'SANDBOX_UNAVAILABLE'
  | 'APPROVAL_REJECTED'
  | 'APPROVAL_CANCELLED'
  | 'APPROVAL_UNAVAILABLE'
  | 'SYSTEM_ERROR'
  | 'UNKNOWN'

type EvidenceStrength = 'AUTHORITATIVE' | 'DETERMINISTIC' | 'UNKNOWN'

interface ExplicitFailureFact {
  kind: ExplicitFailureKind
  strength: EvidenceStrength
  provenance: LedgerProvenance
  evidence: readonly LedgerEvidenceRef[]
  error?: { name: string; code: string }
}
```

These are failure **facts/classifications**, not RiskAssessment findings and not retry/root-cause chains.

### 5.3 Outcome projection

```ts
interface Phase2ExecutionOutcome {
  terminalStatus: TerminalStatus
  processSuccess?: true | false | 'unknown'
  semanticSuccess: 'unknown'
  failures: readonly ExplicitFailureFact[]
}
```

`semanticSuccess` is frozen to `unknown` in Phase 2. Phase 7 owns semantic verification.

`processSuccess` must not be fabricated from generic ToolRuntime success. For process-like tools, a verified adapter may derive it from structured process fields such as foreground `exitCode`; for non-process tools it may remain absent/unknown. A ToolRuntime error is a terminal failure fact even when no process semantics exist.

## 6. Exact classification rules

### 6.1 Generic ToolRuntime error

An exact final `tools/result` with `isError=true` proves the tool call terminated as failure. If no stronger structured classifier below applies, emit `TOOL_ERROR` with authoritative terminal evidence and leave deeper root cause unknown.

Do not parse model-facing content to invent a more specific kind.

### 6.2 Timeout

Exact structured `error.info.code === 'TOOL_TIMEOUT'` from the pinned timeout policy is `TIMEOUT / AUTHORITATIVE`.

Do not classify arbitrary provider timeout text or another wrapper's cancellation as TOOL_TIMEOUT.

### 6.3 Cancellation

- `ABORTED_BEFORE_DISPATCH` → `CANCELLED_BEFORE_DISPATCH / AUTHORITATIVE`.
- `ABORTED` → `CANCELLED_AFTER_DISPATCH / AUTHORITATIVE`.

These codes describe body-invocation stage and are not approval outcomes.

### 6.4 Pre-execute denial

`PRE_EXECUTE_DENIED` requires a directly observed pre-execute decision that is known to be the effective denial for that call. Preserve only bounded structured `info.name/code`; do not retain/export `reason`.

A Risk Advisor listener's local `next()` result must **not** be called the global final decision merely because it returned a value. Waterfall listener ordering matters.

### 6.5 Guard returned denial

`GUARDRAIL_DENIED` is permitted only with a complete deterministic control trace proving that no pre-execute denial/cancellation/approval failure caused the same post-result.

The architecture target trace is:

```text
effective pre-policy allowed
approval did not reject/cancel/unavailable
caller not cancelled
tools/execute absent
tools/post-execute observed
tools/result = failure
```

However, the pinned public Cordis/Harness API does not currently expose a dedicated 'final resolved pre decision after every waterfall wrapper' event. `ctx.on(..., { prepend: true })` controls listener order at registration time but does not by itself prove no later prepend listener can wrap it.

Therefore the initial Phase-2 implementation MUST be conservative:

- if an exact public final-decision witness is proven in source + runtime without private/internal hooks, use the deterministic classifier;
- otherwise leave general guard-returned denial classification `UNKNOWN/PARTIAL`; do not use reason text, absence of `tools/execute` alone, or registration-order assumptions as proof.

Guard **throw** remains separate: ToolRuntime normalizes the thrown path as a final result that may bypass post-execute. It must never be relabeled as returned guard denial.

### 6.6 Sandbox denial

Sandbox denial is first-class and independent of generic ToolRuntime `isError`.

For pinned `bash` / `pwsh` foreground tools, their canonical successful `result.value` contains a structured `sandbox` object including `denied`. A verified adapter may extract only:

```ts
{
  mode?: string
  denied: boolean
  enforcement?: string
  runnerFailed?: boolean
}
```

Do not retain stdout, stderr, spill paths, command, workdir or other value fields.

`sandbox.denied === true` → `SANDBOX_DENIED / AUTHORITATIVE` for that structured adapter, even if the ToolRuntime call itself is successful.

`SANDBOX_UNAVAILABLE` is different: confinement could not be established / the sandbox runner failed. Classify it `SANDBOX_UNAVAILABLE / AUTHORITATIVE`; do not call it a denial by a functioning sandbox.

Never infer sandbox denial from arbitrary stderr text, generic EACCES/EPERM/EROFS, or cross-backend signature unions inside Risk Advisor.

### 6.7 Process success for shell-like tools

For a verified foreground shell adapter:

- numeric `exitCode === 0` → `processSuccess=true`;
- numeric nonzero `exitCode` → `processSuccess=false`;
- null/missing/ambiguous/conflicted exit evidence → `processSuccess='unknown'`.

Nonzero shell exit is not automatically a ToolRuntime `isError`; keep process fact and tool terminal fact separate.

Sandbox denial may coexist with any exit-code state; do not silently derive semantic success/failure from it.

### 6.8 Approval outcomes

Committed exact approval outcomes retain Harness vocabulary:

- `rejected` → `APPROVAL_REJECTED`;
- `cancelled` → `APPROVAL_CANCELLED`;
- `unavailable` → `APPROVAL_UNAVAILABLE`;
- `allowed-once` is not a failure.

These are observed Native Approval facts. Risk Advisor never returns or overrides an ApprovalOutcome.

Unbound/ambiguous/orphan approval evidence remains unbound/degraded; never invent an execution association to classify it as the execution's cause.

### 6.9 System/error fallback

`SYSTEM_ERROR` may be used only for an exact structured code whose pinned producer is demonstrably runtime/system-owned. Unknown thrown or textual errors stay `TOOL_ERROR`/`UNKNOWN` rather than being upgraded by name guessing.

## 7. Provenance and conflict semantics

- identical repeated exact source identity: idempotent;
- same exact source key with different payload: preserve first bounded evidence + `SOURCE_CONFLICT`, degrade;
- multiple terminal claims for one proven occurrence: retain all sanitized claims + `TERMINAL_CONFLICT`, no winner;
- exact Live terminal + exact Durable confirmation: one terminal fact with confirmation, only if exact cross-plane identity exists;
- no exact witness: keep separate Live and Durable facts;
- replay may rebuild committed historical facts but may not recreate live tokens/ExecutionIds/pending authority;
- after dispose/HMR old-generation callbacks are inert.

A classifier must never turn a conflict into a more specific failure than its evidence supports.

## 8. Ledger bounds and lifecycle

Preserve the current bounded design unless a focused test proves a concrete defect:

- exact `WeakMap<Session,...>` ownership;
- `maxRetainedFacts=128` live/session retained facts;
- `maxSourceEvents=10_000` replay cap;
- `maxIssues=128`;
- default/max exported query selection bounded to 128 facts;
- existing bounded T03 PTC evidence limits;
- fiber-owned listener/effect disposal.

If retained proof is truncated, missing or conflicting, queries must report degraded/truncated/unknown rather than silently presenting complete history.

No plugin-owned permanent database or complete conversation/audit log is authorized.

## 9. Privacy

Phase 2 exported/read-only diagnostics may expose only typed bounded facts required for the Ledger and classifier: IDs already permitted by prior phases, tool name where already allowed, lifecycle/provenance, source seq/type, boolean/enum outcomes, sanitized error name/code, sanitized sandbox booleans/enums, and bounded issue codes.

Never expose or persist through Risk Advisor:

- raw tool arguments;
- command/code text;
- stdout/stderr/result content;
- spill paths;
- approval reason/justification;
- prompts/model text;
- cwd/workspace path;
- Session/event objects;
- ToolExecution/token/Agent;
- raw exceptions or secret-bearing detail.

## 10. Required implementation slices

### P2A — Ledger product consolidation

- evolve `src/host/ledger.ts` in place;
- keep T03 PTC replay as the sole nested durable projector;
- add only the minimal typed outcome/failure projection and private trace state needed by Phase 2;
- do not change Phase-1 identity or Phase-1B authority.

### P2B — Explicit Failure adapters/classifier

- generic terminal structured codes;
- timeout/cancellation;
- safe pre-denial evidence;
- conservative guard path;
- bash/pwsh structured process+sandbox adapter(s) only when source/runtime proof exists;
- approval outcome facts;
- conflict/unknown behavior.

### P2C — integration / recovery proof

- live ToolRuntime;
- committed Session snapshot;
- replay/recovery;
- PTC projection;
- Native Approval noninterference;
- HMR/dispose;
- privacy and bounds;
- inherited Phase 1 regressions.

## 11. Mandatory focused test matrix

At minimum implement numbered Phase-2 tests covering:

1. normal exact terminal success; no failure; semanticSuccess unknown.
2. generic exact `isError=true` → TOOL_ERROR.
3. `TOOL_TIMEOUT` → authoritative timeout.
4. `ABORTED_BEFORE_DISPATCH`.
5. `ABORTED` after body invocation.
6. explicit structured pre-execute deny, with reason privacy.
7. pre-execute cancel remains cancellation, not denial.
8. guard-returned denial complete witness if and only if safely provable; otherwise explicit PARTIAL/UNKNOWN test.
9. guard throw is not returned guardrail denial.
10. bash foreground exit 0 vs nonzero processSuccess while ToolRuntime may remain success.
11. structured `sandbox.denied=true` with no stderr heuristic.
12. `SANDBOX_UNAVAILABLE` distinct from SANDBOX_DENIED.
13. approval rejected/cancelled/unavailable/allowed-once observed without authority change.
14. missing/ambiguous approval binding does not assign failure cause to an execution.
15. duplicate committed source idempotence.
16. conflicting source/terminal evidence degrades and suppresses false specificity.
17. live/durable equal callId remains separate without exact witness; carry F-006 PARTIAL.
18. replay/live overlap safety; carry F-013 PARTIAL absent exact witness.
19. PTC child explicit terminal/failure evidence via accepted projector; no real-producer promotion without a real producer run.
20. dispose/HMR generation isolation and late callback inertness.
21. caps/truncation/fault containment.
22. exported DTO freeze/privacy scan; no raw args/output/reason/paths.
23. actual pinned Context + SessionStore + ToolRuntime + ApprovalService noninterference integration.
24. inherited 101 accepted tests remain green before Phase-2 additions.

Test count may be parameterized; do not create heavyweight E2E duplication merely to match the numbering.

## 12. Explicitly out of scope

Do NOT implement:

- `operationFingerprint`, `retryOf`, Retry Detector, `sameRootCause`, Permission Escalation, `FailureChainSummary` (Phase 3);
- Rule Engine, risk rules, severity, reversibility, score or recommendation (Phase 4);
- ContextBuilder, SecretRedactor, Fast Judge, `ctx.llm`, Provider calls, RecommendationComposer (Phase 5);
- Product OperationPresentation / real Risk Advisor Card (Phase 6);
- ExpectedEffect, semanticSuccess verification, PostconditionRegistry/adapters (Phase 7);
- Evidence Collector, Deep Judge, final Hardening;
- Native Approval answerer/override;
- Harness Core changes;
- forced cross-plane identity join;
- real retry or replay of user effects;
- plugin-owned persistent audit database.

## 13. Inherited OPEN / NOT_RUN gates

Completion of Phase 2 does not automatically promote:

- F-006 exact live↔durable positive confirmation: PARTIAL unless newly proven;
- F-013 exact replay/live cross-plane positive witness: PARTIAL unless newly proven;
- true disk/process restart: NOT_RUN;
- real native PTC producer: NOT_RUN unless explicitly executed in this task;
- deployed Live Browser/profile: NOT_RUN;
- WebWorker: NOT_VALIDATED;
- newer Harness upstream/V4: NOT_VALIDATED;
- T05 production Assessment latency/budget fields: UNDETERMINED.

## 14. STOP conditions

Stop with `PHASE2_ARCHITECTURE_DECISION_REQUIRED` rather than inventing behavior if:

- product completion would require a second ExecutionId mint path;
- an exact failure category requires reason/stderr string heuristics rather than structured evidence;
- reliable guardrail attribution requires private/internal Cordis/Harness hooks or ordering assumptions;
- live↔durable positive identity requires guessing by callId/time/tool;
- sandbox denial requires exporting raw result content;
- Native Approval behavior would be changed or delayed;
- Harness Core must be modified;
- bounds/privacy cannot be preserved;
- implementation discovers a material pinned-seam contradiction with this freeze.

## 15. Acceptance semantics

Codex may report only an implementation handoff such as `PHASE2_PUBLISHED_READY_FOR_REVIEW`, `PHASE2_ARCHITECTURE_DECISION_REQUIRED`, `PHASE2_BLOCKED`, or a precise partial status. It must not self-declare Phase 2 accepted.

ChatGPT Web independently reviews the remote executable diff, focused evidence, final complete regression, scope/privacy, inherited open gates, and report-only publication relationship before any `PHASE2_ACCEPTED` decision.
