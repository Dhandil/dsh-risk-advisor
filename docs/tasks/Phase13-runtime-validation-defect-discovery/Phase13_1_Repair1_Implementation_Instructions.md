# Risk Advisor Phase 13.1 — Repair1 Implementation Instructions

Current main:
`d1eb987cd686c1132663f3ee6381f73ef5d6de17`

Pinned Harness:
`ddefc45fbc7f8e46dd73185e68295696d1297887`

Implement exactly:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_1_Repair1_Capacity_Finding_Lifecycle_Amendment.md`

Only modify `validation/phase13/`.

Repair:

1. separate structural capacity from 13.1 smoke policy:
   - structural 512 scenarios / 4096 steps;
   - ledger 8192 records / 32 MiB;
   - smoke remains 30 / 100;
2. prove representation/ledger readiness for 300 scenarios / 1500 rows and future 2000-step soak without running that many Tools;
3. stop treating normal Finding disappearance as stale/resurrection;
4. track retired IDs and flag only true reappearance as `RESURRECTED_FINDING`;
5. add validation-only finding lifetime expectation if needed;
6. preserve strict wrong-session blocking.

Add K1-K12 and keep H1-H18 PASS.

Run only bounded Repair1/focused regressions and smoke <=100 Tool executions.

Do not run complete `pnpm test`.
Do not start Phase 13.2.
Do not call real provider/model.
Do not modify Product `src/` or existing product tests/config.

Publish exact repaired candidate + separate docs-only report.

Final token:
`RISK_ADVISOR_PHASE13_1_REPAIR1_READY_FOR_ARCHITECTURE_REVIEW`
