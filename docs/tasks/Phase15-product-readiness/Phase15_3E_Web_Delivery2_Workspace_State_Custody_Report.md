# Phase 15.3E Web Delivery 2 Workspace-State Custody Report

Date: 2026-10-12

Requested baseline: `7d0efb3aa9edf43e2f2f51e73d0b639de32b2a77`

Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`

**Result:** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY2_CUSTODY_BLOCKED`

**Custody conclusion:** `GENERATED_SEMANTIC_ROLLBACK_PLAUSIBLE_EXACT_BYTES_UNAVAILABLE`

This is a read-only custody investigation. It does not assert independent acceptance, execute rollback, or establish byte-exact restoration.

## Gate summary

| Gate | Result | Evidence |
| --- | --- | --- |
| S0 — immutable preflight | PASS | Local `main`, `origin/main`, and `git ls-remote` matched the requested baseline. Canonical origin, tracked-clean state, pinned Harness, Profile identity, installed artifact hashes, selected tarball hash, current workspace-state hash, and absence of an active Profile writer were checked. Existing untracked files were preserved. |
| S1 — existing preimage search | BLOCKED — method-scope deviation; exact preimage not found | The permitted manifests establish that no exact preimage was backed up. During the bounded comparison, a schema-only parse of the older nonmatching payload was also performed, exceeding the manifest-only method. No write, copy, move, restore, or raw-content output was made. |
| S2 — pnpm semantics and current consistency | PASS | Inspected the installed Corepack/pnpm metadata, pinned Harness plugin-management source, pnpm 11.7.0 state reader/writer/consumer, and only the authorized Profile metadata. No package-manager command or mutating script was run. |
| S3 — review-ready disposition | BLOCKED | The custody conclusion is bounded, but strict completion is withheld because S1 exceeded its manifest-only method. The deviation is disclosed below for independent direction. |
| Actual restoration / rollback | NOT EXERCISED | Explicitly outside this investigation's authorization. |

## S0 — Baseline and custody preflight

The repository origin is `https://github.com/Dhandil/dsh-risk-advisor.git`. After the permitted fast-forward, local `HEAD`, `origin/main`, and the remote `main` all resolved to `7d0efb3aa9edf43e2f2f51e73d0b639de32b2a77`. The tracked worktree was clean. Existing untracked `lib/`, `node_modules/`, `.vitest-cache/`, and the pre-existing package archive were left untouched.

The pinned Harness checkout was exactly `ddefc45fbc7f8e46dd73185e68295696d1297887` with zero tracked modifications. The `web` Profile resolved to its expected Profile root. No Profile handles were open and no pnpm/npm writer process was present during inspection.

The selected Repair1 installation still matched the existing Delivery2 evidence:

- Workspace-state file SHA-256: `8f8fdef548a6cdc2577420fe478531a9e073cd9897237da25f00d96dcbc3c2d5`.
- Delivery2 installed Client SHA-256: `4a49d7f5e9c57dcc3714a9081a6d0c0af6a89b1f5aabac1e2269c2c3881d2b54`.
- Delivery2 installed Host SHA-256: `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`.
- Selected immutable Delivery2 tarball SHA-256: `4ed4e14ba98673dc267da6ba6b80c519b32fa553dcc04517dd892caf36d28501`.

These match the prior Delivery2 report and Freeze. No Profile, package, dependency, backup, or application file was changed during this review.

## S1 — Search of the four authorized backup inventories

The target pre-update digest recorded by the Delivery2 Freeze and backup manifest is `07c264b766a83488dcf5379ae563fa89d69a3e4a54e8a355c7d563f7adb40552`.

| Protected backup | Manifest SHA-256 | State-file evidence |
| --- | --- | --- |
| `phase15-2b-web-20261011T052436Z` | `8ae9d01c441ed5ca6adf9d19b53668bfe5e8f1d3f3f65826b377a77c7826bae4` | Contains a regular 900-byte earlier workspace-state file, SHA-256 `8840eaf3ecc87b870ed3efca7d7bde3db34ec950ffa8ab40bf489c917577a872`. It does **not** match the Delivery2 pre-update digest. |
| `phase15-3c-web-delivery1-20261011T102836Z-8ltHHT` | `8c48413b448a543ab33922c6c476d93f4dcc474fd35dbe2487f5099c9ffa138a` | No matching state-file inventory entry or payload. |
| `phase15-3e-web-delivery1-20261011T120937Z-6006491b` | `7b12a9418109e99cbebbb5f2e1ab02562f19aecb64532b469c3339d4886471f9` | No matching state-file inventory entry or payload. |
| `phase15-3e-web-delivery2-ngjjpy89` | `0b9d24e6fff88d07a44f57679bee1a8975cbecde5c4a272cba40f65078b3e841` | Records only the pre-update digest `07c264b7…` and post-update digest `8f8fdef5…`; it does not contain the preimage bytes. |

**Finding:** `PREIMAGE_NOT_RECOVERED`. The earlier 900-byte state file is a different snapshot. No exact pre-update bytes can be recovered from these authorized inventories, and the digest cannot be used to reconstruct them. No copies were restored or created.

**Method-scope deviation:** After reading the four manifests and hashing the specifically inventoried older state-file payload, a bounded JSON schema/field comparison of that nonmatching payload was also performed. The Freeze limited S1 to manifest inventories and digest comparison. This extra read was unnecessary to establish the mismatch and is treated as a blocked gate. The inspection was read-only; no file was copied, moved, written, or restored. A tool response included the Profile-root key from that metadata; it is omitted from this report and was not written to a file.

