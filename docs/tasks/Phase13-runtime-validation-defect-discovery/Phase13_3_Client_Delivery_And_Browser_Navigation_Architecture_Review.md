# Phase 13.3 — Client Delivery Provenance and Browser Navigation Blocker Review

## Status

`RISK_ADVISOR_PHASE13_3_OFFLINE_CLIENT_DELIVERY_AUDIT_REQUIRED`

The Phase 13.3 Client activation localization remains **blocked, not repaired**. No Risk Advisor Product root cause, F1/F2 false negative, or failed Host bridge is established.

The executor reported 31/31 Phase12.2 focused tests and 7/7 Client HMR/coexistence tests passing. These are useful **isolated** assertions, not proof that the installed browser Client module was activated by the real Harness composition. No implementation commit exists, so typecheck/build/pack gates were appropriately not asserted.

The executor also reported **another Chrome autocomplete event**: a saved local URL containing a Harness browser launch token was submitted as a Google search query. This is an unrelated local browser navigation/credential-handling incident. No product repair should be inferred from it. The actual token value, exact process lifetime, Google retention, and present usability are not independently known.

## Provenance caveat

The executor's report-only commit `e6c1c85e0248e62659b884e5e2e9ee2affa679aa` exists only locally as reported and has **not** been fetched/verified remotely. First push the unchanged docs-only report to its original branch and verify base `6b78c42156e2e73180e7b338c3104b63d99d9fee`. Do not rewrite the report in response to this review.

## Source facts

Risk Advisor at `6b78c42156e2e73180e7b338c3104b63d99d9fee`:

- `package.json` declares `dsh.client`, platform `web`, the `./client` export and `lib/client.js` distribution.
- `tsdown.config.ts` emits a CJS browser factory with module ID `@dhandil/dsh-risk-advisor` under `window.__ModuleLoader__.load`.
- `src/client/index.ts` exports `inject` and `apply`; its `apply` registers a `conversation.input.dock` contribution through the existing slot system.
- `src/client/OnlineCorrectionDock.tsx` invokes `retain(sessionId)` in a React effect.
- `src/client/online-correction-client.ts` starts its Store only on the first `retain`.
- `src/client/online-correction-store.ts` starts the first bridge read immediately, with 1-second polls thereafter.
- `tests/p12-2-online-correction.spec.tsx` mocks an owner/root slot declaration and checks registration, but does not prove distribution from an actually installed Harness profile or the complete normal Client boot/mount path.

Pinned Harness source at `deepseek-ai/deepseek-harness` `ddefc45fbc7f8e46dd73185e68295696d1297887`:

- `packages/client/modules/src/client/manifest.ts` and the implemented Client plugin loading model separate **bundle factory registration** from module materialization and Loader plugin activation;
- `conversation.input.dock` is an ordinary declared slot owned by `ui-conversation`. The feature must mount through the normal app's slot lifetime.

Thus Host plugin enabled, browser factory registered, Client `apply()` invoked, slot registered, Dock mounted, and first RPC sent are **distinct evidence points**.

## Decision

Do not reopen the normal Chrome Harness page under the current saved-token/autocomplete condition. Do not make another token-bearing navigation attempt, search or synthetic browser-auth flow. Do not run Agent/provider/Tool calls.

Instead perform a **read-only, offline installed-client provenance and lifecycle audit**:

1. Identify the exact selected Harness profile and the installed Risk Advisor package location/version using metadata **only**, without dumping config secrets.
2. Compare installed artifact files (especially `lib/client.js`, client export/package metadata, and bundle manifest) with the expected Product build provenance; do not assume a source checkout implies the browser loads that version.
3. Use the pinned Harness Client loader/boot-graph source to localize whether package manifest resolution, `__ModuleLoader__.load` factory registration, module materialization, plugin activation, and dock registration are provable **from existing artifacts**.
4. Distinguish unproven runtime mount evidence from demonstrated incorrect Product code.
5. Identify the earliest grounded mismatch, if any. Do not patch Client code to compensate for a stale/unselected external package.
6. Reuse Phase12.2 accepted tests and already-created execution evidence; do not instantiate a parallel Client/Harness runtime.

If no first failure can be established without live browser access, report `NATIVE_CLIENT_ACTIVATION_UNPROVEN`, with the minimal future UI verification prerequisite. Do not claim a proven Product defect.

## Browser incident boundary

The pinned Harness implemented browser-authentication design documents that the startup URL token is process-scoped, not persisted, and changes on a new Host process. It is not the same credential as the browser cookie or provider API key.

If the Host process whose startup URL was submitted is still running, **stop that process to retire that launch token** before any future navigation. Do not claim that a closed browser tab alone invalidates it.

Do not silently delete Chrome history, user cookies, saved addresses, `$DSH_HOME` credentials, or API keys. Any future browser hygiene or navigation fix must be user-controlled and targeted. Do not promise that externally submitted Google search terms were removed.

## Boundaries

No Product, validation, Harness source/config edits, no reinstall/update, no `pnpm` test rerun, no browser interaction, no Agent/provider/Tool execution, no Phase13.4.

Existing `node_modules/` and `.vitest-cache/` are untracked, not evidence of Product drift. Leave them untouched pending an explicit cleanup decision.

## Report outcome

- `RISK_ADVISOR_PHASE13_3_OFFLINE_CLIENT_DELIVERY_MISMATCH_LOCALIZED` — concrete artifact/loader mismatch with evidence.
- `RISK_ADVISOR_PHASE13_3_OFFLINE_CLIENT_DELIVERY_AUDIT_INCONCLUSIVE` — no mismatch provable offline; native verification remains blocked by browser navigation.
- `RISK_ADVISOR_PHASE13_3_OFFLINE_CLIENT_DELIVERY_MATCHED_NATIVE_ACTIVATION_UNPROVEN` — installed artifact matches expected provenance but mount/first RPC lacks evidence.

Any follow-up Product repair requires separately reviewed, exact cause and scope. None is authorized here.
