# Risk Advisor — Product Phase 7: Known Postcondition Verification | Implementation Instructions

**Status:** READY FOR CODEX IMPLEMENTATION; this document does not authorize self-acceptance.  
**Date:** 2026-10-02  
**Task directory:** `docs/tasks/Phase7-known-postcondition-verification/`  
**Required starting checkpoint:** `fc0ed814e5f06e720f56a62eba19ce55100f6dd2` (`Phase7_Architecture_Freeze.md`).  
**Accepted pre-Phase-7 product baseline:** `3608b1ac8c3af41ba59722715ed091d8aa408daf`.  
**Last accepted executable SHA:** `9583e9318f56083dcce52bb171a0cb4488862faf`.  
**Accepted pre-Phase-7 complete regression:** 200 tests PASS.  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, STRICTLY READ-ONLY.  
**Final acceptance authority:** ChatGPT Web.

## 1. Startup gate

Before any executable edit:

1. Synchronize `Dhandil/dsh-risk-advisor` `main` safely.
2. Verify local HEAD contains exact Phase-7 Architecture Freeze commit:
   `fc0ed814e5f06e720f56a62eba19ce55100f6dd2`.
3. Record:
   - local HEAD;
   - `origin/main`;
   - `git ls-remote origin refs/heads/main`;
   - current branch;
   - complete `git status --short`.
4. Preserve all pre-existing tracked/untracked user drift exactly.
5. Do not use:
   - `reset --hard`;
   - `git clean`;
   - destructive checkout;
   - rebase over unrelated user work;
   - force push;
   - broad formatting outside touched scope.
6. Verify the pinned Harness identity:
   `ddefc45fbc7f8e46dd73185e68295696d1297887`.
7. Keep Harness strictly read-only. Do not modify, reset, clean, install into, build, commit or push Harness Core.
8. Read in full before coding:
   - `Phase7_Preflight.md`;
   - `Phase7_Architecture_Freeze.md`;
   - current `src/index.ts`;
   - `src/host/operation-foundation.ts`;
   - `src/host/explicit-failure.ts`;
   - `src/host/retry-escalation.ts`;
   - `src/host/rule-engine.ts`;
   - current Phase-6 presentation/browser files only to preserve non-interference;
   - current `package.json`.
9. Inspect the pinned public contracts actually used by this phase:
   - `@deepseek-ai/dsh-tools` `tools/pre-execute` / `tools/result`;
   - `@deepseek-ai/dsh-shell`;
   - `@deepseek-ai/dsh-sandbox-policy`;
   - pinned Bash/Pwsh tool workdir and result shapes;
   - pinned direct `write` / `edit` canonical result contracts.
10. Do not infer newer Harness behavior from upstream HEAD.

If the required freeze checkpoint is absent, or remote executable history advanced incompatibly, STOP with:

`PHASE7_START_BASELINE_MISMATCH`

If remote advanced only by docs/report evidence and remains compatible, record the proof and continue.

---

## 2. Implement exactly Product Phase 7

Implement only:

```text
ExpectedEffect capture
        ↓
Tool-Contract verification for direct write/edit
        ↓
closed shell Known Postcondition adapters
        ↓
bounded read-only shell-world verification scheduler
        ↓
VerificationRecordV1
        ↓
semanticSuccess true|false|unknown
        ↓
base execution outcome + verification overlay
        ↓
FailureChain semantic-failure refinement for future executions
```

Frozen adapter set:

```text
tool.write.v1
tool.edit.v1
shell.mkdir.v1
shell.copy-file.v1
git.branch-switch.v1
package.node-resolve.v1
```

Do not implement a generic verifier.

Unsupported/ambiguous/unsafe cases remain:

```text
semanticSuccess='unknown'
```

---

## 3. Explicitly prohibited Phase-7 scope

Do not implement:

- arbitrary filesystem investigation;
- generic `stat/list/read/realpath` evidence collection;
- path canonicalization;
- workspace-containment proof;
- sandbox-coverage proof;
- checkpoint/rollback/reversibility proof;
- generic Git state collector;
- generic package-manager verifier;
- registry/network verification;
- behavior-chain reasoning;
- Deep Judge;
- model-generated verifier code;
- Native Approval changes;
- A3 assessment;
- approval reopening;
- Browser historical semantic-outcome UI;
- custom Risk Advisor persistence;
- custom Risk Advisor Session events;
- deprecated Session history reads;
- Harness Core changes;
- Phase 8 or Phase 9 functionality.

Phase 8 owns general Evidence Collector behavior.

---

## 4. Expected source changes

Recommended new Host files:

```text
src/host/shell-analysis.ts
src/host/expected-effect.ts
src/host/postcondition-verifier.ts
src/host/verification-scheduler.ts
```

Expected existing edits:

```text
src/host/rule-engine.ts
src/host/explicit-failure.ts
src/host/retry-escalation.ts
src/index.ts
package.json
tests/*
benchmarks/*
docs/tasks/Phase7-known-postcondition-verification/Execution_Report.md   # only after final Full
```

Exact filenames may vary if a cleaner repository-local split is necessary.

Ownership boundaries may not vary:

- shell parser = package-private shared deterministic analysis;
- ExpectedEffect = Host-private ephemeral state;
- verifier scheduler = Host-only;
- VerificationRecord = sanitized bounded evidence;
- FailureChain = effective relation consumer, not verifier owner;
- Client/Browser = unchanged.

---

## 5. Preserve accepted engines unless Phase-7 integration requires a frozen change

The following accepted behavior must remain intact:

```text
Phase 1 execution identity/correlation
Phase 1B approval envelope authority
Phase 1C Browser additive seam
Phase 2 explicit failure/process outcome authority
Phase 3 retry/root-cause/permission-escalation bounds
Phase 4 deterministic rule semantics
Phase 5 six-dimension/P0-P9/Judge semantics
Phase 6 Browser presentation/lifecycle/UI
Native Approval ownership
```

Phase 7 is allowed to modify:

- `rule-engine.ts` only to extract/reuse the existing shell-analysis authority without semantic drift;
- `explicit-failure.ts` only to widen semantic outcome representation and add the frozen semantic-failure vocabulary;
- `retry-escalation.ts` only to implement the frozen base-outcome + verification overlay;
- `src/index.ts` only for Phase-7 wiring/lifecycle/optional shell capability.

If implementation requires changing Phase-4 risk findings, Phase-5 aggregation/recommendation, Phase-6 Browser protocol, or Native Approval semantics, STOP with:

