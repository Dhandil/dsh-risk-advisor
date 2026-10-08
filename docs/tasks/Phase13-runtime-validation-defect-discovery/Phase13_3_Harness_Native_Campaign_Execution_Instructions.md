# Risk Advisor Phase 13.3 — Harness-Native Campaign Execution Instructions

The previous V5 procedure is superseded.

Execute:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Harness_Native_Real_Agent_Architecture_Amendment.md`

## Core rule

Do not recreate Harness.

Harness owns:

- existing provider/model/reasoning configuration;
- Agent/Session lifecycle;
- provider calls and response consumption;
- ToolRuntime;
- message lifecycle.

Validation owns only:

- 20-task manifest;
- disposable fixtures/workspaces;
- submitting tasks through the normal supported Harness entry;
- observing public Risk Advisor/Harness evidence;
- independent truth/scoring;
- report.

## Before campaign

1. push/preserve the existing V4 docs-only report unchanged if still local;
2. verify exact Risk Advisor and pinned Harness tracked baselines;
3. read-only localize the normal supported Harness task/session entry used by ordinary operation;
4. use Harness-supported runtime/session isolation; do not invent replacement SessionStore/Agent/provider plumbing;
5. prepare canonical disposable workspace;
6. generate/hash/replay the 20-task manifest;
7. prove containment;
8. record the effective Harness configuration/profile only if publicly observable; do not override it.

If real Harness cannot be safely isolated/observed through supported interfaces, stop with:

`RISK_ADVISOR_PHASE13_3_NATIVE_OBSERVABILITY_BLOCKED`

## Canonical run

Run id:

`phase13-harness-native-canonical-v1`

Exactly 20 tasks / 20 campaign Sessions, 5 families × 4.

Submit each task through normal Harness.

No standalone readiness request.

No provider/model/reasoning override.

No validation-owned model loop.

No raw stream parsing.

No human follow-up prompts.

No task reruns.

Tool-side external network forbidden.

Observed Tool ceiling: 240.

Task failure/empty assistant output is not automatically a blocker; score task completion separately.

Stop only on frozen Product/Harness/environment/observability/workspace/integrity blockers.

Do not modify Product / validation / Harness / user's Harness config.
Do not run full `pnpm test`.
Do not start Phase 13.4.

Commit one bounded docs-only execution report and return the frozen status token.
