# Risk Advisor Phase 13.3 — Campaign V5 Authorization

## Status

`RISK_ADVISOR_PHASE13_3_CAMPAIGN_V5_AUTHORIZED`

## 1. Purpose

Proceed to the real Agent campaign without another separate readiness request.

V3 proved the pinned Harness public provider path can complete.

V4 again completed one provider turn through that path.

The repeated pre-campaign readiness layer is now more disruptive than informative.

For v5, the canonical campaign itself is the provider/runtime validation.

## 2. Baseline

Keep the accepted identities unchanged:

- Product:
  `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`
- validation Repair2:
  `0904afe035232f6d9faab2fd539018b6e1c4263b`
- Harness:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`

No Product/validation/Harness change is authorized.

## 3. Preserve v4 evidence

Before v5, push the exact existing v4 report commit unchanged:

`5136356ebfcacd1159cac215bab3bb95e3ed9716`

It remains historical stopped-run evidence.

Do not rewrite it to reflect the later architecture classification.

## 4. Fresh identity

Use:

`phase13-real-agent-canonical-v5`

Keep:

- seed: `phase13-real-agent-v1`
- generator: `phase13-real-agent-manifest-v1`
- exactly 20 tasks
- exactly 20 independent Sessions
- five families × four tasks
- max 6 provider turns/task
- max 12 Tool executions/task
- hard cap 120 provider turns
- hard cap 240 Tool executions

## 5. Exact provider profile

- provider: `deepseek-official`
- model: `deepseek-v4-flash`
- reasoning: `low`
- Fast Judge: off
- Deep Judge: off
- subagents: off

No substitution.

## 6. Frozen preflight order

Before the first canonical Agent Session:

1. verify Product / validation / Harness identities and tracked cleanliness;
2. verify hydrated Harness environment remains usable;
3. resolve/freeze canonical disposable workspace root;
4. generate the complete v5 manifest;
5. canonicalize and hash manifest;
6. regenerate/replay and prove byte identity;
7. verify every task workspace is canonically contained;
8. freeze manifest/root;
9. start canonical task 1.

There is **no separate readiness provider request in v5**.

After step 8, manifest/root/fixtures/prompts are immutable.

## 7. Canonical launch

The campaign starts at task 1's campaign-owned Agent Session.

Each task receives one frozen user prompt.

The Agent chooses its own Tool sequence.

No human follow-up prompts.

No task rerun.

## 8. Empty assistant behavior

A completed assistant turn with:

- no visible text;
- and no Tool call

does not by itself stop the campaign.

Record it as an Agent turn.

If the task subsequently terminates without satisfying its independent postcondition, classify the task as incomplete.

Do not classify it as Risk Advisor FP/FN solely because the Agent made no progress.

If the provider/runtime throws an actual error, classify according to the existing provider/environment rules.

## 9. Product scoring

Score F1/F2 only from independent frozen-contract truth over actual Tool executions.

Task completion is reported separately from Product correctness.

Report:

- completed tasks;
- incomplete tasks;
- provider-blocked tasks;
- provider turns;
- Tool executions;
- F1 TP/FP/FN/TN/NA/unscorable;
- F2 TP/FP/FN/TN/NA/unscorable;
- duplicate/wrong-session/resurrection/lifecycle counts;
- capture/upstream/environment counts;
- opportunity candidates.

A task can be incomplete while Risk Advisor remains correct.

## 10. Provider failures

A single task-level empty assistant answer is not provider failure.

Stop the campaign for provider/environment only on an actual frozen blocker such as:

- request/transport/runtime exception that prevents continued canonical execution;
- authentication/rate-limit/model-unavailable error;
- profile drift;
- systematic runtime inability to create/advance Agent Sessions.

Do not add validation-owned provider retries.

## 11. Network

During v5:

Allowed:

- canonical `deepseek-official` provider traffic.

Forbidden:

- Tool-side network;
- package registry;
- task Git remotes;
- arbitrary web/API traffic.

## 12. Immutability

Do not modify:

- Product source/tests;
- accepted validation;
- package/lock/config;
- Harness source/lock/config.

Do not run complete `pnpm test`.

Do not start Phase 13.4.

## Result states

If all 20 tasks are attempted and no frozen blocker occurs:

`RISK_ADVISOR_PHASE13_3_CAMPAIGN_V5_READY_FOR_ARCHITECTURE_REVIEW`

This token is valid even if some Agent tasks are incomplete; task incompletion is an observed campaign result.

If Product blocker:

`RISK_ADVISOR_PHASE13_3_BLOCKED_PRODUCT_REPAIR_REQUIRED`

If real provider/environment blocker:

`RISK_ADVISOR_PHASE13_3_PROVIDER_ENVIRONMENT_BLOCKED`

If validation procedure still cannot capture/score correctly:

`RISK_ADVISOR_PHASE13_3_VALIDATION_REPAIR_REQUIRED`
