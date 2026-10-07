# Risk Advisor Phase 13.3 — Provider Environment Recovery Execution Instructions

Integrate the exact reviewed docs lineage first, then perform the authorized environment recovery and fresh v2 campaign.

Strictly follow:

- `Phase13_3_Provider_Environment_Recovery_Authorization.md`
- existing `Phase13_3_Real_Agent_Campaign_Freeze.md`

Environment step:

- pinned Harness SHA `ddefc45fbc7f8e46dd73185e68295696d1297887`;
- run frozen dependency hydration with `pnpm install --frozen-lockfile`;
- registry traffic is allowed only for this pre-campaign hydration;
- no lockfile/package/source modification;
- verify tracked Harness tree clean and `eventsource-parser@3.1.0` resolves.

Then restore provider-only network boundary.

Fresh campaign:

- run id `phase13-real-agent-canonical-v2`;
- provider `deepseek-official`;
- model `deepseek-v4-flash`;
- reasoning `low`;
- exactly 20 tasks / 20 Sessions;
- hard caps 120 provider turns / 240 Tool executions;
- Judge / Deep Judge / subagents off.

Regenerate/replay the v2 manifest and record SHA.

At most one readiness provider request, zero Tools.

If readiness passes, start v2 exactly once.

No Product/validation/Harness changes.
No task reruns.
No full `pnpm test`.
No Phase 13.4.

Commit one new docs-only v2 execution report and return the frozen status token.
