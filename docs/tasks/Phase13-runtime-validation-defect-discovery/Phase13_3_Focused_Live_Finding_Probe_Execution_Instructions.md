# Phase 13.3 — Focused Live Finding Probe Instructions

## Precondition

Push `e6c33f28c67f28501e1b9f7f84859d50d6d373e5` unchanged on its original localization branch. Verify its base and docs-only report diff. **Read its evidence** and check for contradictions with the new architecture review; stop if it provides a grounded blocker not covered by the authorization.

Then sync current main and strictly follow:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_V2_Observability_Gap_Focused_Live_Probe_Architecture_Review.md`

## A — Native existing bridge, no model calls

Inspect actual normal Risk Advisor plugin load and existing `risk-advisor/online-correction` RPC/bridge on an ordinary currently active Session.

Observe `VIEW` / `NOT_FOUND` / `UNAVAILABLE` via native Web/browser surface. Only sanitized values/timestamps; do not dump cookies, tokens, private trace payloads or create a custom API client.

If existing public read is unavailable, stop and localize the missing host/client/dock link. **Do not run tasks.**

## B — At most 4 real tasks, only if A passes

- Normal Harness UI/Agent/ToolRuntime, inherited current model config, normal Risk Advisor plugin.
- 4 low-impact normal tasks (2 supported successful ops, 1 natural retry/recovery opportunity, 1 natural safe F2 mismatch opportunity).
- Agent chooses Tool sequence. Do not force a Finding, manually call Tools or reimplement Harness.
- During each Session, inspect existing bridge snapshots **before Findings expire/dispose**.
- Independent fact-level F1/F2 truth; separate Agent task outcome from Risk Advisor accuracy.
- Limit 4 tasks / 40 observed Tools. No task reruns or V2 followups.

## Report

Record session-level sanitized bridge status, timings, Findings if any, eligibility facts, F1/F2 scorable/NA, and precise first evidence gap.

Don't treat blank Dock/VIEW empty as proof of 'evaluated no risk'.

No Product/validation/Harness changes, no full tests, no Phase 13.4.

Commit one bounded docs-only report with one frozen outcome from the architecture review.
