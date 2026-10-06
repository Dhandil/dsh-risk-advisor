# Risk Advisor Phase 11.3 — Verified Experience Pattern Architecture Preflight

## Outcome

`RISK_ADVISOR_PHASE11_3_ARCHITECTURE_PREFLIGHT_COMPLETE_READY_FOR_FREEZE`

This preflight authorizes architecture documentation only. It does not authorize implementation.

## 1. Baseline authority

- Risk Advisor `origin/main`: `d5e05af73089f1853916757c64348c687711751e`
- Phase 11.1 tested implementation candidate: `f7be0ed60a2cece0765f003b704113acd43cf4ee`
- Phase 11.2 tested implementation candidate: `2f1c3a8f61d085dd59da54c2f999ba678d18e03c`
- Pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887` (exact checkout)
- Remote `main` resolves to the stated Risk Advisor baseline.

Phase 11.1 and 11.2 acceptance is the user-provided premise for this preflight. Their implementation reports identify the tested candidates above. The working tree has no tracked changes; existing untracked `.vitest-cache/`, `lib/`, and `node_modules/` are preserved.

## 2. Goal and boundaries

Phase 11.3 defines a Host-owned Verified Experience Pattern layer derived only from immutable 11.1 Episodes and validated, durable 11.2 Outcome revision chains. A Pattern is a bounded, deterministic historical projection with explicit source provenance. It is not an execution instruction or a judgment authority.

This phase does not generate Guidance, alter Risk Assessment, change Browser UI or Native Approval, inject Agent context, rewrite or retry operations, implement Online Correction, or modify Harness Core. No model-facing Pattern or Outcome mutation API is added.

## 3. Existing system inspected

### 3.1 Immutable Episode source

`src/host/experience-schema.ts` and `src/host/experience-store.ts` define `ExperienceEpisodeV1` in `risk_advisor_experience` v1, table `episodes`. Episodes are committed from `tools/result`, keyed by `ra-episode-v1_<sha256(executionId)>`, and contain bounded operation/runtime/approval/terminal/retry facts without raw operation payload. Episode writes are immutable and serialized. The current Host runtime can return a read-only Episode snapshot.

The only grouping facts safe and available in Episode V1 are its typed runtime and operation fields. Approval, terminal process facts, retry counters, reason codes, timestamps, and opaque identity are not equivalence dimensions and cannot establish outcome quality.

### 3.2 Durable Outcome authority

`src/host/outcome-schema.ts` and `src/host/outcome-store.ts` define `OutcomeRevisionV1` in the separate `risk_advisor_outcome` v1 per-record domain. Revision chains are validated and append-only; current qualification is the last row in a complete chain. The runtime writes revision 1 only after the matching Episode is durable, retains synchronous verifier evidence through a bounded handoff, appends later verifier updates, and recovers missing first revisions conservatively.

Only a supported, internally consistent `MATCHED + semanticSuccess: true + high/medium` verifier pairing qualifies as `VERIFIED_SUCCESS`. The symmetric `MISMATCHED + false + high/medium` pairing qualifies as `VERIFIED_FAILURE`. Approval permission, process/tool success, retry/failure-chain overlays, unknown evidence, and recovery-only initial revisions do not establish successful experience. Outcome `INVALIDATED` and invalidation/requalification vocabulary remain reserved and are never emitted by Phase 11.2 V1.

`OutcomeDiagnostics` exposes one Episode's current row/history, not an all-Episode snapshot. Pattern integration therefore needs a Host-internal read-only snapshot of already validated chains and a notification emitted only after an Outcome revision is durably appended. It must not open a second handle to the Outcome domain, read ephemeral verifier/failure-chain stores, or observe a pre-durable Outcome callback.

### 3.3 Storage and lifecycle constraints

The pinned Harness Storage Domain exposes `per-record` tables whose `put` can overwrite; append-only consumers must enforce insert-only semantics. Domain handles are singular per domain name within a capability generation. The API offers no cross-domain transaction or cross-process notification. The app currently opens Experience, reconciles Outcome after Episode reads, drains verifier before Experience/Outcome teardown, and keeps Storage optional.

Pattern persistence must use a third, separate domain and must be downstream of a validated durable Outcome snapshot. A crash after an Outcome commit and before its Pattern update must be reconciled from Episode and Outcome domains on the next clean open. Pattern storage failure must not affect Phase 11.1/11.2 or current product behavior.

## 4. Architecture decisions proposed for Freeze

1. Add a Host-only `risk_advisor_pattern` v1 per-record domain with immutable, linked Pattern revisions. Do not add fields or writes to Episode or Outcome records.
2. Form equivalence groups from an exact versioned tuple of structural Episode operation/runtime facts and the trusted verifier source/adapter class. Hash the canonical tuple for Pattern identity; never persist the raw tuple in the Pattern domain.
3. Count only distinct Episodes whose latest durable Outcome revision is a supported, conclusive verified success. Require three such Episodes across at least two UTC calendar dates. Unknown, conflict, unqualified, and recovery-only rows never increase support.
4. Treat any qualification-grade verified failure in the same equivalence group as durable contradictory evidence. It prevents first formation and appends a terminal Pattern invalidation if a Pattern was already qualified. Later success cannot erase the failure or reactivate that Pattern identity.
5. If positive support falls below threshold without a verified failure, append a SUSPENDED revision. A later fully qualified source set may append a new REQUALIFICATION revision. Every state/source change is append-only and linked; no mutable head row or invalidate API exists.
6. Keep exact provenance as Episode/Outcome revision references in bounded deltas, with a deterministic digest of the reconstructed source set. Pattern diagnostics remain read-only and Host-only; no Browser, Agent, or Guidance integration is added.
7. Reconcile validated sources on open; malformed or incomplete authoritative history fails Pattern closed. Storage absence/failure and Pattern capacity affect only this optional historical capability.

The Freeze must make equivalence tuple encoding, evidence eligibility, support threshold, contradiction rules, revision kinds, caps, privacy, startup reconciliation, and lifecycle ordering exact. The implementation and test plan remain for a separate request.

## 5. Preflight conclusion

The Episode and Outcome layers provide the necessary durable facts, but neither a successful Tool result nor an approval is a trustworthy Pattern source. A separate deterministic Host projection can preserve exact evidence lineage while keeping Episodes and Outcome revisions immutable. Its only producer should be the runtime that validates and joins those durable records.

Proceed with a Phase 11.3 Freeze and future implementation instructions as documentation only. No implementation is started by this preflight.

## 6. Sources inspected

- `src/host/experience-schema.ts`
- `src/host/experience-store.ts`
- `src/host/outcome-schema.ts`
- `src/host/outcome-store.ts`
- `src/host/postcondition-verifier.ts`
- `src/host/verification-store.ts`
- `src/index.ts`
- Phase 11.1 Episode Freeze, implementation instructions, and execution report
- Phase 11.2 Architecture Preflight, Outcome Freeze, implementation instructions, and execution report
- Pinned Harness `packages/storage/storage-domain/src/{index,domain,spec}.ts`
