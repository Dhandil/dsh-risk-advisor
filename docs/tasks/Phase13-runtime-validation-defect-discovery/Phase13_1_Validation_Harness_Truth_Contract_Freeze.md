# Risk Advisor Phase 13.1 — Validation Harness & Truth Contract Freeze

## Status

`RISK_ADVISOR_PHASE13_1_FROZEN_READY_FOR_IMPLEMENTATION`

Phase 13.1 implements validation infrastructure only.

It does not change Risk Advisor product semantics and does not run the high-volume Phase 13.2/13.3/13.4 campaigns.

## 1. Baseline

- Phase 13 Architecture Preflight:
  `862a5b117bab3e5af12371aed32380747f964bc4`
- Current accepted product executable:
  `28d3d204376da0a43279b949a3ceea794212d10c`
- Phase 12.2 accepted baseline:
  `214a829c1eb0195fbc57cb904e6d5bd864d56b61`
- Pinned Harness Core:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`

The product baseline is frozen during Phase 13.1.

## 2. Scope

Phase 13.1 may add only validation/campaign infrastructure and its focused tests.

Recommended root:

`validation/phase13/`

Recommended modules:

```
validation/phase13/
  schema.ts
  manifest.ts
  oracle.ts
  capture.ts
  ledger.ts
  workspace.ts
  runner.ts
  summary.ts
  fixtures.ts
  phase13-1-validation-harness.spec.ts
```

Exact file decomposition may vary if the same boundaries are preserved.

Phase 13.1 MUST NOT modify:

- `src/`;
- existing product tests;
- `package.json`;
- lockfile;
- tsconfig;
- bundle config;
- benchmarks;
- Harness Core.

No package script is required. Focused validation may be invoked explicitly with Vitest.

## 3. Phase 13.1 is infrastructure, not campaign execution

Phase 13.1 proves that the campaign harness can generate trustworthy evidence.

It may run only a bounded smoke manifest:

- at most 30 scenarios;
- at most 100 Tool executions;
- no real provider/model calls;
- no high-volume soak;
- no Browser automation requirement.

Do not start the Phase 13.2 300-scenario / 1500-execution campaign during 13.1.

## 4. Subject-under-test boundary

The validation harness must exercise the real accepted Risk Advisor Host wiring through the pinned Harness runtime:

```
Harness Context
  -> ToolRuntime
  -> Risk Advisor apply()
  -> validation probe mounted after Risk Advisor
```

The validation harness may import the subject entrypoint needed to mount Risk Advisor.

The **truth oracle** may not.

## 5. Strict import firewall

The independent truth side consists of at least:

- manifest/schema;
- expected-contract labels;
- oracle/classifier;
- ledger hashing/serialization;
- summary metrics.

Those modules MUST NOT import or read implementation logic from:

- `src/host/live-correction.ts`;
- `src/host/retry-escalation.ts`;
- `src/host/expected-effect.ts`;
- `src/host/postcondition-verifier.ts`;
- `src/host/verification-store.ts`;
- Online Correction Browser DTO/UI;
- Risk Advisor rendered advisory text.

The capture/subject adapter may read only public diagnostics exposed by the mounted product.

A focused source-boundary test must enforce this import firewall.

## 6. Manifest contract

Freeze manifest schema version 1.

Conceptual form:

```ts
interface Phase13ManifestV1 {
  readonly schemaVersion: 1
  readonly campaignRunId: string
  readonly seed: string
  readonly lane: 'A' | 'B' | 'C'
  readonly scenarios: readonly Phase13ScenarioV1[]
}

interface Phase13ScenarioV1 {
  readonly scenarioId: string
  readonly family: string
  readonly sessionKey: string
  readonly steps: readonly Phase13StepV1[]
}

