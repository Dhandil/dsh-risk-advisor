# Phase 8 Architecture Freeze — Bounded Evidence Collector

## 0. Freeze outcome

`PHASE8_ARCHITECTURE_FROZEN_READY_FOR_IMPLEMENTATION_INSTRUCTIONS`

Phase 8 implements a bounded, read-only Evidence Collector that enriches the existing Risk Advisor assessment pipeline.

Accepted starting point:

- Phase-7 executable baseline: `366305d342e3cae197cc19df8de5c434a163b82b`
- Phase-7 acceptance publication: `946544d7462513c877f88016775da012fe326cab`
- Phase-8 Preflight: `a66fdbc9419179e7e6b07d519fa8708cd2943d91`
- pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`

This freeze is authoritative for the Phase-8 implementation task.

---

## 1. Non-negotiable role boundary

Phase 8 is:

```text
read-only evidence acquisition
+ deterministic evidence normalization
+ deterministic assessment supersession
```

Phase 8 is not:

```text
Deep Judge
approval authority
hidden Tool
rollback executor
generic workspace crawler
generic file-content context builder
persistent audit store
```

Native Approval remains the only approval authority.

The Evidence Collector never returns an ApprovalOutcome and never calls `PendingApproval.answer()`.

---

## 2. Pipeline position

Freeze the assessment pipeline as:

```text
approval/asked
  -> A1 deterministic rules
  -> optional A2 Fast Judge
  -> Phase-8 trigger decision
      -> no evidence needed -> complete
      -> evidence needed -> bounded Evidence collection
          -> no material evidence -> complete
          -> material evidence -> A3 evidence assessment
  -> complete
```

Evidence collection never blocks the Native Approval request or UI.

A3 is allowed for the first time in Phase 8.

Phase-7's "no A3" condition was a Phase-7 scope boundary and is now intentionally superseded for Phase 8 only.

---

## 3. Stage lifecycle

Introduce the Host pipeline stage:

```ts
type AssessmentPipelineStage =
  | 'rules'
  | 'fast'
  | 'evidence'
  | 'complete'
