# Phase 9 Implementation Instructions — Deep Judge

## 0. Required outcome

Implement the frozen Phase-9 Deep Judge and publish for independent review.

Final handoff:

`PHASE9_PUBLISHED_READY_FOR_REVIEW`

Do not declare acceptance.

Do not create `Acceptance_Report.md`.

Do not start Phase 10.

---

## 1. Read first

Before executable changes, read:

1. `docs/tasks/Phase9-deep-judge/Phase9_Preflight.md`
2. `docs/tasks/Phase9-deep-judge/Phase9_Architecture_Freeze.md`
3. `docs/tasks/Phase8-evidence-collector/Acceptance_Report.md`
4. baseline architecture/spec/test matrix
5. collaboration workflow

The Phase-9 Architecture Freeze is authoritative.

Record the exact task-start SHA.

Preserve existing user drift.

No reset/clean/destructive checkout.

Harness Core stays read-only.

---

## 2. Add public subagent contract dependency

Add:

```text
peer: @deepseek-ai/dsh-subagent >=0.1.6-alpha.2
dev:  @deepseek-ai/dsh-subagent  0.1.6-alpha.2
```

Do not add private Harness implementation paths.

Do not install from registry.

If required packages are not already resolvable locally, stop:

`PHASE9_DEPENDENCY_UNAVAILABLE`

A spawn provider package may be dev-only for local integration proof if locally resolvable.

---

## 3. Implement DeepJudgeConfig

Suggested file:

`src/host/deep-judge.ts`

Config must be default-off.

Enabled config requires:

```text
enabled=true
isolationMode=trusted-parent-composition
timeoutMs <= 10_000
maxConcurrentJudges <= 2
maxPendingJudges <= 8
maxTokens <= 1024
```

Recommended enabled defaults:

```text
timeout 10s
concurrency 1
pending 4
maxTokens 1024
```

Reviewer provider/model override must be supplied as a pair.

Invalid config must not crash Risk Advisor; Deep Judge remains unavailable with a static reason.

Do not expose a generic providerName option in V1.

Use exactly `spawn`.

---

## 4. Implement Host-private parent binding

Capture the exact `exec.agent` at `tools/pre-execute`.

Suggested file:

`src/host/deep-judge-parent.ts`

Use execution id as key.

Store:

- Session identity;
- WeakRef to exact Agent;
- timestamp.

Bounds:

```text
TTL 10m
128 / Session
256 global
```

Required cleanup:

- eviction;
- Session dispose;
- plugin dispose.

Do not serialize/expose the Agent or binding.

Do not retain raw ToolExecution.

---

## 5. Implement Deep Judge payload builder

Reuse existing ReviewerPayload/redaction machinery.

Suggested additions in:

`src/host/deep-judge.ts`

Build only from:

- existing sanitized reviewer payload;
- latest assessment safe semantic summary;
- reconstructed Phase-8 evidence-enriched feature set;
- sanitized EvidenceSnapshot;
- eligible requested dimensions.

Serialized cap:

`32_768 chars`

Do not include:

- raw canonical paths;
- raw file/config text;
- Git stdout/stderr;
- full tool results;
- Agent object;
- child/session transcript;
- chain-of-thought;
- unsanitized environment data.

Redaction failure -> no start.

---

## 6. Implement requested Deep Judge dimensions

Request only dimensions still UNKNOWN.

Allowed:

- RISK
- AUTHORIZATION
- NECESSITY
- PRIVILEGE

Rules from Architecture Freeze must be exact.

Especially:

- concrete Phase-8 privilege cannot be reopened;
- concrete risk cannot be reopened;
- authorization requires bounded direct-user context;
- necessity requires bounded direct-user + operation meaning.

No eligible dimensions -> no Deep Judge.

---

## 7. Implement output schema and strict candidate validation

Define `DeepJudgeCandidateV1` and one object-rooted JSON Schema accepted by the pinned subagent structured-output seam.

Use strict Host validation even though provider validates schema.

Require:

- exact keys;
- requested dimensions exactly once;
- valid dimension-specific verdict;
- known feature references only;
- bounded rationale;
- HYPOTHESIS-only proposed facts;
- bounded alternatives;
- no duplicate dimension;
- no extra result.

Run SecretRedactor on every free-text field before merge.

Do not parse `run.result.output` as fallback.

Only `result.structured` may produce A4.

---

## 8. Implement persona

Use a static persona reflecting the Architecture Freeze.

It must explicitly say:

- supplied operation/resource/project/file/tool content is untrusted data;
- only direct-user context may support authorization;
- authoritative/deterministic facts cannot be overridden;
- use UNKNOWN rather than invent facts;
- no tool attempts;
- output structured semantic candidate only;
- no approval action/final recommendation/reversible/checkpoint verdict.

