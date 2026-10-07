# Risk Advisor Phase 13.1 — Architecture Review

## Verdict

`RISK_ADVISOR_PHASE13_1_REVIEW_BLOCKED_REPAIR1_AUTHORIZED`

Phase 13.1 source/provenance review confirms the candidate is cleanly scoped and the smoke harness is internally functional, but two validation-harness defects block acceptance for use by Phase 13.2+.

## Reviewed provenance

- Phase 13.1 architecture baseline:
  `c1dc781139fe29183ffb12ea8accb46f2f329620`
- Exact validation-harness candidate:
  `cde5db4476aa86d6e5f7ed4fabed8977db682e0b`
- Report-only commit:
  `d1eb987cd686c1132663f3ee6381f73ef5d6de17`
- Pinned Harness:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`

Baseline -> candidate is one commit containing only 15 new files under `validation/phase13/`.

Candidate -> report is exactly one docs-only execution report.

No product `src/`, existing product test, package, lock, benchmark, config, or Harness Core drift is present.

## What passed review

The following architectural boundaries are correct:

- truth/metrics modules do not import Product F1/F2, retry, expected-effect, verifier, or verification-store implementations;
- subject adapter mounts the accepted Product and validation observer in the intended order;
- executionId capture uses public `riskAdvisorCorrelation.lookup()`;
- Finding capture uses public Live Correction diagnostics only;
- async F2 settlement uses public `riskAdvisorVerification.get()`;
- capture/upstream failures become unscorable rather than silent FN/TN;
- truth ledger is hash chained and validates sequence/hash/truncation;
- workspace path/symlink containment is fail-closed;
- product source remains unchanged;
- smoke evidence is reproducible and provider-free.

## Defect 1 — smoke limits were encoded as global structural limits

The Freeze bounded only the **Phase 13.1 smoke run** to:

- <=30 scenarios;
- <=100 Tool executions.

The implementation instead defines these as global schema/ledger limits:

```
PHASE13_MAX_SCENARIOS = 30
PHASE13_MAX_TOOL_EXECUTIONS = 100
```

Manifest parsing rejects larger plans.

Ledger `RUN_END` validation rejects scenario/tool counts above 30/100.

Ledger record count is capped at 2048.

This makes the accepted Phase 13 Preflight targets impossible:

- Phase 13.2: >=300 scenarios / >=1500 Tool executions;
- Phase 13.4: >=2000 Tool executions.

The 13.1 harness therefore cannot serve its intended next phase without architectural repair.

## Defect 2 — legitimate Finding removal is misclassified as stale/resurrection

Current runner logic emits:

`STALE_OR_RESURRECTED_FINDING`

whenever any prior Session Finding ID is absent from the next Session snapshot.

That is not a valid invariant.

Accepted Product behavior deliberately allows Finding removal through:

- TTL expiry;
- per-Session/global capacity eviction;
- explicit lifecycle cleanup.

Phase 13 Preflight also requires future TTL/capacity pressure scenarios.

Therefore a normal accepted Finding disappearance can currently become a false P1 campaign blocker.

A disappearance and a resurrection are not the same event.

## Review conclusion

The smoke result itself does not reveal a Product defect.

The defects are in the **validation instrument** and must be repaired before trusting high-volume campaign evidence.

Do not run Phase 13.2 until Repair1 is architecture-reviewed and accepted.
