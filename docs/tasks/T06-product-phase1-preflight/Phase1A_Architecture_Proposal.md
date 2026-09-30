# T06 — Proposed Phase 1A Architecture

**Proposal status:** review-only candidate. This is not an architecture freeze and does not authorize Phase 1A implementation.

## Candidate cut

Phase 1A should be the smallest executable product slice after independent approval:

> **Exact Live Operation Foundation:** reuse the T02 exact `ToolExecution` witness and one Risk Advisor-owned minting path to capture a bounded private `OperationSnapshot`, apply closed known-tool normalization with an `unknown` fallback, collect only proven execution-boundary evidence, and retain the snapshot in an ephemeral bounded store.

Phase 1A must not implement a risk verdict, LLM/Judge, AssessmentEnvelope, publisher, Browser transport, native answerer, or `ApprovalOutcome`.

## Contract inputs and outputs

### Inputs

- The real `ToolExecution` delivered to `tools/pre-execute`, including the exact object identity, `agent.session` when present, `callId` when present, tool name, root/parent metadata when publicly available, and the native continuation.
- Only public or explicitly verified internal Harness fields. Missing Session, callId, arguments, workspace, sandbox, rollback or target evidence is represented as missing/`unknown`, not inferred from historical Session events.
- `tools/result` or disposal as a lifecycle signal to retire the active index entry; this does not make the result a new identity.

### Private output

An immutable, plugin-private candidate shaped by the frozen contract:

```ts
OperationSnapshot {
  version: 1
  executionId
  sessionId
  callId
  rootCallId?
  toolName
  rawArguments       // private, ephemeral only; never exported or persisted
  normalizedOperation
  executionBoundary
  operationHash?
  createdAt
}
```

The public output of Phase 1A is deliberately narrower: a bounded read-only diagnostic suitable for later Host composition, containing sanitized identity/status and frozen `unknown`/degraded facts only. It must not expose raw arguments, mutable ToolExecution/token objects, internal continuation functions, or an authorization decision.

## Exact identity and seam decision

The current source has one exact live mint in `ActiveExecutionIndex.observePreExecute()` (`src/host/correlation.ts:119-165`). `LedgerController.observePreExecute()` separately records an ordinal (`src/host/ledger.ts:831-855`). Phase 1A must choose one of these designs before implementation:

1. **Preferred:** make one private Host observer own the exact live record and emit both the existing correlation view and the new private snapshot through internal callbacks. The existing frozen diagnostics remain unchanged.
2. **Acceptable only with proof:** a private adapter reads the exact `ActiveRecord` created at the same observer invocation without cloning the minting path or widening the public facade.
3. **STOP:** if neither private arrangement is supported by verified Harness seams, do not bind snapshots by `(Session, callId, toolName)`, historical `callId`, or a ledger ordinal. Return `T06_ARCHITECTURE_DECISION_REQUIRED` for an upstream/seam decision.

The next task must explicitly demonstrate that the identity used by `OperationSnapshot.executionId` is the same identity used by the active lookup. A unique textual tuple is not sufficient.

## Normalization and boundary rules

### Closed normalization

- Start with a small explicit adapter registry whose inputs and outputs are schema-validated and bounded.
- A tool without a reviewed adapter produces `kind: 'unknown'`, bounded empty/unknown targets, and no guessed mutation or permission semantics.
- Invalid JSON, oversized or unsupported arguments produce a degraded/unknown snapshot within a finite budget; they never throw through or delay the native tool pipeline.
- `operationHash` may be computed only from bounded canonicalized data and is never used as Execution identity, permission, or TOCTOU protection.

### Boundary collection

- `workspaceContained`, target scope, `sandboxActive`, `sandboxCovered`, rollback/checkpoint and canonical targets each have independent truth values.
- `sandboxActive=true` is never converted to `sandboxCovered=true`.
- No private process/global assumption is promoted to operation-level evidence.
- If the pinned public seam cannot establish a value, use `unknown` and preserve native Approval.

