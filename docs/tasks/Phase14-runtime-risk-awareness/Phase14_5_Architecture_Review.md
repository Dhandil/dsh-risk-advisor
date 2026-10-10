# Risk Advisor Phase 14.5 — Independent Architecture Review

**Decision:** `RISK_ADVISOR_PHASE14_5_ARCHITECTURE_ACCEPTED_IMPLEMENTATION_AUTHORIZED`
**Reviewer and architecture owner:** ChatGPT.
**Type:** documents-only architecture acceptance; not executable acceptance.
**Starting main verified:** `7a59d32d43077668a526538b6ad3fc7f1dac4ab7`
**Accepted preceding executable:** `ecf84c29a0ca9114ff7cd2779dca6ec021d1b699`
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

## A. Independently verified source facts

The remote main and Phase14.4 final accepted baseline were inspected. The repository contains no accepted Phase14.5 roadmap or pre-existing Freeze. This phase requires its own versioned scope and must not silently amend previously accepted authority.

- `src/host/live-correction.ts` is the sole current F1/F2 Finding qualification/suppression owner. Existing immutable Findings have exact Session-indexed diagnostics, private ExecutionId, F1 bounded retry evidence, and F2 verifier source/adapter/evidence quality.
- `src/host/verification-store.ts` owns a separate current, read-only, process-local stored verification result for exact ExecutionId. The result may expire or be contradicted, in which case an *additional* evidence check must be withheld, never substitute for a new F2 Finding.
- `src/host/postcondition-verifier.ts` and `src/host/expected-effect.ts` prove the exact six supported verifier adapter contracts. Their raw fields/targets/content remain Host-only. No custom shell check, verifier scheduling or new verification call is needed for this phase.
- `src/host/online-correction-bridge.ts` and `src/online-correction-contract.ts` expose the existing independent Session Finding Browser DTO, intentionally without ExecutionId or adapter. A new independent RPC with just `sessionId + opaque findingId` is required for the extra sanitized per-adapter check code.
- `src/client/OnlineCorrectionDock.tsx` renders the exact frozen F1/F2 bodies, top-three ordering and optional Phase14.4 qualified historical note. New evidence-derived next-check must remain separately labelled and must not merge its evidentiary semantics with old historical Guidances.
- `src/client/correction-historical-context-client.ts` (accepted Phase14.4 Repair1) proves the required 64-Session ceiling, 60s idle retention, idle LRU pressure recycling and optional Client error isolation. Apply these protections to the new optional source from the start.
- `src/index.ts` and the pinned Harness authority boundary prove that new advice can be implemented entirely off-path through `connection/sessions` route registration; modifying `tools/pre-execute`, `tools/result`, approval/request, verifier callback or Risk Engine is unnecessary and not authorized.

## B. Architectural decisions

**R1 — Evidence specificity rather than historical repetition.** Phase14.2–14.4 already expose past qualified Guidance. Phase14.5 offers distinct present-evidence-derived inspection guidance. Past successful experience is not a current fault diagnosis; a new check is not an automatic repair recipe.

**R2 — F1/F2 remain independent authorities.** Derive F1 check from an existing unsuppressed, frozen-qualified Finding only; do not parse error text or recompute retry signatures. For F2 require the current stored `MISMATCHED`, independently verified record consistent with the Finding's frozen evidence fields, and fail closed when it is missing/expired/conflicted. The original F2 message survives every optional read failure.

**R3 — Exact Session + one current Finding.** The Host sorts current `diagnostics.forSession(session)` identically to the existing Dock and selects only newest active Finding. Browser never queries an arbitrary ExecutionId, adapter, history Pattern, or older Finding. Verify again immediately before VIEW to avoid stale source substitution.

**R4 — Static, non-executable finite advice.** One F1 check or six existing supported F2 adapter-class checks, with fixed evidence labels and locally rendered immutable wording; no new severity, user permission assertion, target inference or extra prompt. The Browser sees only codes and its existing Session/Finding key, not adapter/source/Tool/private verifier identity.

**R5 — Truly optional UI with bounded lifecycle.** Use the existing OnlineCorrectionDock only, below newest Finding and above historical advice, initially collapsed. All optional Client errors remain isolated; <=64 Session sources, <=60s idle, <=1 optional request/second/Session, Host-observedAt freshness <1500ms, single-flight, immediate clear on Session/Finding/generation, no reappearance from stale responses.

**R6 — Honest validation.** N1–N12 include independent F1 and real stored-verifier F2 qualification, all six adapters, retraction/conflicts, top-Finding switching, optional failure injection, privacy, Browser load and controlled performance; Canonical Full must include all new tests and be run once on the final exact executable in a correctly placed isolated worktree. Accepted deterministic proof is not evidence of real-Agent Phase13.3 positives.

## C. Scope and acceptance

The separately committed `Phase14_5_Evidence_Bound_Diagnostic_Next_Checks_Architecture_Freeze.md` is authoritative for the exact endpoint/DTO, proof matrix, omissions and privacy. `Phase14_5_Implementation_Instructions.md` defines implementation sequencing and Gate requirements.

**Review result:** accept architecture documents only. No implementation, tests, migration, Harness mutation, real Agent activity, provider call or baseline acceptance was performed as part of this design review. Codex may create a separate implementation branch only after docs-only Freeze/Instructions/Review has landed on remote main. Codex may push unaccepted branch candidates for independent inspection, but may never advance main before separate ChatGPT executable acceptance and authorized non-forced fast-forward.

**Status:** `RISK_ADVISOR_PHASE14_5_ARCHITECTURE_ACCEPTED_IMPLEMENTATION_AUTHORIZED`.
