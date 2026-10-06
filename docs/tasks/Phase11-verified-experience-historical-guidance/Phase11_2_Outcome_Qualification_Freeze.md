# Risk Advisor Phase 11.2 — Outcome Qualification & Revision Freeze

## Freeze outcome

`RISK_ADVISOR_PHASE11_2_FROZEN_READY_FOR_IMPLEMENTATION`

This document freezes Phase 11.2 architecture. It does not authorize implementation in the current task. A separate implementation task must explicitly invoke the accompanying instructions.

## 1. Baseline

- Architecture Preflight baseline / current `main`: `26504a73577a9fe994f56cacce4b2d7ac4bb9ef8`
- Accepted Phase 11.1 tested candidate: `f7be0ed60a2cece0765f003b704113acd43cf4ee`
- Pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`

The pinned Harness SHA is an exact dependency and must remain unchanged.

## 2. Scope

Phase 11.2 adds one Host-owned durable capability:

> Append a deterministic, evidence-backed outcome qualification for an immutable Experience Episode, then append a traceable revision when later independent evidence changes the current qualification.

Phase 11.2 does not modify, migrate, rewrite, delete, or add fields to `ExperienceEpisodeV1`. Episodes remain the immutable record of settled attempt facts.

This phase does not implement Pattern, Guidance, Risk Assessment integration, Browser UI, Native Approval behavior, Agent context injection, Fast/Deep Judge use, Online Correction, automatic retry, or Harness Core changes.

## 3. Terminology and authority

- **Episode**: the immutable 11.1 settlement fact, keyed by `episodeId`.
- **Outcome revision**: one immutable durable interpretation of one Episode at a point in the evidence history.
- **Current qualification**: the status of the final revision in a validated, gap-free chain. Earlier revisions remain available as history, never overwritten.
- **Primary outcome evidence**: a supported `VerificationRecordV1` from the Postcondition Verifier.

The only authority that may create revisions is the deterministic Host runtime, and Phase 11.2 V1 permits only the three revision-producing cases in §8: initial Episode qualification, a verifier evidence update, and conservative recovery for an Episode that has no revision. No model-facing or Browser mutation API is added. A revision records what the system could qualify from the evidence; it does not grant execution or approval authority.

Phase 11.2 V1 does not generate `INVALIDATED` and does not emit `INVALIDATION` or `REQUALIFICATION` revision kinds. It adds no invalidation mutation API or invalidation event listener. Browser, model, Native Approval, Risk Assessment, and Agent activity cannot trigger invalidation. These schema values are reserved for a future separately frozen authority; before any future runtime may emit them, that Freeze must define the authorized principal, triggering event, and deterministic predicate. Until then, no such authority or predicate exists.

## 4. Qualification vocabulary and exact precedence

The frozen status enum is:

```ts
type OutcomeStatus =
  | 'VERIFIED_SUCCESS'
  | 'VERIFIED_FAILURE'
  | 'UNKNOWN'
  | 'NOT_EXECUTED'
  | 'INVALIDATED'
