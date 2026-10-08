# Risk Advisor Phase 13.3 — Harness-Native Real Agent Architecture Amendment

## Status

`RISK_ADVISOR_PHASE13_3_HARNESS_NATIVE_ARCHITECTURE_AMENDED_READY_FOR_EXECUTION`

This amendment supersedes the Phase 13.3 execution architecture that introduced validation-owned provider/model/readiness/stream/Agent plumbing.

The purpose of Phase 13.3 is to test Risk Advisor while **real Harness performs real Agent work**.

Validation must not recreate Harness.

## 1. Superseded V5 authorization

The prior V5 authorization/instructions at main `0039e9abd5fdd8028245e9a800dc0f91a4138189` are superseded before canonical execution.

Do not execute the old V5 procedure.

The historical V1–V4 reports remain valid evidence of validation-infrastructure mistakes and provider-path observations, but none is an accepted Phase 13.3 canonical campaign.

## 2. System under test

The system under test is:

```
existing Harness configuration
  -> existing Harness Session/Agent lifecycle
  -> existing Harness provider/model selection
  -> existing Harness model-response consumption
  -> existing Harness ToolRuntime
  -> Risk Advisor plugin
```

Phase 13.3 must exercise this stack through a normal supported Harness task/session entry path.

The test layer must not replace any layer above.

## 3. Harness owns configuration

Harness configuration is authoritative.

Validation MUST NOT:

- choose or override provider;
- choose or override model;
- choose or override reasoning level;
- translate legacy/current model aliases;
- create its own provider client;
- add provider retries;
- inspect raw provider stream chunks;
- implement response assembly;
- decide whether a provider response is valid based on provider-specific raw fields.

Validation records the effective Harness configuration/profile if publicly observable.

If it is not publicly observable, record `HARNESS_CONFIG_AUTHORITY` and do not introspect private provider internals.

Configuration drift during a canonical run is a blocker only when observable through normal Harness state.

## 4. Harness owns Agent lifecycle

Validation MUST NOT construct a parallel Agent runtime.

Use the same public/supported Harness path used for ordinary work to:

- create/open a Session;
- submit the user task;
- let Harness invoke the configured model;
- let Harness choose and execute Tools;
- let Harness append/commit messages;
- let Harness handle continuation/termination;
- dispose/close the isolated test Session through normal lifecycle.

No validation-owned synthetic provider turn loop is allowed.

No validation-owned assistant-message parser is allowed.

## 5. No standalone readiness layer

Delete the separate Phase 13.3 readiness concept.

There is no pre-campaign provider request.

Task 1 is simply the first real Harness task.

If normal Harness cannot start/advance task 1 because of a genuine environment/provider/runtime problem, classify from the normal Harness failure surface.

Do not build a second readiness subsystem.

## 6. Native Harness entry path

Before canonical execution, perform a read-only localization of the pinned Harness checkout to identify the normal supported task/session execution entry used by ordinary Harness operation.

Preference order:

1. existing public Harness task/session API used by the normal product;
2. existing Harness CLI command/path;
3. existing local Harness service/API used by the Web product.

Do not use private provider adapters or reproduce internal Agent loops merely because they are easier to call.

Do not require the graphical UI if the same normal product path has a supported programmatic/CLI surface.

If no supported native entry can be used without modifying Harness source, stop for Architecture Review.

## 7. Isolation without replacing Harness

The campaign must protect normal user data while keeping Harness semantics real.

Use Harness-supported isolation mechanisms for Session/storage/workspace when available.

The disposable task workspace must be isolated.

Do not touch:

- user project repositories;
- Risk Advisor source checkout;
- Harness source checkout;
- unrelated user files;
- credentials;
- remote repositories;
- production services.

Do not invent a replacement SessionStore or ToolRuntime to obtain isolation.

If Harness offers no supported way to isolate its mutable runtime state from the normal user instance, stop and report that architecture limitation instead of simulating Harness.

## 8. Risk Advisor loading

Risk Advisor must be loaded through the normal Harness plugin/product wiring used in real operation.

Do not instantiate only isolated Risk Advisor internals as a substitute for plugin loading.

Public Risk Advisor diagnostics/correlation/verifier seams may be observed for grading if they are already part of the accepted Host contract.

## 9. Validation responsibilities

The Phase 13 validation layer owns only:

1. deterministic task manifest;
2. disposable task fixture/workspace preparation;
3. task submission through normal Harness;
4. capture of public/sanitized Harness/Risk Advisor observations;
5. independent workspace/Tool-result truth;
6. F1/F2 grading;
7. lifecycle/ownership integrity grading;
8. bounded evidence/reporting.

Everything else remains Harness-owned.

## 10. Task manifest

Use a fresh canonical run identity:

`phase13-harness-native-canonical-v1`

