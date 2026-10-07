# Risk Advisor Phase 13.2 Product Repair1 — Final Acceptance Report

## Final status

`RISK_ADVISOR_PHASE13_2_PRODUCT_REPAIR1_FINAL_ACCEPTED_BASELINE_ADVANCED`

Phase 13.2 Product Repair1 is accepted.

## Accepted Product executable

- Exact accepted Product candidate:
  `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`
- Execution report:
  `6defd2bb639a9656c6e12f2facf8b1bb4bc4e426`
- Architecture Review / exact integrated main:
  `0eeb6f6197977b3c8a6ce46718f6b99c7e9c5f4a`
- Pinned Harness:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Accepted Phase 13 validation Repair2 remains:
  `0904afe035232f6d9faab2fd539018b6e1c4263b`

## Accepted defect

Campaign-2 correctly discovered:

`PRODUCT_NON_ADJACENT_RETRY_RECONNECTION_DEFECT`

The prior Product could reconnect a current execution to an older historical same-fingerprint failure across an intervening different/unsupported Tool attempt.

That behavior violated the frozen V1 semantics:

`STOP_EXACT_RETRY_PATH_V1`

where an exact retry path is contiguous.

## Accepted repair

### Immediate predecessor authority

Retry relation construction now uses only the immediately preceding Tool execution in the same Session as predecessor authority.

Historical matching-fingerprint search is no longer relation authority.

### Different fingerprint is a barrier

For:

```
A fail
B
A fail
```

the third A starts a new V1 path.

It cannot reconnect to the first A.

### Unsupported/unreadable/missing identity/capacity attempts remain barriers

Even when a full relation record cannot safely be retained, a same-Session Tool attempt still advances the one-record predecessor barrier.

Therefore later executions cannot bypass it and reconnect to older history.

### Overlap remains fail closed

A same-fingerprint predecessor must already have causally settled eligible failure evidence before current capture.

Late settlement cannot retroactively create an edge.

### Contiguous exact chains remain valid

For:

```
A fail
A fail
A fail
```

the existing contiguous retry chain, retry counts, recent-failure counts, same-root-cause semantics, and F1 behavior remain.

### Live Correction and F2 remain unchanged

`src/host/live-correction.ts` was not modified.

F1 continues to consume the immutable FailureChainSummary under the same predicate.

No F2 implementation or semantics changed.

## Verification evidence

Source/provenance review accepted the reported evidence:

- P3: **2 files / 21 tests PASS**;
- P12.1: **1 file / 34 tests PASS**;
- relevant P7 failure-chain: **3 tests PASS**;
- relevant P10 retry-semantic: **2 tests PASS**;
- P10 package/boundary: **4 tests PASS**;
- typecheck: PASS;
- build: PASS;
- `git diff --check`: PASS;
- Phase 13.1 clean-baseline regression: **45 tests PASS**;
- bounded H18 smoke: **13 scenarios / 19 Tool executions**;
- H18 F1: **3 TP / 16 TN / 0 FP / 0 FN**;
- H18 F2: **2 TP / 17 TN / 0 FP / 0 FN**;
- provider/model/LLM/Judge/subagent calls: **0**;
- complete `pnpm test`: not run, as instructed;
- Phase 13.2 300/1500 campaign: not rerun during repair.

## Provenance

Exact accepted lineage:

```
08d3a112bdc64de3ce40f40b2763c5284ef0200c
  -> b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df
  -> 6defd2bb639a9656c6e12f2facf8b1bb4bc4e426
  -> 0eeb6f6197977b3c8a6ce46718f6b99c7e9c5f4a
```

Baseline -> candidate changed exactly:

- `src/host/retry-escalation.ts`;
- `tests/p3-retry-escalation.unit.spec.ts`;
- `tests/p12-1-live-correction.spec.ts`.

Candidate -> integrated main added only:

- Product Repair1 Execution Report;
- Product Repair1 Architecture Review.

There is no post-candidate executable or test drift.

## Campaign status

The stopped Campaign-2 remains historical defect-discovery evidence.

Do not resume or append to its run.

After this acceptance, Phase 13.2 must start a **fresh canonical campaign with a new campaignRunId** using:

- accepted Product `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`;
- accepted validation Repair2 `0904afe035232f6d9faab2fd539018b6e1c4263b`;
- pinned Harness `ddefc45fbc7f8e46dd73185e68295696d1297887`;
- the frozen zero-provider/model campaign policy.

## Closure boundary

Product Repair1 is closed and accepted.

This acceptance does not itself execute the fresh 300/1500 campaign.

No new Finding family, execution authority, Pattern/Guidance authority, model dependency, or F2 behavior is introduced.
