# Risk Advisor Phase 13.3 — Campaign V4 Execution Instructions

First push the exact existing v3 docs-only report commit unchanged:

`70de38e034d4dbce3ac31bfb9c2c4a323dcea760`

Then sync current main and execute:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_V4_Validation_Procedure_Repair_Authorization.md`

Repair only the local/untracked campaign procedure.

Key requirements:

- canonicalize the temporary workspace root before manifest generation;
- compare containment using canonical filesystem paths, not raw path spelling;
- one canonical root identity for manifest/workspace/evidence;
- finish all non-provider preflight before readiness;
- manifest must be generated, hashed, replayed byte-identically, and containment-checked before readiness;
- after readiness, manifest/root must not change.

Fresh run:

- run id `phase13-real-agent-canonical-v4`
- provider `deepseek-official`
- model `deepseek-v4-flash`
- reasoning `low`
- exactly 20 tasks / 20 Sessions
- max 6 provider turns/task
- max 12 Tool executions/task
- hard caps 120 provider turns / 240 Tool executions
- Judge / Deep Judge / subagents disabled

Readiness:

- at most one provider request
- zero Tools
- pinned Harness public Agent/provider consumer only

If readiness passes, launch v4 exactly once.

Once task 1 starts, no manifest/root/fixture repair and no task rerun.

Do not modify Product / accepted validation / Harness.
Do not run complete `pnpm test`.
Do not start Phase 13.4.

Commit one bounded docs-only v4 execution report and return the frozen status token.
