# Risk Advisor V1 Maintenance — Browser Bridge Repair Implementation Instructions

## Required outcome

Implement only the frozen Browser bridge repair.

Success handoff:

`V1_MAINTENANCE_BROWSER_BRIDGE_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Do not start Phase 11/V2.

Do not modify Harness Core.

---

## 1. Sync and read

Sync `origin/main`.

Required baseline includes:

`fd459dc36d03824913e2370356e1b9cc467a4ff2`

Read:

1. `V1_Maintenance_Browser_Bridge_Repair_Preflight.md`
2. `V1_Maintenance_Browser_Bridge_Repair_Freeze.md`
3. current bridge/client code
4. pinned Harness Connection `rpc-host.ts` and browser RPC client

Freeze is authoritative.

Preserve user drift. No reset/clean/force push.

---

## 2. Implement only the transport repair

Replace the broken independent Browser channel with the frozen shared `/api` exact routes.

Required host paths:

- `/api/risk-advisor/active`
- `/api/risk-advisor/assessment`

Register them through public:

`connection.fetch.register()`

Do not use:

- `connection.rpc.handle('/risk-advisor', ...)`
- a second `rpc.intercept('/api', ...)`
- direct WebServer registration
- copied Harness auth/trust logic.

---

## 3. Preserve Connection RPC client

Risk Advisor client must continue using `ClientConnectionRpc.call()`.

Use:

- channel `/api`
- endpoint `risk-advisor/active`
- endpoint `risk-advisor/assessment`

Do not add raw global fetch logic.

---

## 4. Exact-route wire adapter

Each exact route must accept the normal Connection `client-request` envelope and return the normal `server-response` envelope.

Use public Connection schemas/types where possible.

Validate at least:

- POST only;
- JSON content type;
- valid client-request envelope;
- request method exactly matches the route endpoint;
- rpcId echoed unchanged.

Then call existing `handleRiskAdvisorRpc()` with existing business payload semantics.

Malformed carrier input must fail boundedly without raw payload leakage.

Do not change Risk Advisor business DTO schemas.

---

## 5. Lifecycle

Risk Advisor owns both route registrations.

Ensure:

- both route disposers are retained by Risk Advisor effect;
- dispose removes both;
- remount/HMR succeeds once;
- if second registration fails, first is removed.

Add focused lifecycle proof.

---

## 6. Source scope

Expected source changes only in bridge transport files and focused tests.

Do not change:

- Risk Engine;
- correlation;
- rule engine;
- Fast/Evidence/Deep Judge;
- approval authority;
- UI styling/content;
- Harness Core.

Do not fix the `Risk AdvisorUNAVAILABLE` spacing in this repair.

---

## 7. Tests before Full

Run focused repair tests, then affected:

- P1C;
- P6 bridge/store/UI/lifecycle;
- P10 Host HMR;
- P10 Client HMR;
- P10 coexistence;
- P10 Native-close;
- P10 boundary/privacy.

Then run the repository's inherited pre-Full gates per Freeze.

Do not run fresh complete `pnpm test` during iteration.

---

## 8. Exact repair candidate

When all pre-Full gates pass:

- commit the exact executable/test candidate;
- record it as `TESTED_SHA`;
- build/pack that exact SHA.

Update only Risk Advisor in the real `web` Pilot profile through the supported plugin manager.

Clean restart.

Verify pinned Harness remains:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

---

## 9. Real transport proof

On the repaired real `web` profile prove:

- authenticated `/api/risk-advisor/active` reaches Risk Advisor and returns valid Connection server-response;
- `/api/risk-advisor/assessment` is mounted;
- old independent `/risk-advisor` route is not required;
- no duplicate routes/bundles;
- Harness tracked mutation = 0;
- provider/credentials unchanged.

Then stop for a real Browser approval if human interaction is required.

The known safe escalation Pilot operation must reach Risk Advisor `READY` within 10 seconds.

If READY cannot be proven, do not continue to final Full; return the blocker.

---

## 10. Final Full

Only after real route + Browser READY proof passes:

run exactly one fresh complete:

`pnpm test`

on the exact committed `TESTED_SHA`.

If it fails, repair, recommit, rerun affected gates and repeat real Browser proof before a new fresh Full.

---

## 11. Report

After final Full PASS, change only:

`docs/tasks/V1-maintenance-browser-bridge-repair/Execution_Report.md`

Record:

- root cause;
- exact implementation;
- Tested SHA;
- real route proof;
- real Browser READY proof;
- focused/pre-Full gates;
- fresh Full result;
- Harness pin/clean;
- external provider/network/registry calls;
- final report SHA.

Return:

`V1_MAINTENANCE_BROWSER_BRIDGE_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Do not declare acceptance.
