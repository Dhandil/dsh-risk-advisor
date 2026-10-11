# Risk Advisor Phase 15.3A — Synthetic Browser UX Observation Architecture Freeze

**Decision:** `RISK_ADVISOR_PHASE15_3A_SYNTHETIC_BROWSER_UX_FROZEN`  
**Architecture and independent acceptance:** ChatGPT  
**Execution:** zcode  
**Starting main:** `1f238f528b76a9c41b75eadaeacc1e9aa0953e17`  
**Accepted source executable:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`  
**Current web activation acceptance:** `Phase15_2B_Repair2_Independent_Acceptance.md`  
**Pinned Harness (read-only):** `ddefc45fbc7f8e46dd73185e68295696d1297887`

## 1. Product question

Phase 15.2B established the source-bound package was installed in the selected `web` Profile and the actual Host/Client loaded; both Risk and Online Correction RPCs returned HTTP 200. It did **not** exercise Tool-derived risk, native approvals, qualified historical Guidance, F1/F2 findings or human comprehension.

Phase 15.3A asks a smaller question: **When existing product components are rendered in a real browser against explicitly synthetic, valid UI states, do the three surfaces remain readable, compact and semantically distinct?** Gather inspectable visual evidence and a prioritized, source-grounded UX observation report. This is **not** validation of real-Agent detection, Host predicate correctness, live profile UX or production telemetry.

Do not redesign/reimplement product during this phase. No source defect is assumed.

## 2. Verified UI seams and scope

Inspect and use the **actual** components, style assets, locales and client contracts:
- `src/client/RuntimeRiskAwarenessDock.tsx` — ordinary risk dock (order 20), current pre-execution risk / DEGRADED caveat, base `<details>`, historical Guidance **currently inline** if qualified.
- `src/client/OnlineCorrectionDock.tsx` and `CorrectionNextCheckSection.tsx` — correction dock (order 10), fixed F1/F2 text, optional history and next-check **collapsed** under the newest Finding.
- `src/client/RiskAdvisorDetail.tsx`, `src/client/components/RiskAdvisorCard.tsx`, existing Native Approval slot — accepted compact Risk Advisor indicator with modal and optionally collapsed approval history. Harness still owns Allow/Reject; fixture must not invent second product approval authority.
- `src/client/index.ts`, `tsdown.config.ts` and existing `tests/p6-ui.integration.spec.tsx`, `tests/p12-2-online-correction.spec.tsx`, `tests/p14-1-runtime-risk-client.spec.tsx`, `tests/p14-6-browser-module-loader.spec.tsx` and `tests/p14-6-cross-surface.integration.spec.tsx` as fixture/contract references.

Render **real implementation**, not a hand-drawn HTML imitation. Prefer the already built source-identified `lib/client.js` (SHA-256 `06b790cf721dbe2391c1249182b8da71a359eaf4032d062527316f4ae374e735`) and actual CSS through the supported loader; if this cannot safely mount particular components, use tracked source and the existing pinned-compatible component/test harness with the real CSS. Record **which** fidelity was achieved and never present source-component fixtures as full normal-Web Host activation. Synthetic RPC/store adapters must stay in the disposable fixture only.

## 3. Bounded synthetic observation matrix

Use valid **synthetic** DTOs and synthetic Session/call/finding identities; never copy real sessions, raw Tool inputs, credentials, personal paths or prior actual Findings. Each simulated success/history/F2 state is a **UI fixture**, not verified authority.

| ID | UI observation | Primary question |
| --- | --- | --- |
| V1 | Ordinary Tool risk: current `VIEW` and `DEGRADED/PARTIAL`; default collapsed details | Can one quickly read risk, recommendation, reason and incomplete evidence without confusion? |
| V2 | Ordinary risk with optional qualified-history-shaped fixture vs absent history | Is the currently **inline** history too visually dominant or long? Keep secondary context non-authoritative. |
| V3 | Pending-approval synthetic context, compact advisory row, Details/modal and optional history | Does the 28px indicator remain usable? Does the ordinary risk dock suppress appropriately? Real native controls are not actually exercised unless real pinned UI primitives are safely rendered. |
| V4 | Live-looking synthetic F1 **or** F2, newest Finding, fixed advisory | Does the message communicate an execution predicate without claiming a proven root cause or task-goal failure? |
| V5 | Synthetic F2 with both optional manual next-check and historical context | Can the current Finding, fixed manual inspection and historical Guidance be distinguished when sections are opened? |
| V6 | Both composer docks together; long bounded synthetic content; narrow viewport | Is there overflow, duplicate attention, clipped text or excessive composer height? |
| V7 | Optional missing/UNAVAILABLE/expired, no Finding, Session A→B→A and stale response, where fixture support exists | Does old/optional content disappear without masquerading as success? No inference about Host classification/recall. |

At most **7 distinct scenario families**, **8 selected screenshots**, and a focused set of deterministic assertions. Observe desktop (~1280px) and narrow (~390px), light/dark and Chinese/English **selectively**, rather than a full factorial expansion. Make the synthetic nature visible in the fixture and evidence filenames or captions. Keep a plain baseline state to demonstrate absence is neutral.

## 4. Isolation and test execution

**Authorized in this phase:** inspect source, introduce the *minimal test/validation-only* reproducible fixture under `validation/phase15-3/` (or one narrowly named `tests/p15-3-*.spec.tsx` if existing infrastructure requires it), run its focused offline checks, and load it in a task-owned isolated real Chromium/Chrome page to inspect rendering, click Details and disclosures, collect bounded screenshots and sanitized DOM/accessibility metrics. Can use a **task-owned ephemeral local fixture server on a free loopback port** if needed; never reuse/stop port 3080 or change the selected `web` Profile. Use already installed browser tooling; if missing, stop rather than installing packages or modifying dependency state. Browser network must be blocked except task-owned loopback as needed. Close all task-owned pages/processes afterward; do not close an existing user tab.

**Not authorized:** any real Harness Host/Web Profile launch/installation/restart or config write; Agent, Tool runtime, provider/model request, native approval decision, fake F1/F2 injected into the genuine user Profile, actual user-home/session/conversation reads, package publishing, full test campaign or Phase13.3 real-Agent work. No changes to `src/`, `package.json`, dependencies/lockfile, `tsconfig.json`, `tsdown.config.ts`, Harness or existing phase freezes/acceptances. Do not delete/move existing `lib/`, `node_modules/`, `.vitest-cache/` or the currently Profile-referenced root tarball. Do not run `pnpm exec` or any action prompting dependency deletion. Canonical Full is not required for test-only visual evidence; execute only focused checks and label them accordingly.

If real Component + CSS fidelity cannot be established offline without unsafe modifications, stop and record the precise blocker; do not substitute a visually similar custom mock screenshot and call it a product test.

## 5. Evidence/UX assessment

Produce:
1. `docs/tasks/Phase15-product-readiness/Phase15_3A_Synthetic_Browser_UX_Execution_Report.md` with fixture/code SHA, rendered artifact/source identity, browser/version, exact scenarios/widths/themes/locales, observed DOM/visual facts and checks, observed-vs-not-run classification, screenshots (maximum 8) stored under a narrowly named `docs/tasks/Phase15-product-readiness/evidence/phase15-3a/` directory if safe. Do not include user data. Attach exact file/hashes and describe evidence provenance.
2. Compact outcome table for each V1–V7: `PASS` (only for actual checks), `OBSERVED_UX_CONCERN`, `NOT_EXERCISED`, `UNSCORABLE`, `BLOCKED`. Severity/priority are about **observed UX**, not presumed product safety.
3. A prioritized `SOURCE_CONFIRMED_DEFECT / OBSERVED_UX_CONCERN / DESIGN_OPPORTUNITY / NEEDS_HUMAN_FEEDBACK` backlog, with recommendations **only**, no source changes.
4. Up to five focused questions for the user to review images, with special attention to default composer height, compact approval affordance, whether inline history should collapse, and distinction between current evidence, historical experience and manual checks.

Use **one separate fixture implementation commit** (if files need adding), push immediately to `main` and then run on that exact SHA. Subsequently commit/push the report plus screenshots as evidence, with no post-check executable drift. For doc-only or blocker outcome, commit a report without inventing tests/screenshots. Every change is pushed for independent review under `SINGLE_MAIN_CONTINUOUS_COMMIT`, no branch/worktree and no force.

## 6. Gates

- **U1** Source/component/CSS fidelity and synthetic isolation; clear distinction from full live Web.
- **U2** V1–V7 bounded scenarios, selected desktop/narrow and locale/theme checks, without fabricated visual pass or defect.
- **U3** Native Approval and F1/F2 authority remain untouched; no real Finding, Tool, Agent, provider or user-profile mutation.
- **U4** Evidence privacy, reproducibility, screenshot labels, interaction/DOM observations and user-reviewable UX findings.
- **U5** Task-owned resource teardown; user tabs, installed package, rollback backup and Profile unchanged.
- **U6** Exact test/fixture SHA, documentation/evidence-only subsequent diff, direct `main` commits and push/remote SHA verification.

Return `RISK_ADVISOR_PHASE15_3A_UX_EVIDENCE_READY_FOR_ARCHITECTURE_REVIEW` if completed or `RISK_ADVISOR_PHASE15_3A_BLOCKED` with precise gate. **Only ChatGPT independent review can accept Phase15.3A.** User visual-feedback/possible product repair requires a subsequent explicit phase decision; this freeze does not authorize UI changes.
