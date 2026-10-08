# Phase 13.3 — Offline Client Delivery Audit Report

Date: 2026-10-08

## Result

`RISK_ADVISOR_PHASE13_3_OFFLINE_CLIENT_DELIVERY_MISMATCH_LOCALIZED`

The earliest evidence-backed mismatch is the Web profile's selected Risk Advisor package artifact. The profile dependency resolves to the archived `v1-ux-compact-risk-indicator` package at candidate `345a54882393da7f64584f21105fa7fc56793265`. Its installed `lib/client.js` is byte-identical to the tarball's `lib/client.js`, but this artifact does not contain the Phase 12.2 Online Correction client or `conversation.input.dock` registration present in the current Product source at audit baseline `1ecdf21303abff4e95eb04e816b6c3345a27ac56`.

This localizes a stale package delivery/selection mismatch before Client factory registration. It does not prove what a live browser loaded, and it does not establish a failure in the current Product source, Harness loader, Host bridge, or RPC. No live Harness Client was available, so runtime factory registration, materialization, activation, `apply()`, Dock mount, and first RPC remain unobserved.

## Exact provenance

- Risk Advisor audit checkout: `HEAD = origin/main = 1ecdf21303abff4e95eb04e816b6c3345a27ac56`; audit branch started from that exact main revision.
- Pinned Harness checkout: `/Users/tongxin/Developer/Harness/deepseek-harness`, `HEAD = ddefc45fbc7f8e46dd73185e68295696d1297887`; no tracked Harness edits were made.
- Active Web profile inspected: `/Users/tongxin/.dsh/profiles/web`.
- Its package manifest selects `@dhandil/dsh-risk-advisor` from `file:/Users/tongxin/.dsh/artifacts/risk-advisor/v1-ux-compact-risk-indicator/345a54882393da7f64584f21105fa7fc56793265/dhandil-dsh-risk-advisor-0.1.0-r1.tgz`.
- Installed package location: `/Users/tongxin/.dsh/profiles/web/node_modules/@dhandil/dsh-risk-advisor`.
- Installed metadata identifies `@dhandil/dsh-risk-advisor@0.1.0-r1`, `main: lib/index.js`, `exports["./client"].default: lib/client.js`, and `dsh.client.platform: web`. Its bundle patch inserts the `risk-advisor` row. The version string alone is not a freshness indicator.
- Installed `lib/client.js` SHA-256: `b46a80be7e110abe7538447c7f039461230facefca097ec2f4ef679c440adf93`.
- The selected tarball's `package/lib/client.js` has the same SHA-256: `b46a80be7e110abe7538447c7f039461230facefca097ec2f4ef679c440adf93`.
- String-presence comparison: installed artifact lacks `online-correction`, `OnlineCorrectionClient`, and `conversation.input.dock`; current `src/client/index.ts` at the audit baseline contains all three. The current checkout has no tracked `lib/client.js`, and no build was run, so no expected-current-build hash is claimed.

## Loader, activation, and slot evidence

The pinned Harness source separates each stage:

1. `packages/client/modules/src/client/manifest.ts` describes bundle execution as factory registration through `window.__ModuleLoader__.load`; module-body effects run later, at materialization.
2. `packages/client/modules/src/client/system.ts` records each factory in the module system. Its `arrive()` path rejects a loaded bundle that did not register the requested module; `materialize()` invokes the registered factory and memoizes its exports.
3. `packages/client/modules/src/client/entries.ts` prefetches and imports a module, creates its Loader entry, and waits for Loader activation. These operations are separate from factory registration.
4. `packages/client/ui-conversation/src/client/contract/slots.ts` declares `conversation.input.dock` as a session-scoped list slot. `ConversationContent.tsx` renders it only when an input zone exists.
5. `packages/client/ui-renderer/src/client/registry.ts` makes `slots.inject()` wait for the declaration, run its callback as a nested Cordis effect, and dispose that effect when the declaration or owner fiber ends.
6. Current Product source `src/client/index.ts` exports `apply()`, creates the Online Correction client, and injects a registration for `conversation.input.dock` with id `risk-advisor-online-correction` and order `10`. The installed artifact lacks that feature code, so its presence in current source does not establish a registration in the Web Client.

Because no live Web Client was inspected, the audit cannot assert that its factory registered, materialized, activated, or ran `apply()`. The selected artifact mismatch is earlier and directly observable from profile/package metadata and installed bytes. Slot DOM absence, if any, was not used as evidence.

## Scope and handling

This was an offline, read-only audit. No Chrome or token-bearing URL was opened; no Agent, provider, Tool, plugin install, build, or test was run. Product, validation, Harness, and user profile files were not changed. No credential contents were read. The process check found no running Harness Host requiring retirement. Existing untracked `node_modules/` and `.vitest-cache/` directories were left intact.

The unchanged prior docs-only report `e6c1c85e0248e62659b884e5e2e9ee2affa679aa` was verified as report-only relative to `6b78c42156e2e73180e7b338c3104b63d99d9fee` and pushed unchanged to `codex/phase13-3-client-activation-localization`. This audit report is the only new file in this change.

No repair is included or implied. Any package update or live Client activation verification requires a separate authorized step.
