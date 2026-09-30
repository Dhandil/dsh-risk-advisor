# Phase 1C Execution Report

## Outcome

`PHASE1C_PUBLISHED_READY_FOR_REVIEW`

This is Codex's implementation and execution record only. Final acceptance remains with ChatGPT Web independent review. No `Acceptance_Report.md` was created, no next phase was started, and Codex does not declare `ACCEPTED`.

## Scope and baselines

- Task authority: `Phase1C_Architecture_Freeze.md` and `Phase1C_Implementation_Instructions.md`.
- Plugin repository: `Dhandil/dsh-risk-advisor`, branch `main`.
- Starting plugin `HEAD == origin/main == git ls-remote`: `b81cff6e02b2dd520e2ccb4b9a04d829e8dfc4a6`.
- Tested executable SHA: `0312fd7332f39e7245f7ab44137a82cd5194ba02`.
- Frozen Harness reference: `ddefc45fbc7f8e46dd73185e68295696d1297887` (`HEAD == origin/master`). Harness Core was read-only; no fetch, install, build, checkout, reset, clean, or source/worktree modification was performed.
- Observed Harness upstream `4878cdabd87d4041bdaff61d04c966883b9fd07a` remains unvalidated and was not used.
- Existing plugin drift was preserved and not staged: `.vitest-cache/`, `docs/risk-advisor-current/`, `docs/tasks/Phase1A-operation-foundation/Phase1A_Repair_Instructions.md`, `docs/tasks/Phase1B-assessment-envelope/Phase1B_Repair_Instructions.md`, `docs/tasks/T01-approval-ui/T01_Final_Runtime_Gate_Instructions.md`, generated `lib/`, `node_modules/`, and `pnpm-lock.yaml`.
- Existing Harness drift was preserved: `build.log`, `install.log`, `t0-model.txt`, `t0-remote.txt`, `t0-session.txt`, `t0-storage.txt`, and `undefined/`.

Operational note: a temporary peer-metadata experiment was reverted before commit. pnpm briefly reconciled the already-untracked `node_modules/` while that metadata was present and hit one Windows `EPERM`; no dependency, lockfile, Harness, or committed drift was retained. The final package metadata has no new dependency and the final gates ran after the revert.

## Implementation manifest

- `src/host/assessment-envelope.ts` — bounded private `queryActiveForCall` and `queryOpenByAssessmentId` helpers. They return detached bridge snapshots only, never approval IDs, Sessions, executions, or mutable records; they consider open records only and fail closed on ambiguity/duplicate IDs.
- `src/host/browser-bridge.ts` — one compositionally mounted `/risk-advisor` channel using `ctx.connection.rpc.handle`; only `active` and `assessment` endpoints; strict bounded request validation, fixed non-echoing failures, cancellation, DTO projection, and effect-owned disposal.
- `src/bridge-contract.ts` — browser-safe DTO, closed read union, bounded identity checks, strict unknown-field rejection, reason-code allowlist, and detached/frozen parser helpers.
- `src/client/assessment-bridge.ts` — read-only client adapter calling only `rpc.call('/risk-advisor', endpoint, payload, signal)`, runtime validation, and fail-safe transport/Host/protocol/cancellation mapping.
- `src/client/index.ts` — exports the adapter and safe types only; it does not wire the adapter into the existing T01 slot or modify `RiskAdvisorDetail.tsx`/`R1FixtureStore`.
- `src/index.ts` — `ctx.inject(['connection', 'sessions'])` composition; the existing Host continues to work when Connection is absent, and bridge registration belongs to the plugin generation.
- `tests/p1c-browser-bridge.spec.ts` — real approval/session lifecycle, active-only behavior, conflict/ambiguity, RPC registration/disposal, strict payloads, privacy, and client failure mapping.
- `package.json` — `test:p1c` included in the complete test chain.
- The supplied Phase 1C freeze/instruction documents were preserved in this task directory.

## Authenticated Connection RPC boundary

The production bridge uses only the pinned public Connection shape verified at Harness SHA `ddefc45f...`: `ctx.connection.rpc.handle('/risk-advisor', handler)`. It does not register a raw `webServer` route, use global `fetch`, hard-code origin/port, or bypass Connection admission. The Host Connection service owns the HTTP/worker carrier, Host/Origin checks, and browser authentication before the decoded handler is reached.

The test uses an in-memory plugin-composed authenticated decoded Connection seam with the same public `handle`/dispatch shape. It verifies one channel registration, endpoint dispatch, and effect disposal, but it is not deployed Live Browser or HTTP carrier evidence. No user browser profile or live web server was started.

## Active-only identity and DTO boundary

`active` validates `{ sessionId, callId }`, resolves the current live Session through `SessionStore.get`, and then queries the exact Session object and exact call ID in the bounded Phase 1B store. It never reads Session history, uses session text as a join, consults Ledger order, chooses newest/last-writer-wins, or reconstructs approval identity. Zero matches returns `NOT_FOUND`; multiple open matches return `AMBIGUOUS` with no candidate ID.

`assessment` validates `{ assessmentId }` and returns only a currently open record that still owns that ID. Closed, conflicted, evicted, expired, disposed, duplicate, or unknown IDs return `NOT_FOUND`. A Phase 1B conflict that removed its assessment ID cannot be recovered through the old ID.

The Browser-safe `RiskAdvisorBridgeViewV1` allowlist is exactly `schemaVersion`, `sessionId`, `callId`, optional valid `assessmentId` for the one still-valid `BOUND` shell, `association`, `status: unavailable`, `stage: not-started`, safe reason codes, and `updatedAt`. Browser responses never contain `approvalId`, `executionId`, observed outcome, raw reason/arguments/path/cwd, operation hash, Session, ToolExecution, token, signal, Ledger/evidence, provider/model output, exception text, issue counters, risk findings, score, recommendation, or Approval capability.

