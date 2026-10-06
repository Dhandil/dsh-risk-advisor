# Risk Advisor Phase 11.1 — Experience Episode Authority & Durable Schema Freeze

## Freeze outcome

`RISK_ADVISOR_PHASE11_1_FROZEN_READY_FOR_IMPLEMENTATION`

This document freezes the implementation contract for Phase 11.1 only.

Phase 11.2+ is not implementation-authorized by this Freeze.

---

## 1. Baseline

Architecture Preflight commit:

`7a12d558f6e19db150a484c28ee536ad11744cd3`

Phase 11 start baseline:

`b2d2925196acbd6ede8d2aa151338f82df8d9b5b`

Accepted V1 product executable inherited by Phase 11:

`345a54882393da7f64584f21105fa7fc56793265`

Pinned Harness Core:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

---

## 2. 11.1 scope

11.1 introduces one new capability:

> A Host-owned, durable, schema-validated, privacy-bounded immutable record of one settled Risk Advisor-observed Tool execution attempt.

11.1 does **not**:

- derive historical Patterns;
- generate Guidance;
- alter Risk Assessment;
- change Browser UI;
- inject Agent context;
- call Fast Judge or Deep Judge;
- change Native Approval;
- auto-correct an Agent;
- add Skill behavior;
- classify final semantic success/failure.

The product behavior visible to the user must remain unchanged.

---

## 3. Authoritative object: Experience Episode

The authoritative durable object is:

`ExperienceEpisodeV1`

An Episode states only independently observed attempt facts available at settlement.

It does not state the final historical interpretation of those facts.

Semantic outcome qualification belongs to Phase 11.2.

---

## 4. Exact durable domain

Use pinned Harness `ctx.storageDomain`.

Domain:

```text
name:    risk_advisor_experience
version: 1
layout:  per-record
table:   episodes
```

The domain is authoritative.

Do not set `invalidRecords: 'backup-and-skip'`.

A malformed authoritative Episode must fail opening the Experience domain loudly rather than silently dropping history.

Do not:

- write private JSON files;
- use Browser localStorage;
- append a new Session event type;
- store Episodes in the project workspace;
- add SQLite-specific code.

The configured Harness backend remains the deployment's choice. The retained Web/base composition routes Storage Domain to the existing JSON backend under `$DSH_HOME/storages`.

---

## 5. Dependency contract

The plugin may add:

- `@deepseek-ai/dsh-storage-domain` as a Harness peer dependency compatible with the pinned 0.1.6-alpha.2 API;
- a matching development dependency for local type/build/test resolution;
- `zod ^4.4.3` as an explicit package dependency (or equivalent explicit direct dependency) for the durable record schema.

Do not rely on a transitive `zod` install.

Do not depend directly on `@deepseek-ai/dsh-storage-json` in product code.

Tests may instantiate the pinned backend or a faithful test backend where appropriate.

---

## 6. Optional capability behavior

Risk Advisor's existing required injection remains:

`inject = ['tools']`

Storage is an optional enhancement.

Mount Experience through a nested optional injection on `storageDomain`.

If Storage Domain is absent, fails to open, closes, or a write fails:

- current V1 Risk Advisor behavior continues;
- Tool execution continues;
- Native Approval behavior is unchanged;
- Risk Assessment is unchanged;
- Browser UI is unchanged;
- the Experience subsystem reports sanitized `UNAVAILABLE` / write-failure diagnostics;
- no execution is denied because historical persistence failed.

Experience persistence is observational in 11.1.

---

## 7. Single settlement trigger

The only Episode commit trigger is the authoritative Harness:

`tools/result`

Pinned Harness guarantees that a prepared Tool attempt ends through the final result notification path even when it is denied/cancelled before tool-body dispatch.

Therefore:

- approval rejection does not independently create an Episode;
- approval cancellation does not independently create an Episode;
- approval unavailability does not independently create an Episode;
- `session/event approval/decided` is an input fact only.

Exactly one settled traversal may produce at most one Episode.

Do not use timers to "wait for more evidence".

Do not commit on:

- `tools/pre-execute`;
- `tools/execute`;
- `tools/post-execute`;
- `approval/asked`;
- `approval/decided`;
- verifier completion.

---

## 8. Why verifier output is not part of Episode V1

Some known postconditions publish synchronously, while shell postcondition verification may complete asynchronously after `tools/result`.

