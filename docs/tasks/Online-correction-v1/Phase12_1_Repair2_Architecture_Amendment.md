# Risk Advisor Phase 12.1 — Repair2 Architecture Amendment

## Status

`RISK_ADVISOR_PHASE12_1_REPAIR1_REVIEW_BLOCKED_REPAIR2_AUTHORIZED`

## Defect

Repair1 correctly made F2 conflict tombstones terminal for one runtime generation, but the generation-lifetime `conflicted` set is unbounded.

Phase 12.1 requires bounded process-local correction state. Identity tombstones cannot simply be evicted because that would permit resurrection.

## Frozen Repair2 design

Add a bounded conflict-tombstone capacity plus one generation-scoped fail-closed latch.

Frozen values:

```
MAX_CONFLICT_TOMBSTONES = 256
```

Runtime state conceptually becomes:

```ts
conflicted: Set<FindingId>      // <= 256
f2ConflictSaturated: boolean    // generation-scoped latch
```

### Normal mode

While `f2ConflictSaturated === false`:

- a unique F2 `VERIFICATION_CONFLICT` records its deterministic finding ID in `conflicted`;
- existing Repair1 terminal-suppression semantics remain unchanged;
- duplicate tombstones do not consume additional capacity.

### Saturation transition

When a new unique conflict would exceed the tombstone bound:

1. set `f2ConflictSaturated = true`;
2. fail closed for **all F2 Findings** for the rest of this runtime generation;
3. previously visible F2 Findings must become suppressed from every current read/render surface;
4. future qualifying F2 mismatches must not emit or become visible;
5. F1 remains fully operational;
6. no event propagates to Tool, verifier, Failure Chain, Approval/Risk, Pattern/Guidance, Agent context, Browser, or other subsystem.

Once the latch is true, implementation may clear the per-identity tombstone set because the generation-wide F2 suppression dominates it.

### Reset

Only runtime `dispose()` / replacement with a new runtime generation clears the saturation latch.

Session disposal, TTL expiry, Finding eviction, association eviction, or duplicate observations must not clear it.

## Scope exclusions

Do not change:
- F1 predicate or behavior;
- F2 positive predicate / supported adapter allowlist;
- Finding identity or wording;
- existing Finding TTL/per-session/global bounds;
- association bound;
- RetryEscalationAnalyzer;
- PostconditionVerifier semantics;
- Approval/Risk;
- Pattern/Guidance;
- Browser/UI;
- Agent context;
- persistence;
- Harness Core.

## Required Repair2 proofs

- **S1:** unique conflict tombstones remain bounded at `MAX_CONFLICT_TOMBSTONES`.
- **S2:** the next unique conflict enters F2 saturation and no new F2 can emit in that generation.
- **S3:** entering saturation suppresses an already-visible unrelated F2 from diagnostics/rendering.
- **S4:** F1 continues to emit/read normally while F2 is saturated.
- **S5:** TTL, capacity eviction, session disposal, and replay do not clear saturation.
- **S6:** `dispose()` ends the saturated generation; a new runtime can evaluate F2 normally.
- **S7:** duplicate conflict IDs do not consume tombstone capacity or trigger premature saturation.

## Verification boundary

Run only:
1. Phase 12.1 focused C1-C20 + R1-R5 + S1-S7;
2. affected P3/P7 regressions;
3. typecheck;
4. build/package/static gates.

Do not run complete `pnpm test`.

After Repair2 source/provenance review passes, final architecture review may authorize exactly one fresh complete Full on the repaired exact candidate.
