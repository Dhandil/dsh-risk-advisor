# Risk Advisor Phase 14.1 — Implementation Instructions

Implement only the contract in [`Phase14_1_Architecture_Freeze.md`](./Phase14_1_Architecture_Freeze.md), from Product baseline `4fb0a9133ba9df111db9c2023a946f023e3fa5a2` with Harness pinned to `ddefc45fbc7f8e46dd73185e68295696d1297887`.

## Scope and slices

1. **Shared pre-execution context and base assessment.** Add a Host context/assessment registry keyed by exact Session identity and `ExecutionId`. Reuse one `ReviewerSeedStore` and one `DirectUserRing`; capture only the existing immutable local Phase 5 context after current Foundation/Rule/Failure/seed capture. Insert the bounded pending record, then schedule `createDeterministicAssessment()` on a later event-loop turn. Keep the capture exception-contained, preserve hook order, and return the exact `next()` result without waiting. Ensure one base `assessmentId` and one scorer invocation per execution.
2. **Approval reuse.** Change only the Risk Advisor-side coordinator seam needed for `approval/asked` to attach to the matching pending/completed base assessment. If approval arrives while scoring is pending, update the existing approval detail when that same assessment completes. Keep its approval trigger, public query contract and approval-only Judge/Evidence lifecycle. Exercise missing, ambiguous, conflicting and capacity cases without fallback duplicate computation.
3. **Read-only Host projection.** Add `RuntimeRiskAwarenessViewV1` and the exact `risk-advisor/runtime-risk` route. Resolve only the requested live Session. Reuse sanitized Risk Assessment presentation; do not reuse `presentOperation()` because it can expose resource/path hints. Return one active/latest eligible row, or explicit unavailable/not-found state.
4. **Client store and dock.** Add a session-scoped, lifecycle-safe read client and the `risk-advisor-runtime-risk-awareness` dock at order 20. Reuse Phase 12.2 store lifecycle principles. Show compact severity, recommendation, primary reason and degraded/unknown state; provide inline details only. Suppress the runtime row after exact Native Approval ownership and leave the Online Correction dock/contract untouched.
5. **Lifecycle and boundary proofs.** Wire `tools/result`, Session disposal, extension generation disposal and Bridge registration cleanup. Scrub non-approval snapshots as specified; cancellation/clear must be idempotent. Do not add storage-domain records or alter the Phase 11 writer path.

## Required focused proofs

Add focused tests for these behaviors; use a real pinned Harness ToolRuntime integration where existing test seams support it, but never call a live provider:

- The `tools/pre-execute` observer snapshots only pre-execution evidence, calls `next()` once, returns the exact downstream promise/value/decision, does not wait for the deferred scorer, and contains capture/scheduler failures. Tool arguments and result identity remain unchanged.
- Deferred scoring uses existing `RuleEvaluation`, Foundation, bounded ReviewerSeed/DirectUser/ledger inputs and `createDeterministicAssessment`; it makes zero LLM/Judge/verifier/storage/network calls. Missing or degraded data stays degraded/unknown.
- Repeated/concurrent hook observations cannot score one `(Session, ExecutionId)` twice. Same `callId` with distinct execution IDs stays distinct. Missing/wrong Session and ambiguous correlation never borrow another assessment.
- A normal non-approval Tool yields one bounded runtime view. A native `approval/asked` for that exact execution reuses the same `assessmentId`; the approval detail is the sole presentation owner and there is no duplicate deterministic evaluation. Other approval lifecycle outcomes do not mutate the base assessment.
- `tools/result` cannot influence risk verdicts; it only retires/scrubs/ages the record. No result, verifier, F1/F2 Finding or Phase 11 record is created or rewritten by this path.
- Bridge tests cover exact schema/keys, invalid and oversized IDs, unknown Session, cross-Session isolation, abort, projection failure, unavailable state, output bounds and read-only behavior.
- UI tests cover one dock registration at order 20, one current row per Session, high/degraded/unknown visibility, inline disclosure, no approval controls/modal, Native Approval suppression/reuse, independent Online Correction order 10, polling stop/abort/restart and client dispose.
- Lifecycle tests cover queue overflow (advisory-only drop), 256-record cap, context/output caps, the 30-second non-approval post-result expiry, the existing 10-minute approval bound, Session disposal, HMR/generation teardown, queued-task cancellation and no retained Session/ToolExecution references.
- Run unchanged Phase 11 E1–E14, O1–O15, P1–P17 and Repair1 capacity regression; Phase 12.1 C/R/S and Phase 12.2 U/L; Phase 13.2 accepted F1 exact-path regression; focused P6/P10 client, bridge, lifecycle and package/boundary regressions. Do not rerun any Phase 13 campaign.

## Gate order

1. Verify Product `HEAD == origin/main == 4fb0a9133ba9df111db9c2023a946f023e3fa5a2`, pinned Harness SHA, and the working tree. Preserve all existing user files and untracked `lib/`, `node_modules/`, `.vitest-cache/`; do not clean/reset/stash them.
2. Run new Phase 14.1 focused host/runtime tests and the pinned Harness integration proof.
3. Run the required frozen regressions listed above (Phase 11, Phase 12, Phase 13.2, P6/P10).
4. Run typecheck, production build, package/declaration/export/dependency checks, static/boundary checks, and privacy/persistence checks. Confirm no Harness tree, lockfile, Web Profile, package contract, storage domain or Phase 11/13.2 contract changed.
5. Review final diff and prove the full Phase 14.1 runtime has no `ctx.approval` answerer, no decision return, no awaited pre-execute work, and no model/provider/Judge/verifier/storage/network work.
6. Only after every preceding gate passes, run one fresh complete `pnpm test` on the exact executable candidate. If it fails, stop; do not repair and rerun it under the same candidate.

## Hard boundaries

- Do not modify Harness Core, permissions, sandbox, native approval, Product Web Profile, or another repository.
- Do not alter `PreToolDecision`, `ApprovalOutcome`, Tool args/results, F1/F2 predicates/identity/triggers, Online Correction schemas, Phase 11 data contracts, or Phase 13.2 truth/oracle.
- Do not let Browser, model, approval, assessment, or user input trigger an execution control action.
- Do not create a second rule matrix, risk aggregator, approval state machine/window, persistent assessment store, generic Adapter, Agent-context injection, or free-form/model assessment.
- Do not start Phase 13.3/13.4 or another phase.

## User-visible completion

For ordinary non-approval Tools, the active Session receives one compact, clearly advisory Risk Advisor row based solely on the pre-execution snapshot. It may appear after dispatch and must say so when timing makes that relevant. It shows severity, recommendation, one reason and an explicit degraded/unknown caveat; inline details contain only sanitized assessment information. When Native Approval owns the same execution, that single assessment appears through the existing approval-detail slot and the ordinary dock item is suppressed. The Harness decision and Tool execution are unchanged.
