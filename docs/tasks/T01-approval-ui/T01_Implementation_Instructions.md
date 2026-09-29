# T01 — Approval Additive UI / Single-Slot Coexistence | Codex Implementation Instructions

**Task ID:** `T01-approval-ui`  
**Read first:** sibling `Architecture_Freeze.md`; then `docs/baseline/README.md`, the Architecture v1.2-r1 sections 3.3, 31–34, 46/R1, and the Test Matrix sections 15/J1 and 18/R1.  
**Starting remote:** `https://github.com/Dhandil/dsh-risk-advisor.git`, expected `main @ 5e54baa33703f8c457239811c57ce274fac664a5`.  
**Local workspace:** `D:\Harness\harness-plugin\dsh-risk-advisor`; **Harness reference only:** `D:\Harness\deepseek-harness` at `ddefc45fbc7f8e46dd73185e68295696d1297887`.

## 0. Mission

Autonomously complete the bounded **R1 real Approval UI seam smoke** in the independent plugin repository. Prove an R1 fixture can render alongside **preserved original command-detail meaning** inside Native ApprovalPanel, using public API and one `single` slot winner; prove lifecycle/fallback. Do **not** build the full Risk Advisor and do not treat this R1 fixture as an actual risk assessment.

**Important finding:** pinned Harness `ui-chat` already registers `ApprovalCommand` in `conversation.approval.detail`; that slot is `single`, not `list`. A bare RA card selected as the winner can shadow the original command. Read the source and slot documentation; use the composed-detail strategy frozen in `Architecture_Freeze.md`. Do not silently drop the shipped detail.

## 1. Baseline and safe setup (before edits)

