# Risk Advisor Phase 12.1 — Repair1 Implementation Instructions

Current main:
`4e9a7d82fb26daa9d75fb709930fe376ea035182`

Pinned Harness:
`ddefc45fbc7f8e46dd73185e68295696d1297887`

Read and implement exactly:
- `Phase12_1_Live_Correction_Finding_Core_Freeze.md`
- `Phase12_1_Repair1_Architecture_Amendment.md`

Repair only the F2 conflict tombstone lifecycle.

Required semantic result:

- `VERIFICATION_CONFLICT` makes that F2 identity terminally suppressed for the current runtime generation.
- TTL expiry and capacity eviction may delete Finding payloads but MUST NOT clear the conflict tombstone.
- duplicate/replayed settled-result association followed by a new mismatch MUST NOT resurrect the conflicted F2.
- only runtime generation disposal/replacement may clear conflict tombstones.

Do not change F1/F2 predicates, Finding identity, wording, bounds, Failure Chain, verifier semantics, Browser/UI, Approval/Risk, Pattern/Guidance, Agent context, persistence, or Harness Core.

Add Repair1 proofs R1–R5.

Run:
- Phase 12.1 focused + Repair1;
- affected P3/P7 regressions;
- typecheck;
- build/package/static gates.

Do NOT run complete `pnpm test` yet.

Publish the repaired candidate and a Repair1 execution report for architecture review. No Phase 12.2.

Final token:

`RISK_ADVISOR_PHASE12_1_REPAIR1_READY_FOR_ARCHITECTURE_REVIEW`
