# Risk Advisor Phase 12.1 — Live Correction Finding Core Freeze

## Freeze outcome

`RISK_ADVISOR_PHASE12_1_FROZEN_READY_FOR_IMPLEMENTATION`

This document freezes Phase 12.1 architecture. It does not authorize implementation by itself.

## 1. Baseline

- Online Correction V1 Architecture Preflight: `58c260ee1c6675d82dc76125acfe32432f786279`
- Phase 11 final closure baseline: `7faa93d5c9c441f95eab4ca0adc3a1627c448942`
- Pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`

Phase 12.1 is the first Online Correction V1 implementation slice. It adds a deterministic live Finding core only. Phase 12.2 owns the future user-facing advisory bridge/UI.

## 2. Scope and authority

Phase 12.1 adds one Host-owned, process-local capability:

> Observe already-settled live execution and verifier evidence, derive one of two deterministic advisory Findings, and expose bounded read-only Host diagnostics.

It is not an execution authority.

Phase 12.1 MUST NOT:
- modify Tool input or output;
- block or delay Tool execution;
- trigger retry, replan, cancellation, new Run, or another Tool call;
- modify Native Approval or Risk Assessment;
- inject Agent/model context;
- read Pattern or Guidance as decision evidence;
- call an LLM, embedding model, Fast Judge, or Deep Judge;
- add Browser/UI/bridge routes;
- add durable storage or migrations;
- modify Harness Core.

A Finding only states that a frozen live predicate matched. It does not claim the overall user goal failed, that an operation is unsafe, or that a particular corrective action is guaranteed to work.

## 3. Evidence authority

Only these live sources may create or suppress a Phase 12.1 Finding:

1. `RetryEscalationAnalyzer` read-only `FailureChainSummary` after the current `tools/result` has settled into the analyzer.
2. Sanitized `VerificationRecordV1` emitted by the existing `PostconditionVerifier` after the verification store accepted the record.

Phase 11 Experience, Outcome, Pattern, and Guidance are explicitly excluded from trigger, diagnosis, disposition, and wording authority.

Approval state, assessment output, user/model/Agent text, process success alone, raw Tool result content, and Browser state are not Finding authority.

## 4. Exact result ordering

Direct write/edit postcondition verification publishes synchronously from `verifier.observeResult()`. Therefore the current execution/session association for the correction runtime must exist before verifier publication.

The frozen `tools/result` observer order is:

```
failureChain.observeResult(exec, result)
  -> correction.observeSettledResult(exec, executionId, failureChain.diagnostics.get(executionId))
  -> verifier.observeResult(exec, result)
       -> verifier store.put(...)
       -> correction.observeVerification(storedVerification)
       -> existing FailureChain / Outcome observers
  -> experience.observeResult(...)
  -> foundation.retire(...)
```

The exact relative ordering of the existing Failure Chain and Outcome verification observers may remain as currently required, but Correction must receive the **stored/sanitized** verification record and must already hold the execution/session association before a synchronous direct verifier callback can arrive.

Correction callbacks are observational. Any Correction exception is contained and cannot alter existing result/verifier/Experience/Outcome behavior.

No pre-tool interception is added in Phase 12.1.

## 5. Finding model

Only two advisory Finding kinds exist:

```ts
type LiveCorrectionFindingKind =
  | 'REPEATED_FAILURE_WITHOUT_PROGRESS'
  | 'POSTCONDITION_NOT_SATISFIED'

type LiveCorrectionDiagnosisCode =
  | 'REPEATED_SAME_SIGNATURE_FAILURE'
  | 'VERIFIED_POSTCONDITION_MISMATCH'

