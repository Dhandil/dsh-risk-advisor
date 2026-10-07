# Risk Advisor Phase 13.3 — Real Agent Campaign Architecture Freeze

## Status

`RISK_ADVISOR_PHASE13_3_FROZEN_READY_FOR_EXECUTION`

Phase 13.3 validates the accepted Risk Advisor Product under real provider-backed Agent behavior.

It does not add Product authority and does not modify Product code.

## 1. Accepted baseline

- Phase 13.2 final accepted main:
  `7e1591bfd32042db1453a4e1429452614417fc82`
- Accepted Product executable:
  `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`
- Accepted validation Repair2:
  `0904afe035232f6d9faab2fd539018b6e1c4263b`
- Pinned Harness:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`

Phase 13.2 proved deterministic Tool-level correctness across 300 scenarios / 1500 Tool executions with zero F1/F2 FP/FN.

Phase 13.3 asks whether the same accepted contract remains correct when a real Agent chooses its own Tool sequence.

## 2. Provider profile

Canonical profile:

- provider: `deepseek-official`;
- model: `deepseek-v4-flash`;
- reasoning effort: `low`;
- Fast Judge: disabled;
- Deep Judge: disabled;
- subagents: disabled.

Do not silently upgrade reasoning to `high` or `max`.

Do not substitute another provider/model.

If the exact profile cannot be resolved from the pinned Harness configuration, stop before the canonical campaign.

API credentials must come from the existing local Harness/provider environment.

Never print, persist, copy, or commit credentials.

## 3. Campaign identity

Canonical run:

`phase13-real-agent-canonical-v1`

Task-manifest seed/version:

- seed: `phase13-real-agent-v1`
- generator/version: `phase13-real-agent-manifest-v1`

The task manifest is deterministic and must be canonicalized and SHA-256 recorded before any canonical Agent task starts.

Agent/model outputs are not expected to be deterministic.

Do not regenerate or mutate tasks based on observed Agent behavior.

## 4. Exact campaign scale

Exactly 20 canonical Agent tasks.

Exactly 20 independent Session identities.

Per task limits:

- at most 6 provider/model turns;
- at most 12 Tool executions;
- one initial user task prompt;
- no human follow-up prompt;
- one disposable bounded workspace.

Campaign hard ceilings:

- provider/model turns: 120;
- Tool executions: 240.

Stop rather than exceed either ceiling.

## 5. Task families

Use exactly five families, four tasks each.

### R1 — ordinary successful workspace task

Four short tasks such as:

- inspect a small fixture and create a requested summary file;
- modify one bounded text/config fixture;
- create a local directory/file structure;
- inspect a tiny local project and write a requested result.

Purpose:

- observe natural successful Agent Tool use;
- verify ordinary execution remains quiet;
- exercise F2 matched paths where naturally applicable.

### R2 — exact retry pressure

Four tasks contain one controlled local failure condition likely to invite an exact retry.

The Agent is not instructed to repeat the failure.

The failure fixture must be deterministic and local.

Purpose:

- observe whether the Agent naturally performs exact retries;
- if it does, score F1 from actual execution truth.

Do not force the Agent to produce an F1-positive sequence.

### R3 — changed-strategy recovery pressure

Four tasks contain a failure that can be solved by changing command/argument/operation.

Purpose:

- observe natural strategy changes;
- ensure changed fingerprint breaks F1 under accepted contiguous semantics;
- record useful broader no-progress patterns only as coverage opportunities.

### R4 — supported postcondition success

Four tasks exercise supported F2 verification families where the final operation should match its expected postcondition.

Prefer small local:

- write/edit;
- mkdir;
- copy-file;
- local git branch switch;
- local node package resolution where fixtureable without network.

Purpose:

- real Agent + real Tool path;
- expected F2 negative when verification is MATCHED.

### R5 — controlled postcondition mismatch

Four tasks use validation-owned safe fault fixtures around supported F2 operations so the Agent invokes a realistic operation but the observed postcondition deterministically mismatches.

Purpose:

- real Agent planning with controlled F2-positive evidence.

These are fault-fixture results and must be reported separately from naturally occurring real-Agent defects.

The fixture must not alter Product code or Product truth.

## 6. Agent prompt rules

Prompts must be short, task-oriented, and synthetic.

Each prompt may state:

- the task goal;
- the disposable workspace root;
- that all work must stay inside that root;
- that external network access is forbidden for Tools.

Do not tell the Agent:

- what Finding is expected;
- what exact Tool sequence to use;
- to retry a failure;
- to trigger Risk Advisor;
- about Product internals.

The Agent must choose its own Tool sequence.

## 7. Workspace and network safety

Only disposable validation workspaces are allowed.

Never let Tool execution touch:

- the user's real repositories;
- Risk Advisor checkout;
- Harness checkout;
- user home content outside the disposable root;
- credentials;
- remote Git;
- package publication;
- cloud resources;
- production services.

Provider traffic to `deepseek-official` is the only intended external network traffic.

Tool-side network access is forbidden.

Local Git fixtures must have no remote.

## 8. Provider readiness gate

Before the canonical run, one bounded readiness probe is allowed.

It may:

- resolve exact provider/model/reasoning configuration;
- create and dispose one isolated Agent/Session;
- make at most one provider request;
- execute zero Tools.

The readiness probe is not campaign evidence.

If readiness fails:

- do not start the canonical run;
- do not change provider/model/reasoning;
- classify environment/provider configuration;
- return for Architecture Review.

Record readiness provider-call count separately.

## 9. Evidence capture

For every canonical task capture:

- taskId / family;
- Session identity;
- provider/model/reasoning profile;
- provider turn count;
- Tool execution count;
- Tool name + validation-safe operation class;
- correlation/execution identity;
- sanitized result class;
- verification settlement;
- actual F1/F2 Findings;
- final independent workspace postcondition;
- task completion class.

Raw prompts/transcripts/tool output remain local and untracked.

Committed evidence must not contain credentials, raw private paths, secrets, or large model transcripts.

## 10. Contract truth under real Agent behavior

Product correctness truth remains independent of Risk Advisor output.

For each actual Tool execution, derive frozen-contract expectation from:

- captured Tool name/arguments in the synthetic fixture;
- structured Tool result;
- independent workspace state;
- accepted F1 contiguous retry semantics;
- accepted supported F2 verifier semantics.

Do not derive expected labels from:

- actual Finding output;
- advisory text;
- Product diagnosis internals;
- Agent explanation.

Score F1/F2 only for executions where independent truth is scorable.

Real-Agent task success/failure is not itself an F1/F2 expected label.

## 11. Agent behavior is not Product correctness

The Agent may:

- choose a poor strategy;
- repeat a failure;
- fail to finish a task;
- use more steps than necessary.

Those are not automatically Risk Advisor defects.

Risk Advisor defects remain:

- frozen-contract FP/FN;
- duplicate Finding;
- wrong-Session Finding;
- Finding resurrection/lifecycle defect;
- capture/ownership corruption;
- authority/privacy violation.

If the Agent ignores an advisory, do not call that a Product defect: Online Correction V1 is advisory and does not control Agent execution.

## 12. Opportunity discovery

After the campaign, bounded human architecture review may label at most 20 episodes as:

`OUT_OF_SCOPE_USEFUL_WARNING_CANDIDATE`

Examples:

- alternating failed strategies;
- repeated semantic goal with changed fingerprints;
- unsupported but useful postcondition;
- obvious no-progress behavior outside F1/F2.

Opportunity labels do not affect frozen-contract precision/recall.

Do not use Judge/Deep Judge/model calls to classify opportunities.

## 13. Scoring

Report F1 and F2 separately:

- expected positive;
- expected negative;
- TP;
- FP;
- FN;
- TN;
- NA;
- unscorable;
- precision;
- recall.

Also report:

- Agent tasks completed / incomplete / blocked;
- provider turns;
- Tool executions;
- duplicate Findings;
- wrong-Session Findings;
- resurrection/lifetime violations;
- capture failures;
- upstream verification missing;
- provider/environment failures;
- opportunity candidates by family.

One deterministic frozen-contract FP/FN remains a Product P1 regardless of sample size.

## 14. Stop conditions

Stop scheduling new canonical tasks immediately on:

- Product P0;
- reproducible frozen-contract Product P1;
- wrong-Session Finding;
- duplicate Finding;
- resurrected Finding;
- Product-attributable lifecycle violation;
- ledger/capture integrity failure;
- workspace escape;
- Tool-side external network attempt;
- secret/credential exposure;
- Product/validation/Harness drift;
- provider/model profile drift;
- reasoning level above `low`;
- provider turn ceiling or Tool ceiling would be exceeded.

Provider outage, authentication failure, rate limit, transport failure, or model unavailability is an environment/provider blocker unless evidence proves a Product defect.

Do not repair during the campaign.

## 15. No silent provider retry policy changes

Use the pinned Harness provider behavior.

Do not add validation-owned provider retries to obtain a cleaner run.

If Harness itself retries, count and record those provider requests according to observable usage.

Do not rerun a failed canonical task under the same campaignRunId merely to improve the outcome.

## 16. Cost boundary

The campaign is intentionally small.

Do not expand beyond 20 tasks or 120 provider turns.

Do not run Fast Judge, Deep Judge, embeddings, or subagents.

Do not use high/max reasoning.

Record available provider usage/token accounting when exposed by the pinned adapter.

Cost accounting is observational; absence of token telemetry is not itself a Product defect.

## 17. Product / validation immutability

During the campaign do not modify:

- `src/`;
- Product tests;
- `validation/phase13/`;
- package/lock/config;
- Harness Core.

A validation-only fixture needed for R5 may be created as local untracked campaign material only if it uses already accepted public seams and does not alter Product/validation truth code.

If tracked validation code is required, stop before campaign execution and return for a separate architecture decision.

## 18. Testing boundary

Do not run complete `pnpm test`.

Do not rerun Phase 13.2.

Phase 13.3 evidence is the canonical real-Agent campaign.

## 19. Report states

If the full campaign completes without blocker:

`RISK_ADVISOR_PHASE13_3_CAMPAIGN_READY_FOR_ARCHITECTURE_REVIEW`

If Product correctness blocker:

`RISK_ADVISOR_PHASE13_3_BLOCKED_PRODUCT_REPAIR_REQUIRED`

If provider/environment blocker before or during canonical execution:

`RISK_ADVISOR_PHASE13_3_PROVIDER_ENVIRONMENT_BLOCKED`

If validation/capture architecture is insufficient:

`RISK_ADVISOR_PHASE13_3_VALIDATION_REPAIR_REQUIRED`

Do not self-declare Phase 13.3 accepted.

## 20. Boundary

Phase 13.3 remains observational.

It does not authorize:

- active correction;
- automatic retry/replan;
- Agent-context injection;
- new Finding kinds;
- Pattern/Guidance authority;
- Phase 13.4 lifecycle/concurrency/soak execution.
