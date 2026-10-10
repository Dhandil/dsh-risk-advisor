# Phase 13.3 Isolation Runtime Readiness Report

**Result:** `RISK_ADVISOR_PHASE13_3_ISOLATION_RUNTIME_READINESS_READY_FOR_ARCHITECTURE_REVIEW`
**Risk Advisor baseline:** `4aee2ad4035453bd2cf466121c3a3ce8bc12d2ef`
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`
**Branch:** `codex/phase13-3-isolation-runtime-readiness`
**Scope:** Read-only readiness review. No Host, browser, Agent, Provider, Campaign, container, VM, file-access probe, or test was started.

This report closes neither the read-isolation finding nor Phase 13.3. `PROFILE_NOT_VERIFIABLE_READ_ONLY`, `PHASE13_3_SCOPE_REPAIR_BLOCKED`, and `REAL_AGENT_GENERALIZATION_UNVERIFIED` remain open. It is not authorization to implement a guest bridge or run a synthetic/real Agent probe.

## R0.1 — Baseline and preserved state

- `origin/main`, `git ls-remote`, and the new report worktree HEAD matched `4aee2ad4035453bd2cf466121c3a3ce8bc12d2ef` before edits. The report worktree was created independently from that exact commit and had a clean tracked tree.
- The Harness checkout is exactly `ddefc45fbc7f8e46dd73185e68295696d1297887`; tracked status was clean. The built entry `apps/cli/lib/bin.js` exists with SHA-256 `69c49c871735dc7ee81ec51f266bbec129f075fd5066e046374f4b13ab02a705`; it was not executed.
- Existing Risk Advisor worktrees, blocked Sessions/evidence, private Harness configuration, caches, and user data were not read, changed, or cleaned. No report is being pushed to `main`.

## R0.2 — Effective Web profile and file-access roster

**Effective local roster status: `PROFILE_NOT_VERIFIABLE_READ_ONLY`.** The pinned source explains why the shipped roster cannot stand in for the active Mac profile: profile startup layers a machine-local user patch after bundle/profile layers (`apps/cli/src/profile-boot.ts:185–215`), the Web default preset is `standard` but is user-changeable (`packages/bundle/web-app/README.md:66`; `cordis.patch.yml:505–516`), and custom presets/plugins may be added. Determining the actual active rows would require reading private profile/settings or starting the Host; neither was done.

The following is the **shipped source baseline**, not a claim that each item is enabled in the effective local profile. “Effective” is deliberately left unknown for all rows.

| Shipped surface | Source-grounded capability | Local effective status |
| --- | --- | --- |
| `tool-bash` | Standard preset enables Bash on macOS; supports foreground/background execution. `bash-sandbox` wraps local child processes, but `danger-full-access` bypasses that runner (`standard/agent.cordis.yml:45–47`; `tool-bash`; `bash-sandbox/src/index.ts:89–105,126–140`). | `UNKNOWN` |
| `tool-fs` | Standard preset enables `read`, `write`, and `edit`; `read_image` is conditional on the attachment service (`standard/agent.cordis.yml:57–58`; `packages/fs/tool-fs/src/index.ts:53–72`). These file operations use Host `ctx.fs`. The Web workspace API separately exposes directory listing. | `UNKNOWN`; `read_image` is additionally conditional |
| `tool-fs-search` | Standard preset enables `grep` and `glob`; the implementation launches packaged ripgrep using plain Host `ctx.subprocess.spawn` (`standard/agent.cordis.yml:60–63`; `packages/fs/tool-fs-search/src/search-core.ts:186–248`). | `UNKNOWN` |
| `tool-skill` + `skill-filesystem` | Standard preset exposes skill listing/loading. Skill discovery uses `ctx.fs` for ordinary roots and Node filesystem calls for trusted roots; loaded skill text is returned to or injected into Agent context (`standard/agent.cordis.yml:77–88`; `packages/skill/skill-filesystem/src/index.ts:12,165–177,753–797,846–885`; `packages/skill/tool-skill/src/index.ts:127–155,177–203`). The implementation can consult configured DSH and agent-skill roots; their actual values were not inspected. | `UNKNOWN` |
| Spawn/fork subagents and workflows | The standard preset enables spawn/fork child Agents and `workflow-ptc`/`tool-workflow` (`standard/agent.cordis.yml:158–228`). In-process children share the Host Cordis context (`subagent-spawn-in-process/src/index.ts:1–5,49–58`). Workflow PTC runs under the Session file policy; its VM is not an isolation boundary and file policy does not restrict network (`workflow-ptc/README.md`, File policy section). | `UNKNOWN` |
| Terminal / persistent shell | A terminal tool/backend and persistent Bash implementation exist. They use Host `ctx.terminals`/`ctx.subprocess` and the same file-effect sandbox when mounted (`terminal-bash/src/index.ts`; `tool-terminal/src/index.ts`; `tool-bash-persistent/src/index.ts:222–260`). `tool-terminal` is not listed in the shipped standard excerpt, so it is **not classified as effectively disabled**. | `UNKNOWN`; whether added by local layers is unverified |
| Web `workspaceFiles` Remote | Shipped Web bundle exposes a Host file API for bounded text/byte reads and directory lists. Its Session scope does not make reads workspace-confined: absolute paths outside the workspace are allowed by the Host `ctx.fs` contract (`packages/bundle/web-app/cordis.patch.yml:105–110`; `packages/api/workspace-files/src/index.ts:6–11,223–244`). This is a browser/API surface, not a standard model Tool. | Shipped Web surface; actual local mount not observed |
| `file-reference-local` | Shipped Web input completion scans the Session workspace with Node `lstat`/`readdir` and returns path candidates; it does not read file contents itself (`web-app/cordis.patch.yml:75–80`; `packages/context/file-reference-local/src/search.ts:1–11,284–305`; `src/index.ts:115–126`). Selecting a path can place that path in user prompt text. | Shipped Web source; local mount not observed |
| `tool-web` / external plugins | Standard preset includes Web search/fetch (`standard/agent.cordis.yml:253–260`). This is not a local filesystem reader, but it is a Host-side network/exfiltration route to consider in a synthetic proof. User-installed plugins remain unknown. | `UNKNOWN` |
| Shipped disabled/non-default rows | `tool-pwsh` is disabled on non-Windows; optional Codex/Claude subagent tools and `tool-ralph` are disabled in shipped standard (`standard/agent.cordis.yml:49–51,200–241`). | Shipped defaults only; local overrides unknown |

No row is marked `EFFECTIVE`: no live Host/plugin inventory was queried. Source default confidence is high for the pinned checkout; confidence in the active Mac roster is low/unverified. Environment switches such as `DSH_TOOLS_MODE` also make source-only inference insufficient (`web-app/cordis.patch.yml:32–38`).

## R0.3 — Mac local Docker/VM readiness

- The Docker CLI is installed and reports version `29.8.2` (build `7fc2dff`). In the current shell, no Docker endpoint/config/TLS override variables were set. The selected context metadata resolved to a local Unix endpoint; the socket already existed before the query.
- A daemon-only query over that existing local socket returned **server `29.8.2`, OS `linux`, architecture `aarch64`**. Only these coarse fields were requested. No Desktop/daemon was launched, and no container, image, volume, or workload inventory was requested.
- `podman`, `colima`, `limactl`, `qemu-system-aarch64`, `utmctl`, `vmrun`, and Apple `container` CLI were not found. No separate VM manager was verified.
- **Status:** `LOCAL_DOCKER_DAEMON_AVAILABLE`; Docker Engine responds locally. A disposable task guest, rootfs/image, mount plan, per-task lifecycle, network denial, and Harness integration were not created or tested. “Docker responds” is not “guest isolation ready.”

No private Docker config contents, endpoint path, credentials, image list, or container metadata are included in this report.

## R0.4 — Host/guest capability routing and gaps

| Capability or path | Current pinned built-mode execution world | Guest routing status | Required future treatment |
| --- | --- | --- | --- |
| Bash foreground/background and descendants | Host `ctx.shell` → local platform sandbox/subprocess. macOS Seatbelt profile is `(allow default)` plus write denial; it is not a read allowlist (`sandbox-local/src/profiles.ts:51–57`). | `UNSUPPORTED` | Guest-backed shell runner; all descendants/background jobs remain in the same task guest. No `danger-full-access` host fallback. |
| Native FS read/write/edit/read-image and backend list/stat | Host `ctx.fs`. `fs-sandbox` fences mutations only; local `cwd` is a resolution default, not containment (`fs-sandbox/README.md:28,46–50`; `fs-local/src/index.ts:60–65,150–175`). The shipped model-facing `tool-fs` has no standalone `list` Tool; Web `workspaceFiles` supplies directory listing below. | `UNSUPPORTED` | Guest-backed FS service for every operation; no Host `ctx.fs` fallback. Include conditional image reads. |
| `grep`/`glob` | Host `ctx.subprocess.spawn` starts ripgrep (`tool-fs-search/src/search-core.ts:186–248`). | `UNSUPPORTED` | Run search subprocess against the guest filesystem through the same per-task capability group. |
| Skills | Host skill provider uses `ctx.fs` and, for trusted roots, Node `fs`; skill text may enter Agent context. | `UNSUPPORTED` | Synthetic-only roots or disable skill discovery/invocation for proof. Never expose user/Home skill roots to a task guest. |
| Workflow/PTC | Node process under current Session write policy; VM does not confine filesystem access; child Agents call Host subagent registry. | `UNSUPPORTED` | Place workflow process and descendants inside the same guest, or disable workflow/subagent paths in the synthetic proof. |
| Subagents | Shipped spawn child Agent uses shared Host context and capability registry. | `UNSUPPORTED` | Inherit one task-scoped guest capability context; prevent child creation of a Host-world tool context. |
| Terminal / persistent Bash | If mounted, Host terminal/subprocess provider; local sandbox applies only its write-effect policy. | `UNSUPPORTED` | Route PTY and persistent shell into same guest or explicitly disable them in the exact proof roster. |
| Web `workspaceFiles` Remote and file-reference UI | Host API reads through Host `ctx.fs`; file-reference index uses Host Node FS for path discovery. These are Web UI/API surfaces, not standard model Tools. | `UNSUPPORTED` | Disable during synthetic proof or route to task-scoped guest APIs; prove API cannot name another Session/root. Keep user-facing Web access separate from model Tool access. |
| Web/network and optional plugins | Host network/plugin surface; exact local rows unknown. File sandbox does not constrain network. | `UNSUPPORTED / UNKNOWN` | Synthetic proof must disable external network-capable tools/plugins and set guest egress default-deny. |

There is no shipped task-private guest provider for `ctx.fs`, `ctx.subprocess`, skills, Web file RPC, or child Agents. A Bash-only container would leave direct readers and Host APIs outside the boundary. A full capability group is a design proposal only.

## R0.5 — Minimum future synthetic-only probe prerequisites

After separate architecture and execution authorization, and only after an implementation exists:

1. Use one disposable guest per task with no user Home, DSH config, project/worktree, campaign/session/evidence, Docker socket, secret, or Host process mounts. Enable no privileged mode, host networking, or host IPC. Egress is default-deny; external Web tools/plugins are disabled for the synthetic proof.
2. Keep the provider/control plane outside the Tool-readable guest and use no provider credentials or Agent calls in this proof. If a later real-provider design is proposed, its broker must not grant arbitrary Host filesystem, environment, RPC, or network-proxy access.
3. A trusted controller creates an on-task synthetic input and a real outside sibling decoy, attests the decoy exists before launch, and checks it remains unchanged after teardown. Prove positive on-task list/read/write first.
4. Under the exact built Web Tool roster, validate each enabled path: Bash direct/relative/absolute/parent/symlink/cwd and child/background access; native FS and conditional `read_image`; grep/glob; skill load/injection; workflow/subagents; terminal/PTY; and any host Remote/API path exposed to the task. A decoy denial requires mount-namespace/kernel evidence tied to the attempt plus the outside attestation; `ENOENT`, chmod, prompt rules, or filters alone do not pass.
5. Capture sanitized route, roster, mount, policy, network, denial, and teardown facts only. Kill the whole guest/process tree, verify no guest remains, and preserve the external synthetic fixture. Any unclassified reader, bypass, fallback, reachable egress, or uncertain teardown is fail-closed.

This checklist was not executed. Docker’s local availability does not waive implementation or proof requirements.

## R0.6 — Retained Phase 13.3 blockers and evidence

- The two R1–R5 partial runs remain **5/20 tasks and 23 Tool calls each**, stopped at R2-01 after scope escape. Their historical evidence and blocked Sessions were not rewritten or deleted.
- The separate V2 observation remains **20 Sessions / 129 Tool calls**, with no independently scoreable qualifying F1/F2 result. This is `UNSCORABLE`, not TN, and supplies no real-Agent recall/generalization proof.
- No Agent/Campaign was started and no event was rescored here. No successful file-read denial is claimed.
- Scheduler Symbol identity, built-mode parity/recovery, and public Finding/negative-result observability remain separate open issues.
- `PHASE13_3_SCOPE_REPAIR_BLOCKED` and `REAL_AGENT_GENERALIZATION_UNVERIFIED` remain open. Runtime availability alone does not unblock either.

## Gate disposition

| Gate | Status | Basis |
| --- | --- | --- |
| R0.1 | `PASS` | Exact baseline/Harness, isolated clean tracked worktree, protected state left untouched. |
| R0.2 | `PROFILE_NOT_VERIFIABLE_READ_ONLY` | Shipped roster documented; exact local effective rows cannot be verified under the privacy/no-Host constraint. |
| R0.3 | `LOCAL_DOCKER_DAEMON_AVAILABLE` | Pre-existing local Unix socket and coarse daemon identity responded; no VM/guest was created. |
| R0.4 | `GUEST_ROUTING_UNSUPPORTED` | Every relevant current path remains Host-side; no unified guest bridge exists in the pinned composition. |
| R0.5 | `DESIGN_ONLY` | Safe prerequisites specified; no probe performed. |
| R0.6 | `OPEN` | Historical counts and unresolved validation blockers preserved. |

Only this docs-only report is intended for the independent branch. No source, test, package, configuration, profile, Harness, or mainline change was made. No installation, container/daemon startup, VM startup, Agent/Provider/Campaign, Tool call, file-access probe, private profile contents, credential, user data, Campaign file, test, or cleanup was accessed. Docker context metadata was used only to classify the selected endpoint as a local Unix socket; its path and contents were not recorded.
