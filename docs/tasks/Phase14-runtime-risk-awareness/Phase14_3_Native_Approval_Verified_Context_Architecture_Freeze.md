# Risk Advisor Phase 14.3 — Native Approval Verified Historical Context Architecture Freeze

**Architecture decision:** RISK_ADVISOR_PHASE14_3_NATIVE_APPROVAL_VERIFIED_CONTEXT_ARCHITECTURE_FROZEN
**Architecture owner:** ChatGPT (independent design and acceptance). **Implementation owner:** Codex, only after documentation acceptance.
**Starting main:** beb2fc561f90b3b7673f865097647034c8958a29
**Accepted Phase 14.2 executable:** ab0aeec26d07bcc8a044bbec03cbb587386d1c73
**Pinned Harness:** ddefc45fbc7f8e46dd73185e68295696d1297887

## 1. Decision and scope

There is no previously authorized Phase 14.3 roadmap in this repository. This separately frozen Phase is deliberately narrow: **display one currently eligible Phase 11 verified historical Guidance note within the existing Harness Native Approval detail**, alongside but not inside its accepted risk assessment. This closes the explicit Phase 14.2 deferral of history in Native Approval; it does not expand normal-Tool historical matching.

Authority chain remains: Harness owns Tool execution/permission/approval; the ApprovalAssessmentCoordinator owns active approval identity; RuntimeRiskAwarenessRuntime owns exact pre-execution Pattern projection; GuidanceRuntime alone owns historical eligibility; the Browser only renders the resulting advice. Historical structural equivalence **does not establish matching target, Workspace, concrete command, goal success, current safety, or approval appropriateness**. Evidence from prior successful Tools never implies a learned permission.

Phase 14.3 adds no approval flow, second risk score, reviewer input, Agent prompt, history writer, storage domain, query-by-Pattern API, new postcondition verifier, target lookup, or Tool mutation. Phase 13.3 BLOCKED/PARTIAL remains unchanged; Phase 13.4 and any further phase remain unauthorized.

## 2. Source-verified anchors and identity problem

- Harness pinned ui-approval contract: conversation.approval.detail owner provides **callId**, in a Session-scoped slot. The Client PendingApproval.key is a *Client-local rendering identity* (approval:N), **not** the Host approvalId; do not correlate them or send key as Host identity. ApprovalPanel remounts the keyed ApprovalFlow and already renders the optional detail beneath Native Approval actions.
- RiskAdvisorDetail consumes (sessionId, callId) with PresentationClient/PresentationStore. The existing ApprovalAssessmentCoordinator.queryActivePresentationForCall(session, callId) resolves zero, one, or ambiguous still-open approval records. ApprovalAssessmentCoordinator observes approval/asked and approval/decided, and uniquely binds an approval to ExecutionId through ActiveExecutionIndex.
- At approval/asked, accepted Phase 14.1 claimForApproval(session, executionId) transfers ownership of the per-execution base. Its BASE/A1 assessmentId remains stable even if later Fast/Deep Judge stages create new assessment revisions.
- Phase 14.2 RuntimeRiskAwarenessRuntime.currentHistoricalPatternId deliberately **rejects approvalOwned** and requires the latest ordinary UI row. It MUST remain unchanged. The frozen pre-execution Pattern ID may already exist on that same per-execution record; native approvals require a **separate approval-only exact read seam**, never relaxing the ordinary lookup.
- Phase 14.2 GuidanceDiagnostics.currentForPattern is an exact indexed, readiness-checked and provenance-checked read. The frozen renderGuidance produces five fixed fields. The historical record does not contain concrete Workspace/target identity.
- Native Approval UI's user-visible PendingApproval.key and the Host's approvalId have no proven equivalence. Browser-managed freshness and Host approval binding must be independent.

## 3. Host ownership and active approval matching

Provide one bounded, Host-private Approval Historical binding query, called only from a separate optional read-only RPC. A successful match requires **all** of:

