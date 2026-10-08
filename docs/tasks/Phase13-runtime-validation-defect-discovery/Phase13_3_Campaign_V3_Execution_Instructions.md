# Risk Advisor Phase 13.3 — Campaign V3 Execution Instructions

First preserve the stopped v2 evidence by pushing the exact existing docs-only commit:

`209b76558d0140e90cca2a3b0a8317990f9057d6`

Do not modify that report.

Then use the current main containing this authorization and execute:

`Phase13_3_Readiness_Validation_Repair_Authorization.md`

Key repair:

- remove the ad-hoc readiness stream reader;
- do not parse `chunk.delta` or guess provider chunk fields;
- readiness must use the pinned Harness public Agent/provider consumption path used by canonical Agent execution;
- no tracked Product/validation/Harness/package changes.

Fresh run:

- `phase13-real-agent-canonical-v3`
- provider `deepseek-official`
- model `deepseek-v4-flash`
- reasoning `low`
- exactly 20 tasks / 20 Sessions
- max 6 provider turns/task
- max 12 Tool executions/task
- campaign hard caps 120 provider turns / 240 Tool executions
- Judge / Deep Judge / subagents off

Regenerate and byte-replay the v3 manifest.

Readiness:

- at most one provider request;
- zero Tools;
- use canonical Harness response consumer;
- if readiness fails, stop;
- do not change model/provider/reasoning.

If readiness passes, start v3 exactly once.

No task reruns.
No full `pnpm test`.
No Phase 13.4.

Commit one bounded docs-only v3 execution report and return the frozen status token.
