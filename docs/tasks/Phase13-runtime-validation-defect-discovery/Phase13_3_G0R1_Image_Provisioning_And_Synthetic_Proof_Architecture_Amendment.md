# Risk Advisor Phase 13.3 — G0R1 Image Provisioning and Synthetic Guest Proof Architecture Amendment

**Decision:** `RISK_ADVISOR_PHASE13_3_G0R1_IMAGE_RECOVERY_IMPLEMENTATION_AUTHORIZED`
**Architecture owner:** ChatGPT. **Executor:** Codex on user's explicit handoff only.
**Starting baseline:** docs-only `main` containing original G0 blocker report and independent review.
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`, entirely read-only.
**Original binding freeze:** `Phase13_3_Task_Private_Guest_G0_Architecture_Freeze.md`.
**Original G0 result:** `RISK_ADVISOR_PHASE13_3_G0_BLOCKED_NO_VERIFIED_OFFLINE_IMAGE`.

## 1. Single precise exception; not a retroactive PASS

Original G0.1 failed because none of `alpine:3.20`, `busybox:1.36.1`, `debian:bookworm-slim` was locally cached. The original G0 run and its docs-only blocked report remain unchanged and non-testable. This amendment creates a **new, separately versioned G0R1 identity**.

**Only exception to original Freeze:** one controlled, host-side Docker Registry pull of the **official Docker Hub Alpine image**, fixed command:
`docker pull --platform linux/arm64 docker.io/library/alpine:3.20`.
This is the sole authorized external registry operation for G0R1; it is explicitly distinct from guest network traffic, which stays disabled. No image enumeration, alternate tag/registry/mirror, install, build, `docker login`, daemon restart, or auto-retry. The user must deliberately give the executing agent the G0R1 handoff; preparing/publishing this architecture does **not** execute a pull.

If, at next preflight, a frozen-allowlist image is already cached, Linux/arm64 and an executable shell confirmed, **skip the pull** and pin the exact local image ID. Only otherwise may the fixed Alpine pull occur. If it fails or does not produce a Linux/arm64 image, stop `G0R1_BLOCKED_IMAGE_PROVISIONING`. Record immutable **image ID and, if present, RepoDigest** after provisioning; the tag is mutable and must not be described as a cryptographic pin chosen in advance. Retain the pulled image for user review; never clean image caches or other Docker assets.

## 2. Containment design and invariant boundaries

Run **at most one fresh synthetic G0 proof**, after a dedicated preflight ensuring Docker endpoint remains local Unix and engine already runs. One validation-owned temporary root contains *two real existing, fresh, harmless synthetic sibling trees*, A (task) and B (decoy); the trusted controller attests existence and sentinel B before and after guest creation. The guest's host bind allows **only A**, never B or their parent. No HOME, `~/.dsh`, repository, user files, Campaign metadata, credentials or Docker socket may be mounted. No host network/PID/IPC/mount namespaces, privileged flags or added caps.

Container confinement: Linux arm64, `--network none`, `--read-only` root filesystem, nonroot UID/GID mapped to the validation-owned A folder, `--cap-drop ALL`, `--security-opt no-new-privileges`, bounded PIDs/memory/CPU, and only required tmpfs (if any). Use a unique controller-owned label/name to limit cleanup to this G0R1 container. No external network reachability is allowed **within** the guest. The registry pull above is an explicitly bounded *host provisioning* exception and must be accounted for separately, not misreported as `external traffic: 0` across the entire run.

Before executing any guest command, verify exact inspected *owned-container* mount records (only A bind, no sensitive mounts), `NetworkMode=none`, capability and privilege flags; if any unexpected source, mount, mode, namespace or security property appears, stop before a read. The image itself is not trusted with secrets: pass none, leave all personal assets unmounted. Static controller checks cannot substitute for runtime mount attestation.

## 3. Required G0.1–G0.10 synthetic proof

Retain original G0.1–G0.10 semantics from the Freeze. The guest must demonstrate allowed A read/list/bounded write and prevented B read/list via direct exact path, `..` traversal, absolute host-decoy pathname, cwd/symlink resolution, foreground and background child shell (only shell/runtime binaries in the image). If a path is impossible to attempt in that image, classify that vector **UNPROVEN** and stop rather than pretend covered. The decoy exists on the host; match the guest-visible mount graph and container namespace isolation to that existence attestation. `ENOENT` alone, absent decoy, chmod-only denial, a prompt or a path string filter is not adequate evidence.

Use a deterministic, bounded controller test, with stdout/stderr sanitization and strict timeouts. The guest cannot access real host paths because they are unmounted, not because the Agent has been instructed to avoid them. Keep model/provider credentials outside. No Model, Web app, Harness Host, Risk Advisor plugin Tools, Agent or real Campaign is invoked in G0R1.

Any failed gate is `RISK_ADVISOR_PHASE13_3_G0R1_BLOCKED_<FIRST_GATE>`; no automatic second proof, looser flags, alternate image or fallback. If the one G0 synthetic proof passes, test the G0-owned controller and static gates only; do **not** claim a Product `pnpm test` Full or real security certification.

## 4. Source and evidence envelope

Only new files under `validation/phase13/task-guest-g0/**` may be implemented, with zero package/dependency/lockfile, `src/**`, existing test/validation, Harness, profile or prior Freeze changes. Isolated implementation branch/worktree. Tested prototype commit must be exact before G0 proof; controller can create/delete only its own **fresh synthetic fixtures and uniquely labeled guest**. It may not clear other containers, Docker images, build cache, historical worktrees, blocked Sessions or user data. Stop safely and report if its own teardown cannot be verified.

New execution report `Phase13_3_G0R1_Execution_Report.md`, committed docs-only after the tested SHA when one exists. Record preflight image absence/hit, exact single pull if used, image immutable ID/manifest provenance, selected guest configuration, G0.1–G0.10 evidence (distinguish local guest outcome from assertion), teardown and limitations. No raw host private path, HOME, credential, hidden Docker config, real user file or unrelated container metadata in report.

Push only the independent branch. No main merge/fast-forward until independent architecture acceptance. Do not self-authorize G1, general Tool guest routing or another real-Agent campaign.

## 5. Outcome and next architecture gate

PASS marker: `RISK_ADVISOR_PHASE13_3_G0R1_READY_FOR_ARCHITECTURE_REVIEW`.

Blocked marker: `RISK_ADVISOR_PHASE13_3_G0R1_BLOCKED_<FIRST_GATE>`.

Even if all G0 gates pass, subsequent work **must** design and independently validate task-scoped guest capabilities for actual pinned Harness `ctx.shell`, `ctx.fs`, ripgrep/subprocess, Web files, skills, terminals, workflows, children, escalation and effective Web roster. A standalone Alpine guest proof proves only a bounded container file-visibility primitive, **not actual Harness or Agent file-read confinement**.

Retain `PHASE13_3_SCOPE_REPAIR_BLOCKED` and `REAL_AGENT_GENERALIZATION_UNVERIFIED` throughout.
