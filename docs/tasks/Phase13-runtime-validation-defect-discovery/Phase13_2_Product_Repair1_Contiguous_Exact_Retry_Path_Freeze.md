# Risk Advisor Phase 13.2 — Product Repair1: Contiguous Exact Retry Path Freeze

## Status

`RISK_ADVISOR_PHASE13_2_PRODUCT_REPAIR1_FROZEN_READY_FOR_IMPLEMENTATION`

This repair fixes the Product P1 discovered by Campaign-2:

`PRODUCT_NON_ADJACENT_RETRY_RECONNECTION_DEFECT`

## Scope

Primary Product code:

`src/host/retry-escalation.ts`

Relevant Product tests may be modified or added.

Do not modify the accepted Phase 13 validation harness unless a separate validation defect is discovered.

Do not modify Harness Core.

## R1 — Immediate predecessor authority

At pre-execution capture, each supported current execution must bind relation eligibility only to the immediately preceding Tool execution record in the same Session.

Do not search backward for the nearest matching historical fingerprint.

## R2 — Fingerprint change breaks path

If immediate predecessor fingerprint differs from current fingerprint:

- no `retryOf`;
- no inherited retry chain;
- current execution starts a new path;
- older matching fingerprints cannot be used.

## R3 — Unsupported predecessor fails closed

If the immediate predecessor has no supported fingerprint:

- no retry edge;
- do not bypass it to older history.

The current execution itself may remain diagnosable according to existing status semantics, but must not reconnect historical exact retry state.

## R4 — Exact predecessor failure remains eligible

If immediate predecessor:

- has exactly the same fingerprint;
- is settled;
- is an eligible failure;
- is within TTL;
- is not conflicted/truncated in a way that forbids relation;

existing retry semantics continue.

## R5 — Exact predecessor success remains chain break

A same-fingerprint immediate predecessor success remains a deliberate blocker.

No older matching failure may be used across that success.

## R6 — Overlap / pending behavior

If immediate predecessor is same fingerprint but its evidence is pending or otherwise not causally settled before current capture:

- no retry edge;
- preserve existing fail-closed/degraded semantics;
- do not jump to an older matching record.

## R7 — Captured relation immutability

Once a valid immediate-predecessor retry edge is captured, later evidence must not rewrite it to another historical predecessor.

Existing immutable captured-prior behavior remains.

## R8 — Public summary

No fingerprint values are exposed.

The public FailureChainSummary shape remains unchanged unless a strictly necessary bounded reason code is added.

Prefer no public-shape expansion.

## R9 — Live Correction unchanged

`src/host/live-correction.ts` should require no semantic change.

F1 continues to require:

- READY;
- not truncated;
- retryOf present;
- retryCount >= 1;
- recentFailureCount >= 2;
- sameRootCause === true.

## Required proofs

At minimum:

- **P1** exact adjacent failure -> failure still creates retryOf;
- **P2** adjacent changed read path -> no retryOf;
- **P3** adjacent changed write content -> no retryOf;
- **P4** adjacent changed bash command -> no retryOf;
- **P5** A/B/A non-adjacent fingerprint sequence -> third A does not retry first A;
- **P6** A failure / B failure / A failure -> third A starts new path;
- **P7** A failure / unsupported operation / A failure -> no reconnection;
- **P8** A failure / A success / A failure -> no reconnection across success;
- **P9** A failure / A pending overlap / A failure remains fail closed;
- **P10** three contiguous A failures still produce retryCount/recent chain correctly;
- **P11** sameRootCause true/false/unknown behavior unchanged;
- **P12** semantic failure overlay behavior unchanged;
- **P13** TTL/capacity/truncation behavior unchanged;
- **P14** Session isolation unchanged;
- **P15** privacy/no raw fingerprint exposure unchanged;
- **P16** Live Correction F1 positive adjacent case still emits exactly one F1;
- **P17** Live Correction A/B/A case emits no F1 on third step;
- **P18** relevant Phase 3 + Phase 12 regressions PASS.

## Verification policy

Run:

- focused Repair1 tests;
- full relevant P3 retry-escalation tests;
- relevant P12 Live Correction tests;
- Phase 13.1 validation focused/smoke regression;
- TypeScript/static gates.

Do not run the full Phase 13.2 300/1500 campaign during implementation.

A fresh canonical campaign is authorized only after architecture review and final acceptance.

Provider/model/Judge/subagent calls = 0.

## Boundary

Do not:

- add new Finding kinds;
- broaden F1;
- add semantic task inference;
- use historical Pattern/Guidance;
- call a model;
- change F2;
- change approval/execution authority.
