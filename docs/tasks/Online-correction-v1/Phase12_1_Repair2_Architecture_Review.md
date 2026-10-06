# Risk Advisor Phase 12.1 Repair2 — Architecture Review

## Verdict

`RISK_ADVISOR_PHASE12_1_REPAIR2_ARCHITECTURE_APPROVED_FULL_AUTHORIZED`

Repair2 source and provenance review passed. Exactly one fresh complete Full is now authorized on the exact repaired executable candidate.

## Reviewed provenance

- Repair2 architecture baseline: `48008a99b2d6c8f9b5a4a594b5a2c42ca06df152`
- Exact repaired executable candidate: `9db1eae28f673dfe8c7770b8947dc9330d33be8c`
- Repair2 report-only commit: `aa22fbf97d13cd938bbf763e02630a3b0532a877`
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`

Baseline -> candidate is exactly:
- `src/host/live-correction.ts`
- `tests/p12-1-live-correction.spec.ts`

Candidate -> report is exactly:
- `docs/tasks/Online-correction-v1/Phase12_1_Repair2_Execution_Report.md`

No complete `pnpm test` has been consumed on the Repair2 candidate.

## Architecture findings

Repair2 satisfies the bounded conflict-state amendment:

- F2 conflict tombstones are capped at 256 unique identities.
- Duplicate identities do not consume capacity.
- The next unique identity latches generation-wide F2 fail-closed saturation.
- Saturation suppresses retained F2 Findings from get, execution, session, and render surfaces.
- Future F2 insertion is blocked while saturated.
- F1 remains operational and readable.
- TTL, Finding/association eviction, Session disposal, and replay do not reset saturation.
- Only runtime dispose / generation replacement resets the latch.

Repair1 terminal suppression remains preserved before saturation.

No prohibited authority was introduced: no Browser/UI, Approval/Risk mutation, Agent/model injection, Pattern/Guidance dependency, persistence, retry/replan/cancel/block behavior, Run creation, or Harness Core change.

## Full authorization

Codex is authorized to run exactly one fresh complete:

```
pnpm test
```

against exact executable candidate:

`9db1eae28f673dfe8c7770b8947dc9330d33be8c`

with pinned Harness:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

Requirements:

1. verify exact Risk Advisor candidate SHA before the Full;
2. verify exact pinned Harness SHA before the Full;
3. run no executable/test/package/config/benchmark change before or after the Full;
4. run the complete Full exactly once;
5. record complete file/test totals and exit result;
6. if the Full fails, stop and report; do not patch and rerun under this authorization;
7. if the Full passes, return to current main lineage and add only a docs-only Final Full report;
8. do not start Phase 12.2.

A passing Full does not self-declare acceptance; final architecture acceptance remains a separate review step.
