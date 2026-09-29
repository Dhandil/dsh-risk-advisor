# T05 — R5 Assessment Latency Benchmark | Codex Implementation Instructions

**Task:** `T05-latency-benchmark`. Read adjacent `T05_Architecture_Freeze.md` first and execute its distinctions between REAL, IMPLEMENTED_COMPONENT and CONTROLLED_SIMULATION literally. This is benchmark implementation and evidence delivery only. Codex never self-awards `ACCEPTED` and never starts a subsequent task.

## 0. Preflight / protected baselines

1. In `D:\Harness\harness-plugin\dsh-risk-advisor`, record branch, `git status --short`, staged/untracked drift, HEAD, origin/main and `git ls-remote origin refs/heads/main`. Expected published checkpoint **`2abafc70a4177470263adaf989d006a08d43f918`**. Safely fast-forward only if appropriate; STOP for unexplained divergence. Never reset, clean, rebase, force-push or stage unrelated files.
2. Check `D:\Harness\deepseek-harness` **read-only**. Required **local pinned** HEAD/source `ddefc45fbc7f8e46dd73185e68295696d1297887`. The observed newer upstream `4878cdabd87d4041bdaff61d04c966883b9fd07a` is explicitly NOT_VALIDATED; follow `docs/tasks/T04-ledger-recovery/T04_Harness_Upstream_Drift_Decision.md`: do not fetch/pull/checkout/build/install or otherwise modify Harness, including `.git`. Protect Harness drift `build.log`, `install.log`, `t0-*`, `undefined/` and any newly detected files. Protect plugin drift `docs/risk-advisor-current/`, untracked T01 Final Runtime Gate document and generated assets (`.vitest-cache`, `lib`, `node_modules`, untracked lockfile). Do not stage these.
3. Read `docs/baseline/risk-advisor-v1-architecture-v1.2.md` §§3.2, ADR-003, 13, 23, 39, 46/R5, 50; Test Matrix §15/J-011..015 and §20; Static Preflight S7/R5; T04 Execution Report and bounded acceptance/cross-plane open gates; T01–T04 actual plugin Host integration/tests. Confirm actual source has **no production deterministic assessment, Context Builder, Judge/scheduler or publisher**; if that changes, STOP for architecture review rather than silently expand R5. Frozen baseline docs remain unchanged.
4. Check test-runner environment and whether an exclusive-host / meaningful low-contention benchmark window is available. Record if unavailable. No performance claim from a shared noisy host without qualification. Benchmark may be isolated from Vitest/test runner if its overhead dominates, but use only the plugin workspace and pinned public Harness APIs.

## 1. Implement a plugin-local repeatable benchmark (not full product)