`PHASE7_ARCHITECTURE_DECISION_REQUIRED`

---

## 6. Add one package-private shared shell-analysis authority

Current accepted Phase-4 shell parsing lives inside `rule-engine.ts`.

Extract only the reusable deterministic parsing facts into a package-private module, recommended:

`src/host/shell-analysis.ts`

The shared authority must preserve the accepted Phase-4 behavior for:

- top-level segmentation;
- quotes/escapes;
- `;`, `&&`, `||`, `|`, `&`, newline;
- pipeline relation;
- redirection ambiguity;
- substitution/backticks;
- environment assignments;
- transparent/privilege wrappers;
- dynamic/encoded execution;
- recognized action + args;
- parser ambiguity/degradation.

Both consumers use the same authority:

```text
Phase 4 RuleEngine
Phase 7 ExpectedEffect capture
```

Do not create a second parser inside `expected-effect.ts` or `postcondition-verifier.ts`.

Do not export parser/matcher/mutator functions from package root.

Before changing Phase-7 shell adapter logic, add a regression proving the extracted parser leaves existing Phase-4 RuleEvaluation outputs unchanged over the accepted P4 corpus.

---

## 7. Add ExpectedEffect capture after ExecutionId minting

Capture Phase-7 ExpectedEffect in the existing `tools/pre-execute` traversal after:

```text
ActiveExecutionIndex.observePreExecute()
→ ExecutionId exists
```

Do not add a second independent pre-execute listener whose correctness depends on listener order.

Recommended existing capture order becomes:

```text
foundation.capture(...)
failureChain.observePreExecute(...)
rules.observePreExecute(...)
expectedEffects.capture(...)
assessments.captureReviewerSeed(...)
```

Equivalent ordering is acceptable only if:

- the same ExecutionId is reused;
- Phase-3 and Phase-4 accepted semantics remain unchanged;
- ExpectedEffect capture never blocks native tool execution;
- capture faults are contained and fail closed.

Unknown/malformed input produces no authoritative ExpectedEffect.

---

## 8. ExpectedEffect hostile-input discipline

Use the accepted bounded-input discipline, not direct unsafe property access.

Required:

- exact tool-name allowlist;
- plain object or null-prototype object only;
- own data properties only;
- no inherited values;
- no getter/accessor invocation;
- bounded strings;
- bounded arrays only when explicitly needed;
- controlled nesting only;
- no arbitrary recursion;
- no unknown-tool raw traversal;
- malformed/over-budget input fails closed.

Do not persist raw arguments.

Do not retain an all-purpose bounded clone after adapter classification.

Use the existing Phase-4 limits where applicable; do not silently increase them to make a Phase-7 adapter work.

---

## 9. Implement the exact ExpectedEffectV1 adapter set

Use the exact adapter identifiers from Architecture Freeze:

```ts
type VerificationAdapterId =
  | 'tool.write.v1'
  | 'tool.edit.v1'
  | 'shell.mkdir.v1'
  | 'shell.copy-file.v1'
  | 'git.branch-switch.v1'
  | 'package.node-resolve.v1'
```

No generic fallback ID.

ExpectedEffect remains Host-private and process-local.

It may contain only the adapter-specific bounded material needed until verification settles.

After terminal verification, raw ExpectedEffect material must be dropped.

---

## 10. Direct write ExpectedEffect

For exact supported `write` calls:

- read the exact bounded `content`;
- compute SHA-256 immediately;
- retain only the content digest;
- do not retain content;
- do not retain file path in terminal VerificationRecord.

A path may be used ephemerally during capture only if needed to validate exact adapter shape; it must not enter the retained diagnostic outcome.

Oversized/hostile input is not eligible for deterministic Phase-7 write verification.

---

## 11. Direct edit ExpectedEffect

For exact supported `edit` calls capture only:

```text
old_string
new_string
replace_all
```

where `replace_all` defaults exactly to the pinned tool contract's default.

Capture is process-local and ephemeral.

Do not persist:

- target path;
- old/new strings;
- justification;
- permission text.

Drop the captured strings immediately after terminal direct verification.

---

## 12. Shell adapter eligibility gate

A shell ExpectedEffect may be created only when all are true:

- tool name exactly `bash` or `pwsh`;
- standard foreground call;
- `run_in_background` absent or false;
- **`workdir` argument absent**;
- shared parser confidence is high;
- exactly one simple command segment;
- no pipeline;
- no chaining;
- no redirection;
- no nested substitution;
- no backticks;
- no env assignment;
- no wrapper;
- no privilege wrapper;
- no dynamic/encoded execution;
- no parser degradation;
- exact action and argument shape for one frozen adapter.

Persistent shell tool variants are not part of Phase-7 postcondition adapters.

Do not weaken these gates based on “obviously safe” examples.

---

## 13. Freeze initial mkdir recognition exactly

Supported Bash forms only:

```text
mkdir PATH
mkdir -p PATH
```

Requirements:

- exactly one target;
- no other flags;
- no glob/wildcard;
- no wrapper;
- default workdir only.

Supported Pwsh form only:

```text
mkdir PATH
```

Requirements:

- exactly one target;
- no flags;
- default workdir only.

Do not add `New-Item`, aliases, parents variants or multiple targets unless separately frozen.

---

## 14. Freeze initial copy recognition exactly

Supported Bash form only:

```text
cp SRC DST
```

Supported Pwsh form only:

```text
Copy-Item SRC DST
```

Requirements:

- exactly one source and destination;
- no flags;
- no wildcard;
- no directory-copy semantics;
- no wrapper;
- default workdir only.

Aliases and richer copy syntax remain UNKNOWN.

---

## 15. Freeze initial Git recognition exactly

Supported forms only:

```text
git checkout BRANCH
git switch BRANCH
git checkout -b BRANCH
git switch -c BRANCH
```

Requirements:

- exactly one branch operand;
- no additional options;
- no `--detach`;
- no path checkout;
- no remote syntax;
- no revision/path ambiguity;
- default workdir only;
- branch token must pass a conservative local branch-name grammar.

Do not add generic Git verification.

Do not add fallback probes.

---

## 16. Freeze initial npm/pnpm recognition exactly

Supported original operation forms only:

```text
npm install PACKAGE
npm i PACKAGE
pnpm add PACKAGE
pnpm install PACKAGE
```

Requirements:

