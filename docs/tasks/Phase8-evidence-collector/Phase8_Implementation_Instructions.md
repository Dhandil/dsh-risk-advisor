# Phase 8 Implementation Instructions — Bounded Evidence Collector

## 0. Required outcome

Implement the frozen Phase-8 Evidence Collector and publish implementation evidence for independent architecture review.

Final allowed handoff:

`PHASE8_PUBLISHED_READY_FOR_REVIEW`

Codex must not declare `PHASE8_ACCEPTED`.

Do not create `Acceptance_Report.md`.

Do not start Phase 9.

---

## 1. Required starting documents

Before changing executable code, read all of:

1. `docs/baseline/risk-advisor-v1-architecture-v1.2.md`
2. `docs/baseline/risk-advisor-v1-spec-v1.2-r1.md`
3. `docs/baseline/risk-advisor-test-matrix-v1.0-r1.md`
4. `docs/tasks/Phase8-evidence-collector/Phase8_Preflight.md`
5. `docs/tasks/Phase8-evidence-collector/Phase8_Architecture_Freeze.md`
6. `docs/tasks/Phase7-known-postcondition-verification/Acceptance_Report.md`
7. `docs/governance/Collaboration_Workflow.md`

The Phase-8 Architecture Freeze is authoritative where implementation detail is not already fixed by the baseline.

---

## 2. Baseline verification

Before implementation, verify:

```text
origin/main contains the Phase-8 Architecture Freeze
accepted Phase-7 executable = 366305d342e3cae197cc19df8de5c434a163b82b
Phase-7 acceptance publication exists
Harness reference = ddefc45fbc7f8e46dd73185e68295696d1297887
```

Record the exact task-start Risk Advisor SHA.

Preserve pre-existing user drift.

Do not:

- reset;
- clean;
- force checkout;
- overwrite protected untracked files;
- modify Harness Core.

---

## 3. No dependency/network side effect during task

Phase 8 product/tests/benchmark must make:

```text
provider/model calls = 0
external network calls = 0
package registry calls = 0
external Git remote calls = 0
```

Governance-only Git fetch/push/equality checks are allowed and must be separated from product/test/benchmark evidence.

Do not run package installation that requires registry access.

If the public `@deepseek-ai/dsh-fs` contract cannot be resolved from the existing environment without registry access, STOP with:

`PHASE8_DEPENDENCY_UNAVAILABLE`

Do not work around this by importing Harness source through a private relative path.

---

## 4. Implement Host-private raw EvidenceTargetSeed

Create a bounded raw target registry.

Suggested file:

`src/host/evidence-target.ts`

Equivalent naming is allowed.

Requirements:

- capture on `tools/pre-execute`;
- keyed by existing `ExecutionId`;
- strict own-data-property access;
- never invoke accessors;
- never traverse unknown arguments;
- max 8 requested target paths;
- 5-minute TTL;
- max 128 active seeds per Session;
- max 512 global;
- deterministic oldest eviction;
- one-shot consume;
- Session disposal cleanup;
- plugin disposal cleanup;
- object-keyed/raw lookup cleanup on every removal path.

Supported direct tools:

```text
read.file_path
write.file_path
edit.file_path
```

Use the frozen shell target subset from the Architecture Freeze.

Do not create a second shell parser.

If the shell operation contains explicit `workdir`, record that exact condition and make hard path evidence ineligible.

Do not expose raw paths through diagnostics/root exports.

---

## 5. Extend the shared shell analysis only if required

If Evidence target planning needs a shared helper, place it in the existing:

`src/host/shell-analysis.ts`

Requirements:

- Phase 4 behavior stays equivalent;
- Phase 7 adapter behavior stays equivalent;
- Phase 8 consumes the same tokenizer/parser authority;
- no second tokenizer;
- no parser widening merely to increase evidence coverage.

Add direct P4/P7 regression proof for any shared change.

Fail closed for:

- variable expansion;
- tilde expansion;
- wildcard/glob;
- chaining/pipeline;
- dynamic execution;
- ambiguous quote semantics;
- unsupported options;
- explicit workdir.

---

