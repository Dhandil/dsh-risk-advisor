# Phase 15.3E Web Delivery 2 Execution Report

Date: 2026-10-12

Requested baseline: `13bdcb8fe36c07803bb205ce299e82bdb3c01108`

Accepted Repair1 source: `9deb8c049c45cfdecb62dabbe79f5350b505f59f`

Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`

**Result:** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY2_READY_FOR_ARCHITECTURE_REVIEW`
This records deployment evidence for independent review; it is not an acceptance decision.

| Gate | Result | Evidence |
| --- | --- | --- |
| D2-0 — baseline, source, Profile custody | PASS | Requested main matched local `HEAD`, `origin/main`, and `git ls-remote`; tracked tree clean. Profile and prior package identities matched the Freeze. |
| D2-1 — isolated accepted-source rebuild | PASS | One `git archive` snapshot of the exact Repair1 source produced the exact Client, Host, maps, and CSS identities. |
| D2-2 — fresh backup and immutable package | PASS | New private backup verified for the frozen 97-file scope; new package verified and retained at a unique path. A generated pnpm workspace-state metadata file is separately disclosed below. |
| D2-3 — offline Risk Advisor-only install | PASS | Pinned Harness offline plugin manager changed only Risk Advisor package files and package/lock metadata, plus its one operation log. |
| D2-4 — normal Web activation-only | PASS | Task-owned Playwright tab loaded the Web app; live ModuleLoader, four Risk Advisor CSS registrations, and both read-only endpoint status streams were observed. |
| D2-5 — report and publication | PASS | This report is the only tracked change for this delivery. Its commit was pushed to main and verified against `origin/main` and `git ls-remote`. |

## D2-0 — Baseline and existing Profile

The repository origin is `https://github.com/Dhandil/dsh-risk-advisor.git`. At execution time, `HEAD`, `origin/main`, and the remote `main` all matched the explicitly requested baseline `13bdcb8fe36c07803bb205ce299e82bdb3c01108`. The Freeze's `Starting GitHub main` value `6e0fe199b985419e0c5a8d6b940f0287996288f9` is its parent baseline and an ancestor of the requested baseline. The diff from accepted Repair1 `9deb8c049c45cfdecb62dabbe79f5350b505f59f` to requested main contained only the Repair1 report, independent acceptance document, Delivery2 Freeze, and four evidence PNGs; it contained no source, test, package, lock, or build drift.

