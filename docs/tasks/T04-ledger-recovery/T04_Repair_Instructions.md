# T04-R4 — Independent Architecture Review Repair Instructions

**Authority:** ChatGPT Web independent review: `REPAIR` (2026-09-29).  
**Repository:** `Dhandil/dsh-risk-advisor`, `main`.  
**Repair starting remote SHA:** `b405e5b99e4c3731fb135fcda401c91f714e2869`.  
**Last executable Tested SHA:** `a6f51c15190c063e83e8bae09d591db4feddb01b`.  
**Frozen local Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887` (strictly read-only).  
**New upstream master:** `4878cdabd87d4041bdaff61d04c966883b9fd07a` — unvalidated and explicitly **not** the target of this repair.  
**Scope:** T04 Ledger identity/evidence/fault correctness, affected tests, execution report. T01–T03 behavior and all historical reports remain protected. Codex is implementation/self-test agent, **not** acceptance authority.

## 0. Preflight, protection and inheritance

- Verify plugin `main`, HEAD, status/index/untracked drift, `origin/main` and `git ls-remote`. Preserve `docs/risk-advisor-current/`, untracked T01 final runtime instructions, dependency/build/cache artifacts, and all unrelated user files. No reset, clean, rebase or force-push.
- Inspect pinned local Harness read-only, including the known drift (`build.log`, `install.log`, `t0-*`, `undefined/`). Follow the already published `T04_Harness_Upstream_Drift_Decision.md`: do **not** fetch, update, install/build in or modify the Harness tree; no unverified new-upstream compatibility claim.
- Read T04 frozen Architecture/Implementation Instructions, the existing `Execution_Report.md`, `src/host/ledger.ts`, `tests/r4-*`, T02 `correlation.ts`, T03 `ptc-replay.ts`, and relevant pinned public Session/Tool/Approval types. Preserve T01 9/9, T02 16/16 and T03 17/17.
- No R5, provider/LLM, Browser bridge, persistent database, native ApprovalOutcome mutation, or Acceptance Report. Keep T01 Live Browser / actual PTC Producer / true disk-process restart explicitly `NOT_RUN`.

## F1 — No historical callId-based Live/Durable false confirmation (required, P0)

**Finding:** In `buildSnapshot()`, live-to-durable matching currently computes `calls.filter(call => call.callId === live.callId && call.name === live.toolName)` and then calls `mergeLiveIntoDurable` when exactly one historical call exists. A unique historical `callId + toolName` is **not** proof of the current live traversal, especially when callId is reused or the new direct ToolRuntime execution has no corresponding durable `tool/call` event. This can silently absorb an old execution into a new one, or incorrectly mark old `tool/result` as a new execution's confirmation.

**Repair contract:** A positive `CONFIRMATION` or collapsed Live/Durable execution requires a source-qualified, exact and demonstrable invocation association — e.g. a narrowly verified public-seam capture of a particular committed call occurrence and its corresponding actual live execution. Do not invent association via uniqueness, time proximity, current active `lookup(session, callId)`, tool name, a historical completed call, or `rootCallId`; do not reconstruct or mint a T02 ExecutionId from durable strings. If the pinned public API offers no exact proof for a case, preserve separate LIVE and DURABLE facts (or explicit unbound/ambiguous provenance), **do not claim F-006 PASS for that case**, and return a precise `PARTIAL`/architecture-decision requirement rather than making an unsafe merge. A real `Session.append` fixture manually placed next to direct ToolRuntime execution does not alone prove exact native invocation identity.

**Tests:** (1) old completed durable call/result; later distinct exact live ToolExecution with identical Session/callId/toolName and no newly proven durable call: **must not merge or confirm**; (2) two distinct live traversals reusing the ID: neither inherits the other's history; (3) positive control only when a truly exact source-qualified witness is furnished and explained; (4) F-006 and F-013 must not double-count or omit facts, with honest proof levels.

## F2 — Preserve every contradictory terminal claim (required, P0)

**Finding:** `mergeLiveIntoDurable()` uses `durableClaims.some(sameClaim)` but uses `durableClaims[0].evidence` for the `CONFIRMATION` and sets `terminalClaims: [liveClaim]` on the matching branch. If durable claims include both a matching and a contradictory terminal, the disagreement disappears from the output. The function also reads only `live.finalClaims[0]`, omitting later contradictory live claims when merged.

**Repair contract:** Keep all distinct bounded source-qualified contrary claims; do not select a single winner or use the first durable claim as confirmation of a different matching claim. Confirmation is allowed only for a proven exact occurrence with one non-conflicting matching durable result. Any conflicting durable/live pair remains `DEGRADED/TERMINAL_CONFLICT` with opposite evidence visible and no spurious confirmation. Preserve the authoritative exact live outcome separately from the conflicting assertion; if two live terminal observations conflict, do not assert an unqualified selected terminal.

**Tests:** durable `false` then durable `true` + live `true`; reverse ordering; two contradictory live results plus one durable result; no claim loss / false confirmation / last-writer-wins. Use exact witness setup where relevant; otherwise test the reducer directly without implying proven cross-plane correlation.

## F3 — Validate authoritative source scope before promoting durable facts (required, P0)

**Finding:** `parseFact()` takes payload `turn/step` at face value. `ensureSnapshot()` / `foldLedgerSnapshot()` validate only contiguous `seq` and then call T03 replay separately. A source with `tool/call` and `tool/result` advertising `{turn:1, step:1}` **without a corresponding valid enclosing `step/start`** can be exported by the Ledger as `SETTLED/HEALTHY` and `sourceComplete=true`, even though the T03 source validator rejects the broken bracket. The ledger must not present invalid provenance as trustworthy.

**Repair contract:** Validate the source-owned turn/step envelope and causal ordering for relevant durable tool call/result facts (and appropriate approval-event ordering) before making positive Ledger projections. Malformed, overlapping, mismatched or missing scope and untrusted source sequence must mechanically degrade/suppress affected facts, including `HEALTHY/SETTLED` claims and `sourceComplete` where correctness depends on the invalid source. Do not merely hide an issue inside the nested `ptc` field; avoid blanket loss of unrelated valid facts if a bounded scope-specific fail-closed policy can prove them separately. Do not invent an absent event or substitute a timestamp.

**Tests:** contiguous invalid bracket (`turn/start`, then tool/call + tool/result but no step/start); step/end or turn/end mismatch; invalid call/result ordering; ordinary complete real Session positive control. Assert there is no unqualified `SETTLED/HEALTHY` for invalid source and issue/provenance is visible, bounded and sanitized.

## F4 — Query truncation must reflect actual combined output (required)

**Finding:** `truncated = durableFacts.length + approvalFacts.length > limit` does not count unmatched Live facts or subtract merged Durable facts. Combined output is built later from `mergedFacts + unmerged durableFacts + approvals`; its truncation flag may be false even when a fact is omitted. Query health can remain `HEALTHY` despite truncation.

**Repair contract:** Compute truncation from the exact combined post-merge output candidates, before `slice()`, with a shared limit across Execution and Approval facts. When an applicable query omits facts due to cap, expose `truncated=true`, `QUERY_LIMIT_CLAMPED` (or an equivalent bounded issue), and an appropriately degraded/incomplete query health; do not present a partial history as complete. A query limit of zero with existing facts is truncated. Preserve detached immutable DTOs and exact Session isolation.

**Tests:** one unrelated Live fact plus one durable fact, `limit=1` (one must be omitted and truncation signaled); a genuinely merged pair (must count once); mixed approval/execution limit; zero limit; fully within limit must not spuriously truncate.

## Test / release gates and publication

1. Run focused F1–F4 regressions and prior R4 F-001..F-015. Distinguish pure fixtures, actual pinned `Context + SessionStore + ToolRuntime + ApprovalService` integration, and source-shaped manual Session events. If exact cross-plane confirmation remains unprovable, report F-006/F-013 `PARTIAL` where appropriate; do not turn test assertions into invented evidence.
2. Architecture audit: P0-03, P0-04, P0-10, P0-11; exact Session ownership; source occurrence vs live identity; terminal conflict retention; valid bracket; snapshot/feed watermark; lossless bounded query status; T03 structural independence; no native Approval authority.
3. Run low-cost typecheck, available lint (state exact availability/warnings), build, Host import/export smoke, pack, diff/staging scope and secret checks. Do not alter Harness to obtain a lint binary. Preserve provided frozen task documents verbatim.
4. Run final applicable project regression after the last executable change: expected T01 9 + T02 16 + T03 17 + repaired R4 suite. No Canonical Full infrastructure exists for T04 (`NOT_APPLICABLE`). No executable drift after Tested SHA without rerunning affected gates.
5. Update the existing `docs/tasks/T04-ledger-recovery/Execution_Report.md` with an honest per-finding and F/E matrix, proof levels, unresolved gates, exact implementation/Tested SHA, upstream drift limitation, and protected drift. Preserve this repair instruction as `docs/tasks/T04-ledger-recovery/T04_Repair_Instructions.md`. Implementation commit, separate report-only commit where feasible, normal push, verify `HEAD == origin/main == git ls-remote origin refs/heads/main`, then STOP.
6. Do not generate `Acceptance_Report.md` or independently declare `ACCEPTED`. If a public-seam identity blocker remains, STOP with `T04_R4_PARTIAL` or `ARCHITECTURE_DECISION_REQUIRED`; no ad hoc expansion to persistent ledger, Harness Core mutation or R5.

## Compact Codex terminal response

```text
Outcome: T04_R4_REPAIR_PUBLISHED / T04_R4_PARTIAL / ARCHITECTURE_DECISION_REQUIRED / BLOCKED
F1/F2/F3/F4: status and proof level
F-001..F-015 and E-001..E-007: changed statuses and limitations
Actual pinned Host integration:
Full T01/T02/T03/R4 regression counts:
Typecheck/lint/build/export/pack/static checks:
Real disk restart / native PTC Producer / T01 Live Browser / new upstream compatibility: NOT_RUN unless truly proven
Implementation / Tested SHA:
Execution_Report.md path:
Final remote SHA and HEAD/origin/ls-remote equality:
Protected drift / STOP reason:
STOP; no R5. ChatGPT independently reviews.
```