Making Episode commit wait for the verifier would introduce:

- timing dependence;
- shutdown races;
- arbitrary timeout semantics;
- incomplete immutable records.

Therefore Episode V1 records settlement facts only.

Phase 11.2 owns a separate qualification/revision layer that can consume:

- the Episode;
- VerificationRecordV1;
- explicit failure facts;
- approval facts;
- later invalidation/requalification evidence.

This preserves Episode immutability.

---

## 9. Episode identity and immutability

Episode table key and the stored `episodeId` are deterministically derived from Risk Advisor's opaque live `executionId`.

Required form:

```text
ra-episode-v1_<sha256(executionId)>
```

`sha256(executionId)` means the lowercase 64-character hexadecimal SHA-256 digest of the exact UTF-8 bytes of `executionId`. The resulting table key uses only `[A-Za-z0-9_-]`, satisfying the pinned Harness per-record Storage Domain key contract without changing Harness Core. The stored `episodeId` MUST equal this table key; `sourceExecutionId` continues to contain the opaque live execution id.

This path-safe key encoding does not change the Episode authority or lifecycle semantics: one settled Tool attempt still produces at most one immutable Episode; identity remains deterministically executionId-based; identical same-key writes remain idempotent; divergent same-key records remain conflicts; privacy boundaries, capacity, and lifecycle behavior are unchanged.

The stored record also contains that episodeId and source executionId.

Commit semantics:

1. if the key is absent, write the Episode;
2. if an identical Episode is already present, treat as idempotent success;
3. if the same key exists with different content, fail closed inside Experience diagnostics and never overwrite it.

No Episode update method is exposed.

No Episode deletion is part of 11.1 product behavior.

No overwrite-on-conflict.

---

## 10. Frozen Episode V1 schema

The semantic schema is frozen as:

```ts
interface ExperienceEpisodeV1 {
  schemaVersion: 1
  episodeId: string
  sourceExecutionId: string

  observedAt: number

  runtime: {
    platform: 'darwin' | 'win32' | 'linux' | 'other'
  }

  operation: {
    toolName: string
    kind:
      | 'filesystem-read'
      | 'filesystem-write'
      | 'filesystem-edit'
      | 'shell'
      | 'network-read'
      | 'unknown'
    parserConfidence: 'high' | 'medium' | 'low'
    mutating: boolean | 'unknown'
    externalEffect: boolean | 'unknown'
    networkEffect: 'none' | 'read' | 'write' | 'unknown'
    requestedPermission?: 'workspace-write' | 'danger-full-access'
  }

  approval: {
    observed: boolean
    outcome?: 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'
  }

  terminal: {
    isError: boolean
    error?: {
      name: string
      code: string
    }
  }

  retry: {
    status:
      | 'READY'
      | 'UNSUPPORTED'
      | 'DEGRADED'
      | 'NOT_FOUND'
      | 'EXPIRED'
      | 'CAPACITY_EXCEEDED'
    retryCount: number
    recentFailureCount: number
    sameRootCause: boolean | 'unknown'
    permissionEscalation: boolean | 'unknown'
  }

  provenance: {
    source: 'LIVE_TOOLS_RESULT'
    ruleStatus:
      | 'READY'
      | 'DEGRADED'
      | 'UNSUPPORTED'
      | 'NOT_FOUND'
      | 'EXPIRED'
      | 'CAPACITY_EXCEEDED'
    reasonCodes: readonly string[]
  }
}
```

The concrete zod schema must enforce bounded strings and finite/safe integer timestamps/counts.

The implementation may brand ID strings at TypeScript level, but may not add persisted semantic fields outside this Freeze.

---

## 11. Operation facts source

Do not persist raw Tool arguments.

Use the existing deterministic Rule Engine projection for the durable operation fields:

- `operationKind`;
- `parserConfidence`;
- `mutating`;
- `externalEffect`;
- `networkEffect`;
- `requestedPermission`;
- rule status/reason codes.

This avoids widening Operation Foundation's intentionally narrow public diagnostics and avoids duplicating raw-argument persistence.

`toolName` may be read from the live ToolExecution identity and must be bounded before persistence.

11.1 does not persist target paths or command strings.

---

## 12. Approval fact source

The Episode may persist only the closed approval outcome vocabulary:

- `allowed-once`;
- `rejected`;
- `cancelled`;
- `unavailable`.

