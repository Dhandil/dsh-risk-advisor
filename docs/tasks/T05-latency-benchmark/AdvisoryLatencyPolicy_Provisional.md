# T05 Provisional Advisory Latency Policy

Status: provisional evidence only; not a production configuration and not an acceptance decision.

The benchmark measured currently executable Risk Advisor hooks on the frozen Harness runtime. It did not implement or measure a production Assessment, Context Builder, Judge, scheduler, or publisher. Therefore every future-product budget below remains `UNDETERMINED`.

Evidence: [r5-measurements.json](evidence/r5-measurements.json), run mode `FULL`, 300 baseline and 300 treatment samples with 20 warmups, benchmark Tested SHA `52e5a3580c62da29959de51debc59d818268ee88`, Harness pin `ddefc45fbc7f8e46dd73185e68295696d1297887`.

## Policy fields

| Field | Candidate | Measured basis | Confidence / evidence | Executable product exists? | Remeasure task |
|---|---|---|---|---|---|
| `T_sync` | `UNDETERMINED` | Real paired ApprovalService E2E treatment-minus-baseline: n=300, P50 `0.0420 ms`, P95 `0.3999 ms`, P99 `0.9462 ms`, MAX `1.4335 ms`; asked-to-answerer delta P99 `0.5547 ms`. | `PARTIAL_NOT_ISOLATABLE`, `MEASURED_DELTA_ESTIMATE`; includes matched service/tool overhead and has no direct hook-only timer. | No direct `T_sync` product timer. | Re-measure after a production assessment scheduler has a direct hook timing boundary.
| `deterministicAssessmentTimeoutMs` | `UNDETERMINED` | No production deterministic assessment path. Controlled simulation used `timeoutMs=3` only as a bounded test input. | `SIMULATION_ONLY`; simulated numbers are not product performance. | No. | R5 follow-up after deterministic assessment implementation.
| `judgeTimeoutMs` | `UNDETERMINED` | No production Judge. Controlled simulation used `judgeMs=8` and `timeoutMs=3`, with 120/120 timed-out jobs in the full simulation batch. | `SIMULATION_ONLY`; no provider or model was called. | No. | R5 follow-up after Judge/scheduler implementation.
| `maxConcurrentJudges` | `UNDETERMINED` | Controlled queue configured for concurrency `2`, max pending `4`, observed max active `2`, max queue depth `4`. | `SIMULATION_ONLY`; not a provider-throughput claim. | No. | Re-measure with bounded production Judge resources.
| `contextBuildTimeoutMs` | `UNDETERMINED` | No production Context Builder. Mock context measurements are retained only under `simulated_*`. | `NOT_MEASURABLE_NOT_IMPLEMENTED` for product; simulation only for mock. | No. | R5 follow-up after Context Builder implementation.
| `publishTimeoutMs` | `UNDETERMINED` | No production assessment publisher. Mock publish measurements are retained only under `simulatedPublishMs`. | `NOT_MEASURABLE_NOT_IMPLEMENTED` for product; simulation only for mock. | No. | R5 follow-up after publisher implementation.

No timeout, concurrency, scheduler, provider, browser, or approval-policy configuration was changed by T05. The simulation values are guidance for designing a future bounded side path, not adopted defaults.

## Interpretation boundary

- Real native approval path: baseline and `apply(ctx)` treatment both completed with `allowed-once` and exactly one deterministic native answerer per iteration.
- Implemented component paths: short and bounded-argument Session projections remained `HEALTHY`; the 9,602-event near-cap Session was `DEGRADED` and `truncated=true`, as required by the existing bounded component behavior.
- Controlled simulation: saturation, timeout, and late completion were demonstrated with bounded local mocks. `rejectedByBackpressure=120`, `timeoutCount=120`, `lateCompletionCount=120`, `maxActive=2`, `maxQueueDepth=4` are simulation observations only.
- Time To First Assessment, Time To Final Assessment, actual Context Builder, deterministic assessment, actual Judge queue/execution, and publish remain `NOT_MEASURABLE_NOT_IMPLEMENTED`.

This document must be replaced by a new measured policy after those product paths exist; it must not be treated as an acceptance or release approval.
