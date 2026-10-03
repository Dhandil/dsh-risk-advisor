# Phase 10 Architecture Freeze — V1 Hardening and Release Readiness

## 0. Freeze outcome

`PHASE10_ARCHITECTURE_FROZEN_READY_FOR_IMPLEMENTATION_INSTRUCTIONS`

Authoritative starting point:

- Phase-9 accepted executable: `45115742be6ad93e58eb8f9967f5b176ff67cc9c`
- Phase-9 acceptance / Phase-10 start baseline: `7c9dccf3a592ad0e1fb30e6fdf003c355e2c1064`
- Phase-10 Preflight: `40cd5dd2f784870ab288d12cda0056f7cf6fd2c4`
- pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`

This document freezes Phase-10 scope and supersedes no accepted Phase-1–9 architecture except where it explicitly records an accepted later-phase correction, such as Phase-9 tool-less Deep Judge.

Harness Core remains read-only.

---

## 1. Phase-10 definition

Phase 10 is the V1 hardening phase.

It owns:

```text
Prompt Injection
Secret leakage
Shell chaining bypass
Encoded/dynamic execution
False retry correlation
Semantic false positive
Timeout
Cancellation
Plugin coexistence
TOCTOU truthfulness
Resource limits
Cold restart / external bundle readiness
T05 product-latency follow-up
```

It does not add a new reasoning tier after A4.

---

## 2. Acceptance philosophy

Hardening is fail-closed.

A test is successful when the system:

- detects a known hazard; or
- degrades to unknown/unavailable when semantics cannot be proven; or
- rejects malformed/adversarial reviewer output; or
- preserves prior authoritative facts; or
- remains bounded and non-authoritative under failure.

Phase 10 must not “improve pass rate” by converting unknown into safe.

---

# Part A — Adversarial semantic hardening

## 3. One shell authority

`src/host/shell-analysis.ts` remains the only shell-analysis authority.

Do not add a second hardening parser.

Phase 10 may repair the existing shared parser only if an adversarial case demonstrates a real fail-open or false-positive defect.

Every repaired case must be added to the shared corpus and inherited Phase-4/7 tests must remain green.

---

## 4. Shell adversarial corpus

Add a table-driven corpus covering at least:

### Chaining

- `git status && rm -rf build`
- `echo ok ; rm -rf build`
- `false || rm -rf build`
- pipe into an interpreter
- newline-separated second command
- PowerShell semicolon
- quoted separators that must remain inert

### Dynamic execution

- `bash -c`
- `sh -c`
- `node -e`
- `python -c`
- `perl -e`
- `cmd /c`
- `powershell -Command`
- `pwsh -c`
- `Invoke-Expression`
- `iex`
- `& $variable`
- `find ... -exec`
- `xargs`
- `parallel`
- command substitution/backticks

### Encoded execution

- PowerShell `-EncodedCommand`
- PowerShell `-enc`
- case variants

### Environment / execution-context injection

- PATH
- LD_PRELOAD
- NODE_OPTIONS
- generic environment prefix
- PowerShell environment assignment

Expected rule:

```text
known dangerous semantics -> specific finding
dynamic/ambiguous unsupported semantics -> DEGRADED / fail-closed
inert quoted/data text -> no role-sensitive false positive
```

No corpus command is executed.

---

## 5. Prompt-injection threat model

Phase 10 does not claim that an arbitrary external LLM is mathematically immune to prompt injection.

The accepted claim is structural:

```text
untrusted operation/project/file/tool text
!= system instruction
!= direct-user authorization
!= authoritative Host fact
```

Required proof:

1. operation text containing instructions remains inside bounded data payload;
2. plugin/system/project messages do not enter DirectUserContext;
3. Fast Judge static system prompt remains separate from payload;
4. Deep Judge static persona remains separate from the one text ContentBlock payload;
5. extra/unrequested model dimensions are rejected;
6. malformed recommendation/authority fields are rejected;
7. A2/A4 cannot replace an already concrete deterministic/authoritative dimension;
8. A4 cannot reduce a hard/evidence risk floor;
9. model alternatives remain UNVERIFIED;
10. model hypotheses remain hypotheses.

A deterministic hostile local reviewer fixture may intentionally return bad output to prove Host containment.

Report this as:

`STRUCTURAL_PROMPT_INJECTION_HARDENING`

not “real provider prompt-injection immunity”.

---

## 6. README/project injection boundary

Project/README text is not a source of Authorization.

Do not add workspace README content to Reviewer payloads in Phase 10.

For Fast Judge, only the existing bounded inputs are allowed.

For Deep Judge:

- default remains disabled;
- enabled mode still requires `trusted-parent-composition`;
- `toolFilter: { allow: [] }` remains;
- inherited parent-preset prompt composition remains an explicit trust limitation.

Phase 10 must not hide or relabel this limitation.

---

# Part B — Privacy hardening

## 7. Synthetic secret canary

Create one runtime-generated synthetic canary family.

Do not use a real credential.

Construct recognizable forms such as:

- Authorization Bearer;
- token assignment;
- credential URL;
- private-key marker.

Generate the unique token at runtime from fragments so the exact canary is not stored as a literal in committed source.

Inject the canary through representative surfaces:

- shell command;
- direct-user message;
- web URL;
- write/edit content;
- reviewer candidate rationale/hypothesis/alternative.

---

## 8. Canary deny surfaces

The exact secret token must not survive into any retained/presented surface where raw secret content is forbidden:

- RuleEvaluation JSON;
- Foundation diagnostics;
- ReviewerOperationSeed;
- ReviewerPayload;
- Fast Judge serialized payload;
- Fast Judge accepted candidate;
- EvidenceSnapshot;
- Deep Judge serialized payload;
- Deep Judge accepted candidate;
- A1/A2/A3/A4 RiskAssessment;
- Browser V1–V4 DTOs;
- sanitized diagnostics;
- benchmark result object;
- test-captured logger/console output owned by Risk Advisor.

If a malformed value cannot be safely redacted, fail closed rather than retaining it.

Do not require scanning unrelated Harness logs or user files.

---

## 9. Raw lifetime

Raw ToolExecution arguments may exist only inside the already-accepted bounded active-operation capture where required.

Hardening proof must confirm:

- raw args removed when execution retires;
- raw evidence target seeds consumed/expired/cleared;
- Session dispose clears Session-owned raw state;
- plugin dispose clears all plugin-owned raw state;
- no raw prompt/tool arguments are copied into Browser or custom logs.

No new telemetry is added.

---

# Part C — Retry and semantic correctness

## 10. False retry correlation

The retry relationship is immutable evidence captured at the later operation's capture boundary.

Required matrix:

- same normalized operation + same semantic target within same Session may relate;
- same text + different target must not;
- same target + different operation family must not;
- different Session object must not, even with same textual id;
- expired prior cannot become a definite retry;
- capacity loss cannot manufacture a relation;
- late verifier evidence cannot retroactively change which prior operation was selected;
- permission escalation requires a valid captured relation and wider permission.

If current fingerprinting incorrectly collapses materially different operations, repair the existing fingerprint function; do not introduce a second correlation subsystem.

---

## 11. Semantic false positive

For a Known Postcondition Adapter:

```text
process exit 0 + postcondition matched       -> semanticSuccess=true
process exit 0 + postcondition mismatched    -> semanticSuccess=false
process exit 0 + inaccessible/ambiguous      -> semanticSuccess=unknown
process exit 0 + verifier unsupported        -> semanticSuccess=unknown
timeout/cancel/generation loss               -> semanticSuccess=unknown
```

A checker error is not evidence that the goal failed unless the adapter contract specifically proves mismatch.

Unknown does not become success.

A later result after terminal cancellation cannot rewrite the accepted outcome.

---

# Part D — Whole-pipeline lifecycle

## 12. Integrated coordinator stress

Exercise the accepted pipeline:

```text
A1
-> optional A2
-> optional Evidence/A3
-> optional Deep/A4
-> complete
```

with deterministic local fixtures only.

Scenarios:

- Fast Judge delayed/timeout;
- Evidence delayed/timeout;
- Deep Judge delayed/timeout;
- Native Approval while A2 is running;
- Native Approval while Evidence is running;
- Native Approval while A4 is running;
- Session disposal at each stage;
- plugin disposal at each stage;
- optional capability detach/replacement;
- abort-ignoring local fake work;
- duplicate approval observation.

Rules:

- Native outcome immediately closes advisory publication eligibility;
- no late superseding assessment after close;
- scheduler/work holders still drain to quiescence;
- no orphan async rejection;
- no double-complete;
- no advisory failure blocks Native Approval.

---

## 13. HMR/reload hardening

Use real Cordis plugin lifecycle semantics.

At least three mount -> dispose -> remount cycles must prove:

- no duplicate tools listener;
- no duplicate session listener;
- no duplicate Browser route/slot contribution;
- no duplicate optional-capability watcher;
- no old generation callback publishes into the new generation;
- old scheduled work is drained;
- native approval remains single-answer.

Do not simulate HMR by mutating private fields.

---

# Part E — Resource limits

## 14. Integrated bounded-state matrix

Exercise each retained-state family at or past its frozen cap:

- ActiveExecutionIndex;
- OperationFoundation;
- Ledger/PTC replay inputs;
- FailureChain;
- ReviewerSeed;
- ExpectedEffect;
- Postcondition verifier;
- Evidence raw target seed;
- Evidence sanitized record store;
- Assessment records;
- Deep Judge parent bindings;
- Judge/Evidence/Deep pending queues.

Do not raise accepted caps merely to make stress tests pass.

Expected behavior is one of:

- deterministic oldest settled eviction;
- bounded truncation;
- explicit degraded/capacity status;
- bounded queue saturation;
- fail-closed skip.

Never:

- unbounded growth;
- arbitrary active-record eviction that breaks identity;
- blocking Native Approval.

---

## 15. Stress size

Use bounded stress, not a soak test.

Recommended:

- capacity + 1 / capacity + small margin for exact boundary proof;
- a composed 500–1,000-operation local run for cross-store lifecycle;
- at least 4 distinct Session identities;
- repeated dispose/reload.

Keep runtime deterministic and CI-friendly.

No uncontrolled heap benchmark is required.

Behavioral bounds are the acceptance authority.

---

# Part F — Plugin coexistence

## 16. Approval authority invariant

Risk Advisor remains advisory-only.

Static and executable proof must continue to show:

- no `PendingApproval.answer`;
- no `ApprovalOutcome` returned by Risk Advisor;
- no approval answerer registration owned by Risk Advisor;
- no automatic allow/reject.

---

## 17. Coexistence fixture

Mandatory local coexistence test:

```text
pinned Harness ApprovalService
+ Risk Advisor
+ separate Cordis fixture plugin that registers one deterministic approval answerer
```

The fixture is a separate plugin/fiber and must use the public approval seam.

Prove:

- answerer called exactly once;
- native outcome equals fixture answer;
- Risk Advisor installed/absent parity;
- Risk Advisor injected failure parity;
- Risk Advisor timeout parity;
- Risk Advisor disposal before answer parity;
- fixture removal makes native request fail/behave according to native policy, not RA fallback;
- remount does not duplicate answerers.

Do not put the answerer in Risk Advisor product source.

---

## 18. Named external approval plugins

If a pre-existing local approval plugin is already available without installation, Codex may run an additional coexistence lane.

Do not fetch/install one from registry.

If none is available, report:

`NAMED_EXTERNAL_APPROVAL_PLUGIN_NOT_AVAILABLE`

This does not invalidate the mandatory real ApprovalService + separate-plugin coexistence proof, but the report must not claim the named baseline examples were executed.

---

# Part G — TOCTOU truthfulness

## 19. V1 TOCTOU contract

Risk Advisor V1 provides:

`PRE_EXECUTION_OBSERVATION`

not atomic execution-time validation.

The private Operation Foundation operationHash remains the review-time operation identity witness.

Do not expose raw operation arguments or the raw hash to Browser.

Required proof:

- equivalent normalized operation produces stable private hash;
- materially changed operation produces different hash;
- review/evidence is bound to the same ExecutionId;
- no Evidence/A3/A4 from another execution can be substituted;
- no UI text says “execution-time verified”, “guaranteed current”, or equivalent.

---

## 20. UI truthfulness

When Evidence-backed assessment is shown, add a concise localized disclosure equivalent to:

English:

`Evidence was observed before execution; execution-time state may change.`

Chinese:

`证据采集于执行前，实际执行时状态可能已变化。`

This is presentation copy, not a new Browser protocol field.

Do not create Bridge V5 only for this disclosure.

V1–V4 protocol remains frozen.

---

# Part H — External bundle and cold restart

## 21. Package productization

Add exactly one external bundle patch:

`cordis.patch.yml`

Minimum row:

```yaml
- insert:
    - id: risk-advisor
      name: '@dhandil/dsh-risk-advisor'
