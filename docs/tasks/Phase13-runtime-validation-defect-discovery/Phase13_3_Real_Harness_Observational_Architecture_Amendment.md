# Phase 13.3 — Real Harness Observational Campaign Architecture Amendment

## Status

`RISK_ADVISOR_PHASE13_3_REAL_HARNESS_OBSERVATIONAL_ARCHITECTURE_FROZEN`

This amendment supersedes the **mandatory sandbox/isolation gate** in the Harness-native campaign amendment and the native isolation preflight instructions. Historical V1–V4 and native-observability reports remain unchanged.

## Purpose and system boundary

**Test Risk Advisor in the user's actual, normally configured Harness environment.** Risk Advisor is an observational, explanatory, advisory-only plugin; it does not own, enforce, or repair the Harness security sandbox or Agent Tool permissions.

Harness remains responsible for its normal config, provider/model selection, Agent/Session, model-response consumption, ToolRuntime and Tool authorization behavior. Risk Advisor observes real Tool events and reports F1/F2 Findings. Phase 13 validation supplies bounded tasks, captures existing public evidence, grades independent truth and reports deficiencies.

A genuine Harness security weakness may be an important observed environment risk, **but it is not automatically a Product defect or a precondition for completing Risk Advisor testing**. It is not in scope to change Harness to fix such weaknesses.

## Superseded requirements

These **are no longer mandatory preconditions** for Phase 13.3:

- a separate OS identity;
- a VM/container or disposable user;
- host filesystem/credential isolation as a campaign entry gate;
- provable network-deny policy for all Tool processes;
- a special provider readiness request;
- a custom provider/model/reasoning profile.

The prior `Phase13_3_Native_Isolation_Feasibility_Preflight_Instructions.md` is superseded for purposes of authorizing this observational campaign. Do not execute it as a gate before normal Harness testing.

This **does not assert** that the actual Harness is sandboxed or that Agent Tools cannot access other files, credentials or network resources. A task prompt is not an access-control boundary.

## Execution environment

- Use the real installed/pinned Harness runtime in the user's normal environment, by the same supported Web/CLI/local API path used for ordinary user tasks.
- Keep the user's current Harness provider/model/reasoning configuration authoritative; **no validation override**.
- Load Risk Advisor through the real Harness plugin wiring, not via isolated Product internals.
- Run in the ordinary host execution context. Do not implement a shadow provider client, Agent loop, SessionStore or ToolRuntime.
- Reuse ordinary Harness confirmations/approvals and tool permission behavior as configured; do not bypass them.
- A task may be initiated through the ordinary UI if that is the only genuinely supported path. In that case the executor may capture the result and classify the lack of an automated submit API; do not invent a replacement Harness.
- Do not read, print, copy, or export user credential values to validation artifacts.

## Task scope and risk acknowledgement

The user has chosen **real-environment observational testing**, not a security-confinement demonstration.

The first campaign uses low-impact, realistic work in a designated test directory *on the real host* and can include approved read-only tasks in real projects. This is a test-scope convention, **not a technical sandbox**.

- R1 ordinary workspace tasks;
- R2 naturally failure-prone local tasks with controlled, non-destructive fixtures;
- R3 recoverable local tasks requiring a changed strategy;
- R4 supported operations with matching postconditions;
- R5 non-destructive postcondition-mismatch fixtures.

Do not deliberately ask the Agent to inspect secrets, run remote operations, delete/modifying unrelated repositories, change system settings, publish packages, or operate production services. Do not seed actual user data as test material without explicit task-specific consent.

Real Harness may nevertheless allow more powerful operations; this is a known residual risk. Observe normal permission prompts. Any unexpected high-impact or clearly out-of-scope operation is grounds to stop that task and report what happened, **not** to claim Risk Advisor would have blocked it.

The campaign is not a penetration test or proof of Harness security.

## Normal operation, not scripted imitation

- Submit 20 bounded real tasks (five families, four tasks each) through the normal Harness entry in 20 distinct campaign Sessions where supported.
- Agent selects its Tool actions and whether to retry or change strategy.
- No injected Tool execution sequences, manual provider calls, standalone readiness, scripted Agent-turn engine, synthetic assistant message parser, model choice, or user-facing prompt that instructs specific Finding generation.
- Task 1 is the first real provider use. If it fails as an ordinary Harness task, record that failure under its actual layer.
- Do not retry a failed task to improve Risk Advisor scores.

If normal Harness cannot expose the necessary observations to compute a grade, record the specific **observability gap** as an evaluation limitation; do not fill the gap by building another Harness.

## Observation and assessment

Validation owns only:

1. task manifest and bounded fixture descriptions;
2. ordinary task submission and observation;
3. capture of existing sanitized/public Harness and Risk Advisor events;
4. independent Tool/result/postcondition truth assessment;
5. F1/F2 TP/FP/FN/TN/NA/unscorable;
6. cross-Session, lifecycle and Finding integrity checks;
7. bounded report with behavioral examples and improvement opportunities.

Task success/failure, Agent execution quality, Harness permissions/security observations, and Risk Advisor correctness are **separate report dimensions**.

F1 retains contiguous exact-retry semantics. F2 retains accepted supported postcondition verification. Do not expand Finding contract or grant correction authority during validation.

Log useful behavior that Risk Advisor V1 does not cover as an `OUT_OF_SCOPE_USEFUL_WARNING_CANDIDATE`, not a Product FP/FN.

## Stops and guardrails

Stop the affected task and preserve evidence if there is an actual unexpected operation against personal data, credentials, system settings, third-party/remote resources, or unrelated projects. Seek task-specific user approval before any intentionally higher-impact operation.

Stop the campaign for reproducible Product P1, Product P0, critical evidence integrity failure, credential exposure in capture, uncontrolled repeated/high-impact actions, or a Harness failure that prevents normal task submission.

Do **not** stop the entire campaign solely because the Agent does not use Tools, the task fails, the assistant has no visible text, or the model name is different from earlier assumptions.

No Product/Harness source/config changes, no full `pnpm test`, and no Phase 13.4 during campaign.

## Run and disposition

The prior `phase13-harness-native-canonical-v1` attempt stopped with zero submitted tasks; retain that historical outcome unchanged.

Use new run identity:

`phase13-real-harness-observational-v1`

A full 20-task campaign and trustworthy scoring are required before calling it ready for architecture review; **do not self-accept**.

Outcomes:

- `RISK_ADVISOR_PHASE13_3_REAL_HARNESS_CAMPAIGN_READY_FOR_ARCHITECTURE_REVIEW`
- `RISK_ADVISOR_PHASE13_3_BLOCKED_PRODUCT_REPAIR_REQUIRED`
- `RISK_ADVISOR_PHASE13_3_HARNESS_RUNTIME_BLOCKED`
- `RISK_ADVISOR_PHASE13_3_REAL_OBSERVABILITY_GAP`
- `RISK_ADVISOR_PHASE13_3_UNEXPECTED_OPERATION_STOPPED`

This amendment does not retroactively accept previous campaigns or erase earlier observations.
