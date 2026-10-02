# Risk Advisor — Product Phase 6: Operation Presentation + Browser UI | Architecture Freeze

**Status:** FROZEN FOR IMPLEMENTATION; final acceptance belongs to ChatGPT Web.  
**Date:** 2026-10-01  
**Task directory:** `docs/tasks/Phase6-operation-presentation-browser-ui/`  
**Architecture checkpoint:** `f291cca68be7529c60a3ecbb44c0aeb9fe532a5c` (Phase-6 Preflight publication).  
**Accepted pre-Phase-6 product baseline:** `8d9bc819ad145666b2c36ac742b8d9651a367e94`.  
**Last accepted executable SHA:** `de8a7649dd3ce6deca5bb797ac6fc233abd740f3`.  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, STRICTLY READ-ONLY.

## 1. Objective

Implement the frozen V1 roadmap's **Phase 6 — Operation Presentation + Browser UI**.

Phase 6 owns only the read-only presentation path:

```text
Phase-5 A1/A2 + redacted operation context
        ↓
Host OperationPresenter
        ↓
strict Browser-safe Bridge V2
        ↓
session/call-scoped Client polling source
        ↓
Risk Advisor advisory card inside Native ApprovalPanel
```

Phase 6 does not own execution, approval authority, new risk inference, semantic verification, evidence collection, or Deep Judge.

## 2. Authority boundaries

- Host remains the only source of Risk Advisor presentation truth.
- Phase 5 remains the six-dimension RiskAssessment / recommendation authority.
- Phase 4 remains deterministic rule authority.
- Phase 3 remains failure/retry/escalation authority.
- Browser performs strict parsing and presentation only.
- Browser must not reconstruct Risk Advisor facts from raw Tool Arguments or `useChat().argsRaw`.
- `useChat().argsRaw` may be used only to preserve the shipped command-detail observable already established by T01.
- Native `ApprovalPanel` and `PendingApproval.answer()` remain the sole approval-decision path.
- Risk Advisor never registers its own Allow/Reject/Approve action.

## 3. Single-slot coexistence

`conversation.approval.detail` is a session-scoped `single` slot.

Risk Advisor keeps the accepted T01 composition model:

```text
Native ApprovalPanel
  ├── Risk Advisor detail renderer (priority -100, intentional winner)
  │     ├── preserved shipped command-detail observable
  │     └── real Risk Advisor advisory card
  └── Native Reject / Allow once buttons
```

Risk Advisor must not:

- replace `conversation.composer`;
- import/call private ApprovalPanel/ApprovalCommand implementations;
- duplicate Native action buttons;
- depend on equal-priority registration order.

When Risk Advisor Client is disposed, its slot registration disappears and the shipped priority-0 ApprovalCommand becomes active again.

## 4. Host presentation source

Do not expose the whole Phase-5 context to Browser.

Add a package-private, read-only source projection from the exact active approval record containing only:

```text
sessionId
callId
approval association/lifecycle metadata
latest formal RiskAssessment when present
redacted ReviewerOperationSeed when present
Phase-4 RuleEvaluation
Phase-3 FailureChainSummary
sanitized assessment reason codes
updatedAt
```

Do not include:

- direct-user ring/messages;
- ReviewerPayload;
- raw provider response;
- raw arguments/content/justification;
- full Ledger;
- raw tool result/stdout/stderr;
- private scheduler handles.

The coordinator may expose a package-private `queryActivePresentationForCall(session, callId)` or equivalent. This is not a new public authority surface.

## 5. Phase-5 lifecycle stage exposed to Phase 6

The current legacy Phase-1B shell cannot accurately represent A1/A2 lifecycle. Phase 6 may add read-only lifecycle state without changing Phase-5 assessment semantics.

Freeze:

```text
rules     = exact bound record exists, deterministic A1 construction/publish is in progress
fast      = A1 exists and a valid Judge job may still publish A2
complete  = latest A1/A2 is final for this open approval; no future A2 can arrive
```

Rules:

- Judge disabled/config unavailable/capability unavailable/no route/no eligible dimension → A1 stage becomes `complete` after the decision is known.
- Judge queued/running → latest A1 remains readable with stage=`fast`.
- valid A2 or terminal Judge failure/timeout/saturation → stage=`complete`.
- native approval decision closes the advisory record and fences future A2 exactly as Phase 5 already requires.

Do not infer `fast` merely from `assessment.provenance.judge.invoked`; track lifecycle explicitly if necessary.

## 6. OperationPresentationV1

