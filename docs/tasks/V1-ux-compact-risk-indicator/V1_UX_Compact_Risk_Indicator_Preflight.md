# Risk Advisor V1 UX Maintenance — Compact Risk Indicator Preflight

## Outcome

`V1_UX_COMPACT_RISK_INDICATOR_PREFLIGHT_COMPLETE`

## Authority and baselines

- accepted V1 product executable: `f4807e2186e43690ba6dc4c349107b55e407aa53`
- Mac portability baseline: `e4a729531adcebc30495fea2d514cae21a2c59e0`
- prior UX docs baseline before supersession: `bcc795f96ef7ca71daafc1465323385be334a7f5`
- rejected local Card Hierarchy candidate: `2c17aba72309c87f120979919d831f9f6dac4cef`
- Browser review finding: `771a2c47a36e1a91e8ab081fbb1064003a1965b8`
- pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`

This is a V1 UX maintenance task. It does not start Phase 11/V2.

## Problem statement

Real Browser review showed that a smaller Risk Advisor card is still the wrong default form inside Native Approval.

The product requirement is now:

> Risk Advisor should add decision signal, not another card.

The always-visible contribution must be compact enough that repeated approvals do not materially increase composer height.

## Harness integration facts

At the pinned Harness revision:

- `conversation.approval.detail` is a single session-scoped slot;
- the shipped Chat contribution uses that slot to render the correlated command;
- when Risk Advisor owns the slot, it must preserve the command contribution itself;
- Native Approval already owns the approval card, headline and decision buttons;
- shared UI primitives include `StateDot`, `Tag`, `Button`, `Tooltip` and `Modal`.

Therefore a replacement plugin should not create another bordered/shadowed card inside the approval card.

## UX direction

The default READY contribution becomes one compact indicator row.

The row should communicate the minimum decision signal:

- product provenance;
- hazard;
- recommendation when decision-relevant;
- primary reason;
- elevated permission when Risk Advisor is the only surface exposing it;
- PARTIAL/DEGRADED caveat when relevant;
- one explicit Details affordance.

Full diagnostics move to an explicit overlay using an existing Harness primitive.

## Overlay decision

Use the existing `Modal` primitive for full analysis.

Reasons:

- it does not expand the approval composer;
- it is keyboard/Escape accessible;
- it already portals outside overflow clipping;
- it avoids introducing a new popover implementation;
- detailed analysis is an explicit opt-in action, so modal weight does not contribute to normal approval frequency.

Do not build a custom drawer, sidebar, hover-only disclosure or new overlay system in this maintenance task.

## Visual-weight principle

Risk Advisor should scale attention with severity.

Default row behavior:

- LOW / APPROVE: quiet, healthy status; no alarm styling;
- MEDIUM or caution: warning attention;
- HIGH / NEED_MORE_INFORMATION / safer-alternative cases: warning attention;
- CRITICAL or REJECT_RECOMMENDED: error attention;
- ANALYZING: compact ongoing status;
- UNAVAILABLE / CANCELLED: compact neutral status.

No READY state gets a full-width nested card, shadow, large tinted block or multi-section inline body.

## Frequency principle

This maintenance does not change when Native Approval appears and does not change Risk Advisor evaluation frequency.

Instead it minimizes the visual cost of each appearance:

- one row by default;
- no inline diagnostic expansion;
- no duplicated operation card;
- no long disclaimer in the primary surface;
- details only on explicit request.

A later product phase may explore suppression rules for low-value assessments, but that is outside this V1 maintenance task.

## Safety and truthfulness

Compression must not make uncertainty look safer.

The indicator must preserve:

- UNKNOWN truthfully;
- PARTIAL/DEGRADED truthfully;
- critical/high hazard truthfully;
- permission escalation truthfully when applicable;
- Native Approval authority.

No approval action is added to Risk Advisor.

## Architecture conclusion

Proceed to a frozen implementation with:

1. preserved original-command presentation;
2. one compact Risk Advisor indicator row;
3. severity-aware visual weight using shipped primitives;
4. full analysis in a shipped `Modal`;
5. no inline expansion;
6. no Host/Risk Engine/bridge semantics change.
