# Advisory Latency Policy — Phase 10 R1

This document is bounded evidence and policy guidance. It does not change
production timeout, queue, concurrency, or approval configuration. Historical
T05 policy remains unchanged. Measurements below were collected on the pinned
local Harness runtime and deterministic local product seams; external provider
latency was not exercised.

## Evidence classes

- `REAL_PINNED_RUNTIME`: the real pinned Harness ApprovalService fixture and
  its Risk Advisor side-path, with no external provider or network.
- `REAL_PRODUCT_LOCAL`: executable Risk Advisor product code with disposable
  local files, schedulers, local deterministic LLM/subagent adapters, and the
  real presentation/query seams.
- `STRUCTURAL_LOCAL_REVIEWER`: schema/authority proof through the bounded local
  reviewer adapters; it is not provider latency.
- `STRUCTURAL_PROMPT_INJECTION_HARDENING`: runtime-generated canary and
  hostile-candidate denial proof over bounded serialized surfaces.
- `NOT_VALIDATED_EXTERNAL_PROVIDER`: no production provider call was made.

All distributions use nearest-rank quantiles and report `n`, warmup, P50, P95,
P99, MAX, and mean in milliseconds. The full artifact is
`evidence/r5-phase10-measurements.json`.

## Measured basis

| Lane | Evidence class | n / warmup | P50 | P95 | P99 | MAX | Mean | Policy use |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Native Approval baseline | `REAL_PINNED_RUNTIME` | 100 / 5 | 0.380 | 0.637 | 0.738 | 1.091 | 0.408 | observation-only `T_sync` basis |
| Native Approval + Risk Advisor | `REAL_PINNED_RUNTIME` | 100 / 5 | 0.760 | 1.186 | 1.357 | 2.485 | 0.817 | observation-only treatment basis |
| Paired treatment delta | `REAL_PINNED_RUNTIME` | 100 / 5 | 0.360 | 0.819 | 1.021 | 1.962 | 0.410 | observation-only; not a timeout threshold |
| Shared shell analysis | `REAL_PRODUCT_LOCAL` | 300 / 20 | see artifact | see artifact | see artifact | see artifact | see artifact | no runtime tuning |
| Deterministic A1 | `REAL_PRODUCT_LOCAL` | 300 / 20 | see artifact | see artifact | see artifact | see artifact | see artifact | local budget evidence only |
| Phase 5 context builder | `REAL_PRODUCT_LOCAL` | 300 / 20 | see artifact | see artifact | see artifact | see artifact | see artifact | local budget evidence only |
| Fast scheduler + `executeFastJudge` + A2 | `REAL_PRODUCT_LOCAL` | 100 / 5 | 0.074 | 0.171 | 0.204 | 0.321 | 0.085 | unchanged 5000ms contract |
| Evidence collector + A3 | `REAL_PRODUCT_LOCAL` | 100 / 5 | 0.118 | 0.384 | 0.505 | 0.580 | 0.167 | local budget evidence only |
| Deep scheduler + structural adapter + A4 | `REAL_PRODUCT_LOCAL` | 100 / 5 | 0.310 | 0.654 | 0.875 | 1.607 | 0.376 | unchanged 5000ms contract |
| Browser presentation/query projection | `REAL_PRODUCT_LOCAL` | 100 / 5 | see artifact | see artifact | see artifact | see artifact | see artifact | no polling change |
| Composed A1 → A4 → Browser | `REAL_PRODUCT_LOCAL` | 100 / 5 | 0.623 | 1.130 | 1.229 | 1.270 | 0.702 | lifecycle observation; no new cap |

The artifact retains every sample and is the authoritative numeric source for
the lanes marked `see artifact`. The heavier lanes use 100 samples after five
warmup iterations; cheap lanes use 300 samples after twenty warmup iterations.

## Field-by-field policy

### `T_sync`

`T_sync` is **observation-only**. The real pinned baseline P99 is 0.738 ms and
the paired Risk Advisor treatment-delta P99 is 1.021 ms (MAX 1.962 ms). These
measure the bounded ApprovalService fixture, not a universal Host/UI promise.
No approval wait, native outcome, or product timeout is changed from this
observation.

