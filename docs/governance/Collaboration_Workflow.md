# ChatGPT Web + Codex Collaboration Workflow

## Roles

### ChatGPT Web — architecture and acceptance authority

ChatGPT Web owns product intent, architecture decisions, Harness seam decisions,
Static Preflight direction, task freeze, and independent final acceptance. It may
request a bounded task and must independently review the pushed remote commit and
evidence before declaring acceptance.

### Codex — implementation and execution agent

Codex owns the bounded implementation, documentation updates explicitly requested by
the task, self-checks, scope audits, and the execution report. Codex may resolve
ordinary engineering issues autonomously, but does not make unrequested architecture
changes, modify Harness Core, or declare `ACCEPTED`.

Codex does not generate an Acceptance Report for T00. Acceptance is a separate,
independent ChatGPT Web activity.

## Standard flow

```text
User objective
  → ChatGPT Web architecture / preflight / freeze
  → Task-specific Implementation Instructions
  → Codex makes one bounded change directly on main
  → focused checks + scope audit; Canonical Full only when explicitly defined and required
  → Codex commit + immediate push to main + remote SHA verification
  → ChatGPT Web independent review of remote diff and evidence
  → ACCEPTED / REPAIR / STOP
```

## `SINGLE_MAIN_CONTINUOUS_COMMIT` (mandatory default)

The collaboration model is **`SINGLE_MAIN_CONTINUOUS_COMMIT`**: authorized work is
performed directly on the repository's `main`, without creating a task branch or
worktree. Before editing, synchronize and verify the requested baseline. Preserve
all pre-existing untracked files and user state.

- Every bounded change is its own commit and is pushed to `origin/main` immediately.
  Do not accumulate unrelated changes for a later batch push. If a commit cannot be
  pushed or the remote has advanced unexpectedly, stop and report the exact state;
  never force-push, rewrite history, or silently switch workflows.
- After each push, verify the exact commit on the remote. The pushed commit and its
  evidence are the object for independent review.
- **Push means published for review; push does not mean accepted.** Only the
  designated independent architecture/acceptance reviewer may mark the work
  `ACCEPTED`. Codex reports implementation and evidence status without self-approval.
- A requested repair is a new bounded change with its own commit, immediate push,
  and independent review. Preserve earlier commits and reports as history.
- A task-specific user instruction may explicitly require another delivery shape;
  follow that instruction and state the resulting scope. Do not invent an exception
  or branch/worktree on your own.

## Coordination rules

- One task has one task directory under `docs/tasks/`.
- Frozen design belongs in `docs/baseline/`; historical exploration belongs in
  `docs/discussion/` or `docs/notes/`. Do not maintain competing authority copies.
- Every task report states what was checked, what was not run, the exact tested SHA,
  and the final remote SHA.
- `R1`–`R5`, provider calls, browser calls, and old seven-Spike harnesses are not
  implied by a documentation task.
- Preserve user drift. Never use reset, clean, force-push, or destructive replacement.
- Keep each direct-main commit small, reviewable, and tied to the requested task. For
  multi-file documentation work, group files only when they form one bounded change;
  each such commit is pushed before proceeding to the next change.
- Stop and report when a frozen architecture decision, protected path, missing
  prerequisite, unexpected remote history, or delivery/authentication condition
  requires a new decision.
