# Risk Advisor Phase 12.2 — User Advisory Surface Architecture Freeze

## Status

`RISK_ADVISOR_PHASE12_2_FROZEN_READY_FOR_IMPLEMENTATION`

This Freeze authorizes Phase 12.2 implementation only. It does not authorize historical Guidance/Pattern evidence, Agent intervention, execution mutation, or any follow-on active-correction phase.

## 1. Baseline

- Phase 12.1 accepted baseline / current main at freeze start:
  `dd8c88b98c8ffa8dbcee4edf25eb03f287de55ee`
- Exact accepted Phase 12.1 executable:
  `9db1eae28f673dfe8c7770b8947dc9330d33be8c`
- Pinned Harness Core:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`

Phase 12.1 Finding authority is frozen and must not change in Phase 12.2.

## 2. Goal

Phase 12.2 makes already-qualified Phase 12.1 live correction Findings visible to the current user through a separate, read-only Browser/Client advisory surface.

The complete authority chain remains:

```
Phase 12.1 LiveCorrectionRuntime
  -> Host-only read diagnostics
  -> browser-safe Online Correction DTO
  -> read-only session endpoint
  -> client polling store
  -> non-blocking advisory dock
```

Phase 12.2 is presentation only.

## 3. Explicit non-goals

Phase 12.2 MUST NOT:

- add new Finding predicates;
- change F1/F2 qualification;
- change Finding identity;
- change fixed advisory wording;
- read Phase 11 Pattern or Guidance;
- call an LLM, Judge, model, embedding, subagent, or provider;
- inject anything into Agent/model context;
- rewrite Tool input/output;
- retry, replan, cancel, block, or create Runs;
- mutate Approval or Risk Assessment;
- add an acknowledge/dismiss/approve/reject/retry endpoint;
- add durable persistence, migration, localStorage, IndexedDB, or Session-event persistence;
- modify Harness Core;
- put Online Correction inside the existing approval assessment DTO or `conversation.approval.detail` slot.

## 4. Pinned Harness UI seam

Pinned Harness `ddefc45f...` already declares:

```
conversation.input.dock
kind: list
scope: session
```

It is a full-width Session-scoped strip above the resident composer. The built-in QueueDock occupies this slot at `order: 20`.

Phase 12.2 MUST register the Online Correction surface at:

```
name:  conversation.input.dock
id:    risk-advisor-online-correction
order: 10
```

This keeps Online Correction:

- Session-scoped;
- visible near the user's next action;
- independent from approval;
- non-blocking;
- inside an existing Harness extension seam.

Do not add or modify a Harness slot.

## 5. Separate wire contract

Create a separate contract module, recommended path:

`src/online-correction-contract.ts`

Do not extend the existing approval-oriented `RiskAdvisorBridgeViewV1-V4` DTOs with correction fields.

Frozen wire constants:

```ts
ONLINE_CORRECTION_RPC_CHANNEL = '/api'
ONLINE_CORRECTION_ENDPOINT = 'risk-advisor/online-correction'
ONLINE_CORRECTION_ROUTE = '/api/risk-advisor/online-correction'
ONLINE_CORRECTION_IDENTIFIER_LIMIT = 256
ONLINE_CORRECTION_MAX_FINDINGS = 64
```

The endpoint is read-only and accepts exactly:

```ts
{ sessionId: string }
```

No optional request keys.

## 6. Browser-safe DTO

Frozen Finding DTO:

```ts
type BrowserOnlineCorrectionKind =
  | 'REPEATED_FAILURE_WITHOUT_PROGRESS'
  | 'POSTCONDITION_NOT_SATISFIED'

type BrowserOnlineCorrectionDiagnosis =
  | 'REPEATED_SAME_SIGNATURE_FAILURE'
  | 'VERIFIED_POSTCONDITION_MISMATCH'