- foreground;
- default workdir;
- one simple command;
- exactly one package;
- no other flags;
- package is a conservative plain/scoped registry package name;
- no version/range/tag;
- no URL;
- no git spec;
- no file/path;
- no workspace/protocol;
- no wildcard.

Explicitly exclude:

- bare install;
- `npm ci`;
- global install;
- workspace/filter;
- lockfile-only modes;
- multiple packages;
- alias/protocol forms.

Do not broaden this subset during normal implementation.

---

## 17. Result-path ordering is a Phase-7 correctness requirement

Current pre-Phase-7 code performs:

```text
foundation.retire(exec)
failureChain.observeResult(exec, result)
```

before a Phase-7 verifier exists.

Refactor the single existing correlation result hook so the logical order is:

```text
tools/result
  ↓
resolve exact ExecutionId / ExpectedEffect
  ↓
observe immutable base Tool/process outcome
  ↓
run synchronous direct verification OR enqueue async shell verification
  ↓
publish any synchronous VerificationRecord / semantic overlay
  ↓
copy only bounded immutable inputs needed by async verifier
  ↓
retire ephemeral Foundation/ExpectedEffect state
  ↓
ActiveExecutionIndex result retirement
```

Implementation details may differ, but these invariants are mandatory:

1. direct verification has access to required ExpectedEffect before retirement;
2. async jobs own detached bounded inputs before retirement;
3. async verifier is **not awaited** by the `tools/result` observer;
4. the original ToolResult is never rewritten;
5. native tool-result latency is not extended by shell verification;
6. listener failure remains contained.

---

## 18. Direct write verification

Use the pinned direct-write canonical result value.

Expected successful shape:

```ts
{
  path: string
  operation: 'create' | 'update'
  before: string | null
  after: string
}
```

For a successful exact canonical result:

```text
sha256(result.value.after)
==
captured contentDigest
```

Map:

- equal → `MATCHED`, `semanticSuccess=true`;
- unequal → `MISMATCHED`, `semanticSuccess=false`;
- malformed/missing canonical value → `UNKNOWN`;
- `result.isError=true` → no semantic-success claim.

No filesystem post-read is allowed.

Do not retain `before`, `after`, path or digest in terminal VerificationRecord.

Coherent Tool-Contract match/mismatch has `evidenceQuality='high'`.

---

## 19. Direct edit verification

Use the pinned direct-edit canonical value:

```ts
{
  path: string
  before: string
  after: string
}
```

Use the pinned tool's documented line-ending normalization semantics.

Do not compare raw CRLF bytes if the Tool Contract defines LF-normalized logical comparison.

For `replace_all=false`:

- old string must have exactly one valid literal match in canonical `before`;
- compute expected `after`;
- exact compare to canonical `after`.

For `replace_all=true`:

- there must be at least one valid match;
- replace all;
- exact compare.

Map:

- exact expected after → true;
- coherent deterministic mismatch → false;
- malformed shape / unsupported normalization / impossible bounded comparison → unknown.

No post-read.

No retained before/after/old/new strings.

Coherent Tool-Contract match/mismatch has `evidenceQuality='high'`.

---

## 20. Do not register verifier Tools

Phase-7 verifiers are internal Host observations.

Do **not** register hidden/model-invisible verifier tools.

Do **not** call the original `bash`/`pwsh` Tool definition.

Do **not** pass verifier work through `tools/pre-execute`.

Why:

- it would mint/observe a new tool execution;
- it could recursively enter Risk Advisor;
- it could trigger Native Approval;
- it would corrupt correlation/failure semantics.

Shell verifier execution must call the public provider-neutral shell service directly:

```text
ctx.shell.resolve(...)
ctx.shell.run(...)
```

inside the optional shell capability attachment.

---

## 21. Optional shell capability

Risk Advisor must continue to start without `ctx.shell`.

Attach shell verification only when the public shell capability exists.

Recommended lifecycle:

```text
core apply()
  └── ctx.inject(['shell'], ...)
        ├── attach verifier capability generation
        ├── use sandboxPolicy only when required/proven
        └── detach → fence + abort + drain
```

Use the pinned packages actually proved by preflight:

```text
@deepseek-ai/dsh-shell            0.1.6-alpha.2
@deepseek-ai/dsh-sandbox-policy   0.1.6-alpha.2
```

Add them as peer/dev type/runtime dependencies only as needed by the real implementation.

Do not make root plugin injection require shell or sandboxPolicy.

If `ctx.shell` is absent:

- direct write/edit verification still works;
- shell ExpectedEffects settle UNKNOWN/UNAVAILABLE as appropriate;
- plugin startup remains valid.

---

## 22. Reconstruct same-or-narrower shell policy

For original canonical shell results carrying `sandbox.mode`:

verification is allowed only when:

- current shell still advertises sandbox capability;
- exact owning Session is still available;
- `sandboxPolicy` is available;
- the verifier reconstructs the original mode for that Session;
- no mode widening occurs.

Never request approval.

Never call an escalation helper.

Never substitute a broader current standing policy for the original mode.

If reconstruction is not provable:

`semanticSuccess='unknown'`

For original results with no sandbox facts:

verification is allowed only while current `ctx.shell.sandboxMode === undefined`.

Capability world changes are UNKNOWN:

```text
original unsandboxed + current sandboxed → UNKNOWN
original sandboxed   + current unsandboxed → UNKNOWN
```

---

## 23. Default-workdir reconstruction only

The initial Phase-7 shell subset deliberately excludes explicit `workdir`.

For supported calls:

- Bash sandboxed: use reconstructed policy workspace root;
- Pwsh: use exact Session header cwd;
- unsandboxed Bash/Pwsh: use exact Session header cwd when present.

If a reliable workdir basis does not exist:

`semanticSuccess='unknown'`

Do not invent a cross-dialect canonicalization rule.

---

## 24. Shell verifier command security

All verifier code is predefined product code.

Forbidden:

- model-generated checker code;
- user-generated checker code;
- agent-generated checker code;
- concatenating target/package/branch values into executable verifier source;
- `eval`;
- dynamic `Function`;
- dynamic shell snippets built from untrusted values.

Dynamic data may enter only as bounded data channels such as environment variables.

A constant product-owned `node -e <literal>` script is allowed by the Freeze only when:

- source is a static literal;
- untrusted values arrive only as data;
- no target code/module is imported/executed;
- no network;
- bounded output/timeout;
- no target project startup/config code is loaded.

---

