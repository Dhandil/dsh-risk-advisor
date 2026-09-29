# T01 — Approval Additive UI / Single-Slot Coexistence | Architecture Freeze

**Status:** FROZEN FOR CODEX IMPLEMENTATION — independent ChatGPT Web acceptance pending execution  
**Task:** `T01-approval-ui`  
**Date:** 2026-09-29  
**Plugin repo baseline:** `Dhandil/dsh-risk-advisor`, `main @ 5e54baa33703f8c457239811c57ce274fac664a5` (T00 accepted)  
**Read-only Harness source baseline:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887` (`master`)  
**Workspaces:** plugin `D:\Harness\harness-plugin\dsh-risk-advisor`; read-only reference `D:\Harness\deepseek-harness`.

## 1. Goal and acceptance boundary

Prove that an **external, disposable R1-only Browser plugin** can show a clearly labeled Risk Advisor **fixture** inside an authentic Harness Native ApprovalPanel without taking ownership of native Reject / Allow once, and that unmount, failure, disable, resolved approval, and Session switch leave native approval usable.

T01 is **R1 only**. It is not the complete Risk Advisor, not R2 live Host correlation, and not a claim that a genuine six-dimensional assessment is ready. Use static fixture states, no LLM/provider and no real privileged tool execution. The native ApprovalPanel is Harness-owned throughout.

## 2. Source-verified seam and newly surfaced constraint

Read these exact Harness files before implementation; inspect matching current local code and any drift:

- `packages/client/ui-approval/src/client/index.ts`: registers `conversation.composer` and declares `children: { 'conversation.approval.detail': {kind:'single',scope:'session'} }`.
- `packages/client/ui-approval/src/client/contract/slots.ts`: `ApprovalDetailOwnerProps` exposes **only** `callId`; `PendingApproval` has `sessionId`, `callId?`, `toolName`, `reason`, opaque `key`; the Browser is not given Host `ApprovalRequestId`.
- `packages/client/ui-approval/src/client/ApprovalPanel.tsx`: calls `renderSlot('conversation.approval.detail',{callId})` **only when `callId !== undefined`**. Native buttons alone call `pending.answer(...)`.
- `packages/client/ui-chat/src/client/apply.ts` and `chat/ApprovalCommand.tsx`: shipped `ui-chat` already contributes a renderer, `ApprovalCommand`, to the **same** `conversation.approval.detail` slot. It shows a command from the public Session Chat snapshot when a correlated running Tool call contains `argsRaw.command` as a string.
- `docs/subsystems/slots.md`: a `single` slot has **one active priority winner**; registering into it is not a list contribution and can shadow a shipped presentation. `ctx.slots.inject` manages declaration-lifetime registration.

Source permalinks:  
[Approval client](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/client/ui-approval/src/client/index.ts) · [Slot type](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/client/ui-approval/src/client/contract/slots.ts) · [Panel](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/client/ui-approval/src/client/ApprovalPanel.tsx) · [Shipped registration](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/client/ui-chat/src/client/apply.ts) · [Shipped detail](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/packages/client/ui-chat/src/client/chat/ApprovalCommand.tsx) · [Slot semantics](https://github.com/deepseek-ai/deepseek-harness/blob/ddefc45fbc7f8e46dd73185e68295696d1297887/docs/subsystems/slots.md).

**Architecture clarification T01-ADR-01:** “Additive” means **additive to Native ApprovalPanel and its native decision flow**, not magically additive to an occupied `single` detail cell. A Risk Advisor registration selected as the winner must **compose** the existing command-detail semantics and the R1 fixture card in that one cell. It may intentionally replace the *detail-cell renderer*, but it must not replace the ApprovalPanel/composer/answerer. This is an explicit bounded reconciliation of an earlier architecture assumption, not an authorization for Codex to change other frozen architecture.

- Do **not** import private `ApprovalCommand.tsx` or reach into internal Host/Browser state. If composition can be achieved through documented/public client `useChat` / exported snapshot types and the current `ApprovalCommand` behavior, preserve the observable command output (including absent/malformed/unrelated/settled cases) and add the RA fixture below it. Keep the pure command extraction minimal and local to this R1 module/test.
- Determine the supported priority/registration rule from the **real slot runtime**, set the winner intentionally (no reliance on equal-priority registration order), and prove shipped `ApprovalCommand` returns when the RA registration is disposed.
- If a public-API-compatible composite registration is impossible or it would silently erase shipped command detail, **STOP with `T01_ARCHITECTURE_DECISION_REQUIRED`**. Do not quietly choose another takeover/DOM hack or patch Harness Core.

## 3. Frozen UI architecture

```text
Harness Native Approval (unchanged)
  └─ conversation.composer → ApprovalPanel (unchanged)
       ├─ native reason / tool metadata
       ├─ conversation.approval.detail [single; session scope]
       │    ├─ preserved shipped command-detail semantics (when present)
       │    └─ Risk Advisor R1 fixture card, explicitly marked TEST FIXTURE
       └─ [Reject] [Allow once]  ← Native ownership only
