# Risk Advisor — Phase 6: Operation Presentation + Browser UI | Preflight

**Verdict:** `PHASE6_PREFLIGHT_READY`  
**Date:** 2026-10-01  
**Repository:** `Dhandil/dsh-risk-advisor`  
**Accepted Phase-5 product baseline:** `8d9bc819ad145666b2c36ac742b8d9651a367e94`  
**Last accepted executable SHA:** `de8a7649dd3ce6deca5bb797ac6fc233abd740f3`  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, strictly read-only.

## 1. Formal Phase-6 scope

The frozen roadmap defines Phase 6 as:

```text
Operation Presentation + Browser UI
├── Tool-specific presentation
├── Pending
├── Ready
├── Unavailable
├── Failure Context Summary
├── Risk Detail
└── Safer Alternative
```

Phase 6 owns presentation and read-only Browser delivery only.

It does not own:

- Native Allow / Reject;
- `PendingApproval.answer()`;
- `conversation.composer`;
- a new approval waterfall listener;
- new risk inference;
- Phase-7 semantic verification;
- Phase-8 canonical/path/git/checkpoint evidence;
- Phase-9 Deep Judge;
- Harness Core changes.

## 2. Current accepted starting point

### Host

Phase 5 now provides:

- exact bound approval records;
- deterministic A1 and optional A2;
- formal six-dimension `RiskAssessment`;
- aggregate recommendation;
- sanitized findings, uncertainties and alternatives;
- Phase-3 failure context inside the immutable local Phase-5 context;
- redacted `ReviewerOperationSeed` inside the local context;
- read-only `riskAdvisorAssessments` diagnostics.

### Existing Browser bridge

P1C intentionally froze a schema that can only represent:

```text
status = unavailable
stage  = not-started
```

The current `src/host/browser-bridge.ts` still projects every bound record into that legacy unavailable shell even when Phase 5 has a real A1/A2.

### Existing Client

The current Client is still the T01 fixture:

- `RiskAdvisorDetail.tsx` renders fixture Pending / Ready Sample / Unavailable;
- `fixture-store.ts` is test-only fixture state;
- the real `createRiskAdvisorBridgeClient()` exists but is not connected to the card;
- `conversation.approval.detail` is an occupied `single` slot;
- current Risk Advisor priority `-100` intentionally becomes the active detail renderer and manually preserves shipped command-detail semantics.

Phase 6 must replace the fixture with the real Browser read path.

## 3. Pinned Harness approval seam

The pinned public seam remains:

```text
conversation.composer
  → shipped ApprovalPanel
      → conversation.approval.detail [single, session-scoped]
      → native Reject / Allow once
```

`ApprovalPanel` owns the Native buttons and calls `PendingApproval.answer()`.

Risk Advisor must never:

- register a replacement `conversation.composer`;
- call `PendingApproval.answer()`;
- import private `ApprovalPanel` / `ApprovalCommand` runtime components;
- inject DOM outside the slot model;
- add its own allow/reject/approve action.

## 4. “Additive” means composite inside the single detail cell

`conversation.approval.detail` is a `single` slot. It cannot render two independent winners.

The accepted T01 architecture already established the correct interpretation:

```text
additive to Native ApprovalPanel
≠ multiple cells in the single detail slot
```

The Phase-6 Risk Advisor renderer may remain the intentional priority winner, but it must compose:

```text
preserved shipped command-detail observable semantics
+
real Risk Advisor card
```

inside the one detail cell.

On Risk Advisor Client disposal, the shipped priority-0 `ApprovalCommand` must become active again automatically.

Do not rely on equal-priority registration order.

## 5. Browser identity and correlation

The Browser slot owner supplies:

```text
sessionId from session scope
callId from ApprovalDetail owner props
```

The Browser does not own the Host approvalId.

Required lookup remains:

```text
session scope + callId
→ Host active assessment lookup
```

Host outcomes remain:

```text
BOUND / VIEW
NOT_FOUND
AMBIGUOUS
transport unavailable
```

No Browser fallback may pick a historical or similar assessment.

AMBIGUOUS may only show assessment unavailable/evidence degraded, never a concrete Low/Approve card.

## 6. Bridge schema must evolve

The current `RiskAdvisorBridgeViewV1` is intentionally too small for Phase 6 and must not be silently reinterpreted.

Preflight recommendation: introduce a **new schema version** for real Phase-6 Browser data while keeping the existing strict V1 parser behavior available for historical/P1C tests where needed.

