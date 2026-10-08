# Phase 13.3 — Bounded Historical Artifact Inventory and Future Cleanup

## Precondition

Sync main and read:
`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Owned_Test_Artifacts_And_Cleanup_Gate_Amendment.md`.

## A. Historical files: INVENTORY ONLY

- Without starting Host/browser/Agent/provider/Tool, inspect **only explicitly known** test-owned locations referenced in Phase 13.3 reports, such as the exact recorded V2 disposable fixture root (`/private/tmp/phase13-real-harness-observational-v2/workspaces/`).
- Establish whether each location exists, is symlinked, who created it, original seed versus generated output, and whether any paused Session or retained evidence still depends on it.
- Do not enumerate user Home, Desktop, Documents, Downloads, iCloud, or all of `/private/tmp`. Do not inspect unrelated data.
- Protect the distinct prior Session workspace `/private/tmp/dsh-risk-advisor-compact-review-345a548/workspace` unless exclusive ownership is independently established.
- Do not delete anything in this first historical inventory pass. Report specific safe deletion candidates separately from uncertain/protected items.

## B. Subsequent real task runs

- Before each Agent task, use an exact dedicated, named, unique disposable root and record task-owned output paths.
- After observing risk findings, clean **only** exclusively created/owned test files and roots, and verify absence; preserve fixture seeds, evidence, reports, profile, dependencies and rollback tarballs.
- End report must include `CLEANUP_PASS/PARTIAL/BLOCKED`; process cleanup is not filesystem cleanup.

## Boundary

No Product/validation/Harness/profile changes. Do not auto-delete `lib/`, `node_modules/`, `.vitest-cache/`, previous archived fixtures, or genuine `$DSH_HOME` Session logs. Do not run `rm -rf` on ambiguous directories, bypass macOS denied permissions, or ask for Full Disk Access.

Return a single docs-only inventory report with `RISK_ADVISOR_PHASE13_3_ARTIFACT_INVENTORY_READY_FOR_REVIEW` or `RISK_ADVISOR_PHASE13_3_ARTIFACT_INVENTORY_OWNERSHIP_BLOCKED`. Any separate cleanup of historical files requires explicit later authorization; do not interfere with an active Phase 13.3 probe.
