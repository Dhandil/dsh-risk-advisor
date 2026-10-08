# Risk Advisor Phase 13.3 — Real Harness Observational Execution Report

## Outcome

`RISK_ADVISOR_PHASE13_3_UNEXPECTED_OPERATION_STOPPED`

The campaign stopped before task 1 because a local Harness access token was included in a browser search request. The Harness process was then stopped. No Agent task or campaign Session was submitted, and no provider request or Tool execution occurred.

## Baseline and preserved history

- Synchronized `origin/main` and campaign branch baseline: `3e4fa0536f8822f09c3a6ad72a5974661de3ad09`.
- Prior blocker report commit `11c9023e7abc0cab333247911e646bfcbf770458` was pushed unchanged to `codex/phase13-3-harness-native-campaign`; its remote ref was verified at the same SHA. Its parent is `53de5157c9d1ce37f1d5054e7927ee0cb1ff8770`, and its only changed path is the prior docs-only execution report. That branch remains separate; its history was not merged into this campaign branch.
- Pinned Harness checkout: `ddefc45fbc7f8e46dd73185e68295696d1297887`. The tracked tree remained clean after the standard repository build.
- The normal Web profile's installed bundle list includes Risk Advisor (`@dhandil/dsh-risk-advisor` `0.1.0-r1`). No profile, provider, model, reasoning, or permission setting was changed.

## Frozen campaign preparation

- Run id: `phase13-real-harness-observational-v1`.
- Manifest: **20** tasks, five families × four tasks, per-task ceilings of 6 provider turns / 12 Tool executions and campaign ceilings of 120 / 240.
- Manifest SHA-256: `f15ba967cbb268e479689ef883d8d72f9aa2aaf6e4c9e9bc38ce47cde35780cb`.
- Canonical re-serialization replay: **BYTE_IDENTICAL**.
- Synthetic fixtures and task workspaces were prepared under a dedicated temporary campaign root. No real-project files or user data were used.

## Runtime and stop event

The first source-based CLI launch failed before Web startup because the pinned checkout lacked generated `dsh-app-boot` output. The standard pinned Harness build (`pnpm run build`) completed successfully without tracked source or configuration changes. A subsequent launch of the built official CLI started the normal Web profile and printed a local access URL containing an ephemeral token.

When opening the local Web page, the Chrome address bar was not focused. The URL text was entered into the new-tab page and Chrome converted it into a Google Search URL containing that local token. The browser state showed the Google Search URL; whether Google processed or retained the query cannot be established from available evidence. The token value and raw URL are intentionally omitted here and from all campaign artifacts.

The Harness Web process was stopped immediately with SIGINT. A follow-up listener check found no service on port 3080, so the token no longer grants access to that stopped instance. No browser-history cleanup was attempted. This is an execution handling incident, not a Risk Advisor finding.

## Observations and scoring

- Campaign tasks submitted: **0 / 20**; campaign Sessions: **0**.
- Provider requests/turns: **0 / 0**; Tool executions: **0**.
- Agent completion, failures, retries, and strategy changes: **not observed**.
- Risk Advisor explanations, false positives, false negatives, and useful-warning opportunities: **not evaluated**.
- F1/F2: no Tool execution rows existed to score; no Product FP/FN or acceptance conclusion is claimed.
- Full `pnpm test`: **not run**. Phase 13.4: **not started**.

No task was retried, no Product/validation/Harness source or configuration was changed, and the campaign was not resumed after the stop condition.
