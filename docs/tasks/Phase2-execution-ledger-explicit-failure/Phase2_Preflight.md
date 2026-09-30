# Risk Advisor — Phase 2: Execution Ledger + Explicit Failure | Preflight

**Verdict:** `PHASE2_PREFLIGHT_READY`  
**Date:** 2026-09-30  
**Repository:** `Dhandil/dsh-risk-advisor`  
**Preflight baseline:** `main @ 4ad6269b69d0ed33ae9be675513ad10b1ae3ee3a`  
**Last executable acceptance SHA:** `9c7a4e54effe3455171aabb724724dd0e7eeb9b4`  
**Pinned Harness source:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887` (read-only)

## 1. Authority and scope

The technical Source of Truth is `docs/baseline/risk-advisor-v1-architecture-v1.2.md`. Its roadmap defines Phase 2 as **Execution Ledger + Explicit Failure**: live `tools/result` observation, committed Session-event corroboration, `tool/ptc-dispatch-start` / `tool/ptc-dispatch` nested evidence, Execution Ledger projection, and explicit tool / approval / cancellation / sandbox / deterministic-guard / timeout / system failure facts.

This preflight does not authorize Phase 3 retry/escalation analysis, Phase 4 rules, Phase 5 Judge/ContextBuilder, Phase 6 Product UI, Phase 7 semantic verification, later evidence/deep-judge work, or any Harness Core change.

Phase 1C is already independently accepted. The final executable SHA is `9c7a4e54...`; the current `4ad6269...` differs only by the Phase 1C execution report, so its executable evidence remains valid.

## 2. Existing Phase 2 foundation

The repository already contains a substantial pre-product foundation from the accepted T03/T04 spike work:

- `src/host/ledger.ts`: exact-Session bounded live + committed-source Ledger reducer.
- `src/host/ptc-replay.ts`: bounded source-backed PTC nested dispatch replay.
- `tests/r4-ledger.unit.spec.ts` and `tests/r4-runtime.integration.spec.ts`: fault/recovery matrix.
- `tests/r3-ptc-replay.unit.spec.ts` and `tests/r3-runtime.integration.spec.ts`: PTC source projection.
- `src/index.ts`: `installLedger(ctx)` is already mounted in the Host.

Therefore Phase 2 must **consolidate and productize** this validated foundation; it must not create a second Ledger, a second execution identity owner, or a second replay system.

## 3. Capability matrix

| Capability | Status | Preflight finding |
|---|---|---|
| exact live `tools/result` | EXISTING | immutable final `ToolExecutionResult`; exact live object identity retained privately |
| `tools/pre-execute` start observation | EXISTING | T04 records live start; transparent waterfall observer |
| `tools/execute` dispatch observation | EXISTING | transparent `next()`-once marker exists |
| committed `session/event` source | EXISTING | `(Session object, seq, type)` validation, gap/conflict handling and snapshot replay exist |
| `tool/call` / `tool/result` replay | EXISTING | scoped turn/step causal audit; no historical callId guessing |
| `approval/asked` / `approval/decided` replay | EXISTING | independent bounded approval projection |
| PTC start/settle pair | EXISTING | T03 projector for `tool/ptc-dispatch-start` + `tool/ptc-dispatch` |
| duplicate/source conflict handling | EXISTING | idempotent identical source; conflicting source degrades |
| terminal conflict handling | EXISTING | retains bounded claims; no last-writer-wins |
| replay/recovery | EXISTING | trusted Session snapshot reconstruction; no active-index revival |
| exact live↔durable same-invocation witness | PARTIAL | pinned public seams do not prove a positive cross-plane join |
| explicit failure product projection | PARTIAL | raw facts exist; no formal Phase-2 classifier/product contract yet |
| structured timeout | EXISTING SEAM | pinned `TOOL_TIMEOUT` code is authoritative for timeout-policy-owned timeout |
| cancellation stage | EXISTING SEAM | `ABORTED_BEFORE_DISPATCH` vs `ABORTED` is structured |
| pre-execute denial | EXISTING SEAM | `PreToolDecision.deny.info` provides optional structured name/code |
| deterministic guard-returned denial | PARTIAL | provable only with complete control trace; no reason-string heuristic |
| guard throw | EXISTING SEAM | becomes final normalized error and can bypass post-execute; must stay distinct |
| sandbox denial | EXISTING SEAM / PRODUCT GAP | bash/pwsh canonical success value may carry `sandbox.denied=true`; must extract sanitized witness |
| sandbox runner unavailable | EXISTING SEAM | structured `SANDBOX_UNAVAILABLE`; distinct from a working sandbox denying a file effect |
| semantic success | OUT OF SCOPE | remains `unknown`; Phase 7 owns semantic verification |

## 4. Pinned Harness findings

### 4.1 Tool pipeline

Pinned ToolRuntime runs the ordered pipeline `tools/pre-execute → monotonic guards → tools/execute → dispatch → tools/post-execute → finalizeContent → tools/result`. `tools/result` is the immutable final observation. A pre-execute denial is a post-result path; a guard return also becomes a post-result path. A thrown pre/guard error is normalized through a final-result path and therefore is not equivalent to a returned guard denial.

`PreToolDecision` is closed as `allow | deny | cancel | ask`. `deny` may carry `ToolErrorInfo { name, code, reason? }`. Phase 2 may retain only sanitized `name/code`; source `reason` is not a classification input and is not exported.

### 4.2 Cancellation

The pinned registry exports `ABORTED_BEFORE_DISPATCH` and `ABORTED`. The former means body invocation was prevented; the latter is selected only after the body was invoked. These structured codes are stronger than message parsing and must be used directly.

### 4.3 Timeout

`@deepseek-ai/dsh-tool-call-timeout-policy` owns `TOOL_TIMEOUT` as both internal deadline classification and final structured error code. When its own deadline wins, it waits for quiescence and replaces the result with `{ name: 'ToolTimeoutError', code: 'TOOL_TIMEOUT' }`. Phase 2 may therefore classify that exact code as authoritative timeout evidence.

### 4.4 Sandbox

A working sandbox denial is not equivalent to ToolRuntime failure. The sandboxed shell executor returns a structured `ShellRunResult.sandbox.denied` fact. `dsh-tool-bash` copies that into its canonical foreground success value as `value.sandbox.denied`; non-zero shell exit is likewise data rather than automatically `ToolExecution.isError`.

`SANDBOX_UNAVAILABLE` has different semantics: confinement could not be established / the runner failed, so the command is not safely treated as having run under a working sandbox. Phase 2 must keep `sandbox_denial` and `sandbox_unavailable` separate.

Phase 2 must never classify sandbox denial from arbitrary stderr union matching. It may consume only a verified structured canonical value for explicitly supported tool adapters (initially bash/pwsh if actually mounted/tested) or another authoritative structured seam.

### 4.5 Session and PTC source

`session/event` is a committed in-process Session append observation and `session.snapshotEvents()` is the trusted ordered replay source. That is sufficient for committed-source recovery. It is **not** proof that the event was physically flushed to disk at observer time; true disk/process restart remains NOT_RUN.

PTC durable children are `tool/ptc-dispatch-start` and `tool/ptc-dispatch`. They must not be renamed to obsolete `tool/code-dispatch*` vocabulary.

## 5. Identity and reconciliation decisions

1. Phase 1/T02 remains the sole owner of live `ExecutionId` minting.
2. Ledger live ordinals and durable occurrences remain evidence identities; replay must not mint or restore a Phase-1 live `ExecutionId`.
3. Equal session id text, callId, tool name, rootCallId or temporal proximity never proves a live↔durable same-invocation join.
4. T04 F-006 and F-013 therefore remain PARTIAL; Phase 2 must preserve separate facts unless a new exact witness is independently proven.
5. Durable evidence may corroborate only when identity is exact; otherwise it stays source-qualified evidence, never a guessed confirmation.

## 6. Productization decision

Phase 2 should be implemented as three slices:

1. **Ledger consolidation** — retain T04/T03 reducers and expose a stable internal Phase-2 fact/query contract without rewriting into full Event Sourcing.
2. **Explicit Failure projection** — derive only evidence-backed failure/process facts from structured observations.
3. **Integration/recovery proof** — combine live, committed-source, PTC, approval, conflict, HMR/dispose and privacy tests while preserving all Phase 1 behavior.

The architecture `ExecutionEvent` vocabulary is a semantic normalization contract, not a requirement to replace the already validated T04 source-folding implementation with a second event store.

## 7. Failure-classification constraints

- `isError=false` on an exact final ToolRuntime outcome supports `processSuccess=true` for the tool pipeline only; it says nothing about semantic success.
- `isError=true` supports `processSuccess=false`, while the root cause remains specific only when structured evidence proves it.
- `TOOL_TIMEOUT` → timeout, authoritative.
- `ABORTED_BEFORE_DISPATCH` / `ABORTED` → structured cancellation stage, authoritative.
- explicit pre-execute `deny` may be classified as pre-execute denial only when the observer captured that decision; optional `info.name/code` may be retained.
- deterministic guard denial requires the complete frozen control trace; incomplete traces remain unknown rather than guessed from text.
- guard throw is not a guard-returned denial.
- `sandbox.denied=true` from a verified canonical result → sandbox denial; `SANDBOX_UNAVAILABLE` → sandbox runner/system failure, not denial.
- approval `rejected | cancelled | unavailable` stays native observed vocabulary and never becomes Risk Advisor authority.
- arbitrary error/reason/stderr strings are not accepted as classifiers.

## 8. Bounds and privacy

Retain the validated bounded model: exact Session ownership, finite source/event/issue/query caps, generation disposal, detached frozen DTOs, and no raw arguments, tool output, approval reason, prompt, cwd, command text, secret, whole Session event or arbitrary exception detail in exported product diagnostics.

The current R4 constants (`maxRetainedFacts=128`, `maxSourceEvents=10,000`, `maxIssues=128`, default query limit 128; PTC cap inherited from T03) are acceptable Phase-2 defaults unless implementation evidence proves a concrete issue. No unbounded history or permanent audit database is authorized.

## 9. Inherited OPEN / NOT_RUN

- T04 F-006 positive exact live↔durable confirmation: PARTIAL.
- T04 F-013 exact replay/live positive cross-plane dedupe: PARTIAL.
- true disk/process restart: NOT_RUN.
- real native PTC producer: NOT_RUN.
- deployed Live Browser/profile: NOT_RUN.
- WebWorker: NOT_VALIDATED / not supported by Phase 1C.
- newer Harness upstream/V4: NOT_VALIDATED.
- T05 production assessment latency/budgets: UNDETERMINED.
- Rule Engine, real RiskAssessment, ContextBuilder, Judge/Provider, OperationPresentation/Product Card: not implemented.

## 10. Preflight verdict

`PHASE2_PREFLIGHT_READY`

No new source fact requires revising `risk-advisor-v1-architecture-v1.2.md`. Proceed to a task-specific Phase 2 Architecture Freeze and Implementation Instructions. This preflight performed remote/source inspection only; it did not modify executable code, run tests, run providers, start browsers, execute a native PTC producer, or mutate Harness Core.