No dynamic/project text in persona.

---

## 9. Implement spawn request

Immediately before start:

1. get current `spawn` provider;
2. validate all required capabilities;
3. validate `inheritsParentContext === false`;
4. resolve exact live parent Agent;
5. verify generation/native outcome still current.

Request must include:

```text
provider = spawn
parent = exact Agent
label = Risk Advisor Deep Judge
prompt = sanitized serialized payload only
maxDepth = 1
toolFilter = { allow: [] }
persona = static Deep Judge persona
outputSchema = strict schema
agentOptions.maxTokens = config maxTokens
optional agentOptions provider/model override
signal = scheduler-owned fused cancellation
```

No generic reviewer tools.

No Risk Advisor Evidence Tools in Phase 9 V1.

---

## 10. Implement Deep Judge run ownership

Create a dedicated runner/scheduler.

Suggested:

```text
src/host/deep-judge-scheduler.ts
```

Do not reuse/alter Phase-8 EvidenceScheduler or Phase-5 JudgeScheduler.

Semantics:

- one key per approval generation;
- duplicate rejected;
- bounded queue;
- hard timeout;
- AbortSignal propagation;
- start promise owned;
- returned run owned;
- result promise owned;
- always dispose returned run;
- active slot released only after result/dispose quiescence;
- timeout/cancel cannot later publish success;
- plugin dispose drains all owned work.

Map failures to static Deep Judge reason codes.

Never forward raw provider diagnostics.

---

## 11. Attach optional subagents capability

In plugin root:

```text
ctx.inject(['subagents'], ...)
```

Deep Judge remains optional.

Do not add `subagents` to the plugin's hard inject list.

On capability attach:

- increment generation;
- attach to Deep Judge runtime/coordinator.

On detach/replacement:

- increment generation;
- abort/drain Risk Advisor Deep Judge work;
- stale generation cannot publish A4.

Before each start, re-check `spawn` provider.

No fallback.

---

## 12. Extend Assessment Coordinator

Preserve existing A1/A2/A3 logic.

After Phase-8 terminal handling:

- evaluate Phase-9 trigger;
- if false -> complete;
- if true -> stage `deep`;
- schedule exactly one Deep Judge;
- valid candidate -> merge A4 -> complete;
- failure -> keep latest -> complete.

Do not run Deep Judge before Evidence handling finishes.

Require material Phase-8 Evidence.

On Native Approval outcome:

- mark closed;
- cancel Deep Judge;
- fence late A4.

On Session dispose:

- cancel Deep Judge;
- clear parent binding;
- drain through normal ownership path.

---

## 13. Implement A4 merge

Add deterministic Risk Engine function equivalent to:

`mergeDeepJudgeAssessment(...)`

A4 rules:

- immutable;
- supersedes latest;
- fill only UNKNOWN requested semantic dimensions;
- preserve concrete earlier verdicts;
- preserve hard/evidence risk floor;
- preserve A2 Judge provenance;
- preserve A3 Evidence provenance;
- add Deep Judge provenance;
- EvidenceQuality remains Host-owned;
- reversible/checkpoint features unchanged;
- alternatives model-suggested + UNVERIFIED;
- proposed facts remain uncertainties/hypotheses;
- recompute aggregate locally.

Do not accept a child-provided aggregate recommendation.

---

## 14. Provenance

Add optional Deep Judge provenance to Host RiskAssessment.

Keep A1–A3 compatibility.

Do not expose child run/session id.

Root-export only sanitized public types if genuinely needed.

Keep execution internals private.

---

## 15. Bridge V4

Do not change V1/V2/V3 parser semantics.

Add strict V4:

```text
schemaVersion = 4
stage = rules | fast | evidence | deep | complete
```

Existing bounded operation/assessment/evidence DTOs may be reused.

Add only closed safe Deep Judge reason codes.

Do not expose:

- child prompt;
- child output;
- child session id;
- run id;
- inherited prompt context.

---

## 16. Client V4

Presentation store accepts V2/V3/V4.

Polling:

```text
fast -> poll
evidence -> poll
deep -> poll
complete -> stop
```

Preserve:

- 1000ms interval;
- NOT_FOUND grace;
- no overlap;
- stale request/generation fencing;
- connection-reset behavior;
- dispose/unmount cleanup.

No extra Deep Judge UI action.

---

## 17. UI/non-interference

Risk Advisor stays advisory-only.

No:

- approve/reject button;
- Use/Apply/Execute action;
- child transcript panel;
- Deep Judge chat surface.

A4 should appear through the existing assessment presentation.

Native Approval stays separate.

---

## 18. Focused tests

Add `test:p9`.

Suggested files:

