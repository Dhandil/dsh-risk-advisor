# Phase 10 Final Review Repair 2 Instructions

## Outcome

Independent review of:

- R1 Tested SHA: `d17f844d0c4c377af450d07cce2ec072c1b1efe9`
- R1 final/report SHA: `cb9d7b39748020528ce7a0107d2a8674f1ce52e8`

concludes:

`PHASE10_R2_REQUIRED`

R1 closed the shell corpus, TOCTOU rendering, most privacy surfaces, package identity checks, and much of the benchmark gap.

The remaining blockers are **proof fidelity**, not a new architecture.

Do not redesign Phase 10.

Do not change Harness Core.

Do not use external provider/network/registry/Git-remote calls.

Product-code changes are allowed only if the repaired executable proofs expose a real defect.

---

## R2-1 — Cold restart must prove full app readiness and clean public-lifecycle exit

The current cold-start probe writes its activation marker immediately from `apply()` when `riskAdvisorAssessments` is available.

The outer orchestrator then observes the marker and sends SIGTERM.

That proves the Risk Advisor service mounted during boot, but it does **not** prove:

- the whole profile boot reached launcher `AppReady`;
- later rows could not still fail;
- the probe exited through the requested public app lifecycle.

Repair the disposable probe.

The probe must consume the public launcher lifecycle services:

- `riskAdvisorAssessments`
- `appReady`
- `appExit`

Equivalent behavior:

```text
apply
-> verify riskAdvisorAssessments exists
-> register appReady.onReady(...)
-> only after AppReady commits:
     append exact marker once
     request appExit(0)
```

Do not have the parent process kill a healthy child merely because the service marker appeared.

The parent may retain a hard timeout and kill only on timeout/failure cleanup.

For process A and B independently require:

- natural/public-lifecycle exit code 0;
- exact ready marker count = 1;
- no SIGTERM/SIGKILL used on successful path;
- Risk Advisor bundle count = 1;
- probe bundle count = 1;
- same persisted profile;
- local Harness HEAD exactly pinned;
- Harness tracked mutation = 0;
- network-guard violations = 0.

The marker must mean:

`PROFILE_READY_WITH_RISK_ADVISOR_SERVICE`

not merely “service appeared during startup”.

---

## R2-2 — Coexistence fault/timeout/duplicate tests must exercise Risk Advisor itself

Current R1 coexistence “fault/timeout” proof uses an unrelated rejected promise and does not inject a failing/timing-out Risk Advisor side path.

Current “duplicate observation” proof does not actually deliver a duplicate approval observation.

Repair using the real pinned ApprovalService and the separate fixture answerer.

Add direct scenarios:

### RA Fast/Judge side-path timeout

Mount Risk Advisor with an enabled deterministic local Judge seam whose stream intentionally holds past a short configured timeout.

While that RA side path is active/timing out:

- resolve the native fixture answer to `allowed-once`;
- native result must complete normally;
- answerer call count = 1;
- RA timeout must not delay/change the native outcome;
- late Judge release must not create a second approval or mutate the native result.

Use only local deterministic adapters.

### RA side-path failure

Inject a real Risk Advisor-owned optional side-path failure through an accepted injectable seam (for example a deterministic local reviewer that throws/fails closed).

Prove native outcome parity and one answerer call.

Do not use an unrelated Promise as the failure.

### Duplicate approval observation

Deliver the same approval identity twice to the Risk Advisor observation path while the real native ApprovalService request exists.

Prove:

- Risk Advisor records/fences the duplicate as designed;
- native fixture answerer is still called exactly once;
- native approval event/outcome remains single.

Keep the existing absent/present, dispose-before-answer, answerer-removal, and remount proofs.

---

## R2-3 — Add real Native-close fencing for A3 and A4

The R1 proof matrix currently maps:

- Evidence/A3 native-close fencing -> a P8 capability-disposal test;
- A4 native-close fencing -> a P9 scheduler-disposal test.

Those are not native-close proofs.

Add direct coordinator integration tests.

### Native close while Evidence/A3 is in flight

Use an abort-ignoring or held local Evidence collector.

Sequence:

```text
A1 published
Evidence starts
native approval/decided arrives
Evidence completes/releases late
```

Prove:

- approval becomes terminal/closed;
- no A3 is published after close;
- no latest assessment supersedes the pre-close assessment;
- underlying Evidence work still drains/quiesces;
- no unhandled rejection.

### Native close while Deep/A4 is in flight

Use held/abort-ignoring structural local Deep runtime.

Sequence:

```text
A3 exists / Deep starts
native approval/decided arrives
Deep result releases late
```

Prove:

- no A4 publishes;
- no latest assessment supersedes after close;
- Deep run is disposed/drained;
- no second approval answer/outcome.

Update the proof matrix to point to these exact tests, not generic `dispose` markers.

---

## R2-4 — Privacy canary must traverse the actual Evidence collector

The current canary test manually constructs a clean `EvidenceSnapshotV1`.

That proves downstream DTO cleanliness but does not prove a canary entering the Evidence target/source seam cannot escape the collector.