interface Phase13StepV1 {
  readonly stepId: string
  readonly operationRef: string
  readonly expectedProcess: 'SUCCESS' | 'FAILURE' | 'EITHER'
  readonly expected: {
    readonly f1: 'EXPECTED' | 'NOT_EXPECTED' | 'NOT_APPLICABLE'
    readonly f2: 'EXPECTED' | 'NOT_EXPECTED' | 'NOT_APPLICABLE'
    readonly f2Settlement: 'NONE' | 'DIRECT' | 'ASYNC_SUPPORTED'
  }
}
```

Rules:

- identifiers are bounded ASCII campaign labels;
- every scenario ID is unique;
- every step ID is unique within the campaign;
- every `operationRef` resolves to exactly one declared synthetic operation;
- no absolute user paths;
- no credentials;
- no environment-derived expected labels;
- manifest must be deeply immutable after validation.

The manifest is the pre-execution truth declaration.

Expected labels may not be rewritten after observing Risk Advisor output.

## 7. Deterministic seed/replay

Manifest generation must be deterministic from:

- generator version;
- explicit seed;
- scenario-count/family configuration.

Do not use `Math.random()`.

Use a deterministic seed derivation based on Node standard crypto, e.g. SHA-256 of:

```
phase13-generator-v1 | seed | counter
```

The same input must produce byte-identical canonical manifest JSON.

Different seeds must produce a different manifest when randomized choices exist.

## 8. Operation registry

Manifest steps refer to a validation-owned operation registry.

Operations are synthetic/disposable and bounded.

Operation definition may include:

- tool name;
- bounded Tool arguments;
- expected process class;
- fixture setup;
- independent post-step oracle callback;
- cleanup metadata.

The registry MUST NOT read Risk Advisor output to decide what operation to execute next in Lane A smoke.

Phase 13.1 may use controlled fault fixtures when a deterministic mismatch is required.

Fault fixtures must be explicitly labeled `FAULT_FIXTURE` and are not counted as real-world Agent evidence.

## 9. Execution identity capture seam

The product uses opaque runtime execution IDs.

Phase 13.1 freezes the following validation-only mapping seam:

1. Mount Risk Advisor first.
2. Mount the validation probe second.
3. Every validation step uses a unique bounded synthetic `callId`.
4. During the validation probe's `tools/pre-execute` observer:
   - read `exec.agent?.session`;
   - read the synthetic `callId`;
   - call public `riskAdvisorCorrelation.lookup(session, callId)`.
5. The lookup MUST be exactly:
   ```
   { status: 'FOUND', executionId }
   ```
6. Store `stepId -> executionId` only in validation-local state.
7. Pass native execution through unchanged.

If the lookup is NOT_FOUND or AMBIGUOUS:

- mark the step `CAPTURE_INVALID`;
- preserve the reason;
- do not infer an execution ID;
- do not score that step as FP/FN/TN/TP;
- if this occurs in deterministic Lane A smoke, fail the harness proof.

No product-private field inspection is allowed.

## 10. Result capture ordering

The validation probe must be registered after Risk Advisor.

After the native Tool execution settles, grading reads public diagnostics only.

Actual Finding capture uses:

```
riskAdvisorLiveCorrection.forExecution(executionId)
riskAdvisorLiveCorrection.forSession(session)
```

The grader records only sanitized fields needed for validation:

- Finding kind;
- Finding ID;
- advisory code if needed for identity verification;
- count.

Do not persist full internal Finding payloads by default.

## 11. F1 settlement

For F1, the accepted product path is synchronous with Tool result observation.

After the Tool execution promise settles and a valid executionId was captured, the runner may read F1 state immediately from public Live Correction diagnostics.

No arbitrary sleep is allowed for F1 grading.

## 12. F2 settlement

F2 may depend on asynchronous postcondition verification.

Public settlement seam:

```
riskAdvisorVerification.get(executionId)
```

For a step whose manifest declares:

- `f2Settlement = NONE`: do not wait for a verifier record;
- `DIRECT`: expect direct verification to be available after Tool settlement;
- `ASYNC_SUPPORTED`: poll the public verification diagnostic until a record exists or the deadline expires.

Frozen serial Lane-A settlement deadline:

```
PHASE13_VERIFICATION_SETTLE_DEADLINE_MS = 15_000
```

Polling interval must be bounded at 25-100ms.

If an `ASYNC_SUPPORTED` record is still absent at the deadline:

- classify `UPSTREAM_VERIFICATION_MISSING`;
- do not call it an Online Correction FN;
- stop deterministic campaign scoring as a P1/upstream product defect candidate.

A verifier record with MATCHED/MISMATCHED/UNKNOWN/UNAVAILABLE is considered settled for this purpose.

The truth oracle must not inspect the verifier record to decide what was expected. It may use the record only as actual upstream evidence.

## 13. Before/after session capture

For each step record bounded before/after Session Finding identity sets.

Purpose:

- detect duplicate Finding IDs;
- detect unrelated Finding mutation;
- support Session isolation proofs;
- detect stale/resurrected identity later.

Do not treat session-set deltas as the source of expected labels.

## 14. Independent classification oracle

The classifier receives only:

- immutable manifest expected labels;
- capture validity;
- actual emitted Finding kinds/IDs;
- environment/settlement status.

For each F1/F2 signal:

### EXPECTED
- emitted exactly once -> TP;
- absent -> FN;
- duplicate identity/count -> P1 duplicate defect.

### NOT_EXPECTED
- absent -> TN;
- emitted -> FP.

### NOT_APPLICABLE
- absent -> excluded from precision/recall denominator;
- emitted -> `UNEXPECTED_SIGNAL_ON_NOT_APPLICABLE`, a P1 correctness defect.

`CAPTURE_INVALID`, `ENVIRONMENT_FAILURE`, or unresolved upstream verification make the signal unscorable.

They must never silently become TN or FN.

## 15. Product-opportunity labels are separate

Phase 13.1 ledger schema reserves:

```
opportunity:
  NONE
  OUT_OF_SCOPE_USEFUL_WARNING_CANDIDATE
