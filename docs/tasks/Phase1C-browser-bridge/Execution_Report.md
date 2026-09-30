# Phase 1C Execution Report

## Outcome

`PHASE1C_FINAL_REPAIR_PUBLISHED_READY_FOR_REVIEW`

This is Codex's implementation and execution record only. Final acceptance remains with ChatGPT Web independent review. No `Acceptance_Report.md` was created, no next phase was started, and Codex does not declare `ACCEPTED`.

## Scope and baselines

- Task authority: `Phase1C_Architecture_Freeze.md` and `Phase1C_Implementation_Instructions.md`.
- Plugin repository: `Dhandil/dsh-risk-advisor`, branch `main`.
- Recovery start plugin `HEAD == origin/main == git ls-remote`: `6461b1e6dc153075f39c722b78dbebe6820a88a9`.
- Historical Phase 1C tested executable SHA: `0312fd7332f39e7245f7ab44137a82cd5194ba02`.
- Recovery tested executable SHA: `d5d23f5568163ba48a0eef24670a2c2f6ed5a445`.
- Final lifecycle-repair tested executable SHA: `9c7a4e54effe3455171aabb724724dd0e7eeb9b4`.
- Frozen Harness reference: `ddefc45fbc7f8e46dd73185e68295696d1297887` (`HEAD == origin/master`). Harness Core was read-only; no fetch, install, build, checkout, reset, clean, or source/worktree modification was performed.
- Observed Harness upstream `4878cdabd87d4041bdaff61d04c966883b9fd07a` remains unvalidated and was not used.
- Existing plugin drift was preserved and not staged: `.vitest-cache/`, `docs/risk-advisor-current/`, `docs/tasks/Phase1A-operation-foundation/Phase1A_Repair_Instructions.md`, `docs/tasks/Phase1B-assessment-envelope/Phase1B_Repair_Instructions.md`, `docs/tasks/T01-approval-ui/T01_Final_Runtime_Gate_Instructions.md`, generated `lib/`, `node_modules/`, and `pnpm-lock.yaml`.
- Existing Harness drift was preserved: `build.log`, `install.log`, `t0-model.txt`, `t0-remote.txt`, `t0-session.txt`, `t0-storage.txt`, and `undefined/`.

Operational note: a temporary peer-metadata experiment was reverted before commit. pnpm briefly reconciled the already-untracked `node_modules/` while that metadata was present and hit one Windows `EPERM`; no dependency, lockfile, Harness, or committed drift was retained. The final package metadata has no new dependency and the final gates ran after the revert.

## Implementation manifest

- `src/host/assessment-envelope.ts` — bounded private `queryActiveForCall` and `queryOpenByAssessmentId` helpers. They return detached bridge snapshots only, never approval IDs, Sessions, executions, or mutable records; they consider open records only and fail closed on ambiguity/duplicate IDs.
- `src/host/browser-bridge.ts` — one compositionally mounted `/risk-advisor` channel using the locally narrowed optional Connection service; only `active` and `assessment` endpoints; strict bounded request validation, fixed non-echoing failures, cancellation, DTO projection, and effect-owned disposal.
- `src/bridge-contract.ts` — browser-safe DTO, closed read union, bounded identity checks, strict unknown-field rejection, reason-code allowlist, and detached/frozen parser helpers.
- `src/client/assessment-bridge.ts` — read-only client adapter calling only `rpc.call('/risk-advisor', endpoint, payload, signal)`, runtime validation, and fail-safe transport/Host/protocol/cancellation mapping.
- `src/client/index.ts` — exports the adapter and safe types only; it does not wire the adapter into the existing T01 slot or modify `RiskAdvisorDetail.tsx`/`R1FixtureStore`.
- `src/index.ts` — bridge sub-fiber depends on both `ctx.inject(['connection', 'sessions'])` services and locally narrows `ctx.get('connection', false)`; the existing Host continues to work while Connection is absent because the bridge waits, and registration belongs to the dependency-owned generation without declaring a competing `Context.connection` type.
- `tests/p1c-browser-bridge.spec.ts` — real approval/session lifecycle, active-only behavior, conflict/ambiguity, RPC registration/disposal, strict payloads, privacy, and client failure mapping.
- `tests/p1c-browser-bridge.spec.ts` — additionally proves sessions-before-connection, late mount, Connection disposal/replacement remount, no duplicate channel, and final tree disposal.
- `tests/p1c-pinned-connection.probe.mjs` — acceptance-only probe against the frozen Harness build; it uses the actual pinned `HostConnectionService` with isolated WebServer and BrowserAuth fixtures and is intentionally outside the package test chain.
- `package.json` — `test:p1c` included in the complete test chain.
- The supplied Phase 1C freeze/instruction documents were preserved in this task directory.

