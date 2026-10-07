# Risk Advisor Phase 12.2 — Repair1 Implementation Instructions

Current main:
`5932ace075b8ada8e937b6d56b9e30bc9aaaeaf6`

Pinned Harness:
`ddefc45fbc7f8e46dd73185e68295696d1297887`

Implement exactly:

`docs/tasks/Online-correction-v1/Phase12_2_Repair1_Client_Lifecycle_Amendment.md`

Only repair Client/store lifecycle:

- one stable Store per sessionId;
- render uses getSource only;
- retain/release happens in effect;
- getSource starts no poll/subscription;
- Store connection-generation subscription begins on start and ends on stop;
- final release aborts/stops/unsubscribes/clears;
- restart is clean;
- Client dispose drains all stores.

Add L1-L9 and keep U1-U22 passing.

Run Phase12.2 focused, Phase12.1, P1c, P6, relevant P10 client/HMR/lifecycle/package/boundary, typecheck/build/package/static.

Do NOT run complete `pnpm test`.
Do NOT start a follow-on phase.

Publish exact repaired candidate + separate docs-only report.

Final token:
`RISK_ADVISOR_PHASE12_2_REPAIR1_READY_FOR_ARCHITECTURE_REVIEW`
