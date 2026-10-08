# Phase 13.3 — Chromium Launch Diagnostic and Single-Browser Functional Resume Review

Date: 2026-10-08

## Architecture decision

`RISK_ADVISOR_PHASE13_3_CHROMIUM_FIRST_SINGLE_RUN_RESUME_AUTHORIZED`

This review replaces the ineffective **Host-first, generic-browser-error** ordering for the next Phase 13.3 probe. It changes no Risk Advisor Product, Phase 13 validation, pinned Harness or Web profile configuration. Phase 13.3 remains unaccepted.

## Remote evidence

Remotely verified docs-only execution report `0aa6f01353f144cd57dcd72b6514250a24014e81`, based on `995096f14de53731340815916883b4652149ff9d`:

- One native pinned Harness Web Host launched successfully with `--no-open`.
- One Playwright Chromium launch failed **before any page navigation**; actual exception was not retained. The generic runner label `BROWSER_START_OR_NAVIGATION_FAILED` is not a root cause.
- Zero Agent tasks, provider or Tool calls; no Risk Advisor RPC or F1/F2 outcome.
- Two empty exclusive temporary task roots were removed and checked absent; exact Host exited and port cleared; `CLEANUP_PASS`.
- No Product/validation/Harness/profile mutation. Prior V2 evidence/fixtures, `lib/`, `node_modules/`, and `.vitest-cache/` were preserved.
- Previously local report commits `4d50895b1470185d9f84ee6187930fc6d1066e76` and `f40a598858a81cc691e32659ff99e8bcb430419b` are now published unchanged on their existing remote branches, SHA verified.

Earlier verified Phase 13.3 first-read attempts **successfully used preinstalled Playwright 1.61.1 and cached Chromium** to navigate the genuine Web page and observe normal `risk-advisor/online-correction` HTTP 200 / `VIEW` responses. Do not presume reinstall is necessary or that current Product has a Client defect.

Pinned Harness SHA: `ddefc45fbc7f8e46dd73185e68295696d1297887`. Web profile installed Risk Advisor `lib/client.js` SHA-256: `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`. Accepted Product inputs: `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`.

## Root cause observability — before browser start

Use existing local Playwright APIs and examine only their already resolved **exact** Chromium executable path, executable existence/mode and effective launch options, plus process/architecture and relevant nonsecret environment facts. Do not crawl `~`, `~/Library`, `/private/tmp` or other directories; the executable supplied by Playwright may be checked directly.

Prepare one ephemeral observer outside tracked Product/Harness that catches the **original Playwright `chromium.launch()` exception at its source**, recording a sanitized name, code, concise message and nonsecret cause category. Strip command-line tokens, cookies, external URLs, home-directory personal paths and all environment secret values. Avoid overly broad logs; no screenshot, trace, HAR, raw stdout/stderr or `DEBUG` dumps. Preserve meaningful OS error codes such as `ENOENT` or `EACCES` if reported. Distinguish failure of browser process launch vs navigation after browser launch.

Only if this diagnostic observer is prepared and preflight passed, attempt **one single Chromium launch** with the existing cached executable and ordinary Playwright options. Open `about:blank` in the same fresh nonpersistent context to prove readiness. If launch fails, do NOT start the Harness Host; stop with the captured sanitized cause. Do not retry with alternative executables, browser channels, debug flags, sandbox workarounds or installation.

## Normal functional probe, only after browser readiness

Retain the exact successfully launched Chromium instance and context (do not close and reopen), then start at most **one** pinned native Harness Web Host via `pnpm dsh --profile web --no-open`.

Use the **native** startup URL in memory and Playwright direct `page.goto`; do not use Chrome's search/address bar. Restrict browser navigation to the actual loopback origin and normal token-cookie flow, without inventing a custom Host/RPC/auth layer. Never print or persist the token URL, cookies, headers, or raw session content.

Use normal Web UI to create/select Session A and perform one safe low-impact real Agent task in its own exclusive OS-temp root. Create/select Session B and perform a different low-impact task in a separate exclusive root. Then observe selected `role=treeitem[aria-selected]` and new normal Client RPC request/response Session identity as A→B→A, separating in-flight polling from newly retained reads. UI locale labels supported by pinned Harness: `打开侧边栏` / `Open sidebar`, and `会话` / `Sessions`.

If that proof fails, stop; no additional tasks. If it succeeds, up to two additional *natural* F1/F2 opportunities, with cap **4 Agent tasks / 40 Tool calls total**, no false/mocked mismatch, forced retry or historical V2 replay. User's provider/model and permissions remain native. Agent and Risk Advisor independently judged.

For each task, preserve contemporaneous Tool/settlement, public Finding and explanation evidence; an empty `VIEW` is not a scorable F1/F2 negative. If there is no qualifying positive event, record positive coverage insufficient, not 100% success.

## Security and cleanup gates

- No Desktop, Documents, Downloads, iCloud Drive, unrelated projects, personal directories, broad home or temp filesystem scans, macOS permission bypass or File System Full Access request. A denied permission must not be retried or worked around.
- Only existing Product checkout, pinned Harness checkout, exact preexisting Playwright executable, Web profile Risk Advisor package metadata, and newly owned disposable OS-temp roots are within scope; do not view user Session content except via minimum normal UI needed for the task, and do not persist titles/prompts.
- Do not install/update Playwright, Chromium, Browser MCP, package dependencies or plugins; do not change Product, validation, Harness, Web profile, accepted source or user model settings.
- No old V2 fixture/Session workspace deletion. Existing `lib/`, `node_modules/`, `.vitest-cache/`, accepted tarballs, rollback archives, raw Session state and reports remain preserved.
- Only after Agent/Tool quiescence and contemporaneous evidence capture, remove newly and exclusively created disposable task roots; verify absence without unsafe directory recursion/symlink traversal. Clean exact browser and Host process separately. Report `CLEANUP_PASS/PARTIAL/BLOCKED`.

## Single-run upper bounds and outcomes

- **ONE** Chromium process launch attempt, and **at most ONE** Harness Host launch (zero Host launches if browser fails). No separate dedicated retry run.
- Up to **4** native Agent tasks / **40** Tool calls only after browser readiness.
- If Chromium launch fails, report sanitized original error category/name/code and stage; do not collapse into `BROWSER_START_OR_NAVIGATION_FAILED`.
- No Phase 13.4, no Product repair by speculation, no acceptance claim.

One docs-only execution report with exactly one:
- `RISK_ADVISOR_PHASE13_3_NATIVE_FUNCTIONAL_EVIDENCE_READY_FOR_REVIEW`
- `RISK_ADVISOR_PHASE13_3_NATIVE_POSITIVE_COVERAGE_INSUFFICIENT`
- `RISK_ADVISOR_PHASE13_3_NATIVE_SESSION_CORRELATION_UNPROVEN`
- `RISK_ADVISOR_PHASE13_3_CHROMIUM_LAUNCH_CAUSE_CAPTURED_BLOCKED`
- `RISK_ADVISOR_PHASE13_3_NATIVE_SCOPE_OR_CLEANUP_BLOCKED`

A Chromium blocked report is progress only if it preserves actionable sanitized exception evidence; never self-accept Phase 13.3.
