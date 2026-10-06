# Risk Advisor Phase 11.4 — Verified Historical Guidance Freeze

## Freeze outcome

`RISK_ADVISOR_PHASE11_4_FROZEN_READY_FOR_IMPLEMENTATION`

This document freezes Phase 11.4 architecture. It does not authorize implementation. A separate explicit request must start implementation.

## 1. Baseline

- Architecture Preflight baseline: `54a6129fe8d437fa26a4f7d6844cafbe69f9ea6e`
- Accepted Phase 11.1–11.3 state: user-provided premise; see the phase execution reports, including Phase 11.3 Repair1.
- Pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887` (exact dependency; must remain unchanged)

## 2. Scope and authority

Phase 11.4 adds one Host-owned capability:

> Materialize fixed, bounded, advisory historical context from validated durable Pattern revisions, preserve its Pattern provenance, and append a deterministic withdrawal or refresh whenever that Pattern history changes.

Guidance is informational only. It is not an execution instruction, risk score, safety decision, permission, approval, or guarantee that a current operation or goal will succeed. It cannot change command text, arguments, sandboxing, retries, Tool execution, or approval behavior.

Phase 11.4 does not modify `ExperienceEpisodeV1`, `OutcomeRevisionV1`, or Pattern semantics. It does not read individual Episode/Outcome records to form Guidance, modify Risk Assessment, Browser UI/bridge, Native Approval, Harness Core, or inject Agent context. It does not implement Online Correction.

## 3. Sole source and eligibility

The only Guidance source is a complete, validated, durable Phase 11.3 Pattern chain supplied by the active Host `PatternRuntime` generation. The Pattern source must be `READY`; its records, keys, chain continuity, deltas, trusted references, counts, and provenance digest must already have passed Phase 11.3 validation.

Eligibility is exact:

- A Pattern revision with `state === 'QUALIFIED'` produces active Guidance.
- `SUSPENDED` and `INVALIDATED` Pattern revisions never produce active Guidance.
- An invalidated Pattern is terminal under the 11.3 Freeze; it cannot reactivate this Guidance identity.
- Guidance does not independently re-qualify Pattern evidence or read the Experience/Outcome domains. One Episode or Outcome, a process/tool result, approval, assessment, model/Agent statement, or Browser event can never create or refresh Guidance without a durable Pattern revision.

Guidance attaches only after Pattern reports `READY`. If Pattern becomes unavailable, conflicted, or capacity-limited, Guidance suppresses all current/active reads for that generation. It does not serve its last durable active row as stale fallback.

## 4. Identity and durable storage

There is one Guidance identity per versioned Pattern identity. Serialize this compact JSON tuple in UTF-8:

```ts
[
  'verified-historical-guidance-v1',
  patternId,
]
```

Then derive:

```text
guidanceId = ra-guidance-v1_<lowercase-hex-sha256(tupleUtf8)>
```

The raw tuple is not persisted. Guidance table keys and IDs contain only `[A-Za-z0-9_-]`. Revision keys are:

```text
ra-guidance-v1_<same-digest>_<revisionNumber padded to 8 decimal digits>
```

Use only pinned Harness `ctx.storageDomain`:

```text
name:    risk_advisor_guidance
version: 1
layout:  per-record
table:   revisions
```

Guidance is a fourth separate domain. Do not add a Guidance table to Experience, Outcome, or Pattern; do not open a second handle for any of those domains; do not use `invalidRecords: 'backup-and-skip'`.

`KvTable.put()` can overwrite. Before each append, the runtime checks the deterministic key: absent means insert, identical canonical content is an idempotent no-op, and divergent same-key content fails Guidance closed as `CONFLICTED` without overwrite. No update, delete, eviction, pruning, compaction, or mutable head row is allowed.

## 5. One-to-one Pattern revision mapping

Pattern chains begin with `INITIAL / QUALIFIED`. Every Pattern revision in a validated chain maps to exactly one Guidance revision with the same `revisionNumber`. Guidance revision 1 has no predecessor; revision `n > 1` names Guidance revision `n - 1`. `patternRevisionId` must equal the deterministic Pattern key for the same `patternId` and ordinal. This makes startup replay deterministic and preserves transitions that occurred while Guidance storage was unavailable.

The complete mapping is:

| Pattern revision | Guidance revision | Guidance state | Payload |
|---|---|---|---|
| `INITIAL / QUALIFIED` | `INITIAL_ACTIVE` | `ACTIVE` | Fixed historical-context payload |
| `SUPPORT_UPDATE / QUALIFIED` | `REFRESH_ACTIVE` | `ACTIVE` | Payload from this exact Pattern revision |
| `REQUALIFICATION / QUALIFIED` | `REACTIVATION_ACTIVE` | `ACTIVE` | Payload from this exact Pattern revision |
| `SUSPENSION / SUSPENDED` | `WITHDRAW_SUSPENDED` | `WITHDRAWN` | None |
| `INVALIDATION / INVALIDATED` | `WITHDRAW_INVALIDATED` | `WITHDRAWN` | None |

The Guidance runtime verifies the allowed Pattern state/kind pair rather than trusting a caller-supplied transition. A duplicate delivery of an already materialized Pattern revision is a no-op. An out-of-order, missing, divergent, or impossible Pattern revision is a source conflict; no winner is guessed.

The one-to-one mapping means an existing Guidance history must be a valid prefix of its Pattern history. If Guidance is behind, append each missing mapped revision in Pattern order. If Guidance points beyond, outside, or inconsistently into Pattern history, fail Guidance closed as `CONFLICTED`; never rewrite old records.

## 6. Immutable Guidance revision

The semantic record is:

```ts
interface VerifiedHistoricalGuidanceRevisionV1 {
  schemaVersion: 1
  guidanceId: string
  revisionId: string
  revisionNumber: number            // equals source Pattern revisionNumber
  previousRevisionId?: string
  patternId: string
  patternRevisionId: string         // exact immutable source revision
  patternState: 'QUALIFIED' | 'SUSPENDED' | 'INVALIDATED'
  patternRevisionKind:
    | 'INITIAL'
    | 'SUPPORT_UPDATE'
    | 'SUSPENSION'
    | 'REQUALIFICATION'
    | 'INVALIDATION'
  revisionKind:
    | 'INITIAL_ACTIVE'
    | 'REFRESH_ACTIVE'
    | 'REACTIVATION_ACTIVE'
    | 'WITHDRAW_SUSPENDED'
    | 'WITHDRAW_INVALIDATED'
  state: 'ACTIVE' | 'WITHDRAWN'
  contentCode?: 'VERIFIED_PATTERN_CONTEXT_V1'
  evidenceStrength?: 'QUALIFIED_PATTERN'
  supportCount?: number
  supportUtcDateCount?: number
  patternProvenanceDigest: string
  guidanceDigest: string
}
```

The strict schema validates the deterministic identity/key, one-to-one ordinal and predecessor, source Pattern state/kind, allowed revision mapping, required/forbidden active payload fields, and digest formats. Active rows contain the fixed content code, strength, and exact counts from the referenced qualified Pattern revision. Withdrawn rows contain no active content or strength. `patternProvenanceDigest` must exactly match the referenced immutable Pattern revision. `guidanceDigest` is SHA-256 over compact canonical JSON of all semantic Guidance fields other than itself.

The Guidance revision stores exactly one Pattern revision reference. Resolving that Pattern revision and its validated chain leads to the precise Episode/Outcome evidence; Guidance never duplicates those individual references.

## 7. Wording and structure authority

Phase 11.4 V1 uses no generated/free-form wording in durable storage. The durable `contentCode` selects this exact deterministic payload, with only the validated integer counts interpolated:

- **Title:** `Verified historical pattern`
- **Observation:** `A qualified verified-success pattern covers {supportCount} distinct Episodes across {supportUtcDateCount} UTC dates.`
- **Context caveat:** `Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.`
- **Next check:** `Independently verify the current target and expected postcondition.`
- **Authority notice:** `This guidance does not determine risk or grant permission or approval.`

The renderer emits these fields in that order, without extra claims or model-authored text. Withdrawn guidance has no payload. No localized or alternate wording is introduced in this phase.

## 8. Confidence and strength semantics

V1 has no probability, percentage, likelihood, risk, or safety-confidence field. `evidenceStrength: 'QUALIFIED_PATTERN'` means only that the referenced 11.3 Pattern is currently validated and qualified under its frozen minimum-support rule. `supportCount` and `supportUtcDateCount` are exact descriptive Pattern counts, not estimates of future success probability. More support does not authorize stronger commands or permissions, rank risk, or change approval.

No Guidance ordering, ranking, or confidence comparison is defined. Consumers must not derive one from IDs, counts, or timestamps.

## 9. Deterministic extraction and update authority

Only the Guidance runtime may append Guidance revisions. It consumes an internal read-only Pattern source seam with these semantics:

- complete validated Pattern chains are available only while Pattern is `READY`;
- subscription is registered before the initial full snapshot is requested;
- notifications contain only a Pattern revision already durable in `risk_advisor_pattern` and installed in its validated in-memory chain;
- snapshot and notification overlap is expected and idempotent;
- this internal interface is not exported through the package root, Browser, tools, or model/Agent context.

The Pattern source interface is Host-internal and must not open a second Pattern domain handle. Pattern notification callbacks enqueue bounded Guidance work and never block, reject, or alter Pattern writes, Outcome commits, Tool results, risk, approval, or Browser behavior.

On open, Guidance validates its own records and history against the complete validated Pattern snapshot, then appends any missing one-to-one revisions. If Pattern is `QUALIFIED`, the mapped active revision is available only after its Guidance row is durable. If Pattern is `SUSPENDED` or `INVALIDATED`, the mapped withdrawal is durable before Guidance reports itself caught up. Every transition is append-only and linked to its immediate predecessor.

Current active Guidance is readable only when:

1. Guidance storage and writer are `READY`;
2. the Pattern source is `READY`;
3. the latest Guidance revision is `ACTIVE` and references the latest current `QUALIFIED` Pattern revision exactly; and
4. both complete histories and the cross-domain provenance link validate.

During a notification or writer lag, source failure, or reconciliation, suppress current Guidance rather than expose a stale active revision. If Pattern becomes `SUSPENDED` or `INVALIDATED`, active Guidance is unavailable immediately while its durable withdrawal is queued. A write failure degrades only Guidance; a later clean open reconciles from durable Pattern history.

## 10. Capacity and failure behavior

Frozen hard limits:

```text
MAX_GUIDANCE_IDENTITIES                 = 60_000
MAX_GUIDANCE_REVISIONS                  = 300_000
MAX_GUIDANCE_PENDING_PATTERN_HANDOFFS   = 512
MAX_GUIDANCE_SUPPORT_COUNT              = 10_000  // inherited validated Pattern bound
MAX_GUIDANCE_UTC_DATE_COUNT              = 10_000  // inherited validated Pattern bound
```

There is exactly one Pattern provenance reference per Guidance revision, so `MAX_GUIDANCE_REVISIONS` also bounds the total number of Guidance-to-Pattern references. Guidance stores only a fixed content code and bounded integer counts; no raw text-size cap or unbounded reference array is needed.

All durable limits are hard. At a Guidance durable cap, stop appending and report `CAPACITY_EXCEEDED`; retain all existing revisions. When the pending Pattern handoff fills, stop accepting notifications and report `UNAVAILABLE` for that generation; recover by full reconciliation on a clean open. Never evict, compact, or serve stale active rows to work around a cap.

Because pinned `DomainFacility.open()` parses stored rows before exposing tables, the Zod schema must validate shape and safe integer form but must not encode the above application capacities as numeric `.max()` bounds. Before parsing a proposed append or recovered row, explicitly check revision ordinal, support/date counts, identity count, table revision count, and provenance limits and raise a Guidance capacity error. This ensures runtime capacity violations map to `CAPACITY_EXCEEDED`; malformed types, digests, keys, or lineage still fail closed as `UNAVAILABLE` or `CONFLICTED`.

Storage absent/open/read/write/close failure, invalid Pattern source, and Guidance capacity affect only this optional Guidance capability. Pattern, Outcome, Experience, Risk Assessment, approvals, Browser, and Tool execution remain unchanged.

## 11. Privacy

Guidance persists only:

- opaque `guidanceId` and `patternId`;
- exact Pattern revision ID and Pattern provenance digest;
- bounded status/kind/content/strength enums;
- bounded support counts and a digest.

It does not persist operation tuples, tool names, commands, arguments, paths, cwd, file content, approval facts, Episode IDs, Outcome IDs, Session/call/approval IDs, verifier payloads, tool results, user/model/Agent content, generated prose, credentials, or secrets. The deterministic renderer accepts only the frozen content code and validated Pattern counts.

## 12. Lifecycle and recovery

Startup order is:

1. Experience becomes `READY`;
2. Outcome validates/reconciles and becomes `READY`;
3. Pattern validates/reconciles and becomes `READY`;
4. Guidance subscribes to Pattern durable revisions before taking the full Pattern snapshot;
5. Guidance opens and validates its own domain, replays/reconciles the Pattern snapshot, then drains buffered notifications in order;
6. Guidance reports `READY` only when caught up to every current Pattern revision.

Teardown order after new result capture has stopped is:

1. fence/drain verifier work, then drain Episode and Outcome commits;
2. drain Pattern work until all durable Pattern notifications for those commits have been emitted;
3. stop Guidance notification intake, drain its append queue, unsubscribe, and close Guidance while Pattern remains open;
4. stop Pattern notification intake, drain, and close Pattern;
5. close Outcome and Experience.

No observer, pending handoff, or append promise may survive disposal. A crash after Pattern append but before Guidance append is repaired by replaying the complete Pattern chain on next open. A partial Guidance failure never repairs or changes Pattern, Outcome, or Episode bytes. No cross-domain transaction or cross-process coordination is claimed; one active Host process is the supported boundary.

## 13. Read surface and explicit exclusions

Expose only Host-side immutable read-only diagnostics, such as status, guidance IDs, current eligible payload, and revision history. Do not register a model-facing tool, Browser route/UI, Risk Assessment input, Native Approval input, Agent prompt/context injection, or mutation API. Do not use Fast/Deep Judge, embeddings, LLM text generation, online feedback, or correction. Any future consumer or LLM-assisted wording requires a separate Freeze and an independent deterministic validation boundary.

## 14. Required proof matrix

At minimum, implementation must prove:

- **G1 — source readiness:** absent, unavailable, conflicted, or capacity-limited Pattern produces no current Guidance.
- **G2 — Pattern-only authority:** validated qualified Pattern can produce Guidance; Episode, Outcome, approval, tool/process success, and model/Agent text alone cannot.
- **G3 — state eligibility:** `SUSPENDED` and `INVALIDATED` never expose active Guidance.
- **G4 — identity:** canonical tuple/hash, safe keys, and repeated runs are deterministic.
- **G5 — one-to-one lineage:** each Pattern revision maps to the same ordinal Guidance revision and immediate predecessor; impossible state/kind pairs fail closed.
- **G6 — fixed wording:** exact code, field order, wording, and count interpolation are stable; no free-form input enters content.
- **G7 — strength semantics:** no probability/confidence/risk score or support-based authorization is emitted.
- **G8 — provenance:** each Guidance revision resolves to its exact Pattern revision and matching digest, then to the Pattern's validated Episode/Outcome provenance.
- **G9 — refresh:** a qualified Pattern support update appends new active Guidance for that exact Pattern revision; old Guidance stays unchanged.
- **G10 — suspension:** Pattern suspension appends a durable withdrawal and suppresses active reads without calling it failure.
- **G11 — invalidation:** Pattern invalidation appends terminal withdrawal; later source activity cannot reactivate it.
- **G12 — requalification:** a suspended Pattern requalification appends an active reactivation; invalidated Pattern never reactivates.
- **G13 — idempotence/conflict:** duplicate notifications no-op; identical key is insert-idempotent; divergent same-key content conflicts without overwrite.
- **G14 — startup race:** subscribe-before-snapshot buffering loses no durable Pattern update and drains duplicates deterministically.
- **G15 — restart/recovery:** missing Guidance projection is rebuilt append-only; stale valid prefixes catch up; gaps, forks, orphaned Pattern refs, and invalid digests fail closed.
- **G16 — capacity/optional storage:** all hard caps stop writes and preserve history; absent/open/read/write/close failure affects Guidance only.
- **G17 — privacy:** durable Guidance contains no source payload, direct Episode/Outcome IDs, prompt, command, path, result, secret, or generated prose.
- **G18 — lifecycle:** Pattern drains before Guidance closes; Guidance drains before Pattern closes; no observer or promise survives teardown.
- **G19 — no stale view:** while Pattern advances, is unavailable, or Guidance is behind, no mismatched active revision is readable.
- **G20 — product boundary:** no change to Episode/Outcome/Pattern semantics, risk, Browser, Approval, Tool execution, Agent context, Harness Core, Online Correction, or LLM use.

## 15. Frozen conclusion

Validated durable Pattern is the sole historical qualification authority. Guidance is a deterministic, fixed-wording advisory projection with one-to-one append-only provenance. Qualified Patterns may produce active context; suspension and invalidation deterministically withdraw it. Guidance adds no confidence estimate or product authority, and failure of this optional layer cannot affect existing behavior.