Recommended Phase-6 wire states:

```text
pending
ready
unavailable
cancelled
```

Recommended stages:

```text
rules
fast
complete
```

Do not expose later `evidence` / `deep` stages as active Phase-6 behavior.

The next Architecture Freeze must define exact V2 DTO fields and compatibility behavior.

## 7. Host-owned OperationPresentation

Browser must not reconstruct formal risk presentation from `useChat().argsRaw`.

`argsRaw` remains useful only to preserve the shipped command-detail observable behavior.

Formal presentation source:

```text
exact bound Phase-5 local context
  + redacted ReviewerOperationSeed
  + Phase-4 RuleEvaluation
  + Phase-3 FailureChainSummary
  + latest RiskAssessment
        ↓
Host OperationPresenter
        ↓
Browser-safe DTO
```

This keeps Redactor/closed-adapter authority on the Host.

Do not expose raw Phase-1 Foundation arguments to Browser.

## 8. Tool-specific presentation feasibility

Phase 5's redacted seed is sufficient for a bounded Phase-6 V1 presenter.

### read

Can safely present:

- action: read a file;
- redacted requested path;
- requested permission if any;
- current known/unknown scope.

Do not claim actual file contents or canonical containment.

### write

Can safely present:

- action: write a file;
- redacted requested path;
- that state may change;
- requested permission.

Cannot yet claim:

- create vs overwrite;
- change size;
- recoverability;
- canonical workspace containment.

### edit

Can safely present:

- action: edit a file;
- redacted requested path;
- requested permission.

Do not expose old/new text or fabricated diff totals.

### bash / pwsh

Can safely present:

- action: run a shell command;
- redacted bounded command;
- redacted workdir hint when retained;
- requested permission;
- Phase-4 parser confidence / deterministic findings.

The shipped command detail above/beside the card may still show its own existing Browser command projection; Risk Advisor's Host DTO remains independently redacted.

### web_fetch

Can safely present:

- external retrieval;
- redacted bounded URL;
- external/read effect.

### web_search

Can safely present:

- web search;
- up to the retained bounded redacted queries;
- external/read effect.

### unknown / unsupported

Present only a static unknown-operation summary and safe tool identity. Never traverse raw arguments.

## 9. Scope / boundary / recovery presentation

Phase 6 must reflect current evidence gaps honestly.

Current accepted Phase-5 facts still include:

```text
workspaceContained = unknown
sandboxCovered     = unknown
reversible         = unknown
```

Therefore the UI may say:

- workspace scope unknown;
- sandbox coverage unknown;
- recovery evidence unavailable;

but must not convert those into safe/unsafe guesses.

Positive deterministic system/remote facts may be shown when the assessment/finding already proves them.

Phase 6 must not call filesystem/git/checkpoint APIs to improve these labels.

## 10. Failure Context Summary

Host may derive a bounded Browser-safe summary from the exact Phase-3 `FailureChainSummary` already captured in the Phase-5 context.

Recommended safe fields:

```text
recentFailureCount
retryCount
sameRootCause: true | false | unknown
permissionEscalation: true | false | unknown
truncated
```

Optional semantic success remains absent/unknown in Phase 6 because Phase 7 has not implemented postcondition verification.

Do not send:

- raw errors;
- stdout/stderr;
- command history;
- failure fingerprints;
- raw failure codes unless specifically frozen as Browser-safe static vocabulary.

## 11. Risk Detail

Ready views may include Browser-safe projections of:

- six dimension verdicts;
- dimension source (`RULE` / `JUDGE` / `MIXED` / `UNKNOWN`);
- aggregate recommendation;
- hazard level / attention;
- static reason codes;
- sanitized deterministic findings;
- sanitized uncertainties;
- evidence quality / ledger health;
- whether Judge contributed.

Do not expose:

- ReviewerPayload;
- raw user history;
- raw Judge response;
- private reasoning;
- raw provider error;
- unredacted operation data.

## 12. Safer Alternative

Phase 5 currently provides only model-suggested alternatives when present:

```text
source = MODEL_SUGGESTED
verification = UNVERIFIED
```

Phase 6 may:

- display title/description;
- clearly label it unverified/model-suggested;
- copy bounded text to clipboard.

Phase 6 must not:

- claim it is verified safe;
- automatically modify composer input;
- auto-execute it;
- create a new approval request;
- implement a “Use safer alternative” action without a separately proven Harness public seam.