type BrowserOnlineCorrectionAdvisoryCode =
  | 'STOP_EXACT_RETRY_PATH_V1'
  | 'INSPECT_UNSATISFIED_POSTCONDITION_V1'

interface BrowserOnlineCorrectionFindingV1 {
  readonly findingId: string
  readonly kind: BrowserOnlineCorrectionKind
  readonly diagnosis: BrowserOnlineCorrectionDiagnosis
  readonly disposition: 'ADVISE'
  readonly advisoryCode: BrowserOnlineCorrectionAdvisoryCode
  readonly observedAt: number
}
```

Frozen session DTO:

```ts
type BrowserOnlineCorrectionReasonCode =
  | 'SESSION_TRUNCATED'
  | 'F2_SIGNAL_SATURATED'

interface BrowserOnlineCorrectionViewV1 {
  readonly schemaVersion: 1
  readonly sessionId: string
  readonly findings: readonly BrowserOnlineCorrectionFindingV1[]
  readonly truncated: boolean
  readonly reasonCodes: readonly BrowserOnlineCorrectionReasonCode[]
}
```

Frozen read result:

```ts
type OnlineCorrectionBridgeRead =
  | { readonly kind: 'VIEW'; readonly view: BrowserOnlineCorrectionViewV1 }
  | { readonly kind: 'NOT_FOUND' }
