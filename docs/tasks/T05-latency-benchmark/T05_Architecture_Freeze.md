# T05 — R5 Assessment Latency Benchmark | Architecture Freeze

**Status:** FROZEN FOR CODEX IMPLEMENTATION. ChatGPT Web alone issues final `ACCEPTED / REPAIR / STOP` and may accept only a clearly bounded result.  
**Date:** 2026-09-29  
**Task directory:** `docs/tasks/T05-latency-benchmark/`  
**Plugin starting checkpoint:** `Dhandil/dsh-risk-advisor`, `main @ 2abafc70a4177470263adaf989d006a08d43f918` (T04 bounded implementation accepted; full F-006/F-007/F-013 cross-plane witness remains open).  
**Harness frozen reference:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, **strictly read-only**. New upstream `4878cdabd87d4041bdaff61d04c966883b9fd07a` is NOT_VALIDATED and not this task's benchmark target.

## 1. Objective and actual available capability

R5 is an **empirical, reproducible, bounded latency spike**, not permission to implement the entire Risk Engine. Its source authority is the frozen architecture §46/R5, §39 Timeout Budget and §50 Performance Goals, and Test Matrix §15/J-011..015 and §20 Benchmark Contract. The named configuration candidates are:

`T_sync`, `deterministicAssessmentTimeoutMs`, `judgeTimeoutMs`, `maxConcurrentJudges`, `contextBuildTimeoutMs`, `publishTimeoutMs`.

Current source contains T01 additive **test fixture**, T02 Host-only live correlation, T03 durable PTC replay and T04 bounded Ledger. There is currently **no real deterministic assessment pipeline, production Context Builder, Judge/scheduler, assessment publisher or live Host-to-Browser assessment bridge**. Therefore distinguish three evidence levels rigorously:

- **REAL_PINNED_RUNTIME:** Actual pinned Harness `Context`, `SessionStore`, `ToolRuntime`, `ApprovalService` and real installed Risk Advisor `apply`/Host observers, with safe local fixture tool and fixed deterministic approval answerer. Real approval-service path, **not** deployed Native Browser UI. Baseline = identical setup without RA; treatment = with RA. Measure latency, safety/parity and actual currently available ledger/correlation paths.
- **IMPLEMENTED_COMPONENT:** Actual current RA projection/query functions on documented, constructed `Session` histories; e.g. replay and Ledger query cost. Measure separately and do not charge optional query cost to the Native approval critical path unless it actually runs there.
- **CONTROLLED_SIMULATION:** Local, deterministic, injection-only mock/context workload and mock asynchronous judge queue used solely to study bounded timeout, concurrency, backpressure, cancellation, late completion, and non-blocking scheduling. No claims about a future actual Context Builder, Fast Judge, model/provider or assessment delivery latency.

For **Time To First Assessment / Time To Final Assessment / actual Context Builder / actual deterministic assessment / actual Judge queue and execution / actual publish** output `NOT_MEASURABLE_NOT_IMPLEMENTED`, not zero, simulated PASS, or a guessed budget. A mock's metrics MUST be named `simulated_*` and cannot serve as real product P50/P95/P99. T01 Live Browser, native PTC producer and true disk/process restart remain `NOT_RUN`.

The architecture's earlier figures (Snapshot+Normalize+Boundary goal <10ms; Rule Engine goal <20ms; Fast Judge aspirational P50<2s/P95<5s; Fast Judge 5s, Evidence 3s, Deep 10s, total advisory 15s) are **previous design goals/default sketches, not observed R5 measurements or accepted new policy**. Do not silently rewrite canonical baseline to fit measured data.

## 2. Frozen measurement contract

Use a monotonic high-resolution clock (`performance.now` or `process.hrtime.bigint`) and serialize a bounded, sanitized dataset. For each measured distribution report `n`, warmup count, scenario label, unit `ms`, **P50/P95/P99/MAX**, min and mean if helpful; define a single quantile method (nearest-rank or documented interpolation). Preserve raw numeric samples in reproducible bounded artifact (no arguments, result text, Session content, tokens, secrets, timestamps that identify users). Every row states the exact evidence level, environment and operation boundaries.

### Benchmark families

