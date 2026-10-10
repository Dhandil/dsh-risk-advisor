# Phase 14.4 Repair1 Execution Report — Optional Client Isolation and Store Bounds

## Candidate and scope

- Starting branch lineage: `codex/phase14-4-online-correction-context` at report commit `2ad0cf83a2fe0488a1141bff86f43f1498f500dc`.
- Previous tested executable retained unchanged: `58a275fd35911a5f63c77e33f35b9e242a527673`.
- Previous Full retained unchanged: 76 test files / 517 tests passed; its original execution report remains `Phase14_4_Execution_Report.md`.
- Repair implementation commit: `6f9f4aba8c4160664b43af9e06aebadfb0a1bb35`.
- Final tested executable candidate: `ecf84c29a0ca9114ff7cd2779dca6ec021d1b699`.
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Repair branch: `codex/phase14-4-repair1-client-isolation`; `main` was not changed.

Only B1–B2 were repaired. `OnlineCorrectionDock` now treats the optional Correction Historical Context source as fail-closed, catches its render/lifecycle failures, validates its snapshot before display, and gates the subordinate note on successful configuration and retention. Session/Finding checks prevent another Session's optional note from appearing. The original Online Correction F1/F2 findings remain rendered by their existing source and fixed text.

`CorrectionHistoricalContextClient` now manages at most 64 Session stores. It retains one stable store while a Session is retained, keeps released stores idle for at most 60 seconds, and reclaims the least-recently-used idle store under capacity pressure. If all stores are retained, the new Session receives an inert source; only its optional historical note is disabled. Store construction, start/stop, timer and disposal failures are contained. Phase 12 Finding contracts and all Host/RPC behavior are unchanged.

## B1–B2 regression evidence

- Exception injection covers `getSource`, `setFinding`, `retain` and `release`; disposed Client calls return an inert source/failure result rather than throwing. In all cases the original F1 and F2 text and Dock remain visible.
- Capacity tests verify the production maximum of 64, disable only optional history when all slots are active, reclaim an idle store, and preserve active Session sources.
- Release/remount tests prove a store remains stable through a quick remount and is disposed after its idle retention expires.
- Batch switching test visits 128 Sessions with a test capacity of four; active stores remain stable and old idle stores are reclaimed.
- Final candidate Client-focused regression: **9 tests passed**. The complete Phase 14.4 stage in Full passed **18 tests**.

## Required gates

| Gate | Result |
|---|---:|
| Phase 14.4 focused Host/Client/performance suite before the last test-only addition | 17 / 17 passed |
| Final candidate Client-focused suite | 9 / 9 passed |
| Phase 12.1 Live Correction | 34 / 34 passed |
| Phase 12.2 Online Correction | 31 / 31 passed |
| P10 Client HMR lifecycle | 1 / 1 passed |
| Typecheck | Passed after final source and test changes |
| Production build | Passed on final candidate; Client bundle 190.13 kB |
| `npm pack --dry-run --json` | Passed; 84 package entries, including `lib/client.js` and Client declarations |
| Client export/declaration | `@dhandil/dsh-risk-advisor/client` resolved to `lib/client.js`; matching declarations were included |
| Browser bundle smoke | Passed; module loaded as `@dhandil/dsh-risk-advisor`, expected React/JSX/Harness UI externals only, `apply`, `CorrectionHistoricalContextClient` and `OnlineCorrectionDock` exported, no load error |
| Browser runtime dependency scan | No `node:` built-in reference in `lib/client.js`; SHA-256 `6c3bb627996d6db786bf941385f4a633b6424cb798fc297e7b2f08b2d36babb8` |
| Static/diff | `git diff --check` passed; repair commits touch only `OnlineCorrectionDock.tsx`, `correction-historical-context-client.ts` and its Client regression spec; package manifest and lockfile unchanged |

The final Full also reran every frozen stage, including Phase 11.1–11.4, Phase 12.1/12.2, Phase 14.1–14.4, P1C, P6 and P10. The Phase 14.4 measured Host lookup p95/p99 was 0.0435/0.0869 ms at 1 qualified identity, 0.0651/0.1321 ms at 1,000 and 0.0348/0.0685 ms at 3,333. Complete synchronous pre-execute capture measured p95 0.1403 ms / p99 0.2305 ms. The tested path performs no historical storage read on Tool execution.

## Final fresh Full

- Exact candidate SHA before start: `ecf84c29a0ca9114ff7cd2779dca6ec021d1b699`.
- Command: one fresh complete `pnpm test`.
- Attempt: `phase14-4-repair1-full-ecf84c2`.
- Environment: detached isolated worktree `.p14-4-repair1-full-6f9f4ab`; `../../deepseek-harness` resolved to the pinned Harness SHA above. Frozen offline install reused the lockfile packages without downloads. Candidate and Harness tracked trees were clean before the attempt.
- Result: **76 test files / 521 tests passed**, 27 sequential stages, exit code 0.
- Captured output: `/tmp/phase14-4-repair1-full-ecf84c2.log`.
- No executable, test, package, configuration or benchmark changes were made after Full.

## Preserved artifacts and report lineage

The original 517/517 Full worktree, original Phase 14.4 report, implementation worktree's pre-existing untracked `lib/`, `node_modules/` and `.vitest-cache/`, and the pinned Harness checkout were preserved. The new detached Full worktree and its generated `lib/`, `node_modules/` and `.vitest-cache/` remain available. The Harness checkout remains at its pinned SHA with a clean tracked tree; its pre-existing untracked `deepseek-harness/` directory was not modified. The temporary local Browser smoke page was closed and its localhost server stopped; Playwright returned to its pre-existing `about:blank` tab.

This report is docs-only and follows the exact tested candidate. It does not alter the original execution report, amend the Architecture Freeze, merge `main`, or declare Phase 14.4 accepted. Remote branch/report verification is recorded by the pushed branch head and task result.