## 6. Implement EvidenceSnapshot store

Create a sanitized immutable EvidenceSnapshot V1.

Suggested files:

```text
src/host/evidence-store.ts
src/host/evidence-types.ts
```

Equivalent organization is allowed.

Retained snapshot must be path-free/content-free.

Implement:

```text
TTL = 5 minutes
max per Session = 128
max global = 512
```

Do not retain:

- raw requested path;
- canonical path;
- FsTarget/FsTargetKey;
- file content;
- package.json content;
- directory names;
- Git stdout/stderr;
- provider error message;
- secret data.

Deep-freeze every published snapshot.

---

## 7. Add public dsh-fs contract dependency

Use the public service contract:

`@deepseek-ai/dsh-fs`

Expected package metadata:

```json
peerDependencies:
  "@deepseek-ai/dsh-fs": ">=0.1.6-alpha.2"

devDependencies:
  "@deepseek-ai/dsh-fs": "0.1.6-alpha.2"
```

Do not publish a dependency on a concrete fs provider.

Do not import private Harness implementation files.

Do not add `fs-local` or `fs-sandbox` as a runtime dependency.

---

## 8. Implement filesystem Evidence Collector

Suggested file:

`src/host/evidence-collector.ts`

Use `ctx.fs` through the public seam.

For every eligible evidence job:

1. establish approval-bound Session;
2. require bounded non-empty `session.header.cwd`;
3. resolve workspace root through `fs.resolve`;
4. consume the raw EvidenceTargetSeed;
5. collect exact target metadata under budgets;
6. collect optional directory/config facts only when relevant;
7. collect optional local Git facts through the shell checker;
8. normalize into sanitized EvidenceSnapshot;
9. delete all raw target state after collection.

Use:

```text
resolve
lstat
stat
contains
processPath
readBytes
listDir
```

Do not call:

```text
writeText
editText
```

or any other mutation.

Tests must make mutation primitives throw if accidentally called.

---

## 9. Workspace/canonical target recipe

For each exact target:

- `lstat(rawPath, {cwd: session.header.cwd}, signal)`;
- `resolve(rawPath, {cwd: session.header.cwd, signal})`;
- `stat(resolvedTarget, signal)`;
- `contains(workspaceTarget, resolvedTarget)`.

Hard facts require coherent completion.

Map:

```text
all targets resolved + coherent
  -> canonicalTargetsKnown=true
exact target set closed
  -> targetCountKnown=true
all contains=true
  -> workspaceContained=true
any contains=false
  -> workspaceContained=false
all known + none outside
  -> scope.workspaceOnly=true
any outside
  -> scope.outsideWorkspace=true
```

Do not decide containment lexically.

Provider ambiguity/error -> unknown.

---

## 10. Symlink/path alias evidence

Use `lstat` only for final-component alias observation.

If:

```text
lstat.type == symlink
```

set pathAliasObserved=true.

Do not claim no parent alias merely because final lstat is not a symlink.

Canonical containment through `resolve + contains` owns parent-alias escape detection.

Alias evidence must not automatically imply malicious intent.

---

## 11. Outside-workspace privacy fence

For an exact target proven outside workspace:

Allowed:

- lstat/stat/resolve metadata necessary to establish scope.

Forbidden:

- readBytes/readText;
- listDir;
- package/config reads;
- arbitrary sibling discovery.

Add focused spies proving content/list operations are not invoked for outside targets.

---

## 12. Directory evidence

Use only when the target is a relevant exact directory.

No recursion.

Retain no child names.

At most:

```text
200 retained entries
```

If more are returned:

- process no more than needed for the frozen aggregate facts;
- mark `DIRECTORY_TRUNCATED`;
- snapshot truncated=true.

Allowed derived facts include:

- entry count observed;
- package.json present;
- .gitignore present.

Do not create a workspace inventory.

---

## 13. package.json evidence

Read only when package/install evidence is relevant.

Use `readBytes` with:

```text
maxBytes = 64 * 1024
```

Require workspace containment and regular file.

Do not follow an unsupported final symlink into config content.

Parse JSON locally.

