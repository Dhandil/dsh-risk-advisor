# Risk Advisor V1 UX Maintenance — Compact Risk Indicator Acceptance Report

## Final status

`V1_UX_COMPACT_RISK_INDICATOR_ACCEPTED_BASELINE_ADVANCED`

This report is the independent acceptance authority for the V1 Compact Risk Indicator UX maintenance.

It does not start Phase 11 or V2.

---

## 1. Accepted identities

Previous accepted V1 product executable:

`f4807e2186e43690ba6dc4c349107b55e407aa53`

Accepted Compact Risk Indicator Tested / new V1 product executable:

`345a54882393da7f64584f21105fa7fc56793265`

Execution Report commit:

`7d34d441c6b424c285ad6923d2184ea5e1f585dd`

Pinned Harness Core:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

Fresh complete regression on the exact Tested SHA:

`58 files / 312 tests PASS`

---

## 2. Superseded UX direction

The earlier Card Hierarchy candidate:

`2c17aba72309c87f120979919d831f9f6dac4cef`

was rejected during real Browser review because the nested Risk Advisor card still occupied too much Native Approval space and would become annoying under repeated approvals.

That candidate was not pushed, not merged, and is not in the accepted Compact Risk Indicator ancestry.

The accepted design therefore supersedes the nested-card form rather than incrementally shrinking it.

---

## 3. Accepted product form

The accepted default Native Approval contribution is now:

- the preserved correlated original command;
- one compact Risk Advisor indicator row;
- the existing Native Approval decision actions.

The advisory row is approximately one compact flow row in height and does not render a nested Risk Advisor card, shadow, inline diagnostic tree, or expandable inline body.

The row exposes the decision-relevant signal:

- Risk Advisor provenance;
- localized hazard;
- localized recommendation;
- localized primary reason;
- requested permission when present;
- PARTIAL / DEGRADED caveats when applicable;
- an explicit Details affordance.

Complete diagnostics are available only through the user-triggered Harness Modal.

---

## 4. Independent source review

The implementation relative to the frozen Compact Indicator baseline is limited to client presentation, tests, and the bounded CSS packaging support required by that presentation.

Changed areas include:

- `src/client/RiskAdvisorDetail.tsx`;
- `src/client/components/RiskAdvisorCard.tsx`;
- `src/client/components/RiskAdvisorCard.module.css`;
- `src/client/locales.ts`;
- client CSS module typing;
- affected R1/P6/P10 presentation tests;
- `tsdown.config.ts` CSS-module bundling support.

Independent inspection confirms:

- READY renders one compact row rather than a nested advisory card;
- ANALYZING / UNAVAILABLE / CANCELLED also render compact status rows;
- the row uses the shipped `StateDot`, `Tag`, `Button`, and `Modal` primitives;
- UNKNOWN is not mapped to healthy/LOW;
- severity attention remains presentation-only;
- `danger-full-access` remains visible when requested;
- PARTIAL / DEGRADED remain visible;
- raw reason codes are absent from the compact row;
- complete aggregate values, reason codes, dimensions, findings, uncertainties, alternatives, evidence, failure context, and source remain available in the Modal;
- the correlated command remains visible despite Risk Advisor owning the single approval-detail slot;
- the Modal does not contain Approve / Reject / Execute / Apply authority;
- closing the Modal returns to the same pending approval presentation;
- alternative actions remain copy-only;
- StrictMode / poller ownership is preserved.

The `tsdown.config.ts` change is accepted as bounded packaging support for the new client CSS module. It injects the plugin-owned CSS into the standalone client bundle and does not modify Risk Engine, Host runtime, Browser bridge, correlation, Judge/Evidence, Native Approval, or Harness Core semantics.

---

## 5. Real Mac Browser acceptance evidence

The exact candidate was installed into the real Mac `web` profile with Harness pinned at the accepted SHA.

Real Browser review demonstrated:

- Risk Advisor occupies one compact row;
- the previous nested-card visual weight is removed;
- high risk / recommendation / primary reason remain immediately scannable;
- `danger-full-access` is visible;
- DEGRADED is visible;
- Details opens a Harness Modal without increasing composer height;
- full analysis remains accessible;
- closing Details returns to the same pending Native Approval;
- Native Approval remains the only decision authority;
- no duplicate or stale advisory was observed.

The safe review approval was rejected and no marker file was created.

This satisfies the real-user UX gate for the Compact Risk Indicator.

---

## 6. Non-blocking UX findings

Two details-panel findings remain intentionally outside this accepted candidate:

1. operation metadata inside the Modal is visually tight;
2. the Modal still exposes many raw enum and reason-code values, giving the detail view an engineering-diagnostic feel.

These findings do not affect the normal approval frequency cost because the Modal is user-triggered and does not occupy the default approval surface.

They may be addressed in a later UX polish task without reopening this accepted executable.

---

## 7. Regression authority

Before the real Browser gate, the candidate passed the focused and affected validation suites recorded in the Execution Report, including R1, P6, P10, typecheck, build, package/declaration, and static checks.

After real-user Browser approval, exactly one fresh complete:

`pnpm test`

was run on the exact Tested SHA.

Result:

`PASS — 58 test files / 312 tests`

No executable, test, package, benchmark, or configuration semantic change occurred after that Full.

---

## 8. Publication integrity

Independent remote comparison confirms:

`345a54882393da7f64584f21105fa7fc56793265 -> 7d34d441c6b424c285ad6923d2184ea5e1f585dd`

contains exactly one added file:

`docs/tasks/V1-ux-compact-risk-indicator/Execution_Report.md`

Before this Acceptance Report, remote `main` equals:

`7d34d441c6b424c285ad6923d2184ea5e1f585dd`

Therefore the fresh Full remains authoritative for the exact accepted executable.

---

## 9. Acceptance effect

The accepted V1 product executable advances from:

`f4807e2186e43690ba6dc4c349107b55e407aa53`

to:

`345a54882393da7f64584f21105fa7fc56793265`

The Mac/cross-platform portability work remains inherited repository provenance and does not alter the meaning of this product-executable advancement.

The previously accepted Browser bridge repair remains part of the product lineage.

This acceptance changes presentation form only; it does not change Risk Advisor decision semantics or Native Approval authority.

---

## 10. Final decision

The V1 Compact Risk Indicator UX maintenance is independently accepted.

`V1_UX_COMPACT_RISK_INDICATOR_ACCEPTED_BASELINE_ADVANCED`