1. Exact Session object resolved through current SessionStore, bounded exact callId, and exactly one **open** ApprovalAssessmentCoordinator record for that Session + callId. Zero or multiple records, closed/decided/cancelled approvals, ambiguous correlation, disposed Session or generation => NOT_FOUND.
2. Approval shell is BOUND to the unique recorded ExecutionId, has a valid phase5 A1 base, and the coordinator's immutable A1 assessmentId agrees with the current RuntimeRiskApproval-owned base for that exact Session + ExecutionId. A later latest assessmentId need **not** equal A1; never bind by latest Judge/Evidence revision or by command fingerprint.
3. RuntimeRisk's **new distinct approval-owned accessor** must find the same original pre-execute record, owned by Native Approval, unexpired and not UNAVAILABLE. The accessor returns only the previously captured opaque historicalPatternId and identity comparison result. It may resolve approval A even when ordinary latest row is B. It never fabricates a Pattern for legacy approval-only fallback and never reads raw Tool arguments or reparses shell.
4. The Host reads GuidanceDiagnostics.status() and currentForPattern(patternId) **on each accepted request**; only current READY / ACTIVE / QUALIFIED revision with exact linked Pattern revision and provenance digest may be displayed. Call existing renderGuidance verbatim, with no generated paraphrase. A suspended, invalidated, conflicted, lagging, detached or unavailable source yields no VIEW.
5. Reconfirm live approval and exact identity before returning a VIEW. A missing/ambiguous/closed/currently unmatched approval is NOT_FOUND; source or bounded projection failures are UNAVAILABLE. No caller-controlled Pattern ID, approvalId, ExecutionId, assessmentId or historical source selector is accepted.

An approval can safely have **no** matching history. Optional history is never required for the original approval detail, Tool dispatch, approval decision, or Risk Engine. No historical lookup in approval/asked, approval/request, tools/pre-execute, tools/result, the Risk Engine/Judge/Evidence path or any awaited Harness waterfall.

## 4. Separate read-only RPC and DTO

New independent route and method:
- POST /api/risk-advisor/approval-historical-context
- risk-advisor/approval-historical-context
- request exactly { sessionId: string, callId: string } with existing bounded exact-key validation.

Response schemaVersion=1; strict tagged union:
- VIEW: {kind:'VIEW',schemaVersion:1,sessionId,callId,approvalId,executionId,baseAssessmentId,historical,observedAt}
- NOT_FOUND: {kind:'NOT_FOUND',schemaVersion:1,sessionId,callId}
- UNAVAILABLE: {kind:'UNAVAILABLE',schemaVersion:1,sessionId,callId,reasonCodes:[...]}

VIEW historical is **exactly** the accepted HistoricalContextV1 payload of Phase 14.2: opaque Guidance/Pattern provenance IDs, counts and fixed title/observation/contextCaveat/nextCheck/authorityNotice. approvalId/executionId/baseAssessmentId are Host-projected opaque correlation identifiers, not Browser query selectors. Do not echo raw Tool inputs, target, Workspace, command, user/Agent messages, storage keys or ExpectedEffect. NOT_FOUND must not distinguish absent, ambiguous or closed approval. UNAVAILABLE has only fixed safe reasons GUIDANCE_UNAVAILABLE or PROJECTION_UNAVAILABLE. Enforce bounded response <=24,000 serialized characters; use strict request/response parsers, deep-freezing, abort checks and current-generation validity.

Keep the existing risk-advisor/active, risk-advisor/assessment, risk-advisor/runtime-risk, risk-advisor/historical-context and Online Correction wires byte-compatible. Do not change existing Phase 14.2 ordinary history DTO or approval detail presentation V2–V4.

## 5. Browser presentation and lifecycle

Stay **inside the existing conversation.approval.detail slot and RiskAdvisorDetail**. The ordinary Phase 14.1 dock remains hidden during Native Approval and the Phase 14.2 ordinary sidecar continues to be suppressed. Extend only the existing advisory detail with one optional, initially collapsed informational historical section **below the current risk judgment**, visibly titled “Verified historical context — advisory only”. Retain all five exact frozen renderGuidance fields and display above them the fixed warning “Host-storage-scoped history; target and Workspace applicability unproven.” Never show green success/approved badges, approval probability, ranking, second dialog, “approve/apply/execute” action or copy suggesting a previous approval authorizes this one. Existing Harness Allow Once / Reject controls remain sole decision UI.

A **dedicated optional approval-history client/store** is scoped to (sessionId, callId, current PendingApproval.key) and the exact live existing approval presentation. PendingApproval.key is Client-local lifetime fencing only, **never an RPC field or Host approvalId**. Require a live PendingApproval with exact Session + callId and a READY / BOUND current RiskAdvisor presentation before rendering history. On remount/key change, pending approval disappearance, callId/Session change, native decision, presentation unavailable/ambiguous, generation change, stop/unmount/dispose: immediately clear, abort in-flight requests and refuse stale completions. Preserve the single original approval panel/card and its independent error boundary; optional-history exceptions must not replace or hide the risk assessment.