Host creates a detached/deeply-frozen Browser-safe operation DTO.

Frozen shape:

```ts
type BrowserOperationKind =
  | 'filesystem-read'
  | 'filesystem-write'
  | 'filesystem-edit'
  | 'shell'
  | 'network-read'
  | 'unknown'

interface OperationPresentationV1 {
  readonly schemaVersion: 1
  readonly kind: BrowserOperationKind
  readonly toolName: string
  readonly title: string
  readonly summary: string
  readonly resources: readonly {
    readonly kind: 'path' | 'url' | 'query' | 'workdir' | 'other'
    readonly label: string
  }[]
  readonly requestedPermission?: 'workspace-write' | 'danger-full-access'
  readonly parserConfidence: 'high' | 'medium' | 'low'
  readonly mutating: boolean | 'unknown'
  readonly externalEffect: boolean | 'unknown'
  readonly networkEffect: 'none' | 'read' | 'write' | 'unknown'
  readonly workspaceContained: 'unknown'
  readonly sandboxCovered: 'unknown'
  readonly reversible: 'unknown'
}
```

Bounds:

```text
toolName <= 128
title <= 160
summary <= 1200
resources <= 8
resource label <= 512
total operation presentation text <= 6000
```

All text is already redacted/sanitized on Host.

## 7. Tool-specific presentation rules

### read

- title: static read-file wording;
- path hint may come only from redacted seed resourceHints;
- mutating=false/externalEffect=false from accepted RuleEvaluation;
- never claim file contents/canonical path.

### write

- title: static write-file wording;
- show redacted requested target;
- state that local state may change;
- never say create/overwrite/replace unless later evidence proves it.

### edit

- title: static edit-file wording;
- show redacted requested target;
- never expose old/new content or fabricated diff counts.

### bash / pwsh

- title: static shell wording;
- redacted command may be shown from `ReviewerOperationSeed.operationText`;
- redacted workdir/resource hint may be shown;
- no raw args.

### web_fetch

- static external-retrieval wording;
- redacted bounded URL may be shown;
- external/read effect may be shown.

### web_search

- static web-search wording;
- redacted retained queries may be shown as query resources;
- external/read effect may be shown.

### unknown/unsupported

- static `Unknown operation` summary;
- safe tool identity only;
- no raw argument traversal.

## 8. BrowserRiskAssessmentV1

Do not transmit the Host `RiskAssessment` object by reference. Project it into a strict Browser-safe DTO.

Frozen high-level shape:

```ts
interface BrowserRiskAssessmentV1 {
  readonly schemaVersion: 1
  readonly assessmentId: string
  readonly status: 'COMPLETE' | 'PARTIAL' | 'DEGRADED'
  readonly dimensions: {
    readonly risk: BrowserDimension
    readonly authorization: BrowserDimension
    readonly necessity: BrowserDimension
    readonly privilege: BrowserDimension
    readonly alternatives: BrowserDimension
    readonly evidenceQuality: BrowserDimension
  }
  readonly aggregate: {
    readonly recommendation:
      | 'APPROVE'
      | 'APPROVE_WITH_CAUTION'
      | 'PREFER_SAFER_ALTERNATIVE'
      | 'NEED_MORE_INFORMATION'
      | 'REJECT_RECOMMENDED'
    readonly hazardLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN'
    readonly attention: 'NORMAL' | 'ELEVATED' | 'URGENT'
    readonly primaryReasonCodes: readonly string[]
  }
  readonly findings: readonly BrowserFinding[]
  readonly uncertainties: readonly BrowserUncertainty[]
  readonly alternatives: readonly BrowserAlternative[]
  readonly evidence: {
    readonly ledgerHealth: 'HEALTHY' | 'RECOVERED' | 'DEGRADED'
  }
  readonly judgeAssisted: boolean
  readonly supersedesAssessmentId?: string
}
```

### BrowserDimension

Expose only:

```text
verdict
source = RULE | JUDGE | MIXED | UNKNOWN
evidenceQuality = HIGH | MEDIUM | LOW
reasons[]
```

Bounds:

- reasons <= 8;
- each reason code/message <= 256 and must be sanitized/static-origin data;
- do not send basisFeatureIds/eventIds to Browser in Phase 6.

### Findings

Bounds:

- max 32;
- code <= 128;
- title <= 160;
- detail <= 800;
- known dimension/severity/strength enums only.

### Uncertainties

Bounds:

- max 16;
- code <= 128;
- description <= 800;
- optional resolutionHint <= 800;
- known impact enum only.

