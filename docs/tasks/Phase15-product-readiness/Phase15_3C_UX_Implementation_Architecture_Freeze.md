# Risk Advisor Phase 15.3C — Approved UX Implementation Architecture Freeze

**Decision:** `RISK_ADVISOR_PHASE15_3C_IMPLEMENTATION_AUTHORIZED`  
**Design & architecture authority:** ChatGPT  
**Implementation & evidence executor:** zcode / Codex  
**User-approved design:** `Phase15_3B_User_Approved_UX_Design_Decision.md`, at `d8b56c2f261b15ae5e80ed8e7f3ab8ddb3b5fac6`  
**Starting main (must match):** `d8b56c2f261b15ae5e80ed8e7f3ab8ddb3b5fac6`  
**Pre-change source baseline:** accepted Phase14 executable `ab3e17c1834b9ae2082369e35178d7006efb9e35` plus later documentation and Phase15.3A validation fixture  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887` (read-only)

## 1. Product goal and locked designs

Implement **only** A1, B1 and safe supporting C microcopy that the user explicitly approved. No further UX selection or design delegation to the executor. Keep current risk evidence and Harness approval authority independent.

**A1 — Ordinary-risk optional history collapses.** In `src/client/RuntimeRiskAwarenessDock.tsx`, wrap the existing *eligible* `HistoricalContextSection` five source fields in a separately labelled **native `<details>`**, **closed by default**. Keep `summary` legible, keyboard-accessible and below current risk + DEGRADED/PARTIAL + advisory-only caveats. New concise display-owned bilingual label/helper text must communicate **historical** and **current applicability unverified**, not current target verified. The original title, observation, context caveat, nextCheck and authorityNotice are retained **verbatim**, in the same order, behind the disclosure. No translation, re-scoring, editing, truncation or silent meaning changes to evidence text.

The existing History predicate (SessionId/executionId/assessmentId, matching pending approval, `observedAt`, 1,500ms limit, in-flight fencing) is unchanged. Disclosure visibility is revoked on `NOT_FOUND`, unavailable, mismatched, expired or withdrawn history. Its `open` state must reset across **Session A→B→A**, execution/assessment identity changes, withdrawal/expiry and subsequent new eligible history; use identity-keyed native disclosure or equivalently proven React lifetime. Do not introduce timers or new Host reads. Apply to all existing occurrences of `HistoricalContextSection`, including PENDING where it was already eligible; do not alter base PENDING content or eligibility.

**B1 — Native Approval operation metadata is semantic and readable.** In the **existing** `RiskAdvisorCard` Details modal only, transform `data-testid="risk-advisor-operation-details"` content into a labelled `<dl>/<dt>/<dd>` (or equivalent semantic description list) with a compact two-column layout and narrower-width stacked fallback. Preserve all `operation.resources` individually, original order and text, permission if present, workspace containment, sandbox coverage, reversibility and any unknown values. Long resource names and `danger-full-access` must wrap rather than stick together or create horizontal overflow. Existing operation title/summary and all remaining risk analysis sections remain.

**Outside Details, the Native Approval indicator stays exactly 28px**, with identical recommendation/caveat, Details control and actual Harness Allow/Reject decision authority. Never create a second decision button, change any risk judgement, or make UI suggestions into permissions.

**C safe UI-only wording:** Add only the minimal `en`/`zh` display-owned locale strings needed for A1 and optional source/provenance labels. Distinguish source record from localized UI labels (e.g. “历史经验 · 当前目标适用性未验证” / “Historical context · applicability unverified”, and “历史记录原文” / “Original historical record”). Do not assume original text is English, and do not label it as machine-translated. **No change** to `OnlineCorrectionDock.tsx` fixed F1/F2 advisory bodies, `src/host/live-correction.ts`, their byte-identical renderer contract, or any original history/current-reason value. C's larger F1/F2 localization approach is reserved for a separately approved Phase 15.3D.

## 2. Exact source and test scope

**Permitted production files, only if required:**
- `src/client/RuntimeRiskAwarenessDock.tsx` and `src/client/RuntimeRiskAwarenessDock.module.css`;
- `src/client/runtime-risk-locales.ts` (new display text keys only);
- `src/client/components/RiskAdvisorCard.tsx` and `src/client/components/RiskAdvisorCard.module.css`.

**Permitted focused tests:** existing `tests/p14-2-historical-context-client.spec.tsx`, `tests/p14-1-runtime-risk-client.spec.tsx`, `tests/p6-ui.integration.spec.tsx`, and a minimal new `tests/p15-3c-*.spec.tsx` where stronger identity/revocation/keyboard checks are needed. Run appropriate existing *regressions* (e.g. p12-2 correction parity and p14-6 cross-surface integration) without rewriting their established contracts. Update prior test assumptions about historical fields being **visibly inline**; test must now assert `<details>` closed by default and five unchanged fields visible after opening, not simply `getByText` in a hidden subtree.

**Permitted visual validation:** introduce a separate minimal `validation/phase15-3c/**` runner/support files for re-observation of the actual updated Client bundle and CSS in isolated browser, using existing Phase15.3A fixture/scenarios without rewriting its frozen files or original screenshots. Capture at most **five** new labelled synthetic screenshots under `docs/tasks/Phase15-product-readiness/evidence/phase15-3c/`. Preserve existing `validation/phase15-3/**`, its exact tested fixture SHA and the seven Phase15.3A PNGs. If the older runner hardcodes the old Client SHA, do **not** change the old expected SHA to force it to accept a new build; make a separately named versioned runner for 15.3C.

**Forbidden:** all `src/host/**`, storage, bridge contracts, DTO, stores/polling, approval interaction ownership, risk engine, `OnlineCorrectionDock` fixed body semantics, package/lock/tsdown/tsconfig, dependencies, Harness source, old acceptance/evidence docs, web Profile, installed plugin, user data. Do not alter `node_modules/` or `.vitest-cache/`, remove/move the existing root tarball referenced by `web`, or create branch/worktree. No real Agent, Tool runtime, Provider, real approval, Docker/guest work or Phase13.3 campaign.

## 3. Tests, browser gates and honest results

- **I0 — Preflight:** `main == origin/main` at expected baseline; clean tracked tree; assess existing untracked `lib/`, tarball, dependencies, backup and the existing Profile noninterference. If tool execution would delete/reinstall `node_modules`, **STOP**. Work directly on `main`; never reset/clean/force-push.
- **I1 — A1 semantics:** with eligible history: collapsed initially, one accessible history summary, independent assessment details, all five source fields byte-identical when opened. Default footprint less than V2's 340px inline fixture in comparable screenshot (not a blanket real-Web pixel guarantee). Current risk / caveats persist. No history means no historical disclosure. Native approval suppression identical.
- **I2 — historical identity/freshness:** A→B→A, current execution/assessment switch, absent/withdrawn/expired history and delayed stale response: disallow an old disclosure state or stale content from carrying to new target. Exercise **real Client/store asynchronous behavior** in focused tests; do not mark Phase15.3A's V7 synthetic snapshot as async coverage. If verification cannot reach required seam, mark that subgate `NOT_EXERCISED` and block signoff of I2, do not invent PASS.
- **I3 — B1 modal:** 28px indicator unchanged; `<dl>/<dt>/<dd>` pairs labelled, all original values/resources preserved, unknown and high permission not hidden or signalled as safe, no extra native decision UI, modal remains accessible, closeable. English/Chinese, light/dark, 390px and desktop; zero horizontal overflow, long labels wrap.
- **I4 — C & invariants:** A1's minimal UI-owned en/zh copy correctly selected; historical source bytes unchanged. F1/F2 fixed English body `renderOnlineCorrectionAdvisory` and Host renderer parity stay byte-identical; no runtime false positives/recall claims, F1/F2 and ordinary-risk docks independent; no unauthorized approval/Host mutations.
- **I5 — focused verification:** run focused affected UI/history/approval/locale and relevant p12-2 / p14-6 integration regressions, static/typecheck and production build/pack smoke **only insofar as they can run on already installed tools without dependency repair**. Prefer verified local `node_modules/.bin/{tsc,tsdown,vitest}` because an earlier `pnpm exec` attempted to remove protected `node_modules`. Treat build `lib/` as a verified, source-identified generated output; retain previous traceable artifact hashes and do not disturb the `web` package tarball. No Canonical Full is automatically authorized for this UX-only change. Browser check: production Client CSS + real components + synthetic values, default/expanded history and approval metadata, focused screenshots (<=5), Chrome/Vite task-owned cleanup.
- **I6 — acceptance provenance:** implementation/test edits and minimal fixture changes must be committed **once as a tested executable/fixture candidate** to `main` and **pushed immediately before the final formal gate**. Record exact candidate SHA; run all final focused/build/browser gates on that one SHA. If it changes, rerun affected final gates and report the new exact SHA, never carry old PASS forward. Follow with a docs/evidence-only execution report commit, no post-final-test executable drift. Remote SHA verified. Preserve user files and report first blocker if any.

## 4. Bounded release distinction

Deliver one `docs/tasks/Phase15-product-readiness/Phase15_3C_UX_Implementation_Execution_Report.md` with actual checks/commands/test counts and precise SHAs, final artifacts, A/B/C evidence, browser PNG paths/hashes, I0–I6 PASS/BLOCKED/NOT_EXERCISED, cleanup, and explicit non-execution of Agent/Tool/Provider/Full. Classify subjective improvements as **visual observations**, not proof of user satisfaction. Do not deploy updated plugin to `~/.dsh/profiles/web`: Phase15.2B installed package remains separate until explicit future update approval.

**Result if all gates pass:** `RISK_ADVISOR_PHASE15_3C_IMPLEMENTATION_READY_FOR_ARCHITECTURE_REVIEW`.  
**If blocked:** `RISK_ADVISOR_PHASE15_3C_BLOCKED` with exact first failed gate and state preserved.

**Only ChatGPT may independently review/accept the implementation.** A separate product delivery/install phase will be required before the user's existing Web Profile runs the 15.3C changes.
