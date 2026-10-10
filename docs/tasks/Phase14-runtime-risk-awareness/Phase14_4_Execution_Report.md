# Phase 14.4 Execution Report — Online Correction Historical Context

## Candidate and boundaries

- Starting `origin/main`: `77de1081b9446e7e6526898d3b58af3b0cdf7634`
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Implementation branch: `codex/phase14-4-online-correction-context`
- Tested executable candidate: `58a275fd35911a5f63c77e33f35b9e242a527673`
- Full attempt: `phase14-4-full-58a275f`; one fresh complete `pnpm test`; exit 0
- Full result: **76 test files, 517 tests passed**, across 27 sequential test stages.
- Final remote main remained `77de1081b9446e7e6526898d3b58af3b0cdf7634`. The implementation and this report are on the dedicated branch; main was not advanced.

The change adds one optional read-only Host route, `risk-advisor/correction-historical-context`, for the newest active F1/F2 Finding only. A bounded, generation-local sidecar holds only the already-derived opaque Pattern ID, keyed to the exact Session object and ExecutionId. It is captured synchronously after pre-execute assessment and settled after FailureChain observation but before LiveCorrection and verifier observation. The route resolves only current qualified Guidance through the existing Pattern/Guidance authority and renderer, revalidates the Finding, sidecar and Guidance revision before returning, and exposes no ExecutionId or Tool data on the wire.

The existing OnlineCorrectionDock gains one initially collapsed historical section beneath its newest Finding. Its separate per-Session Client source has no render-time I/O, starts on retain, clears on identity or connection-generation change, aborts superseded reads, rate-limits to one read per second, and expires relative to Host `observedAt` at 1500 ms. If the optional history Client is absent or unavailable, the original Finding UI remains intact. No Finding predicate, Phase 11 writer/record, risk score, approval behavior, Harness code, Agent execution behavior, or historical authority was changed.

## C1–C12 and performance evidence

The Phase 14.4 focused suite passed **3 files / 14 tests**. The Host/Client focused subset passed **2 files / 12 tests** after the final identity-conflict hardening. Coverage exercises real F1 and F2 Findings with trusted qualified Guidance; exact Session/Finding binding; newest-Finding selection; missing, expired, revoked and structurally mismatched history; Guidance revalidation; strict request/response schemas; duplicate and cross-Session identity conflicts (including a duplicate capture without a Pattern ID); 512-entry capacity; session teardown; verifier ordering; Client retain/release and generation fencing; stale-response cancellation; and the 1499/1500 ms freshness boundary.

Performance fixtures create qualified Pattern/Guidance using the accepted Episode → Outcome → Pattern → Guidance pipeline: 1, 1,000 and 3,333 Patterns, backed at maximum by 9,999 Episodes. Host Finding-to-Guidance latency was:

| Qualified Patterns | p50 | p95 | p99 |
|---:|---:|---:|---:|
| 1 | 0.0206 ms | 0.0507 ms | 0.1195 ms |
| 1,000 | 0.0348 ms | 0.0664 ms | 0.1364 ms |
| 3,333 | 0.0290 ms | 0.0380 ms | 0.0504 ms |

The complete synchronous pre-execute path (Operation Foundation, FailureChain, Rule Engine, Expected Effect, base risk capture and opaque sidecar capture; deferred scoring callbacks run after timing) measured 1,000 eligible samples at **p95 0.103 ms / p99 0.134 ms**, within the frozen 1 ms / 2 ms budget. The measurement performs no history read or storage I/O.

## Regression and build gates

All required pre-Full gates passed:

| Gate | Result |
|---|---:|
| Phase 11.1 / 11.2 / 11.3 / 11.4 | 20 / 17 / 16 / 20 tests passed |
| Phase 12.1 / 12.2 | 34 / 31 tests passed |
| Phase 14.1 / 14.2 / 14.3 | 23 / 17 / 9 tests passed |
| P1B / P1C | 14 / 10 tests passed |
| P6 / P10 | 35 / 35 tests passed |
| Phase 14.4 C1–C12 | 14 tests passed |
| Typecheck | Passed |
| Production build | Passed in implementation and isolated Full worktrees |
| `npm pack --dry-run --json` | Passed; 84 package entries, including Client/Host declarations and `lib/client.js` |
| Package exports/declarations | Passed; `./client` resolves to `lib/client.js` with matching declarations |
| `git diff --check` and privacy/wire scan | Passed |

The new Phase 14.4 tests are included in canonical `pnpm test`. Existing P1C, P10 HMR, and P14.1 route-count assertions were updated to include the new additive Host endpoint; existing endpoints and lifecycles remain unchanged. The pre-Full privacy scan verified that the Client modules and wire DTOs contain only the Session/Finding selectors and no raw arguments, paths, call IDs, Execution IDs, or approval justification. The protocol validator internally adapts the already-frozen Phase 14.2 historical value using fixed placeholder identifiers; no execution identity is serialized.

## Browser bundle evidence

The isolated Full checkout was created at `/Users/tongxin/Developer/Harness/harness-plugin/.p14-4-full-58a275f`, where `../../deepseek-harness` resolved to `/Users/tongxin/Developer/Harness/deepseek-harness` at the pinned SHA. After `pnpm install --frozen-lockfile --offline`, a production build emitted `lib/client.js` (184.42 kB). Its SHA-256 was `ccf46a9f7ab4e08dc5dec35246d12b57aede5e77dded78a54f64826c42d0a5cd`.

Playwright loaded that exact candidate bundle in Chromium through the Harness-compatible `window.__ModuleLoader__` smoke page. The registered module ID was `@dhandil/dsh-risk-advisor`; `apply`, `CorrectionHistoricalContextClient`, and `OnlineCorrectionDock` exports were present; its OnlineCorrectionDock CSS including the history section registered; the loader saw only the expected React, React JSX runtime and Harness UI primitives externals; no load error occurred. The bundle contains no `node:` runtime import. The temporary localhost server and browser tab were closed after the smoke.

## Full preflight, result and retained artifacts

Before the single Full attempt, the detached checkout's HEAD was verified as the exact candidate SHA, its tracked tree was clean, and the pinned Harness checkout was verified at `ddefc45fbc7f8e46dd73185e68295696d1297887` with a clean tracked tree. The Harness relative config/type paths, Vitest aliases, dependencies and build artifacts were checked. The frozen lockfile install completed offline without package downloads. The Full command was run exactly once and exited 0. Its captured output remains at `/tmp/phase14-4-full-58a275f.log`; the isolated test worktree and generated build/dependency/cache artifacts remain in place.

The implementation worktree's existing untracked `lib/`, `node_modules/` and `.vitest-cache/`, the Harness checkout, and all pre-existing worktrees were preserved. The report is a docs-only commit added after the tested candidate; it does not change the tested executable. No acceptance report was created and no later Phase was started.
