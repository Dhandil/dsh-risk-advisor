# Risk Advisor Phase 13.3 — File-Read Isolation Recovery Preflight Freeze

**Status:** `RISK_ADVISOR_PHASE13_3_FILE_READ_ISOLATION_PREFLIGHT_AUTHORIZED`
**Architecture and independent acceptance:** ChatGPT.
**Executor:** Codex.
**Starting Risk Advisor main:** `8e2bdf18e7c5fd9b4cb978625739647c5bfbf392`
**Pinned read-only Harness:** `deepseek-ai/deepseek-harness@ddefc45fbc7f8e46dd73185e68295696d1297887`.
**Unresolved validation:** `REAL_AGENT_GENERALIZATION_UNVERIFIED`.
**Blocking finding:** `PHASE13_3_SCOPE_REPAIR_BLOCKED`.

## 1. Purpose: an isolation feasibility decision, not a campaign

Locate a **supported, demonstrable file-read and directory-list isolation boundary for ordinary pinned Harness Tool execution**, sufficient to prevent one real-Agent task from inspecting neighboring task directories, campaign metadata and personal host data. This is a read-only **preflight and architecture options study**. It does **not** grant permission to install runtimes, change Harness, modify Risk Advisor/Oracle/scorer/validation code, create live Agent Sessions, contact a model/provider, or begin/resume Phase13.3. It does not establish real-Agent recall or true-negative coverage.

Preserve all previously blocked Campaign runs, ephemeral worktrees, Sessions, evidence directories, and `~/.dsh` unchanged. Prior Phase14 accepted baseline `8e2bdf18...` remains accepted and CLOSED.

## 2. Source-grounded problem statement

At the pinned Harness:
- `packages/sandbox/sandbox-local/src/profiles.ts`: macOS Seatbelt `seatbeltProfileArgs` uses `(allow default)` followed by `(deny file-write*)` and configured **write** exceptions; no read/list denial. Linux bwrap profile `--ro-bind / /` and Landlock `readOnly: ['/']` similarly grant reads of host-visible paths. None is a per-task read allowlist.
- `packages/shell/bash-sandbox/README.md` and `packages/sandbox/sandbox/README.md`: `read-only` and `workspace-write` define **file effects / writes**, not a promise to constrain file reads, directory listing or network. `danger-full-access` bypasses confinement.
- `packages/fs/fs-sandbox/README.md`: normal `ctx.fs` reads/listings behave as `fs-local`; policy fences only mutations. A protected Bash policy alone would also leave alternate model-facing read/search/glob tools to be considered.
- `packages/sandbox/sandbox-local/README.md`: this is same-world host filesystem confinement; docs advise a container or remote execution environment for a separately isolated world.
- Risk Advisor `Phase14_Open_Validation_Register.md` and the historical `Phase13_3_Minimal_Campaign_Scope_Repair_Report.md` at report commit `defa64901450dc10eeafbcfcd18353f57eab8ba4`: two real R2-01 attempts stopped at 5/20 tasks and 23 Tool calls after out-of-task discovery. Later run reached neighboring Campaign evidence and user-home filename search. No proven access denial exists; no third Campaign was authorized.

The term `workspace-write` is **not** a sufficient proof of confidentiality isolation. No alternate built mode, prompt, path-normalization wrapper, read-only mount, redirected HOME or task directory layout may be promoted to a security boundary on its label alone.

## 3. Candidate architectural options to compare, without implementing yet

**A — Preferred to evaluate:** Task-private execution world (isolated VM/container per task, or a fully reset per-task guest) with *only that task's synthetic input/output tree and necessary runtime* visible to the Agent's Bash/FS/search/glob and children. The outside sibling decoy and all other campaign truth, session data, host Home, other worktrees and credentials remain **unmounted**. The real `dsh` Host/Web process location and mounted Tool execution capabilities must be explicitly specified: running Host outside but Bash inside is insufficient if `ctx.fs` or another Tool can still read host files. If the entire Host runs in a private guest, its provider credentials and session storage inside that guest must also be treated as potentially readable by Agent tools; do not introduce real secrets while probing. Compare per-task guest reset vs persistent guest leakage.

**B — Alternative:** A locally supported, independently audited **per-tool read-denying** sandbox with exact allowlist for runtime dependencies and task tree across all file-reading Tool families, including children and symlinks. A custom Seatbelt profile or launch wrapper is *not preapproved*: determine if it is supported in the **actual pinned built-mode path** and fails closed. Refuse proof based only on source claims or an ad hoc `sandbox-exec` invocation outside Harness.

**C — Inadequate alone:** `workspace-write`, changing `cwd`, empty/fake `HOME`, model prompt restrictions, filesystem read-only mounts that remain readable, pre-execution string filters on Bash, removing scoring files from the prompt, or a Tool-call audit after the fact. These are defense-in-depth or containment observations, not read-confidentiality enforcement.

Do not select an option until a complete evidence plan covers the **actual enabled Tool roster and all execution paths**: foreground/background Bash, child processes, native `ctx.fs` read/search/glob, aliases/symlinks, relative/absolute/parent traversal, native approvals / permission escalation, network escape, and built-mode vs source-mode path. An alternate world must not mount a real user HOME or secret-bearing provider credentials that its Tool subprocesses can read. Network proof should be offline; provider connectivity is a later separate authorization.