```

Semantics:

- `rules`: bound record exists and A1 construction/publication is in progress;
- `fast`: A1 exists and a valid Fast Judge attempt may still publish A2;
- `evidence`: the latest A1/A2 exists and a Phase-8 evidence job may still publish A3;
- `complete`: no future A2 or A3 may publish for this approval generation.

Rules:

- Judge disabled/no eligible dimensions/terminal Judge failure -> run Phase-8 trigger;
- valid A2 -> run Phase-8 trigger against the latest A2;
- evidence trigger false -> complete;
- evidence terminal with no material update -> complete;
- evidence A3 publish -> complete;
- native approval decision -> cancelled/closed and fences both A2 and A3;
- Session/plugin disposal -> abort, drain and clear retained Phase-8 state.

Do not repurpose the Phase-6 `fast` meaning.

---

## 4. Browser protocol evolution

Phase-6 Bridge V2 is frozen and must remain parse-compatible and semantically unchanged.

Introduce:

```ts
interface RiskAdvisorBridgeViewV3 {
  readonly schemaVersion: 3
  // same bounded identity/status/presentation fields as V2
  readonly stage: 'rules' | 'fast' | 'evidence' | 'complete'
}
```

V3 otherwise reuses the accepted Browser-safe DTOs unless an additive sanitized evidence summary is implemented under the bounds below.

Requirements:

- V1 parser behavior unchanged;
- V2 parser behavior unchanged;
- V3 strict exact-key parser;
- Client accepts V2 and V3;
- Client polls a ready V3 while stage is `fast` or `evidence`;
- Client stops polling on `complete`;
- Native Approval lifecycle remains independent.

Do not mutate `OperationPresentationV1` in place.

Its pre-Evidence fields remain:

```text
workspaceContained = 'unknown'
sandboxCovered = 'unknown'
reversible = 'unknown'
```

A3 evidence is surfaced through assessment findings/reasons/uncertainties and, if implemented, a separately versioned sanitized evidence summary.

---

## 5. Phase-8 trigger

Evidence collection is eligible only when both clauses are true.

### Clause A — investigation trigger

At least one:

```text
latest.dimensions.evidenceQuality.verdict == LOW
latest.aggregate.recommendation == NEED_MORE_INFORMATION
```

### Clause B — locally resolvable uncertainty

At least one unresolved fact belongs to the Phase-8 supported domain:

```text
CANONICAL_TARGETS_UNAVAILABLE
RECOVERY_EVIDENCE_UNAVAILABLE
MINIMUM_PRIVILEGE_UNRESOLVED
workspace containment unknown
path-alias evidence missing
version-control evidence missing
```

Do not run filesystem/Git evidence merely because:

```text
AUTHORIZATION_SEMANTICS_UNRESOLVED
NECESSITY_UNRESOLVED
```

when no local read-only fact can resolve the question.

---

## 6. EvidenceTargetSeed

Introduce a Host-private raw target seed captured at `tools/pre-execute`.

Example private shape:

```ts
interface EvidenceTargetSeed {
  readonly executionId: ExecutionId
  readonly session: Session
  readonly toolName: string
  readonly operationClass:
    | 'direct-file'
    | 'simple-shell-file'
    | 'git-workspace'
    | 'package-workspace'
    | 'workspace-only'
    | 'unsupported'
  readonly requestedPaths: readonly string[]
  readonly exactTargetCount: boolean
  readonly explicitWorkdir: boolean
  readonly packageRelevant: boolean
  readonly requestedPermission?: 'workspace-write' | 'danger-full-access'
}
```

This shape is illustrative; implementation may use equivalent private types.

Frozen lifecycle:

```text
TTL = 5 minutes
max raw seeds per Session = 128
max raw seeds global = 512
max requested paths per seed = 8
one-shot consume for evidence collection
Session disposal clears all raw paths
plugin disposal clears all raw paths
```

Every removal path must clear every raw lookup index, including object-keyed indexes.

No raw seed is exposed through:

- root exports;
- Browser DTO;
- diagnostics;
- report serialization;
- Session events.

---

## 7. Target extraction authority

Direct tools:

```text
read  -> file_path
write -> file_path
edit  -> file_path
```

Only strict own data properties are read.

Unknown/accessor/proxy/oversized/malformed arguments fail closed.

Shell target extraction must reuse the existing shared `shell-analysis.ts` authority.

No second parser.

Phase-8 V1 may recognize only exact static forms whose operand identity is proven.

Initial frozen path subset:

### Bash

```text
mkdir TARGET
mkdir -p TARGET
cp SOURCE DEST
rm TARGET...
rm -r TARGET...
rm -R TARGET...
rm -rf TARGET...
rm -fr TARGET...
```

For `rm`:

- only the explicitly recognized recursive/force flag forms above;
- optional literal `--` separator may be supported if executable-proven;
- all remaining operands must be static non-option paths;
- max 8 targets;
- wildcard/expansion/dynamic/chained forms are ineligible.

### PowerShell

```text
mkdir TARGET
Copy-Item SOURCE DEST
```

Remove-Item target evidence is deferred unless exact parameter/alias semantics are proven without widening the shared parser.

### Git/package

For:

```text
git checkout/switch...
npm/pnpm install/add...
```

Phase 8 may collect workspace-level Git/package evidence, but must not claim a file target from the command unless separately proven.

---

## 8. Explicit shell workdir rule

If a shell execution contains an explicit model `workdir`, Phase-8 V1 does **not** issue hard canonical-target evidence for command operands.

Reason:

the pinned Harness shell tool owns exact workdir resolution, including Session cwd and sandbox-policy workspace identity.

Phase 8 must not copy a private helper and silently assume equivalent execution-world behavior.

Allowed behavior for explicit workdir:

- record a static `EXPLICIT_WORKDIR_UNRESOLVED` reason;
- retain target facts as unknown;
- do not claim workspace containment;
- do not derive minimum privilege from those path operands.

A future phase may support this only after a public exact workdir-resolution seam exists or an architecture repair explicitly freezes a proven equivalent.

---

## 9. Workspace root

For Phase 8 V1:

```text
workspace root = approval-bound session.header.cwd
```

Requirements:

- non-empty bounded string;
- resolve it through `ctx.fs.resolve`;
- the resulting `FsTarget` is the canonical workspace target;
- absence/failure -> workspace evidence unavailable;
- never fall back to process.cwd() for a live approval-bound Session.

The raw canonical root path is not retained in EvidenceSnapshot.

---

## 10. Filesystem evidence recipe

For each exact requested target, subject to budgets:

1. `ctx.fs.lstat(requestedPath, {cwd: session.header.cwd}, signal)`
   - observe final-component symlink/regular/directory/other/absent;
2. `ctx.fs.resolve(requestedPath, {cwd: session.header.cwd, signal})`
   - obtain canonical target identity;
3. `ctx.fs.stat(target, signal)`
   - observe canonical target type/size/absence;
4. `ctx.fs.contains(workspaceTarget, target)`
   - prove canonical workspace containment.

Rules:

- `contains=true` is authoritative inside-workspace evidence;
- `contains=false` is authoritative outside-workspace evidence;
- resolve/stat/lstat disagreement or provider error -> unknown/partial;
- symlink final component -> pathAliasObserved=true;
- parent alias escape may be detected through canonical containment even if final lstat is not a symlink;
- never parse `targetKey`;
- never compare raw path strings to decide containment.

Outside-workspace targets:

- metadata needed for containment may be observed;
- no file-content read;
- no directory listing;
- no config read.

---

## 11. Directory evidence

Directory listing is optional and evidence-question-driven.

Rules:

- only exact workspace-contained directory targets;
- one level only;
- no recursive traversal;
- retain at most 200 entries worth of evidence;
- if provider returns more than 200 entries, mark `DIRECTORY_TRUNCATED`;
- do not retain arbitrary child names.

Retained directory facts may include only bounded aggregates / closed-name presence, e.g.:

```text
observedEntryCount
truncated
packageJsonPresent
gitIgnorePresent
```

No workspace inventory is exposed to Browser or model context.

---

## 12. Small config reads

V1 config reads are closed to:

```text
package.json
```

and only when package/install evidence is relevant.

Requirements:

- workspace-contained;
- regular file;
- unsupported symlink -> no content read;
- complete `readBytes` with max 64 KiB;
- >64 KiB -> unknown / FILE_TOO_LARGE;
- valid UTF-8 / JSON parse required for semantic facts;
- malformed data -> unknown;
- no accessor/prototype surprises after JSON parse;
- no script body retention;
- no dependency-name retention in EvidenceSnapshot.

Allowed derived facts:

```text
packageManifestPresent
packageManifestValid
packageManagerDeclared
lifecycleScriptsPresent
dependencyCount (bounded)
devDependencyCount (bounded)
```

Lifecycle script names to treat specially:

```text
preinstall
install
postinstall
prepare
```

The contents are untrusted data, not instructions.

---

## 13. .gitignore semantics

Do not implement Git ignore semantics by parsing `.gitignore`.

Phase 8 may observe that a `.gitignore` file exists.

Whether an exact path is ignored must come from the bounded local Git checker.

Global excludes and nested ignore files make home-grown ignore interpretation non-authoritative.

---

## 14. Git evidence checker

Git evidence uses `ctx.shell.resolve/run` through one product-owned closed checker.

Preferred design:

```text
fixed node -e checker
  -> receives workspace/target process paths only as environment data
  -> invokes local git with argv arrays
  -> emits closed bounded JSON booleans
