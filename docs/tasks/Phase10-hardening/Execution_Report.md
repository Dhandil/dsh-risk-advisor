# Phase 10 Execution Report

## Outcome

`PHASE10_R2_PUBLISHED_READY_FOR_REVIEW`

This is Codex implementation and execution evidence only. It is not an
Acceptance Report and does not declare `PHASE10_ACCEPTED`.

## Identity and governance

- Synchronized starting baseline: `6232e0cacf41b201d503bf0c7143d03b9678a9f3`.
- Implementation / Tested SHA: `01a26b2e14cf7c5ec4102dd4d70b6550f2b1d036`.
- Harness reference: `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Harness Core was read-only; no later product phase was started.
- Existing user drift was preserved and excluded from commits: `.vitest-cache/`,
  `docs/risk-advisor-current/`, historical instruction/design files, `lib/`,
  `node_modules/`, and `pnpm-lock.yaml`.

## R2 proof-fidelity repairs

### Cold restart and public lifecycle

PASS. The disposable probe injects `riskAdvisorAssessments`, `appReady`, and
`appExit`; it writes `PROFILE_READY_WITH_RISK_ADVISOR_SERVICE` only from
`appReady.onReady`, then requests `appExit(0)`. The parent waits for natural
completion and kills only on hard timeout. The exact-SHA AppReady/public-exit
gate passed independently for processes A and B:

```text
schema                         dsh-risk-advisor.phase10.cold-start.v3
lifecycle                      APP_READY_PUBLIC_APP_EXIT
ready marker                   PROFILE_READY_WITH_RISK_ADVISOR_SERVICE
natural exit A/B               true / true
marker A/B                     1 / 1
Risk Advisor bundles A/B       1 / 1
probe bundles A/B              1 / 1
same persisted profile         true
network/provider/registry      0 / 0 / 0
Git remote calls               0
Harness tracked mutations      0
Harness SHA                    ddefc45fbc7f8e46dd73185e68295696d1297887
```

### Native Approval and coordinator fencing

PASS. Real pinned `ApprovalService` runs with a separate fixture answerer and
local deterministic Risk Advisor reviewer adapters. Focused proof covers real
Risk Advisor timeout, real side-path failure, native outcome parity, one
answerer call, late release fencing, and duplicate approval observation.

Direct coordinator integration proof covers native close while held Evidence
work is in flight and native close while held Deep work is in flight. Late A3
and A4 results do not supersede the pre-close assessment; cancellation,
disposal, and drain/quiescence are asserted.

### Privacy and Deep authority

PASS. A synthetic runtime canary enters the actual Evidence target seed and
collector, is consumed at the raw boundary, and is checked through the
sanitized snapshot, A3, Deep payload, and Browser V4 projection. Raw seed
cleanup and zero downstream leakage are asserted. The benchmark records 16
bounded privacy surfaces with zero canary, raw-field, private-path, and logger
matches.

Direct hostile Deep/A4 merge proof keeps deterministic HIGH risk and Evidence
provenance/floors, fills only the legitimate requested semantic gap, preserves
hypotheses as hypotheses, and keeps alternatives
`MODEL_SUGGESTED / UNVERIFIED`.

## Corrected benchmark

Artifact: [`r5-phase10-measurements.json`](evidence/r5-phase10-measurements.json).  
Policy: [`AdvisoryLatencyPolicy.md`](AdvisoryLatencyPolicy.md).

The corrected stage lanes include their named merges inside the timed work:

- Fast scheduler + execute + A2: P99 `0.647 ms`, MAX `0.690 ms`.
- Evidence collect + overlay + A3: P99 `1.075 ms`, MAX `1.491 ms`.
- Deep scheduler + execute + A4: P99 `1.996 ms`, MAX `2.388 ms`.
- Browser presentation/query: P99 `0.334 ms`, MAX `0.652 ms`.
- Composed A1 → A2 → A3 → A4 → terminal Browser: P99 `2.316 ms`, MAX
  `2.385 ms`; evidence-enriched Deep input, A4 supersession, and terminal
  `stage=complete` / `status=ready` were asserted.

Candidate exact-SHA benchmark smoke and full both passed (8 and 100 heavy
iterations respectively). Fast/Deep timeout remained 5000 ms with
`maxConcurrent=2` and `maxPending=8`; no production value was tuned from local
measurements. External provider latency remains
`NOT_VALIDATED_EXTERNAL_PROVIDER / NOT_RUN`.

## Validation matrix

All affected and inherited gates passed: P10 focused (10 files / 31 tests),
P5 (4 / 23), P8 (5 / 21), P9 (6 / 20), typecheck, build, Host/Client export,
declaration/root-export audit, pack, diff check, scope/privacy/no-network/
no-provider/no-registry/no-Git-remote checks, no custom Risk Advisor Session
event, and Harness mutation=0. The candidate exact-SHA benchmark smoke/full
and AppReady cold-start gates passed.

The fresh complete run also passed every inherited group: R1 2/9, R2 2/16,
R3 2/17, R4 2/21, R5 1/3, P1A 2/13, P1B 2/14, P1C 1/8, P2 2/15, P3 2/17,
P4 2/17, P5 4/23, P6 5/27, P7 6/26, P8 5/21, P9 6/20, and P10 10/31.

## Fresh complete Full

Exactly one fresh complete `pnpm test` ran on the exact Tested SHA
`01a26b2e14cf7c5ec4102dd4d70b6550f2b1d036`, after the executable/test/config/
package/benchmark candidate was committed. Result: PASS — 17 scripted groups,
56 test files, 298 tests. No intended tracked drift was present before Full;
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

Codex does not perform final acceptance. This report is ready for independent
ChatGPT Web review.
