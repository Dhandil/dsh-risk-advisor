# Phase 15.3C Web Delivery 1 Execution Report

**Result:** `RISK_ADVISOR_PHASE15_3C_WEB_DELIVERY1_READY_FOR_ARCHITECTURE_REVIEW`
**Authorized Git baseline:** `214a058aa6556bfa4051ba23e407d4679333a9e2`
**Accepted implementation:** `9f96db5981818cd2d6958b38ff6036efd659259b`
**Independent architecture acceptance:** `79929a453f1373918bdda7a960f825830c5222a7`
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

This report records the bounded packaging, Risk Advisor-only Web Profile update, and normal Web activation check. It is an execution report awaiting independent architecture review, not a new acceptance or deployment claim.

## D0 — Preflight and accepted artifact identity: PASS

The repository remote was `https://github.com/Dhandil/dsh-risk-advisor.git`. Local `main`, `origin/main`, and GitHub `main` were verified at `214a058aa6556bfa4051ba23e407d4679333a9e2`; the only synchronization was a fast-forward from `79929a453f1373918bdda7a960f825830c5222a7`. Tracked source, tests, validation, package metadata and lockfiles match the accepted candidate; the diff from accepted executable/fixture `9f96db5` to the synchronized main contains only documentation.

The pinned Harness checkout was `ddefc45fbc7f8e46dd73185e68295696d1297887`. No Harness files were changed. Its existing untracked nested `deepseek-harness` path was left untouched. In the Risk Advisor checkout the pre-existing untracked `.vitest-cache/`, `lib/`, `node_modules/`, and root `dhandil-dsh-risk-advisor-0.1.0-r1.tgz` were preserved. No build, test, dependency install or lockfile operation was run in the Risk Advisor repository.

Accepted build outputs before packaging were verified:

- Host `lib/index.js`: `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`
- Client `lib/client.js`: `93bbe22052362276079b5d5685679d12b0766987901c2081e7b7c5cb0fab9db4`

The existing Web Profile at `~/.dsh/profiles/web` was canonical, user-owned and selected the same three bundles in the same order: `@deepseek-ai/dsh-base`, `@deepseek-ai/dsh-web-app`, `@dhandil/dsh-risk-advisor`. Before the update, Risk Advisor was `0.1.0-r1`, selected from the repository-root tarball whose SHA-256 was `cae4cbbd7c82f8d4feb651eb75708745918705a17db46733c12a77967befafb5`; installed Host and Client hashes were respectively `9525d46c…edcfd` and `06b790cf…4e735`. The old tarball remained in place throughout.

No Host was listening on port 3080 before the update. The user's existing Chrome process was present and was not closed or manipulated.

## D1 — Fresh private backup and rollback: PASS

Before changing the Profile, a new backup was created at:

`~/.dsh/backups/risk-advisor/phase15-3c-web-delivery1-20261011T102836Z-8ltHHT/`

