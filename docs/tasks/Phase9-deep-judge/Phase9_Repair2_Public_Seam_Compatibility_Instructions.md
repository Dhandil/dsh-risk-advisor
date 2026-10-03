# Phase 9 Repair 2 — Pinned Harness Public-Seam Compatibility

## Outcome

Independent review of:

- Repair/Tested SHA: `25cb8b60f0164b350cf289b22a46dade9d75bc87`
- Report SHA: `226871290ce64557afa3e3fba26a3485acc9d71a`

concludes:

`PHASE9_REPAIR_REQUIRED`

The previous Phase-9 final-review repair correctly closed the A3→A4 evidence continuity, materiality, stop-reason, timeout ownership, generation-drain, and coordinator-benchmark issues.

Two pinned-Harness public-seam incompatibilities remain.

Do not redesign Phase 9.

Do not change dependency recovery.

Do not install `@deepseek-ai/dsh-subagent`.

Do not start Phase 10.

---

## R2-1 — Output schema must use the pinned Harness supported JSON Schema subset

Pinned Harness `ddefc45fbc7f8e46dd73185e68295696d1297887` defines the enforced raw JSON Schema subset in:

`packages/core/tools/src/json-schema.ts`

Supported constraint keywords are:

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

Annotations such as description/title/default/examples are also supported.

Unsupported keywords fail loudly through `assertObjectJsonSchema()`.

Current `DEEP_JUDGE_OUTPUT_SCHEMA` still contains unsupported constraints:

```text
minItems
maxItems
maxLength
```

Therefore a real `ctx.subagents.start('spawn', { outputSchema })` will reject before the child starts.

### Repair

Remove every unsupported keyword from the provider-facing schema.

The provider-facing schema should enforce only the structural subset the pinned Harness can actually enforce:

- object roots;
- declared properties;
- required keys;
- `additionalProperties:false`;
- array `items`;
- enums/const where useful.

Keep all Phase-9 semantic and size bounds in the existing Host validator:

- results count 1..4;
- referencedFeatureIds <= 32;
- proposedFacts <= 8;
- alternatives <= 3;
- rationale <= 1200;
- fact <= 500;
- title <= 160;
- description <= 800.

Those Host bounds remain mandatory and fail closed after structured capture.

Do not weaken `parseDeepJudgeCandidate()`.

### Required executable proof

Use the already-existing public `@deepseek-ai/dsh-tools` dependency surface.

Add a test that calls the real public pinned-compatible schema assertion, preferably:

`assertObjectJsonSchema(DEEP_JUDGE_OUTPUT_SCHEMA)`

and proves it does not throw.

If `validateJsonSchemaValue` is available through the already-resolvable public package, also use it for a valid structural candidate and representative structural failures.

Do not use a custom local `conforms()` function as the acceptance proof for Harness schema compatibility.

No new package dependency or install is allowed.

Also add a static walk asserting the emitted schema contains none of:

```text
minItems
maxItems
minLength
maxLength
pattern
format
minimum
maximum
```

---

## R2-2 — Structural start request must match the pinned public prompt wire shape

Pinned Harness public `SubagentStartRequest` defines:

```ts
readonly prompt: ContentBlock[]
```

Current structural adapter defines:

```ts
readonly prompt: string
```

and `executeDeepJudge()` sends the serialized payload string directly.

Pinned `SubagentRuntime.start()` does not normalize a string prompt. It validates capabilities/schema and passes the request through to the provider.

Therefore the current structural fake accepts a request shape that the real public seam does not define.

### Repair

Use the existing public `ContentBlock` type from `@deepseek-ai/dsh-llm` in the Host-private structural adapter.

The structural request must require:

```ts
readonly prompt: ContentBlock[]
```

Build the request as one bounded user-content block:

```ts
prompt: [
  { type: 'text', text: serializedPayload }
]
```

No additional dynamic content.

The serialized payload cap remains 32,768 characters before wrapping.

Do not put the persona into the prompt; persona remains the separate static `persona` field.

Do not include project/workspace/system text.

### Required executable proof

Update structural-runtime request tests and benchmark to assert:

```text
prompt is an array
prompt.length == 1
prompt[0].type == "text"
prompt[0].text == exact serialized bounded payload
```

Reject the old string-prompt fixture.

Add a focused structural contract test comparing every consumed request field against the pinned public contract shape:

- parent;
- label;
- prompt ContentBlock[];
- signal;
- agentOptions;
- outputSchema;
- maxDepth;
- toolFilter;
- persona.

No `@deepseek-ai/dsh-subagent` import is required.

---

## R2-3 — Keep the already-fixed Repair-1 behavior frozen

Do not regress:

- shared Phase-8 materiality predicate;
- `stopReason === 'completed'` requirement;
- no free-form output fallback;
- evidence-overlay payload features;
- A4 preservation of A3 context/findings/evidence/uncertainties;
- Host-only semantic fill;
- late-start ownership to quiescence;
- disposal failure fail-closed;
- subagents generation drain-before-replace;
- Bridge V4;
- default-off + trusted-parent-composition;
- `toolFilter: { allow: [] }`;
- maxDepth 1;
- structural optional capability;
- zero new subagent dependency.

Add regression assertions for these where touched.

---

## R2-4 — Benchmark must expose the exact real-seam-compatible request

Update the Phase-9 local benchmark so its captured request proves:

```text
provider: spawn
prompt: one text ContentBlock
outputSchema: accepted by public dsh-tools schema validator
maxDepth: 1
toolFilter.allow: []
persona: static
```

Keep the existing coordinator product-path benchmark:

```text
Evidence -> deep -> structural runtime -> completed structured result
-> dispose -> A4 -> complete
```

Real Harness spawn may remain:

`NOT_RUN`

because the concrete package remains unavailable without install.

The report must not claim that structural fake execution is a real spawn run.

---

## Revalidation

Run the existing frozen Phase-9 order.

At minimum before Full:

1. repaired P9 focused;
2. real public `dsh-tools` schema assertion PASS;
3. structural request wire-shape proof PASS;
4. P9 benchmark smoke/full PASS;
5. P8 focused + benchmark;
6. P7 focused + benchmark;
7. P6/P5/P4/P3/P2/P1/R1-R5;
8. typecheck/build/exports/declarations;
9. pack dry-run;
10. diff/privacy/scope gates;
11. no external provider/network/registry/Git-remote calls;
12. Harness mutation = 0;
13. no custom Risk Advisor Session event.

Then:

1. commit exact executable/source/test/benchmark repair;
2. record new Tested SHA;
3. run exactly one fresh complete `pnpm test` on that exact SHA.

After passing Full, only:

`docs/tasks/Phase9-deep-judge/Execution_Report.md`

may change.

Final handoff:

`PHASE9_REPAIR2_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE9_ACCEPTED`.

Do not create `Acceptance_Report.md`.

Do not start Phase 10.
