# Risk Advisor Phase 13.3 — Client Activation Minimal Repair Instructions

## Prerequisite

Push **unchanged** the executor's existing focused report:

`4e6aa67d575378f857afb4feb064cf8ac5b5aced`

to its original branch `codex/phase13-3-focused-live-finding-probe`.

Verify it is exactly one docs-only execution report relative to baseline `319b9e7216df8eb34041c62bea762d082ffc643e`. Read it, and stop if it contradicts the reported zero-request/Client-side failure.

Then read the current main document:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Online_Correction_Client_Activation_Architecture_Review.md`

## Source localization

Follow this real Client chain:

`installed Client bundle -> Client apply -> connection injection -> input.dock declaration/registration -> mounted Dock -> retain -> store.start -> bridge.read -> existing RPC`.

Locate the **first actually failing step**, including installed-bundle/package provenance, using existing browser/Harness surfaces. Don't assume a blank dock means no mounted component.

If the failure is **not** Product-owned or not demonstrable, stop with a docs-only localization report; no Product edits.

## Conditional minimal repair

Only after exact Product-owned root cause is proven, repair the smallest Risk Advisor Client/packaging surface with regression tests proving real Harness slot composition and first RPC.

No Harness, Agent, provider, ToolRuntime, F1/F2 semantics, Host Finding core, or accepted validation-oracle changes.

## Gates

- focused Phase 12.2 and Client lifecycle/HMR/coexistence tests;
- typecheck + build + packaging/exports;
- focused normal Web native first-read proof with an existing Session and **zero Agent/provider/Tool** operations;
- no full `pnpm test`; no 20-task replay; no Phase 13.4.

Commit Product implementation and bounded report separately. Return the frozen status from Architecture Review, without self-acceptance.
