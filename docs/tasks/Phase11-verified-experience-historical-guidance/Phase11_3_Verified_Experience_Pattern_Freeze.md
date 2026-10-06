# Risk Advisor Phase 11.3 — Verified Experience Pattern Freeze

## Freeze outcome

`RISK_ADVISOR_PHASE11_3_FROZEN_READY_FOR_IMPLEMENTATION`

This document freezes Phase 11.3 architecture. It does not authorize implementation in this documentation task. Implementation requires a separate explicit request.

## 1. Baseline

- Phase 11.3 Architecture Preflight / current `main`: `d5e05af73089f1853916757c64348c687711751e`
- Phase 11.1 tested implementation candidate: `f7be0ed60a2cece0765f003b704113acd43cf4ee`
- Phase 11.2 tested implementation candidate: `2f1c3a8f61d085dd59da54c2f999ba678d18e03c`
- Pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887` (exact dependency; must remain unchanged)

## 2. Scope and authority

Phase 11.3 adds one Host-owned capability:

> Deterministically group structurally equivalent operations and derive a revisioned, provenance-bearing Pattern only from immutable Episodes and their validated durable Outcome histories.

A Pattern is a historical summary, not an instruction, risk decision, execution permission, approval, or statement that a future operation is safe. It is not Guidance.

Phase 11.3 does not alter, migrate, rewrite, or delete `ExperienceEpisodeV1` or `OutcomeRevisionV1`. It does not modify Risk Assessment, Browser bridge/routes/UI, Native Approval, Host execution authority, Fast/Deep Judge, Harness Core, or the `tools/result` Episode trigger. It does not implement Guidance, Agent context injection, Online Correction, automatic retries, command rewriting, permission changes, or Phase 11.4.

Only the deterministic Host Pattern runtime may append Pattern revisions. It subscribes only to Outcome revisions after durable append and reads only validated Episode/Outcome snapshots. It has no externally callable invalidation or mutation API. Approval, Browser, model, Agent, assessment, verifier callbacks before durable Outcome commit, and process/tool results are not Pattern authorities.

Pattern-level `INVALIDATED` below is a derived state in the Pattern domain. It does not create or imply an Outcome `INVALIDATED` status/revision, and it does not change the Phase 11.2 reserved invalidation vocabulary.

## 3. Durable source requirements

The source authority is the complete, validated 11.1 Episode plus its complete, gap-free 11.2 Outcome revision chain. Both existing source domains and schemas remain unchanged.

An Episode is eligible for grouping only when its schema/key validates and all of these typed fields are known:

- `runtime.platform` is one of the frozen Episode enum values;
- `operation.kind` is not `unknown`;
- `operation.parserConfidence` is `high`;
- `operation.mutating` and `operation.externalEffect` are booleans, not `unknown`;
- `operation.networkEffect` is not `unknown`.

The exact Pattern equivalence tuple is the following fixed-order JSON array, serialized with compact `JSON.stringify` semantics and UTF-8 encoded:

```ts
[
  'operation-outcome-equivalence-v1',
  episode.runtime.platform,
  episode.operation.toolName,
  episode.operation.kind,
  episode.operation.parserConfidence,
  episode.operation.mutating,
  episode.operation.externalEffect,
  episode.operation.networkEffect,
  episode.operation.requestedPermission ?? null,
  verifierEvidence.source,
  verifierEvidence.adapterId,
]
```

`requestedPermission` absence is encoded as JSON `null`. Outcome source and adapter are part of the identity so different postcondition contracts cannot be merged into one Pattern. Outcome status, evidence quality, timestamps, approval, terminal result, retry data, Episode/Outcome identities, provenance reason codes, and all raw arguments are excluded from the equivalence tuple.

The only supported source/adapter pairs in this Freeze are the Phase 11.2 set:

- `tool-contract`: `tool.write.v1`, `tool.edit.v1`;
- `known-adapter`: `shell.mkdir.v1`, `shell.copy-file.v1`, `git.branch-switch.v1`, `package.node-resolve.v1`.

An adapter added or redefined later is not Pattern-eligible under this algorithm without a new frozen algorithm identity.

## 4. Pattern identity

The canonical tuple above maps to:

```text
patternId = ra-pattern-v1_<lowercase-hex-sha256(canonicalTupleUtf8)>
```

Pattern revision table keys are:

```text
ra-pattern-v1_<same-digest>_<revisionNumber padded to 8 decimal digits>
```

These keys contain only `[A-Za-z0-9_-]`. The Pattern domain persists the opaque Pattern ID, never the raw equivalence tuple. There is no mutable head row; current Pattern state is the final revision of a validated contiguous chain.

## 5. Trusted Outcome eligibility

Only validated durable Outcome records may be considered. A revision is a trusted success witness only when all of the following hold:

- `status === 'VERIFIED_SUCCESS'` and `ruleId === 'outcome-v1-postcondition'`;
- `postconditionEvidence` exists and its source/adapter pair is in §3;
- evidence is exactly `MATCHED`, `semanticSuccess === true`, and quality `high` or `medium`;
- evidence reason codes do not contain `VERIFICATION_CONFLICT`;
- the full Outcome chain and referenced Episode validate.

A trusted failure witness uses the exact symmetric pairing: `VERIFIED_FAILURE`, `outcome-v1-postcondition`, supported source/adapter, `MISMATCHED`, `semanticSuccess === false`, quality `high` or `medium`, no `VERIFICATION_CONFLICT`, and a valid complete chain.

For a given Episode and Pattern identity:

1. Positive support uses only the latest Outcome revision, and only if that latest revision is a trusted success witness for the identity.
2. Any trusted failure witness anywhere in that Episode's immutable Outcome chain for the same identity is retained as contradiction. The canonical witness is the lowest `revisionNumber` satisfying the failure predicate. A later success never erases that prior contradiction.
3. An Episode with a failure witness for an identity is not counted as positive support for that same identity.
4. Unknown, unavailable, low-quality, unsupported, inconsistent, or conflict evidence is neither positive support nor contradiction. If it becomes the latest revision for an Episode that previously supported a Pattern, that Episode's previous positive reference is removed from the current support set.
5. A recovery-only initial `UNKNOWN` or `NOT_EXECUTED` revision is never a success witness. A later independently durable trusted verifier revision may qualify under rules 1–4; the recovery row itself contributes no support.

Approval `allowed-once`, approval rejection/cancellation/unavailability, a successful exit code, absence of an exception, process/tool success/failure, retry-chain status, Agent/user statements, and current/in-memory verifier or failure-chain diagnostics can never establish Pattern support or contradiction.

## 6. Qualification and minimum support

A Pattern first forms only when its identity has at least:

- three distinct eligible Episode IDs with trusted current success witnesses; and
- two distinct UTC calendar dates represented by those Episodes, computed as `floor(episode.observedAt / 86_400_000)`.

Each Episode counts at most once regardless of how many Outcome revisions it has. Duplicate same-key Episodes and duplicate equivalent Outcome callbacks do not increase support.

Let `S` be the set of current trusted success references and `C` the set of canonical trusted failure references for one identity. A Pattern may be `QUALIFIED` only if `|S| >= 3`, the Episodes in `S` span at least two UTC dates, and `C` is empty. Any failed criterion means no new Pattern is formed.

## 7. Contradiction, suspension, and requalification

Pattern revisions use these states:

```ts
type PatternState = 'QUALIFIED' | 'SUSPENDED' | 'INVALIDATED'
```

The deterministic transition rules are:

1. **Initial formation:** with no prior Pattern chain, append `INITIAL / QUALIFIED` only when §6 passes and `C` is empty. If a trusted failure already exists for that identity, do not form a Pattern; future successes cannot bypass that contradiction under this algorithm.
2. **Support update:** while `QUALIFIED`, append `SUPPORT_UPDATE / QUALIFIED` when the exact support provenance changes and the support threshold still passes.
3. **Suspension:** if an existing non-invalidated Pattern has no trusted contradiction but its support drops below either §6 threshold, append `SUSPENSION / SUSPENDED`. Causes include a newer UNKNOWN/conflict Outcome revision replacing a prior current success. Unknown/conflict does not itself count as failure.
4. **Requalification:** from `SUSPENDED`, append `REQUALIFICATION / QUALIFIED` only when a new complete durable source snapshot again satisfies §6 and has no trusted contradiction. This is an append-only Pattern transition, not a mutation to an Outcome chain.
5. **Invalidation:** if an existing `QUALIFIED` or `SUSPENDED` Pattern has any trusted failure witness for its identity, append `INVALIDATION / INVALIDATED`, including the canonical failure reference. This predicate is the sole invalidation authority and trigger in 11.3.
6. **Terminal invalidation:** `INVALIDATED` is sticky for that `patternId`. Later successes cannot reactivate it and do not cause further Pattern revisions. A future algorithm/version that intentionally defines a new equivalence identity requires a separate Freeze.
7. **No-op:** if state and exact provenance sets are unchanged, append nothing. A repeated callback is idempotent.

Pattern invalidation has no API, request, event listener, Browser/model/approval/assessment input, or caller-controlled predicate. It is emitted only by deterministic extraction after the trusted failure Outcome revision is durable and validated.

## 8. Immutable Pattern revision schema and provenance

The semantic schema is:

```ts
interface PatternEvidenceRefV1 {
  episodeId: string             // ra-episode-v1_<64 lowercase hex>
  outcomeRevisionId: string     // deterministic 11.2 revision ID
}