```

No operation-controlled path is interpolated into shell syntax.

The checker may derive for each target:

```text
repositoryAvailable
tracked
ignored
clean
```

It must not emit:

- repository root path;
- target path;
- Git stdout/stderr;
- remote names/URLs;
- config values.

Hardening:

```text
GIT_TERMINAL_PROMPT=0
GIT_OPTIONAL_LOCKS=0
GIT_PAGER=cat
PAGER=cat
NO_COLOR=1
CI=1
```

Use local-only Git commands.

If `git diff` is used for clean/dirty evidence:

- disable external diff;
- disable textconv;
- disable fsmonitor where applicable.

Never run:

```text
fetch
pull
push
ls-remote
remote get-url
credential helpers
submodule network operations
```

No Git remote calls are allowed in implementation/tests/benchmark.

Malformed/oversized/partial checker output -> unknown.

---

## 15. Execution-world mapping for Git

Git checker workdir must be derived from:

```ts
ctx.fs.processPath(workspaceTarget)
```

because `processPath` is the public filesystem execution-world coordinate intended for OS/subprocess consumers.

Target process paths passed to the checker must likewise come from `ctx.fs.processPath(target)`.

The checker itself computes target-relative path semantics in its execution world.

Do not use Host lexical `path.relative` over arbitrary provider coordinates before entering that execution world.

If `processPath` or shell execution cannot establish the same observable workspace, Git evidence becomes unknown.

---

## 16. Checkpoint evidence

Freeze for the pinned Harness:

```text
checkpointAvailable = unknown
reason = CHECKPOINT_CAPABILITY_UNAVAILABLE
```

Do not treat as workspace rollback evidence:

- session/flush;
- persistence flush;
- projection checkpoints;
- compaction checkpoints;
- process checkpoints.

If implementation discovers a real public workspace rollback/checkpoint service at the exact pinned Harness SHA, STOP with:

`PHASE8_ARCHITECTURE_DECISION_REQUIRED`

before using it.

---

## 17. EvidenceSnapshotV1

Retained evidence is sanitized and path-free.

Freeze a shape equivalent to:

```ts
type EvidenceCollectionStatus =
  | 'COMPLETE'
  | 'PARTIAL'
  | 'UNAVAILABLE'
  | 'CANCELLED'

