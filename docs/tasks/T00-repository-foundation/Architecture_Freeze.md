# T00 — Repository Foundation | Architecture Freeze

**Status:** FROZEN FOR IMPLEMENTATION (2026-09-29)

## Project boundary

- Independent plugin workspace: `D:\Harness\harness-plugin\dsh-risk-advisor`.
- Read-only Harness reference: `D:\Harness\deepseek-harness`.
- Canonical remote: `https://github.com/Dhandil/dsh-risk-advisor.git`; target branch `main`.
- The remote was confirmed newly created and empty when this instruction was authored. Reconfirm with `git ls-remote` before first push; don't assume it remains empty.
- Harness source checkpoint for prior static review: `ddefc45fbc7f8e46dd73185e68295696d1297887`.

## Task-centric documentation

One task = one complete handoff/acceptance directory:

```text
docs/
  baseline/                         # Cross-task source of truth, not task-specific duplicates
    risk-advisor-v1-architecture-v1.2.md   # Internal edition v1.2-r1
    risk-advisor-v1-spec-v1.2-r1.md
    risk-engine-contract-v1.0-r1.md
    risk-advisor-test-matrix-v1.0-r1.md
    risk-advisor-static-preflight-v1.0.md
  governance/
    Collaboration_Workflow.md      # Cross-task rule
  tasks/
    T00-repository-foundation/
      README.md
      Architecture_Freeze.md
      Implementation_Instructions.md
      Static_Preflight_Report.md
      Acceptance_Report.md
      evidence/                    # Only if there are useful local audit artifacts
    T01-approval-ui/                # NOT created/started in T00
```

- `risk-advisor-current/` in the local workspace is an input/handoff copy, not a second canonical baseline. Read it; preserve originals. Copy its formal documents to `docs/baseline/` with the exact filenames shown, checking hashes/content as needed. Do not stage the temporary handoff folder merely to duplicate canonical documents.
- `Static_Preflight_Report.md` captures the **local Codex preflight** already described by the user; `docs/baseline/risk-advisor-static-preflight-v1.0.md` is the **upstream static research/design report**, so the two are distinct.
- The Test Matrix still has a known stray `code-dispatch` reference near original L3 seam list (~line 217); replace it with current `tool/ptc-dispatch-start` / `tool/ptc-dispatch`. Historical text explicitly describing old→new naming can remain.
- Historical seven-Spike implementation instructions, if present, are `SUPERSEDED`, never executable baseline.

## Frozen scope

T00 is docs/repository foundation ONLY. No plugin implementation or R1–R5; no Harness Core changes; no provider/network/browser runtime invocation; no old seven-Spike harness; no reset/clean/force push and no destructive actions on user drift. GitHub publication and exact remote SHA verification are required for delivery.

## Acceptance

Verify correct canonical document contents/paths, no contradictory active `code-dispatch` seam, task-centric layout, recorded source baseline, explicit `R1–R5 PENDING`, Git status/staging audit, valid clean new `main` commit history, push to configured remote and `origin/main == intended final commit`. Report/test evidence must distinguish docs-only checks from runnable tests; do not claim Canonical Full or R1–R5 PASS.
