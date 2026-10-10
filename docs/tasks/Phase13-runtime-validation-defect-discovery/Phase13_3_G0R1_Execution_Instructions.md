# Phase13.3 G0R1 — Image Recovery and One Synthetic Proof: Execution Instructions

**Executor:** Codex. **Independent reviewer:** ChatGPT.
**Baseline:** current verified main containing this contract.
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887` (read-only).
**Authoritative:** `Phase13_3_G0R1_Image_Provisioning_And_Synthetic_Proof_Architecture_Amendment.md` and original G0 Architecture Freeze. Original G0 blocker remains historical.

1. Sync and verify exact main, create fresh separate G0R1 branch/worktree, preserve user Docker/Host state, existing worktrees and old blocked report.
2. Check Docker local Unix endpoint, pre-existing daemon and frozen image allowlist locally. Prefer already-cached, verified Linux/arm64+shell image. **Only if no listed image is present**, the user-approved exception permits exactly one `docker pull --platform linux/arm64 docker.io/library/alpine:3.20`; no retries, alternate registries or installations. Verify post-pull image ID, architecture and shell. Stop if unavailable.
3. Implement only `validation/phase13/task-guest-g0/**`. Before any G0 proof, commit the exact implementation SHA and do static preflight. No product, old validation/tests, package/lockfile, Harness or profile changes.
4. Run exactly **one new** synthetic-only G0.1–G0.10 proof: attested real A/B sibling, guest with only A bind; unprivileged/nonroot, `--network none`, readonly root, no Docker socket/HOME/other mounts; inspect owned guest configuration first. Prove task-local read/list/write and decoy B inaccessible via frozen vectors, including descendants. Use verified mount evidence as well as failures. Bound run and teardown; preserve any failure evidence, no automatic rerun.
5. Commit and push **docs-only** `Phase13_3_G0R1_Execution_Report.md` after exact tested SHA if code and proof ran. Include frozen Gate matrix, image immutable ID, controlled host pull vs zero guest egress, tested SHA or explicit NONE, native guest results, teardown/owned assets only, and all open Phase13.3 gaps.

Stop at first failed gate. Do not start Harness Host/Agent/Provider/real Campaign; do not run full plugin suite or import sensitive files; no secret/data or unrelated Docker inspection. No main advancement or self-acceptance.

Return:
`RISK_ADVISOR_PHASE13_3_G0R1_READY_FOR_ARCHITECTURE_REVIEW`
or
`RISK_ADVISOR_PHASE13_3_G0R1_BLOCKED_<FIRST_GATE>`.

Attach remote branch SHA, tested prototype SHA (or NONE), report path and image/mount/teardown evidence.
