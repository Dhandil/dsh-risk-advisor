# Risk Advisor V1 UX Maintenance — Compact Risk Indicator Freeze

## Outcome

`V1_UX_COMPACT_RISK_INDICATOR_FROZEN_READY_FOR_IMPLEMENTATION`

## Authority

- accepted V1 product executable: `f4807e2186e43690ba6dc4c349107b55e407aa53`
- Mac portability baseline: `e4a729531adcebc30495fea2d514cae21a2c59e0`
- rejected Card Hierarchy candidate: `2c17aba72309c87f120979919d831f9f6dac4cef`
- rejected-candidate Browser finding: `771a2c47a36e1a91e8ab081fbb1064003a1965b8`
- Compact Indicator preflight: `4a6b16e6f15ae8b60bd29d081576cbed9e073912`
- pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`

The rejected candidate is not an implementation base and must not be merged.

## 1. Product form

Risk Advisor must no longer render a nested READY card in Native Approval.

The normal approval surface consists of:

1. the preserved correlated command presentation;
2. exactly one compact Risk Advisor indicator row;
3. Native Approval's existing action row.

No full analysis renders inline.

## 2. Compact row geometry

The Risk Advisor contribution should target the existing compact flow scale:

- one line;
- approximately 24–28 px row height;
- no wrapping under normal desktop width;
- overflow text truncates rather than creating a second diagnostic block;
- no nested card border;
- no shadow;
- no full-width tinted panel;
- no large vertical padding.

Use existing Harness primitives where appropriate.

Expected primitives:

- `StateDot` for semantic status;
- `Tag` only for a short exceptional fact such as elevated permission;
- `Button variant="ghost" size="sm"` for Details;
- `Modal` for full analysis.

A small Risk Advisor CSS module is allowed for one-line layout, ellipsis and modal body structure.

## 3. READY row content

The row must retain clear provenance and decision signal.

Preferred order:

- quiet `Risk Advisor` label;
- localized hazard;
- localized recommendation when useful;
- localized primary reason;
- compact elevated-permission tag when present;
- compact PARTIAL/DEGRADED marker when relevant;
- Details button.

The row may omit redundant field labels such as `Risk:`, `Recommendation:`, and `Primary reason:`.

Example target shape:

`Risk Advisor · 高风险 · 需更多信息 · 关键证据不足   [danger-full-access]   详情`

This is illustrative, not a pixel-exact string contract.

The row must not show raw reason codes by default.

## 4. Severity-aware attention

Map assessment state to visual attention without changing assessment values.

Frozen intent:

- LOW + APPROVE -> `StateDot done`, quiet text;
- MEDIUM / APPROVE_WITH_CAUTION -> `StateDot warning`;
- HIGH / NEED_MORE_INFORMATION / PREFER_SAFER_ALTERNATIVE -> `StateDot warning`;
- CRITICAL or REJECT_RECOMMENDED -> `StateDot error`;
- ANALYZING -> `StateDot ongoing`;
- UNAVAILABLE / CANCELLED -> `StateDot idle`.

Do not reinterpret UNKNOWN as LOW.

A DEGRADED assessment remains visibly marked even if its hazard is otherwise known.

## 5. Permission presentation

If `requestedPermission` is present and the approval surface would otherwise lose that fact when the old Risk Advisor operation card is removed, keep it in the compact row.

For `danger-full-access`, a short warning/danger `Tag` is allowed.

Do not repeat workspace containment, sandbox coverage or reversibility in the default row.

Those belong in Details.

## 6. Full analysis interaction

Clicking Details opens an existing Harness `Modal`.

The Modal must:

- be user-triggered only;
- not alter Native Approval state;
- close via close button, Escape, or mask according to the primitive;
- not expand or resize the approval composer;
- show the full Risk Advisor analysis;
- preserve all information currently available in the accepted V1 READY presentation.

The detail content must include:

1. advisory disclaimer that Native Approval is authoritative;
2. operation title/summary;
3. resources and requested permission;
4. workspace containment / sandbox coverage / reversibility;
5. aggregate hazard / recommendation / reason codes;
6. PARTIAL/DEGRADED state;
7. six dimensions and their reasons;
8. findings;
9. uncertainties;
10. alternatives and existing copy behavior;
11. evidence and pre-execution disclosure;
12. failure context;
13. rules-only / judge-assisted source;
14. raw codes needed for audit.

The Modal may use sections and nested details internally because it is no longer part of the normal approval height.

## 7. Original command preservation

Because Risk Advisor owns the single `conversation.approval.detail` slot, it must continue to preserve the correlated command presentation currently provided by `RiskAdvisorDetail`.

Do not remove the original command merely to make Risk Advisor shorter.

The compact-row optimization applies to the advisory contribution, not to the Host's approval semantics or correlated command visibility.

## 8. Non-READY states

ANALYZING, UNAVAILABLE and CANCELLED must also become compact status rows, not cards.

They must not reserve diagnostic-card height.

No detailed analysis Modal is required when no valid analysis exists.

## 9. Localization

Primary row copy must be short and human-readable.

Add bounded Chinese/English labels for current:

- hazard values;
- recommendation values;
- assessment caveats;
- aggregate primary-reason codes.

Raw values remain in the Modal.

Fallback for a future unknown code must be bounded and truthful.

Do not silently invent a safer semantic.

## 10. Allowed executable scope

Expected scope:

- `src/client/RiskAdvisorDetail.tsx`
- `src/client/components/RiskAdvisorCard.tsx` or its replacement/refactor;
- `src/client/locales.ts`
- one small client-only CSS module;
- focused UI tests.

Optional:

- one small client-only presentation helper for label/status mapping.

Do not modify:

- Risk Engine;
- assessment aggregator;
- Host browser bridge;
- correlation;
- Fast/Evidence/Deep Judge;
- approval authority;
- Harness Core.

## 11. Rejected candidate isolation

The local commit `2c17aba72309c87f120979919d831f9f6dac4cef` must remain outside the new implementation lineage.

Before new implementation:

- preserve it on a local archival branch if desired;
- fetch the updated remote;
- create the new working branch directly from updated `origin/main`.

Do not cherry-pick, merge or push `2c17aba...`.

## 12. Automated proof

Focused UI tests must prove:

- READY is a single compact advisory row rather than a nested advisory card;
- default advisory contribution does not inline the detailed diagnostic tree;
- details open a Modal;
- closing the Modal restores the unchanged pending Native Approval;
- command presentation remains;
- HIGH/CRITICAL/LOW attention mapping is correct;
- DEGRADED/PARTIAL stays visible;
- `danger-full-access` stays visible when present;
- raw reason codes are absent from the compact row but available in Modal;
- six dimensions remain available in Modal;
- findings/uncertainties/evidence/failure/source remain available;
- alternative copy remains copy-only;
- no approve/reject/execute/apply authority is introduced;
- ANALYZING/UNAVAILABLE/CANCELLED are compact;
- StrictMode/poller ownership remains unchanged.

Run affected P6/P10 presentation tests and existing lifecycle/HMR regressions required by the current task instructions.

## 13. Real Browser acceptance gate

Before final Full, install the exact committed candidate into the real Mac `web` profile.

Trigger one safe real Native Approval.

Stop for user review with approval still pending.

User-visible success criteria:

- the Risk Advisor contribution occupies roughly one compact row;
- no nested Risk Advisor card dominates the approval;
- repeated appearance feels lightweight;
- important hazard/recommendation/reason remains scannable;
- Details opens without increasing composer height;
- full diagnostics remain readable in the Modal;
- closing Details returns to the same pending Native Approval;
- Native Approval remains authoritative;
- no duplicate/stale advisory.

If the user still finds the default indicator intrusive, stop. Do not run Full.

## 14. Final validation governance

Only after real-user Browser approval:

1. push the exact candidate as a fast-forward from the updated remote baseline;
2. verify remote identity;
3. run exactly one fresh complete `pnpm test` on that exact Tested SHA;
4. make no executable/test/package/benchmark semantic changes after Full;
5. add only `docs/tasks/V1-ux-compact-risk-indicator/Execution_Report.md`;
6. publish report-only.

Codex must not declare acceptance.

## 15. Frozen conclusion

The authorized V1 UX replacement is:

> one compact, severity-aware Risk Advisor indicator inside Native Approval, with complete diagnostics moved to an explicit Harness Modal and no inline expansion.