- Add focused files e.g. `benchmarks/r5-approval.mts`, `benchmarks/r5-components.mts`, `benchmarks/r5-sidepath-simulation.mts`, `benchmarks/r5-stats.ts` and corresponding pure tests; names flexible. Add `bench:r5` / `bench:r5:smoke` scripts if needed. Minimize `src/**` modifications; do not wire the mock runner into production `apply()` or turn T01 fixture into a real assessment. Keep dependencies/local runtime compatible with already installed test tooling, no writes/install into Harness.
- **Real Runtime paired measurement:** safely mount real pinned `Context` + `SessionStore` + `ToolRuntime` + `ApprovalService` (plus required SystemPrompt); register a harmless deterministic local tool / answerer. Alternate/interleave baseline (RA absent) and treatment (`apply(ctx)` or exact corresponding accepted R2+R4 observers), identical policy and event shape. Measure real ApprovalService entry/decision timing and/or added native path delay, alongside optionally tool execution timing (separate columns); label policy-never controls as bypass. Ensure any instrumenting observer never changes outcome or answers itself. Explicitly disclose if service/answerer path is **not deployed Browser Native UI**. Run warmup and adequate repeat counts (target >=300 actual samples per core scenario), with high-resolution monotonic clock. Prove native decision/outcome and answerer count parity and RA failure containment. `T_sync` must carry method (`DIRECT_HOOK`, `MEASURED_DELTA_ESTIMATE`, or `PARTIAL_NOT_ISOLATABLE`) and boundaries.
- **Case mix:** small valid Session, a safely constructed long valid Session, bounded oversized arg fixture where permitted, two rapid approvals, moderate concurrency burst and policy-never/failure controls. Do not consume raw real user Session data. Measure actual `ledger.snapshot`, T03 `replayPtcSnapshot`, T02 correlation lookup separately (hot/cold as applicable), with explicit valid event count and caps. Assert cap returns degradation rather than presenting truncated evidence as complete. Any extra query absent from approval path must not count against native approval latency.
- **Controlled simulation only:** mock `context build`, `deterministic`, `judge` queue/promise (fast/slow/never-settling), and `publish`. Use bounded queue capacity, bounded concurrency, controlled timeout/AbortSignal and finalization; capture simulated queue wait, execution, peak active count, late completion suppression, simulated TTF and TTFinal. Demonstrate slow/saturated Judge does not hold simulated deterministic result or actual native ApprovalService decision. No provider/model/network; use finite bounded trials and always close/dispose mocks. Do not claim the mock's ms numbers measure a production Judge, Context Builder or publishing component.
- **Stats/data:** implement and unit-test clearly documented percentile math P50/P95/P99/MAX (nearest-rank or defined interpolation), sample count and paired signed delta. Record sample-level bounded numerical data, structured sanitized aggregate summary and environmental metadata; failures, excluded warmups, timeouts and simulation results use different fields and evidence labels. Validate no secret, argument contents or answer text appears in outputs. Do not hardcode a desired threshold in tests so that the benchmark always passes.
- **Policy draft:** generate `docs/tasks/T05-latency-benchmark/AdvisoryLatencyPolicy_Provisional.md` from observed results. State for each `T_sync`, `deterministicAssessmentTimeoutMs`, `judgeTimeoutMs`, `maxConcurrentJudges`, `contextBuildTimeoutMs`, `publishTimeoutMs`: provisional value or `UNDETERMINED`, provenance, n/quantiles, confidence, formula for margin (if proposed), and requirement for re-benchmark on actual implementation. T_sync can be estimated from real approval delta with appropriate wording; simulation-based fields MUST be named simulation guidance, never production acceptance. No silent canonical architecture/spec edit or production policy write.

## 2. Focused R5 validation / evidence mapping

Implement cases R5-01..R5-12 from Architecture Freeze and map Test Matrix J-011..015. Record each case as `REAL_PINNED_RUNTIME_PASS`, `IMPLEMENTED_COMPONENT_PASS`, `SIMULATION_ONLY`, `PARTIAL`, `NOT_MEASURABLE_NOT_IMPLEMENTED` or `FAILED`, not a bare undifferentiated PASS. For R5-09 explicitly inventory the absent production pipeline. Make negative assertions: no extra ApprovalOutcome from RA; no `approval/request` interception by RA, no delayed native decision under saturated mock judge, no double answer; no cross-Session leak; no arbitrary callId inference; no old-generation update after dispose; no unbounded queue; no false full R4 cross-plane confirmation; no source/payload leak.

For J-011..015, separate realistic currently measurable non-blocking hook performance from future Judge/Assessment functionality. Record deployed T01 Browser `NOT_RUN`, actual PTC producer `NOT_RUN`, disk restart `NOT_RUN`, new upstream V4 `NOT_VALIDATED`, actual assessment-to-first/final & real provider latency `NOT_MEASURABLE_NOT_IMPLEMENTED`.

## 3. Execution order and quality gates

```text
preflight + exact baseline / source facts
  -> benchmark implementation and pure statistic/contract tests
  -> smoke benchmark with bounded small n; inspect for hangs, answerer parity, output sanitation
  -> architecture/contract/scope/non-blocking audit
  -> low-cost gates: typecheck, available lint (record NOT_CONFIGURED honestly), build, Host export smoke, pack, source/secret/diff check
  -> one full inherited regression T01 9/9 + T02 16/16 + T03 17/17 + T04 21/21 plus new R5 pure/contract tests
  -> one FRESH FULL measured R5 benchmark on final executable state under recorded host conditions
  -> analyze result and author provisional policy + Execution_Report.md (docs/data only)
  -> exact-scope implementation/test/artifact commit, separate docs-only report commit when feasible
  -> normal push and `HEAD == origin/main == git ls-remote origin refs/heads/main`
  -> STOP
```

