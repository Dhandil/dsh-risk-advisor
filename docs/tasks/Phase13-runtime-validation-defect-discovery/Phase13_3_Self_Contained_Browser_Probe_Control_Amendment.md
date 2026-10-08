# Phase 13.3 — Self-Contained Browser Probe Control Amendment

Date: 2026-10-08

## Decision

`RISK_ADVISOR_PHASE13_3_SELF_CONTAINED_BROWSER_PROBE_AUTHORIZED`

This is an **ephemeral test-runner control repair**, not a Risk Advisor Product, validation, Harness or Web profile repair. It supersedes any earlier Phase 13.3 instruction that requires sending UI commands through a running observer process's stdin. Phase 13.3 remains unaccepted.

## Audited evidence

The remote docs-only report `1e432e324587890b57a06b78fbf734afc2ce2869`, based on main `5d4beaaf188f32c5e5ba8902ff0560f66f09c3ff`, proves:

- Pre-existing system Google Chrome launched successfully via Playwright `channel: 'chrome'` in isolated headless context.
- Native pinned Harness `dsh web --no-open` Host launched and became ready.
- The ephemeral observer process had `stdin` connected to `/dev/null`. Its external controller attempted to send follow-up browser commands through that closed input and could not continue.
- No Session, Agent task, Provider, Tool, Online Correction RPC or Finding was evaluated. `CLEANUP_PASS`: browser/Host processes stopped; two empty exclusive temp roots removed; no unrelated files mutated.

The failure is in **the test harness control transport**. It is not evidence of a missing browser, a Risk Advisor issue or a failed RPC.

Pinned constraints: Harness `ddefc45fbc7f8e46dd73185e68295696d1297887`; accepted Product inputs `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`; installed Client SHA-256 `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`.

## Execution contract correction

Prepare a **single self-contained ephemeral Node/Playwright script** outside tracked sources, executed as one awaited foreground command. It must contain the complete finite-state sequence **before the first browser/Host launch**, not wait for subsequent input commands.

- One Node main function invokes `chromium.launch({ channel: 'chrome', headless: true })`, creates a fresh nonpersistent context, binds passive request/response listeners, starts the official native pinned Harness Web Host with `--no-open`, consumes the normal tokenized startup handoff **in memory**, then performs all real UI actions using Playwright APIs such as `page.goto`, `getByRole`, `click`, `fill`, `waitForResponse`.
- **No `process.stdin` reads**, readline prompt, interactive CLI, REPL commands, feed-to-STDIN protocol, detached-browser command shell, remote-debugging proxy or new RPC/auth client.
- Keep a finite timeout/cancel boundary for each UI step and full run. Never record raw token URLs, cookies, headers, full user Session payloads, or browser history. In-process sanitized observer state may retain transient opaque Session IDs long enough to prove correlation.
- Host process's standard input can remain `ignore`; the browser controller is *in the runner's own code*, not streamed into the Host or observer over stdin. Handle Host stdout startup URL strictly in memory; redact it from any failure log.
- Strict `try/finally` cleanup of only exactly owned task fixture roots, one browser, one Host process and its listener. No cleanup of historical V2 fixtures or unrelated files.

### Static preflight gate before any launch

Confirm the prepared ephemeral script's complete sequence, no stdin dependencies, normal Playwright package resolution, exact installed Chrome channel, sanitized error collector, selected Session matching logic, owned temp paths, bounded timers and guaranteed cleanup. Perform syntax/static inspection without launching browser or Host. If the scripted control flow is incomplete, stop **before** startup; never use another startup to debug interaction wiring.

Do **not** create an extra Harness runtime or test fake. This is only a real Web UI automation script and passive network observer; no manual or custom Online Correction RPC.

### Once-only native functional run

1. Launch Chrome **once** and a real pinned Harness Host **at most once**; stop without another attempt on failure. The existing in-app Computer Use surface did not expose passive RPC evidence in the prior report, so do not oscillate between control mechanisms.
2. In the ordinary Web UI, create/select normal Session A; execute one low-impact Agent task restricted to an exclusive test-owned fixture root. Observe the live Risk Advisor read/Findings contemporaneously.
3. Create/select Session B and execute another low-impact Agent task in its own fixture root. Prove A→B→A via native sidebar Session `role=treeitem[aria-selected]` state (localized `会话` or `Sessions`) plus **new** normal Client Online Correction request/response Session IDs. Exclude stale in-flight polling. No history-dependent requirement for preexisting Sessions.
4. If A→B→A is not proven, stop with unscorable status. If proven, permit up to two more natural F1/F2 opportunity tasks, maximum **4 native Agent tasks / 40 Tool executions total**. Do not manufacture repeated failures, verification mismatches, or empty `VIEW` true negatives.
5. Independently record Agent outcome, supported Tool/postcondition ground truth, attributed Risk Advisor Finding plus explanation/advice, public path and time. If no independently scorable positive occurs, report insufficient coverage, not a perfect detection rate.

## Security and cleanup

Never traverse, stat, glob, or request permissions for Desktop, Documents, Downloads, iCloud Drive, broad Home/Library/OS temporary tree or unrelated projects. Exact permitted paths are the Product/Harness checkouts as needed, actual Chrome/Playwright installation metadata, narrow Web installed plugin metadata, and freshly owned OS-temp task roots. No Full Disk Access or retry after macOS permission denial.

Use the user's existing Chrome only in an isolated nonpersistent Playwright context, **not** the user's daily Chrome profile or omnibox. No Chromium download, Playwright/MCP install, profile modification, credential handling or network actions outside normal user-approved Harness Agent tools.

After quiescence and contemporaneous Finding capture, remove only new exclusive task outputs and verify absence. Preserve V2 49 files, historical Sessions, installed Risk Advisor and rollback archives, `lib/`, `node_modules/`, and `.vitest-cache/`. Cleanup must independently state `CLEANUP_PASS`, `CLEANUP_PARTIAL`, or `CLEANUP_BLOCKED`.

## Reporting and stop states

Publish one docs-only execution report; capture exactly which preflight/run stage passed and actual number of launches, Sessions, Tools, Findings and cleaned files. If an environment/control failure happens, sanitize the **original** error and stop without retries. Use one result:

- `RISK_ADVISOR_PHASE13_3_NATIVE_FUNCTIONAL_EVIDENCE_READY_FOR_REVIEW`
- `RISK_ADVISOR_PHASE13_3_NATIVE_POSITIVE_COVERAGE_INSUFFICIENT`
- `RISK_ADVISOR_PHASE13_3_NATIVE_SESSION_CORRELATION_UNPROVEN`
- `RISK_ADVISOR_PHASE13_3_SELF_CONTAINED_RUNNER_PREFLIGHT_BLOCKED`
- `RISK_ADVISOR_PHASE13_3_NATIVE_SCOPE_OR_CLEANUP_BLOCKED`

No Product changes, broad test suites, Phase 13.4 or automatic Phase 13.3 acceptance.
