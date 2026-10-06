# Risk Advisor Phase 12.1 — Implementation Instructions

## Authorized outcome

Implement exactly:

`docs/tasks/Online-correction-v1/Phase12_1_Live_Correction_Finding_Core_Freeze.md`

Architecture baseline: `d33c2ea69c01aa6a396a37dd28fc943145a1b5f2`

Pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`

These instructions are prospective. This documentation task does not itself start implementation.

## 1. Preflight

1. Fetch `origin/main`; verify it contains the Online Correction Preflight and Phase 12.1 Freeze.
2. Verify all changes since `7faa93d5c9c441f95eab4ca0adc3a1627c448942` are docs-only.
3. Verify pinned Harness Core exactly matches the SHA above.
4. Require clean tracked state. Preserve all existing untracked files; do not reset, clean, stash, or delete them.
5. Start implementation from then-current `origin/main`; do not rewrite accepted Phase 11 history.

## 2. Implement only the Phase 12.1 Finding core

Add a process-local Host runtime for the two frozen Findings only:

- `REPEATED_FAILURE_WITHOUT_PROGRESS`
- `POSTCONDITION_NOT_SATISFIED`

Use only:
- post-result `FailureChainSummary`;
- stored/sanitized `VerificationRecordV1`.

Implement deterministic identity, exact predicates, fixed diagnosis/advisory codes, fixed renderer text, TTL/bounds, per-session cleanup, idempotence, verifier-conflict suppression, and immutable Host diagnostics exactly as frozen.

Do not add durable storage.

## 3. Preserve the result/verifier ordering

The implementation must guarantee that execution/session association exists before a synchronous direct verifier callback can arrive.

Required order:

```
failureChain.observeResult(...)
correction.observeSettledResult(...)
verifier.observeResult(...)
experience.observeResult(...)
foundation.retire(...)
```

The verifier's stored/sanitized `onRecord` result must also be delivered to Correction without changing existing Failure Chain or Outcome observation semantics.

Correction exceptions must be contained.

## 4. Do not broaden F1

Do not implement semantic retry-family inference.

F1 uses only the existing exact-fingerprint retry relationship summarized by `FailureChainSummary`.

Changed commands/fingerprints must remain non-matches even if a human would consider them related.

Do not modify `RetryEscalationAnalyzer` fingerprint semantics to make more cases match.

## 5. Do not broaden F2

F2 accepts only the exact supported high/medium `MISMATCHED + semanticSuccess=false + POSTCONDITION_MISMATCH` records and the source/adapter pairs frozen in Phase 12.1.

Do not infer postcondition failure from process exit code, Tool errors, model text, Outcome history, Pattern, or Guidance.

## 6. Explicit exclusions

Do not:
- add Browser/client/UI work;
- add bridge endpoints;
- modify Approval/Risk Assessment;
- inject Agent context;
- add LLM/embedding/Judge calls;
- read Pattern/Guidance;
- modify Tool input/output;
- trigger retry/replan/cancel/block/new Run;
- add migrations/storage domain;
- modify Harness Core;
- change Phase 11 schemas or semantics.

Phase 12.2 owns future user-facing advisory presentation.

## 7. Required tests

Implement C1–C20 from the Freeze.

Pay particular attention to:
- direct synchronous write/edit mismatch ordering;
- async known-adapter mismatch after Tool result;
- changed command/fingerprint non-match;
- success breaking exact-fingerprint retry chains;
- verifier conflict suppressing an already emitted F2;
- duplicate evidence idempotence;
- TTL/per-session/global/association eviction;
- session disposal and generation disposal;
- retained-state privacy sentinel inspection;
- zero Pattern/Guidance/LLM/Browser authority.

Use isolated fixtures only.

## 8. Verification gates

Run in order:

1. focused Phase 12.1 C1–C20;
2. existing retry/failure-chain regression;
3. existing postcondition verifier regression;
4. Phase 11.1 E1–E14;
5. Phase 11.2 O1–O15;
6. Phase 11.3 P1–P17;
7. Phase 11.4 G1–G20;
8. affected V1/package/boundary regressions;
9. source/focused-test typecheck;
10. production build/declarations;
11. package/export/dependency/static boundary gates;
12. privacy/lifecycle isolated proofs;
13. only after all prior gates pass, run exactly one fresh complete `pnpm test` on the final executable candidate.

If Full fails, stop and report. Do not fix and silently rerun.

After a passing Full, executable/test/package/config/benchmark semantic drift is forbidden. Only a Phase 12.1 execution report may be added.

## 9. Publication boundary

If implementation is explicitly authorized:
- fast-forward push exact tested candidate only;
- verify `HEAD == origin/main == git ls-remote`;
- then add a report-only `Phase12_1_Execution_Report.md`;
- push report-only commit;
- do not declare Phase 12.1 accepted;
- do not start Phase 12.2.

Final review remains separate.

## 10. Expected final token

`RISK_ADVISOR_PHASE12_1_PUBLISHED_READY_FOR_REVIEW`