## 25. Harden verifier environment

At minimum neutralize:

```text
BASH_ENV=
ENV=
NODE_OPTIONS=
NODE_PATH=
GIT_TERMINAL_PROMPT=0
GIT_OPTIONAL_LOCKS=0
NO_COLOR=1
CI=1
```

Implementation may add static hardening variables when repository/pinned-runtime evidence supports them.

Do not forward arbitrary environment assignments from the original operation.

Do not use project-local shell startup scripts as verifier authority.

Pinned Pwsh already uses `-NoProfile -NonInteractive`; preserve this advantage and still apply verifier environment hardening.

---

## 26. Verifier result handling

Every verifier call must use bounded:

```text
timeoutMs = 5000
stdoutMaxBytes = 4096
retry = 0
```

Treat any of the following as UNKNOWN:

- timeout;
- abort;
- shell provider rejection;
- truncated required output;
- malformed structured output;
- unsupported output;
- policy reconstruction failure;
- capability generation mismatch;
- verifier exception.

Never convert verifier infrastructure failure into semantic mismatch.

Do not retain raw stdout/stderr or exception text.

---

## 27. Implement shell.mkdir.v1 verifier

Use one fixed shell-world product verifier.

Observed result rules:

- target is a real directory → `MATCHED / true`;
- target absent → `MISMATCHED / false`;
- target is a coherent non-directory regular object → `MISMATCHED / false`;
- symlink/reparse-like ambiguity → `UNKNOWN`;
- access/provider/runtime error → `UNKNOWN`;
- timeout/cancel → `UNKNOWN`.

The verifier must not follow an untrusted final symlink and then claim a strong match.

Do not turn lstat/stat details into Phase-8 public evidence.

Retain only the sanitized VerificationRecord.

---

## 28. Implement shell.copy-file.v1 verifier

Verifier algorithm:

1. lstat source;
2. lstat destination;
3. both must be regular non-symlink files;
4. each size ≤ **1 MiB**;
5. read each bounded file;
6. SHA-256 compare;
7. discard bytes/digests immediately.

Map:

- equal → `MATCHED / true`;
- coherent source and destination within bounds but unequal → `MISMATCHED / false`;
- destination absent while source remains coherently observable within bound → `MISMATCHED / false`;
- source missing → `UNKNOWN`;
- symlink → `UNKNOWN`;
- special file → `UNKNOWN`;
- directory → `UNKNOWN`;
- oversize → `UNKNOWN`;
- access/runtime/race ambiguity → `UNKNOWN`.

Do not retain source/destination paths or digests in terminal state.

Do not expose general file metadata.

---

## 29. Implement git.branch-switch.v1 verifier

Use a fixed product-owned read-only command equivalent to:

```text
git -c core.fsmonitor=false symbolic-ref --quiet --short HEAD
```

Environment must include:

```text
GIT_OPTIONAL_LOCKS=0
GIT_TERMINAL_PROMPT=0
```

Also ensure:

- no pager;
- no remote access;
- no fetch;
- no hook execution initiated by Risk Advisor;
- bounded stdout.

Map:

- exit 0 + exact expected bounded branch → true;
- exit 0 + another valid bounded branch → false;
- detached HEAD → unknown;
- nonzero → unknown;
- truncated/malformed output → unknown;
- infrastructure failure → unknown.

Do not add:

- `git status`;
- `fetch`;
- `ls-remote`;
- fallback command chains;
- generic repo inspection.

---

## 30. Implement package.node-resolve.v1 verifier

Do not invoke `npm`, `pnpm`, Corepack or package-manager CLIs from the verifier.

Use fixed product-owned Node resolution logic in the original shell execution world.

Requirements:

- package name passed as bounded data, never code;
- clear `NODE_OPTIONS`;
- clear `NODE_PATH`;
- never `require()` target package;
- never `import()` target package;
- never run lifecycle scripts;
- no network;
- only local resolution query from target workdir.

This adapter is positive-proof only.

Map:

- coherent successful local resolution → `MATCHED / true`;
- module-not-found → `UNKNOWN`;
- other negative resolution → `UNKNOWN`;
- malformed/truncated/runtime error → `UNKNOWN`.

Do not emit hard semantic failure for package-resolution negatives in Phase 7.

---

## 31. VerificationRecordV1

Retain only a deeply frozen/detached bounded record equivalent to:

```ts
interface VerificationRecordV1 {
  schemaVersion: 1
  executionId: string
  adapterId: VerificationAdapterId
  source: 'tool-contract' | 'known-adapter'
  status: 'MATCHED' | 'MISMATCHED' | 'UNKNOWN' | 'UNAVAILABLE'
  semanticSuccess: true | false | 'unknown'
  evidenceQuality: 'high' | 'medium' | 'low'
  reasonCodes: readonly VerificationReasonCode[]
  observedAt: number
  durationMs: number
}
```

Retained/public records must not contain:

- raw arguments;
- target path;
- source/destination path;
- branch;
- package;
- command;
- workdir;
- write/edit content;
- old/new/before/after strings;
- stdout/stderr;
- Git output;
- manifest/lockfile content;
- file digest;
- secret material;
- raw exception text;
- Session;
- ToolExecution;
- Agent.

Static reason codes only.

---

## 32. Evidence-quality mapping

Implement exactly:

```text
direct write/edit Tool-Contract coherent match/mismatch → high
shell-world fixed verifier coherent result             → medium
unknown/unavailable                                    → low
```

Do not let Phase-7 evidence quality assert:

- workspaceContained;
- sandboxCovered;
- reversible;
- canonicalPath;
- checkpoint/rollback.

---

## 33. Closed reason-code vocabulary

Use only static bounded reason codes covering the Freeze categories, including equivalents of:

```text
NO_EXPECTED_EFFECT
UNSUPPORTED_OPERATION
CAPTURE_UNAVAILABLE
PROCESS_NOT_SUCCESSFUL
RESULT_SHAPE_UNSUPPORTED
POSTCONDITION_MATCHED
POSTCONDITION_MISMATCH
VERIFIER_CAPABILITY_UNAVAILABLE
VERIFIER_POLICY_UNAVAILABLE
VERIFIER_EXECUTION_WORLD_CHANGED
VERIFIER_QUEUE_SATURATED
VERIFIER_TIMEOUT
VERIFIER_ABORTED
VERIFIER_OUTPUT_TRUNCATED
VERIFIER_RESULT_UNSUPPORTED
VERIFICATION_CONFLICT
RUNTIME_STATE_LOST
```

