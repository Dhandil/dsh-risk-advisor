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
  → Codex implementation + focused checks + scope audit
  → Canonical Full only when explicitly defined and required
  → Codex commit / push / remote SHA verification
  → ChatGPT Web independent review of remote diff and evidence
  → ACCEPTED / REPAIR / STOP
```

## Coordination rules

- One task has one task directory under `docs/tasks/`.
- Frozen design belongs in `docs/baseline/`; historical exploration belongs in
  `docs/discussion/` or `docs/notes/`. Do not maintain competing authority copies.
- Every task report states what was checked, what was not run, the exact tested SHA,
  and the final remote SHA.
- `R1`–`R5`, provider calls, browser calls, and old seven-Spike harnesses are not
  implied by a documentation task.
- Preserve user drift. Never use reset, clean, force-push, or destructive replacement.
- Stop and report when a frozen architecture decision, protected path, missing
  prerequisite, unexpected remote history, or delivery/authentication condition
  requires a new decision.
