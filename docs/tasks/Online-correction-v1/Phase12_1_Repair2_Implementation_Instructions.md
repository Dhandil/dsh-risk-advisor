# Risk Advisor Phase 12.1 — Repair2 Implementation Instructions

Current main:
`3259b99643343bf32e0af6b1ea5f808b11b174e8`

Pinned Harness:
`ddefc45fbc7f8e46dd73185e68295696d1297887`

Implement exactly:
`Phase12_1_Repair2_Architecture_Amendment.md`

Only fix bounded conflict state:

- cap identity tombstones at 256;
- on the next unique conflict, latch generation-wide F2 fail-closed saturation;
- saturation suppresses all existing/future F2;
- F1 remains normal;
- only runtime generation disposal resets saturation.

Do not broaden any other Phase 12.1 behavior.

Add S1-S7.

Run focused C1-C20 + R1-R5 + S1-S7, P3/P7, typecheck, build/package/static.

Do NOT run complete `pnpm test`.
Do NOT start Phase 12.2.

Push exact repaired candidate + report.

Final token:
`RISK_ADVISOR_PHASE12_1_REPAIR2_READY_FOR_ARCHITECTURE_REVIEW`
