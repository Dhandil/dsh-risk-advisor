# Risk Advisor Phase13.3 — Isolation Runtime Readiness: Read-Only Instructions

**Agent:** Codex. **Acceptance:** ChatGPT independent review.
**Risk Advisor starting main:** the verified docs-only baseline carrying `Phase13_3_File_Read_Isolation_Preflight_Independent_Review.md`.
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`.
**Authority:** `Phase13_3_File_Read_Isolation_Preflight_Independent_Review.md` and the accepted `Phase13_3_File_Read_Isolation_Recovery_Preflight_Freeze.md`.

## Purpose

Close only the TWO operational fact gaps left by the accepted read-only design Preflight: **effective Web profile / Tool roster** and **already-running local guest-runtime availability**. Reconcile the Host-vs-guest execution-world capability map; no implementation, installation, security probe or Agent Campaign.

## Readiness gates

**R0.1 Baseline.** Sync origin/main, record exact SHA and pinned Harness, confirm tracked state clean without modifying other worktrees, `~/.dsh`, Sessions or old blocked runs. Create an independent branch/worktree; only the named docs-only Readiness Report may be committed.

**R0.2 Effective Web roster.** Follow the pinned `apps/cli/src/profile-boot.ts` layer order and Web/standard preset source. Inventory Bash (foreground, background, persistent), native FS read/stat/list, grep/glob, other filesystem search, terminal/PTY, subagents/workflows, user-enabled plugins and escalation paths. Distinguish **shipped, effectively verified, disabled, and unknown**. Only use safe sanitized static inspection or pre-existing read-only metadata. Never print, copy, publish or retain raw user-level `cordis.patch.yml`, credential sources, private Workspace/Session paths, prompt/user content or secrets. If effective roster cannot be verified without launching/modifying Host or exposing sensitive config, return `PROFILE_NOT_VERIFIABLE_READ_ONLY`; continue only independent noninvasive tasks, do not assert full roster.

**R0.3 Local guest readiness.** Inspect existence/version of local Docker/VM CLI and local context metadata, restricting daemon queries to an already running, verified local Unix socket. Query only coarse daemon availability/version and supported architecture if this will not activate Desktop, connect remotely or expose unrelated container/image metadata. If remote context, socket absent or auto-start risk: `GUEST_RUNTIME_UNVERIFIED`. Do NOT execute `docker run`, `docker ps`, `docker pull`, `docker build`, `docker images` or VM start, and do not enumerate third-party containers.

**R0.4 Coherent capability seam.** Produce an execution-world routing matrix for **all source-identified and locally observed file readers**, subagents, terminal, workflow and subprocess descendants. Mark each Host/guest mode as currently implemented / unsupported / design proposal. Identify how read/list, write, child, symlink, runtime deps, policy escalation and denied/unsupported modes fail closed. No Bash-only remote proposal; no silent fallback to Host `ctx.fs` or `ctx.subprocess`.

**R0.5 Safe future synthetic probe.** Specify minimum prerequisites for a disposable task-private guest with **no** HOME/user project/Campaign/credential/Docker socket mounts, default-deny egress, a trusted-controller attested sibling synthetic decoy outside the guest, in-task positive read/list/write, outside negative via every enabled reader, background/child/symlink/parent traversal, fail-closed teardown and sanitized evidence. This is a design checklist only — **DO NOT RUN**.

**R0.6 Open-blocker ledger.** Keep `PHASE13_3_SCOPE_REPAIR_BLOCKED` and `REAL_AGENT_GENERALIZATION_UNVERIFIED`. Preserve the two 5/20, 23-Tool partial runs and V2 20-Session /129-Tool unscorable results. No real Agent eligibility inferred; list Scheduler Symbol identity, built-mode parity and Finding observability as unresolved.

## Hard prohibitions

No installation, permission/settings change, Docker Desktop/daemon activation, VM/container creation, read-boundary synthetic/real probe, Host/browser/Agent/provider/API call, user-profile mutation, test/full, network package fetch, reading contents of private files, secrets or other Campaign data, cleanup, source edits or main advancement. An already-running verified **local** Docker daemon may be queried for version/availability only, never remote or owned workload metadata. If in doubt, classify UNKNOWN and stop the affected gate.

## Deliverable and status

Produce and push only `docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Isolation_Runtime_Readiness_Report.md` on an independent branch. Include R0.1–R0.6, exact evidence sources, redacted identity/status inventory, clearly marked `SHIPPED / EFFECTIVE / UNKNOWN`, runtime readiness and the required guest/Host boundary diagram or table. No executable acceptance or test result.

Return `RISK_ADVISOR_PHASE13_3_ISOLATION_RUNTIME_READINESS_READY_FOR_ARCHITECTURE_REVIEW` if a useful truthful report is complete even with explicitly classified unknowns; or `RISK_ADVISOR_PHASE13_3_ISOLATION_RUNTIME_READINESS_BLOCKED_<GATE>` if no reviewable evidence can be assembled. Include remote report SHA, exact path, roster confidence, local guest-runtime status. Neither status authorizes synthetic probe or real Agent Campaign.
