# Risk Advisor Phase 15.3D — ChatGPT F1/F2 Chinese Experience Design Proposal

**Status:** `RISK_ADVISOR_PHASE15_3D_DESIGN_PROPOSED_AWAITING_USER_DECISION`  
**Design and architecture author:** ChatGPT  
**Product decision:** user, **not yet approved** for this proposal  
**Execution agent:** **Codex** only **after** design approval and a separately frozen implementation phase  
**Git baseline:** `a46ed45fd312d8a133fb546fb5844fcd73cd4504`  
**Existing Web deployment:** `RISK_ADVISOR_PHASE15_3C_WEB_DELIVERY1_ACCEPTED_WITH_TOOLING_LOG_NOTE`  
**Previously accepted UI:** A1 ordinary historical disclosure + B1 Approval Details layout. **Do not reopen them.**

## 1. Problem and source-grounded constraints

In Phase 15.3A's real-component synthetic Chrome captures, Chinese Online Correction shows a Chinese `重复失败/后置条件不匹配` label but an English **fixed advisory body**. Chinese labels for optional manual next-check and historical context are already present; the five historical fields may be original-language (often English) source evidence and must not be silently translated.

Current component: `src/client/OnlineCorrectionDock.tsx`. Its frozen `ADVISORY_BODIES` are accessed through exported `renderOnlineCorrectionAdvisory(code)`. The Host's `src/host/live-correction.ts` `F1_TEXT` / `F2_TEXT` are the exact same strings. **Phase12.2 U9** in `tests/p12-2-online-correction.spec.tsx` asserts Client helper === Host `diagnostics.render(findingId)` === fixed text for each F1/F2. This is a binding audit contract, not optional translation data.

The browser DTO contains `findingId,kind,diagnosis,disposition,advisoryCode,observedAt` only; `advisoryCode` is the safe stable mapping key. There is **no** free-text model generation, user-supplied raw command input or arbitrary translated evidence in that DTO. The base dock displays at most three newest Findings, with optional next-check and matched historical context only for the newest Finding, separately and default collapsed. Empty/NOT_FOUND remain neutral; a real host Finding, its identity, order and authority are not changed by UI language.

**Design goal:** make fixed F1/F2 advice understandable in Chinese at first glance **without changing frozen Host bytes, wire codes, predicates, source evidence or approval authority**. Repeated English/Chinese paragraphs would recreate the Phase15.3A vertical-density problem.

This stage is documentation-only: no source, tests, fixture, Profile, package, runtime, browser, Agent/Tool or provider modifications.

## 2. Real alternatives and decision

| Option | Chinese default view | Preserves Host/Client fixed text contract? | UX/engineering trade-off | Decision |
| --- | --- | --- | --- | --- |
| **D1: approved Chinese UI explanation + collapsed exact English original** | Short Chinese explanation; a separately labelled native `<details>` keeps exact source English available per Finding | **Yes**, if exported helper and Host renderer stay byte-identical and original is rendered from that helper | Compact and readable; explicit dual representation; requires isolated Client presentation regression | **RECOMMENDED** |
| D2: Chinese heading/help + always-visible exact English body | Existing English body remains the primary paragraph, extra Chinese line added | Yes | Lowest semantic change but remains mixed-language and increases composer height, especially for up to three Findings | Not preferred |
| D3: formal multilingual Host+Client fixed-body contract | New locale-specific canonical diagnostic bodies | Requires **new** reviewed Host contract; current U9/byte-identity must change deliberately | Clean long-term canonical localization, but wider Host/DTO/audit/test migration unrelated to a local UI improvement | Defer; **not in the next implementation** |

D1 is a **presentation-level translation** of already fixed, enumerated advice; it does **not** become a new finding, verified observation, independent diagnosis or permission. The exact source English remains obtainable without network or model calls. In English locale, default visual text must remain the existing exact English body with **no redundant English-original disclosure**.

## 3. Design D1 — exact information hierarchy

### 3.1 One F1 Finding, Chinese locale

```text
执行建议

重复失败  ·  中文提示
同一操作反复失败，且归一化后的失败特征一致。
请停止按原方式重试，先检查原因，再决定是否继续。

▸ 查看原始诊断（英文）
▸ 基于证据的下一项检查 · 仅供参考        [only if eligible]
▸ 历史经验 · 不代表本次原因              [only if eligible]
```

**Approved-design candidate (not yet product acceptance) for `STOP_EXACT_RETRY_PATH_V1`:**

> 同一操作反复失败，且归一化后的失败特征一致。请停止按原方式重试，先检查原因，再决定是否继续。