The pinned Harness checkout was at `ddefc45fbc7f8e46dd73185e68295696d1297887`, with no tracked changes. Its pre-existing untracked entry was preserved. The existing Profile resolved to `~/.dsh/profiles/web`, was owned by the current user, and selected `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, and `@dhandil/dsh-risk-advisor` in that order. Its prior Risk Advisor dependency pointed to the Phase 15.3C immutable tarball. Before deployment, the installed tree had 90 regular files and matched all 90 package members byte-for-byte:

- Existing installed Client SHA-256: `93bbe22052362276079b5d5685679d12b0766987901c2081e7b7c5cb0fab9db4`
- Existing installed Host SHA-256: `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`
- Existing selected package path: `~/.dsh/artifacts/risk-advisor/phase15-3c-web-delivery1-20261011Tn9kv_6ka/dhandil-dsh-risk-advisor-0.1.0-r1.tgz`
- Existing Phase 15.3C package SHA-256: `01a1dec387dde762293874cde6e024af6d57287a27082add349309f3623e37d3`
- Earlier successful backup manifest SHA-256: `8c48413b448a543ab33922c6c476d93f4dcc474fd35dbe2487f5099c9ffa138a`
- Preserved Delivery1 blocked-at-P1 backup manifest SHA-256: `7b12a9418109e99cbebbb5f2e1ab02562f19aecb64532b469c3339d4886471f9`

No listener occupied port 3080, no user-owned process was writing to the Profile, and no Profile files were open when deployment began. No credentials, conversations, or Session data were inspected.

## D2-1 — Isolated Repair1 rebuild

One clean Git archive was created from exact source `9deb8c049c45cfdecb62dabbe79f5350b505f59f` under a task-owned `/private/tmp` root. The relative `../../deepseek-harness` resolved to the pinned Harness checkout. The build used the existing dependency tree by a temporary link, without installing or repairing dependencies. The link target and tool metadata were checked; the dependency target was not written. Toolchain: Node `v24.21.0`, TypeScript `6.0.3`, tsdown `0.22.14`, Rolldown `1.2.12`.

Build environment was `NODE_ENV=production`, `TZ=UTC`, `LC_ALL=C`, `LANG=C`, with task-owned `TMPDIR`; `NODE_OPTIONS` and `SOURCE_DATE_EPOCH` were unset. Direct `tsc -p tsconfig.json` and `tsdown` completed.

| Artifact | Bytes | SHA-256 | Result |
| --- | ---: | --- | --- |
| Client `lib/client.js` | 222,047 | `4a49d7f5e9c57dcc3714a9081a6d0c0af6a89b1f5aabac1e2269c2c3881d2b54` | Exact Freeze match |
| Client map | 344,787 | `0ea55dbc3ac3b77623483bb392ea963107d641dd1e12e99b924083de60e4da33` | Exact Freeze match |
| Host `lib/index.js` | 578,907 | `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd` | Exact Freeze match |
| Host map | 1,086,249 | `076c6a3a194271626757f29731ed566aa3afc2f799f503a55b51e4063c27c4c1` | Exact Freeze match |

The 170 type-map inventory aggregate matched the accepted value `510507464342f992705b9218067db7d238354e6f70be6522d7eea6310d39a109`. All four stable CSS virtual IDs matched Repair1 (`ApprovalHistoricalContext`, `OnlineCorrectionDock`, `RuntimeRiskAwarenessDock`, and `RiskAdvisorCard` under `src/client/**`); the Client bundle retained the expected `@dhandil/dsh-risk-advisor` module-loader registration and the dock/approval-detail entry identifiers. No task build-root absolute path occurred in the generated `lib` files.

## D2-2 — Backup and persistent package

A new, non-overwriting backup was created at `~/.dsh/backups/risk-advisor/phase15-3e-web-delivery2-ngjjpy89/`. Its directory mode is `0700`, manifest mode is `0600`, and final manifest SHA-256 is `0b9d24e6fff88d07a44f57679bee1a8975cbecde5c4a272cba40f65078b3e841`. The manifest and saved bytes verify 90 installed Risk Advisor files plus the seven frozen Profile control files, with file hashes/modes/ownership and nine relevant directory records. The preserved Phase15.3C tarball was rechecked as the supported rollback package.

Rollback prerequisites are a quiescent `web` Profile, unchanged pinned Harness, and a free target port. If restoration is required, use the supported offline plugin manager with the exact preserved old package path above, then verify its package path/integrity, all 90 installed file hashes, prior Client/Host digests, bundle order, and Profile controls. Do not replace the full Profile. The backup contains the exact pre-update Risk Advisor tree and seven frozen controls; the generated workspace-state metadata limitation is recorded below.

The verified build was packed with `npm pack --ignore-scripts --json` into the new persistent directory `~/.dsh/artifacts/risk-advisor/phase15-3e-web-delivery2-7uxom1lz/`. The archive is `dhandil-dsh-risk-advisor-0.1.0-r1.tgz`, 203,161 bytes, SHA-256 `4ed4e14ba98673dc267da6ba6b80c519b32fa553dcc04517dd892caf36d28501`, SRI `sha512-d1YJx0M/QO5zX1AOqnRFxz9u3e0JBT/sIYDhlSZ9VTmRxyW9aSs0lJFQD9ZuH2dWKaML+DDzMP8R2PgNUVaigw==`. The artifact directory mode is `0700`; the retained tarball is read-only (`0400`). It contains 90 unique, safe regular members, no source maps, no path traversal, and no detected credential/private-key material. Packed Client and Host bytes match the exact digests above.

The isolated build used `umask 077`, so regular members in the tar archive carry mode `0600`. The supported package manager installed all files with the existing Profile's owner and `0644` modes; this was verified for every one of the 90 installed files against the pre-update ownership/mode inventory. No installed file mode or owner changed from the previous Profile package.

**Generated workspace-state metadata note:** `node_modules/.pnpm-workspace-state-v1.json` existed before installation and was updated by pnpm. It was not one of the seven frozen backup control files, so its payload is not in the 97-file backup. Its pre-install SHA-256 `07c264b766a83488dcf5379ae563fa89d69a3e4a54e8a355c7d563f7adb40552` and post-install SHA-256 `8f8fdef548a6cdc2577420fe478531a9e073cd9897237da25f00d96dcbc3c2d5` are recorded in the private backup manifest. Only its generated metadata field names/types were inspected; no user data was read. The supported offline manager regenerates this workspace state when restoring the preserved prior package and lock state. The backup does not claim byte-for-byte restoration of that derived state file.

## D2-3 — Offline Risk Advisor-only install

The pinned Harness command was run from the Harness root with offline mode and lifecycle scripts disabled:

```text
npm_config_offline=true node apps/cli/lib/bin.js plugin --profile web add --offline --ignore-scripts <new immutable tarball>
```

Profile `package.json` now selects the exact new tarball path. Both lockfiles contain its exact source path and SHA-512 integrity; `node_modules/.modules.yaml` records the same package location. The bundle order remained unchanged. All 90 installed regular files matched the archive byte-for-byte; installed Client SHA-256 is `4a49d7f5e9c57dcc3714a9081a6d0c0af6a89b1f5aabac1e2269c2c3881d2b54`, and Host SHA-256 is `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`.

The complete non-log Profile inventory changed only these paths:

```text
node_modules/.modules.yaml
node_modules/.pnpm-workspace-state-v1.json
node_modules/.pnpm/lock.yaml
node_modules/@dhandil/dsh-risk-advisor/lib/client.js
node_modules/@dhandil/dsh-risk-advisor/lib/types/client/online-correction-locales.d.ts
node_modules/@dhandil/dsh-risk-advisor/lib/types/host/experience-schema.d.ts
node_modules/@dhandil/dsh-risk-advisor/lib/types/host/guidance-schema.d.ts
node_modules/@dhandil/dsh-risk-advisor/lib/types/host/outcome-schema.d.ts
node_modules/@dhandil/dsh-risk-advisor/lib/types/host/pattern-schema.d.ts
package.json
pnpm-lock.yaml
```

No other plugin package, selected bundle, Profile policy, workspace, Cordis configuration, owner, directory mode, or other Profile file changed. The manager created one operation-scoped log at `.plugin-manager/logs/operation-voy39h/pnpm.log`; its contents were not read and the log was retained.

## D2-4 — Normal Web activation-only

After confirming the port was free, one task-owned pinned-Harness Web Host was started with `node apps/cli/lib/bin.js --profile web --no-open`. The MCP Playwright browser created one new task tab at the local Web origin. An unauthenticated local root probe returned `401`; the browser page then loaded normally with navigation status `200` using its existing browser state. No tokenized URL was supplied or inspected, and no cookies were read.

Metadata-only page evaluation observed a live `window.__ModuleLoader__` with a callable `load`, all four Risk Advisor `data-plugin-css` registrations, and 38 successful `200` responses each for `/api/risk-advisor/online-correction` and `/api/risk-advisor/runtime-risk` during 37.3 seconds (mean interval approximately 1,009 ms). Only route, status, count, and timing metadata were examined. The browser did not expose a direct Client byte hash; live Client identity remains **INDIRECT**, established by the verified package/installed hashes together with module-loader and CSS activation.

The existing Client entry declares `conversation.input.dock` and `conversation.approval.detail`. No synthetic Finding, user Session content, native approval, Agent, Tool, Provider, model request, or Canonical Full was used. The approval-detail view itself was not opened, and no Finding appearance or behavioral accuracy is claimed.

The task-owned tab was closed. The Host process was stopped after verifying its PID/process group ownership; port 3080 is free and no Profile files remain open. The private Host startup log was removed without reading it. The exact task-owned temporary build root was removed after unlinking the two verified symlinks without following them. The persistent package and backup remain in place. Repository `lib/`, `.vitest-cache/`, `node_modules/`, the repository tarball, previous package tarball, previous backups, and Harness files were preserved.

## D2-5 — Publication

Only this Markdown report was committed for Web Delivery2. No source, test, package, lock, fixture, screenshot, or Harness file was added or modified. The report commit SHA and final remote SHA are provided with the execution result; local `main`, `origin/main`, and `git ls-remote` were verified to match after push.
