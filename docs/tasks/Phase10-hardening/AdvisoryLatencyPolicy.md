# Advisory Latency Policy — Phase 10 V1

This is a bounded evidence policy, not a production timeout or concurrency change. Measurements were taken on the pinned local Harness runtime and local product seams at the Phase 10 candidate working tree. External provider latency remains unvalidated.

## Evidence classes and distributions

All distributions use nearest-rank quantiles, with `n`, warmup, P50, P95, P99, MAX, and mean in milliseconds.

| Lane | Evidence class | n / warmup | P50 | P95 | P99 | MAX | Mean | Policy use |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Native Approval baseline | REAL_PINNED_RUNTIME | 100 / 5 | 0.363 | 0.494 | 0.767 | 8.342 | 0.461 | Observation only |
| Native Approval with Risk Advisor | REAL_PINNED_RUNTIME | 100 / 5 | 0.721 | 1.177 | 1.282 | 1.706 | 0.785 | Observation only |
| Paired treatment delta | REAL_PINNED_RUNTIME | 100 / 5 | 0.350 | 0.724 | 0.950 | 1.399 | 0.324 | Not a timeout threshold |
| Shared shell analysis | REAL_PRODUCT_LOCAL | 300 / 20 | 0.010 | 0.018 | 0.029 | 0.092 | 0.012 | No runtime tuning |
| Deterministic A1 | REAL_PRODUCT_LOCAL | 300 / 20 | 0.015 | 0.022 | 0.030 | 0.059 | 0.016 | No runtime tuning |
| Phase 5 context builder | REAL_PRODUCT_LOCAL | 300 / 20 | 0.013 | 0.024 | 0.040 | 0.109 | 0.015 | No runtime tuning |
| Fast structural reviewer | STRUCTURAL_LOCAL_REVIEWER | 300 / 20 | 0.006 | 0.009 | 0.018 | 0.023 | 0.007 | Fake/local seam only |
| Deep structural reviewer | STRUCTURAL_LOCAL_REVIEWER | 300 / 20 | 0.003 | 0.007 | 0.018 | 0.033 | 0.004 | Fake/local seam only |
| Evidence/A3 overlay | REAL_PRODUCT_LOCAL | 300 / 20 | 0.003 | 0.006 | 0.011 | 0.026 | 0.004 | No runtime tuning |
| Browser presentation/parser | REAL_PRODUCT_LOCAL | 300 / 20 | 0.002 | 0.006 | 0.014 | 0.021 | 0.003 | No polling change |
| Composed local path | REAL_PRODUCT_LOCAL | 300 / 20 | 0.021 | 0.035 | 0.048 | 0.127 | 0.023 | No runtime tuning |

## Policy decisions

- The accepted Fast/Deep timeout, queue, and concurrency bounds remain unchanged. Local fake speed does not justify changing production configuration.
- `REAL_PINNED_RUNTIME` covers the native ApprovalService fixture only; it does not represent Browser UI latency or external model latency.
- `STRUCTURAL_LOCAL_REVIEWER` uses the accepted local adapter and proves wire/schema behavior only.
- `NOT_VALIDATED_EXTERNAL_PROVIDER` is the required status for real provider latency. No provider, network, registry, or Git remote call was made.
- The published UI remains advisory-only. Pre-execution Evidence is disclosed as potentially stale at execution time; no measured value is presented as an execution-time verified claim.

Evidence artifact: `evidence/r5-phase10-measurements.json`.
