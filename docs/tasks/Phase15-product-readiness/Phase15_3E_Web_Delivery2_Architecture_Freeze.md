# Risk Advisor Phase 15.3E — Web Delivery 2 Architecture Freeze

**Decision:** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY2_AUTHORIZED`  
**Design and independent review authority:** ChatGPT  
**Executor:** **Codex**  
**User approval:** Explicitly authorized resumption of the Phase15.3E Web deployment after accepted Repair1, 2026-10-12.  
**Starting GitHub main:** `6e0fe199b985419e0c5a8d6b940f0287996288f9`  
**Accepted Repair1 source/build candidate:** `9deb8c049c45cfdecb62dabbe79f5350b505f59f`  
**Review:** `docs/tasks/Phase15-product-readiness/Phase15_3E_Repro_Repair1_Independent_Architecture_Acceptance.md`  
**Pinned Harness, read-only:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Profile target:** only existing user `~/.dsh/profiles/web` `@dhandil/dsh-risk-advisor`

## 1. Exact delivery goal and non-goals

This is **Web Delivery 2**, not an amendment or rerun of **BLOCKED** `Phase15_3E_Web_Delivery1` and **not** a new implementation. Promote the independently accepted reproducible Repair1 Client, which includes the previously approved F1/F2 fixed-message locale UI and fixed CSS virtual-module IDs. Preserve other selected plugins, genuine user data, prior packages, builds and backups; update only the Risk Advisor package using supported pinned-Harness **offline plugin management**. Verify installation and perform normal Web **activation-only**, not an actual Agent/Tool or synthetic Finding inside the real Profile.

**Required newly accepted artifact digest:**

- Client `lib/client.js` SHA-256: **`4a49d7f5e9c57dcc3714a9081a6d0c0af6a89b1f5aabac1e2269c2c3881d2b54`**, size **222,047 bytes**.
- Host `lib/index.js` SHA-256: **`9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`**.
- Client `lib/client.js.map` SHA-256 (not an npm pack member): `0ea55dbc3ac3b77623483bb392ea963107d641dd1e12e99b924083de60e4da33`; Host map `076c6a3a194271626757f29731ed566aa3f2f799f503a55b51e4063c27c4c1`.
- The earlier accepted pre-Repair Client `7d3939ab...` and prior blocked recompile `7df903bc...` are **historical only; neither is the Delivery2 gate**.

**Expected pre-upgrade selected Profile (Phase15.3C):**

- Installed Client: `93bbe22052362276079b5d5685679d12b0766987901c2081e7b7c5cb0fab9db4`; installed Host: `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`.
- Source tarball (private, immutable, still referenced): `~/.dsh/artifacts/risk-advisor/phase15-3c-web-delivery1-20261011Tn9kv_6ka/dhandil-dsh-risk-advisor-0.1.0-r1.tgz`, SHA-256 `01a1dec387dde762293874cde6e024af6d57287a27082add349309f3623e37d3`.
- Original repository-root tarball `dhandil-dsh-risk-advisor-0.1.0-r1.tgz` SHA-256 `cae4cbbd7c82f8d4feb651eb75708745918705a17db46733c12a77967befafb5`, also preserved.
- Existing Phase15.3C successful-delivery backup at `~/.dsh/backups/risk-advisor/phase15-3c-web-delivery1-20261011T102836Z-8ltHHT/`, manifest `8c48413b448a543ab33922c6c476d93f4dcc474fd35dbe2487f5099c9ffa138a`.
- **Also preserve** the Phase15.3E Delivery1 blocked-at-P1 backup `~/.dsh/backups/risk-advisor/phase15-3e-web-delivery1-20261011T120937Z-6006491b/`, manifest SHA-256 `7b12a9418109e99cbebbb5f2e1ab02562f19aecb64532b469c3339d4886471f9`. It is not evidence of any installed Phase15.3E package.

The package semantic version remains `@dhandil/dsh-risk-advisor@0.1.0-r1`; **version equality is never acceptable identity proof**. New absolute tarball path, SHA-256/SRI and installed Host/Client bytes determine promotion.

## 2. D2-0 — Strict preflight, exact source and live Profile custody

Verify canonical `origin` `Dhandil/dsh-risk-advisor`, `git ls-remote origin refs/heads/main ==` frozen starting SHA, tracked-clean local `main`; if behind, only after ancestry/clean checks use `git fetch origin main` followed by `git merge --ff-only origin/main`. Require `HEAD == origin/main == ls-remote`. Never branch/worktree/reset/clean/rebase/force or write unrelated user files. Confirm diff from `9deb8c049c45cfdecb62dabbe79f5350b505f59f` to current main is documentation/evidence **only**; no new tracked executable/build/lock drift.

Inspect installed `web` Profile realpath/ownership/modes, bundle order (base, web-app, Risk Advisor), Risk Advisor package `file:` path/integrity, installed tree and Host/Client hashes, old tarball digest, prior backup manifest. Compare exact state expected above. Keep `~/.dsh` credentials, conversations, session data and other profiles out of scope. Confirm no currently running **user-owned** normal Harness Host/listener on the target port (3080), no plugin manager/installer, no user-owned concurrent writes to Profile. Never stop a pre-existing Host/tab/process; if current Profile is not quiescent, STOP safely. Inspect package lifecycle scripts, installed Node/tsc/tsdown binaries and dependency links without triggering `pnpm exec` or changes to protected `node_modules/`.

Existing repository untracked `lib/` still holds Phase15.3C build, not new Repair1 Client. Its hash and protected `.vitest-cache/`, `node_modules/`, root tarball, previous immutable tarballs, old backups and Harness files must remain unchanged. No package deployment may occur on a drifted Profile.

## 3. D2-1 — Provenance-locked isolated rebuild from **Repair1**, not old source

Create exactly one bounded task-owned clean Git archive of **`9deb8c049c45cfdecb62dabbe79f5350b505f59f`**, in a safe layout whose TypeScript `../../deepseek-harness` resolves to the verified pinned Harness. Attach only verified **read-only dependency targets** without reinstall/repair or writing to symlink targets. Run direct existing `tsc -p tsconfig.json` then `tsdown` with the same accepted reproducibility environment (`NODE_ENV=production`, `TZ=UTC`, `LC_ALL=C`, `LANG=C`, safe `TMPDIR`; `NODE_OPTIONS` / `SOURCE_DATE_EPOCH` unset), exact recorded versions and cwd at project root. Inspect build hooks and side effects first.

**Hard stop** unless Client SHA-256 is exactly `4a49d7f5e9c57dcc3714a9081a6d0c0af6a89b1f5aabac1e2269c2c3881d2b54` and length exactly 222,047; Host SHA matches frozen value, bundling/sourcemap/module-loading CSS IDs match accepted Repair1 expectations and no new build-root absolute path leaked into Client. Check map hashes above if present; full maps are not packaged, but source-binding proof is required. Any SHA/build mismatch => `BLOCKED`, **do not package or install**. Never accept the old `lib/`, stale temporary smoke tarball or an alternative newly generated SHA. No second or third build to shop for matching digest.

## 4. D2-2 — Fresh exact-scope backup and new immutable persistent tarball

**Prior to install**, create a *new* private, uniquely named, non-overwriting current-state backup at `~/.dsh/backups/risk-advisor/phase15-3e-web-delivery2-<unique>/`, directory mode `0700`, manifest mode `0600`. Back up precisely the currently installed Risk Advisor tree and package-manager/profile control files that the supported plugin install may change (currently 90 Risk Advisor files + seven metadata files; reconcile exact current-state inventory). Verify byte hashes, directory/mode/owner/symlink semantics, **restore readiness** and old source tarball identity. Do not copy user sessions, logs, credentials, projects, entire Profile. Keep previous successful/blocked backups unchanged. No need to create a backup until D2-1 build passes; if preflight fails, create none. If backup verification fails, STOP before installer.

Pack the verified rebuilt output **only** to a unique private persistent directory under `~/.dsh/artifacts/risk-advisor/phase15-3e-web-delivery2-<unique>/` using already installed `npm pack --ignore-scripts --json --pack-destination <new-directory>` and verified no lifecycle changes. Archive name may be `dhandil-dsh-risk-advisor-0.1.0-r1.tgz` **only within this new directory**. Confirm 90 expected safe tar members, package metadata, absent path traversal, no embedded secrets, new SHA-256 and SHA-512 SRI, packed Client/Host SHA exactly as above. Never overwrite old immutable tarball, reuse old directory, or delete the new one after installation; its absolute path is a durable live dependency of the Profile.

Before install re-verify quiescence, exact pre-update Risk Advisor state and backups, and all package digests. If any concurrent drift is detected, STOP; no broad cleanup or manual overwrite.

## 5. D2-3 — Official pinned-Harness offline Risk Advisor-only install

Use only the previously validated supported command from pinned Harness root:

```text
npm_config_offline=true node apps/cli/lib/bin.js plugin --profile web add --offline --ignore-scripts <absolute_new_immutable_tarball>
```

Do not run an unrestricted `pnpm install`, update another package, modify bundle selection/order, Harness, Cordis patch, workspace or user settings. The package manager may create its known **operation-scoped** `.plugin-manager/logs/<operation-id>/pnpm.log`; treat that as a named permitted tooling side effect, do not read its sensitive contents.

After install verify exact dependency source path and SHA-512 integrity in Profile `package.json`, both lockfiles and modules metadata, **all installed 90 files** against the new archive, exact installed Client SHA `4a49d7f5e9c57dcc3714a9081a6d0c0af6a89b1f5aabac1e2269c2c3881d2b54`, exact Host SHA, other selected bundles byte-identical, other plugins untouched, ownership/modes and workspace/policy unchanged. Capture a path-level before/after Profile write-set; flag **any** unrecognized write (outside the authorized Risk Advisor package, lock/meta changes and the known manager log) as an install integrity failure.

If unexpected partial state: halt further actions, execute **only** the preverified exact old Phase15.3C tarball supported rollback if safely demonstrable. Prove restored old package path/integrity, installed Client/Host hashes, all affected Profile controls. If rollback cannot be safely proven, STOP with `BLOCKED_PARTIAL_STATE`, do not improvise deletion, full-profile restore or removal of other plugins.

## 6. D2-4 — Bounded normal Web activation-only and cleanup

Only if the Profile is correctly updated, on originally free port 3080 start one task-owned normal pinned-Harness Web Host: `node apps/cli/lib/bin.js --profile web --no-open` from Harness root. Open one task-owned isolated browser tab/context; do not switch, close or manipulate user's normal Chrome tabs. Observe **metadata only**: normal Web loading, module-loader registered, four Risk Advisor CSS modules, legitimate `conversation.input.dock` / approval-detail Client entry as supported, safe endpoint route/status reachability for `/api/risk-advisor/online-correction` and `/api/risk-advisor/runtime-risk`. Client runtime byte identity may remain `INDIRECT`: packaged/installed hash plus live module/CSS/endpoint activation, not a direct browser byte hash; say so.

No real Agent/Tool/Provider/model, synthetic Finding injected into user's real `web` Profile, native approval/Allow/Reject, user session or Canonical Full. Do not read request/response bodies, real prompts, session contents, browser cookies or tokenized URL. The tested Phase15.3E Repair1 Chrome fixture previously verified Chinese F1/F2 layout, so module loading in real Web does **not** prove a Finding appeared. Repeated HTTP-200 polling at 1000ms is expected; report timing and counts only, no unsupported accuracy or performance claim. If user Host appears/changes during task, STOP without interrupting it and label activation `NOT_EXERCISED`.

Stop only task-owned Host/browser/server, release tasks' resources, verify no owned port 3080 listener **if port was free before**. Clean only explicitly checked task-created ephemeral folders. **Do not clean** repository `lib/`, `node_modules/`, `.vitest-cache/`, Profile files, old or **new persistent** artifact directory, any backup, manager operation log or user Chrome resources. Any possible token-bearing temporary startup log belongs to task and must be handled privately, not reported verbatim.

## 7. D2-5 — Report and final boundaries

Add one new sanitized Markdown report only:
`docs/tasks/Phase15-product-readiness/Phase15_3E_Web_Delivery2_Execution_Report.md`.

Report gates D2-0 through D2-5 individually PASS/BLOCKED/NOT_EXERCISED, first blocker if any, source and bundle SHA identities, rebuilt source and toolchain, new tarball absolute private `~/.dsh/` path (without external account identifier), SHA-256/SRI/inventory, fresh backup path and manifest SHA + restore prerequisites, exact old/new package path, installed file match, Profile before/after changed paths, manager log exception, normal Host/Client route/style observations including INDIRECT runtime hash caveat, cleanup, no-run categories and any partial state. Preserve the old blocked delivery report intact.

Commit/push **only this report** to `main`; no source/test/build/fixture/Host/Harness/package lock changes, no screenshot/archive/backup in Git. Verify `main == origin/main == git ls-remote` and exact docs-only delta from this authorization. No force push. Even if a gate is blocked, document and stop in safe state.

**Success (not acceptance):** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY2_READY_FOR_ARCHITECTURE_REVIEW`  
**Failure:** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY2_BLOCKED` with `BLOCKED_PARTIAL_STATE` if required.

Independent architecture review must separately accept the deployment; this authorization covers **only Risk Advisor delivery** of exact accepted Repair1 binary and normal Web activation, not ongoing agent-risk performance or user satisfaction.
