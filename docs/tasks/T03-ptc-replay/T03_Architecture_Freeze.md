# T03 — R3 Durable PTC Tree Replay | Architecture Freeze

**Status:** FROZEN FOR CODEX IMPLEMENTATION; final acceptance belongs to ChatGPT Web.  
**Date:** 2026-09-29  
**Task directory:** `docs/tasks/T03-ptc-replay/`  
**Plugin baseline:** `Dhandil/dsh-risk-advisor`, `main @ 697db64bab9dd20821864cca1b6fd830a12cda21` (T02 accepted).  
**Read-only Harness reference:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`.  
**Workspaces:** `D:\Harness\harness-plugin\dsh-risk-advisor` (scoped writes); `D:\Harness\deepseek-harness` (strictly read-only).

## 1. Objective and inheritance

Prove that a **bounded, read-only, reproducible replay** of one Session's committed PTC events can recover only those parent/root/child occurrence relationships supported by durable evidence, and explicitly reports `AMBIGUOUS` or `UNRESOLVED` when the evidence is insufficient. In particular, a reused `callId` is not a unique occurrence identity. This is R3, not a general Ledger or restart recovery engine.

Inherited facts: T01 has bounded additive Approval UI and packaging evidence, but deployed **Live Browser is NOT_RUN**. T02 has Host-only exact Session-object/callId active correlation using fresh opaque RA ExecutionIds and a narrow read-only diagnostics facade. Preserve all T01/T02 product behavior and their test evidence. **Do not equate a replay occurrence with a T02 live ExecutionId** based on callId, nor rebuild an allegedly active execution from durable history.

```text
One trusted Session snapshot (sequence-ordered)
  turn/start, step/start, tool/call, tool/ptc-dispatch-start,
  tool/ptc-dispatch, tool/result, step/end, turn/end
                 |
                 v
  bounded PTC occurrence/provenance parser
                 |
                 v
  candidate parent/root occurrences within proven step scope
                 |
                 +--> unique, consistent -> RECOVERED edge
                 +--> multiple          -> AMBIGUOUS edge
                 +--> absent/conflicted -> UNRESOLVED edge
                 |
                 v
  immutable/sanitized replay projection (no writes/answers)
