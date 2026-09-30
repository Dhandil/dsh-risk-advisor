# Risk Advisor — Product Phase 1A: Exact Live Operation Foundation

**Status:** FROZEN FOR IMPLEMENTATION; only ChatGPT Web decides ACCEPTED / REPAIR / STOP after independent review.  
**Repository:** `Dhandil/dsh-risk-advisor`, `main`; starting remote SHA `39b50d18514988de64997ad3de5569bf5c795c1c` (T06 docs-only accepted).  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, strictly **READ-ONLY**. The separately observed upstream `4878cdabd87d4041bdaff61d04c966883b9fd07a` remains **NOT_VALIDATED**.  
**Task directory:** `docs/tasks/Phase1A-operation-foundation/`. This is **formal product Phase 1A**, not R6, not V1 release and not authority to implement Phase 1B/1C.

## 1. Source-grounded starting facts

- `src/host/correlation.ts`: `ActiveExecutionIndex.observePreExecute(exec)` already mints the sole opaque `ra-execution-<UUID>` for the **exact real `ToolExecution` object**. It stores a `WeakMap<ToolExecution, ActiveRecord>`, an exact parent token mapping, and a collision-aware `(exact Session object, callId) → Set<ExecutionId>` active index. `observeResult` retires the exact object. Preserve its public `CorrelationDiagnostics`, external `installCorrelation(ctx)` signature/behavior and T02 tests.
- `src/index.ts`: `apply(ctx)` currently installs `installCorrelation(ctx)` and `installLedger(ctx)`; `ledger.ts` separately creates a private ordinal. Neither ordinal nor historical `(Session, callId, toolName)` is an identity bridge. T04 positive exact cross-plane F-006/F-007/F-013 is still PARTIAL/OPEN.
- Pinned Harness public `ToolExecution` supplies `name`, deep-frozen/materialized parsed `arguments`, `callId`, `rootCallId`, `agent?`, exact `token`, `parent?` token and `signal`; `exec.agent?.session` is the live ownership seam already proved by T02. `session.id` and `session.header.cwd?` are readable; the latter is **creation-time session cwd**, NOT proof of current effective per-call cwd or workspace containment. Durable `tool/call.arguments` is an unrelated raw JSON-string evidence source; never use it to manufacture live identity.
- Verified pinned tool registration shapes: `packages/fs/tool-fs/src/read.ts` tool `read` (`file_path`, optional `offset`, `limit`); `packages/fs/tool-fs/src/write.ts` tool `write` (`file_path`, `content`, optional composition-dependent `sandbox_permissions`, `justification`). A matching name/arg shape alone is not an authenticated implementation identity and must never grant authorization or imply safe behavior.
- Existing T01 is a Browser fixture, T03 is historical PTC replay, T04 is independent bounded Ledger and T05 is current-hook/controlled-simulation benchmark. Do not promote them to product Assessment/Judge/UI or a production latency policy. The inherited regression baseline is **66/66** (T01 9, T02 16, T03 17, T04 21, T05 pure 3); full R5 benchmark is separate and not a routine regression.

## 2. Authorized deliverable and architecture choice

Implement an **in-process, Host-private Exact Live Operation Foundation**:

```text
one real tools/pre-execute ToolExecution
       │
       ├── existing ActiveExecutionIndex.observePreExecute(exec)
       │      └── sole ExecutionId mint (never mint again)
       └── same synchronous invocation, exact exec object + returned ID
              └── private OperationFoundation.capture(exec, executionId)
                    ├── bounded detached OperationSnapshot
                    ├── closed read/write Normalizer, otherwise unknown
                    ├── public-evidence-only BoundaryCollector
                    └── ephemeral bounded SnapshotStore

tools/result(exact exec) → Foundation.retire(exec) + existing Index.observeResult(exec)
effect dispose/HMR → stop both generation owners; no late revival
```

**Freeze the single-owner option:** Refactor only the plugin's private Host installation wiring so a single correlation `tools/pre-execute` observer calls the existing index's `observePreExecute(exec)`, consumes **that returned ID for the same exact object**, and then calls a private Foundation capture handler synchronously before returning `next()` exactly once. Preserve the original exported `installCorrelation(ctx)` behavior for callers/tests; a non-exported installer shared by `installCorrelation` and `apply` may accept the private capture handler. `apply` MUST NOT mount `installCorrelation` twice. A separate read-only Foundation diagnostics facade may be provided through Host Context, but **must not expose** live `ToolExecution`, token, raw args, mutable private snapshots or capture/mutation methods. Do not widen `CorrelationDiagnostics` into a capture capability. Existing Ledger observer may remain independent and MUST NOT be joined by ordinal/callId.

If this is not achievable with the pinned public events and private plugin changes alone, **STOP** for architecture review; do not mint a new ID, infer it from historical events, import private Harness internals or modify Harness.

## 3. Frozen operation contracts

**Private snapshot v1** (owned detached data, not a Browser/wire DTO):

