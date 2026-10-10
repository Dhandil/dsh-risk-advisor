# Risk Advisor Phase 13.3 — Isolation Runtime Readiness Independent Review

**Verdict:** `RISK_ADVISOR_PHASE13_3_ISOLATION_READINESS_ACCEPTED_G0_ONLY`
**Independent reviewer:** ChatGPT.
**Risk Advisor expected main before archival:** `4aee2ad4035453bd2cf466121c3a3ce8bc12d2ef`
**Readiness report SHA:** `59bcb155bf4f2b50d8549dd1e302547fd8c0f789`
**Pinned read-only Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

## Verified report provenance
The independent implementation branch is exactly one commit ahead of the expected main, adding only `Phase13_3_Isolation_Runtime_Readiness_Report.md`. The original main is unchanged. The report records no Host, browser, Agent, provider, campaign, container/VM, adversarial file probe, product/Harness edit or test. This is an acceptance of the **truthfulness and completeness of readiness evidence**, not a demonstration of isolation. The Docker daemon assertion is from a read-only agent-observed local Unix-socket version query, not independently rerun by this reviewer.

## Source-confirmed read-access risks
Source inspection of the pinned Harness confirms:
- `packages/sandbox/sandbox-local/src/profiles.ts` constructs macOS Seatbelt with `(allow default)`, `(deny file-write*)` and write exceptions. Linux bwrap exposes the full root read-only; Landlock grants `readOnly: ['/']`. No per-task read-visibility boundary follows from `workspace-write`.
- `packages/fs/fs-sandbox/README.md` preserves host reads and directory listings. `packages/fs/tool-fs-search/src/search-core.ts:186–248` explicitly spawns ripgrep through unconfined Host `ctx.subprocess`.
- `packages/api/workspace-files/src/index.ts:223–254` explicitly permits Web file-read requests outside the workspace, subject to the Host filesystem backend.
- `packages/context/file-reference-local/src/search.ts` performs Host Node `readdir`. `packages/skill/skill-filesystem/src/index.ts:753–798` may read via `ctx.fs` or Node `fs` for trusted roots.
- `packages/preset/agent-presets/presets/standard/agent.cordis.yml` includes Bash, FS, grep/glob, skills, subagent/workflow; `apps/cli/src/profile-boot.ts` supports machine-local/profile overlays. **This shipped list is not the effective local Web roster**; user configuration was not inspected.
- `packages/shell/bash-sandbox/src/index.ts:89–130`: `danger-full-access` deliberately bypasses sandboxing for foreground/background paths; a task-private guest design must eliminate Host execution fallback regardless of per-call mode.

## Readiness and blockers
- `LOCAL_DOCKER_DAEMON_AVAILABLE`: the agent reports Docker client/server 29.8.2, Linux aarch64 server via pre-existing local Unix socket. No existing compatible offline image, private guest, task mount or built-Harness integration was proven. Docker socket is a privileged **controller-only** capability, never for Agent/guest.
- `PROFILE_NOT_VERIFIABLE_READ_ONLY`: effective Web profile, user-installed plugins, terminal activation, and command-time tool roster remain unknown.
- `GUEST_ROUTING_UNSUPPORTED`: pinned Harness has no unified task-private guest implementation for Bash, native FS, grep/glob, skills, Web File RPC, workflow/subagents, and descendants. A Bash-only Docker invocation is inadequate. Provider credentials, exposed host daemon socket, and network access must be addressed before any real-Agent work.

## Decision and staged next step
Accept R0.1–R0.6 for their **read-only readiness evidence**, including explicitly unknown R0.2 and unsupported R0.4; there was no obligation or authorization to read private configuration. The next stage is **G0: a tightly constrained, offline, synthetic-only Docker guest-visibility primitive**. G0 is allowed to establish *only* that a correctly mounted, disposable container can see task synthetic data but cannot see a real-present synthetic sibling under a verified mount namespace. It does **not** execute Harness, model-facing tools, Client, Agent or provider; it does not establish built-mode parity or unblock Phase13.3. If the compatible image is absent or safety prerequisites cannot be met, fail closed without pulling/building/starting anything.

Before *G1* (real pinned built-mode integration), separately freeze the complete Host/guest capability architecture and prove that the entire effective Tool roster is controlled; do not infer G1 acceptance from G0 alone.

**Retained status:** `PHASE13_3_SCOPE_REPAIR_BLOCKED`, `REAL_AGENT_GENERALIZATION_UNVERIFIED`. Previous Scheduler Symbol, built-mode parity and public Finding observability remain unverified.

**Final disposition:** `RISK_ADVISOR_PHASE13_3_ISOLATION_READINESS_ACCEPTED_G0_ONLY`.