```

## 2. Pinned source facts (Codex must re-check local source)

- `packages/core/tools/src/types.ts` defines the precise durable types. `tool/ptc-dispatch-start` contains `rootCallId`, `parentCallId`, `subCallId`, `name`, `arguments`. `tool/ptc-dispatch` additionally contains `isError`, `content`, and optional structured `error`. Neither carries a globally unique dispatch occurrence ID or a live `ToolExecution.token`.
- `packages/core/tools/src/ptc.ts`: the `run_code` bridge creates child call IDs in the form `${parent}:ptc:${n}`, forwards the parent's `rootCallId` and opaque `parent` token to the live child, appends a start when the scheduler starts, and appends a settle when the child completes. The string format is **a naming convention, not proof of a unique parent occurrence**; never derive a parent by string splitting.
- `packages/core/session/src/types.ts`: every SessionEvent carries an ordered Session-local `seq` and `time`. `turn/start`/`turn/end`, `step/start`/`step/end`, and top-level `tool/call` (with `turn`, `step`, `callId`, `name`) provide occurrence scope. PTC payloads **do not** themselves carry turn/step, so those boundaries must be derived from validated enclosing Session-event order, not guessed from `time`.
- T02 `src/host/correlation.ts` is a separate, runtime-only, Session-object-keyed index. Its UUID-like `ExecutionId` is not persisted in these PTC events.

Source references (pinned):
- https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/core/tools/src/types.ts
- https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/core/tools/src/ptc.ts
- https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/core/session/src/types.ts
- Plugin baseline: `docs/baseline/risk-advisor-v1-architecture-v1.2.md` §§3.6, 7.1, 12 and 46/R3; `risk-advisor-test-matrix-v1.0-r1.md` Area C and F; `risk-advisor-static-preflight-v1.0.md` S4.

**STOP** if the pinned, local event schema or Session boundary behavior materially differs, or if the desired edge cannot be proven without private Harness internals/Core changes.

## 3. Frozen projection and identity contract

Implement a small Host-only projection, suggested `src/host/ptc-replay.ts`. A public read-only function may accept a **specific trusted Session** and consume its `snapshotEvents()` (or a verified equivalent exact Session snapshot); test-only input injection is permitted when clearly labelled synthetic. Never merge streams from two Session objects just because textual `sessionId` is equal.

### Occurrence identity

- A durable **source occurrence reference** is based on exact Session ownership, the current proven `(turn, step)` boundary, event type, and its immutable `seq` (especially the PTC *start* seq). Represent externally with only sanitized labels/sequence references; no Session objects are exported. An event `seq` is an evidence reference, **not** a fresh RA ExecutionId.
- A top-level parent candidate is a `tool/call` *occurrence* with the same `parentCallId` in the same proven step; a nested parent candidate is a uniquely resolved PTC start occurrence with `subCallId === parentCallId` in that step. Never fall back to old steps or older same-ID calls.
- The `rootCallId` is an asserted structural field: independently resolve its candidate root occurrence in the proven scope and check consistency with the resolved parent chain. If there is no unique proof, keep `root` unresolved/ambiguous; do not set `root=self` or use a prior Session's history.
- `tool/ptc-dispatch-start` and `tool/ptc-dispatch` pair only when the same Session/step, the same structural tuple (`rootCallId`, `parentCallId`, `subCallId`, `name`) and unique occurrence evidence identify **one** start and one settlement. `arguments`/`content` are **not identity keys**. A settlement cannot supply a missing invented start; identical repeated call IDs in the same scope cannot be paired using nearest/first/latest heuristics. Contradictory/multiple possible pairings must remain ambiguous/unresolved.
- Re-running the replay over the same immutable snapshot must yield the same structural identities and statuses. Do not infer liveness, runtime authorization or semantic retries from this historical view.

### Edge statuses (per relation, independently)

```ts
type EdgeResolution =
  | { status: 'RECOVERED'; target: DurableOccurrenceRef; basis: readonly EvidenceRef[] }
  | { status: 'CONFIRMED'; target: DurableOccurrenceRef; basis: readonly EvidenceRef[] }
  | { status: 'AMBIGUOUS'; candidates: readonly DurableOccurrenceRef[]; reason: string }
  | { status: 'UNRESOLVED'; reason: string }
