# Phase 14.3 Execution Report

**Status: BLOCKED — fresh complete test stopped before test collection because the isolated checkout could not resolve the pinned Harness TypeScript configuration.** This report records the single Full attempt. It was not retried, and this report does not claim Phase 14.3 acceptance.

## Source identity and lineage

- Accepted starting `origin/main`: `61200a257b00a42942d3bbe4070ebd46521b218e`
- Implementation branch: `codex/phase14-3-native-approval`
- Tested executable candidate: `3b23d05b6ec64d68ddc211fe5dfb3154984f0982`
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- The implementation commit is a direct child of the accepted starting main. Main was not changed or merged.

## Scope

The candidate adds a separate, read-only `risk-advisor/approval-historical-context` route for the existing native approval detail. The request contains only `sessionId` and `callId`; the Host resolves a unique open BOUND approval, projects its stable pre-execution A1 identity, reads the current qualified Pattern's active Guidance, and rechecks authority before returning. The existing Phase 14.2 ordinary history endpoint is unchanged.

The existing approval detail gets a separate, initially collapsed advisory section. It is gated by the live Session-scoped pending approval key and READY/BOUND risk presentation. Its in-memory Client store is single-flight, limited to one read per second, fenced on key/session/connection changes, and expires at the remaining Host `observedAt` freshness window. The section is optional and does not change the risk card, native controls, Tool decision path, or Phase 11 history writers.

No Harness files, frozen architecture documents, Phase 11 schemas, Phase 14.1 risk semantics, Phase 14.2 ordinary-history semantics, or F1/F2 contracts were modified. Phase 13.3/14.4 were not started; no provider or subagent calls were made.

## A1–A12 and regression gates

The new A1–A12 matrix passed: **2 files, 9 tests**. Its qualified-history fixtures use the trusted Episode → Outcome → Pattern → Guidance pipeline. Coverage includes stable A1 identity when A2 changes, concurrent ordinary execution, exact Session/call binding, ambiguous/closed/fallback cases, retraction, request/response privacy, UI optionality, pending-key races, delayed freshness edges, and unchanged approval/risk state.

Final focused and regression results before the Full attempt:

| Gate | Result |
| --- | ---: |
| Phase 11.1 | 2 files, 20 tests passed |
| Phase 11.2 | 1 file, 17 tests passed |
| Phase 11.3 | 1 file, 16 tests passed |
| Phase 11.4 | 1 file, 20 tests passed |
| Phase 14.1 | 3 files, 23 tests passed |
| Phase 14.2 | 3 files, 17 tests passed |
| Phase 14.3 A1–A12 | 2 files, 9 tests passed |
| P1B / P1C | 2 files / 14 tests; 1 file / 10 tests passed |
| P6 / P10 | 5 files / 35 tests; 12 files / 35 tests passed |
| Phase 12.1 / Phase 12.2 | 1 file / 34 tests; 1 file / 31 tests passed |
| Typecheck / production build | Passed |
| `npm pack --dry-run --json` | Passed; 78 package entries including new declarations |
| `git diff --check` and P10 privacy/package/boundary gates | Passed |

The initial P10 and Phase 14.1 reruns exposed stale test expectations for the added optional route count. Only those assertions were corrected; both full relevant suites then passed. The final candidate includes those regression updates.

## Browser package and privacy evidence

The production `lib/client.js` bundle was loaded in the real Chrome browser through its module-loader entry using test-only React/Harness dependency stubs. The loader returned the expected Risk Advisor module, Client export, approval-detail component, and new endpoint. The generated Client bundle SHA-256 was `b5389b36a6df43b33d92714a2e1eb55c7dbdb6d9d8fa33813bd9c9093da9e2ee`. A source/artifact scan found no `node:` runtime import in the browser Client bundle and no raw-argument, path, or approval-justification fields in the new Client protocol/store modules. The local one-shot HTTP server, browser tab, and temporary fixture directory were closed/removed after this check.

The route response remains bounded to 24,000 serialized characters and contains only the frozen HistoricalContextV1 fields plus opaque Host correlation identifiers. Client requests do not include the Client-local approval key. No Tool/approval waterfall I/O was added.

## Performance

The same controlled Mac test environment used actual qualified history at all checkpoints. The capacity bound was **3,333 qualified Pattern/Guidance identities**, backed by **9,999 Episodes** and **19,998 Outcome revisions**. The separate 60,000 case is synthetic identity-index pressure with one real active row; it is not represented as 60,000 qualified histories.

Measured approval-bound Host lookup latency (milliseconds):

| Qualified Pattern/Guidance identities | p50 | p95 | p99 |
| ---: | ---: | ---: | ---: |
| 1 | 0.0189 | 0.0529 | 0.1514 |
| 1,000 | 0.0312 | 0.0500 | 0.0727 |
| 3,333 | 0.0219 | 0.0333 | 0.0460 |

All meet the frozen Host lookup limits of p95 ≤5 ms and p99 ≤10 ms. Phase 14.2 direct indexed lookup p95/p99 at 1, 1,000, and 3,333 were respectively 0.0006/0.0007 ms, 0.0015/0.0046 ms, and 0.0016/0.0020 ms. Synthetic 60,000-entry exact-read p95/p99 was 0.008/0.0116 ms. Client cadence, single-flight, cancellation, and freshness are covered by deterministic tests; network latency was not benchmarked because the performance fixture measures the local Host route directly.

## Fresh complete test attempt

After the focused, static, build, browser-bundle, export/declaration, and package gates passed, a fresh detached worktree was created for the exact candidate and installed with `pnpm install --frozen-lockfile`. The candidate SHA and tracked-clean state were rechecked after installation; the pinned Harness SHA also matched.

The single `pnpm test` attempt was run in `/tmp/p14-3-full-3b23d05`. The package script entered `test:r1`, but Vitest stopped before collecting any tests with:

```text
[TSCONFIG_ERROR] Failed to load tsconfig '../../deepseek-harness/tsconfig.base.client.json': Tsconfig not found
```

The isolated worktree was under `/tmp`, while the repository's Vitest aliases resolve the pinned Harness through a sibling-relative `../../deepseek-harness` path. Consequently **0 test files and 0 tests ran** in the Full attempt. This is recorded as a failed Full gate, not a product pass. Per the frozen instructions, it was not repaired or rerun on this candidate. The test worktree is retained at `/tmp/p14-3-full-3b23d05` for review.

## Working tree and publication

Implementation and tests are committed in the implementation commit above. Generated/untracked `lib/`, `node_modules/`, and `.vitest-cache/` remain local and were not staged. Existing Harness and other worktrees were preserved. The execution-report commit is docs-only. This candidate is submitted for independent architecture review with the Full infrastructure blocker disclosed; no ACCEPTED status is claimed.