```ts
interface PrivateOperationSnapshot {
  readonly version: 1
  readonly executionId: ExecutionId      // exactly the T02 mint
  readonly sessionId: string
  readonly callId: string
  readonly toolName: string
  readonly rootCallId?: string            // ownership metadata, not retry identity
  readonly parentExecutionId?: ExecutionId // ONLY if index's exact token witness exists
  readonly createdAt: number
  readonly captureStatus: 'CAPTURED' | 'DEGRADED'
  readonly reasonCodes: readonly string[]
  readonly rawArguments?: Readonly<JsonValue> // private and bounded; see lifecycle below
  readonly normalizedOperation: PrivateNormalizedOperation
  readonly executionBoundary: PrivateExecutionBoundary
  readonly operationHash?: string         // private optional content comparison, NOT identity
}
```

A missing exact Session or nonempty bounded callId yields a sanitized `UNAVAILABLE` capture outcome; **do not change T02 mint/lookup semantics** to fabricate a snapshot. A known tool with invalid/oversized arguments may still have a `DEGRADED/unknown` private snapshot without `rawArguments`. Never block native `next()` to force completeness.

**Closed normalizer V1:** only shape-check `read` and `write` against their pinned, explicit allowed keys and types. `read` may become `filesystem-read`, `write` may become `filesystem-write`, tagged `NAME_AND_SHAPE_ONLY` / provisional semantics (not proof of actually mounted tool implementation or actual side effects). Preserve only bounded lexical requested `file_path` privately as an unverified requested target. For `write`, never export content or justification; presence of `sandbox_permissions` is only a **requested** value, not a grant or sandbox proof. Optional read offset/limit must be valid bounded numeric values; unknown/extra/missing/invalid fields become `unknown` with reason, not partially trusted normalization. All other tool names, including `bash`, `pwsh`, `edit`, `run_code`, unknown wrappers and PTC variants, are **unknown in Phase 1A**. No shell parsing, no risk verdict, no path resolution, no filesystem I/O and no inference of a tool's safety from its name.

**Input privacy/bounds:** Walk and detach only admitted JSON-like parsed `exec.arguments` with **early-stop budgets**; never `JSON.stringify` an unbounded input first. Initial implementation guardrails: max serialized/visited UTF-8 bytes **16 KiB**, nesting **8**, visited nodes **256**, object keys **64 per object**, individual string length **8192 characters**. Reject cycles, accessors/proxy failure, unsupported primitives and budget breaches fail-closed to a degraded, no-raw snapshot. Native execution retains its original arguments without mutation. If implementing strict detached parsing within this bounded budget needs a narrower safe policy, document it and STOP rather than silently broadening. Do not read/log/forward full Session logs to capture operation contents.

**Canonicalization/hash:** Only when the **entire admitted input** and closed adapter are valid: stable object-key ordering, array order preserved, primitives preserved; hash an unambiguous structured tuple `[version, toolName, canonicalArguments, boundedRequestedPermission?]` with SHA-256 if useful. No hash for partial/truncated/unknown inputs. `operationHash` is private, not exposed as a credential, identity, approval proof, cross-plane join or TOCTOU mechanism. No numeric hazard score/recommendation.

**Boundary collector:** Accept only exact evidence from the pinned public seam: `session.header.cwd?` as `sessionCreationCwd`/private cwd metadata; a requested lexical target or requested permission is explicitly labelled *requested*. Do **not** call it `workspaceRoot` or actual effective cwd. `workspaceContained`, `sandboxActive`, `sandboxCovered`, `rollbackAvailable`, `checkpointAvailable`, `targetScope`, `canonicalTargets` and reversibility remain individually `'unknown'`/empty absent independently verified per-operation evidence. In particular `sandboxActive=true` NEVER implies `sandboxCovered=true`; Phase 1A has no permission to invoke private fs/sandbox policy or to resolve/read target files. A client-visible summary must not contain cwd/path/arguments, requested permission, content, or arbitrary error text.

## 4. Snapshot ownership, bounded lifetime, diagnostics

- One Foundation instance per mounted Host generation. Use exact `WeakMap<ToolExecution, ExecutionId>` for private capture/retirement and bounded `Map<ExecutionId, ...>` for retained snapshots. No ID creation in Foundation. A duplicate notification of the **same object** is idempotent; distinct same-callId executions remain separate.
- Initial accepted product *storage caps*: **max 512 entries**, **5-minute absolute TTL from capture** (lazy deterministic sweep using an injectable monotonic test clock). Do not refresh TTL via read. Prefer evicting oldest **settled** entries on capacity; if all slots are active, decline a new snapshot as `CAPACITY_EXCEEDED`, without evicting an active identity, without changing T02 lookup, and without delaying Native Approval. On expiry, report `EXPIRED/UNAVAILABLE`, not historical fallback; avoid indefinitely retaining separate tombstones.
- On exact `tools/result`, retire Foundation's exact object; purge the private raw-argument copy immediately and retain only sanitized/normalized metadata (within the original TTL) when appropriate. The index still retires its own exact record. On dispose/HMR, mark inactive and clear snapshots, map/set and callbacks; late callbacks cannot repopulate them. No disk persistence or Session append. Explicitly test the case in which a tool never reaches result (TTL / generation disposal).
- Only a bounded **detached, deeply frozen read-only diagnostic** may be exposed to `ctx`, e.g. `get(executionId)` returning `CAPTURED | DEGRADED | EXPIRED/NOT_FOUND | CAPACITY_EXCEEDED` and sanitized metadata (`executionId`, status, tool kind, reason code(s), proven/unknown boundary flags). Do NOT expose private snapshots, exact exec/token, raw args, command/content, target paths, cwd, operationHash, native continuation, or setters. No Browser RPC/transport in Phase 1A. A private same-process accessor for a future 1B coordinator stays inside Host module composition, not on the public diagnostics facade.
- Observer/normalization failures are contained; call native `next()` **exactly once**, pass its decision/result through untouched. Do not install an `approval/request` answerer, change `ApprovalOutcome`, modify ToolExecution arguments/signal, or block the execution pipeline. If capture fails, retain only a sanitized failure reason and continue.

