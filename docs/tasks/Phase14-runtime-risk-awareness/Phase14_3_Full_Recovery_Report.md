# Phase 14.3 Full Infrastructure Recovery Report

**Result: PASS — the authorized recovery Full completed successfully on the original tested executable.** This report records test evidence only; it does not declare Phase 14.3 accepted.

## Identity and lineage

- Tested executable: `3b23d05b6ec64d68ddc211fe5dfb3154984f0982`
- Prior execution report: `b00a3192137f06fef32e8cfdde385f4d08eb12f2` (`Phase14_3_Execution_Report.md`, unchanged)
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Implementation branch: `codex/phase14-3-native-approval`
- Main before and after recovery: `61200a257b00a42942d3bbe4070ebd46521b218e`
- Recovery attempt ID: `phase14-3-full-recovery-20261010-01`
- Recovery worktree: `/Users/tongxin/Developer/Harness/harness-plugin/.p14-3-full-recovery-3b23d05`

## Prior failed attempt retained

The original attempt remains at `/private/tmp/p14-3-full-3b23d05` (also addressable as `/tmp/p14-3-full-3b23d05`) at the exact tested SHA. Its recorded result and cause remain in the prior execution report: Vitest stopped before collecting tests because that `/tmp` worktree could not resolve `../../deepseek-harness/tsconfig.base.client.json`. That worktree and report were not modified or removed.

## Recovery preflight

The recovery checkout is under `Harness/harness-plugin/`, so its configured `../../deepseek-harness` resolves to `/Users/tongxin/Developer/Harness/deepseek-harness`.

- Candidate SHA before and after frozen install/build: `3b23d05b6ec64d68ddc211fe5dfb3154984f0982`; tracked tree clean.
- `pnpm install --frozen-lockfile`: passed; Node `v24.21.0`, pnpm `11.7.0`.
- Harness SHA: `ddefc45fbc7f8e46dd73185e68295696d1297887`; tracked tree clean.
- `../../deepseek-harness/tsconfig.base.client.json`: exists at the resolved Harness path.
- Vitest config load: passed; 34 configured aliases, zero missing targets. A separate existence check covered all 24 configured Harness source/library targets.
- Product `pnpm build`: passed; `lib/client.js`, `lib/index.js` and `lib/types/client/index.d.ts` were present. Recovery-build Client bundle SHA-256: `e26a7750da608edc370afbc6c2a95c8858e7ae3f523ab0227078c5bd5b0cb667`.
- Remote implementation branch before recovery: `b00a3192137f06fef32e8cfdde385f4d08eb12f2`; remote main matched the required baseline.

All preflight checks passed before the Full command began.

## Fresh complete Full result

Command: `pnpm test`

Started: 2026-10-10 12:33:32 Asia/Shanghai

Completed: 2026-10-10 12:42:00 Asia/Shanghai

Exit: `0`

Result: **73 test files, 503 tests passed; 0 failed.**

| Suite | Files | Passed tests |
| --- | ---: | ---: |
| R1 | 2 | 9 |
| R2 | 2 | 16 |
| R3 | 2 | 17 |
| R4 | 2 | 21 |
| R5 | 1 | 3 |
| P1a | 2 | 13 |
| P1b | 2 | 14 |
| P1c | 1 | 10 |
| P2 | 2 | 15 |
| P3 | 2 | 21 |
| P4 | 2 | 17 |
| P5 | 4 | 23 |
| P6 | 5 | 35 |
| P7 | 6 | 26 |
| P8 | 5 | 21 |
| P9 | 6 | 20 |
| P10 | 12 | 35 |
| Phase 11.1 | 2 | 20 |
| Phase 11.2 | 1 | 17 |
| Phase 11.3 | 1 | 16 |
| Phase 11.4 | 1 | 20 |
| Phase 12.1 | 1 | 34 |
| Phase 12.2 | 1 | 31 |
| Phase 14.1 | 3 | 23 |
| Phase 14.2 | 3 | 17 |
| Phase 14.3 | 2 | 9 |
| **Total** | **73** | **503** |

Full-run performance evidence for real qualified history:

| Qualified Pattern/Guidance identities | Host lookup p50 / p95 / p99 (ms) |
| ---: | ---: |
| 1 | 0.0186 / 0.0422 / 0.0782 |
| 1,000 | 0.0290 / 0.0563 / 0.1365 |
| 3,333 | 0.0197 / 0.0332 / 0.0921 |

The 3,333 case used 9,999 qualified Episodes and 19,998 Outcome revisions. The separate synthetic 60,000-entry identity-index pressure case remains labelled synthetic, not qualified history. Its p95/p99 were 0.0083/0.0122 ms. The real-history Host lookup measurements meet the frozen p95 ≤5 ms and p99 ≤10 ms limits.

## Post-Full state

No executable, test, package, configuration, benchmark, lockfile, Harness, or Architecture Freeze files were changed after the Full run. The original execution report remains unchanged. This recovery report is docs-only and is published on the implementation branch for architecture review. No main merge or acceptance declaration was made.