type LiveCorrectionDisposition = 'ADVISE'
```

`OBSERVE` is the deterministic non-emission decision. It is not stored as a Finding and is not an action.

A Finding is immutable once emitted. A later evidence conflict may suppress that Finding from current reads, but must not rewrite it into a different advisory.

## 6. Finding identity

For an execution ID and Finding kind, serialize:

```ts
[
  'risk-advisor-live-correction-v1',
  executionId,
  findingKind,
]
```

with compact `JSON.stringify`, UTF-8 encode, and SHA-256 hash.

```
findingId = ra-correction-v1_<64 lowercase hex>
```

The runtime does not expose the tuple, raw fingerprint, or failure-signature key.

One execution may have at most one Finding of each kind. Duplicate equivalent evidence is idempotent.

## 7. Finding record

The Host-internal immutable record is:

```ts
interface LiveCorrectionFindingV1 {
  readonly schemaVersion: 1
  readonly findingId: string
  readonly executionId: string
  readonly kind:
    | 'REPEATED_FAILURE_WITHOUT_PROGRESS'
    | 'POSTCONDITION_NOT_SATISFIED'
  readonly diagnosis:
    | 'REPEATED_SAME_SIGNATURE_FAILURE'
    | 'VERIFIED_POSTCONDITION_MISMATCH'
  readonly disposition: 'ADVISE'
  readonly advisoryCode:
    | 'STOP_EXACT_RETRY_PATH_V1'
    | 'INSPECT_UNSATISFIED_POSTCONDITION_V1'
  readonly observedAt: number
  readonly retryCount?: number
  readonly recentFailureCount?: number
  readonly verifierSource?: 'tool-contract' | 'known-adapter'
  readonly verifierAdapterId?: string
  readonly evidenceQuality?: 'high' | 'medium'
}
```

The schema/constructor enforces the exact legal field combination for each Finding kind.

F1 carries retry counts only. F2 carries source/adapter/evidence quality only. No field may carry a raw command, argument, path, output, error text, prompt, approval content, operation fingerprint, or failure-signature material.

`executionId` remains Host-internal in Phase 12.1. Phase 12.2 must define a separately frozen browser-safe DTO before any client exposure.

## 8. F1 — REPEATED_FAILURE_WITHOUT_PROGRESS

F1 is intentionally conservative and exact-operation scoped.

Emit F1 only if the current post-result `FailureChainSummary` satisfies **all**:

- `status === 'READY'`;
- `truncated === false`;
- `retryOf` is present;
- `retryCount >= 1`;
- `recentFailureCount >= 2`;
- `sameRootCause === true`.

These conditions rely on the existing analyzer's frozen exact-fingerprint retry relation and deterministic failure signature.

For Phase 12.1, “without progress” means only:

> no settled success has broken this exact operation-fingerprint retry chain.

It does **not** mean:
- no progress toward the user's overall goal;
- no progress across changed command variants;
- semantic equivalence across different fingerprints.

Changed fingerprint, unsupported tool shape, unknown signature, expired relation, degraded/truncated history, or a prior same-fingerprint success MUST produce OBSERVE for F1.

F1 does not inspect Pattern/Guidance, verifier text, stdout/stderr, or model interpretation.

Mapping:

```
kind          = REPEATED_FAILURE_WITHOUT_PROGRESS
diagnosis     = REPEATED_SAME_SIGNATURE_FAILURE
disposition   = ADVISE
advisoryCode  = STOP_EXACT_RETRY_PATH_V1
```

Fixed renderer text:

> The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.

## 9. F2 — POSTCONDITION_NOT_SATISFIED

F2 is emitted only from a sanitized stored `VerificationRecordV1`.

The exact predicate is:

- `status === 'MISMATCHED'`;
- `semanticSuccess === false`;
- `evidenceQuality === 'high' || evidenceQuality === 'medium'`;
- `reasonCodes` contains `POSTCONDITION_MISMATCH`;
- source/adapter is one of:

```
tool-contract:
  tool.write.v1
  tool.edit.v1

known-adapter:
  shell.mkdir.v1
  shell.copy-file.v1
  git.branch-switch.v1
  package.node-resolve.v1
