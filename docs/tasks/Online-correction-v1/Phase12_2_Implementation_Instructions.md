# Risk Advisor Phase 12.2 — Implementation Instructions

Current main:
`f9da399c1d33e7149c225fb94f85e78d161833e6`

Pinned Harness:
`ddefc45fbc7f8e46dd73185e68295696d1297887`

Implement exactly:

`docs/tasks/Online-correction-v1/Phase12_2_User_Advisory_Surface_Freeze.md`

Scope:

- separate read-only Online Correction contract/Host bridge/client store/UI;
- endpoint `risk-advisor/online-correction` keyed only by `sessionId`;
- browser-safe DTO only;
- additive Host-only `LiveCorrectionDiagnostics.status()` exposing only F2 READY/SATURATED;
- render in existing Harness `conversation.input.dock`:
  - id `risk-advisor-online-correction`
  - order `10`;
- fixed Phase 12.1 English advisory bodies;
- latest 3 Findings only in UI;
- neutral truncation/saturation indication;
- 1s polling only while mounted, one in-flight, abort + generation fencing, connection-reset recovery;
- no Approval/Risk coupling, no mutation endpoint/actions, no persistence, no Pattern/Guidance/LLM/model/Agent context.

Required proofs: U1-U22.

Run only:

1. Phase 12.2 focused;
2. Phase 12.1 focused regression;
3. P1c;
4. P6;
5. typecheck;
6. build/declarations;
7. package/static/dependency/boundary gates.

Do **not** run complete `pnpm test`.

Publish one exact executable candidate, then a separate docs-only execution report.

Do not declare ACCEPTED.
Do not start any follow-on active-intervention phase.

Final token:

`RISK_ADVISOR_PHASE12_2_READY_FOR_ARCHITECTURE_REVIEW`
