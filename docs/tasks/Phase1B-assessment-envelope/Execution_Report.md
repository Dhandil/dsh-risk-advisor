# Phase 1B Execution Report

## Outcome

`PHASE1B_PUBLISHED_READY_FOR_REVIEW`

This is Codex's implementation and execution record only. Final acceptance remains with ChatGPT Web independent review. No `Acceptance_Report.md` was created, Phase 1C was not started, and Codex does not declare `ACCEPTED`.

Repair continuation outcome: `PHASE1B_REPAIR_PUBLISHED_READY_FOR_REVIEW`.

## Scope and baselines

- Task authority: `Phase1B_Architecture_Freeze.md` and `Phase1B_Implementation_Instructions.md`.
- Plugin repository: `Dhandil/dsh-risk-advisor`, branch `main`.
- Starting plugin `HEAD == origin/main == git ls-remote`: `0954d92e6ae0018e9c2c58401e4b6635402cfe94`.
- Tested implementation SHA: `898751f0be56182a17ac04054682579c406869d8`.
- Frozen Harness reference: `ddefc45fbc7f8e46dd73185e68295696d1297887` (`HEAD == origin/master`). Harness Core was read-only: no fetch, install, build, checkout, reset, clean, or source/worktree modification was performed.
- The separately observed Harness upstream `4878cdabd87d4041bdaff61d04c966883b9fd07a` remains unvalidated and was not used.
- Existing plugin drift was preserved and not staged: `.vitest-cache/`, `docs/risk-advisor-current/`, `docs/tasks/Phase1A-operation-foundation/Phase1A_Repair_Instructions.md`, `docs/tasks/T01-approval-ui/T01_Final_Runtime_Gate_Instructions.md`, generated `lib/`, `node_modules/`, and `pnpm-lock.yaml`.
- Existing Harness drift was preserved: `build.log`, `install.log`, `t0-model.txt`, `t0-remote.txt`, `t0-session.txt`, `t0-storage.txt`, and `undefined/`.

## Implementation manifest

- `src/host/assessment-envelope.ts` — Host-private bounded ApprovalAssessmentCoordinator and detached diagnostic facade.
- `src/index.ts` — one shared session-event hook after the existing `ActiveExecutionIndex.observeSessionEvent`; `apply` wires Foundation diagnostics and the assessment facade while preserving the existing correlation and Ledger observers.
- `tests/p1b-assessment-envelope.unit.spec.ts` — identity, ambiguity, duplicates/conflicts, Foundation degradation, closure, disposal, capacity/TTL, clock faults, and privacy proofs.
- `tests/p1b-runtime.integration.spec.ts` — real `Context + SessionStore + ToolRuntime + ApprovalService` approval, policy-never, and faulting-answerer integration.
- `package.json` — `test:p1b` and inclusion in `pnpm test`.
- The two supplied Phase 1B freeze/instruction documents were preserved in this task directory.

The implementation reuses the single existing `ActiveExecutionIndex` and its exact live lookup. It does not create a second index, mint an `ExecutionId`, reconstruct history, join the Ledger, or answer native approval. Assessment IDs are minted only once after a unique live `FOUND` lookup. Ownership is the exact `(Session object, approvalId)` pair; records use a `WeakMap` keyed by Session and weak Session references in the bounded global set.

The public result is an immutable, detached Phase 1B shell only: `pending`/`unavailable`/`cancelled`, `stage: not-started`, bounded reason codes, and observed native outcome after closure. It never exposes `operationHash`, `RuleFinding`, score, recommendation, `ready`, browser/provider state, raw arguments, raw reason text, Session, ToolExecution, or approval-answer capability. The assessor is explicitly unavailable with `ASSESSOR_NOT_IMPLEMENTED`.

## Focused proof matrix

| Proof | Result | Evidence |
|---|---|---|
| P1B-01 exact real approval binding | PASS | Real Host integration observes one committed `approval/asked`, preserves the exact correlated `executionId`, mints one opaque assessment ID, remains unavailable/not-started, and native answerer is invoked once. |
| P1B-02 identity and no history reconstruction | PASS | Unit coverage requires exact Session object and call ID; equal-text Sessions, missing scope, and missing call ID do not bind or mint IDs. |
| P1B-03 ambiguity fail-closed | PASS | Unit coverage with two active same-call executions returns `AMBIGUOUS` with no execution or assessment ID. |
| P1B-04 duplicate/conflicting asked events | PASS | Same `(Session, approvalId)` and same fields are idempotent; conflicting fields fail closed without rebind; distinct approval IDs remain distinct. |
| P1B-05 Foundation degradation boundary | PASS | Captured, degraded, and unavailable Foundation diagnostics remain distinct; no fabricated readiness, hash, or finding is emitted. |
| P1B-06 decided closure and native outcome | PASS | Policy-never and allowed/rejected/cancelled paths preserve the observed native outcome and become immutable; later contradictory events do not reopen or rebind. |
| P1B-07 orphan, late, disposal, generation stop | PASS | Orphan decisions, late events, exact session disposal, and coordinator disposal cannot revive a record. |
| P1B-08 exact Session ownership | PASS | Same approval ID on different Session objects is isolated; disposal removes only the owning generation. |
| P1B-09 bounded store and TTL | PASS | 256-record cap, completed-first eviction, injected monotonic clock, completed TTL, and all-active fail-open capacity behavior are covered. Native approval is never blocked by capacity. |
| P1B-10 detached privacy and failure containment | PASS | Frozen detached diagnostics, sanitized reason codes, hostile reason getter isolation, clock-fault containment, and absence of raw text are covered. |
| P1B-11 approval seam safety | PASS | Real policy-never and faulting-native-answerer integrations show no assessment answerer or second approval request; native outcomes remain authoritative. |
| P1B-12 inherited regression | PASS | Final fresh `pnpm test` passed with 92 tests across R1–R5, Phase 1A, and Phase 1B. |