## Authenticated Connection RPC boundary

The production bridge uses only the pinned public Connection shape verified at Harness SHA `ddefc45f...`: the bridge sub-fiber requires both `connection` and `sessions`, then obtains the service with `ctx.get('connection', false)`, narrows locally, and passes that instance to `connection.rpc.handle('/risk-advisor', handler)`. It does not register a raw `webServer` route, use global `fetch`, hard-code origin/port, or bypass Connection admission. Phase 1C's supported carrier claim is limited to the authenticated normal served-Web/desktop HTTP Connection route.

The original test uses an in-memory plugin-composed authenticated decoded Connection seam with the same public `handle`/dispatch shape. It remains historical evidence for lifecycle and DTO behavior, but is not deployed Live Browser or HTTP carrier evidence. The recovery probe below supplies the genuine pinned `HostConnectionService` Web route evidence. No user browser profile or live web server was started.

## Active-only identity and DTO boundary

`active` validates `{ sessionId, callId }`, resolves the current live Session through `SessionStore.get`, and then queries the exact Session object and exact call ID in the bounded Phase 1B store. It never reads Session history, uses session text as a join, consults Ledger order, chooses newest/last-writer-wins, or reconstructs approval identity. Zero matches returns `NOT_FOUND`; multiple open matches return `AMBIGUOUS` with no candidate ID.

`assessment` validates `{ assessmentId }` and returns only a currently open record that still owns that ID. Closed, conflicted, evicted, expired, disposed, duplicate, or unknown IDs return `NOT_FOUND`. A Phase 1B conflict that removed its assessment ID cannot be recovered through the old ID.

The Browser-safe `RiskAdvisorBridgeViewV1` allowlist is exactly `schemaVersion`, `sessionId`, `callId`, optional valid `assessmentId` for the one still-valid `BOUND` shell, `association`, `status: unavailable`, `stage: not-started`, safe reason codes, and `updatedAt`. Browser responses never contain `approvalId`, `executionId`, observed outcome, raw reason/arguments/path/cwd, operation hash, Session, ToolExecution, token, signal, Ledger/evidence, provider/model output, exception text, issue counters, risk findings, score, recommendation, or Approval capability.

## P1C proof matrix

