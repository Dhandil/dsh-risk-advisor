# Risk Advisor Phase 15.2B — Build Invocation Repair Amendment 1

**Decision:** `RISK_ADVISOR_PHASE15_2B_REPAIR1_BUILD_INVOCATION_AUTHORIZED`  
**Architecture owner:** ChatGPT  
**Execution agent:** zcode  
**Start main:** `a90141ac5399f2ff73a98bc477901634ee98b0ee`  
**Reviewed blocker:** `10f2af590a17be8bf29dd81d670331fa79c9f660`  
**Accepted source ancestor:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`  
**Pinned Harness (read-only):** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Target:** existing `web` Profile; user already authorized existing Phase15.2B activation-only scope.

## Purpose and authority

The failure at `pnpm exec tsc --version` was an attempted pnpm-managed dependency-directory deletion, not a compiler error. Repair only this **invocation path**; do not transform the task into pnpm environment repair, dependency reinstall, Docker work, code change, or test campaign.

This amendment supersedes **only** the part of B3 that implicitly required accessing tools through `pnpm exec` or `pnpm run build`. The checked-in build script remains `tsc -p tsconfig.json && tsdown`. All original Phase15.2B gates, backup/rollback, Profile, safety and execution exclusions remain in force.

## R1 — Read-only local toolchain proof

Before running a build:
1. Verify current `main == origin/main ==` the new amendment commit, and all Git-tracked product/Harness files are clean. Diff from the Phase14 accepted executable to HEAD must still be documentation-only.
2. Inspect the exact local paths, symlink/realpath chains, `package.json` metadata and executable version of `node_modules/.bin/tsc` and `node_modules/.bin/tsdown` **without pnpm exec/run/install** or interactive dependency repair. Check they resolve to the repository's existing TypeScript and tsdown dependency trees rather than an unrelated install or dead temporary link; retain metadata/hash evidence. Do not import or inspect user/private data.
3. Verify existing `lib/`, local protected dependencies, `web` Profile metadata/package and old artifact against the previously recorded hashes. Verify private backup manifest `8ae9d01c441ed5ca6adf9d19b53668bfe5e8f1d3f3f65826b377a77c7826bae4` and its intended restore paths. Recheck Profile-process/listener ownership and no new unrelated Host writer. Reuse the existing B2 backup if still complete; do not create repeated copies just for this retry.

If executables are missing, mismatched, broken, or launch their own pnpm dependency-directory mutation; if any source/backup/Profile state unexpectedly changed: **STOP**. No fallback installation, no noninteractive-force switches, no symlink surgery.

## R2 — Conditional direct-main build

Only after R1 PASS, from the official repository:
- Invoke the two **exact locally resolved** executables in the same order as the official build script: TypeScript `-p tsconfig.json`, then tsdown with the current repository configuration. The proposed form is `./node_modules/.bin/tsc -p tsconfig.json && ./node_modules/.bin/tsdown`, after verifying these exact paths. Do not use `pnpm exec`, `pnpm run`, global TypeScript/tsdown, `npx`, Corepack repair or registry fallback.
- Existing `lib/` may be overwritten only because its previous exact bytes have been backed up and verified. Preserve `node_modules/`, `.vitest-cache/`, lockfile and source. Record every generated tracked/untracked change and all output hashes.
- Record exact source/main SHAs, executable paths and versions, build options, Host/Client SHA-256. Compare with accepted Phase14.6 Client SHA-256 `52b467dd445b73435b55a8c3dd71aa18a40acce8bbd0616587199350c5c97fe3`. Byte differences require bounded investigation and explicit provenance resolution before installation; do not declare success solely because build exits zero.

## R3 — Pack, installed Profile and activation only if previous gates PASS

- Try the original scoped `pnpm pack` **without any flags or prompts that remove/repair dependencies**. If pnpm initiates the same install/status/deletion guard, STOP at packaging; this amendment does NOT approve an alternative pack manager or replacement of the protected `node_modules/`.
- Verify the resulting artifact contents, Host/Client members and SHA-256 match R2; do not reuse an older tarball solely on version `0.1.0-r1`.
- Before touching `web`, freshly recheck process ownership, installed package and Profile file hashes, backup and rollback feasibility. Only use the original authorized supported Risk Advisor plugin-manager update; abort/recover if any other plugin/package or provider/model setting changes. Start only task-owned Host/Browser; zero Agent, Tool, provider, approvals, F1/F2 campaign.
- Distinguish package/registration-level observations from unexercised actual Tool-related UI, never imply F1/F2 recall or a true negative.

## Report / stop

Produce **one new** sanitized `docs/tasks/Phase15-product-readiness/Phase15_2B_Repair1_Execution_Report.md` covering R1–R3, original B0–B6, exact artifacts/backup state and any actual Profile mutation/rollback. Do not rewrite the prior blocker report or frozen instructions. Commit/push the report on `main` and independently verify the remote SHA; no branch/worktree.

- If all activation-only gates pass: `RISK_ADVISOR_PHASE15_2B_REPAIR1_ACTIVATION_READY_FOR_ARCHITECTURE_REVIEW`.
- If any gate blocks: `RISK_ADVISOR_PHASE15_2B_REPAIR1_BLOCKED`, identify the first failing gate and exact unchanged/restored state. The earlier acceptance of B0–B2 does not replace fresh checks.

Do not attempt additional dependency repairs, alternate packaging or retries outside this authorization.
