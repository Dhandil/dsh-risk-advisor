# Phase 13.3 File-Read Isolation Preflight — Independent Architecture Review

**Decision:** `RISK_ADVISOR_PHASE13_3_FILE_READ_ISOLATION_PREFLIGHT_ARCHITECTURE_ACCEPTED`
**Reviewer:** ChatGPT.
**Type:** **Documentation-only authorization for read-only Preflight**. NOT acceptance of read isolation, Harness modification, synthetic probe, real Agent campaign or new Risk Advisor feature.
**Starting accepted main:** `8e2bdf18e7c5fd9b4cb978625739647c5bfbf392`.
**Harness source inspected:** `deepseek-ai/deepseek-harness@ddefc45fbc7f8e46dd73185e68295696d1297887`.

## Read-only verified rationale

The previous Phase14 Completion and Open Validation Register were independently fetched from remote `main`. The historical scope-repair report was retrieved via its precise commit `defa64901450dc10eeafbcfcd18353f57eab8ba4` rather than presumed to be on main. It distinguishes the two 5/20-task, 23-Tool attempts from the separate 20-Session/129-Tool unscorable observation; no completed positive F1/F2 real-Agent qualification is established.

At the pinned Harness:
- `packages/sandbox/sandbox-local/src/profiles.ts` contains macOS `(allow default)` + `(deny file-write*)`, Linux `bwrap --ro-bind / /`, and Landlock `readOnly: ['/']`; all are consistent with **write-focused** confinement but **not** Task-root read allowlists.
- `packages/fs/fs-sandbox/README.md` explicitly says reads/listings/metadata remain `fs-local` behavior, not confined by `workspace-write`.
- `packages/sandbox/sandbox-policy/README.md` defines only `read-only`, `workspace-write` and `danger-full-access` **file-effect modes**.
- `packages/sandbox/sandbox/README.md` and `packages/sandbox/sandbox-local/README.md` describe same-world host/filesystem confinement and recommend a container/microVM/remote executor when a separate execution world is required.
- `SAFETY.md` warns the project is experimental, sandboxing does not guarantee isolation, and least privilege/disposable VM/container environments are recommended.

Thus a claimed `workspace-write` launch is not a sufficient confidentiality boundary. Merely moving the task root, hiding scoring files from the prompt, giving `HOME` a temporary location or trusting an Agent instruction cannot ensure that Bash or alternate Tool families cannot read outside task roots.

## Architecture decisions

**D1 — Investigate, do not build.** Authorized next task is an isolated, **read-only** feasibility preflight with P1–P8, source tracing, optional non-mutating environment inventory and a proposed synthetic-only decoy test. It performs no probe or model/Agent calls. No built-mode capability is presumed until proven.

**D2 — Per-task visibility is the actual security objective.** A VM/container or remote world is plausible only if Bash, `ctx.fs` and all other enabled file readers actually run within the same task-private accessible filesystem with no other Campaign files or host Home mounted. A persistent guest with all tasks mounted fails that isolation objective even if it isolates the host.

**D3 — Credentials and exfiltration matter.** If the entire Host runs within the task guest, any provider credentials, session logs or control metadata visible to a Tool subprocess are also within the adversary's accessible world. Preflight must treat credential location, mount graph and tool egress as explicit open design questions; no real credential or provider may be introduced in this stage.

**D4 — Synthetic decoy later, by independent authorization.** A future controlled proof must show the outside sibling decoy **exists**, is inaccessible even via parent traversal/symlink/subprocess and alternate read tools, and that legitimate task-local operations still work. No test on real user data, sibling campaigns, `~/.dsh` or private secrets. Fail closed for unsupported paths, incorrect built/source parity or manual escalation.

**D5 — Phase13.3 remains blocked.** The unresolved scope-repair, public-Finding observability, Scheduler Symbol identity and built-mode concerns remain open. This preflight cannot score F1/F2 or turn `UNSCORABLE` into `TN`; it cannot unblock a real Campaign.

## Handoff and status

Three docs-only preflight documents define the authority:
1. `Phase13_3_File_Read_Isolation_Recovery_Preflight_Freeze.md`
2. `Phase13_3_File_Read_Isolation_Preflight_Execution_Instructions.md`
3. `Phase13_3_File_Read_Isolation_Preflight_Architecture_Review.md`

Authorized execution returns a docs-only report in a separate branch for independent review; it must not change Harness or Risk Advisor products. Further implementation and synthetic testing require a new, explicit architecture authorization.

**Review result:** `RISK_ADVISOR_PHASE13_3_FILE_READ_ISOLATION_PREFLIGHT_ARCHITECTURE_ACCEPTED`.
