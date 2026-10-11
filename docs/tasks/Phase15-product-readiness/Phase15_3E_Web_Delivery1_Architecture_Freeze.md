# Risk Advisor Phase 15.3E — Web Delivery 1 Architecture Freeze

**Decision:** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY1_AUTHORIZED`  
**Architecture and independent acceptance:** ChatGPT  
**Executor:** **Codex**  
**Explicit user approval:** upgrade the already installed existing `web` Profile to independently accepted Phase15.3E, 2026-10-11  
**Required starting remote main:** `2674bdb2941e489a0e4976acfe0284a98648feb0`  
**Exact accepted executable:** `1d5addfc1ae1daa360708bcf0e408f058c4a2cd1`  
**Accepted Phase15.3E review:** `docs/tasks/Phase15-product-readiness/Phase15_3E_Independent_Architecture_Acceptance.md`  
**Pinned Harness (read-only):** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Target:** existing `~/.dsh/profiles/web`, Risk Advisor package **only**.

## 1. Scope, exact identities and non-goals

Upgrade the accepted Phase15.3C Profile-installed Risk Advisor package to the Phase15.3E approved bilingual *fixed-advisory display* (zh shows only Chinese F1/F2; en shows only English), with a **new source-identified, immutable, persistent tarball**, a fresh narrow backup of the **current pre-upgrade Profile**, a supported offline plugin-manager update, and activation-only normal Web validation. This authorization does **not** include any feature implementation, source changes, dependency install, Agent/Tool/Provider/model calls, native approval decisions, synthetic Findings inside the real Profile, Canonical Full, Phase13.3 campaign, or actual risk correctness claims.

Pre-update expected selected Risk Advisor: `@dhandil/dsh-risk-advisor@0.1.0-r1`, tarball
`~/.dsh/artifacts/risk-advisor/phase15-3c-web-delivery1-20261011Tn9kv_6ka/dhandil-dsh-risk-advisor-0.1.0-r1.tgz`
SHA-256 `01a1dec387dde762293874cde6e024af6d57287a27082add349309f3623e37d3`.
Current installed Client SHA-256 `93bbe22052362276079b5d5685679d12b0766987901c2081e7b7c5cb0fab9db4`; Host SHA-256 `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`.

Phase15.3E **accepted build** Client SHA-256 `7d3939ab3a6086248a6f351c34ee3e66e5177e857ca6078d347940ffdeb030e3`, Host unchanged SHA-256 `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`. Phase15.3E earlier **temporary smoke** tarball SHA-256 `1177301ae7a69448c61b4b4e5d8b34200e7a193885496f0f3a49d82481f1e46d` is reference only, **not presumed to exist**. Exact packaged Host/Client bytes, not the unchanged version string, identify successful promotion.

**Preserve unconditionally** the Phase15.3C previous installed-package tarball at its absolute persistent path, the older repository-root tarball (SHA-256 `cae4cbbd7c82f8d4feb651eb75708745918705a17db46733c12a77967befafb5`), earlier backup `~/.dsh/backups/risk-advisor/phase15-3c-web-delivery1-20261011T102836Z-8ltHHT/` (manifest SHA-256 `8c48413b448a543ab33922c6c476d93f4dcc474fd35dbe2487f5099c9ffa138a`), previous Phase15.2B backup, current real user data, `node_modules/`, `.vitest-cache/`, and the Risk Advisor repository's old **untracked `lib/`** (which contains the previous Phase15.3C Client hash). Do not overwrite or delete any old persistent tarball or backup.

## 2. P0 — Strict preflight / remote update

Check `origin` canonical `Dhandil/dsh-risk-advisor`, `git ls-remote` main = exact authorized SHA, local tracked clean and current `main` ancestor. If behind, only `git fetch origin main` then `git merge --ff-only origin/main`; no reset/clean/rebase/force/branches/worktrees. Require local `HEAD == origin/main == git ls-remote`. Check exact source tree: delta from accepted executable to current main must be docs/evidence only.

Inspect current `web` Profile ownership, canonical paths, package-manager dependency/link metadata, bundle selection and order, Host/Client installed hashes, source tarball path and SHA and still-valid private previous backup manifest. Ensure no user-owned Host uses port 3080 and no concurrent install or writes; **do not kill or hijack a running user Host**. Validate working `node_modules` and toolchain read-only, preserve all unrelated untracked bytes. If unexpected drift, ownership, symlink, unrecognized installed package, non-quiesced Host or abnormal project tree: **STOP, no Profile writes**.

## 3. P1 — Accepted-artifact recovery into isolated task-owned build root

Because the accepted Phase15.3E Client build **was intentionally generated in a now-removed temporary snapshot**, the current repository untracked `lib/client.js` contains the **old** Phase15.3C Client: never package that old `lib/` as if it were the new accepted version. The previous Phase15.3E temporary archive may no longer exist.

Create an **isolated task-owned source/build snapshot** of the exact accepted executable `1d5addfc1ae1daa360708bcf0e408f058c4a2cd1` **without branch/worktree**, using a read-only Git archive or equivalent bounded copy, with verified source blob identity and no untrusted extra files. Reuse the currently verified installed toolchain/dependencies only by safe, explicitly verified external **read-only** paths/symlinks; never reinstall or mutate `node_modules`/Harness, and never add a tracked source commit. The temporary build root must never be the user's existing Risk Advisor checkout or Profile.

Before build inspect build-script and lifecycle hooks and write set; run the already accepted direct local TypeScript and tsdown build (`tsc -p tsconfig.json`, `tsdown`) in that isolated snapshot, not `pnpm exec`. **Hard gate:** generated Client SHA-256 must be exactly `7d3939ab3a6086248a6f351c34ee3e66e5177e857ca6078d347940ffdeb030e3`, Host SHA-256 exactly `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`. Verify source-map/file identities and existing package identity. If cannot reproduce the accepted bytes due to environment differences, **STOP** and report artifact provenance blocker; do not substitute a different build, loosen hashes, or package stale `lib/`. Phase15.3E's earlier 67/67 validation need not rerun for this provenance-locked deployment; no Canonical Full.

## 4. P2 — Fresh rollback-ready backup and persistent immutable new archive

Before touching `web`, establish **fresh** narrow private rollback backup of current installed Risk Advisor and just those Profile package-manager/control metadata files it can update; unique directory under `~/.dsh/backups/risk-advisor/phase15-3e-web-delivery1-<unique>/`, mode `0700`, SHA-256 manifest, source/backup byte, symlink, owner and permission checks. Do not include sessions, credentials, transcripts, projects, whole Profile. Test restore preconditions and document exact old-package supported rollback command/path, verification set and recovery block conditions. Prior backup cannot replace this fresh one.

Package the **isolated exact-identity build** into a separate **private persistent** `~/.dsh/artifacts/risk-advisor/phase15-3e-web-delivery1-<unique>/`, with script-disabled `npm pack --ignore-scripts --json --pack-destination <new-dir>`. The tar basename may be the same because the directory path is unique; never overwrite old artifact. Verify package member set (expected 90 files), path traversal/symlinks, no personal data, package manifest, SHA-256 and SHA-512 SRI, and **new exact bundle hashes inside tarball**. Treat package-tarball SHA as newly measured, not guessed from the older temporary pack. Artifact directory and packaged tarball stay permanently available after task cleanup while Profile references them.

**Sequence safety:** complete both new rollback backup and verified new archive before attempting install; no component that depends on an ephemeral temporary source path.

## 5. P3 — Supported Risk Advisor-only plugin-manager update

Fresh-check Profile ownership/quiescence, prior installed exact package identity, new backup and new artifact hashes. From pinned Harness root use only supported, previously validated offline plugin-management command:

```text
npm_config_offline=true node apps/cli/lib/bin.js plugin --profile web add --offline --ignore-scripts <absolute-new-persistent-artifact-path>
```

Package version remains `0.1.0-r1` and is **not** acceptance evidence. Verify selected Profile Risk Advisor `file:` path and lockfile integrity points to new tarball, all installed members byte-identical to new archive, installed Client SHA=`7d3939ab...`, Host SHA=`9525d46c...`. Verify old Phase15.3C and original root tarballs unchanged. Check exact before/after path-level write set: only Risk Advisor package selection/source/integrity, matching Profile package-manager lock/module records, installed Risk Advisor files; allow the **previously observed** manager-owned operation-scoped new `.plugin-manager/logs/<operation-id>/pnpm.log` as an explicit named tooling side effect (do not read contents or broader user logs). No other plugin change, module version, workspace/patch/cordis policy, settings, permissions, unrelated files or user data writes.

On unexpected write set / install error, stop activation. Use **only** the preverified old persistent Phase15.3C package and supported rollback path if objectively safe, proving complete original metadata and installed identity; if safe rollback cannot be proved, report `BLOCKED_PARTIAL_STATE` without improvising deletions or broad restore.

## 6. P4 — Normal Web activation-only validation

Only if no user-owned Host conflict on port 3080, start a **task-owned** normal pinned Harness Web Host (`node apps/cli/lib/bin.js --profile web --no-open`), and one task-owned isolated browser tab/context. Existing Chrome/user tabs and sessions not modified. Inspect **only** safe public metadata: module loader availability, four Risk Advisor CSS style registrations (approved unchanged CSS), normal route/status reachability for `/api/risk-advisor/online-correction` and `/api/risk-advisor/runtime-risk`, and current installed package identity. Browser may not expose direct Client hash; if so label runtime identity `INDIRECT` (package+loaded CSS/route evidence), never `DIRECT`. **The same four CSS registrations are not proof of new F1/F2 locale text**; that was separately tested in the earlier Phase15.3E isolated client fixture. No actual Finding/Approval/Tool execution is allowed in the real Profile to force a rendering.

Bounded polls at normal source 1000ms interval can yield repeated HTTP 200; observe bounded time/metadata, do not treat counts alone as absence or proof of duplicate polling. Never record/read sensitive request/response body, URL token, provider key or user session. Close only task-created Host, context/page, process resources and temp paths; ensure port 3080 free **only if it was free before task**. Do not stop preexisting processes.

## 7. P5 — Report/Git/provenance and acceptance boundary

Add one sanitized documentation report at:
`docs/tasks/Phase15-product-readiness/Phase15_3E_Web_Delivery1_Execution_Report.md`.

Record P0–P5 individually (PASS/BLOCKED/NOT_EXERCISED), exact tested source SHA and recreated bundle hashes, new persistent artifact path and hash/integrity/inventory, prior package tarball and installed hashes, fresh backup directory and manifest SHA and rollback preconditions, path-level Profile diff and log exception, startup/module/endpoints observations with direct/indirect distinction, old protected file hashes, cleanup and no-run categories. Do not claim independent acceptance. Do not report sensitive absolute user identifiers, URLs/tokens, request/response bodies or session contents.

Commit/push **only report** to `main`; source/build output/new tarball/backup are untracked local/privately stored and may not be committed. After push, verify GitHub remote main == local `HEAD` == `origin/main`; only new documentation report should differ from the authorized baseline. If blocked, still report first failed gate, exact local/remote/Profile state, no unsafe automatic recovery.

**Success:** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY1_READY_FOR_ARCHITECTURE_REVIEW`.  
**Blocked:** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY1_BLOCKED` (including `BLOCKED_PARTIAL_STATE` if relevant).

Independent architecture acceptance of deployment, and any later real Agent/Tool UX research, require separate review/authorization. No broader development or localization allowed.
