# Risk Advisor Phase 13.1 Maintenance Repair2 — Execution Report

## Candidate

- Base `origin/main`: `f190a850ec493f5d5fe4c0441d55a2ca7b2862ce`
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Implementation candidate: `0904afe` (`fix(validation): prevalidate Phase 13 settlement capability`)
- Branch: `codex/phase13-1-maintenance-repair2`
- Executable changes are confined to `validation/phase13/`.

## Repair summary

The validation-owned operation registry now declares exactly one `NONE`, `DIRECT`, or `ASYNC_SUPPORTED` verification capability per operation. Campaign startup validates every manifest step against that capability before workspace allocation or Tool execution. Incompatible manifests return `BLOCKED_VALIDATION` with zero scenarios and zero Tool executions; `NONE` operations never enter verifier settlement.

Blocker mapping is explicit: supported-operation `UPSTREAM_VERIFICATION_MISSING` maps to `BLOCKED_UPSTREAM`; unknown issue codes and capability mismatches map to `BLOCKED_VALIDATION`; frozen Product contract mismatches remain `BLOCKED_P1`; wrong-session Findings remain `BLOCKED_P0`. Upstream reproducer evidence records only bounded scenario/step/operation labels, capability and settlement values, expected F2 label, execution-ID presence, `MISSING`, and the ledger head hash. It does not persist the execution ID itself. The ledger accepts both new terminal blocker statuses.

## Verification

- Phase 13.1 focused suite: 1 file, 45 tests passed; includes M1–M15, H1–H18, K1–K12, and the bounded smoke/replay checks.
- Phase 13.1 TypeScript check: passed with `tsc -p validation/phase13/tsconfig.json --noEmit`.
- P3/P7/P10/P12 regressions: 22 files, 141 tests passed.
- Bounded smoke: `COMPLETE`, 13 scenarios, 19 Tool executions; F1 3 TP / 16 TN, F2 2 TP / 17 TN, with no FP/FN.
- Provider/model/LLM/Judge/Deep Judge/subagent calls: 0.
- Complete `pnpm test`: not run. Phase 13.2 was not rerun.

The initial `pnpm exec` attempt stopped before running a gate because pnpm tried to reconcile the pre-existing `node_modules` symlink and refused to remove it without a TTY. The symlink was preserved; the same focused commands were run through the already-installed local `tsc` and `vitest` binaries, and all reported gates passed.

No Product `src/`, Harness Core, package, lockfile, or root configuration changes were made. The existing untracked `lib/`, `node_modules/`, and `.vitest-cache/` were preserved.

## Result

`RISK_ADVISOR_PHASE13_1_MAINTENANCE_REPAIR2_READY_FOR_ARCHITECTURE_REVIEW`