Harness exposes the public `writeClipboard` helper from `@deepseek-ai/dsh-client-ui-primitives`; prefer that instead of inventing clipboard fallback logic.

## 13. Client transport seam

P1C's authenticated Connection RPC remains the correct transport.

Host:

```text
connection.rpc.handle('/risk-advisor', ...)
```

Client:

```text
ctx.connection.rpc.call('/risk-advisor', ...)
```

The public Client connection package is:

```text
@deepseek-ai/dsh-client-connection/client
```

Phase 6 may add `connection` to the Client plugin's required injection and use the existing strict `createRiskAdvisorBridgeClient()` abstraction.

No raw fetch, hard-coded port, direct Host URL, or duplicate auth policy.

## 14. Polling / observable model

Architecture target:

```text
Browser polling ≤ 2 req/s / active session
```

Recommended implementation shape:

```text
slot inject(sessionId)
→ create/get session-scoped assessment source
→ source keyed by current callId
→ immediate read
→ bounded polling while approval detail is mounted
→ stop on ready/unavailable/cancel/dispose
```

Use an observable source exposed through the slot's `inject.hooks` mechanism where practical, rather than calling `useSyncExternalStore` over an ad-hoc global store inside the card.

500ms is the maximum normal polling frequency allowed by the architecture target. Slower backoff is acceptable.

Requirements:

- one active poller per exact `(sessionId, callId)` view binding;
- AbortController per in-flight read;
- connection generation reset invalidates cached Host view and triggers safe repull;
- slot unmount/plugin dispose aborts polling;
- stale response from an older callId/generation cannot overwrite current state;
- no polling after final terminal/unavailable state unless explicitly frozen for bounded retry.

Exact retry/backoff policy remains an Architecture Freeze decision.

## 15. Pending semantics

There is an unavoidable short race:

```text
Native approval/request is visible in Browser
before
durable approval/asked → Host assessment record is queryable
```

Therefore one early `active → NOT_FOUND` must not immediately be rendered as a confident permanent unavailable conclusion.

Preflight recommendation:

- initial transport/NOT_FOUND during a bounded grace window → `Pending / analyzing`;
- once Host returns an explicit bound/unavailable/correlation result, follow Host truth;
- AMBIGUOUS is immediately unavailable/degraded, never pending-to-a-guessed-candidate;
- grace expiry without a bound record → unavailable.

The exact grace duration/poll count must be frozen next and must stay within the ≤2 req/s budget.

## 16. Ready semantics

`ready` means a formal A1 or A2 exists and the Host returned a safe presentation.

It does not mean:

- assessment status COMPLETE;
- EvidenceQuality HIGH;
- Judge succeeded;
- operation is safe;
- recommendation APPROVE.

The card must still prominently show PARTIAL/DEGRADED/UNKNOWN dimensions when applicable.

If A2 supersedes A1 while the approval remains pending, Browser may update from A1 to A2 using the same bound approval view. It must not flash an unrelated assessment.

## 17. Unavailable / cancelled semantics

Unavailable reasons may include:

- no active exact correlation after bounded grace;
- ambiguous correlation;
- Host bridge unavailable;
- protocol invalid;
- assessment record unavailable;
- plugin/connection unavailable.

Browser transport failure must never remove or disable Native approval buttons.

`cancelled` is presentation-only for an observed closed/cancelled advisory lifecycle when it can still be rendered; Native approval cancellation remains Harness-owned.

## 18. Browser-safe reason vocabulary

The current `BROWSER_SAFE_REASON_CODES` only covers Phase-1 shell reasons.

Phase 6 will need a frozen expanded Browser-safe vocabulary for presentation, including bounded categories such as:

- correlation unavailable/ambiguous;
- assessment degraded;
- Judge unavailable/timeout/invalid output;
- context degraded;
- history omitted;
- recovery/canonical evidence unavailable;
- transport/protocol unavailable.

Do not simply forward arbitrary Host `AssessmentReasonCode` strings or provider errors.

Exact V2 safe reason enum remains an Architecture Freeze decision.

## 19. Presentation DTO versioning

Preflight recommends three layers:

```text
OperationPresentationV1
RiskAssessmentBrowserViewV1
RiskAdvisorBridgeViewV2
```

where `RiskAdvisorBridgeViewV2` contains only Browser-safe projections, not the Host `RiskAssessment` object by reference.

This makes Browser privacy/version compatibility explicit and prevents future Host-only fields from leaking automatically.

Recommended V2 high-level shape:

