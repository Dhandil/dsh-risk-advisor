# Risk Advisor V1 Maintenance — Browser Bridge Repair Preflight

## Outcome

`V1_MAINTENANCE_BROWSER_BRIDGE_REPAIR_PREFLIGHT_COMPLETE`

This maintenance task is opened because the real Deployment Pilot exposed a blocker after V1 project closure.

Current accepted product executable remains:

`1fa84e2a8a9de465cdb85fef928ec9e19086bba2`

Current repository baseline before repair:

`b4ddc8cef5742f97a77f5562f5620afe5dcf051c`

Pinned Harness Core:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

No Phase 11 or V2 is started.

---

## 1. Real defect

In the real `web` profile, Native Approval renders correctly and the Risk Advisor client slot is present, but Risk Advisor remains:

`UNAVAILABLE`

The real Browser bridge reports transport failure because the Risk Advisor Host channel is not mounted.

Observed transport symptom:

- POST `/risk-advisor/active` does not enter the Risk Advisor handler;
- the independent channel route is absent from the real Web server;
- Browser therefore maps the failure to `TRANSPORT_UNAVAILABLE`.

This is a product blocker for Deployment Pilot because the advisory UI cannot reach READY.

---

## 2. Confirmed underlying Harness mechanism

Pinned Harness Connection exposes:

- `connection.rpc.handle(channel, handler)`
- `connection.rpc.intercept('/api', matcher, handler)`
- `connection.fetch.register(route)`

For an independent RPC channel, `HostConnectionService.rpc.handle()` captures the Connection service's owning Context and internally executes:

`owner.webServer.register(route)`

The Connection plugin's own hard dependency declaration is only:

`inject = ['credentials']`

Its normal `/api` Web route is mounted separately inside:

`ctx.inject(['webServer'], ...)`

Therefore a third-party call to `rpc.handle('/risk-advisor', ...)` can reach the registration code while the captured Connection owning Context is not permitted to access `webServer`.

Real instrumentation confirmed the first failure occurs before `webServer.register()`.

This is a pinned-Harness independent-channel lifecycle defect, not a Risk Advisor assessment/correlation defect.

---

## 3. Why Final Closure missed it

Final Closure proved:

- installed external bundle activation;
- real ToolRuntime traversal;
- real Native Approval;
- Risk Advisor assessment association = BOUND.

It explicitly did not run a deployed interactive Browser proof.

The release probe called Host assessment/correlation paths but did not prove the actual Browser transport chain:

`Browser -> Connection wire -> Risk Advisor Host bridge -> PresentationStore -> UI READY`

Existing Risk Advisor tests similarly split Host bridge logic from client rendering or used fake/direct transports.

---

## 4. Repair alternatives considered

### A. Modify Harness Core

Possible upstream fixes include making Connection own the correct Web dependency or changing `rpc.handle()` to use caller-owned lifecycle context.

Rejected for this maintenance task because:

- Risk Advisor V1 is an external plugin;
- Harness Core is pinned/read-only for this project;
- V1 explicitly avoids requiring a Harness source patch.

The upstream defect may be documented separately later.

### B. Add `webServer` only to Risk Advisor's own inject list

Rejected.

The failing owner inside `rpc.handle()` is the Connection service context, not the Risk Advisor callback context.

### C. Add another `rpc.intercept('/api', ...)`

Rejected.

Pinned Connection supports one shared `/api` interceptor and API Gateway already owns it.

### D. Copy a private authenticated Web route implementation into Risk Advisor

Rejected.

This would duplicate Harness trust/auth transport logic and expand security/lifecycle scope.

### E. Use public exact Fetch routes under the existing authenticated `/api` carrier

Selected.

Pinned Connection provides `connection.fetch.register()` specifically for exact routes under the already-mounted shared `/api` channel.

The shared `/api` route already applies:

- Host/Origin trust checks;
- browser authentication;
- request-body handling;
- exact-route dispatch before the API Gateway interceptor.

This avoids the broken independent-channel path without changing Harness Core.

---

## 5. Selected transport shape

Replace the independent channel:

`/risk-advisor`

with two exact routes carried by the existing `/api` transport:

