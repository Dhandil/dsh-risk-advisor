# Phase 9 Acceptance Report — Deep Judge

## Outcome

`PHASE9_ACCEPTED`

Phase 9 is independently accepted after review of the published Repair 2 implementation.

Accepted executable/Tested SHA:

`45115742be6ad93e58eb8f9967f5b176ff67cc9c`

Reviewed final report SHA:

`2c65df94696ece9ce4250c5018bed04c0662f14d`

Pinned Harness reference:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

This acceptance is limited to the frozen Phase-9 V1 architecture and the dependency-recovery amendment.

Real Harness spawn execution remains intentionally NOT_RUN because the concrete subagent package is unavailable locally without installation. Phase 9 is accepted on the frozen structural public-seam proof, not on a claim of real provider execution.

---

## 1. Commit and publication governance

Independent comparison verified:

### Repair 2 authority -> Tested SHA

`fa7676d83942b0743a1fee3a5fc2e8e8b8edfb52 -> 45115742be6ad93e58eb8f9967f5b176ff67cc9c`

contains exactly one executable repair commit.

Changed executable/test/benchmark files are confined to Phase-9 public-seam compatibility and proof:

- `benchmarks/r5-phase9.mjs`
- `src/host/deep-judge-subagent.ts`
- `src/host/deep-judge.ts`
- Phase-9 focused/coordinator/runtime tests
- Phase-9 benchmark smoke/full tests

No unrelated executable scope was introduced.

### Tested SHA -> final report SHA

`45115742be6ad93e58eb8f9967f5b176ff67cc9c -> 2c65df94696ece9ce4250c5018bed04c0662f14d`

contains exactly one changed file:

`docs/tasks/Phase9-deep-judge/Execution_Report.md`

Therefore the fresh Full evidence remains attached to the exact executable SHA.

### Final report SHA -> main

Independent comparison verified:

`2c65df94696ece9ce4250c5018bed04c0662f14d == main`

before this acceptance publication.

---

## 2. Dependency recovery accepted

The original `PHASE9_DEPENDENCY_UNAVAILABLE` stop was correctly handled without weakening the runtime boundary.

Accepted recovery:

```text
optional Cordis capability
+ Host-private structural adapter
+ exact spawn capability preflight
+ no concrete dsh-subagent package dependency
```

Independent review confirms:

- no `@deepseek-ai/dsh-subagent` package dependency;
- no direct Harness `packages/subagent/**` source import;
- no local `file:` dependency;
- no symlink/junction workaround;
- no Harness Core mutation;
- `subagents` remains optional rather than a hard plugin startup dependency;
- missing/malformed capability fails closed.

This recovery remains compatible with the frozen Phase-9 architecture.

---

## 3. Pinned public subagent request seam accepted

Independent comparison against pinned Harness public `SubagentStartRequest` confirmed the repaired structural request now matches the consumed wire shape.

Accepted request properties:

- exact provider name `spawn`;
- exact live parent object;
- label;
- `prompt: ContentBlock[]`;
- AbortSignal;
- agentOptions;
- object-rooted outputSchema;
- `maxDepth: 1`;
- `toolFilter: { allow: [] }`;
- static persona.

The prompt repair is correct:

```text
[
  { type: "text", text: serializedPayload }
]
```

The structural adapter no longer accepts the earlier incompatible `prompt: string` representation.

No persona/project/system material is concatenated into the prompt payload.

---

## 4. Pinned JSON Schema seam accepted

Independent comparison against pinned Harness:

`packages/core/tools/src/json-schema.ts`

confirmed the enforced constraint vocabulary is limited to:

```text
type
oneOf
properties
required
additionalProperties
items
enum
const
```

The repaired `DEEP_JUDGE_OUTPUT_SCHEMA` no longer uses unsupported provider-facing bounds such as:

- minItems;
- maxItems;
- minLength;
- maxLength;
- pattern;
- format;
- minimum;
- maximum.

The provider-facing schema now expresses structural shape only.

All semantic count/string bounds remain enforced by Host-side `parseDeepJudgeCandidate()`.

This separation is correct:

```text
Harness schema -> structural capture contract
Risk Advisor Host validator -> semantic/bounded candidate contract
```

Focused tests call the actual already-resolvable public:

- `assertObjectJsonSchema()`;
- `validateJsonSchemaValue()`.

The prior local simulated schema validator is no longer the acceptance authority.

---

## 5. Deep Judge authority boundary accepted

Deep Judge remains disabled by default.

Explicit enablement still requires the frozen:

`trusted-parent-composition`

assertion.

Reviewer runtime remains tool-less:

`toolFilter: { allow: [] }`

and bounded to:

`maxDepth: 1`

No custom Evidence Tools or generic read/write/edit/bash/pwsh/web/subagent authority was introduced.

Phase 8 remains the read-only investigation layer.

Phase 9 consumes sanitized Phase-8 evidence.

Native Approval remains the only approval authority.

---

## 6. Trigger and materiality accepted

Phase 9 reuses the accepted Phase-8 materiality predicate.

Collection status alone does not qualify Evidence as material.

A COMPLETE/PARTIAL snapshot whose relevant facts all remain unknown does not trigger Deep Judge.

