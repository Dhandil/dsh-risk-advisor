# Phase 13.3 — Locale-Neutral Native Session and Live Functional Probe Instructions

Sync current main and read:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Locale_Neutral_Session_Proof_Architecture_Review.md`

## Preflight — before any Host start

- Confirm installed Risk Advisor `lib/client.js` SHA-256 `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`; pinned Harness `ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Inspect pinned UI source for left sidebar toggle (zh `打开侧边栏`, en `Open sidebar`), Session tree label (zh `会话`, en `Sessions`), and native `treeitem[aria-selected]` contract. Prepare selectors before Web startup. **Do not discover labels by restart loops.**
- Use existing Playwright/Chromium, no MCP install, no new dependency and no change to Product/validation/Harness/profile.
- Restrict filesystem: checkouts only as needed, dedicated disposable test root, and narrowly selected Risk Advisor installed package metadata. **No Desktop, Documents, Downloads, iCloud, recursive home scans or permission prompts.** If access is attempted, stop the offending operation; never bypass macOS denial.

## Execution — ONE Host/browser startup maximum

1. Start pinned normal Harness Web using `--no-open`; ephemeral Chromium, native startup URL direct `page.goto` consumed in memory; no Chrome omnibox/token logging or external navigation.
2. Expand native sidebar only if collapsed. Locate the native Session tree by semantic role and either localized `aria-label`; locate its session rows with `role="treeitem"[aria-selected]`. No dependence on English-only titles.
3. If at least two existing nonblank Sessions are visible, select A→B→A; await mutually exclusive `aria-selected=true` transition and verify normal new Online Correction request IDs follow A→B→A; each native request/response SID matches. Record only pseudonymous equality, never actual IDs/content.
4. If UI-to-RPC active Session binding is not demonstrated, **STOP; no Agent prompt**.
5. If demonstrated, within same Host run execute up to 4 ordinary Agent tasks / 40 Tool calls, native permissions and original model. Observe Tool truth and live Finding/VIEW/UNAVAILABLE contemporaneously. No forced retry or synthetic postcondition mismatch; no rerun of old 20 tasks.
6. Stop high-impact action, extra browser startup or protected folder access. Close only the exact ephemeral browser/Host and confirm cleanup.

## Report

Produce a single docs-only report: exact frozen outcome, active Session proof summary, number of Host/browser startups (must be ≤1), executed tasks/tools, event eligibility and public Finding attribution. Distinguish real Agent behavior, Risk Advisor evaluation evidence and advisory usability. No TP/FN/TN from empty VIEW. No F1/F2 recall without qualifying positives.

No source/config mutation, tests, build, package operations, personal filesystem scans or Phase 13.4.