interface EvidenceSnapshotV1 {
  readonly schemaVersion: 1
  readonly evidenceId: string
  readonly executionId: string
  readonly status: EvidenceCollectionStatus
  readonly observedAt: number

  readonly facts: {
    readonly targetCountKnown: boolean
    readonly canonicalTargetsKnown: boolean | 'unknown'
    readonly workspaceContained: boolean | 'unknown'
    readonly pathAliasObserved: boolean | 'unknown'

    readonly versionControlled: boolean | 'unknown'
    readonly exactTargetsClean: boolean | 'unknown'

    readonly checkpointAvailable: boolean | 'unknown'
    readonly rollbackMechanismKnown: boolean | 'unknown'

    readonly packageManifestPresent: boolean | 'unknown'
    readonly packageManifestValid: boolean | 'unknown'
    readonly lifecycleScriptsPresent: boolean | 'unknown'
  }

  readonly counts: {
    readonly evidenceItems: number
    readonly fileReads: number
    readonly evidenceChars: number
    readonly directoryEntries: number
  }

  readonly truncated: boolean
  readonly reasonCodes: readonly EvidenceReasonCode[]
}
```

Equivalent additional bounded booleans/counts are allowed if needed by the frozen recipes.

Not allowed in the retained snapshot:

- raw path;
- canonical path;
- FsTarget/FsTargetKey;
- raw config;
- raw Git text;
- directory names;
- secret material.

Snapshot objects are immutable/deep-frozen.

---

## 18. Evidence reason vocabulary

Use a closed static vocabulary.

At minimum support:

```text
WORKSPACE_UNAVAILABLE
FS_CAPABILITY_UNAVAILABLE
TARGET_PLAN_UNAVAILABLE
EXPLICIT_WORKDIR_UNRESOLVED
TARGET_RESOLVE_FAILED
TARGET_METADATA_UNAVAILABLE
DIRECTORY_TRUNCATED
FILE_TOO_LARGE
CONFIG_INVALID
GIT_CAPABILITY_UNAVAILABLE
GIT_REPOSITORY_UNAVAILABLE
GIT_RESULT_UNSUPPORTED
CHECKPOINT_CAPABILITY_UNAVAILABLE
EVIDENCE_ITEM_LIMIT
FILE_READ_LIMIT
EVIDENCE_CHAR_LIMIT
DIRECTORY_ENTRY_LIMIT
EVIDENCE_QUEUE_SATURATED
EVIDENCE_TIMEOUT
EVIDENCE_ABORTED
CAPABILITY_GENERATION_CHANGED
NATIVE_OUTCOME_OBSERVED
```

Do not retain provider error text.

---

## 19. Evidence budgets

Freeze:

```text
maxEvidenceItems = 20
maxFileReads = 5
maxFileBytes = 64 * 1024
maxTotalEvidenceChars = 64 * 1024
maxDirectoryEntries = 200

