# Phase 13.3 — File-Read Isolation Recovery: Read-Only Preflight Execution

**Agent:** Codex. **Independent reviewer:** ChatGPT.
**Expected Risk Advisor main:** `8e2bdf18e7c5fd9b4cb978625739647c5bfbf392`.
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`.
**Authoritative:** `Phase13_3_File_Read_Isolation_Recovery_Preflight_Freeze.md`; `Phase13_3_File_Read_Isolation_Preflight_Architecture_Review.md`.

## Procedure

1. Sync the accepted `main` and confirm the architecture docs-only preflight baseline. Use a separate branch/worktree for the report; protect all existing `~/.dsh`, worktrees, retained blocked runs, caches, user sessions and private data.
2. **Read only** pinned Harness source and package docs. Trace the *actual Mac built-mode* route from Web/Agent Tool dispatch to Bash foreground/background, sandbox provider, `ctx.fs`, file-search/glob/read and terminal/subagent paths. Confirm all relevant tools available to the R1–R5 campaign; record gaps rather than assume a tool is disabled.
3. Audit the Mac Seatbelt policy and Linux bwrap/Landlock profiles specifically for **read/list** confinement. Distinguish write confinement from confidentiality confinement. Trace session mode overrides, user approval escalation and `danger-full-access` bypass; identify how an external task-private world would remain complete across Tool families.
4. Inspect available local container/VM tooling with noninvasive command/version checks only; **do not install, boot or reconfigure** anything. Assess guest-per-task/rootfs/data-mount design, synthetic-only credentials and network, actual built-mode Harness compatibility and isolation/teardown feasibility. Compare with same-world read-deny mechanisms and document fail-closed requirements.
5. Specify the future synthetic sibling-decoy access matrix and artifact/safety controls. Do not run the probe now. Keep historical Phase13.3 Provider/Scheduler/Client/built-mode limitations separate. Produce the named Preflight Report with P1–P8 and a recommended next authorization scope.

## Absolute prohibitions

No Host/Agent/provider calls; no real Campaign, synthetic attack execution, Tool execution or browser login; no normal user's `~/.dsh`, user-home content, other Project data or credential inspection. No edits to Harness, Risk Advisor `src/**`, `validation/**`, tests, package/config, frozen scoring or prior reports. No installs, OS permission changes, secrets, network package retrieval, cleanup, new `pnpm test` or Full. Do not promote candidate to main or self-authorize sandbox changes.

The final report is **docs-only**, pushed on its independent branch. Return one marker:

`RISK_ADVISOR_PHASE13_3_FILE_READ_ISOLATION_PREFLIGHT_READY_FOR_ARCHITECTURE_REVIEW`

or

`RISK_ADVISOR_PHASE13_3_FILE_READ_ISOLATION_PREFLIGHT_BLOCKED_<FIRST_GATE>`.

Include the report path, remote SHA, P1–P8 and chosen next **synthetic-only proposal**. State clearly: preflight design ≠ enforced boundary; `REAL_AGENT_GENERALIZATION_UNVERIFIED` remains open.