If full R5 bench fails due to ordinary bug, fix then rerun affected focused/static/full regression as appropriate and one new fresh full measurement on final executable state. Never select best runs or silently delete outliers; disclose failures and ambient noise. If the measured host is not sufficiently stable, deliver `T05_R5_PARTIAL` with raw conditions, do not claim a full confidence percentile result. Prior 63 inherited tests remain baseline, but never promise a new R5 count before run. Canonical Full (PAH-like infrastructure) is NOT_APPLICABLE.

## 4. Publication artifacts and stop conditions

Write under `docs/tasks/T05-latency-benchmark/`:

- exact supplied `T05_Architecture_Freeze.md`, `T05_Implementation_Instructions.md`;
- `Execution_Report.md` (one updated task report; outcome `T05_R5_PUBLISHED_READY_FOR_REVIEW`, `T05_R5_PARTIAL`, `T05_ARCHITECTURE_DECISION_REQUIRED`, `T05_BLOCKED`, or `T05_FAILED`; *not* Acceptance Report);
- `AdvisoryLatencyPolicy_Provisional.md` (scope-limited candidate, not canonical product config);
- compact sanitized measured data, aggregate summary and methodology/environment manifest under `evidence/` (or equivalent), no raw private payloads, no binary/large build dump. If full raw samples are too large for Git, keep bounded reproducible summary + clearly documented local artifact identity/path, and include sufficiently many numeric samples for independent recomputation of percentiles.

Execution Report: baseline Plugin/Harness SHA, protected drift/upstream caveat; exact file manifest; benchmark commands and sample counts; p50/p95/p99/max for real baseline/treatment/delta, `T_sync` method, case mix and env; **separate** component and controlled-simulation tables; explicit missing Assessment/Context Builder/Judge/Publish implementations and deferred policies; R5-01..12 and J-011..15 evidence levels; native outcome parity and failure containment; full inherited regression/static/test results; zero provider/privileged/browser calls; T04 exact cross-plane F-006/F-007/F-013 gate still OPEN; all NOT_RUN statuses. Distinguish measured Tested SHA from later docs-only report commit and record final remote SHA in terminal response.

Do not mutate Harness Core or its `.git`, install/build in it, switch upstream, reset/clean, delete protected drift, change native Approval authority, begin post-T05 product phases, create `Acceptance_Report.md`, or declare `ACCEPTED`. STOP on material mismatch of pinned source, unsafe/infinite fixture, regression of native approval/T01–T04, unbounded resource usage, forced implementation of missing production Assessment or model, or unexpected remote conflict. If missing real Assessment prevents full R5 goals, deliver bounded empirical results and honest `PARTIAL`, not an invented performance pass.

### Compact Codex handoff

```text
Outcome:
R5-01..12 evidence-level statuses / J-011..15 scope:
REAL native baseline vs RA treatment: n, P50/P95/P99/MAX and paired delta:
T_sync definition, measured/estimated status:
IMPLEMENTED_COMPONENT measures:
CONTROLLED_SIMULATION measures (not product):
Actual Assessment / Context / Judge / Publish: NOT_MEASURABLE_NOT_IMPLEMENTED (if still absent)
AdvisoryLatencyPolicy_Provisional.md:
T01 9/9 + T02 16/16 + T03 17/17 + T04 21/21 + R5 unit/contract:
Typecheck / lint / build / export / pack / diff / scope / secret:
Tested / implementation SHA; Execution_Report.md; final remote SHA / equality:
Harness pinned and unmodified; upstream V4 / live Browser / native PTC / disk restart limitations:
STOP; no Acceptance Report / next phase.
```
