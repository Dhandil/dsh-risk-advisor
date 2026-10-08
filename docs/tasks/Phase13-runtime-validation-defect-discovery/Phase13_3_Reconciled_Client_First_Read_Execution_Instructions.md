# Phase 13.3 — Reconciled Client Native First-Read Verification Instructions

Sync main, read:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Reconciled_Web_Client_Native_First_Read_Architecture_Review.md`

Preconditions: previous docs-only report `b5a547f75a9930b1a32332c3ee5f2d0532928790` verified on remote; installed Web profile Risk Advisor `lib/client.js` SHA-256 must remain `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`, pinned Harness SHA `ddefc45fbc7f8e46dd73185e68295696d1297887`.

Perform exactly one minimal native Web first-read proof:

- Start real pinned Harness `pnpm dsh --profile web --no-open` (no Chrome auto-open).
- Use already available Playwright/Chromium with a fresh ephemeral profile/context. Direct `page.goto` using the native startup URL consumed only **in memory**, never the Chrome omnibox/search UI.
- Validate URL origin is loopback and keep it out of logs, trace, report and screenshots. No custom token/cookie/Host authentication.
- Open an existing ordinary Session through normal Web UI; observe whether the installed Risk Advisor Client emits `risk-advisor/online-correction`.
- Record sanitized presence and `VIEW` / `NOT_FOUND` / `UNAVAILABLE` classification. `VIEW` empty is acceptable for first-read proof.
- Close ephemeral browser and the exact test Host process. If safe browser navigation or suitable executable is unavailable, stop instead of trying Chrome again.

**Do not run Agent tasks, provider, Tools, readiness, test suites, builds or package operations.** No Product/validation/Harness/profile edits, secret or cookie access, user browser history cleanup, F1/F2 scoring, or Phase13.4.

Commit a bounded docs-only first-read report with one frozen outcome from the architecture review. Do not self-accept Phase 13.3.
