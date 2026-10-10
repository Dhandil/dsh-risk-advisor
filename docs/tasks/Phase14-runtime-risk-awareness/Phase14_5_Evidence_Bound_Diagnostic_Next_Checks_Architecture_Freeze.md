# Risk Advisor Phase 14.5 — Evidence-Bound Diagnostic Next Checks Architecture Freeze

**Decision:** `RISK_ADVISOR_PHASE14_5_EVIDENCE_BOUND_NEXT_CHECKS_ARCHITECTURE_FROZEN`
**Architecture and independent acceptance owner:** ChatGPT.
**Implementation owner:** Codex, only after documentation baseline acceptance.
**Starting remote main:** `7a59d32d43077668a526538b6ad3fc7f1dac4ab7`
**Accepted Phase 14.4 executable:** `ecf84c29a0ca9114ff7cd2779dca6ec021d1b699`
**Pinned read-only Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

## 1. Objective and the non-duplicating scope

Phase 14.5 adds one **optional, evidence-bound, deterministic manual next-check note** beside the single newest active Phase 12 Online Correction F1/F2 Finding, within the existing Harness `conversation.input.dock` OnlineCorrectionDock.

**Distinct from earlier phases:** Phase 14.4 provides historical Guidance from previously verified successes; Phase 14.5 provides *current Finding-specific diagnostic next-checks* based solely on the already-qualified live FailureChain/Finding or independently stored Postcondition Verification record. History is neither an input nor authority for this new advice. An F1/F2 Finding says a bounded execution predicate matched; it does not prove the task goal failed or determine a remedy. Phase 14.5 advises what a human might inspect; it does not know the concrete cause.

This work is not an automatic correction/retry, a new diagnosis/Finding kind, an Agent intervention, an executable fix, a second permission authority, or a change to the existing fixed F1/F2 advisory text. It introduces no learning, model generation, free-form input, embeddings, or user feedback. Phase 13.3 remains blocked/partial and is not rehabilitated by deterministic tests.

## 2. Source-verified authority and integration seams

On the accepted main:
- `src/host/live-correction.ts`: `LiveCorrectionRuntime` alone creates and suppresses two frozen kinds: `REPEATED_FAILURE_WITHOUT_PROGRESS` (F1) from exact contiguous retry-path summaries and `POSTCONDITION_NOT_SATISFIED` (F2) from sanitized `VerificationRecordV1`. `diagnostics.forSession(session)` excludes conflicted/suppressed/expired Finding identities. A Finding has a Host-only `executionId`; F1 also carries frozen retry counters, F2 carries frozen verifier source, adapter and evidence quality. Per-Session max 64, global max 256, TTL 5 minutes.
- `src/host/verification-store.ts`: `verifier.store.diagnostics.get(executionId)` is a bounded read-only current stored verifier record. Its `status`, `semanticSuccess`, `evidenceQuality`, `reasonCodes`, `source`, `adapterId` and `observedAt` are sanitized. A record can become `UNKNOWN` on conflict and can expire; absence never proves success or failure.
- `src/host/expected-effect.ts` and `src/host/postcondition-verifier.ts`: six supported F2 adapter IDs, each with a specific **postcondition** contract. Their raw target/path/content/expected branch/package name must never enter Phase14.5 wire or UI.
- `src/host/online-correction-bridge.ts`: frozen separate `risk-advisor/online-correction` route returns original Session-scoped Finding DTO with **no ExecutionId, adapter or verifier record**. This route and `BrowserOnlineCorrectionViewV1` must remain byte-compatible.
- `src/client/OnlineCorrectionDock.tsx`: existing fixed F1/F2 strings and top-three display; 14.4 adds a separately isolated optional history section beneath newest Finding. Phase14.5 must not displace, gate or conflate either of those.
- Phase14.4 Repair1 established mandatory optional-client failure isolation, at most 64 retained Session stores, 60-second idle retention, LRU idle eviction and safe disabled source under full retained capacity. Phase14.5 must meet at least this boundary independently, with no new unbounded subscriptions/loops.
- `src/index.ts`: all authoritative pre-execution, tools/result, failure/verifier and Experience hooks already exist. Phase14.5 may add an optional Host read-only route and Client presentation; **no Tool-hook change whatsoever** is authorized.

## 3. Eligible current diagnosis and bounded Host projection

Only the **single latest still-live, unsuppressed F1/F2 Finding** of the exact resolved Session can receive the optional check. Select using exactly the existing Dock comparator: descending `observedAt`, then ascending `findingId`. Require the request's opaque `findingId` to match. A missing/closed Session, displaced/expired/suppressed Finding or cross-Session reference returns NOT_FOUND indistinguishably. Do not read another Session by global Finding ID. The Browser cannot select an ExecutionId or adapter.

**F1 authority:** exact currently visible Phase12 F1 Finding with its frozen `kind`, `diagnosis`, `advisoryCode`, `disposition`, positive bounded `retryCount` and `recentFailureCount >=2`. Use only existing frozen F1 metadata; do not re-run retry matching, read raw signatures/errors or require a live newer FailureChain record. Advise reviewing the exact retry prerequisites/failure pattern, without asserting a root cause or permission fault.

