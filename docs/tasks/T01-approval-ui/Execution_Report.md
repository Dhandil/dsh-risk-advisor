# T01 — Approval Additive UI / Single-Slot Coexistence

## Execution outcome

**Outcome: `T01_R1_PARTIAL`**

The bounded R1 implementation is committed and published for independent ChatGPT
review. Component and real Cordis `SlotRegistry` + shipped Native ApprovalPanel
checks pass. The full local Browser smoke and a live Session rebind are not run in
this checkout, so Codex does not claim complete R1 acceptance.

Codex did not generate an `Acceptance_Report.md` and does not declare `ACCEPTED`.

## Baselines and repository safety

| Item | Result |
|---|---|
| Plugin remote | `https://github.com/Dhandil/dsh-risk-advisor.git` |
| Plugin branch | `main` |
| Plugin starting SHA | `5e54baa33703f8c457239811c57ce274fac664a5` |
| Harness reference | `D:\Harness\deepseek-harness`, `master @ ddefc45fbc7f8e46dd73185e68295696d1297887` |
| Harness mutation | None; tracked and untracked status remained read-only |
| Reset / clean / rebase / force push | Not used |
| Providers / network assessment | `0`; no provider, LLM, privileged execution, or approval listener |
| R2–R5 | `NOT_RUN` |
| Canonical Full | `NOT_APPLICABLE`; no T01 Canonical Full was defined |

Protected drift was preserved. Plugin drift remained untracked in
`docs/risk-advisor-current/` and the frozen T01 task instructions. Harness drift
remained untracked: `build.log`, `install.log`, `t0-model.txt`, `t0-remote.txt`,
`t0-session.txt`, and `t0-storage.txt`.

## Implementation manifest

The implementation is limited to the plugin repository:

- `package.json`, `README.md`, `tsconfig.json`, `vitest.config.ts`
- `src/index.ts` — inert Host half
- `src/client/index.ts` — Browser registration and effect-lifetime disposal
- `src/client/RiskAdvisorDetail.tsx` — single-cell composite and local error boundary
- `src/client/command.ts` — public Chat snapshot command parity
- `src/client/fixture-store.ts` — pure session-keyed fixture state
- `src/client/locales.ts` — `en`/`zh` fixture copy
- `tests/r1-fixture.unit.spec.tsx`
- `tests/r1-slot.integration.spec.tsx`

The frozen single slot is handled intentionally: RA registers
`conversation.approval.detail` at priority `-100`, while the shipped detail
renderer is priority `0`. The RA renderer reproduces the shipped public command
semantics through `useChat` and exported snapshot types, then renders the
explicit `TEST FIXTURE / no real assessment` card. It never registers
`conversation.composer`, calls `PendingApproval.answer()`, adds an answer
control, imports a private Harness component in production, or uses DOM
injection. Slot disposal restores the shipped `ApprovalCommand` entry.

## R1 case matrix

| Case | Status | Evidence / limitation |
|---|---|---|
| R1-01 native baseline | PASS | Real Native ApprovalPanel with the shipped Harness `ApprovalCommand` renders `echo native` before RA mount; native controls are present. |
| R1-02 composite detail | PASS | Real SlotRegistry winner changes to RA; one detail cell shows `echo native` and the RA fixture. |
| R1-03 PENDING → READY_SAMPLE | PASS | Fixture store update changes the rendered state; native buttons remain enabled. |
| R1-04 invalid/missing/unrelated/settled command | PASS | Pure parity tests return no fabricated command for absent, malformed, non-string, unrelated, or settled Tool data. |
| R1-05 resolve/unmount/late update | PASS | Native answer is followed by host-like unmount; a late fixture update does not remount the detail. |
| R1-06 disable during pending | PASS | RA fiber is disposed before native Allow once; priority-0 shipped detail and native controls return with no duplicate entry. |
| R1-07 fixture render fault | PASS | Local React error boundary renders `UNAVAILABLE`; the Native ApprovalPanel remains outside the failure boundary. |
| R1-08 Session switch/rebind | NOT_RUN | Session-keyed store isolation is covered by a focused unit test; no live Browser session rebind was available in this plugin-only checkout. |
| R1-09 absent `callId` | PASS | Real Native ApprovalPanel does not invoke the detail renderer and its native Reject path settles normally. This is the frozen seam limitation. |
| R1-10 native choice behavior | PASS | Native Allow once and Reject paths settle through Native ApprovalPanel; RA provides no answer path. |

## Executed checks

All executable checks below ran against the final implementation content before
the report-only commit:

```text
D:\Harness\deepseek-harness\node_modules\.bin\tsc.cmd --noEmit -p tsconfig.json
=> PASS (TS_EXIT=0)

D:\Harness\deepseek-harness\node_modules\.bin\vitest.cmd run --config vitest.config.ts
=> PASS — 2 test files, 6 tests

D:\Harness\deepseek-harness\node_modules\.bin\oxlint.cmd --config D:\Harness\deepseek-harness\.oxlintrc.staged.json src tests
=> PASS (OXLINT_EXIT=0)

git diff --cached --check
=> PASS for implementation commits
```

The fixture-fault test intentionally exercises React's error reporting path; the
expected diagnostic is emitted while the test still passes and the boundary
assertion confirms isolation.

The real integration test uses `Context`, `SlotRegistry`, the shipped
`ApprovalCommand` test reference, and the shipped Native `ApprovalPanel`. The
private Harness imports are test-only read-only references; no private Harness
module is imported by plugin production code.

Live Browser smoke: **`NOT_RUN`**. No supported disposable Browser runner was
available without installing the plugin into Harness or changing production
settings. No provider or privileged operation was started.

## Git delivery

| Deliverable | SHA / result |
|---|---|
| Tested SHA | `6f3a46c62438ac60d0724b70268d7a552fc55250` |
| Implementation commits | `0f2ec2a729628dac9d1b049a19dcebb786349259`, `6f3a46c62438ac60d0724b70268d7a552fc55250` |
| Implementation push | PASS; normal `git push origin main` |
| Report commit | Filled after this docs-only commit |
| Final remote verification | Filled after this docs-only commit |

No STOP condition was encountered. Remaining limitations are the unavailable
live Browser smoke and R1-08 live Session rebind; these are left for independent
ChatGPT review rather than silently promoted to PASS.
