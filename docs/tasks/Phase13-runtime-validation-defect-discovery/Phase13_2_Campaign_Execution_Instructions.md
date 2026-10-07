# Risk Advisor Phase 13.2 — Campaign Execution Instructions

Current main:
`9cb205295fdd04bfa459ad24d4c1d52273dde4e2`

Accepted Product executable:
`28d3d204376da0a43279b949a3ceea794212d10c`

Accepted validation harness:
`8ff9997dd8cb584ef079e1492759ea206477b966`

Pinned Harness:
`ddefc45fbc7f8e46dd73185e68295696d1297887`

Strictly execute:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_2_Deterministic_High_Volume_Campaign_Freeze.md`

Cost rule:

- provider/model/LLM/Judge/subagent calls = **0**;
- do not open a model-backed conversation for Lane A;
- Phase 13.3 future default is reserved as `deepseek-official/deepseek-v4-flash`, reasoning `low`; do not start 13.3 now.

Campaign:

- seed `phase13-lane-a-canonical-v1`;
- exactly 300 scenarios;
- target exactly 1500 Tool executions;
- explicit run policy 300/1500;
- deterministic manifest and pre-run SHA;
- accepted public-diagnostics capture/truth ledger only;
- stop immediately on P0/P1/capture/ledger/containment blocker;
- no Product or validation-harness modification during campaign.

Do not run complete `pnpm test`.
Do not call real provider/model.
Do not start Phase 13.3.
Do not repair defects in place.

Publish one docs-only campaign report.

Return one of the frozen Phase 13.2 status tokens.
