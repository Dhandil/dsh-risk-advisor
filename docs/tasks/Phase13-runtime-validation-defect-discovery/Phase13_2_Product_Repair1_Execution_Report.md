# Risk Advisor Phase 13.2 Product Repair1 — Execution Report

## Provenance

- Baseline (`origin/main` at implementation start): `08d3a112bdc64de3ce40f40b2763c5284ef0200c`
- Exact executable candidate: `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`
- Candidate parent: `08d3a112bdc64de3ce40f40b2763c5284ef0200c`
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Candidate branch: `codex/phase13-2-product-repair1`
- Runtime: Node `v24.21.0`; pnpm `11.7.0`

The executable candidate changes only `src/host/retry-escalation.ts` and the focused Product regressions in `tests/p3-retry-escalation.unit.spec.ts` and `tests/p12-1-live-correction.spec.ts`. No Phase 13 validation harness/truth, Harness Core, package, configuration, benchmark, F1 predicate, or F2 implementation was changed.

## Repair

Retry relation capture now stores only the immediately preceding Tool execution ordinal for that Session. A predecessor must have the same supported fingerprint and pass the existing settlement, TTL, conflict, and causality checks before it can create a retry edge. Different, unsupported, unreadable, missing-ID, or capacity-rejected intervening Tool attempts remain one-record barriers, so history cannot be searched backward to reconnect an older matching fingerprint. Public `FailureChainSummary` remains unchanged and exposes no fingerprint.

The focused proofs cover the frozen P1–P18 contract:

- P1 and P10: adjacent exact failures and three contiguous failures retain the existing retry chain.
- P2–P4: changed read path, write content, and bash command each start a new path.
- P5–P6: A/B/A and A-fail/B-fail/A-fail do not reconnect the third A to the first.
- P7: unsupported and unreadable same-Session Tool attempts block reconnection.
- P8–P9: same-fingerprint success remains a chain break; pending/overlapping evidence remains fail-closed.
- P11–P15: same-root-cause, semantic overlay, TTL/capacity/truncation, Session isolation, and privacy regressions remain covered by existing Product proofs.
- P16–P17: adjacent exact failure emits one F1; the third A in A/B/A emits no F1.
- P18: relevant Phase 3, Phase 7, Phase 10 retry, Phase 12.1, and Phase 13.1 regressions pass.

## Verification

- `pnpm run test:p3`: **2 files, 21 tests passed**.
- `pnpm run test:p12.1`: **1 file, 34 tests passed**.
- `pnpm exec vitest run tests/p7-failure-chain.integration.spec.ts`: **1 file, 3 tests passed**.
- `pnpm exec vitest run tests/p10-retry-semantic.integration.spec.ts`: **1 file, 2 tests passed**.
- `pnpm exec vitest run tests/p10-package-contract.spec.ts tests/p10-boundary.integration.spec.ts`: **2 files, 4 tests passed**.
- `pnpm run typecheck`: **PASS**.
- `pnpm run build`: **PASS**.
- `git diff --check`: **PASS**.
- Phase 13.1 regression, from a clean baseline worktree at `08d3a112bdc64de3ce40f40b2763c5284ef0200c`: **45 tests passed**. Its bounded H18 smoke completed 13 scenarios / 19 Tool executions with F1 TP/FP/FN/TN `3/0/0/16` and F2 `2/0/0/17`. This is a harness regression only; no 300/1500 campaign was run.

The Phase 13.1 harness also asserts that Product/config diffs from `origin/main` are absent. Running it in the implementation worktree therefore produced the expected H18 scope-guard failure while the Product repair was uncommitted; the clean-baseline rerun above passed all 45 tests. The validation harness and its truth were not modified.

- Complete `pnpm test`: **NOT RUN**.
- Phase 13.2 300/1500 campaign: **NOT RUN**.
- Provider/model/LLM/Judge/subagent calls: **0**.
- Phase 13.2 Product Repair1: **published for architecture review; not declared accepted**.
