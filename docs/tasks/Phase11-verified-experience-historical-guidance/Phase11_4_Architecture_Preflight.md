# Risk Advisor Phase 11.4 — Verified Historical Guidance Architecture Preflight

## Outcome

`RISK_ADVISOR_PHASE11_4_ARCHITECTURE_PREFLIGHT_COMPLETE_READY_FOR_FREEZE`

This preflight authorizes architecture documentation only. It does not authorize implementation.

## 1. Baseline authority

- Risk Advisor `origin/main`: `54a6129fe8d437fa26a4f7d6844cafbe69f9ea6e`
- Pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Phase 11.1–11.3 acceptance is the user-provided premise for this preflight. The latest Phase 11.3 Repair1 report records tested candidate `024e35185d933f11b7a67276875b301e9c5dfd19` and the final verification.
- `HEAD`, `origin/main`, and remote `main` resolve to the stated baseline. The tracked worktree is clean; existing untracked `.vitest-cache/`, `lib/`, and `node_modules/` are preserved.

The pinned Harness checkout is at the exact SHA above. No Harness Core change is proposed.

## 2. Goal and boundaries

Phase 11.4 designs a Host-owned, durable Verified Historical Guidance projection over validated durable Phase 11.3 Pattern history. Guidance is fixed, deterministic advisory context. It is not an execution instruction, risk classification, approval decision, permission, or guarantee about a current operation.

This phase does not alter Episode, Outcome, or Pattern semantics. It does not modify Risk Assessment, Browser UI/bridge, Native Approval, Tool execution, Harness Core, or Agent context. It does not use a language model, implement Online Correction, or define a future phase.

## 3. Existing architecture inspected

### 3.1 Pattern is the only qualification authority

`src/host/pattern-schema.ts` and `src/host/pattern-store.ts` implement `risk_advisor_pattern` v1. Pattern identity groups typed operation/runtime facts with the verifier source/adapter class. A chain begins only after the frozen trusted-success threshold is met. Its revisions preserve exact support and contradiction references to immutable Episodes and Outcome revisions, and the chain is validated/reconciled before current Pattern results are available.

The current Pattern states are `QUALIFIED`, `SUSPENDED`, and terminal `INVALIDATED`. A support update or requalification can change a validated current Pattern revision; suspension removes its qualification without asserting failure; invalidation is emitted only by the frozen durable trusted-failure predicate. Pattern history is append-only. A Pattern row's opaque ID and revision ID are enough for a downstream consumer to resolve the Pattern's full provenance without copying individual Episode or Outcome identities.

The current `PatternRuntime` has read-only diagnostics but no downstream durable-commit notification/snapshot interface. Phase 11.4 therefore needs a private Host-internal source seam that reports only fully validated Pattern chains and emits only after a Pattern revision is durable. Guidance must not open a second `risk_advisor_pattern` handle.

### 3.2 Startup and teardown are ordered Host capabilities

`src/index.ts` currently starts Experience, then Outcome, then Pattern after their upstream sources are ready. Teardown fences result capture and verifier work, drains Episode and Outcome commits, then drains/closes Pattern before closing Outcome and Experience. The new Guidance capability must sit downstream of Pattern, subscribe before its source snapshot, and drain/close while Pattern is still available.

### 3.3 Storage Domain boundary

The pinned Harness `DomainFacility.open()` schema-validates every stored row before returning a table handle. Its `put()` can overwrite an existing key, and it supplies no cross-domain transaction. Guidance must enforce insert-only append behavior itself and reconcile from the authoritative Pattern chain after a crash.

For any per-row numeric limit that must surface as `CAPACITY_EXCEEDED`, the Guidance Zod schema must validate the row's shape without encoding that application limit as a Zod `.max()` that would reject the row inside `DomainFacility.open()` first. The runtime must perform explicit capacity preflight before its own parse and before append, and must inspect recovered rows before replay. This preserves the intended capacity status while keeping malformed shape fail-closed.

## 4. Architecture decisions proposed for Freeze

1. Add a separate Host-owned `risk_advisor_guidance` v1 per-record domain. Each durable Guidance revision references exactly one validated Pattern revision. It stores no Episode or Outcome references and reads no Episode or Outcome runtime.
2. Make a current validated Pattern revision in state `QUALIFIED` the sole eligibility condition. `SUSPENDED` and `INVALIDATED` never produce active Guidance. Episode, Outcome, approval, process/tool results, Agent/model text, and assessment data cannot bypass Pattern.
3. Derive one Guidance identity deterministically from the versioned Guidance rule and opaque `patternId`. Each Pattern revision after formation maps to one same-ordinal Guidance revision. Guidance is append-only; it refreshes on a qualified Pattern update, withdraws on suspension/invalidation, and reactivates only when a suspended Pattern is deterministically requalified.
4. Keep the wording authority static and bounded. V1 stores a fixed content code, exact trusted Pattern support counts, and an evidence-strength enum; a deterministic renderer supplies fixed wording and a current-target/postcondition check. No language model participates. There is no probability or risk-confidence score.
5. Preserve provenance through the exact `patternId`, `patternRevisionId`, and Pattern provenance digest. The referenced immutable Pattern revision in turn resolves to its Episode/Outcome provenance. Never copy individual source references into Guidance.
6. Subscribe to durable Pattern notifications before taking a complete read-only Pattern-chain snapshot. Buffer concurrent Pattern revisions within a frozen cap, replay each Pattern revision exactly once, and reconcile any missing Guidance append on clean restart.
7. Expose only Host-side read-only diagnostics. Active reads require both Guidance and Pattern to be ready and the current Guidance revision to reference the current qualified Pattern revision. No Browser, Approval, Risk Assessment, or Agent surface is added.
8. Give Guidance its own hard capacity, fail-closed storage status, privacy contract, and teardown drain. Guidance storage failure must not affect Pattern, Outcome, Experience, risk, approval, or Tool behavior.

## 5. Preflight conclusion

Phase 11.3 already provides the qualification and provenance authority needed for historical context. A separate deterministic projection can give that evidence bounded advisory wording without consulting individual Episodes or Outcomes, inventing confidence, or gaining product authority. The Freeze should specify exact identity, revision mapping, wording, strength semantics, capacity, reconciliation, and lifecycle before any code is changed.

Proceed with a Phase 11.4 Freeze and future implementation instructions as documentation only. No implementation is started by this preflight.

## 6. Sources inspected

- `src/host/pattern-schema.ts`
- `src/host/pattern-store.ts`
- `src/host/outcome-store.ts`
- `src/host/experience-store.ts`
- `src/index.ts`
- Phase 11.1 Episode Freeze and report
- Phase 11.2 Outcome Freeze and report
- Phase 11.3 Pattern Freeze, implementation instructions, and Repair1 execution report
- Pinned Harness `packages/storage/storage-domain/src/{spec,domain,index}.ts`
