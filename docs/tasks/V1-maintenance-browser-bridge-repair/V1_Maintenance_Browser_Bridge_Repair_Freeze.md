# Risk Advisor V1 Maintenance — Browser Bridge Repair Freeze

## Outcome

`V1_MAINTENANCE_BROWSER_BRIDGE_REPAIR_FROZEN_READY_FOR_IMPLEMENTATION`

Authority:

- V1 accepted product executable: `1fa84e2a8a9de465cdb85fef928ec9e19086bba2`
- repository pre-repair baseline: `b4ddc8cef5742f97a77f5562f5620afe5dcf051c`
- repair preflight: `9e620707342348627216e1afd6c8641de785c345`
- pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`

This maintenance repair changes the V1 executable only to restore the real Browser bridge.

It does not start Phase 11 or V2.

---

## 1. Frozen root cause

The independent Risk Advisor Connection RPC channel is broken in the pinned real Web composition.

`connection.rpc.handle('/risk-advisor', ...)` eventually tries to register a Web route through the Connection service's owning Context.

That owning Context does not declare `webServer`.

Real instrumentation proves the first failure occurs before `webServer.register()`.

The current Browser therefore receives transport failure and renders Risk Advisor as permanently `UNAVAILABLE`.

No assessment/correlation/UI parser defect is implicated by the confirmed evidence.

---

## 2. Harness Core remains read-only

Do not modify:

- `D:/Harness/deepseek-harness`;
- pinned Harness source;
- Harness package patches;
- Harness tests;
- Harness profile templates.

Do not create a local Harness source patch as part of Risk Advisor.

A possible upstream Harness fix is outside this repair.

---

## 3. Frozen transport architecture

Risk Advisor must stop using an independent channel for Browser presentation reads.

### Host routes

Register exactly:

- `/api/risk-advisor/active`
- `/api/risk-advisor/assessment`

through:

`connection.fetch.register()`

These are exact Fetch routes underneath the existing Connection-owned authenticated `/api` Web route.

### Client target

Use existing `ClientConnectionRpc.call()`:

- channel = `/api`
- endpoint = `risk-advisor/active`
- endpoint = `risk-advisor/assessment`

No direct global `fetch` implementation is allowed in Risk Advisor client code.

---

## 4. Why exact Fetch routes

Pinned Connection dispatches exact `/api/...` Fetch routes before the single API Gateway interceptor.

This preserves:

- Connection Host/Origin fence;
- browser authentication;
- existing Web server ownership;
- existing Browser RPC client;
- API Gateway coexistence.

Do not add a second `rpc.intercept('/api', ...)`.

Do not reproduce Harness authentication/trust checks in Risk Advisor.

---

## 5. Wire adapter

The exact Fetch route must adapt the existing Connection wire envelope to the existing Risk Advisor bridge handler.

Accepted request shape:

```text
POST
Content-Type: application/json