```

Any `MATCHED`, `UNKNOWN`, `UNAVAILABLE`, low-quality record, unsupported source/adapter, `VERIFICATION_CONFLICT`, or inconsistent status/semantic pairing produces OBSERVE.

Mapping:

```
kind          = POSTCONDITION_NOT_SATISFIED
diagnosis     = VERIFIED_POSTCONDITION_MISMATCH
disposition   = ADVISE
advisoryCode  = INSPECT_UNSATISFIED_POSTCONDITION_V1
```

Fixed renderer text:

> The operation completed, but the verified expected postcondition was not satisfied. Do not treat this execution as goal completion; inspect the target state before continuing.

F2 may be emitted synchronously during `tools/result` for direct write/edit verification or later from the async known-adapter verifier path.

## 10. Conflict and suppression semantics

Finding creation is insert-only in memory for one active runtime generation.

For the same `findingId`:
- equivalent semantic content is an idempotent no-op;
- divergent semantic content marks that identity `CONFLICTED` and suppresses it from current reads;
- no divergent record replaces the original Finding.

For F2 specifically, if a later stored verifier callback for the same execution becomes `UNKNOWN` because of `VERIFICATION_CONFLICT`, any previously emitted F2 Finding for that execution is suppressed for the rest of that runtime generation.

A suppressed/conflicted Finding is not converted into another Finding and is not reconstructed from Phase 11.

## 11. Process-local execution/session association

The runtime maintains a bounded process-local association from `executionId` to the owning Session so an async verifier callback can be scoped correctly.

Association is captured from the settled Tool execution before `verifier.observeResult`.

If Session or execution identity is unavailable, Correction fails closed and emits nothing.

Association retention is bounded to the same live horizon as the verifier/failure relation:
- TTL: 5 minutes;
- maximum retained execution associations: 512.

Session disposal removes all associations and Findings owned by that Session.

Expired or evicted association means a later verifier callback cannot emit F2. It must not guess or recover association from durable Phase 11 data.

## 12. Bounded Finding runtime

Frozen bounds:

```
LIVE_CORRECTION_TTL_MS          = 5 * 60 * 1000
MAX_CORRECTION_PER_SESSION      = 64
MAX_CORRECTION_GLOBAL           = 256
MAX_EXECUTION_ASSOCIATIONS      = 512
```

The store is non-durable.

Before inserting:
1. expire TTL-old Findings/associations;
2. evict the oldest settled Finding for that Session until the per-session bound is available;
3. evict the oldest settled global Finding until the global bound is available.

Eviction marks the affected session diagnostic as `truncated: true`. It never changes Tool/verifier/assessment behavior.

There is no pending Finding object: computation is synchronous over already-settled evidence. Therefore settled Finding eviction is always allowed.

If association capacity is full after expiry, evict the oldest association. A later verifier that lost its association is conservatively ignored.

No capacity event may propagate to Tool execution, Failure Chain, verifier, Outcome, Approval, Risk Assessment, Pattern, or Guidance.

## 13. Host diagnostics

Phase 12.1 exposes Host-only immutable diagnostics, not Browser/UI.

Recommended interface:

```ts
interface LiveCorrectionDiagnostics {
  readonly get: (findingId: string) => LiveCorrectionFindingV1 | undefined
  readonly forExecution: (executionId: ExecutionId) => readonly LiveCorrectionFindingV1[]
  readonly forSession: (session: Session) => {
    readonly findings: readonly LiveCorrectionFindingV1[]
    readonly truncated: boolean
  }
  readonly render: (findingId: string) => string | undefined
}
```

Current reads:
- exclude expired Findings;
- exclude conflicted/suppressed identities;
- return immutable copies/views;
- never expose operation fingerprints or failure-signature keys.

This diagnostics seam may be provided on Context for Host inspection/tests. It is not exported through the Browser bridge in Phase 12.1.

## 14. Privacy

Phase 12.1 persists nothing.

Finding/runtime state MUST NOT retain or expose:
- raw command or arguments;
- file path, cwd, file/edit content;
- stdout/stderr or Tool result body;
- failure/error message text;
- approval justification or decision content;
- user/model/Agent text;
- credentials/secrets;
- operation fingerprint;
- failure-signature key.

Only bounded enums, opaque IDs, counts, adapter/source class, quality, and timestamps are retained.

The fixed renderer consumes only Finding enum/count fields.

## 15. Lifecycle

The runtime is generation-scoped and observational.

- construct before correlation hooks are installed;
- register settled-result association/evaluation in the frozen result order;
- receive only stored/sanitized verifier records;
- on `session/disposed`, remove that Session's Findings and associations;
- on runtime dispose, clear all process-local state and ignore later callbacks;
- verifier generation fencing remains owned by the existing verifier;
- Correction adds no async work of its own.

No Finding survives plugin restart. No startup reconstruction occurs.

## 16. Existing subsystem invariants

Phase 12.1 must not change semantics of:
- `RetryEscalationAnalyzer` fingerprinting, retry edges, sameRootCause, TTL, capacity, or diagnostics;
- Postcondition verifier adapters, scheduler, evidence quality, status, or storage;
- Experience / Outcome / Pattern / Guidance;
- Rule Engine / Fast Judge / Deep Judge;
- Approval Assessment / Browser bridge;
- Tool execution/correlation lifecycle beyond inserting observational callback order;
- Harness Core.

A minimal internal callback extension to send stored verifier records to Correction is allowed. It must not alter the stored record or existing observers.

## 17. Required proof matrix

At minimum:

- **C1 — F1 positive:** exact-fingerprint retry chain, two settled failures, same signature -> one F1.
- **C2 — F1 changed fingerprint:** changed command/fingerprint -> no F1.
- **C3 — F1 success break:** settled success for same fingerprint breaks chain -> no F1 across it.
- **C4 — F1 uncertainty:** DEGRADED/truncated/expired/unsupported/unknown-root relation -> no F1.
- **C5 — F1 idempotence:** duplicate observation does not duplicate Finding.
- **C6 — F2 direct:** direct write/edit high-quality mismatch -> one F2 during result lifecycle.
- **C7 — F2 async:** supported known-adapter medium mismatch may emit F2 after Tool result.
- **C8 — F2 negatives:** MATCHED/UNKNOWN/UNAVAILABLE/low-quality/unsupported/conflict -> no current F2.
- **C9 — F2 conflict suppression:** qualified F2 followed by verifier conflict suppresses prior current Finding without rewrite.
- **C10 — ordering:** direct synchronous verifier cannot outrun execution/session association.
- **C11 — deterministic identity:** same execution+kind gives same safe finding ID; kinds partition identity.
- **C12 — fixed wording:** exact renderer output, no free-form text path.
- **C13 — privacy:** sentinel command/path/output/prompt/secret values never enter retained Finding state or renderer.
- **C14 — bounds:** TTL/per-session/global/association eviction is deterministic and affects Correction only.
- **C15 — session lifecycle:** session disposal removes that Session's Findings and associations only.
- **C16 — generation lifecycle:** dispose clears all state; later result/verifier callbacks are ignored.
- **C17 — authority boundary:** no Tool/Approval/Risk/retry/run/Agent-context behavior changes; no Browser route.
- **C18 — evidence isolation:** no imports/reads from Pattern/Guidance and no LLM/model calls.
- **C19 — regressions:** existing Failure Chain and verifier contracts remain unchanged.
- **C20 — product boundary:** Phase 12.1 exposes Host diagnostics only; user-facing advisory is deferred to 12.2.

## 18. Frozen conclusion

Phase 12.1 is a deterministic live advisory Finding core.

It deliberately favors precision over recall:
- F1 means repeated failure of the **same exact operation fingerprint**, not semantic retry-family inference.
- F2 means an existing supported verifier produced a trustworthy postcondition mismatch.

The runtime observes and reports; it does not correct execution.

No historical evidence, LLM, Browser/UI, persistence, or execution authority is introduced.
