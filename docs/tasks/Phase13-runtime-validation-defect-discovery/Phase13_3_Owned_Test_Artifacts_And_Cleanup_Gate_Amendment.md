# Phase 13.3 — Owned Test Artifacts and Cleanup Gate Amendment

## Decision

`RISK_ADVISOR_PHASE13_3_ARTIFACT_LIFECYCLE_GATE_ADDED`

This **supplements**, rather than replaces, the frozen locale-neutral Session proof and limited real-Agent functional probe. It adds an explicit, scoped file-lifecycle obligation after the task is completed. It does not authorize clearing historical user folders, deleting evidence, or modifying Product.

## Why this is required

Past reports attest Browser/Host process cleanup but not the removal of all generated task outputs. The V2 20-task campaign reported task fixture operations under `/private/tmp/phase13-real-harness-observational-v2/workspaces/` and a distinct Session workspace context under `/private/tmp/dsh-risk-advisor-compact-review-345a548/workspace`; those are observations, **not blanket deletion permissions**.

Other reports explicitly preserved untracked `lib/`, `node_modules/`, and `.vitest-cache/`; preserving these in prior phases was deliberate. The Web profile's installed Risk Advisor package and content-addressed rollback tarballs must also remain.

## Artifact classes and owners

1. **Disposable, freshly created per-run task roots**: owned by the current probe only, should be recorded before execution and fully cleaned after every task's needed evidence is retained, if no pending activity or retained fixture requires the root.
2. **Generated outputs inside preexisting fixtures**: delete or restore **only named changed paths** after identifying the exact task provenance and baseline; never delete the enclosing fixture or `KEEP.txt` merely because a task touched it.
3. **Ephemeral observer scripts, temp Chromium user data, Host process/listening socket**: clean the exact created resources on success, failure or blocked outcome, and verify termination.
4. **Build/dev generated `lib/`, `.vitest-cache/`, `node_modules/`**: not ordinary test-output roots; **do not auto-delete**. Inventory separately, and request explicit decision for cleanup of only safe disposable caches. `node_modules/` is an installed dependency tree, not garbage simply because untracked.
5. **Accepted reports, Product code, validation, checked-in fixtures, test evidence, real `$DSH_HOME` Session state, plugin package installed in Web profile, previous and current tarballs used for rollback, credentials**: protected; **never auto-delete**.

## New run requirements

Before a real task:
- Define an exact **per-run, per-task, unique disposable root** located in a bounded, task-specific OS temp area; avoid a broad workspace shared with other Sessions.
- Record ownership of created roots/files in an in-memory or safely bounded manifest. The manifest holds sanitized paths and ownership, not user data, and is only persisted as necessary for cleanup verification.
- Establish any seed-fixture inventory/hash if a task will operate on fixture-owned content.
- Use only the previously authorized Risk Advisor checkout, pinned Harness checkout (read-only), disposable test root, and narrow Web package metadata. No other macOS directories.

After each task, including stop/failure:
- Observe Finding and needed task evidence **before** cleanup.
- Confirm no Host/Agent/Tool activity still uses that root, and no pending clarification or unreviewed evidence depends on it.
- Delete **only exclusively owned** outputs and dedicated disposable root; for mixed fixture roots, revert/delete only proven task-created paths and preserve original seed.
- Verify exact owned root/paths are absent or pristine as required, with cleanup count and blocked reasons. Do not equate stopping the browser with cleaning output files.
- Always separately close ephemeral browser and the exact spawned Host.

For historical leftovers:
- Restrict initial work to **read-only inventory of specifically recorded roots** (no `find ~`, broad `/private/tmp` walks, home-directory globbing, or permission escalation).
- If an item is from the V2 campaign or an older shared workspace, treat it as protected until provenance, paused tasks, remaining evidence requirements, and exclusive ownership are verified.
- Never issue wildcard `rm -rf` or recursive deletion on a non-exclusive or symlinked root. Do not follow symlinks out of the owned root.
- Only delete individually proven disposable items with user-approved remediation scope. If ownership is ambiguous, leave intact and report exact blocker.

## Mac privacy gate

No Desktop, Documents, Downloads, iCloud Drive (`~/Library/Mobile Documents`), other private personal folders, unrelated repositories or system-wide discovery. A denied macOS access request is terminal for that operation, not a reason to retry or elevate. No Full Disk Access grant.

## Reporting and stop conditions

Every subsequent real functional probe must report:
- count of per-task created outputs/roots;
- count cleaned and exact verification method;
- retained/blocked objects with reason, excluding any sensitive paths in published report;
- Host/browser/process cleanup separately;
- summary status `CLEANUP_PASS`, `CLEANUP_PARTIAL`, or `CLEANUP_BLOCKED`.

`CLEANUP_PASS` is required for any **newly created exclusively owned test outputs** before calling a probe complete. Failed cleanup must not silently turn into 'test passed', and must not be worked around through broad permissions.

No Product, validation or Harness code mutation; no separate model/API work; no Phase 13.4. The current live-functional test caps and safety boundaries remain in force.