**F2 authority:** the currently visible Phase12 F2 Finding **plus** a still-current `verifier.store.diagnostics.get(finding.executionId)` record. Require exact ExecutionId, source, adapterId, quality, `observedAt` and frozen Finding agreement; record `status === MISMATCHED`, `semanticSuccess === false`, quality high/medium, `POSTCONDITION_MISMATCH` reason; reject duplicate/unknown/conflicted/expired/unavailable/mismatched source. If the record has expired, the **optional check disappears**, but the original Phase12 F2 Finding remains untouched. Do not infer a verification result from Tool exit 0, textual Agent/user claims or prior Phase11 history.

The Host uses an exact, static mapping. The Browser receives only a coarse **check code**, never source/adapter/quality/ExecutionId. Explicit codes:

| Qualified source | Check code | Human inspection semantics |
| --- | --- | --- |
| F1 exact contiguous retry Finding | `REVIEW_EXACT_RETRY_PREREQUISITES_V1` | Compare prerequisites and the repeated failure path before another attempt; do not keep repeating the same unchanged operation |
| F2 `tool-contract:tool.write.v1` | `INSPECT_WRITTEN_CONTENT_V1` | Independently inspect final content against intended write result |
| F2 `tool-contract:tool.edit.v1` | `INSPECT_EDIT_REPLACEMENT_V1` | Check intended replacement and surrounding result |
| F2 `known-adapter:shell.mkdir.v1` | `CHECK_DIRECTORY_POSTSTATE_V1` | Independently check directory existence and accessibility |
| F2 `known-adapter:shell.copy-file.v1` | `CHECK_COPY_DESTINATION_V1` | Inspect destination state and expected copy correspondence |
| F2 `known-adapter:git.branch-switch.v1` | `CHECK_ACTIVE_GIT_BRANCH_V1` | Independently confirm active branch matches intention |
| F2 `known-adapter:package.node-resolve.v1` | `CHECK_DEPENDENCY_RESOLUTION_V1` | Check package resolution in the current project/runtime environment |

The above is an exhaustive enum, not free-form text. Strictly enforce exact source/adapter pairs for F2. No generic fallback masquerading as a diagnosis; if evidence is missing or unrecognized, return NOT_FOUND/UNAVAILABLE, not speculative advice. Fixed Client wording must be separately frozen/tested and must **not** include executable commands or raw target/paths/package names. One optional next-check, never ranked multiple "fixes."

## 4. Separate optional read-only RPC and strict DTO

New independent route and method:
- `POST /api/risk-advisor/correction-next-check`
- `risk-advisor/correction-next-check`
- request **exactly** `{sessionId:string, findingId:string}`; bounded identifier and `^ra-correction-v1_[a-f0-9]{64}$` validation. No client-supplied diagnosis, adapter, rule, PatternId, ExecutionId or checkCode.

Response `schemaVersion:1` strict tagged union:
- `VIEW`: `{schemaVersion:1,kind:'VIEW',sessionId,findingId,findingKind,checkCode,evidenceCode,observedAt}`
- `NOT_FOUND`: `{schemaVersion:1,kind:'NOT_FOUND',sessionId,findingId}`
- `UNAVAILABLE`: `{schemaVersion:1,kind:'UNAVAILABLE',sessionId,findingId,reasonCodes}`

`evidenceCode` is exactly `F1_CONTIGUOUS_RETRY_FINDING_V1` for F1 and `F2_CURRENT_VERIFIED_MISMATCH_V1` for F2. Its cross-field relationship with Finding kind and checkCode must be validated. `UNAVAILABLE.reasonCodes` is a non-empty exact-key allowlist `EVIDENCE_UNAVAILABLE` or `PROJECTION_UNAVAILABLE`. Do not expose retry signatures, raw counts, error classes, verified target, tool, path, user messages, model text, approval data, provider details or provenance that can act as a query selector. Bound serialized response <=4096 characters and enforce strict shape/finite observedAt, deep-freeze, abort, connection/request generation and defensive parsing. NOT_FOUND must not distinguish missing/foreign/expired/suppressed.

Host projection uses `liveCorrection.diagnostics.forSession(session)` for current authority. Revalidate exact Session identity, newest FindingId/kind/ExecutionId/observedAt and (for F2) exact current verifier record status/source/adapter/quality/reason/revision before returning VIEW. Any TOCTOU mismatch suppresses optional note. No historical Guidance lookup, Pattern storage, Tool waterfall, verifier callback, Fast/Deep Judge, outgoing provider call or Agent prompt input on this read-only endpoint.

## 5. Browser user experience and lifecycle

Within **the existing OnlineCorrectionDock only**, add one small optional, initially collapsed `Evidence-grounded next check — advisory only` subsection directly beneath the *current newest* Finding's already-frozen F1/F2 message. Keep the original three Finding positions, overflow, prior 14.4 historical section and exact fixed advisory text unchanged. The Phase14.5 subsection must precede the separately labelled 14.4 historical note, so **current diagnosis-derived** checking and **historical** advice remain visibly distinct. Fixed warning: `Manual inspection only. The cause, target and corrective action are not verified.`