### Alternatives

Bounds:

- max 3;
- title <= 160;
- description <= 800;
- source must be known enum;
- verification must be known enum.

Phase 6 must prominently preserve `MODEL_SUGGESTED / UNVERIFIED` when that is the source.

## 9. FailureContextPresentationV1

Frozen shape:

```ts
interface FailureContextPresentationV1 {
  readonly schemaVersion: 1
  readonly retryCount: number
  readonly recentFailureCount: number
  readonly sameRootCause: boolean | 'unknown'
  readonly permissionEscalation: boolean | 'unknown'
  readonly truncated: boolean
}
```

Do not transmit raw failure entries, codes, fingerprint, stdout/stderr or command history.

Counts are non-negative safe integers and bounded to the already accepted Phase-3 range.

## 10. Browser-safe Host reason vocabulary V2

Bridge V2 uses a new closed Browser-safe reason union. Do not forward arbitrary Host reason strings.

Freeze the V2 set to:

```text
FOUNDATION_DEGRADED
FOUNDATION_UNAVAILABLE
MISSING_CALL_ID
MISSING_SCOPE_IDENTITY
NO_ACTIVE_EXECUTION
RUNTIME_STATE_LOST
OBSERVATION_UNAVAILABLE
AMBIGUOUS_EXECUTION
CORRELATION_CONFLICT
CONTEXT_DEGRADED
REDACTION_FAILED
HISTORY_OMITTED
CANONICAL_TARGETS_UNAVAILABLE
RECOVERY_EVIDENCE_UNAVAILABLE
JUDGE_DISABLED
JUDGE_CONFIG_UNAVAILABLE
JUDGE_CAPABILITY_UNAVAILABLE
JUDGE_ROUTE_UNAVAILABLE
JUDGE_QUEUE_SATURATED
JUDGE_TIMEOUT
JUDGE_STREAM_ERROR
JUDGE_ABORTED
JUDGE_INVALID_OUTPUT
NATIVE_OUTCOME_OBSERVED
ASSESSMENT_UNAVAILABLE
```

`ASSESSOR_NOT_IMPLEMENTED` remains a V1/P1B legacy reason only and is not emitted for a real Phase-6 ready assessment.

Transport/protocol reasons remain Client transport state (`TRANSPORT_UNAVAILABLE`, `HOST_REJECTED`, `PROTOCOL_INVALID`, `CANCELLED`) rather than pretending to be Host assessment reasons.

## 11. RiskAdvisorBridgeViewV2

Introduce a new schema; do not reinterpret V1.

Frozen V2 shape:

```ts
interface RiskAdvisorBridgeViewV2 {
  readonly schemaVersion: 2
  readonly sessionId: string
  readonly callId: string
  readonly assessmentId?: string
  readonly association: 'BOUND' | 'UNBOUND'
  readonly status: 'pending' | 'ready' | 'unavailable' | 'cancelled'
  readonly stage: 'rules' | 'fast' | 'complete'
  readonly operation?: OperationPresentationV1
  readonly assessment?: BrowserRiskAssessmentV1
  readonly failureContext?: FailureContextPresentationV1
  readonly reasonCodes: readonly BrowserSafeReasonCodeV2[]
  readonly updatedAt: number
}
```

Rules:

- `ready` requires `association=BOUND`, assessmentId, operation, assessment and failureContext.
- `pending` requires BOUND but no formal Browser-safe assessment yet.
- `unavailable` may be BOUND or UNBOUND; it must not carry a fabricated assessment.
- `cancelled` is advisory lifecycle presentation only.
- A2 updates assessmentId and may set `supersedesAssessmentId` inside assessment.
- sessionId/callId/assessmentId <= 256.
- reasonCodes <= 24.
- updatedAt finite non-negative.

Bridge `RiskAdvisorBridgeRead` remains:

```text
VIEW(V1 | V2)
NOT_FOUND
AMBIGUOUS
```

Strict client parsing must distinguish schema versions explicitly.

## 12. V1 compatibility

Preserve the strict V1 parser and P1C regression semantics.

Do not make V1 suddenly accept ready/real assessment fields.

Host Phase-6 `active` / `assessment` endpoints return V2 for current Phase-6 records. Historical unit fixtures may still parse V1 through the shared contract.

Client parser must accept valid V1 only for compatibility; the Phase-6 product store treats a V1 unavailable/not-started VIEW as unavailable legacy data and never as real ready assessment.

## 13. Host projection status rules

### Ready

