# Risk Advisor Phase 14.3 — Independent Architecture Review

## Review decision

**RISK_ADVISOR_PHASE14_3_ARCHITECTURE_ACCEPTED_IMPLEMENTATION_AUTHORIZED**

**Reviewer and design authority:** ChatGPT (not Codex self-freeze).
**Scope:** Native Approval Verified Historical Context, display-only, qualified evidence; this review authorizes a later Codex implementation, **not** Product acceptance.
**Source baseline:** Dhandil/dsh-risk-advisor main beb2fc561f90b3b7673f865097647034c8958a29.
**Last accepted Product executable:** ab0aeec26d07bcc8a044bbec03cbb587386d1c73.
**Pinned Harness:** deepseek-ai/deepseek-harness ddefc45fbc7f8e46dd73185e68295696d1297887.

## Directly reviewed anchors

At the pinned Risk Advisor Product baseline, the reviewer examined:
- src/index.ts event capture/retirement order; src/host/runtime-risk-awareness.ts capture, approval claim, current ordinary historical Pattern and lifetime;
- src/host/assessment-envelope.ts approval/asked, approval/decided, per-Session approval record, active-by-call query, stable A1 reuse and optional Judge/Evidence revisions;
- src/host/browser-bridge.ts current read-only Host routing and historical RPC;
- src/historical-context-contract.ts strict historical DTO and frozen Phase 11 render fields;
- src/client/RiskAdvisorDetail.tsx, presentation-client/store.ts, assessment-bridge.ts, components/RiskAdvisorCard.tsx, runtime-risk and historical-context Client stores;
- Phase 14.1 and 14.2 accepted architecture/final reports, Phase 11 qualification and Harness-native Risk Intelligence Boundary V1.

The reviewer also read **pinned Harness** packages/client/ui-approval/src/client/contract/slots.ts, index.ts and ApprovalPanel.tsx, confirming that approval detail owner props expose only callId; PendingApproval.key is Client-generated per pending interaction; ApprovalFlow remounts with that key. This is a critical Host/Client identity separation.

## Independent architecture decisions

**D1 Scope selection.** No existing accepted Phase 14.3 roadmap was found. Select the smallest useful incremental capability explicitly deferred by Phase 14.2: show the same verified historical note in Native Approval detail without promoting prior verified successes into current safety/approval.

**D2 Identity and authority.** Do not equate PendingApproval.key with Host approvalId or select by assessment latest ID. Host resolves exact Session+callId to one still-open uniquely BOUND approval, then binds Host approvalId+ExecutionId+stable A1 base. Client uses PendingApproval.key only to clear its own current view on remount or closure.

**D3 Separate approved-only Pattern access.** The ordinary Phase 14.2 accessor requires a latest ordinary row and rejects approvalOwned, which is correct. Never relax it. Use a distinct Host-private approval-owned accessor for the original captured Pattern ID, requiring exact Session/ExecutionId/A1 ownership and TTL. Legacy approval-only fallback and unavailable base produce no history.

**D4 Same historical truth; separate wire.** New local read-only approval-historical-context endpoint; response reuses exact Phase 14.2 historical guidance fields, recomputed at each Host read against current READY/ACTIVE/QUALIFIED revision/digest. Do not mutate existing risk, approval presentation, ordinary history RPCs or Phase 11 writes.

**D5 Native control remains sovereign.** Approval detail is a single existing slot within the native ApprovalPanel; place a separate, initially collapsed advisory section below current risk judgment, retaining all current risk information and both native decision buttons. Do not add a second dock, action/modal, user confirmation, auto-approval, risk downgrading or Reviewer/Agent prompt.

**D6 Honest freshness.** Host retraction applies on next Host read, Browser display is bounded to <1500ms measured from Host observedAt, with immediate local clearance on PendingApproval changes. An historical success is Host-storage-scoped structural equivalence; same target/Workspace/project/goal is not established.

**D7 Bounded optionality.** Per-active-approval ≤1 RPC/s and bounded exact-index history read. No wait inside an approval/Tool waterfall; optional storage/Client errors hide history only. Existing risk and F1/F2 remain independent. Keep deterministic tests and capacity pressure truthful: 3,333 maximum actual qualified identities from 10,000 Episode cap, synthetic 60,000 only as index load.

## Decision and verification scope

Architecture decision: **PASS** as an independently source-informed design; no Product modifications or tests were performed by the architecture reviewer. The architecture package consists solely of new Markdown files. This review does not clear Phase 13.3's real-Agent campaign, does not authorize Phase 13.4, and does not accept any future Phase 14.3 executable until an independent implementation review.

**Codex handoff:** execute only Phase14_3_Implementation_Instructions.md and the companion Freeze after the docs have landed on origin/main. Full A1–A12 and fresh Canonical Full are mandatory; Codex must not self-freeze, self-accept or merge implementation without ChatGPT review.
