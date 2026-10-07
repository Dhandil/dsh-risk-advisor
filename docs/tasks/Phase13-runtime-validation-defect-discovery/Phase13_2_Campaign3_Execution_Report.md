# Risk Advisor Phase 13.2 Campaign-3 — Execution Report

## Status

`RISK_ADVISOR_PHASE13_2_CAMPAIGN3_READY_FOR_ARCHITECTURE_REVIEW`

Campaign-3 completed the frozen deterministic Lane A plan with no blocker.

## Provenance and preflight

- Exact starting main: `3d3c8ba6def548947ee47fd3ea4ec84728809478`
- Accepted Product executable: `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`
- Accepted validation Repair2: `0904afe035232f6d9faab2fd539018b6e1c4263b`
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Product executable/tests/package/config tree drift: **0**
- `validation/phase13/` tree drift from accepted Repair2: **0**
- Campaign worktree tracked status before execution: **clean**
- Runtime: Node `v24.21.0`; pnpm `11.7.0`

The Campaign-3 authorization names `40d4dd1d4766f2b14befdd1ceb23f673c430d040` as its main baseline. That commit is an ancestor of the instructed current main above; the intervening main commit adds only the Campaign-3 authorization and execution instructions. No Product, validation, package, configuration, or benchmark drift was present.

Runtime setup note: the first driver load stopped before the campaign runner started because the frozen-install `node_modules` did not include the Harness `dsh-system-prompt` peer package. No Tool execution or campaign workspace allocation occurred in that attempt. The missing package was linked only inside this worktree's untracked `node_modules` to `deepseek-harness/packages/core/system-prompt` at the pinned SHA; a subject create/dispose check then passed with 0 Tool executions. No tracked source, lockfile, validation, or Harness file changed. The campaign itself was started once after that setup check.

The manifest was freshly generated for this run from the frozen operation registry and deterministic family plan. Campaign-1 and Campaign-2 manifests, ledgers, and run identities were not read or reused. The locally retained generator source SHA-256 is `d2f52fc3ffb6c2b1cfa12cfd7aa7079a516e5807f88b13b5ff198313375f63a5`.

## Frozen manifest

- `campaignRunId`: `phase13-lane-a-canonical-v3`
- Seed: `phase13-lane-a-canonical-v1`
- Generator: `phase13-generator-v1`
- Run policy: `maxScenarios = 300`, `maxToolExecutions = 1500`
- Manifest: **300 scenarios / 1500 Tool steps**
- Canonical manifest SHA-256: `2420af40c22a370b7feb42b1a55c66a0d3f94fea66a4a6066727d8f1bcee11cf`
- Deterministic replay: **byte-identical**
- Settlement capability prevalidation: **PASS**, no mismatch or unresolved operation
- Family count: **12**; unique Sessions: **300**

| Scenario family | Scenarios |
| --- | ---: |
| success-no-finding | 10 |
| isolated-failure-no-f1 | 10 |
| exact-repeat-f1 | 25 |
| changed-operation-no-f1 | 25 |
| changed-argument-no-f1 | 25 |
| success-breaks-retry-chain | 25 |
| direct-f2-matched | 40 |
| direct-f2-fault-fixture | 25 |
| async-f2-matched | 40 |
| async-f2-fault-fixture | 25 |
| unsupported-verification | 20 |
| multi-session-isolation | 30 |

The plan contains 160 expected F1 positives / 1340 expected F1 negatives; 250 expected F2 positives / 430 expected F2 negatives; 100 changed-operation transitions; 100 changed-argument transitions; 50 success-break steps; 150 multi-Session isolation steps; and 150 unsupported-verification steps.

## Campaign result

- Result: **COMPLETE**
- Scenarios: **300 / 300**
- Tool executions: **1500 / 1500**
- Ledger records: **2102**, independently re-read and verified `VALID` and complete
- Ledger head hash: `f6dee6a5b5e4eab4d76190bd542ff7fc2fc492dde8956fba5158d265f0d05dc9`
- Findings observed: **410**

| Signal | Expected positives | Expected negatives | TP | FP | FN | TN | NA | Unscorable | Precision | Recall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| F1 | 160 | 1340 | 160 | 0 | 0 | 1340 | 0 | 0 | 1.0 | 1.0 |
| F2 | 250 | 430 | 250 | 0 | 0 | 430 | 820 | 0 | 1.0 | 1.0 |

| Integrity / lifecycle counter | Count |
| --- | ---: |
| Duplicate Finding | 0 |
| Wrong-Session Finding | 0 |
| Resurrected Finding | 0 |
| Finding lifetime violation | 0 |
| Capture failure | 0 |
| Upstream verification missing | 0 |
| Environment failure | 0 |
| Opportunity candidates | 0 |

All provider, model, LLM, Judge, Deep Judge, and subagent calls were **0**. No real provider or model was invoked. Complete `pnpm test` was **not run**. Phase 13.3 was **not started**.

## Local evidence

Raw evidence remains outside the repository at:

`/var/folders/hw/qdgfkb9x3yb40j8bc_ps8nm80000gn/T/dsh-risk-advisor-phase13-campaign3-evidence/phase13-lane-a-canonical-v3/`

It contains the canonical manifest and byte-identical replay, preflight identities and quota counts, campaign summary, verified ledger metadata, and the generator/TypeScript loader sources. The verified ledger is retained in the disposable campaign workspace. The workspace was cleaned of scenario directories after completion and contains only `truth-ledger.jsonl`.

This report records execution evidence only. It does not declare Phase 13.2 accepted and does not authorize Phase 13.3.
