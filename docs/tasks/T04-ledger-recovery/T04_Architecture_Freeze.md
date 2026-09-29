# T04 — R4 Ledger Fault Injection & Recovery | Architecture Freeze

**Status:** FROZEN FOR CODEX IMPLEMENTATION; final acceptance belongs to ChatGPT Web.  
**Date:** 2026-09-29  
**Task directory:** `docs/tasks/T04-ledger-recovery/`  
**Plugin baseline:** `Dhandil/dsh-risk-advisor`, `main @ 3c3fd9d540caa654bb3aaf8378536cfde74ead3e` (T03 independently accepted).  
**Harness source checkpoint (strictly read-only):** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`.  
**Workspaces:** `D:\Harness\harness-plugin\dsh-risk-advisor` (scoped writes); `D:\Harness\deepseek-harness` (read-only, including protected drift).

## 1. Objective, evidence boundary and inherited gates

Implement and fault-test a **minimal bounded, Session-owned Execution Ledger + Recovery Projection** in the independent Risk Advisor Host. The deliverable is correctness under missing, duplicate, conflicting and reordered evidence, including restart/HMR and replay/live overlap. This is not an audit database, complete conversation log, general workflow recovery system, or full Risk Engine.

The central invariant is **Recovery Correctness > Recovery Completeness**. No observer, replay, diagnosis or query may infer a positive execution/approval/parent/outcome fact from merely equal `callId`, `rootCallId`, tool name or temporal proximity. `UNKNOWN`, `UNBOUND`, `AMBIGUOUS`, `DEGRADED` are valid results. In particular, history must never restore T02's *active* index or manufacture its `ExecutionId`.

Inherited accepted scope: T01 bounded additive Approval UI/package; T02 exact live Session-object/callId/ExecutionId correlation and read-only diagnostics; T03 sanitized immutable PTC durable tree projection with causal START-before-SETTLE pairing, injective tuple encoding and degraded edge suppression. Preserve these behaviors and re-run **T01 9/9 + T02 16/16 + T03 17/17**. T01 deployed Live Browser and T03 actual PTC producer are still `NOT_RUN` and are not implicitly passed by T04.

Relevant canonical source: `docs/baseline/risk-advisor-v1-architecture-v1.2.md` §§3.6, 7.9–7.10, 12, 17, 37 and 46/R4; `docs/baseline/risk-advisor-test-matrix-v1.0-r1.md` Areas E/F, P0-01/02/03/04/10/11 and Suite F; `docs/baseline/risk-engine-contract-v1.0-r1.md` §11 `LedgerHealthSnapshot`. The baseline's three-state `HEALTHY | DEGRADED | RECOVERED` is a presentation vocabulary, **not** an assertion that recovered evidence is complete/safe. R4 may expose separate health/provenance fields without silently rewriting the six-dimensional contract.

## 2. Pinned public Harness seams (verify locally before writes)

- `tools/pre-execute(exec,next)` is an observationally usable **waterfall** if `next()` is delegated exactly once and the returned decision is unchanged. A prior plugin can short-circuit; an unobserved exec has no synthetic START. Preserve T02's existing observer and narrow diagnostic boundary.
- `tools/execute` may be used for an optional dispatch marker only via a verified public, strictly transparent `next()`-once wrapper. Do not claim DISPATCHING if it was not observed; if safe wrapping is unavailable, keep dispatch `UNKNOWN` and report E-002 `PARTIAL` rather than altering tool semantics.
- `tools/result(exec,result)` is the final live tool outcome observation. Its `exec` is an exact runtime object, with token, optional `agent.session`, `callId`, root and parent. `result.isError` is the minimal live terminal fact. Preserve identity by exact object/token within generation, not by callId.
- `session/event(session,event)` is a post-commit append feed; the first argument is the owning Session. `session.snapshotEvents()` is the public immutable ordered source, with zero-based contiguous Session-local `seq`. The feed is not a promise that remote/on-disk persistence already flushed; do not claim durable-on-disk survival without actual persistence evidence. Where storage replay is available, use trusted restored Session data; otherwise label the test **in-memory committed Session snapshot / simulated restart**, not full process-persistence proof.
- `tool/call` includes `{turn,step,callId,name,arguments}`; `tool/result` includes `{turn,step,message,...}`. Validate the actual `ToolResultMessage` pairing field from pinned type definitions before implementing. Durable `approval/asked`/`approval/decided` pair by request `id` and Session; `asked` can have no `callId`; `approval/request` answerer is neither required nor intercepted.
- PTC child events are `tool/ptc-dispatch-start` and `tool/ptc-dispatch` (not `code-dispatch`). Read/reuse T03 projection for source-backed child relationships. `tool/ptc-dispatch` represents the **child** settlement, not a duplicate of the outer `tools/result` or top-level `tool/result`.
- Cordis listener/service/effect cleanup is fiber-owned; R4 generations must detach on disposal without a process-global workaround. If pinned source seams differ materially, STOP rather than patch Harness.

## 3. Minimal bounded design / ownership

Suggested focused Host module(s): `src/host/ledger.ts`, `src/host/ledger-recovery.ts` (names flexible). A **session-exact** internal store uses `WeakMap<Session, State>` plus bounded per-session structures. Same textual Session IDs in two different live Session objects never merge. A trusted restored Session snapshot may be replayed into a *new* state; it does not thereby recover old runtime identity.

- Runtime execution witness: exact observed ToolExecution identity/token and **T02-minted ExecutionId only when directly furnished by an exact internal adapter**. If an adapter is necessary, add a minimal plugin-private hook at the T02 capture point; keep the public `riskAdvisorCorrelation` facade read-only. Do not call `lookup(session,callId)` and re-label its result as an exact live token witness. When there is no such witness, use an explicitly separate local Ledger occurrence reference/provenance, never a forged T02 ExecutionId.
- Durable evidence key: exact trusted Session source plus `(seq,type)` and validated turn/step occurrence. A same-text callId can occur more than once; maintain candidate sets and explicit ambiguity. Source `seq` is **not** global runtime execution identity. No nearest/first/latest pairing.
- Evidence model: provenance (`LIVE_FINAL`, `LIVE_START`, `DURABLE_SOURCE`, `CONFIRMATION`, `REPLAY_RECOVERED`, `UNKNOWN`), bounded event refs, no raw args/output/prompt/reason/secrets. Fold output may expose minimal names, call IDs, source seq, `isError` and sanitized structured error identity only where the exact producer supports it. Keep provisional facts distinguishable from authoritative final outcome.
- Execution projection: `PREPARING | DISPATCHING | SETTLED | INCOMPLETE | UNRESOLVED`, with **separate** `health=HEALTHY | DEGRADED | RECOVERED` and explicit issue/provenance. A complete directly observed live `tools/result` is the sole authoritative live terminal; one uniquely matched durable `tool/result` corroborates that same occurrence and **must not add another Result**. Durable-only result is a historical committed outcome fact, **not** proof of an extant live execution.
- Approval projection is independent, keyed by exact Session + approval id, with its own asked/decided evidence. It may link to an execution **only through exact T02 active witness observed at ask time** or another uniquely justified source-backed relation; orphan/missing/colliding results are UNBOUND/AMBIGUOUS. No auto-approval, auto-rejection, auto-cancellation or adoption of old approval after restart. A stale pending approval is `STALE/DEGRADED` rather than terminally cancelled by RA.
- R3 graph edges remain source-qualified. Missing/unresolved parent does not default to `root=self`. Structural parent/root must remain separate from semantic `retryOf` or `escalatesFrom`, which are **not implemented** in T04.

Suggested V1 caps (document exact implemented values): max 128 retained sanitized facts/session, TTL 15 min for volatile history, bounded observation/issue buffer and source replay cap compatible with R3 (`maxSourceEvents=10,000`, PTC evidence cap 512). Dropping needed proof because of TTL/truncation must mark affected query/state `DEGRADED/TRUNCATED`; do not call a partial history complete. Query history is limited, same exact Session, and strictly before the current occurrence's proven source order; do not scan/serialize an entire Session or construct similarity/retry semantics. Expose a frozen detached read-only DTO/facade only; keep mutators private.

## 4. Fault folding and consistency rules

**Terminal authority and conflict:** `tools/result` owns the observed live final outcome for its *exact* execution identity. Duplicate identical observation/source identity is idempotent. Any differing terminal claim for the *same proven occurrence* (two live claims; source conflict; live-versus-durable mismatch) retains bounded evidence for both and reports `DEGRADED/TERMINAL_CONFLICT`; no last-writer-wins. Do not falsely conflict two distinct occurrences with the same callId. A unique matching durable result is `CONFIRMATION` of the live fact, never a second finished execution. If source correlation is not uniquely provable, leave the durable record unbound/ambiguous rather than pretending it confirms live.

**Missing evidence:** a final `tools/result` carrying a **full exact live exec** but missing an RA START may produce one *recovered live-final fact* with `MISSING_START`/`RECOVERED_FROM_FULL_EXEC` provenance; it cannot invent earlier PREPARING/DISPATCHING or assert prior T02 ID. A durable `tool/result` alone may be represented as a durable orphan/proven historical fact, **not** a fabricated complete live execution. START without final remains incomplete/unknown, never auto-failed. Verification UNKNOWN is never reclassified as FAILED. Orphan approval never creates a fake Execution.

**Ordering/deduplication:** for trusted source replay require contiguous sequence, validated scope/ownership and source-qualified identity. Repeated identical `(Session,seq,type)` is a no-op; conflicting same-source-key data is degraded rather than overwritten. A safely identifiable out-of-order post-commit feed may buffer a bounded gap and reconcile against trusted `snapshotEvents()` by authoritative `seq`. If the gap cannot be proven complete, expose degraded/incomplete rather than silently sorting partial/untrusted events. Never infer missing source events from timestamp or callId. Keep distinct event occurrences with equal payloads but **different seqs** distinct.

**Replay + live race:** subscribe/buffer source callbacks before taking the immutable trusted snapshot (or prove an equivalent no-loss cut), replay the snapshot through one canonical reducer, and apply buffered unseen source events after the snapshot watermark. A source event appearing both in snapshot and live feed must fold once. An exact live final and its durable confirmation must not yield duplicate execution/terminal outcomes. Idempotent repeated recovery retains no old fiber listeners and cannot revive a retired execution. Any unprovable cut is DEGRADED rather than silently dropping events.

**Restart/HMR:** simulate/perform dispose and reconstruct a *new* minimum historical projection from a trusted Session snapshot. Rebuild source-backed `tool/call`, result, approval, and R3 child facts with provenance; **never** revive T02's active WeakMap/ExecutionIds, claim a live pending operation from replay, or auto-close a stale approval. A late old-generation callback must be inert and unable to mutate a new generation. HMR idle must not double-register listeners or yield duplicate history.

**Bounds/privacy/failure isolation:** catch RA-owned observer failures and degrade RA only; never make a committed native `Session.append` fail or block/answer native approval. No raw `arguments`, `content`, `reason`, prompts, credentials, whole event objects or sensitive error detail in exported DTO, logs or persisted plugin data. Source adapter may inspect the immutable original in memory but must detach/sanitize outputs. On cap/gap/invalid scope/unsupported evidence, report explicit reason instead of unsafe truncation.

## 5. R4 evidence matrix (mandatory)

Test Matrix source codes are preserved. Count can be parameterized: avoid writing 15 independent heavyweight E2E tests.

| ID | Scenario | Minimum expected proof |
|---|---|---|
| F-001 | final `tools/result` without RA start, **full exact exec** | one bounded recovered-final fact with provenance; no invented start or T02 ID |
| F-002 | start without result | INCOMPLETE + DEGRADED; no auto-failure |
| F-003 | duplicate identical source/live fact | idempotent, source `seq` deduped; distinct seq remains distinct |
| F-004 | conflicting terminal for proven single occurrence | retain both sanitized refs, DEGRADED; no overwrite or selected winner |
| F-005 | orphan/missing-callId/colliding approval | UNBOUND/AMBIGUOUS, no fake execution or positive historical link |
| F-006 | exact live result + unique matching durable confirmation | exactly one final, confirmation-only |
| F-007 | live/durable terminal conflict | explicit conflict, preserve live authority fact and contrary evidence separately |
| F-008 | idle dispose/HMR | no duplicate registration/observations |
| F-009 | dispose/HMR with active tool/pending approval | lost index -> DEGRADED; never historical active FOUND |
| F-010 | restored trusted Session snapshot | minimal source-backed ledger restored; missing facts remain unknown; distinguish simulated restart vs disk persistence |
| F-011 | replay same snapshot repeatedly | identical projection, no duplicate facts |
| F-012 | reordered/gapped source delivery | reconcile via seq only with trusted complete snapshot; otherwise DEGRADED |
| F-013 | snapshot replay interleaved with live feed | watermark/dedupe; no duplicate execution/result, no omitted committed event |
| F-014 | stale pending approval | STALE/DEGRADED, never auto-cancelled or auto-answered |
| F-015 | unresolved parent from R3 | remains UNRESOLVED, no default root=self |

Additional bounded Area E coverage: `E-001` preparing/start; `E-002` dispatch if safely instrumented or clearly PARTIAL; `E-003` exact final; `E-004` independent approvals; `E-005` verification unknown; `E-006` confirmation-only; `E-007` bounded query. `E-008/009` semantic similarity/retry/escalation and full `E-010` context building are **out of scope** beyond read-only fact query; record NOT_IMPLEMENTED, not fake PASS. No Area D full Primary Failure Analyzer in T04.

Proof ladder: pure reducer/fault fixtures -> genuine pinned Harness `Context` + `SessionStore`/`Session.append` + `snapshotEvents()` -> genuine `ToolRuntime` + `ApprovalService` integration for safe live final/ask/result where practical -> disposable lifecycle/HMR simulation. Explicitly label synthetic injection and any persistence, native PTC producer or browser behavior not actually exercised. No provider, network, privileged operations or permanent host configuration changes are needed.

## 6. Scope, safety and release gates

**Allowed:** focused Host ledger/recovery module(s), minimum exact internal T02 adapter/source integration if necessary and independently reviewed, Host `apply` wiring with effect-owned listeners, pure/integrated fault fixtures, narrowly needed scripts/declarations, `docs/tasks/T04-ledger-recovery/{T04_Architecture_Freeze,T04_Implementation_Instructions,Execution_Report}.md`. Changes to previously accepted product paths must be minimal and backed by compatibility tests.

**Forbidden:** Harness Core changes; modifying protected local drift; `approval/request` answerer or any native authorization/outcome mutation; fabrication of active ExecutionId or positive approval correlation from replay; permanent database/storage schema; full audit log/whole Session clone; Risk Engine evaluators, Judge/LLM/provider calls, postcondition verifier, retry/escalation analyzer, Browser bridge/UI changes, actual benchmark/latency target (R5); silent edits to frozen canonical baseline; unrequested T05.

Quality ordering: preflight and source contract -> implementation/focused faults -> actual Harness integration -> architecture/transaction/lifecycle/scope audit -> inexpensive static gates (typecheck, lint, build/export, `pack`, scoped diff/secret checks) -> final **one applicable full project regression** T01 9 + T02 16 + T03 17 + R4 suite after last executable fix -> report -> implementation commit and report-only commit (when feasible) -> normal push and local/remote SHA verification -> STOP. No project Canonical Full is defined for T04 (`NOT_APPLICABLE`). Full T01 Live Browser and actual T03 PTC producer remain explicitly `NOT_RUN`.

Codex writes only `Execution_Report.md` and execution artifacts; **ChatGPT Web independently reviews pushed code/evidence and decides `ACCEPTED / REPAIR / STOP`**. No `Acceptance_Report.md`. If a required contract needs private Harness internals, destructive Git action, new native authority or a substantive departure from this freeze, use `T04_ARCHITECTURE_DECISION_REQUIRED` / `BLOCKED`, preserve state, and stop rather than guess.
