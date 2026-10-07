# Risk Advisor Phase 13.2 — Fresh Canonical Campaign-3 Authorization

## Status

`RISK_ADVISOR_PHASE13_2_CAMPAIGN3_AUTHORIZED`

This document authorizes a fresh Phase 13.2 canonical campaign after final acceptance of Product Repair1.

## Baseline

- Current main:
  `40d4dd1d4766f2b14befdd1ceb23f673c430d040`
- Accepted Product executable:
  `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`
- Accepted validation Repair2:
  `0904afe035232f6d9faab2fd539018b6e1c4263b`
- Pinned Harness:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`

## Campaign identity

Use a new campaignRunId:

`phase13-lane-a-canonical-v3`

Frozen seed remains:

`phase13-lane-a-canonical-v1`

Generator remains:

`phase13-generator-v1`

Campaign-1 and Campaign-2 remain historical evidence only.

Do not resume, append, or reuse either prior ledger/run identity.

## Exact scale

Run exactly:

- 300 scenarios;
- target exactly 1500 Tool executions;
- maxScenarios = 300;
- maxToolExecutions = 1500.

Stop immediately at the first blocker.

## Pre-execution gates

Before the first Tool execution:

1. verify exact current main;
2. verify accepted Product executable ancestry;
3. verify accepted validation Repair2;
4. verify pinned Harness;
5. regenerate the canonical manifest;
6. prove replay byte identity;
7. prevalidate all settlement capabilities;
8. record canonical manifest SHA-256;
9. confirm provider/model/LLM/Judge/Deep Judge/subagent counters start at zero.

## Cost policy

Frozen:

- provider calls = 0;
- model calls = 0;
- LLM calls = 0;
- Judge calls = 0;
- Deep Judge calls = 0;
- subagent calls = 0.

## Product truth

Use the frozen F1 semantics including Product Repair1:

- exact retry path is contiguous;
- only the immediately preceding same-Session Tool execution can be retry predecessor;
- no non-adjacent historical same-fingerprint reconnection.

Do not modify campaign truth in response to Product output.

## Stop conditions

Stop immediately on:

- Product P0;
- reproducible Product P1;
- duplicate Finding;
- wrong-Session Finding;
- resurrected Finding;
- Product-attributable lifecycle violation;
- ledger integrity failure;
- capture integrity failure;
- workspace containment failure;
- Product/Harness drift.

For supported verifier missing after prevalidated settlement capability, classify as upstream and stop under the accepted Repair2 taxonomy.

For validation-instrument defect, stop as validation blocker.

## Boundaries

Do not:

- modify Product source;
- modify Product tests;
- modify validation harness/truth;
- modify Harness Core;
- repair anything during the campaign;
- run complete `pnpm test`;
- call provider/model/Judge/subagent;
- start Phase 13.3.

## Required report

If stopped or completed, commit one docs-only execution report with:

- campaignRunId;
- seed/generator;
- Product/validation/Harness identities;
- manifest SHA;
- final ledger head hash;
- scenario / Tool execution counts;
- F1 confusion matrix;
- F2 confusion matrix;
- duplicate/wrong-session/resurrection/lifetime counters;
- capture/upstream/environment counters;
- opportunity counts;
- zero-cost counters;
- blocker/reproducer summary if stopped.

## Completion tokens

If clean:

`RISK_ADVISOR_PHASE13_2_CAMPAIGN3_READY_FOR_ARCHITECTURE_REVIEW`

If Product blocker:

`RISK_ADVISOR_PHASE13_2_CAMPAIGN3_BLOCKED_PRODUCT_REPAIR_REQUIRED`

If upstream blocker:

`RISK_ADVISOR_PHASE13_2_CAMPAIGN3_BLOCKED_UPSTREAM_REVIEW_REQUIRED`

If validation blocker:

`RISK_ADVISOR_PHASE13_2_CAMPAIGN3_BLOCKED_VALIDATION_HARNESS_REPAIR_REQUIRED`

If environment blocker:

`RISK_ADVISOR_PHASE13_2_CAMPAIGN3_ENVIRONMENT_BLOCKED`

Do not self-declare Phase 13.2 accepted.