## 4. Preflight scope and allowed actions

**Allowed:** read-only Git/source/docs analysis of exact pinned Harness, Risk Advisor, campaign reports and normal user machine capabilities; non-mutating local inventory (`uname`, `arch`, runtime/tool `--version`, OS/container/VM availability, route to executable) **only if safe and non-invasive**. Read existing metadata without reading contents of user's private files. Existing Test/Host/browser/User processes must not be interrupted. Draft an evidence-backed containment design and an exact future synthetic-only probe plan.

**Not allowed this round:** installing Docker/Colima/Lima/VM software; modifying Sandboxed Bash, Harness profiles/policies, built CLI, plugin, source, tests or `validation/phase13`; editing permissions, secrets, system settings, OS policies or PATH; launching Host/Agent/model/provider/Bash adversarial probes; reading user-home data; creating container/VM, mounting outside roots, network use for dependencies, deleting historical artifacts, running `pnpm test`, restarting Phase13.3 Campaign, or changing Risk Advisor main beyond this authorized docs-only preflight contract and eventual report.

The executor may create **one docs-only Preflight Report** on a separate branch/worktree after completing the analysis, with a sanitized capability/contract inventory. No full-test evidence expected, and no tested-executable SHA can be claimed for this docs-only task.

## 5. Research deliverables and decision gates

| Gate | Preflight deliverable |
| --- | --- |
| P1 | Exact Risk Advisor main and pinned Harness identity, clean tracked trees and protected user state enumerated without mutation |
| P2 | Source-to-runtime inventory for current Mac built-mode/shell/core/FS/search/glob/terminal/child processes, including actual confinement backend and escalation |
| P3 | Explicit demonstration by SOURCE that current write policy is not a read boundary; classify each file-reading path and explain exposure |
| P4 | Compare A/B/C options: feasibility for pinned built Harness, impact on provider/credentials/native Web, compatibility, operational complexity, and whether all tools live inside boundary |
| P5 | Define next separately authorized synthetic-only **decoy-sibling proof**: root layout, task-owned data, outside sentinel, direct and indirect read/list attempts, positive in-task operations, foreground/background children and fs/search/glob; all output sanitized |
| P6 | Explicit host-data/secret/network containment: no user-home mounts, no other task/campaign mounts, no provider credentials accessible to tools; resolve symlink and process escape assumptions |
| P7 | Kill/teardown and negative-evidence criteria: rejected read/list must be confirmed by kernel/mount namespace or verified confinement, not merely missing file or EACCES from fixture chmod; fail closed on unsupported, runner bypass or escalation |
| P8 | Status reconciliation for Phase13.3 5/20 + 23 Tool and V2 20 Session /129 Tool unscorable; preserve Scheduler Symbol/built-mode concern as separately unverified; no invented success or campaign restart |

Preflight **PASS** means only that there is a credible independently reviewable design and next probe proposal; it **does not** prove containment is enforced. If no credible candidate is feasible, report `RISK_ADVISOR_PHASE13_3_ISOLATION_PREFLIGHT_BLOCKED_NO_SUPPORTED_BOUNDARY`, not an artificial workaround.

## 6. Future probe acceptance conditions (not authorized by this contract)

Before a new complete real-Agent campaign, a subsequent independently authorized *synthetic-only* implementation/probe must, in the **normal pinned built-mode execution path**, prove:
1. a legitimate task-owned file can be read, listed and written where allowed;
2. direct and indirect access to a **real present synthetic sibling decoy** fails for Bash, background jobs and all enabled file-reading Tools; a mere `ENOENT` for an accidentally absent decoy is not proof;
3. parent traversal, absolute paths, symlinks, cwd changes, subprocesses, and privilege/escalation attempts cannot bypass this specific boundary;
4. neighboring Campaign files, real HOME, provider secrets, source/Truth/Oracle and other users' files are not visible in the Tool's execution world;
5. exit/teardown cleans the isolated probe, preserves user state and yields independently reviewable sanitized evidence; never infer perfect correctness from a single command.

Any run failing one path is `BLOCKED`. A valid positive synthetic proof permits only a *later* separate Phase13.3 safety review, not automatic real-Agent campaign resumption.

## 7. Output, Git and no self-acceptance

Use independent architecture/preflight branch and push the report for ChatGPT review. Final document: `docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_File_Read_Isolation_Preflight_Report.md`. Include P1–P8, exact source paths and SHA, per-tool table, candidate decision, unsupported/unknown contracts, safe decoy probe proposal and explicit open issues. No real commands or secrets in report. No Product or Harness tests, and no claim that `pnpm test` ran.

Return `RISK_ADVISOR_PHASE13_3_FILE_READ_ISOLATION_PREFLIGHT_READY_FOR_ARCHITECTURE_REVIEW` when research is complete, or a scoped `RISK_ADVISOR_PHASE13_3_FILE_READ_ISOLATION_PREFLIGHT_BLOCKED_*` code with the first failed gate.

Review then determines whether and how to authorize synthetic-only containment proof. `REAL_AGENT_GENERALIZATION_UNVERIFIED` and `PHASE13_3_SCOPE_REPAIR_BLOCKED` remain open in either outcome.
