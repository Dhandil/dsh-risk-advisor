# Risk Advisor Phase 13.3 — Online Correction Client Activation Architecture Review

## Outcome

`RISK_ADVISOR_PHASE13_3_ONLINE_CORRECTION_CLIENT_ACTIVATION_DEFECT_LOCALIZED_REPAIR_CONDITIONAL`

This is a **Product delivery/integration blocker**, not an F1/F2 model/verification correctness result. Phase 13.3 remains **not accepted**.

## Evidence boundary

Executor-reported focused run:
- starting main `319b9e7216df8eb34041c62bea762d082ffc643e`;
- normal Harness Web Session reloaded, Risk Advisor listed enabled;
- ordinary Harness RPC active;
- no request to `risk-advisor/online-correction`;
- breakpoint localization upstream of the Host bridge, around Client slot/store invocation;
- new Agent tasks, provider requests, Tool executions: **zero**;
- local, unpushed report commit `4e6aa67d575378f857afb4feb064cf8ac5b5aced` on `codex/phase13-3-focused-live-finding-probe`.

The report has **not been independently fetched or reviewed**. This is a provisional architecture diagnosis from the executor's summary and source inspection. Do not accept the report, claim exact root cause, or authorize Product mutation until the exact report is pushed and independently checked against its base.

## Accepted source chain

Code inspected at `319b9e7216df8eb34041c62bea762d082ffc643e`:

`src/client/index.ts`:
- Client plugin applies `ctx.slots.inject('conversation.input.dock', ...)`.
- It constructs `OnlineCorrectionClient` after obtaining the existing Harness `connection` service.
- The plugin contributes `OnlineCorrectionDock`, not a parallel Harness UI.

`src/client/OnlineCorrectionDock.tsx`:
- rendering calls `getSource(sessionId)`;
- its React effect invokes `onlineCorrectionClient.retain(sessionId)` on mount and `release` on unmount;
- an empty view returns `null` **after the hooks**. The absence of visible Dock DOM by itself is normal.

`src/client/online-correction-client.ts`:
- `getSource` is side-effect-free;
- first `retain` starts the session-scoped store;
- final `release` stops it.

`src/client/online-correction-store.ts`:
- `start` calls `readNow` immediately;
- normal `readNow` calls bridge `read`, then polls every **1000 ms** while retained.

`src/client/online-correction-bridge.ts`:
- `read` calls the existing `connection.rpc.call('/api', 'risk-advisor/online-correction', {sessionId})`.

`src/host/online-correction-bridge.ts`:
- a **read-only** public Host route is already implemented and remains unexercised by this incident.

`tests/p12-2-online-correction.spec.tsx` covers isolated Client registration/store/visible state but does not establish that the installed browser bundle mounts and retains the Dock in the normal pinned Harness composition.

The pinned Harness also uses `conversation.input.dock` as a normal shared list slot for Goal/Todo/Queue. No Harness source modification or new slot system is necessary.

## What is and is not proven

Supported:
- the observed browser run did not initiate the expected Online Correction RPC;
- the missing request is upstream of the Host bridge response, subject to verifying the exact report;
- without a live public reading of transient Findings, existing V2 F1/F2 scores remain unscorable.

Not proven:
- exactly which Client activation/lifecycle step fails;
- whether the installed Client bundle is stale, absent, or never applied;
- whether the slot declaration never becomes active, the Dock is not mounted, `retain` is not invoked, or an exception aborts it;
- whether F1/F2 Findings would have been produced for any of the 20 prior tasks;
- any Host bridge defect or F1/F2 FP/FN.

Do not select a code change merely from lack of HTTP requests.

## Repair boundary (conditional on evidence)

A narrowly scoped **Risk Advisor-owned Client activation/packaging integration repair** is permissible **only after** one reproducible first-failure point is established.

Permitted targets if source/evidence demands:
- Client bundle export/installation linkage that belongs to Risk Advisor;
- `src/client/index.ts` slot registration and connection injection lifecycle;
- `OnlineCorrectionDock` mounting/retention ownership;
- `OnlineCorrectionClient` and `OnlineCorrectionStore` start/stop handshake;
- matching focused tests asserting the **real supported slot composition** plus first read.

Forbidden:
- changes to the pinned Harness;
- replacing or bypassing Harness SlotRegistry, client connection, Agent, SessionStore or ToolRuntime;
- new polling/diagnostic subsystem that duplicates existing Product RPC/store;
- new Host Finding kinds, F1/F2 trigger semantics, authority, lifetime, TTL or privacy fields;
- overriding provider/model/reasoning;
- modifying Phase 13.1/13.2 oracle, validated truth or production non-client domains just to make a UI appear;
- a 20-task replay, provider calls, or new real Agent tasks during localization/repair.

If provenance or first failing Client step cannot be proved, stop with a bounded localization report and request further architecture review; do not edit Product by guesswork.

## Focused proof and gates

When a Product-owned root cause is proven, implement the smallest change and test:

1. regression reproducing exact normal Harness slot registration/mount semantics (not only a manually mounted `OnlineCorrectionDock`);
2. live connection first-read and Session switch/release/reconnect/HMR lifecycle;
3. native shared dock coexistence with Goal/Todo/Queue and approval-detail priority;
4. correct `VIEW`-empty behavior: RPC still happens while Dock DOM remains absent;
5. `VIEW`-Finding display, `NOT_FOUND` and `UNAVAILABLE` handling;
6. bounded polling, cancellation, no duplicate store starts/leaks;
7. focused `test:p12.2`, related Client/HMR/coexistence regressions, typecheck/build, exports/packaging, privacy/scope gates.

No complete `pnpm test` required without an independent later authorization.

Native verification should use the **ordinary installed Harness Web client** with the real Risk Advisor Client loaded, an existing Session, and **zero Agent/provider/Tool calls**. It must show actual `risk-advisor/online-correction` request through the existing browser connection and a sanitized `VIEW` / `NOT_FOUND` / `UNAVAILABLE` result. Do not add a custom Browser RPC client solely for validation.

## Next result

If Product-owned root cause is fixed and native first-read proof passes:

`RISK_ADVISOR_PHASE13_3_CLIENT_ACTIVATION_REPAIR_READY_FOR_ARCHITECTURE_REVIEW`

If exact Product root cause is not proven or requires Harness change:

`RISK_ADVISOR_PHASE13_3_CLIENT_ACTIVATION_LOCALIZATION_BLOCKED`

If code is correct but distribution/install packaging is stale or misconfigured, report exact provenance and remediation separately; do not label it a Product code defect without evidence.

No Phase 13.3 acceptance, F1/F2 scoring or Phase 13.4 authorization follows automatically from this repair.