## Commands and quality gates

| Check | Result |
|---|---|
| `pnpm run typecheck` | PASS |
| `pnpm run test:p1a` | PASS — 2 files, 13 tests |
| `pnpm run test:p1b` | PASS — 2 files, 13 tests |
| `pnpm run build` | PASS — Host and Client bundles |
| Host export smoke (`lib/index.js`) | PASS — `apply` and `installCorrelation` functions present |
| `pnpm pack --dry-run` | PASS — expected package allowlist, including assessment-envelope declarations |
| `git diff --cached --check -- package.json src tests` | PASS |
| Phase 1B source scope/privacy scan | PASS — no forbidden RiskAssessment/Judge/Browser/provider/LLM/Context Builder/raw-argument/reason-text production path detected |
| lint / publint | `NOT_CONFIGURED` — no project scripts or binaries present |
| final fresh `pnpm test` on Tested SHA | PASS — R1 9 + R2 16 + R3 17 + R4 21 + R5 3 + Phase 1A 13 + Phase 1B 13 = **92 tests** |

The R1 suite prints expected fixture-fault stack traces while its assertions pass; this is existing fault-path evidence, not a test failure. No R5 benchmark smoke/full run was added: Phase 1B does not change benchmark policy or claim assessment performance.

## Architecture, privacy, and phase boundary audit

- One `ActiveExecutionIndex` remains the sole live execution identity owner and UUID mint path. The assessment coordinator consumes its lookup result through the existing shared correlation observer.
- Asked/decided handling is observational and committed-event-only. Duplicate asks are idempotent; conflicts, ambiguity, missing scope, lost runtime state, and capacity exhaustion fail closed without affecting native approval.
- The store is capped at 256 records, uses completed-first eviction, a ten-minute completed TTL, injectable monotonic time, weak Session ownership, and disposal cleanup. It has no unbounded tombstones.
- Public diagnostics are frozen detached copies. No Session, ToolExecution, raw arguments, raw native reason, Ledger payload, operation hash, provider/model output, filesystem data, or browser state crosses the facade.
- No Judge, Rule Engine, Browser Bridge, Context Builder, native PTC producer, assessment answerer, or Phase 1C implementation was added.
- T01–T05 and Phase 1A product behavior was not rewritten. Existing open gates remain open, including T04 cross-plane F-006/F-007/F-013, Browser/live runner, native PTC producer, disk/process restart, new-upstream validation, and the previously recorded T05 `T_sync`/undetermined-field limits.

## Final handoff

- Implementation/Tested SHA: `898751f0be56182a17ac04054682579c406869d8`.
- Report-only publication commit and final remote SHA are verified after this report is committed and pushed.
- Stop after publication for ChatGPT Web independent review. Codex does not generate an Acceptance Report or declare `ACCEPTED`.

## Targeted F1–F4 repair continuation

### Repair authority and protection

- Repair authority: `Phase1B_Repair_Instructions.md`, independent review of the Phase 1B publication at `f8fcc291510d8e872bc02576c225e8797e072d82`.
- Repair start: plugin `HEAD == origin/main == git ls-remote` at `f8fcc291510d8e872bc02576c225e8797e072d82`.
- Frozen Harness remained `ddefc45fbc7f8e46dd73185e68295696d1297887`; no Harness fetch, build, install, checkout, reset, clean, or modification was performed.
- Existing plugin drift remained untracked and unstaged, including `.vitest-cache/`, `docs/risk-advisor-current/`, `docs/tasks/Phase1A-operation-foundation/Phase1A_Repair_Instructions.md`, `docs/tasks/Phase1B-assessment-envelope/Phase1B_Repair_Instructions.md`, `docs/tasks/T01-approval-ui/T01_Final_Runtime_Gate_Instructions.md`, `lib/`, `node_modules/`, and `pnpm-lock.yaml`.
- Existing Harness drift remained untouched: `build.log`, `install.log`, `t0-model.txt`, `t0-remote.txt`, `t0-session.txt`, `t0-storage.txt`, and `undefined/`.

### F1 — contradictory asked is no longer publicly bindable

