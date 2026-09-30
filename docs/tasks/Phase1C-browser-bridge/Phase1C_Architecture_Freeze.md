# Risk Advisor — Product Phase 1C: Safe Host-to-Browser Assessment Bridge

**Status:** FROZEN FOR IMPLEMENTATION. ChatGPT Web independently decides `ACCEPTED / REPAIR / STOP` after inspecting pushed source and evidence.  
**Task directory:** `docs/tasks/Phase1C-browser-bridge/`  
**Plugin starting checkpoint:** `Dhandil/dsh-risk-advisor`, `main @ b81cff6e02b2dd520e2ccb4b9a04d829e8dfc4a6` (Phase 1B bounded accepted).  
**Harness:** local `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, STRICTLY READ-ONLY. Observed upstream `4878cdabd87d4041bdaff61d04c966883b9fd07a` remains `NOT_VALIDATED`.  
**Phase boundary:** this phase implements a read-only transport and Browser-safe DTO only. It does NOT implement the real RiskAssessment engine, OperationPresentation, product Risk Advisor card, approval buttons, provider/Judge, or Phase 2.

## 1. Verified baseline

The accepted Host chain is:

```text
real ToolExecution
  -> T02 exact ActiveExecutionIndex / sole ExecutionId mint
  -> Phase 1A bounded Operation Foundation
  -> real committed approval/asked
  -> Phase 1B ApprovalAssessmentCoordinator
  -> exact (Session object, approvalId) shell
```

Phase 1B intentionally exposes only an unavailable/not-started lifecycle shell because no assessor exists. It does not expose raw arguments, operationHash, approval reason, full Session, ToolExecution, or Native approval authority.

The current Client still contains the T01 fixture renderer in `conversation.approval.detail`. T01 is NOT a production Assessment UI and must remain unchanged in Phase 1C.

Canonical Architecture §32 describes same-origin Browser reads with conceptual routes:

```text
GET /api/risk-advisor/session/{sessionId}/active
GET /api/risk-advisor/assessment/{assessmentId}
```

The pinned Harness now exposes a stronger public transport seam:

```text
Host:    ctx.connection.rpc.handle(channel, handler)
Client:  ctx.connection.rpc.call(channel, endpoint, payload, signal)
```

The Connection service owns Host/Origin checks and browser authentication for the HTTP carrier and also supports non-HTTP / worker transports. Direct raw `webServer` routes would require duplicating that admission policy, while direct `globalThis.fetch()` would not be carrier-neutral.

## 2. Frozen transport realization decision

Phase 1C realizes the §32 Browser Bridge semantics through the pinned public **authenticated Connection RPC** seam rather than introducing raw ad-hoc GET routes.

This is a bounded transport realization update, not a change to the product data boundary:

```text
Canonical conceptual read:
  /session/{sessionId}/active
  /assessment/{assessmentId}

Phase 1C transport:
  channel  = /risk-advisor
  endpoint = active
  payload  = { sessionId, callId }

  channel  = /risk-advisor
  endpoint = assessment
  payload  = { assessmentId }