```text
schemaVersion: 2
sessionId
callId
assessmentId?
association
status
stage
operation?
assessment?
ruleSummary?
failureContext?
reasonCodes
updatedAt
```

The next Architecture Freeze must define every field/bound and parser rule.

## 20. UI information hierarchy

The architecture freezes the following default hierarchy:

### Always-visible summary

- what the operation is about to do;
- Risk;
- Recommendation;
- one concise reason;
- Safer Alternative when available.

### Expandable detail

- Authorization;
- Necessity;
- Privilege;
- Evidence Quality;
- affected resources / scope;
- execution boundary known/unknown;
- recovery/reversibility;
- failure/retry/escalation context;
- deterministic rule findings;
- Reviewer source (`rules-only` vs `fast-judge-assisted`).

Do not display chain-of-thought or Reviewer prompt.

## 21. Styling and native coexistence

Phase 6 should visually read as an advisory sub-card inside Native ApprovalPanel, not as a second approval dialog.

Requirements:

- no duplicate Reject/Allow buttons;
- no visual affordance implying Risk Advisor is the authority;
- advisory label/copy;
- unknown/degraded evidence visually distinguishable from Low;
- keyboard focus remains usable within the Native approval scroll container;
- card failure is isolated by a local error boundary;
- native command detail remains visible when it exists;
- plugin disable restores shipped detail renderer.

## 22. Client fixture retirement

`R1FixtureStore` / READY_SAMPLE behavior is no longer the product UI after Phase 6.

Phase 6 may delete or move fixture-only code/tests once equivalent real pending/ready/unavailable coverage exists.

Do not keep fixture state reachable as a production fallback that could be mistaken for real assessment.

## 23. Browser security / privacy

Host V2 DTO and Client parser must enforce:

- exact keys;
- bounded identifiers;
- bounded strings/arrays/findings/alternatives/reasons;
- known enums only;
- plain data only;
- deep freeze/detached snapshots;
- no raw args/user history/evidence contents/secret values;
- no raw provider messages/errors;
- no operationFingerprint/hash unless specifically needed and frozen (preflight recommends omit).

Client must treat Host response as untrusted wire data and strictly parse it before rendering.

## 24. Performance boundary

Phase 6 adds Browser work only.

Targets:

- polling ≤2 req/s per active approval view;
- bounded DTO size;
- no expensive JSON tree rendering of Host internals;
- no LLM/filesystem/git/network evidence calls from Browser;
- UI render/update must not affect Native Approval response latency.

A Phase-6 browser/bridge benchmark may measure local RPC/poll/render behavior, but must not rewrite Phase-5 Judge latency evidence.

## 25. Live Browser evidence boundary

Historical T01 reached authentic jsdom SlotRegistry + Native ApprovalPanel integration but left:

```text
LIVE_BROWSER_NOT_RUN
```

Phase 6 is the first real product Browser UI phase, so Architecture Freeze should require:

- component tests;
- real Cordis slot + Native ApprovalPanel integration;
- Host↔Client Connection RPC integration with strict V2 parser;
- Browser lifecycle polling tests;
- and, if a safe disposable supported Browser runner/profile exists, one real live Browser smoke.

If no safe runner exists, report Live Browser NOT_RUN honestly. Do not modify Harness or production/user settings to manufacture it.

Cold-start installation remains a later/final hardening/DoD gate unless a safe disposable path is available now.

## 26. Coexistence

Architecture V1 requires coexistence testing with at least one approval plugin.

Phase 6 should at minimum preserve and test:

- Native ApprovalPanel;
- shipped `ApprovalCommand` semantics;
- Risk Advisor enable/disable;
- one available existing approval plugin path if it can be staged entirely through public APIs without changing Harness.

Do not claim coexistence from source inspection alone.

Exact plugin selected and evidence level remain Freeze/implementation decisions.

## 27. Proposed focused Phase-6 validation matrix

### Host presentation

1. read presentation;
2. write presentation without create/overwrite fabrication;
3. edit presentation without diff-content leakage;
4. bash/pwsh redacted command presentation;
5. web_fetch redacted URL;
6. web_search bounded redacted queries;
7. unknown tool no raw args;
8. system/remote positive scope when proven;
9. unknown workspace/sandbox/recovery remains unknown;
10. failure summary counts/escalation/same-root-cause.

### Bridge V2