Its root mode is `0700`, manifest mode `0600`, and manifest SHA-256 is `8c48413b448a543ab33922c6c476d93f4dcc474fd35dbe2487f5099c9ffa138a`. The manifest covers 97 files and 7 directories: the complete existing Risk Advisor installation tree, Profile `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `cordis.yml`, `cordis.patch.yml`, `node_modules/.pnpm/lock.yaml`, and `node_modules/.modules.yaml`. Source and backup bytes, SHA-256 values, modes and owners were verified; no symlinks were present in the backed-up scope. The backup excludes sessions, prompts, provider credentials and conversation data.

Rollback is available through the same pinned Harness plugin manager, using the still-preserved original tarball path with `npm_config_offline=true`, `--offline`, and `--ignore-scripts`. Recovery verification must confirm the old Profile dependency/lock integrity, old tarball SHA-256, old installed Host/Client hashes, and unchanged bundle selection. The backup manifest and files remain available if metadata restoration is needed. No rollback was required.

## D2 — Independent immutable package: PASS

The accepted package was packed offline with scripts disabled using the already installed npm (`11.19.0`) and Node (`v24.21.0`). The package has no `prepack`, `prepare`, `postpack`, `prepublishOnly`, `install`, or `postinstall` hook. No dependency installation or repair ran.

Persistent artifact directory (the local account-name segment is elided in this published report):

`~/.dsh/artifacts/risk-advisor/phase15-3c-web-delivery1-20261011Tn9kv_6ka/`

Archive: `dhandil-dsh-risk-advisor-0.1.0-r1.tgz`
Archive SHA-256: `01a1dec387dde762293874cde6e024af6d57287a27082add349309f3623e37d3`
Package integrity: `sha512-iO7Fyho6RHJECdzgLeTYN61KiZ5sO/GQHOq1YwF26bV6d3IOIaPU+3PkGASeq0zrIbD7DOAJokw==`
Archive size: 202,851 bytes; inventory: 90 members, matching the earlier accepted package smoke count.

All member paths were checked for traversal/absolute paths. Packaged `lib/index.js` and `lib/client.js` hashes exactly match D0. The archive is private and persistent outside the repository; the temporary npm cache was removed after packaging. The old repository-root tarball SHA remained unchanged.

## D3 — Risk Advisor-only Profile update: PASS

Immediately before the update, the Profile backup manifest, installed old Risk Advisor hashes, old tarball SHA, accepted bundles, new archive SHA, Harness SHA and free Host port were rechecked. The pinned Harness command completed offline:

```sh
npm_config_offline=true node apps/cli/lib/bin.js plugin --profile web add --offline --ignore-scripts <new immutable tarball>
```

The package manager reported `Packages: +1`. It retained package version `0.1.0-r1`; version equality was not used as success evidence. The Profile now points to the new immutable artifact, and its lock/integrity and virtual-store records identify the new tarball and SHA-512 integrity. All 90 installed package files byte-match the new archive.

Observed Profile write set, relative to `~/.dsh/profiles/web`:

- `package.json`: only the Risk Advisor `file:` source changed.
- `pnpm-lock.yaml` and `node_modules/.pnpm/lock.yaml`: only the Risk Advisor source path and archive integrity changed; package version and dependency snapshot remained the same.
- `node_modules/.modules.yaml`: the Risk Advisor hoisted-location key changed to the new source path.
- `node_modules/@dhandil/dsh-risk-advisor/**`: replaced with the 90 files from the new archive.
- One new `.plugin-manager/logs/<operation-id>/pnpm.log` was created by the supported plugin manager; its contents were not read.

The `pnpm-workspace.yaml`, `cordis.yml`, and `cordis.patch.yml` hashes are unchanged. The Profile bundle list and order are unchanged; its dependency key remains only `@dhandil/dsh-risk-advisor`. No other plugin selection or version was changed. No mode or owner changes were detected in the backed-up scope.

After installation, the new installed Host SHA-256 is `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd` and Client SHA-256 is `93bbe22052362276079b5d5685679d12b0766987901c2081e7b7c5cb0fab9db4`. The old root tarball remains at its prior location with SHA-256 `cae4cbbd7c82f8d4feb651eb75708745918705a17db46733c12a77967befafb5`.

## D4 — Normal Web activation-only check: PASS

With port 3080 confirmed free, one task-owned pinned-Harness Web Host was started using `node apps/cli/lib/bin.js --profile web --no-open`. A newly created Playwright tab (index 1) navigated to the loopback Web origin using the Host's normal local startup flow. The token-bearing URL was kept out of this report and removed with the temporary log. No transcript or message body, credentials, prompts, request bodies or response bodies were read; only plugin/module and endpoint route/status metadata were inspected.

The page exposed `window.__ModuleLoader__.load` as callable. Four styles registered under the installed Risk Advisor namespace:

- `RuntimeRiskAwarenessDock.module.css`
- `RiskAdvisorCard.module.css`
- `OnlineCorrectionDock.module.css`
- `ApprovalHistoricalContext.module.css`

The package's existing Client entry declares `conversation.input.dock` and `conversation.approval.detail`; the browser-side plugin CSS registrations and normal API responses provide activation evidence. No synthetic Finding or approval was created. The browser did not expose a direct loaded Client byte hash, so **runtime Client-byte identity is `INDIRECT`**: the exact installed tarball and installed Client SHA were independently verified, and the normal Web page registered the package's Risk Advisor styles. No hash was inferred from CSS.

During the bounded observation, browser Resource Timing showed 77 responses with HTTP 200 for `/api/risk-advisor/online-correction` and 77 responses with HTTP 200 for `/api/risk-advisor/runtime-risk`. Only route and status metadata were observed; request and response bodies were not read. This confirms endpoint reachability, not risk-detection correctness or user-session behavior.

The task-owned browser tab was closed without closing or switching the other tab. The task-owned Host process group was stopped and port 3080 was verified clear. Its private startup log, which contained the local startup URL, and all task-owned scratch/cache paths were removed. The existing Chrome process and tabs were left running.

No Agent, Tool execution, Provider/model call, Native Approval action, synthetic Finding, or Canonical Full was run.

## D5 — Report and provenance: PASS

This report is the only file added by the delivery task to Git. No product, test, package, Harness, Profile, backup, or artifact file is committed. After report push, verify GitHub `main == origin/main == local HEAD`; the only delta from authorized baseline `214a058aa6556bfa4051ba23e407d4679333a9e2` must be this documentation report. The package artifact and Profile backup remain private local assets outside Git.