Names may follow repository style.

Reason strings must never interpolate raw path/package/branch/command/error/output.

---

## 34. Process-local VerificationStore

Implement generation-local process state only.

Frozen bounds:

```text
TTL                 = 5 minutes
max per Session     = 128
max global records  = 512
terminal record     = at most 1 per ExecutionId
```

Store owns:

- ExpectedEffect lifecycle;
- terminal VerificationRecord;
- duplicate/idempotency;
- async job linkage/fencing.

Rules:

- query does not refresh TTL;
- terminal settlement drops raw ExpectedEffect material;
- capacity eviction cannot expose raw state;
- dispose clears process-local state;
- no durable replay reconstruction is claimed.

A read-only sanitized diagnostic seam may be exposed on Context.

Do not export mutation methods from package root.

---

## 35. Do not append any Risk Advisor Session event

Phase 7 MUST NOT call:

```text
Session.append('risk-advisor/...')
```

or any equivalent custom Risk Advisor event.

Do not add a SessionEventMap declaration for verification.

Do not modify session-format or persistence packages.

Do not mark an unsafe external event as durable merely to satisfy restart tests.

Cold restart loss of VerificationStore remains an honest boundary.

Also do not introduce production calls to deprecated:

- `Session.eventAt()`;
- `Session.snapshotEvents()`;
- `Session.ownEvents()`.

---

## 36. Async VerificationScheduler

Only shell-world adapters enter the scheduler.

Freeze:

```text
timeoutMs              = 5000
maxConcurrentVerifiers = 2
maxPendingVerifiers    = 8
stdoutMaxBytes          = 4096
retryCount              = 0
```

Requirements:

- direct write/edit synchronous verification bypasses scheduler;
- one job per ExecutionId;
- FIFO is acceptable;
- finite active set;
- finite pending queue;
- saturation settles UNKNOWN;
- each active job has AbortController;
- Session disposal cancels owned jobs;
- shell capability detach aborts/drains;
- plugin dispose aborts/drains;
- late old-generation completion is no-op;
- no unhandled detached promise/iterator remains;
- teardown reaches quiescence.

The scheduler does not require a user/operator enable flag.

---

## 37. Capability-generation fencing

Every shell-verifier completion must prove it still belongs to:

```text
same plugin generation
same shell capability generation
same ExecutionId
same verifier job generation
not already terminal/fenced
```

A detached/replaced shell capability invalidates old completions.

Late completion cannot overwrite:

- terminal VerificationRecord;
- a conflict-degraded record;
- disposed state.

---

## 38. Widen Phase2 semantic outcome only as frozen

Current Phase-2 execution projection uses:

```text
semanticSuccess='unknown'
```

Phase 7 may widen it to:

```ts
semanticSuccess: true | false | 'unknown'
```

Preserve existing terminal/process authority.

Base process/tool/guardrail/timeout/system failures remain authoritative.

Do not reinterpret exit code 0 as semantic success without verification.

Do not mutate durable ToolResult.

---

## 39. Add deterministic semantic failure identity

Add one internal failure class:

```text
SEMANTIC_FAILURE
```

with static postcondition mismatch identity.

Semantic failure may exist only when:

```text
base process outcome = SUCCESS
AND
authoritative expected effect exists
AND
coherent verifier says MISMATCHED
```

Root-cause category is postcondition.

Failure identity must not include raw target/branch/package/content.

---

## 40. Refactor FailureChain to base outcome + verification overlay

Do not call `observeResult()` twice with two competing full outcomes.

Represent internally:

```text
baseOutcome
+
optional terminal verification
=
effective relation outcome
```

Implement exactly:

### Base FAILURE

```text
base FAILURE
→ effective FAILURE unchanged
```

Verification cannot erase/replace it.

### Base UNKNOWN

```text
base UNKNOWN
→ effective UNKNOWN
```

### Base SUCCESS + semantic true

```text
→ effective SUCCESS
```

### Base SUCCESS + semantic false

```text
→ effective FAILURE
  failureKind=SEMANTIC_FAILURE
```

### Base SUCCESS + semantic unknown

```text
→ effective process SUCCESS
  semantic remains unknown
```

Unknown verifier is not a failure.

Conflicting verifier evidence:

- never last-writer-wins;
- degrades verification to UNKNOWN;
- marks relation evidence degraded/conflicted;
- never fabricates semantic failure.

---

## 41. Preserve temporal causality for retry relations

A semantic failure may influence a future retry only if it settled before the later execution was captured.

Required invariant:

```text
verification settled
BEFORE
next matching pre-execute capture
```

Then it may be considered a prior failure.

If the next execution begins first:

- later semantic verification must not retroactively create a retry edge;
- historical relation remains unchanged.

Duplicate identical verification cannot increment failure/retry counts twice.

---

## 42. Privacy-safe semantic root-cause signature

A semantic failure signature may include only:

```text
SEMANTIC_FAILURE
adapterId
existing privacy-safe hashed operation fingerprint when already available
```

Do not add raw:

- path;
- package;
- branch;
- command;
- content.

Do not create a new hash of secret/content merely to correlate semantic failure.

---

## 43. Approval lifecycle non-interference

Phase 7 happens after execution settlement.

It must not:

- answer Native Approval;
- reopen approval;
- create A3;
- mutate A1/A2;
- resurrect closed assessment records;
- alter prior Allow/Reject decisions.

Phase-7 semantic evidence may affect only future execution/failure context.

Add direct regression proof.

---

## 44. Browser/Client non-interference

No Phase-7 Browser protocol change.

Do not edit:

```text
src/bridge-contract.ts
src/client/*
src/host/presentation/*
src/host/browser-bridge.ts
```

unless a compile-only type propagation from the internal widened semantic outcome is unavoidable.

If Browser schema/product behavior must change, STOP for architecture review.

Do not add a historical semantic-status card in Phase 7.

---

## 45. Phase-8 boundary audit

Before final Full prove Phase 7 did not implement or publish:

- generic stat;
- generic list;
- realpath/canonical path;
- workspace containment;
- sandbox coverage;
- config-file evidence;
- general Git state;
- checkpoint evidence;
- rollback evidence;
- reversibility;
- path-alias evidence.

The tiny fixed reads inside exact Phase-7 verifier recipes are private to those adapters and do not become general evidence facts.

---

## 46. Add Phase-7 focused test scripts

