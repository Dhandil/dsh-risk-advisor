# Risk Advisor Phase 13.3 — V4 Validation Procedure Repair Authorization

## Status

`RISK_ADVISOR_PHASE13_3_V4_VALIDATION_PROCEDURE_REPAIR_AUTHORIZED`

## Scope

Repair only the local/untracked Phase 13.3 campaign procedure.

No tracked change is authorized to:

- Risk Advisor Product source;
- Product tests;
- accepted `validation/phase13/` harness/truth;
- Risk Advisor package/lock/config;
- Harness source/package/lock/config.

If v4 cannot be executed without such a tracked change, stop.

## R1 — canonical workspace path authority

Before manifest generation:

1. create/resolve the disposable campaign root;
2. obtain its canonical filesystem path using the platform-equivalent of `realpath`;
3. use that canonical root as the sole workspace-root identity for the run;
4. canonicalize each existing workspace/candidate path before containment comparison;
5. for paths that do not yet exist, canonicalize the nearest existing parent and resolve the remaining relative suffix without following an escape;
6. perform containment using path semantics, not raw string-prefix equality.

A candidate is contained only when its normalized/canonical relative path from the canonical root:

- is not absolute;
- is not `..`;
- does not begin with `../` or the platform equivalent;
- does not escape through a symlinked existing ancestor.

Equivalent lexical spellings such as platform alias/symlink forms of the same temporary directory are not a blocker after canonicalization.

## R2 — one authoritative root

After canonical workspace-root resolution, do not later replace the campaign root with a different spelling or identity.

The manifest, workspace factory, evidence paths, and containment checks must reference the same canonical root identity.

## R3 — frozen pre-readiness sequence

The exact order for v4 is:

1. verify Product / validation / Harness SHAs and tracked cleanliness;
2. verify hydrated Harness dependencies are usable;
3. resolve and freeze canonical disposable workspace root;
4. build the complete deterministic v4 task manifest;
5. canonicalize manifest bytes;
6. record manifest SHA-256;
7. regenerate/replay and prove byte identity;
8. verify all task workspaces are contained under the canonical root;
9. only then perform readiness;
10. if readiness passes, start canonical v4 once.

No manifest regeneration, correction, mutation, task substitution, or root rewrite is allowed after step 8.

If any pre-readiness artifact is wrong, fix it before readiness and then restart preflight from step 1 without consuming a provider request.

## R4 — readiness

For v4:

- use the pinned Harness public Agent/provider consumption path;
- exact provider `deepseek-official`;
- exact model `deepseek-v4-flash`;
- reasoning `low`;
- at most one readiness provider request;
- zero Tool executions;
- no ad-hoc raw stream parser.

If readiness fails, stop.

## R5 — fresh v4 identity

Use:

`phase13-real-agent-canonical-v4`

Keep:

- seed `phase13-real-agent-v1`;
- generator `phase13-real-agent-manifest-v1`;
- exactly 20 tasks / 20 Sessions;
- five families × four;
- max 6 provider turns/task;
- max 12 Tool executions/task;
- hard caps 120 provider turns / 240 Tool executions;
- Judge / Deep Judge / subagents disabled.

## R6 — canonical launch boundary

The canonical run is considered started only when task 1 begins campaign-owned Session/provider/tool lifecycle.

A launcher assertion before task 1 with:

- zero canonical Session;
- zero canonical provider request;
- zero Tool execution;
- zero ledger record

is pre-campaign validation failure, not partial campaign evidence.

Even so, the run identity is consumed once a canonical launch has been attempted; therefore v3 remains retired.

## R7 — no retry / no repair during campaign

Once v4 canonical task 1 starts:

- do not regenerate manifest;
- do not rewrite root;
- do not rerun a failed task;
- do not alter prompts/fixtures;
- do not patch validation/Product/Harness;
- stop at first frozen blocker.

## R8 — network

Before readiness, ordinary Git push of stopped-run docs and local environment checks are allowed.

During readiness/canonical v4:

- external traffic only to `deepseek-official`;
- Tool-side network forbidden;
- registry traffic forbidden;
- task Git fixtures have no remote.

## R9 — evidence

Push the exact existing v3 report commit unchanged before v4:

`70de38e034d4dbce3ac31bfb9c2c4a323dcea760`

The report remains historical evidence.

For v4, record:

- canonical root normalization result without exposing unnecessary raw private path material;
- manifest SHA;
- replay identity;
- readiness count/result;
- tasks/Sessions/provider turns/Tools;
- F1/F2 scoring;
- lifecycle/integrity counters;
- environment/provider/capture counters;
- opportunities;
- token/usage telemetry if publicly available.

Raw transcripts and high-volume evidence remain local/untracked.

## Result states

If v4 completes:

`RISK_ADVISOR_PHASE13_3_CAMPAIGN_V4_READY_FOR_ARCHITECTURE_REVIEW`

If Product blocker:

`RISK_ADVISOR_PHASE13_3_BLOCKED_PRODUCT_REPAIR_REQUIRED`

If provider/environment blocker:

`RISK_ADVISOR_PHASE13_3_PROVIDER_ENVIRONMENT_BLOCKED`

If validation procedure remains insufficient:

`RISK_ADVISOR_PHASE13_3_VALIDATION_REPAIR_REQUIRED`
