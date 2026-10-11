# Risk Advisor Phase 15.3C — Web Delivery 1 Architecture Freeze

**Decision:** `RISK_ADVISOR_PHASE15_3C_WEB_DELIVERY1_AUTHORIZED`  
**Architecture / independent review:** ChatGPT  
**Execution agent:** **Codex** (not zcode)  
**Explicit user approval:** user agreed to update the **existing** Web Profile with the Phase15.3C independently accepted UI, 2026-10-11  
**Starting remote main:** `e493354a8d26a8616f46071ea46c8eb6c934affe`  
**Accepted executable+fixture candidate:** `9f96db5981818cd2d6958b38ff6036efd659259b`  
**Independent acceptance:** `Phase15_3C_Independent_Architecture_Acceptance.md`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887` (read-only)  
**Target:** `/Users/tongxin/.dsh/profiles/web` — existing `@dhandil/dsh-risk-advisor` only

## 1. Purpose and exact boundary

Promote the **already accepted Phase15.3C Client UI** (A1 collapsed history + B1 semantic Approval metadata + C safe bilingual display labels) to the existing selected `web` Profile. This is **packaging, narrow installation, and real normal-Host/Client activation-only verification**. It is not a new UX implementation or localization stage. No source, tests, fixture, Harness, dependency/lockfile, plugin implementation or existing historical acceptance modification is authorized.

This is not permission to execute real Agent, Tool, Provider, model, native Allow/Reject, synthetic Finding inside the real Web Profile, Phase13.3 real-Agent campaign, or Canonical Full. No claims about actual risk detection, F1/F2 recall, natural user-session behavior or production user satisfaction.

**Strict identity:** currently installed Phase15.2B Risk Advisor `0.1.0-r1` from the **repository-root untracked** `dhandil-dsh-risk-advisor-0.1.0-r1.tgz`, old tar SHA-256 `cae4cbbd7c82f8d4feb651eb75708745918705a17db46733c12a77967befafb5`. Old installed Host `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`; old installed Client `06b790cf721dbe2391c1249182b8da71a359eaf4032d062527316f4ae374e735`.

**New accepted candidate:** built Host `lib/index.js` SHA-256 `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`; built Client `lib/client.js` SHA-256 `93bbe22052362276079b5d5685679d12b0766987901c2081e7b7c5cb0fab9db4`. This source-only UX change leaves Host bytes unchanged but changes Client bytes. The package name and version remain **the same** `@dhandil/dsh-risk-advisor@0.1.0-r1`; **version equality alone is never success evidence**. The exact installed tarball path/integrity and installed Host/Client hashes must prove the switch.

**Crucial: never overwrite, move, repack into, hard-link replace, or delete the existing repository-root tarball**. That path is still the currently installed Profile's dependency source and mandatory rollback provenance. Prior Phase15.2B backup at `~/.dsh/backups/risk-advisor/phase15-2b-web-20261011T052436Z/`, manifest SHA-256 `8ae9d01c441ed5ca6adf9d19b53668bfe5e8f1d3f3f65826b377a77c7826bae4`, remains protected but **cannot substitute for a fresh backup of the current installed state**.

## 2. D0 — Safe preflight and Codex Git synchronization

If local `main` is behind this authorized SHA, first verify exact `origin` repository, read-only `git ls-remote origin refs/heads/main` matches the expected SHA, and use **only** `git fetch origin main`, `git merge --ff-only origin/main` when tracked state is clean and ancestor relation is proven. Never `reset`, `clean`, `rebase`, force-push, branch or worktree. If latest remote is different, user-owned drift exists, or fast-forward cannot be proven, STOP. Verify local `HEAD == origin/main == git ls-remote`, tracked clean; document-only commits after candidate; accepted Client/Host product source identity.

Independently fingerprint current `lib/index.js`, `lib/client.js`, all build inputs and generated package boundaries; ensure **exact accepted Client and Host hashes above** before packaging. Re-read `package.json` lifecycle/pack whitelist, `npm` executable, no hidden pack hooks. Inspect package/files symlinks, permissions, users, runtime processes and existing untracked `lib/`, `node_modules/`, `.vitest-cache/`, root tarball and backups. Do not rebuild, modify generated bundles, reinstall dependencies or invoke `pnpm exec` in this delivery: these already accepted output bytes should exist. If not, return `BLOCKED` for a separate bounded artifact-recovery authorization.

Preflight the current Profile's absolute/canonical ownership, selected plugin and bundle order, installed Risk Advisor files, Profile package/lock/modules bookkeeping, workspace and patch identity. Expected old tarball path/SHA and **installed** old Host/Client hashes must match; pre-existing user use/writes or conflicting Host means STOP rather than killing or taking over port 3080. Never read/exfiltrate actual session contents, credentials, prompts, provider keys, browser cookies or real user tool evidence. No change to other plugins or settings.

## 3. D1 — Private narrow backup and recovery plan

Before any packaging/installation write to Profile, make a **new** private, uniquely named, non-overwriting backup under `~/.dsh/backups/risk-advisor/phase15-3c-web-delivery1-<unique>/` with a file manifest, SHA-256 and symlink/mode/owner identities for precisely the **currently installed Risk Advisor** and the Profile control and package-manager metadata that the supported plugin-manager update may touch. Include the existing lockfile references/integrities, package.json, workspace metadata and Risk Advisor installed file tree. Do not back up full Profile, sessions, user projects or secrets. Verify the backup is complete and restorable **before** switching. Keep both earlier backup and both existing old tarballs intact. Specify an exact-path supported rollback procedure, verification conditions and escalation rule. If an unexpected path, symlink, changed ownership or incomplete backup makes restoration unsafe, STOP before install.

## 4. D2 — Immutable new package artifact in an independent persistent directory

Make one **unique persistent, private** artifact directory outside the Risk Advisor repository, e.g. `~/.dsh/artifacts/risk-advisor/phase15-3c-web-delivery1-<unique>/`. Never use/reuse the old root tarball name **in the old directory** or any existing artifact path. Use existing local `npm pack --ignore-scripts --json --pack-destination <new-private-directory>` only after verifying no lifecycle/unsafe side effects, and ensure it cannot run dependency install or mutate protected node_modules. The packaged basename may remain `dhandil-dsh-risk-advisor-0.1.0-r1.tgz` because its **directory is distinct**; path identity is mandatory.

Check the new tarball SHA-256, exact member inventory (the earlier smoke had 90 files; compare and explain any count difference), path safety and package metadata. Prove each packaged `lib/client.js` and `lib/index.js` byte-for-byte matches D0's **accepted** built Client/Host hash, with no source/sourcemap/untracked sensitive data leaked. If `npm pack` prompts for deletion/installation/repair, triggers unauthorized writes, or packages inconsistent code, STOP. Keep the new tarball and its directory **persistently** so the Profile remains resolvable after the Codex task ends. Do not put it in task-owned scratch directories that will be deleted or in a Git commit. Protect it from concurrent pack use.

## 5. D3 — Scoped update using supported pinned Harness plugin management

Immediately before install, re-check exclusive Profile ownership, backup integrity, Host quiescence, origin and new-old source hashes; **abort on any drift**. Use only the previously validated pinned-Harness official plugin-management path, adapting solely the tarball argument:

```text
npm_config_offline=true node apps/cli/lib/bin.js plugin --profile web add --offline --ignore-scripts <new-immutable-tarball-absolute-path>
```

Run this from the pinned Harness root with the environment safeguards from Phase15.2B. Since package version is identical, **do not treat zero-error command or unchanged version as install success**. Verify the selected `web` Profile's dependency path and SHA-512 integrity now identify **exact new tarball**, all installed Risk Advisor tar members match, installed Host SHA equals `9525d46...` and installed Client SHA equals `93bbe220...`. Verify the old tarball still hashes `cae4cbb...` and its original path is unchanged.

The only permitted Profile changes are Risk Advisor dependency/tarball reference and matching lock/integrity/virtual-store bookkeeping, plus previously observed unavoidable validation timestamp. No other dependency selection/version, plugin enablement/order, `cordis.patch.yml`, workspace policy, user settings or file ownership/permissions may change. Produce a **path-level before/after write-set**, not a blanket claim. If a guard fails, halt further actions; perform **only** the pre-verified narrowly scoped rollback using its supported procedure when objectively safe, prove restored hashes and package references, and report what was/was not recovered. If recovery cannot be proven safe, do not improvise broad deletion or overwrite; report `BLOCKED_PARTIAL_STATE`.

## 6. D4 — Normal Web activation-only verification

Only after D3 is installed and reverified and **only if** there is no user-owned Host at the target port/process, start one **task-owned** normal pinned-Harness Web Host (`node apps/cli/lib/bin.js --profile web --no-open` as previously accepted). Use an isolated task-created browser page/profile that does **not** close or manipulate existing user tabs.

Collect **sanitized metadata only**: normal Host start success, local Client module `window.__ModuleLoader__.load`, four Risk Advisor CSS module registrations (including the updated `RuntimeRiskAwarenessDock.module.css` and `RiskAdvisorCard.module.css`), client dock/approval registration according to package, successful actual Online Correction and Runtime Risk endpoint reachability (HTTP 200 if observed), and identity of **new** installed Client hash correlated to the normal Web loaded artifact. If the Web bundle registry cannot expose a direct Client hash, report the strongest available package identity+module evidence and explicitly label runtime byte identity `INDIRECT`, not `directly observed`; do not fabricate a hash from CSS alone.

Do **not** create real Agent, Tool, model/provider call, user Session task, native approval, or synthetic F1/F2 Finding inside the user's real Profile. No new UI screenshot is required because Phase15.3C already has controlled browser screenshots; ordinary Web cannot show Finding/Approval UI absent a real approved scenario. Keep existing user Host/tab untouched, close **only** task-owned pages, browser context, Host and listeners. If user-owned Host becomes active, STOP without interrupting it; declare activation `NOT_EXERCISED`.

## 7. D5 — Report, exact provenance and no full campaign

Create **one** new report:
`docs/tasks/Phase15-product-readiness/Phase15_3C_Web_Delivery1_Execution_Report.md`.

Record D0–D5 PASS/BLOCKED/NOT_EXERCISED, expected vs observed Profile file-write list and unrelated-plugin invariants, immutable new archive absolute path (sanitize unnecessary user/account details), its SHA-256 and package inventory, exact new installed Host/Client SHA, pre-update old hashes and tarball path, new backup location/manifest/integrity, rollback readiness, actual Host/Client/browser observations, all own-process cleanup and explicit no-run categories. No secrets, tokens, request bodies, session contents or unredacted browser local URLs. Distinguish local executor observation from independent review; do not claim completed acceptance.

Commit/push **only** this report to `main` after completion or blocker; do not commit archives, screenshots, backups, source code, tests or host changes. Verify final remote `main == origin/main == HEAD` and exactly documentation-only diff from authorized starting SHA. Continue single-main/no worktree policy. Never force-push.

**Success (awaiting independent architecture review):**
`RISK_ADVISOR_PHASE15_3C_WEB_DELIVERY1_READY_FOR_ARCHITECTURE_REVIEW`

**Failure/stop:**
`RISK_ADVISOR_PHASE15_3C_WEB_DELIVERY1_BLOCKED`
(including `BLOCKED_PARTIAL_STATE` and first failing gate if applicable).

User's approval authorizes only the above Risk Advisor-only controlled package promotion, **not Phase15.3D F1/F2 localization**, unrelated Profile migrations, feature changes, arbitrary dependency management or a real-Agent campaign.
