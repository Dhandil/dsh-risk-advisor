# T04 — R4 Ledger Fault Injection & Recovery | Codex Execution Report

## Outcome

`T04_R4_PUBLISHED_READY_FOR_REVIEW`

This is a Codex implementation and evidence report only. Final acceptance belongs to ChatGPT Web. No `Acceptance_Report.md` was created and no `ACCEPTED` status is asserted.

## Baselines and upstream decision

- Plugin start checkpoint: `3c3fd9d540caa654bb3aaf8378536cfde74ead3e`.
- Harness baseline used for all source and runtime checks: local `HEAD @ ddefc45fbc7f8e46dd73185e68295696d1297887`.
- The local Harness tracked tree and the T04-affected source files matched the frozen `ddefc45f...` objects. Harness Core was not fetched, modified, installed into, built in, reset, cleaned, or checked out.
- GitHub `origin/master` was separately observed at `4878cdabd87d4041bdaff61d04c966883b9fd07a`. `T04_Harness_Upstream_Drift_Decision.md` authorizes continuing only against the pinned local baseline; the newer upstream runtime remains `NOT_VALIDATED`.

## Protected drift

Plugin drift was preserved and excluded from the task commits:

- `docs/risk-advisor-current/`
- `docs/tasks/T01-approval-ui/T01_Final_Runtime_Gate_Instructions.md`
- generated/untracked working artifacts: `.vitest-cache/`, `lib/`, `node_modules/`, and `pnpm-lock.yaml`

Harness Core drift was preserved without modification:

- `build.log`, `install.log`, `t0-model.txt`, `t0-remote.txt`, `t0-session.txt`, `t0-storage.txt`, and `undefined/`

No `src/client/**` file, T01/T02/T03 accepted product path, canonical baseline, or Harness Core file was changed.

## Intended change manifest

Implementation commit `a6f51c15190c063e83e8bae09d591db4feddb01b` contains only:

- `src/host/ledger.ts`: bounded Session-owned live/durable ledger and recovery projection.
- `src/index.ts`: Host installation, cleanup, read-only ledger facade and type/export wiring.
- `package.json`: R4 focused scripts and inclusion in the full project test command.
- `tests/r4-ledger.unit.spec.ts`: pure/component F-001..F-015 fault matrix.
- `tests/r4-runtime.integration.spec.ts`: pinned real Context + SessionStore + ToolRuntime + ApprovalService integration.
- The supplied exact T04 Architecture Freeze, Implementation Instructions, and Harness Upstream Drift Decision documents.

This report is intentionally a later report-only change.

## Implementation decisions and safety boundary

- State is owned by exact `Session` objects through `WeakMap<Session, ...>`; exact live `ToolExecution` and its token are kept only in private runtime state. No replay path creates or restores a T02 `ExecutionId`.
- Durable source identity is validated Session-local `(seq,type)` plus turn/step occurrence. Duplicate source delivery is idempotent; distinct sequence numbers remain distinct; conflicting terminal evidence is retained as bounded sanitized claims.
- `tools/result` is the authoritative live terminal. A unique same-Session durable result is represented only as confirmation of that live fact; a disagreement is `DEGRADED/TERMINAL_CONFLICT` without last-writer-wins.
- Approval facts are independent and keyed by approval id. Replay-only pending approvals become `STALE/DEGRADED`; orphan, missing-callId, and colliding records remain `UNBOUND` or `AMBIGUOUS`. The native `approval/request` answerer is not intercepted or changed.
- `tools/pre-execute`, `tools/execute`, `tools/result`, and post-commit `session/event` observers are transparent and effect-owned. Observer failures are contained. Live retention is capped at 128 records per Session; source replay is capped at 10,000 events; query output is capped at 128 facts; R3 PTC replay retains its existing cap of 512 evidence items.
- DTOs are detached and frozen. Raw arguments, result content, approval reason, prompts, credentials, whole events, and detailed error text are not exported or persisted by the plugin. Only minimal tool/call identifiers, source references, `isError`, and sanitized error name/code are exposed.
- No RA-owned database or disk ledger was introduced. Restart evidence is reconstruction from a trusted committed Session snapshot only.

## R4 fault matrix

All cases below passed in `tests/r4-ledger.unit.spec.ts`; F-006 also has genuine pinned-runtime coverage in the integration test.

