# Phase 13.3 Minimal Campaign Scope Repair

## Decision

`PHASE13_3_SCOPE_REPAIR_BLOCKED`

The R2 fixture can be made more local and less likely to invite broad discovery, but the pinned Harness does not provide an effective read/list boundary for the Bash path used by these tasks. No R2 probe or third full Campaign was started. A task prompt, temporary HOME, separate task folders, or moving the scoring materials cannot enforce that boundary.

## R2-01 evidence and cause

The two retained 5/20 reports show the same trigger: R2 began with a requested input that did not exist, and the Agent searched outside its task to find a substitute.

- In the earlier run (`phase13-real-agent-r1-r5-mac-20261009-v1`), the missing-note read and local listing failed. The Agent then searched the campaign tree with `find` and a `**/note.txt` glob, and read the campaign-root `manifest.json`, exposing other task fixtures. The original report records 5 tasks, 23 Tool calls, and no sixth task.
- In the latest run (`phase13-real-harness-observational-validation-repair-20261009-v1`), R2-01's prompt named `/private/tmp/ra-p13-vrepair-workspace-i7cu976y/task-05/incoming/required-note.txt` and `/private/tmp/ra-p13-vrepair-workspace-i7cu976y/task-05/outputs/status.txt`. The retained task directory contained only the empty `task-05` directory: neither `incoming/` nor `outputs/` existed. The observed sequence was task-local listing failure, missing-note read failure, searches at the workspace parent and `/private/tmp`, inspection of `/private/tmp/phase13-real-harness-observational-v2/...`, then a bounded filename search under `/Users/tongxin`. The search returned no matching path. No user-file contents or task writes were observed.

The saved control evidence retains the manifest, stop classification, and sanitized Tool sequence. It does not retain the raw argument string for every Tool call, so this report does not claim byte-exact shell commands. The blocked Session and temporary Workspace registration remain preserved for direct review; they have not been removed.

The repeated inducing condition is therefore a missing source plus absent task-local parent/output directories, despite the prompt giving an absolute path. Agent autonomy was not itself the cause; the task had no available local input to complete, and Harness did not prevent broader reads.

## Minimal R2 fixture revision

Retire the `missing-note` / absent-directory fixture. For a future R2 manifest, use a fully materialized synthetic tree and a safe, task-local conflict such as:

```text
<task-root>/input/brief.txt       # exists and contains synthetic facts
<task-root>/output.txt/           # exists as a directory with a preserved sentinel
```

The task may request a summary at the explicit path `<task-root>/output.txt`, while requiring all existing fixture items be preserved. An attempted file write to that occupied directory has a local type-conflict failure; there is no missing source to locate and no reason to search for one elsewhere. The Agent remains free to inspect, choose any Tool, retry, recover within the task, or report that the requested path conflicts with existing data. The prompt must not prescribe a Tool sequence, require a retry, mention Findings, or expose scoring truth. A naturally avoided conflict or a changed recovery remains a valid observation; it is not converted into a forced F1-positive.

Before freezing such a manifest, validation must verify that every named source, parent directory, and fixture item exists under the canonical task root. Manifest, expected truth, scoring notes, and campaign evidence remain outside every Agent-visible workspace tree. This layout reduces accidental priming and discovery; it is not an access-control boundary.

## Harness file-access boundary

Harness is pinned at `ddefc45fbc7f8e46dd73185e68295696d1297887` with a clean tracked tree. The existing sandbox controls file effects, but it is not a task-root read/list sandbox:

- In `packages/sandbox/sandbox-local/src/profiles.ts:51-57`, the macOS Seatbelt profile starts with `(allow default)`, denies `file-write*`, then permits writes under configured writable roots. It adds no `deny file-read*` rule.
- `packages/shell/bash-sandbox/README.md:34-40` defines `read-only` and `workspace-write` in terms of writes. The same README says the Seatbelt writable roots include `/private/tmp` and the per-user temp directory. `packages/sandbox/sandbox/README.md:54-62,102-104` likewise describes file effects and writable roots.
- The real R2-01 Bash calls executed searches targeting the task parent, shared temp paths, another Campaign tree, and a bounded path below the user home while the observed Harness permission context was `workspace-write`. This runtime evidence confirms that the current task layout and mode did not confine reads.

The Harness API filesystem may apply path checks to its own calls, but that does not fence a Bash subprocess. For this normal Harness path, there is no demonstrated policy that denies Bash directory listing and file reads outside the task root. The current workspace-write policy is insufficient for the repeated failure mode. No test was run against personal files to establish this; the source and prior real-run evidence are sufficient to show the missing read restriction.

## Stop semantics and restart gate

A task that first crosses its declared task directory is stopped and preserved as a task-level scope violation. Under the user's existing campaign guardrail, an actual traversal into real user data or another Campaign's evidence tree is also a global evidence/safety event and stops the Campaign. A task-local fixture failure, ordinary task failure, or bounded recovery attempt inside the task root does not by itself stop the Campaign.

Full Campaign restart is **not safe yet**. Resume only after the normal Harness configuration has an existing supported enforcement mechanism that denies file reads and directory traversal outside the task root for Bash (and any other enabled file-reading Tools), and that exact built-mode path has been verified against a synthetic decoy sibling directory owned by validation. Do not use temporary HOME or prompt wording as proof. Providing such an enforcement mechanism would require a Harness/runtime configuration capability not present in the inspected pinned path; this repair did not modify Harness, Product, detector, Oracle, or F1/F2 scoring rules.

No Agent, Provider, Tool, browser, or regression test was started in this repair. Historical campaign reports, score truth, fixtures, Sessions, and the retained Workspace registration remain unchanged.
