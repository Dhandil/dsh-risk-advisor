# Phase 9 Final Review Repair Instructions

## Outcome

Independent review of:

- Tested SHA: `9948e416b52544c59c24a35c441874d52df4b906`
- Report SHA: `16178452695bbe25ece220b3c10a25d9cd5ab8c7`

concludes:

`PHASE9_REPAIR_REQUIRED`

The Phase-9 architecture and dependency-recovery amendment remain frozen.

Do not redesign the dependency solution.

Do not install `@deepseek-ai/dsh-subagent`.

Do not start Phase 10.

---

## R1 — Structured output schema currently contradicts the real candidate

Current `DEEP_JUDGE_OUTPUT_SCHEMA` declares result/alternative items as:

```text
type: object
additionalProperties: false
```

without declaring their properties.

Under the pinned Harness JSON-schema contract, that shape does not describe the actual candidate objects containing `dimension`, `verdict`, `rationale`, etc.

The structural fake does not validate the supplied output schema, so current focused tests miss this.

Repair the frozen schema to describe the complete V1 candidate shape:

- root:
  - schemaVersion
  - results
  - optional suggestedAlternatives
- result item:
  - dimension
  - verdict
  - rationale
  - referencedFeatureIds
  - optional proposedFacts
- proposed fact:
  - statement
  - status = HYPOTHESIS
- alternative:
  - title
  - description

Use only the pinned supported JSON-schema vocabulary.

Every object level must have explicit `properties`, `required`, and `additionalProperties:false` as appropriate.

Keep Host-side strict candidate validation; provider validation is not a substitute.

Add executable proof that a valid frozen candidate conforms to the emitted schema and representative malformed/extra-field candidates do not.

---

## R2 — Only a completed child result may produce A4

Current runtime accepts any string `stopReason` when `structured` exists.

Pinned Harness explicitly treats only:

`stopReason === 'completed'`

as a successful child completion.

A non-completed result may contain partial output and must not become a successful Deep Judge candidate.

Repair:

- require `stopReason === 'completed'` before accepting `structured`;
- `error`, `aborted`, `cancelled`, `disposed`, `max-tokens`, or any unknown reason -> no A4;
- do not parse partial/free-form output as fallback.

Use a closed failure such as `DEEP_JUDGE_RESULT_FAILED` for a non-completed returned run, and `DEEP_JUDGE_START_FAILED` for start rejection if useful. Add them consistently to Host/Browser closed vocabularies if introduced.

Focused proof must include a structured payload paired with a non-completed stop reason and prove it cannot produce success/A4.

Update all mocks/benchmark successful runs to use the real pinned success value:

`completed`

not `stop`.

---

## R3 — Deep Judge trigger must reuse Phase-8 materiality exactly

Current Phase-9 local `materialEvidence()` treats every COMPLETE/PARTIAL snapshot as material.

That is not the accepted Phase-8 materiality rule.

Repair by creating/reusing one shared internal helper for material Evidence and use it in both:

- Phase-8 A3 materiality decision;
- Phase-9 Deep Judge trigger.

Materiality remains based on actual resolved Phase-8 facts, not collection status alone.

A PARTIAL/COMPLETE snapshot whose relevant facts all remain unknown must not start Deep Judge.

Add direct proof.

Also remove the extra `hasConcretePrivilegeEvidence()` suppression as a substitute for assessment truth. Phase 9 already requires latest Privilege verdict == UNKNOWN; if Phase 8 resolved it, it is concrete and therefore automatically ineligible. Do not suppress a still-UNKNOWN privilege dimension merely because two structural evidence fields are non-unknown.

---

## R4 — Deep Judge must consume and preserve the Phase-8 evidence context

Current Phase-9 payload and A4 merge use `phase5.context.snapshot`, the original Phase-5 context.

That creates two defects:

1. reviewer `features` can contain pre-Evidence values that disagree with A3/Phase-8 facts;
2. `mergeDeepJudgeAssessment()` recomputes `uncertainties` and `evidence` from the old context, which can reintroduce already-resolved uncertainty such as `CANONICAL_TARGETS_UNAVAILABLE` and discard the A3 evidence summary.

Repair the coordinator so Phase 9 constructs the authoritative evidence overlay once:

```text
deepContext = overlayEvidenceContext(phase5.context.snapshot, phase5.evidence)
```

Use the evidence-enriched context for:

- requested Deep Judge feature/floor reasoning;
- payload known feature values;
- known feature ids;
- any Host risk floor check;
- A4 status calculation.

A4 merge must preserve A3 evidence state.

Preferred rule:

- start from the latest A3 assessment;
- preserve `contextId`, findings, Evidence provenance and Phase-8 evidence summary;
- preserve existing non-semantic Phase-8 uncertainties;
- remove only semantic unresolved uncertainty whose dimension Deep Judge actually filled;
- append Deep Judge hypotheses/metadata;
- never regenerate the whole uncertainty/evidence set from the original Phase-5 context.