interface VerifiedExperiencePatternRevisionV1 {
  schemaVersion: 1
  patternId: string
  revisionId: string
  revisionNumber: number        // positive safe integer, starts at 1
  previousRevisionId?: string
  state: 'QUALIFIED' | 'SUSPENDED' | 'INVALIDATED'
  revisionKind:
    | 'INITIAL'
    | 'SUPPORT_UPDATE'
    | 'SUSPENSION'
    | 'REQUALIFICATION'
    | 'INVALIDATION'
  minimumSupport: 3
  supportCount: number
  supportUtcDateCount: number
  contradictionEpisodeCount: number
  supportAdded: readonly PatternEvidenceRefV1[]
  supportRemoved: readonly PatternEvidenceRefV1[]
  contradictionsAdded: readonly PatternEvidenceRefV1[]
  triggerRefs: readonly PatternEvidenceRefV1[]
  provenanceDigest: string      // lowercase SHA-256 of reconstructed sorted active refs/state
}
```

The concrete schema is strict and bounded. It validates the deterministic Pattern/revision ID, safe positive ordinals, immediate predecessor, state/kind/rule consistency, nonnegative bounded counts, unique reference arrays, and SHA-256 digest format. Each delta/reference array is capped at 10,000 entries. Replaying `supportAdded`/`supportRemoved` and append-only `contradictionsAdded` reconstructs exact current provenance. A removed support reference must have been active in the predecessor state; contradiction references can never be removed. `triggerRefs` identify the durable source revision(s) that caused this append, including a latest UNKNOWN/conflict revision that removed support.

`provenanceDigest` is SHA-256 over compact canonical JSON containing the Pattern state, sorted current support references, and sorted contradiction references. The schema contains no tool name, verifier payload, dates, raw operation data, execution IDs, Session/call/approval IDs, result bodies, prompts, secrets, or credentials. Provenance remains traceable by resolving the referenced immutable Episode and Outcome revision IDs.

Use only pinned Harness `ctx.storageDomain`:

```text
name:    risk_advisor_pattern
version: 1
layout:  per-record
table:   revisions
```

This is a third separate domain. Do not add a table to or version-bump Experience or Outcome. Do not enable `invalidRecords: 'backup-and-skip'`.

The Storage Domain `put` API can overwrite. Before every append, the Pattern runtime must check the deterministic key: absent means insert; semantically identical content is an idempotent no-op; divergent same-key content fails the Pattern subsystem closed as `CONFLICTED` and is never overwritten. No update/delete, eviction, pruning, compaction, or mutable head write is allowed.

## 9. Deterministic extraction and startup reconciliation

The only extraction inputs are immutable Experience snapshots and complete, validated durable Outcome chains from the active Host generation. Do not open another handle for `risk_advisor_outcome`; extend only the plugin-internal read-only integration needed to snapshot all Episodes/chains and receive post-durable Outcome append notifications. Do not expose this internal source interface through Browser, tools, model context, or a public mutation API.

Runtime ordering is:

```text
tools/result
  → existing verifier observation
  → durable immutable Episode
  → durable Outcome revision
  → Pattern extraction/update
