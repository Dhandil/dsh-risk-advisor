# Phase 13.3 — Online Correction Client Activation Localization

## Frozen outcome

`RISK_ADVISOR_PHASE13_3_CLIENT_ACTIVATION_LOCALIZATION_BLOCKED`

The exact first failing Product-owned activation step was not established. No Product repair is included. The real Harness Web first-read proof did not complete, so this report does not claim that the Online Correction RPC works in a browser or that a Harness slot mounts in the installed profile.

## Baseline and provenance

- The unchanged focused report `4e6aa67d575378f857afb4feb064cf8ac5b5aced` was pushed to `origin/codex/phase13-3-focused-live-finding-probe`; the remote ref was verified at that exact SHA.
- Main was fetched and verified at `6b78c42156e2e73180e7b338c3104b63d99d9fee` before localization.
- The pinned Harness checkout reports `ddefc45fbc7f8e46dd73185e68295696d1297887`. No Harness files were changed.
- No Product source, accepted validation oracle, profile configuration, or package manifest was changed.

## Source and package trace

Static inspection confirms the intended Product path exists:

1. `package.json` declares a web Client and maps `./client` to `lib/client.js`; the bundle patch inserts the Risk Advisor package. Its manifest includes the Harness connection and UI renderer packages.
2. `src/client/index.ts` exports the Client `apply`; it uses an existing `connection` service or waits for that service, then installs the Online Correction contribution with `ctx.slots.inject('conversation.input.dock', ...)`.
3. `OnlineCorrectionDock` gets the per-Session source during render and retains/releases it in a React effect.
4. First retain starts the store. `OnlineCorrectionStore.start()` subscribes to connection generation and immediately reads.
5. The existing bridge calls the `risk-advisor/online-correction` RPC.

The code and package declarations alone do not prove that the installed browser loaded and applied this bundle, that the real conversation slot mounted the Dock, or that the effect retained its store. The existing P12.2 registration assertions and P10 detail-slot HMR coverage do not observe this entire input-dock composition or its first RPC.

## Focused checks

- `pnpm run test:p12.2` — PASS, 1 file / 31 tests.
- `pnpm exec vitest run tests/p10-client-hmr.integration.spec.tsx tests/p10-coexistence.integration.spec.ts` — PASS, 2 files / 7 tests.
- No typecheck, build, or packaging gate was run because no repair candidate was established.
- No Agent task, provider request, or Tool execution was started. No campaign was replayed and no full `pnpm test` was run.

## Native Web attempt and limit

The only listening local Web process inspected was rooted in the temporary `phase13-real-harness-observational-v2` workspace, so it was not accepted as proof for the target installed profile. A browser navigation attempt then followed a saved Chrome omnibox suggestion to Google Search instead of loading loopback Harness Web. The tab was closed and browser work stopped. No Harness Session was loaded and no Online Correction RPC result was observed. The query may remain in browser/search history; this report intentionally omits its contents.

Because the exact first failing step remains unknown, the evidence does not authorize Product source changes. A future localization should use the standard `dsh web` browser handoff and establish installed bundle provenance, real `conversation.input.dock` mount/retain, and the first sanitized `VIEW` / `NOT_FOUND` / `UNAVAILABLE` RPC result in the same existing Session, with zero Agent/provider/Tool operations.
