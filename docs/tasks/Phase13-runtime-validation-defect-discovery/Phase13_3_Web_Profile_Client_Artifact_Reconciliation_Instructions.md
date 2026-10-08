# Phase 13.3 — Web Profile Client Artifact Reconciliation Instructions

Use authoritative review:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Stale_Web_Client_Artifact_Architecture_Review.md`

## Preflight

- Sync main.
- Verify report `985ee0a809ffe8122ea249cedf265ab40cb70eb7` and exact installed old client hash `b46a80be7e110abe7538447c7f039461230facefca097ec2f4ef679c440adf93`.
- Require clean accepted Product inputs vs `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df` and pinned Harness `ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Ensure no normal Web Host process is active.
- Record selected Web profile package/lock/selection fingerprints and rollback tarball; do not read secrets.

## Execute only if gated

1. `pnpm run build` and `pnpm pack` for **current accepted Risk Advisor Product**; no source edits.
2. Verify fresh archive has proper `lib/client.js`, normal `./client` export, module identity, and Online Correction/dock code. Record archive/client SHA-256.
3. Install **only this new local archive** into existing `web` profile via pinned native `dsh plugin --profile web add <absolute fresh tarball>`. Same `0.1.0-r1` label is not proof of replacement; ensure spec points to fresh distinct tarball.
4. Verify actual selected/installed `lib/client.js` bytes equal fresh archive and other profile bundle selections unchanged.
5. If replacement cannot be achieved with supported commands or scope drifts, stop with evidence and reversible metadata; no manual `node_modules` copying or blind uninstall.

## Forbidden

- No Chrome/Web/token navigation.
- No Agent/provider/Tool requests.
- No Product, validation, Harness source or model config changes.
- No broad package upgrade, reinstall of unrelated plugins, tests or Phase 13.4.
- No clearing `node_modules/`, `.vitest-cache/`, user Chrome history or credentials.

Commit one **docs-only** delivery report. Return exactly the frozen success or blocked token from the review.

Successful installation is **not** real Client activation verification.