Deep Judge runs only after Phase-8 terminal handling and only when an eligible semantic dimension remains UNKNOWN.

Accepted eligible dimensions remain:

- RISK;
- AUTHORIZATION;
- NECESSITY;
- PRIVILEGE.

Already concrete dimensions are not reopened.

---

## 7. A3 -> A4 evidence continuity accepted

The repaired coordinator constructs the Phase-8 evidence overlay before Deep Judge payload creation and A4 merge.

Independent review confirms:

- Deep Judge payload feature values use the evidence-enriched context;
- A4 starts from the latest A3 assessment;
- Phase-8 context identity is preserved;
- evidence findings are preserved;
- evidence summary is preserved;
- resolved canonical-target uncertainty is not reintroduced;
- non-semantic Phase-8 uncertainty is preserved;
- only semantic uncertainty actually filled by Deep Judge is removed;
- Judge count is updated as derived metadata rather than rebuilding evidence from the old context.

This closes the prior Phase-5-context regression.

---

## 8. A4 authority rules accepted

A4 is Host-merged, not model-authored as a final assessment.

Deep Judge can fill only requested semantic UNKNOWN dimensions.

It cannot replace an existing concrete:

- risk;
- authorization;
- necessity;
- privilege verdict.

It cannot change:

- Phase-8 authoritative facts;
- reversible;
- checkpoint availability;
- EvidenceQuality.

Hard/evidence risk floors remain preserved.

Alternatives remain:

`MODEL_SUGGESTED / UNVERIFIED`

Proposed facts remain hypotheses.

Aggregate recommendation is recomputed locally.

---

## 9. Result contract accepted

Only:

`stopReason === 'completed'`

may produce a candidate.

Non-completed structured output fails closed.

No free-form assistant output fallback is used.

Missing/invalid structured output produces no A4.

Host strict validation additionally enforces:

- exact requested dimensions;
- exact keys;
- known feature references;
- result count bounds;
- rationale bounds;
- proposed-fact bounds;
- HYPOTHESIS-only proposed facts;
- alternative bounds;
- secret redaction.

---

## 10. Quiescent lifecycle accepted

The repaired Deep Judge runner retains ownership through timeout/cancellation.

If `runtime.start()` ignores cancellation and returns late:

- logical timeout is retained;
- the late run is disposed;
- scheduler active ownership is retained until cleanup reaches quiescence;
- queued work does not advance early;
- late work cannot publish A4.

Run disposal failure fails closed.

The previously detached late-start cleanup path is removed.

---

## 11. Capability generation handoff accepted

Subagents replacement is serialized.

The old generation is:

1. fenced;
2. detached from new starts;
3. aborted/disposed;
4. awaited to quiescence.

Only after that is the new runtime/scheduler installed.

Replacement-under-load proof verifies no temporary overlap of old/new Deep Judge generation authority.

---

## 12. Browser V4 accepted

Bridge V4 remains:

```text
rules | fast | evidence | deep | complete
```

V1/V2/V3 semantics remain preserved.

Client polling continues through `deep` and stops at `complete`.

No child prompt, transcript, run id, session id, raw evidence, or provider diagnostic is exposed to Browser presentation.

Risk Advisor remains advisory-only.

---

## 13. Benchmark acceptance

The repaired Phase-9 benchmark now exercises product coordinator flow:

```text
Phase-8 Evidence
-> Deep trigger
-> structural runtime
-> completed structured result
-> run disposal
-> A4 merge
-> complete presentation state
```

It additionally covers:

- public schema validation;
- ContentBlock prompt shape;
- non-completed rejection;
- timeout ownership;
- queue fencing;
- saturation;
- generation replacement;
- request isolation.

The benchmark uses a deterministic structural runtime and local data only.

It is correctly labeled as local structural/public-seam validation rather than real Harness spawn execution.

---

## 14. Regression / Full evidence

Execution Report records all required gates PASS, including:

- P9 focused: 6 files / 20 tests;
- P9 benchmark smoke/full;
- P8 focused + benchmark;
- P7 focused + benchmark;
- P6/P5/P4/P3/P2;
- P1A/P1B/P1C;
- R1-R5;
- typecheck;
- build;
- Host/client exports;
- declaration/private-export audit;
- pack dry-run;
- diff/privacy/scope gates.

Exactly one fresh complete:

`pnpm test`

was run on:

`45115742be6ad93e58eb8f9967f5b176ff67cc9c`

with:

```text
46 files
267 tests
PASS
```

No executable semantic drift followed that Full.

---

## 15. External-side-effect boundary

Accepted Phase-9 evidence records:

```text
external provider/model calls = 0
external network calls = 0
registry calls = 0
Git remote runtime calls = 0
Harness Core tracked mutations = 0
custom Risk Advisor Session events = 0
```

Real Harness spawn remains NOT_RUN.

That is an accepted limitation of the Dependency Recovery Amendment, not evidence of a real-provider run.

---

## 16. Final acceptance

All Phase-9 acceptance blockers identified in the initial review, Repair 1 review, and Repair 2 review are closed.

Accepted executable baseline:

`45115742be6ad93e58eb8f9967f5b176ff67cc9c`

Phase 9 status:

`PHASE9_ACCEPTED`

Phase 10 is not started by this acceptance.