Retain only safe derived facts.

At minimum detect:

```text
package manifest present
valid JSON
packageManager declared
preinstall/install/postinstall/prepare present
bounded dependency counts
```

Do not retain:

- script bodies;
- dependency names;
- arbitrary JSON fields.

Exact 64-KiB boundary must be executable-proven.

Over-limit must fail closed.

---

## 14. Implement closed local Git evidence checker

Suggested file:

`src/host/evidence-git.ts`

Use the existing public `ctx.shell.resolve/run` seam.

Use a product-owned fixed checker command.

Recommended:

```text
node -e <fixed source>
```

The checker receives operation-controlled paths only through environment data.

Inside the checker:

- use argv-array child process invocation;
- no shell interpolation;
- compute relative target path inside the checker execution world;
- run only local Git inspection.

At minimum produce booleans for:

```text
repositoryAvailable
tracked
ignored
clean
```

Use hardened environment and local-only Git commands.

Disable:

- prompts;
- pager;
- optional locks;
- fsmonitor;
- external diff/textconv if diff is used.

Output:

- closed JSON;
- bounded <= 4096 bytes;
- no path;
- no raw Git text.

Invalid/extra/malformed/oversized output -> unknown.

---

## 15. Git execution-world identity

Obtain:

```text
workspaceProcessPath = fs.processPath(workspaceTarget)
targetProcessPath = fs.processPath(target)
```

Pass those values as data to the fixed checker.

Do not compute cross-provider relative paths using Host lexical path rules before the checker.

If processPath/shell world cannot be reconciled, Git evidence is unknown.

No remote operation is allowed.

---

## 16. Checkpoint evidence

Implement exactly:

```text
checkpointAvailable = unknown
CHECKPOINT_CAPABILITY_UNAVAILABLE
```

under the pinned Harness capability set.

Add negative tests proving none of these count as rollback checkpoint evidence:

- session/flush;
- projection checkpoint;
- compaction checkpoint.

Do not read Session history trying to infer a workspace checkpoint.

---

## 17. Implement Evidence scheduler

Suggested file:

`src/host/evidence-scheduler.ts`

Freeze:

```text
timeout = 5000ms
max concurrent = 2
max pending = 8
```

Semantics:

- one active job per execution/approval generation;
- duplicate enqueue fails deterministically;
- timeout publishes terminal timeout at most once;
- abort underlying signal on timeout;
- keep active slot owned until underlying Promise settles;
- queue does not advance early;
- Session/native outcome can cancel jobs;
- fs/shell generation fence aborts old jobs;
- dispose waits for all underlying work.

Do not refactor/migrate the accepted Phase-7 VerificationScheduler merely to share code.

Phase-7 scheduler semantics must remain untouched.

---

## 18. Evidence capability lifecycle

Wire filesystem capability through Cordis injection.

Do not make `fs` a top-level required plugin injection that prevents Risk Advisor from loading in a composition without fs.

Evidence is optional advisory capability.

When no fs is available at collection time:

- do not block Native Approval;
- do not fabricate evidence;
- mark Evidence unavailable/complete appropriately;
- no A3 unless a material deterministic update exists.

For shell:

- Phase-7 verifier and Phase-8 Evidence Collector may both observe the same public shell capability;
- keep their generation/ownership state independent;
- one subsystem must not dispose or mutate the other's scheduler.

Detach/replacement must fence stale Evidence publication.

---

## 19. Apply Evidence to immutable Risk features

Add a function equivalent to:

`overlayEvidenceFeatures(baseFeatures, snapshot)`

Do not mutate existing feature arrays.

Evidence-proven values use:

```text
source = AUTHORITATIVE
strength = AUTHORITATIVE
```

Supported feature overlay:

```text
scope.workspaceOnly
scope.canonicalTargetsKnown
scope.targetCountKnown
scope.wildcardTarget
scope.outsideWorkspace

recovery.versionControlled
recovery.checkpointAvailable
recovery.rollbackMechanismKnown
recovery.reversible

privilege.minimumScopeEvidenceAvailable
```

Unknown stays unknown.

Do not convert "not observed" into false.

