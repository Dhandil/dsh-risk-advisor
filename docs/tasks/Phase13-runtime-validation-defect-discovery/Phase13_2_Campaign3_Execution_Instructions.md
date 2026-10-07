# Risk Advisor Phase 13.2 Campaign-3 — Execution Instructions

Current main:
`40d4dd1d4766f2b14befdd1ceb23f673c430d040`

Accepted Product:
`b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`

Accepted validation Repair2:
`0904afe035232f6d9faab2fd539018b6e1c4263b`

Pinned Harness:
`ddefc45fbc7f8e46dd73185e68295696d1297887`

Strictly execute:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_2_Campaign3_Authorization.md`

Use:

- campaignRunId `phase13-lane-a-canonical-v3`
- seed `phase13-lane-a-canonical-v1`
- generator `phase13-generator-v1`
- exactly 300 scenarios
- target exactly 1500 Tool executions
- policy 300/1500

Before execution:

- verify exact baseline/Product/validation/Harness;
- regenerate manifest;
- replay-check byte identity;
- prevalidate settlement capabilities;
- record manifest SHA.

Provider/model/LLM/Judge/Deep Judge/subagent calls = 0.

Do not reuse Campaign-1 or Campaign-2.
Do not modify Product or validation.
Do not repair during the run.
Do not run complete `pnpm test`.
Do not start Phase 13.3.

Commit one docs-only execution report and return the frozen status token.
