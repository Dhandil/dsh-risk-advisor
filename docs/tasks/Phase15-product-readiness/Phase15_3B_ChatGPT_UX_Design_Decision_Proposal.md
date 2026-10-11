# Risk Advisor Phase 15.3B — ChatGPT-Owned UX Design Decision Proposal

**Status:** `RISK_ADVISOR_PHASE15_3B_CHATGPT_DESIGN_READY_FOR_USER_DECISION`  
**Design and architecture author:** ChatGPT  
**User:** product decision/approval authority  
**Execution agent (zcode / Codex):** future code implementation, focused browser checks and regression evidence **only after a separately reviewed implementation authorization**  
**Baseline main:** `ab4cf2555b0bf5e05234a5cdf91537cc4b117a60`  
**Evidence:** `Phase15_3A_Synthetic_Browser_UX_Execution_Report.md`, seven committed synthetic Chrome screenshots, and `Phase15_3A_Independent_Architecture_Acceptance.md`  
**Accepted product executable:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`  
**Installed activation:** Phase15.2B accepted, not a real Tool/Agent UX trial.

## 0. Authority correction (supersedes prior delegation)

The previous `Phase15_3B_UX_Design_Decision_Architecture_Freeze.md` incorrectly named zcode as “Design research and report” executor. **That assignment is withdrawn. Do not send or execute the old Phase15.3B design prompt.** Product UX research, alternatives, exact interaction hierarchy, design selection and architecture acceptance belong to **ChatGPT**. The user chooses among consequential UX trade-offs. zcode/Codex may later review implementation feasibility and implement a frozen, user-approved design, but must not independently redefine UX requirements.

This proposal is ChatGPT's design artifact, not an execution report, test result, approved source change or authorization to run zcode. This document leaves the preceding freeze's safety/authority, no-product-change and evidence constraints intact, superseding **only** delegation/ownership.

## 1. Grounded current state

| Surface | Accepted UI evidence | Source fact | Design problem |
| --- | --- | --- | --- |
| Ordinary Tool risk | V1 default dock **174px** in synthetic Chrome; V2 with historical-shaped content **340px** (+166px) | `RuntimeRiskAwarenessDock.tsx` currently renders five historical fields inline when correctly bound/fresh | Optional past experience competes with **current** risk and composer space |
| Native Approval | V3 real component indicator **28px**; actual Details modal has concatenated metadata | `RiskAdvisorCard.tsx`: `risk-advisor-operation-details` renders adjacent `strong` and `span` values, no semantic row layout; CSS preserves 28px compact indicator | Hard to scan resource/permission/containment/reversibility in modal |
| Online Correction | V4/V5 renders actual fixed F1/F2 content, V5 zh mixes fixed English body + historical English fields | `OnlineCorrectionDock.tsx` has English `ADVISORY_BODIES`, while `online-correction-locales.ts` localizes labels and next-check UI. Historical text comes from Host evidence | Language inconsistency; cannot silently rewrite frozen diagnostic text or evidence |
| Combined / narrow | V5 expanded stack tall; V6 width **390px** showed wrapping without horizontal overflow | Two independent `conversation.input.dock` entries; not a single combined card | Preserve independent source authority, compact defaults and small-screen legibility |

These are component-level synthetic browser observations, **not** actual user-Profile risk events, verified Finding correctness, Agent recall or native approval E2E. V7's delayed async response path is still **NOT EXERCISED / UNSCORABLE**. No source-confirmed runtime defect was established by Phase15.3A.

## 2. Design A — Historical Guidance in ordinary risk dock

### Alternative A1 — native collapsed historical disclosure **(recommended)**

CURRENT: conditional historical body with five raw source fields visible under ordinary-risk advisory.  
PROPOSED: show a single secondary, keyboard-accessible `<details>` row **only while** the existing qualified/matching/fresh historical view exists; its `<summary>` is initially closed. Copy is localized UI helper text, not a claim that the current target is verified:

```text
Risk Advisor                         HIGH
建议：谨慎允许
原因：...
评估不完整 / 仅供参考
▸ 历史经验 · 当前目标适用性未验证   [default closed]
▸ 评估详情                           [default closed]
```

On expansion, show the existing five fields **unchanged** (title, observation, context caveat, manual next-check, authority notice), with source original-language marking. Use a separate semantic name from “评估详情” to avoid two indistinguishable disclosures. Apply small subdued spacing and keep the current alert/caveat above it. Do not introduce another banner or authorizing call-to-action.

Use explicit component identity keyed by current Session + executionId + assessmentId (or equivalent demonstrated reset): old disclosure state must not carry to a new execution/Session. When history expires/withdraws/mismatches, the entire disclosure disappears; a later new eligible history is closed by default. A pending native approval still suppresses the matching ordinary-risk dock. `<summary>` remains operable with keyboard Enter/Space and assistive tech. No new history polling.

### Alternative A2 — one-line teaser + expand button (not recommended)

A short inline status, e.g. “已有相关经验 · 查看”，then custom click to reveal. It makes the presence discoverable but adds button semantics/state/focus management, extra always-on text and more potential stale expansion state. Current native disclosure is simpler and better aligned with existing `<details>` UI.

**Decision recommendation:** A1. The existing no-history 174px measurement is a fixture baseline, **not a target SLA**. In a comparable fixture the closed-history incremental footprint should be approximately one disclosure header, with the five raw fields not visible until expansion; do not impose an invented pixel equality. No changes to historical eligibility, source text, Host, 1500ms expiry, request fencing or permission boundary.

## 3. Design B — Native Approval Details operation metadata

### Alternative B1 — semantic definition list with explicit grouping **(recommended)**

CURRENT: `data-testid="risk-advisor-operation-details"` holds adjacent unseparated resource/permission/containment/sandbox/reversibility spans.  
PROPOSED: keep title and summary exactly where they are; replace **only modal metadata layout** with a compact `<dl>` (or one list of semantic pairs), with a bounded label column, wrapping value column and a proper list of multiple resources.

```text
Risk Advisor details                  ×
仅供参考；最终审批由 Harness 决定。