### Deterministic assessment local budget

The deterministic A1 lane is **REAL_PRODUCT_LOCAL**, 300/20, and the exact
P50/P95/P99/MAX/mean remain in the artifact. It supports an observation-only
local budget, with headroom assessed against the unchanged synchronous fixture
path. It is not a production SLA and does not tune A1 semantics.

### Context-build local budget

The Phase 5 context-builder lane is **REAL_PRODUCT_LOCAL**, 300/20, with its
complete distribution in the artifact. It is a supported numeric measurement
candidate for local diagnostics only; no context size, timeout, or queue bound
is changed based on local fixture speed.

### Evidence local budget

The actual Evidence collector/scheduler plus A3 merge measured P99 0.505 ms and
MAX 0.580 ms over 100/5 in the disposable local workspace. This is a
**supported numeric candidate for local evidence budgeting only**, with more
than 99% headroom to the unchanged 5000 ms scheduler timeout. It does not
claim provider or arbitrary filesystem latency.

### Browser presentation/query local budget

The benchmark exercises the host-owned presentation/query projection and the
Bridge V4 parser as a **REAL_PRODUCT_LOCAL** lane. Its 100/5 distribution is
retained in the artifact. This is a **contract-only / observation-only** basis:
the 1000 ms client polling ceiling and 3000 ms NOT_FOUND grace remain frozen;
no polling interval or grace period is tuned from this local synchronous
measurement.

### Fast Judge timeout

The Fast Judge timeout remains the **unchanged runtime bound of 5000 ms**.
The 100/5 actual scheduler + `executeFastJudge` + A2 lane is local and
deterministic, so its P99 0.204 ms / MAX 0.321 ms is only headroom evidence,
not a reason to lower the timeout. Real provider latency is
`NOT_VALIDATED_EXTERNAL_PROVIDER`.

### Deep Judge timeout

The Deep Judge timeout remains the **unchanged runtime bound of 5000 ms**.
The 100/5 actual scheduler + structural adapter + A4 lane has P99 0.875 ms /
MAX 1.607 ms. This local structural adapter does not represent a real
subagent/provider and cannot justify a smaller production timeout.

### Fast Judge concurrency/pending bounds

The **unchanged contract-only bounds** are `maxConcurrent=2` and
`maxPending=8`. The benchmark uses those exact bounds and proves completion;
it does not propose a larger queue or concurrency value.

### Deep Judge concurrency/pending bounds

The **unchanged contract-only bounds** are `maxConcurrent=2` and
`maxPending=8`. The benchmark uses those exact bounds with a local structural
adapter. No production capacity claim is made.

### Total advisory lifecycle bound

The total A1 → Fast/A2 → Evidence/A3 → Deep/A4 → Browser composed lane is
**observation-only**: 100/5, P99 1.229 ms, MAX 1.270 ms on the local
deterministic fixture. It is not a new end-to-end deadline. Existing lifecycle
fencing, native-close behavior, and frozen per-stage bounds remain authoritative;
there is no production total-time tuning.

### External provider latency

This field is **`NOT_VALIDATED_EXTERNAL_PROVIDER`**. Provider calls, external
network, registry access, and Git-remote access were all zero. No numeric
provider latency, headroom, or SLA is inferred from local fake or structural
adapters.

## Privacy and authority boundary

The benchmark privacy result is classified
`STRUCTURAL_PROMPT_INJECTION_HARDENING`, not a latency result. One
runtime-generated canary is denied across 15 bounded serialized surfaces with
zero canary, raw-field, private-path, and captured-logger matches. The focused
runtime proof also covers hostile reviewer candidates: deterministic/evidence
risk floors remain authoritative, invalid authority fields fail closed,
hypotheses remain hypotheses, and alternatives remain
`MODEL_SUGGESTED / UNVERIFIED`.

The published UI is advisory-only. Pre-execution Evidence can be stale at
execution time; no measured value above is an execution-time verified claim.