## S2 — Generated-state semantics and current consistency

### Manager identity and supported invocation path

The pinned Harness root declares `packageManager: pnpm@11.7.0`. The system `pnpm` entry is a Corepack shim; the installed Corepack cache contains pnpm package metadata at version `11.7.0`, and the Profile's `.modules.yaml` also identifies `pnpm@11.7.0`. The inspected pnpm package metadata SHA-256 is `2b20455ee8d69d072df339bf9851edea94ee08a9ea14db9289a7fca0bbb7abb0`; its `dist/pnpm.mjs` SHA-256 is `d3a7f4bde2f32c5acc5f012d1edc24c24ea247c2f6c8823146f8cd69ed70b22f`.

Pinned Harness source shows that `dsh plugin` forwards its arguments to the shared Profile package operation, which runs `pnpm` in the selected Profile. The prior Delivery2 report records the supported offline `dsh plugin --profile web add --offline --ignore-scripts <tarball>` invocation. This investigation did not execute that command.

### pnpm reads and writes the file

In the installed pnpm 11.7.0 bundle:

- `workspace/state/lib/filePath.js` resolves the file as `<workspace>/node_modules/.pnpm-workspace-state-v1.json`.
- `workspace/state/lib/loadWorkspaceState.js` reads and parses it; a missing or syntactically invalid file is treated as absent state.
- `workspace/state/lib/createWorkspaceState.js` derives state from the current project roots/names/versions, effective workspace settings, pnpmfile configuration, filtered-install state, configuration dependencies, and a fresh `lastValidatedTimestamp`.
- `workspace/state/lib/updateWorkspaceState.js` serializes that derived state and writes it through pnpm's atomic file writer.
- The `add`/`installSome` path calls `updateWorkspaceState` after a successful normal installation when not in lockfile-only mode.

Thus this is generated and managed pnpm workspace metadata, not plugin-owned application data. A successful supported offline replacement with the preserved older tarball is expected to run the same `pnpm add` mutation path and regenerate a fresh state for the resulting Profile inputs. This is a source-based prediction only; no rollback or regeneration was attempted.

### Current state versus the selected Repair1 package

The current state file has the pnpm 11.7 workspace-state shape: five present top-level fields (`filteredInstall`, `lastValidatedTimestamp`, `pnpmfiles`, `projects`, `settings`), one workspace project record, an empty pnpmfiles list, and 21 effective-setting entries. The single project record's name/version matches the current Profile manifest; its workspace root corresponds to the current Profile. The stored `nodeLinker` and `autoInstallPeers` values match the Profile's `.modules.yaml` and `pnpm-workspace.yaml`; the stored workspace-pattern count matches the configured package-pattern count.

The state file does **not** store the Risk Advisor package version, tarball path, or integrity as a direct package-selection record. Those are independently consistent in the current metadata: the Profile manifest selects the Delivery2 tarball and bundle; `pnpm-lock.yaml` records the same tarball and expected SHA-512 integrity; `.modules.yaml` identifies pnpm 11.7 and the Risk Advisor package; the installed Client/Host hashes match the selected archive and prior report. Consequently the installed package selection is consistent, and the state is consistent with the current Profile's root/settings, but the workspace-state file alone cannot prove which plugin archive was selected.

### Dependency-verification implications and limits

The pnpm 11.7 consumer uses workspace state when checking dependency status. It compares stored settings and configuration dependencies, the project set/name/version, and relevant manifest/lockfile timestamps; the `optimisticRepeatInstall` path may return early when those checks say the workspace is up to date. The state is therefore not safe to dismiss as an inert cache. A stale or mismatched state can change whether pnpm performs more dependency/lockfile verification or takes its optimized path. The installed source includes mismatch checks, but exact prior bytes and their timestamp/settings are unavailable, so this review does not claim that every possible stale state is harmless.

The pinned Harness plugin-manager source snapshots only `package.json` and `pnpm-lock.yaml` for its failure restoration path. That supports neither an exact restore claim for `.pnpm-workspace-state-v1.json` nor byte-exact restoration of every pnpm-generated file after a failed package operation. The semantic-regeneration prediction applies to a successful supported offline add/rollback path and is not a guarantee about a failed operation.

## S3 — Disposition for independent review

The existing installation and its selected Repair1 artifacts remain intact. No rollback, reinstallation, Profile write, backup change, build, browser, Host, Agent, Tool, Provider, or test was performed. All inspection commands exited; no task-owned persistent process or test page was started.

The reviewed source establishes that pnpm regenerates the workspace-state file and that a successful supported offline package reversal should produce a semantically current state for the resulting Profile. It does **not** recover the exact pre-update bytes or verify rollback behavior in a live Profile. Because S1's method boundary was exceeded, this report is blocked for strict Freeze completion. Independent architecture review should decide whether the bounded evidence can be considered, or whether a further review instruction is needed. Therefore:

- Exact prior-byte restoration: **unavailable from the four authorized backups**.
- Supported semantic regeneration on successful offline package reversal: **plausible by pinned source; not exercised**.
- Future dependency-check side effects: **bounded but real; state is consumed by pnpm's validation/optimization path**.
- Required disposition: independent architecture review must decide whether a bounded exception with this permanent byte-restoration limitation is acceptable, or whether to retain a residual custody risk. Do not describe this as exact rollback readiness.

No independent acceptance is asserted.
