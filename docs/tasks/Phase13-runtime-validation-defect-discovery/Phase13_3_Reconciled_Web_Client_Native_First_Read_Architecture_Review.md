# Risk Advisor Phase 13.3 — Reconciled Web Client Native First-Read Architecture Review

## Status

`RISK_ADVISOR_PHASE13_3_NATIVE_CLIENT_FIRST_READ_VERIFICATION_AUTHORIZED`

## Provenance and scope

The Web profile package reconciliation report `b5a547f75a9930b1a32332c3ee5f2d0532928790` is verified on the remote `codex/phase13-3-web-profile-client-artifact-reconciliation` branch as a single docs-only report based on `5619b318c21de59c26248c636dfa285ab16b28be`.

The installed Web profile package is now built from accepted Product sources. The installed `lib/client.js` and fresh tarball `package/lib/client.js` share SHA-256 `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`. The package contains `OnlineCorrectionClient` and `conversation.input.dock` registration. No runtime Client `apply`, Dock mount, or first RPC has been proven yet.

This step tests **Risk Advisor's installed Client delivery**, not Harness security, Agent behavior, provider capability, or F1/F2 correctness.

## Authoritative pinned Harness browser entry

Pinned Harness `ddefc45fbc7f8e46dd73185e68295696d1297887` supports:

- `dsh --profile web --no-open`: normal real Web Host without automatically opening the default browser;
- its normal startup URL has a process-local token, exchanged at the root page for normal browser cookie authentication;
- its existing test environment uses Playwright/Chromium for real Web UI behavior.

These are existing Harness capabilities. Do not write a second Host, authentication service, SessionStore, RPC client, or Agent loop.

## Browser navigation safety decision

Previous Chrome address-bar/autocomplete use twice submitted process-token URLs as external Google search queries. Do not use the user's normal Chrome profile/omnibox/history or default-browser auto-open.

Use **normal Harness Web Host with `--no-open`**, and if the pinned Harness Playwright/Chromium executable is already available, create a fresh nonpersistent Chromium browser context. In the automation, take the launch URL directly from the Host startup handoff **in memory**, validate its `http://127.0.0.1:<port>/` origin and process-token query form, and navigate through **Playwright's direct `page.goto`**, not a browser search field. Use the true published Host startup URL; do not forge authentication tokens or manually set authentication cookies.

Do not print or persist the tokenized startup URL, query, cookies, headers, Playwright traces/HAR, screenshots or browser history. Sanitized final evidence must omit URL secrets. Configure the temporary browser context not to follow unrelated external navigations; do not intercept/replace the normal localhost authentication exchange. Browser context and Host must be cleanly closed after the probe.

If Playwright or a compatible preexisting executable is unavailable, or the native token handoff cannot be safely consumed without exposing it, **stop**. Do not install Chromium/dependencies or fall back to Chrome autocomplete. Do not delete Chrome history/cookies or rotate the user's credentials.

## Focused proof (zero Agent work)

1. Preflight: ensure no competing Web Host on the target port, and the installed Web Client hash still matches the reconciled digest. Don't change Product, Harness, user profile or plugin selections.
2. Start the regular **pinned** Web profile once with `--no-open`; no readiness provider request.
3. Open the actual Web UI in the fresh, nonpersistent Chromium context using direct navigation, complete the normal Host token-to-cookie redirect (without extracting or printing credentials), and select an **already existing** Session through the normal UI if required for input dock.
4. Observe the browser's normal requests and sanitized results for the existing `risk-advisor/online-correction` endpoint. Do not construct a custom RPC call. Do not create or submit any Agent task, invoke Tools or run provider.
5. Prove at least one normal Client-originated request for an active existing Session. Record status `VIEW` (possibly empty), `NOT_FOUND` or `UNAVAILABLE`, and the resulting Client behavior **separately**. A successful `VIEW` empty means no retained Findings at that time, not that F1/F2 were evaluated.
6. If no request is made, capture only existing nonsecret loader/slot/client activation observations sufficient to localize which stage was reached, then stop. Do not instrument Product code or add a new test connector.
7. No extra retries just to obtain a desired result. Preserve a bounded sanitized failure report if no public request is observed.

## Non-goals and gate

This step does **not**:
- classify true F1/F2 negatives or positives;
- retest the 20 historical Sessions;
- use an isolated fake Harness;
- authorize product repair by guess;
- authorize the four-task live Finding probe before review.

No Product, validation, Harness source or config changes; no tests or build, no new plugin installation, no full `pnpm test`, no Phase 13.4. Preserve previous `lib/`, `node_modules/`, `.vitest-cache/` and rollback tarball.

## Outcomes

- `RISK_ADVISOR_PHASE13_3_NATIVE_CLIENT_FIRST_READ_VERIFIED` — direct normal Client RPC observed and valid active Session `VIEW` recorded.
- `RISK_ADVISOR_PHASE13_3_NATIVE_CLIENT_FIRST_READ_PARTIAL` — normal request observed, but the active Session view cannot be established / result is NOT_FOUND or UNAVAILABLE.
- `RISK_ADVISOR_PHASE13_3_NATIVE_CLIENT_ACTIVATION_BLOCKED` — Web Client loaded but no first RPC; report the most precise established layer.
- `RISK_ADVISOR_PHASE13_3_NATIVE_BROWSER_NAVIGATION_BLOCKED` — unable to navigate safely with the existing supported browser tools.

None of these outcomes automatically accepts Phase 13.3 or alters frozen F1/F2 contract.
