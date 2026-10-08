# Phase 13.3 — Real Harness Observational Campaign Instructions

Execute the current authoritative architecture:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Real_Harness_Observational_Architecture_Amendment.md`

The previous mandatory native-isolation feasibility gate is superseded. Do **not** recreate Harness.

First preserve the prior local docs-only blocker report `11c9023e7abc0cab333247911e646bfcbf770458` unchanged on its existing branch and verify its provenance before integrating its history. Do not rewrite it.

## Execution

- Run real Harness through its existing normal Web/CLI/local API entry, with Risk Advisor loaded normally.
- Inherit the user's configured provider/model/reasoning and regular tool approvals; do not override.
- No readiness probe, custom provider client, Agent-turn loop, fake SessionStore/ToolRuntime or stream parser.
- Campaign: `phase13-real-harness-observational-v1`.
- Twenty bounded real tasks / five families × four, using normal Harness Sessions.
- Work in a designated low-impact test directory on the real host, plus explicitly approved read-only real-project tasks if useful.
- This is **not** an OS sandbox. Don't claim prompts limit Tool permissions.
- No intentionally destructive, credential-facing, privileged, remote or production-service operations.
- Agent naturally chooses Tools. No forced F1/F2 triggers or task reruns.
- Record normal Tool actions, Agent outcomes, Risk Advisor Findings and independent F1/F2 truth separately.
- If native public evidence is insufficient for a subset, mark it unscorable and give the concrete missing surface. Do not emulate Harness.
- Stop on unexpected high-impact/out-of-scope actions, secrets in capture, critical integrity/Product defect, or genuine Harness runtime blockage.

No Product/validation/Harness implementation changes, full `pnpm test`, or Phase 13.4.

Commit a bounded docs-only execution report with the frozen outcome token. Do not self-accept.
