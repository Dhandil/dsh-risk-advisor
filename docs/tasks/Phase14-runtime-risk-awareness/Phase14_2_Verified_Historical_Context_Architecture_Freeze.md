# Risk Advisor Phase 14.2 — Verified Historical Context Architecture Freeze

## Decision and implementation authority

**Architecture decision:** `RISK_ADVISOR_PHASE14_2_VERIFIED_HISTORICAL_CONTEXT_ARCHITECTURE_FROZEN`  
**Authority:** ChatGPT architecture review based on direct source inspection; **not** Codex self-freeze.  
**Accepted source main:** `f58f0e90623f05ee4db2fff67fa1d36202b565f8`.  
**Accepted Phase 14.1 executable:** `bd326bd6d0d550b2aa100bb7b176d2b5a4b227a1`.  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`.

**Goal:** give the developer an *evidence-qualified historical context note* beside a current ordinary Tool's Phase 14.1 risk assessment, without promoting historical success into present safety or correctness.

This Phase changes the **consumer** of Phase 11 Guidance, not its authorship, durable data, identity, verification, provenance, eligibility or wording. Phase 14.2 is an independently versioned, optional read-only sidecar. It does not authorize Phase 13.3 Campaign continuation, Phase 13.4, or any Guarded Mode / new permission control.

## 1. Verified source facts and hard constraint

At accepted source `main`:

- `src/host/experience-store.ts` forms Episode operation fields from `RuleEvaluation` and normalized Node Host platform; the source Tool name uses its existing validated/fallback normalization. An Episode is committed on `tools/result`, never before.
- `src/host/pattern-schema.ts` defines `patternIdentityFor`. Its fixed tuple comprises: version tag, Episode Host platform, Tool name, operation kind/parser confidence/mutating/external/network effect/permission, **and postcondition verification source+adapter ID**. The SHA-256 Pattern ID is a hash of this compact JSON tuple. It contains **no target path, workspace identity, operation arguments or expected-effect content**.
- Supported historic verification source/adapter pairs are `tool-contract` with `tool.write.v1` / `tool.edit.v1`, and `known-adapter` with `shell.mkdir.v1` / `shell.copy-file.v1` / `git.branch-switch.v1` / `package.node-resolve.v1`.
- `src/host/expected-effect.ts` captures the supported pre-execution expected effect **before** `runtimeRisk.capturePreExecute`, but today only has the consuming `take(exec)` API. Adding a **bounded read-only projection** of source+adapter is necessary; never consume the effect or expose its raw target, string, digest or Session object.
- `GuidanceRuntime.diagnostics.currentForPattern(patternId)` is an active/current read only while Guidance and Pattern sources are `READY`, the durable Guidance revision is `ACTIVE`, and its referenced current Pattern revision is exactly `QUALIFIED`. `renderGuidance` uses fixed frozen English wording. No risk or safety confidence is produced.
- Phase 14.1 owns an in-memory single-flight A1 assessment, a newest-ordinary-row selector, and an independent order-20 dock; Phase 14.1's RPC V1 has **exact request/response contracts** and the native approval handoff suppresses its row.

**Non-equivalence:** matching a 11.3 Pattern means only same **structural operation/verifier class**, not the same concrete command, target, Workspace, project, environment content, or goal. Therefore no current-target success prediction, safety assurance, “learned approval”, or project-specific attribution is allowed. Historical content must be prominently labeled as **Host-storage-scoped historical context with target and Workspace applicability unproven**. This scope is not a claim that the same user, Workspace or project generated every supporting Episode. Do not claim that three successes constitute a success probability.

## 2. V1 scope and visible UX

One small **“Verified historical context”** section is embedded *under* the ordinary Phase 14.1 Runtime Risk Awareness card only while that Session's current eligible `ExecutionId` and `assessmentId` are both still the latest live ordinary row. The existing six risk dimensions, hazard, recommendation, risk findings and advice continue to render exactly as before; history is an **independent sidecar**, not a seventh dimension and not a Risk Engine input.

The section shows **only** the accepted Phase 11 `renderGuidance` text (title, observation, context caveat, next check, authority notice), plus a fixed heading that makes the historical-only and Host-storage-scoped scope explicit. The original frozen wording is not modified or model-rewritten. If guidance is absent, not current, source unavailable, conflicted, expired, out of scope, or projection fails, omit the section; the Phase 14.1 card continues unchanged. No global “successful before” badge, success percentage, priority/ranking, automatic next action, user approval control or second dock/modal.

V1 does **not** add historical content to native `conversation.approval.detail`. During native approval, the ordinary risk card and its historical sidecar are hidden by the accepted Phase 14.1 Host ownership + reactive Client suppression. Native approval remains self-contained. A future explicit phase may extend the approval surface after separate protocol/privacy/UX review; Phase 14.2 may not do so by stealth.

No Agent/system/context prompt injection, Tool mutation, verifier hook, LLM/embeddings retrieval, persistent delivery record, auto-correction or proactive push notification.

## 3. Matching authority: exact structural identity, fail closed

Implement one deterministic **Pre-execution Pattern Identity Projection**, based exclusively on already-captured sources and the **existing Phase 11.3 algorithm**, with the following mandatory gates:

1. Exact same live `Session` object + `ExecutionId` currently captured by the Phase 14.1 runtime; a read is allowed only for the current/latest *ordinary* display row, never a previous row, already approval-owned row, expired/disposed generation or guessed callId.
2. The current Rule Evaluation must be available, internally coherent and sufficiently typed as required by Phase 11.3 `eligiblePatternEpisode`: non-`unknown` operation kind, `high` parser confidence, booleans for mutating/external effect, non-`unknown` network effect; an unavailable/non-`READY` rule status degrades to no historical match rather than a best guess.
3. Tool name uses exactly the Phase 11.1 Episode field normalization; platform uses exactly the Phase 11.1 normalized **Host** `os.platform()` field. No inference from Browser, workspace platform, terminal shell or User-Agent.
4. The **same captured ExpectedEffect** must yield a strict allowlisted `{source, adapterId}` from a new read-only host-private peek, without recomputing the shell parser or consuming the effect. The peek validates exact `Session` / `ExecutionId` association and expires with the existing expected-effect lifecycle. No supported effect => no Pattern ID. The identity is captured at `tools/pre-execute` while the ExpectedEffect source is live; no raw ExpectedEffect/Tool input is retained by the consumer.
5. Build the exact 11.3 `operation-outcome-equivalence-v1` 11-field tuple and SHA-256 Pattern ID. **Factor a pure canonical identity helper** shared with existing `patternIdentityFor`, or demonstrate an equally rigorous code-shared path: existing Pattern IDs and durable bytes **must not change**. Test the new pre-execution projection against the existing `patternIdentityFor(Episode, postconditionEvidence)` using equivalent fixture data for every supported adapter, null permission, all platform branches and mismatches.
6. The Host consults only `guidance.diagnostics.currentForPattern(patternId)`, then `renderGuidance(activeRevision)`. The source MUST be `READY` *at the read*, the revision must be `ACTIVE` / `QUALIFIED_PATTERN`, linked to current Pattern revision and valid digest. Do not read Pattern/Episode/Outcome tables from the new feature, open another Storage Domain handle, select a fallback history, or bypass the existing validated current API.
7. No fuzzy search, prefix/category-only retrieval, cross-fingerprint approximation, LLM similarity, arbitrary user query, all-guidance scan to pick “best”, or Workspace/project-specific claim.

Only **one** exact eligible active revision may produce **one** sidecar. A structural match remains historically informative, **not current-target verification**. Any discrepancy fails closed as `NOT_FOUND` or `UNAVAILABLE` for this optional sidecar, not as a lower/higher risk score.

### Read-time invalidation

Do not store or reuse `ACTIVE` historical content in the Phase 14.1 base record. The record keeps at most the opaque match Pattern ID and exact identity references needed to bind the query. Read the authoritative current Guidance **again per accepted Host request**. Pattern suspension/invalidation or Guidance conflict/readiness loss must immediately make **new Host reads** return no active note. An old Browser response must not be used for a new execution or new generation.

## 4. Host and Client integration — preserve Phase 14.1 V1 wire

**Avoid mutating** accepted `risk-advisor/runtime-risk` request or V1 DTO. Add a separate, strictly parsed read-only Host Connection route:

`POST /api/risk-advisor/historical-context`
`method risk-advisor/historical-context`
`payload {sessionId: string, executionId: string, assessmentId: string}`

All identifiers are bounded, required and exact-key; reject unknown keys, cross-Session, mismatched execution/assessment, expired/latest-replaced row, approval-owned record and disposed generation. Use the existing `SessionStore` resolution, rather than a new identity or client trust mechanism. No record-list API; do not disclose other Sessions' history.

Frozen V1 result union (all literal `schemaVersion: 1`; tagged and strict):

- `{kind:'VIEW', schemaVersion:1, sessionId, executionId, assessmentId, historical:{guidanceId, guidanceRevisionId, patternId, patternRevisionId, patternProvenanceDigest, evidenceStrength:'QUALIFIED_PATTERN', supportCount, supportUtcDateCount, title, observation, contextCaveat, nextCheck, authorityNotice}, observedAt}` — only one eligible, validated current active historical note, with exactly frozen rendered copy.
- `{kind:'NOT_FOUND', schemaVersion:1, sessionId}` — no eligible current note, including missing/mismatched/superseded/approval-owned/expired operation and qualified Pattern absence; do not reveal source of a miss.
- `{kind:'UNAVAILABLE', schemaVersion:1, sessionId, reasonCodes:[...]}` — optional Guidance/source unavailable or internal/capacity projection failure; fixed safe reason allowlist only, no path/exception/detail leakage.

No raw Tool inputs, target path, command, user/Agent text, expected-effect target, Episode or Outcome IDs, direct storage keys for mutable lookup, Browser-controlled patternId, platform tuple fields or arbitrary diagnostic strings are returned. Opaque qualified provenance IDs and descriptive counts are permitted; keep the existing ≤24,000-character response ceiling and strict Browser parser, deep-freeze parsed DTO, abort signal checks.

**Client:** retain the existing single Phase 14.1 dock/store unchanged. A bounded dedicated historical read source, scoped to its latest `(sessionId,executionId,assessmentId)`, issues at most one read per currently retained Session per second and no read for absent/runtime-unavailable/approval-owned records. Historical content renders **only if the current Phase 14.1 store row identity still exactly matches its request and response** and no native approval is pending for the matching call; on native approval, Session change, latest-row change, stop/dispose or connection-generation change, immediately clear the historical view, abort in-flight requests and suppress stale completions. Existing Phase 14.1 polling and F1/F2 dock remain unchanged. Do not write into the existing risk store.

Host reads represent a **point-in-time validated snapshot**, not a push subscription. Because the existing Client is polling, a previously rendered note can stay visible only until the next bounded revalidation: impose a client freshness age ≤1.5 seconds and never cache or resurface it indefinitely. Do not promise instantaneous Browser revocation without a future subscription design; Host read revocation is immediate. Failure/timeout must suppress the note alone, not hide the risk card.

## 5. Lifecycle, authority and performance

- Zero additional durable schema/tables/Storage Domain handles, history mutations, Episode/Outcome/Pattern/Guidance writer changes or acceptance baseline rewrites. `GuidanceRuntime` remains sole historical-content authority. A read-only exact-index optimization is permissible only if verified behavior-preserving, separately bounded and regression-proven.
- Phase 14.1 retains its 256 record / 64 queued scorer / 10-minute hard TTL / 30-second post-settlement rules and exact approval handoff. New matching metadata is process-local, bounded and scrubbed with its execution; never keep raw arguments, filesystem targets, command text or ExpectedEffect object in historical matching state.
- Work done synchronously in `tools/pre-execute` adds at most a short source/adapter projection and pure typed hashing. **No Guidance storage/current lookup, Browser RPC, awaited I/O or model call in the awaited waterfall**; if shared extraction/hash exceeds the existing Phase 14.1 p95 ≤1 ms, p99 ≤2 ms synchronous capture budgets, suppress historical matching or defer only the safe hash while preserving frozen snapshot identity; never delay Tool dispatch.
- Guidance reads happen only on the optional RPC path, not on Tool execute/result, approval waterfall, or risk-scoring critical path. Bound per-read work and memory with explicit performance tests at small and large histories; no 60k-identity linear scan per 1 Hz Session poll without a passed worst-case budget. The implementation must publish p95/p99 read latencies for 1, 1,000 and 60,000 qualified identities, and either demonstrate a stable upper-bound through exact indexing or return `UNAVAILABLE` for optional history under bounded resource pressure; never slow Risk V1 or the Tool path. If the current `currentForPattern` implementation is too costly, use an exact read-only indexed path preserving all `READY`/`ACTIVE`/revision/digest gates.
- Guidance optional failure (storage absent, writer lag, conflict, invalidation, capacity, detach) makes only the historical sidecar invisible/unavailable; Risk Engine, Runtime Risk V1, approvals, F1/F2, Experience writes and Tool result continue unaffected.
- The Client must never interpret historical source count as confidence or change order/emphasis of the current risk; no green success badge, auto-approval, suggested command to execute, and no lowering of a high/critical/unknown current risk assessment.
- Accepted Phase 11 append-only histories remain immutable. No new `HistoricalGuidance` persist/share/export API or learning from user approval.

## 6. Mandatory deterministic proof matrix

| Proof | Required result |
| --- | --- |
| H1 — identity parity | Pre-execute match hashes exactly equal existing 11.3 Pattern IDs for every supported adapter, permission and platform; wrong tool/attribute/source/adapter never matches |
| H2 — eligibility | Missing/unsupported ExpectedEffect, low parser confidence, unknown effects, absent source, rule degradation do not show a note |
| H3 — trust | Only current `READY` / `ACTIVE` / `QUALIFIED` linked Guidance, with valid exact provenance, is displayed |
| H4 — retraction | Pattern `SUSPENDED`, `INVALIDATED`, source detached/conflicted/lagging => next Host read NOT_FOUND/UNAVAILABLE, no stale alternative |
| H5 — identity/lifetime | Same Session overlapping A/B, multiple Sessions with same IDs, retired/disposed generations, TTL, a late A approval after B capture, and reentrant/pending reads never borrow B history |
| H6 — coexistence | Native approval instant suppression; older/stale/read-after-settle responses never reappear; approval detail unchanged |
| H7 — privacy | Exact request parser, no raw command/path/target/expected-effect content, no user/Agent/secret egress, strict DTO and bounded response |
| H8 — isolation | No Phase 11 storage writes/schema changes, no new approval/Tool decision, no risk six-dimension/recommendation mutation; F1/F2 unchanged |
| H9 — optionality | Missing/conflicted history does not alter Risk V1 render, Tool dispatch, approval or Online Correction |
| H10 — performance/lifecycle | No awaited storage in pre-execute; strict per-Session one-second request budget, ≤1.5s display freshness, teardown abort and full subscriptions cleanup; bounded host read at large history |
| H11 — regression | Phase 11.1–11.4 + Phase 14.1 B1/B2 + P1B/P1C + Online Correction/coexistence tests pass; final fresh complete `pnpm test` on one exact tested candidate |

Test fixtures must build **real validated qualified Pattern and Guidance** through existing trusted-history test helpers; fake generic success counts or synthetic model statements cannot substitute for the trust contract. Proofs can be deterministic and offline. No Phase 13.3 real-Agent campaign is required by this phase.

## 7. Explicit non-goals and next phase

Not part of 14.2: Guidance inside Native Approval or Fast/Deep Judge prompt; risk-score recalibration; new confidence metric; Workspace-aware historical success matching (historical storage lacks workspace); cross-project success assertions; command-level retrieval; vector store; user-facing all-history search; knowledge base; auto-correction; PAH/other framework integration; Harness Core changes; real-world detection-recall acceptance.

**Outcome:** A current ordinary Tool can receive one carefully qualified, provenance-grounded historical note **alongside but not inside** the risk judgment. The absence of a note is not an adverse risk finding. Any new scope or unresolved architecture conflict returns to ChatGPT for a new explicit decision before Codex implements it.
