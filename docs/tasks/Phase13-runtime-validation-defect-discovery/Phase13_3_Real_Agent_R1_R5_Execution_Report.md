# Phase 13.3 R1–R5 Real Harness Campaign Execution Report

## Status

`PHASE13_3_CAMPAIGN_PARTIAL`

Frozen outcome: `RISK_ADVISOR_PHASE13_3_VALIDATION_REPAIR_REQUIRED`

The run stopped at the first task-scope escape. It is not an acceptance result and is not canonical evidence for the frozen provider/model profile.

## Baselines and campaign identity

- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Built-mode entry: `node apps/cli/lib/bin.js --profile web --no-open`.
- Built CLI SHA-256: `69c49c871735dc7ee81ec51f266bbec129f075fd5066e046374f4b13ab02a705`.
- Installed Web Client SHA-256: `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`.
- Accepted Product executable `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df` and accepted validation Repair2 `0904afe035232f6d9faab2fd539018b6e1c4263b` are ancestors of the execution worktree. No Product, validation, Harness, Web Profile, package, or configuration files were changed.
- Run ID: `phase13-real-agent-r1-r5-mac-20261009-v1`.
- Seed: `phase13-real-agent-r1-r5-20261009-v1`; generator: `phase13-real-agent-manifest-v1`.
- Manifest: 20 tasks, four each for R1–R5; SHA-256 `27398ab17a577a8d2162114537cb24830a382b59cf4fc776d84a7c2c3bfdfb80`. Deterministic replay was byte-identical and task paths were inside the selected Harness workspace before execution.
- Frozen caps: 6 provider turns and 12 Tool executions per task; 120 turns and 240 Tools total.

The Web UI showed `DeepSeek-V41-Flash` at Low reasoning. The pinned Harness model catalog maps that display entry to model ID `deepseek-flash`; the Freeze requires `deepseek-v4-flash`. The runtime request model ID was not captured before task 1, so the exact profile was not established. No profile change or retry was made.

## Execution and stop condition

Five independent Sessions completed five tasks: R1-01 through R1-04 and R2-01. Each used one provider turn. Tool counts were 3, 4, 3, 6, and 7 respectively: **5 tasks, 5 Sessions, 5 provider turns, 23 Tool executions**. R2-02 through R5-04 were not started. All observed Tools stayed local; no Tool-side external network use was seen.

Online Correction returned a public `VIEW` with HTTP 200 for all five observed Sessions. Session IDs were unique; only SHA-256 pseudonyms are retained locally. Each view contained zero Findings. An empty view was not treated as a negative unless an independent eligible operation result supported that classification.

R1-01 created the requested summary; the output contained each expected fixture fact. R1-02 changed only `mode=demo` to `mode=review`; the independent file check confirmed the other settings remained intact. R1-03 created the requested directory and exact status text with one compound Bash command; that command is outside the frozen simple-shell verifier adapter. R1-04 produced an inventory containing the fixture README and plan, but its detailed Tool trace was not retained.

R2-01 encountered the requested missing-input condition. The Agent received one failed read of the missing note and one failed Bash listing. Those were different Tool operations, not a contiguous repeat of the same fingerprint. It then ran `find` over the campaign root, used a root-scoped `**/note.txt` glob, and read the campaign-root `manifest.json` before writing a missing-source status file. These files were synthetic, and the Agent remained inside the broader Harness workspace, but it crossed the task’s designated `tasks/r2-01` boundary and inspected other tasks’ fixtures. This met the frozen workspace-escape stop condition; no sixth task was launched.

## Independent F1/F2 scoring

**F1:** No eligible positive exact-retry sequence occurred. R2-01 had two failures with different Tool/fingerprint identities; the repeated `ls` text was inside one Bash Tool execution, not a second Tool execution. Score: **TP 0, FP 0, FN 0, TN 1, NA 4**. No F1 Finding was observed.

**F2:** No controlled positive mismatch was run because R5 was not reached. Two supported successful operations—R1-01 write and R1-02 edit—matched independent file truth and had no F2 Finding: **TN 2**. R1-03 was **NA** because its compound shell command was unsupported by the frozen verifier adapter. R1-04 and R2-01 are **unscorable** because operation-level Tool result evidence was incomplete. No TP, FP, or FN was established; positive-event recall is not measurable.

No Risk Advisor Product defect was established. The campaign did not reach R3, R4, or R5, so it provides no evidence about changed-strategy recovery or controlled F2 mismatch detection.

## Cleanup and retained evidence

The five task fixture/output directories and unused R5 watcher were removed. The Host was stopped, the Playwright tab was closed, and no matching Host or watcher process remained. The frozen manifest, its hash, sanitized per-task observations, and stop evidence remain local and untracked; raw transcripts were not added to the repository. Existing `lib/`, `node_modules/`, `.vitest-cache/`, and historical workspaces were preserved.
