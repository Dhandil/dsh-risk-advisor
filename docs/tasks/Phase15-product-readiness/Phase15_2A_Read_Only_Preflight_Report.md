# Risk Advisor Phase 15.2A — Existing Web Profile Read-Only Preflight

**Status:** `RISK_ADVISOR_PHASE15_2A_READ_ONLY_PREFLIGHT_READY_FOR_REVIEW`

**Preflight baseline:** `5ae1a290b22dd385ff247e956ff4d228dcc86504`

**Accepted Phase 14 executable:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

## Scope and result

This report records a read-only inspection of the explicitly selected existing `web` Profile. No profile, plugin, dependency, product, Harness, or user configuration was changed. No backup was created. No package was installed, built, packed, or updated. No Harness or Browser was started, stopped, or restarted. No Agent, Tool, Provider, or test was run. No files were cleaned.

The repository was on `main` at the requested baseline before this report. `origin/main` and `git ls-remote` both resolved to that baseline. The accepted executable is an ancestor of the baseline; the intervening tracked changes are documentation only. The pinned Harness checkout resolves to the required SHA. Its status contains a pre-existing untracked `deepseek-harness` path, which was left untouched; there are no tracked Harness modifications.

## Selected Profile, ownership, and runtime

| Item | Read-only finding |
|---|---|
| Profile | `/Users/tongxin/.dsh/profiles/web` |
| Resolution | `DSH_HOME` was unset in the audit environment; Harness home resolution therefore uses `~/.dsh`. The exact `web` directory exists at the path above. |
| Ownership | Profile and inspected files are owned by UID `501`, GID `20`; the profile is a directory, not a symlink. `package.json` mode is `0600`. |
| Current runtime | No `node`/`dsh`/`deepseek` process with an executable/cwd/open-file path matching the pinned Harness checkout, selected Profile manifest/patch, or installed Risk Advisor package was found. |
| Listening port | No TCP listener owned by a process matching those Harness/Profile/Risk Advisor paths was found. No active Host port or process owner could therefore be assigned. |
| Browser | A general Chrome process was present in the machine process inventory, but no inspected metadata tied it to this Profile or to a local Harness listener. It was not opened or touched; its tabs/session state were not read. |

The process check used process identity, executable/cwd/open-file path matches, and TCP listener ownership only. It did not inspect command-line arguments, browser data, Sessions, or conversation content. The absence of a matching local Host process means this preflight does not attest runtime registration or a rendered UI.

## Installed package and repository identity

The selected Profile manifest is `/Users/tongxin/.dsh/profiles/web/package.json` (SHA-256 `02da15ae9d6704c00557e28d9151608bb1e692a12b434f76737890dd9cc45aff`). Relevant current package-manager metadata hashes are:

| Exact path | SHA-256 / state |
|---|---|
| `/Users/tongxin/.dsh/profiles/web/pnpm-lock.yaml` | `bbea57f1b9bd6bc7a2dd6964243ee9dad5030c4ebe475c478095348a434d0420` |
| `/Users/tongxin/.dsh/profiles/web/node_modules/.pnpm/lock.yaml` | `bbea57f1b9bd6bc7a2dd6964243ee9dad5030c4ebe475c478095348a434d0420` |
| `/Users/tongxin/.dsh/profiles/web/pnpm-workspace.yaml` | `ae7c5b68e2f157528e62885804e69e88583897b775e03c86fcbe52feaf498aba` |
| `/Users/tongxin/.dsh/profiles/web/node_modules/.modules.yaml` | `498ba19d071488619872876903560ec82c9446f14b1002d681a6e3495156f77b` |
| `/Users/tongxin/.dsh/profiles/web/node_modules/.pnpm-workspace-state-v1.json` | `8840eaf3ecc87b870ed3efca7d7bde3db34ec950ffa8ab40bf489c917577a872` |
| `/Users/tongxin/.dsh/profiles/web/cordis.patch.yml` | `ef189a8c27db6d63930aa3046a3040482e952eafcb7487c644d508e8d461f027` |
| `/Users/tongxin/.dsh/profiles/web/.plugin-manager/logs/` | Directory exists; contents were not read. |

Only those hashes and the selected Risk Advisor fields were recorded; configuration contents are not included. The manifest selects these bundles in this order:

1. `@deepseek-ai/dsh-base`
2. `@deepseek-ai/dsh-web-app`
3. `@dhandil/dsh-risk-advisor`

Its Risk Advisor dependency is a local tarball reference:
`file:/Users/tongxin/.dsh/artifacts/risk-advisor/phase13-3-web-profile-reconcile-5619b318c21de59c26248c636dfa285ab16b28be/dhandil-dsh-risk-advisor-0.1.0-r1.tgz`.

