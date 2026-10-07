# Risk Advisor Phase 13.3 — Provider Environment Blocker Architecture Review

## Verdict

`RISK_ADVISOR_PHASE13_3_PROVIDER_ENVIRONMENT_BLOCKER_CONFIRMED_RECOVERY_REQUIRED`

The reported Phase 13.3 stop is an environment-preparation blocker, not a Risk Advisor Product defect and not a validation-truth defect.

## Reviewed provenance

- execution baseline:
  `7902df75b7d3d0f20660703ab5759e37fe5f35f0`
- blocker report:
  `5cccaf120eeeb94859fab2c99ceb09eaf74f51cb`
- accepted Product:
  `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`
- accepted validation Repair2:
  `0904afe035232f6d9faab2fd539018b6e1c4263b`
- pinned Harness:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`

Baseline -> blocker report changes exactly one docs-only execution report.

## Classification

The isolated pinned Harness worktree failed during frozen offline dependency preparation because the local pnpm store lacked:

`eventsource-parser@3.1.0`

The attempted command used `--frozen-lockfile --offline`, so the missing tarball could not be hydrated without npm registry traffic.

This occurred before:

- readiness provider request;
- Agent Session creation for campaign evidence;
- canonical task execution;
- Tool execution;
- campaign workspace allocation.

Observed canonical counts therefore remain:

- readiness provider request: 0;
- canonical tasks: 0;
- provider turns: 0;
- Tool executions: 0.

No Product, validation, package/lock, or Harness source mutation occurred.

## Architecture decision

The Phase 13.3 network boundary is clarified:

> Tool-side network is forbidden during the canonical campaign. Provider traffic to `deepseek-official` is allowed. A separate, bounded pre-campaign dependency-hydration step may access the package registry solely to materialize packages already pinned by the unchanged frozen lockfile.

Package-manager traffic during this pre-campaign environment step is not Agent/Tool campaign traffic.

It must end before readiness/canonical execution begins.

## Campaign identity consequence

Do not reuse:

`phase13-real-agent-canonical-v1`

Even though canonical execution never began, the identity is now attached to a preserved blocked preflight report.

The recovery campaign must use a fresh identity:

`phase13-real-agent-canonical-v2`

The task semantics, seed, generator, model profile, task count, and all limits remain frozen.

## No Product repair

No Product repair is authorized.

No validation-harness repair is authorized.

No Harness source repair is authorized.

Only environment hydration is authorized under a separate bounded recovery contract.