Use the exact live correlation between the approval observation and the current `executionId`.

If no approval observation is exactly bound to this execution:

```text
approval.observed = false
approval.outcome  = absent
```

Do not infer "allowed" merely because the Tool later ran.

If approval observations are ambiguous/conflicted, do not select an outcome.

Treat them as not safely observed and add a bounded provenance reason code.

---

## 13. Terminal fact source

`tools/result` is the terminal settlement source.

Persist:

- `isError`;
- bounded structured Harness error `name` + `code` only when both are safely available.

Do not persist:

- error message;
- stack;
- stdout;
- stderr;
- rendered content;
- arbitrary result value.

An error result is not itself equivalent to `VERIFIED_FAILURE`.

A non-error result is not itself equivalent to `VERIFIED_SUCCESS`.

11.2 decides qualification.

---

## 14. Retry fact source

Read the already-existing Retry/Escalation diagnostics for the exact `executionId` after the current result has been observed by that analyzer.

Persist only:

- status;
- retryCount;
- recentFailureCount;
- sameRootCause;
- permissionEscalation.

Do not persist recent raw failure entries or error text in Episode V1.

---

## 15. Result ordering inside Risk Advisor

For the Risk Advisor's `tools/result` observer, the required internal order is:

```text
1. RetryEscalationAnalyzer.observeResult
2. PostconditionVerifier.observeResult
3. Experience Episode settlement capture/commit request
4. OperationFoundation.retire
5. ActiveExecutionIndex.observeResult
```

The Experience capture occurs before correlation/foundation retirement so it can still read the exact live sanitized facts.

The Episode does not wait for asynchronous postcondition completion.

Durable write itself may be asynchronous and must not delay or reject the Harness Tool result path.

The implementation must own/observe the asynchronous persistence promise and contain failures.

No unhandled rejection is permitted.

---

## 16. Persisted privacy boundary

The Episode schema must reject or omit all of the following:

- raw command;
- raw arguments;
- file path;
- canonical path;
- cwd/workspace path;
- file content;
- old/new edit text;
- shell stdout/stderr;
- Tool result body;
- approval justification;
- user prompt/messages;
- Session ID;
- callId/rootCallId;
- approval ID;
- provider/model content;
- credentials/tokens/secrets.

An Episode record must be safe to inspect as a structural historical fact document without exposing the execution payload.

Tests must assert absence of representative sentinel secrets/paths/commands from serialized stored Episode JSON.

---

## 17. Capacity

11.1 hard maximum:

`MAX_EXPERIENCE_EPISODES = 10_000`

All commits are serialized by the Experience subsystem's own commit chain.

At or above the cap:

- do not evict authoritative Episodes;
- do not overwrite the oldest Episode;
- do not delete history silently;
- skip the new Episode;
- mark Experience diagnostics `CAPACITY_EXCEEDED`.

A later phase may introduce explicit retention/archival governance.

11.1 does not.

---

## 18. Startup and malformed data

Opening the authoritative domain must validate every Episode.

If the domain cannot open because of:

- malformed record;
- version mismatch;
- backend failure;

the Experience subsystem becomes unavailable for the current generation.

Existing V1 Risk Advisor features remain active.

Do not silently move aside or skip malformed authoritative Episode records.

Do not auto-delete or auto-rewrite the medium.

---

## 19. HMR and lifecycle

The Experience runtime owns exactly one open domain handle per active plugin generation.

Required behavior:

- domain opened only inside the `storageDomain` capability lifetime;
- no double-open across one active generation;
- new commits rejected after disposal begins;
- already-started commit chain drains before domain close;
- HMR/unmount leaves no pending unhandled writes;
- no Tool observer remains owned by a disposed Experience runtime;
- reopening after clean close restores prior Episodes.

If Storage Domain disappears, Experience becomes unavailable but V1 continues.

---

## 20. Diagnostics surface

11.1 may expose Host-only sanitized diagnostics through:

`ctx.riskAdvisorExperience`

Minimum diagnostic surface:

```ts
interface ExperienceDiagnostics {
  status():
    | 'READY'
    | 'UNAVAILABLE'
    | 'CAPACITY_EXCEEDED'
    | 'CONFLICTED'
  size(): number
  get(episodeId: string): ExperienceEpisodeV1 | undefined
}
```

A diagnostic implementation may expose bounded reason codes, but no mutation API.

Do not expose the Experience domain handle itself.