```

Apply these rules in order:

1. `NOT_EXECUTED` only when the immutable Episode has a structured terminal error with the exact code `ABORTED_BEFORE_DISPATCH`. This is a disposition of the attempt, not a claim that the user's goal failed or succeeded. An approval outcome alone never establishes this status.
2. `VERIFIED_SUCCESS` only when a supported verifier record is internally consistent and reports `MATCHED`, `semanticSuccess: true`, and `evidenceQuality` of `high` or `medium`.
3. `VERIFIED_FAILURE` only when a supported verifier record is internally consistent and reports `MISMATCHED`, `semanticSuccess: false`, and `evidenceQuality` of `high` or `medium`.
4. Every other case is `UNKNOWN`, including no verifier record, process/tool error or success without conclusive verifier evidence, `UNAVAILABLE`, `UNKNOWN`, low-quality evidence, unsupported adapters, and verification conflict.
5. `INVALIDATED` is reserved and must not be emitted by the Phase 11.2 V1 runtime. Invalidation and requalification are outside this phase unless a future Freeze explicitly defines their authority, event, and deterministic predicate.

Only the two exact verifier pairings above can produce `VERIFIED_SUCCESS` or `VERIFIED_FAILURE`. Tool success, exit code zero, absence of a thrown error, `approval.outcome = allowed-once`, retry-chain success, or Agent/user statements must never be substituted for the verifier.

`approval.outcome = rejected/cancelled/unavailable` is not semantic failure evidence. `approval.outcome = allowed-once` is not correctness evidence. A `NOT_EXECUTED` result depends on the exact durable pre-dispatch terminal code, not on approval permission by itself.

Verifier evidence quality `medium` is sufficient because the current frozen known adapters are deterministic and bounded. Low quality remains inconclusive. If future verifier classes need a different threshold, that is a new versioned qualification rule and must create a revision; it cannot reinterpret old rows in place.

## 5. Durable domain and immutable revision identity

Use only pinned Harness `ctx.storageDomain`.

```text
name:    risk_advisor_outcome
version: 1
layout:  per-record
table:   revisions
```

This is a distinct authoritative domain. Do not add an outcomes table to, version-bump, or otherwise change `risk_advisor_experience`. Do not set `invalidRecords: 'backup-and-skip'`; malformed authoritative history fails opening the Outcome domain loudly.

Each revision has a deterministic table key and `revisionId`:

```text
ra-outcome-v1_<sha256(episodeId)>_<revisionNumber padded to 8 decimal digits>
```

The digest is lowercase hexadecimal SHA-256 over the exact UTF-8 bytes of the complete `episodeId`. The padded ordinal starts at `00000001`. This key uses the pinned per-record safe-character set `[A-Za-z0-9_-]+`.

## 6. Frozen OutcomeRevisionV1 schema

The semantic schema is:

```ts
interface OutcomeRevisionV1 {
  schemaVersion: 1
  revisionId: string
  episodeId: string
  revisionNumber: number
  previousRevisionId?: string
  revisionKind:
    | 'INITIAL'
    | 'POSTCONDITION_UPDATE'
    | 'INVALIDATION'
    | 'REQUALIFICATION'
  status: 'VERIFIED_SUCCESS' | 'VERIFIED_FAILURE' | 'UNKNOWN' | 'NOT_EXECUTED' | 'INVALIDATED'
  ruleId:
    | 'outcome-v1-postcondition'
    | 'outcome-v1-no-evidence'
    | 'outcome-v1-not-executed'
    | 'outcome-v1-conflict'
    | 'outcome-v1-invalidation'
  recordedAt: number
  reasonCodes: readonly string[]
  postconditionEvidence?: {
    source: 'tool-contract' | 'known-adapter'
    adapterId: string
    status: 'MATCHED' | 'MISMATCHED' | 'UNKNOWN' | 'UNAVAILABLE'
    semanticSuccess: true | false | 'unknown'
    evidenceQuality: 'high' | 'medium' | 'low'
    reasonCodes: readonly string[]
    observedAt: number
    durationMs: number
  }
}
```

`INVALIDATION`, `REQUALIFICATION`, `INVALIDATED`, and `outcome-v1-invalidation` remain reserved schema vocabulary only. The Phase 11.2 V1 runtime must never emit these values; their presence in the type/schema does not authorize a producer, API, or transition.

The concrete runtime schema must be strict, bounded, and validate the deterministic key/ID relationship, positive safe revision number, nonnegative safe timestamps/duration, bounded reason-code arrays, and status/rule consistency. The embedded verifier evidence is a sanitized snapshot. It must omit `executionId`, Session/call/approval IDs, raw commands/arguments, paths, outputs, result values, and any user/model content.

`episodeId` is the only cross-layer identity stored in an outcome revision. `executionId` may be used transiently in memory to join verifier callbacks to an Episode; it must not be duplicated into the Outcome domain.

## 7. Append-only revision and lineage rules

The Storage Domain table API's `put` can overwrite, so the Risk Advisor runtime must enforce append-only behavior:

1. Revisions are serialized through one Outcome runtime write chain.
2. A missing deterministic key may be durably inserted.
3. An existing byte/semantic-identical revision is an idempotent no-op.
4. An existing key with divergent content is a conflict: never overwrite; mark Outcome diagnostics `CONFLICTED` and fail closed for that Episode.
5. Revision 1 has no `previousRevisionId`. Revision `n > 1` must name exactly revision `n - 1` for the same Episode.
6. The Outcome runtime never deletes or updates revision records and exposes no mutable head record. Current state is derived from the last row in the validated contiguous chain.
7. Duplicate verifier callbacks with the same sanitized evidence are no-ops. Distinct later verifier evidence appends a `POSTCONDITION_UPDATE` revision even if it leaves the status unchanged, when it materially changes the evidence snapshot. No explicit requalification/invalidation request is supported in V1.
8. A verifier conflict is itself retained as a `POSTCONDITION_UPDATE` revision with status `UNKNOWN` and rule `outcome-v1-conflict`; the earlier judgment remains in history. It does not emit an invalidation revision or `INVALIDATED` status.

At open, validate every record and every per-Episode chain. A gap, fork, duplicate ordinal, missing predecessor, orphaned Episode reference, mismatched key, or divergent same-key row makes the authoritative Outcome subsystem `UNAVAILABLE`/`CONFLICTED`; do not choose a convenient winner or repair history silently.

## 8. First revision, late verifier results, and recovery

The only Episode commit trigger remains the 11.1 `tools/result` trigger. Phase 11.2 revisions may be produced only by (a) initial qualification after an Episode durably commits, (b) a later verifier evidence update, or (c) conservative recovery of an Episode with no revision. No other event or caller may create a revision. Outcome creation is downstream of the durable Episode write:

1. `ExperienceRuntime` snapshots the Episode and requests its asynchronous durable write without blocking or changing the Harness result path.
2. After that write is durably acknowledged, it notifies the Outcome runtime.
3. The Outcome runtime appends revision 1 using a matching verifier snapshot already observed, or a conservative `UNKNOWN`/`NOT_EXECUTED` result when no conclusive evidence is available.
4. If a supported shell verifier finishes later, its `onRecord` callback joins by the in-memory `executionId`→`episodeId` index and appends a `POSTCONDITION_UPDATE` revision. It never edits the Episode or a prior revision.

The synchronous write/edit verifier callback currently precedes the Episode write request. The implementation must retain that sanitized callback in a bounded in-memory handoff until the corresponding Episode commit is acknowledged. The callback must not wait for verifier work, and the Tool result observer must not await either durable write.

There is no cross-domain transaction. If the Episode commit succeeds and the first Outcome write fails, preserve the Episode and report Outcome degradation. On the next clean open, scan Episodes and append an initial conservative revision for any Episode with no revision. For that recovery-only initial row, use Episode facts alone: the explicit pre-dispatch code may yield `NOT_EXECUTED`; otherwise use `UNKNOWN`. Do not claim a verifier result that was not durably retained. Recovery never emits `INVALIDATED`, `INVALIDATION`, or `REQUALIFICATION`.

Existing revision chains are never replayed from current process-local verifier/failure-chain stores. A missing Outcome domain or write failure does not disable V1 or change existing approvals/assessments.

## 9. Storage capacity and failure behavior

Frozen hard limits:

```text
MAX_OUTCOME_EPISODE_REVISIONS = 16
MAX_OUTCOME_REVISIONS         = 100_000
MAX_PENDING_VERIFIER_HANDOFFS = 512
```

Never evict, prune, compact, or overwrite authoritative revisions automatically. When either durable revision cap is reached, retain all history, stop appending, and expose `CAPACITY_EXCEEDED`. At handoff cap, do not persist unbounded callback state; the affected Episode remains unqualified until a later durable/recoverable evidence path can qualify it. No arbitrary timers or verifier waits are introduced.

Storage capability absence, domain-open failure, malformed history, read/write failure, or close failure affects only the Phase 11 historical outcome capability. It must not block, delay, reject, or modify Tool execution, Native Approval, Risk Assessment, Browser behavior, or Phase 11.1 Episode semantics.

## 10. Lifecycle and single-process boundary

The Outcome runtime owns one `risk_advisor_outcome` handle for one active `storageDomain` capability generation. It must:

- accept callbacks only while its generation is active;
- own and contain every async append promise;
- drain verifier callbacks before closing the Outcome domain;
- drain Episode commit acknowledgments before closing the Outcome domain;
- reject new revisions once teardown begins;
- close the Outcome handle and permit clean reopen;
- retain no observer or pending promise after disposal.

The coordinated teardown order is: stop new result capture, fence/drain the verifier scheduler, drain Episode writes and commit callbacks, drain Outcome revisions, then close Outcome and Experience domain handles. The implementation must own this ordering; it must not depend on incidental Cordis disposer ordering.

The acceptance boundary remains one active Host process. Harness Storage Domain does not provide cross-process change push or compare-and-swap. Do not claim multi-process concurrent append safety.

## 11. Diagnostics and privacy

Expose only Host-side read-only diagnostics, for example:

```ts
interface OutcomeDiagnostics {
  status(): 'READY' | 'UNAVAILABLE' | 'CAPACITY_EXCEEDED' | 'CONFLICTED'
  revisionCount(): number
  current(episodeId: string): OutcomeRevisionV1 | undefined
  revisions(episodeId: string): readonly OutcomeRevisionV1[]
}
```

Do not expose the domain handle or an outcome mutation method. Do not register a model-facing tool, Browser route, or UI.

Persist only episode identity, revision lineage, deterministic rule/status, bounded codes/timestamps, and the sanitized verifier metadata listed above. Do not persist `VerificationRecordV1.executionId`, raw operation payload, path/cwd, file contents, stdout/stderr, result body/value, approval justification, Session/call/approval IDs, user/model content, credentials, or secrets.

## 12. Required proof matrix

At minimum, Phase 11.2 tests must prove:

- **O1 — verified success:** only `MATCHED + true + high/medium` yields `VERIFIED_SUCCESS`.
- **O2 — verified failure:** only `MISMATCHED + false + high/medium` yields `VERIFIED_FAILURE`.
- **O3 — inconclusive evidence:** absent, unknown, unavailable, low-quality, unsupported, and inconsistent verifier data yield `UNKNOWN`.
- **O4 — process distinction:** process/tool success or failure without conclusive postcondition evidence never becomes verified success/failure.
- **O5 — approval distinction:** allowed is not correctness; rejected/cancelled/unavailable do not become semantic failure; only exact `ABORTED_BEFORE_DISPATCH` produces `NOT_EXECUTED`.
- **O6 — immutable Episode:** verifier evidence and later revisions never alter serialized Episode bytes/semantics.
- **O7 — synchronous handoff:** direct verifier result arrives before Episode persistence but is included in the first durable revision.
- **O8 — asynchronous revision:** shell verifier result arriving after initial `UNKNOWN` appends a linked `POSTCONDITION_UPDATE`; prior row remains unchanged. The V1 runtime does not emit reserved invalidation/requalification values.
- **O9 — conflict:** divergent verifier evidence appends a traceable `UNKNOWN` `POSTCONDITION_UPDATE`, or storage-key divergence fails closed; no overwrite. No invalidation API or conflict-triggered `INVALIDATED` transition exists in V1.
- **O10 — lineage:** restart reconstructs the same ordered history; gaps/forks/orphans fail closed.
- **O11 — crash recovery:** Episode with no Outcome revision receives a conservative initial revision on next open; existing revisions are not rewritten. Recovery does not emit `INVALIDATED`, `INVALIDATION`, or `REQUALIFICATION`.
- **O12 — privacy:** execution/session/call IDs and all raw payload sentinels are absent from persisted Outcome JSON.
- **O13 — capacity:** per-Episode/global caps retain every old revision and reject further appends with diagnostics.
- **O14 — storage/lifecycle:** absent/open/read/write failure is optional degradation; verifier, Episode, and Outcome pending work drains in order; clean reopen succeeds.
- **O15 — V1 regression:** existing Risk Assessment, approval, Browser, and Phase 11.1 behavior is unchanged.

## 13. Frozen conclusion

An Episode is a durable fact about one settled attempt. An Outcome revision is a separate, durable, append-only interpretation of that fact and independent verifier evidence. Only supported postcondition verification can establish verified goal success or failure. Every later revision points to its predecessor, leaving the complete prior judgment history inspectable.
