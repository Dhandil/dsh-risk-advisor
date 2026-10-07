# Risk Advisor Phase 13.2 Product Repair1 — Architecture Review

## Verdict

`RISK_ADVISOR_PHASE13_2_PRODUCT_REPAIR1_ARCHITECTURE_APPROVED_MAIN_INTEGRATION_AUTHORIZED`

Product Repair1 source and provenance review passed.

## Reviewed provenance

- Architecture/implementation baseline:
  `08d3a112bdc64de3ce40f40b2763c5284ef0200c`
- Exact executable candidate:
  `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`
- Execution report:
  `6defd2bb639a9656c6e12f2facf8b1bb4bc4e426`
- Branch:
  `codex/phase13-2-product-repair1`
- Pinned Harness:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`

Baseline -> candidate changes exactly:

- `src/host/retry-escalation.ts`
- `tests/p3-retry-escalation.unit.spec.ts`
- `tests/p12-1-live-correction.spec.ts`

Candidate -> report is exactly one docs-only execution report.

No Phase 13 validation harness/truth, Harness Core, package/lock/config, benchmark, or unrelated Product source drift is present.

## Architecture findings

### 1. Historical matching-fingerprint search is removed from retry-edge authority

The prior relation model searched Session history backward for the nearest record sharing the current fingerprint.

The repaired model stores the Session's latest Tool execution as an explicit one-record predecessor barrier.

Each current record captures:

- immediate predecessor ordinal;
- whether that predecessor was already expired at capture;
- whether the immediate predecessor fingerprint exactly matches the current fingerprint.

`directPrior()` can only resolve that exact immediate predecessor ordinal.

It cannot substitute an older historical matching fingerprint.

This implements the frozen contiguous-path semantics.

### 2. Different fingerprint breaks the retry path

If the immediate predecessor fingerprint differs:

- `immediatePriorMatchesFingerprint = false`;
- `directPrior()` returns no relation;
- `retryOf` remains absent;
- the current execution begins a new path;
- `chainFor()` cannot jump backward to an older same-fingerprint record.

The focused P3 proofs cover changed:

- read path;
- write content;
- bash command.

The A/B/A proof confirms the third A does not reconnect to the first A.

### 3. Unsupported/unreadable/missing-identity attempts remain barriers

The repaired analyzer preserves same-Session Tool attempts as barriers even when a full relation record cannot safely be retained.

Cases include:

- unsupported fingerprint;
- unreadable Tool metadata;
- missing execution identity;
- capacity rejection.

For unreadable or missing-identity attempts, `latestExecution` still advances with a barrier ordinal.

For capacity rejection, `latestExecution` still advances even though the full record is not stored.

Therefore a later operation cannot bypass these attempts and reconnect to older history.

### 4. Overlapping/pending calls remain fail-closed

Immediate predecessor settlement must have been causally available before current capture.

The existing ordinal/settlement guard remains:

`settledBeforeCaptureOrdinal <= current.ordinal`

So an overlapping predecessor that settles only after current capture cannot retroactively create a retry edge.

No older record is substituted.

### 5. Adjacent exact retry remains intact

For an immediately preceding same-fingerprint settled failure:

- existing failure eligibility remains;
- captured prior remains immutable;
- same-root-cause evaluation remains unchanged;
- contiguous chains still accumulate correctly.

The focused tests prove:

- adjacent failure -> failure yields retryOf;
- three contiguous exact failures keep retryCount/recentFailureCount semantics;
- Live Correction still emits exactly one F1 for an adjacent exact qualifying retry.

### 6. Live Correction contract remains unchanged

`src/host/live-correction.ts` was not modified.

F1 still consumes only the public immutable FailureChainSummary and retains the frozen predicate:

- READY;
- not truncated;
- retryOf present;
- retryCount >= 1;
- recentFailureCount >= 2;
- sameRootCause === true.

The Product repair therefore fixes relation construction without expanding Finding authority.

### 7. F2 and unrelated Product authority remain unchanged

No verifier/F2 code changed.

No model, Pattern/Guidance, Approval, Browser, execution-mutation, or Harness authority was introduced.

### 8. Diagnostic reason-code naming

Existing internal reason codes such as `NEAREST_MATCH_UNAVAILABLE` / `NEAREST_MATCH_BLOCKED` remain named from the prior implementation.

Their semantics now apply only to the immediate matching predecessor path.

This is cosmetic/diagnostic naming debt, not a correctness blocker, and should not expand this repair.

## Evidence reviewed

Reported and source-consistent:

- P3: **2 files / 21 tests PASS**;
- P12.1: **1 file / 34 tests PASS**;
- relevant P7 failure-chain: **3 tests PASS**;
- relevant P10 retry-semantic: **2 tests PASS**;
- P10 package/boundary: **4 tests PASS**;
- typecheck: PASS;
- build: PASS;
- `git diff --check`: PASS;
- Phase 13.1 clean-baseline regression: **45 tests PASS**;
- bounded H18 smoke: 13 scenarios / 19 Tool executions;
- smoke F1: 3 TP / 16 TN / 0 FP / 0 FN;
- smoke F2: 2 TP / 17 TN / 0 FP / 0 FN;
- provider/model/LLM/Judge/subagent calls: 0;
- complete `pnpm test`: not run;
- Phase 13.2 300/1500 campaign: not rerun.

The implementation-worktree H18 scope-guard failure described in the report is expected because that guard asserts no Product/config diff relative to `origin/main`. The clean-baseline validation rerun passed all 45 tests and the accepted validation harness/truth was not modified.

## Campaign-2 defect status

Campaign-2 correctly discovered:

`PRODUCT_NON_ADJACENT_RETRY_RECONNECTION_DEFECT`

The defect is repaired by the exact candidate above.

Campaign-2 remains stopped and is not resumed.

A new canonical Phase 13.2 campaign is allowed only after this Product repair reaches final acceptance.

## Main integration authorization

Codex may advance `main` to the exact reviewed lineage:

```
08d3a112bdc64de3ce40f40b2763c5284ef0200c
  -> b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df
  -> 6defd2bb639a9656c6e12f2facf8b1bb4bc4e426
  -> <this docs-only Architecture Review commit>
```

Rules:

1. exact fast-forward-equivalent lineage only;
2. no squash;
3. no rebase;
4. no file modification;
5. no reimplementation;
6. do not rerun tests merely for integration;
7. verify `HEAD == origin/main == git ls-remote`;
8. do not rerun Phase 13.2 yet;
9. do not create the final Acceptance Report.

Return after exact main integration for final Product Repair1 Acceptance Review.