The package declares Cordis entry ID `risk-advisor`, module name `@dhandil/dsh-risk-advisor`, with no package-level `disabled` value. No matching disable override exists in the selected Profile patch or DSH home patch (the latter is absent). Together with the selected bundle entry, the saved metadata indicates the bundle is selected and enabled by default. This is configuration evidence, not proof that a Host is currently running or that the UI registered.

| Identity | Repository at preflight baseline | Installed in selected Profile |
|---|---|---|
| Package version | `0.1.0-r1` (`package.json` SHA-256 `1facb82bf6dd07c52b3c234ac4b7e27f1c7a43104468d8a8511441d3a83b2a8d`) | `0.1.0-r1` (`package.json` SHA-256 `6effc4c17cea7ff981c98d8d4f88c4796f7506cf5e2cf3aae73a105a999a3e1c`) |
| Host bundle | Existing untracked `lib/index.js`, 375,904 bytes, SHA-256 `bda314f5eec605b416f2e5b10debeb879575dd16c16c8a2699412ce0e3c290e2` | `/Users/tongxin/.dsh/profiles/web/node_modules/@dhandil/dsh-risk-advisor/lib/index.js` (real path is the same), 491,968 bytes, SHA-256 `64c8a854bcc87264882307c2e5204fb1c47da9a1253a2a14a0ba54502f8f9aa3` |
| Client bundle | Existing untracked `lib/client.js`, 72,199 bytes, SHA-256 `b46a80be7e110abe7538447c7f039461230facefca097ec2f4ef679c440adf93` | `/Users/tongxin/.dsh/profiles/web/node_modules/@dhandil/dsh-risk-advisor/lib/client.js` (real path is the same), 92,829 bytes, SHA-256 `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910` |
| Referenced artifact | Not a repository source identity | The referenced tarball exists, is 158,005 bytes, SHA-256 `4dd3c86d62ca106be670c7c6c73215d6c00b31cd1618473318ac293cd1f8cf35`. Its `package.json`, Host, and Client members hash exactly to the installed files above. |

The version string is the same, but the Host and Client bundle bytes differ from the repository's pre-existing untracked `lib/` outputs. Those outputs have no tracked provenance and were not rebuilt. The installed artifact's path identifies it as a Phase 13.3 Web-profile reconciliation tarball; no evidence establishes that its bundles were built from the accepted Phase 14 executable. Therefore **the installed package is not attested as the exact accepted Phase 14 build**. Package version alone cannot close that identity gap. No attempt was made to inspect or reconstruct source from the bundles.

The package directory is a real directory under the Profile's `node_modules` (not a symlink); the inspected installed package files are regular files owned by UID `501`, GID `20`. The source checkout's existing `.vitest-cache/`, `lib/`, and `node_modules/` remain untracked and untouched.

## Configuration boundary and possible change impact

The minimum metadata read was limited to the selected Profile manifest, its plugin enablement metadata, the selected Risk Advisor package manifest/patch, and exact Host/Client/artifact files needed for identity. No credential, Session, or conversation contents were read or included here. Relevant Harness documentation states that `dsh.profile.bundles` controls bundle selection, the Profile `cordis.patch.yml` can override a plugin row's `disabled` flag, and a live Profile with HMR can apply changes to every Session using that Profile.

If a later, separately authorized install or version switch is performed through supported Harness plugin management, the bounded files/paths that may change are:

- `/Users/tongxin/.dsh/profiles/web/package.json` — the Risk Advisor dependency reference and, only if explicitly requested, its position in `dsh.profile.bundles`.
- `/Users/tongxin/.dsh/profiles/web/pnpm-lock.yaml` and `/Users/tongxin/.dsh/profiles/web/node_modules/.pnpm/lock.yaml` — package-manager resolution state.
- `/Users/tongxin/.dsh/profiles/web/pnpm-workspace.yaml` — the Harness plugin-manager documentation says pnpm may record pending dependency build-script approvals here; this file is not restored by the manager's install-failure path. Any build-script approval is outside this preflight and requires separate authorization.
- `/Users/tongxin/.dsh/profiles/web/node_modules/@dhandil/dsh-risk-advisor/`, exact virtual-store/link targets discovered before the authorized operation, and pnpm's bookkeeping files `/Users/tongxin/.dsh/profiles/web/node_modules/.modules.yaml` and `/Users/tongxin/.dsh/profiles/web/node_modules/.pnpm-workspace-state-v1.json`.
- `/Users/tongxin/.dsh/profiles/web/cordis.patch.yml` — only if the operation explicitly changes the plugin-row enablement override; current metadata has no Risk Advisor override.
- `/Users/tongxin/.dsh/profiles/web/.plugin-manager/logs/` — management diagnostics may be added by an install operation. Do not inspect or include logs in a report unless separately authorized.
- The configured pnpm content store may receive cache entries; its path was not queried. Leave it intact.
- A new, separately named package artifact under `/Users/tongxin/.dsh/artifacts/risk-advisor/`; the current tarball must remain intact.

