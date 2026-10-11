# Risk Advisor Phase 15.1 — Product Experience & Activation Design Freeze

**Decision:** `RISK_ADVISOR_PHASE15_1_DOCUMENTATION_DESIGN_AUTHORIZED`  
**Architecture / independent acceptance owner:** ChatGPT  
**Implementation / document research owner:** zcode  
**Start main:** `9a78ef23eac421e70392393bac05c5dd56a5cd2e`  
**Phase 14 accepted executable:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`  
**Pinned Harness (read-only reference):** `ddefc45fbc7f8e46dd73185e68295696d1297887`

## 1. Why Phase 15.1 exists

Phase 14.1–14.6 deterministic implementation and integration were accepted (80 files / 554 tests). The remaining UX/activation question is **how existing behavior will be understood in one normal Harness Web experience**. The Phase 15.0 preflight correctly found missing evidence of current-profile package selection, normal Web activation, and user-observed comprehension. There is **no established Phase 15 product defect** yet.

Phase 15.1 is **design before code**. Deliver a source-grounded, prioritized user experience specification and a minimal, separately authorizable activation/observation plan. This phase DOES NOT install, launch or exercise Risk Advisor. It neither reopens Phase 13.3 nor authorizes Docker/guest isolation work.

## 2. Source-grounded product surfaces

Do not invent new UI or present optional context as always available. Inspect the accepted current source and exact registration:
- `src/client/index.ts`: one `conversation.approval.detail` `RiskAdvisorDetail` slot, `conversation.input.dock` for `risk-advisor-online-correction` (order 10) and `risk-advisor-runtime-risk-awareness` (order 20). The latter two are separate docks, **not** a single existing combined card.
- `src/client/RiskAdvisorDetail.tsx` and its components: one Native Approval-owned risk detail; optional current-approval historical context beneath it.
- `src/client/OnlineCorrectionDock.tsx`: Phase 12 F1/F2 fixed advisories and optional Phase 14.4 historical section / Phase 14.5 manual next-check.
- `src/client/RuntimeRiskAwarenessDock.tsx`: ordinary Tool risk and its optional Phase 14.2 historical Guidance.
- Host authority: `src/index.ts`, `src/host/runtime-risk-awareness.ts`, `src/host/live-correction.ts` and existing bridges/contracts.

Risk Advisor is observe/analyze/present only. Native Approval is the only allow/reject/cancel authority. Historical experience does not prove current permission or task success. Optional notes cannot rewrite F1/F2, execute Tools, or substitute for verified postconditions.

## 3. UX decisions to design and evaluate

Produce an **as-is experience map and a proposed minimal to-be design**, explicitly marking proposals as unimplemented, for:
- **Ordinary Tool:** bounded VIEW / DEGRADED / unavailable / no-current-row states; clarity of severity, reason, actionability and freshness without implying execution veto.
- **Native Approval:** current approval detail, original command/permission clarity, advisory hierarchy; distinguish current risk from conditional verified history; no secondary approval button or attention-stealing panel.
- **Online Correction:** live F1/F2 vs optional historical note vs optional evidence-bound *manual next check*; distinguish detection from proven cause and from a suggested remedy.
- **Cross-surface and lifecycle:** Session A→B→A, stale/not-found/expired, optional RPC failure, duplicate or out-of-order updates, no active Finding, pending approval, collapsed details, long text, mixed Chinese/English, narrow Web viewport and light/dark themes where source/style evidence permits.
- **Attention budget:** identify which elements deserve primary attention, which remain initially collapsed/quiet, what must disappear when authority expires; do not add false alarms or invented probabilities.

Design must protect the compact Native Approval indicator chosen in the V1 human pilot. Avoid expanding the default composer footprint to show every Phase 14 field at once. Preserve privacy and redaction; use only fixed synthetic examples for any wireframe or copy study.

## 4. Deliverable and traceability

Write **one** report in this task directory:
`Phase15_1_Product_Experience_Design_Report.md`.

The report must contain:
1. Exact source/contract references for each surface, separating actual behavior from assumptions and future designs.
2. Concise as-is journey and proposed interaction hierarchy for ordinary risk, approval, F1/F2 correction, and optional context. Text sketches/tables suffice; no screenshot needs to be fabricated.
3. A bounded state/visibility matrix: VIEW/DEGRADED/NOT_FOUND/UNAVAILABLE, approval pending/settled, F1/F2 qualified/absent, history qualified/absent, freshness/Session switch, partial failures. Distinguish `NOT EXERCISED` and `UNSCORABLE` from `PASS` or true negative.
4. A prioritized UX gap list: `SOURCE_CONFIRMED_DEFECT`, `DESIGN_OPPORTUNITY`, `NEEDS_HUMAN_OBSERVATION`, or `NOT_SUPPORTED_BY_EVIDENCE`. Do not assert visual defects without real observations.
5. A **future validation plan only**: recommended minimal profile identity/package/artifact-hash/rollback preflight, normal Web startup and user feedback protocol. Separate an **activation-only** stage from any **Agent Tool** stage. User must explicitly select/authorize the target profile and installation before mutation. Do not use ordinary workspace layout or prompt wording as an enforced file-read boundary.
6. Three to five explicit user observation questions (clarity, distraction, risk vs history distinction, next-check usefulness and optionality) and criteria for a subsequent no-code UX review versus an actual product repair.

## 5. Gates / non-actions

- **D1** Exact source and registration map; no fabricated existing feature or UI screenshot.
- **D2** Current risk, Native Approval, F1/F2 Finding, qualified history and manual check have distinct labels/authority; read-only and fail-closed semantics remain.
- **D3** Compact default presentation, optional collapsing, priority and Session staleness covered; source facts are not confused with future UI ideas.
- **D4** Proposed Web smoke has bounded user approval, identity, recovery and privacy gates; no real-Agent campaign/recall claims and no implicit install authorization.
- **D5** No `src/`, `tests/`, `validation/`, package/config/lockfile, Harness, profile, runtime or existing acceptance reports changed; no test, package build, Harness, Browser, Agent, provider or network-runtime experiment. Read-only GitHub operations and permitted documentation push only.
- **D6** `SINGLE_MAIN_CONTINUOUS_COMMIT`: no branch/worktree; commit the bounded report directly on `main`, push immediately, verify remote SHA. Preserve pre-existing untracked `.vitest-cache/`, `lib/`, `node_modules/`; never clean/reset or fabricate status.

A later Phase 15.2 activation or UI implementation requires a **new independent design review and explicit authorization**. Do not assume installation, tool execution or automatic correction authority from this freeze.

**Execution outcome:** `RISK_ADVISOR_PHASE15_1_DESIGN_READY_FOR_ARCHITECTURE_REVIEW` with exact report/main SHA, gates, and clearly stated not-run items. On any blocking precondition, report `RISK_ADVISOR_PHASE15_1_DESIGN_BLOCKED` and do not expand scope.