```

For T03's **durable-only** replay, a unique, consistent source-backed edge is `RECOVERED`. `CONFIRMED` is **reserved** for a future independently corroborated live-token/durable relation; do not manufacture it. The projection may define this shared vocabulary but need not emit CONFIRMED in R3.

Keep **parent resolution**, **root resolution**, and **start/settlement pairing** separately observable. A uniquely paired terminal event does not automatically prove a unique parent/root, and an unresolved parent does not imply a failed tool.

Terminal evidence may expose only a bounded `isError` fact when exactly one settle is paired, with event seq provenance. `START_ONLY` = incomplete/unknown, **not** automatic failure. `SETTLE_ONLY` = orphan/unresolved, **not** a fabricated start. Do not persist or return complete `arguments`, `content`, secrets, prompts, or full errors.

### Scope, safety and bounds

- Session-local sequence order is authoritative. Validate turn/step context; no cross-step/time-nearest pairing. Duplicate source sequence, malformed structural identifiers, impossible ancestry/cycles, out-of-scope PTC event or inconsistent root assertion must fail closed with explicit reason. Do not silently sort invalid events into an apparently valid history.
- The projection must be bounded in inputs, retained occurrence count, and output. Choose documented conservative V1 limits (e.g. max 10,000 source events, max 512 PTC starts/settles) and return an explicit `DEGRADED/LIMIT_EXCEEDED` result instead of presenting a truncated prefix as complete. The limits are safety caps, not R5 performance claims.
- Return detached immutable output and nested arrays/records. No `Session.append`, native Tool or Approval outcome writes, dynamic provider/LLM, network, filesystem scan, UI publishing, or persistent ledger.
- Structural `parent/root` edges are distinct from `retryOf` and `escalatesFrom`. Do not infer or populate semantic links from callId/name/outcome; future analyzers may add them independently.

## 4. Observable R3 proof set

| ID | Evidence case | Expected |
|---|---|---|
| R3-01 | One actual Session prefix with top-level `tool/call`, PTC start and settle | unique `RECOVERED` parent/root, unique paired terminal provenance. |
| R3-02 | One root and two sibling child dispatches | both children link to the root, neither is the other's parent. |
| R3-03 | A uniquely evidenced nested parent/child chain | direct parent and root identity distinct and consistent, without `root=self`. |
| R3-04 | Repeated replay of same committed prefix (simulated process restart) | identical deterministic structure; no live ExecutionId invented. |
| R3-05 | Same parent/callId reused in different steps | distinct scoped occurrences; no cross-step merge/fallback. |
| R3-06 | Two matching possible parent occurrences in one step | `AMBIGUOUS`, no first/newest/nearest winner. |
| R3-07 | Same subCallId with multiple starts/settles in one scope | ambiguous pairing; no silent terminal overwrite. |
| R3-08 | Settle without start; start without settle; missing parent | explicit `UNRESOLVED`/`SETTLE_ONLY`/`START_ONLY`, no synthetic execution or fake failure. |
| R3-09 | Inconsistent asserted root, missing step context, cycle/invalid provenance | explicit unresolved/degraded, no guessed edge. |
| R3-10 | Source seq/limit/scope isolation and immutable sanitized output | fail-closed and bounded; no raw argument/content leak. |
| R3-11 | Structural relation vs semantic retry/escalation | never equate parent/root with `retryOf`/`escalatesFrom`. |
| R3-12 | R1 + R2 regression and readonly behavior | prior suites still pass; no changes to native approval/tool outcomes or T02 active state. |

Mapping: Test Matrix Area C `C-001`, `C-002`, `C-006`, `C-007` and bounded `C-008/C-009` *structural separation* are in this task. C-003/C-004 **live approval-to-child** remain governed by R2 identity and may be used as safe structural negative controls only; durable PTC strings alone cannot assert that a historic approval was bound to one live child. C-005 may preserve independent `isError` evidence per unique child but does not implement the full failure analyzer. The general recovery/fault-injection matrix F-001..F-015 belongs to **T04/R4**; R3 only handles ambiguity/missing evidence necessary to avoid false edges.

## 5. Integration/evidence hierarchy

1. Pure projection unit tests with controlled, source-shaped typed fixtures (labelled pure).
2. **Real pinned Harness Session append/snapshot replay integration**: create an isolated Session via actual `SessionStore`/`Session`, append a valid bounded turn/step, `tool/call`, `tool/ptc-dispatch-start`, `tool/ptc-dispatch` sequence using public APIs; replay `snapshotEvents()` and assert the exact source seqs and statuses. These are real Session-log tests with simulated PTC producer, **not** real PTC program execution.
3. If safely available, one end-to-end producer-level `run_code`/PTC fixture with a disposable test runtime and no provider/privileged tool call. If unavailable, report `ACTUAL_PTC_PRODUCER=NOT_RUN` with the prerequisite; do not alter Harness or claim a real producer based solely on manually appended events.
4. Run the **entire** previously passing T01 9/9 and T02 16/16 regression, typecheck, lint, build, export/pack and staged scope checks. T01 deployed Live Browser remains `NOT_RUN`.

Do not invent a Canonical Full for T03 (`NOT_APPLICABLE`). Codex is implementation/self-test owner only; ChatGPT Web independently issues `ACCEPTED / REPAIR / STOP` after reviewing pushed source and evidence. Stop at T03; **no T04/R4 or T05/R5** without explicit authorization.

## 6. Explicit STOP conditions

Required Harness Core/user-setting changes; source seam materially differs; need to turn a missing/ambiguous occurrence into a guessed FOUND/CONFIRMED edge; need to reuse a T02 live ExecutionId from durable strings; inability to preserve R1/R2 product behavior; destructive Git/filesystem operations; unexpected remote divergence; uncontrolled input/secrets in output; out-of-scope Ledger/recovery or Native Approval authority change. Preserve drift and report exact blocker rather than forcing completion.
