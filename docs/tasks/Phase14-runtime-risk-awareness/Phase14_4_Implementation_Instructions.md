# Risk Advisor Phase 14.4 — Implementation Instructions

**Architecture owner:** ChatGPT. **Implementation agent:** Codex.
**Authority:** `Phase14_4_Online_Correction_Historical_Context_Architecture_Freeze.md` and `Phase14_4_Architecture_Review.md`.
**Starting executable baseline:** accepted Phase14.3 `3b23d05b6ec64d68ddc211fe5dfb3154984f0982`, docs-complete current main to be verified.
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`.

## Preflight

Synchronize `origin/main` and verify the Phase14.4 Freeze and independent Architecture Review exist and are byte-identical to the accepted docs-only baseline. Use one isolated implementation branch and preserve all protected/untracked user worktrees, `lib/`, `node_modules/`, `.vitest-cache/`, previous accepted reports and any existing Harness instance. Read only the pinned Harness contracts. Abort if an unexpected upstream baseline or Architecture Freeze conflict is encountered; never self-amend the Freeze.

## Implementation slices

**S1 — Opaque exact identity sidecar.** Add a minimal Host-private read from `RuntimeRiskAwarenessRuntime` to copy its *already-derived* captured Phase11 pattern ID for the exact Session object + ExecutionId. This method must be separate from and not relax the Phase14.2 ordinary/latest accessor or Phase14.3 approval-owner accessor. Build bounded `CorrectionHistoricalIdentityRegistry`: opaque PatternId only, 512 entries maximum, 10-minute capture hard TTL, 5-minute earlier post-settlement TTL, strict Session/execution/generation and disposal/capacity gates; no raw Tool information.

**S2 — Frozen event ordering.** After `runtimeRisk.capturePreExecute`, store the safe ID synchronously without awaited work; after `failureChain.observeResult`, mark this association settled before existing `liveCorrection.observeSettledResult` and `verifier.observeResult`. Do not move or alter other observers, `next()`, settlement, verifier, Experience writers, or F1/F2 gates. Failures of this registry are isolated and optional.

**S3 — Finding-scoped Host RPC.** Add only `risk-advisor/correction-historical-context`, exact `{sessionId,findingId}`. Select the current topmost active unsuppressed Finding of that Session using the existing Dock sort, look up the exact settled sidecar for its ExecutionId, read live Guidance through the existing `currentForPattern` and `renderGuidance`, then revalidate all authorities before returning a strictly parsed/frozen V1 response. No browser-chosen Pattern/Execution selector, raw args, historical write or All-History scan. Preserve all existing protocols byte-compatible.

**S4 — Browser additive section.** Reuse the single existing OnlineCorrectionDock and its original top-three Finding display; add only one initially collapsed subordinate historical section beneath the newest Finding. Independently managed Client source keyed by current Session/Finding/generation, ≤1 optional request/s, abort/clear on any mismatch, expiry based on Host `observedAt` remaining time <1500ms. F1/F2 wording and current severity/attention remain untouched. History errors cannot hide Finding or cause a new interactive control.

**S5 — Evidence, performance and privacy.** Implement C1–C12, including real trusted F1 and F2 paired with qualified history, missing/mismatched structural identity, misordered/synchronous/async verifier, cross-Session same hash, stale top-Finding switch, Guidance invalidation after initial match, capped registry, Session teardown, 1499/1500ms boundary, and bundle without Node client imports. Measure 1/1000/3333 qualified histories, separate any synthetic index pressure truthfully. Bench the complete pre-execute sync capture to preserve p95 ≤1ms/p99 ≤2ms and prove no history I/O on that critical path.

## Required test order

1. Focused C1–C12 and HMR/generation/cancellation/concurrency/privacy tests.
2. Relevant Phase 11.1–11.4, Phase 12.1/12.2, Phase 14.1/14.2/14.3, P1B/P1C/P6/P10 and host lifecycle/browser bridge regressions.
3. Typecheck, production build, real Browser `lib/client.js` load (with pinned Harness-compatible mock loader), package dry-run, declaration/exports, static/privacy/secret/diff gates.
4. The canonical `package.json` `pnpm test` must include **all new Phase14.4 tests**. Prepare a **fresh isolated clean test checkout whose `../../deepseek-harness` paths really resolve to pinned Harness**, verify preflight and paths *before* the Full attempt. Run **exactly one fresh complete `pnpm test`** on the final tested executable SHA. An interrupted, failed, or pre-collection Full is not PASS; preserve its evidence and return BLOCKED without automatic retry.

All relevant tests remain deterministic/offline; do not make real provider, Agent/subagent, registry or other external network calls. Do not run a Phase 13.3 real-Agent campaign as a Phase14.4 gate.

## Hard exclusions

Do not change: Phase11 Episode/Outcome/Pattern/Guidance writer, schema, eligibility, revision, provenance; Phase12 Finding predicates, status/conflict/TTL, browser Finding DTO or fixed messages; Phase14.1 six-dimension risk, approval behavior, ordinary scheduling/lifetime; Phase14.2 or 14.3 protocols/ownership/freshness; Harness core, policies, prompts, tool decisions/results, approval/answer, F1/F2 taxonomy, or user approval learning. No new Agent steering, auto-retry, safety veto, message injection, durable storage, migration or unrelated performance refactors.

## Reporting

Commit and push implementation on a separate branch, then a docs-only `Phase14_4_Execution_Report.md`. Report exact tested SHA, main baseline, pinned Harness SHA, diff scope, C1–C12, focused/regression counts, verified qualified-history scale, measured latency, browser bundle evidence, full attempt ID and exit, retained artifacts, tested-to-report docs-only delta and final remote SHA. Do not merge main, update baseline, create acceptance report, announce implementation acceptance or start Phase14.5.

Return `RISK_ADVISOR_PHASE14_4_IMPLEMENTATION_READY_FOR_ARCHITECTURE_REVIEW` only when all gates including one complete fresh Full PASS; otherwise `RISK_ADVISOR_PHASE14_4_BLOCKED_<CAUSE>` with exact evidence. ChatGPT independently accepts/repairs/blocks the implementation.
