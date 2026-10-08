# Phase 13.3 — Chromium-First Single-Run Resume Report

Date: 2026-10-08

## Frozen outcome

`RISK_ADVISOR_PHASE13_3_CHROMIUM_LAUNCH_CAUSE_CAPTURED_BLOCKED`

The exact Chromium executable returned by the pinned Playwright installation was absent. Its one permitted preflight `stat` raised the original exception below. Because the preflight failed, `chromium.launch()` was not invoked; no alternate executable was searched or tried. The run stopped before starting the Harness Host, creating task roots, or submitting any task. This report does not claim Phase 13.3 acceptance.

## Baseline

- Main baseline: `d02d63e09ee399bf712d9cfcb69a37d62ea49628`.
- Pinned Harness SHA: `ddefc45fbc7f8e46dd73185e68295696d1297887`; tracked working tree clean.
- Accepted Product inputs: `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`; tracked Product inputs match and are clean.
- Installed Web profile package: `@dhandil/dsh-risk-advisor@0.1.0-r1`; installed Client SHA-256 matches `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`.
- Playwright: `1.61.1`; Node: `v24.21.0`; runtime: `darwin arm64`.
- No listener was present on the normal Web port `3080` during preflight.

## Chromium-first diagnostic

Playwright's `chromium.executablePath()` resolved to the cached `chromium-1228` macOS arm64 application path. Only that exact path was checked. The requested launch profile had been prepared as headless Chromium with Playwright defaults, no channel override, no custom executable override, and no additional arguments.

Sanitized original preflight exception:

```text
stage: chromium.executablePath() -> fs.statSync
name: Error
code: ENOENT
errno: -2
syscall: stat
message: ENOENT: no such file or directory, stat '<HOME>/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
cause: Playwright-resolved cached Chromium executable is absent
```

No browser launch, browser navigation, Host launch, Provider request, Agent task, Tool execution, or Online Correction RPC occurred. No reinstall, fallback executable, alternate browser, or retry was attempted.

## Cleanup and preservation

No Browser, Host, task root, or task output was created, so there were no runtime artifacts to remove. `CLEANUP_PASS`.

No Product, validation, Harness source, Harness configuration, Web profile selection, or model setting was changed. Existing `lib/`, `node_modules/`, `.vitest-cache/`, prior V2 evidence and its 49 files, Session data, plugin packages, and rollback archives were left untouched. Forbidden personal folders and broad home/temp scans were not accessed. Phase 13.4 was not started.
