# Phase 13.3 Harness Temp Worktree — Read-Only Ownership & Liveness Preflight

**Authorization:** `RISK_ADVISOR_PHASE13_3_TEMP_WORKTREE_OWNERSHIP_READ_ONLY_AUTHORIZED`  
**Executor:** Codex (user Mac); **independent reviewer:** ChatGPT  
**Git baseline before this freeze:** `6fdb010b1c5e6f21b7b4b0c471b096ab0f1446fa`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Sole filesystem target:** `/private/tmp/dsh-harness-phase13-3-readiness/`  
**Purpose:** decide whether a **separate future cleanup proposal** could be justified. This preflight authorizes **no removal, repair or reclamation**.

## 0. Non-negotiable limits

This is a **metadata-only, non-mutating, single-target** examination. No cleanup, deletion, `git worktree remove/prune/repair`, branch/worktree creation, rebase, reset, checkout, index manipulation, install, build, tests, network, browser, provider, Agent, Tool or Harness runtime. Do not start or stop processes. Do not write to this directory, Harness, other plugins, `~/.dsh`, or any user file. Protect normal Harness sessions, Profile, credentials, backup archives and package state.

**Do not** run recursive `du`, `find`, `ls -R`, `tree`, `rg` or similar directory crawls on the target; **do not** inspect its children recursively, read source files, history logs, package caches, node_modules or private content; no symlink following. Do not scan all `/private/tmp`, `$TMPDIR`, `~`, profile roots, other worktrees, or other repositories. The previous audit's `du` overread must **not** be repeated. Historical size `1,846,616,064 B` is a **prior out-of-scope observation**, not an independently accepted safe-reclaim estimate.

Allowed metadata checks only:
- `lstat`/`stat` of the **exact named target root**, its mode/type/owner, and **at most the exact `.git` pointer at that root** (if present). A root-level `.git` *text pointer* may be read only enough to resolve its `gitdir:` location; if it points outside the known pinned Harness Git metadata, stop and report `UNKNOWN`. Do not dereference a target symlink or scan other entries.
- `git -C <known pinned Harness checkout> worktree list --porcelain`, `git rev-parse`, and narrowly selected **Git worktree metadata** already known from that output and the precise `.git` pointer. Reading Git metadata is permitted; do not modify it. No `git gc`, `git maintenance`, `git worktree prune` or `git worktree repair`.
- Targeted, bounded **process metadata** such as `ps` (command name/working directory where supported) or `lsof` by **known PID/exact root** without recursion and without reading file contents. Exclude unrelated process environment or arguments carrying secrets. If complete open-file checking cannot be guaranteed safely, record `LIVENESS_UNVERIFIED`, not `NO_REFERENCES`.
- The existing **checked-in** Phase13.3 execution/architecture reports and existing project-level Git metadata. No private full-disk reference search.
- Baseline audit of the Risk Advisor repo with read-only Git commands; expected starting main is the post-freeze docs commit (ancestor of report).

If a check crosses these limits or provenance is unclear, **stop without expanding scope** and record the blocker. No \"just one more\" filesystem discovery.

## 1. Questions to answer, in order

**Q1 — Is it the same object?** Confirm exact root exists, type (normal dir vs symlink), owner/mode, and root `.git` pointer identity. If target absent, state `NOT_PRESENT`; no further probing.

**Q2 — Whose checkout?** Use pinned Harness's Git worktree registry and the target's bounded Git metadata to determine whether this target corresponds to a registered worktree; capture only sanitized identity, HEAD SHA, registration/prunable reason, and whether its expected gitdir exists. Distinguish *stale Git registration* from *actual directory still on disk*. Do not treat `prunable` as delete authorization or proof that no executable files are important.

**Q3 — Evidence/references?** Correlate the exact path and Phase13.3 readiness task with checked-in reports. Distinguish direct exact-path references vs only task-name/phase correlation. Do not infer sole ownership from the folder name or a Git SHA.

**Q4 — Is it live/needed?** Check only metadata supported by this scope: known Git registration, observed supported process references and task status. Record unknowns if open handles, ownership of children, external consumer references or other projects cannot be exhaustively proven. Never claim all processes or other references absent from limited checks.

**Q5 — What would cleanup require?** Classify `KEEP_ACTIVE`, `KEEP_EVIDENCE`, `CANDIDATE_NEEDS_SEPARATE_AUTHORIZATION`, `UNKNOWN_DO_NOT_TOUCH`, or `NOT_PRESENT`. A candidate needs affirmative evidence of historical task ownership, inactive use, no unique unarchived evidence and supported safe recovery; if any cannot be established, use `UNKNOWN_DO_NOT_TOUCH`. Estimate **potential** footprint only using prior reported `~1.85 GB` with caveat; never claim `safe_reclaimable_bytes > 0` without complete proof.

## 2. Exactly one report and end state

Create **only**:
`docs/tasks/Codebase-maintainability-audit/Phase13_3_Harness_Temp_Worktree_Ownership_Read_Only_Report.md`.

Report pre/post-freeze and actual audited SHA; Q1–Q5 evidence; exact Git metadata commands **without private process args/paths**, observed registration and liveness limitations, classification, whether the prior ~1.85GB measurement is accepted only as historical estimate, and a proposed next action. Include a clear statement **NO CLEANUP PERFORMED** and no authorization implied. Commit/push only this sanitized Markdown to `main`; verify a single docs-only diff, `HEAD = origin/main = git ls-remote origin main`, and preservation of all existing tracked/untracked, Profile, and backup state. Do not modify this freeze.

**Success:** `RISK_ADVISOR_PHASE13_3_TEMP_WORKTREE_OWNERSHIP_READY_FOR_INDEPENDENT_REVIEW`  
**Stop/block:** `RISK_ADVISOR_PHASE13_3_TEMP_WORKTREE_OWNERSHIP_BLOCKED`.

Only after a subsequent independent review and **explicit user authorization** may any separate cleanup execution plan be considered.
