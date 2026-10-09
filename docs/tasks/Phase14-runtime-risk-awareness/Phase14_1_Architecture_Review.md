# Risk Advisor Phase 14.1 — Independent Architecture Review

## Disposition

`RISK_ADVISOR_PHASE14_1_ARCHITECTURE_REVIEW_ACCEPTED_AFTER_REPAIR`

The original two documents were drafted/pushed by Codex as a candidate. That draft's self-declared `ARCHITECTURE_FROZEN` and `READY_FOR_IMPLEMENTATION` flags were **not** the architecture authority's acceptance. ChatGPT independently reviewed and directly revised the authoritative Freeze and Implementation Instructions before granting the limited Phase 14.1 implementation gate.

Scope is a **documentation/architecture-only** independent decision; no Product code, Harness Core, validation harness, accepted Product executable, or F1/F2 semantic contract has been changed or tested in this review.

## Authority and inspected source

- Current accepted Risk Advisor product code anchor: `4fb0a9133ba9df111db9c2023a946f023e3fa5a2`.
- Draft Phase 14.1 main: `4659cecbe3324d33047b881d32a516a22f9e2bf0`.
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Governing product boundary: `docs/baseline/risk-advisor-harness-native-risk-intelligence-boundary-v1.md`.
- Inspected Risk Advisor: `src/index.ts`, `src/host/assessment-envelope.ts`, `src/host/risk-engine.ts`, `src/host/context-builder.ts`, `src/host/guidance-store.ts`, `src/host/presentation/presentation-source.ts`, `src/bridge-contract.ts`, and existing Client Online Correction read/polling.
- Inspected pinned Harness: `packages/client/ui-session/src/client/index.ts`, `packages/client/ui-approval/src/client/index.ts`, `packages/client/ui-approval/src/client/contract/slots.ts`, and `packages/client/ui-conversation/src/client/contract/slots.ts`.

## Finding A — assessment-on-approval race (required repair)

Existing `ApprovalAssessmentCoordinator.observeAsked()` computes a synchronous deterministic base at `approval/asked`; Codex's draft created a deferred base at `tools/pre-execute`, yet did not fully specify the race when approval starts before the deferred job runs. Without one claim/commit authority, a duplicate base, absent approval detail or unstable ID is possible.

**Frozen resolution:** one exact-identity shared base, one once-only claim. Defer base scoring for ordinary Tools; when approval is observed while the base is pending, score the same frozen input at the **existing synchronous approval-observation stage** and invalidate the queued job. If already scored, reuse. Do not wait for scoring within the Harness `tools/pre-execute` waterfall. A genuinely absent pre-execute capture may use the legacy approval-only baseline; conflicts cannot invent or borrow a result. Approval Fast/Deep Judge/Evidence overlays may produce subsequent revision IDs; only A1's identity is shared. Required proofs cover all event orderings and teardown.

## Finding B — polling-only suppression cannot prevent duplicate UI (required repair)

The draft required a separate runtime dock to vanish when native approval owns the same operation, but its Client RPC polls once per second. Host suppression alone can leave a visible cached row for up to one polling interval, colliding with Harness's native approval detail.

**Frozen resolution:** use the existing **read-only** pinned Harness `useSessionStatus` global standard hook. The native `PendingApproval` already exposes `kind: 'approval'` and optional `callId` through `pendingInteraction`. The runtime-risk read-only projection may expose a bounded opaque `callId` for exact Session+call pairing. The Client immediately suppresses a matching cached row from the reactive native pending status, without waiting for polling, and conservatively suppresses when callId is unknown. No new native approval lifecycle, approval listener, veto or decision UI is created. Fresh Host ownership must be rechecked before displaying after settlement.

## Finding C — determinism and side-path boundary (clarification)

`createDeterministicAssessment` is deterministic in risk verdict/feature semantics given equal evidence, not in generated `assessmentId`/`contextId`/`createdAt`. Existing approval optional Judge and Evidence continuations generate later assessment revision IDs. Do not conflate those with the shared base A1 ID. No model/Judge/storage restriction on the **new ordinary-Tool path** should disable or reinterpret previously accepted optional approval Judge or Phase 11 historical storage behavior.

## Accepted delivery and next implementer

Codex is authorized **only after** the reviewed Freeze and accompanying revised Implementation Instructions are present on `origin/main` and it confirms the Product executable has not drifted from `4fb0a913...`. Implement Phase 14.1 solely from the revised documents. It may make local technical choices inside the Freeze, but any new architecture conflict returns to ChatGPT; Codex must not independently expand architecture or self-accept its implementation.

Expected user-visible capability: one non-blocking, advisory, bounded deterministic risk row for a recent eligible ordinary Tool; for a Tool under native approval, a reused A1 in the original approval detail and no duplicate confirmation/approval surface. An extremely fast or superseded operation need not guarantee a visible pre-dispatch card; delayed advice is explicitly marked as based on pre-execution evidence. The feature is best-effort, not a security gate.

Required proofs include exact `next()` pass-through, single-flight races, reactive UI suppression, privacy/Session isolation, lifecycle, no extra Tool/approval control, stable F1/F2 + Phase 11 data semantics, and exact-candidate focused/static/Full gating per Implementation Instructions.

## What this review does not claim

No code has been implemented; no tests or fresh Canonical Full have been run; no real provider, model, browser or Phase 13 campaign was invoked. Phase 13.2's accepted deterministic evidence remains intact. Phase 13.3 remains blocked/partial; Phase 13.4 remains unauthorized. No execution-level acceptance is inferred.

**Decision:** architecture accepted **after the above concrete repairs**, and Codex implementation may start only under this independent reviewed Freeze, not under the original unreviewed Codex draft.