## Privacy and lifecycle

- Store snapshots only in plugin-private memory, keyed by the exact Risk Advisor `ExecutionId`.
- Use explicit capacity and TTL candidates from Architecture §12 only after ChatGPT approves their product status; eviction is visible as degraded/unavailable, never as a historical rebind.
- Remove active identity on the exact live result and retire the generation on dispose/HMR. A late result from an old generation cannot revive a snapshot.
- Do not write raw arguments, full Session events, credentials, prompts or result content to disk, audit output, Browser DTOs or public Context state.
- Detach and freeze every diagnostic DTO. A failure in normalization, boundary collection or snapshot retention is observational and must not prevent `next()` or alter native Approval.

## Focused proof plan for the next task

The next implementation task should add tests only after the seam decision is frozen. Required negative and positive cases are:

| Proof | Required assertion |
|---|---|
| exact live mint | One real `ToolExecution` gets one opaque snapshot ID; no second mint path; same active lookup ID. |
| missing Session/callId | Snapshot is unavailable/degraded; no historical fallback; native continuation remains unchanged. |
| same callId collision | Two exact live executions remain distinct; lookup is `AMBIGUOUS`; no last-writer-wins. |
| invalid/oversized args | Bounded parse/normalization returns unknown/degraded without raw export or unbounded delay. |
| known vs unknown tool | Known adapter emits only its closed schema; unknown tool never receives guessed semantics. |
| boundary truth | `sandboxActive` and `sandboxCovered` remain independent; unavailable values are unknown. |
| observer fault | Fault containment calls native `next()` exactly once and preserves native result/outcome. |
| result/dispose/HMR | Exact result retires the active record; late old-generation callbacks cannot revive it. |
| reentrancy | Nested executions use exact parent/token evidence when available and do not collapse by root/callId. |
| privacy | Public snapshots contain no raw arguments, ToolExecution, token, full event or sensitive error text. |
| inherited regression | T01–T05 accepted behavior remains unchanged; no Browser, provider, PTC-producer or Harness Core dependency is introduced. |

Host integration should use the already established pinned `Context` + `SessionStore` + `ToolRuntime` fixture seam, but the test must be a new Phase 1A proof; prior T02/T04 tests are evidence, not a substitute for snapshot ownership.

## Deferred Phase 1B and 1C

- **Phase 1B:** after exact identity and SnapshotStore ownership are approved, add `approval/asked` coordinator, `AssessmentEnvelope`/`AssessmentStore`, `FOUND/AMBIGUOUS/NOT_FOUND` binding, pending/unavailable states, expiry and resolved-approval immutability. It must remain parallel to native Approval and never return `ApprovalOutcome`.
- **Phase 1C:** after a public exact Host/Browser ownership and transport seam is verified, add a Browser-safe read DTO and degraded presenter. Do not replace or relabel the T01 fixture, add native buttons, or assume Browser owns Host approval IDs.

## Decisions required from ChatGPT Web

1. Which private adapter is the single authoritative owner of the existing T02 mint and the Phase 1A snapshot?
2. Which Harness fields are contractually public enough for Session ownership, arguments, workspace/cwd, sandbox and target evidence on the frozen pin?
3. What bounded raw-argument canonicalization/hash policy is acceptable without persistence or Browser exposure?
4. Are the Architecture §12 TTL/cap numbers approved as Phase 1A candidates, and what degraded DTO is allowed after eviction?
5. Which minimal known-tool adapters are in scope, and which must remain `unknown`?
6. Is a same-process private Host diagnostic seam sufficient for Phase 1A, with Browser transport explicitly deferred?

If any answer requires modifying Harness Core, relying on unverified upstream V4, constructing a historical identity, or making Native Approval depend on Risk Advisor, stop and return `T06_ARCHITECTURE_DECISION_REQUIRED`.
