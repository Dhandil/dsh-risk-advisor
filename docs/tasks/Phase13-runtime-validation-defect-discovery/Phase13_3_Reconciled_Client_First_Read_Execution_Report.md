# Phase 13.3 — Reconciled Client First-Read Execution Report

Date: 2026-10-08

## Outcome

`RISK_ADVISOR_PHASE13_3_NATIVE_CLIENT_FIRST_READ_PARTIAL`

A normal Risk Advisor Client request to `/api/risk-advisor/online-correction` was observed in the fresh Harness Web session. The response was HTTP 200. The in-memory response parser reached its `VIEW` branch, recorded zero Findings, and confirmed the response Session ID matched the request Session ID. An empty `VIEW` is only an observation of the current view; it is not F1/F2 truth and was not scored as a negative.

This run is reported as partial because the runner's final status was corrupted by a waiter wiring error, and the post-click active-row marker was not confirmed. The raw response body was never persisted, so this report does not upgrade the evidence to a fully verified active-Session view.

## Preconditions and provenance

- Product checkout and `origin/main`: `ea9d07d1443ffe82a66836550c2fa84fee258d7a`.
- Reconciliation report `b5a547f75a9930b1a32332c3ee5f2d0532928790` was verified on `codex/phase13-3-web-profile-client-artifact-reconciliation`.
- Installed Web profile Client SHA-256 before and after the probe: `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`.
- Pinned Harness checkout: `/Users/tongxin/Developer/Harness/deepseek-harness`, SHA `ddefc45fbc7f8e46dd73185e68295696d1297887`; tracked files remained unchanged.
- No competing listener was present on the Web Host port before launch.
- Preinstalled Playwright `1.61.1` and cached Chromium were available. A fresh ephemeral Playwright context successfully opened `about:blank` before the Host launch; no package or browser was installed.

## Native first-read observations

Started the normal pinned Harness command once: `pnpm dsh --profile web --no-open`. The startup handoff was consumed inside the runner's memory, validated as a loopback root URL with the expected token query form, and passed directly to Playwright `page.goto`. The URL, query, token, cookies, and headers were not printed, logged, or retained in a report. The fresh nonpersistent context allowed only the Host's loopback origin; no external-origin navigation was attempted.

The normal Session tree appeared with two nonblank candidate rows. A row was clicked through the normal UI path. The click call completed, but the follow-up selected-row check did not confirm the active marker. During this interaction the Client emitted the first observed POST for `risk-advisor/online-correction`; its request had a nonempty Session ID. The HTTP 200 response parsed as `VIEW` with zero Findings, and its Session ID matched the request. No Session ID or row title is included here.

The observer's response callback populated the sanitized `VIEW` fields, but its completion promise was accidentally wired to the Host-readiness reject callback. The main flow therefore waited until its 15-second timeout and overwrote the final classification field with `UNAVAILABLE`. The recorded zero Finding count and matching Session boolean came only from the successful `VIEW` parser branch. The raw body was not retained, and later automatic one-second poll requests were not counted; this report records only the first observed request and does not claim an exact total request count.

The outcome remains partial because the selected-row confirmation and runner's final classification were unreliable. No defect, Finding false negative, F1/F2 positive, or F1/F2 negative is inferred. This is not Phase 13.3 acceptance.

## Cleanup and boundaries

The ephemeral browser context and browser were closed, and the exact detached Host process group was stopped. A post-run listener check found no Web Host on port 3080. No Agent, provider, Tool, readiness request, test suite, build, package operation, Product/validation/Harness/profile edit, cookie read, screenshot, trace, or HAR was performed. Existing `.vitest-cache/`, `lib/`, `node_modules/`, and Harness's unrelated untracked `deepseek-harness/` directory were preserved.

This report is the only tracked change in its commit. No Phase 13.4 work was started.
