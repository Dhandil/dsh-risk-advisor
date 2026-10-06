# Risk Advisor V1 UX Maintenance — Card Hierarchy Implementation Instructions

## Required outcome

Implement only the frozen READY-card hierarchy optimization.

Success handoff:

`V1_UX_CARD_HIERARCHY_PUBLISHED_READY_FOR_REVIEW`

Do not start Phase 11/V2.

Do not modify Harness Core.

## 1. Sync

Sync `origin/main`.

Required baseline includes:

- Mac/cross-platform portability baseline: `e4a729531adcebc30495fea2d514cae21a2c59e0`
- corrected UX preflight: `90100c6ff349fdd6718de240188e81ea77a1abc8`
- corrected UX freeze: `76f0a907d7f70d9922773507979675ba3b4063c1`

Read:

1. `V1_UX_Card_Hierarchy_Preflight.md`
2. `V1_UX_Card_Hierarchy_Freeze.md`
3. current `RiskAdvisorCard.tsx`
4. current locales and P6/P10 UI tests

Freeze is authoritative.

Before implementation on Mac, perform a read-only local preflight and stop if local HEAD/origin/main, tracked state, or unpushed commits do not match the expected corrected baseline. Preserve user drift. No reset/clean/force push.

## 2. Implement the compact primary layer

READY default view:

- title + disclaimer;
- operation title;
- requested permission when present;
- localized risk;
- localized recommendation;
- localized primary reason;
- PARTIAL/DEGRADED caveat when applicable;
- one collapsed `View detailed analysis / 查看详细分析` section.

Do not repeat the full operation summary in the primary layer.

## 3. Move secondary information into detailed analysis

Inside the collapsed detailed section retain:

- operation summary/details/resources;
- six dimensions;
- findings;
- uncertainties;
- alternatives;
- evidence;
- pre-execution evidence disclosure;
- failure context;
- rules-only/judge-assisted source;
- raw aggregate recommendation/hazard/reason code values for audit.

Do not delete existing information.

## 4. Presentation labels only

Add bounded client-side localization for current aggregate hazard/recommendation/primary reason values.

Do not change Host/aggregator values.

Fallback for an unknown future reason code must remain truthful and bounded; do not silently reinterpret it.

## 5. Scope

Expected executable scope:

- `src/client/components/RiskAdvisorCard.tsx`
- `src/client/locales.ts`
- optional small client-only label helper
- affected UI tests

Do not modify Host runtime, bridge, assessment logic, correlation, Judge/Evidence, approval authority or Harness Core.

## 6. Tests

Update/add focused UI tests proving:

- default READY summary hierarchy;
- detail section closed by default;
- six dimensions and all diagnostics remain inside details;
- localized primary labels;
- DEGRADED/PARTIAL truthfulness;
- requested `danger-full-access` remains visible;
- raw code remains available inside details;
- alternative copy still works;
- no authority buttons/actions;
- ANALYZING/UNAVAILABLE/CANCELLED unchanged.

Run affected P6/P10 presentation tests, then typecheck/build/package/static gates.

Do not run fresh full during iteration.

## 7. Real Browser proof

Commit the exact candidate, build/pack it, update only Risk Advisor in the real `web` profile through the supported plugin manager, clean restart, and trigger one safe real Native Approval.

Stop for user review after confirming:

- compact summary appears;
- detailed analysis is collapsed;
- details can be expanded;
- Native Approval remains normal;
- no duplicate/stale card.

Do not claim subjective clarity on behalf of the user.

## 8. Final Full

Only after user confirms the hierarchy is materially better:

run exactly one fresh complete:

`pnpm test`

on the exact Tested SHA.

After Full PASS, only add:

`docs/tasks/V1-ux-card-hierarchy/Execution_Report.md`

Return:

`V1_UX_CARD_HIERARCHY_PUBLISHED_READY_FOR_REVIEW`

Do not declare acceptance.
