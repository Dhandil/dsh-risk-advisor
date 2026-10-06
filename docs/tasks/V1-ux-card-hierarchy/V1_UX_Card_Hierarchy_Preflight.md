# Risk Advisor V1 UX Maintenance — Card Hierarchy Preflight

## Outcome

`V1_UX_CARD_HIERARCHY_PREFLIGHT_COMPLETE`

Baseline:

- accepted V1 executable: `f4807e2186e43690ba6dc4c349107b55e407aa53`
- objective Pilot report: `1fc93c1de41379729ff4ed81824ae251d0c76365`
- Mac/cross-platform portability baseline: `e4a729531adcebc30495fea2d514cae21a2c59e0`
- UX maintenance repository baseline: `e4a729531adcebc30495fea2d514cae21a2c59e0`
- pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`

This is a V1 UX maintenance task. It does not start Phase 11/V2.

The portability baseline is part of the repository authority for this task. It changes cross-platform test/benchmark path fixtures only and does not advance the accepted product executable.

## User finding

The real READY card is functionally useful but too long and lacks clear information hierarchy.

The current card places the following almost at the same level:

- risk;
- recommendation;
- primary reason;
- six dimensions;
- findings;
- uncertainties;
- source;
- failure context;
- evidence;
- TOCTOU disclosure;
- alternatives.

The result reads like a diagnostic report rather than a fast approval aid.

## Source review

Current `RiskAdvisorCard.tsx` already preserves all underlying presentation data, so no Risk Engine or bridge changes are required.

The main issue is presentation composition:

- the six dimensions are all rendered immediately after the summary;
- findings and uncertainties are fully expanded;
- evidence is fully expanded;
- only operation details and failure context have their own `details`;
- raw enum/code values dominate the first screen.

The original command is already presented separately by `RiskAdvisorDetail`, so the READY card does not need to repeat a long operation explanation in the primary decision layer.

## UX objective

The default READY surface should answer, in order:

1. How risky is this?
2. What does Risk Advisor recommend?
3. Why?
4. Is there any important caveat such as degraded/partial assessment or requested elevated permission?

Everything else remains available but secondary.

## Architecture conclusion

Use progressive disclosure:

- primary decision summary stays visible;
- full analysis moves under one collapsed `details` section;
- no assessment semantics change;
- no information is deleted from the detailed view;
- raw codes remain available for audit but do not dominate the first screen;
- Native Approval remains the sole authority.

Next artifact:

`V1_UX_Card_Hierarchy_Freeze.md`