```

Requirements:

- Host registers exactly one dedicated `/risk-advisor` logical RPC channel through `ctx.connection.rpc.handle`.
- Browser adapter calls only `ctx.connection.rpc.call('/risk-advisor', ...)`.
- Do not register a raw `webServer` route, do not bypass Connection authentication, and do not use a hard-coded port or origin.
- Do not use Typert code generation in this phase; the existing generic Connection RPC is sufficient and avoids Harness generator changes.
- Do not add an `approval/request` listener or Native Approval answerer.
- The bridge is read-only. No RPC endpoint mutates Session, Assessment, Approval, Foundation, Ledger, or Tool state.

The Host bridge should mount only when the public `connection` and `sessions` services are present, using Cordis composition/injection rather than making the entire Risk Advisor Host fail when Browser transport is absent.

## 3. Browser identity resolution: no Browser approvalId assumption

The Browser slot has current `sessionId` and `callId`; it does NOT own the service-issued Host `ApprovalRequestId`.

Therefore Phase 1C must not ask the Browser to guess or reconstruct approvalId.

For endpoint `active`:

1. Validate bounded `sessionId` and `callId`.
2. Resolve `sessionId` through the live `SessionStore` using its public `get`.
3. The resolved live `Session` object becomes the exact ownership object.
4. Query the Phase 1B coordinator for **open records in that exact Session whose stored callId exactly equals the requested callId**.
5. Zero matches -> `NOT_FOUND`.
6. Exactly one match -> project that shell conservatively.
7. More than one open match -> `AMBIGUOUS`, with no candidate approval/assessment/execution identity exposed.

This is transport lookup of the current live Session, not historical correlation. It MUST NOT:

- read Session history to reconstruct an approval;
- use sessionId string alone as the Assessment join;
- use Ledger ordinal, durable call occurrence, operationHash, toolName, rootCallId, or newest/last-writer-wins;
- select one of several active approvals sharing the same callId.

A Phase 1B shell already degraded to `UNBOUND/CORRELATION_CONFLICT` remains unavailable. The bridge never restores its removed `assessmentId` or `executionId`.

## 4. Phase 1B private query extensions

The coordinator may gain private/same-process read helpers used only by the bridge, for example:

```ts
queryActiveForCall(session: Session, callId: string)
queryOpenByAssessmentId(assessmentId: string)
```

They are not Native approval APIs and need not be added to the existing public Host diagnostic facade.

### `queryActiveForCall`

- exact Session object;
- bounded exact callId string;
- considers only records in that exact Session and only records whose shell is not closed;
- one match may return a detached shell snapshot;
- two or more matching open records -> explicit `AMBIGUOUS`;
- no historical fallback.

### `queryOpenByAssessmentId`

- bounded exact assessmentId string;
- searches only the bounded Phase 1B store;
- returns only a currently open shell that still owns that assessmentId;
- a conflicted shell that lost its assessmentId is not recoverable through the old id;
- a closed/evicted/expired/disposed shell is `NOT_FOUND`;
- duplicate internal assessmentId detection, if encountered, fails closed instead of picking a record.

These methods must not expose the original `AssessmentRecord`, Session reference, approvalId, ToolExecution, Foundation private snapshot, or mutable shell.

## 5. Browser-safe DTO contract

Phase 1C does NOT emit the canonical full `RiskAssessmentView` because real RiskAssessment and OperationPresentation do not exist yet.

Define a distinct shell DTO, for example:

```ts
interface RiskAdvisorBridgeViewV1 {
  readonly schemaVersion: 1
  readonly sessionId: string
  readonly callId: string

  // present only for the one still-valid BOUND shell
  readonly assessmentId?: string

  readonly association: 'BOUND' | 'UNBOUND'
  readonly status: 'unavailable'
  readonly stage: 'not-started'

  readonly reasonCodes: readonly BrowserSafeReasonCode[]
  readonly updatedAt: number
}
```

The bridge response is a closed union such as:

```ts
type RiskAdvisorBridgeRead =
  | { readonly kind: 'VIEW'; readonly view: RiskAdvisorBridgeViewV1 }
  | { readonly kind: 'NOT_FOUND' }
  | {
      readonly kind: 'AMBIGUOUS'
      readonly reasonCodes: readonly ['MULTIPLE_ACTIVE_APPROVALS']
    }