Do not allow package resolution to change other bundle selections, bundle order, provider/model configuration, or unrelated plugin dependencies. If the package manager proposes unrelated resolution changes, or the observed write set exceeds the exact paths above, stop and roll back. Replacing a package in a live Profile can trigger HMR and affect all Sessions sharing that Profile; a restart also interrupts that Profile's Host/Client. No such process is running locally in this preflight, but that must be rechecked before a future mutation.

## Proposed backup and recovery plan — not executed

Before any future mutation, after separate user authorization and a fresh process/ownership check, create a unique, private, task-owned backup directory outside the Profile, for example:
`/Users/tongxin/.dsh/backups/risk-advisor/phase15-2a-web-<UTC timestamp>/`.
If the path already exists, do not overwrite it. Use restrictive directory/file permissions and write a SHA-256 manifest. The backup should contain only:

- Exact copies and hashes of the Profile `package.json`, `pnpm-lock.yaml`, and `cordis.patch.yml`.
- The Profile `pnpm-workspace.yaml`, `node_modules/.pnpm/lock.yaml`, `node_modules/.modules.yaml`, and `node_modules/.pnpm-workspace-state-v1.json`.
- The complete current `node_modules/@dhandil/dsh-risk-advisor/` tree, preserving file bytes, modes, and symlinks without following symlink targets; record the current resolved path and Host/Client hashes.
- The current tarball's path and SHA-256 as a recovery source; retain the tarball in place rather than moving or overwriting it.

Do not back up or copy the whole Profile, credentials, Session data, Browser data, or other plugins. Do not snapshot or prune the shared pnpm content store; package-manager cache additions are not part of Profile selection and should be left alone. Before allowing any operation that can run dependency scripts, inspect the proposed package's script/build requirements without executing them; if the approved write set cannot include a safe treatment of `pnpm-workspace.yaml`, stop before install.

For rollback, first ensure the affected Host is not serving this Profile (and do not interrupt an active Host absent explicit authorization). Stage verified old package bytes on the same filesystem as `node_modules`; atomically swap the Risk Advisor package directory using same-filesystem renames while retaining the changed directory under a unique quarantine name. Restore each saved manifest/lock file via a same-directory temporary file, flush, then atomic rename. Keep the backup and quarantine until hashes, selected bundle order, package dependency, lockfiles, and installed Host/Client hashes all match the pre-change manifest. If any path/hash differs or an atomic rename cannot be guaranteed, stop with the Profile offline and preserve both states for review. Only the separately authorized restart/reload may follow verification; never delete the old artifact or backup during rollback.

## Preconditions for any later installation or switch

This report does not authorize deployment. A future request must separately authorize the exact package/version, selected Profile, target file set, and whether a Host reload/restart is permitted. Before that action:

1. Reconfirm `main`, accepted-executable ancestry, and pinned Harness SHA; do not modify Harness.
2. Produce the accepted-source build identity and exact package tarball, Host bundle, and Client bundle SHA-256 values before profile changes. A matching version string is insufficient.
3. Recheck Profile owner, symlink/real paths, current selections, patch override, process/listener ownership, and active Sessions without reading their contents.
4. Create and verify the targeted backup described above; do not mutate if the owner/runtime state is ambiguous or the backup cannot be restored atomically.
5. Use the supported plugin-management path with the exact authorized artifact. Preserve all unrelated bundle selections/order and stop on any unexpected write or resolution change.
6. Verify the installed package/artifact hashes and saved metadata, then obtain whatever separate user authorization is required before starting/restarting the Web Host or Browser.

## Gate summary

| Gate | Result |
|---|---|
| Requested baseline and accepted executable ancestry | PASS |
| Pinned Harness SHA | PASS; tracked tree unchanged (pre-existing untracked path retained) |
| Exact selected Profile path and ownership | PASS; `web`, UID `501`/GID `20` |
| Current install/selection and plugin enablement metadata | PASS; selected and enabled by saved metadata |
| Exact artifact and installed Host/Client hashes | PASS; artifact member hashes match installed files |
| Installed package attested to accepted Phase 14 executable | **NOT ESTABLISHED**; package version matches, bundle identity does not match repository's untracked outputs, and no accepted-source build artifact was produced |
| Harness runtime process/listening port | None attributable to this Profile observed; runtime registration not checked |
| Credential, Session, and conversation access | Not performed |
| Backup, install, build, Browser, Agent, Tool, Provider, tests, cleanup | Not performed by design |
| Profile, plugin, dependency, product, Harness, or user-config mutation | None |

**Review state:** preflight is ready for review. The profile is installed and selected, but exact accepted-build identity is unresolved. No deployment or version switch has been performed; it requires a separate explicit authorization after the identity and rollback envelope are accepted.
