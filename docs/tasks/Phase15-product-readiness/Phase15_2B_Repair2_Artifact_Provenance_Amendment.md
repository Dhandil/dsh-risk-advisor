# Risk Advisor Phase 15.2B Repair2 — Source-Bound Artifact Provenance & Conditional Activation Amendment

**Decision:** `RISK_ADVISOR_PHASE15_2B_REPAIR2_PROVENANCE_AND_CONDITIONAL_ACTIVATION_AUTHORIZED`  
**Architecture/acceptance:** ChatGPT. **Executor:** zcode.  
**Starting main:** `d326d0a228b53b89b402161094ac52343e48943a`  
**Accepted product-source ancestor:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`  
**Current built Client SHA:** `06b790cf721dbe2391c1249182b8da71a359eaf4032d062527316f4ae374e735`  
**Historical Phase14.6 Client SHA:** `52b467dd445b73435b55a8c3dd71aa18a40acce8bbd0616587199350c5c97fe3`  
**Existing target:** `/Users/tongxin/.dsh/profiles/web`

## Intent and supersession

Repair1 proved local build execution succeeded but stopped because the new bytes differ from a *historical* accepted Chrome-smoke artifact. Preserve historical SHA as evidence for that specific prior build, but **do not impose cross-directory byte-reproducibility as a new acceptance rule**. This amendment replaces only Repair1's literal historical-Client-hash equality gate. The prior B0–B2 backup, B4–B6 installation/activation, all user-authorized scope restrictions and the prohibition on pnpm dependency deletion remain mandatory.

Do not rebuild blindly. First inspect the exact **already produced** R2 bundle and source/provenance inputs.

## P1 — Bounded read-only provenance diagnosis

1. Freshly check `main == origin/main`, the accepted product SHA's ancestry and documentation-only subsequent diff, tracked-clean `src/`, build config, package and lock; pinned Harness SHA and tracked state; user-owned untracked assets intact.
2. Trace the **actual build graph** of the generated `lib/index.js` and `lib/client.js` back to current tracked `src/**`, CSS, `tsconfig.json`, `tsdown.config.ts`, runtime/module-table externals, tool versions and **all build-affecting resolved dependencies**. Verify the current dependency graph for these paths is complete and appropriately represented by the tracked lock; the older virtual-store-lock entries are not automatically proof of a mismatch, but any *used* mismatched dependency is a blocker.
3. Inspect environment-sensitive inputs (including `NODE_ENV`, source-map path/source identifiers, CSS and emitted `lib/types` inputs) for plausible byte-variation causes. Separate supported fact, plausible explanation and unknown; do not invent a byte-diff against absent Phase14.6 bundle bytes. No need to find an exact byte-level explanation if a complete current-source-to-output provenance can be positively established.
4. Verify fixed Host/Client registration, `window.__ModuleLoader__.load` envelope, bundled CSS, expected slots, no accidental runtime Node import and no undeclared external/prohibited network/provider behavior. Use a **bounded offline local bundle/module-loader smoke** only if its locally installed runner is independently verified and it cannot mutate Profile, start Agent or use an external provider. Record exact command/result. Do not run Canonical Full or an open-ended test suite.
5. New Client and Host are new **candidate artifacts**; attest them by exact hashes and source closure. If provenance remains incomplete, STOP. Do not substitute matching file sizes, version strings or report narratives as proof.

## P2 — Conditional pack gate

Only when P1 passes: package the already built source-mapped output using the previously authorized `pnpm pack` path. Before running, check permitted lifecycle scripts/possible writes and confirm the original Profile and backup have not changed. If pnpm prompts for module removal, install/repair or an unapproved script: STOP; do not bypass the guard or switch to another packager. Attest tarball SHA and its actual Host/Client member SHA against the P1 outputs. Keep the prior artifact intact.

## P3 — Conditional existing-web installation and activation-only

Only after P1/P2 PASS and fresh P0–B2 safety/ownership/backup revalidation, carry out the already user-authorized, exact-scoped Risk Advisor-only update using supported Harness plugin management. Existing private backup manifest SHA-256:
`8ae9d01c441ed5ca6adf9d19b53668bfe5e8f1d3f3f65826b377a77c7826bae4`.
If any unrelated package selection, lockfile/dependency graph, bundle order, permission, script or file write would change, STOP and safely recover. Start only task-owned normal Harness Web Host/Client if no user-owned process needs interruption. Verify actual installed bundle hashes, selected/loaded Host and Client identity and registered slots/routes; distinguish direct observation from static proof. No Agent, Tool, provider, native-approval exercise, synthetic Finding, recall claim or Phase13.3 work. Close only task-owned resources.

## P4 — Reporting and Git

Add exactly one sanitized `docs/tasks/Phase15-product-readiness/Phase15_2B_Repair2_Execution_Report.md`, with P1/P2/P3 outcomes, hashes, any found environment cause/uncertainty, exact backup integrity, touched files, restored vs retained state, and explicit not-run items. Commit+push directly on `main`, no branches/worktrees, do not rewrite earlier reports. Preserve `lib/`, `node_modules/`, `.vitest-cache/` and prior backups.

**Success return:** `RISK_ADVISOR_PHASE15_2B_REPAIR2_ACTIVATION_READY_FOR_ARCHITECTURE_REVIEW`.  
**Blocker return:** `RISK_ADVISOR_PHASE15_2B_REPAIR2_BLOCKED` with first failing gate.  
Only an independent review may say `ACCEPTED`.

No authorization for code changes, dependency reinstall/clean, new plugin architecture, additional profiles, model calls, or a broader real-Agent campaign.
