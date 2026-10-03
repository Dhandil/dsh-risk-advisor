# Phase 10 Acceptance Report — V1 Hardening and Release Readiness

## Outcome

`PHASE10_ACCEPTED`

Phase 10 is independently accepted after final review of R4.

Accepted executable/Tested SHA:

`1fa84e2a8a9de465cdb85fef928ec9e19086bba2`

Reviewed final report SHA:

`465e087bc3dcf79922c73e817ba610b84cf016e9`

Pinned Harness reference:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

Phase 10 acceptance covers the frozen V1 hardening scope. It does not introduce a later product phase.

---

## 1. Commit and Full governance

Independent comparison verified:

### R4 review baseline -> Tested SHA

`32aae897fa5a7e4ba428ab163ae1ff65b23e74d6 -> 1fa84e2a8a9de465cdb85fef928ec9e19086bba2`

contains one executable/test repair commit.

Changed files are limited to:

- `tests/p10-host-hmr.integration.spec.ts`
- `tests/p10-proof-matrix.unit.spec.ts`

No product/runtime semantic code changed in R4.

### Tested SHA -> final report SHA

`1fa84e2a8a9de465cdb85fef928ec9e19086bba2 -> 465e087bc3dcf79922c73e817ba610b84cf016e9`

contains exactly one changed file:

`docs/tasks/Phase10-hardening/Execution_Report.md`

Therefore the final Full evidence remains attached to the exact Tested SHA.

### Final report SHA -> main

Independent comparison verified:

`465e087bc3dcf79922c73e817ba610b84cf016e9 == main`

before this acceptance publication.

---

## 2. Fresh complete Full accepted

Exactly one final fresh complete:

`pnpm test`

was run on:

`1fa84e2a8a9de465cdb85fef928ec9e19086bba2`

Result:

```text
17 scripted groups
58 test files
302 tests
PASS
```

The Full includes all inherited R1-R5 and P1-P10 groups.

No executable semantic drift followed the passing Full.

---

## 3. Shell and adversarial hardening accepted

Phase 10 preserves the shared shell-analysis authority.

The adversarial corpus directly covers chaining, dynamic execution, encoded execution, environment/execution-context injection, quoted inert separators, and ambiguous forms.

Known dangerous semantics map to explicit findings.

Unknown/dynamic unsupported semantics fail closed.

No corpus command is executed.

No Phase-10-only second shell parser was introduced.

---

## 4. Prompt-injection authority boundary accepted

Phase 10 makes the bounded structural claim required by the freeze:

```text
untrusted operation/project/file/tool content
!= direct-user authorization
!= authoritative Host fact
!= approval authority
```

Hostile local reviewer proofs cover:

- attempts to lower deterministic/evidence-backed risk;
- unrequested dimensions;
- fake authorization;
- fake reversible/checkpoint/evidence-quality authority;
- recommendation/final-decision style fields;
- hostile rationale/hypothesis/alternative content.

Fast/A2 and Deep/A4 Host merge rules preserve authoritative facts and risk floors.

Alternatives remain `MODEL_SUGGESTED / UNVERIFIED`.

Proposed facts remain hypotheses.

No claim of arbitrary real-provider prompt-injection immunity is made.

---

## 5. Privacy hardening accepted

A synthetic runtime-generated canary is used without storing a real credential.

The accepted proof covers the Risk Advisor-owned pipeline including:

- ReviewerOperationSeed;
- DirectUserContext;
- Fast serialized payload and accepted candidate;
- actual Evidence target seed and collector;
- sanitized EvidenceSnapshot;
- A1/A2/A3/A4;
- Deep payload and accepted candidate;
- Browser V4 projection;
- sanitized diagnostics;
- benchmark output;
- Risk Advisor-owned captured logger/console surfaces where applicable.

The exact canary is not retained in forbidden downstream surfaces.

Raw Evidence seed cleanup/consumption is proven.

No new telemetry or raw prompt/tool logging was added.

---

## 6. Retry and semantic correctness accepted

The false-correlation matrix preserves immutable capture-boundary retry semantics.

Different targets/operations/Sessions do not become false retries.

TTL/capacity degradation does not manufacture a positive relation.

Late verifier evidence does not retroactively redefine the selected prior operation.

Known postcondition verification continues to distinguish:

