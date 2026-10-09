# Risk Advisor Phase 14.1 — Runtime Risk Awareness Architecture Freeze

**Status:** `RISK_ADVISOR_PHASE14_1_ARCHITECTURE_FROZEN` — **independently reviewed and amended by ChatGPT architecture authority** (see `Phase14_1_Architecture_Review.md`). The initial Codex-authored Freeze was a candidate, not a self-accepted architecture.

**Baseline:** `4fb0a9133ba9df111db9c2023a946f023e3fa5a2`

**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

**Authority:** [`risk-advisor-harness-native-risk-intelligence-boundary-v1.md`](../../baseline/risk-advisor-harness-native-risk-intelligence-boundary-v1.md)

This freeze authorizes only the Phase 14.1 implementation described in the companion instructions. It does not amend accepted Phase 11 or Phase 13.2 contracts, or authorize Phase 13.3 reruns, Phase 13.4, Harness changes, or generic adapters.

## Bounded architecture survey

The survey was read-only and limited to the named Risk Advisor surfaces and the pinned Harness integration contracts.

| Surface | Observed contract | Phase 14.1 consequence |
| --- | --- | --- |
| `src/index.ts` / `tools/pre-execute` | One existing observer captures Operation Foundation, failure-chain state, deterministic Rule Engine output, expected effects, evidence seeds and a redacted reviewer seed before delegating to `next()`. `tools/result` owns settled-result observation and retirement. | Extend this capture path with a bounded advisory snapshot. Call `next()` exactly once and return its unchanged result; do not await advisory work or change the existing capture/result order. |
| Harness Tool pipeline | At pinned Harness SHA, `tools/pre-execute` is an awaited waterfall before native decision and dispatch. | Any wait in this hook delays Harness. Only bounded synchronous capture is permitted; assessment scheduling and Browser/storage work must not be awaited. |
| Operation Foundation / Rule Engine / Risk Engine | Foundation and Rule Engine already provide correlated, bounded operation evidence. `buildLocalPhase5Context()` and `createDeterministicAssessment()` provide the existing six-dimension deterministic path. | Reuse their facts, builder and aggregator. Do not add a parallel predicate set, change risk thresholds, or claim postcondition verification before a result exists. |
| `ApprovalAssessmentCoordinator` | It currently creates the deterministic base assessment only after a uniquely correlated `approval/asked`; it then owns approval-associated Judge/Evidence stages and native-outcome lifecycle. | Preserve its approval trigger and public query contract. It must attach to the same per-ExecutionId deterministic base assessment created for ordinary Tools, not calculate a second base assessment for that execution. Judge/Evidence continuation remains approval-associated and unchanged. |
| Browser Bridge | Existing routes are read-only, session/call or assessment scoped, strictly parsed and cancellation-aware. | Add one separate read-only runtime-risk route with an exact bounded request schema and a safe projection. Do not repurpose approval or Online Correction routes. |
| Client slots | Harness declares `conversation.input.dock` a session-scoped ordered list. Risk Advisor already registers Online Correction there at order 10. `conversation.approval.detail` is a separate single slot inside the native approval panel. | Add one session-scoped dock entry at order 20. For an execution later owned by Native Approval, hide that runtime dock record and reuse the same assessment in the existing approval-detail slot. |
| Online Correction / Experience Loop | Online Correction is an independent post-settlement F1/F2 read surface. Phase 11 writes immutable Episode → append-only Outcome → qualified Pattern → deterministic Guidance records. | No triggers, predicates, schemas, storage domains, writers or UI contracts in those systems change. Phase 14.1 does not consume Phase 11 Guidance. |

No architecture conflict was found that requires Harness authority or a second risk/approval system.

## Frozen design

### 1. Authority and trigger

The only Phase 14.1 assessment trigger is the already-observed Risk Advisor `tools/pre-execute` capture, independent of whether Native Approval will be requested. The existing Foundation, Rule Engine, failure-chain and seed capture remain the source of facts. Phase 14.1 adds one shared pre-execution context/assessment registry and an in-memory `RuntimeRiskAwarenessRuntime`. Reuse one `ReviewerSeedStore` and one `DirectUserRing` capture per execution/session; the approval and ordinary-Tool paths must not duplicate or differently redact these facts.

The listener must synchronously capture a bounded immutable snapshot, create or find the record by exact `ExecutionId` and Session identity, call `next()` exactly once, and return the unchanged downstream value/promise. Snapshot or queue failures are contained as advisory `UNAVAILABLE`/`DEGRADED` state. No `PreToolDecision`, `ApprovalOutcome`, args, result, permission, cancellation, pause, resume or replacement Tool is produced or changed.

Risk aggregation is scheduled on a later event-loop turn from the captured snapshot. No model, Judge, verifier, Browser RPC, storage operation, filesystem probe or other I/O is awaited from `tools/pre-execute`. Publication is best-effort and may arrive after dispatch; it is always labelled as an assessment based on evidence captured before execution. The feature never claims it blocked or preceded the Tool body.

### 2. One deterministic assessment per execution

