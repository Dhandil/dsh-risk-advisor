# Risk Advisor Phase 13.3 — Live Functional Probe After First-Read Partial

## Decision

`RISK_ADVISOR_PHASE13_3_LIVE_FUNCTIONAL_PROBE_AUTHORIZED`

Phase 13.3 is not accepted. The next gate is a **small real-Harness Risk Advisor functional observation**, not another standalone browser readiness campaign.

## Verified provenance

- Remote report: `1f06f7084f26048ab0c2af20639ff7a5d9e10981` on `codex/phase13-3-reconciled-client-first-read`, one docs-only addition relative to `ea9d07d1443ffe82a66836550c2fa84fee258d7a`.
- Reconciled Web profile Client bundle SHA-256: `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`.
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Normal installed Client emitted a real `risk-advisor/online-correction` POST, with HTTP 200, a `VIEW` read, zero retained Findings, and a matching request/response Session ID.
- The run's final status is **PARTIAL** because an ephemeral observer's promise was wired to a readiness rejection callback and a clicked row's selected-state marker was not confirmed. This does not negate the observed transport response; nor does it establish a fully verified active Session.
- No Product code issue, F1/F2 accuracy, or per-Tool negative classification has been established from the first-read run.

## Scope correction

**Harness is the operating host; Risk Advisor is the system under test.**

The previous V2 real campaign executed 20 independent Sessions, 129 Tool calls, but historical public traces did not preserve scorable transient F1/F2 Findings. The stale installed Client artifact responsible for the original missing read has since been reconciled.

Do not repeat the 20 tasks. Do not create another Harness/Agent/provider/Tool runtime, provider readiness subsystem, or separate 'first-read-only' run.

## Phase A — Observer correction inside a single live probe

Before actual tasks, inspect the local temporary browser-observation script read-only, locate the wait callback bug, and correct **only ephemeral observer code** so a successful response resolves the matching waiter without being overwritten by a timeout.

The observer is not part of Product, validation/phase13, pinned Harness, or the committed report. No source or configuration changes to those trees are authorized. The observer must use only the normal Web UI and passive observations of its normal traffic. No custom RPC calls or auth client.

Use real pinned `dsh --profile web --no-open` and already available ephemeral Playwright/Chromium. Consume only its native startup URL in memory, with direct `page.goto`, and restrict navigation to the Host loopback origin. Do not use the normal Chrome profile or omnibox.

Do not retain, print, or commit token URLs, raw headers, cookies, response bodies, private session titles, raw prompts or private file paths.

Prove the currently open Session identity from the normal page/session binding and match it to normal Online Correction request/response Session IDs. A vague clicked-row visual marker is not sufficient; prefer the page's supported active-Session selection/state as evidence and record only pseudonymous identity equality.

If the normal UI/session association or public read cannot be established, stop **without submitting a new Agent task** and report the first missing step. Do not add an API.

## Phase B — At most four real Harness tasks

Only if Phase A succeeds, perform **up to four** new real, ordinary Agent tasks, each in a distinct normal Session. No repeated task or historical V2 Session follow-up.

- A quiet-state supported write/edit task in a designated low-impact working directory.
- A quiet-state supported mkdir/copy task.
- A natural local failure/recovery task providing an opportunity for F1; no forced exact retry.
- A small, safe task with an opportunity to verify a supported postcondition; a mismatch is not guaranteed and must not be manufactured by fake Tool results.

The Agent naturally chooses Tools, order, retries and strategy. User's current provider/model/reasoning and native permissions/approvals remain authoritative. No intentional secret access, remote operations, production changes, destructive personal-file actions or Harness configuration changes.

Observe native Tool event facts, Risk Advisor read outcomes, Findings and ordinary UI rendering while each Session is active and before transient Finding TTL expires. The plugin's existing read path and normal browser traffic remain the only Client measurement surface. Avoid any additional background polling client.

Campaign bounds: at most 4 tasks / 40 observed Tool executions; no task rerun, no extra readiness/model requests, no Judge/Deep Judge activated by validation. If actual operation is unexpected or high-impact, stop that task through normal supported UI.

## Independent grade

Separate three dimensions:

1. **Agent task outcome**: complete, incomplete, blocked, unexpected activity.
2. **Product public path**: existing Online Correction read triggered/received, live Session identity matching, Finding/empty/unavailable and UI visibility.
3. **Risk Advisor correctness**: independently scorable, frozen F1 contiguous exact-retry or F2 supported verified postcondition-mismatch conditions, observed Product Finding and explanation/suggestion quality.

A zero-Finding `VIEW` means **no retained Finding at that observation time**, not proof of evaluation or a true negative. Safe Agent recovery is not automatically Risk Advisor success.

If no real positive event occurs, record `POSITIVE_COVERAGE_INSUFFICIENT`; do not calculate perfect recall. If Tool/verification facts are insufficient, report `UNSCORABLE`; never manufacture truth from Product output.

Product FP/FN requires independent event-level truth, timely observed Product evidence and frozen-contract attribution. User-facing advisory quality may receive separate qualitative notes; out-of-scope improvement opportunities do not change F1/F2 score.

## Boundary and outcomes

No Product/validation/Harness source/config modification, no profile package replacement, no broad tests, no Phase 13.4.

Commit a bounded docs-only live functional probe report with exactly one outcome:

- `RISK_ADVISOR_PHASE13_3_LIVE_FUNCTIONAL_EVIDENCE_READY_FOR_REVIEW` — native active-Session public reads and independent scorable Product facts available;
- `RISK_ADVISOR_PHASE13_3_LIVE_FUNCTIONAL_COVERAGE_INSUFFICIENT` — public path works but no independently scorable positive occurred;
- `RISK_ADVISOR_PHASE13_3_LIVE_FUNCTIONAL_OBSERVABILITY_BLOCKED` — active-Session read cannot be observed;
- `RISK_ADVISOR_PHASE13_3_LIVE_FUNCTIONAL_PRODUCT_DEFECT_CANDIDATE` — observed Product behavior contradicts independently established contract, pending review.

Do not self-declare Phase 13.3 acceptance.
