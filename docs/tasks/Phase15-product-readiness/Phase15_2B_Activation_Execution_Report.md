# Risk Advisor Phase 15.2B — Existing Web Profile Activation Execution

**Result:** `RISK_ADVISOR_PHASE15_2B_BLOCKED`

**User-specified starting main:** `7130db774d639f4045cc85114fae1b8dbd5b7ea6`

**Accepted executable source baseline:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`

**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`
**Target Profile:** existing `web` at `~/.dsh/profiles/web`

## Outcome

Execution stopped at **B3 — direct-main build**, before running the build or pack scripts. The attempt to query the installed compiler through `pnpm exec tsc --version` caused pnpm 11.7.0 to run its dependency-directory status check. It returned `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` because continuing would require removing the existing `node_modules/` directory without an interactive confirmation. The protected dependencies were not removed. No confirmation-bypass setting, direct install, reinstall, alternative build invocation, or retry was attempted.

Without a successful official build and pack, there is no newly source-identified tarball to install. B4 and B5 were therefore not run. The existing Profile was not changed, and no Host or Browser was started.

## B0 — identity and boundaries: PASS, with baseline note

- Before report creation, local `main`, `origin/main`, and remote `main` matched the user-specified `7130db774d639f4045cc85114fae1b8dbd5b7ea6`.
- The instruction file names `c469f5b16ac2284056dafdd13f3c8d79fcdaa3ed` as its starting SHA. That commit is the parent of the user-specified baseline; `7130db7` adds only the independent Phase 15.2A review and this Phase 15.2B execution instruction. The explicit baseline supplied in the current user request was used.
- The accepted Phase 14 executable is an ancestor of current main. All tracked changes since it are documentation-only. Tracked Risk Advisor and Harness files are clean. Existing untracked `.vitest-cache/`, `lib/`, `node_modules/`, and the Harness checkout's pre-existing untracked path were preserved.
- Pinned Harness HEAD is `ddefc45fbc7f8e46dd73185e68295696d1297887`; its tracked tree is clean.
- The existing repository `lib/` contained 185 regular files (2,673,048 bytes), no symlinks, and no matching open-file process. The package manifest points its Host and Client exports at `lib/index.js` and `lib/client.js`; the selected Web Profile package resolves to its own package directory, not this repository path.
- Existing build toolchain observed: Node `v24.21.0`, pnpm `11.7.0`. No `packageManager` field pins pnpm in the repository manifest.

## B1 — target Profile and process safety: PASS

- The target is `~/.dsh/profiles/web`, a non-symlink directory owned by UID `501`/GID `20`.
- Saved metadata selects `@dhandil/dsh-risk-advisor` after `@deepseek-ai/dsh-base` and `@deepseek-ai/dsh-web-app`. Its declared entry is `risk-advisor`; no matching Profile or DSH-home disable override was found. This reflects saved selection/default enablement, not active runtime registration.
- No matching Harness/Profile/Risk Advisor process or TCP listener was found. General Chrome processes existed but had no inspected file-path association with this Profile; no Browser data or Session content was read.
- The current Profile's manifest, locks, workspace state, plugin patch, installed package tree, and referenced old tarball were freshly rehashed before backup. The original tarball remains unchanged.

## B2 — backup and rollback readiness: PASS

A private targeted backup was created and verified at:
`~/.dsh/backups/risk-advisor/phase15-2b-web-20261011T052436Z/`

- Backup manifest SHA-256: `8ae9d01c441ed5ca6adf9d19b53668bfe5e8f1d3f3f65826b377a77c7826bae4`.
- It contains the complete pre-build repository `lib/` tree, the selected Profile's package/lock/workspace/plugin-patch and pnpm bookkeeping files, and only the installed Risk Advisor package tree. It does not copy the whole Profile, other plugins, Sessions, or Browser data.
- The backup root is mode `0700`, owned by UID `501`; its device matches the Profile and repository. All copied file hashes, modes, and the package tree were verified against the originals. The repository `lib/` tree still matches its pre-build backup; no restore was required.
- The old Profile artifact remains at its original path with SHA-256 `4dd3c86d62ca106be670c7c6c73215d6c00b31cd1618473318ac293cd1f8cf35`.
- Recovery remains available by staging the verified original `lib/` or installed package tree on the same filesystem, swapping directories with same-filesystem renames, and atomically restoring the saved Profile metadata. Keep the backup and any quarantined candidate until all original hashes are verified. No rollback was exercised because no build or Profile mutation occurred.

## B3 — direct-main build: BLOCKED

The repository's official build script is `tsc -p tsconfig.json && tsdown`. The attempted `pnpm exec tsc --version` did not reach the compiler and instead triggered pnpm's automatic install/status behavior. pnpm reported that it would remove the existing modules directory, then aborted because no interactive terminal was available. The modules directory remains present and was verified after the abort. To protect it, no environment variable or configuration was used to bypass pnpm's guard.

The accepted Phase 14.6 production Client SHA is `52b467dd445b73435b55a8c3dd71aa18a40acce8bbd0616587199350c5c97fe3`. No new Client bundle was built, so no comparison or build provenance can be established. The previously installed Client remains `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`; the existing untracked repository Client output remains `b46a80be7e110abe7538447c7f039461230facefca097ec2f4ef679c440adf93`. Their differences do not establish a new accepted artifact.

## B4–B6 — install, activation, report

| Gate | Result |
|---|---|
| B4 — install only the verified local artifact | **NOT RUN** — B3 produced no verified artifact. |
| B5 — normal Host/Client activation-only verification | **NOT RUN** — no Host or Browser was started. |
| B6 — bounded report and review | PASS — this sanitized blocked execution report is the only tracked change in this task. |

The saved Profile package manifest, lockfiles, workspace metadata, patch, installed package, and original artifact were rechecked after the pnpm abort and match the verified backup. The existing repository `lib/`, `node_modules/`, and `.vitest-cache/` remain present; tracked product, test, package, lock, Harness, and Profile files were not changed. No tests, Canonical Full, Agent, Tool, Provider, approval, package install, build, pack, Browser, Host, cleanup, or process teardown was performed.

**Review boundary:** This is a blocked execution record, not an activation claim. Resume only after the build toolchain can run the frozen official build/pack scripts without deleting or reinstalling the protected dependencies, followed by a fresh B0–B2 check. No alternative tool invocation or dependency repair is authorized by this report.