1. Inspect `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, `git remote -v`, `git ls-remote origin refs/heads/main`. Fast-forward safely only if no protected drift and the remote is the agreed canonical remote; do not reset/clean/rebase or overwrite local content. STOP if unexpected divergence.
2. Confirm plugin T00 documentation in `docs/baseline/`, `docs/governance/`, `docs/tasks/T00-repository-foundation/`; preserve historical docs and the untracked handoff copy.
3. Inspect Harness source HEAD, tracked/staged/untracked status in **read-only mode**. Preserve `build.log`, `install.log`, `t0-*` and any other user drift; do not modify the Harness worktree or permanent settings.
4. Source-read at this pinned commit: `ui-approval` client index, slot contract, ApprovalPanel; `ui-chat` registration and ApprovalCommand; public slots documentation and runtime registration winner/cleanup; public plugin packaging / test mounting conventions. Document the actual seam and supported priority. If they differ materially from the frozen source facts, STOP for architecture decision.

## 2. Implementation scope

A. In the independent plugin repo, create the **minimum real Browser extension / fixture and focused tests** needed to exercise `ctx.slots.inject('conversation.approval.detail', ...)` against actual Harness slot runtime. Use supported public imports/registration/lifetime semantics and inspect runtime priority rules rather than relying on unspecified equal-priority behavior.

B. The selected `single` renderer must contain:

```text
original approval command-detail semantics (when present)
+
Risk Advisor R1 TEST FIXTURE card
```

Use public session-scoped `useChat` / exported Chat types to retain the existing `ApprovalCommand` behavior: only the running Tool call with matching callId, valid `argsRaw`, and string `command` supplies the original command. Keep this logic client-local, bounded and narrowly tested; no private runtime import of shipped `ApprovalCommand`. Do not send raw arguments or command text to any provider/remote endpoint.

C. Fixture states: `PENDING`, `READY_SAMPLE`, `UNAVAILABLE`; always show `TEST FIXTURE / no real assessment`. Do not claim a LOW/HIGH hazard or real authorization. Guard fixture errors so that Native ApprovalPanel survives them. RA plugin must contain **no approval answer button** and no `pending.answer()` call.

D. Use Harness's own `PendingApproval`/native UI path in the test fixture, not a copy of ApprovalPanel. For a request without `callId`, the owner does not render the slot: test that native approval remains functional and record this seam limitation (do not claim a displayed degraded card).

E. Keep source code, tests, configuration and generated evidence inside the plugin repo only. Task docs under `docs/tasks/T01-approval-ui/`; Codex may create `README.md`, bounded test fixture/evidence and later `Execution_Report.md`. Do not copy the canonical baseline into the task folder.

## 3. Test matrix (run focused; record commands and observed results)

- R1-01 native baseline detail/approval before enabling fixture.
- R1-02 selected composite single-slot shows original command **and** RA fixture with pending `callId`.
- R1-03 `PENDING`→`READY_SAMPLE` with native buttons still available.
- R1-04 invalid/missing/unrelated/settled Chat tool data does not fabricate original command.
- R1-05 native resolution unmounts detail; a late fixture update cannot revive resolved Approval.
- R1-06 disable/dispose while pending restores shipped command detail and native usability without duplicates.
- R1-07 fixture failure does not crash or take over Native ApprovalPanel.
- R1-08 Session switch/rebind does not leak previous detail/card.
- R1-09 missing `callId` means detail slot absent; native approval still works (record as limitation).
- R1-10 Native Reject / Allow once each settle via native controls; no second answer from RA.

Required evidence hierarchy:

1. Pure command parity and fixture state component tests.
2. **Real Cordis slot runtime + real Native ApprovalPanel integration**, including competing `ui-chat` registration and disposal/fallback. This is an essential R1 gate; mocks alone are insufficient.
3. One safely mounted local Browser UI smoke **when a supported fixture/runner is available**. Do not alter production user settings or call a real provider just to manufacture an approval. If unavailable, mark `NOT_RUN` and document precisely; do not report full R1 PASS.

Do not start R2 collision/reuse/runtime-index tests, PTC Ledger, risk rules, real Host approval correlation, R3–R5 or benchmarks. No arbitrary numeric performance budget.

## 4. Audit and quality gates

Run in order:

```text
Implementation
→ Focused unit/component tests
→ Actual slot/native Approval integration
→ Architecture / Scope Audit
→ Typecheck, lint, format-check, relevant build/static checks
→ last applicable executable integration/smoke gate
→ Execution_Report.md
→ implementation commit + docs-only report commit (if not yet committed)
→ normal Push + verify origin/main SHA
```

Adjust the exact commands only to the actual project toolchain; document each one. Before any expensive/full suite perform all low-cost static gates. If no formal Canonical Full is defined for T01, mark `NOT_APPLICABLE`, **not PASS**. After the final executable gate, do not change executable files without re-running affected gates. When `git diff --check` reports inherited Markdown hard-break whitespace, classify precisely; do not claim PASS or rewrite historical text merely to hide it.

Scope check: no tracked/untracked Harness files written; no Host/Core changes; no native approval takeover; no `PendingApproval.answer()` in plugin source; no dependency on a private UI component; no raw secret logs; no production user profile drift. If a local test server is launched, shut it down and report any surviving process/port; do not run provider/network/privileged tests.

## 5. Git delivery and reporting (Codex is **not** acceptance authority)

Persist in `docs/tasks/T01-approval-ui/Execution_Report.md`:

- Outcome: `T01_R1_PUBLISHED_READY_FOR_REVIEW` / `T01_R1_PARTIAL` / `T01_ARCHITECTURE_DECISION_REQUIRED` / `T01_BLOCKED` / `T01_FAILED`;
- plugin/Harness baselines; exact changed-file manifest and source/behavior decisions about the occupied `single` slot;
- each R1-01..10 with PASS/FAIL/NOT_RUN, real commands, test counts, Browser evidence if any, negative/limitations;
- actual static/architecture/scope gate results; explicitly record real providers=0 and R2–R5=NOT_RUN;
- final executable **Tested SHA**, implementation commit SHA, docs-only report commit SHA, final remote SHA and exact remote verification;
- preserved drift, cleanup, unresolved risks, and STOP statement.

Never generate an `Acceptance_Report.md`, never independently announce `ACCEPTED`. Source/test implementation must be committed to this independent plugin repository, and the final report committed and pushed. Verify `git ls-remote origin refs/heads/main` equals intended `HEAD`, without force.

**STOP and escalate** on any violation of frozen architecture, conflict with shipped command semantics, inability to make native UI survive fixture crash/unmount, need to edit Harness Core/settings, inability to mount a genuine public slot path safely, unexpected remote divergence, destructive operation, or missing test prerequisites. Preserve evidence; if safely possible, publish a non-destructive execution report with `PARTIAL`/`BLOCKED` rather than fabricate a PASS.

## 6. Terminal handoff to ChatGPT Web

Return only the compact summary:

```text
Outcome:
R1 case status/counts:
Focused/static gate results:
Live Browser smoke: PASS / FAIL / NOT_RUN (reason)
Tested SHA:
Implementation SHA:
Execution_Report path:
Final origin/main SHA:
Known limitations / STOP conditions:
```

Stop at T01. ChatGPT Web will independently read the pushed remote diff/evidence and decide `ACCEPTED / REPAIR / STOP`. Do not begin R2.