| Case | Result | Evidence level |
|---|---|---|
| F-001 full exact live final without RA start | PASS | pure/component |
| F-002 start without final | PASS | pure/component |
| F-003 duplicate source/live fact and equal payload at distinct seq | PASS | pure/component |
| F-004 conflicting terminal claims | PASS | pure/component |
| F-005 orphan, missing-callId, and colliding approval | PASS | pure/component |
| F-006 live final plus unique durable confirmation | PASS | pure/component + genuine pinned runtime |
| F-007 live/durable terminal disagreement | PASS | pure/component |
| F-008 idle disposal/HMR generation isolation | PASS | pure/component |
| F-009 disposed active execution is not historically revived | PASS | pure/component |
| F-010 trusted Session snapshot reconstruction | PASS | in-memory committed snapshot / simulated restart |
| F-011 repeated replay determinism | PASS | pure/component |
| F-012 gapped feed reconciled by complete trusted snapshot | PASS | pure/component |
| F-013 snapshot/live overlap deduplication | PASS | pure/component |
| F-014 stale pending approval | PASS | pure/component |
| F-015 unresolved T03 parent/root | PASS | pure/component using accepted T03 projector |

Negative assertions covered zero fabricated ExecutionId, zero result double count for confirmation, zero last-writer-wins, zero auto-approval/denial/cancellation, no raw secret/arguments/content leak, exact Session isolation, and no `root=self` fallback.

## Scoped Area E coverage

- E-001 preparing/start: PASS, real `tools/pre-execute` observation plus pure start-only fault.
- E-002 dispatch: PASS, transparent `tools/execute` wrapper delegates `next()` once and returns the native result unchanged; pure/component and real runtime execution exercised.
- E-003 exact final: PASS, real `tools/result` observed from ToolRuntime.
- E-004 independent approvals: PASS, real ApprovalService emits committed `approval/asked` and `approval/decided`; projection remains independent.
- E-005 verification unknown: NOT_IMPLEMENTED; T04 does not infer verification or FAILED from absence of it.
- E-006 confirmation-only: PASS, F-006.
- E-007 bounded query: PASS, enforced query limit, frozen detached DTO, source watermark and issue reporting.
- E-008/E-009 semantic similarity/retry/escalation: NOT_IMPLEMENTED by frozen scope.
- E-010 full context building and Primary Failure Analyzer: NOT_IMPLEMENTED by frozen scope.

## Genuine integration and restart evidence

`tests/r4-runtime.integration.spec.ts` mounts a real pinned Harness `Context`, `SessionStore`, `SystemPrompt`, `ToolRuntime`, and `ApprovalService`, registers a harmless deterministic fixture tool, executes it through the real ToolRuntime, observes the real approval pair and `tools/result`, and reconciles real `Session.append()` plus `snapshotEvents()` data. The pinned ToolRuntime does not itself append the canonical `tool/call`/`tool/result` history in this direct fixture, so those committed Session events are appended explicitly with the real Session API and valid surface metadata.

Restart proof is an in-process new-controller reconstruction from an immutable committed Session snapshot, including repeat replay and disposed-generation isolation. True persistent disk/process restart is `NOT_RUN`; no plugin-owned persistence exists. The native PTC producer is `NOT_RUN`; only the accepted T03 source-backed projector is reused.

No provider, model, browser, privileged operation, or runtime network call was used. Git remote inspection and publication are the only network activity.

## Commands and quality gates

Final executable state was tested before the implementation commit and was unchanged by the commit.

- `pnpm run test:r4`: 16/16 PASS.
- `pnpm run test`: T01 9/9, T02 16/16, T03 17/17, R4 16/16 — all PASS.
- `pnpm run typecheck`: PASS.
- `pnpm run build`: PASS for Host and Client bundles.
- Host export smoke import: PASS (`apply`, `installLedger`, and `replayPtcSnapshot`).
- `pnpm pack --dry-run --json`: PASS; expected package manifest contains Host/Client bundles, declarations, `package.json`, and README.
- Staged scope audit: PASS; only the intended T04 manifest was staged.
- Secret-pattern audit: PASS; no credential/private-key patterns. Fixture literals containing `secret`/`private` are negative privacy assertions, not credentials.
- Lint and publint: NOT_CONFIGURED in this repository; no corresponding script or binary exists.
- `git diff --check`: implementation files are clean. The supplied exact Markdown documents retain their intentional Markdown hard-break trailing spaces; these are reported as warnings and were not rewritten.

Expected T01 fixture-fault stack traces appear in the passing T01 tests and are part of the existing fault-isolation evidence, not test failures.

## Publication handoff

- Executable Tested SHA / implementation commit: `a6f51c15190c063e83e8bae09d591db4feddb01b`.
- Report-only commit and final local/remote SHA are recorded in the final Codex handoff after normal push verification.
- Required final equality: `HEAD == origin/main == git ls-remote origin refs/heads/main`.

T01 Live Browser remains `NOT_RUN`; actual T03 PTC producer remains `NOT_RUN`; the upstream `4878cdab...` runtime remains `NOT_VALIDATED`; R5 is `NOT_RUN`. Codex stops after publication for ChatGPT Web independent review.