## P1C proof matrix

| Proof | Result | Evidence |
|---|---|---|
| P1C-01 unique open shell -> safe VIEW | PASS | Real `Context + SessionStore + ToolRuntime + ApprovalService` approval lifecycle through the registered Connection channel; exact call ID and one valid assessment ID only. |
| P1C-02 current Session/call identity | PASS | Live `SessionStore.get`, wrong call ID, and unknown/disposed session return `NOT_FOUND`; no historical or text-equal fallback exists. |
| P1C-03 same-call ambiguity | PASS | Component-injected committed open records sharing one call ID return `AMBIGUOUS` and no candidate assessment ID. The injection is explicitly a fault fixture, not a native producer. |
| P1C-04 conflict remains unavailable | PASS | A committed conflicting ask removes the old public assessment ID; active projection is `UNBOUND`, and old by-assessment lookup is `NOT_FOUND`. |
| P1C-05 native decision has no stale view | PASS | Real `ApprovalService` decision makes both active and by-assessment reads `NOT_FOUND`; no resurrection occurs. |
| P1C-06 open assessment follow-up and stale IDs | PASS | Unique open follow-up succeeds; unknown, conflicted, closed, disposed, and coordinator-expired/evicted states are not returned by active-only queries. Closed records disappear immediately from Browser reads; Phase 1B deterministic TTL/eviction evidence remains green. |
| P1C-07 strict RPC input/cancellation | PASS | Empty/oversized/extra fields, unknown endpoint, and already-aborted signal are rejected with fixed codes and empty details; both endpoint handlers use exact-key validation. |
| P1C-08 Host/client DTO privacy | PASS | Host projection omits forbidden fields; client parser rejects injected unknown fields such as `approvalId`, requires exact keys, and freezes retained results. |
| P1C-09 client failure mapping | PASS | Transport throw, Host error, malformed success, and cancellation map to typed `UNAVAILABLE` without raw error/message leakage. |
| P1C-10 Connection registration/dispatch/disposal | PASS | In-memory decoded Connection seam exercises exactly one `/risk-advisor` registration, dispatch, no raw feature route, and generation disposal. This is not Live Browser/HTTP evidence. |
| P1C-11 T01 and Native Approval ownership | PASS | T01 fixture/UI files were not changed or wired to the adapter; real approval answerer remains the sole native answerer and is invoked once. |
| P1C-12 inherited regression | PASS | Final fresh `pnpm test`: inherited 93 plus 7 Phase 1C tests = **100 tests**. |

## Commands and quality gates

| Check | Result |
|---|---|
| `pnpm run typecheck` | PASS |
| `pnpm run test:p1c` | PASS — 1 file, 7 tests |
| `pnpm run build` | PASS — Host and Client bundles |
| Host export smoke (`lib/index.js`) | PASS — `apply`, `installCorrelation` present |
| Client export smoke (`window.__ModuleLoader__`) | PASS — `createRiskAdvisorBridgeClient`, `R1FixtureStore` present |
| `pnpm pack --dry-run` | PASS — package contents include bridge declarations and no unintended files |
| `git diff --check -- package.json src tests` | PASS — only expected LF/CRLF normalization warnings |
| Production scope/privacy scan | PASS — no new approval answerer, raw web route, global fetch, Judge/Provider/OperationPresentation/RiskAssessment, or forbidden DTO path |
| lint / publint | `NOT_CONFIGURED` — no project scripts or binaries present |
| final fresh `pnpm test` on Tested SHA | PASS — R1 9 + R2 16 + R3 17 + R4 21 + R5 3 + Phase 1A 13 + Phase 1B 14 + Phase 1C 7 = **100 tests** |

The R1 suite prints expected fixture-fault stack traces while its assertions pass. No R5 benchmark smoke/full rerun was needed; Phase 1C changes no latency policy or assessment-performance claim.

## Architecture, privacy, and phase boundary audit

- The bridge is read-only and observational. It does not mutate Session, Assessment, Foundation, Ledger, Tool, or Native Approval state.
- One existing `ActiveExecutionIndex` remains the sole execution identity owner and UUID mint path. No alternate identity, history reconstruction, Ledger join, or approval-ID guessing was added.
- The client adapter is exported but not connected to `conversation.approval.detail`; T01 fixture semantics and `RiskAdvisorDetail.tsx` remain unchanged.
- No Rule Engine, Context Builder, Judge, Provider, OperationPresentation, RiskAssessment engine, product card, polling policy, Approval buttons, native answerer, or Phase 2 implementation was added.
- Connection absence is compositional: the Host plugin remains usable without the optional Connection service, and the bridge registration is generation-owned to prevent stale/HMR channels.

## Inherited open and not-run gates

The following remain outside this bounded transport phase: deployed Live Browser/HTTP carrier authentication, real browser profile, T01 product UI, real native PTC producer, T04 F-006/F-007/F-013 cross-plane gates, true disk/process restart, newer Harness V4 validation, and T05 real Assessment latency/`T_sync` plus six undetermined production policy fields. Phase 1C transport evidence does not satisfy J-001/J-004 because no real ready Assessment or product UI exists.

## SHA handoff

- Implementation/Tested SHA: `0312fd7332f39e7245f7ab44137a82cd5194ba02`.
- Report-only publication commit and final remote SHA are verified after this report is committed and pushed.
- Stop after publication for ChatGPT Web independent review. Codex does not generate an Acceptance Report or declare `ACCEPTED`.
