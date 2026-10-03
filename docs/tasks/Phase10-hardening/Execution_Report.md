# Phase 10 Execution Report

## Outcome

`PHASE10_R1_PUBLISHED_READY_FOR_REVIEW`

This is Codex implementation and execution evidence only. It is not an
Acceptance Report and does not declare `PHASE10_ACCEPTED`.

## Identity and governance

- Starting synchronized baseline: `487e5b7be6e27736ff41c718a6e6cdd6b431e707`.
- Harness reference: `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Candidate / Tested SHA: `d17f844d0c4c377af450d07cce2ec072c1b1efe9`.
- Final report SHA: the docs-only publication commit containing this report;
  remote equality is recorded after publication.
- Harness Core tracked mutation: `0`.
- Phase 11+ and later product phases: not started.
- Existing user drift was preserved and excluded from commits: `.vitest-cache/`,
  `docs/risk-advisor-current/`, historical instruction/design files, `lib/`,
  `node_modules/`, and `pnpm-lock.yaml`.

## R1 hardening proof

### Shell and semantic corpus

PASS. The existing shared `src/host/shell-analysis.ts` / Rule Engine authority
was reused. The table-driven corpus directly covered `sh -c`, `node -e`,
`python -c`, `perl -e`, `cmd /c`, PowerShell and `pwsh`, Invoke-Expression/iex,
PowerShell variable invocation, `find -exec`, `xargs`, `parallel`, backticks,
newline and semicolon chaining, quoted inert separators, `LD_PRELOAD`,
`NODE_OPTIONS`, generic environment prefixes, and PowerShell environment
assignment. Expected dangerous findings, dynamic/degraded cases, and inert
role-sensitive cases were asserted. No corpus command executed.

### Prompt injection and privacy

PASS. One runtime-generated canary was denied through ReviewerOperationSeed,
DirectUserContext, real Fast serialization/accepted candidate, Evidence
projection, Deep payload/accepted candidate, A1/A2/A3/A4, Browser V4 DTO/parser,
diagnostics, benchmark result, and captured logger surfaces. The benchmark
recorded 16 bounded serialized surfaces with zero canary, raw-field,
private-path, and captured-logger matches; the exact canary was not persisted.
Hostile local Fast/Deep candidates could not lower deterministic/evidence risk,
add authority, convert hypotheses to facts, or promote alternatives beyond
`MODEL_SUGGESTED / UNVERIFIED`. Duplicate keys, unknown fields, and malformed
credential URLs failed closed.

### Native Approval coexistence

PASS. The real pinned `ApprovalService` remained the sole native answerer and
outcome authority. A separate Cordis fixture fiber proved RA absent/present
parity, one answerer call, side-path fault/timeout parity, RA disposal before
answer, fixture answerer removal, remount without duplicates, and duplicate
approval observation without double answer. No named external approval plugin
was available without installation: `NAMED_EXTERNAL_APPROVAL_PLUGIN_NOT_AVAILABLE`.
Risk Advisor registered zero approval answerers and returned zero approval
outcomes.

### TOCTOU and retained-state matrix

PASS. Real evidence-bearing Browser disclosure proves pre-execution Evidence may
be stale. Private operation identity proof shows equivalent normalized operations
share a hash while materially different operations do not; public diagnostics and
Browser surfaces contain neither raw args nor the private hash. The concise proof
matrix maps ActiveExecutionIndex, OperationFoundation, Ledger/PTC, FailureChain,
ReviewerSeed, ExpectedEffect, Verification, Evidence raw/sanitized state,
Assessment records, Deep parent bindings, and Fast/Evidence/Deep queues to their
executable owner tests, including caps and lifecycle fencing.

## Product-local benchmark

PASS. Artifact: [`r5-phase10-measurements.json`](evidence/r5-phase10-measurements.json).
Policy: [`AdvisoryLatencyPolicy.md`](AdvisoryLatencyPolicy.md). Cheap lanes use
300 samples/20 warmups; heavier lanes use 100 samples/5 warmups. The artifact's
actual product path is `REAL_PRODUCT_LOCAL` and uses disposable local files,
actual schedulers, deterministic local LLM/subagent adapters, the Evidence
collector, A1→A4 merges, and coordinator Browser query/projection.

- Real pinned ApprovalService (`REAL_PINNED_RUNTIME`): baseline P99 `1.519 ms`,
  MAX `1.540 ms`; treatment P99 `2.685 ms`, MAX `6.298 ms`; paired delta P99
  `2.227 ms`, MAX `5.717 ms`; each n=100/warmup=5. Observation only.
- Shared shell analysis: P99 `0.076 ms`, MAX `0.229 ms`; deterministic A1:
  P99 `0.035 ms`, MAX `0.064 ms`; context builder: P99 `0.061 ms`, MAX
  `0.148 ms` (each n=300/warmup=20).
- Actual Fast scheduler + `executeFastJudge` + A2: P99 `0.210 ms`, MAX
  `0.228 ms`; actual Evidence collector + A3: P99 `1.081 ms`, MAX `2.069 ms`;
  actual Deep scheduler + structural adapter + A4: P99 `1.318 ms`, MAX
  `2.118 ms`; actual Browser presentation/query: P99 `0.208 ms`, MAX `0.844
  ms` (each n=100/warmup=5).
- Composed actual A1→Fast/A2→Evidence/A3→Deep/A4→Browser: P99 `1.927 ms`,
  MAX `2.672 ms`, n=100/warmup=5.
- Fast and Deep contract bounds remained `timeout=5000 ms`,
  `maxConcurrent=2`, `maxPending=8`; no production configuration was tuned.
- External provider latency: `NOT_VALIDATED_EXTERNAL_PROVIDER / NOT_RUN`.

## Cold-start and package proof

PASS. `pnpm pack --dry-run --json` passed Host/Client export, declaration,
manifest, README, and patch checks. The disposable offline external-bundle gate
verified local Harness HEAD and tracked status before install, then activated a
test-only probe waiting on `riskAdvisorAssessments`. The true two-process cold
restart result was:

```text
install/process A/process B       PASS / PASS / PASS
activation markers A/B            1 / 1
risk-advisor bundles A/B          1 / 1
probe bundles A/B                 1 / 1
same persisted profile            true
network guard violations          0
provider/network/registry calls   0 / 0 / 0
Git remote calls                  0
Harness tracked mutations         0
verified Harness SHA              ddefc45fbc7f8e46dd73185e68295696d1297887
```

No `PendingApproval.answer()`, composer replacement, mutation RPC, hidden Judge
or Evidence Tool, custom Risk Advisor Session event, or Risk Advisor approval
authority was added.

## Validation matrix

All frozen pre-Full gates passed, including P10 focused, P9/P8/P7 focused and
smoke/full benchmarks, P6/P5/P4/P3/P2/P1A/P1B/P1C, R1–R5/T05, typecheck,
build, Host/Client export, declaration/private-export audit, bundle/patch
contract, pack, diff check, scope/privacy/canary, no-provider/no-network/
no-registry/no-Git-remote audit, no custom Session event, no RA answerer, and
Harness mutation=0.

Focused result counts were: P10 9 files/26 tests; P9 6/20; P8 5/21; P7 6/26;
P6 5/27; P5 4/23; P4 2/17; P3 2/17; P2 2/15; P1A 2/13; P1B 2/14; P1C 1/8;
R1 2/9; R2 2/16; R3 2/17; R4 2/21; R5 1/3. Exact-SHA P10 benchmark
smoke/full and cold-start gates also passed.

## Fresh complete Full

Exactly one fresh complete `pnpm test` ran on the exact Tested SHA
`d17f844d0c4c377af450d07cce2ec072c1b1efe9`, after the executable/test/config/
package/benchmark candidate was committed. Result: PASS — 17 scripted groups,
55 test files, 293 tests. No tracked semantic drift was present before Full;
after Full, only this `Execution_Report.md` is changed.

## External activity and handoff

```text
provider calls                    0
external network calls            0
registry calls                    0
Git remote runtime calls          0
Harness tracked mutations         0
custom Risk Advisor Session events 0
Risk Advisor approval calls       0
Risk Advisor approval answerers   0
```

This report is ready for independent ChatGPT Web review. Codex does not perform
final acceptance.
