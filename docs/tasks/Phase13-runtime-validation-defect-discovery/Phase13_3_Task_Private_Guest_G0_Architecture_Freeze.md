# Phase 13.3 — G0 Task-Private Docker Guest Primitive: Architecture Freeze

**Design decision:** `RISK_ADVISOR_PHASE13_3_G0_SYNTHETIC_GUEST_PRIMITIVE_AUTHORIZED`.
**Authority:** ChatGPT. **Executor:** Codex.
**Expected starting main:** the docs-only archival tip carrying `Phase13_3_Isolation_Runtime_Readiness_Independent_Review.md`.
**Pinned Harness, READ ONLY:** `ddefc45fbc7f8e46dd73185e68295696d1297887`.

## Goal and precise non-goal
Establish one repeatable **synthetic-only, offline per-task guest visibility primitive** using the verified already-running **local** Docker Engine on Apple Silicon. A trusted test controller creates two unrelated synthetic sibling trees under a fresh validation-owned temporary root: task A and decoy B. Only task A may be mounted in the disposable guest. The controller independently attests B exists *before and after* the guest, and the guest cannot read/list it via absolute, relative, symlink, cwd/parent or descendant operations; permitted task-local read/list/write works. Capture an independently reviewable and sanitized mount graph, command result classification, guest teardown and no-external-network facts.

**G0 intentionally excludes all pinned Harness Web, ctx.fs, grep/glob, skill, terminal, workflow, subagent, Agent, provider and user/real Campaign execution.** G0 can show Docker primitive containment only. Even a perfect G0 PASS cannot close Phase13.3, prove effective Web tools, authorize G1 or establish a production confidentiality boundary.

## Immutable protections and permission envelope
- Risk Advisor `main`, its accepted product and previous Phase13.3/14 reports unchanged; pinned Harness tracked/untracked tree, private local config, `~/.dsh`, user's HOME, other projects, Docker volumes/containers/images and blocked Campaign artifacts protected.
- The only allowed source additions are **validation-owned G0 assets** under `validation/phase13/task-guest-g0/`: a small self-contained controller/test and its exact run manifest, without package/lockfile changes or runtime dependency additions. No `src/**`, existing `validation/phase13/**`, tests, settings or `package.json` modifications. The final execution report is docs-only and follows the exact tested prototype SHA.
- Docker controller actions are scoped to *newly created, uniquely labeled* G0 container(s) and their own ephemeral test workspace. Docker is high-privilege; never mount the daemon socket, host HOME, real worktrees, user cache, credentials, existing Campaign or other containers. No `docker ps` or unrelated container/image/volume enumeration.
- **Offline hard gate:** confirm a compatible, already-local, nonprivileged Linux arm64 image using an **explicit known image ref supplied by a safe non-enumerating local query or fixed preapproved allowlist**. Never `pull`, `build`, install binaries, switch context to remote, or use an image by guessing. If no suitable image can be verified safely: `G0_BLOCKED_NO_VERIFIED_OFFLINE_IMAGE` and stop with report; do not create container.
- All operations against a verified *local* Docker daemon and a freshly generated temporary synthetic directory only; abort if command would reach a remote Docker endpoint or launch Desktop/daemon. Exactly bounded G0-owned containers, no reused user-owned guest.
- All network activity in the guest is disabled (`--network none`). No privileged/host PID/network/IPC/mount, no added Linux caps; use `--cap-drop ALL`, `--security-opt no-new-privileges`, `--read-only` rootfs, nonroot user, memory/PID/CPU bounds, tmpfs only if required. Mount only task A explicitly `rw` at an unambiguous guest path. Existing Docker daemon security rules are not bypassed; no host Docker socket mount.
- Fail closed on unexpected bind paths, unknown Guest filesystem/namespace state, unsupported offline image, observed external egress, absent outside decoy, privilege escalation, unstable teardown or unqualified bind mount. No fallback to unconstrained host shell, Host FS or `workspace-write`.

## Frozen proof matrix
| ID | Required result |
| --- | --- |
| G0.1 | Exact branch/worktree and pinned Harness identity, Docker local-only/coarse availability; image verified offline or fail closed |
| G0.2 | Trusted controller freshly creates synthetic A/B siblings; B existence/content sentinel independently attested before guest |
| G0.3 | Frozen Docker invocation contains only the A bind; read-only container root, restricted capabilities, no egress/host namespaces/sockets |
| G0.4 | Guest can list/read A and perform allowed bounded write to A; controller verifies expected contents only in new synthetic A |
| G0.5 | Guest cannot list/read the attested present B through absolute, parent, cwd, symlink, child/background shell; no real host paths probed |
| G0.6 | Controller attests exact mount/namespace boundary and absence of B bind; failure on B paired with this kernel-backed visibility evidence, not `ENOENT` alone |
| G0.7 | Guest network disabled, no provider/env secrets or exposed Docker socket, no host user path/real campaign mount; abort unknown |
| G0.8 | Deterministic timeout/kill and removal for exclusively G0-owned guest; attested B unchanged, no residual G0 process/guest; do not delete existing user assets |
| G0.9 | No Host/Agent/provider/Tool, no Risk Advisor product mutation, no external fetch; exact prototype SHA and isolated evidence recorded |
| G0.10 | Document PASS / BLOCKED honestly; no inference about Harness G1, live Web roster, file-read privacy for actual users or real-Agent generalization |

**Environment feasibility:** Readiness agent reports local Docker daemon 29.8.2 Linux aarch64, but did not verify an offline image or guest launch. G0 must not assume one exists.

## Scope of evidence and security limits
A G0 PASS is at most `DOCKER_TASK_GUEST_PRIMITIVE_PROVEN_SYNTHETIC_ONLY`: it does not certify the entire Docker implementation against a malicious privileged administrator, an untrusted image, or a compromised Docker daemon. The kernel/mount attestation and decoy B are scoped to this launched synthetic guest. G0 denial alone is not a reliable signal; a missed mount, absent decoy or fixture permissions error invalidates the test. No prompt, model, user data or real Agent file read is part of the proof.

Prior to G1, design and independently authorize an environment-coherent Harness capability boundary. All effective normal Web Tool families, including Host `ctx.fs`, Host `ctx.subprocess`, Web APIs, Skills and child/terminal/worlds, must be relocated, disabled with positive proof, or fail closed. Exact local user Web profile remains **UNKNOWN**; do not inspect confidential config or start a normal Host merely to infer it. Built-mode parity and credential broker require their own security review.

## Execution and publication
Use an independent branch/worktree from exact frozen main. Record a fresh test identity. Implement only the G0 validation files and run **one controlled G0 synthetic proof** after static/pre-execution gates; no real Campaign. A failed proof is retained diagnostically, not rerun automatically. If G0 passes, run relevant static/test checks for the new validation files; do not invent an `pnpm test` Full result. No product Full is mandated for self-contained prototype outside package tests. Report under `docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Task_Private_Guest_G0_Execution_Report.md`, committed docs-only after the exact tested prototype, pushed on the independent branch. Do not advance main or self-accept.

Return `RISK_ADVISOR_PHASE13_3_G0_READY_FOR_ARCHITECTURE_REVIEW` for a complete PASS evidence package, or `RISK_ADVISOR_PHASE13_3_G0_BLOCKED_<FIRST_GATE>` with deterministic blocker and no bypass. Phase13.3 remains blocked in either case.