| Proof | Result | Evidence |
|---|---|---|
| P1C-01 unique open shell -> safe VIEW | PASS | Real `Context + SessionStore + ToolRuntime + ApprovalService` approval lifecycle through the registered Connection channel; exact call ID and one valid assessment ID only. |
| P1C-02 current Session/call identity | PASS | Live `SessionStore.get`, wrong call ID, and unknown/disposed session return `NOT_FOUND`; no historical or text-equal fallback exists. |
| P1C-03 same-call ambiguity | PASS | Component-injected committed open records sharing one call ID return `AMBIGUOUS` and no candidate assessment ID. The injection is explicitly a fault fixture, not a native producer. |
| P1C-04 conflict remains unavailable | PASS | A committed conflicting ask removes the old public assessment ID; active projection is `UNBOUND`, and old by-assessment lookup is `NOT_FOUND`. |
| P1C-05 native decision has no stale view | PASS | Real `ApprovalService` decision makes both active and by-assessment reads `NOT_FOUND`; no resurrection occurs. |
| P1C-06 open assessment follow-up and stale IDs | PASS | Unique open follow-up succeeds; unknown, conflicted, closed, disposed, and coordinator-expired/evicted states are not returned by active-only queries. Closed records disappear immediately from Browser reads; Phase 1B deterministic TTL/eviction evidence remains green. |
| P1C-07 strict RPC input/cancellation | PASS | Empty/oversized/extra fields, unknown endpoint, and already-aborted signal are rejected with fixed codes and empty details; both endpoint handlers use exact-key validation. |
| P1C-08 Host/client DTO privacy | PASS | Host projection omits forbidden fields; client parser rejects injected unknown fields such as `approvalId`, requires exact keys, and freezes retained results. |
| P1C-09 client failure mapping | PASS | Transport throw, Host error, malformed success, and cancellation map to typed `UNAVAILABLE` without raw error/message leakage. |
| P1C-10 Connection registration/dispatch/disposal | PASS (historical decoded seam) | In-memory decoded Connection seam exercises exactly one `/risk-advisor` registration, dispatch, no raw feature route, and generation disposal. The genuine pinned Web/HTTP evidence is recorded in the recovery matrix below. |
| P1C-11 T01 and Native Approval ownership | PASS | T01 fixture/UI files were not changed or wired to the adapter; real approval answerer remains the sole native answerer and is invoked once. |
| P1C-12 inherited regression | PASS (historical) | Original final fresh `pnpm test`: inherited 93 plus 7 Phase 1C tests = **100 tests**. Recovery final fresh regression is recorded below. |

## Commands and quality gates

| Check | Result |
|---|---|
| `pnpm run typecheck` | PASS |
| Acceptance-only pinned Connection probe | PASS — actual pinned `HostConnectionService`; `/risk-advisor` route registration, 401 unauthenticated rejection, 403 untrusted Host rejection, authenticated Risk Advisor `VIEW`, DTO privacy, and disposal to zero routes |
| `pnpm run test:p1c` | PASS — 1 file, 8 tests |
| `pnpm run build` | PASS — Host and Client bundles |
| Host export smoke (`lib/index.js`) | PASS — `apply`, `installCorrelation` present |
| Client export smoke (`window.__ModuleLoader__`) | PASS — `createRiskAdvisorBridgeClient`, `R1FixtureStore` present |
| `pnpm pack --dry-run` | PASS — package contents include bridge declarations and no unintended files |
| `git diff --check -- package.json src tests` | PASS — only expected LF/CRLF normalization warnings |
| Production scope/privacy scan | PASS — no new approval answerer, raw web route, global fetch, Judge/Provider/OperationPresentation/RiskAssessment, or forbidden DTO path |
| lint / publint | `NOT_CONFIGURED` — no project scripts or binaries present |
| historical final fresh `pnpm test` on `0312fd7...` | PASS — R1 9 + R2 16 + R3 17 + R4 21 + R5 3 + Phase 1A 13 + Phase 1B 14 + Phase 1C 7 = **100 tests** |
| recovery final fresh `pnpm test` on `d5d23f5...` | PASS — R1 9 + R2 16 + R3 17 + R4 21 + R5 3 + Phase 1A 13 + Phase 1B 14 + Phase 1C 7 = **100/100 tests** |
| final lifecycle-repair fresh `pnpm test` on `9c7a4e5...` | PASS — R1 9 + R2 16 + R3 17 + R4 21 + R5 3 + Phase 1A 13 + Phase 1B 14 + Phase 1C 8 = **101/101 tests** |

The R1 suite prints expected fixture-fault stack traces while its assertions pass. No R5 benchmark smoke/full rerun was needed; Phase 1C changes no latency policy or assessment-performance claim.

## Architecture, privacy, and phase boundary audit

