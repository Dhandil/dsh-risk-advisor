# Risk Advisor Phase 14.2 — Independent Architecture Review

## Review outcome

**`RISK_ADVISOR_PHASE14_2_ARCHITECTURE_ACCEPTED_IMPLEMENTATION_AUTHORIZED`**

Architect/reviewer: **ChatGPT**. This is a **source-checked architecture decision authored directly by ChatGPT**, not a Codex preflight or self-declared architecture freeze. Codex may implement only the approved `Phase14_2_Verified_Historical_Context_Architecture_Freeze.md` and `Phase14_2_Implementation_Instructions.md` after the documentation has been accepted on `main`.

## Checked source and repository anchors

- Product source `main` at design start: `f58f0e90623f05ee4db2fff67fa1d36202b565f8`; accepted Product executable: `bd326bd6d0d550b2aa100bb7b176d2b5a4b227a1`.
- Harness pinned source: `ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Read: Phase 11.3 Pattern Freeze, Phase 11.4 Guidance Freeze, accepted Phase 14.1 Architecture Freeze and Final Acceptance Report, Harness-native Risk Intelligence Boundary.
- Source inspected: `experience-schema.ts`, `experience-store.ts`, `rule-engine.ts`, `pattern-schema.ts`, `pattern-store.ts`, `guidance-schema.ts`, `guidance-store.ts`, `expected-effect.ts`, `context-builder.ts`, `runtime-risk-awareness.ts`, `assessment-envelope.ts`, `browser-bridge.ts`, `src/index.ts` and accepted Runtime Risk Client and UI.

## Architecture decisions made here

**D1. Data is eligible history, not current safety.** Phase 11.3's Pattern identity is a structural equivalence tuple that intentionally excludes target/Workspace and payload. A qualified match cannot lower risk, raise approval confidence, declare a Goal complete, or establish same-target/same-Workspace success. Phrase the note as Host-storage-scoped, target-applicability-unproven history.

**D2. Preserve Phase 11's only writer and only qualification.** The consumer accepts only `GuidanceRuntime.diagnostics.currentForPattern` currently `READY`/`ACTIVE` and an exact current qualified Pattern provenance. It must not use raw Episodes/Outcomes, synthetic support counts or approved-Tool outcomes, and it must not amend the immutable append-only historical schema or identity.

**D3. Match at pre-execution without inventing an adapter.** The source already captures ExpectedEffect before Phase 14.1 capture; a narrow read-only `source/adapterId` peek is sufficient. Combine that with exact existing Rule facts, normalized Host platform and original Tool name; factor the existing Pattern canonical hashing helper with differential parity tests. Unsupported effect/low-confidence/unknown input means no history rather than guessed association.

**D4. Use a sidecar route, not a V1 risk bridge mutation.** A separate, exact `sessionId+executionId+assessmentId` read-only route protects Phase 14.1 risk DTO and isolates historical source availability. No public Pattern lookup, extra storage handle, or browser-controlled ID. This route returns one current matching note, NOT_FOUND or optional UNAVAILABLE only.

**D5. One card, two independent authorities.** Add the fixed Phase 11 rendered note **within** the existing ordinary Tool card, beneath the untouched six-dimensional Risk Assessment. Do not insert it into the Native Approval detail, Fast/Deep Judge, or Agent context. Preserve immediate native approval suppression already implemented in 14.1; old async responses cannot resurrect a note.

**D6. Freshness is honest.** Host revocation is checked on every read; a current Client presentation is a bounded point-in-time snapshot, not a guaranteed instantaneous subscription. At most 1.5s browser freshness, no stale delivery across Session/Execution/Assessment/approval/lifecycle changes. Future push invalidation is a separate phase if stronger semantics are required.

**D7. No unbounded polling work.** Current Guidance internal reads can scan across Pattern identities, so the implementation must either prove bounded large-history performance or add a strictly read-only indexed optimization, preserving readiness, source-integrity checks and durable writer semantics. No Guidance read/I/O may hold the Tool pre-execute waterfall.

## Acceptance and limits

The Architecture Freeze includes H1–H11: parity, eligibility, qualified provenance, invalidation, race/Session/capacity, UI coexistence, privacy, existing writer isolation, optionality, performance and focused/full regression. Codex must create deterministic valid history fixtures and explicitly verify real Pattern/Guidance states, rather than mock fabricated successes.

**Architecture review:** PASS. **Implementation/test validation:** NOT RUN / NOT CLAIMED. This report does not accept any future Phase 14.2 Product code, test harness, runtime Agent validation, or Phase 13.3. Existing Phase 11 and Phase 14.1 baselines remain unchanged.

**Next step:** after the docs-only Freeze is on `origin/main`, Codex implements from a dedicated branch and returns `RISK_ADVISOR_PHASE14_2_IMPLEMENTATION_READY_FOR_ARCHITECTURE_REVIEW`. ChatGPT conducts the subsequent independent Product review and determines ACCEPTED/REPAIR/BLOCKED.
