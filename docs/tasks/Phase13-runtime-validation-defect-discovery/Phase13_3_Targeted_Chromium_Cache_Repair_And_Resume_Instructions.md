# Phase 13.3 — Exact Chromium Provision and Native Functional Resume Instructions

Sync current main; read:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Targeted_Chromium_Cache_Repair_Architecture_Review.md`

Preflight: accepted Product `b1b605e...`; pinned Harness `ddefc45f...`; installed Risk Advisor Client SHA-256 `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`.

1. Read only the exact observer's installed Playwright package version/resolution, executablePath and cache override; confirm the local `pnpm exec playwright --version` resolves **that same** Playwright 1.61.1 package and expects missing `chromium-1228`. If mismatched, stop and record it; do not install via another CLI.
2. When matched, **once only** run `pnpm exec playwright install chromium --no-remove`. Permit writes only to matching `~/Library/Caches/ms-playwright` browser cache. No other dependency/software installs, force, install-deps, alternative Chrome or privileged permissions.
3. Confirm expected Chromium executable exists and is executable; capture sanitized cause if installation fails.
4. If repaired, **in this same run**, start one fresh ephemeral Playwright Chromium (prove `about:blank`), reuse it for one pinned native Harness Web Host (`--no-open`), and navigate only directly via in-memory launch URL.
5. Through normal UI create and run low-impact Session A/B tasks, then prove UI-selected Session ↔ Online Correction RPC A→B→A. On proof success, up to two more natural F1/F2 opportunity tasks; max **4 tasks / 40 Tool calls**. No synthetic failures or empty-`VIEW` TN.
6. After evidence capture, remove only this run's dedicated OS-temp task folders, verify absence; close browser/Host and confirm cleanup. Retain Playwright browser cache as installed dependency, historical V2 49 files and accepted build/dependency artifacts.

Forbidden: Desktop, Documents, Downloads, iCloud, broad home/Library/temp scans, macOS permission bypass, Product/validation/Harness/profile edits, plugin reinstall, Chrome omnibox, full regression, Phase 13.4.

Commit **one docs-only report** with one frozen primary status and separate `CLEANUP_PASS/PARTIAL/BLOCKED`. Do not self-accept Phase 13.3.
