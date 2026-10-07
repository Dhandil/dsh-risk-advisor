# Risk Advisor Phase 13.2 — Fresh Rerun Instructions

Current main:
`b486778933afce89dfc698c2d55517c545791423`

Accepted validation Repair2:
`0904afe035232f6d9faab2fd539018b6e1c4263b`

Accepted Product:
`28d3d204376da0a43279b949a3ceea794212d10c`

Pinned Harness:
`ddefc45fbc7f8e46dd73185e68295696d1297887`

Strictly execute:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_2_Fresh_Canonical_Rerun_Authorization.md`

Use:

- campaignRunId: `phase13-lane-a-canonical-v2`
- seed: `phase13-lane-a-canonical-v1`
- exactly 300 scenarios
- target exactly 1500 Tool executions
- policy 300/1500

Before Tool execution:

- verify exact baseline/Harness;
- regenerate manifest;
- replay-check byte identity;
- prevalidate all settlement capabilities;
- record manifest SHA.

Cost:

- provider/model/LLM/Judge/Deep Judge/subagent calls = 0.

Do not:

- reuse Campaign-1 run ID or ledger;
- modify Product or validation harness;
- patch defects in place;
- run complete `pnpm test`;
- start Phase 13.3.

Commit one docs-only execution report and return the frozen status token.
