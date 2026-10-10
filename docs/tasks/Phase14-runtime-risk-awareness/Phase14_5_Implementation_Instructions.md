# Risk Advisor Phase 14.5 — Implementation Instructions

**Agent:** Codex. **Architecture owner and independent implementation acceptance:** ChatGPT.
**Starting architecture baseline:** `7a59d32d43077668a526538b6ad3fc7f1dac4ab7` plus this phase's docs-only accepted Freeze/Review commit.
**Accepted previous executable:** `ecf84c29a0ca9114ff7cd2779dca6ec021d1b699`.
**Pinned read-only Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`.
**Authority:** `Phase14_5_Evidence_Bound_Diagnostic_Next_Checks_Architecture_Freeze.md`, `Phase14_5_Architecture_Review.md`.

## 0. Preflight and branching

Sync remote main; confirm exact approved docs-only architecture tip and clean protected source. Create and work on a **separate implementation branch/worktree from main**; push the tested candidate for independent review. Preserve every user worktree, untracked `lib/`, `node_modules/`, `.vitest-cache/`, existing reports, and active Harness process. Do not silently replace pinned Harness, adjust Architecture Freeze, or modify unrelated files.

## 1. Implementation order

**H1 — deterministic Host projection.** Add an exhaustive checked mapping for one qualified F1 or six supported F2 verifier adapters to the frozen `checkCode + evidenceCode` union. Read ONLY already-qualified `LiveCorrectionDiagnostics.forSession(session)` and for F2 `VerificationDiagnostics.get(executionId)`; do not add a new live Finding predicate or read raw ExpectedEffect/Tool inputs. Exact Session and current most-recent Finding, current stored verifier mismatch, quality/source/adapter/time agreement, and triple validation at reply are mandatory. When no verifiable mapping exists, no note.

**H2 — separate read-only Host route and DTO.** Add `risk-advisor/correction-next-check` and exact `{sessionId,findingId}` request, strict tagged versioned response, bounded fixed enums and no execution/adapter/raw fields on Browser wire. Revalidate current Finding and stored verifier after constructing the candidate. No wait or I/O in any `tools/pre-execute`, `tools/result`, approval or verifier callback; install route only via the existing `connection/sessions` injection seam.

**C1 — optional Client.** Add a separate lightweight Client bridge/store with bound 64 Session sources, 60s idle retention, LRU idle eviction, safe disabled source when full and strong isolation on failure/stop/dispose. <=1 request/second per Session and single-flight. Strict Host observedAt-based <1500 ms total age with deadline expiry timer. Current Session/latest Finding/connection generation changes abort and suppress late VIEW.

**C2 — existing Dock only.** Render one subordinate initially-collapsed, fixed-text, noninteractive `Evidence-grounded next check — advisory only` immediately underneath the newest F1/F2 warning and **above** Phase14.4's historical note. Existing three Findings and original exact fixed message text stay byte-compatible. Failure/disposal/malformed optional projection must never affect existing F1/F2 nor its Phase14.4 history. Provide no commands, retry/apply buttons, false cause claims or success indicators.

**T1 — tests & latency.** Implement N1–N12 as independent deterministic proof, including six F2 supported types, eligible F1, contradictory/expired/unavailable verification, F1 immutable counter invariants, current Finding comparator ties, two Session objects with same ID, reentrant authority change before final VIEW, malformed DTO, optional Client injected exceptions, missing dependence, 64-source upper bound, release/remount, long Session switching, 1499/1500ms, late response, capped read rate, 1/64/256 Finding and 512-verifier pressure. Verify no re-interpretation of historical Guidance as root-cause proof. New tests must participate in `pnpm test` through `package.json`.

## 2. Hard prohibitions

No changes to frozen Phase11 writers/schemas/provenance, Phase12 Finding/retry/verification predicates/lifetimes, existing Phase12 Online Correction DTO or text, Phase14.1 risk, Phase14.2–14.4 route/DTO/freshness contracts, Harness Core, permission/approval, Tool input/output, Agent prompt, auto-correction/retry/replan, user feedback or model/provider calls. Avoid unrelated Client rewrites/refactors. Do not change current base Client to force Phase14.5; optional sidecar must tolerate it.

## 3. Quality gates

Focused N1–N12 → Phase11.1–11.4, Phase12.1/12.2, Phase14.1–14.4, P1B/P1C/P6/P10, actual HMR and Browser bridge regressions → typecheck, production build, declarations, package, real Browser bundle loader smoke, privacy/static/secret/diff checks → prepare exact clean detached test checkout **under correct relative `../../deepseek-harness` parent**, pinned Harness and offline dependencies; verify paths **before** launching Full.

Then **exactly one fresh complete `pnpm test`** at final tested executable SHA. On any incomplete/failed Full, stop and retain all evidence; no automatic repair-and-rerun under the same authorization. Do not run a real Agent/provider/registry/network campaign. Measured Host read p95 <=5ms/p99 <=10ms in accepted controlled pressure fixtures; no extra Tool critical-path work.

## 4. Delivery

Commit and push candidate only on independent implementation branch; prepare a later **docs-only** `Phase14_5_Execution_Report.md` stating tested SHA, main baseline, Harness pin, N1–N12, source/wire diffs, suite/gate counts, bundle proof, latency, exactly one Full run ID/result, preserved artifact paths, and docs-only post-Full drift. Do not merge main, self-accept, create final acceptance report or start next phase.

Return `RISK_ADVISOR_PHASE14_5_IMPLEMENTATION_READY_FOR_ARCHITECTURE_REVIEW` **only if Full and every Gate PASS**, else `RISK_ADVISOR_PHASE14_5_BLOCKED_<CAUSE>` with precise evidence. ChatGPT conducts the independent code/report review.