```

Pattern work never blocks, delays, rejects, or changes a Tool result, verifier, Episode, Outcome, approval, assessment, or Browser path. It must not wait for a verifier. A Pattern source notification is delivered only after Outcome `table.put` succeeds and the validated in-memory chain advances.

At startup, after Experience and Outcome have opened and Outcome has completed conservative recovery, the Pattern runtime subscribes to durable Outcome notifications before requesting a read-only complete source snapshot. It buffers notifications through a bounded handoff while reconciling, then drains them in order; snapshot/notification duplicates are idempotent. This closes the snapshot-to-subscription race without a second domain handle or cross-domain transaction.

On open, validate every Pattern record, key, per-identity contiguous revision chain, delta replay, source reference, derived count, and digest. Then recompute from the complete validated durable Episode/Outcome snapshot:

- if no Pattern chain exists and §6 passes with no contradiction, append revision 1;
- if an existing non-terminal chain differs from the recomputed source set/state, append the required delta/transition;
- never rewrite a prior revision or silently pick a fork/gap winner;
- malformed, orphaned, reserved, or inconsistent source/history makes Pattern `UNAVAILABLE` or `CONFLICTED` and suppresses current Pattern results for that generation.

If Pattern persistence fails after Outcome is durable, keep the Outcome and Episode intact and degrade only Pattern. The next clean open reconciles the durable source snapshot. Pattern recovery may append missing Pattern revisions; it never repairs or changes Episode/Outcome history.

Pattern is available only while the Experience and Outcome sources are validated and `READY`, the Pattern domain is open and valid, and its own writer is healthy. If a source becomes unavailable/capacity-limited, Pattern current results fail closed rather than serving stale qualification. No cross-process coordination is claimed; the supported boundary is one active Host process.

## 10. Capacity and optional failure behavior

Frozen hard limits:

```text
MAX_PATTERN_IDENTITIES                 = 60_000
MAX_PATTERN_REVISIONS                  = 300_000
MAX_PATTERN_PROVENANCE_REFERENCES      = 1_000_000
MAX_PATTERN_PENDING_OUTCOME_HANDOFFS   = 512
MAX_PATTERN_DELTA_REFERENCES_PER_ARRAY = 10_000
```

All limits are hard. Never evict or compact. At any durable cap, stop appending and report `CAPACITY_EXCEEDED`; retain all existing history. If the pending handoff fills, stop accepting Pattern notifications and mark the Pattern capability unavailable for that generation; recover by full reconciliation at the next clean open. Pattern limitations do not disable Outcome, Experience, V1, approvals, assessments, or Tool execution.

Storage absent/open/read/write/close failure, malformed Pattern history, invalid source history, and capacity affect only Pattern. Existing risk and approval behavior remains unchanged.

## 11. Lifecycle and diagnostics

Pattern owns one `risk_advisor_pattern` handle per active Storage capability generation. It owns every queued append promise, stops accepting source notifications before teardown, drains its queue, unsubscribes from Outcome, then closes its handle. Coordinated teardown order is:

1. stop new result capture;
2. fence and drain verifier work;
3. drain Episode commits;
4. drain Outcome commits;
5. stop Outcome notifications, drain Pattern work, and close Pattern;
6. close Outcome and Experience handles.

No observer, handoff, or pending promise survives disposal. Clean reopen reconstructs the same current Pattern state/provenance from durable sources.

Expose only Host-side read-only diagnostics for tests/inspection, for example `status()`, `patternIds()`, `current(patternId)`, and `revisions(patternId)`. Current Pattern results are readable only in `READY`; diagnostic history is immutable. Do not expose a mutation/invalidation API or register a model-facing tool, Browser route, UI, or Guidance provider.

## 12. Required proof matrix

At minimum, the future implementation must prove:

- **P1 — source integrity:** invalid/missing Episode or Outcome data, gaps, forks, orphans, reserved 11.2 values, and divergent Pattern keys fail closed.
- **P2 — deterministic identity:** exact tuple serialization/hash is stable; permission, platform, tool kind/name, typed operation facts, source, and adapter differences partition identities.
- **P3 — trusted success only:** only current supported `MATCHED + true + high/medium` Outcome evidence contributes support.
- **P4 — rejected proxies:** approval allowed, process/tool success, non-error result, retry success, Agent/user text, and ephemeral verifier/failure-chain state add no support.
- **P5 — unknown/conflict/recovery:** unknown, unavailable, low-quality, unsupported, conflict, and recovery-only initial rows never add support or count as verified failure.
- **P6 — minimum support:** two successes do not form; three distinct Episodes on one UTC date do not form; three across at least two UTC dates do.
- **P7 — deduplication:** duplicate Episode identity or identical Outcome callback cannot inflate support.
- **P8 — provenance:** every current support and contradiction reference resolves to exact Episode and Outcome revision IDs; delta replay reconstructs the same digest.
- **P9 — contradiction before formation:** a trusted failure already in the identity's durable history blocks Pattern formation, even if later successes exist.
- **P10 — failure after formation:** trusted verified failure appends a Pattern `INVALIDATION`; old `QUALIFIED` revision remains unchanged; later success cannot reactivate the same identity.
- **P11 — suspension/requalification:** losing current trusted support to a newer nonfailure/UNKNOWN revision appends `SUSPENSION`; restoring the full threshold from durable trusted evidence appends `REQUALIFICATION`.
- **P12 — append/idempotency:** duplicate source notifications are no-ops; divergent same-key Pattern content conflicts without overwrite; every revision links to its predecessor.
- **P13 — restart/reconciliation:** restart yields identical state/provenance; missing Pattern projection is rebuilt from durable sources; partial Pattern failure is reconciled without altering Episode/Outcome bytes.
- **P14 — privacy:** Pattern persistence has no raw commands/arguments, paths/content, execution/session/call/approval IDs, verifier payload, result body, prompt, credential, or secret sentinels.
- **P15 — capacity/optional storage:** all caps retain history and degrade only Pattern; absent/open/read/write/close errors do not affect V1/11.1/11.2 behavior.
- **P16 — lifecycle:** notification subscription handoff, append promises, teardown drain order, close, and clean reopen leave no observer or pending work.
- **P17 — boundary:** no Guidance, Online Correction, Risk Assessment, Browser UI/bridge, Native Approval, Harness Core, or execution behavior changes.

## 13. Frozen conclusion

Episodes remain immutable settlement facts. Outcome revisions remain the durable verifier-backed qualification history. A Pattern is a separate, deterministic projection whose only positive support is a current trusted Outcome success with exact provenance. Verified failure permanently contradicts and invalidates that Pattern identity; absence or uncertainty can suspend support but never invent success. No Pattern becomes Guidance in Phase 11.3.
