# Risk Advisor Phase 15.1 — Independent Design Acceptance

**Decision:** `RISK_ADVISOR_PHASE15_1_DESIGN_ACCEPTED`  
**Reviewer:** ChatGPT, independent remote-source and report review  
**Design tested/reviewed SHA:** `e63125dbcd31f7baf27744b9dcb423359846299e`  
**Frozen starting SHA:** `f1b875c21bebde4e5f84a43d9bcd21c82c037f79`  
**Accepted Phase 14 executable:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`

## 1. Provenance and diff

GitHub's comparison shows **one linear commit**, changing **only** `docs/tasks/Phase15-product-readiness/Phase15_1_Product_Experience_Design_Report.md` (added). `main` was verified at the report SHA for review. No changed source, tests, scripts, dependencies, configuration, validation, Harness, or previous acceptance documents. The author reports no runtime/tool/browser/provider/Full execution; the independent reviewer did not rerun tests.

## 2. D1–D6 review

- **D1 PASS:** Inspecting `src/client/index.ts` confirmed three existing registration surfaces: `conversation.approval.detail` risk detail; `conversation.input.dock` Online Correction (order 10); separate runtime-risk dock (order 20). `src/index.ts` registers existing Host observers and separate optional bridges. The report marks all proposed to-be hierarchy as **not implemented** and invents no screenshot or live profile observation.
- **D2 PASS:** Harness Native Approval remains the only decision authority. Phase 12 alone creates F1/F2; Phase 14 historical context and manual next-check are read-only optional projections. No automatic correction/retry, permission inference or target authority is proposed.
- **D3 PASS:** Verified `RiskAdvisorCard.module.css` uses a bounded 28px default approval row; `RuntimeRiskAwarenessDock.tsx` uses a collapsed base detail with ordinary history currently rendered **inline**, whereas `OnlineCorrectionDock.tsx` renders independently collapsed optional history and check. The report correctly identifies collapsing ordinary history as a *design opportunity*, not existing behavior or a proven visual defect. Session/generation/staleness and optional failure matrices are covered.
- **D4 PASS:** The report separates activation-only from any Agent Tool observation; it requires user-selected profile, exact artifact identity and recovery before mutation, and does not claim a full Web smoke or real-Agent F1/F2 recall. This design review does not authorize either stage.
- **D5 PASS:** Documentation-only diff. No new code, Browser, Harness runtime, tests, Full or package execution was requested or evidenced.
- **D6 PASS:** Exactly one document commit pushed directly to `main`, with precise source and remote SHA; no branch/worktree. Existing user-untracked state remains reserved.

The design's wording about 'four Phase 14 read-only bridges' is shorthand for four *optional/context* projections in addition to the ordinary runtime-risk projection, not a new integration requirement. It must not become a checklist asserting the ordinary bridge is absent.

## 3. Product conclusions and scope for next work

There is **no independently established new Product defect**. The accepted Phase 14 deterministic Full remains 80 files / 554 PASS at its fixed executable. Phase 13.3 stays `REAL_AGENT_GENERALIZATION_UNVERIFIED`; no live recall, production deployment or user-profile UX has been proved.

**Accepted Phase 15.1 closes the design-only task**, not normal-profile activation. A future Phase 15.2 may establish **activation-only** package/profile/Host/Client facts after explicit user target selection and mutation authorization. Do not turn a narrow product UX task into the stopped Docker/guest or real-Agent campaign. Without an Agent Tool, no ordinary Tool risk/F1/F2 UI occurrence should be inferred; an empty dock is not a pass or a true negative.

**Outcome:** `RISK_ADVISOR_PHASE15_1_DESIGN_ACCEPTED`.
