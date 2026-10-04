# Risk Advisor V1 Maintenance — Browser Bridge Repair Acceptance Report

## Final status

`V1_MAINTENANCE_BROWSER_BRIDGE_REPAIR_ACCEPTED_BASELINE_ADVANCED`

This report is the independent acceptance authority for the V1 Browser bridge maintenance repair.

It does not start Phase 11 or V2.

---

## 1. Accepted identities

Previous accepted V1 product executable:

`1fa84e2a8a9de465cdb85fef928ec9e19086bba2`

Maintenance repair Tested / new V1 product executable:

`f4807e2186e43690ba6dc4c349107b55e407aa53`

Maintenance Execution Report commit:

`384307fbaede2a2c82fdb53e72f41504221cafe0`

Pinned Harness Core:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

Fresh complete regression on the exact Tested SHA:

`58 files / 304 tests PASS`

---

## 2. Defect accepted as repaired

The real Deployment Pilot exposed a Browser transport blocker:

- Native Approval rendered;
- Risk Advisor client contribution rendered;
- Risk Advisor remained permanently `UNAVAILABLE`;
- the independent `/risk-advisor` Connection route was absent in the real Web profile.

The confirmed pinned-Harness mechanism was that independent `connection.rpc.handle()` route registration used the Connection service owning Context, which did not declare the `webServer` capability required by that internal registration path.

The repair does not patch Harness Core.

---

## 3. Accepted repair architecture

The accepted implementation moves the two read-only Risk Advisor Browser presentation endpoints onto exact routes beneath the existing authenticated shared Connection `/api` transport:

- `/api/risk-advisor/active`
- `/api/risk-advisor/assessment`

The Browser continues to use `ClientConnectionRpc.call()` with:

- channel `/api`;
- endpoint `risk-advisor/active`;
- endpoint `risk-advisor/assessment`.

The Host uses the public `connection.fetch.register()` exact-route registry.

This preserves the Connection-owned Host/Origin trust fence and Browser authentication already applied by the shared `/api` carrier.

No second API Gateway interceptor and no private WebServer/auth copy were introduced.

---

## 4. Independent source review

The executable repair relative to the frozen implementation-instructions baseline is limited to:

- `src/bridge-contract.ts`
- `src/client/assessment-bridge.ts`
- `src/host/browser-bridge.ts`
- `tests/p1c-browser-bridge.spec.ts`
- `tests/p1c-pinned-connection.probe.mjs`
- `tests/p10-host-hmr.integration.spec.ts`

No unrelated product source was changed.

Independent inspection confirms:

- Client calls target the frozen shared `/api` carrier.
- Host registers exactly two exact Risk Advisor routes.
- Connection client-request validation is retained.
- `rpcId` is echoed in standard server-response envelopes.
- method/content-type/malformed-envelope failures remain bounded.
- Risk Advisor business payload and Browser DTO semantics remain unchanged.
- route registrations are owned by the Risk Advisor lifecycle.
- disposal drains both registrations.
- partial second-route registration failure cleans the first registration.
- HMR/remount tests require no duplicate surviving routes.
- Native Approval authority is unchanged.

---

## 5. Real deployed proof

The repair was installed into the real `web` profile on the pinned Harness.

Real transport smoke proved both exact endpoints return valid authenticated Connection envelopes.

The user then triggered a genuine sandbox-denial -> permission-escalation -> Native Approval flow.

The real Browser observation proved:

- Native Approval appeared;
- Risk Advisor reached `READY` / “评估就绪” within the required window;
- Risk Advisor displayed the real assessment rather than permanent `UNAVAILABLE`;
- risk = `HIGH`;
- recommendation = `NEED_MORE_INFORMATION`;
- primary reason = `INSUFFICIENT_CRITICAL_EVIDENCE`;
- permission escalation / `danger-full-access` was represented;
- Native Reject remained authoritative and functional;
- the rejected sentinel file was not created;
- no duplicate Risk Advisor card appeared.

This closes the Browser READY blocker that stopped the Deployment Pilot.

---

## 6. Regression authority

The Execution Report records the focused and inherited pre-Full gates, including affected P1C, P6 and P10 Browser/Host/HMR/coexistence coverage.

Exactly one fresh complete:

`pnpm test`

was then run on the exact Tested SHA after the real Browser READY proof.

Result:

`PASS — 58 files / 304 tests`

No executable, test, package or benchmark semantic change occurred after that Full.

---

## 7. Publication integrity

Independent remote comparison confirms:

`f4807e2186e43690ba6dc4c349107b55e407aa53 -> 384307fbaede2a2c82fdb53e72f41504221cafe0`

contains exactly one added file:

`docs/tasks/V1-maintenance-browser-bridge-repair/Execution_Report.md`

No executable drift exists after the fresh Full.

Before this Acceptance Report, remote `main` equals:

`384307fbaede2a2c82fdb53e72f41504221cafe0`

---

## 8. Acceptance effect

The V1 executable baseline advances from:

`1fa84e2a8a9de465cdb85fef928ec9e19086bba2`

to:

`f4807e2186e43690ba6dc4c349107b55e407aa53`

The original V1 Final Closure remains valid historical provenance. This maintenance report supersedes only the product executable identity for subsequent V1 deployment use.

The Deployment Pilot is no longer blocked by the Browser bridge defect and returns to the real-user observation stage.

The Pilot itself is not yet complete and no RETAIN/REMOVE decision is made here.

---

## 9. Non-blocking Pilot observations

The real READY card showed high information density and several low-evidence/unknown fields. These are usability observations for the resumed Deployment Pilot, not blockers for this transport repair.

Do not fold UX wording/layout changes into this accepted maintenance executable retroactively.

---

## 10. Final decision

The Browser bridge maintenance repair is independently accepted.

`V1_MAINTENANCE_BROWSER_BRIDGE_REPAIR_ACCEPTED_BASELINE_ADVANCED`