```

The browser DTO MUST NOT contain:

- executionId;
- tool/call ID;
- raw command or arguments;
- path/cwd/file content;
- stdout/stderr/result/error text;
- prompt/user/model content;
- Approval/Risk fields;
- fingerprint;
- failure signature;
- verifier adapter/source;
- credentials/secrets.

`findingId` must match the deterministic Phase 12.1 format:

`^ra-correction-v1_[a-f0-9]{64}$`

The contract parser must reject extra keys, invalid enums, invalid cross-field combinations, invalid IDs, non-finite timestamps, and arrays above 64.

Cross-field mapping is exact:

- `REPEATED_FAILURE_WITHOUT_PROGRESS`
  -> `REPEATED_SAME_SIGNATURE_FAILURE`
  -> `STOP_EXACT_RETRY_PATH_V1`

- `POSTCONDITION_NOT_SATISFIED`
  -> `VERIFIED_POSTCONDITION_MISMATCH`
  -> `INSPECT_UNSATISFIED_POSTCONDITION_V1`

## 7. Fixed advisory rendering

No free-form text crosses the correction bridge.

Client-visible advisory body is a deterministic local mapping by `advisoryCode`.

Exact English bodies remain identical to Phase 12.1:

`STOP_EXACT_RETRY_PATH_V1`

> The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.

`INSPECT_UNSATISFIED_POSTCONDITION_V1`

> The operation completed, but the verified expected postcondition was not satisfied. Do not treat this execution as goal completion; inspect the target state before continuing.

A test must prove the browser renderer text remains byte-identical to the Phase 12.1 Host renderer for both advisory codes.

Localized UI labels/titles are allowed, but the advisory body above is fixed and not translated in Phase 12.2.

## 8. Minimal additive Phase 12.1 diagnostic exposure

Phase 12.2 needs to surface capacity degradation without changing Finding authority.

An additive Host-only read status is authorized:

```ts
interface LiveCorrectionRuntimeStatus {
  readonly f2Availability: 'READY' | 'SATURATED'
}
```

Add only a read-only diagnostics method equivalent to:

```ts
status(): LiveCorrectionRuntimeStatus
```

It may expose only whether the already-existing Repair2 F2 saturation latch is active.

This addition MUST NOT change:

- F1/F2 creation;
- conflict recording;
- saturation transition;
- TTL/capacity;
- cleanup;
- lifecycle;
- Finding data;
- any execution behavior.

Browser mapping:

- Session view `truncated === true`
  -> include `SESSION_TRUNCATED`.
- `status().f2Availability === 'SATURATED'`
  -> include `F2_SIGNAL_SATURATED`.

No other internal correction state crosses the bridge.

## 9. Host bridge

Create a dedicated Host bridge, recommended:

`src/host/online-correction-bridge.ts`

It depends only on:

- `SessionStore`;
- `LiveCorrectionDiagnostics`;
- the standard Connection fetch transport;
- the Online Correction wire contract.

It MUST NOT depend on:

- `ApprovalAssessmentCoordinator`;
- Risk Rule/Judge engines;
- Pattern/Guidance;
- Experience/Outcome;
- Agent/model context.

Host read behavior:

1. validate exact request shape;
2. honor abort signal;
3. resolve Session by `sessionId`;
4. if Session does not exist, return `NOT_FOUND`;
5. call `liveCorrection.forSession(session)`;
6. call only the additive read-only correction status;
7. map current Findings to the browser-safe DTO;
8. return a deeply frozen `VIEW`.

A suppressed/conflicted/saturated Finding cannot appear because Phase 12.1 diagnostics are authoritative.

Do not reconstruct expired Findings from history.

Register this route separately from the existing approval bridge. Existing `active` / `assessment` semantics and routes remain unchanged.

## 10. Browser client and polling store

Create a separate browser client/store; do not reuse `PresentationStore`, whose semantics are approval-oriented.

Recommended files:

- `src/client/online-correction-bridge.ts`
- `src/client/online-correction-store.ts`

Frozen polling cadence:

```
ONLINE_CORRECTION_POLL_INTERVAL_MS = 1000
```

Rules:

- polling starts only while the Session advisory dock is mounted/retained;
- polling stops on unmount/release/dispose;
- at most one request is in flight per Session store;
- each request is abortable;
- stale responses after stop/dispose/connection reset are ignored using generation fencing;
- connection reset clears the current browser view immediately and triggers a fresh read;
- `NOT_FOUND`, transport unavailable, host rejection, protocol invalid, and cancellation render no stale advisory;
- while the component remains mounted, non-cancelled unavailable/not-found states may continue polling for recovery;
- semantically identical snapshots MUST NOT notify React subscribers repeatedly;
- no browser persistence.

## 11. UI semantics

Create one dedicated non-blocking dock component, recommended:

`src/client/OnlineCorrectionDock.tsx`

Rendering rules:

- render nothing when there are no Findings and no degradation reason;
- sort Findings by `observedAt` descending, then `findingId` ascending for deterministic ties;
- render at most the latest **3** Findings;
- if more than 3 exist, render a fixed/localized non-actionable overflow line indicating the number of additional live advisories;
- if `SESSION_TRUNCATED` or `F2_SIGNAL_SATURATED` exists, render one neutral degradation line;
- no buttons;
- no approve/reject/retry/replan/cancel action;
- no dismiss mutation;
- no autofocus;
- no scrolling/focus takeover;
- no modal/toast that blocks interaction.

Presentation language MUST describe the content as an **advisory / execution advisory**, never as an approval decision, permission request, risk verdict, or required action.

Recommended localized titles:

- zh: `执行建议`
- en: `Execution advisory`

Finding subtype labels may be localized deterministically by `kind`.

The advisory body remains the exact fixed Phase 12.1 English text.

Use `role="status"` or an equivalent non-blocking accessible live region only if the component/store deduplicates unchanged snapshots so polling does not repeatedly announce identical content.

## 12. Ordering and coexistence

Online Correction dock order is 10.

Pinned Harness QueueDock order is 20.

Therefore the correction strip appears before the QueueDock without replacing it.

Phase 12.2 MUST coexist with:

- no queue;
- one/multiple queued messages;
- active Approval UI;
- no Approval UI;
- connection reset;
- Session switch;
- plugin/client disposal.

It must never shadow `conversation.approval.detail`.

## 13. Lifecycle and stale-state semantics

- Phase 12.1 TTL expiration naturally removes a Finding on a later poll.
- Session disposal -> Host `NOT_FOUND`; client clears/hides current advisory state.
- runtime generation disposal/reload -> stale browser result cannot survive connection/store generation fencing.
- F2 saturation -> all F2 are absent from Finding list and `F2_SIGNAL_SATURATED` is present.
- Session truncation -> current surviving Findings may still render plus `SESSION_TRUNCATED`.
- Browser reload does not reconstruct old Findings beyond whatever the live Host runtime still retains.

## 14. Required proof matrix

Phase 12.2 focused acceptance must include at least:

- **U1 Contract positive:** valid F1 and F2 browser DTOs parse/freeze.
- **U2 Contract strictness:** extra keys, bad enums, bad IDs, invalid cross-field pairs, invalid timestamps, >64 Findings reject.
- **U3 Privacy:** command/args/path/cwd/stdout/stderr/result/prompt/user/model/secret/executionId/adapter sentinels never appear in DTO.
- **U4 Host session read:** valid Session returns only current `forSession` Findings.
- **U5 Missing Session:** returns `NOT_FOUND`.
- **U6 Independent authority:** correction bridge has no Approval/Risk coordinator dependency and existing approval routes remain unchanged.
- **U7 Truncation mapping:** Session truncated -> `SESSION_TRUNCATED`.
- **U8 Saturation mapping:** Host status SATURATED -> `F2_SIGNAL_SATURATED`; no suppressed F2 leaks.
- **U9 Fixed text parity:** client advisory text is byte-identical to Phase 12.1 renderer for F1/F2.
- **U10 Client protocol fail-closed:** malformed Host carrier/view never renders.
- **U11 Poll lifecycle:** mount/retain starts; unmount/release/dispose stops and aborts.
- **U12 One in-flight + stale fencing:** overlapping poll and stale post-reset response cannot overwrite current state.
- **U13 Snapshot dedupe:** identical polls do not re-notify subscribers.
- **U14 Empty surface:** no Findings/reasons -> no DOM.
- **U15 Finding UI:** F1/F2 render as advisory, not approval/risk.
- **U16 Latest-three rule:** deterministic newest 3 + overflow count.
- **U17 Degradation UI:** truncated/saturated produces one neutral degradation line.
- **U18 Slot boundary:** registers only `conversation.input.dock`, id `risk-advisor-online-correction`, order 10; no correction registration in `conversation.approval.detail`.
- **U19 No action authority:** no correction mutation endpoint/button/retry/replan/cancel/approve/reject.
- **U20 Lifecycle disappearance:** Host Finding removal / NOT_FOUND causes stale UI to disappear on subsequent poll.
- **U21 Existing UI coexistence:** QueueDock/Approval surface contracts are not replaced or mutated.
- **U22 Evidence isolation:** no Pattern/Guidance/LLM/Judge/model dependency in correction bridge/client surface.

## 15. Implementation verification boundary

Before architecture review, Codex must run:

1. Phase 12.2 focused U1-U22;
2. Phase 12.1 focused regression;
3. existing Browser bridge regression (`P1c`);
4. existing Phase 6 Browser/UI regression;
5. typecheck;
6. production build/declarations;
7. package dry-run and relevant static/dependency/boundary gates.

Do **not** run the complete `pnpm test` during initial Phase 12.2 implementation.

Exactly one fresh Full may be authorized only after source/provenance architecture review of the exact candidate.

## 16. Publication/provenance

Implementation must produce one exact executable candidate.

After all required pre-Full gates pass:

- push the exact candidate;
- add an execution report as a separate docs-only commit;
- do not change executable/test/package/config/benchmark semantics after the candidate;
- do not self-declare Phase 12.2 accepted;
- do not start a follow-on active-intervention phase.

## 17. Freeze conclusion

Phase 12.2 is a dedicated, session-scoped, read-only presentation layer over accepted Phase 12.1 truth.

Its product home is `conversation.input.dock`, not Approval UI.

It adds no new correction intelligence or execution authority.
