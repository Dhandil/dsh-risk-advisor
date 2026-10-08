# Phase 13.3 — Existing Browser First, No Chromium Download

Date: 2026-10-08

## Corrected decision

`RISK_ADVISOR_PHASE13_3_EXISTING_BROWSER_REUSE_AUTHORIZED`

**Supersedes the browser-install decision** in:
- `Phase13_3_Targeted_Chromium_Cache_Repair_Architecture_Review.md`
- `Phase13_3_Targeted_Chromium_Cache_Repair_And_Resume_Instructions.md`
(main commit `610ef9752128121417f1acf60648fb3065a22bab`).

**Do not run** `pnpm exec playwright install chromium --no-remove` in Phase 13.3 merely because the default Playwright browser cache reports `ENOENT`.

Playwright's documented default `chromium.launch()` targets its Playwright-managed Chromium. This does not imply that installed system Google Chrome is missing. Playwright officially supports launching an installed Chrome browser with `chromium.launch({ channel: 'chrome' })` without downloading its Chromium bundle. Existing supported Computer Use / browser-use MCP may instead operate a real browser via the executor's browser surface.

## Reviewed facts

- Earlier Phase 13.3 runs observed native Online Correction HTTP 200/`VIEW` in a genuine Harness Web page. Most recent report `bc1d3cefba886ed7355a86a81f28dd457367a015` established **only** that Playwright's cached `chromium-1228` executable was absent (`stat ENOENT`), not that Harness or every installed browser was unusable.
- The user has Google Chrome installed and can start Harness normally.
- Previously configured browser automation for the user's work included existing ZCode browser-use MCP (In-app Browser backed by Playwright), and Codex computer-use `cua_repl`. The execution agent must verify which surface is **actually available now**; historical use does not guarantee active capability.
- No additional browser installation or browser-control plugin is justified by the observed `ENOENT`.

## Browser selection and evidence boundary

1. **Before starting any Host or browser**, identify whether the **current** executor's already enabled native Computer Use / browser-use MCP offers a working ephemeral in-app browser. If available, prefer it for ordinary UI traversal. Use only documented native tool capabilities; do not install plugins or modify browser permissions to make it work.
2. The chosen browser control surface must support the required evidence: an actively selected normal UI Session and attribution of native Online Correction request/response to that Session. If the Computer Use surface cannot passively observe sufficient network evidence, do **not** infer RPC correlation from screenshots; instead select the preexisting Playwright package with the **installed system Chrome channel**.
3. For existing Playwright 1.61.1, `chromium.launch({ channel: 'chrome', headless: true })` is an acceptable bounded option **after read-only verification** that the installed Chrome channel is resolvable. Use an isolated nonpersistent context, without the user's real browser profile, existing tabs/cookies or installed extensions. The exact installed Chrome binary may be checked; no broad machine scans. Do not switch to a stale Playwright cached executable or create symlinks into its cache.
4. If neither existing surface supports the proof, stop once with a sanitized, actionable tool/launch error. **No fallback installation, browser download, alternate channels or repeat-launch loops.**
5. Browser authentication must use only the genuine pinned Harness URL handoff in process memory and native UI/token-to-cookie navigation; never Chrome omnibox/search autocomplete, custom RPC or fabricated auth. Never log credentials, token, cookies, headers or sensitive Session titles.
6. Continue the already frozen **one-session-then-another native A/B bootstrap, A→B→A**, at most four real Agent tasks / forty Tool calls only if the browser works. Collect risk findings during their TTL. No source, validation, Harness or Web profile edits, no Phase 13.4.

## File and privacy gate

- Never request access to Desktop, Documents, Downloads, iCloud Drive, personal folders, or broad `~` / `/private/tmp` discovery. No Full Disk Access escalation.
- Limit writable test activity to exact newly owned OS-temp fixture roots. Clear/verify those outputs after required evidence and quiescence. Record `CLEANUP_PASS/PARTIAL/BLOCKED`.
- Preserve historical V2 evidence (49 files), past Session/workspace data, `lib/`, `node_modules/`, `.vitest-cache/`, all installed plugin packages and rollback archives.
- Limit to one browser + at most one native Host launch after preflight. If the existing browser service is already active and can be reused safely, do not create a second instance needlessly.

## Outcome

Do not accept Phase 13.3 on browser readiness alone. Publish one docs-only report using the existing Phase 13.3 native functional outcome tokens, or a precise
`RISK_ADVISOR_PHASE13_3_EXISTING_BROWSER_SURFACE_UNAVAILABLE`
when no existing browser surface can support the required task without installation.

The purpose is functional Risk Advisor evaluation, not installing more browsers.
