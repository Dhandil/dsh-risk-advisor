# Risk Advisor Phase 13.3 — Real Agent Campaign v3 Execution Report

## Status

`RISK_ADVISOR_PHASE13_3_VALIDATION_REPAIR_REQUIRED`

The one permitted v3 campaign launch stopped before task 1 on a validation-runner assertion. No task or campaign retry was made.

## Baseline and immutability

- Starting `main`: `d1fd3a7ce715988a5815d98bac162bea58952e96`.
- Accepted Product: `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`; Product source, tests, package, config, and benchmark drift: **0**.
- Accepted validation Repair2: `0904afe035232f6d9faab2fd539018b6e1c4263b`; `validation/phase13/` drift: **0**.
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`; tracked tree clean.
- The existing v2 docs-only report commit `209b76558d0140e90cca2a3b0a8317990f9057d6` was pushed unchanged to `codex/phase13-3-real-agent-campaign`.

## Manifest and readiness

The fresh manifest for `phase13-real-agent-canonical-v3` uses seed `phase13-real-agent-v1`, provider `deepseek-official`, model `deepseek-v4-flash`, and reasoning `low`. It has **20 tasks / 20 distinct Session identities**, four tasks in each of R1–R5, per-task caps of 6 provider turns / 12 Tool executions, and hard caps of 120 / 240. Workspace-containment probes passed.

The first generated manifest replayed byte-identically, but offline inspection found its R5 tasks lacked final postconditions. The validation-owned temporary generator was corrected and the manifest regenerated and byte-replayed before the campaign attempt. Final manifest SHA-256: `1d5916dc358e3f54f4327063b1351aa71778727c94cd3ce7c654c3a37f2e033e`. Readiness had already passed against the same pinned provider profile; the final manifest regeneration occurred afterward, so this ordering deviation is recorded as validation evidence and the run is not eligible for acceptance.

Readiness used the pinned Harness public Agent response path (`create` → `followup` → `whenIdle` → `session.deriveMessages`), completed one provider request, executed zero Tools, and disposed the isolated runtime. Public usage telemetry was available. No raw response or credential material was recorded here.

## Campaign blocker and execution boundary

The campaign runner launched once after readiness. Before creating the ledger or starting a task, its assertion compared the workspace factory’s canonicalized temporary root with the non-canonical temporary-root spelling and failed with `ERR_ASSERTION`. The empty v3 run root was created; no Session was created.

- Canonical tasks / Sessions started: **0 / 0**.
- Campaign provider requests / turns: **0 / 0**; readiness request: **1**.
- Tool attempts / executions / results: **0 / 0 / 0**.
- Ledger: **not created**; F1/F2 scoring: **not run**.
- Product, validation, Harness source, package, lockfile, and config changes: **0**.
- Complete `pnpm test`: **not run**; Phase 13.2 rerun: **not run**; Phase 13.4: **not started**.

The path assertion and the manifest ordering deviation require validation-runner repair and a separately authorized fresh campaign. This report does not claim a provider failure, completed campaign, or Phase 13.3 acceptance. The manifest and bounded runtime evidence remain local and untracked.