Render a short fixed evidence qualifier and fixed next-check wording mapped only from `evidenceCode + checkCode`. Do not place "Fix", "Run", "Retry", "Approve", "Apply", "Use" action buttons, command copy or success/permission badges. Other Findings get no additional lookup.

Use an independent optional Client/store, scoped to exact Session + newest Finding + connection/store generation. **At most 64 Session sources**; ≤60 seconds idle retention, LRU idle recycling, safe inert source when full; do not copy the original unbounded Phase12 base Client design. At most one in-flight optional request and <=1 read/second per retained Session. Do not start network I/O during React rendering. Reuse the established 14.4 pattern, with **stronger isolation**, not a new universal state manager.

A changing/missing base Finding, switch of Session, generation change, dispose, capacity, transport failure, malformed/unavailable response or a failed optional Client render/lifecycle method must clear history-only content immediately and cannot hide or block F1/F2 and its historical note. Strict Host `observedAt` age <1500 ms end-to-end; expire at the *remaining* deadline without relying on a new base render; stale/late responses may never resurrect a note. Host verification retraction takes effect on next read, never claim instant Browser revocation. React subtree owns an independent optional error boundary where appropriate; optionality is a **product invariant**, not merely try/catch best effort.

## 6. Performance and privacy

There is **zero additional work in Tool/approval/verifier waterfall**; all read/computation occurs only on optional Host RPC and bounded Client. No database/Storage Domain, persistent telemetry, files, logs containing sensitive evidence, new Runtime association or Phase11 writer. Host latency proof on current Finding sets 1, 64 (Session cap) and 256 (global cap), including a 512-record verification store pressure variant, p95 <=5ms and p99 <=10ms on the controlled benchmark environment; these are local budgets, not global SLAs.

Privacy proof must show no raw error/signature/target, adapterId/source, executable command or ExecutionId reaches the Browser, and no new reason/key is added to existing Phase12/14.1–14.4 Browser DTOs. No Agent tool side-effects, provider/network outside the local Harness RPC, disk persistence or policy modifications.

## 7. Required deterministic proof matrix

| ID | Mandatory gate |
| --- | --- |
| N1 | Accepted Phase12 F1/F2 eligibility, immutable Findings, conflict handling, fixed advisory bytes and existing Online Correction wire unchanged |
| N2 | Exact latest unsuppressed Finding for resolved Session; tie order, foreign/old/displaced/expired/Session-disposed Finding fail closed |
| N3 | F1 derived only from an independently qualified existing contiguous exact retry-path Finding; no new classifier or root-cause claim |
| N4 | F2 current verifier agreement and eligible mismatch required; expiry, conflict, contradictory/verifier-unavailable record suppress check but not F2 |
| N5 | Each of six supported F2 adapter mappings and F1 code produce exactly the right static next-check and evidence-code pair; unknown pairs fail closed |
| N6 | Strict exact-key RPC, tagged unions, UTF-8/serialized bounds, fixed allowlists, bad IDs, invalid cross-field, abort, no Host internal selectors or raw data |
| N7 | Host revalidates current Finding + verifier immediately before VIEW after possible state change/reentrancy; no stale/F2 source substitution |
| N8 | Original F1/F2 Dock, top three, 14.4 historical section, Native Approval and Phase14.1 runtime risk unchanged; no duplicate dock or actionable UI |
| N9 | Client 64-store bound, 60s idle recycling, stable retained source, all-active capacity fallback, exception isolation/disposed behavior |
| N10 | Client Finding/Session/generation switches, late responses, stale/wrong-kind VIEW, 1Hz single-flight and Host age 1499/1500ms exact boundary |
| N11 | Uninstall/failure-injection and optional dependency absence leave native Harness, F1/F2 and 14.4 history functional; zero Tool-path or verifier-path reads |
| N12 | Realistic deterministic F1/F2 integration, 1/64/256-sets Host performance (and 512 verifier pressure), Phase11/12/14.1–14.4/P1B/P1C/P6/P10 regressions, types/build/bundle/declarations/package/privacy and exactly one fresh complete Canonical Full |

Test fixture positives must arise from the accepted Phase12 chain and accepted stored postcondition verifier records, not arbitrary invented F2 Finding shapes in lieu of Host proof. Mocked negative/injection cases are separately labelled. No real provider/Agent campaign.

## 8. Governance and phase handoff

Do not modify Phase11 Experience/Outcome/Pattern/Guidance identity/eligibility/writers, Phase12 F1/F2 predicates/TTL/verification conflict handling or its UI DTO, Phase14.1 risk assessment, Phase14.2–14.4 optional history and approval contracts, Harness core, Tool results/arguments, permissions, native approval, scheduling, Agent prompts or output. Do not add feedback-trained risk, authorization, auto-correction, target inference, or new Finding kinds.

Only the design is being accepted at architecture time; Codex implementation remains separate, must be independently reviewed and may be promoted only after a fresh full acceptance on an exact executable candidate. Branch-before-change, candidate push for independent review, and fast-forward-only accepted main promotion remain the development process.
