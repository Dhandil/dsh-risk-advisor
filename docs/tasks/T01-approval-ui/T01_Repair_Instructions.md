# T01-R1 — Independent Review Repair Instructions

**Status:** ChatGPT Web independent review: `REPAIR` (2026-09-29)  
**Task directory:** `docs/tasks/T01-approval-ui/`  
**Plugin baseline for repair:** `origin/main @ 4c24c70fceb1633f51e5930174ab312ba311f5c9`  
**Last implementation/Tested SHA:** `6f3a46c62438ac60d0724b70268d7a552fc55250`  
**Harness read-only baseline:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Outcome target:** publish a focused repaired R1 implementation and its updated `Execution_Report.md`; **Codex is not acceptance authority**.

## 1. Scope / findings to repair

### F1 (functional) — Match shipped command handling for undefined tool root

`src/client/command.ts` reads `root.callId` without guarding `root === undefined`. The pinned shipped `ui-chat/ApprovalCommand.tsx` explicitly checks `root !== undefined` first. A preceding placeholder Tool node with no root can currently throw instead of allowing an eligible later running call to be found.

- Make missing/undefined root safe and preserve shipped behavior exactly (including malformed/non-string args, settled, unrelated, and first eligible running Tool call).
- Add parameterized negative/positive regression where an undefined root appears **before** the matching running call; verify both pure `commandForSnapshot` and composite rendered behavior.

### F2 (failure isolation) — Fixture errors must not erase native command semantics

`LocalErrorBoundary` currently encloses `FixtureBody`, which renders **both** the shipped-command-compatible content and the Risk Advisor fixture. A `useSyncExternalStore`/fixture render fault can therefore replace the whole composite with only `UNAVAILABLE`, losing valid native command information.

- Isolate the **fixture** failure boundary beneath a command presentation that is not owned by the fixture's error boundary. Preserve the original visible command when the fixture alone fails.
- Add integration assertion: valid `echo native` command + deliberately throwing fixture → native command still visible, `UNAVAILABLE` clearly marked, Native Reject/Allow controls available.
- Do not import private Harness components in production and do not override or duplicate native approval authority.

### F3 (evidence quality) — Prove the public render/binding path or qualify the claim

The current `tests/r1-slot.integration.spec.tsx` does use the real Cordis registry and actual `ApprovalPanel`, but manually declares the detail child on `root`, calls `entriesOfSlot()[0]`, manually invokes `entry.inject(sessionId)`, and supplies a hand-written `renderDetail` callback. It therefore does **not** establish a complete authentic `conversation.composer` child-slot declaration, session binding, or public slot rendering path.

- Add one bounded integration/smoke covering the actual documented owner/child render path and session binding, using existing Harness test helpers/public slot APIs where possible. Include switching between two session bindings (R1-08), native renderer coexistence, and dispose/restore behavior.
- Do not claim an actual Browser/Harness mount if the evidence is only jsdom plus manual adaptation. If the supported path cannot be exercised safely, report the precise blocker, retain `R1-08`/Live Browser `NOT_RUN`, and do not manufacture PASS.
- Check whether the package can actually produce the `dist/index.js` and `dist/client.js` paths declared in `package.json`. If a disposable live mount is feasible, use a build output confined to the plugin repo and a temporary profile/runner; **do not modify Harness Core, permanent settings, or user profile**. If not feasible, document packaging/loadability as unverified.

### F4 (durable governance) — Commit the task's frozen originals

The remote tree currently contains only `docs/tasks/T01-approval-ui/Execution_Report.md`. The supplied `Architecture_Freeze.md` and `Implementation_Instructions.md` were reported as local untracked files; per Task-Centric Documentation they must be preserved and included in the remote task directory.

- Verify both local documents are the exact supplied frozen originals. Stage them explicitly under `docs/tasks/T01-approval-ui/` without silently editing their frozen content.
- Store this repair instruction as `docs/tasks/T01-approval-ui/Repair_Instructions.md`.
- Preserve `docs/risk-advisor-current/` and all other user drift as-is.

## 2. Quality and reporting

1. Preflight both Git states; verify the expected plugin remote/baseline and read-only Harness HEAD. No reset/clean/rebase/force push.
2. Implement **only** F1–F4 and directly relevant R1 tests. No R2–R5, Host approval correlation, LLM, Ledger or risk rules.
3. Run focused unit/component tests, actual slot/native integration where safely possible, relevant typecheck/lint/build/static checks, scope audit, then the last available executable gate. Record precise commands, counts and outcomes. `Canonical Full = NOT_APPLICABLE` unless one was explicitly defined. Do not claim Browser PASS without an actual browser trace.
4. If a documented capability (authentic owner rendering, session rebinding, temporary Browser runner) is unavailable safely, mark that case `NOT_RUN/PARTIAL` and explain why. Do not broaden the architecture or change Harness Core to force a PASS.
5. Update `docs/tasks/T01-approval-ui/Execution_Report.md` as the Codex **execution/self-test report only**. Include the original partial evidence, repaired cases, Live Browser and R1-08 status, executable Tested SHA, exact commits, final remote SHA, and known limitations. No `Acceptance_Report.md` and no Codex `ACCEPTED` verdict.
6. Commit implementation and tests, then report-only/documentation changes separately where feasible; push to `origin/main` normally and verify local HEAD = `origin/main` = `git ls-remote origin refs/heads/main`.
7. Stop and return Outcome (`T01_R1_REPAIR_PUBLISHED` or `T01_R1_PARTIAL`/`BLOCKED`), changed files, test/check counts, report path, Tested SHA, final remote SHA. Wait for ChatGPT Web independent review.

## Explicit STOP conditions

Any required change to Harness Core, production/user settings, frozen architectural scope, replacement of native ApprovalPanel/answer logic, destructive Git/file operation, inability to preserve native command in supported public APIs, or unexpected remote divergence.

## GitHub review evidence

- [T01 implementation Tested SHA](https://github.com/Dhandil/dsh-risk-advisor/tree/6f3a46c62438ac60d0724b70268d7a552fc55250)
- [T01 execution report](https://github.com/Dhandil/dsh-risk-advisor/blob/4c24c70fceb1633f51e5930174ab312ba311f5c9/docs/tasks/T01-approval-ui/Execution_Report.md)
- [Current command projection](https://github.com/Dhandil/dsh-risk-advisor/blob/6f3a46c62438ac60d0724b70268d7a552fc55250/src/client/command.ts)
- [Current composite/detail error boundary](https://github.com/Dhandil/dsh-risk-advisor/blob/6f3a46c62438ac60d0724b70268d7a552fc55250/src/client/RiskAdvisorDetail.tsx)
- [Current integration](https://github.com/Dhandil/dsh-risk-advisor/blob/6f3a46c62438ac60d0724b70268d7a552fc55250/tests/r1-slot.integration.spec.tsx)
- [Pinned native command implementation](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/client/ui-chat/src/client/chat/ApprovalCommand.tsx)