If evidence counts need a Judge-count refresh, update only that derived count; do not rebuild authoritative/deterministic feature identity from the old context.

Mandatory proof:

- A3 canonical target uncertainty already resolved -> A4 does not reintroduce it;
- A3 authoritative feature/evidence summary preserved exactly except permitted Judge-derived metadata;
- A3 evidence findings preserved;
- outside-workspace/hard risk floor remains preserved;
- payload feature values agree with Phase-8 overlay.

---

## R5 — Timeout/start/dispose ownership must be truly quiescent

Current `executeDeepJudge()` has a Phase-7/8-class ownership bug.

If `runtime.start()` times out before returning a run, it does:

```text
return DEEP_JUDGE_TIMEOUT
void startPromise.then(late => late.dispose())
```

The scheduler active slot is then released while underlying start/run ownership is still alive.

This violates the frozen contract.

Repair the Deep Judge scheduler/runner so:

- logical timeout/cancel may become visible once;
- the underlying start promise remains owned;
- if a late run appears, it is immediately cancelled/disposed;
- active concurrency ownership is retained until late start + run disposal reach quiescence;
- the queue does not advance early;
- no detached `void ...then(...)` owns cleanup.

Also:

- successful A4 publication is allowed only after returned run disposal reaches quiescence;
- a rejecting/failing `run.dispose()` must fail closed and must not publish A4 as success;
- abort-ignoring start/result fakes must be covered.

Direct proof:

1. start ignores AbortSignal and returns after timeout;
2. timeout is logically observed;
3. scheduler active slot remains occupied until late run is disposed;
4. queued job does not start early;
5. late run cannot publish A4;
6. dispose failure cannot produce A4.

---

## R6 — Subagents generation replacement must drain before new generation work

Current `attachSubagents()` calls:

`void prior.dispose()`

and immediately creates/uses a new scheduler.

That is not a quiescent generation handoff.

Repair with an explicit async generation attachment, equivalent in discipline to accepted Phase-8 capability handoff:

- increment/fence old generation;
- abort old scheduler;
- await complete old scheduler quiescence;
- only then attach the new runtime/scheduler;
- only then permit new generation Deep Judge work.

The Cordis injection callback may be async if needed.

Mandatory replacement-under-load proof:

- old runtime start/result ignores abort;
- replacement begins;
- old result is fenced;
- no new-generation child starts before old scheduler drains;
- old child is disposed;
- new generation starts only after drain;
- total configured Deep Judge concurrency is not temporarily doubled.

---

## R7 — Benchmark and focused proof must traverse the repaired product path

Current benchmark separately exercises `executeDeepJudge`, scheduler, and Bridge parsing, but does not prove the full:

```text
Phase-8 Evidence
-> trigger
-> deep stage
-> structural runtime
-> structured completed result
-> disposal
-> A4 merge
-> complete
```

path.

Repair the Phase-9 benchmark so at least one local deterministic scenario traverses the real coordinator product path and asserts:

- material Evidence required;
- deep request exact isolation fields;
- valid completed structured result;
- A4 supersedes A3;
- Phase-8 evidence/uncertainty preservation;
- disposal count;
- deep -> complete Browser lifecycle.

Also benchmark/prove:

- non-completed structured result -> no A4;
- start-timeout late settlement ownership;
- queue does not advance before quiescence;
- generation replacement under load;
- output schema accepts the valid frozen candidate shape.

Structural adapter remains the required local seam.

Real Harness spawn remains `NOT_RUN` if still unavailable without installation.

Do not claim structural fake execution is real spawn/provider validation.

---

## Revalidation

Keep the dependency recovery unchanged.

No package install, `file:`, symlink, direct Harness subagent source import, or Harness mutation.

Run the frozen Phase-9 validation order.

Before Full:

- repaired/expanded `test:p9`;
- P8 focused + benchmark;
- P7 focused + benchmark;
- P6/P5/P4/P3/P2/P1/R1-R5;
- typecheck/build/exports/declarations/pack;
- diff/privacy/scope;
- no external provider/network/registry/Git remote;
- no custom Risk Advisor Session event;
- Harness mutation = 0;
- repaired Phase-9 benchmark smoke/full.

Then:

1. commit exact executable/source/test/package/benchmark repair;
2. record new Tested SHA;
3. run exactly one fresh complete `pnpm test` on that exact SHA.

If Full fails, preserve evidence, repair, create a new executable SHA, and run a new fresh Full.

After passing Full, only:

`docs/tasks/Phase9-deep-judge/Execution_Report.md`

may change.

Final handoff:

`PHASE9_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE9_ACCEPTED`.

Do not create `Acceptance_Report.md`.

Do not start Phase 10.
