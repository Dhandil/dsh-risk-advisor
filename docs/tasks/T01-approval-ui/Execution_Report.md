# T01 — Approval Additive UI / Single-Slot Coexistence

## Execution outcome

**Outcome: `T01_R1_REPAIR_PUBLISHED`**

The requested T01 repair scope is implemented and published for independent
ChatGPT review. F1 and F2 are repaired. The bounded public owner/child slot path,
session switch, native coexistence, and dispose/restore path pass in jsdom. Live
Browser smoke remains `NOT_RUN`; package loadability remains `UNVERIFIED` because
the available multi-entry build emits `client/index.js` while `package.json`
declares `dist/client.js`. That existing packaging mismatch was recorded rather
than expanded into this repair.

Codex did not generate an `Acceptance_Report.md` and does not declare
`ACCEPTED`.

## Repair scope and safety

| Item | Result |
|---|---|
| Repair instructions | `docs/tasks/T01-approval-ui/Repair_Instructions.md` read and followed |
| Plugin remote | `https://github.com/Dhandil/dsh-risk-advisor.git` |
| Plugin branch | `main` |
| Pre-repair sync | `git fetch origin main` passed; local `HEAD == origin/main == 4c24c70fceb1633f51e5930174ab312ba311f5c9` |
| Harness reference | `D:\Harness\deepseek-harness`, `master @ ddefc45fbc7f8e46dd73185e68295696d1297887` |
| Harness mutation | None; working tree and diff remained read-only |
| Reset / clean / rebase / force push | Not used |
| Providers / network / privileged execution | `0` |
| R2–R5 | `NOT_RUN` |
| Canonical Full | `NOT_APPLICABLE`; no T01 Canonical Full was defined |

The existing `docs/risk-advisor-current/` directory was not modified or staged.
Harness drift was preserved: `build.log`, `install.log`, `t0-model.txt`,
`t0-remote.txt`, `t0-session.txt`, and `t0-storage.txt`. No Harness Core file was
changed.

## Repair evidence

### F1 — undefined `root` guard

`src/client/command.ts` now skips an undefined `ToolChatData.root` before reading
`callId` or checking the running-call shape. The unit regression places an
undefined root before a matching running call and verifies both the pure command
projection and composite React presentation return the later command without
throwing.

### F2 — fixture fault isolation

`RiskAdvisorDetail` now keeps command presentation outside the local fixture
error boundary. Only `FixtureBody` is protected; a fixture snapshot fault renders
the explicit `UNAVAILABLE` fixture state while the native command and shipped
Native ApprovalPanel controls remain usable. The integration test deliberately
throws from the fixture snapshot and asserts the native command, Reject, and
Allow once controls remain available and Reject still settles the approval.

### F3 — bounded public-path integration

The integration test uses a real Cordis `Context`, real `SlotRegistry`, the
shipped Native `ApprovalPanel` and `ApprovalCommand`, the shipped public
`createSlotRenderer()`, `slots.install()`, `slots.installLocale()`,
`slots.installScope()`, `slots.register()`, and `slots.renderSlot()` path. Two
session references use session-scoped bindings with distinct chat snapshots.

- Native priority-0 detail is visible before the plugin is enabled.
- Enabling the plugin renders the RA priority-`-100` detail in the same detail
  cell and preserves native controls.
- Switching the public owner from `session-1` to `session-2` changes the
  session identity and command projection to the second session.
- Disposing the plugin restores the shipped Native `ApprovalCommand`; the
  second session remains visible and settles through Native Reject.

This is a bounded jsdom public-path result: **R1-08 session switch/rebind =
PASS in the supported test harness**. Live Browser smoke and a real deployed
Harness session rebind are **`NOT_RUN`** because no disposable Browser runner was
available without plugin installation or production-setting changes.