1. **Native approval baseline and RA treatment:** matched fixture and Session bracket, same approval policy/answerer behavior, same number of operations, run order alternated/interleaved to limit drift; warm both. Capture `approval/request` end-to-end/answerer entry where the actual policy permits, `approval/asked` callback cost where observable, plus `tools.execute` overhead if measured. Compare without RA vs with RA using clearly specified sample pairing, `delta_ms=treatment - baseline`. Report **baseline P50/P95/P99/MAX, treatment P50/P95/P99/MAX and delta P50/P95/P99/MAX**. A baseline that uses `policy: never` must be separately labelled as policy bypass, not Native UI. Do not automatically equate tool execution time with approval latency. Assert exact native ApprovalOutcome parity and unchanged answerer count, RA failure isolation and no returned RA ApprovalOutcome.
2. **`T_sync` critical-path observation:** instrument only benchmark-owned start/end times around synchronous RA hooks / `approval/asked` publication, or infer bounded added delay from matched real service paths when direct instrumentation cannot safely isolate it; explicitly distinguish `T_sync_DIRECT` versus `T_sync_ESTIMATE`. Never hold `approval/request` or install a terminal answerer inside product code to fabricate evidence. If direct isolation impossible, record `T_sync=PARTIAL`, not fake exact milliseconds.
3. **Workload profiles:** short Session, long valid Session (at least one profile near the current replay input cap within safety/time constraints), bounded large operation arguments where accepted by public APIs, repeated small operations, and a saturated concurrent approval burst. Construct harmless synthetic content; never use private histories. Specify actual Session event count/shape and input character count per case. Record separate cost for *on-demand* `ledger.snapshot`, `replayPtcSnapshot` and correlation lookup to avoid misattributing optional work to synchronous approval path. A source/replay over cap must return degraded/limit, not be presented as complete.
4. **Controlled bounded side-path simulation (not product integration):** no network/provider; fixed mock work/sleep or CPU synthetic task, timed AbortSignal and settled/never-settling cases, queue saturation with instrumented active-count max, mock context sizing and mock publish; no dynamic code execution. Measure `simulated_context_build_ms`, `simulated_deterministic_ms`, `simulated_judge_queue_wait_ms`, `simulated_judge_execute_ms`, `simulated_publish_ms`, TTF/TTFinal **for simulation only**. Demonstrate that mock judge saturation/timeout does not delay the deterministic mock path or native approval. Abort, timeout and late-completion cannot mutate a resolved/retired result. Track peak in-flight and queue depth. Use a bounded queue; no unbounded `Promise.all` explosion.
5. **Failure and coexistence:** RA absent, RA installed, RA observer exception (safe injected benchmark wrapper), Native answerer slow/failed, approval resolved before late mock completion, rapid two approvals, and dispose/HMR where safe. Prove no native approval block/double-answer and no phantom cross-session correlation. Do not invoke live Browser or providers.

### Sampling and methodological validity

Warmups excluded from reported sample counts. For main latency percentile distributions, target at least 300 independent measured iterations per scenario so P99 is not inferred from a tiny sample. If runtime/resource constraints force fewer, report observed n, P99 as **LOW_CONFIDENCE** and the precise limitation; do not silently repeat one value as 300 samples. Use a scenario seed or explicit deterministic fixture; record Node/pnpm version, platform, CPU model, process mode, installed baseline SHA, commit of benchmark code, sample counts, ambient load/exclusivity observations, execution duration, failure/timeout counts. Use bounded repetitions; avoid >15s uncontrolled hanging mock jobs. Replicate a small independent run/batch when possible and report stability, not guaranteed performance across machines. No web, external provider, or privileged calls.

Measure response path separately from safety assertion: budget failure is never allowed to break Native Approval, even if P99 is slow. Quantile definitions and calculation test must be unit-tested (small known sequences, including zero/negative paired deltas).

## 3. Policy output, scope and non-claims

Create a **measured-policy candidate**, e.g. `docs/tasks/T05-latency-benchmark/AdvisoryLatencyPolicy_Provisional.md` and/or a machine-readable bounded `Benchmark_Summary.json`. Include for every proposed field: candidate value or `UNDETERMINED`, **measured basis (scenario, n, P99/MAX), confidence, evidence level, whether executable product implementation exists, and which release task must remeasure it**. Choose headroom only with transparent formula/rationale and data; do not silently adopt arbitrary ms/count values. A `maxConcurrentJudges` conclusion from simulation is `SIMULATION_ONLY`, not a real provider throughput claim. Actual deterministic/context/judge/publish timeout constants MUST remain provisional/undetermined until their real implementations have measurable paths. Avoid editing frozen baseline or changing product timeout configuration as a side effect of the benchmark.