操作
Synthetic file operation
Description of operation...

资源                  file: synthetic-output.txt
                      workdir: synthetic-workspace
请求权限              danger-full-access
工作区包含状态        unknown
沙箱覆盖状态          unknown
可恢复 / 可逆         unknown

评估摘要
...
```

Visual rules: use `dt/dd` or explicit pairs, `minmax(0,1fr)` value, `overflow-wrap:anywhere`, rows spaced at a consistent rhythm, no unbounded fixed width. At narrow 390px, labels and values may stack if necessary, without sideways scroll. Keep unknown/partial literal meaning; do not replace `unknown` with green icons or assumed boolean. Multiple resources preserve order and no resource is lost.

**Invariant:** the accepted *outside* Native Approval indicator remains exactly the same 28px single line, Details entry and existing Harness Allow/Reject controls remain the only decision mechanism. No replacement of RiskAdvisorDetail context/approval ownership, modal provenance, status mapping or underlying decision text.

### Alternative B2 — stacked label/value rows (viable fallback)

Explicit block wrappers with bold small labels above each value. Easier to style under tight widths and long strings, but taller on desktop and less semantically precise unless properly labelled. Could be selected if a bounded fixture shows B1's aligned columns fail at modal width.

**Decision recommendation:** B1, with B2's stacked behavior as **responsive CSS fallback** below the width needed for two columns (use content/real layout break, not a guessed device model).

## 4. Design C — Chinese UX and evidence provenance

### Three distinct types of text

**C1 Product-owned display labels / help:** use existing `en`/`zh` locale namespaces for current-risk headings, fixed explanation labels, section titles, manual-check action labels and caveats. Never translate authorization into an executed approval. Any newly added helper copy is explicitly *advisory*, e.g. “仅供参考 · 需独立核实当前目标”.

**C2 Fixed F1/F2 `ADVISORY_BODIES`:** Phase12 accepted a fixed text identity/Host renderer parity; `tests/p12-2-online-correction.spec.tsx` asserts Client `renderOnlineCorrectionAdvisory(code)` equals Host diagnostics renderer. A naive direct Chinese substitution in the existing fixed body would change an accepted contract. Do not do this silently.

**C3 Historical/current source-bearing evidence:** `historical.title`, `observation`, `contextCaveat`, `nextCheck`, `authorityNotice` and free-form current reason text preserve their original bytes and authority notices. Chinese UI may visibly say “原始记录（英文）” / “原始证据（未翻译）”; **never** mark an unverified translation as original verified evidence. UI cannot infer that raw English itself is an untranslated error.

### Alternative C1 — local Chinese explanation with immutable original F1/F2 body (recommended as separately scoped follow-up)

Provide a **short UI-only interpretation**, separately marked as “提示说明（非原始诊断文本）”, alongside the original fixed diagnostic text; default can prioritize concise Chinese and place the immutable English original in a clearly labelled, accessible `<details>` **only if** tests demonstrate no source/semantics/Host-client fixed-body contract break. The raw English fixed body must remain accessible and byte-identical, not silently removed from the underlying renderer contract.

Possible synthetic microcopy, **not a substitute for the accepted evidence**:

- F1: “连续重试出现相同失败特征。建议先检查前置条件及失败原因，再决定是否重试；这不等于已经确定根因。”
- F2: “执行已经结束，但已验证的预期后置条件未满足。请独立核对目标状态；不要将本次执行视为目标已完成。”

Avoid a second interpretation if it lengthens the composer more than the fixed English body; do not default-expand both languages. Historical strings remain original-language source beneath localized field labels.

### Alternative C2 — formal multilingual fixed-body contract revision (not in 15.3C)

A separately frozen Host+Client and tests change creating approved equivalent F1/F2 locale templates while retaining wire codes, semantic fidelity and audit links. This is cleaner in the long term but is **not purely UI**; it requires architecture review, new contract tests and explicit user authorization. No model/LLM translation at runtime.

**Design decision recommendation:** localize safe product-owned helper labels now; **defer actual F1/F2 fixed-body rendering change** to a separately approved contract-aware follow-up (C1 exploratory first, C2 if correctness/readability demands it). Do not label untranslated historical evidence as a defect of the locale system, but make original-language provenance visible.

## 5. Suggested implementation split (not authorized here)

### Phase 15.3C — bounded visual implementation *if user approves*

A1 native collapsed historical disclosure + B1 semantic approval-modal metadata grouping. Only UI files expected:
- `src/client/RuntimeRiskAwarenessDock.tsx` and `.module.css`, plus locale names needed for the history summary;
- `src/client/components/RiskAdvisorCard.tsx` and `.module.css`.

Do not alter store, observer/Host, bridges, DTOs, polling/freshness, F1/F2, provider, native approval authority, source evidence fields or packaging. Potential focused regression references: `tests/p14-1-runtime-risk-client.spec.tsx`, `tests/p6-ui.integration.spec.tsx`, `tests/p14-6-cross-surface.integration.spec.tsx` and the existing Phase15.3 fixture/screenshots, with additions only after a new implementation freeze.

### Phase 15.3D (separate *later* decision) — localization contract

First inspect `src/client/OnlineCorrectionDock.tsx`, `online-correction-locales.ts`, `src/host/live-correction.ts`, the fixed `ADVISORY_BODIES` identity invariant and `tests/p12-2-online-correction.spec.tsx`. Decide localized explanation vs formal bilingual fixed-body contract before changing anything. Historical evidence field preservation remains non-negotiable.

## 6. Later test / browser acceptance gates (future authorization only)

| Gate | Required evidence |
| --- | --- |
| Visual default / expanded | Real production component + CSS; compared V1 (174px synthetic baseline) and V2 (+166px inline history), default history closed and raw five fields only expanded; no new unnecessary always-on area |
| Identity and expiry | Session A→B→A, execution/assessment change, history `NOT_FOUND`/expired/withdrawn, async late response test (the Phase15.3A V7 gap remains OPEN until actually tested) |
| Accessibility | Native `summary` Enter/Space, readable announcement and focus continuity; no hidden current-risk caveat or unlabelled metadata |
| Native Approval | 28px indicator unchanged; real Detail modal still displays all resources/unknown states; command visible; Harness approval authority untouched |
| Width/theme/locale | Light/dark, zh/en, desktop and 390px; no horizontal overflow or source content clipping; honest language/provenance labels |
| Correction isolation | F1/F2 fixed code/body identity and current Host parity unchanged by A/B. Current Finding, manual check and historical note separate; optional error does not erase base Finding |
| Execution scope | Only focused Client/fixture regressions and isolated Browser observations if authorized; no Agent/Tool/provider/campaign/Canonical Full by implication |
| Deployment | No automatic modification of the existing `web` Profile. New product changes require separate package/build/install and rollback approval |

Do not treat screenshots alone as proof of real async fencing, semantic Finding detection, human usefulness or provider behavior.

## 7. Questions requiring user's UX choice

The recommended safe defaults are:

1. **Historical experience**: use A1 (closed by default with explicit applicability warning), rather than always-on inline content?
2. **Approval metadata**: use B1 (semantic two-column definition list, narrow-width stacked fallback), leaving the compact 28px row unchanged?
3. **Chinese**: implement safe UI-owned wording now, while keeping frozen F1/F2 fixed advisory text and historical evidence original-language until a separately gated localization decision?

**No change has yet been made to `src/`, test code, fixture, installed Profile or user data.** The user must approve these product decisions and a later implementation freeze before zcode implements them. The original Phase15.3B design prompt delegated to zcode is superseded.

**Outcome:** `RISK_ADVISOR_PHASE15_3B_CHATGPT_DESIGN_READY_FOR_USER_DECISION`.
