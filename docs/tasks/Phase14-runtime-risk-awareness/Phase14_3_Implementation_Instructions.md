# Risk Advisor Phase 14.3 — Implementation Instructions

**Architecture owner:** ChatGPT. **Execution owner:** Codex.
**Frozen authority:** Phase14_3_Native_Approval_Verified_Context_Architecture_Freeze.md.
**Accepted starting main:** beb2fc561f90b3b7673f865097647034c8958a29 plus this docs-only Phase 14.3 architecture package.
**Accepted executable predecessor:** ab0aeec26d07bcc8a044bbec03cbb587386d1c73.
**Pinned Harness:** ddefc45fbc7f8e46dd73185e68295696d1297887.
**Gate:** RISK_ADVISOR_PHASE14_3_IMPLEMENTATION_AUTHORIZED after docs are present on origin/main; implementation and final Product acceptance remain separate.

## Preconditions

Sync the exact docs-accepted origin/main, verify it contains the Phase 14.3 Freeze and Architecture Review, inspect the accepted Phase 14.1/14.2 Product and pinned Harness approval slot. Work in a dedicated implementation branch; do not implement before matching the frozen authority and pinned Harness. Preserve unrelated user files, retained test worktrees, untracked lib/, node_modules/ and .vitest-cache/. Never force-clean or force-update refs.

## Bounded implementation slices

**S1 Host exact approval binding.** Add a narrow Host-private query on ApprovalAssessmentCoordinator to resolve one currently open, uniquely BOUND approval from exact Session object + callId, providing host-owned approvalId, ExecutionId and base A1 assessmentId. Prove identity under overlap, same-callId reuse and ambiguous/closed cases. Add distinct RuntimeRiskApproval-owned Pattern projection accessor with strict original Session/ExecutionId/baseAssessmentId identity, ownership and TTL gates. Preserve the Phase 14.2 ordinary currentHistoricalPatternId behavior without broadening it; do not copy/reparse Tool arguments.

**S2 Current Guidance.** New optional Host RPC reads only the same GuidanceDiagnostics.currentForPattern and accepted frozen renderer, with exact provenance/readiness/revision gates at read time. Revalidate current approval before returning. No new historic writer, new qualification, extra storage handle or scoring.

**S3 Independent protocol.** Implement the separately versioned approval-historical-context route/method and exact {sessionId,callId} request with VIEW/NOT_FOUND/UNAVAILABLE V1 as frozen. Bind response Host approvalId + ExecutionId + baseAssessmentId, fixed historical DTO, abort handling, ≤24k chars, strict Parser, safe reason codes and deep freeze. Do not change risk-advisor/active, /assessment, /runtime-risk or /historical-context V1 contracts.

**S4 Browser approval detail.** Extend only RiskAdvisorDetail's existing conversation.approval.detail composition with a separate optional history client/store. Gate presentation on a matching live Session-scoped PendingApproval and its locally scoped key (not Host approvalId), matching callId and READY/BOUND risk presentation. Attach below the unchanged original risk assessment, initially collapsed, with fixed target/Workspace caveat, five unmodified Guidance fields, no second dialog/dock/approval button. Separate error containment: a history failure never replaces RiskAdvisorCard.

**S5 Lifetime and performance.** Abort/clear on approval decision, key change, Session/callId change, ambiguous or unavailable risk presentation, unmount/stop and connection generation reset. At most one local history read per retained approval per second, single-flight. Enforce observedAt-based <1500ms end-to-end freshness including delayed responses, and no stale response resurrection. Keep lookup outside all Tool/approval waterfalls, bounded exact indexed Guidance and bounded coordinator scan; benchmark approved real-history sizes within existing capacity.

## Mandatory gates

Prove the full A1–A12 matrix in the Phase 14.3 Freeze, using actual qualified history fixture pipeline. Include: A/B overlapping executions where A Native Approval is open and B ordinary is latest; cross-Session same IDs; duplicate or ambiguous approvals; no legacy fallback history; Host approval decision before a late VIEW; repeated Client key while callId unchanged; Fast/Deep latest assessment ID differing from base A1; presentation unready then ready; history invalidated between reads; 1499ms and 1500ms timestamp edges; exact request/response parser and raw-argument privacy; no original approval or risk mutation.

Run new focused tests, relevant Phase 11, 14.1, 14.2, approval P1B/P1C/P6/P10, Phase 12 Online Correction regressions, typecheck, production build and real browser bundle load, exports/declarations/pack, static/privacy/source freshness checks. Include **all Phase 14.3 tests in the canonical package.json pnpm test script** before final full validation. After all pre-Full gates pass, run **one fresh complete pnpm test on one final exact executable SHA** in clean isolated infrastructure. Do not silently repair and repeat a failed Full under the same candidate; report it for independent architecture review.

Report exact identity and count of qualified history vs separate synthetic index entries. Do not claim 60,000 simultaneously qualified history entries; use 1/1,000/3,333 eligible checkpoints where testing relevant, synthetic 60k only as a correctly labelled index pressure case. Report median/p95/p99 optional read latencies, Host/Client costs, and confirm no introduced Tool/approval waterfall I/O.

## Hard exclusions

No Harness Core changes, no approval/request answerer, native permission/sandbox/control changes, no Policy Decision or Tool mutation, no Phase 11 writer/schema/identity changes, no Phase 14.1 risk dimensions/threshold changes, no Phase 14.2 ordinary history semantic changes, no F1/F2 taxonomy changes, no Agent prompt injection, real provider/subagent calls, broad new Framework integration, Phase 13.3 campaign or Phase 14.4 implementation. Do not revise the Architecture Freeze or self-accept the Product.

## Publication and review

Publish Phase14_3_Execution_Report.md on implementation branch only: starting SHA, exact tested executable SHA, focused and regression counts, one complete pnpm test result, Browser bundle and privacy evidence, performance and freshness, lineage/cleanliness, Harness SHA, scope diff and retained local artifacts. Do not merge main. Return exactly:

- RISK_ADVISOR_PHASE14_3_IMPLEMENTATION_READY_FOR_ARCHITECTURE_REVIEW; or
- RISK_ADVISOR_PHASE14_3_BLOCKED_<specific-cause>.

ChatGPT alone decides Product ACCEPTED/REPAIR/BLOCKED after independently reviewing remote source and execution evidence.
