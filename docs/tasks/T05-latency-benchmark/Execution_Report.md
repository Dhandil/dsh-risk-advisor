# T05 — Latency Benchmark | Codex Execution Report

## Outcome

`T05_R5_PARTIAL`

T05 provides real pinned-runtime overhead/non-interference evidence for the currently installed Risk Advisor hooks, implemented-component measurements, and a clearly separated controlled simulation. A real production Assessment/Context Builder/Judge/publisher path does not exist in the frozen scope, so assessment latency and product timeout policy remain unmeasurable and undetermined.

This is a Codex implementation and execution report only. No `Acceptance_Report.md` was created and no `ACCEPTED` status is asserted. Final review belongs to ChatGPT Web.

## Baselines and protected state

- Plugin repository: `D:\Harness\harness-plugin\dsh-risk-advisor`, branch `main`.
- Starting plugin checkpoint: `2abafc70a4177470263adaf989d006a08d43f918`.
- Benchmark implementation/Tested SHA: `52e5a3580c62da29959de51debc59d818268ee88`.
- Harness Core used read-only at frozen local `ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Harness `origin/master` observed at `4878cdabd87d4041bdaff61d04c966883b9fd07a`; newer upstream was not validated or used.
- Harness Core was not fetched, modified, built, installed, reset, cleaned, or checked out.
- Existing plugin drift was preserved and excluded from T05 commits: `docs/risk-advisor-current/`, T01 final runtime-gate instructions, `.vitest-cache/`, generated `lib/`, `node_modules/`, and `pnpm-lock.yaml`.
- Existing Harness drift was preserved: `build.log`, `install.log`, `t0-model.txt`, `t0-remote.txt`, `t0-session.txt`, `t0-storage.txt`, and `undefined/`.

## Intended change manifest

Implementation commit `52e5a3580c62da29959de51debc59d818268ee88` contains only:

- `benchmarks/r5-approval.mjs`: real pinned-runtime paired benchmark, component cases, and control cases.
- `benchmarks/r5-sidepath-simulation.mjs`: bounded local timeout/backpressure/late-completion simulation.
- `benchmarks/r5-stats.mjs`: finite sample filtering, nearest-rank quantiles, summaries, paired deltas, and bounded output rounding.
- `tests/r5-benchmark.unit.spec.ts`, `tests/r5-benchmark-smoke.spec.ts`, and `tests/r5-benchmark-full.spec.ts`.
- `package.json`: T05 unit/full benchmark scripts and inclusion in the project regression command.
- The supplied exact `T05_Architecture_Freeze.md` and `T05_Implementation_Instructions.md`.

The measured artifact and this policy/report are report-phase outputs. Existing product source under `src/` was not changed.

## Evidence boundaries and method

### REAL_PINNED_RUNTIME

The benchmark mounted the actual pinned `Context`, `SessionStore`, `SystemPrompt`, `ToolRuntime`, and `ApprovalService`, then compared a matched baseline without `apply(ctx)` against a treatment with `apply(ctx)`. A harmless local fixture tool called the real `ctx.approval.request`; a deterministic local answerer returned `allowed-once`. The native approval outcome and exactly-one answerer parity were asserted for every paired sample. RA observers never answered or changed the native outcome.

This is a real ApprovalService path, not deployed Native Browser UI. No provider, model, browser, privileged call, or runtime network request was made.

### IMPLEMENTED_COMPONENT

Actual T02/T03/T04 component code was measured against valid in-memory Session histories: short valid Session, bounded large-argument fixture, repeated correlation lookup, and a 2,400-step / 9,602-event near-cap Session. The near-cap case correctly reported `DEGRADED`, `sourceComplete=true`, and `truncated=true`.

### CONTROLLED_SIMULATION

The bounded local queue used fixed mock context/deterministic work, bounded concurrency `2`, max pending `4`, `judgeMs=8`, and timeout `3 ms`. It was used only to demonstrate backpressure, timeout, late completion, simulated publish, simulated TTF/TTFinal, and native-approval non-blocking coexistence. Its measurements are named and reported as simulation evidence and are not Assessment performance.

## Real paired measurement

Clock: monotonic `performance.now()`. Warmups were excluded. Quantiles use nearest-rank `ceil(q*n)`, one-indexed and clamped. Baseline and treatment order alternated per pair.

| Distribution | n | P50 ms | P95 ms | P99 ms | MAX ms | Mean ms |
|---|---:|---:|---:|---:|---:|---:|
| Approval E2E baseline, RA absent | 300 | 0.2200 | 0.6037 | 0.8413 | 18.2397 | 0.3493 |
| Approval E2E treatment, RA installed | 300 | 0.2844 | 0.7612 | 1.2263 | 1.7142 | 0.3601 |
| Paired treatment minus baseline | 300 | 0.0420 | 0.3999 | 0.9462 | 1.4335 | 0.0108 |
| Asked-to-answerer baseline | 300 | 0.1907 | 0.5163 | 0.7059 | 18.1642 | 0.3077 |
| Asked-to-answerer treatment | 300 | 0.2301 | 0.6312 | 0.8407 | 1.0743 | 0.2925 |
| Asked-to-answerer paired delta | 300 | 0.0271 | 0.3438 | 0.5547 | 0.8814 | -0.0151 |
| Tool execution baseline | 300 | 1.1068 | 2.5142 | 3.7068 | 19.3704 | 1.4974 |
| Tool execution treatment | 300 | 1.2982 | 3.0039 | 4.9522 | 15.5875 | 1.6935 |
| Tool execution paired delta | 300 | 0.1628 | 1.6615 | 3.1749 | 14.6810 | 0.1961 |

`T_sync` is `MEASURED_DELTA_ESTIMATE` with status `PARTIAL_NOT_DIRECTLY_ISOLATABLE`: the delta includes matched service/fixture overhead and is not a direct hook-only timer. It is not promoted to a production threshold.

## Component and simulation results

| Case | Evidence level | Result |
|---|---|---|
| Short valid Session, 10 events | IMPLEMENTED_COMPONENT | `HEALTHY`, complete; ledger P99 4.3986 ms, PTC replay P99 0.1212 ms. |
| Bounded large-argument fixture, 6 events | IMPLEMENTED_COMPONENT | `HEALTHY`, complete; ledger P99 0.1307 ms, PTC replay P99 0.0171 ms. |
| Long valid near-cap Session, 9,602 events | IMPLEMENTED_COMPONENT | `DEGRADED`, complete source, truncated; ledger P99 76.2136 ms, PTC replay P99 8.3514 ms. |
| Saturated bounded Judge queue | CONTROLLED_SIMULATION | Backpressure 120, timeout 120, late completion 120; max active 2, max queue depth 4. |
| Native ApprovalService during saturated simulation | REAL_PINNED_RUNTIME + CONTROLLED_SIMULATION | Native outcome `allowed-once`, one answerer, completed. |

Slow answerer control completed with native `allowed-once`; failed answerer control remained fail-closed (`native approval outcome was unavailable`) and did not become an RA decision. Injected RA observer faults were contained with native parity intact. An 8-request native burst returned 8 `allowed-once` outcomes and 8 answerer calls.

## R5 / J matrix

| Case | Status | Evidence |
|---|---|---|
| R5-01 native baseline/treatment | REAL_PINNED_RUNTIME_PASS | 300 paired iterations each, alternating order. |
| R5-02 native outcome/answerer parity | REAL_PINNED_RUNTIME_PASS | `allowed-once`, exactly one answerer per iteration. |
| R5-03 `T_sync` | PARTIAL | Measured delta estimate; no direct hook timer. |
| R5-04 short component | IMPLEMENTED_COMPONENT_PASS | Valid 10-event Session. |
| R5-05 long valid Session | IMPLEMENTED_COMPONENT_PASS | 9,602 events; bounded degraded/truncated result. |
| R5-06 bounded large arguments | IMPLEMENTED_COMPONENT_PASS | 8,192-character fixture argument. |
| R5-07 repeated small operations | IMPLEMENTED_COMPONENT_PASS | Repeated ledger/PTC/correlation measurements. |
| R5-08 cap degradation | IMPLEMENTED_COMPONENT_PASS | Long case proves bounded degraded projection. |
| R5-09 bounded queue | SIMULATION_ONLY | Local queue only. |
| R5-10 timeout/late completion | SIMULATION_ONLY | Timeout and late-settlement suppression only in mock. |
| R5-11 native path under simulation load | REAL_PINNED_RUNTIME_PASS | Native approval completed while simulation was saturated. |
| R5-12 no external calls | REAL_PINNED_RUNTIME_PASS | Local fixtures only; no provider/browser/privileged runtime calls. |
| J-011 timeout handling | SIMULATION_ONLY | No production Judge exists. |
| J-012 saturation | SIMULATION_ONLY | No production Judge queue exists. |
| J-013 oversized arguments | IMPLEMENTED_COMPONENT_PASS | Bounded fixture; no raw argument export. |
| J-014 assessment budget | NOT_MEASURABLE_NOT_IMPLEMENTED | No production assessment pipeline. |
| J-015 long Session | IMPLEMENTED_COMPONENT_PASS | Near-cap valid Session and degraded projection. |

T01 Browser/native PTC/disk-process restart remain `NOT_RUN`; actual native PTC producer remains `NOT_RUN`; upstream V4 remains `NOT_VALIDATED`. T04 exact cross-plane F-006/F-013 evidence remains `PARTIAL/OPEN` as previously reported; T05 does not elevate it.

## Quality gates

- `pnpm run bench:r5:smoke`: PASS; 8 baseline + 8 treatment smoke samples, component and simulation controls executed.
- `pnpm run bench:r5`: PASS; final full run on Tested SHA, 300 baseline + 300 treatment, 20 warmups.
- `pnpm test`: PASS, 66/66: T01 9/9, T02 16/16, T03 17/17, T04 21/21, T05 3/3.
- `pnpm run typecheck`: PASS.
- `pnpm run build`: PASS for Host and Client bundles.
- Node Host export smoke import: PASS; `apply`, `installCorrelation`, `installLedger`, and replay exports resolve.
- `pnpm pack --dry-run`: PASS; package contents are Host/Client bundles, declarations, `package.json`, and README.
- Static canonical Test Matrix audit: PASS; active canonical L3 uses `tool/ptc-dispatch-start` / `tool/ptc-dispatch`. Historical/protected copies were not rewritten.
- T05 scope scan: PASS; no executable provider/network/browser/privileged call or credential pattern.
- `git diff --check`: implementation and report files clean; the supplied T05 freeze document retains intentional Markdown hard-break spaces and is not rewritten.
- Lint/publint: `NOT_CONFIGURED` in this repository.

The expected React fixture-fault stack traces from T01 are part of its passing fault-isolation tests, not failures.

## Publication handoff

The final report/policy commit will be pushed after remote synchronization. Required final equality is `HEAD == origin/main == git ls-remote origin refs/heads/main`. Codex stops after that publication check for ChatGPT Web independent review; no R5 follow-on implementation is started.