Keep the existing Phase 13.3 task intent:

- exactly 20 tasks;
- exactly 20 independent campaign Sessions;
- 5 families × 4;
- short synthetic tasks;
- bounded disposable workspaces;
- no human follow-up prompts;
- no task reruns;
- no task-manifest mutation after run start.

The manifest may contain task goals/fixtures and grading metadata.

It MUST NOT contain provider/model/reasoning choices.

## 11. Task families

Retain:

- R1 ordinary successful workspace work;
- R2 natural exact-retry pressure;
- R3 changed-strategy recovery pressure;
- R4 supported postcondition-success work;
- R5 controlled postcondition-mismatch fixture.

The Agent is told only the user goal and workspace boundary.

Do not tell it what Tool to call, what Finding to trigger, or how to retry.

## 12. Real Harness behavior is allowed to vary

The Harness Agent may:

- answer without Tool use;
- call different Tools than expected;
- fail a task;
- retry;
- change strategy;
- return little/no visible text;
- use fewer/more turns within ordinary Harness limits.

These are observations, not validation failures by themselves.

Task completion is graded separately from Risk Advisor correctness.

## 13. Campaign bounds

Because Harness owns the Agent loop, do not impose a second validation-owned turn engine.

Use a bounded campaign safety policy:

- exactly 20 submitted tasks;
- stop a task if normal Harness exposes a supported per-task cancellation/limit mechanism and the task becomes clearly unbounded;
- campaign Tool execution ceiling: 240 observed Tool executions;
- no Judge / Deep Judge / subagent activation by validation.

Do not override normal Harness configuration merely to enforce a model-turn count.

If a hard model-turn limit cannot be imposed without replacing Harness behavior, report observed turns instead of creating a validation-owned loop.

## 14. Network boundary

Normal provider traffic produced by Harness is allowed according to the user's existing Harness configuration.

Tool-side external network remains forbidden for these synthetic fixtures unless a task explicitly freezes a local-only Harness-supported Tool operation.

Do not invoke package registry, remote Git, arbitrary web APIs, or cloud mutations from task Tools.

Validation itself does not call a provider.

## 15. Truth/scoring

F1/F2 expected truth is derived independently from actual Harness Tool executions and fixture/workspace state.

Do not derive expected labels from Risk Advisor output or model explanations.

F1 remains the accepted contiguous exact retry-path contract.

F2 remains the accepted supported postcondition-verification contract.

Report:

- task completion/incompletion;
- observed provider/model/profile when available through normal public state;
- Agent/message turns when observable;
- Tool executions;
- F1 TP/FP/FN/TN/NA/unscorable;
- F2 TP/FP/FN/TN/NA/unscorable;
- duplicate Finding;
- wrong-Session Finding;
- resurrection/lifetime violation;
- capture failure;
- upstream verification issue;
- Harness/provider/environment failure;
- opportunity candidates.

## 16. Stop conditions

Stop on:

- Product P0;
- reproducible Product P1;
- wrong-Session/duplicate/resurrected Finding;
- lifecycle/capture/ledger corruption;
- workspace escape;
- secret exposure;
- Product/Risk Advisor/Harness tracked drift;
- inability to keep test work isolated using supported Harness mechanisms;
- genuine Harness/provider/runtime failure that prevents continuing normal tasks.

Do not stop merely because:

- assistant visible text is empty;
- a task fails;
- Agent chooses an unexpected Tool sequence;
- the effective model name differs from an earlier architectural assumption.

## 17. No repair during canonical campaign

Once task 1 is submitted:

- no validation repair;
- no Product repair;
- no Harness repair;
- no manifest mutation;
- no task rerun.

Stop and preserve evidence.

## 18. No Product/Harness mutation

Do not modify:

- Risk Advisor Product source/tests;
- accepted validation harness/truth;
- Harness source;
- Harness package/lock/config;
- user's Harness model/provider configuration.

Do not run complete `pnpm test`.

Do not start Phase 13.4.

## 19. Acceptance meaning

Phase 13.3 is successful when the campaign has exercised real Harness task execution and produced trustworthy Risk Advisor correctness evidence.

It is not a test of a validation-owned imitation of Harness.

## Result states

Clean/full review candidate:

`RISK_ADVISOR_PHASE13_3_HARNESS_NATIVE_CAMPAIGN_READY_FOR_ARCHITECTURE_REVIEW`

Product blocker:

`RISK_ADVISOR_PHASE13_3_BLOCKED_PRODUCT_REPAIR_REQUIRED`

Harness/provider/environment blocker:

`RISK_ADVISOR_PHASE13_3_HARNESS_ENVIRONMENT_BLOCKED`

Validation cannot observe/grade real Harness safely:

`RISK_ADVISOR_PHASE13_3_NATIVE_OBSERVABILITY_BLOCKED`