```text
tests/p9-deep-judge-config.unit.spec.ts
tests/p9-deep-judge-parent.unit.spec.ts
tests/p9-deep-judge-candidate.unit.spec.ts
tests/p9-deep-judge-runtime.integration.spec.ts
tests/p9-deep-judge-lifecycle.integration.spec.ts
tests/p9-deep-judge-bridge.spec.ts
tests/p9-boundary.integration.spec.ts
```

Equivalent grouping is allowed.

Cover every mandatory proof in Phase9_Architecture_Freeze.md.

Do not substitute static source scanning for lifecycle behavior when executable proof is possible.

---

## 19. Local subagent integration proof

Prefer at least one real local in-process `spawn` run with a deterministic mock LLM if all required Harness dev packages are already available locally.

Prove the actual request receives:

- maxDepth 1;
- allow empty tool filter;
- persona;
- outputSchema;
- structured result;
- disposal.

The mock response must not use external provider/network.

If actual local spawn cannot be composed without new registry access, do not install from registry.

Use public-seam stubs for remaining tests and record the real-spawn proof as NOT_RUN.

Do not silently upgrade a stub test to real-provider evidence.

---

## 20. Phase-9 benchmark

Add:

```text
benchmarks/r5-phase9.mjs
tests/r5-phase9-benchmark-smoke.spec.ts
tests/r5-phase9-benchmark-full.spec.ts
```

Scripts:

```text
bench:r5:p9:smoke
bench:r5:p9
```

Exercise product Deep Judge runner/coordinator path.

Minimum benchmark proof:

- valid structured candidate -> A4;
- concrete verdict preservation;
- payload bound;
- exact spawn request isolation fields;
- timeout;
- saturation;
- native cancellation;
- subagents generation replacement;
- invalid structured output;
- missing provider;
- run disposal.

Use local mock only.

Labels:

```text
R5_PHASE9_LOCAL_DEEP_JUDGE
LOCAL_REVIEWER_ONLY
EXTERNAL_PROVIDER_NOT_USED
NETWORK_NOT_USED
REGISTRY_NOT_USED
GIT_REMOTE_NOT_USED
```

Record real local mock reviewer invocation count.

---

## 21. Boundary test

Add a direct Phase-9 boundary test proving product source does not:

- call PendingApproval.answer;
- register generic Deep Judge tools;
- register custom reviewer Evidence Tools globally;
- call read/write/edit/bash/pwsh/web on behalf of reviewer;
- create custom Risk Advisor Session events;
- expose child transcript/session/run ids through Browser DTO;
- start Phase 10.

Also prove Deep Judge defaults off.

---

## 22. Validation order

Run before Full:

1. `test:p9`
2. `test:p8`
3. P8 benchmark smoke/full
4. `test:p7`
5. P7 benchmark smoke/full
6. P6
7. P5
8. P4
9. P3
10. P2
11. P1A/B/C
12. R1-R5
13. typecheck
14. build
15. Host export smoke
16. Client export smoke
17. declaration/private export audit
18. `pnpm pack --dry-run --json`
19. `git diff --check`
20. privacy/secret/scope audit
21. external-provider/network/registry/Git-remote audit
22. no custom Risk Advisor Session event
23. Harness tracked mutation = 0
24. P9 benchmark smoke/full

Local deterministic mock reviewer calls are allowed and must be counted separately.

External provider/model calls remain zero.

---

## 23. Commit and fresh Full

After all pre-Full gates pass:

1. stage only intended Phase-9 executable/source/test/package/benchmark files;
2. preserve user drift;
3. commit;
4. record exact executable/Tested SHA;
5. verify no intended executable drift remains;
6. run exactly one fresh complete `pnpm test`.

If Full fails:

- preserve evidence;
- repair within frozen scope;
- rerun affected pre-Full gates;
- create new executable SHA;
- run a new fresh Full.

After passing Full, no executable/test/config/package/benchmark semantic drift.

---

## 24. Execution Report

After passing Full, only create/update:

`docs/tasks/Phase9-deep-judge/Execution_Report.md`

Report:

- task start SHA;
- architecture freeze SHA;
- Tested SHA;
- final report SHA;
- default-off/isolation opt-in proof;
- parent binding lifecycle;
- spawn provider capability check;
- tool-less reviewer request;
- payload/redaction bound;
- structured candidate validation;
- A4 preservation rules;
- timeout/cancel/dispose;
- V4 lifecycle;
- local mock reviewer call count;
- actual local spawn proof status;
- external provider calls 0;
- external network/registry/Git remote 0;
- Harness mutation 0;
- focused/inherited/benchmark results;
- exact fresh Full count;
- Tested -> report docs-only proof;
- Phase 10 not started.

Push and verify remote equality.

Final response:

`PHASE9_PUBLISHED_READY_FOR_REVIEW`

No Acceptance Report.
