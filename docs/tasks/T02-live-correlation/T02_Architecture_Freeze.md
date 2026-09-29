# T02 — R2 Live Correlation Integration | Architecture Freeze

**Status:** FROZEN FOR CODEX IMPLEMENTATION — independent ChatGPT Web acceptance follows publication.  
**Task:** `T02-live-correlation`  
**Date:** 2026-09-29  
**Plugin baseline:** `Dhandil/dsh-risk-advisor`, `origin/main @ 3615fd3bde79c91c547d39c53ce6f89404dfcf2e`.  
**Harness read-only source baseline:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`.  
**Workspaces:** `D:\Harness\harness-plugin\dsh-risk-advisor` (writes permitted within task scope); `D:\Harness\deepseek-harness` (strictly read-only).

## 1. Objective and inheritance

T01 has independently accepted **bounded** Browser-side R1 fixture/Slot integration, package exports and build. Real deployed **Live Browser Smoke remains NOT_RUN** and is not implicitly passed by T02. Retain T01 source and evidence; do not turn the T01 fixture into a real six-dimensional assessment in this task.

T02 implements a minimum **Host-side live execution/approval association** in the independent plugin. The observable R2 result is: for a committed approval, identify exactly one *currently active* ToolExecution or explicitly fail to correlate. This is prerequisite plumbing for future risk analysis, not authorization, not an assessment verdict and not yet a Host–Browser bridge.

```text
tools/pre-execute (one observed real ToolExecution traversal)
  -> mint fresh Risk Advisor ExecutionId
  -> associate exact live Session ownership + callId
  -> ActiveExecutionIndex: (Session identity, callId) -> Set<ExecutionId>

session/event(session, approval/asked)
  -> obtain Session identity from event callback's `session` argument
  -> lookup active index using event.data.callId, if present
  -> FOUND(executionId) / NOT_FOUND(reason) / AMBIGUOUS
  -> save a bounded, read-only *correlation observation* keyed by session + approval id

session/event(session, approval/decided)
  -> close corresponding pending correlation observation (no native intervention)

tools/result(exec, result)
  -> remove precisely the active registration associated with that exec
  -> no historical fallback; retired data is never active again
```

## 2. Pinned Harness seam facts (inspect local sources again)

- `packages/core/tools/src/index.ts`: `tools/pre-execute` is a `waterfall(exec, next)` of type `PreToolDecision`; the real `ToolExecution` has registry-minted `token`, `callId`, `rootCallId`, optional `agent`/`parent`, `name`, `arguments`, `signal`. `tools/result(exec, result)` is a final observer (`emit`) and receives a frozen readonly execution. An approval may be requested **while the tool body runs**, so do not remove active correlation at `tools/execute` start or when `pre-execute`'s `next()` returns.
- `packages/core/session/src/index.ts`: `session/event(session, event)` is a **post-commit** observer with Session object in its first argument. The `approval/asked` *payload* does **not** contain Session ownership. Do not invent it or infer it from `callId`.
- `packages/interaction/user-approval/src/index.ts` and `types.ts`: `ApprovalService.request` appends `approval/asked` **before** entering `approval/request` decision waterfall and later appends `approval/decided`; `approval/asked` supplies an approval `id`, `toolName`, optional `callId`, optional `reason`, but no `req.agent.session`. A live `ApprovalRequest`, where present, owns its Session via `req.agent.session`; T02's primary durable listener instead uses its own `session` argument.
- `approval/request` is an answerer waterfall; policy `never` may bypass it. **Do not require, claim or terminate this waterfall.** T02 should need no `approval/request` listener at all.
- `tools/pre-execute` is also a waterfall: plugins may short-circuit before RA is invoked. Therefore T02 only correlates executions **actually observed** by its listener; absent observations yield NOT_FOUND, not a fabricated correlation.
- PTC child executions may carry a `parent` token and `rootCallId`. Neither `rootCallId` nor reused `callId` is an ExecutionId; durable PTC tree replay is reserved for R3.

Verify these facts against the local pinned checkout; material drift or an unavailable *public* registration path is a STOP / architecture-decision condition. Useful source paths above are the source references; cross-task contract is `docs/baseline/risk-advisor-v1-architecture-v1.2.md` sections 7.1, 8, 12–13, 46/R2 and `docs/baseline/risk-advisor-test-matrix-v1.0-r1.md` Area B/F.

## 3. Frozen identity and ownership contract

```ts
type ExecutionId = string // Risk Advisor minted, fresh for every observed traversal

type ActiveExecutionLookup =
  | { status: 'FOUND'; executionId: ExecutionId }
  | { status: 'NOT_FOUND'; reason: 'MISSING_CALL_ID' | 'MISSING_SCOPE_IDENTITY' | 'NO_ACTIVE_EXECUTION' | 'RUNTIME_STATE_LOST' | 'OBSERVATION_UNAVAILABLE' }
  | { status: 'AMBIGUOUS'; executionIds: readonly ExecutionId[] }
