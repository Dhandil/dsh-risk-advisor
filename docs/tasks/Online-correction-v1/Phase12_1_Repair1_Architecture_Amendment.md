# Risk Advisor Phase 12.1 — Repair1 Architecture Amendment

## Status

`RISK_ADVISOR_PHASE12_1_FINAL_ARCHITECTURE_REVIEW_BLOCKED_REPAIR1_AUTHORIZED`

This amendment is docs-only. It authorizes one narrowly scoped implementation repair and does not authorize Phase 12.2.

## Baseline

- Published implementation candidate: `1897236e28c87752ee7a59ee31deb3fd287a4079`
- Report-only commit: `4e9a7d82fb26daa9d75fb709930fe376ea035182`
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`

## Defect

Phase 12.1 Freeze requires that once an F2 identity is invalidated by a stored verifier `VERIFICATION_CONFLICT`, that Finding remains suppressed for the rest of the active runtime generation.

Current implementation records suppression in `conflicted: Set<string>`, but `deleteFinding()` also deletes the same conflict marker:

```ts
this.conflicted.delete(findingId)
```

`deleteFinding()` is used by TTL expiry and capacity eviction. Therefore a conflicted F2 tombstone can disappear when the retained Finding is evicted/expired.

The current conflict path also drops the live execution association, which normally prevents immediate recreation. However a duplicate/replayed settled-result observation for the same execution ID can recreate that association. After the tombstone was cleared, a later qualifying mismatch can then recreate the F2 in the same runtime generation.

That violates the frozen invariant:

> verifier conflict suppresses the F2 for the rest of that runtime generation; the Finding must not be rewritten or resurrected.

The existing C9 proof covers only immediate mismatch-after-conflict and does not cover conflict + TTL/capacity cleanup + repeated settled-result association.

## Repair1 invariant

Conflict suppression must be identity-terminal for the active runtime generation.

For an F2 `findingId` that receives a trusted stored `VERIFICATION_CONFLICT`:

1. mark the identity permanently conflicted for this runtime generation;
2. suppress it from every diagnostic/read surface;
3. drop the current execution association;
4. TTL expiry or Finding capacity eviction may remove the retained Finding payload, but MUST NOT remove the conflict tombstone;
5. a duplicate/replayed `observeSettledResult()` may recreate an execution/session association, but a later qualifying mismatch MUST still be unable to emit or expose that F2 identity;
6. only `dispose()` / generation replacement may clear conflict tombstones.

Session disposal may remove Finding payload/associations, but must not create a path by which the same conflicted identity becomes current again inside the same generation.

## Scope

Repair only the conflict-tombstone lifecycle needed to satisfy the invariant above.

Do not change:
- F1 semantics;
- F2 positive predicate or adapter allowlist;
- Finding identity;
- fixed advisory wording;
- TTL or capacity values;
- Failure Chain;
- Postcondition Verifier;
- Approval/Risk behavior;
- Pattern/Guidance;
- Browser/UI;
- Agent context;
- persistence;
- Harness Core.

## Required Repair1 proofs

At minimum add/strengthen focused proofs for:

- **R1:** F2 mismatch -> conflict -> later mismatch remains suppressed.
- **R2:** F2 mismatch -> conflict -> TTL expiry -> duplicate settled-result association -> later mismatch remains suppressed.
- **R3:** F2 mismatch -> conflict -> capacity eviction of retained Finding -> duplicate settled-result association -> later mismatch remains suppressed.
- **R4:** unrelated non-conflicted identities continue to expire/evict normally.
- **R5:** generation `dispose()` clears state; a newly constructed runtime is a new generation and may independently qualify the same deterministic identity from fresh evidence.

## Verification boundary

For Repair1 implementation run only:

1. focused Phase 12.1 + Repair1 proofs;
2. affected Failure Chain / verifier regressions;
3. Typecheck;
4. build/static/package gates needed to validate the repair.

Do **not** run a new complete `pnpm test` yet.

After the repaired candidate is published for architecture review, final review will decide whether to authorize exactly one fresh Full on the repaired exact candidate.
