# Risk Advisor Phase 15.2B — Existing Web Profile Activation-Only Execution Instructions

**Decision:** `RISK_ADVISOR_PHASE15_2B_DIRECT_MAIN_BUILD_AND_WEB_ACTIVATION_AUTHORIZED`  
**Architecture/acceptance owner:** ChatGPT  
**Execution owner:** zcode  
**Starting main (must match before execution):** `c469f5b16ac2284056dafdd13f3c8d79fcdaa3ed`  
**Product executable source baseline:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`  
**Pinned Harness (read-only):** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Target Profile:** `/Users/tongxin/.dsh/profiles/web`

## 1. Explicit authorization and exclusions

The user chose the **existing** `web` Profile and approved the previously presented Phase 15.2B activation-only sequence, **with one change**: build and pack from the official repository **directly on `main`** rather than in a copied repository, temporary checkout, branch or worktree.

Authorized conditional operations:
1. Inspect and, after preserving user-owned artifacts where necessary, run the official repository's existing `pnpm run build` and `pnpm pack`; existing untracked `lib/` may be overwritten **only after identity, contents, consumers and the minimum restoration method have been checked and its prior bytes safeguarded**. Existing `node_modules/` and `.vitest-cache/` are protected; do not clean or reinstall them.
2. Create a **private, narrow, hash-verified, restorable** backup of the currently installed Risk Advisor package and its exact `web` Profile control/package-manager files as specified in Phase 15.2A. Do not back up credentials, Sessions, unrelated projects or the full Profile.
3. Install/switch only `@dhandil/dsh-risk-advisor` to the **source-identified, locally packed new artifact** through supported Harness profile plugin-management operations; keep the original tarball untouched. Do not alter other plugin selection/order, model/provider settings, credentials or Harness Core.
4. Start the normal Harness Web Host/Client **only if no unrelated/existing Host must be stopped or disturbed**, verify Host and Client activation/slot/route identity without Agent/Tool execution, and close only resources started by this task. Record rollback readiness; only restore if a failed operation needs it, and only while safe.

This authorization **does not extend** to Agent, Tool, provider, model calls, native approval exercises, synthetic Findings, Phase13.3 R1–R5 or Docker/guest isolation, an infrastructure upgrade, forced git operation, whole-Profile replacement, or any modification to Harness Core.

## 2. Mandatory pre-change gates

**B0 — identity / clean boundaries:** confirm repository `main` and `origin/main` equal the expected SHA and tracked tree is clean. Confirm diff from accepted Phase 14 executable to current main is documentation-only. Confirm pinned Harness SHA and its tracked state, preserving pre-existing untracked paths. Examine exact Risk Advisor `lib/` files, hash them, check whether any other process/package uses them, and preserve original bytes before overwrite. No branch or worktree.

**B1 — fresh target safety:** recheck `web` Profile path/ownership/realpaths, package selection, old tarball and package bundle SHA-256, active processes/listeners, potential HMR/live Session impacts **without reading Session content, credentials, browser data or provider config values**. If the active Profile, process identity, writer ownership or other package consumers are ambiguous, **stop**. An existing user-owned Host must not be stopped/restarted without new authorization.

**B2 — backup & rollback readiness:** prepare the unique private backup described in `Phase15_2A_Read_Only_Preflight_Report.md`: existing manifest/patch, lock and workspace metadata, pnpm virtual-store/link metadata and exact current Risk Advisor package bytes/modes/links. Record original tarball identity and preserve it. Verify backup hashes, target symlink graph and same-filesystem replacement/restoration strategy before installation. A package manager mutation affecting unrelated packages, an unsafe install script, unavailable offline dependency, or a non-atomic/incomplete rollback plan **blocks** installation.

## 3. Build / install / activation

**B3 — direct-main build:** use existing pinned toolchain and official build/pack scripts, directly in the canonical repository; do not run `git clean`, `git reset`, `pnpm install`, lockfile updates or lifecycle scripts outside the explicitly reviewed package build. No new clone/checkout/worktree. Record executable source SHA, build environment, `lib/index.js` / `lib/client.js` / tarball hashes and new artifact path. Do not rely on `0.1.0-r1` or the old untracked `lib/` as accepted identity. Compare Client hash with Phase14.6 accepted `52b467dd445b73435b55a8c3dd71aa18a40acce8bbd0616587199350c5c97fe3`; if different, investigate deterministic source/toolchain cause before any installation and **stop if provenance cannot be established**. Other relevant accepted artifact identities must be established by source/build record, not guessed.

**B4 — install:** only after B0–B3 PASS, use the documented supported plugin manager and the verified local artifact, with registry/provider/unsupported scripts disabled. Compare exact before/after manifest, lockfiles, workspace and package-management metadata; abort/recover on unapproved change. Verify installed tarball, installed Host and Client bytes match newly built hashes, and the selected bundle is enabled. Do not assume same version string makes an update effective.

**B5 — activation-only:** launch the normal `web` Host/Client without running any Agent, Tool, provider or task. Observe real loaded Host route and Client module/slot registration as possible; distinguish actual observations from static import and standalone Chromium tests. A render of an empty dock is not a risk detection result. Collect only bounded, redacted lifecycle/identity evidence; no credentials, raw Session messages, console private data or screenshots exposing personal content. Close only task-owned processes and browser resources.

**B6 — report and review:** record precise package/profile/hash identities, actual registration and observed UI vs not-exercised, B0–B5 gate status, file write set, backup location (path only, no secrets), rollback ability/action if exercised, original Profile selection, cleanup, and **zero Agent/Tool/provider**. Produce one new `docs/tasks/Phase15-product-readiness/Phase15_2B_Activation_Execution_Report.md`. The report shall be safe to publish publicly: do not include credential values, private conversation data, detailed user-home inventory or private logs. Commit and immediately push the report directly to `main` with exact remote SHA verification, even on a blocked/partial execution where a sanitized report is appropriate. Do not edit earlier freezes/reports or product source. Do not make an `ACCEPTED` claim; return `RISK_ADVISOR_PHASE15_2B_ACTIVATION_READY_FOR_ARCHITECTURE_REVIEW` only if the scoped activation gates passed, otherwise `RISK_ADVISOR_PHASE15_2B_BLOCKED` with the precise gate and unchanged/restored state.

## 4. Stop conditions

Stop **before** touching the existing Profile if build provenance, intact backup/restoration, target identity or exclusive ownership cannot be established. Stop on unexpected plugin-manager write set, other plugin resolution changes, scripts requiring new permission, new active Host, mismatch after install, or failure to restore; preserve both states and report honestly. If only the build passes, do not claim activation. No broad cleanup, forced resets, deleted historical backup, or silent user-Profile restart.

**Execution status:** Authorized by the user's explicit approval of **direct `main` build + bounded existing-`web` backup/switch + activation-only verification**; still unexecuted.
