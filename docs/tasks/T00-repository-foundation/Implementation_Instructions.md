# T00 — Repository Foundation | Codex Implementation Instructions

**Read first:** sibling `Architecture_Freeze.md`, then `README.md` when available. Current task ID: `T00-repository-foundation`. Complete the entire bounded task autonomously, stop at final report. Do not begin R1.

## 0. Protected paths / stop conditions

- Work only within `D:\Harness\harness-plugin\dsh-risk-advisor` for writes. `D:\Harness\deepseek-harness` is strictly read-only reference.
- Never reset, clean, overwrite unknown user files, force-push, change protected Harness modules, invoke real providers, run old S1–S7 spike harness, or implement Risk Advisor product code.
- STOP if the plugin directory is already inside an unexpected parent Git worktree, if an existing remote differs from the approved canonical URL, if the remote acquired a nontrivial history that cannot safely be fast-forwarded, if the supplied source documents are missing, or if any architecture change is required. Preserve all user drift.

## 1. Preflight — record before writes

1. Check directory trees and `risk-advisor-current/` handoff inputs; do not delete sources.
2. Check plugin directory's `.git` and `git rev-parse --show-toplevel`; distinguish genuinely uninitialized from nested parent worktree.
3. Check `git ls-remote https://github.com/Dhandil/dsh-risk-advisor.git` and identify refs. The remote was empty when ChatGPT verified it, but this must be rechecked.
4. Read-only verify Harness `HEAD`, `origin/master`, tracked/staged/untracked status, and confirm the known static preflight facts; DO NOT change its worktree.
5. Record factual local preflight: Harness `master` @ `ddefc45fbc7f8e46dd73185e68295696d1297887`, matching origin/master; prior untracked Harness files `build.log`, `install.log`, `t0-*.txt` were protected. Re-read exact current status rather than merely recopying this assertion.

## 2. Canonical documentation migration

Create the `docs/` layout frozen in sibling `Architecture_Freeze.md`.

Copy five current documents from `risk-advisor-current/` to `docs/baseline/` unchanged except one explicit Test Matrix seam correction. The architecture file is named `risk-advisor-v1-architecture-v1.2.md` but is internally versioned v1.2-r1; do not relabel its version accidentally.

Create `docs/governance/Collaboration_Workflow.md` documenting:

```
User objective
→ ChatGPT Web architecture/preflight/freeze
→ Implementation Instructions
→ Codex implement + focused tests + scope/architecture audit + static gates
→ Canonical Full only when defined/required; last executable gate
→ Acceptance Report (docs-only commit)
→ Commit/Push, verify remote SHA
→ ChatGPT independently review remote code/diff/evidence
→ ACCEPTED / REPAIR / STOP
```

Codex autonomously resolves ordinary engineering errors, but STOP for frozen-architecture changes, protected file changes, unmet test prerequisites, reset/clean/destructive operations, or explicit STOP conditions. Every task ends in a remote push and verified SHA, or explicit delivery blockage.

Create `docs/tasks/T00-repository-foundation/README.md` giving objective, current status, links to Architecture Freeze / Instructions / Preflight / Report, current upstream SHA and next task (R1 only after acceptance). Keep all **T00-specific** documents in this one folder.

Persist these supplied `Architecture_Freeze.md` and `Implementation_Instructions.md` as the task's frozen originals. Save the prior Codex local source check into sibling `Static_Preflight_Report.md`, distinguish CODE_VERIFIED vs PARTIALLY_CODE_VERIFIED vs RUNTIME_REQUIRED, and mark R1–R5 not run.

Old S1–S7 notes, if present, are historical only; do not stage them as current execution instructions. Do not remove or overwrite handoff inputs.

## 3. The one known correction

In `docs/baseline/risk-advisor-test-matrix-v1.0-r1.md`, replace the active L3 seam `code-dispatch` reference with:

```
tool/ptc-dispatch-start / tool/ptc-dispatch
```

Audit active references (`rg`) so no other old executable `tool/code-dispatch*` instructions remain. Historical old→new comparison or supersession notice is allowed. Do not rewrite unaffected architecture rules or silently change six-dimensional semantics.

## 4. Quality gates (docs-only T00)

Perform: source filename/content consistency; Markdown relative-link/path resolution where practical; no duplicate canonical baseline; `rg` for active obsolete API; `git diff --check`; staged-file scope review; ensure no secrets/build logs are staged. No Canonical Full exists for T00: report `NOT_APPLICABLE`, not `PASS`. Real Provider/Managed Agent/Browser calls = 0 for this task.

## 5. Safe Git bootstrap + publication

- Only after confirming the workspace is NOT a Git worktree and the remote has no commits/refs, initialize the EXISTING plugin directory (e.g. `git init -b main`); never clone over it.
- Add `origin https://github.com/Dhandil/dsh-risk-advisor.git` only if absent; verify exact URL. If an existing origin differs, STOP instead of overwriting.
- Stage exact canonical docs and task docs, not temporary handoff folders, Harness build logs or unknown user files.
- Make the implementation/docs-foundation commit after checks. Then write `Acceptance_Report.md`, independently audit docs-only diff and commit the report separately.
- Push `main` normally, never force. Fetch/read remote and verify `origin/main` (or remote `refs/heads/main`) equals local final HEAD.
- A push failure or missing Git identity/auth is `DELIVERY_BLOCKED`; don't claim success.

## 6. Report output and stop

`docs/tasks/T00-repository-foundation/Acceptance_Report.md` must contain:

- Outcome `T00_FOUNDATION_PUBLISHED` / `T00_BLOCKED` / `T00_FAILED`;
- local plugin and reference Harness baseline, remote URL and branch;
- protected pre-existing drift (both directories);
- canonical docs manifest and corrections;
- checks actually executed with results; tests NOT_APPLICABLE; R1–R5 NOT_RUN;
- implementation commit, report commit, final HEAD, remote SHA and exact verification;
- changed-path audit (no Harness Core modifications), remaining issues and STOP statement.

Output a compact terminal summary: `Outcome`, `Tested/Docs SHA`, `checks`, `report path`, `final remote SHA`. STOP. Do not start R1.
