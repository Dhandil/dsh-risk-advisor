# Risk Advisor Phase 13.3 — Read-Only Native Isolation Feasibility Preflight

## Status

`RISK_ADVISOR_PHASE13_3_NATIVE_ISOLATION_PREFLIGHT_AUTHORIZED_READ_ONLY`

## Prerequisite provenance

1. Push the exact existing local docs-only execution report commit `11c9023e7abc0cab333247911e646bfcbf770458` to its existing `codex/phase13-3-harness-native-campaign` branch, unchanged.
2. Independently verify this branch is based on `53de5157c9d1ce37f1d5054e7927ee0cb1ff8770` and that its diff is restricted to the execution report.
3. If provenance cannot be verified, stop.

## Read-only scope

Inspect the pinned Harness `ddefc45fbc7f8e46dd73185e68295696d1297887` and the local host without modifying either.

Determine:

- exact supported Harness product task/session submission entry: normal CLI, local API, or Web-to-local API path; cite source paths/entry methods;
- how `DSH_HOME`, Session state, workspace root, ToolRuntime subprocesses, secrets, and provider network calls are bound to OS process/UID;
- which supported Harness/tool sandbox or permissions mechanisms exist at this pinned SHA; do not assume newer Harness capabilities;
- which OS-level isolation primitives are already available (separate user, disposable VM/container, mount namespace/sandbox, egress policy);
- whether any existing approach can preserve normal Harness behavior while confining Tool child processes.

Collect only capability and source-path evidence. Never read or print secret values, user's private files, environment variable values, or credential contents.

## Deliverable: feasibility matrix

For each candidate design, record:

- supported native Harness entry;
- normal Risk Advisor plugin loading path;
- normal current Harness provider config resolution (without printing secrets or rewriting config);
- host filesystem containment, including mounts/sockets/symlinks;
- provider credential non-accessibility from Tool process;
- Tool network egress deny proof mechanism;
- provider egress preservation mechanism;
- Sessions/state isolation;
- operational cost and cleanup;
- proof gaps and feasibility verdict: `FEASIBLE_WITH_PROOF_PLAN`, `INSUFFICIENT`, or `NOT_AVAILABLE`.

Treat a dedicated ephemeral credential, external proxy, new Docker/VM deployment, separate OS user, or Tool-process sandbox as **proposals only**, not permissions to provision them.

## Forbidden during preflight

No:

- Agent Session creation;
- provider or readiness request;
- Tool invocation;
- user-facing Harness task submission;
- model selection/override;
- tracked Product/validation/Harness change;
- dependency install/update;
- Docker/VM/user/firewall mutation;
- credential creation/copy/use;
- network egress experiment;
- full test or Phase 13.4;
- attempt to 'try just one' canonical task.

## Outcome

Commit a bounded docs-only feasibility report to the execution branch and return one of:

- `RISK_ADVISOR_PHASE13_3_NATIVE_ISOLATION_FEASIBILITY_READY_FOR_ARCHITECTURE_REVIEW`
- `RISK_ADVISOR_PHASE13_3_NATIVE_ISOLATION_FEASIBILITY_NOT_PROVEN`

Neither outcome authorizes the real campaign.

No canonical run identity is consumed by this read-only preflight.
