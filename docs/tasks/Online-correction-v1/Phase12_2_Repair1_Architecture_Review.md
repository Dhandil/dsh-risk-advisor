# Risk Advisor Phase 12.2 Repair1 — Architecture Review

## Verdict

`RISK_ADVISOR_PHASE12_2_REPAIR1_ARCHITECTURE_APPROVED_FULL_AUTHORIZED`

Repair1 source and provenance review passed. Exactly one fresh complete Full is now authorized on the exact repaired executable candidate.

## Reviewed provenance

- Repair1 architecture baseline: `6c8aea13c806b94e443083b1d082123b1bfafc5b`
- Exact repaired executable candidate: `28d3d204376da0a43279b949a3ceea794212d10c`
- Repair1 report-only commit: `8e8496bf976bcef8490320721e3875c60b862c65`
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`

Baseline -> candidate is exactly:
- `src/client/OnlineCorrectionDock.tsx`
- `src/client/online-correction-client.ts`
- `src/client/online-correction-store.ts`
- `tests/p12-2-online-correction.spec.tsx`

Candidate -> report is exactly:
- `docs/tasks/Online-correction-v1/Phase12_2_Repair1_Execution_Report.md`

No complete `pnpm test` has been consumed on the Repair1 candidate.

## Architecture findings

Repair1 satisfies the frozen Client ownership model:

- one stable cached Store exists per `sessionId` for the Client generation;
- `getSource(sessionId)` is render-pure with respect to polling and external generation subscriptions;
- first retain starts the Store;
- duplicate retains share one polling/subscription lifecycle;
- final release stops polling, aborts in-flight work, clears timers/view, and unsubscribes the connection-generation listener;
- a later retain restarts the same Store with a fresh generation snapshot and exactly one subscription;
- Session ownership is independent;
- Client disposal drains active and inactive cached Stores;
- Dock render obtains only the stable source and commit-phase effect owns retain/release.

The original Phase 12.2 boundaries remain intact:

- separate Online Correction read-only bridge/DTO;
- `conversation.input.dock`, id `risk-advisor-online-correction`, order 10;
- no Approval/Risk coupling;
- no mutation/action endpoint;
- no Pattern/Guidance/LLM/Judge/model/Agent-context dependency;
- no persistence;
- no Harness Core modification;
- fixed Phase 12.1 advisory text and latest-three UI semantics remain unchanged.

Focused proof matrix passed before this review:

- U1-U22 + L1-L9: 31/31 PASS;
- combined required regressions: 14 files / 124 tests PASS;
- typecheck/build/declarations/package/static gates PASS.

## Full authorization

Codex is authorized to run exactly one fresh complete:

```
pnpm test
```

against exact executable candidate:

`28d3d204376da0a43279b949a3ceea794212d10c`

with pinned Harness:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

Requirements:

1. verify exact Risk Advisor candidate SHA immediately before the Full;
2. verify exact pinned Harness SHA;
3. make no executable/test/package/config/benchmark change before or after the Full;
4. run the complete Full exactly once;
5. record complete test-file/test totals and exit result;
6. if Full fails, stop and report; do not patch and rerun under this authorization;
7. if Full passes, return to current main lineage and add only a docs-only Final Full report;
8. do not create Acceptance Report;
9. do not start a follow-on active-intervention phase.

A passing Full does not self-declare acceptance. Final Phase 12.2 acceptance remains a separate architecture review step.
