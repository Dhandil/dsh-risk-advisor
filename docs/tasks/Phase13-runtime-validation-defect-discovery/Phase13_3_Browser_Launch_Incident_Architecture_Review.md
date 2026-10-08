# Phase 13.3 — Real Harness Launch URL Incident: Architecture Review

## Disposition

`RISK_ADVISOR_PHASE13_3_BROWSER_LAUNCH_INCIDENT_REVIEWED`

This is a **pre-campaign browser-navigation/handling incident**, not a Risk Advisor Product defect, an F1/F2 result, or evidence of an Agent Tool operation.

Reported local docs-only report: `59c1e9b1fb626d9276d98d0bcf7bd047a5996185`. It has not been pushed, so this review is based on the executor's stated incident and the pinned Harness authentication design, **not independent verification of that local report**.

Reported: 20-task manifest frozen/replayed, SHA-256 `f15ba967cbb268e479689ef883d8d72f9aa2aaf6e4c9e9bc38ce47cde35780cb`. Local Harness launch URL with temporary access token was mistakenly submitted as a Google search query. The executor stopped the local Harness; port 3080 had no listener. No campaign Session, provider request or Tool execution occurred. No campaign grading evidence exists. Persistence of the Google query is unknown; browser history was left unchanged.

## Pinned Harness authentication facts

Based on the pinned `deepseek-ai/deepseek-harness` source-owned, implemented architecture note at commit `ddefc45fbc7f8e46dd73185e68295696d1297887`:

`.agents/notes/implemented/architecture/2026-08-24-browser-token-authentication.md`

- The Web Host generates a random launch token for each **Host process**, and does not persist this launch token.
- The normal `dsh-web-app` startup **prints and opens** a root URL carrying that launch token.
- Only `GET /?token=...` consumes the process token and exchanges it for a Host-scoped browser cookie; the browser then redirects to a token-free URL.
- An old process launch token cannot authenticate a new Host process after restart.
- The signed browser-session cookie and its persistent signing secret are separate credentials; an ordinary process restart does **not** automatically revoke an existing cookie.
- The report does not establish disclosure of a browser cookie, signing secret, provider credential or other durable credential.

Stopping the Host contains the immediate applicability of that process's launch token. External search handling/storage cannot be inferred or reversed from this fact.

## Classification and risk

`BROWSER_LAUNCH_URL_EXPOSED_TO_EXTERNAL_SEARCH`

Treat the process token itself as possibly disclosed, without asserting Google's retention policy or that any subsequent misuse occurred.

Do not conflate it with provider API keys or the durable browser cookie. Do not instruct deletion of `$DSH_HOME/.credentials.yaml` or general credential rotation without additional evidence. In the pinned Harness implementation, such deletion would have distinct user-session consequences.

Chrome history and search-account activity remain user-controlled. No automatic clearing or account access is authorized by this review.

## Campaign authority

The user expressly wants real-environment **Risk Advisor functional** testing. Harness is the existing host/runtime, not the test target.

- Preserve the initial, stopped observational run as historical evidence; do not resume it.
- Do not introduce new Harness implementation, provider readiness, model resolution, or OS-sandbox preconditions.
- For the next run, use **only the native Harness CLI/Web startup opening path** for the tokenized entry URL. Avoid validation-owned URL builders/clipboard/query-field navigation and do not log token-bearing URLs.
- Never submit a token-bearing URL as a search query.
- If the native launch cannot open the intended loopback Web interface without disclosing the URL to an unrelated service, stop at navigation preflight; do not invent a substitute browser/auth flow.
- Once ordinary Harness is open, conduct low-impact real tasks and evaluate only Risk Advisor observations, Findings, explanation and improvement opportunities.
- Normal Harness confirmations remain authoritative; do not bypass them.

## Next identity and evidence

Next: `phase13-real-harness-observational-v2` (fresh 20-task campaign).

First push the existing local incident report **unchanged** and verify its docs-only diff against main. The report remains an incident record; do not rewrite it to match this later architecture assessment.

After the stopped report provenance is verified, follow the companion execution instructions. No previous run is accepted by this review.
