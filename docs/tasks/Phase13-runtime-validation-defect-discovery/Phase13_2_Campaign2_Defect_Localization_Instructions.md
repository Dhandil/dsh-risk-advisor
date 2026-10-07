# Risk Advisor Phase 13.2 Campaign-2 — Read-only Defect Localization Instructions

Current remote main:
`a9283b44072bf16ae4b7e7badfc8493cadd0af7b`

Campaign:
`phase13-lane-a-canonical-v2`

Use the preserved local Campaign-2 manifest, ledger, minimal reproducer, and diagnostics.

Do not rerun anything.

Create a bounded docs-only localization report for the first scenario's 5 Tool steps.

For each step include:

- stepId / operationRef / Tool name;
- synthetic validation arguments;
- expected F1;
- actual F1;
- FailureChainSummary status / retryOf mapped to stepId / retryCount / recentFailureCount / sameRootCause / truncated / reasonCodes;
- fingerprint relation category:
  - SAME_AS_IMMEDIATE_PRIOR
  - DIFFERENT_FROM_IMMEDIATE_PRIOR
  - SAME_AS_EARLIER_NON_ADJACENT
  - UNIQUE_IN_PREFIX
- whether the changed field is fingerprint-relevant.

Do not expose raw fingerprint hashes.

Return exactly one classification:

- `CAMPAIGN_TRUTH_DEFECT`
- `PRODUCT_FINGERPRINT_RELATION_DEFECT`
- `ARCHITECTURE_SEMANTICS_DECISION_REQUIRED`
- `CAMPAIGN_EVIDENCE_INSUFFICIENT`

No source/test changes.
No test rerun.
No Phase 13.2 rerun.
No provider/model calls.

Push the docs-only report to a branch and return its commit SHA.
