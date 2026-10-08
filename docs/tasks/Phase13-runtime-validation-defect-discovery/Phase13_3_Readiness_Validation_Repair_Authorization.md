# Risk Advisor Phase 13.3 — Readiness Validation Repair Authorization

## Status

`RISK_ADVISOR_PHASE13_3_READINESS_VALIDATION_REPAIR_AUTHORIZED`

## Scope

Repair only the validation-owned readiness procedure.

No tracked Product, Product test, accepted validation harness, package/lock/config, or Harness Core/source change is authorized.

A local untracked runner/helper may be replaced or rewritten.

## R1 — Canonical consumer only

Locate the pinned Harness public execution/response path used by normal Agent execution.

The readiness probe must use that path end-to-end.

Do not manually interpret raw provider stream chunks.

Do not depend on provider-specific internal fields such as `chunk.delta`.

## R2 — Readiness success condition

A readiness probe passes only if:

1. exact provider resolves to `deepseek-official`;
2. exact model resolves to `deepseek-v4-flash`;
3. reasoning resolves to `low`;
4. one provider request completes through the public Harness consumption path;
5. no Tool execution occurs;
6. no provider/transport/runtime exception escapes;
7. the isolated readiness Session/runtime is disposed cleanly.

A particular raw token/chunk text shape is not part of readiness truth.

## R3 — Zero Tool readiness

Use an isolated readiness Session/runtime with no usable Tool surface or with Tool execution disabled.

The readiness prompt must be trivial and must not require Tools.

Any Tool execution during readiness is a blocker.

## R4 — No retry

At most one readiness provider request for v3.

If it fails, stop.

Do not retry with:

- another parser;
- another provider;
- another model;
- another reasoning level;
- another prompt intended to mask the failure.

## R5 — Provider accounting

Count the v3 readiness provider request separately from canonical campaign provider turns.

Record whether public token/usage telemetry is available.

Do not require raw stream inspection to obtain token accounting.

## R6 — Existing environment

Reuse the already hydrated pinned Harness environment only if:

- Harness remains exact SHA `ddefc45fbc7f8e46dd73185e68295696d1297887`;
- tracked Harness tree remains clean;
- package/lock/workspace files remain unchanged.

Do not rerun dependency hydration unless the environment is no longer usable.

## R7 — v2 report preservation

After the stopped v2 attempt, ordinary Git network may be restored.

Push the exact local docs-only v2 report commit:

`209b76558d0140e90cca2a3b0a8317990f9057d6`

to its existing branch as historical evidence.

Do not alter its contents merely to fit later decisions.

## R8 — Fresh v3 campaign

If v3 readiness passes, run:

`phase13-real-agent-canonical-v3`

Keep all Phase 13.3 frozen task/profile limits unchanged:

- exactly 20 tasks / 20 Sessions;
- 5 families × 4;
- provider `deepseek-official`;
- model `deepseek-v4-flash`;
- reasoning `low`;
- max 6 provider turns/task;
- max 12 Tool executions/task;
- hard caps 120 provider turns / 240 Tool executions;
- Judge / Deep Judge / subagents disabled.

Regenerate and byte-replay the v3 manifest before readiness.

## R9 — Network boundary

Before canonical execution, ordinary Git push of docs-only historical/recovery evidence is allowed.

During v3 readiness/campaign:

- external traffic is limited to `deepseek-official`;
- Tool-side network is forbidden;
- package registry traffic is forbidden;
- task Git fixtures have no remote.

## R10 — Stop conditions

All existing Phase 13.3 stop conditions remain.

Additionally stop if:

- canonical Harness consumer cannot be located/used without tracked source changes;
- readiness requires a raw provider-internal chunk parser;
- readiness executes any Tool;
- exact profile drifts.

## Result states

If v3 completes:

`RISK_ADVISOR_PHASE13_3_CAMPAIGN_V3_READY_FOR_ARCHITECTURE_REVIEW`

If Product defect:

`RISK_ADVISOR_PHASE13_3_BLOCKED_PRODUCT_REPAIR_REQUIRED`

If provider/environment failure:

`RISK_ADVISOR_PHASE13_3_PROVIDER_ENVIRONMENT_BLOCKED`

If validation procedure remains insufficient:

`RISK_ADVISOR_PHASE13_3_VALIDATION_REPAIR_REQUIRED`