For one retained approval, at most one optional Host history read per second (no accumulation, no unbounded Session fanout), with a single flight and bounded timers/subscriptions. A successful VIEW is a **point-in-time** Host snapshot. Use Host observedAt as the age origin, refuse Host age >=1500ms, and expire display at the **remaining** duration, not 1500ms after receipt. Client PendingApproval change revocation is reactive; Host Guidance revocation takes effect on the next Host read, and Browser freshness is bounded, not falsely described as instant. Do not cache active history in the base risk record or persist browser delivery.

If history is absent or errors, do not display a history section, spinner that delays approval, or unavailable-state card. Preserve original risk details, Online Correction F1/F2 and native controls.

## 6. Performance, privacy, and invariants

Use existing bounded per-Session coordinator records and exact Pattern/Guidance indexed lookup. No all-history enumeration, no new Storage Domain handle, no read in an approval or Tool waterfall, no model, no outbound provider/network beyond the existing local RPC transport, no changes to Phase 11 writer/eligibility/identity, Phase 14.1 scoring, Phase 14.2 ordinary path, permissions, policy or native approval results.

The accepted Episode maximum 10,000 and minimum three distinct Episodes per qualified Pattern implies at most 3,333 simultaneous qualified identities under current contracts. For H10 tests use real qualified 1 / 1,000 / 3,333 where relevant, and optionally 60,000 **synthetic non-qualified index** pressure as a separate, accurately labelled benchmark. Never request 60,000 real qualified histories. Reuse Phase 14.2 validated performance helpers where possible; report additional approval-correlation overhead and no Tool/approval waterfall latency regression. Retain historical query p95 <=5ms and p99 <=10ms over these bounded cases in the same controlled environment; record measured execution context and never infer a global SLA from fixtures.

No new persisted approvals/history, usage telemetry, user preference inference, prompts or logging of raw identifiers/content. A history match is structural only and cannot override an adverse or unknown current risk.

## 7. Mandatory deterministic proof matrix

| Proof | Required outcome |
| --- | --- |
| A1 provenance | Valid Phase 11 active qualified Pattern+Guidance, exact digest/revision; unqualified/two-episode/same-day/exit-0-only sources never VIEW |
| A2 identity | Session + callId unique open approval; exact approvalId + ExecutionId + stable A1 binding; do not equate Client key with Host ID |
| A3 approval ownership | Claim succeeds before any VIEW; no history for approval-only fallback, unbound/ambiguous, missing runtime record or expired owner |
| A4 concurrency | Same-Session A approval with newer ordinary B; cross-Session same callId; duplicate/reentrant approvals; never borrow history |
| A5 retraction | Pattern suspension/invalidation, Guidance lag/conflict/detach, approval decided/cancelled, Session/generation disposed => next Host read NOT_FOUND/UNAVAILABLE |
| A6 wire/privacy | Exact request keys, strict response union, safe reason allowlist, no raw target/prompt/path/Tool args; limit + abort |
| A7 UI ownership | Existing approval panel/detail & Allow/Reject unchanged; no duplicate dock/dialog, no effect on risk severity/approval |
| A8 Client races | Local pending key changes, same callId reuse, late VIEW, presentation stale/ambiguous, unmount/connection generation cannot resurrect a note |
| A9 freshness | ≤1 read/s and Host observedAt-based <1500ms total age; 1499ms/1500ms response edge cases |
| A10 optionality | Missing/error/slow history does not modify or delay Harness/native approval, Phase 14.1 assessment, F1/F2 or ordinary Tool history |
| A11 performance | Bounded unique approval correlation and exact Guidance query, 1/1000/3333 trusted history sizes, synthetic 60k indexed pressure separate |
| A12 regression | Phase 11.1–11.4, Phase 14.1, Phase 14.2, P1B/P1C, P6/P10, native approval and Online Correction; package/browser bundle; exactly one fresh complete Full |

All proof fixtures must use existing qualified history through trusted Episode -> Outcome -> Pattern -> Guidance flow. Synthetic fixture successes cannot substitute for Guidance eligibility or provenance.

## 8. Non-goals and handoff

No new risk score, feedback-trained approval, native policy control, historical lookup in Fast/Deep Judge prompts, target/workspace-aware history, auto-correction, new F1/F2 detection, new Agent actions, PAH integration, real Phase 13.3 campaign or broader Phase 14.4 authorization.

The architecture owner independently accepts this **design only**. Codex may implement after this docs-only Freeze is accepted on main, and must return execution evidence for independent review. Design acceptance is not implementation acceptance.
