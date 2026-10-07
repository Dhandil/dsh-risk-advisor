# Risk Advisor Phase 13.2 Campaign-2 — Minimal Evidence Recovery Authorization

## Status

`RISK_ADVISOR_PHASE13_2_CAMPAIGN2_MINIMAL_EVIDENCE_RECOVERY_AUTHORIZED`

The prior read-only localization returned:

`CAMPAIGN_EVIDENCE_INSUFFICIENT`

Therefore neither Product Repair nor campaign-truth repair is authorized.

## Goal

Recover only the missing bounded evidence needed to classify the A5 changed-argument blocker.

Do not rerun the full 300/1500 campaign.

## Allowed execution

Replay exactly one isolated synthetic scenario corresponding to the preserved Campaign-2 first scenario, through its first five Tool executions only.

Use a fresh disposable run identity:

`phase13-campaign2-evidence-recovery-v1`

The replay must use:

- accepted Product executable `28d3d204376da0a43279b949a3ceea794212d10c`;
- accepted Repair2 validation harness `0904afe035232f6d9faab2fd539018b6e1c4263b`;
- pinned Harness `ddefc45fbc7f8e46dd73185e68295696d1297887`;
- the exact five step definitions copied from the preserved Campaign-2 manifest;
- no model/provider/Judge/subagent calls.

## Required evidence

For each of the five steps capture only bounded synthetic/public facts:

- stepId;
- operationRef;
- Tool name;
- validation-owned synthetic argument fields;
- expected F1;
- actual F1;
- public FailureChainSummary:
  - status;
  - retryOf mapped to prior stepId if present;
  - retryCount;
  - recentFailureCount;
  - sameRootCause;
  - truncated;
  - reasonCodes;
- whether the changed field is fingerprint-relevant under the accepted Product contract.

Additionally classify current-step fingerprint relation as:

- `SAME_AS_IMMEDIATE_PRIOR`
- `DIFFERENT_FROM_IMMEDIATE_PRIOR`
- `SAME_AS_EARLIER_NON_ADJACENT`
- `UNIQUE_IN_PREFIX`

Do not expose raw fingerprint hashes.

## Source of truth

The five-step operation definitions must be copied exactly from the preserved Campaign-2 manifest.

Do not invent substitute arguments.

If the preserved manifest cannot be read exactly, stop with:

`CAMPAIGN_EVIDENCE_RECOVERY_BLOCKED_SOURCE_UNAVAILABLE`

## Boundaries

Do not:

- modify Product source;
- modify validation harness;
- modify existing tests;
- commit temporary scripts;
- run complete `pnpm test`;
- rerun the 300/1500 campaign;
- call provider/model/Judge/subagent;
- start Phase 13.3.

Temporary local-only instrumentation is allowed only if it reads existing public diagnostics and is deleted before final status.

## Classification

Return exactly one:

- `CAMPAIGN_TRUTH_DEFECT`
- `PRODUCT_FINGERPRINT_RELATION_DEFECT`
- `ARCHITECTURE_SEMANTICS_DECISION_REQUIRED`
- `CAMPAIGN_EVIDENCE_RECOVERY_BLOCKED_SOURCE_UNAVAILABLE`

### Decision rules

**CAMPAIGN_TRUTH_DEFECT**
- changed field is fingerprint-irrelevant, or
- expected no-F1 contradicts accepted exact-fingerprint semantics.

**PRODUCT_FINGERPRINT_RELATION_DEFECT**
- current fingerprint is UNIQUE_IN_PREFIX or otherwise cannot validly relate to any prior matching fingerprint, but Product emits retryOf/F1.

**ARCHITECTURE_SEMANTICS_DECISION_REQUIRED**
- current fingerprint equals an older non-adjacent failed fingerprint and Product reconnects to it.

## Evidence artifact

Commit one docs-only report containing only the bounded facts above.

Do not commit raw Tool output, full ledger, or raw fingerprints.
