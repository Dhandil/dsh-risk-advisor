# Risk Advisor — External Development Artifacts Read-Only Inventory Freeze

**Authorization:** `RISK_ADVISOR_EXTERNAL_ARTIFACT_INVENTORY_READ_ONLY_AUTHORIZED`  
**Executor:** Codex on the user's Mac; **independent reviewer:** ChatGPT  
**Pre-freeze Git main:** `c9aa537927b1b0b78713d1f8477d19984b0fabb4`  
**Pinned Harness SHA:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Mode:** read-only inventory and classification of files and directories **outside** the Risk Advisor project root that may have been created during its development, tests, validations, packaging, and Web deployments. **Do not delete, move, recreate, rename, compress, clean, chmod, restore, relink, mount, run, install, or modify these assets.** The only permitted mutation is the one sanitized report committed and pushed to this repository.

## S0 — Exact baseline and noninterference

Resolve Risk Advisor repository root and canonical Git `main == origin/main == git ls-remote` to the **post-freeze documentation commit** that contains this instruction; prove ancestry from the pre-freeze SHA above. Pinned Harness checkout stays at its exact SHA and tracked-clean. Use `git status --short`, `git ls-files`, read-only `git worktree list --porcelain` only as appropriate; never create new branches/worktrees or use reset/clean/rebase/force. Preserve all project-root untracked `lib/`, `node_modules/`, `.vitest-cache/` and old tarball; those are **not** the target of this external cleanup audit.

No `pnpm`, `npm`, package install/uninstall, test, build, pack, benchmark, browser, Agent, Tool, Provider, Docker, Harness runtime or cleanup commands. No process start/stop or change to user sessions, running Host or ports. Do not query private file contents or collect credentials.

## S1 — Bounded discovery, not a blanket home scan

Start with **exact known project-related external roots and historical report paths**; only expand into directories already positively identified as Risk Advisor/task-owned. The following are allowed as metadata inspection targets, provided they exist and are readable by the current user:

1. **Durable package and rollback material**: `~/.dsh/artifacts/risk-advisor/`, `~/.dsh/backups/risk-advisor/` and any other previously documented Risk Advisor-specific artifacts/backups discovered by reading repository reports. Examples to check by path/inventory rather than full file reads: `phase15-3c-web-delivery1-20261011Tn9kv_6ka`, `phase15-3e-web-delivery2-7uxom1lz`, `phase15-2b-web-20261011T052436Z`, `phase15-3c-web-delivery1-20261011T102836Z-8ltHHT`, `phase15-3e-web-delivery1-20261011T120937Z-6006491b`, and `phase15-3e-web-delivery2-ngjjpy89`. Inventory names, type, ownership, size, mtime, symlink status, historical reference only. Do not open backup file contents or remove anything.
2. **Live selected installation**: `~/.dsh/profiles/web` only at the *known Risk Advisor installed package path and declared Profile package/lock metadata*, plus the manager's known operation-log **path metadata**. No profile-wide recursive content scan; **never open Session/Conversation, Memory, storage, credential, auth, private log or browser data**. Installed plugin and manager-generated state remain protected. A log or cache name is not proof of safe deletion.
3. **Historical task-owned temporary roots**: macOS `/private/tmp` and the current user's resolved system temporary root (`$TMPDIR`), by bounded **name/path matching** for exact `risk-advisor`, `dsh-risk-advisor`, `phase13`, `phase14`, `phase15`, and known execution task prefixes corroborated from project reports. Search only the top level (and direct descendants of strong-matching task-owned roots); use safe metadata `find`/listing limits, with **no symlink following**, no traversal into other users' temporary trees, and stop rather than performing deep / global searches. Reports may attest specific temp roots were already removed: mark `NOT_PRESENT` rather than calling it garbage.
4. **Sibling project and checkout locations**: the bounded `~/Developer/Harness/harness-plugin/` project neighborhood and the pinned `~/Developer/Harness/deepseek-harness` checkout **top-level names/Git metadata only**, to detect unexpected duplicate Risk Advisor project snapshots, test checkout/worktree directories, and package links. Do not read or modify other plugin projects, the Harness source tree, or unrelated directories. A legitimate sibling repository, Git worktree or shared checkout is **protected**, not a cleanup target.
5. **Tool-specific user caches** such as global pnpm/Corepack/npm storage are **shared and presumed protected**. Only record known relevant cache *root metadata* if discoverable from already documented paths; no broad recursive traversal, no `pnpm store prune` or cache eviction.

**Exclusions:** never scan `~/Documents`, `~/Downloads`, `~/Desktop`, private cloud storage, other user homes, `~/Library` browser/application profiles, `~/.ssh`, `~/.config` credentials, macOS Keychain, browser cache, personal Session files or every `~/.dsh` subtree. No `find / -name '*risk*'`, `find ~`, Spotlight broad index query or `sudo`. If a relevant artifact is hinted outside this scope, report its **non-sensitive category** as `OUT_OF_SCOPE_NEEDS_AUTHORIZATION` without opening it. Do not follow symlinks into another root.

