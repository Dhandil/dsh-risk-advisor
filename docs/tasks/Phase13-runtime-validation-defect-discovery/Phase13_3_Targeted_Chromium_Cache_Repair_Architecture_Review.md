# Phase 13.3 — Exact Playwright Chromium Cache Repair and Native Probe Resumption

Date: 2026-10-08

## Decision

`RISK_ADVISOR_PHASE13_3_TARGETED_CHROMIUM_CACHE_REPAIR_AUTHORIZED`

The accepted Risk Advisor Product and pinned Harness require no code/config repair. This is a bounded, **environment-only browser binary provision** followed, if provision succeeds, by one native functional probe under the existing four-task cap. Phase 13.3 stays unaccepted.

## Evidence

The remote docs-only report `bc1d3cefba886ed7355a86a81f28dd457367a015` is verified relative to main baseline `d02d63e09ee399bf712d9cfcb69a37d62ea49628`.

- Node `v24.21.0`, macOS arm64.
- Observer identified Playwright `1.61.1`.
- Its `chromium.executablePath()` selected `chromium-1228` under macOS `~/Library/Caches/ms-playwright`, but `stat` of that exact executable threw `ENOENT`, errno -2.
- Therefore the browser could not start; no `chromium.launch`, Host, Session, Provider, Tool, RPC or task fixture. `CLEANUP_PASS`.
- Prior successful Playwright observations used a cached browser in the same machine; do not assume it is the same revision, package resolution or runner installation.

Baseline constraints: pinned Harness SHA `ddefc45fbc7f8e46dd73185e68295696d1297887`; accepted Product input SHA `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`; installed Risk Advisor Client SHA-256 `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`.

## Official supported remediation

Playwright's official browser guide says each Playwright version requires matching browser binaries. The supported local CLI command is `playwright install chromium`; `--no-remove` retains other versions' browser caches.

**Preflight before download**:

1. Identify the **exact Node Playwright package resolution used by the real ephemeral observer**, its version, `chromium.executablePath()`, and any already present `PLAYWRIGHT_BROWSERS_PATH`. Do not do broad filesystem discovery.
2. In the same package-resolution environment/working directory, verify `pnpm exec playwright --version` is exactly `1.61.1` and matches the observer's resolved package, not merely the version label. The intended cache path must match; if not, stop and report `PLAYWRIGHT_CLI_RUNTIME_MISMATCH` rather than install blindly.
3. Check absence of the exact expected browser file, without searching other directories or reading user files.

**One authorized install**:

```bash
pnpm exec playwright install chromium --no-remove
```

- Run only if preflight proves the local CLI/runtime match.
- Allow normal outbound requests needed for Playwright's official browser archive and writes to **only its expected browser-cache family** `~/Library/Caches/ms-playwright`.
- No `pnpm install`, `npx` implicit dependency install, `npm -g`, `install-deps`, `--with-deps`, `--force`, random `executablePath`, Chrome channel fallback, symlinks, manual copying, permission bypass or deletion of other cached revisions.
- If network, certificate/proxy or filesystem permissions prevent installation, stop without bypass and report the exact sanitized blocker.
- Verify newly resolved cached executable exists and is executable; do not mark this complete solely because CLI exit was 0.

The retained Chromium cache is **an explicitly authorized environment dependency**, not an uncleaned task output. Record it separately in the report; never delete unrelated previous caches.

## Functional resumption in the same execution

If browser cache repair passes, reuse the already frozen Phase 13.3 native functional path:

1. Prepare an ephemeral Playwright observer using that exact package and a new nonpersistent browser context. Capture sanitized original launch errors.
2. Launch **at most one** Chromium and prove `about:blank`; if failed, no Host.
3. Keep the same browser; start **at most one** pinned Harness Web Host `--no-open` and navigate its real launch URL directly in Playwright memory (no user's Chrome profile/omnibox; never print tokens/cookies/headers).
4. In real Web UI create Session A and B, run two low-impact tasks into **two separately owned fresh OS temporary fixture roots**, and prove selected row `aria-selected` + normal Online Correction RPC A→B→A correlation. Preserve only sanitized equality/observational facts, not Session IDs or private content.
5. If the correlation is proven, allow at most two further natural F1/F2 opportunity tasks, with **4 tasks / 40 Tools overall cap**, independent Tool-grounded truth and observed Client Findings. Do not manufacture retries, mismatches or assume empty `VIEW` is a true negative.
6. If any gate fails, stop without Host/browser retry, preserve sanitized evidence, then cleanup.

## Security, filesystem and cleanup

- Allowed: task-needed Risk Advisor checkout and pinned Harness checkout, narrow installed Risk Advisor package metadata, exact Playwright package and its expected `~/Library/Caches/ms-playwright` cache, and uniquely owned OS-temp task roots.
- Forbidden: traversal/access/prompt for `~/Desktop`, `~/Documents`, `~/Downloads`, iCloud Drive, any other personal/user project directories, broad `~/Library` or all-of-`/private/tmp` searches.
- Do not ask for Full Disk Access, retry macOS permission denials or handle secrets.
- No Product, validation, Harness tracked/config, Web profile selection, plugin package or model settings changes; no full suites, no Phase13.4.
- Historical V2 49 files remain protected with zero proven safe delete candidates; no historical cleanup in this step.
- After native observations and quiescence, delete only this run's exact exclusively owned task-output roots; verify absence and record `CLEANUP_PASS/PARTIAL/BLOCKED`. Stop only the exact spawned Host/browser, verify listener/process cleanup. Preserve installed Playwright browser cache and source checkout's `lib/`, `node_modules/`, `.vitest-cache/`.

## Frozen outcomes

Submit one docs-only execution report with browser provision provenance, cache executable check, number of browser/Host starts and live functional observations. Return one primary status:

- `RISK_ADVISOR_PHASE13_3_NATIVE_FUNCTIONAL_EVIDENCE_READY_FOR_REVIEW`
- `RISK_ADVISOR_PHASE13_3_NATIVE_POSITIVE_COVERAGE_INSUFFICIENT`
- `RISK_ADVISOR_PHASE13_3_NATIVE_SESSION_CORRELATION_UNPROVEN`
- `RISK_ADVISOR_PHASE13_3_CHROMIUM_CACHE_REPAIR_BLOCKED`
- `RISK_ADVISOR_PHASE13_3_NATIVE_SCOPE_OR_CLEANUP_BLOCKED`

The environment remedy does **not** by itself accept Phase 13.3.