For an exact `(Session identity, ExecutionId)`, there is one deterministic base assessment, one `assessmentId`, and one frozen pre-execution context. The new runtime owns scheduling and ordinary-Tool exposure. `ApprovalAssessmentCoordinator` remains approval-triggered and retains its existing public query/Judge/Evidence lifecycle. The shared registry is a **single-flight state machine**, keyed by exact (Session identity, ExecutionId): `CAPTURED → SCORING → BASE_READY` or `UNAVAILABLE`. It owns the *unique base assessment ID*, frozen pre-execution context, and one-scoring-attempt claim.

**Approval-before-deferred-scoring race:** on a uniquely correlated `approval/asked` while `CAPTURED`, the approval path claims and completes that same deterministic base assessment **synchronously at the existing approval-observation boundary** (never inside `tools/pre-execute`), cancels/invalidates the deferred job, and attaches the result to the approval record. This preserves the current synchronous deterministic approval baseline without adding another awaited pre-execute assessment. If `BASE_READY`, approval reuses it; if `SCORING`, an event-loop-atomic claim prevents a second scorer; if evidence is conflicted, unavailable or capture never succeeded, do not borrow another record or fabricate a base. Only when **no registry computation or frozen capture ever existed** may the legacy approval-only fallback form one base, as it did before 14.1. In every case score at most once per execution and verify distinct Sessions never share a result.

Existing approval-side Judge/Evidence overlays remain independent and can create later `assessmentId` revisions; **only the deterministic A1 base ID must match between the ordinary Tool view and the approval-associated A1**. Do not require a later approval `latest` assessment/revision ID to equal the base ID. Reviewer payload is built only after approval from the shared frozen local context and existing bounded reviewer inputs, with no second risk-feature projection or deterministic aggregation.

Association uses the existing correlation index and exact execution identity, never a command hash or a guessed `callId` match. Missing Session/ExecutionId, ambiguous correlation, or conflicting identity cannot borrow another record. The shared base assessment remains advisory and is not revised by approval allowed/rejected/cancelled outcomes. Existing approval-specific Judge/Evidence revisions and status handling remain governed by their frozen contract.

### 3. Evidence and semantics

The base assessment may use only evidence already captured before the current Tool result; `createdAt`, opaque IDs and scheduling may differ across runs, so **deterministic** here means equal eligible inputs produce equal risk dimensions, verdict and reason semantics, not byte-identical randomly generated IDs:

- existing `FoundationDiagnostic`, current `RuleEvaluation`, current pre-execution `ReviewerOperationSeed`, and prior/current-known `FailureChainSummary`;
- the existing bounded Direct User Ring and bounded ledger summary through the current local Phase 5 context builder;
- unknown/unavailable fields as represented by the existing Risk Engine.

Reuse `buildLocalPhase5Context()` and `createDeterministicAssessment()`; keep feature IDs, rule predicates, dimension aggregation, recommendations, provenance serialization and quality semantics unchanged. The result is deterministic; Phase 14.1 does not call an LLM/Judge or collect new evidence.

Never include current or future `tools/result` data, stdout/stderr, file contents, postcondition-verifier results, approval decision/justification, Agent-authored interpretation, or Phase 11 Pattern/Guidance. Insufficient input stays explicitly degraded/unknown/unavailable; it must not be promoted to a positive or verified claim. The post-execution result may retire/scrub context and update record lifetime only; it cannot change the frozen pre-execution assessment.

F1/F2 predicates, identity, settlement triggers, verification and Online Correction findings are unchanged. Episode/Outcome/Pattern/Guidance commit and revision semantics are unchanged.

### 4. Browser and user-visible behavior

Add a separate read-only endpoint `risk-advisor/runtime-risk` (POST through the existing Host Connection fetch API). Its request schema is exactly `{sessionId}`. The versioned `RuntimeRiskAwarenessReadV1` is one of:

- `VIEW`: `{schemaVersion: 1, kind: "VIEW", sessionId, executionId, callId?, assessmentId, timing: "PRE_EXECUTION_EVIDENCE", status: "PENDING" | "READY" | "DEGRADED", stage: "CAPTURED" | "SCORING" | "COMPLETE", capturedAt, updatedAt, reasonCodes, assessment?}`;
- `NOT_FOUND`: `{schemaVersion: 1, kind: "NOT_FOUND", sessionId}`;
- `UNAVAILABLE`: `{schemaVersion: 1, kind: "UNAVAILABLE", sessionId, reasonCodes}`.

`assessment` is only the existing sanitized `BrowserRiskAssessmentV1` projection. Runtime reason codes are a fixed allowlist: `SNAPSHOT_UNAVAILABLE`, `ASSESSMENT_UNAVAILABLE`, `CAPACITY_EXCEEDED`, and `CONTEXT_DEGRADED`. A runtime item owned by Native Approval returns `NOT_FOUND` to this dock. The Host resolves the Session and returns at most one current/latest eligible assessment. Enforce exact keys, identifier limits, Session scoping, abort handling, and response-size bounds.