Precision: a repeated *normalized signature* is not proof that the underlying cause is known. “先检查原因” asks for investigation, **not** a claim that the root cause has been identified. No automatic retry or correction is offered.

Original inside the native disclosure must be the exact result of `renderOnlineCorrectionAdvisory('STOP_EXACT_RETRY_PATH_V1')`, unchanged:

> The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.

### 3.2 One F2 Finding, Chinese locale

```text
执行建议

后置条件不匹配  ·  中文提示
操作已结束，但经验证，预期后置条件未满足。
不能认定本次目标已完成；继续前请核对目标状态。

▸ 查看原始诊断（英文）
▸ 基于证据的下一项检查 · 仅供参考        [only if eligible]
▸ 历史经验 · 不代表本次原因              [only if eligible]
```

**Approved-design candidate (not yet product acceptance) for `INSPECT_UNSATISFIED_POSTCONDITION_V1`:**

> 操作已结束，但经验证，预期后置条件未满足。不能认定本次目标已完成；继续前请核对目标状态。

Precision: “操作已结束” does **not** mean process exit 0, successful execution, successful goal completion or validated root cause. The statement is only the already established verified expected postcondition mismatch. Do not say “操作执行成功” or propose an automatic fix.

Original inside disclosure must remain exactly:

> The operation completed, but the verified expected postcondition was not satisfied. Do not treat this execution as goal completion; inspect the target state before continuing.

### 3.3 English locale and source provenance

English default (same as today):

```text
Execution advisory
Repeated failure
The same operation is repeatedly failing ... [original fixed English]
▸ Evidence-grounded next check — advisory only    [optional]
▸ Verified historical context — not a diagnosis  [optional]
```

Chinese uses a subdued UI-owned “中文提示” or “中文释义” signal alongside the kind label; it must not be styled like a second verified Finding. The disclosure is called **“查看原始诊断（英文）”**; its English paragraph is displayed exactly, selectable/copyable, and assistive-technology accessible when expanded. Do not label a Chinese translation as “原始诊断”, do not present it as Host-generated Chinese, and do not retranslate the original English at runtime.

For the **five historical Guidance fields** (`title`, `observation`, `contextCaveat`, `nextCheck`, `authorityNotice`), keep every character byte-identical, source/binding eligibility and order untouched. Existing localized field labels and applicability warning remain; optionally rename only the *UI-owned* header for clarity in a future separate decision, but no added automatic translation, language detector or fake verifier. Next-check uses its existing approved locale dictionary (already Chinese) and remains separately collapsed.

### 3.4 Multiple Findings and absent data

Keep the three-newest cap, deterministic ordering and tie-break exactly as today. In zh locale each Finding gets its **own** Chinese static advisory mapped by `advisoryCode` and its **own** default-closed original `<details>`. No English disclosure for English-default text. Optional next-check and history remain **only under the newest**, after its original-text disclosure. No merging F1/F2 into one alarm; do not reduce a distinct verified F2 finding to a generic F1 “retry” message.

When Finding changes or Session switches, disclosures must start closed, and stale prior English body may not linger. Key by `sessionId:findingId:advisoryCode` or prove equivalent React lifetime. On NOT_FOUND/EMPTY/UNAVAILABLE/zero Findings, no phantom Chinese advice/disclosure; preserve current degraded-only wording for reasonCodes. If locale is missing, dictionary unavailable or a translation lookup fails, fallback to the **unchanged canonical English body** rather than blank content or a false “success” state. No extra Host read, storage, network, provider translation or authorizing control.

## 4. Layout, theme, locale and accessibility specifications

- **Visual priority:** Heading > Finding kind > Chinese fixed explanatory body > collapsed original source > optional manual inspection > optional historical context. Risk/Approval remain separate surfaces.
- **Density:** Avoid an always-expanded bilingual double paragraph. The new original-language summary is one compact line per Finding; the original English paragraph is not visually rendered until expansion. For three Findings at 390px, line wrapping must work without horizontal page/composer overflow. No arbitrary truncate, ellipsis or fixed-height clipping of actual safety text.
- **UI style:** reuse `OnlineCorrectionDock.module.css` values and existing border/muted tokens. The original is a secondary neutral disclosure, **not** a red error box or an action button. Maintain readable contrast in light/dark and show keyboard focus visibly. Use native `<summary>` with Enter/Space; ensure correct accessible name and label the original as English (`lang="en"` on the English content only, not the whole Finding).
- **Language fallback:** only exact existing `advisoryCode` values receive bounded static Chinese text from the client locale. No free-form interpolation from Tool output and no new server payload. Do not guess novel future code meanings. Unknown locale/code or missing translation fails to canonical original. English stays exact and default.
- **Semantics:** `role=status aria-live=polite` already wraps the Dock. Do not create additional assertive live regions or duplicate auto-announcements for the hidden original. Current recommendation remains `ADVISE`, not an approval decision.
- **Current historical evidence:** if original is English, display it as original; do **not** silently generate a Chinese text and mark it “verified”. Current Chinese field labels are already translated and remain in place.

