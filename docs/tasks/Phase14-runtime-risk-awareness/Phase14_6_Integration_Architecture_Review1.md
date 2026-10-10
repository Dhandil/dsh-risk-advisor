# Risk Advisor Phase 14.6 — Independent Integration Architecture Review 1

**Decision:** `RISK_ADVISOR_PHASE14_6_REVIEW_BLOCKED_INTEGRATION_EVIDENCE_GAPS`
**Review authority:** ChatGPT independent read-only remote source, tests, freeze and report review.
**Frozen baseline:** `a5f67af539505ea161484bf50a35d9c735b68096`.
**Reviewed tested candidate:** `a5cd0bcc596a671520f62e22a0930b0677a203f0`.
**Execution report commit:** `9f2fd03415ddf68f9c30b21d7aa9ac352408dc29`.
**Harness pin:** `ddefc45fbc7f8e46dd73185e68295696d1297887`.

## Confirmed candidate provenance and passing evidence

The implementation is one commit ahead of the frozen main and changes **only** `package.json`, `tests/p14-6-cross-surface.integration.spec.tsx`, and `tests/p14-6-browser-module-loader.spec.tsx`. The execution report is the single docs-only child of the tested commit. `main` was unchanged at review. This satisfies the Phase14.6 change envelope and post-Full source-drift rule.

The report records **one fresh complete** `pnpm test` at the exact tested SHA, PASS **80 files / 552 tests, 0 failed, 0 skipped**, run `phase14-6-full-20261010-a5cd0bc-attempt1`. ChatGPT inspected this evidence and the remote tests but **did not rerun Full**.

Positive integrated evidence is substantive: a genuine pinned Harness Tool call creates a stored `MISMATCHED` verifier F2 via actual Risk Advisor Host `apply()`; prequalified durable Guidance is looked up through the installed Host route; actual Client `apply()` registers the original Online Correction Dock, showing both Phase14.4 historical and Phase14.5 next-check views without exposing test-secret sentinels. Separate injected failures of each optional read preserve the F2 and the other optional projection. Host-route/HMR tests check exactly eight distinct routes and three mount/dispose generations.

These checks establish useful progress, but do not fully satisfy all **integrated** frozen C1–C12 requirements. Passing independent earlier phases cannot replace a newly required simultaneous cross-feature proof.

## Required narrow evidence additions before executable acceptance

### E1 — C4 combined ordinary-risk + live-correction lifecycle missing

Frozen C4 requires **same-Session ordinary risk and F1/F2 independence across Tool pre-execution and settlement**, with duplicate/later/out-of-order events unable to fabricate a Finding or revive stale base risk.

The new positive integration records a Tool and its F2, but **never reads/asserts the ordinary-risk Host or Browser projection for that same Session**. It also does not exercise duplicated/out-of-order Tool lifecycle events in this joint scenario. The report cites `tests/p14-1-runtime-risk-tool.integration.spec.ts` and `tests/p12-1-live-correction.spec.ts`, which separately verify their respective subsystems but not their joint same-Session coordination.

**Closure proof:** add a focused test on the already permitted `tests/p14-6-*.spec.tsx` suite that observes one actual pinned Host Tool lifecycle in the same Session, explicitly observes independent ordinary-risk and F2 read states, and applies a bounded duplicate/out-of-order event sequence with no cross-authority change, duplicate Finding, or stale-risk resurrection. Preserve native approval authority and fixed Finder rules. A legitimate zero-risk state must be distinguished from an unavailable/missing projection; no invented positive risk.

### E2 — C9 combined history + next-check Session/generation transition missing

Frozen C9 demands exact Session/Finding/generation and late-response fencing **under simultaneous optional widgets and different Session views**. The new combined-Dock positive and negative tests mount a single Session only. Earlier `p14-4` and `p14-5` Client tests independently cover switching, 1Hz, 1499/1500ms and delayed responses, but do not exercise the two live optional subsystems together during a Session A→B→A transition.

**Closure proof:** extend the existing combined Dock integration fixture with two distinct Sessions and concurrent optional history/next-check clients, with an in-flight A response resolving after B is selected (plus generation/revision reset if supported), and assert both optional views and original F1/F2 always match the currently mounted Session/Finding. Verify the already frozen age 1499/1500ms/1Hz contracts remain covered, without reimplementing their existing focused suites or introducing a new product path.

### E3 — C8 current candidate real-browser smoke evidence missing

The new `p14-6-browser-module-loader.spec.tsx` loads actual generated `lib/client.js` with the **real pinned Harness module system** and checks CSS/slots/disposal. However, it explicitly runs under `@vitest-environment jsdom` and evaluates the bundle through `new Function(bundle)()`; the execution report expressly states **no actual browser page was opened**. This is an in-process browser-API simulation, **not a Chromium/WebKit/Firefox browser run**. Previously accepted Phase14.5 had a real Playwright/Chromium loader smoke, but Phase14.6 explicitly froze a Browser production-artifact gate.

**Closure proof:** perform one bounded, isolated **actual Chromium/Playwright browser** smoke of current candidate's generated production Client artifact using pinned compatible Harness loader behavior (module registration, CSS/slot hook or at least the production loader registration and export behavior, disposal and no `node:` import). Record version/artifact SHA and cleanup. Do not navigate real user profiles, reveal launch tokens, contact provider/network/registry or start an actual Agent. This may be documented as an independent pre-Full Gate; do not assert the existing jsdom test was a Chromium test.

## Scope and procedural consequence

**This review identifies missing frozen integration evidence, not demonstrated Risk Advisor executable bugs.** No amendment of the Architecture Freeze is authorized; no `src/**`, prior tests, Harness, `validation/**`, benchmark, dependencies or user runtime changes are allowed.

Codex may add **only tests within the frozen Phase14.6 allowed paths** and narrowly justified test-script registration if needed, plus the separate isolated Chromium smoke described above. Complete new E1/E2 focused, relevant regressions and E3 Browser smoke **before** preparing a fresh clean candidate; then run **exactly one new fresh complete `pnpm test` on its new tested SHA**, preserving `a5cd0bc`'s 552/552 Full and original report as historical evidence. A source defect found during these proofs requires a separate architecture authorization; no unilateral product fix.

The next execution report is named `Phase14_6_Evidence_Repair1_Execution_Report.md`, appended as **docs-only after** the new tested executable. Do not alter, replace or reclassify the original report. Continue to protect current `main` and do not self-close Phase14.

Phase13.3 remains **`REAL_AGENT_GENERALIZATION_UNVERIFIED`**: the 5/20 task, 23 Tool call partial real campaign and separate 20-Session unscorable observation have no complete F1/F2 positive/negative coverage; the current pinned Harness workspace-write scope issue means a full Agent campaign restart is **not authorized** here. This Phase14.6 repair does not investigate, downgrade or fix that security boundary or claim the prior Scheduler Symbol/built-mode concerns resolved.

**Result:** `RISK_ADVISOR_PHASE14_6_REVIEW_BLOCKED_INTEGRATION_EVIDENCE_GAPS`. No Phase14 Completion Report, final acceptance or main advancement permitted yet.
