# Risk Advisor Phase 14.4 — Independent Architecture Review

**Independent reviewer / architecture owner:** ChatGPT.
**Decision:** `RISK_ADVISOR_PHASE14_4_ARCHITECTURE_ACCEPTED_IMPLEMENTATION_AUTHORIZED`.
**Type:** docs-only architectural acceptance; **not** Product implementation acceptance.
**Source main verified:** `bdc99b17fee97cca6220d4a852f49dc21131c038`
**Prior accepted executable:** `3b23d05b6ec64d68ddc211fe5dfb3154984f0982`
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`.

## 1. Evidence reviewed directly

- No existing `Phase14.4` Freeze or roadmap was present. Accepted 14.1/14.2/14.3 architecture, final reports, actual source and the Harness-native Risk Intelligence boundary remain controlling.
- `src/index.ts`: live `tools/pre-execute` identity capture ordering and `tools/result` `failureChain → liveCorrection → verifier → experience → runtimeRisk` chain.
- `src/host/runtime-risk-awareness.ts`: exact Phase11-compatible pre-execution PatternId projection, independent ordinary vs approval accessor, settled non-approval risk view 30-second expiry.
- `src/host/live-correction.ts`: immutable F1/F2 predicates, per-Session diagnostics of current unsuppressed Findings, 5-minute TTL, 64/Session and 256 global Findings, 512 Execution associations, conflict/saturation suppression.
- `src/online-correction-contract.ts`, `src/host/online-correction-bridge.ts`, `src/client/online-correction-store.ts`, `src/client/OnlineCorrectionDock.tsx`: independent read-only Session Finding transport, no exposed ExecutionId, one-second polling, most-recent-first sorted UI and the three-Finding limit.
- `src/host/expected-effect.ts`, `src/host/guidance-store.ts`: bounded ExpectedEffect identity and current READY/ACTIVE/QUALIFIED Guidance with exact indexed provenance.
- Phase12.1 Live Correction Finding Core Freeze, Phase12.2 User Advisory Surface Freeze and the Baseline Risk Intelligence Boundary.

## 2. Independent decisions and why

**D1 — Most useful adjacent scope.** Phases 14.1–14.3 have already brought trustworthy history beside general Tool and Native Approval risk. Linking the same qualified history *only as optional context* to independently existing Online Correction F1/F2 Findings is the smallest next evidence-based presentation value. This is intentionally not automatic correction or a new Agent-feedback path.

**D2 — Never import history into F1/F2 truth.** Phase12's F1 exact contiguous retry and F2 independently verified postcondition remain sole trigger/diagnosis sources. A qualified *prior success* cannot undo a present failure; a present Finding cannot make an old success a remedy.

**D3 — Bridge the 30-second / five-minute gap safely.** Reusing Phase14.2 latest ordinary row or Phase14.3 approval-owned query is unsound. Copy only the previously computed opaque pattern identity into a separate bounded Host registry during existing pre-execute capture, mark settled before verifier on tools/result, and retain no raw Tool evidence. Zero historical storage read and no awaited critical-path work.

**D4 — Host governs Finding identity.** Browser only requests already-visible opaque findingId for the current Session. The Host independently selects the *single newest unsuppressed Finding* from the original Phase12 session diagnostics. It binds via Host-only ExecutionId to a settled immutable pattern snapshot; the Browser never chooses Pattern or Execution. Host rechecks all identities and Guidance revocation before disclosing.

**D5 — One non-authoritative UI section.** Keep the existing OnlineCorrectionDock, top-three ordering, original advisory language and all approval/risk surfaces untouched. Add a small initially collapsed history section below newest Finding, distinguish structural historical operation-class equivalence from a verified fix.

**D6 — Bounded optionality and truthful freshness.** One optional read per second/visible Session, at most one current Finding and one historical note, strict Host observedAt age <1.5 seconds, generation/unmount/Session changes abort. Guidance failures, identity-capacity and verification lags affect only the optional note. No false immediate revocation promise.

**D7 — Honest evidence scale.** Real qualified 1, 1,000, 3,333 are supported by the accepted Episode cap 10,000 and ≥3 Episode qualification rule. 60,000 index entries are synthetic pressure only. Benchmark full pre-execute capture, not simply query-only p95/p99. Preserve independent Canonical Full and its path preflight, addressing the observed Phase14.3 test-worktree location failure.

## 3. Architecture acceptance vs future Product acceptance

The paired `Phase14_4_Online_Correction_Historical_Context_Architecture_Freeze.md` and `Phase14_4_Implementation_Instructions.md` define the complete bounded contract and C1–C12 verification matrix. This review accepts those **design documents only**.

**No implementation, test, migration, Browser workflow, provider call or Phase13.3 campaign has occurred as part of this review.** Codex may implement only on a separate branch after the docs-only architecture package lands on `origin/main`. Executable acceptance requires fresh independent review of source, tests, valid Full evidence, supported performance, privacy and exact SHA lineage. Codex must not self-accept or merge implementation.

**Status:** `RISK_ADVISOR_PHASE14_4_ARCHITECTURE_ACCEPTED_IMPLEMENTATION_AUTHORIZED`
