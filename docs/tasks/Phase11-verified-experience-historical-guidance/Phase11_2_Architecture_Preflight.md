# Risk Advisor Phase 11.2 — Outcome Qualification & Revision Architecture Preflight

## Outcome

`RISK_ADVISOR_PHASE11_2_ARCHITECTURE_PREFLIGHT_COMPLETE_READY_FOR_FREEZE`

This preflight authorizes architecture documentation only. It does not authorize implementation.

## 1. Baseline authority

- Risk Advisor `origin/main`: `26504a73577a9fe994f56cacce4b2d7ac4bb9ef8`
- Accepted Phase 11.1 tested candidate: `f7be0ed60a2cece0765f003b704113acd43cf4ee` (ancestor of the baseline)
- Pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887` (exact checkout)
- Remote `main` resolves to the same Risk Advisor baseline.

The working tree had no tracked changes. Existing untracked `.vitest-cache/`, `lib/`, and `node_modules/` were preserved.

## 2. Goal and boundaries

Phase 11.2 defines how an immutable Phase 11.1 Episode receives a deterministic outcome interpretation and how that interpretation changes when independently observed evidence arrives later.

The outcome is a separate, durable, append-only layer. It does not amend an Episode. The primary evidence is the existing Postcondition Verifier. A successful process result, an allowed approval, or an Agent statement is never semantic goal-success evidence.

This phase does not implement Patterns, Guidance, Historical Risk Evidence, Online Correction, or any user-facing change. Risk Assessment, Browser UI, Native Approval, and Harness Core remain unchanged.

## 3. Existing system inspected

### 3.1 Postcondition Verifier

`src/host/postcondition-verifier.ts` consumes one captured expected effect at `tools/result`. It emits a sanitized `VerificationRecordV1` with adapter/source, status, semantic-success flag, evidence quality, bounded reason codes, observation time, and duration.

Direct write/edit adapters can publish synchronously during the result observer. Supported shell adapters publish asynchronously through `VerificationScheduler`. Tool/process failure, missing capability, timeout, unsupported verifier output, and other non-conclusive paths produce `UNKNOWN` or `UNAVAILABLE`; neither means verified goal failure. The scheduler is bounded (two concurrent jobs, eight pending jobs, five-second timeout) and exposes generation fencing and drain.

The current qualification-grade pairs are:

| Verifier status | Semantic success | Meaning |
| --- | --- | --- |
| `MATCHED` | `true` | Supported postcondition observed as satisfied |
| `MISMATCHED` | `false` | Supported postcondition observed as unsatisfied |
| `UNKNOWN` / `UNAVAILABLE` | `unknown` | No conclusive outcome |

Known direct adapters report high evidence quality; bounded shell adapters report medium. Low-quality evidence is inconclusive.

### 3.2 VerificationStore and failure-chain overlay

`src/host/verification-store.ts` is process-local, keyed by execution ID, and bounded by a five-minute TTL, 128 records per Session, and 512 globally. A duplicate equivalent record is idempotent. Divergent same-execution evidence is represented as `UNKNOWN` with `VERIFICATION_CONFLICT`. This store cannot be the durable Phase 11.2 history.

`src/host/retry-escalation.ts` applies verifier observations to an ephemeral retry/failure relation. It is bounded, expires, and is discarded on disposal. Its `SUCCESS`/`FAILURE` relation statuses describe retry-analysis facts and are not durable goal outcome authority. Phase 11.2 must not qualify an outcome from this overlay.

`src/host/explicit-failure.ts` projects terminal and approval failure facts, but those facts do not establish whether the user's goal condition holds. Failure-chain data is not a durable replacement for the verifier.

### 3.3 Experience Episode and result ordering

`src/host/experience-schema.ts` and `src/host/experience-store.ts` implement the frozen `risk_advisor_experience` version 1 per-record domain, table `episodes`. Episode identity is `ra-episode-v1_<sha256(executionId)>`. The record is an immutable, sanitized settlement fact written only from `tools/result`.

`src/index.ts` currently orders result observation as failure-chain result, verifier result, Episode write request, then retirement of live operation state. The Episode write is intentionally not delayed for asynchronous verification. In particular, the synchronous verifier callback may run before the Episode has become durable, while an asynchronous verifier callback may run after it.

Episode V1 stores terminal `isError` and bounded error identity, approval outcome, and retry facts; it does not store a semantic outcome. Approval outcomes `allowed-once`, `rejected`, `cancelled`, and `unavailable` are attempt facts, not goal-success evidence.

### 3.4 Pinned Harness Storage Domain

The pinned package `packages/storage/storage-domain` provides schema-validated `per-record` domains. `DomainFacility.open` validates all existing records and enforces a single open handle per domain name. `KvTable.put` is a durable insert-or-overwrite operation, not an append-only primitive. A consumer must enforce immutability itself. A domain serializes writes within its handle, awaits durability before changing in-memory state, and `close()` rejects new writes while draining queued writes.

The API provides no transaction spanning two domains and no cross-process change notification. Phase 11.2 therefore needs ordered commits, explicit recovery, and a single-active-Host-process acceptance boundary. It must not modify Harness Core.

## 4. Architectural decisions proposed for Freeze

1. Keep `ExperienceEpisodeV1` and its existing domain/table/schema unchanged.
2. Add a separate authoritative `risk_advisor_outcome` version 1 per-record domain with an append-only `revisions` table.
3. Create the first revision only after the corresponding Episode has durably committed. Capture synchronous verifier callbacks in a bounded in-memory handoff until that acknowledgment; late verifier callbacks append a later revision.
4. Store only a sanitized snapshot of verifier metadata, never its execution ID or any raw result/output. Link every revision to `episodeId` and its immediate predecessor.
5. Derive the current qualification from a complete, validated revision chain. Do not keep a mutable head record.
6. Recover an Episode with no revision by appending an initial conservative `UNKNOWN` (or narrowly supported `NOT_EXECUTED`) revision. Never reconstruct or rewrite an existing revision.
7. Use the same Host-only Storage Domain capability. Storage absence/failure degrades the historical layer only; tool execution, approval, assessment, and UI paths continue unchanged.

The exact statuses, key encoding, rule precedence, lineage, capacity, recovery, privacy schema, lifecycle, and tests are frozen in `Phase11_2_Outcome_Qualification_Freeze.md`.

## 5. Preflight conclusion

The existing verifier is the correct primary outcome-evidence source, but its evidence is asynchronous in some cases and its current store is ephemeral. A separate append-only outcome domain can preserve Episode immutability and retain each subsequent deterministic qualification decision without changing Harness.

Proceed with the Phase 11.2 Freeze and implementation instructions as documentation only. No implementation is started by this preflight.

## 6. Sources inspected

- `src/host/postcondition-verifier.ts`
- `src/host/verification-store.ts`
- `src/host/verification-scheduler.ts`
- `src/host/retry-escalation.ts`
- `src/host/explicit-failure.ts`
- `src/host/experience-schema.ts`
- `src/host/experience-store.ts`
- `src/index.ts`
- Phase 11.1 Episode Freeze, Implementation Instructions, and Execution Report
- Pinned Harness `packages/storage/storage-domain/src/{index,domain,spec}.ts`