If exact BOUND record has a formal latest A1/A2 and presenter succeeds:

```text
status=ready
stage=fast when A1 exists and a future A2 is still possible
stage=complete otherwise
```

### Pending

Host may return pending only for an exact BOUND open record where deterministic A1 is not yet materialized and no terminal local failure has been established.

### Unavailable

Use unavailable for:

- correlation conflict/unbound record;
- local presentation projection failure;
- exact bound record that permanently lacks a safe A1 after local assessment failure;
- closed non-cancelled advisory lifecycle when still queryable.

### Cancelled

Use only when native observed outcome is cancelled and the closed record remains queryable.

Do not map Reject or Allow once to Risk Advisor recommendation status.

## 14. Browser-side NOT_FOUND grace

Because Browser approval/request can appear before durable Host `approval/asked`, NOT_FOUND receives a bounded Client grace.

Freeze:

```text
POLL_INTERVAL_MS = 1000
NOT_FOUND_GRACE_MS = 3000
```

Behavior for a new `(sessionId, callId)` binding:

1. issue one immediate active read;
2. if NOT_FOUND, expose local `pending/analyzing` state;
3. retry no more frequently than every 1000ms;
4. after 3000ms since first read without any bound VIEW, expose unavailable `NO_ACTIVE_EXECUTION`-equivalent Client state;
5. AMBIGUOUS bypasses grace and becomes unavailable immediately;
6. transport/protocol failure bypasses NOT_FOUND grace and becomes transport unavailable; connection reset may later trigger a new read.

An immediate read plus 1-second polling stays within the architecture's ≤2 requests/sec target.

## 15. A1→A2 polling policy

For a V2 VIEW:

- `ready + stage=fast` → continue polling every 1000ms while the approval detail remains mounted;
- `ready + stage=complete` → stop polling;
- `unavailable` → stop normal polling;
- `cancelled` → stop;
- `pending/rules` → continue at 1000ms;
- if callId/session binding changes, abort old read and create a new generation.

Do not poll by assessmentId after the active binding changes.

Every response is fenced by `(sessionId, callId, storeGeneration, requestGeneration)` so stale responses cannot overwrite the current binding.

## 16. Connection reset

Client `connection` generation/reset invalidates any cached Host truth for that binding.

On reset/reconnect:

- abort current in-flight request;
- increment local generation;
- preserve no ready state as authoritative across the generation boundary;
- issue one immediate fresh `active(sessionId, callId)` read if the slot remains mounted;
- do not reset the NOT_FOUND grace indefinitely for repeated reconnect churn; a single mounted binding retains its original grace-start timestamp unless callId/session changes.

## 17. Client presentation store

Use one scoped source per exact `(sessionId, callId)` binding.

Recommended public-to-component shape:

```text
getSnapshot()
subscribe(listener)
start()/mount reference
dispose()/unmount reference
```

The store owns RPC scheduling/AbortController/generation fencing. React components do not call RPC directly.

No ad-hoc process-global mutable singleton reachable outside Client plugin lifetime.

Dispose stops timers and aborts in-flight reads.

## 18. Client injection/dependencies

Phase 6 may add the pinned public connection client capability:

```text
@deepseek-ai/dsh-client-connection
```

to Client injection/peer/dev declarations as required by the pinned package.

Phase 6 may use the pinned public `writeClipboard` helper from:

```text
@deepseek-ai/dsh-client-ui-primitives
```

Do not use direct raw `fetch` or hard-coded Host URL.

Do not add a new runtime dependency merely for state management.

## 19. UI information hierarchy

### Always visible

- advisory title/disclaimer;
- operation title/summary;
- Risk verdict;
- aggregate Recommendation;
- one primary static reason when present;
- assessment status PARTIAL/DEGRADED when applicable;
- safer alternative teaser/card when present.

### Expandable detail

- Authorization;
- Necessity;
- Privilege;
- Alternatives dimension;
- Evidence Quality;
- remaining findings;
- uncertainties;
- workspace/sandbox/recovery unknowns;
- Failure Context Summary;
- whether Judge assisted the assessment.

`ready` must never visually imply `safe`.

UNKNOWN/PARTIAL/DEGRADED must remain visually distinct from LOW.

## 20. Safer Alternative UI

Only `Display + Copy` is allowed.

Model suggestions must show:

```text
Model suggested
Unverified
```

Copy payload is bounded to:

```text
title + newline + description
<= 1200 chars total
```

Use the pinned Harness `writeClipboard` helper.

