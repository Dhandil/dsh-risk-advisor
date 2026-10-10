# Risk Advisor Phase 14.6 — Integration and Closure Execution Instructions

**Executor:** Codex.
**Architecture owner / acceptance:** ChatGPT independently reviews the final source and evidence.
**Prior `main`:** `c930a9a29e0bd4479cadd79b11405aa2e482336d`.
**Prior accepted executable:** `547f00ba6e7e1d2495f54093e02a03b8a74c362f`.
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`.
**Authoritative scope:** `Phase14_6_Integrated_Closure_Architecture_Freeze.md` and companion `Phase14_6_Architecture_Review.md`.

## 0. Preflight

Sync `origin/main`; confirm that the three 14.6 architecture documents alone advanced the prior main. Work on a separate implementation branch and isolated worktree. Do not overwrite any tracked/untracked user files, previous branches, existing test/full logs, `~/.dsh` or active browser/Host. Verify pinned Harness and the correct relative `../../deepseek-harness` layout. Check no competing test on the isolated workspace.

## 1. Evidence-first integration

- Read and reconcile every Phase14.1–14.5 Final Acceptance Report, its exact accepted executable SHA, Full ID/count, docs-only tail and current ancestry. Read the **different** Phase13.3 observational/campaign reports; explicitly preserve BLOCKED/PARTIAL real-Agent qualification and avoid reducing all attempts to the earliest provider preflight failure.
- Implement focused **new tests only** under `tests/p14-6-*.spec.ts(x)`; optionally `tests/p14-6-*.ts` fixture(s). Register `test:p14.6` in `package.json` and append it to `pnpm test`.
- Prove C1–C12; prefer actual plugin `apply()`, pinned Harness lifecycle/approval/Session/Tool fixtures, genuine stored-verifier mismatches and real Client rendering. Construct one positive cross-surface coexistence scenario, one negative/revocation or failure-injection scenario and separate HMR/Session/disposal tests. Keep existing frozen F1/F2 content, 14.4 Guidance, 14.5 next-check, ordinary risk and approval independent.
- Do not let mocked approval/history/verifier DTOs replace proof of actual authority where the Freeze demands it. Label observational, synthetic and actual pinned-runtime evidence distinctly. Validate baseline eight Host routes, not invented route numbers.
- Perform one Browser production bundle/module-loader smoke using generated current `lib/client.js`, with CSS, export, slot, no `node:` dependency and load/disposal proof. No real provider, Agent campaign, user profile or Tool-side network.
- Audit lifecycle, privacy and resource caps. Reuse accepted Phase14 benchmarks and provenance; do not claim new measured data unless captured in this run.

If any C gate exposes a product defect, STOP. Report its exact source and reproduction evidence; do not modify `src/**`, earlier accepted tests, Freeze or Harness. Separate repair authorization required.

## 2. Quality gates and Full

Run focused new C1–C12 suite, relevant Phase11/12/14 and P1C/P6/P7/P10 regressions; typecheck, production build, declarations, pack, static/privacy/secret/diff and actual browser loader. Before Full, commit candidate and verify exact candidate SHA on a fresh, detached, tracked-clean test checkout under correct pinned Harness parent. Offline/frozen install and build permitted.

Then run **one fresh complete `pnpm test`** on the final candidate. If PASS, do not touch any executable, tests, `package.json`, lockfile, build configs or benchmark; if FAIL/incomplete, do not rerun or self-repair. Retain evidence and report BLOCKED. Preserve user files and all prior test logs.

## 3. Documents to produce on branch only

After the accepted gates, add one docs-only `Phase14_6_Integration_Execution_Report.md` with:
- exact commit ancestry and prior 14.1–14.5 acceptance ledger;
- C1–C12 proof-to-test table, positive/negative integration proof, actual vs simulated evidence labels;
- static/privacy/HMR/Browser/latency/build/package results;
- exactly one final-candidate Fresh Full run ID, file/test counts, exit, 0-skips and log location;
- clean-checkout and Harness pin preflight, preserved artifacts, process/browser cleanup, and docs-only drift;
- separately classified **Open Phase13.3 Real-Agent Validation Register** including missing true-positive/negative coverage and next safe follow-up.

Do not create the Phase14 final Completion Report, close Phase13.3, fast-forward main, change any prior acceptance report, or initiate Phase15.

If all pass, push candidate+report and return:
`RISK_ADVISOR_PHASE14_6_INTEGRATION_READY_FOR_ARCHITECTURE_REVIEW`.

If blocked, push only permitted evidence without rewriting the candidate and return:
`RISK_ADVISOR_PHASE14_6_INTEGRATION_BLOCKED`, with the first failing Gate, tested SHA and retained artifacts.

ChatGPT conducts independent acceptance. Only separately authorized **docs-only** final Completion Report / Open Validation Register and guarded non-force fast-forward may close Phase14 after review.