Recommended focused files:

```text
tests/p7-expected-effect.unit.spec.ts
tests/p7-postcondition-verifier.unit.spec.ts
tests/p7-shell-verifier.integration.spec.ts
tests/p7-failure-chain.integration.spec.ts
tests/p7-runtime.integration.spec.ts
```

Equivalent consolidation is allowed.

Add:

```text
test:p7
```

to `package.json`.

Append `test:p7` to the complete `test` chain.

Do not remove/reorder prior test scripts unless required for a documented dependency.

---

## 47. Mandatory capture tests

Prove:

- direct write capture;
- direct edit capture;
- accessor/getter not invoked;
- exotic object rejected;
- oversized input fails closed;
- unknown tool no raw traversal;
- unsupported shell no ExpectedEffect;
- background shell excluded;
- explicit workdir excluded;
- chained/piped/redirection excluded;
- substitution/backtick excluded;
- wrapper excluded;
- env assignment excluded;
- raw write content not retained;
- terminal settlement drops edit strings.

---

## 48. Mandatory direct-verifier tests

Write:

- exact match → semantic true;
- deterministic mismatch → false;
- malformed canonical value → unknown;
- result.isError → no semantic-success claim;
- retained record contains no path/content/digest.

Edit:

- single literal match → true;
- replace-all → true;
- deterministic mismatch → false;
- LF-normalization contract;
- malformed before/after → unknown;
- no retained before/after/old/new/path.

---

## 49. Mandatory Phase-4 parser-equivalence tests

Before relying on extracted shell analysis, prove accepted P4 behavior is unchanged for:

- segmentation;
- quoting;
- escapes;
- pipelines;
- chained later dangerous commands;
- dynamic execution;
- encoded execution;
- substitutions;
- environment injection;
- wrappers;
- destructive findings;
- Git findings;
- package install findings;
- permission findings;
- ambiguity/degraded status;
- existing RuleEvaluation structure.

The extraction itself must not change Phase-4 risk semantics.

---

## 50. Mandatory shell-policy tests

Prove:

- original sandbox mode reconstructed;
- verifier never widens mode;
- verifier never asks approval;
- missing sandboxPolicy → unknown;
- shell capability generation change → unknown;
- original unsandboxed/current sandboxed → unknown;
- original sandboxed/current unsandboxed → unknown;
- supported default workdir reconstructed;
- explicit workdir remains unsupported;
- shell absence does not prevent plugin startup/direct verification.

---

## 51. Mandatory mkdir/copy tests

mkdir:

- Bash `mkdir path` match;
- Bash `mkdir -p path` match;
- Pwsh `mkdir path` match;
- absent target mismatch;
- coherent non-directory mismatch;
- symlink/reparse ambiguity unknown;
- unsupported flags/multiple targets no adapter.

copy:

- Bash simple regular-file copy match;
- Pwsh simple `Copy-Item` match;
- digest mismatch false;
- destination absent false when source coherently verified;
- source missing unknown;
- symlink unknown;
- directory unknown;
- special file unknown;
- >1 MiB unknown;
- no retained bytes/digest/path.

Use only disposable local test fixtures.

No destructive external filesystem action.

---

## 52. Mandatory Git tests

Prove:

- checkout branch match;
- switch branch match;
- create branch forms;
- coherent different symbolic branch → false;
- detached HEAD → unknown;
- malformed/truncated output → unknown;
- unsupported Git command → no adapter;
- options/path/remote syntax excluded;
- verifier includes `GIT_OPTIONAL_LOCKS=0`;
- verifier includes `GIT_TERMINAL_PROMPT=0`;
- no fetch/remote/fallback chain;
- no raw branch retained.

Use disposable local Git fixtures only.

No remote.

---

## 53. Mandatory npm/pnpm tests

Prove:

- npm install one plain package eligible;
- npm i one scoped package eligible;
- pnpm add eligible;
- pnpm install explicit package eligible;
- successful local resolution → true;
- missing/unresolvable → unknown;
- target package code is never loaded/executed;
- verifier never invokes npm/pnpm;
- verifier has no network;
- lifecycle scripts never run;
- multiple packages excluded;
- version/tag/url/git/file/workspace specs excluded;
- global/workspace/filter/ci/bare install excluded;
- `NODE_OPTIONS`/`NODE_PATH` neutralized;
- no package name retained.

Use a synthetic local node_modules fixture; do not install from a registry during tests.

---

## 54. Mandatory scheduler tests

Prove:

- max concurrent = 2;
- max pending = 8;
- saturation terminal unknown;
- timeout aborts;
- active cancellation drains;
- queued cancellation drains;
- Session disposal cancels owned jobs;
- shell capability detach drains;
- plugin dispose drains;
- late completion fenced;
- one job per ExecutionId;
- no automatic retry;
- original `tools/result` callback does not await verifier;
- verifier does not re-enter tools/pre-execute;
- no unhandled async work after teardown.

Use fake timers/deterministic deferred promises where possible.

Do not sleep real five seconds.

---

## 55. Mandatory outcome/FailureChain tests

Prove:

- unsupported/no ExpectedEffect → semantic unknown;
- base process success + match → semantic true;
- base process success + hard mismatch → semantic false + SEMANTIC_FAILURE;
- base failure stays original failure;
- base UNKNOWN remains unknown;
- unknown verifier is not counted as failure;
- semantic failure counted once;
- semantic failure settled before later capture can support retry relation;
- late semantic failure after later capture does not retroactively create retry;
- duplicate identical verification idempotent;
- conflicting verification degrades to unknown/conflict;
- privacy-safe root-cause signature;
- existing Phase-3 retry/root-cause/permission-escalation tests unchanged.

---

## 56. Mandatory persistence/session safety tests

Prove:

- no custom Risk Advisor Session event;
- no `Session.append('risk-advisor/...')`;
- no SessionEventMap verification extension;
- no production `eventAt/snapshotEvents/ownEvents`;
- `deriveMessages()` unaffected;
- no session-format/persistence dependency introduced;
- process-local VerificationStore loss on disposal/restart is not misrepresented as durable.

---

## 57. Mandatory approval/browser non-interference tests

Prove:

- no Native Approval answerer;
- no A3;
- no A1/A2 mutation from semantic verification;
- no closed-approval resurrection;
- Phase-6 Browser bridge schema unchanged;
- Client code unchanged;
- verifier timeout/saturation/error does not affect approval outcome;
- existing Phase-6 focused tests remain green.