---

## 20. Reversibility implementation

Positive reversible V1 path is intentionally narrow.

Allow true only for:

```text
direct write/edit
single exact target
inside workspace
Git repository evidence complete
tracked=true
clean=true
no remote/system/external effect
```

Then:

```text
versionControlled=true
rollbackMechanismKnown=true
reversible=true
checkpointAvailable=unknown
```

All other Phase-8 cases remain false only if an accepted deterministic rule already proves false; otherwise unknown.

Especially do not mark true for:

- package install;
- Git checkout/switch;
- arbitrary shell;
- recursive delete;
- dirty target;
- untracked destructive target;
- external/remote/system operation.

---

## 21. Minimum privilege implementation

Eligible operation classes:

- direct write/edit;
- simple static mkdir/cp from the frozen evidence target planner.

Require:

- exact complete target plan;
- all targets canonicalized;
- all targets inside workspace;
- no explicit workdir;
- no external/network/system/permission finding.

Then:

```text
requested danger-full-access -> EXCESSIVE
requested workspace-write -> PROPORTIONATE
```

Do not derive a privilege verdict for unsupported operation classes.

Do not grant or alter actual sandbox mode.

---

## 22. Implement A3 deterministic merge

Add a risk-engine function equivalent to:

`mergeEvidenceAssessment(...)`

A3 must:

- create new assessment id;
- preserve execution id;
- use the evidence-enriched immutable context id;
- supersede latest A1/A2;
- preserve Judge provenance/model/dimensions where Evidence does not override;
- add Evidence provenance;
- preserve authorization verdict;
- preserve necessity verdict;
- preserve alternatives;
- update evidence-quality dimension;
- apply frozen minimum-scope privilege rule;
- append bounded static AUTHORITATIVE evidence findings;
- resolve only actually resolved uncertainties;
- keep checkpoint/recovery uncertainty if unresolved;
- recompute aggregate recommendation.

Risk rule:

```text
A3 may preserve or raise existing hazard.
A3 must not lower an accepted hard/deterministic hazard merely because evidence is reassuring.
```

Outside-workspace mutation must be able to raise hazard to at least HIGH.

---

## 23. A3 evidence findings

Implement bounded static findings for at least:

- confirmed outside-workspace mutation;
- confirmed path alias;
- package lifecycle scripts.

Do not put raw paths/content in finding title/detail.

Use static text.

Evidence finding strength:

`AUTHORITATIVE`

Do not label a symlink/alias as malicious.

---

## 24. Evidence-quality implementation

Implement the frozen HIGH/MEDIUM/LOW policy.

Do not leave all A3 assessments hard-coded to MEDIUM.

Proof must include:

- HIGH complete non-mutating scope evidence;
- MEDIUM mutating scope/Git evidence with checkpoint capability unavailable;
- LOW degraded/failed material scope evidence.

Evidence quality does not modify Authorization/Necessity by itself.

---

## 25. Update Assessment Coordinator lifecycle

Extend the existing Assessment Coordinator rather than introducing a second independent approval-assessment registry.

Expected behavior:

- capture A1 as today;
- keep Fast Judge behavior;
- after Judge terminal/no-Judge decision, evaluate evidence trigger;
- if triggered, set stage=evidence and enqueue one Evidence job;
- if not triggered, stage=complete;
- on material Evidence completion, publish A3;
- on non-material terminal completion, keep latest A1/A2 and set complete;
- on native outcome, abort Evidence and fence A3;
- Session disposal clears Evidence records/raw seed;
- plugin disposal drains Evidence.

Do not reopen an already resolved Native Approval.

---

## 26. Browser Bridge V3

Add strict V3 contract.

Do not modify strict V1/V2 parser behavior.

V3:

```text
schemaVersion = 3
status vocabulary same as V2
stage = rules | fast | evidence | complete
```

Ready V3 may carry the same bounded OperationPresentationV1, BrowserRiskAssessmentV1 and FailureContextPresentationV1.

If implementing BrowserEvidenceSummaryV1:

- follow the Architecture Freeze exactly;
- no path/content/Git text;
- strict exact-key parse;
- bounded integer counts.

