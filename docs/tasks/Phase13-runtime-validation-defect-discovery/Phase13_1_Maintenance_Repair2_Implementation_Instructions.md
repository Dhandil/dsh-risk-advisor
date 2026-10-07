# Risk Advisor Phase 13.1 — Maintenance Repair2 Implementation Instructions

Current remote main:
`962453701f6c9147d31fd9e7d9c3c6922b4c03b1`

Pinned Harness:
`ddefc45fbc7f8e46dd73185e68295696d1297887`

Implement exactly:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_1_Maintenance_Repair2_Settlement_Blocker_Taxonomy_Amendment.md`

Only modify `validation/phase13/`.

Required:

- add validation-owned operation capability NONE / DIRECT / ASYNC_SUPPORTED;
- prevalidate every manifest step against operation capability before workspace/Tool execution;
- unsupported/NONE operations must never wait for verifier;
- remove unknown-issue -> Product P1 fallback;
- explicit blocker taxonomy;
- UPSTREAM_VERIFICATION_MISSING -> BLOCKED_UPSTREAM only after supported-operation validation;
- unknown issue -> BLOCKED_VALIDATION;
- bounded upstream reproducer evidence;
- M1-M15;
- keep K1-K12 + H1-H18 PASS;
- bounded smoke only.

Do not modify Product `src/`.
Do not run complete `pnpm test`.
Do not rerun Phase 13.2.
Do not call provider/model.

Publish repaired candidate on a branch + separate docs-only report.

Return:
`RISK_ADVISOR_PHASE13_1_MAINTENANCE_REPAIR2_READY_FOR_ARCHITECTURE_REVIEW`