Copy success/failure may update local UI affordance only; it must not mutate Host/Session/Approval.

No `Use`, `Execute`, `Apply`, composer rewrite or new approval action.

## 21. Command-detail preservation

The accepted T01 `commandForSnapshot()` observable remains the compatibility target for shipped command detail.

Phase 6 may refactor the rendering component but must preserve its observable command text behavior for existing tests.

That Browser command projection is not an input to Risk Advisor assessment/presentation.

## 22. Fixture retirement

`R1FixtureStore` and READY_SAMPLE must leave the Phase-6 production path.

Allowed:

- delete fixture production code after equivalent real-store tests exist;
- retain narrowly scoped fixture helpers only under tests.

Forbidden:

- fallback to READY_SAMPLE when Host transport fails;
- any production state that can be mistaken for a real assessment.

Update package description/comments that still call Risk Advisor a disposable fixture.

## 23. Client error boundary

Keep a local error boundary around the Risk Advisor card.

On Risk Advisor rendering failure:

- render a small advisory-unavailable fallback;
- do not throw through Native ApprovalPanel;
- do not remove command detail;
- do not affect Native buttons.

## 24. Browser privacy

Host presenter and Client parser must ensure Browser never receives:

- direct-user history;
- ReviewerPayload;
- raw Tool Arguments;
- write/edit content;
- approval justification;
- secret values/hashes;
- raw provider response/error;
- private reasoning;
- stdout/stderr;
- operation fingerprint/hash;
- full RiskFeatureSet;
- basisEventIds/feature graph.

Static finding/uncertainty descriptions already sanitized by Phase 5 may be re-bounded but not expanded with raw values.

## 25. Strict parsing

V2 parser requirements:

- plain/null-prototype objects only;
- exact keys at every object level;
- known enums;
- finite numbers;
- safe integers for counts;
- frozen maxima from this Freeze;
- reject extra properties;
- reject malformed nested arrays/objects;
- deep-freeze returned snapshot;
- never partial-salvage an invalid ready assessment into a low-risk card.

Protocol-invalid data becomes Client `PROTOCOL_INVALID` unavailable.

## 26. UI text / localization

Add Phase-6 locale keys under the existing Risk Advisor namespace.

Minimum states:

```text
Analyzing
Assessment unavailable
Risk
Recommendation
Authorization
Necessity
Privilege
Evidence quality
Findings
Uncertainties
Failure context
Model suggested
Unverified
Copy
Copied
Copy failed
Workspace scope unknown
Sandbox coverage unknown
Recovery evidence unavailable
Rules only
Judge assisted
```

Do not put raw operation data inside translated format strings when plain React children can render bounded data separately.

## 27. Browser-safe coexistence

Phase-6 acceptance requires authentic jsdom/Cordis slot integration with the pinned Native ApprovalPanel behavior:

- Risk Advisor priority -100 wins detail cell while enabled;
- preserved command presentation still renders;
- Native Reject/Allow once remain rendered and functional through the Native owner;
- Risk Advisor never calls answer();
- Client disposal restores shipped priority-0 detail renderer.

A second real approval plugin coexistence smoke should be run only if a public-API-only disposable fixture is already available in the repository/pinned Harness. Otherwise report `APPROVAL_PLUGIN_COEXISTENCE_NOT_RUN` rather than modifying Harness or inventing private integration.

## 28. Live Browser evidence

Phase 6 should attempt one safe disposable real-browser smoke **only if** the repository/pinned Harness already exposes a supported disposable runner/profile path that requires no user profile, production settings or Harness mutation.

If no such path exists:

```text
LIVE_BROWSER_NOT_RUN
```

is an accepted Phase-6 evidence limitation and must be carried forward.

Do not add Playwright/another browser dependency solely to manufacture this gate.

## 29. Performance boundary

Phase-6 local performance proof must cover:

- RPC payload bounded size;
- 1-second polling interval;
- one poller per mounted `(sessionId,callId)` binding;
- no poller/timer leak after unmount;
- no Host LLM/filesystem/git/evidence call caused by Browser reads;
- Native Approval response path does not await Browser RPC/polling.

Do not rewrite Phase-5 R5 Judge latency evidence.

## 30. Mandatory focused tests

At minimum prove:

### Host presenter

1. read presentation;
2. write presentation without create/overwrite fabrication;
3. edit without old/new leakage;
4. bash/pwsh redacted command;
5. web_fetch redacted URL;
6. web_search bounded queries;
7. unknown tool no raw args;
8. positive system/remote facts only when already proven;
9. workspace/sandbox/reversible remain unknown;
10. failure context safe fields only.

