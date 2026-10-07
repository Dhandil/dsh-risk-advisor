# Risk Advisor Phase 13.3 — Real Agent Campaign Execution Instructions

Current main:
`7e1591bfd32042db1453a4e1429452614417fc82`

Strictly execute:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Real_Agent_Campaign_Freeze.md`

Canonical profile:

- provider: `deepseek-official`
- model: `deepseek-v4-flash`
- reasoning: `low`
- Judge/Deep Judge/subagents: disabled

Campaign:

- run id: `phase13-real-agent-canonical-v1`
- exactly 20 tasks / 20 Sessions
- 5 families × 4 tasks
- max 6 provider turns/task
- max 12 Tool executions/task
- hard campaign caps: 120 provider turns / 240 Tool executions

Before canonical execution:

1. verify exact Product/validation/Harness baseline;
2. build deterministic task manifest and record SHA;
3. prove manifest replay byte-identical;
4. verify disposable-workspace containment;
5. resolve exact provider/model/reasoning profile;
6. run at most one readiness provider request with 0 Tools.

If exact provider/model/reasoning cannot be used, stop.

Do not alter provider/model to make the run work.

During campaign:

- Agent chooses its own Tool sequence;
- no human follow-up prompts;
- no Tool-side network;
- no Product/validation/Harness edits;
- no repairs/reruns under same run id;
- stop at first frozen blocker.

Commit only one bounded docs-only execution report.
Keep raw transcripts/evidence local and untracked.

Do not run complete `pnpm test`.
Do not start Phase 13.4.

Return the frozen Phase 13.3 status token.
