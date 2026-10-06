# Risk Advisor Phase 12.1 Repair1 — Architecture Review

## Verdict

`RISK_ADVISOR_PHASE12_1_REPAIR1_REVIEW_BLOCKED_REPAIR2_AUTHORIZED`

Repair1 fixes the originally identified F2 resurrection defect, but final architecture review found one new bounded-state defect. Phase 12.1 is not accepted and a fresh complete Full is not yet authorized.

## Provenance review

- Repair1 architecture baseline: `53b3fe31f560fdf6695b5b11698296f8a202ba83`
- Exact repaired candidate: `fb8a6b151323e5a330d4eb24e302365629212540`
- Report-only commit / current reviewed main: `3259b99643343bf32e0af6b1ea5f808b11b174e8`
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`

Candidate diff is exactly:
- `src/host/live-correction.ts`
- `tests/p12-1-live-correction.spec.ts`

Candidate -> report diff is exactly one docs file:
- `Phase12_1_Repair1_Execution_Report.md`

No complete `pnpm test` was run for Repair1, as required.

## Repair1 correctness

The original Repair1 defect is fixed:

- `VERIFICATION_CONFLICT` records the deterministic F2 identity before association lookup;
- conflict drops the current association;
- TTL / capacity / session cleanup no longer clears the conflict identity;
- F2 insertion and read surfaces continue to suppress tombstoned identities;
- only runtime `dispose()` clears the conflict set.

R1-R5 directly cover immediate replay, TTL cleanup, capacity eviction, unrelated normal cleanup, and generation replacement.

## New defect: unbounded generation-lifetime tombstones

The repaired runtime stores conflict identities in:

```ts
private readonly conflicted = new Set<string>()
```

Repair1 deliberately makes those identities live until generation disposal.

However, the set has no capacity bound and no saturation/degradation state. A long-lived runtime can therefore accumulate an unbounded number of distinct verifier-conflict identities.

This conflicts with the Phase 12.1 frozen requirement that the live correction runtime remain bounded and that capacity failure degrade correction diagnostics only.

The issue cannot be solved by ordinary tombstone eviction: evicting an identity would recreate the original resurrection path.

Therefore a bounded, fail-closed saturation mechanism is required.

## Next step

Apply only `Phase12_1_Repair2_Architecture_Amendment.md`.

Do not start Phase 12.2 and do not run a complete Full until Repair2 passes architecture review.
