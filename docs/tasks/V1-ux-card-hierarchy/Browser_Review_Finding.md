# V1 UX Card Hierarchy — Browser Review Finding

## Status

`V1_UX_CARD_HIERARCHY_REJECTED_AT_BROWSER_REVIEW_SUPERSEDED`

This finding records a real-user UX rejection of the local Card Hierarchy candidate.

It is not an implementation acceptance report.

## Candidate identity

Local-only candidate:

`2c17aba72309c87f120979919d831f9f6dac4cef`

Remote baseline at review time:

`bcc795f96ef7ca71daafc1465323385be334a7f5`

Pinned Harness:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

The candidate was installed into the real Mac `web` profile for Browser review.

It was not pushed.

A fresh complete `pnpm test` was not run.

## Objective implementation evidence

Before Browser review:

- focused UI: PASS;
- affected P6: 33 PASS;
- affected P10: 35 PASS;
- typecheck: PASS;
- build: PASS;
- package gates: PASS;
- Native Approval remained pending and authoritative;
- compact summary and detailed analysis were both renderable.

These gates do not override the user's product-level UX finding.

## User finding

The revised READY presentation remained too large inside Native Approval.

The problem is no longer adequately described as poor hierarchy inside a card.

The remaining problem is the card form itself:

- it occupies too much composer height;
- it creates a nested-card feeling inside Native Approval;
- even with diagnostics collapsed, the always-visible Risk Advisor surface remains too visually heavy;
- repeated approvals would make the surface annoying through frequency alone.

## Superseding product direction

Do not iterate the rejected candidate by shaving more rows from the same card.

Supersede the Card Hierarchy task with:

`V1 UX Compact Risk Indicator`

The new default form must be an inline status/decision indicator, not a card.

Full diagnostics must leave normal approval flow layout and appear only on explicit user request.

## Governance

The local-only candidate `2c17aba...` is historical rejected evidence.

Do not:

- push it to `main`;
- merge it into the replacement implementation;
- run a final Full on it;
- treat it as an executable baseline.

It may be preserved on a local archival branch solely for provenance.

The accepted V1 product executable remains:

`f4807e2186e43690ba6dc4c349107b55e407aa53`

The Mac portability baseline remains:

`e4a729531adcebc30495fea2d514cae21a2c59e0`
