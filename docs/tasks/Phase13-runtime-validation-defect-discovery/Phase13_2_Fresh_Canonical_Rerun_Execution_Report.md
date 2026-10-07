# Phase 13.2 Fresh Canonical Rerun — Execution Report

## Result

`RISK_ADVISOR_PHASE13_2_BLOCKED_PRODUCT_REPAIR_REQUIRED`

The fresh campaign stopped at its first Product P1 blocker. It was not repaired or rerun. This is a blocker report, not an acceptance declaration.

## Frozen inputs and preflight

- Campaign run ID: `phase13-lane-a-canonical-v2`
- Seed: `phase13-lane-a-canonical-v1`
- Main / `origin/main` / `git ls-remote`: `a9283b44072bf16ae4b7e7badfc8493cadd0af7b`
- Accepted Product: `28d3d204376da0a43279b949a3ceea794212d10c` (ancestor of main)
- Accepted validation Repair2: `0904afe035232f6d9faab2fd539018b6e1c4263b` (ancestor of main)
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Regenerated canonical manifest: 300 scenarios, 1,500 planned Tool executions, 12 families, 300 distinct session identities
- Run policy: `maxScenarios=300`, `maxToolExecutions=1500`
- Manifest SHA-256: `110d6aa6603aa906f861868161febb4dbe5a3a190484aa2764cf79b7b7602f4b`
- Canonical manifest size: 381,728 bytes
- Independent regeneration replay: byte-identical, same SHA-256
- Full settlement capability prevalidation: PASS for all manifest steps
- Provider/model/LLM/Judge/Deep Judge/subagent calls: 0

The campaign used a new v2 workspace. No Campaign-1 run ID, ledger, or metrics were read or reused. Before execution, the Product source/tests/package/config diff from the accepted Product SHA was empty. No Product, validation-harness, package, or configuration files were changed for this run.

## Execution and blocker

The single campaign invocation stopped after **1 scenario and 5 Tool executions**. The hash-chained truth ledger verifies as `VALID`, completed with a `BLOCKED_P1` run end, and contains 9 records. Ledger head: `04db8797615a9689dc2434a0f629c1da0d3b9bfb5dd6b02ec6feff262fbf0c24`.

The blocker is `FROZEN_CONTRACT_MISMATCH`, classified as Product P1. The minimal reproducer identifies scenario `lane-a-s000-A5` (`A5_CHANGED_ARGUMENT_RETRY`), step `lane-a-s000-A5-t05`, operation `read-different-failure`: after a changed-argument failure, the observed finding was `REPEATED_FAILURE_WITHOUT_PROGRESS`, while both expected F1 and F2 were `NOT_EXPECTED`. The independent classification is F1 `FP`; F2 `TN`.

The run stopped at that issue as required. No additional scenarios were executed, and no in-place repair or second campaign was attempted.

## Partial metrics at stop

These are only the five executed Tool rows; they are not full-campaign metrics.

| Measure | F1 | F2 |
| --- | ---: | ---: |
| TP | 0 | 0 |
| FP | 1 | 0 |
| FN | 0 | 0 |
| TN | 4 | 5 |

- Duplicate findings: 0
- Wrong-session findings: 0
- Resurrected findings: 0
- Finding-lifetime violations: 0
- Process-class mismatches: 0
- Capture-invalid events: 0
- Upstream-verification blockers: 0
- Environment blockers: 0
- Validation blockers: 0
- Product P1 blockers: 1
- Opportunity candidates planned in the complete manifest: A4 `50`, A5 `50`; all other families `0`
- Opportunity candidates observed before stop: A5 `2`; all other families `0`

The expected plan distribution was A1 1, A2 1, A3 100, A4 25, A5 25, A6 10, A7 1, A8 50, A9 1, A10 50, A11 21, and A12 15 scenarios. This distribution is manifest evidence only; execution did not reach the full plan.

## Scope and disposition

No complete `pnpm test` was run. No Phase 13.3 work began. The campaign workspace, truth ledger, and minimal reproducer remain preserved in the local temporary Phase 13 workspace. The only repository change for this report is this documentation file.