```

Exact spelling may vary while preserving semantics.

Browser MUST NOT receive:

```text
approvalId
executionId
observedOutcome
raw approval reason
rawArguments
requestedTarget / file path
cwd
operationHash
Session / ToolExecution / token / signal
Ledger facts / raw evidence
provider/model output
exception text / stack
issue-summary counters
Native Approval answer capability
```

`sessionId` and `callId` are allowed because they are already the Browser/native slot lookup inputs. `assessmentId` is allowed only for the one currently valid bound shell so the Browser can perform a follow-up read.

No score, severity, recommendation, RuleFinding, “safe” claim, RiskAssessment or OperationPresentation may be invented.

## 6. RPC request/result boundary

### Host input validation

Both endpoint payloads are untrusted wire input. Enforce:

- plain JSON object only;
- exact allowed keys, no extras;
- required strings non-empty and bounded (use a finite cap consistent with existing 256-character identity caps);
- no coercion;
- no rejected source value echoed in error text.

Supported endpoints only:

```text
active
assessment
```

Unknown endpoint or malformed payload returns a small typed RPC failure, for example:

```text
risk-advisor/bad-request
risk-advisor/endpoint-not-found
risk-advisor/cancelled
risk-advisor/internal
```

`details` remains empty or fixed-schema and MUST NOT contain rejected IDs or raw payloads.

Normal domain absence/ambiguity is a successful RPC value (`NOT_FOUND` / `AMBIGUOUS`), not an exception.

### Cancellation and failures

- Honor an already-aborted carrier signal before doing work.
- No network/provider/fs/tool work occurs inside the handler.
- Handler exceptions are contained to a fixed safe RPC failure; never serialize arbitrary exception messages.
- Bridge failure never changes Native Approval or Assessment Host state.

## 7. Browser client adapter

Add a Browser-safe client module, but do not connect it to the T01 fixture UI yet.

Recommended shape:

```ts
interface RiskAdvisorBridgeClient {
  active(sessionId: string, callId: string, signal?: AbortSignal): Promise<BrowserBridgeClientResult>
  assessment(assessmentId: string, signal?: AbortSignal): Promise<BrowserBridgeClientResult>
}
```

The adapter accepts the existing public `ClientConnectionRpc` (or equivalent current Client `ctx.connection.rpc`) and calls only the frozen `/risk-advisor` channel.

Because generic RPC returns `unknown`, the client MUST runtime-validate every Host result before exposing it.

Client-side result should fail safe, for example:

```ts
type BrowserBridgeClientResult =
  | { kind: 'VIEW'; view: RiskAdvisorBridgeViewV1 }
  | { kind: 'NOT_FOUND' }
  | { kind: 'AMBIGUOUS' }
  | {
      kind: 'UNAVAILABLE'
      reason:
        | 'TRANSPORT_UNAVAILABLE'
        | 'HOST_REJECTED'
        | 'PROTOCOL_INVALID'
        | 'CANCELLED'
    }