- `/api/risk-advisor/active`
- `/api/risk-advisor/assessment`

Client calls remain on the public Connection RPC carrier:

- channel: `/api`
- endpoint: `risk-advisor/active`
- endpoint: `risk-advisor/assessment`

The host exact routes must accept the same Connection client-request envelope and return the same Connection server-response envelope so the existing `ClientConnectionRpc.call()` remains authoritative.

Business payload/response semantics remain unchanged.

---

## 6. Scope of product change

Allowed product changes are limited to Browser bridge transport mounting and shared transport constants/adapters.

Expected files are limited to the equivalent of:

- `src/host/browser-bridge.ts`
- `src/client/assessment-bridge.ts`
- `src/bridge-contract.ts`
- focused bridge/lifecycle tests
- package/test metadata only if needed for a focused repair gate.

Do not change:

- Risk Engine;
- rule engine;
- Fast Judge;
- Evidence;
- Deep Judge;
- correlation semantics;
- approval authority;
- UI layout/content except incidental status transition caused by transport becoming available;
- Harness Core.

---

## 7. Exact-route lifecycle requirement

Although `connection.fetch.register()` internally stores an exact route on Connection, Risk Advisor must retain and dispose the returned registration through its own lifecycle effect.

Required behavior:

- install exactly two Risk Advisor exact routes;
- dispose both when Risk Advisor Host fiber unloads;
- HMR/reload leaves no duplicate/stale route;
- partial registration failure cleans up any route already installed.

No permanent route may survive Risk Advisor disposal.

---

## 8. Wire compatibility requirement

The host adapter must validate the Connection client-request envelope sufficiently to preserve the existing Browser caller contract:

```text
type = client-request
rpcId = bounded correlation id
method = exact endpoint
payload = existing Risk Advisor payload
```

Response must preserve:

```text
type = server-response
rpcId = request rpcId
result = existing Risk Advisor ConnectionRpcResult
```

Malformed carrier requests must fail boundedly and must not leak raw payloads.

Do not change the Risk Advisor business bridge schemas.

---

## 9. Required regression proof

The repair must add automated proof for:

1. real/public Host Connection exact-route registration;
2. `/api/risk-advisor/active` and `assessment` envelope compatibility;
3. exact-route removal on Risk Advisor disposal;
4. clean remount/HMR without duplicate route;
5. existing direct bridge auth/domain validation remains intact;
6. client transport failures still degrade safely;
7. Native Approval authority remains untouched.

A real installed-profile proof is mandatory after focused/static gates.

---

## 10. Real profile proof

On the exact committed repair candidate:

1. build and pack locally;
2. replace/update only the Risk Advisor package in the existing Pilot `web` profile through the supported plugin manager;
3. cleanly restart the profile;
4. verify authenticated POST through the real Browser/Connection transport reaches:
   - `/api/risk-advisor/active`;
5. trigger the same safe escalation approval used by the Pilot;
6. verify the Risk Advisor UI reaches READY within 10 seconds.

The user remains the authority for the visible Browser observation.

Do not continue A-F usability scenarios until this single READY proof passes.

---

## 11. Acceptance/testing rule

Because product source changes, this is a real V1 maintenance executable change.

Before final handoff:

- focused repair tests;
- affected P1C/P6/P10 lifecycle/client/host/coexistence regressions;
- R1-R5 and P1A-P10 inherited tests as required by the repository gate;
- typecheck/build/export/declaration/package/privacy/boundary gates;
- exact Harness pin/clean;
- installed-profile transport smoke;
- exactly one fresh complete `pnpm test` on the final exact repair Tested SHA.

If any executable change occurs after Full, the final Full evidence is invalid.

After final Full only the maintenance Execution Report may change.

---

## 12. Preflight conclusion

The defect is real, but Risk Advisor does not need to patch Harness Core.

The bounded V1 maintenance repair is:

> move the two read-only Risk Advisor Browser RPC endpoints from a broken independent Connection channel to exact routes beneath the existing authenticated `/api` carrier, preserving the existing business protocol and Native Approval authority.

Next artifact:

`V1_Maintenance_Browser_Bridge_Repair_Freeze.md`
