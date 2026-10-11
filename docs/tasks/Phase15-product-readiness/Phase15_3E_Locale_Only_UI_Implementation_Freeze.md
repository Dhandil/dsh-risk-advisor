# Risk Advisor Phase 15.3E — Locale-Only F1/F2 UI Implementation Freeze

**Decision:** `RISK_ADVISOR_PHASE15_3E_IMPLEMENTATION_AUTHORIZED`  
**Design / architecture owner:** ChatGPT  
**Implementation / verification executor:** **Codex**  
**User-approved exact UX:** `docs/tasks/Phase15-product-readiness/Phase15_3D_User_Approved_Locale_Only_Design_Decision.md`  
**Starting main:** `0da1150d849a93fbfb5ccd473bfdcdd60fee74ac`  
**Last accepted implementation:** `9f96db5981818cd2d6958b38ff6036efd659259b`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887` (read-only)  
**Current Web Profile:** previous Phase15.3C package accepted and installed; **do not modify in this phase**.

## 1. Exact approved product change

Replace **only the displayed product-owned fixed F1/F2 advisory body** in `OnlineCorrectionDock` according to the existing injected `ONLINE_CORRECTION_NS` locale:

- `STOP_EXACT_RETRY_PATH_V1`: zh displays **同一操作反复失败，且归一化后的失败特征一致。请停止按原方式重试，先检查原因，再决定是否继续。**
- `INSPECT_UNSATISFIED_POSTCONDITION_V1`: zh displays **操作已结束，但经验证，预期后置条件未满足。不能认定本次目标已完成；继续前请核对目标状态。**
- en displays **the exact existing English canonical advisory** (no duplicate paragraph).
- **No English original disclosure in Chinese**, no translation badge, no second paragraph, no unnecessary visual redesign.

Implementation approach is a small, typed, code-to-locale-key mapping using the existing injected `t` function; both English dictionary values are literal-byte-equal to existing canonical fixed advice. **Keep** exported `renderOnlineCorrectionAdvisory(code)`, its `ADVISORY_BODIES`, Host `F1_TEXT/F2_TEXT` and `p12-2` U9 equality completely unchanged. Preserve the existing `finding.kind`/code validation and 3-Finding ordering. For unsupported keys, missing or throwing locale translation, return the canonical English body as a fail-safe UI fallback (not an extra paragraph). No runtime locale guessing by comparing unrelated label strings; no language detection, model/translation service or new network calls.

**Source files allowed:** `src/client/OnlineCorrectionDock.tsx`, `src/client/online-correction-locales.ts`. The existing CSS should not need changing: if essential, `src/client/OnlineCorrectionDock.module.css` is the maximum additional UI-only file; explain why. No `src/host/**`, wire DTO, stores, RPC, permissions, approval/detail, history source fields or upstream phase code changes.

## 2. Focused regressions and isolated browser

**T1 — Canonical:** existing `tests/p12-2-online-correction.spec.tsx` U9 unchanged; assert en dictionary matches Host/canonical fixed text exactly and zh dictionary matches two approved Chinese sentences exactly. Existing U1–U22, L1–L9 and applicable tests remain green. Do not weaken/delete pre-existing U15 English assertion.

**T2 — Locale presentation:** English default exactly as before. zh F1/F2 each display **one** Chinese body with **zero** English canonical body nodes and no English-original disclosure. Switch zh↔en in the mounted real component. Multiple mixed Findings (max 3, newest-first), NOT_FOUND, Session A→B→A, stale response/reconnect and degraded snapshot continue to obey existing Client/store logic. For missing/throwing lookup, prove the current Finding remains and its English canonical message is displayed, not blanked or hidden. Use bounded focused component tests and existing store tests; no speculative broad refactor.

**T3 — Independent optional sources:** next-check and historical Guidance remain separate, optional, default-collapsed and source-unchanged. Existing tests `tests/p14-4-correction-historical-context-client.spec.tsx`, `tests/p14-5-correction-next-check-client.spec.tsx`, `tests/p14-6-cross-surface.integration.spec.tsx` and the relevant Phase15.3C UI regressions may run. Historical source fields are **not** translated, truncated or reclassified. English body remains available in English **locale**, not in a Chinese-only extra details section.

**T4 — Browser:** if safely available, use real production-compiled Client and actual CSS in a **new** isolated `validation/phase15-3e/**` synthetic Chrome fixture (at most 4 screenshots under `docs/tasks/Phase15-product-readiness/evidence/phase15-3e/`). Check zh/en, light/dark, 1280px / 390px, at least one F1 and one F2, no horizontal overflow, no duplicated paragraphs, no unwanted original-English disclosure. Browser requests must be blocked except task-owned loopback and no user-profile data read. Do not modify prior Phase15.3A/3C fixture or prior screenshot evidence. If real-component test browser cannot run safely, STOP with a scoped blocker rather than substituting drawn HTML.

**T5 — Build and package sanity:** on the exact committed candidate, run relevant focused Vitest/static/typecheck and direct local `tsc`/`tsdown`, plus task-owned **temporary** package smoke. Do not invoke pnpm commands that delete/reinstall `node_modules`; do not touch persistent installed old/new tarballs. Before generating `lib/`, record/safeguard any existing untracked output or consumer and ensure generated Client identity is source-bound; never `reset`/`clean` or delete protected `.vitest-cache/`/`node_modules/`. No Canonical Full automatically authorized for this bounded UI change.

## 3. Execution gates and report

- **E0 Preflight:** `main == origin/main == git ls-remote` at `0da1150d849a93fbfb5ccd473bfdcdd60fee74ac`, checked remote, clean tracked state and no unexpected local/user-owned drift. Existing backups, installed Profile and tarballs remain untouched; current Harness SHA pinned.
- **E1 Design:** two Chinese strings and English original display only by locale; no bilingual duplicate or English-source disclosure, no unapproved UX changes.
- **E2 Frozen contract:** original Host/Client `renderOnlineCorrectionAdvisory` English bytes, U9, DTO, Host, F1/F2 meaning, authority and source evidence unchanged.
- **E3 Tests:** T1–T3 focused regression and failure fallback, Session/Finding separation; evidence is exact measured checks, no invented PASS.
- **E4 Browser/build:** T4 actual Client Chrome fixture, T5 static/typecheck/build/temporary package, artifact hashes and screenshot IDs, precise Not-Run values.
- **E5 Integrity:** no Profile, session/user data, backup, existing tarball or unrelated plugin modifications; only own Chrome/loopback resources and caches cleaned.
- **E6 Git:** `SINGLE_MAIN_CONTINUOUS_COMMIT`, direct `main`, no branch/worktree. Commit/push the implementation/test/minimal fixture candidate **before** final focused/build/browser gates, then run those final gates on that one exact SHA; afterward add **only** execution report and optionally up to four screenshots. Check no post-gate executable drift and remote SHA equality. No force.

Deliver `docs/tasks/Phase15-product-readiness/Phase15_3E_Locale_Only_UI_Implementation_Execution_Report.md` with E0–E6, exact candidate SHA, test counts, old/new Client bundle SHA, Host hash, original-text canonical parity, zh/en screenshot identities, protected files/cleanup and exclusions. Only independent architecture review may accept. **Do not install this candidate in the existing `web` Profile**; subsequent promotion requires separate explicit user authorization and narrow backup/rollback freeze.

**Success (review needed):** `RISK_ADVISOR_PHASE15_3E_IMPLEMENTATION_READY_FOR_ARCHITECTURE_REVIEW`.

**Blocker:** `RISK_ADVISOR_PHASE15_3E_BLOCKED` with first failing gate.

No Agent, Tool, Provider, actual Native Approval or Phase13.3 real-Agent campaign; no Canonical Full in this task.
