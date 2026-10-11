# Risk Advisor Phase 15.3B — UX Design Decision Architecture Freeze

**Decision:** `RISK_ADVISOR_PHASE15_3B_DESIGN_ONLY_AUTHORIZED`  
**Architecture / independent review:** ChatGPT  
**Design research and report:** zcode  
**Baseline main:** `ad4ef368ee14ada0cdaeee2614c6ce29be9087cf`  
**Accepted UX evidence:** `Phase15_3A_Independent_Architecture_Acceptance.md` (`RISK_ADVISOR_PHASE15_3A_ACCEPTED_WITH_V7_LIMITATION`)  
**Tested fixture:** `f226e887eb55b0aeb012b185e630f8ebfd8383c6`  
**Phase 14 accepted executable:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`

## 1. Decision scope

This phase chooses a **minimal product UX change set** before anyone edits implementation. Use the seven committed Phase 15.3A screenshots and the actual React/CSS/source and accepted contracts. Produce an inspectable **as-is → two alternatives → recommended design** for three findings, plus a compact acceptance matrix for a later, separately authorized implementation.

Phase 15.3A used **real Risk Advisor components and production CSS in a synthetic Chrome fixture**, not the actual Host, native approval control flow, qualified history or real Tool/Agent. Treat screenshot measurements as fixture measurements; do not claim real-profile UI impact, real F1/F2 recall, or a source-confirmed runtime bug. V7 asynchronous stale delivery is still `UNSCORABLE / NOT EXERCISED`.

This phase is **documentation-only**. No production source changes, fixture code changes, runtime tests or Browser sessions are authorized.

## 2. Source/evidence anchors

- **Ordinary risk/history:** `src/client/RuntimeRiskAwarenessDock.tsx`, `src/client/RuntimeRiskAwarenessDock.module.css`, `src/client/historical-context-store.ts`. As-is current qualified historical Guidance is rendered **inline**, when source/binding/freshness checks permit. Evidence V1: ordinary Dock 174px; V2 with a synthetic qualified-history-shaped projection 340px (+166px). Source may not be reinterpreted as target/Workspace success proof.
- **Native approval:** `src/client/components/RiskAdvisorCard.tsx`, `RiskAdvisorCard.module.css`, `src/client/RiskAdvisorDetail.tsx`, `src/client/locales.ts`. Existing compact row is 28px. Inside Details, `data-testid="risk-advisor-operation-details"` has adjacent inline `strong`/`span` fields for resources, requested permission, workspace containment, sandbox coverage and reversibility. Evidence V3 visibly shows concatenated/unspaced metadata. This is a **component-level readability finding**, not Native Approval failure.
- **F1/F2 and language:** `src/client/OnlineCorrectionDock.tsx`, `src/client/online-correction-locales.ts`, `src/host/live-correction.ts`, `src/client/CorrectionNextCheckSection.tsx`, correction/historical contracts. Evidence V5 shows Chinese labels mixed with **English fixed F2 advisory body and English synthetic historical content**. The existing Phase12 fixed F1/F2 rendering identity/semantic contract must be reviewed before any proposed localization; do **not** silently replace the frozen F1/F2 body or mutate Host Finding authority. Historical title/observation/caveat etc. are source-bearing text, not arbitrary UI locale strings.
- **Combined density/narrow view:** V5 expanded optional sections and V6 390px bilingual dark view. Maintain content wrapping, no horizontal overflow, optional failure isolation, separate ordinary-risk and online-correction docks, Session freshness and independent authority.
- **Earlier design:** `Phase15_1_Product_Experience_Design_Report.md`; maintain V1 human-selected compact Native Approval presentation.

## 3. Three design decisions to research

### A. Ordinary risk's optional historical context (P1)

Compare:
1. **Preferred starting alternative:** one clearly named, initially **collapsed native `<details>` section** with a short qualifier identifying it as *historical, optional and of unproven applicability*, retaining the same five historical fields when expanded; only present when the current eligibility/freshness checks permit.
2. Alternative: a **single-line inline teaser** with expandable historical body. If recommended, explicitly assess wording, extra attention cost and complexity against the simplest `<details>` model.

Keep main current risk summary primary, unchanged (risk severity, recommendation, reason, DEGRADED/pre-execution caveat, advisory-only notice); do not change store, Host endpoints, polling, request gating, history eligibility or source text. Decide whether the disclosure should reset on Session/execution switch and on stale/withdrawn history; default should not reveal stale content. Define accessibility/keyboard behavior and minimum measurable before/after footprint; **do not invent a target pixel height** unsupported by measurements.

### B. Native Approval operation metadata inside Details (P1/P2)

Compare:
1. **Preferred starting alternative:** a compact **semantic description list** (`<dl>/<dt>/<dd>`) with bounded labels and values, visual grouping and wrap at narrow width.
2. Alternative: stacked labelled rows with a simpler DOM and comparable semantics.

Show multiple resources, missing/unknown values, long permission strings and narrow viewport. Retain all original information and unknown caveats. Do not expand the default 28px indicator, move metadata to the composer, add a second approval surface, change the current command detail, or modify Harness Native Approval controls. Include responsive spacing and a11y criteria for long content.

### C. Chinese wording and provenance boundary (P2)

Separate **three classes**:
1. Product-owned fixed UI labels/helper copy and optional next-check label strings: localize through existing locale dictionaries when contract-safe.
2. Frozen F1/F2 fixed advisory body, currently English constant strings: design at least **two** bounded options (retain exact body with a localized, clearly subordinate explanation; or propose a separately gated synchronized Host+Client localization contract change). **Do not** choose a code-level F1/F2 translation without clearly identifying frozen body identity tests/contract and required future re-authorization.
3. Evidence-bearing historical Guidance fields and raw current reason text: retain original bytes, source identity and caveats; distinguish original language from UI translation. No silent machine translation, fabricated interpretation, semantic enrichment, or false verification. An optional future translation presentation must be explicitly marked as translation of source material and separately authorized.

For each option include example bilingual microcopy using **fixed synthetic data**, which text belongs to source vs display, safety/accuracy risks, language fallback and impact on vertical space. Avoid converting `APPROVE` recommendation into an actual grant of permission.

## 4. Deliverable: one Design Decision Report

Create only:
`docs/tasks/Phase15-product-readiness/Phase15_3B_UX_Design_Decision_Report.md`

It must contain:
1. Exact source/contract + V1/V2/V3/V5/V6 evidence traceability, `CURRENT` versus `PROPOSED` clearly tagged.
2. For A/B/C: **two practical alternatives**, brief trade-off comparison, one recommended choice with rationale, simple textual layout sketch/microcopy, narrow-width and light/dark/zh/en requirements. Do not fabricate new live screenshots.
3. Exact list of later potential affected `src/` files, existing tests likely to need bounded updates, non-goals and explicit no-change guards for authority, freshness, privacy and source semantics.
4. A bounded later implementation/acceptance matrix: default/expanded footprint, keyboard and screen reader, A→B→A/session expiry, missing/history failure, Native Approval unaffected, English/Chinese copy provenance, 390px wrapping, optional content independent, regression tests and **focused** isolated browser re-observation. Preserve the Phase15.3A V7 limitation; no claimed async proof based on static screenshots.
5. Questions for the user limited to **three concise decisions**, indicating a safe default and what requires separate authority (especially F1/F2 fixed body).
6. Go/no-go recommendation: what can reasonably enter a subsequent Phase15.3C bounded implementation together, and what should remain separate as a contract-changing follow-up.

No implementation authorization is implied by recommending a design. The user and independent architecture review must approve any source-changing phase separately.

## 5. Gates, forbidden actions and delivery

- **D1 Source correctness:** map real components, status/authority contracts and accepted screenshots without confusing synthetic and live behavior.
- **D2 Alternatives and selection:** two feasible options for each A/B/C, explicit recommendation, minimal footprint and preservation of 28px Native Approval default.
- **D3 Provenance & safety:** freeze F1/F2 Host/Client body identity and historical source field integrity; no changes to execution, approval, history eligibility/freshness or F1/F2 authority.
- **D4 Testability:** actionable bounded acceptance matrix; no invented test PASS or real Host/Agent claims; V7 late response remains open.
- **D5 Scope:** **one new report only** in `docs/`; no `src/`, `tests/`, `validation/`, screenshots, package/lock/dependencies, Harness, `web` Profile, user configuration, build or runtime change; no tests, Browser, Agent, Tool, Provider, Canonical Full or package operations. Existing `lib/`, `node_modules/`, `.vitest-cache/`, previous tarball, backup and historical evidence preserved.
- **D6 Delivery:** `SINGLE_MAIN_CONTINUOUS_COMMIT`, direct main only, no branches/worktrees, docs-only commit then immediate push, report exact SHA and no-run items. No rewrite of accepted reports/freeze or claim of product improvement already deployed.

**On completion:** `RISK_ADVISOR_PHASE15_3B_DESIGN_READY_FOR_ARCHITECTURE_REVIEW`.  
**On blocked source or constraint:** `RISK_ADVISOR_PHASE15_3B_DESIGN_BLOCKED`, explain the smallest blocker and do not widen scope.