```

The deterministic contract classifier never auto-generates the second label from missing F1/F2.

Opportunity labels are supplied later by Phase 13.2/13.3 scenario review or explicit scenario template semantics.

They are excluded from F1/F2 precision/recall.

## 16. Truth ledger

Use an append-only JSONL ledger in the local campaign artifact directory.

Do not write high-volume evidence into tracked repository files.

Freeze record classes:

- RUN_START
- SCENARIO_START
- STEP_RESULT
- SCENARIO_END
- RUN_END

Each line must contain:

- schemaVersion = 1;
- monotonically increasing sequence;
- campaignRunId;
- record type;
- bounded payload;
- `prevHash`;
- `recordHash`.

Genesis `prevHash`:

64 lowercase zeroes.

`recordHash` is SHA-256 over deterministic canonical JSON of the record excluding `recordHash`.

Canonicalization recursively sorts object keys and preserves array order.

The reader must verify:

- sequence continuity;
- hash chain;
- run ID consistency;
- terminal RUN_END uniqueness.

Tampered/truncated ledger -> `LEDGER_INTEGRITY_INVALID`; no metrics may be published from it.

## 17. STEP_RESULT minimum payload

Conceptual bounded payload:

```ts
{
  scenarioId,
  stepId,
  family,
  sessionKey,
  operationRef,
  executionCapture: 'VALID' | 'CAPTURE_INVALID',
  expected: { f1, f2 },
  actualKinds: [...],
  actualFindingIds: [...],
  verificationStatus?: 'MATCHED'|'MISMATCHED'|'UNKNOWN'|'UNAVAILABLE',
  processObserved: 'SUCCESS'|'FAILURE'|'UNKNOWN',
  classification: {
    f1: 'TP'|'FP'|'FN'|'TN'|'NA'|'UNSCORABLE',
    f2: 'TP'|'FP'|'FN'|'TN'|'NA'|'UNSCORABLE'
  },
  issueCodes: [...],
  opportunity: 'NONE'|'OUT_OF_SCOPE_USEFUL_WARNING_CANDIDATE'
}
```

Do not store:

- arbitrary stdout/stderr;
- prompt/model text;
- credentials;
- environment dumps;
- user home paths;
- unrelated Session history.

Exact synthetic commands may live in the separately hashed manifest/operation registry, not duplicated into every ledger row.

## 18. Workspace manager

All Phase 13 mutation occurs under a validation-owned disposable root outside valuable repositories.

Default root must be under OS temporary storage, for example:

`<tmp>/dsh-risk-advisor-phase13/<campaignRunId>/`

The workspace manager must:

- create one scenario directory per scenario;
- expose only relative scenario paths;
- reject absolute paths;
- reject `..` escapes;
- reject symlink/junction traversal for managed mutation/cleanup;
- resolve nearest existing ancestors before creating non-existing targets;
- refuse cleanup if containment cannot be proven;
- make scenario reset deterministic;
- never invoke broad `git clean`;
- never touch original repository `node_modules`, `lib`, or `.vitest-cache`.

Cleanup failure is an environment/campaign-harness failure, not a Risk Advisor defect.

## 19. Local Git fixtures

Local Git may be used inside a scenario workspace.

Rules:

- no remote;
- local-only config if identity is required;
- no credential helper changes;
- no global Git config mutation;
- branch/tag names synthetic;
- cleanup only inside validation root.

## 20. Stop controller

The runner owns a fail-fast campaign status.

Frozen statuses:

- `RUNNING`
- `COMPLETE`
- `BLOCKED_P0`
- `BLOCKED_P1`
- `BLOCKED_CAPTURE`
- `BLOCKED_LEDGER`
- `BLOCKED_ENVIRONMENT`

For deterministic Lane A:

- FP/FN/duplicate/unexpected-on-NA -> BLOCKED_P1;
- capture invalid -> BLOCKED_CAPTURE;
- ledger integrity invalid -> BLOCKED_LEDGER;
- containment failure -> BLOCKED_ENVIRONMENT.

The runner stops scheduling new scenarios after a blocking state.

Already-running cleanup still executes.

## 21. Summary metrics

Summary generation reads only a verified completed ledger.

Per F1 and F2 report:

- expected positives;
- expected negatives;
- TP;
- FP;
- FN;
- TN;
- NA count;
- unscorable count;
- precision;
- recall.

If a denominator is zero, emit:

`N/A`

not 0 and not 1.

Also report:

- scenario count;
- Tool execution count;
- Finding count;
- duplicate count;
- wrong-session count;
- stale/resurrection issue count;
- capture failures;
- upstream verification missing;
- environment failures;
- opportunity candidate count;
- final ledger head hash.

Do not report one aggregate “accuracy” that hides class imbalance.

## 22. Wrong-session proof

The validation runner must track synthetic session ownership.

A Finding observed under Session B whose captured execution belongs to Session A is:

`WRONG_SESSION_FINDING`

This is P0/P1 severity depending exposure context and blocks deterministic campaign continuation.

The harness must include a focused two-Session smoke proof.

## 23. Minimal reproducer

On the first blocking deterministic defect, write a bounded local reproducer artifact containing:

- manifest generator version;
- seed;
- scenario ID;
- scenario definition;
- relevant step prefix only;
- expected labels;
- actual sanitized Finding summary;
- ledger head hash at failure.

No raw private output.

The reproducer is local evidence. It is not automatically committed.

## 24. 13.1 smoke families

The bounded 13.1 smoke must exercise at least:

1. success/no Finding;
2. isolated failure/no F1;
3. exact repeated failure/F1 expected;
4. changed operation/F1 not expected;
5. success breaks retry chain;
6. direct F2 matched/no Finding;
7. controlled direct F2 mismatch/F2 expected;
8. async supported matched/no F2;
9. controlled async mismatch/F2 expected;
10. unsupported verification/no F2;
11. two-Session isolation;
12. deterministic replay/ledger integrity.

Controlled mismatch cases may use validation-only fault fixtures.

Do not claim fault fixtures are real-agent evidence.

## 25. Phase 13.1 required proofs

Implementation must provide focused proofs:

- **H1** strict manifest schema and uniqueness.
- **H2** same seed/config -> byte-identical canonical manifest; different seed changes randomized manifest.
- **H3** truth/oracle import firewall contains no Risk Advisor implementation dependency.
- **H4** validation probe mounted after Risk Advisor captures exactly one public executionId.
- **H5** invalid/ambiguous capture becomes UNSCORABLE and cannot become FN/TN.
- **H6** F1 is graded after Tool settlement without sleep.
- **H7** DIRECT and ASYNC_SUPPORTED F2 settlement uses public verification diagnostics with the frozen deadline.
- **H8** EXPECTED/NOT_EXPECTED/NOT_APPLICABLE classification semantics are exact.
- **H9** out-of-scope opportunity labels do not alter F1/F2 metrics.
- **H10** ledger sequence/hash-chain verification detects mutation, deletion, truncation, duplicate RUN_END.
- **H11** ledger payload excludes forbidden raw fields and enforces bounds.
- **H12** workspace rejects absolute/path traversal/symlink escape and cannot clean outside validation root.
- **H13** deterministic reset returns scenario workspace to the declared baseline.
- **H14** summary precision/recall and N/A denominator handling are correct.
- **H15** first deterministic FP/FN/duplicate blocks scheduling and emits a minimal reproducer.
- **H16** environment/capture/upstream-settlement failure is not silently counted as product FP/FN.
- **H17** two concurrent/independent Sessions cannot cross-attribute Findings.
- **H18** bounded 13.1 smoke covers the required 12 families and leaves product source/package/config untouched.

## 26. Verification boundary

Codex may run:

1. Phase 13.1 focused H1-H18;
2. bounded 13.1 smoke <=100 Tool executions;
3. Phase 12.1 focused regression;
4. Phase 12.2 focused regression;
5. P3 retry-escalation regression;
6. P7 verifier/boundary regressions;
7. relevant P10 lifecycle/boundary/privacy regressions;
8. static diff/scope/privacy checks.

Do not run:

- Phase 13.2 high-volume campaign;
- real provider/model calls;
- complete `pnpm test` merely for 13.1 infrastructure;
- Browser automation unless needed for an implementation bug in validation infrastructure.

Because `src/`, package manifest, config, and existing product tests are frozen, architecture review should reject any implementation candidate that changes them.

## 27. Publication

Phase 13.1 implementation must publish:

1. one exact validation-harness candidate;
2. one separate docs-only execution report.

Large local smoke ledgers/workspaces are not committed.

The report records:

- candidate SHA;
- Harness SHA;
- focused proof totals;
- smoke scenario/Tool execution totals;
- smoke ledger head hash;
- product-source diff = zero;
- provider/model calls = zero;
- whether any P0/P1 was found.

Do not declare Phase 13.1 accepted.

## 28. Exit criteria

Phase 13.1 may be accepted when architecture review confirms:

- independent truth boundary is real;
- capture is based on public diagnostics;
- asynchronous F2 settlement cannot create false FNs;
- evidence ledger is integrity-checked;
- workspace containment is fail-closed;
- blocking defects stop scheduling;
- smoke campaign is reproducible;
- no Risk Advisor product executable changed.

Only then may Phase 13.2 freeze the actual deterministic 300+/1500+ campaign manifest.