```

R1 fixture states: `PENDING`, `READY_SAMPLE`, `UNAVAILABLE`; never falsely report a real `LOW` risk. UI must indicate **sample / no actual risk evaluation**. A `READY_SAMPLE` may display a harmless hard-coded explanation but must not imply a decision was authorized or verified.

**`callId` absent:** current ApprovalPanel never invokes the detail slot. Therefore no RA card is possible **through this seam**; Native Approval must continue functioning. Record this as a current seam limitation, **not** as a successful “degraded card displayed” case. Do not alter ApprovalPanel to work around it.

**No Host association in T01:** this fixture only validates the client presentation seam and native lifecycle. `session-scoped UI + callId` in T01 must not be claimed to solve the Host-side `approval/asked` / active ExecutionId lookup or multiple pending approvals with colliding callIds. Those are R2.

## 4. Minimal implementation boundary

Allowed, only in `dsh-risk-advisor`:

- Small independent package/tooling necessary to mount an R1 Browser extension against the pinned Harness; use public `@deepseek-ai/.../client` APIs and real Cordis slot runtime.
- Minimal `ctx.slots.inject('conversation.approval.detail', ...)` contribution plus its composite renderer and **pure test fixture store**. Use effect-lifetime cleanup; no global permanent registration.
- Focused component / slot integration tests and, if supported safely, one actual local Browser approval UI smoke. Test harness must use the **real Harness slot + Native ApprovalPanel path**, not just a hand-built lookalike React card.
- A small test-only way to simulate valid PendingApproval flow **without a real provider**, e.g. existing public Harness test/fixture facilities. Fake statuses must be marked fixture and isolated.
- Tests/evidence in plugin repository. Task-specific documents and execution report all in `docs/tasks/T01-approval-ui/`. Cross-task canonical documents stay in `docs/baseline/` with one authoritative copy.

Forbidden:

- Modifying Harness Core, Harness tracked/untracked files, user profile or production settings; reset/clean/force push.
- Hooking the Host `approval/request` to answer/claim; calling `PendingApproval.answer()` from the Risk Advisor plugin; registering or replacing `conversation.composer`; importing private `ApprovalPanel`, `ApprovalCommand` or undocumented internals into plugin production code; DOM injection.
- Full Risk Engine, Host route, `approval/asked` correlation, `ExecutionId` index, Ledger, R2/R3/R4/R5, LLM/Deep Judge, real provider/network/privileged execution.
- Fabricating a “success” from isolated Jest/Vitest markup when authentic slot integration is unproven.

## 5. Exact R1 observable contract

| ID | Test / observable | Required evidence |
|---|---|---|
| R1-01 | Existing native baseline | Shipped command detail and native decision controls before enabling RA fixture. |
| R1-02 | Composite fixture installed | Correct command detail **and** clearly marked RA fixture visible in the one `single` detail cell for a pending Approval with `callId`. |
| R1-03 | `PENDING` then `READY_SAMPLE` | UI state updates without preventing native decision buttons. |
| R1-04 | Missing/invalid command | Existing command detail remains absent, fixture can be present if `callId` exists; no invented command. |
| R1-05 | Approval resolve / delayed fixture update | Card unmounts with native Approval; stale async test update does not remount it. Native decision effect originates only from native control. |
| R1-06 | Plugin disabled/unmounted during pending | Native panel and Reject / Allow once remain usable; shipped command detail returns; no duplicate renderer/listener. |
| R1-07 | Fixture render fault | Isolated fallback; never crashes/shadows entire Native ApprovalPanel; if fault safety cannot be proved, R1 fails. |
| R1-08 | Session switch or rebind | Fixture and command detail cannot leak across Session scopes. |
| R1-09 | `callId` absent | Detail slot not invoked; native Approval remains usable. **Record limitation, not fictitious card display.** |
| R1-10 | Native choice behavior | Both native Reject and Allow once paths still settle as before; duplicate click cannot cause a new RA answer effect. |

Test R1-02/R1-05/R1-06 against actual Cordis slot runtime and real ApprovalPanel, not just isolated RA component. If a complete browser runner is unavailable, distinguish Component PASS, Slot Integration PASS, and Live Browser NOT_RUN; do not claim full R1 PASS from partial evidence.

R2 retains high-contention correlation, callId collision/reuse and deep HMR runtime index loss. T01 may smoke ordinary unload/reload cleanup but does not certify R2.

## 6. Quality gates / final result semantics

1. Source baseline and local drift audit before writes; record all protected drift.
2. Implementation in plugin repo → focused unit/component tests → authentic slot + Native Approval integration → scope/architecture audit → static gates; any last executable gate after pre-full quality gates. Only use an existing, explicitly defined Canonical Full; if none, mark `NOT_APPLICABLE` instead of making one up.
3. No executable drift after the final executable test; any repair requires appropriate retest.
4. Codex writes **`Execution_Report.md`**, **not** `Acceptance_Report.md`, recording actual test commands, status per R1 case, blockers/limitations, Tested SHA, implementation commit and final remote SHA. Commit/push and verify `origin/main`. Keep execution-report commit docs-only after last executable gate where practical.
5. Codex outcome vocabulary: `T01_R1_PUBLISHED_READY_FOR_REVIEW`, `T01_R1_PARTIAL`, `T01_ARCHITECTURE_DECISION_REQUIRED`, `T01_BLOCKED`, or `T01_FAILED`. These are **execution states**, not independent acceptance.
6. ChatGPT Web independently checks remote code/diff/evidence and decides `ACCEPTED / REPAIR / STOP`.

**STOP** if source seam is materially different from the pin, the shipped detail cannot be preserved through public APIs, the native approval is degraded, any required test cannot be safely staged without altering Harness, the Git remote diverges unexpectedly, or a frozen boundary must change. Report and publish non-destructive evidence if feasible, then wait for architecture review. Do not advance to R2 automatically.