```

Package manifest must add:

```json
"dsh": {
  "bundle": {
    "patch": "./cordis.patch.yml"
  },
  "client": {
    "... existing accepted declaration ...": "preserved"
  }
}
```

Preserve the existing `dsh.client` declaration.

Add `cordis.patch.yml` to published `files`.

No automatic Fast Judge or Deep Judge enablement is added to the bundle patch.

Default install remains provider-free.

---

## 22. README productization

Replace the stale T01 fixture README with a real V1 README covering:

- what Risk Advisor does;
- advisory-only authority;
- install as external bundle;
- default behavior;
- Fast Judge optional configuration;
- Deep Judge default-off / trusted-parent-composition limitation;
- privacy / no raw-log promise;
- pre-execution Evidence / TOCTOU limitation;
- development/test commands;
- pinned compatibility statement without implying future Harness compatibility.

Do not document an unverified registry package as published.

Local-path installation may be documented as development/install verification.

---

## 23. Pack contract

`pnpm pack --dry-run --json` must prove the artifact contains:

- Host JS;
- Client JS;
- declarations;
- README;
- `cordis.patch.yml`;
- package manifest with bundle/client declarations.

It must not contain:

- tests;
- benchmark fixtures;
- raw evidence artifacts;
- local absolute paths;
- user drift;
- secrets.

---

## 24. External install proof

Use a disposable profile/home.

Prefer the pinned Harness-supported absolute local-path install command/service so no registry is required.

Network must be disabled/fail-loud for this lane.

Prove:

- package recognized as an external bundle;
- compatibility/preflight accepts its peer surface;
- bundle patch activates exactly one Risk Advisor row;
- Host entry loads;
- Client roster recognizes the package where the pinned local client assembly seam permits proof.

Do not modify the user's actual profile.

---

## 25. True cold restart

A cold restart means a new OS process, not Cordis remount in the same process.

Required preferred lane:

1. disposable profile created;
2. Risk Advisor external bundle installed/activated locally;
3. process A boots the profile and proves Risk Advisor activation;
4. process A exits cleanly;
5. process B boots the same profile from persisted profile files;
6. Risk Advisor activates once again;
7. both processes exit without orphan work.

Set network/registry to offline/fail-loud.

Do not call an in-process remount a cold restart.

If the pinned Harness checkout lacks already-built prerequisites and satisfying them would require building/modifying Harness Core or network access, stop this lane with:

`PHASE10_COLD_START_ENVIRONMENT_BLOCKED`

and stop Phase-10 publication for architecture review rather than claiming PASS.

Cold start is a V1 release gate.

---

# Part I — Final latency/resource policy

## 26. T05 follow-up

The T05 provisional policy explicitly required remeasurement after production assessment paths existed.

Phase 10 fulfills that obligation.

Do not modify the historical T05 report/policy.

Create Phase-10-owned evidence and final candidate.

---

## 27. Measurement classes

Every latency number must be labeled as one of:

- `REAL_PINNED_RUNTIME`
- `REAL_PRODUCT_LOCAL`
- `STRUCTURAL_LOCAL_REVIEWER`
- `NOT_VALIDATED_EXTERNAL_PROVIDER`

Never mix them.

---

## 28. Required measured distributions

Use monotonic `performance.now()` or `hrtime.bigint()`.

Use nearest-rank percentiles and report n / warmups / P50 / P95 / P99 / MAX / mean.

Measure:

1. native ApprovalService baseline vs RA-installed treatment;
2. synchronous RA added overhead;
3. A1 deterministic assessment;
4. Context Builder;
5. A2 path with deterministic local LLM adapter;
6. Phase-8 local Evidence + A3;
7. structural Deep Judge + A4;
8. Browser presentation/query;
9. full local A1 -> A4 composed path where triggerable.

For cheap local distributions target >=300 measured samples after warmup.

For heavier composed cases target >=100; if lower, mark P99 LOW_CONFIDENCE.

No external provider.

---

## 29. AdvisoryLatencyPolicy

Create:

`docs/tasks/Phase10-hardening/AdvisoryLatencyPolicy.md`

It is a frozen V1 policy artifact only after the Phase-10 implementation evidence supports it.

For each field state:

- policy/candidate value or CONTRACT_ONLY / UNDETERMINED;
- measured basis;
- evidence class;
- P99/MAX;
- headroom formula if numeric;
- whether the field changes runtime behavior.

At minimum address:

- `T_sync`;
- deterministic assessment local budget;
- context build local budget;
- Evidence local budget;
- Browser presentation/query local budget;
- Fast Judge timeout;
- Deep Judge timeout;
- max Fast/Deep concurrency/pending bounds;
- total advisory lifecycle bound.

External model/provider response latency must remain:

`NOT_VALIDATED_EXTERNAL_PROVIDER`

unless a future separately authorized provider test occurs.

Do not tune product timeout/concurrency settings automatically from local mock latency.

---

# Part J — Phase-10 artifacts and testing

## 30. Product changes allowed

Expected product changes are limited to:

- hardening repairs exposed by executable proof;
- TOCTOU disclosure copy;
- external bundle manifest/patch;
- README productization;
- bounded hardening diagnostics only if essential for executable capacity proof.

Do not add a new user-facing feature.

---

## 31. Phase-10 tests

Add `test:p10`.

Suggested grouping:

- `p10-shell-hardening.unit.spec.ts`
- `p10-prompt-privacy.integration.spec.ts`
- `p10-retry-semantic.integration.spec.ts`
- `p10-lifecycle-resource.integration.spec.ts`
- `p10-coexistence.integration.spec.ts`
- `p10-toctou-presentation.spec.tsx`
- `p10-package-contract.spec.ts`
- `p10-boundary.integration.spec.ts`

Equivalent grouping is allowed.

Prefer table-driven tests over one test per trivial string.

---

## 32. Phase-10 benchmark

Add dedicated Phase-10 benchmark scripts/tests.

Suggested:

- `benchmarks/r5-phase10.mjs`
- `tests/r5-phase10-benchmark-smoke.spec.ts`
- `tests/r5-phase10-benchmark-full.spec.ts`

Scripts:

- `bench:r5:p10:smoke`
- `bench:r5:p10`

The full benchmark owns the distributions described above and produces bounded sanitized evidence.

No raw prompt/tool arguments/secrets are written.

---

## 33. Cold-start runner

A dedicated local script/test may orchestrate disposable-profile install and two-process boot.

It must:

- accept/derive pinned Harness local path without editing it;
- create all mutable state under a temp directory;
- force no external network/registry;
- clean child processes;
- bound every child process by timeout;
- capture bounded sanitized stdout/stderr;
- fail if the secret canary or user path leaks;
- clean temp state on success/failure unless evidence preservation is explicitly required for a failed gate.

Do not kill unrelated processes.

---

## 34. No real provider

Across P10 focused tests / benchmark / cold start:

```text
external model/provider calls = 0
external network calls = 0
registry calls = 0
Git remote runtime calls = 0
Harness tracked mutations = 0
```

Local loopback/process IPC used by a pinned Harness cold-start fixture is not an external network call, but report it separately.

---

# Part K — Validation governance

## 35. Pre-Full validation order

Run in this order:

1. P10 shell/adversarial focused
2. P10 prompt/privacy focused
3. P10 retry/semantic focused
4. P10 lifecycle/resource focused
5. P10 coexistence focused
6. P10 TOCTOU/presentation focused
7. P10 package/boundary focused
8. P9 focused
9. P9 benchmark smoke/full
10. P8 focused
11. P8 benchmark smoke/full
12. P7 focused
13. P7 benchmark smoke/full
14. P6
15. P5
16. P4
17. P3
18. P2
19. P1A
20. P1B
21. P1C
22. R1
23. R2
24. R3
25. R4
26. R5/T05 regression
27. typecheck
28. build
29. Host export smoke
30. Client export smoke
31. declaration/private-export audit
32. bundle manifest/patch contract
33. pack dry-run JSON
34. git diff --check
35. scope/privacy/secret canary audit
36. no-provider/no-external-network/no-registry/no-Git-remote audit
37. no custom Risk Advisor Session event
38. no Risk Advisor ApprovalOutcome / answerer
39. Harness tracked mutation = 0
40. P10 benchmark smoke/full
41. local external-bundle install proof
42. true two-process cold restart proof

No fresh full `pnpm test` before these gates are green.

---

## 36. Commit / benchmark / Full sequence

Because cold-start and benchmarks must exercise the actual final package shape:

1. finish product/tests/scripts/docs-policy inputs;
2. run focused/static/regression gates;
3. run benchmark/cold-start once on the candidate working tree;
4. repair if needed;
5. generate the bounded `AdvisoryLatencyPolicy.md` from final benchmark evidence;
6. stage only intended Phase-10 executable/test/package/benchmark/policy/README/patch files;
7. commit the complete Phase-10 executable candidate;
8. record exact Tested SHA;
9. rerun the final P10 benchmark smoke/full and cold-start gates on that exact committed SHA;
10. if either fails, repair -> new SHA -> repeat affected gates;
11. when all pre-Full gates pass on exact Tested SHA, run exactly one fresh complete `pnpm test`.

After the passing Full:

- no executable/test/config/package/benchmark/policy semantic drift;
- only `docs/tasks/Phase10-hardening/Execution_Report.md` may change.

---

## 37. Fresh Full

Exactly one fresh complete `pnpm test` is the final executable acceptance gate for the final exact Tested SHA.

If it fails:

- preserve evidence;
- repair;
- rerun affected pre-Full gates;
- create a new exact Tested SHA;
- run a new fresh complete Full.

Never patch executable code after a passing Full.

---

# Part L — Reporting

## 38. Execution Report

Create only after the final Full:

`docs/tasks/Phase10-hardening/Execution_Report.md`

Record:

- start baseline;
- preflight/freeze SHA;
- Tested SHA;
- final report SHA;
- every H1–H5 hardening lane;
- exact adversarial corpus counts;
- privacy canary surfaces;
- retry/semantic matrix;
- timeout/cancel/generation stress;
- capacity boundaries;
- coexistence identity;
- named external plugin availability status;
- TOCTOU limitation/proof;
- bundle manifest/pack proof;
- local install proof;
- process A/B cold restart proof;
- final latency distributions/policy path;
- external provider status;
- full test count;
- Tested -> report docs-only proof;
- Harness mutation = 0;
- no Phase 11 started.

---

## 39. Final Codex handoff

Codex returns:

`PHASE10_PUBLISHED_READY_FOR_REVIEW`

Codex must not:

- declare `PHASE10_ACCEPTED`;
- declare V1 release accepted;
- create `Acceptance_Report.md`;
- start another phase.

---

# Part M — STOP conditions

## 40. Architecture STOP

Stop:

`PHASE10_ARCHITECTURE_DECISION_REQUIRED`

if implementation would require:

- Harness Core modification;
- Native Approval replacement;
- Risk Advisor approval answerer;
- Deep Judge generic tools / Evidence Tools;
- new durable product persistence;
- execution-time mutation guard/veto;
- external provider/network use;
- loosening existing fail-closed semantics.

---

## 41. Environment STOP

Stop:

`PHASE10_COLD_START_ENVIRONMENT_BLOCKED`

if true external-bundle/two-process cold restart cannot be executed without:

- building/modifying Harness Core;
- registry/network access;
- mutating the user's real profile;
- using unavailable runtime prerequisites.

Do not substitute an in-process mount and publish PASS.

---

## 42. Security STOP

Stop and report the exact hardening failure if:

- a synthetic secret escapes a forbidden Risk Advisor surface;
- an adversarial shell form is classified safe when semantics are unproven;
- model output lowers an authoritative risk floor;
- a late asynchronous result publishes after Native outcome;
- a capacity test grows without bound;
- Risk Advisor changes Native Approval outcome/answer count.

Repair is allowed only within this frozen architecture.

---

## 43. Phase-10 frozen conclusion

Phase 10 is a bounded hardening/productization task over the accepted Phase-1–9 architecture.

Its end goal is:

```text
security-hardened
+ privacy-bounded
+ lifecycle-quiescent
+ capacity-bounded
+ coexistence-safe
+ TOCTOU-truthful
+ externally installable
+ cold-restartable
+ latency-policy measured
```

without gaining approval authority or modifying Harness Core.