Add one local Evidence-collector proof using the **same runtime canary token**.

Use a bounded disposable workspace and a supported evidence-eligible operation whose raw target/path or bounded config input contains the synthetic canary.

Run through the actual:

- Evidence target seed;
- collector;
- sanitized EvidenceSnapshot;
- evidence projection/A3;
- Deep payload;
- Browser V4 projection.

Assert the exact canary never appears after the raw seed boundary.

Also prove raw seed cleanup/consumption for that execution.

No real secret.

---

## R2-5 — Deep hostile-authority proof must be direct

R1 directly proves hostile Fast Judge merge cannot lower deterministic HIGH risk, but does not directly exercise the equivalent hostile Deep/A4 merge.

Add a direct Deep candidate / A4 merge case:

- A3 carries deterministic or authoritative HIGH risk;
- hostile Deep candidate proposes LOW risk and/or fake authority;
- Deep may be requested only for a legitimate UNKNOWN dimension;
- unrequested/concrete risk replacement is rejected or ignored according to the frozen contract;
- A4 risk remains HIGH;
- evidence findings/floors remain present;
- hypotheses remain hypotheses;
- alternatives remain MODEL_SUGGESTED / UNVERIFIED.

Do not broaden Deep Judge authority.

---

## R2-6 — Benchmark lane labels must match measured work

Current R1 benchmark still overstates the three stage lanes:

### Current Fast lane

It measures:

`JudgeScheduler + executeFastJudge`

but does not include the reported A2 merge.

### Current Evidence lane

It measures:

`actual Evidence collect`

but does not include the reported A3 merge.

### Current Deep lane

It measures:

`DeepJudgeScheduler + executeDeepJudge`

but does not include the reported A4 merge.

Repair each timed lane so the named merge is inside the measured operation.

Required:

```text
Fast lane:
  scheduler -> executeFastJudge -> mergeJudgeAssessment(A2)

Evidence lane:
  collector/scheduler -> overlayEvidenceContext -> mergeEvidenceAssessment(A3)

Deep lane:
  scheduler -> executeDeepJudge -> mergeDeepJudgeAssessment(A4)
```

Every iteration must assert the expected resulting assessment generation.

---

## R2-7 — Composed benchmark must use evidence-enriched Deep context and terminal Browser state

Current composed lane does perform A1/A2/A3/A4 component calls, but its Deep payload is built from the original Phase-5 context instead of the evidence-enriched context accepted in Phase 9.

Repair the composed path to mirror the accepted product semantics:

```text
A1
-> Fast result / A2
-> actual Evidence
-> deepContext = evidence overlay
-> A3
-> Deep payload built from deepContext
-> Deep result / A4
-> terminal complete Browser projection/query
```

The Browser view for this lane must be terminal:

`stage = complete`

not a synthetic pending `deep` view after A4 already exists.

Prefer the real coordinator path if practical.

If component composition is retained for timing isolation, add explicit assertions that:

- Deep payload contains evidence-enriched features;
- A4 supersedes A3;
- Browser projection carries A4 assessment id;
- terminal stage is complete.

Do not label a path `A1 -> A4 -> Browser` unless all those conditions hold.

---

## R2-8 — Policy/report must use repaired measurements only

Regenerate:

- `docs/tasks/Phase10-hardening/evidence/r5-phase10-measurements.json`
- `docs/tasks/Phase10-hardening/AdvisoryLatencyPolicy.md`

from the corrected benchmark.

The policy may keep runtime bounds unchanged.

Update the final Execution Report so every PASS claim maps to an actual executable proof.

Do not retain the old R1 numeric values if the repaired measured operation changed.

---

## Validation

Run affected focused suites first:

1. P10 coexistence
2. P10 lifecycle/native-close
3. P10 privacy
4. P10 benchmark smoke/full
5. P10 cold-start
6. P5/P8/P9 lifecycle/coordinator regressions
7. all other Phase-10 frozen inherited gates
8. typecheck/build/export/declaration/pack/diff/privacy/boundary gates

Then:

1. commit exact executable R2 candidate;
2. rerun benchmark smoke/full and cold-start on that exact SHA;
3. verify pinned Harness SHA/tracked-clean proof;
4. run exactly one fresh complete `pnpm test` on that exact SHA.

If anything fails after the candidate commit:

repair -> new SHA -> affected gates -> new fresh Full.

After passing Full, only:

`docs/tasks/Phase10-hardening/Execution_Report.md`

may change.

Tested -> final must be report-only.

---

## Final handoff

Return:

`PHASE10_R2_PUBLISHED_READY_FOR_REVIEW`

with:

- Tested SHA
- final remote/report SHA
- fresh Full count
- P10 focused count
- native-close A3/A4 proof PASS
- coexistence real RA fault/timeout/duplicate PASS
- actual Evidence canary PASS
- Deep hostile authority PASS
- corrected benchmark smoke/full PASS
- AppReady/public-exit cold-start A/B PASS
- activation marker A/B = 1/1
- verified Harness SHA
- provider/network/registry/Git-remote = 0
- Harness mutation = 0

Do not create Acceptance Report.

Do not start a later phase.
