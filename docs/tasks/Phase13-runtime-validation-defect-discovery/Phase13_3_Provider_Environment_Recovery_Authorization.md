# Risk Advisor Phase 13.3 — Provider Environment Recovery Authorization

## Status

`RISK_ADVISOR_PHASE13_3_PROVIDER_ENVIRONMENT_RECOVERY_AUTHORIZED`

## Purpose

Prepare the exact pinned Harness runtime without changing dependency declarations or source, then run one fresh Phase 13.3 canonical campaign.

## A. Environment hydration

Use an isolated worktree at exact Harness SHA:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

The only network exception before campaign execution is package-registry traffic needed by:

`pnpm install --frozen-lockfile`

Requirements:

1. the existing frozen lockfile is authoritative;
2. do not modify `package.json`, lockfile, workspace config, or Harness source;
3. do not run dependency update/add/remove commands;
4. do not manually choose a newer/older package version;
5. do not use `--no-frozen-lockfile`;
6. registry traffic ends after hydration;
7. verify tracked Harness tree remains exactly clean at the pinned SHA;
8. verify the previously missing `eventsource-parser@3.1.0` resolves from the hydrated install;
9. if frozen install itself requires a tracked change, stop;
10. if the registry cannot supply the frozen dependency, stop as provider/environment blocked.

Untracked `node_modules` and pnpm store material are environment state and must not be committed.

## B. Fresh campaign identity

Use:

`phase13-real-agent-canonical-v2`

Do not append to or resume v1.

Keep:

- seed: `phase13-real-agent-v1`;
- generator: `phase13-real-agent-manifest-v1`;
- exactly 20 tasks / 20 Sessions;
- 5 families × 4;
- max 6 provider turns/task;
- max 12 Tool executions/task;
- hard caps 120 provider turns / 240 Tool executions.

Regenerate and canonicalize a fresh v2 manifest and record its SHA-256.

Replay must be byte-identical before readiness.

## C. Provider profile

Exact profile remains:

- provider: `deepseek-official`;
- model: `deepseek-v4-flash`;
- reasoning: `low`;
- Fast Judge: disabled;
- Deep Judge: disabled;
- subagents: disabled.

No substitution or silent reasoning upgrade.

## D. Network boundary after hydration

After frozen dependency hydration:

Allowed external traffic:

- the frozen readiness request to `deepseek-official`;
- canonical Agent provider traffic to `deepseek-official`.

Forbidden:

- Tool-side network;
- npm/package registry traffic during readiness/campaign;
- Git remote traffic from task fixtures;
- arbitrary web/API requests;
- cloud/service mutations.

## E. Readiness

Run at most one provider readiness request with zero Tools.

If readiness fails, stop.

Do not retry it with another model/provider/profile.

## F. Canonical execution

If readiness passes, start v2 exactly once.

Agent chooses its own Tool sequence.

No human follow-up prompts.

No campaign task reruns to improve results.

Stop at first frozen Phase 13.3 blocker.

## G. Immutability

Do not modify during recovery/campaign:

- Risk Advisor `src/`;
- Product tests;
- `validation/phase13/`;
- Risk Advisor package/lock/config;
- Harness Core/source/lockfile;
- accepted F1/F2 truth.

Do not run complete `pnpm test`.

Do not start Phase 13.4.

## H. Evidence/report

The prior v1 blocker report remains historical preflight evidence.

For v2, commit one new bounded docs-only execution report.

Report separately:

- package hydration result and tracked-drift check;
- readiness request count/result;
- manifest SHA;
- provider/model/reasoning identity;
- tasks/Sessions/provider turns/Tool executions;
- F1/F2 scoring;
- lifecycle/integrity counters;
- provider/environment failures;
- opportunity candidates;
- token/usage telemetry if available.

## Status tokens

If clean:

`RISK_ADVISOR_PHASE13_3_CAMPAIGN_V2_READY_FOR_ARCHITECTURE_REVIEW`

If Product blocker:

`RISK_ADVISOR_PHASE13_3_BLOCKED_PRODUCT_REPAIR_REQUIRED`

If provider/environment blocker:

`RISK_ADVISOR_PHASE13_3_PROVIDER_ENVIRONMENT_BLOCKED`

If validation/capture insufficiency:

`RISK_ADVISOR_PHASE13_3_VALIDATION_REPAIR_REQUIRED`