Extend Browser-safe reason codes only with a closed V3 set.

No arbitrary Host EvidenceReasonCode forwarding.

---

## 27. Client/store V3

Update presentation store to accept both V2 and V3.

Polling:

```text
V2 fast -> poll
V2 complete -> stop

V3 fast -> poll
V3 evidence -> poll
V3 complete -> stop
```

Keep:

- 1000ms poll interval;
- existing NOT_FOUND grace;
- no overlapping requests;
- stale generation fencing;
- connection reset semantics;
- unmount/dispose cleanup.

Do not speed up polling for Evidence.

---

## 28. UI

Keep Risk Advisor advisory-only.

No Use/Execute/Apply button.

No Approval action.

At minimum, A3 changes must remain visible through the existing assessment dimensions/findings/uncertainties.

If adding a V3 evidence summary UI:

- show only sanitized booleans/status/counts;
- no raw target;
- no file content;
- no Git text;
- no secret-derived data.

Preserve Native Approval panel behavior exactly.

---

## 29. Non-interference/static gate

Add a Phase-8 direct boundary test proving product source contains no:

- `PendingApproval.answer`;
- Native Approval mutation;
- `conversation.composer` replacement;
- hidden evidence Tool registration;
- custom Risk Advisor Evidence Session event;
- Phase-9 Deep Judge implementation;
- generic recursive fs crawler;
- arbitrary config reader;
- raw evidence Browser field.

This is in addition to inherited Phase-7/P6 regressions.

---

## 30. Phase-8 focused suite

Add:

`test:p8`

Prefer grouped parameterized tests.

Suggested files:

```text
tests/p8-evidence-target.unit.spec.ts
tests/p8-evidence-collector.unit.spec.ts
tests/p8-git-evidence.integration.spec.ts
tests/p8-evidence-assessment.unit.spec.ts
tests/p8-lifecycle.integration.spec.ts
tests/p8-browser-v3.spec.ts
tests/p8-boundary.integration.spec.ts
```

Equivalent grouping is allowed.

The focused suite must cover every mandatory proof in the Architecture Freeze.

---

## 31. Phase-8 benchmark

Add:

```text
benchmarks/r5-phase8.mjs
tests/r5-phase8-benchmark-smoke.spec.ts
tests/r5-phase8-benchmark-full.spec.ts
```

and package scripts:

```text
bench:r5:p8:smoke
bench:r5:p8
```

Use disposable local filesystem/Git fixtures.

Exercise actual product Evidence collection logic, not hard-coded EvidenceSnapshot markers.

At minimum benchmark:

- inside canonical file;
- outside metadata;
- tracked clean;
- untracked;
- ignored;
- package manifest;
- over-limit config;
- directory/budget path;
- real local Git checker;
- real Evidence timeout ownership;
- saturation.

Label output:

```text
R5_PHASE8_LOCAL_EVIDENCE
LOCAL_EVIDENCE_ONLY
NETWORK_NOT_USED
PROVIDER_NOT_USED
REGISTRY_NOT_USED
GIT_REMOTE_NOT_USED
```

No fake "near size" based only on filename.

Record actual bytes/counts.

---

## 32. Phase-7 preservation gate

Before Full, rerun:

```text
test:p7
bench:r5:p7:smoke
bench:r5:p7
```

Phase 8 must not regress:

- ExpectedEffect lifecycle;
- VerificationScheduler;
- PostconditionVerifier;
- FailureChain;
- Git branch verifier;
- copy checker;
- real local Phase-7 benchmark.

If a shared shell-analysis change breaks P7/P4, repair it before continuing.

---

## 33. Required validation sequence

Use exactly this order unless a failed gate requires a local repair/rerun.

