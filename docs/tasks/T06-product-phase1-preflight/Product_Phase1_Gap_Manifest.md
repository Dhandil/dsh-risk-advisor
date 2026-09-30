# T06 — Product Phase 1 Gap Manifest

This manifest maps Architecture §47's Host Skeleton one-to-one to the actual plugin at `main @ 9b453fdfcd06d70ad9497a99ed88609a9fb0c923`. It distinguishes existing bounded mechanisms from product gaps; it does not authorize implementation.

## Phase 1 contract map

| Phase 1 target | Current exact source / test evidence | Status | Missing behavior / constraint | Dependency and proposed subtask |
|---|---|---|---|---|
| Plugin lifecycle | `src/index.ts:10-35`, `apply`, `installCorrelation`, `installLedger`; T02/T04 runtime integration | `IMPLEMENTED_AND_BOUNDED` | Lifecycle installs two observational controllers, but there is no Phase 1 snapshot owner or assessment lifecycle. Both effects dispose their own generation. | Reuse `apply` and add one private foundation owner only after identity ownership is settled; keep native approval untouched. |
| OperationObserver | `src/index.ts:24-26`; `src/host/correlation.ts:119-165`; `src/host/ledger.ts:831-911`; T02/R2 and T04 runtime tests | `PARTIAL` | Observers see pre-execute/result/session events, but only retain correlation metadata and ledger facts. No immutable `OperationSnapshot` is captured at the one minting point. | Phase 1A must attach to the exact pre-execute witness without creating a second identity/mint path. |
| ExecutionId minting | `src/host/correlation.ts:120-161`, `randomUUID`, `WeakMap<ToolExecution, ActiveRecord>`, T02 R2 unit/runtime tests | `IMPLEMENTED_AND_BOUNDED` | It is live-generation identity for correlation only. Ledger has a separate ordinal and does not receive this `ExecutionId`; no durable or Assessment ownership exists. | Reuse the exact live witness. Decide whether the correlation owner privately emits a snapshot callback or a single controller owns both concerns. |
| OperationNormalizer | No `OperationSnapshot`, `NormalizedOperation`, adapter registry or normalizer symbol exists under `src/`; R2/R4 tests only assert tool/call metadata and safe degradation | `NOT_IMPLEMENTED` | Known-tool closed adapters, canonical arguments, categories, targets and `unknown` fallback are absent. | Phase 1A: private closed adapter interface, initially conservative; no guessed shell/filesystem semantics. |
| ExecutionBoundaryCollector | No collector or boundary type exists under `src/`; current correlation/ledger store no workspace, sandbox or rollback fields | `NOT_IMPLEMENTED` | Must keep `sandboxActive` separate from `sandboxCovered` and use `unknown` when exact public evidence is unavailable. | Phase 1A: collect only verified public values; otherwise emit typed unknowns. Requires seam review before implementation. |
| SnapshotStore | `src/host/correlation.ts:111-115` and `src/host/ledger.ts:800-803` use WeakMaps for runtime state; neither stores an `OperationSnapshot` by `ExecutionId` | `NOT_IMPLEMENTED` | No bounded `Map<ExecutionId, OperationSnapshot>`, TTL/eviction, privacy boundary or snapshot read contract exists. | Phase 1A: private ephemeral store with explicit bounds, cleanup and HMR/dispose generation isolation. Do not persist raw arguments or send them to Browser. |
| ActiveExecutionIndex | `src/host/correlation.ts:110-317`, exported class plus frozen `CorrelationDiagnostics`; T02 16 tests and pinned runtime path | `IMPLEMENTED_AND_BOUNDED` | External facade is intentionally diagnostic/read-only. It does not expose the private exact `ToolExecution` record or a durable join witness. | Reuse; never use historical callId as fallback and never clone mint logic. Exact internal ownership must be approved before snapshot integration. |
| AssessmentStore | No `AssessmentEnvelope`, `AssessmentStore` or assessment map in `src/`; T05 explicitly records it as not implemented | `NOT_IMPLEMENTED` | No assessmentId, status/stage, immutable A1/A2 lifecycle, expiry or presented-assessment association exists. | Deferred to Phase 1B; no risk score or assessment object in Phase 1A. |
| `approval/asked` observer | `src/host/correlation.ts:214-225, 261-300` records read-only approval observations; `src/host/ledger.ts:914-917, 983-986` records live approval IDs; T02/T04 tests | `PARTIAL` | No coordinator, exact binding to a new assessmentId, unavailable envelope or resolved-approval guard exists. | Phase 1B after Phase 1A identity/store seam; keep `approval/request` out of authority and do not return `ApprovalOutcome`. |
| Browser read endpoint | No Host route/transport/DTO implementation under `src/`; `src/client/index.ts:16-33` only registers a slot fixture | `NOT_IMPLEMENTED` | No safe same-origin read ownership, public DTO, assessment association or degraded UI path exists. | Phase 1C after exact public transport and ownership are verified; T01 fixture is not a bridge. |

