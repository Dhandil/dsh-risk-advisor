# T06 — Spike Closure & Product Phase 1 Preflight | Architecture Freeze

**Status:** FROZEN FOR DOCS-ONLY PREFLIGHT; acceptance is reserved to ChatGPT Web.  
**Date:** 2026-09-29.  
**Task directory:** `docs/tasks/T06-product-phase1-preflight/`.  
**Plugin checkpoint:** `Dhandil/dsh-risk-advisor`, `main @ 9b453fdfcd06d70ad9497a99ed88609a9fb0c923` (T05 bounded benchmark accepted).  
**Harness verification target:** local pinned `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887` — STRICTLY READ-ONLY. The separately observed upstream `4878cdabd87d4041bdaff61d04c966883b9fd07a` remains `NOT_VALIDATED`, not an implicit new baseline.

## 1. Why this task exists

T00–T05 were architecture/static preflight and five **focused runtime validations** under frozen Architecture §46. Their bounded acceptance does NOT mean Risk Advisor V1 as defined in §47, the V1 Spec, or the canonical Test Matrix has been implemented/released. We now transition to the product implementation roadmap in Architecture §47, whose first formal phase is **Phase 1 — Host Skeleton**. This T06 is a **documentation-only transition gate**: independently inventory the real plugin, preserve the accepted proof levels/open gates, compare them with the Phase 1 product contract, and propose a sufficiently narrow first executable slice for separate subsequent architecture approval.

**T06 is NOT R6, NOT Phase 1 executable implementation, NOT a full V1 acceptance, and NOT permission to fix the upstream Harness or to replace the T01 fixture.** No code/test/config/dependency/migration/Browser/product changes, no full regression, no benchmark repetition, no provider calls.

## 2. Immutable governing facts and proof ladder

Read the actual source and all frozen documents, rather than silently promoting a test's label into broader capability. The governing reference is `docs/baseline/risk-advisor-v1-architecture-v1.2.md` (especially §§1–5, 7–9, 13, 43–47), `risk-advisor-v1-spec-v1.2-r1.md`, `risk-engine-contract-v1.0-r1.md`, `risk-advisor-test-matrix-v1.0-r1.md`, the T00–T05 actual reports and committed implementation, and `docs/governance/Collaboration_Workflow.md`.

The preflight must carry forward these **independently bounded** outcomes and must verify the concrete remote code rather than relying solely on them:

| Item | Accepted evidence / must-not-claim boundary |
|---|---|
| T00 | Baseline/packaging and initial architecture foundation; not production functionality. |
| T01/R1 | Additive native ApprovalPanel detail **fixture** plus package/jsdom tests; *deployed Live Browser gate OPEN*. Fixture is not the real RiskAssessment UI. |
| T02/R2 | Host real ToolRuntime traversal, fresh live ExecutionId, exact Session-object/callId active candidate-set, approval audit observation. Diagnostic facade is read-only. Never use a historical callId as identity. |
| T03/R3 | Conservative source-backed durable PTC replay/edge resolution and degraded evidence; actual native PTC producer **NOT_RUN**. Historical occurrence is not a live ExecutionId. |
| T04/R4 | Bounded independent Live and Durable Ledger facts and fault recovery. F-006 full exact Live/Durable confirmation, F-007 positive cross-plane conflict and F-013 cross-plane replay/live dedupe remain **PARTIAL / OPEN** without an exact invocation witness. Separate facts are NOT proof of two physical executions. True disk/process restart **NOT_RUN**. |
| T05/R5 | Real pinned-runtime approval baseline/treatment and measured current component overhead; simulation is explicitly simulation. Assessment/Context Builder/Judge/Publisher do not exist in production. `T_sync` only paired-delta estimate; the six provisional policy fields remain **UNDETERMINED**. Main benchmark 300 baseline + 300 treatment, 20 warmups; shared desktop host caveat. |

Other gates: newer Harness Session V4 is `NOT_VALIDATED`; production Host-to-Browser assessment bridge does not exist; T01 Live Browser is `NOT_RUN`; real PTC producer is `NOT_RUN`; no `ApprovalOutcome` may be returned by Risk Advisor. Do not invent closure from unit, manual Session.append, or simulated tests. Latest published T05 `main` is `9b453fdf...`; post-Tested T05 changes are only report/policy/evidence.

## 3. Product Phase 1 inventory — classify rather than duplicate

Architecture §47 names Phase 1 Host Skeleton: Plugin lifecycle, OperationObserver, ExecutionId minting, OperationNormalizer, ExecutionBoundaryCollector, SnapshotStore, ActiveExecutionIndex, AssessmentStore, `approval/asked` observer, Browser read endpoint. **No LLM in Phase 1.** The product skeleton must reuse, not rebuild, accepted R2/R3/R4 mechanisms where they satisfy the contract.

Produce a matrix with for each target: canonical section/type, exact file/symbol/test presently implementing it (if any), status `IMPLEMENTED_AND_BOUNDED | PARTIAL | FIXTURE_ONLY | NOT_IMPLEMENTED | BLOCKED_BY_UNVERIFIED_SEAM`, source of proof, missing behavior, dependency, and proposed phase/subtask. Verify at minimum:

- `src/index.ts` Host apply/inject/Context provision/effect and preservation of Native Approval.
- `src/host/correlation.ts` real live ExecutionId capture/index and `approval/asked` lookup, including exact internal identity access vs external read-only diagnostics.
- `src/host/ptc-replay.ts` and `src/host/ledger.ts`: these are useful inherited components, NOT proof that snapshot/normalizer/assessment exists.
- `src/client/index.ts`, `src/client/RiskAdvisorDetail.tsx`, fixture store: T01 additive testing surface, NOT product Host-to-Browser bridge/real assessment renderer.
- Product gaps: `OperationSnapshot` v1; known-tool closed normalizer (`unknown` fallback); public-evidence-only `ExecutionBoundaryEvidence` with `sandboxActive != sandboxCovered`; ephemeral/private SnapshotStore with bounds, cleanup, and no raw arguments exported/persisted; `AssessmentEnvelope` store; bounded `approval/asked` AssessmentCoordinator trigger/ambiguous/unavailable; safe Browser read transport/DTO only once exact ownership/public seam is verified.

**Do not assume** T04 establishes exact Live/Durable identity merely because both facts exist. A positive cross-plane confirmation requires a verified exact invocation witness; Phase 1 must be viable in degraded mode without it. Never infer that a unique `(Session, callId, name)` is an invocation identity.

## 4. Proposed implementation split to be investigated (not executable approval)

T06 shall propose a small sequence rather than one oversized Phase 1 coding task:

- **Candidate Phase 1A — Exact Live Operation Foundation:** reuse T02's actual ToolExecution witness and one minting path; capture bounded immutable/private OperationSnapshot; closed known-tool Normalizer with `unknown` fallback; collect only proven public execution/workspace/sandbox/target boundary values, otherwise `unknown`; bounded ephemeral SnapshotStore; lifecycle/exception/dispose isolation. No risk score, no approval answer, no LLM and no Browser transport.
- **Candidate Phase 1B — Approval-bound Assessment Envelope:** on committed `approval/asked`, use exact active lookup with `FOUND/AMBIGUOUS/NOT_FOUND`, bind a new assessmentId only when proven, create `pending/unavailable` typed envelope, preserve result/approval lifecycle, expiry, and native path independence. No guessed historical binding or risk judgment.
- **Candidate Phase 1C — Safe Host read surface + actual Browser DTO seam:** verify public Host/Browser transport and exact Session/Approval identity before freezing any implementation; do not directly replace the T01 fixture or conflate browser mock with product UI. Native fallback remains functional.

These are **candidate cuts**. Codex should inspect whether public seams, exact internal adapters and dependencies make them feasible, then output a proposal and unresolved decisions. ChatGPT Web will freeze the next actual coding task after review. Do not silently expand Phase 1 to §47 Phase 2–10 (Failure Analyzer, Rule Engine, Judge, Evidence, Deep Judge, real product UI).

## 5. Required T06 deliverables

Under `docs/tasks/T06-product-phase1-preflight/`, create/update exactly these task-specific documents (filenames fixed):

1. `Spike_Closure_and_Open_Gates.md`: T00–T05 checkpoint ledger, each actual evidence level and inherited OPEN gate, owner/dependency/unlock condition; separate product/compatibility/safety/performance gates and distinguish Spike accepted vs V1 release NOT READY.
2. `Product_Phase1_Gap_Manifest.md`: Architecture §47 Phase 1 one-to-one current symbol/test inventory, proof/absence, exact dependency graph, conflicts with T02/R4 and T01 fixture, protected source/constraints, and safe reuse plan.
3. `Phase1A_Architecture_Proposal.md`: one **proposed** bounded Phase 1A coding slice with contract inputs/outputs, exact-public-seam check questions, privacy/lifecycle, P0 safety and focused/Host integration proof plan, alternative/STOP if a seam is unavailable; list Phase 1B/1C as deferred decisions. This is not a final authorized product architecture freeze.
4. `Execution_Report.md`: Codex's evidence and preflight result, sources read, local/remote verification, docs-only diff, drift protections, test/provider/Browser counts and exact published SHAs. No `Acceptance_Report.md`.

The two supplied freeze/instruction files must also be committed as part of this task. Do not copy all historical reports or edit frozen `docs/baseline/**` and accepted T01–T05 documents.

## 6. Required acceptance and STOP gates

- **One documented capability, one proof level**; distinguish directly seen code, Codex report statements and ChatGPT prior independent acceptance. If something is ambiguous, say `UNVERIFIED` rather than guessing. T04 F-006/007/013 and R5 undetermined fields stay open.
- Product intent and minimal integration must preserve **P0-01/02/03/04/10/11/12** from Test Matrix. No Risk Advisor listener claims Approval Authority, no native outcome change, no implicit `APPROVE` on critical unknown evidence.
- Identify concrete next-task seam questions, scope and negative tests. The first executable task must not depend on T01 deployed Browser or genuine PTC producer if a safe Phase 1A slice can proceed without them; represent any dependency honestly.
- Scope is **docs-only**. No need to re-run already published 66 tests or R5 benchmark; record `NOT_RUN (docs-only)` instead. Audit `git diff`, stage only intended T06 docs. This task's only network actions may be Git remote inspection/publication. Harness tree and `.git` remain read-only and pinned; never fetch/upgrade/reset/clean/rebase/force-push. Preserve known and newly discovered user drift.
- STOP with `T06_ARCHITECTURE_DECISION_REQUIRED` for material contradiction with frozen product spec, inability to map exact identity ownership, unexpected Git divergence, needing to edit Harness Core, protected work, baseline or already accepted product files, or lack of permission to publish. No next coding stage without independent approval.

**Expected Codex outcome:** `T06_PHASE1_PREFLIGHT_READY_FOR_REVIEW` if all docs are source-grounded and normally published; otherwise `T06_BLOCKED` / `T06_ARCHITECTURE_DECISION_REQUIRED`. This is an evidence handoff, not an `ACCEPTED` judgment. After remote push and exact SHA equality, STOP for ChatGPT Web independent inspection. No automatic Phase 1A launch.
