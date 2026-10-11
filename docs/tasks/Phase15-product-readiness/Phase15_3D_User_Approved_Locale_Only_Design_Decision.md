# Risk Advisor Phase 15.3D — User-Approved Locale-Only F1/F2 UX Design

**Decision:** `RISK_ADVISOR_PHASE15_3D_LOCALE_ONLY_DESIGN_ACCEPTED`  
**Design / architecture author:** ChatGPT  
**User decision:** explicitly approved the revised "Chinese shows Chinese only; English shows English only" design in the current conversation (2026-10-11).  
**Baseline:** `0ad4b1af1be4d04e8d7419ccd738fed49bd0b94b`  
**Status:** design decision accepted; **product implementation and Web delivery not yet performed**.

## 1. Supersession and design authority

This document **supersedes the rejected display proposal D1** in `Phase15_3D_ChatGPT_F1F2_Chinese_UX_Design_Proposal.md`: **no "查看原始诊断（英文）" UI, no secondary English disclosure, and no bilingual duplicate paragraph** for built-in F1/F2 fixed diagnostic advice in Chinese mode. The prior proposal is retained solely as historical design evidence; its English-disclosure recommendation is **not** to be implemented.

User-approved rule:
- **Chinese locale:** display exactly one approved Chinese fixed advisory for each F1/F2.
- **English locale:** display exactly the existing English fixed advisory for each F1/F2.
- **Internal contract:** keep Host's canonical English F1/F2 strings, exported Client `renderOnlineCorrectionAdvisory(advisoryCode)` English string bytes, Phase12.2 U9 Host/Client equality, codes and DTO untouched. Internal canonical text does not mandate user-visible English in Chinese mode.
- **Historical Guidance/current free-form evidence:** source-bearing fields remain unmodified in original language. They are categorically different from product-owned fixed advisory copy and may legitimately show their source language; do not silently translate them or present them as canonical UI copy.

## 2. Locked display texts (exact strings)

| advisoryCode | English display | Chinese display |
| --- | --- | --- |
| `STOP_EXACT_RETRY_PATH_V1` | `The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.` | **同一操作反复失败，且归一化后的失败特征一致。请停止按原方式重试，先检查原因，再决定是否继续。** |
| `INSPECT_UNSATISFIED_POSTCONDITION_V1` | `The operation completed, but the verified expected postcondition was not satisfied. Do not treat this execution as goal completion; inspect the target state before continuing.` | **操作已结束，但经验证，预期后置条件未满足。不能认定本次目标已完成；继续前请核对目标状态。** |

Chinese presentation hierarchy remains `执行建议` → `重复失败 / 后置条件不匹配` → **only corresponding Chinese fixed body** → existing optional next-check → existing optional original-source history. English hierarchy remains as-is. No new diagnostic/provenance badge or text disclaimer is necessary for these two product-owned strings. Existing 'ADVISE'/advisory-only authority remains.

F1's normalized failure signature **does not establish root cause**. F2's completed **operation does not imply successful execution/goal**; the verified expected postcondition is unmet. No approval, verified fix or automatic correction is implied.

## 3. Contract-safe implementation design (for separately authorized Phase15.3E)

Use the already injected `ONLINE_CORRECTION_NS` locale translation function and a strictly enumerated mapping from the existing validated `advisoryCode` to two new product-owned locale keys (e.g. `advisory.f1`, `advisory.f2`) in `online-correction-locales.ts`. The `en` locale dictionary values must remain exactly the canonical English fixed strings (prove with tests); `zh` dictionary values must equal the above **exact** approved Chinese strings. The current exported canonical helper continues to return the unchanged English text. Do **not** modify it, `src/host/live-correction.ts`, DTO, Host renderer or U9.

For missing/unknown locale translation keys, a throwing locale lookup or unsupported locales, display a **canonical English fallback** rather than blanking/throwing away the Finding or inventing a translation. The fallback applies only if localized display text is unavailable, and does not add a second English paragraph. Do not infer locale via arbitrary hard-coded comparisons to `kind.f1` labels or run language detection on historical evidence. Preserve React render purity: no new network/IO or model lookups.

Stable current Finding order (newest three), status/identity/fencing, optional manual next-check and historical eligibility remain as-is. Changing Session/language/Findings updates only the visible text associated with the current `advisoryCode`, never retains a prior Finding message. English users should see no visual change. Exact host/canonical parity and no native approval authority changes are invariants.

## 4. Design acceptance criteria for implementation

- `zh`: F1 and F2 visibly match exact Chinese sentences above; **no English fixed diagnostic text or original-text disclosure**. `en`: exact existing English body and no Chinese overlay.
- Canonical helper and Host fixed English return values remain byte-identical, and Phase12 U9 continues PASS with no weakened assertion. Test locale dictionary English exact equality and Chinese exact approved strings independently.
- Locale switch `zh↔en` updates display for same Finding in the actual Client component. Up to three differing F1/F2 remain correctly associated with their `advisoryCode`, newest sorting, degradation and optional sections unaltered; no ghost text on `NOT_FOUND` or Session A→B→A.
- Missing/throwing translation falls back safely to canonical English, without breaking the base correction advisory or leaking raw Tool details.
- Already accepted optional historical Guidance five source fields and manual next-check original logic and separate disclosures unchanged. Original-language historical data is not a Chinese-fixed-copy defect.
- Isolated real Browser **actual bundled** Client+CSS confirms `zh/en`, light/dark and 390px wrap, no extra disclosure or stacked bilingual text; bounded focused tests/static/build/package and exact provenance. Screenshots are synthetic, not proof of real-Agent detection or native approval.
- Neither design approval nor later code acceptance permits automatic installation in the existing `web` Profile. A **separate** package promotion/backup/activation approval would be required.

## 5. Scope boundaries

No product code changes in this design milestone. Do not run Agent, Tool, Provider, browser, tests or Canonical Full here. The Phase15.3C independently accepted and deployed A1/B1 layout is not re-opened. Real Agent generalization remains unverified.

The design decision is user-approved; a separately frozen `Phase15.3E` may authorize **Codex** (not zcode) to implement and test exactly this Client display change.

**Outcome:** `RISK_ADVISOR_PHASE15_3D_LOCALE_ONLY_DESIGN_ACCEPTED`.