11. real A1 projects to ready V2;
12. A2 supersession updates same active approval;
13. pending bound shell without A1;
14. unbound/not-found;
15. ambiguous;
16. cancelled/closed lifecycle where renderable;
17. exact-key parser rejects extra fields;
18. oversized strings/arrays rejected;
19. Host DTO contains no raw prompt/args/secret/evidence;
20. legacy V1 compatibility behavior is explicit/tested.

### Client polling

21. immediate initial read;
22. ≤2 req/s normal polling;
23. bounded NOT_FOUND grace → pending then unavailable;
24. AMBIGUOUS immediately unavailable;
25. A1 ready stops/changes polling according to freeze;
26. A1→A2 update while approval remains open;
27. callId/session switch cannot receive stale old response;
28. connection/reset repulls;
29. unmount aborts in-flight RPC;
30. plugin disposal leaves no poller.

### UI

31. shipped command observable preserved;
32. pending card;
33. ready summary;
34. partial/degraded/unknown not rendered as Low;
35. expandable six-dimension detail;
36. deterministic findings/uncertainties;
37. failure/retry/escalation summary;
38. model-suggested alternative labeled UNVERIFIED;
39. copy alternative succeeds/fails honestly;
40. no Use/Execute alternative button;
41. local card error boundary preserves native controls;
42. plugin dispose restores shipped ApprovalCommand;
43. callId absent still leaves Native Approval usable and detail slot absent.

### Authority/privacy/coexistence

44. no `PendingApproval.answer()` call from Risk Advisor;
45. Reject / Allow once behavior unchanged;
46. no `conversation.composer` replacement;
47. no Host mutation RPC;
48. no Browser raw-args risk reconstruction;
49. no secret fixture in bridge/client rendered snapshot;
50. one public-API approval-plugin coexistence case when safely stageable.

## 28. STOP conditions

Stop with `PHASE6_ARCHITECTURE_DECISION_REQUIRED` if:

- the only way to show real assessment is to replace `conversation.composer`;
- shipped command detail cannot be preserved through public APIs;
- Browser needs raw Host arguments or full ReviewerPayload;
- OperationPresentation requires Phase-8 evidence to avoid fabrication;
- a safer-alternative “Use” action requires private DOM/input hacks;
- Client must call `PendingApproval.answer()`;
- polling cannot stay ≤2 req/s;
- bridge must bypass Connection authentication;
- ambiguous correlation would require selecting a candidate;
- Phase 6 would need to modify the six-dimension/P0–P9 semantics;
- Harness Core modification is required.

Unknown/unavailable presentation is preferred over invented certainty.

## 29. Inherited open / deferred boundaries

Preserve unchanged:

- F-006 PARTIAL;
- F-013 PARTIAL;
- general guard-returned denial PARTIAL/UNKNOWN without complete witness;
- true disk/process restart NOT_RUN;
- real native PTC producer NOT_RUN;
- WebWorker NOT_VALIDATED;
- newer Harness/V4 NOT_VALIDATED;
- Phase-7 semantic verification NOT_IMPLEMENTED;
- Phase-8 canonical/git/checkpoint evidence NOT_IMPLEMENTED;
- Phase-9 Deep Judge NOT_IMPLEMENTED;
- real-provider Judge latency / production scheduler policy UNDETERMINED;
- live Browser smoke remains NOT_RUN until Phase-6 implementation actually proves otherwise.

## 30. Preflight verdict

`PHASE6_PREFLIGHT_READY`

No pinned-source fact blocks Phase 6.

The required seams already exist:

- exact Host assessment identity and real A1/A2;
- redacted ReviewerOperationSeed for tool-specific presentation;
- Phase-3 failure context;
- P1C authenticated Connection RPC;
- public Client `connection` service;
- public session-scoped `conversation.approval.detail`;
- public clipboard helper;
- proven composite single-slot coexistence pattern.

The next Architecture Freeze must explicitly settle:

1. exact Bridge V2 wire schema and bounds;
2. exact OperationPresentation DTO and per-tool text rules;
3. pending NOT_FOUND grace/backoff policy;
4. A1→A2 polling/update policy;
5. expanded Browser-safe reason vocabulary;
6. exact Browser projection of six dimensions/findings/uncertainties/provenance;
7. safer-alternative copy text and unverified labeling;
8. session/callId observable-store lifecycle and connection-reset behavior;
9. T01 fixture retirement/migration plan;
10. exact browser/coexistence/live-smoke evidence requirements.

This preflight performs repository/source inspection only. It introduces no executable/client/test/package change, no Browser mutation, no Native Approval change, no external provider/network call, and no Phase-7+ functionality.