No RA-owned persistence, real assessment/judge/provider, new Browser bridge/UI, new native approval answerer, direct plugin change to native approval outcome, T04 F-006/F-007/F-013 claim elevation, Harness Core mutation, update to newer upstream, or general production scheduler rollout. Limit changes to **plugin-local benchmark fixtures/scripts/tests/documents**, with minimal necessary package scripts. If an optional isolated simulation helper is added, it must not be wired into `src/index.ts` product `apply()` or exported as an implemented product Judge.

## 4. R5 acceptance evidence matrix

| ID | Required proof | Evidence boundary |
|---|---|---|
| R5-01 | Actual pinned `ApprovalService` baseline vs RA-installed matched latency P50/P95/P99/MAX and distributions | REAL_PINNED_RUNTIME |
| R5-02 | Added approval latency and `T_sync` with measured/estimate distinction | REAL_PINNED_RUNTIME; mark partial when isolation unavailable |
| R5-03 | Native decision availability and outcome parity under RA and RA benchmark-injected failure | REAL_PINNED_RUNTIME |
| R5-04 | Short vs long valid Session, bounded large args, replay/query costs kept off-path unless actually invoked | REAL + IMPLEMENTED_COMPONENT |
| R5-05 | Concurrent approval burst; no RA-generated answer, wrong identity or doubled answer | REAL_PINNED_RUNTIME |
| R5-06 | Deterministic mock remains independent of saturated/slow/never-settling mock Judge | CONTROLLED_SIMULATION only |
| R5-07 | Queue concurrency cap, queue wait, execution, timeout/abort/late result and bounded backlog | CONTROLLED_SIMULATION only |
| R5-08 | Mock context/build/publish and mock TTF/TTFinal explicitly named simulated | CONTROLLED_SIMULATION only |
| R5-09 | Real assessment/Context Builder/Judge/publish latency fields clearly NOT_MEASURABLE_NOT_IMPLEMENTED | SOURCE_AUDIT / non-claim |
| R5-10 | Quantile calculation proof, samples/metadata/environment reproducibility and no hidden arbitrary budgets | Pure + benchmark artifacts |
| R5-11 | Scoped `AdvisoryLatencyPolicy` candidate with confidence and deferred policy fields | Evidence/architecture review |
| R5-12 | T01 9/9 + T02 16/16 + T03 17/17 + T04 21/21, package/type/static, protection and no side-path native authority | Actual regression and diff |

Test Matrix J-011–J-015 are **not full-product PASS** absent genuine assessment, provider and deployed Browser. Map each to `COMPONENT_PASS / SIMULATION_ONLY / PARTIAL / NOT_RUN` accurately. The only real core claim that can be accepted now is overhead/non-interference for currently installed plugin hooks under the tested pinned runtime. No p99 threshold is pre-frozen before R5 numbers are captured.

## 5. Reporting and STOP

Expected Codex output: `docs/tasks/T05-latency-benchmark/Execution_Report.md` with implementation/Tested SHA, benchmark commands, raw bounded measurements or exact artifact paths, scenario-by-scenario table, percentile method, measurement conditions, accepted prior test counts, candidate policy, limitations and NOT_RUNs. Distinct implementation commit then report-only commit where feasible. No `Acceptance_Report.md`; ChatGPT Web adjudicates after pushed source/evidence.

STOP if actual pinned source differs; the benchmark depends on newer upstream-only APIs; no safe real ApprovalService fixture can be constructed; supporting the requested metric would require product Assessment or Harness changes; active user/provider/privileged calls become necessary; test hangs/unbounded resource consumption; T01–T04 regress; source/test confidentiality is breached; remote ancestry unexpectedly diverges; or a numeric policy value would be presented without supporting measurements. `R5_PARTIAL` is an acceptable honest execution result if core noninterference is measured but absent actual assessment cannot be benchmarked.