An open same-ID `approval/asked` whose tool name or call ID conflicts with the first observation now replaces the public shell with `association: UNBOUND`, `status: unavailable`, `stage: not-started`, and `CORRELATION_CONFLICT`. The former `executionId` and `assessmentId` are removed from the current diagnostic; no rebind or new UUID occurs. A later genuine decision closes the same non-bindable shell and preserves only the observed native outcome. Closed shells remain immutable, identical asks remain idempotent, and a distinct approval ID can still bind independently.

The real Host integration injects a contradictory event while the native approval is pending and verifies no candidate identifiers are exposed and the native answerer remains called exactly once.

### F2 — orphan decisions are a bounded typed issue

Valid `approval/decided` events without an exact open `(Session, approvalId)` now return `ORPHAN_DECISION` and increment a saturating aggregate counter. `riskAdvisorAssessments.getIssueSummary()` exposes only frozen schema/version, counters, and typed `ORPHAN_DECISION`/`CAPACITY_EXCEEDED` reason codes. It creates no assessment, stores no approval ID, appends no Session event, retains no Session reference, and does not reconstruct an evicted record. Disposal clears the generation summary.

### F3 — capacity refusal is visible without per-ID state

When all 256 bounded records are active, the incoming advisory remains fail-open and native approval remains untouched, while `getIssueSummary()` increments the bounded `capacityExceeded` counter and exposes `CAPACITY_EXCEEDED`. No active record is evicted, no shell is synthesized for the rejected approval, and closed records remain eligible for normal completed-first eviction.

### F4 — completed timestamps remain coherent across clock faults

The injectable clock now retains the last valid nondecreasing monotonic value when it throws or returns a non-finite value. A close cannot rewind `updatedAt` to zero; a query/sweep cannot use an injected clock fault as authoritative expiration evidence. The new deterministic test starts at a large monotonic value, closes under `NaN`, confirms native outcome immutability and `updatedAt >= startedAt`, then verifies survival before and expiry at the actual completed TTL.

### Repair proof and quality gates

| Finding / gate | Result | Evidence |
|---|---|---|
| F1 conflict projection | PASS | Unit and real Host integration: conflicting same-ID ask is `UNBOUND`, has no `executionId`/`assessmentId`, closes with observed outcome, and does not affect a distinct approval. |
| F2 orphan issue | PASS | Unit injects one plus 1,000 more orphan decisions; one constant-space `ORPHAN_DECISION` summary is visible and no synthetic diagnostic is created. |
| F3 capacity issue | PASS | Unit all-active cap refusal exposes `CAPACITY_EXCEEDED`, retains the active association, and keeps the overflow approval `not-found`; closed eviction remains covered. |
| F4 clock fault | PASS | Unit injected-`NaN` clock close preserves timestamp and native outcome, survives at TTL minus one, and expires at TTL. |
| Real pinned Host integration | PASS | Existing actual `Context + SessionStore + ToolRuntime + ApprovalService` tests plus injected contradictory committed event; policy-never and faulting-native-answerer parity remain green. |
| Architecture/privacy audit | PASS | One shared `ActiveExecutionIndex`; no alternate ID mint, history fallback, Ledger join, raw reason/args/Session, assessor, Judge, Rule Engine, Browser Bridge, provider, or Phase 1C path. |
| `pnpm run typecheck` | PASS | Final repair source. |
| `pnpm run build` | PASS | Host and Client bundles. |
| Host export smoke | PASS | `apply` and `installCorrelation` present from `lib/index.js`. |
| `pnpm pack --dry-run` | PASS | Package allowlist includes updated assessment-envelope declarations. |
| `git diff --check -- src tests package.json` | PASS | Only expected LF/CRLF normalization warnings. |
| Production source scope/privacy scan | PASS | No forbidden Phase 1C or raw-data production path detected. |
| lint / publint | `NOT_CONFIGURED` | No project scripts or binaries available. |
| `pnpm run test:p1b` | PASS — 2 files, 14 tests | New and retained Phase 1B evidence. |
| Final fresh `pnpm test` | PASS — **93 tests** | R1 9 + R2 16 + R3 17 + R4 21 + R5 3 + Phase 1A 13 + repaired Phase 1B 14. |

The inherited R1 fixture-fault stack traces remain expected output from passing fault-path tests. R5 benchmark smoke/full was not rerun because this repair changes no benchmark policy or assessment-performance claim.

### Remaining open and not-run gates

T04 cross-plane F-006/F-007/F-013, Browser/live runner, real native PTC producer, disk/process restart, newer-upstream validation, and T05's previously recorded `T_sync`/undetermined latency fields remain open or not run. No Phase 1C work was started.

### Repair SHA handoff

- Repair implementation/Tested SHA: `4db5cd153a0d38a6bcf56711c6a5adc5a0118ed5`.
- No executable changes were made after the final 93-test regression.
- The report-only publication commit and final remote SHA are verified in the terminal handoff after this report is committed and pushed.
- Stop after publication for ChatGPT Web independent review; Codex does not generate an Acceptance Report or declare `ACCEPTED`.