maxRequestedTargets = 8

evidenceTimeoutMs = 5000
maxConcurrentEvidenceJobs = 2
maxPendingEvidenceJobs = 8
```

Limits are hard and non-configurable in Phase 8 V1.

When a budget would be exceeded:

- stop collecting that branch;
- mark PARTIAL where appropriate;
- emit static reason code;
- never silently truncate a fact into a hard true/false claim.

---

## 20. Scheduler semantics

The Evidence scheduler must own underlying work exactly like the accepted Phase-7 verifier scheduler discipline.

On timeout:

1. publish logical timeout/partial terminal state at most once;
2. abort the job signal;
3. retain the active concurrency slot;
4. retain the underlying Promise;
5. do not pump replacement work into that slot until underlying settlement;
6. drain/join all owned work on detach/dispose.

Queue saturation produces bounded unavailable evidence and never blocks Native Approval.

One execution/approval generation gets at most one active Evidence job.

Duplicate enqueue never creates competing A3 writers.

---

## 21. Capability generation fencing

Evidence uses at least:

- `ctx.fs`;
- optionally `ctx.shell` for Git.

Each capability generation is fenced.

If fs/shell detaches or is replaced while evidence is active:

- abort old work;
- prevent old-generation facts from publishing A3;
- await drain before accepting replacement-generation publication;
- no stale capability object may be used.

Phase-7 PostconditionVerifier keeps its own accepted shell-generation lifecycle; Phase 8 must not weaken or couple it unsafely.

---

## 22. Sanitized EvidenceStore lifecycle

Retained EvidenceSnapshot lifecycle:

```text
TTL = 5 minutes
max per Session = 128
max global = 512
```

Session disposal deletes its snapshots.

Plugin disposal clears all snapshots.

Capacity eviction is deterministic oldest-first and never exposes raw seed state.

A future Phase 9 may consume this sanitized store; Phase 8 does not invoke a model.

---

## 23. Evidence feature overlay

Create a new immutable RiskContext snapshot for A3 by overlaying only facts the collector proves.

Allowed authoritative feature updates include:

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

Rules:

- evidence-derived features use `source='AUTHORITATIVE'`;
- unknown stays unknown;
- `checkpointAvailable` stays unknown under the pinned no-capability result;
- do not mutate the A1/A2 context object;
- do not mutate the RuleEvaluation object;
- do not modify historical A1/A2 assessments.

---

## 24. Reversibility policy

Phase 8 may prove `rollbackMechanismKnown=true` and `recovery.reversible=true` only for a narrowly closed case.

Initial positive case:

```text
direct write/edit
+ exact single target
+ canonical target inside workspace
+ target is Git tracked
+ exact target clean before operation
+ no remote/system/external effect
+ Git checker complete
-> rollbackMechanismKnown = true
-> reversible = true
```

A separate Harness checkpoint is still:

```text
checkpointAvailable = unknown
```

Do not generalize positive reversibility to:

- package install;
- arbitrary shell command;
- recursive delete;
- dirty tracked target;
- untracked destructive target;
- remote mutation;
- system mutation;
- ambiguous target set.

For those, reversible remains false only when deterministically proven false by existing hard semantics; otherwise unknown.

---

## 25. Minimum privilege policy

Phase 8 may deterministically establish minimum local scope only for a closed operation class.

Eligible:

```text
direct write/edit
simple static mkdir/cp
all exact mutation targets canonicalized
all exact mutation targets inside workspace
no external/network/system/permission side effect
no explicit workdir ambiguity
```

Then:

- requested `danger-full-access` -> privilege `EXCESSIVE`;
- requested `workspace-write` -> privilege `PROPORTIONATE`.

Do not claim minimum scope for:

- package install;
- Git branch mutation;
- arbitrary shell;
- unknown/dynamic shell;
- explicit-workdir shell;
- operation with external/network/system findings.

Evidence Collector never grants authority. It only describes whether the requested authority appears wider than the proven local target scope.

---

## 26. Evidence risk findings

A3 may add static AUTHORITATIVE findings.

At minimum:

### Confirmed outside-workspace mutation

```text
code = EVIDENCE_OUTSIDE_WORKSPACE
dimension = RISK
severity = SERIOUS
strength = AUTHORITATIVE
```

Risk may be elevated to at least HIGH.

### Confirmed path alias

```text
code = EVIDENCE_PATH_ALIAS
dimension = EVIDENCE_QUALITY or RISK depending on containment consequence
strength = AUTHORITATIVE
```

Alias alone must not be called malicious.

### Package lifecycle scripts

For a recognized package-install mutation with a valid manifest proving lifecycle hooks:

```text
code = PACKAGE_LIFECYCLE_SCRIPTS_PRESENT
dimension = RISK
severity = WARNING
strength = AUTHORITATIVE
```

Do not include script bodies.

Evidence can elevate or preserve risk; it must not lower an accepted hard rule finding.

---

## 27. Evidence quality policy

A3 Evidence Quality is deterministic.

### HIGH

Allowed only when:

- target plan is complete for the supported operation;
- workspace/canonical target facts are complete;
- no relevant collection branch is truncated/failed;
- operation does not require unresolved recovery evidence.

Typical positive case: bounded non-mutating exact local file operation with complete scope evidence.

### MEDIUM

Use when material structural evidence is proven but one relevant domain remains unresolved, e.g.:

- mutating operation with canonical/Git evidence but no workspace checkpoint capability.

### LOW

Use when:

- baseline context is degraded; or
- required target/workspace evidence failed; or
- material budget/capability failure prevents reliable scope evidence.

Evidence Quality HIGH does not mean Authorization/Necessity are known.

---

## 28. A3 merge policy

Introduce a deterministic function equivalent to:

```ts
mergeEvidenceAssessment(
  latest: RiskAssessment,
  baseContext: RiskContextSnapshot,
  evidenceContext: RiskContextSnapshot,
  snapshot: EvidenceSnapshotV1,
  assessmentId: string,
  createdAt: number,
): RiskAssessment
```

Rules:

- `supersedesAssessmentId = latest.assessmentId`;
- preserve Judge provenance if latest is A2;
- add Evidence provenance;
- authorization dimension unchanged;
- necessity dimension unchanged;
- alternatives unchanged except existing data;
- risk can stay or increase, never be lowered below an existing hard/deterministic hazard;
- privilege may be replaced only by the closed authoritative minimum-scope rule;
- evidenceQuality recomputed from Evidence;
- findings append only bounded static evidence findings;
- resolved evidence uncertainties are removed;
- unresolved checkpoint/recovery facts stay explicit;
- Judge hypotheses remain hypotheses unless independently proven by Phase-8 facts;
- aggregate recommendation is recomputed locally from the merged dimensions.

Evidence never changes a user-authorization verdict based on filesystem/Git facts.

---

## 29. Evidence provenance

Extend Host RiskAssessment provenance additively:

```ts
evidence?: {
  readonly invoked: true
  readonly evidenceId: string
  readonly status: EvidenceCollectionStatus
  readonly itemCount: number
}
```

A1/A2 omit it.

A3 includes it.

Browser projection may expose only a sanitized boolean/count/status if V3 explicitly defines it; it must not expose the internal evidence id if not needed.

---

## 30. Browser-safe V3 evidence presentation

V3 may add an optional sanitized summary:

```ts
interface BrowserEvidenceSummaryV1 {
  readonly status: 'COMPLETE' | 'PARTIAL'
  readonly workspaceContained: boolean | 'unknown'
  readonly canonicalTargetsKnown: boolean | 'unknown'
  readonly versionControlled: boolean | 'unknown'
  readonly checkpointAvailable: boolean | 'unknown'
  readonly pathAliasObserved: boolean | 'unknown'
  readonly itemCount: number
  readonly truncated: boolean
}
```

No paths, names, target ids, file contents or Git text.

If implementation chooses not to add this summary, A3 findings/reasons must still make evidence-backed changes visible.

V3 reason codes use a closed safe subset. Do not forward arbitrary EvidenceReasonCode/provider errors.

---

## 31. No custom Session evidence event

Phase 8 evidence is process-local advisory state.

Do not add:

```text
risk-advisor/evidence
risk-advisor/assessment
```

or another custom Risk Advisor Session event.

Evidence does not become Session durability truth.

---

## 32. No generic model context expansion

Phase 8 does not send evidence to an LLM.

It also does not enlarge Fast Judge input with raw Evidence content.

Phase 9 owns any future Deep Judge evidence payload design.

No provider/model calls are added by Phase 8.

---

## 33. Package/dependency freeze

Add public contract dependency only:

```json
peerDependencies:
  "@deepseek-ai/dsh-fs": ">=0.1.6-alpha.2"

