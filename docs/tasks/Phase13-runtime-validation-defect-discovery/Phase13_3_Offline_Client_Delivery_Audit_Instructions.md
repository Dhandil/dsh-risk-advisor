# Phase 13.3 — Offline Client Delivery Audit Instructions

1. Push the **unchanged** local docs-only localization report commit `e6c1c85e0248e62659b884e5e2e9ee2affa679aa` to the original branch `codex/phase13-3-client-activation-localization`. Verify single report-only diff from baseline `6b78c42156e2e73180e7b338c3104b63d99d9fee`.
2. Sync current main. Read `docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Client_Delivery_And_Browser_Navigation_Architecture_Review.md`.
3. **Do not open Chrome, submit token-bearing URLs, or start Agent/provider/Tool.**
4. Read-only inspect:
   - selected Harness profile/plugin package metadata without any credential contents;
   - installed `@dhandil/dsh-risk-advisor` version and `lib/client.js` identity;
   - expected bundle/exports and actual installed artifact hash;
   - pinned Harness boot graph, module loader, client activation and `conversation.input.dock` owner lifetime;
   - first provable missing/mismatched link from package selection through client activation/slot.
5. Do not confuse 'Plugin enabled' with 'Client apply mounted', or 'no Dock DOM' with 'no registered slot'. Do not infer an RPC/Host Finding defect from missing first request.
6. If the current Harness Host process remains running with a potentially exposed launch token, stop only that process after confirming identity, to retire the process-scoped token; do not clear browser history or mutate credentials automatically.
7. Leave unrelated untracked `node_modules/` and `.vitest-cache/` untouched.
8. Submit a **bounded docs-only** audit report with exact provenance and one frozen outcome from the architecture review.

No Product/validation/Harness edits, no install, build, tests, or Phase13.4. No automatic Client repair; no new real-task campaign.