```

Rules:

- transport rejection, Host RPC error, malformed response, malformed DTO, or aborted call -> safe unavailable/cancelled result;
- do not surface Host exception messages or payload fragments;
- no Browser cache in Phase 1C;
- no automatic polling timer;
- no local reconstruction from T01 fixture/chat history;
- returned DTO/result objects and arrays are detached/frozen if retained.

The module may be exported from `src/client/index.ts`; **do not replace or wire it into `RiskAdvisorDetail.tsx` in this phase**.

## 8. Lifecycle and stale-view safety

The bridge must reflect only the current Host generation:

- once `approval/decided` closes the shell, `active` no longer returns a `VIEW`;
- `assessment` no longer returns that closed shell;
- session disposal -> `NOT_FOUND`;
- coordinator/bridge/plugin disposal -> no stale view;
- HMR replacement must not leave duplicate RPC channel registrations;
- a stale client assessmentId from a prior generation cannot resolve to a new shell;
- multiple simultaneous approvals never collapse by callId.

Phase 1B completed-record retention may continue for Host diagnostics, but Phase 1C Browser reads are **active-only**. This prevents a resolved approval from being resurrected visually.

## 9. Dependency and package boundary

Allowed additions:

- Host bridge source under `src/host/`;
- Browser client bridge source under `src/client/`;
- minimal private Phase 1B query helpers;
- `src/index.ts` Host wiring;
- `src/client/index.ts` export only;
- Phase 1C tests;
- narrow `package.json` script / peer dependency declarations required by the pinned public Connection API;
- Phase 1C docs/report.

Using the pinned public `@deepseek-ai/dsh-client-connection` API is authorized. Do not install/update packages or modify Harness. If its already-present pinned package cannot be consumed without dependency mutation beyond metadata, STOP.

Do not modify:

- T01 fixture semantics/UI;
- Native Approval buttons/state machine;
- frozen baseline docs;
- prior task reports;
- T02/T03/T04 correlation/ledger semantics except a minimal composition-safe read change explicitly necessary to support the bridge.

## 10. Formal Phase 1C proof matrix

New tests must cover at least:

| ID | Required proof |
|---|---|
| `P1C-01` | One real open Phase1B shell + live Session + exact callId -> one Browser-safe VIEW through Host bridge; no approvalId/executionId/raw values. |
| `P1C-02` | Unknown/disposed session, wrong callId and text-equal-but-not-current identity never bind historical data. |
| `P1C-03` | Two open approvals with the same callId -> AMBIGUOUS and no candidate assessment id. |
| `P1C-04` | Phase1B correlation-conflict UNBOUND shell remains unavailable and cannot recover its prior id. |
| `P1C-05` | Real committed `approval/decided` makes both active lookup and by-assessment lookup cease returning a VIEW; no stale resurrection. |
| `P1C-06` | Unique open assessmentId follow-up works; unknown/conflicted/closed/expired/disposed ids do not. |
| `P1C-07` | Strict endpoint/payload validation: extra keys, wrong types, empty/oversized ids, unknown endpoint, aborted signal; safe non-echoing failures. |
| `P1C-08` | DTO privacy and runtime validation: Host and Client reject injected raw args/path/cwd/approvalId/executionId/unknown fields. |
| `P1C-09` | Client adapter maps transport failure, Host error and malformed Host value to typed UNAVAILABLE; no raw error message leaks. |
| `P1C-10` | Pinned real Connection dedicated RPC channel registration/dispatch/disposal is exercised; prove Connection admission is used and no unauthenticated raw feature route is registered. |
| `P1C-11` | T01 `conversation.approval.detail` fixture and Native Approval ownership remain unchanged; Phase1C client module is not wired into the slot. |
| `P1C-12` | Inherited baseline 93 tests plus all Phase1C tests pass; typecheck/build/Host export/Client export/pack/privacy/scope gates pass. |

A real Host integration should use the pinned public `HostConnectionService` / Connection RPC seam or the plugin-composed equivalent. If authentication is tested through the HTTP carrier, use a disposable in-memory/fake WebServer and browser credential fixture; do not start or mutate a user's live browser profile.

A direct decoded carrier test is valid additional evidence, but must not be mislabeled as deployed Live Browser evidence.

## 11. Explicit non-goals and inherited OPEN gates

Not implemented in Phase 1C:

```text
real RiskAssessment
Rule Engine
Context Builder
Judge / Provider
OperationPresentation
Risk Advisor product card
pending/ready visual state
polling policy
presentedAssessmentId
Native Approval buttons/answering
Phase 2 execution analysis
```

Carry forward unchanged:

- T01 deployed Live Browser: `NOT_RUN`;
- real native PTC producer: `NOT_RUN`;
- T04 exact cross-plane F-006/F-007/F-013: `PARTIAL/OPEN`;
- true disk/process restart: `NOT_RUN`;
- newer Harness V4: `NOT_VALIDATED`;
- T05 real Assessment latency / `T_sync` direct measurement and six production policy fields: unresolved / `UNDETERMINED`.

Phase 1C transport tests do not satisfy Test Matrix J-001/J-004 because there is still no real ready Assessment or deployed product UI.

## 12. STOP conditions

STOP with `PHASE1C_ARCHITECTURE_DECISION_REQUIRED` if:

- the pinned public Connection RPC cannot carry this feature without a raw unauthenticated route or Harness modification;
- resolving the current Browser session/call requires historical guessing;
- a callId collision would require selecting a candidate;
- client transport would require hard-coded host/port or bypass Connection;
- Browser DTO needs raw Operation/Foundation/Session data;
- implementation would replace T01 UI or own Native Approval;
- bounds/privacy cannot be enforced;
- unexpected remote/protected drift cannot be preserved;
- final regression fails and cannot be repaired inside Phase 1C.

Successful publication outcome is `PHASE1C_PUBLISHED_READY_FOR_REVIEW`. Codex does not generate an Acceptance Report and does not self-declare ACCEPTED.