## 5. Exact tests and acceptance proof

Implement focused numbered tests (names flexible), covering at least:

| ID | Proof required |
|---|---|
| P1A-01 | One real exact ToolExecution → exactly one existing T02 ID and one private snapshot; equal to `lookup` when uniquely active; no other mint path. |
| P1A-02 | Repeated same-object pre-execute is idempotent; reused callId across different executions/sessions never aliases; collisions remain `AMBIGUOUS`. |
| P1A-03 | Missing agent/session/callId, or a completed historical `callId` → unavailable/degraded; no durable reconstruction; T02 diagnostics unchanged. |
| P1A-04 | Pinned `read` closed shape and `write` closed shape; requested lexical target only; content/justification never appears in diagnostics. |
| P1A-05 | Unknown tools, extra fields, wrong types, oversized/recursive/hostile args → bounded unknown/degraded; original native arguments unaffected. |
| P1A-06 | All boundary unknown values independently represented; session creation cwd is not promoted to workspaceRoot/actual cwd/containment; `sandboxActive` and `sandboxCovered` independent. |
| P1A-07 | Stable private hash for semantically identical **complete** canonical input with re-ordered object keys; no hash on truncated/unknown; hash never used for identity. |
| P1A-08 | Capacity 512, settled-first eviction, all-active refusal, five-minute absolute TTL, expired cannot historical-rebind; no unbounded retained/tombstone state. |
| P1A-09 | Exact result retires private raw copy and T02 active index at proper time; missing result eventually expires; dispose/HMR prevents late revival. |
| P1A-10 | Nested exec parent identity only from exact existing T02 parent-token mapping; same rootCallId is NOT retry lineage or identity proof. |
| P1A-11 | Injections of capture/normalizer/clock observer faults still call `next()` once and retain native decision/result; no RA ApprovalOutcome. |
| P1A-12 | Diagnostics are detached and frozen, no raw args/paths/content/cwd/hash/token/full Session/event/private error text/secret export. |
| P1A-13 | Actual pinned `Context + SessionStore + ToolRuntime + ApprovalService` with a harmless local fixture proves `apply` mounts one correlation owner, captures exact exec, preserves native approval and disposal. Any manually appended `tool/call`/result is identified as fixture, NOT cross-plane identity proof. |
| P1A-14 | Inherited `pnpm test` T01 9 + T02 16 + T03 17 + T04 21 + T05 unit 3 = **66 baseline**, PLUS Phase 1A tests; no T04 open gate promotion, no Browser/provider/real PTC claim. |

Static gates before the last full regression: typecheck, available lint (honest NOT_CONFIGURED), build Host+Client, Host export smoke, pack dry-run, diff/scope/secret/privacy scans. No R5 full benchmark unless an actual change introduces a justified performance regression concern and it is separately documented; T05's `UNDETERMINED` values stay undetermined. Product code/test drift after final tested SHA requires retesting; later report-only commits are allowed.

## 6. Prohibited expansion and STOP

No RiskAssessment/Rule Engine/Failure Analyzer/Judge/LLM, AssessmentStore/Coordinator, Browser read/transport/product UI, new `ApprovalOutcome`/Native answerer, fs/shell/privileged operation, provider/network calls, arbitrary path discovery, persistent ledger/database, real PTC producer, or Harness Core/upstream change. Preserve existing T01 fixture and T02/T03/T04/T05 behavior; maintain all T04 F-006/F-007/F-013 exact positive witness gates OPEN, real disk restart/Live Browser/V4 NOT_RUN/NOT_VALIDATED, and six R5 provisional policy fields UNDETERMINED.

STOP with `PHASE1A_ARCHITECTURE_DECISION_REQUIRED` if an exact same-call `ToolExecution`→T02 mint adapter cannot be wired without a second mint/public mutable seam; if a claimed boundary truth depends on an unverified/private Harness API; if the change needs Core modification, unexpected new-upstream APIs, protected drift edits, or a Native Approval behavior change; if privacy/caps cannot be enforced, or if full regression fails and cannot be repaired inside this scope. Never label a conceptual fixture as real producer evidence. Do not self-accept; ChatGPT Web independently reviews pushed code and evidence.