## 5. Contract-safe implementation boundary (future, separately authorized)

Expected bounded Client-only files:
- `src/client/OnlineCorrectionDock.tsx` (display selection and native original disclosure), `src/client/OnlineCorrectionDock.module.css` (compact disclosure styling), `src/client/online-correction-locales.ts` (strict two-key Chinese fixed UI explanations plus UI labels).
- Focused tests in `tests/p12-2-online-correction.spec.tsx` and only those existing relevant Client correction/history/next-check cross-surface tests requiring presentation assertions (`tests/p14-4-correction-historical-context-client.spec.tsx`, `tests/p14-5-correction-next-check-client.spec.tsx`, `tests/p14-6-cross-surface.integration.spec.tsx`). New isolated `validation/phase15-3d/**` Chrome fixture and <=4 labelled screenshots may be introduced under separate implementation authorization; do not overwrite Phase15.3A/15.3C screenshots/runner or the currently installed Client artifact.

**Absolutely invariant:** `src/host/live-correction.ts` `F1_TEXT/F2_TEXT` and `renderOnlineCorrectionAdvisory(code)` returned bytes; existing `tests/p12-2-online-correction.spec.tsx` U9's Host/Client equality; `online-correction-contract.ts` DTO wire fields/codes; online-correction store polling/identity/fencing; the 3-Finding cap, optional-next-check and optional-history eligibility/freshness; native approval/Risk Coordinator authority; accepted Phase15.3C UX; package/dependency/lock/Harness, and installed `web` Profile. No Agent, Tool, Provider, real approval or Full implicitly authorized.

Implementing D1 **does intentionally change which advisory text is visually primary for the Chinese locale**. This is a reviewed **UI-display contract extension**, not permission to rewrite the canonical Host/Client fixed text. The original English bytes must remain available by user action; the static Chinese sentence must map solely from the same validated code. This difference must be tested rather than concealed as “no behavioral change”.

## 6. Future independent acceptance matrix

| ID | Criterion |
| --- | --- |
| L1 | For both F1 and F2, English visible fixed body unchanged; canonical `renderOnlineCorrectionAdvisory(code)` byte-identical to Host renderer and current U9; no changes to Host source |
| L2 | Chinese default contains the **exact approved wording** above and explicit “中文提示” provenance; English original is collapsed and independently openable for each Finding; raw English exactly unchanged |
| L3 | F1 does not claim root cause known; F2 distinguishes completed *operation* from unmet verified postcondition and *not* goal completion; no “success” or automatic fix |
| L4 | Up to three Findings, changing sort order and Session A→B→A, NOT_FOUND/degraded and stale responses: no mismatch, duplicate advice or inherited disclosure state; changes after real Client/store request, not only a static fixture |
| L5 | New optional UI presentation cannot erase canonical fallback when translation/locale lookup fails; historical evidence and manual check retain existing field provenance, identity and independent collapsed sections |
| L6 | Real production Client and CSS in isolated Chrome: 1280px/390px, light/dark, en/zh; no horizontal overflow, long normalized text wraps, focus/keyboard/ARIA and correct `lang=en` source segment; bounded screenshot metrics vs Phase15.3A V4/V5 |
| L7 | Focused Phase12.2 U1–U22, Phase14.4/14.5/14.6 and earlier Phase15.3C semantics regression, typecheck, build/pack identity and exact-candidate provenance; only after implementation authorization. No deployment by acceptance alone |
| L8 | No Agent/Tool/provider/Harness/Profile touches, no source-bearing history mutation, no new Host/DTO writes; no Canonical Full implied. Report tests honestly if partial/blocked |

No synthetic screenshot is equivalent to true Host F1/F2 accuracy or actual user experience.

## 7. Product decision requested

**Recommended D1**: Chinese default reads naturally, English remains the exact canonical diagnostic behind a per-Finding expandable “查看原始诊断（英文）”; English default continues as before; five historical source fields never silently change.

If the user approves D1 and the two precise Chinese sentences, ChatGPT may separately freeze **Phase15.3E** (bounded Codex UI implementation and verification). The present Phase15.3D **does not authorize implementation or Web deployment**.

**Final:** `RISK_ADVISOR_PHASE15_3D_DESIGN_PROPOSED_AWAITING_USER_DECISION`.
