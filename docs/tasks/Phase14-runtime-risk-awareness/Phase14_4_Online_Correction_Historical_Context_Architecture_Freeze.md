# Risk Advisor Phase 14.4 — Verified Historical Context for Online Correction Architecture Freeze

**Status:** `RISK_ADVISOR_PHASE14_4_ARCHITECTURE_FROZEN`
**Architecture authority and independent reviewer:** ChatGPT; implementation delegated to Codex after docs-only baseline advancement.
**Starting main:** `bdc99b17fee97cca6220d4a852f49dc21131c038`
**Accepted Phase 14.3 executable:** `3b23d05b6ec64d68ddc211fe5dfb3154984f0982`
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

## 1. Objective and boundary

Phase 14.4 displays at most **one currently qualified, provenance-backed Phase 11 historical Guidance note** adjacent to the **latest still-current Phase 12 F1/F2 Online Correction Finding** in the already-existing Session-scoped correction dock.

This is **historical context for an independently detected execution problem, not a verified recovery recipe**. A structural Pattern match does not establish the same target, Workspace, failed cause, safe remedy, or successful current goal. The existing Phase 12 advisory remains the primary warning; the history note has subordinate visual priority and clearly disclaims current applicability.

The repository has no accepted pre-existing Phase 14.4 scope. This new scope is a separately frozen *optional read-only consumer*, not a silent amendment of any earlier freeze. Phase 11.1–11.4 qualify Guidance, Phase 12.1 alone qualifies F1/F2 Findings, Harness alone grants/rejects/executes, and Phase 14.1 owns pre-execution identity. Phase 14.2 ordinary risk and Phase 14.3 Native Approval historical context remain unchanged.

**No automatic correction, retry, replan, suggested executable command, Agent prompt injection, Tool mutation, new Finding kind or risk-score change.** No Phase 13.3 campaign is authorized or accepted by this phase; its blocked/partial status is preserved.

## 2. Source-verified existing truth and the lifecycle gap

At the starting main:

- `src/index.ts` captures `rules`, `expectedEffects`, then `runtimeRisk.capturePreExecute` inside the existing `tools/pre-execute` observer, which delegates unchanged to `next()`.
- `src/host/runtime-risk-awareness.ts` already calculates an opaque Phase 11-compatible `historicalPatternId` from the supported ExpectedEffect identity + Rule evidence at capture; it retains this in a per-Execution runtime record. Its **ordinary** `currentHistoricalPatternId` requires the latest ordinary row and not approvalOwned. Its **Native Approval** accessor separately requires approval ownership and base A1 identity. Neither accessor is suitable for already-settled F1/F2.
- Current `tools/result` observer sequence is `failureChain.observeResult` → `liveCorrection.observeSettledResult` → `verifier.observeResult` → `experience.observeResult` → `foundation.retire` → `runtimeRisk.observeResult`. An F2 may be delivered synchronously during verifier observation or later by an asynchronous verifier.
- Phase 12.1 `LiveCorrectionRuntime` owns Finding eligibility, a 5-minute Finding/association horizon, at most 64 Findings/Session, 256 globally, and 512 Execution associations. It suppresses conflicted Findings; its `diagnostics.forSession(session)` returns only current unsuppressed Findings. Do not access `diagnostics.get(findingId)` alone for authorization because it lacks Session scope.
- Phase 12.2 `risk-advisor/online-correction` returns read-only Session-scoped `BrowserOnlineCorrectionViewV1`: up to 64 Findings with opaque findingId, kind, advisoryCode and observedAt but **no ExecutionId, adapter, Tool input or target**. The `OnlineCorrectionDock` renders at most three sorted by descending observedAt then findingId and already owns its Client polling lifecycle.
- A non-approval Phase 14.1 runtime record may expire **30 seconds** after result or be evicted under capacity; a Phase 12 Finding may remain available for **5 minutes**. Blindly joining those two active Client/read records would lose eligible history or borrow a newer execution. An explicit independent, bounded, Host-only settlement association is required.
- `GuidanceDiagnostics.currentForPattern(patternId)` is the existing exact-index, current READY/ACTIVE/QUALIFIED provenance-validated source; `renderGuidance` owns the five immutable display fields.

## 3. Separate Host-private opaque identity registry

Introduce **CorrectionHistoricalIdentityRegistry** (name indicative) as a strictly process-local, optional identity sidecar. It must never change the frozen Finding, verifier, Guidance, or Risk Engine runtimes.

**Capture:** following successful `runtimeRisk.capturePreExecute`, copy only its already computed **opaque** historicalPatternId into the sidecar using a new separate Host-private exact accessor for `(Session object, ExecutionId)`. Require current runtime generation, exact Session object, matching ExecutionId, valid Phase 11 Pattern ID, and a previously eligible capture. Do not reparse Tool arguments, recompute a hash, copy ExpectedEffect/raw operation, call storage or perform I/O. Do not broaden the ordinary or approval historical accessors. If unavailable/capacity exceeded, silently omit the sidecar; the Tool continues.

