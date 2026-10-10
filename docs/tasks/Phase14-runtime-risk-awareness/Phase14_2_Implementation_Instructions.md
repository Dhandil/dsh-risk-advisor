# Risk Advisor Phase 14.2 — Implementation Instructions

## Gate and owner

**Outcome after architecture acceptance:** `RISK_ADVISOR_PHASE14_2_IMPLEMENTATION_AUTHORIZED`. Codex executes implementation and tests only; **ChatGPT owns architecture decisions and independent final review**.

**Start from the exact `origin/main` that contains:**
- `docs/tasks/Phase14-runtime-risk-awareness/Phase14_2_Verified_Historical_Context_Architecture_Freeze.md` — sole Phase 14.2 architecture authority;
- `docs/tasks/Phase14-runtime-risk-awareness/Phase14_1_Final_Acceptance_Report.md` — accepted Phase 14.1 Product/lifecycle baseline;
- `docs/tasks/Phase11-verified-experience-historical-guidance/Phase11_3_Verified_Experience_Pattern_Freeze.md` and `Phase11_4_Verified_Historical_Guidance_Freeze.md` — immutable Pattern/Guidance authority;
- `docs/baseline/risk-advisor-harness-native-risk-intelligence-boundary-v1.md` — Harness-only execution and approval authority.

Accepted Product executable: `bd326bd6d0d550b2aa100bb7b176d2b5a4b227a1`; pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`. Create a dedicated implementation branch. If the base has moved or the accepted executable differs, stop for reconciliation before implementation.

## Bounded implementation slices

**S1 — pure identity and source seam.** Add a Host-internal read-only ExpectedEffect metadata peek, strictly bound to exact Session + ExecutionId and only returning the allowlisted `{source,adapterId}`. Factor/reuse the Phase 11.3 exact canonical identity tuple function without any change to existing historical Pattern IDs or immutable schemas. Differential-test all supported adapters, null permission, platform normalization and negative/ambiguous cases. No second shell parser or raw target retention.

**S2 — per-execution historical match.** During existing Phase 14.1 pre-execute capture, read the already-captured safe Rule and ExpectedEffect metadata, derive the opaque Pattern ID using exactly the existing tuple, and retain at most that ID with the current per-execution record. On ordinary Host read, confirm latest Session+ExecutionId+assessmentId, active lifecycle, and absence of native approval ownership; then query **only the current active** `GuidanceDiagnostics.currentForPattern` and frozen renderer. Guidance failures do not mutate A1/risk status. Keep B1/B2 safe under overlapping operations and capacity pressure.

**S3 — separate read-only Bridge protocol.** Implement `risk-advisor/historical-context` with exact `{sessionId,executionId,assessmentId}` and the independently versioned strict V1 `VIEW/NOT_FOUND/UNAVAILABLE` DTO frozen in the Architecture Freeze. Do **not** extend or alter accepted `risk-advisor/runtime-risk` V1, approval endpoints or Online Correction endpoints. Include Host session resolution, abort and generated/bounded response rules, constant fixed text, current Pattern provenance, 24k response limit. No Browser-supplied Pattern ID and no all-history query.

**S4 — optional section in the existing ordinary Tool dock.** Add a separate ephemeral historical read client keyed by the currently retained Runtime Risk row's exact identity. Retain/release in effects, cancel/clear on new Session, different execution, approval pending, completion/disposal and connection generation. Enforce ≤1 read/s per retained Session and ≤1.5s client freshness; exclude late stale completions. Display the five fields of `renderGuidance` **unchanged** under the existing risk card and do not let failures/degradation hide or change that card. No additional dock, modal, approval control or notification, and no native approval-detail integration.

**S5 — performance and compatibility.** Demonstrate that Guidance lookup uses bounded work even near 60k history identities; if indexing is necessary, introduce **only a behavior-preserving Host-private read optimization**, not a new data store or permission. No synchronous Guidance lookup or awaited I/O within `tools/pre-execute`. Preserve all prior lifecycle/caps, Feature flags/settings defaults and package/export contracts unless the Freeze explicitly authorizes addition.

## Mandatory focused and regression gates

Implement H1–H11 in the Phase 14.2 Freeze, with deterministic valid history fixtures. Especially prove:

- Qualified active Pattern 3 distinct verified Episodes across ≥2 UTC days shows the exact fixed message; two successes, one-day histories, legacy approval or exit 0 alone do not.
- Suspension/invalidation, unavailable Pattern/Guidance Storage Domain, writer lag, conflict, missing adapter and mismatch immediately suppress the next Host response, without changing the existing risk card.
- Same Session A/B overlap, cross-Session identity, late approval claim, malformed exact-key requests, delayed RPC response, auto-cleared stale UI, generation restart and optional-source absence.
- Existing Phase 11.1–11.4 storage/recovery hashes and writes unchanged; Phase 14.1 B1/B2, P1B, P1C, F1/F2 / Online Correction unaffected.
- Existing `tools/pre-execute` delegate returns `next()` once/unchanged, without model, network, awaited storage or added approval.
- Benchmark sync capture at existing p95/p99 bounds, Host exact match/read at large historical identity count, polling and unmount resource budget.

First run focused new tests, then Phase 11/P14.1/approval/UI/lifecycle relevant regression, TypeScript/typecheck/build/export/declaration/package/static/privacy gates. **After all pre-Full gates pass, run exactly one fresh complete `pnpm test` on the final exact executable candidate**, in a verified clean isolated environment. Do not silently repair/re-run a failed Full; preserve its report and submit a new named repair candidate after architecture review if needed.

## Hard exclusions

No Harness Core, native approval/policy/sandbox, F1/F2 detection, Outcome qualification, historical writer, durable schema, risk thresholds or six dimensions changes; no real provider/LLM/subagent calls; no broad cross-framework Adapter, PAH, real Phase 13.3 campaign, or Phase 13.4. Do not read/modify/delete unrelated local user files, existing untracked `lib/` / `node_modules/` / `.vitest-cache/`, or retained test worktrees. No forced cleaning.

## Publication

Keep the implementation on its own branch until ChatGPT accepts it. Publish a **new** `Phase14_2_Execution_Report.md` containing exact starting/implementation/tested SHA, focused+regression test counts, full `pnpm test` (file/test totals, command, exit, environment), current Harness SHA, scope diff, source freshness, remote verification and retained local artifacts.

Return one exact marker:

- `RISK_ADVISOR_PHASE14_2_IMPLEMENTATION_READY_FOR_ARCHITECTURE_REVIEW`; or
- `RISK_ADVISOR_PHASE14_2_BLOCKED_<specific-cause>` with no self-authorized architecture expansion.

**Codex must not self-accept, merge to main, revise this Freeze or claim the Phase 13.3 validation has passed.**
