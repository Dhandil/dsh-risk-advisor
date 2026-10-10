# Risk Advisor Phase 14.2 Repair1 Execution Report

**Status:** `RISK_ADVISOR_PHASE14_2_REPAIR_READY_FOR_ARCHITECTURE_REVIEW`. This records implementation and test evidence only; it does not accept the implementation.

## Candidate and preserved lineage

- Starting branch and report commit: `codex/phase14-2-repair1` from `c672337edba375419af01abb3c32e8868a1f1347`.
- Exact executable candidate used for all final gates and the one fresh complete test: `ab0aeec26d07bcc8a044bbec03cbb587386d1c73`.
- The candidate is based on the existing Phase 14.2 implementation lineage. It was not merged to `main`.
- `origin/main` remained `0c21656071dd2ae993aadc0e223eb7176fbeee3c` during verification.
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`; its tracked tree was clean. Existing untracked `deepseek-harness` was preserved.
- The prior `Phase14_2_Execution_Report.md`, its candidate/full result, and previous test worktrees were left unchanged.

## Repair scope

Only B1–B3 were addressed.

- **B1:** Removed the Client's `node:perf_hooks` import and use `globalThis.performance.now()`. The rebuilt production browser bundle contains no `node:perf_hooks` reference. A DOM-backed smoke loaded the actual emitted `lib/client.js` through its `window.__ModuleLoader__` entry, registered `@dhandil/dsh-risk-advisor`, resolved its three expected browser externals, exported `HistoricalContextClient`, and registered component CSS. The loader explicitly rejected any `node:perf_hooks` request; none occurred. Bundle SHA-256: `1d890dd7656ca0fb73eca3cee02404ad041c6ceceff0f40152519bd311607636`.
- **B2:** Historical freshness is measured from Host `observedAt`. A result is eligible only while its Host age is `< 1500ms`; its expiration timer is set to the remaining time from that timestamp, so response delay does not restart the freshness budget. Deterministic tests prove a response delivered at age 1499ms is cleared after the remaining 1ms and one delivered at exactly 1500ms is rejected. The existing older-than-budget delayed-response case remains covered.
- **B3:** Added `test:p14.2` to the `pnpm test` chain and included all three Phase 14.2 spec files. That command sets a 600,000ms Vitest timeout for the existing 3,333-qualified-history benchmark, which takes several minutes. An initial focused run using Vitest's default 5-second timeout stopped at the benchmark timeout; the configured focused rerun passed completely. No benchmark predicate, fixture eligibility, or frozen capacity changed.

No Phase 11, Phase 14.1, Risk V1, Guidance Authority, Harness, or Architecture Freeze file was modified.

## Gates

- Focused Client/Host tests: 2 files, 15 tests passed.
- Phase 14.2 focused suite, including both H10 scale tests and the delayed-response boundaries: 3 files, 17 tests passed; duration 399.08s.
- Phase 11.1–11.4, Phase 14.1, P1C, P6, P10, P12.1 and P12.2 regression set: 28 files, 241 tests passed.
- TypeScript typecheck: passed.
- Production build: passed. `lib/client.js` emitted at 141.11 kB (26.80 kB gzip).
- Browser bundle load smoke: passed against the emitted `lib/client.js` in a DOM-backed browser runtime with the Harness module-loader interface.
- Package dry run: passed; 74 files included, including `lib/client.js`, historical Client declarations, and the historical-context contract declarations. The `./client` export still resolves to `./lib/client.js`.
- Static checks: `git diff --check` passed; P10 package/boundary tests passed; package script inspection confirmed both Phase 14.1 and Phase 14.2 are in the complete test chain. The implementation diff is limited to `package.json`, `src/client/historical-context-store.ts`, and `tests/p14-2-historical-context-client.spec.tsx`.

## Fresh complete test

- Exact tested candidate: `ab0aeec26d07bcc8a044bbec03cbb587386d1c73`.
- Command: one fresh `pnpm test` after all pre-Full gates passed.
- Result: **PASS**; all 25 script stages passed, totaling 71 test files and 494 tests.
- Captured output: `/tmp/phase14_2_repair1_full_ab0aeec.log`.
- No executable, test, package, configuration, or benchmark changes were made after this Full. This report is the only post-Full change.
- Environment: Node `v24.21.0`, pnpm `11.7.0`.

## Retained state and review boundary

The repair worktree's generated `lib/`, installed `node_modules/`, and `.vitest-cache/` remain in place. Existing user artifacts and all prior test worktrees were preserved. No cleanup, merge, Architecture Freeze edit, or acceptance declaration was performed.

**Review boundary:** awaiting independent Phase 14.2 Architecture Review.