**Settlement:** during the existing `tools/result` observer, after `failureChain.observeResult` and **before** `liveCorrection.observeSettledResult` and `verifier.observeResult`, mark the sidecar association settled using the exact already correlated Session and ExecutionId. This supports both immediate F1 and synchronous/asynchronous F2, without changing relative `liveCorrection → verifier → experience` semantics. Exceptions are contained; no awaited work, delayed `next()`, second callback, or altered Tool result.

**Retention:** globally at most 512 sidecar associations, 10-minute absolute maximum from capture and earlier 5-minute post-settlement maximum. Every entry stores only a WeakRef to exact Session (or equivalent non-owning identity), SessionId, ExecutionId, opaque PatternId, createdAt/settledAt, and generation token; no approval state or raw args. Session disposal, generation teardown, TTL and capacity eviction remove it. At capacity evict only expired or settled eligible entries; if nothing safe can be evicted, omit the optional context. Never retain an unbounded strong Session reference. Invalid, repeated, cross-Session or conflicting ExecutionId associations fail closed; never overwrite another Session's binding.

**Read:** a settled binding for exact live Session + Finding.executionId may return one opaque pattern ID only while unexpired and not conflicted. Never return it directly to Browser or permit arbitrary ExecutionId/PatternId selection.

## 4. Finding-scoped, read-only Guidance RPC

New separate endpoint:
- `POST /api/risk-advisor/correction-historical-context`
- `risk-advisor/correction-historical-context`
- **Exact request:** `{ sessionId: string, findingId: string }` (bounded IDs, deterministic `ra-correction-v1_<64 hex>` FindingId grammar; no extra keys).

The endpoint accepts only a currently live Session from SessionStore. Fetch `LiveCorrectionDiagnostics.forSession(session)` and deterministically sort *exactly as the existing Dock*: descending `observedAt`, then lexicographic `findingId`; choose the **single newest active Finding**. Only if its `findingId` equals the request and its existing kind is F1 or F2 is history eligible. Missing, suppressed, expired, displaced, ambiguous or cross-Session Finding => NOT_FOUND. This ensures at most one visible sidecar/Session and avoids browser-selected arbitrary history enumeration.

Read the settled exact sidecar association for Finding.executionId, then `guidance.status() === READY` and `guidance.currentForPattern(patternId)` with all frozen ACTIVE/QUALIFIED, identity/revision/provenance and source-caught-up guards. `renderGuidance` emits the existing fixed `title`, `observation`, `contextCaveat`, `nextCheck`, `authorityNotice`; never generate new semantics, rank remedies, or consult successful history to establish F1/F2.

**TOCTOU:** immediately before returning any VIEW, revalidate the Session object, latest active and unsuppressed FindingId/kind/ExecutionId, exact still-settled sidecar generation/pattern, current Guidance readiness/revision/digest; reject changed or ambiguous authority. No Guidance read in `tools/pre-execute`, `tools/result`, verifier callbacks, approval hooks, risk scoring, or Fast/Deep Judge. Only the optional Browser RPC can read historical storage.

**Response schema V1 (strict tagged union):**
- `VIEW`: `{ schemaVersion:1, kind:'VIEW', sessionId, findingId, findingKind, historical, observedAt }`;
- `NOT_FOUND`: `{ schemaVersion:1, kind:'NOT_FOUND', sessionId, findingId }`;
- `UNAVAILABLE`: `{ schemaVersion:1, kind:'UNAVAILABLE', sessionId, findingId, reasonCodes }`, where reasonCodes is a nonempty bounded set from `GUIDANCE_UNAVAILABLE`, `PROJECTION_UNAVAILABLE`, `BINDING_UNAVAILABLE`.

`historical` reuses **exact** accepted Phase 14.2 `HistoricalContextV1`, including opaque qualified provenance references and five deterministic strings. Response does **not** include ExecutionId, approvalId, callId, Pattern selector, raw command, target/path, Workspace, source text, expected effects, verifier input or Tool outputs. Bound serialized response to ≤24,000 characters. Strict request and Browser response parsers, exact-key validation, fixed reason codes, deep freeze, abort/cancellation and connection-generation fences are mandatory.

Preserve `risk-advisor/online-correction` and its BrowserOnlineCorrectionViewV1 byte-for-byte. Also preserve the Phase14.1, 14.2 and 14.3 endpoints, `conversation.approval.detail`, Native Approval and existing risk UI.

## 5. Client scope, rendering and freshness

Extend **only the existing** `conversation.input.dock` OnlineCorrectionDock (id `risk-advisor-online-correction`, order 10). Do not register another dock, approval slot, modal or interaction. Keep every original F1/F2 Finding text, presentation, sorting, overflow and degradation caveat unchanged.

A separate **optional** correction-history Client/store may look up only the current Online Correction `VIEW`'s latest Finding (never compute an ExecutionId in Browser). It is fenced to `(sessionId, findingId, current connection generation, store generation)`; if the base Finding changes/vanishes, or the correction `VIEW` becomes `NOT_FOUND`/`UNAVAILABLE`, clear the history **synchronously with the render/state transition**, abort in-flight requests and reject late replies. History must never hold a stale base Finding alive. Optional-history exceptions, capacity misses or transport failures must not suppress original F1/F2 or block Dock render.