The package build check compiled both source entries successfully with tsdown,
but emitted `index.js` and `client/index.js` (plus declarations), not the
declared `dist/client.js`. Therefore package export/loadability is recorded as
**`UNVERIFIED`**, and no out-of-scope packaging change was made.

### F4 — frozen documents and history

The following exact frozen originals were explicitly staged with this repair
evidence; their SHA-256 values were verified before staging:

| Document | SHA-256 |
|---|---|
| `T01_Architecture_Freeze.md` | `CCA134AF63D8C70F65A02193F4CE2E2F98586468914FD8EB310FE59D6E3AC87C` |
| `T01_Implementation_Instructions.md` | `BB594CD68A0B51B2FF796359B64A3006DF14D71EE695B8E05DD0BC74C701F0F2` |
| `Repair_Instructions.md` | `D9A387EF1326148F55B2B1750E815F36A8B38306B36F759DB793FB56F09755F7` |

The previous T01 partial evidence remains in Git history and in this report's
baseline below; no acceptance wording was retroactively substituted.

## Preserved prior evidence

The prior implementation and test evidence remains valid and was retained:

- Previous implementation commits: `0f2ec2a729628dac9d1b049a19dcebb786349259`,
  `6f3a46c62438ac60d0724b70268d7a552fc55250`.
- Previous report revisions: `968adff1fbf979c5d65c7e608861ed134e299fd7`,
  `4c24c70fceb1633f51e5930174ab312ba311f5c9`.
- Previously passing R1 cases remain covered; this repair adds the undefined
  root, fixture isolation, public owner/child session switch, and restore
  evidence without changing the frozen single-slot design.

## Executed checks

All checks below ran against the implementation commit before the report-only
commit:

```text
D:\Harness\deepseek-harness\node_modules\.bin\vitest.cmd run --config vitest.config.ts
=> PASS — 2 test files, 9 tests

D:\Harness\deepseek-harness\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json
=> PASS (TS_EXIT=0)

D:\Harness\deepseek-harness\node_modules\.bin\oxlint.cmd --config D:\Harness\deepseek-harness\.oxlintrc.staged.json src tests
=> PASS (OXLINT_EXIT=0)

D:\Harness\deepseek-harness\node_modules\.bin\tsdown.cmd src/index.ts src/client/index.ts --out-dir .t01-build-check --format esm --platform neutral --no-config
=> PASS compilation; output paths were index.js and client/index.js, so declared dist/client.js remains UNVERIFIED

git diff --check
=> PASS

git diff --cached --check -- src tests tsconfig.json vitest.config.ts docs/tasks/T01-approval-ui/Execution_Report.md
=> PASS for the implementation and report staging set

git diff --cached --check -- docs/tasks/T01-approval-ui/T01_Architecture_Freeze.md docs/tasks/T01-approval-ui/T01_Implementation_Instructions.md docs/tasks/T01-approval-ui/T01_Repair_Instructions.md
=> Known trailing-whitespace diagnostics only; these three frozen originals were staged byte-for-byte and were not normalized

Harness read-only audit
=> PASS; no Harness Core changes
```

The fixture-fault tests intentionally exercise React's error-reporting path, so
the expected fixture diagnostic stack is printed while the assertions pass. The
final integration run reported no unhandled test failure.

## Git delivery

| Deliverable | SHA / result |
|---|---|
| Tested SHA | `ae5d737e5a8316b097700903aa06983a5af8bd4e` (`fix(t01): repair R1 review findings`) |
| Implementation commit | `ae5d737e5a8316b097700903aa06983a5af8bd4e` |
| Evidence/report commit | Printed by the final `git rev-parse HEAD` verification below; report content is otherwise final before that report-only commit |
| Push | Normal `git push origin main` required after evidence commit |
| Final local/remote SHA | Printed by final `git rev-parse HEAD`, `git rev-parse origin/main`, and `git ls-remote origin refs/heads/main`; all must match |

No STOP condition was encountered. Codex stops after publication and leaves final
T01 acceptance to the independent ChatGPT review.