```text
matched     -> semanticSuccess=true
mismatched  -> semanticSuccess=false
unproven    -> semanticSuccess=unknown
```

Process exit 0 alone is not semantic success.

Late cancelled/retired verification cannot rewrite the accepted terminal meaning.

---

## 7. Native Approval authority and coexistence accepted

Risk Advisor remains advisory-only.

Independent review confirms product code still does not:

- answer PendingApproval;
- register an approval answerer;
- return a Risk Advisor ApprovalOutcome;
- replace Native Approval authority.

The real pinned `ApprovalService` coexistence proof uses a separate Cordis fixture answerer.

Accepted cases include:

- RA absent/present parity;
- exactly one native answerer invocation;
- real Risk Advisor timeout;
- real Risk Advisor side-path failure;
- actual RA fiber dispose-before-answer;
- answerer removal without RA fallback;
- remount without duplicate answerers;
- duplicate approval observation without double native answer.

No named external approval plugin was installed to satisfy the proof.

---

## 8. Native-close fencing accepted

Direct coordinator integration proves:

### Evidence/A3

Native approval closes while held Evidence work is in flight.

Late Evidence settlement cannot publish A3 after close.

Owned work still drains/quiesces.

### Deep/A4

Native approval closes while held Deep work is in flight.

Late Deep settlement cannot publish A4 after close.

Owned Deep work is disposed/drained.

Native outcome remains single and authoritative.

---

## 9. Host HMR/reload accepted

A persistent root Cordis Context mounts and disposes the actual Risk Advisor Host child fiber for three cycles.

Result:

`3/3 PASS`

For every cycle:

- actual Risk Advisor package `apply()` is mounted;
- Host services become available;
- a bounded tool/native-approval traversal executes;
- exactly one current-generation observation path is active;
- actual RA child fiber is disposed;
- disposed generation cannot observe later-generation work.

Browser RPC proof:

```text
maximum simultaneous RA handlers = 1
handlers after each dispose       = 0
```

Old correlation/assessment diagnostics do not observe new-generation operations.

Old reviewer adapters receive no requests from remounted generations.

---

## 10. Held-work HMR / quiescence accepted

The final R4 proof removes the artificial plugin cleanup gate used in R3.

The held local reviewer:

- records request start;
- ignores AbortSignal;
- waits only on its own test-controlled release;
- emits a valid bounded candidate only after release.

No extra RA-owned test `effect`, `ownedWork` promise, or synthetic disposal blocker exists.

With the reviewer unresolved:

- real RA child fiber `dispose()` remains unresolved;
- held adapter request count remains exactly one;
- no late A2 appears;
- no fresh generation is mounted over the old generation.

This pending state is attributable to the accepted product chain:

```text
ApprovalAssessmentCoordinator.dispose()
-> JudgeScheduler.dispose()
-> await active Judge promise
```

After reviewer release:

- RA-owned scheduler reaches quiescence;
- fiber disposal resolves;
- old Browser RPC handler count is zero;
- old scoped RA services are unavailable;
- held candidate cannot publish a post-dispose A2.

A fresh remounted Risk Advisor generation then:

- registers one fresh RPC handler;
- uses a fresh reviewer adapter;
- handles a fresh native approval independently;
- does not reuse old diagnostics/adapter state;
- returns handler count to zero on disposal.

This closes the final Phase-10 lifecycle proof blocker.

---

## 11. Client HMR accepted

The actual Risk Advisor client plugin/fiber is mounted and disposed for three cycles on a persistent client Context.

Result:

`3/3 PASS`

For every cycle:

- exactly one RA detail contribution exists while mounted;
- no slot-entry growth occurs;
- dispose removes all RA slot contributions;
- native approval detail is restored;
- native approval controls remain usable;
- fresh session/call binding is used.

No stale client slot generation survives disposal.

---

## 12. TOCTOU truthfulness accepted

Phase 10 does not claim atomic execution-time revalidation.

The V1 contract remains:

`PRE_EXECUTION_OBSERVATION`

Private operation identity proof preserves review-time binding.

Evidence/A3/A4 cannot be substituted across ExecutionId.

Private operationHash/raw arguments do not become public Browser diagnostics.

The UI explicitly discloses that Evidence was observed before execution and execution-time state may change.

