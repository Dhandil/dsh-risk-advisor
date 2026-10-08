# Phase 13.3 — Real Harness Observational Campaign V2 Instructions

Status: `RISK_ADVISOR_PHASE13_3_REAL_HARNESS_V2_RESTART_AUTHORIZED`

1. Push the existing local docs-only incident report commit unchanged: `59c1e9b1fb626d9276d98d0bcf7bd047a5996185`. Verify exact report-only diff. If it is not verifiable, stop.
2. Sync current main containing this instruction, and retain existing Product, validation, Harness and current user model configuration unchanged.
3. Use ordinary `dsh web` **native CLI browser opening**, not an ad-hoc token URL or a browser search query. Never copy, log or publish token-bearing URLs. Do not read or expose credentials.
4. Use the user's normal Harness Agent/Session/ToolRuntime and normal Risk Advisor plugin loading. No custom provider, Agent loop, readiness request, or model override.
5. Fresh run: `phase13-real-harness-observational-v2`, 20 low-impact realistic tasks in five families of four, 20 normal Sessions. Freeze/hash/replay the task manifest before task 1; preserve the older incident manifest separately.
6. Let the Agent choose actions naturally. Existing Harness permissions/approvals apply; do not bypass them.
7. Collect Risk Advisor Findings, explanations and suggested action quality; independent Tool/result F1/F2 truth and task success separately. Log out-of-contract opportunities without misclassifying them as Product defects.
8. Stop an affected task on unexpected high-impact, remote, privacy/credential-facing, or unrelated-project actions. Do not force dangerous actions as fixtures.
9. No Product/validation/Harness source or config changes; no full `pnpm test`; no Phase 13.4; no task reruns. Bounded docs-only report and frozen outcome.

If native browser launch remains unreliable, report a **navigation preflight blocker** without another external token exposure. Do not build a replacement Harness or classify navigation errors as Risk Advisor Product failures.