---

## 58. Local Phase-7 benchmark/evidence

Add a distinct local Phase-7 verifier benchmark.

Recommended:

```text
benchmarks/r5-phase7.mjs
tests/r5-phase7-benchmark-smoke.spec.ts
tests/r5-phase7-benchmark-full.spec.ts
package scripts:
  bench:r5:p7:smoke
  bench:r5:p7
```

Measure actual implemented local paths:

- direct write verification;
- direct edit verification;
- scheduler enqueue/settle;
- mkdir verifier;
- small copy verifier;
- copy near 1 MiB bound;
- Git branch verifier;
- positive Node resolution;
- timeout/saturation fixture.

Evidence labels must state:

```text
LOCAL_VERIFIER_ONLY
NETWORK_NOT_USED
PROVIDER_NOT_USED
```

Do not make unstable wall-clock percentiles a release blocker unless Architecture Freeze already made them one.

Do not make provider/network calls.

---

## 59. Runtime integration proof

Use authentic pinned Cordis/ToolRuntime composition already used by current integration tests.

Prove at minimum:

1. a direct `write`-like canonical result can create a Phase-7 terminal verification under the same ExecutionId;
2. original tool execution/result behavior remains available;
3. async verifier does not block `tools/result`;
4. optional shell capability attachment/detachment is lifecycle-safe;
5. no second ToolExecution is minted for verifier work;
6. no Native Approval path is invoked by verifier;
7. plugin can run without shell;
8. disposal reaches quiescence.

No real network/provider/destructive operations.

---

## 60. Package/export expectations

Add the shell capability dependencies only as genuinely needed by the implementation:

```text
@deepseek-ai/dsh-shell
@deepseek-ai/dsh-sandbox-policy
```

Pinned-compatible dev versions should match `0.1.6-alpha.2`; peer range should follow repository convention.

Do not make Client inject depend on these packages.

Host bundle must still import without Browser globals.

Package root may export sanitized Phase-7 DTO/read-only diagnostic types only if needed.

Do not export:

- ExpectedEffect raw union if it exposes target material;
- scheduler mutation API;
- verifier command builders;
- shell parser internals;
- policy-widening helpers;
- raw result/projector authority.

Run declaration/root-export audit.

---

## 61. Privacy audit

Before final Full inspect runtime retained objects, diagnostics, declarations, built artifacts and test snapshots.

Must prove terminal/public Phase-7 evidence contains no:

```text
command
file_path
workdir
sourcePath
destinationPath
target
branch
packageName
content
old_string
new_string
before
after
stdout
stderr
digest/hash of file content
raw ToolResult value
raw exception
secret
Session
ToolExecution
Agent
```

Existing privacy-safe ExecutionId and already-approved hashed operation fingerprint are allowed only where frozen.

Do not weaken this into a naive source-text grep; internal ephemeral variable names may necessarily mention these concepts.

---

## 62. Network/provider side-effect gate

Ordinary implementation/testing counts must be:

```text
real provider/model calls = 0
real external product/network calls = 0
package registry calls = 0
Git remote calls = 0
Harness Core mutations = 0
Native Approval authority changes = 0
custom Risk Advisor Session events = 0
Phase-8+ implementation = 0
```

Local disposable filesystem and local Git fixtures are allowed.

Do not run npm/pnpm install against external registries as verifier proof.

---

## 63. Iteration order before final gates

During coding, run smallest affected suites.

Recommended:

1. new P7 expected-effect/direct-verifier tests;
2. P4 parser-equivalence tests after extraction;
3. P7 shell verifier/scheduler tests;
4. P7 FailureChain tests;
5. P3 regression when relation code changes;
6. P2 regression when outcome/failure types change;
7. P6/P5 only when shared types/plumbing are affected;
8. runtime integration.

Do not repeatedly run complete `pnpm test` during implementation.

The complete Full is an acceptance gate, not a development loop.

---

## 64. Required pre-Full quality-gate order

After implementation is complete, run in this order:

1. `test:p7`;
2. Phase-4 focused regression and parser-equivalence proof;
3. Phase-3 focused regression;
4. Phase-2 focused regression;
5. Phase-6 focused regression;
6. Phase-5 focused regression;
7. Phase-1B/1C + R1/R2/R3/R4 affected regressions;
8. typecheck;
9. build;
10. Host export smoke;
11. Client export regression smoke;
12. declaration/root-export audit;
13. `pnpm pack --dry-run --json`;
14. `git diff --check`;
15. scope audit;
16. privacy/secret-retention audit;
17. no-network/no-provider/no-registry proof;
18. no-custom-Session-event/deprecated-reader proof;
19. Harness mutation=0 proof;
20. Phase-7 local verifier benchmark smoke/full.

Repair all failures before the final Full.

After each executable repair, rerun the directly affected focused/static gates.

---

## 65. Freeze executable state before the Full

Once every pre-Full gate is green:

1. stage only intended executable/source/test/config/package/benchmark changes;
2. inspect staged diff;
3. commit the final executable state;
4. record the exact commit SHA as candidate Tested SHA;
5. verify working tree contains only protected pre-existing drift and no intended executable modifications;
6. verify `git rev-parse HEAD` equals the candidate Tested SHA.

Do not create the Execution Report yet if it would obscure executable provenance.

---

## 66. Exactly one fresh complete Full on the exact executable SHA

Run exactly one fresh:

```text
pnpm test
```

on the candidate committed executable SHA.

Accepted pre-Phase-7 baseline was 200 tests PASS.

Do not hard-code the expected new file/test count.

Report actual count.

If the fresh Full PASSes:

- that commit is the Phase-7 candidate Tested SHA;
- do not modify executable/source/test/config/package/benchmark semantics afterward.

If the Full FAILs:

- preserve the failed run evidence;
- do not hide/relabel it;
- repair within frozen Phase-7 scope;
- rerun affected focused/static gates;
- create a new executable commit;
- run one new fresh complete Full on the new exact SHA.

A Full does not cover later executable drift.

---

## 67. Post-Full no-drift rule

After the passing Full:

Allowed:

```text
docs/tasks/Phase7-known-postcondition-verification/Execution_Report.md
bounded docs/evidence files under the Phase-7 task directory
```

Not allowed:

- source edits;
- test edits;
- benchmark semantic edits;
- package/script/dependency edits;
- config changes;
- lockfile semantic changes.

