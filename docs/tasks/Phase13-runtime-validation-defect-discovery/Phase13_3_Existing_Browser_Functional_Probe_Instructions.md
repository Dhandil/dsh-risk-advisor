# Phase 13.3 — Existing Browser Functional Probe Instructions

**This supersedes** the Chromium-download instructions in `Phase13_3_Targeted_Chromium_Cache_Repair_And_Resume_Instructions.md`. **Do not install Chromium.**

Read:
`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Existing_Browser_Reuse_Architecture_Amendment.md`

1. Preflight pinned Harness `ddefc45f...`, accepted Product `b1b605e...`, Web Client hash `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`.
2. Determine whether the actual executor already exposes a working **Computer Use / browser-use MCP In-app Browser**. Prefer it when it supports ordinary UI and the necessary live Session↔RPC proof. Do not assume tool availability from older runs.
3. If not capable of passive RPC evidence, use **existing Google Chrome** via the already-installed Playwright `chromium.launch({ channel: 'chrome', headless: true })`, with a new isolated browser context and no access to the user's daily Chrome profile. Inspect only the exact Chrome executable path necessary for launch.
4. ONE browser/Host attempt maximum; direct native loopback Harness launch URL in memory with `--no-open`. No token/search-bar exposure, custom RPC, browser install or tool/plugin setup.
5. Use real Web UI to create Session A/B and do two low-impact owned-fixture tasks. Prove UI `aria-selected` state and real Client RPC A→B→A identity. If proven, up to two further natural F1/F2-opportunity tasks (overall max 4 tasks / 40 Tools).
6. After Finding/evidence capture, delete only this run's exclusive OS-temp task roots; verify removal. Close the exact browser/Host; report `CLEANUP_PASS/PARTIAL/BLOCKED`.
7. Protect Desktop, Documents, Downloads, iCloud, private directories, old V2 49 files, accepted package archives, `lib/`, `node_modules/`, `.vitest-cache/` and stored Sessions. No Product/validation/Harness/profile edits, Phase 13.4 or full regression.

One docs-only execution report. If the pre-existing browser surface is unavailable or unsuited to the proof, report and stop rather than installing anything.