### Bridge V2

11. real A1 → ready V2;
12. A1 fast stage;
13. A2 supersession → ready complete;
14. exact bound pending shell;
15. unavailable bound/unbound;
16. ambiguous read remains AMBIGUOUS;
17. cancelled projection;
18. V1 parser compatibility unchanged;
19. V2 exact-key strict parser;
20. all string/array maxima;
21. no raw prompt/args/secrets in serialized V2.

### Client source

22. immediate fetch;
23. first NOT_FOUND → pending;
24. 1000ms polling;
25. 3000ms grace expiry → unavailable;
26. AMBIGUOUS bypasses grace;
27. ready fast continues polling;
28. ready complete stops;
29. A1→A2 updates same binding;
30. stale request generation ignored;
31. callId/session switch aborts old request;
32. connection reset repulls;
33. reconnect does not extend grace indefinitely;
34. unmount/dispose clears timers and aborts RPC.

### UI

35. command observable preserved;
36. pending card;
37. ready LOW presentation;
38. ready UNKNOWN/PARTIAL/DEGRADED never rendered as LOW;
39. all six dimensions expandable;
40. findings/uncertainties rendered boundedly;
41. failure context rendered;
42. judge-assisted/rules-only label;
43. safer alternative shows MODEL_SUGGESTED + UNVERIFIED;
44. clipboard copy through public helper;
45. no Use/Execute button;
46. local card error boundary preserves command/native panel;
47. missing callId leaves Risk Advisor detail absent without affecting Native Approval;
48. plugin disposal restores shipped renderer.

### Authority/privacy

49. Risk Advisor source contains no `PendingApproval.answer()` use;
50. no `conversation.composer` replacement;
51. no Host mutation RPC;
52. no Browser risk derivation from argsRaw;
53. no secret fixture in V2/Client rendered snapshot;
54. Native Reject/Allow once behavior parity;
55. prior Phase 1–5 regressions remain green.

## 31. Validation order

Use project governance:

```text
implementation
→ Phase-6 focused Host/bridge/client/UI tests
→ Phase-5 regression
→ Phase-4 regression
→ Phase-3 regression
→ Phase-2 regression
→ Phase-1B/1C + T01/R1/R4 regressions as affected
→ typecheck
→ build
→ Host export smoke
→ Client export smoke
→ declaration/root-export audit
→ pack dry-run
→ diff/scope/privacy scan
→ Browser/Cordis integration + optional supported live smoke
→ commit executable/test/package state
→ exactly one fresh complete pnpm test on that exact SHA
→ report-only publication
```

After final Full, no executable/test/config/package semantic drift.

## 32. STOP conditions

Stop with `PHASE6_ARCHITECTURE_DECISION_REQUIRED` if implementation would require:

- replacing `conversation.composer`;
- calling `PendingApproval.answer()`;
- importing private Native Approval implementation to preserve behavior;
- raw Host arguments/full ReviewerPayload in Browser DTO;
- Browser-side re-evaluation of risk;
- a new mutation RPC;
- selecting a candidate from AMBIGUOUS correlation;
- polling faster than frozen budget;
- composer/DOM hacks for safer alternative;
- Phase-7/8/9 capabilities;
- changing six-dimension/P0–P9 semantics;
- Harness Core modification.

Unknown/unavailable is preferred over fabricated certainty.

## 33. Inherited evidence boundaries

Preserve:

- F-006 PARTIAL;
- F-013 PARTIAL;
- guard-returned denial PARTIAL/UNKNOWN where witness absent;
- true disk/process restart NOT_RUN;
- real native PTC producer NOT_RUN;
- WebWorker NOT_VALIDATED;
- newer Harness/V4 NOT_VALIDATED;
- Phase-7 semantic verification NOT_IMPLEMENTED;
- Phase-8 canonical/git/checkpoint evidence NOT_IMPLEMENTED;
- Phase-9 Deep Judge NOT_IMPLEMENTED;
- real-provider Judge latency/policy UNDETERMINED;
- live Browser/coexistence limitations honestly reported if no supported disposable path exists.

## 34. Frozen verdict

`PHASE6_ARCHITECTURE_FROZEN_FOR_IMPLEMENTATION`

Phase 6 is implementable on the accepted Phase-5 baseline and pinned Harness through a strict Host-owned presentation DTO, authenticated Connection RPC, bounded session/call-scoped Client polling, and an advisory composite detail renderer that preserves Native Approval authority.