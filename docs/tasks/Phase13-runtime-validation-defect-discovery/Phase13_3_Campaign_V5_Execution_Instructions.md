# Risk Advisor Phase 13.3 — Campaign V5 Execution Instructions

First push the exact existing v4 docs-only report commit unchanged:

`5136356ebfcacd1159cac215bab3bb95e3ed9716`

Then sync current main and execute:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Campaign_V5_Authorization.md`

Fresh run:

- `phase13-real-agent-canonical-v5`
- provider `deepseek-official`
- model `deepseek-v4-flash`
- reasoning `low`
- exactly 20 tasks / 20 Sessions
- 5 families × 4
- max 6 provider turns/task
- max 12 Tool executions/task
- hard caps 120 provider turns / 240 Tool executions
- Judge / Deep Judge / subagents off

Preflight:

- verify exact Product/validation/Harness;
- reuse hydrated pinned Harness only if tracked clean;
- canonicalize/freeze disposable workspace root;
- generate/hash/replay manifest;
- prove byte identity;
- verify canonical containment;
- freeze root/manifest before task 1.

Do **not** run another standalone readiness request.

Task 1 is the first canonical provider use.

If an assistant turn has no visible text and no Tool call, record it; do not stop solely for that reason. If the task ends without its independent goal, mark the task incomplete and continue.

Stop only for the existing real Product/provider/capture/workspace/profile blockers.

No task reruns.
No Product/validation/Harness edits.
No full `pnpm test`.
No Phase 13.4.

Commit one bounded docs-only v5 execution report and return the frozen status token.
