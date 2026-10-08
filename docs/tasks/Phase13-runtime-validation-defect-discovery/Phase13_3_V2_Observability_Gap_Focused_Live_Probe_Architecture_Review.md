# Phase 13.3 — V2 Observability Gap: Architecture Review and Focused Live Probe

## Status

`RISK_ADVISOR_PHASE13_3_FOCUSED_LIVE_FINDING_PROBE_CONDITIONALLY_AUTHORIZED`

This is **not Phase 13.3 acceptance**, not a Product defect declaration, and not permission to rerun the 20-task campaign.

## Evidence provenance

- Accepted Product executable: `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`
- Accepted validation Repair2: `0904afe035232f6d9faab2fd539018b6e1c4263b`
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- V2 report commit: `ac59b834cff446fe5d823a9ea37a9af4ef2bd9e7` — remotely reviewed, one docs-only added report relative to its execution base.
- Read-only localization report commit: `e6c33f28c67f28501e1b9f7f84859d50d6d373e5` — **currently local-only; not independently retrievable**. Must push exact unchanged report and verify before authorizing any new task.

V2 report confirmed 20 normal Harness Sessions, 129 observed Tool calls, 17 terminal responses and three Sessions awaiting clarification (Tasks 05/06/08). Plugin enabled in UI. No remotely scorable Finding trace was captured. F1/F2 TP/FP/FN/TN remain undefined.

## Source-based facts

Review of main `0657ab0edb00977147cf8a7fb0eaa1df41811af6` found that Risk Advisor already implements:

1. `src/index.ts`: Host-side `LiveCorrectionRuntime` and `installOnlineCorrectionBrowserBridge` via normal `connection` + `sessions` injection.
2. `src/host/live-correction.ts`: Finding is process-local, TTL **5 minutes**, deleted on Session disposal, and only created on frozen eligible F1/F2 conditions.
3. `src/host/online-correction-bridge.ts`: read-only, per-Session `risk-advisor/online-correction` view; distinguish `VIEW`, `NOT_FOUND`, `UNAVAILABLE`.
4. `src/client/online-correction-store.ts`: one-second polling while retained.
5. `src/client/OnlineCorrectionDock.tsx`: blank view with zero Findings/reasonCodes displays **no dock** by design.

A historical chat transcript does not retain transient Finding truth. A blank dock is **not** a negative diagnosis or proof of a Product FN.

Additionally the V2 task behavior did not guarantee eligible F1/F2 positives. Safe stopping, strategy changes and filesystem operation failure are not equivalent to contiguous exact retries or verified semantic postcondition mismatches.

## Architectural question

Before any Product change, determine whether the current *existing* public Finding read path works when a real session is open and the UI is polling it.

Three distinct observations are needed:

- **Read availability**: `VIEW` versus `NOT_FOUND` versus `UNAVAILABLE` for the actual live Session identity.
- **Finding visibility**: an actual contemporaneous Finding object, if produced.
- **Independent eligibility**: whether actual Tool events satisfy F1 or F2 based on frozen contract, not inferred from the Finding.

Neither a `VIEW` with empty `findings` nor an absent dock proves that the plugin evaluated a specific execution. No supported public 'evaluated with no Finding' event is presently established.

## Phase A: no Agent/provider task

After remote provenance verification, inspect only normal currently available Harness Web UI and existing RPC behavior through native authenticated browser session. The current 20 historical Sessions must not be replayed, resumed or prompted.

Check whether the normal active Session view invokes the plugin's already-implemented RPC/bridge, using existing browser developer tools/network observation if available.

Do not construct/tokenize a browser URL or call a provider. Do not create a custom RPC client or expose cookies/credentials. Capture **only sanitized status and timing**, not complete HTTP bodies or Authorization/Cookie headers.

If the normal read path is absent/unavailable, identify the first missing Host/client/plugin registration step with source evidence, report and **stop before new Agent tasks**.

If present, move to Phase B.

## Phase B: bounded real Harness live probe

At most **four** new, non-destructive normal Harness tasks; no new readiness/proxy/runner and no full campaign.

Use distinct normal Sessions. Preserve user-configured model, provider and reasoning; use ordinary `dsh web` or actual native product entry, real ToolRuntime and Risk Advisor plugin. No scripted Tool calls or instruction to intentionally repeat failures.

Task intent:

1. ordinary supported write/edit success (quiet-state observation);
2. ordinary supported mkdir/copy success;
3. natural local failure/recovery opportunity for F1, without forcing exact retry;
4. natural non-destructive postcondition-mismatch opportunity for F2, without patching Tools or replacing Harness.

Keep each target in a designated low-impact real-host test directory. Do not intentionally modify existing personal data, credentials, unrelated projects, remote resources, or system settings.

Observe the already-existing per-Session public bridge **while the task is running and before Session disposal/expiry**, including timed snapshots after Tool settlement, without adding a Product-side logger. The browser/client may poll normally. Capture only sanitized Finding kind/ID, no private paths or credential material.

Cap at four tasks and 40 observed Tool executions; stop via supported normal Harness UI if the next action would exceed this ceiling. No task retries. Stop the affected task on unexpected high-impact actions.

Capture actual Tool operation and outcome for independent scorable truth. If the existing public traces lack required evidence, label it `UNSCORABLE`, never synthesize truth from Product Findings.

## Score interpretation

- A complete `VIEW` empty snapshot establishes only '**no retained Finding at that observation time**', not a true negative.
- `NOT_FOUND` implies the bridge cannot resolve the requested active Session or it was disposed; determine which.
- `UNAVAILABLE` identifies failure of an existing public read path, not absence of risk.
- A positive F1/F2 requires actual frozen-contract trigger facts; expected-negative events also require independent fact-level evidence.
- If no qualifying positive occurs naturally, call positive coverage **insufficient** rather than claim recall=100%.
- Do not count the Agent's correct caution/safe behavior as a Risk Advisor Finding.
- Product FP/FN is established only with independent event-level proof and corresponding current authoritative Finding evidence.

## Decision after targeted proof

Return exactly one:

- `RISK_ADVISOR_PHASE13_3_PUBLIC_FINDING_PATH_VERIFIED_COVERAGE_INSUFFICIENT`
- `RISK_ADVISOR_PHASE13_3_PUBLIC_FINDING_PATH_DEFECT_LOCALIZED`
- `RISK_ADVISOR_PHASE13_3_FOCUSED_LIVE_FINDING_EVIDENCE_READY_FOR_REVIEW`
- `RISK_ADVISOR_PHASE13_3_FOCUSED_LIVE_PROBE_UNSCORABLE`

If proof is inadequate, propose (do not implement) the smallest Risk Advisor-owned public observation extension, such as sanitized evaluation status per Tool execution with a bounded retention policy. Do not create a second Harness observer or infer historical negatives.

## Boundaries

No Product/validation/Harness code or config changes; no 20-task rerun; no full `pnpm test`; no Phase 13.4; no shadow provider/Agent/Tool/runtime; no raw secret capture. The three awaiting-clarification V2 Sessions remain untouched.

Commit one bounded docs-only focused report. Do not self-accept Phase 13.3.
