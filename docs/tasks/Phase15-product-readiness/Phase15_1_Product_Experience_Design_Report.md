# Risk Advisor Phase 15.1 — Product Experience & Activation Design Report

**Outcome:** `RISK_ADVISOR_PHASE15_1_DESIGN_READY_FOR_ARCHITECTURE_REVIEW`
**Reviewed `main`:** `f1b875c21bebde4e5f84a43d9bcd21c82c037f79`
**Phase 14 accepted executable:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`
**Pinned Harness reference:** `ddefc45fbc7f8e46dd73185e68295696d1297887`
**Artifact type:** documentation-only, source-grounded design; all to-be points below are proposals, not implemented behavior.

## 1. Scope and evidence boundary

Phase 15.1 is design before code. It describes the actual source and registration
points, proposes a small user-observed activation experience, and keeps the
Phase 13.3 real-Agent validation blocker open. It does not install or exercise the
plugin and does not establish a product defect.

The reviewed Phase 14 executable is an ancestor of the specified starting `main`.
The intervening changes before this report are documentation-only. This report
uses source and contract names as evidence; it does not fabricate screenshots,
profile state, live UI observations, or Finding events.

## 2. D1 — Source-grounded surface map

### Host and wire authority

`src/index.ts:105` exports the Host `apply()`. It installs correlation, the bounded
ledger and Operation Foundation, Risk Engine and rules, approval assessment
coordination, `RuntimeRiskAwarenessRuntime`, postcondition verification, Phase 11
Experience/Outcome/Pattern/Guidance runtimes, and Phase 12 `LiveCorrectionRuntime`.
The `tools/pre-execute` observer captures bounded facts and calls `next()`; settled
facts are observed on `tools/result`. Storage, connection/session, Judge/subagent,
shell, and filesystem capabilities attach through Harness services. The four
Phase 14 read-only bridges are installed with the existing Host connection/session
bridge: ordinary risk and historical context, approval historical context,
correction historical context, and correction next-check. Their contracts are
separate from the native approval decision.

Relevant wire contracts are `src/bridge-contract.ts` (`active`, `assessment`,
`runtime-risk`), `src/historical-context-contract.ts`,
`src/approval-historical-context-contract.ts`, `src/online-correction-contract.ts`,
`src/correction-historical-context-contract.ts`, and
`src/correction-next-check-contract.ts`. Phase 12 remains the only authority that
creates or suppresses F1/F2 Findings. Phase 14 history and next-check bridges are
optional read projections; they do not create a Finding, authorize a Tool, or
qualify a successful outcome.

### Browser registrations and current behavior

`src/client/index.ts:127-161` registers one approval-detail slot and two distinct
composer docks. They are separate surfaces, not one combined card.

| Surface | Exact registration and source | As-is behavior and states |
| --- | --- | --- |
| Native Approval detail | `conversation.approval.detail` → `RiskAdvisorDetail` (`src/client/index.ts:133-140`); `src/client/RiskAdvisorDetail.tsx`; `src/client/components/RiskAdvisorCard.tsx` | The operation command is rendered in the existing detail. The compact approval indicator shows severity, recommendation, primary reason, requested permission and PARTIAL/DEGRADED caveats. `RiskAdvisorCard.module.css` fixes the row to 28px; Details opens Harness `Modal` with operation, risk dimensions, evidence, findings, uncertainty, failure context and alternatives. A local boundary falls back to an unavailable indicator for core-card failure. Optional approval history is separately error-contained, requires the exact pending approval binding and fresh Host observation, and is initially collapsed in `<details>`. Native Approval remains the only authority. |
| Ordinary Tool risk | `conversation.input.dock`, id `risk-advisor-runtime-risk-awareness`, order 20 (`src/client/index.ts:154-161`); `src/client/RuntimeRiskAwarenessDock.tsx`; `src/client/runtime-risk-store.ts` | `EMPTY`/`NOT_FOUND` render no row; `PENDING` renders a queued message; `UNAVAILABLE` renders an advisory availability message except while approval/fresh-read suppression applies; a `VIEW` renders severity, recommendation, primary reason, pre-execution/degraded caveat and advisory label. A `DEGRADED` assessment stays explicitly caveated. Detailed analysis is collapsed in `<details>`. A matching pending approval hides this composer projection; the existing approval-detail surface owns that interaction. The optional ordinary-risk historical note is shown only for matching Session/execution/assessment while fresh; source currently renders its five fixed fields inline rather than collapsed. |
| Online Correction | `conversation.input.dock`, id `risk-advisor-online-correction`, order 10 (`src/client/index.ts:145-152`); `src/client/OnlineCorrectionDock.tsx` | Only a Host `VIEW` with current content renders. Findings sort by `observedAt` then `findingId`; at most three fixed F1/F2 advisories are shown. The newest Finding alone can receive optional next-check and history sections. Each optional section is collapsed by default; its failure is isolated from the underlying F1/F2 dock. Empty, NOT_FOUND, or unavailable data does not create a visible Finding and is not evidence of a true negative. |

The approval summary's `APPROVE` wording is a Risk Engine recommendation, not an
approval result. The compact indicator's accessible disclaimer says Native
Approval remains authoritative (`src/client/locales.ts`). Runtime-risk and
Online-Correction copy have Chinese and English dictionaries in
`src/client/runtime-risk-locales.ts` and `src/client/online-correction-locales.ts`.
The approval row has an explicit `max-width: 480px` style; the two composer docks
use Harness theme variables, wrapping, and bounded content, but no corresponding
mobile breakpoint was found in their CSS. This is a source observation, not a
claim of a visual defect in a real viewport or theme.

### As-is journey

1. A separately installed Harness plugin provides the Host `apply()` and Browser
   Client module. Package metadata (`package.json`) exposes `lib/index.js` and
   `lib/client.js`, with the web Client injecting existing locale, approval, chat,
   renderer and connection modules. No Phase 15.1 onboarding or activation screen
   was found in these product registrations.
2. On an ordinary Tool, Host pre-execution evidence can produce a best-effort risk
   view. The runtime-risk dock and its optional historical note are independent of
   approval. The modal-level analysis remains closed until requested.
3. If a native approval is pending, the ordinary risk dock suppresses a matching
   row. The compact Risk Advisor detail appears inside the Harness approval detail
   slot; the existing Harness control owns the decision.
4. A qualifying live F1/F2 Finding appears in the separate correction dock. The
   fixed Finding is primary; current verifier-derived next-check and trusted
   historical context are clearly labelled, optional, and collapsed.
5. Session, request, and connection generations clear or fence old optional views.
   Current-source inspection cannot determine whether the full composition feels
   timely or clear in a user's normal Web profile.

## 3. Proposed minimal to-be hierarchy (unimplemented)

This proposal changes presentation emphasis and review criteria, not protocol,
scoring, authority, or content eligibility.

| Interaction state | Proposed attention order | Keep quiet or conditional |
| --- | --- | --- |
| Ordinary Tool, no approval | Current risk level → recommendation → primary reason → freshness/DEGRADED caveat → explicit advisory boundary. Keep the existing detailed analysis collapsed. | Historical Guidance is secondary and optional; consider collapsing it by default to avoid making every qualified history record expand the composer. This would be a UI change and is not current behavior. |
| Native Approval pending | Native Harness decision controls remain visually primary. Keep the existing 28px Risk Advisor indicator compact; use its modal for detail. Distinguish the recommendation label from the pending approval decision. | Keep approval history collapsed and clearly subordinate. Do not add a second approval button, confirmation window, or attention-grabbing alert. |
| Current F1/F2 Finding | The live, fixed Finding statement is primary and remains unchanged. Label it as execution evidence, not a proven task-goal failure or root cause. | Keep one evidence-bound manual next-check and one historical note separately labelled and collapsed. Neither should look like an executable fix. |
| Both composer docks visible | Retain separate origins: pre-execution risk projection vs settled execution Finding. Do not combine their scores or imply one caused the other. | Avoid extra badges, duplicate summaries, or an always-open history/next-check section. No new combined-card UI is proposed. |

The proposal's test is whether a user can answer “what is current evidence?”, “what
does Risk Advisor recommend?”, and “who decides whether the Tool proceeds?” without
confusing historical similarity with current verification. If source authority,
currentness, or optionality cannot be stated accurately, hide the optional content.

## 4. D3 — Bounded state and visibility matrix

| Inputs/state | Current visibility | Design interpretation and validation label |
| --- | --- | --- |
| Ordinary risk `PENDING` | Queued/pre-execution-evidence message; no complete score implied. | `IN PROGRESS`, not a completed assessment. |
| Ordinary risk `VIEW` / complete | Severity, recommendation, primary reason, pre-execution/advisory labels; details collapsed. | Review the summary first; use details only on intent. |
| Ordinary risk `VIEW` / `DEGRADED` or `PARTIAL` | Visible caveat/tag; unknown remains unresolved, not LOW. | Degraded is an evidence qualifier, not an alert that blocks execution. |
| Ordinary risk `UNAVAILABLE` | Availability advisory if not suppressed by matching pending approval/fresh read. | No score or reassuring state is inferred. |
| Ordinary risk `EMPTY` / `NOT_FOUND` | No composer row. | `NOT EXERCISED` if no eligible Tool exists; absence alone is neither PASS nor a true negative. |
| Approval pending, exact Session/call binding | Native approval surface plus compact Risk Advisor detail; matching ordinary dock is hidden. Optional history requires exact binding and fresh response. | Native approval decides. Stale, missing, or misbound history disappears without changing approval. |
| Approval settled, changed call, or Session switch | Client/store key, target, or generation changes; old content is cleared/fenced. | A→B→A must always follow the currently selected Session. Late responses are not evidence for the new target. |
| F1/F2 qualified and live | Up to three base Findings; optional sections may bind only to the newest eligible Finding. | Count a user-observed surface only when independent eligible evidence exists. |
| No live F1/F2, displaced, expired, conflicted, or NOT_FOUND | No base Finding or optional section. | Without independent truth, use `NOT EXERCISED`; with an eligible event but insufficient independent evidence, `UNSCORABLE`. Never call this TN. |
| Historical Guidance absent, stale, unavailable, or mismatched | Optional note absent; base risk/approval/F1/F2 remains independent. | Expected optional absence, not a product defect or negative risk result. |
| Next-check source missing/stale or optional Client failure | Optional next-check absent; base F1/F2 remains. | The UI must not imply cause, target, or remedy was verified. |
| Long text, narrow viewport, Chinese/English, light/dark, mixed async completion | Source has bounded/wrapping styles and bilingual dictionaries; actual combined layout has not been observed in a real profile. | `NEEDS HUMAN OBSERVATION`; no visual pass/fail inferred from CSS alone. |

Freshness and cleanup are part of visibility: ordinary history, approval history,
correction history, and next-check use Host-observed freshness bounded to 1,500 ms;
ordinary risk and base correction clients poll at one-second intervals. The stores
abort/fence requests on target or connection-generation changes. These are source
contracts, not measured end-user latency claims.

## 5. D4 — Prioritized UX gaps

| Priority | Classification | Finding | Evidence boundary |
| --- | --- | --- | --- |
| P1 | `NOT_SUPPORTED_BY_EVIDENCE` | No evidence establishes that a current user Web profile selects the exact Phase 14 accepted package and loads its matching Host/Client artifacts. | Phase 14.6 E3 loaded the production Client bundle in an isolated Chromium/module-loader smoke; it was not a normal Web profile install/startup proof. Historical V1 profile observation predates Phase 14. |
| P1 | `NEEDS_HUMAN_OBSERVATION` | Comprehension, usefulness, distraction, and decision-time impact of the Phase 14 surfaces together remain unknown. | No accepted Phase 14 human UX observation is recorded. Do not label this a defect before observation. |
| P2 | `DESIGN_OPPORTUNITY` | The runtime-risk dock and correction dock are separate composer registrations and may coexist. Optional ordinary-history content is currently inline; correction history and next-check are collapsed. | Source confirms registration and markup, not the actual height, overlap, or distraction in a real Harness viewport. The collapsed-history proposal above is not implemented. |
| P2 | `NEEDS_HUMAN_OBSERVATION` | Users may need help distinguishing an advisory recommendation, a native pending decision, a live F1/F2 predicate, historical context, and a manual check. | Copy explicitly labels advisory/history/check semantics, but user comprehension has not been measured. |
| P3 | `NOT_SUPPORTED_BY_EVIDENCE` | Current Web activation, Host route availability, restart behavior, profile rollback, and user-facing performance are not established for the exact current package. | Deterministic lifecycle tests and older pilot evidence do not prove these current-profile facts. |
| P3 | `NOT_SUPPORTED_BY_EVIDENCE` | Real-Agent positive F1/F2 recall/generalization is unknown. | `Phase14_Open_Validation_Register.md` remains `REAL_AGENT_GENERALIZATION_UNVERIFIED`; its file-read/list isolation blocker remains open. |

**`SOURCE_CONFIRMED_DEFECT`: none identified by this source-only design review.**
That is not a claim that live UI is defect-free.

## 6. Future validation plan only

The following stages are recommendations. This report does not authorize either
stage. Profile selection and any installation require the user's explicit choice
and authorization.

### Stage A — Activation-only

1. Have the user identify the exact target Web profile. Read its Harness SHA,
   selected plugin package identity, and only the profile control-file metadata
   required for a recoverable pre-install snapshot. Stop if the active target is
   ambiguous or a snapshot cannot be preserved.
2. Build/pack only the accepted Phase 14 executable lineage. Record exact source
   SHA, Harness SHA, tarball SHA-256, `lib/index.js` SHA-256, and `lib/client.js`
   SHA-256. Do not rely on `0.1.0-r1` alone. Never record token, Cookie, or secret
   values.
3. After explicit install authorization, use the Harness-supported profile plugin
   manager with the local package only. Preserve all existing settings and selected
   plugins; verify installed package/bundle hashes against the prepared artifact.
4. Start normal Harness Web only after the profile change is authorized. Observe
   Host activation/registered routes and actual Client slot registration, then
   close the page and Host. Do not invoke Agent, Provider, or Tool in Stage A.
5. Record the user's visual/activation observations and retain rollback metadata.
   On unrelated profile drift or startup failure, stop and use the documented
   rollback route; do not improvise reinstall or config changes.

Activation-only can validate artifact selection and plugin activation; it cannot
validate an ordinary Tool card or approval interaction. It must be reported as such.

### Stage B — Agent Tool experience (separate authorization and safety gate)

The file read/list boundary remains unproven. A disposable directory, prompt, or
workspace-write label is not an enforced boundary. Do not start this stage until an
independently reviewable execution boundary is demonstrated, or a new architecture
decision explicitly defines a safe alternative.

If that precondition later passes, the minimum proposed interaction is one
human-initiated, low-risk Tool task in a dedicated synthetic workspace using the
profile's unchanged provider settings. Observe the ordinary risk summary and a
single A→B→A Session switch. Inspect native approval only if the safe task naturally
produces one; do not change policy or create a risky operation to force it. Observe
Phase 11 Guidance only if qualified history already exists. Do not create retries,
postcondition mismatches, or F1/F2 Findings on purpose. No eligible positive event
means those detection surfaces are `NOT EXERCISED`; an eligible event without
independent truth is `UNSCORABLE`, not TN. This is a bounded UX smoke, never the
Phase 13.3 20-task campaign or a recall estimate.

Close the test page/Host after the user's observation, remove only this stage's
dedicated synthetic workspace files, and preserve the profile snapshot and all
historical sessions/evidence.

## 7. User observation questions and decision criteria

Ask the user these five questions after observing the real surface:

1. Can you quickly tell the current risk level, recommendation, primary reason,
   and whether Harness or Risk Advisor decides the operation?
2. When Native Approval is pending, is the compact summary enough before opening
   Details, and do you see any duplicate or competing decision surface?
3. If a correction Finding appears, can you distinguish the live execution fact
   from historical context and from the manual next-check?
4. When both composer docks are present, do they remain easy to scan without
   displacing the task or hiding the current conversation?
5. Are the Chinese/English wording, freshness/degraded caveat, and optional
   collapsed content understandable and useful, or distracting?

Recommend a **no-code UX review** when behavior follows frozen contracts, the user
understands the distinct authorities, and remaining feedback concerns naming,
priority, or optional-content preference without a reproducible usability blocker.
Recommend a **product repair** only for a reproducible mismatch with the frozen
source contract or a concrete observed failure (for example stale cross-Session
content, an optional section masking its base Finding, or incorrect authority
wording). Capture exact profile/package identity, safe reproduction steps, state
and privacy-bounded evidence; obtain a new reviewed scope before changing code.
Subjective preference alone is a design input, not proof that the existing product
contract is defective.

## 8. D1–D6 Gate results and execution record

| Gate | Result | Evidence |
| --- | --- | --- |
| D1 — exact source/registration map | `PASS` | Host `src/index.ts`; Browser `src/client/index.ts`; exact components, stores, contracts, locales, CSS and Phase 14 reports cited above. No invented screenshot or feature. |
| D2 — authority separation | `PASS` | Native Approval remains authoritative; Phase 12 alone owns F1/F2; historical context and next-check are optional and read-only. Current, historical, and suggested content are separated in the map and proposed hierarchy. |
| D3 — compactness, optionality, priority, staleness | `PASS` | 28px approval indicator, modal details, current inline ordinary history, collapsed correction history/next-check, Session/generation fencing, and bounded visibility states are distinguished. All proposed changes are marked unimplemented. |
| D4 — bounded future validation | `PASS` | Activation-only and Agent Tool stages are separate; target profile/install require explicit user choice/authorization; artifact identity, snapshot/rollback, privacy and the unresolved enforced file-access boundary are explicit. |
| D5 — non-actions and scope | `PASS` | Only this documentation report is added. No source, tests, validation, package/config/lockfile, Harness, profile, runtime, or prior acceptance report changed. No tests/build, Harness, Browser, Agent, Provider, deployment, or Canonical Full was run. The only network operations were permitted Git synchronization and documentation delivery. |
| D6 — continuous main delivery | `PASS` | Direct `main`, no branch/worktree. The report is committed and immediately pushed; remote SHA is verified in the execution response. Pre-existing `.vitest-cache/`, `lib/`, and `node_modules/` remain untracked and untouched. |

**Source/design review only.** No product defect is asserted and no implementation or
activation is authorized by this report. Phase 13.3 remains open as
`REAL_AGENT_GENERALIZATION_UNVERIFIED`.