devDependencies:
  "@deepseek-ai/dsh-fs": "0.1.6-alpha.2"
```

Do not add a published dependency on:

- fs-local;
- fs-sandbox;
- private Harness package internals.

Tests/benchmark may use already available local fixtures, but implementation imports only public service contracts.

No registry call is authorized during validation.

---

## 34. Public API/root export boundary

Do not root-export raw EvidenceTargetSeed or raw collector internals.

Allowed root exports are sanitized public types only if needed:

- EvidenceSnapshot diagnostic type;
- EvidenceCollectionStatus;
- closed reason-code type.

Prefer keeping collection mechanics Host-private.

No canonical/raw paths enter public declaration output.

---

## 35. Performance / benchmark contract

Phase 8 needs a bounded local evidence benchmark.

It must exercise product collection logic over disposable local fixtures for at least:

- inside-workspace file;
- outside-workspace target metadata;
- tracked clean file;
- untracked file;
- ignored file;
- package.json under 64 KiB;
- package.json >64 KiB fail-closed;
- directory truncation/budget path;
- Git local checker;
- scheduler timeout;
- queue saturation.

No hard sub-second latency target is invented.

Record observed local latency.

Acceptance requires:

- every run respects budgets;
- no work exceeds the logical 5s evidence timeout without publishing timeout;
- timed-out underlying work remains owned until settlement;
- provider/network/registry/Git-remote calls = 0.

Use actual disposable files/Git repository where practical.

---

## 36. Mandatory focused proof

At minimum Phase-8 focused tests must prove:

### Raw target seed

1. direct read/write/edit target capture;
2. static shell subset capture;
3. expansion/chaining/wildcard rejected;
4. explicit shell workdir disables hard target evidence;
5. hostile getters/proxies not invoked;
6. TTL/session/take/dispose raw cleanup;
7. per-Session 128/global 512 bounds.

### Filesystem evidence

8. canonical inside workspace;
9. canonical outside workspace;
10. final symlink/path alias;
11. missing target;
12. provider/access failure -> unknown;
13. outside target content never read;
14. listDir one-level and 200 retained-entry bound;
15. no recursive traversal;
16. package.json valid derived facts;
17. package.json malformed -> unknown;
18. package.json exact 64 KiB boundary behavior;
19. >64 KiB -> unknown;
20. no raw content/path in snapshot.

### Git evidence

21. local repo available;
22. tracked clean;
23. tracked dirty;
24. untracked;
25. ignored;
26. malformed checker output -> unknown;
27. output bound;
28. no target interpolation;
29. no remote calls;
30. no raw path/stdout retained.

### Checkpoint/recovery

31. Session flush/projection/compaction facts never become checkpointAvailable;
32. checkpointAvailable remains unknown under pinned capability set;
33. tracked+clean direct write/edit positive rollback case;
34. dirty/untracked/package/recursive cases do not get false reversible=true.

### Assessment/A3

35. trigger false when only semantic authorization/necessity unknown is locally unresolvable;
36. trigger true for supported evidence gap + LOW/NEED_MORE_INFORMATION;
37. A3 supersedes latest A1;
38. A3 supersedes A2 and preserves Judge provenance;
39. authorization unchanged by evidence;
40. necessity unchanged by evidence;
41. existing hard hazard never lowered;
42. outside-workspace evidence can raise risk;
43. minimum-scope rule makes danger-full-access EXCESSIVE only in frozen closed class;
44. evidence quality HIGH/MEDIUM/LOW boundaries;
45. resolved canonical uncertainty removed;
46. checkpoint uncertainty retained.

### Lifecycle

47. native outcome aborts evidence and fences late A3;
48. Session dispose aborts/clears;
49. plugin dispose drains;
50. fs detach/replacement generation fence;
51. shell detach/replacement generation fence for Git;
52. timeout owns underlying job until settle;
53. max concurrency 2;
54. pending limit 8 / saturation deterministic.

### Browser V3

55. V1 parser regression;
56. V2 parser regression unchanged;
57. strict V3 parser;
58. ready evidence stage accepted;
59. client polls evidence stage;
60. client stops on complete A3;
61. stale V2/V3 response fencing unchanged;
62. V3 contains no raw evidence/path/config/Git output;
63. UI preserves Native Approval panel and advisory-only behavior.

### Non-interference

64. no PendingApproval.answer;
65. no conversation.composer replacement;
66. no hidden Evidence Tool;
67. no custom Risk Advisor Session evidence event;
68. no Phase-9 Deep Judge;
69. no Harness Core changes;
70. Phase-7 regressions and benchmark remain green.

Use parameterized tests. Do not inflate count with trivial one-assertion copies.

---

## 37. Validation order

Required pre-Full order:

```text
Phase-8 focused
-> Phase-7 focused
-> Phase-7 real-local benchmark smoke/full
-> Phase-6
-> Phase-5
-> Phase-4
-> Phase-3
-> Phase-2
-> Phase-1A/B/C
-> R1-R5/R4 affected regressions
-> typecheck
-> build
-> Host export smoke
-> Client export smoke
-> declaration/root-export audit
-> pnpm pack --dry-run --json
-> git diff --check
-> scope/privacy/secret audit
-> no-provider/no-network/no-registry/no-Git-remote audit
-> no-custom-Session-event/deprecated-reader audit
-> Harness tracked mutation = 0
-> Phase-8 bounded local evidence benchmark smoke/full
```

After all pre-Full gates pass:

1. commit all executable/source/test/package/benchmark changes;
2. record exact Phase-8 executable SHA;
3. run exactly one fresh complete `pnpm test` on that exact committed SHA.

If Full fails:

- preserve failure evidence;
- repair;
- rerun affected pre-Full gates;
- create a new executable SHA;
- run a new fresh Full on the new SHA.

After passing Full, no executable/test/config/package/benchmark semantic drift.

Only the execution report may change.

---

## 38. Publication

After a passing fresh Full, update only:

`docs/tasks/Phase8-evidence-collector/Execution_Report.md`

Record:

- task start SHA;
- executable/Tested SHA;
- Evidence budgets;
- target-seed lifecycle proof;
- filesystem/canonical containment proof;
- Git local evidence proof;
- checkpoint negative-capability proof;
- A3 merge proof;
- Browser V3 proof;
- lifecycle/quiescence proof;
- real local evidence benchmark;
- inherited Phase-7 benchmark/regressions;
- provider/model calls = 0;
- external network/registry/Git-remote calls = 0;
- Harness tracked mutations = 0;
- custom Session events = 0;
- exact fresh Full file/test count;
- Tested -> remote docs-only proof;
- Phase 9 not started.

Then push and verify:

```text
HEAD == origin/main == git ls-remote origin refs/heads/main
```

---

## 39. STOP conditions

Stop with:

`PHASE8_ARCHITECTURE_DECISION_REQUIRED`

if implementation would require:

- modifying Harness Core;
- inventing a workspace checkpoint from session durability;
- generic recursive filesystem traversal;
- reading arbitrary config files;
- retaining raw file/config content;
- retaining raw canonical paths in Browser/public diagnostics;
- a second shell parser;
- Git network access;
- package registry access;
- verifier/evidence Approval;
- hidden Evidence Tool;
- changing Authorization from filesystem/Git evidence;
- changing Necessity from filesystem/Git evidence;
- running a model in Phase 8;
- implementing Deep Judge / Phase 9;
- mutating frozen Bridge V2 semantics instead of introducing explicit V3;
- abandoning capability-generation fencing/quiescent disposal.

Unknown is preferred over fabricated certainty.
