# Risk Advisor Phase13.3 — File-Read Isolation Preflight Independent Review

**Decision:** `RISK_ADVISOR_PHASE13_3_FILE_READ_ISOLATION_PREFLIGHT_ACCEPTED_READINESS_REQUIRED`.
**Reviewer:** ChatGPT (independent remote GitHub source, report and commit-lineage inspection).
**Accepted report branch SHA:** `01e1e6ce9fdbadf54422d773ccfebebd886f23e4`.
**Original Risk Advisor main:** `916ed8a6c939e3c9437a7b58db38cf21b107fabc`.
**Pinned read-only Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`.
**Report:** `Phase13_3_File_Read_Isolation_Preflight_Report.md`.

## Verified provenance and acceptance scope

The remote report branch is exactly one commit ahead of the expected baseline; compare returns `ahead_by=1`, `behind_by=0` and **one newly added Markdown report**, with zero source, product, test, package, profile, pinned Harness or historical-document changes. Remote `main` remained the expected `916ed8a...` at review.

P1–P8 **PASS at preflight-design scope**; P2 has an explicit effective-Web-profile gap and P4 has an explicit unverified runtime. These are not silent failures and do not invalidate the requested read-only feasibility study. They **prevent** authorizing implementation/probe/campaign until addressed. The submitted report records no running Agent, provider, Tool probe, browser, sandbox experiment or tests. Its runtime availability and Host/source tool roster claims are appropriately distinguished.

The independent reviewer re-fetched exact pinned Harness source:
- `packages/sandbox/sandbox-local/src/profiles.ts` defines macOS Seatbelt `(allow default)` plus `(deny file-write*)`, Linux bwrap `--ro-bind / /`, and Landlock `readOnly: ['/']`. These do not implement task-root confidential read/list allowlists.
- `packages/fs/fs-sandbox/README.md` says reads, directory listings and metadata retain local host behavior; its fence governs mutations.
- `packages/fs/tool-fs-search/src/search-core.ts:186–248` explicitly labels ripgrep `ctx.subprocess.spawn` as unconfined. `cwd` is a default, not a read-access fence.
- `packages/preset/agent-presets/presets/standard/agent.cordis.yml` exposes ordinary Bash, FS, grep/glob, subagents and workflows as shipped composition, but the locally effective Web profile is overrideable via the `apps/cli/src/profile-boot.ts` layer. Shipped composition is **not proof of active effective roster**.
- `packages/shell/bash-sandbox/src/index.ts:89–130` bypasses `ctx.sandbox` entirely for explicitly selected `danger-full-access`; foreground and background calls must both be in the isolation test matrix.

The preflight correctly rejected cwd/HOME/prompt-only, write-confined Seatbelt, read-only host binds and Bash-only containers as adequate confidentiality boundaries.

## Architectural disposition and feasible direction

**Accept a disposable, task-private guest as the preferred *research* direction, not an implemented or verified capability.** Either every model-reachable file-reading Tool family must execute inside a task-specific filesystem view, or the Host must expose only audited, narrowly scoped remote capabilities whose own read/list path runs there. A Host-side `ctx.fs` reader or `grep/glob` unconfined subprocess is a bypass. Credentials, other Campaign truth, local user HOME, Docker socket and host IPC must be absent from the guest. A fully guest-hosted Harness still requires a safe credential/control-plane separation; no actual provider token shall be introduced into a synthetic proof.

A per-task guest **cannot be assumed deployable**: Docker CLI is reported present on the Mac, but no daemon/runtime was queried, no image/guest created, and no pinned built-mode integration tested. No supported task-private capability bridge is identified on current built Harness. The user-level Web profile/terminal and optional external-tool surface is not yet resolved. Treat both as prerequisites, not a request to narrow the frozen security requirement.

## Next authorized activity only

Authorize a **separate, strictly read-only** `Phase13_3_Isolation_Runtime_Readiness_Preflight` to establish:
1. effective installed Web profile *capability names/status only*, including user/profile/CLI overrides and the exact model-facing read/search/shell/terminal/subagent/workflow Tool roster; report only sanitized identifiers, never private config, paths, credentials or snippets. If determining the roster requires executing a user Host, writing profiles, or inspecting sensitive config content, mark `PROFILE_NOT_VERIFIABLE_READ_ONLY` and stop that gate, do not improvise;
2. already available Mac guest-runtime feasibility: installed binary existence/version, **local-only** daemon socket availability and non-mutating daemon metadata if safe; never start Docker Desktop/daemon, pull images, create containers/VM, inspect image contents or run synthetic reads. Do not access remote Docker contexts, remote daemons or unrelated live containers;
3. proposed Host-vs-guest execution seam with every file-reading capability assigned to a specific execution world, including child processes/pty/network, fail-closed omissions and parent/approval escalation; mark unimplemented/unknown wiring candidly;
4. the future independently authorized synthetic-decoy probe's exact minimum safe runtime/credential/privacy/teardown prerequisites, without executing it.

The companion `Phase13_3_Isolation_Runtime_Readiness_Execution_Instructions.md` provides the narrow execution contract. Only docs-only report addition, then independent review. No code, tests, Harness edits, Model calls, Agent, actual Guest, local files touched or Campaign restarts authorized.

## Explicit retained blockers

- `REAL_AGENT_GENERALIZATION_UNVERIFIED`
- `PHASE13_3_SCOPE_REPAIR_BLOCKED`
- Bash and alternative read/list confinement **not demonstrated**
- effective installed Web profile **not verified**
- actual Docker daemon/guest runtime **not verified**
- built-mode guest-capability integration **not implemented**
- Phase13.3 Scheduler Symbol identity, built-mode recovery, public Finding/negative-result observability **not revalidated**

**Review decision:** `RISK_ADVISOR_PHASE13_3_FILE_READ_ISOLATION_PREFLIGHT_ACCEPTED_READINESS_REQUIRED`.

This accepts the read-only research output, **not** file-read isolation, guest execution, Phase13.3 campaign eligibility, production safety or any test result.