No execution-time veto/guard authority was added.

---

## 13. External bundle / cold restart accepted

The package now has a real external bundle surface:

- `cordis.patch.yml`;
- `dsh.bundle.patch`;
- existing `dsh.client` preserved;
- packed manifest/files include required Host/Client/declaration/README/patch surfaces.

Disposable offline external-bundle install proof passes.

True cold restart uses two separate OS processes and the same disposable persisted profile.

The probe waits for:

- `riskAdvisorAssessments`;
- launcher `appReady`;

and only after AppReady emits the exact bounded marker:

`PROFILE_READY_WITH_RISK_ADVISOR_SERVICE`

then requests clean public:

`appExit(0)`

Accepted result:

```text
natural exit A/B          true / true
activation marker A/B     1 / 1
Risk Advisor bundles A/B  1 / 1
probe bundles A/B         1 / 1
same persisted profile    true
network/provider/registry 0 / 0 / 0
Git remote runtime calls  0
Harness tracked mutation  0
Harness SHA               ddefc45fbc7f8e46dd73185e68295696d1297887
```

Successful cold-start paths do not rely on parent SIGTERM/SIGKILL.

---

## 14. T05 product-path follow-up accepted

The Phase-10 benchmark fulfills the earlier T05 follow-up obligation.

Measured lanes use actual local product paths:

- Fast scheduler + executeFastJudge + A2 merge;
- actual Evidence collection + overlay + A3 merge;
- Deep scheduler + structural local reviewer + A4 merge;
- Browser presentation/query;
- composed A1 -> A2 -> Evidence/A3 -> evidence-enriched Deep/A4 -> terminal Browser.

The composed Deep payload uses Evidence-enriched context.

A4 supersedes A3.

Terminal Browser state is `stage=complete / status=ready`.

External provider latency remains explicitly:

`NOT_VALIDATED_EXTERNAL_PROVIDER / NOT_RUN`

No runtime timeout/concurrency values were tuned merely to fit local benchmark speed.

---

## 15. AdvisoryLatencyPolicy accepted

Phase-10-owned `AdvisoryLatencyPolicy.md` is accepted as the current V1 local evidence policy.

It distinguishes:

- REAL_PINNED_RUNTIME;
- REAL_PRODUCT_LOCAL;
- STRUCTURAL_LOCAL_REVIEWER;
- NOT_VALIDATED_EXTERNAL_PROVIDER.

The policy does not reinterpret local deterministic reviewer timing as real external provider latency.

Historical T05 evidence remains historical and unmodified.

---

## 16. Resource / lifecycle boundedness accepted

The Phase-10 proof matrix maps all frozen retained-state families to executable at/over-cap or disposal proofs, including:

- ActiveExecutionIndex;
- OperationFoundation;
- Ledger/PTC;
- FailureChain;
- ReviewerSeed;
- ExpectedEffect;
- Verification;
- Evidence raw seed;
- Evidence sanitized store;
- Assessment records;
- Deep Judge parent bindings;
- Fast/Evidence/Deep queues.

Lifecycle mapping additionally covers:

- A2 native-close;
- A3 native-close;
- A4 native-close;
- Session disposal;
- actual RA fiber disposal;
- Host HMR;
- Client HMR;
- held-work HMR;
- capability replacement;
- abort-ignoring work;
- duplicate approval observation.

No unbounded product retention was introduced in Phase 10.

---

## 17. External side-effect boundary accepted

Final Phase-10 evidence records:

```text
external provider/model calls       = 0
external network calls              = 0
registry calls                      = 0
Git remote runtime calls            = 0
Harness Core tracked mutations      = 0
custom Risk Advisor Session events  = 0
Risk Advisor approval calls         = 0
Risk Advisor approval answerers     = 0
```

Harness Core remains pinned/read-only.

---

## 18. Final Phase-10 acceptance

All blockers identified during:

- initial Phase-10 final review;
- R1 review;
- R2 review;
- R3 review;
- R4 review

are closed.

Accepted executable baseline:

`1fa84e2a8a9de465cdb85fef928ec9e19086bba2`

Phase-10 status:

`PHASE10_ACCEPTED`

This acceptance closes the frozen Phase-10 hardening task.

No later product phase is started by this acceptance.