{
  type: "client-request",
  rpcId: "...",
  method: "risk-advisor/active" | "risk-advisor/assessment",
  payload: ...
}
```

Accepted response shape:

```text
{
  type: "server-response",
  rpcId: same request id,
  result: existing Risk Advisor ConnectionRpcResult
}
```

Use public Connection schema/types where available.

Do not invent a second application-level RPC envelope.

---

## 6. Business contract remains frozen

The following remain semantically unchanged:

- active request payload: `sessionId + callId`;
- assessment request payload: `assessmentId`;
- `RiskAdvisorBridgeRead`;
- V1-V4 Browser view schemas;
- reason-code semantics;
- READY/PENDING/UNAVAILABLE/CANCELLED semantics;
- correlation;
- assessment generation;
- Evidence/Deep/Fast Judge behavior.

Only transport mounting changes.

---

## 7. Lifecycle ownership

Risk Advisor must explicitly own disposal of its exact routes.

Required:

- exactly two registrations;
- returned disposers retained by Risk Advisor's own effect;
- dispose removes both routes;
- reinstall/remount works without duplicate-route error;
- if registration of route 2 fails, route 1 is cleaned up before failure propagates.

Do not rely on Connection process shutdown as the only cleanup.

---

## 8. Allowed source scope

Expected executable changes are limited to:

- `src/host/browser-bridge.ts`
- `src/client/assessment-bridge.ts`
- `src/bridge-contract.ts`
- focused tests.

A small shared helper file is allowed only if it materially reduces duplicated wire parsing.

Do not change unrelated runtime files.

Do not touch UI styling in this repair.

The observed missing spacing in `Risk AdvisorUNAVAILABLE` is a separate MINOR UX issue and is not part of the blocker repair.

---

## 9. Required automated tests

At minimum add regression coverage proving:

### Host exact route

Using the public pinned Connection API or a fidelity-equivalent test harness:

- active exact route registers;
- assessment exact route registers;
- client-request envelope is validated;
- method/path mismatch fails boundedly;
- correct rpcId is echoed;
- bridge success/failure result is wrapped correctly.

### Lifecycle

- Risk Advisor dispose removes routes;
- remount registers once;
- partial second-route failure cleans first route;
- no duplicate survives HMR/reload.

### Client

- client calls `/api` with `risk-advisor/active`;
- client calls `/api` with `risk-advisor/assessment`;
- existing protocol parser remains unchanged;
- transport failure still becomes `TRANSPORT_UNAVAILABLE`.

### Regression

Keep existing:

- P1C bridge;
- P6 Browser bridge/store/UI/lifecycle;
- P10 Host/Client HMR;
- P10 coexistence;
- P10 Native-close;
- P10 boundary/privacy.

---

## 10. Installed-profile proof

Before final Full, on exact committed repair candidate:

- local build/pack;
- supported update of Risk Advisor in real `web` profile;
- clean restart;
- pinned Harness unchanged;
- authenticated real `/api/risk-advisor/active` returns a valid Connection envelope rather than 404/405;
- no independent `/risk-advisor` route is required.

Then trigger one safe real Native Approval.

The Browser must transition from the former permanent `UNAVAILABLE` state to a valid Risk Advisor state and reach `READY` within 10 seconds for the known deterministic Pilot operation.

If it does not, stop repair acceptance and diagnose the next blocker.

---

## 11. User-visible proof

The user must observe the real approval panel after the repaired package is installed.

Required observations:

- Native Reject/Allow once remain usable;
- Risk Advisor no longer remains permanently UNAVAILABLE;
- Risk Advisor reaches READY;
- no duplicate Risk Advisor card;
- no approval authority change.

This proof is not replaceable by a fake DOM-only test.

---

## 12. Validation order

Use the project's established governance:

1. implementation;
2. focused repair tests;
3. affected P1C/P6/P10 tests;
4. remaining inherited R1-R5 / P1A-P10 regressions as required;
5. typecheck;
6. build;
7. Host/Client exports;
8. declarations/root-export audit;
9. package/bundle contract;
10. pack dry-run;
11. privacy/boundary/no-authority audit;
12. installed-profile route smoke on exact committed SHA;
13. real Browser READY proof;
14. Harness exact SHA + tracked-clean;
15. external provider/network/registry runtime calls = 0;
16. exactly one fresh complete `pnpm test` on the final exact Tested SHA.

If Browser proof fails and code changes again, the previous final Full is not final authority.

---

## 13. Post-Full rule

After the passing final Full:

- no product/test/package/benchmark semantic changes;
- only `docs/tasks/V1-maintenance-browser-bridge-repair/Execution_Report.md` may change before independent review.

Codex may report:

`V1_MAINTENANCE_BROWSER_BRIDGE_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Codex must not declare the repair accepted.

---

## 14. Repair acceptance effect

If independently accepted:

- the V1 maintenance product executable baseline advances to the repair Tested SHA;
- original V1 closure remains valid historical provenance;
- Deployment Pilot resumes from the real Browser scenario stage;
- no Phase 11/V2 is started.

---

## 15. Frozen conclusion

The only authorized blocker repair is:

> move Risk Advisor Browser reads onto exact authenticated `/api/risk-advisor/*` routes using the public Connection exact-route registry, while preserving the existing Risk Advisor business protocol and Native Approval authority.