1. Phase-8 focused `test:p8`
2. Phase-7 focused `test:p7`
3. Phase-7 benchmark smoke/full
4. Phase-6 `test:p6`
5. Phase-5 `test:p5`
6. Phase-4 `test:p4`
7. Phase-3 `test:p3`
8. Phase-2 `test:p2`
9. Phase-1A `test:p1a`
10. Phase-1B `test:p1b`
11. Phase-1C `test:p1c`
12. R1
13. R2
14. R3
15. R4
16. R5
17. `pnpm typecheck`
18. `pnpm run build`
19. Host export smoke
20. Client export smoke
21. root declaration/private-export audit
22. `pnpm pack --dry-run --json`
23. `git diff --check`
24. scope/privacy/secret audit
25. no-provider/no-network/no-registry/no-Git-remote audit
26. no-custom-Session-event/deprecated-reader audit
27. Harness tracked mutation = 0
28. Phase-8 benchmark smoke
29. Phase-8 benchmark full

Do not run the complete `pnpm test` before the exact executable commit is created.

---

## 34. Executable commit and one fresh Full

After every pre-Full gate passes:

1. stage only intended Phase-8 executable/source/test/package/benchmark files;
2. verify no protected drift is staged;
3. commit;
4. record the exact executable/Tested SHA;
5. verify working tree contains no intended executable drift;
6. run exactly one fresh complete:

`pnpm test`

on that exact SHA.

If it fails:

- preserve the failed Full evidence;
- fix only Phase-8 frozen scope;
- rerun affected pre-Full gates;
- commit a new executable SHA;
- run a fresh complete Full on the new exact SHA.

Do not claim the failed SHA as Tested.

---

## 35. Post-Full freeze

After a passing fresh Full:

Forbidden:

- source change;
- test change;
- package.json change;
- tsconfig/build config change;
- benchmark change;
- semantic generated artifact change.

Allowed:

- `docs/tasks/Phase8-evidence-collector/Execution_Report.md` only.

If an executable semantic change is required after Full, create a new executable SHA and rerun a fresh Full.

---

## 36. Execution Report

Create/update:

`docs/tasks/Phase8-evidence-collector/Execution_Report.md`

Report at minimum:

- task-start SHA;
- architecture freeze SHA;
- executable/Tested SHA;
- final remote/report SHA;
- changed executable files;
- EvidenceTargetSeed lifecycle proof;
- budgets;
- canonical containment/symlink proof;
- outside-content fence;
- directory bound;
- config read bound;
- local Git proof;
- checkpoint negative-capability proof;
- Git-backed positive reversibility proof;
- minimum privilege proof;
- A3 supersession/Judge preservation;
- evidence-quality boundaries;
- Browser V3 lifecycle;
- Native Approval non-interference;
- capability detach/dispose quiescence;
- P8 focused count;
- all inherited regression counts;
- P7 benchmark results;
- P8 benchmark results;
- static/export/declaration/pack/privacy results;
- provider/model calls 0;
- external network 0;
- registry 0;
- external Git remote 0;
- Harness mutation 0;
- custom Session events 0;
- exact fresh Full count;
- Tested -> report docs-only proof;
- Phase 9 not started.

Do not create Acceptance Report.

---

## 37. Publication

After report-only commit:

- push `main`;
- fetch;
- verify remote;
- verify:

```text
HEAD == origin/main == git ls-remote origin refs/heads/main
```

Verify:

```text
Tested SHA -> final remote SHA
```

contains only the Phase-8 Execution Report / allowed docs evidence.

Return only:

`PHASE8_PUBLISHED_READY_FOR_REVIEW`

plus the compact evidence summary normally used for review.

---

## 38. STOP conditions

Stop with:

`PHASE8_ARCHITECTURE_DECISION_REQUIRED`

if implementation requires:

- Harness Core modification;
- fake checkpoint evidence;
- Session durability interpreted as rollback;
- generic recursive filesystem crawl;
- arbitrary config reading;
- raw file/config retention;
- raw canonical-path Browser/public exposure;
- second shell parser;
- external Git/network/registry call;
- hidden Evidence Tool;
- verifier/evidence Approval;
- Authorization change from fs/Git evidence;
- Necessity change from fs/Git evidence;
- model/provider call in Phase 8;
- Deep Judge/Phase 9;
- in-place semantic mutation of Bridge V2;
- inability to fence/drain Evidence capability work.

Unknown/fail-closed is preferred to invented certainty.