## Existing components that are safe to reuse, but not proof of Phase 1

| Component | Reusable property | Explicit non-claim |
|---|---|---|
| `src/host/ptc-replay.ts:205-620` | Bounded source-shaped replay, structural parent/root resolution, ambiguity and degraded output; T03 unit/runtime evidence | It consumes trusted Session snapshots and does not observe a native PTC producer or mint live identity. |
| `src/host/ledger.ts:799-990` | Bounded live/durable/approval facts, source audit, conflict retention, query cap and read-only facade; T04 F-001..F-015 evidence | It is not the §47 OperationSnapshot store, Context Builder or Failure Analyzer; F-006/F-007/F-013 exact cross-plane proof remains open. |
| `src/client/fixture-store.ts`, `RiskAdvisorDetail.tsx`, `client/index.ts` | Session-keyed R1 fixture, detail-slot composition, native fallback and disposal/jsdom evidence | It declares `TEST FIXTURE / no real assessment`; no Host assessment route or product Assessment renderer is present. |
| `src/host/correlation.ts` | Exact same-process live witness, collision-aware `(Session object, callId)` lookup and sanitized observations | Its public diagnostics intentionally hide mutable identity and do not prove durable join identity. |

## Dependency graph and conflicts

```text
exact tools/pre-execute ToolExecution
  └─ existing ActiveExecutionIndex mint + private live record
       ├─ Phase 1A OperationSnapshot / Normalizer / Boundary / SnapshotStore
       └─ existing approval/asked lookup (read-only)
            └─ Phase 1B AssessmentEnvelope / AssessmentStore / Coordinator
                 └─ Phase 1C verified Host read transport + Browser DTO

trusted Session events ──> existing T03 replay ──> existing T04 bounded ledger
                         (corroboration only; no historical live identity)
```

The main conflict is ownership: `correlation.ts` mints an opaque `ExecutionId` from the exact `ToolExecution`, while `ledger.ts` independently records the same execution with a private ordinal. A Phase 1A implementation must not mint a second ID and later equate the two by `(Session, callId, name)`. If the exact internal adapter cannot make one owner authoritative without exposing mutable state, the next task must STOP and return `T06_ARCHITECTURE_DECISION_REQUIRED`.

Other protected constraints:

- `rawArguments` may be read only inside a bounded private snapshot path; it must not be persisted, exported, audited or sent to Browser.
- `sandboxActive=true` never implies `sandboxCovered=true`; missing boundary evidence is `unknown`.
- No Risk Advisor listener may produce a Harness `ApprovalOutcome`, answer an approval, or block native Approval.
- Unknown, missing Session/callId, collision and observer failure must degrade safely rather than bind to historical evidence.
- No Phase 1A work may require the unvalidated upstream Session V4, deployed Browser, native PTC producer, provider, LLM, or Harness Core modification.

## Proposed reuse and verification plan

1. Treat `ActiveExecutionIndex` as the only candidate live identity owner and verify a private adapter seam before coding.
2. Keep T03 replay and T04 ledger as source-backed corroboration and degraded recovery inputs; do not retrofit them into OperationSnapshot identity.
3. Keep the R1 client fixture unchanged and explicitly outside the Phase 1 Host product path.
4. Gate any next implementation on exact Session-object ownership, raw-argument privacy, bounded lifecycle/dispose behavior, and native non-interference tests.
5. Defer Assessment, Browser transport and all evaluator/Judge work until a separately frozen task.