- The bridge is read-only and observational. It does not mutate Session, Assessment, Foundation, Ledger, Tool, or Native Approval state.
- One existing `ActiveExecutionIndex` remains the sole execution identity owner and UUID mint path. No alternate identity, history reconstruction, Ledger join, or approval-ID guessing was added.
- The client adapter is exported but not connected to `conversation.approval.detail`; T01 fixture semantics and `RiskAdvisorDetail.tsx` remain unchanged.
- No Rule Engine, Context Builder, Judge, Provider, OperationPresentation, RiskAssessment engine, product card, polling policy, Approval buttons, native answerer, or Phase 2 implementation was added.
- Connection absence is compositional: the Host plugin remains usable without the optional Connection service because the bridge sub-fiber waits for both dependencies; connection disappearance unloads it and replacement re-runs it, preventing stale/missing HMR channels. Risk Advisor no longer declares ownership of `Context.connection`.
- Transport boundary is explicit: authenticated normal served-Web/desktop Connection route is `IN_SCOPE`; WebWorker is `NOT_VALIDATED / NOT_SUPPORTED_BY_PHASE1C`; Typert/shared-`/api` carrier-neutral redesign is `DEFERRED ARCHITECTURE OPTION`.

## Inherited open and not-run gates

The following remain outside this bounded transport phase: a deployed user Live Browser/profile, T01 product UI, real native PTC producer, T04 F-006/F-007/F-013 cross-plane gates, true disk/process restart, newer Harness V4 validation, WebWorker transport validation/support, and T05 real Assessment latency/`T_sync` plus six undetermined production policy fields. Phase 1C transport evidence does not satisfy J-001/J-004 because no real ready Assessment or product UI exists.

## Architecture recovery evidence

### R1 — Connection Context type ownership

- Removed the Risk Advisor `declare module '@deepseek-ai/cordis' { Context.connection: HostConnectionLike }` augmentation.
- The bridge is now mounted after `sessions` becomes available, reads the optional service with `ctx.get('connection', false)`, narrows it locally to the minimal structural RPC interface, and passes that instance into the installer.
- No second Connection service, official package dependency, Harness change, or package installation was introduced.

### R2 — genuine pinned HostConnectionService Web/Auth probe

The committed acceptance-only command was:

```text
pnpm run build
node tests/p1c-pinned-connection.probe.mjs
```

The probe imports `D:\Harness\deepseek-harness\packages\client\connection\lib\index.js` from frozen Harness `ddefc45fbc7f8e46dd73185e68295696d1297887`, instantiates the real `HostConnectionService`, and uses only isolated fake WebServer and disposable BrowserAuth seams. It does not launch a browser and does not modify Harness.

Recorded output:

```text
PINNED_HARNESS_SHA=ddefc45fbc7f8e46dd73185e68295696d1297887
REAL_HOST_CONNECTION_SERVICE=true
ROUTE_REGISTERED=/risk-advisor
UNAUTHENTICATED_STATUS=401
UNTRUSTED_HOST_STATUS=403
AUTHENTICATED_STATUS=200
RISK_ADVISOR_RESPONSE=VIEW
PRIVACY_SAFE=true
ROUTE_AFTER_DISPOSE=0
P1C_PINNED_CONNECTION_PROBE=PASS
```

This proves real Connection route registration, Host/Origin and BrowserAuth admission before decoded dispatch, Risk Advisor Browser-safe response delivery, and effect-owned route withdrawal. The probe's authenticated response contains only the frozen `VIEW` DTO fields and no `approvalId`, `executionId`, raw arguments, cwd, or operation hash. Native Approval ownership remains unchanged; the probe invokes the read-only bridge handler and has no answerer.

### R3 — explicit WebWorker boundary proof

The pinned Harness source was read without modification:

- `packages/client/connection/src/rpc-host.ts:158-180` builds a dedicated `rpc.handle` prefix route and calls `requestRejection(req)` before the bridge.
- `packages/experimental/webworker-runtime/src/transport/tunnel.ts:339-367` dispatches non-`/api` paths through the normal WebServer route listener.
- `packages/experimental/webworker-runtime/src/transport/tunnel.ts:383-408` applies the 401/403 retry only inside `serveApi`, whose entry condition is `/api`.
- `packages/client/connection/src/client/rpc.ts:62-67` restricts worker-local streams to `/api`.

Therefore the dedicated `/risk-advisor` carrier is `IN_SCOPE` only for authenticated normal served-Web/desktop HTTP in Phase 1C. WebWorker is explicitly `NOT_VALIDATED / NOT_SUPPORTED_BY_PHASE1C`; no fake Worker support was implemented. A Typert/shared-`/api` carrier-neutral bridge remains deferred.

### Recovery gate summary

| Gate | Result |
|---|---|
| R1 duplicate Context ownership removed | PASS |
| R2 real pinned HostConnectionService registration/rejection/authenticated dispatch/disposal | PASS |
| Browser DTO privacy and client failure mapping retained | PASS |
| T01 UI / Native Approval / Rule Engine / Judge / Provider / OperationPresentation scope | PASS — unchanged and out of scope |
| Worker boundary correction | PASS — explicitly not validated/supported |
| Harness Core mutation or dependency installation | PASS — none performed during recovery; Harness remained read-only at `ddefc45f...` |
| Fresh complete regression | PASS — exactly one recovery run, **100/100** |

## Final lifecycle repair evidence — F4

### Root cause and exact repair

The previous recovery declared only `sessions` as the bridge sub-fiber dependency and read `connection` opportunistically. That allowed a no-op callback when sessions appeared first and did not cause a remount when Connection later appeared or was replaced.

The final repair changes only the dependency list to:

```ts
ctx.inject(['connection', 'sessions'], bridgeCtx => {
  const connection = bridgeCtx.get('connection', false) as HostConnectionLike | undefined
  if (connection === undefined) return
  installRiskAdvisorBrowserBridge(bridgeCtx, connection, assessments)
})
```

The callback still uses local structural narrowing and does not redeclare `Context.connection`. There is no polling, listener, retry loop, raw WebServer route, Typert work, or second Connection service.

### Focused lifecycle proof

`tests/p1c-browser-bridge.spec.ts` adds `P1C-F4` using the existing structural Connection seam and a shared active-channel registry:

1. `sessions` is available before Connection; the registry remains empty and no `/risk-advisor` registration occurs.
2. Providing the first Connection mounts exactly one channel.
3. Disposing that Connection withdraws the first registration before replacement; its disposer runs once and the registry is empty.
4. Providing a replacement Connection mounts exactly one channel on the replacement; the shared registry proves there is no duplicate `/risk-advisor` route/channel.
5. Disposing the Cordis root/plugin tree withdraws the final replacement registration and leaves the registry empty.

Focused result: `pnpm run test:p1c` — **8/8 tests PASS**. The genuine pinned `HostConnectionService` probe was rerun after the source repair and remained PASS with the same Web/Auth and DTO evidence recorded above.

### Final lifecycle gate

- Final executable SHA: `9c7a4e54effe3455171aabb724724dd0e7eeb9b4`.
- No executable files were changed after the final fresh regression.
- Final fresh complete regression: **101/101 PASS**.
- Harness remained read-only at `ddefc45fbc7f8e46dd73185e68295696d1297887`; no `pnpm install` was run.

## SHA handoff

- Historical Implementation/Tested SHA: `0312fd7332f39e7245f7ab44137a82cd5194ba02`.
- Recovery Implementation/Tested SHA: `d5d23f5568163ba48a0eef24670a2c2f6ed5a445`.
- Final lifecycle-repair Implementation/Tested SHA: `9c7a4e54effe3455171aabb724724dd0e7eeb9b4`.
- Report-only publication commit and final remote SHA are verified after this report is committed and pushed.
- Stop after publication for ChatGPT Web independent review. Codex does not generate an Acceptance Report or declare `ACCEPTED`.