The response exposes only assessment ID, execution ID, **an optional already-Harness-visible bounded opaque `callId` for UI suppression**, stage/status, timestamps, severity/recommendation, existing deterministic reason/dimension presentation, bounded safe reason codes, and explicit degradation. Never expose internal raw command or resource hints. If a reliable bounded callId is unavailable, omit it and make the Client suppression conservative. It must not expose seed, prompt, raw args, operation text, path/resource hints, file content, result body, approval data, internal context snapshot, or arbitrary diagnostics.

Register one `conversation.input.dock` entry with id `risk-advisor-runtime-risk-awareness`, order 20. It displays one compact informational row for the active Session: risk level, advisory recommendation, one primary reason and a visible degraded/unknown caveat. An inline disclosure may show the remaining sanitized assessment; it has no approval button, permission action, confirmation flow or second modal. The copy must say this is advice and identify that its evidence was captured before execution.

When a uniquely correlated Native Approval claims the same execution, the Host marks the runtime row `OWNED_BY_NATIVE_APPROVAL`; the runtime endpoint immediately suppresses it. The existing `conversation.approval.detail` reuses the same **deterministic A1 base assessment ID**; later approved Judge/Evidence revisions retain their own IDs and frozen provenance.

**Client suppression must not rely on one-second polling alone**: the pinned Harness `@deepseek-ai/dsh-client-ui-session` already exposes read-only `useSessionStatus`; its `pendingInteraction` can be a native `PendingApproval` (`kind: 'approval'`, optional `callId`). The dock must use that *existing* reactive status and hide its cached item **during a matching pending approval**, even before its next RPC result arrives. Match by exact Session + bounded `callId` when both exist; when either callId is missing, suppress conservatively while that Session has a pending approval. Never register a second approval subscriber, answerer or state machine, and never change pendingInteraction. On native approval settlement, recompute eligibility from fresh Host state rather than resurrecting a stale cached item. Tests must verify this client-stale-response race. No duplicate approval prompt, second approval window or independent authorization control is permitted. Online Correction remains independent at order 10.

### 5. Bounds, privacy and lifecycle

- No Phase 14.1 persistence, schema migration, `storageDomain`, disk cache or new canonical record. The base assessment is process-local and memory-only.
- At most 256 assessment records across the runtime generation; at most 64 queued deterministic assessments. Queue overflow degrades/drops only the advisory. It never back-pressures the Tool. Every record has a 10-minute hard TTL; a non-approval row has the earlier 30-second-after-result/next-assessment expiry described below.
- At record capacity, evict the oldest expired/settled non-approval record only. Never evict a pending scorer or approval-owned record to make room; if none is eligible, report `CAPACITY_EXCEEDED` for the new advisory and continue the native path unchanged.
- Reuse existing bounded seed/user/history limits and cap the newly retained serialized snapshot at 24,000 characters. If optional context must be omitted to meet the cap, set the existing degraded/omission semantics. Never retain raw Tool arguments beyond the existing capture path.
- A non-approval assessment row expires 30 seconds after its `tools/result` or on the next assessment for that Session, whichever comes first. An exact approval ownership transfer keeps the same base record protected from the non-approval eviction path; it follows the existing ApprovalAssessmentCoordinator 10-minute bound and closes on native decision/session disposal. In all cases generation disposal cancels pending work and clears snapshots, records, timers and Session associations.
- Do not hold a strong Session or ToolExecution reference beyond capture; no raw prompt or seed is returned to the browser. The deterministic `RiskAssessment` is the only retained content after a non-approval snapshot is scored.
- Client lifecycle follows the accepted Phase 12.2 contract: one stable store per Session, render only reads, retain/release in effects, one-second polling only while retained, abort/unsubscribe on stop, restart support, and full client disposal cleanup. No polling of inactive Sessions.

### 6. Budgets and acceptance evidence

- Added synchronous pre-execute work: bounded snapshot/record insertion only; p95 ≤ 1 ms and p99 ≤ 2 ms in the focused integration fixture. No synchronous six-dimension scoring in the awaited hook.
- Deferred deterministic scoring: p95 ≤ 5 ms for the frozen maximum input (32 findings); the Tool pipeline never awaits it. Queue saturation, exception or teardown yields an unavailable advisory.
- Client bridge: at most one request per retained Session per second; no request after final release. Payload ≤ 24,000 characters.
- Verify no model/provider/Judge/subagent/network/storage calls in the **new ordinary-Tool deterministic assessment path**. Existing approval-associated optional Judge/Evidence and existing Phase 11 storage are unaffected; their already-authorized behavior is not disabled by this rule. Do not use a real Phase 13 campaign for acceptance.

## Explicit non-goals

No Harness Core, ToolRuntime, permissions, sandbox or native approval behavior changes; no allow/deny/ask or Tool execution control; no second rule engine or approval mechanism; no F1/F2, Online Correction, Phase 11, Phase 13.2 truth, or package contract change; no Phase 13.3 campaign; no Phase 13.4; no generic Adapter; no persistence, Agent-context injection, auto-retry, auto-correction, model/Judge participation or new evidence verifier.