```

Implementation may represent session scope internally by the exact Session object (e.g. WeakMap) plus its recorded ID, or another **verified exact same-process identity**. Never combine two distinct live Session objects merely because a string label or callId looks alike. Do not use Browser session guesses. The observable `FOUND` result requires exactly one active membership in that Session/callId bucket; 0 -> NOT_FOUND; 2+ -> AMBIGUOUS, no pick-first/newest. Two different simultaneous approvals for one active execution have distinct approval IDs and may each separately resolve to the same uniquely identified ExecutionId. One approval event must not be silently rewritten by a later lookup.

- Per-traversal `WeakMap<ToolExecution, ExecutionId>` (or equally exact object identity) prevents double registration by the same actual execution, while **different** traversals using an identical `callId` get different ExecutionIds.
- Snapshots here are minimal correlation metadata: exact Session owner, public-safe execution identity, tool name, callId, rootCallId and optional parent relation. No wholesale raw arguments, full prompt, secrets or historic Ledger. Any extra metadata must be justified and bounded.
- A missing agent/Session or callId cannot become FOUND. A metadata contradiction relevant to identity must degrade rather than be silently rewritten.
- `operationHash` is not correlation identity and must not be introduced as a substitute.
- After `tools/result`, remove the exact execution from active membership even if a sibling shares the key. No historical completed result may be used as fallback when the live index is empty.
- Keep bounded transient correlation observations keyed by exact Session and durable `approval/asked.data.id`, and correctly associate the matching `approval/decided.data.id`. Repeated same event must not create a new execution or multiple side effects; conflicting observations must be reported, not overwritten.

## 4. Runtime / lifecycle contract

Observation must not change native Tool execution or Approval outcome:

- `tools/pre-execute` contribution delegates through `next()` exactly once, never returns a Risk Advisor allow/deny/ask/cancel, never changes exec/args/signal, and does no LLM, disk/network or unbounded work. Its *own* observation failure must not become a new policy decision; keep native `next()` semantics intact and record degraded evidence where possible.
- `session/event` callback is synchronous, bounded and observational. Do not append to the Session from it, do not throw through native processing, do not expose sensitive logs.
- `tools/result` observer only settles/removes exact RA activity; must not alter `result`. Do not remove active on `tools/execute` start or at the end of the pre-execute middleware, because `approval/asked` may occur inside `ToolDefinition.execute` (e.g. sandbox escalation).
- On plugin disposal/HMR clear runtime-only active index, weak associations and listeners; stale callbacks from the retired fiber must not revive state. A pending approval whose live execution was lost after restart/HMR is NOT_FOUND/DEGRADED. Do **not** search durable history to reconstruct a current active execution, and do not infer a positive binding from the approval's `callId`.
- Keep an explicit `active/closed` generation guard or comparable ownership mechanism; prove independent new instance is empty and a late retired result cannot corrupt it.
- Only display/export sanitized diagnostic outcomes needed to test R2. No Browser route, UI risk verdict, native approval replacement or new authority.

## 5. R2 observable verification set

| ID | Scenario | Expected minimum outcome |
|---|---|---|
| R2-01 | Real pre-execute capture and same-Session approval asked while active | unique `FOUND` for RA-minted ExecutionId; no duplicate from same exec |
| R2-02 | Different active callIds in one Session | independent associations |
| R2-03 | Same callId active in two Sessions | strict scope isolation; no cross-session binding |
| R2-04 | Two active traversals in same Session with same callId | `AMBIGUOUS`, never latest-wins |
| R2-05 | Finish one of colliding traversals | remove exact member; remaining active may be `FOUND` |
| R2-06 | Finish then reuse callId | bind only new traversal, never prior completed execution |
| R2-07 | Missing callId / missing validated Session / orphan asked | explicit NOT_FOUND/degraded; no synthetic ExecutionId |
| R2-08 | Approval asked while tool body is waiting / representative in-body escalation | still active until final result; native decision unaffected |
| R2-09 | Parent and nested execution / approval | distinguish traversal identity; parent/root fields cannot collapse identities; no R3 replay claim |
| R2-10 | Duplicate asked ID; decided pairing; simultaneous distinct approvals | idempotent and session-scoped; no silent overwrite |
| R2-11 | Plugin disposal/HMR active-state loss + stale result | new index empty, explicit degraded, no revival or cross-generation removal |
| R2-12 | Native coexistence, policy never or bypassed/short-circuited observer | no required answerer order; tool/approval semantics unchanged, unknown stays unknown |

Proof hierarchy: pure indexed state regressions; actual pinned Harness `ToolRuntime` + `Session` event/ApprovalService integration where safely possible; deterministic in-body simulated approval, no real provider or privileged external operation. Tests that only dispatch handcrafted callbacks must be labelled component/contract, not actual runtime integration. Each row must specify observed scope and PASS/PARTIAL/NOT_RUN. No arbitrary numeric latency targets (R5).

## 6. Scope and gates

**Allowed:** Host correlation module(s) and `src/index.ts` plugin entry, minimal package/type/tooling changes needed for the already pinned Host+Client build, R2 test harness, documented bounded observations, `docs/tasks/T02-live-correlation/{Architecture_Freeze,Implementation_Instructions,Execution_Report}.md` (names may use `T02_` for the two supplied originals). Existing R1 Browser fixture remains intact.

**Forbidden:** editing Harness Core, its working tree, user profile/permanent settings; resetting/cleaning/rebasing/force-pushing; changing native authorization/answering; new `approval/request` terminal listener; R3 durable tree replay, R4 persistent Ledger/recovery, R5 benchmark; full Risk Engine, LLM Reviewer, provider/browser calls; Host–Browser route/UI risk claim; generalized plugin rewrite. Inherited T01 live Browser remains **NOT_RUN**.

Preflight -> focused tests -> actual Host seam integration -> architecture/transaction/scope audit -> typecheck/lint/build/package/static gates -> last applicable executable gate -> Codex **Execution_Report.md** -> implementation commit and report-only commit where feasible -> normal push -> exact local/remote SHA check. No Canonical Full has been defined for T02: `NOT_APPLICABLE`, never fabricated PASS. Do not change executable content after its final tested SHA without retesting.

Codex reports execution and self-tests, never declares `ACCEPTED`, never creates an `Acceptance_Report.md`, and stops after publication. ChatGPT Web independently reviews actual remote code and evidence (`ACCEPTED / REPAIR / STOP`).