Show the historical section **beneath the newest Finding only**, initially collapsed, visibly subordinated and explicitly labelled “Verified historical context — not a diagnosis or fix”. Include fixed warning “Same operation class only. Current target, Workspace and failure cause are unverified.” Display five existing Guidance fields; no green success badges, current-risk downgrades, actionable shell commands, one-click retry, buttons implying permission, or heuristic "this worked before so retry" wording. Other two visible Findings remain intact, without secondary history queries.

Retain one stable optional source per visible Session, at most one in-flight Host read and **one new optional read per second per retained Session**. A VIEW is only a point-in-time Host snapshot. Use Host `observedAt`, refuse age >=1,500 ms, expire content after the **remaining** interval even without another React re-render (safely scheduled timer). On finding change, Session change, stop/dispose or connection reset, cancel and clear. A live Host Guidance retraction is visible at the next Host read; never promise instant revocation. Existing OnlineCorrection polling remains unchanged.

## 6. Performance, evidence and semantic limits

No new permanent record, Storage Domain handle, schema/migration, provenance writer, history mutation, user approval learning, model/provider/subagent calls, all-history scans, raw input retention, automatic Agent correction or new risk/recommendation threshold.

Use the exact-index query. Measure optional Host lookup p95 ≤5 ms and p99 ≤10 ms (same controlled environment) over 1, 1,000 and 3,333 **real** qualified Pattern/Guidance identities, with current Finding + sidecar identity. Existing Episode cap 10,000 and minimum three distinct Episodes per qualified Pattern imply at most 3,333 simultaneously qualified identities; 60,000 **synthetic** index entries, if tested, are separate and must never be claimed as qualified. No added awaited work or historical lookup on Tool/approval/verifier critical path; pre-execute sidecar copy must preserve accepted Phase14.1 synchronous capture budgets (p95 ≤1ms; p99 ≤2ms for the complete capture). Report baseline/comparison carefully, without claiming global latency SLAs from local fixture data.

The historical note is **optional even when an F1/F2 Finding is valid**. A missing match is not an error in F1/F2, and existing Finding should remain fully functional if Guidance or sidecar is absent.

## 7. Deterministic acceptance matrix

| Proof | Non-negotiable evidence |
|---|---|
| C1 | Current F1 and F2 each remain sourced exclusively from frozen Phase12 predicates; no new Finding, score, disposition or fixed wording |
| C2 | Only the newest still-live F1/F2 Finding of the exact Session can bind; suppressed/expired/displaced/cross-Session/unknown Finding never discloses history |
| C3 | Sidecar copies an already-eligible opaque pre-execute PatternId; matching ExecutionId + Session object + generation; no raw Tool data or new hash/Guidance lookup in waterfall |
| C4 | Immediate F1 and synchronous/asynchronous F2 use the settled association correctly; duplicate/interleaved/late callbacks do not borrow another execution |
| C5 | 5-minute Finding vs 30-second Risk row lifetime: safe independent bounded retention, TTL/eviction/disposal; missing sidecar hides only the history note |
| C6 | Genuine Phase11 3-Episode/2-UTC-date verified Guidance; reject unqualified, revoked, conflicted, lagging/detached histories, mismatched adapter/platform/permission |
| C7 | Current Finding + sidecar + Guidance triple revalidation at read; concurrent retraction/settlement/source replacement suppresses stale VIEW |
| C8 | Strict exact-key RPC, no ExecutionId/raw paths, IDs/response limits, aborted reads, malformed inputs, extra keys and Privacy gates |
| C9 | Client most-recent Finding switch, Session switch, generation reset, slow RPC completion and unmount cannot resurrect an expired note |
| C10 | 1 Hz bounded read, ≤1,500 ms Host observedAt freshness including 1499/1500ms boundary, no indefinite cache |
| C11 | Existing dock, top-three ordering, fixed F1/F2 text, native approval and ordinary runtime Guidance unchanged; no new control plane or Agent actions |
| C12 | Real qualified 1/1000/3333 Host performance; zero Tool critical-path historical I/O; Phase11/12/14.1–14.3 and relevant P1/P6/P10 regressions, typecheck, browser bundle, package/declarations, exactly one fresh complete canonical `pnpm test` on final candidate |

All trust-positive tests must use the existing trusted Episode → verified Outcome → qualified Pattern → active Guidance pipeline, not fabricated Guidance or synthetic model text. The original Phase13.3 campaign remains separately blocked.

## 8. Implementation acceptance boundary

Phase 14.4 is **advisory UX only**. It neither authorizes auto-correction nor changes what constitutes F1/F2. The architecture authority accepts only this bounded design; Codex implementation must be independently reviewed and accepted, then separately archived and fast-forward advanced. Next Phase is not authorized by this Freeze.
