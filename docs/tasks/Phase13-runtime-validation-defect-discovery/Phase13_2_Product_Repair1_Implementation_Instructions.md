# Risk Advisor Phase 13.2 Product Repair1 — Implementation Instructions

Current main:
`2ab03246df17ad42be54d4c282d21d23f8f059f4`

Implement exactly:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_2_Product_Repair1_Contiguous_Exact_Retry_Path_Freeze.md`

Core decision:

- F1 retry path is contiguous;
- only the immediately preceding Tool execution in the same Session can be the retry predecessor;
- never search backward across a different/unsupported intervening operation for an older matching fingerprint.

Primary code:
`src/host/retry-escalation.ts`

Add/adjust focused Product tests for P1-P18.

Do not modify Phase 13 validation truth/harness.
Do not modify Harness Core.
Do not rerun the 300/1500 Phase 13.2 campaign.
Do not call provider/model/Judge/subagent.

Run only focused/relevant Product + validation regressions and static gates described by the Freeze.

Publish implementation candidate on a branch with a separate docs-only execution report.

Return:

`RISK_ADVISOR_PHASE13_2_PRODUCT_REPAIR1_READY_FOR_ARCHITECTURE_REVIEW`
