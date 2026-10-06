# Risk Advisor V1 UX Maintenance — Compact Risk Indicator Implementation Instructions

## Required handoff

Stop at real Browser review with:

`V1_UX_COMPACT_RISK_INDICATOR_READY_FOR_USER_BROWSER_REVIEW`

Only after explicit user approval of the real UI may the task continue to final Full and publication.

Final implementation handoff:

`V1_UX_COMPACT_RISK_INDICATOR_PUBLISHED_READY_FOR_REVIEW`

Do not start Phase 11/V2.

## 1. Local lineage recovery

The current Mac local `main` may still contain the rejected local-only commit:

`2c17aba72309c87f120979919d831f9f6dac4cef`

Do not push or merge it.

Preserve it for provenance by creating a local archival branch if one does not already exist:

`archive/v1-ux-card-hierarchy-rejected-2c17aba`

pointing exactly at `2c17aba...`.

Do not reset, clean or delete user drift.

Then:

1. `git fetch origin main`
2. verify updated `origin/main` contains the Compact Risk Indicator Freeze and these instructions;
3. create a new local implementation branch directly from updated `origin/main`;
4. preserve existing untracked `lib/` and `node_modules/`.

The new implementation branch must not contain `2c17aba...` in its ancestry.

## 2. Read authority

Read and obey:

- `docs/tasks/V1-ux-card-hierarchy/Browser_Review_Finding.md`
- `docs/tasks/V1-ux-compact-risk-indicator/V1_UX_Compact_Risk_Indicator_Preflight.md`
- `docs/tasks/V1-ux-compact-risk-indicator/V1_UX_Compact_Risk_Indicator_Freeze.md`

Freeze is authoritative.

## 3. Implement the compact indicator

Replace the Risk Advisor advisory card form with a single compact status/decision row.

Normal READY layout:

- preserve the correlated command presentation;
- render one approximately 24–28px Risk Advisor row;
- keep it one line under normal desktop width;
- truncate advisory summary rather than wrapping into a diagnostic block;
- render a Details affordance;
- no nested advisory card/border/shadow/tinted block;
- no inline detailed-analysis expansion.

Prefer existing Harness UI primitives from the pinned public API.

Expected primitives:

- `StateDot`;
- `Tag`;
- `Button`;
- `Modal`.

Do not copy Harness private styles or implement a second overlay system.

## 4. READY content

Keep the visible row concise and localized.

It should expose:

- Risk Advisor provenance;
- hazard;
- recommendation when decision-relevant;
- primary reason;
- elevated permission when present;
- PARTIAL/DEGRADED caveat when relevant;
- Details.

Do not show verbose field labels or raw reason codes on the normal row.

Do not reinterpret aggregate values.

## 5. Severity mapping

Implement the frozen visual-attention mapping:

- LOW + APPROVE -> done / quiet;
- MEDIUM or APPROVE_WITH_CAUTION -> warning;
- HIGH / NEED_MORE_INFORMATION / PREFER_SAFER_ALTERNATIVE -> warning;
- CRITICAL or REJECT_RECOMMENDED -> error;
- ANALYZING -> ongoing;
- UNAVAILABLE / CANCELLED -> idle.

UNKNOWN must not be rendered as LOW or healthy.

## 6. Details Modal

Details opens the shipped Harness `Modal`.

Do not expand the approval composer.

Modal content must preserve the full accepted V1 information set:

- disclaimer;
- operation presentation and resources;
- requested permission;
- containment/sandbox/reversibility;
- aggregate values and raw reason codes;
- assessment status;
- six dimensions and reasons;
- findings;
- uncertainties;
- alternatives with existing copy-only behavior;
- evidence + TOCTOU disclosure;
- failure context;
- assessment source.

Closing the Modal must leave the same Native Approval pending.

Risk Advisor must not add approval actions.

## 7. Other states

ANALYZING, UNAVAILABLE and CANCELLED must also be compact rows.

Do not retain the old nested-card geometry for those states.

## 8. Scope

Expected executable changes:

- `src/client/RiskAdvisorDetail.tsx`
- `src/client/components/RiskAdvisorCard.tsx` or a bounded replacement/refactor;
- `src/client/locales.ts`
- one small client-only CSS module;
- focused/affected UI tests.

Optional:

- one small client-only status/label helper.

Forbidden:

- Host runtime changes;
- browser bridge changes;
- assessment/aggregator semantics;
- correlation changes;
- Fast/Evidence/Deep Judge changes;
- Native Approval changes;
- Harness Core changes.

## 9. Automated gates before Browser review

Run focused tests first.

At minimum prove:

- single compact READY advisory row;
- no inline diagnostic tree;
- Details opens Modal;
- Modal close preserves pending interaction semantics;
- command presentation survives;
- severity mapping;
- DEGRADED/PARTIAL visibility;
- elevated permission visibility;
- raw codes hidden from row but present in Modal;
- all six dimensions retained;
- findings/uncertainties/evidence/failure/source retained;
- alternative copy remains copy-only;
- no authority controls;
- compact ANALYZING/UNAVAILABLE/CANCELLED;
- StrictMode/poller ownership.

Then run:

- affected P6 UI/presentation tests;
- affected P10 presentation/lifecycle tests;
- typecheck;
- build;
- package/exports/declaration/static gates required by the repository.

Do not run a fresh complete `pnpm test` yet.

## 10. Real Mac Browser gate

Commit the exact candidate locally.

Build/pack it and update only Risk Advisor in the real Mac `web` profile through the supported plugin manager.

Keep Harness pinned at:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

Trigger one safe real Native Approval.

Do not approve the dangerous operation.

Stop with the approval pending after verifying objectively:

- indicator is one compact row;
- no nested advisory card;
- Details opens a Modal without changing composer height;
- Modal closes back to the same pending approval;
- no duplicate/stale advisory;
- Native Approval remains authoritative.

Return:

`V1_UX_COMPACT_RISK_INDICATOR_READY_FOR_USER_BROWSER_REVIEW`

Include candidate SHA and gate summary.

Do not push the candidate yet.

## 11. After explicit user UX approval only

After the user explicitly says the compact indicator is acceptable:

1. push the exact candidate to remote `main` as a fast-forward from its Compact Indicator docs baseline;
2. verify `HEAD == origin/main == git ls-remote`;
3. run exactly one fresh complete `pnpm test` on that exact Tested SHA;
4. if Full fails, fix and the eventual repaired executable requires a new fresh Full;
5. after PASS, do not change executable/test/package/benchmark semantics;
6. add only:
   `docs/tasks/V1-ux-compact-risk-indicator/Execution_Report.md`
7. push report-only.

Final return:

`V1_UX_COMPACT_RISK_INDICATOR_PUBLISHED_READY_FOR_REVIEW`

Codex must not create an Acceptance Report or declare ACCEPTED.