Use only read-only `stat`, `du`, targeted `find`, `git status`/`git worktree list`, `git grep` and manifest/report reference searches. For logs, inventory metadata only—**do not read their contents**. Never publish credentials, task prompts, user session IDs, private temp tokens or logs.

## S2 — Provenance, liveness and duplicate analysis

For each candidate *external* path, record a bounded row: normalized/sanitized path (e.g., `~/.dsh/...` or `<TMPDIR>/...`), type, observed existence, approximate disk usage, mtime as supporting metadata (not a deletion decision), expected owner/task phase, known SHA or manifest reference *if already recorded*, whether it is referenced by an installed package, active process, current or past test, rollback procedure, evidence archive or other project's source.

Use historical execution reports as provenance, but verify filesystem **metadata** before claiming present. Do not open files just to prove byte identity; existing reported SHA may be labeled `HISTORICAL_ONLY`. Avoid exposing full private absolute paths. If process/handle inspection is allowed by the platform with read-only metadata, be conservative and do not claim absence of references from an incomplete check. Distinguish same-name tarballs by original SHA and official Profile reference rather than basename. Do not mark an asset orphan merely because it is old, a symlink, or no longer the currently selected version.

Classify with exactly one of:
- `KEEP_ACTIVE`: currently selected plugin, Profile metadata/state, live runtime-owned data.
- `KEEP_ROLLBACK`: old immutable tarballs, historical backups, their manifests, or recovery dependencies.
- `KEEP_EVIDENCE`: retained validation evidence or historical reproducibility material.
- `KEEP_SHARED`: global caches, shared pnpm/Corepack, Harness checkout, other plugin artifacts.
- `POSSIBLE_TASK_TEMP`: task-owned temp artifacts not proven to be needed, **cleanup candidate only for future separate approval**.
- `UNKNOWN_DO_NOT_TOUCH`: cannot establish provenance, ownership, or references safely.
- `NOT_PRESENT`: previously reported task-owned root that no longer exists.
- `OUT_OF_SCOPE_NEEDS_AUTHORIZATION`: discovery would cross permitted boundaries.

Mark potential duplicate builds, detached snapshots, unexplained directories or stale benchmark roots with **proof of task ownership and negative references**. Clarify confidence `HIGH/MEDIUM/LOW`; no inferred disk reclamation for protected assets. `POSSIBLE_TASK_TEMP` does not authorize deletion.

## S3 — Conservative findings and prospective cleanup plan

Summarize item count and **approximate non-double-counted bytes** by class, top candidates by potential reclaimable bytes, disk measurement method, and uncertainty. Keep package backups **separate** from disposable temporary roots; never propose global `rm -rf`, `pnpm store prune`, or cleanup of the active `~/.dsh/profiles/web`. For any `POSSIBLE_TASK_TEMP`, propose only a **future independent narrowly scoped plan** requiring explicit user authorization, exact path + owner verification, recheck no live process/reference, rollback/recovery consideration, dry-run manifest and no symlink traversal. If nothing removable is proven, say so.

Historical reports record that Phase15.3E Delivery2 explicitly removed its task-owned `/private/tmp` build root while preserving old/new immutable archives and `~/.dsh` backups. Do not infer a leak from the historical use of a temporary directory. Check whether any relevant root presently exists before reporting a leak. The deployed Phase15.3E package has already been accepted with a known pnpm-workspace-state rollback limitation; this inventory must not risk that Profile or its rollback assets.

## S4 — Exactly one documentation report

Create only:
`docs/tasks/Codebase-maintainability-audit/External_Development_Artifacts_Read_Only_Inventory_Report.md`.

Include the exact pre/post-freeze and actual audited `main` SHA, inspection scopes and uninspected boundaries, size attribution and any count/size sampling limits, all supported findings and evidence references, decision matrix, no-mutation attestation and explicitly **no deletion performed**. Report paths in sanitized form and avoid private filenames whose disclosure reveals personal data. Commit/push only this report directly to `main`, preserve all existing untracked assets and verify `HEAD == origin/main == git ls-remote` and docs-only diff from freeze.

**Success marker:** `RISK_ADVISOR_EXTERNAL_ARTIFACT_INVENTORY_READY_FOR_INDEPENDENT_REVIEW`  
**Blocked marker:** `RISK_ADVISOR_EXTERNAL_ARTIFACT_INVENTORY_BLOCKED`.

**Important:** this audit authorizes neither cleanup nor any new installation/build. Report an exact prospective cleanup proposal only after evidence, then wait for independent architecture review and user permission.