If executable drift occurs, previous Full evidence is invalid unless an existing governance rule separately proves a truly non-semantic static-only correction. Prefer zero post-Full executable drift.

---

## 68. Execution Report

After the passing Full create:

`docs/tasks/Phase7-known-postcondition-verification/Execution_Report.md`

Report at minimum:

1. outcome token;
2. implementation start SHA;
3. Phase-7 Preflight SHA;
4. Architecture Freeze SHA;
5. Implementation Instructions SHA;
6. final executable/Tested SHA;
7. final report/evidence remote SHA;
8. complete changed-file manifest;
9. shell-parser extraction/equivalence proof;
10. ExpectedEffect capture proof;
11. direct write/edit verification proof;
12. mkdir/copy verifier proof;
13. Git verifier proof;
14. npm/pnpm positive-resolution proof;
15. same-or-narrower sandbox-policy proof;
16. no-Approval verifier proof;
17. scheduler cap/timeout/cancel/drain proof;
18. VerificationStore TTL/cap/idempotency proof;
19. semantic outcome + SEMANTIC_FAILURE proof;
20. FailureChain temporal-causality proof;
21. approval/browser non-interference proof;
22. no-custom-Session-event/deprecated-reader proof;
23. privacy proof;
24. Phase-8 scope-boundary proof;
25. P7 focused count;
26. inherited focused/regression counts;
27. typecheck/build/export/declaration/pack results;
28. local Phase-7 benchmark/evidence result;
29. exact fresh Full command/file count/test count/PASS;
30. Harness pin + mutation=0;
31. provider/network/registry/remote/destructive side-effect counts;
32. inherited PARTIAL/NOT_RUN/NOT_VALIDATED boundaries;
33. exact Tested SHA → final remote docs/evidence-only diff proof.

Do not create `Acceptance_Report.md`.

---

## 69. Required outcome token

If implementation and every required gate pass, publish:

`PHASE7_PUBLISHED_READY_FOR_REVIEW`

Then STOP.

Do not publish:

`PHASE7_ACCEPTED`

Do not advance an accepted baseline.

Do not start Phase 8.

ChatGPT Web independently reviews the repository and decides final acceptance.

If blocked by frozen architecture:

`PHASE7_ARCHITECTURE_DECISION_REQUIRED`

For a non-architectural execution/environment blocker:

`PHASE7_BLOCKED`

---

## 70. STOP conditions

STOP instead of improvising if implementation would require any of the following:

- Harness Core modification;
- generic Host `node:fs` or generic `ctx.fs` reads for shell-originating verification;
- Phase-8 general evidence collection;
- network verification;
- package-manager verifier invocation;
- generated/dynamic checker source;
- interpolation of untrusted values into executable checker code;
- sandbox widening;
- verifier approval request;
- async verifier awaited by original `tools/result`;
- second/hidden ToolExecution for verifier;
- persistent raw ExpectedEffect/result data;
- custom Risk Advisor Session event;
- deprecated Session readers;
- approval reopening/A3;
- parser-ambiguous shell adapter acceptance;
- explicit-workdir deterministic shell verification;
- broadening Git/package adapter beyond frozen subset;
- hard semantic package-install failure from a negative Node-resolution result;
- changes to Phase-5 six-dimension or P0-P9 recommendation semantics;
- Browser protocol/product changes;
- loss of scheduler quiescence;
- a Phase-4 parser extraction that changes accepted RuleEngine output.

Return `PHASE7_ARCHITECTURE_DECISION_REQUIRED` with exact evidence rather than guessing.

---

## 71. Preserve inherited evidence boundaries

Carry forward without promotion unless Phase 7 directly and honestly closes one:

```text
F-006 = PARTIAL
F-013 = PARTIAL
general guard-returned denial = PARTIAL/UNKNOWN where complete witness is absent
true disk/process restart = NOT_RUN
real native PTC producer = NOT_RUN
LIVE_BROWSER_NOT_RUN
APPROVAL_PLUGIN_COEXISTENCE_NOT_RUN
WebWorker = NOT_VALIDATED
newer Harness/V4 = NOT_VALIDATED
Phase-8 Evidence Collector = NOT_IMPLEMENTED
Phase-9 Deep Judge = NOT_IMPLEMENTED
real-provider Fast-Judge latency / production scheduler policy = UNDETERMINED
```

Phase 7 specifically does **not** claim durable recovery of process-local VerificationStore across a true cold process restart.

---

## 72. Final implementation invariants

Before handoff, explicitly audit and report all:

```text
I1  exit 0 never directly implies semantic success.
I2  Only Tool Contract / Known Adapter creates hard semantic verification.
I3  Unknown beats guessing.
I4  Direct write/edit perform no post-read.
I5  Shell verification stays in ctx.shell execution world.
I6  Verifier policy is same-or-narrower, never wider.
I7  Verifier never asks approval.
I8  Verifier performs no network access.
I9  No dynamic checker code is generated/executed.
I10 Phase 4 and Phase 7 share one shell-analysis authority.
I11 Explicit-workdir shell calls remain outside deterministic adapters.
I12 Generic ctx.fs evidence collection is absent.
I13 Terminal VerificationRecord retains no raw operation/evidence content.
I14 No custom Risk Advisor Session event exists.
I15 Base Tool/process failure remains authoritative.
I16 Semantic mismatch overlays only base process success.
I17 Async verification never delays/rewrites ToolResult.
I18 FailureChain uses evidence settled before later capture; no retroactive retry.
I19 Phase 7 never creates A3 or reopens approval.
I20 Phase 8 facts remain untouched.
```

Any failed invariant blocks publication.

---

## 73. Handoff format

The successful Codex handoff should be concise and evidence-first:

```text
PHASE7_PUBLISHED_READY_FOR_REVIEW

- Implementation/Tested SHA: <sha>
- Final remote/report SHA: <sha>
- P7 focused: <files/tests PASS>
- P4 parser-equivalence/regression: <PASS>
- P3/P2/inherited regressions: <PASS>
- typecheck/build/export/declaration/pack: <PASS>
- Phase7 local verifier benchmark: <PASS; LOCAL_VERIFIER_ONLY>
- Fresh complete pnpm test: <files/tests PASS>
- Provider calls: 0
- External network/registry/Git remote calls: 0
- Harness mutations: 0
- Custom Risk Advisor Session events: 0
- Tested→remote diff: docs/evidence only
- Inherited boundaries: preserved
```

Then STOP for ChatGPT Web review.
