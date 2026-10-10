# Phase 13.3 Task-Private Guest G0 — Implementation Instructions

**Executor:** Codex. **Reviewer:** ChatGPT.
**Baseline:** the independently verified main that carries this document.
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887` (read-only).
**Authority:** `Phase13_3_Task_Private_Guest_G0_Architecture_Freeze.md`.

Start an independent branch/worktree with clean tracked state; preserve all existing worktrees and local files. Implement only validation-owned `validation/phase13/task-guest-g0/**`. Do not modify Product, accepted tests, existing Phase13 validation, Harness, package/dependencies or frozen docs.

First perform **safe local Docker + offline-image preflight**: verify a local, already-running daemon and explicitly verified available arm64 image without enumerating unrelated user workloads or pulling/building images. If unavailable or uncertain, stop as `G0_BLOCKED_NO_VERIFIED_OFFLINE_IMAGE`.

With an approved local image, execute the one frozen controlled synthetic proof G0.1–G0.10:
- Fresh validation-owned A + existing B decoy sibling, independently attested by controller before/after.
- Guest sees only A bind; restrict privileges, network, mounts and resources; no HOME/DSH/credentials/other Campaign/Docker socket.
- Positive task-local operations and negative sibling reads/listing via direct/parent/symlink/child paths; correlate with mount/namespace evidence, not ENOENT alone.
- Bound run and teardown; verify zero owned guest residue and external fixture unchanged.

No Harness Host, user Web profile, Agent, provider, Tool campaign, network fetch, daemon restart, arbitrary host-file probes or system modifications. If any Gate fails, stop immediately, preserve bounded diagnostic evidence, no automatic rerun and no riskier fallback.

Verify new validation code and sanitized evidence; preserve the original Run identity. Commit exact tested prototype first; add `Phase13_3_Task_Private_Guest_G0_Execution_Report.md` docs-only after it. Push independent implementation branch, never main. Include exact SHA, G0.1–G0.10 table, image provenance, synthetic mount/namespace attestation, no-egress, teardown and safety evidence, and retained Phase13.3 blockers.

Return `RISK_ADVISOR_PHASE13_3_G0_READY_FOR_ARCHITECTURE_REVIEW` or `RISK_ADVISOR_PHASE13_3_G0_BLOCKED_<FIRST_GATE>`. Do not infer actual Harness file-read isolation, `REAL_AGENT_GENERALIZATION_VERIFIED` or campaign restart.