Do not register any model-facing tool.

Do not add Browser routes/UI in 11.1.

---

## 21. No qualification in 11.1

The following terms are reserved for 11.2 and must not appear as stored Episode outcome fields in 11.1:

- `VERIFIED_SUCCESS`;
- `VERIFIED_FAILURE`;
- `UNKNOWN` as a final qualification;
- `NOT_EXECUTED`;
- `INVALIDATED`;
- confidence scores.

11.1 stores facts.

11.2 interprets them.

---

## 22. Expected implementation scope

Expected product files:

- new `src/host/experience-schema.ts`;
- new `src/host/experience-store.ts` or equivalent single-owner runtime;
- bounded changes to `src/index.ts`;
- `package.json`;
- lockfile if direct dependency installation changes it.

Expected tests:

- Phase 11.1 schema/privacy unit tests;
- Experience domain persistence/restart tests;
- runtime integration around `tools/result`;
- approval reject/cancel/unavailable settlement cases;
- idempotency/conflict/capacity tests;
- storage absent/open failure/write failure tests;
- lifecycle/HMR drain tests;
- package contract updates.

No client files should need modification.

No V1 Browser bridge/risk UI changes are expected.

---

## 23. Required proof matrix

At minimum prove:

**E1 — allowed execution**
- one `tools/result`;
- one Episode;
- approval fact preserved if present;
- no semantic-success claim.

**E2 — approval rejected**
- one terminal Tool result;
- exactly one Episode;
- `approval.outcome = rejected`;
- no separate approval-created duplicate.

**E3 — approval cancelled**
- one Episode;
- cancellation recorded;
- no semantic failure claim.

**E4 — approval unavailable**
- one Episode;
- unavailable recorded;
- V1 stays functional.

**E5 — no approval**
- `approval.observed=false`;
- no fabricated allow outcome.

**E6 — raw privacy**
- sentinel command/path/content/justification/output cannot be found in persisted Episode serialization.

**E7 — restart**
- close runtime/backend;
- reopen same durable medium;
- byte/semantic Episode identity survives.

**E8 — idempotency**
- identical same-key commit is a no-op.

**E9 — conflict**
- divergent same-key commit does not overwrite;
- diagnostics fail closed.

**E10 — capacity**
- cap does not evict old Episodes;
- new commit is skipped with `CAPACITY_EXCEEDED`.

**E11 — storage absent/failure**
- no Tool execution/approval behavior changes.

**E12 — lifecycle**
- pending durable writes drain on close;
- no unhandled promises;
- clean reopen succeeds.

**E13 — async verifier**
- Episode commit is not delayed waiting for shell verification;
- later verifier result does not mutate the Episode.

**E14 — current V1 regression**
- Risk/approval/browser behavior remains unchanged.

---

## 24. Quality / acceptance sequence

Implementation governance:

1. implement 11.1 only;
2. run focused Phase 11.1 tests;
3. run affected regression suites, at least R2/R4/P2/P3/P4/P7/P10 as applicable;
4. run typecheck;
5. run build;
6. run package/declaration/export/static gates;
7. run isolated durable restart proof with a temporary Storage root / temporary DSH home;
8. inspect privacy serialization;
9. only after all cheap gates pass, run exactly one fresh complete `pnpm test` on the exact final executable candidate;
10. after that Full, no executable/test/package/config/benchmark semantic drift;
11. only Execution Report documentation may be added.

Do not use the user's real `$DSH_HOME/storages` for destructive or fixture setup.

A temporary isolated Harness storage root is sufficient for the restart proof.

---

## 25. Full acceptance boundary

Codex may produce:

`RISK_ADVISOR_PHASE11_1_PUBLISHED_READY_FOR_REVIEW`

only after:

- exact candidate is pushed;
- exactly one fresh complete Full passes on that exact candidate;
- post-Full changes are report-only;
- remote identity is verified.

Codex must not:

- create `Acceptance_Report.md`;
- declare 11.1 ACCEPTED;
- start 11.2.

Final acceptance remains ChatGPT Web architecture authority.

---

## 26. Frozen conclusion

Phase 11.1 creates a durable historical fact layer without yet making historical judgments.

The key invariant is:

> **A settled execution attempt may become one immutable Episode, but an Episode never claims that the attempt was semantically good, safe, necessary, or successful.**

Those interpretations begin in Phase 11.2.
