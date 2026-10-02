# Risk Advisor — Phase 7: Known Postcondition Verification | Architecture Freeze

**Verdict:** `PHASE7_ARCHITECTURE_FROZEN_FOR_IMPLEMENTATION`  
**Date:** 2026-10-02  
**Repository:** `Dhandil/dsh-risk-advisor`  
**Freeze base:** `cf5fb20d868c5145c983764108dd57de3a9999ec`  
**Accepted Phase-6 executable SHA:** `9583e9318f56083dcce52bb171a0cb4488862faf`  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, strictly read-only.

This document freezes the implementable Phase-7 architecture. It is authoritative for Phase-7 implementation unless a repository-grounded contradiction is discovered and separately reviewed.

---

# 1. Phase-7 objective

Phase 7 adds a deliberately small, deterministic semantic-verification layer:

```text
Expected Effect
        ↓
Tool Execution
        ↓
Observed Effect
        ↓
Known Postcondition Adapter
        ↓
semanticSuccess
```

The phase exists to make this distinction real:

```text
processSuccess
≠
semanticSuccess
```

The frozen V1 roadmap names these initial operation families:

```text
file write/edit
mkdir/copy
git
pnpm/npm
```

The implementation MUST prefer `unknown` to a semantic claim that cannot be proven under the constraints below.

---

# 2. Non-goals

Phase 7 MUST NOT implement:

- generic behavior-chain analysis;
- arbitrary filesystem investigation;
- general stat/list/canonical-path evidence collection;
- checkpoint or rollback evidence;
- generic Git inspection;
- package-registry lookup;
- network verification;
- Deep Judge;
- model-generated checker code;
- approval reopening or a new approval stage;
- Browser historical verification UI;
- Harness Core changes;
- a new Risk Advisor persistence database;
- a custom Risk Advisor Session event.

Those remain outside this phase. General read-only evidence belongs to Phase 8.

---

# 3. Semantic authority

Deterministic semantic verification is allowed only when all three exist:

```text
reliable Expected Effect
+
bounded observable postcondition
+
predefined verifier
```

Expected Effect authority is frozen as:

```text
1. Tool Contract
2. Known Operation Adapter
3. Agent Claim       → may suggest what to check; never proves success/failure
4. LLM Inference     → soft context only; never produces hard semantic failure
```

Only `tool-contract` and `known-adapter` may produce deterministic `semanticSuccess=true|false`.

Unknown, unsupported, ambiguous, unsafe, unavailable, timed-out or capacity-exceeded verification MUST yield:

```text
semanticSuccess = 'unknown'
```

---

# 4. Hard semantic-failure rule

A deterministic semantic failure may be emitted only when:

```text
processSuccess === true
AND
ExpectedEffect.source ∈ { tool-contract, known-adapter }
AND
the adapter completed coherently
AND
the observed postcondition deterministically mismatched
```

Then:

```text
semanticSuccess = false
failureType = semantic
rootCauseCategory = postcondition
```

A verifier MUST NOT:

- convert a Tool/Guardrail/Timeout/System failure into semantic success;
- hide an existing process failure;
- rewrite the original ToolResult;
- answer or modify Native Approval;
- fabricate mismatch from verifier failure.

Process failure outranks semantic verification.

---

# 5. Live trigger and data authority

Pinned Harness `tools/result` is the authoritative live trigger:

```ts
tools/result(
  exec: Readonly<ToolExecution>,
  result: Readonly<ToolExecutionResult>,
)
```

For successful results, live `result.value` retains the canonical JSON value.

Pinned Harness deliberately omits that canonical `value` from durable `tool/result` Session events.

Therefore:

- Phase 7 MAY inspect `result.value` only during the live result path;
- it MUST immediately reduce raw values to a bounded VerificationRecord;
- it MUST NOT retain raw Tool result values;
- it MUST NOT persist file content, shell output, manifests or diffs;
- durable `tool/result` replay alone is insufficient to recreate Phase-7 live verification.

---

# 6. Result-path ordering

Current Risk Advisor result handling retires Foundation state before a Phase-7 verifier exists.

Phase 7 freezes this logical ordering:

```text
tools/result
  ↓
authoritative base execution result observed
  ↓
Phase-7 synchronous Tool-Contract verification OR async verifier scheduling
  ↓
FailureChain base settlement + verification refinement wiring
  ↓
ephemeral ExpectedEffect/Foundation state may retire
  ↓
ActiveExecutionIndex result retirement
```

The implementation MAY factor the callbacks differently, but the following invariants are mandatory:

1. expected-effect data needed by a synchronous verifier cannot be retired before verification;
2. async jobs receive only their bounded immutable inputs before ephemeral state retires;
3. the `tools/result` observer MUST NOT await async shell verification;
4. Harness ToolResult latency/outcome is unchanged by async verification;
5. listener failure remains observational and contained.

---

# 7. Frozen adapter identifiers

The only Phase-7 adapter identifiers are:

```ts
type VerificationAdapterId =
  | 'tool.write.v1'
  | 'tool.edit.v1'
  | 'shell.mkdir.v1'
  | 'shell.copy-file.v1'
  | 'git.branch-switch.v1'
  | 'package.node-resolve.v1'
```

No generic fallback adapter is permitted.

Unknown commands and unsupported variants remain unverified.

---

# 8. ExpectedEffectV1

Expected Effect is Host-private, process-local and ephemeral.

The frozen conceptual union is:

```ts
type ExpectedEffectV1 =
  | {
      schemaVersion: 1
      executionId: string
      source: 'tool-contract'
      adapterId: 'tool.write.v1'
      contentDigest: string
    }
  | {
      schemaVersion: 1
      executionId: string
      source: 'tool-contract'
      adapterId: 'tool.edit.v1'
      oldString: string
      newString: string
      replaceAll: boolean
    }
  | {
      schemaVersion: 1
      executionId: string
      source: 'known-adapter'
      adapterId: 'shell.mkdir.v1'
      toolName: 'bash' | 'pwsh'
      target: string
    }
  | {
      schemaVersion: 1
      executionId: string
      source: 'known-adapter'
      adapterId: 'shell.copy-file.v1'
      toolName: 'bash' | 'pwsh'
      sourcePath: string
      destinationPath: string
    }
  | {
      schemaVersion: 1
      executionId: string
      source: 'known-adapter'
      adapterId: 'git.branch-switch.v1'
      toolName: 'bash' | 'pwsh'
      expectedBranch: string
    }
  | {
      schemaVersion: 1
      executionId: string
      source: 'known-adapter'
      adapterId: 'package.node-resolve.v1'
      toolName: 'bash' | 'pwsh'
      manager: 'npm' | 'pnpm'
      packageName: string
    }
```

Implementation-private fields MAY additionally hold:

- a weak Session reference;
- captured generation;
- capture time;
- effective execution-policy facts;
- bounded hashed correlation material.

They MUST NOT broaden the public/diagnostic surface.

---

# 9. Expected-effect capture safety

Capture occurs from the exact live `tools/pre-execute` traversal after ExecutionId minting.

Capture MUST use the hostile-input discipline already established in prior phases:

- exact tool-name allowlist;
- plain or null-prototype objects only;
- own data properties only;
- never invoke accessors/getters;
- bounded strings/arrays;
- no arbitrary recursion;
- no unknown-tool raw traversal;
- fail closed on malformed values.

Unknown or malformed capture produces no authoritative ExpectedEffect.

Phase-7 capture MUST NOT persist raw arguments.

---

# 10. Direct write adapter

Pinned `dsh-tool-fs` successful `write` returns:

```ts
{
  path: string
  operation: 'create' | 'update'
  before: string | null
  after: string
}
```

The tool produces that value only after `ctx.fs.writeText(...)` completes.

## 10.1 Expected effect

For a supported direct write:

- capture exact `content`;
- immediately compute a SHA-256 digest;
- retain only the digest in ExpectedEffect;
- do not retain the full content after capture.

Existing Phase-4 argument bounds remain the hard upper bound. Oversized input is not eligible for deterministic Phase-7 verification.

## 10.2 Verification

On successful exact canonical write result:

```text
sha256(result.value.after)
==
captured contentDigest
```

Results:

- equal → `MATCHED`, `semanticSuccess=true`;
- unequal → `MISMATCHED`, `semanticSuccess=false`;
- malformed/missing value → `UNKNOWN`;
- `result.isError=true` → no semantic success claim.

No second filesystem read is allowed or required.

## 10.3 Evidence quality

A coherent Tool-Contract write match/mismatch is:

```text
evidenceQuality = HIGH
```

because the canonical result is produced by the same atomic tool contract after mutation completion.

---

# 11. Direct edit adapter

Pinned `dsh-tool-fs` successful `edit` returns:

```ts
{
  path: string
  before: string
  after: string
}
```

The tool returns only after atomic `ctx.fs.editText(...)` completes.

## 11.1 Expected effect

For a supported edit, capture only bounded:

- `old_string`;
- `new_string`;
- `replace_all` defaulted to false.

These values are process-local and MUST be dropped immediately after terminal verification.

## 11.2 Normalization

The verifier MUST use the pinned filesystem contract's line-ending semantics when comparing `before` and `after`.

It MUST NOT assume raw CRLF bytes when the Tool Contract documents LF-normalized before/after comparison bases.

## 11.3 Deterministic reconstruction

For `replace_all=false`:

- expected old text must have exactly one valid literal match in the Tool-Contract `before` value;
- compute expected `after`;
- compare exact value to canonical `after`.

For `replace_all=true`:

- there must be at least one valid match;
- replace all;
- compare exact value.

Results:

- exact expected `after` → true;
- coherent canonical value that deterministically differs → false;
- malformed shape, impossible bounded comparison or unsupported normalization → unknown.

No post-read is allowed.

## 11.4 Evidence quality

Coherent direct edit match/mismatch is HIGH.

---

# 12. Shared shell-analysis authority

Phase 7 MUST NOT implement a second generic shell parser.

The accepted Phase-4 bounded shell machinery currently owns:

- segment splitting;
- tokenization;
- quote/escape ambiguity;
- substitution/backtick detection;
- pipeline/chaining structure;
- wrappers;
- env assignments;
- dynamic/encoded execution findings;
- package-install recognition.

Implementation MUST extract the reusable parser facts into a package-private module, recommended:

```text
src/host/shell-analysis.ts
```

with consumers:

```text
Phase 4 RuleEngine
Phase 7 ExpectedEffectRegistry
```

The extraction MUST NOT alter accepted Phase-4 RuleEvaluation semantics.

A golden regression over the existing Phase-4 corpus MUST prove behavior equivalence.

The shared analyzer MUST NOT be exported from package root.

---

# 13. Shell adapter eligibility gate

Any Phase-7 shell adapter requires all of:

- tool name exactly `bash` or `pwsh`;
- foreground execution only;
- `run_in_background` absent or false;
- **`workdir` argument absent**;
- parser confidence high;
- exactly one simple command segment;
- no pipeline;
- no chaining;
- no redirection;
- no nested substitution;
- no backticks;
- no environment assignment;
- no wrapper;
- no privilege wrapper;
- no encoded/dynamic form;
- no parser degradation;
- exact action/argument shape for one frozen adapter.

Why `workdir` is excluded in the first Phase-7 subset:

- pinned Bash resolves relative workdir against policy workspace identity;
- pinned Pwsh resolves against raw Session cwd;
- pinned Harness documents a parity gap.

Phase 7 will not invent a cross-dialect canonicalization rule.

---

# 14. Shell execution-world rule

Shell-originating postconditions MUST be checked in the same `ctx.shell` execution world.

Phase 7 MUST NOT use Host `node:fs` or generic `ctx.fs` to verify shell-originating filesystem state.

Reason:

- alternate shell/filesystem backends may not share Host identity;
- pinned `dsh-fs-sandbox` confines mutation but not generic reads;
- a Host/read seam could expand observation authority.

Thus:

```text
shell mutation
→ shell-world verifier
```

not:

```text
shell mutation
→ assume Host filesystem identity
```

---

# 15. Original execution-policy reconstruction

A shell verifier MUST run under the same or narrower proven file-effect policy.

## 15.1 Sandboxed original result

If canonical original shell result carries:

```ts
sandbox.mode
```

then verification requires:

- current `ctx.shell` still reports sandbox capability;
- `ctx.sandboxPolicy` is available;
- exact owning Session is available;
- policy is reconstructed with that Session and the original mode;
- verifier never requests approval;
- verifier never widens mode.

If any condition fails → UNKNOWN.

## 15.2 Unsandboxed original result

If original canonical shell result contains no sandbox facts, verification is allowed only while current `ctx.shell.sandboxMode === undefined`.

If capability generation changed from unsandboxed to sandboxed, or vice versa, the verifier fails closed to UNKNOWN.

## 15.3 Workdir reconstruction

Because initial adapters require omitted `workdir`:

- Bash sandboxed: use reconstructed policy workspace root;
- Pwsh: use exact Session header cwd, matching the pinned tool;
- unsandboxed Bash/Pwsh: use Session header cwd when present;
- no reliable Session/workdir basis → UNKNOWN.

---

# 16. Fixed verifier command rule

All shell-side verifiers are predefined product code.

User/agent/model strings MUST NOT be interpolated into executable checker source.

Dynamic checker code is prohibited.

A fixed product-owned verifier command or script is allowed only when:

- its source is a literal constant in Risk Advisor code;
- model/agent/user values enter only through bounded data channels such as environment values;
- it never evaluates those values as code;
- it uses only approved read-only operations;
- it has no network path;
- it has bounded timeout/output;
- it does not load target-project startup/config code.

A constant `node -e <PRODUCT_LITERAL>` checker is considered a registered predefined TypeScript/Product adapter, not LLM-generated checker code, provided the source is never dynamically generated.

---

# 17. Verifier environment hardening

For shell-world verifiers, freeze a minimal safe environment override including at least:

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

The implementation MAY add other static hardening variables when justified by pinned tool behavior.

It MUST NOT import the original operation's arbitrary environment assignments.

Pwsh already starts with `-NoProfile -NonInteractive` in the pinned executor; this does not remove the need for verifier-specific env hardening.

---

# 18. shell.mkdir.v1

The initial mkdir adapter is intentionally narrow.

## 18.1 Supported Bash forms

```text
mkdir PATH
mkdir -p PATH
```

Constraints:

- exactly one target;
- no other flags;
- no glob/wildcard;
- no wrapper;
- default workdir only.

## 18.2 Supported PowerShell forms

Initial support:

```text
mkdir PATH
```

exactly one target, no flags.

Other PowerShell forms remain UNKNOWN.

## 18.3 Verification

Use fixed shell-world product verifier logic.

Observed outcomes:

- target is a real directory → MATCHED / true;
- target is absent or a non-directory regular object → MISMATCHED / false;
- symlink/reparse-like ambiguity → UNKNOWN;
- access/provider/runtime error → UNKNOWN;
- verifier timeout/cancel → UNKNOWN.

The verifier MUST NOT follow an untrusted final symlink and claim a strong match.

---

# 19. shell.copy-file.v1

Only simple regular-file copy is supported.

## 19.1 Bash form

```text
cp SRC DST
```

No flags. One source, one destination.

## 19.2 PowerShell form

```text
Copy-Item SRC DST
```

No flags. One source, one destination.

Aliases and directory copies are excluded.

## 19.3 Verification

Fixed shell-world verifier:

1. lstat source and destination;
2. both must be regular non-symlink files;
3. each file size must be at most **1 MiB**;
4. read both bounded files;
5. SHA-256 compare.

Results:

- equal digest → MATCHED / true;
- coherent source + destination regular files within bound but unequal → MISMATCHED / false;
- destination absent while source remains coherently observable within bound → MISMATCHED / false;
- source missing, symlink, special file, oversize, access failure or race ambiguity → UNKNOWN.

No file bytes/digests are retained after terminal record publication except the bounded outcome itself.

---

# 20. git.branch-switch.v1

Phase 7 does not implement generic Git verification.

Supported operation forms are only:

```text
git checkout BRANCH
git switch BRANCH
git checkout -b BRANCH
git switch -c BRANCH
```

with:

- exact single branch argument;
- no other options;
- no `--detach`;
- no path checkout;
- no remote syntax;
- branch token restricted to a conservative local branch-name grammar;
- default workdir only.

The Expected Effect is:

```text
current symbolic branch == expectedBranch
```

## 20.1 Fixed verifier

Use a product-owned read-only command equivalent to:

```text
git -c core.fsmonitor=false symbolic-ref --quiet --short HEAD
```

with:

- `GIT_OPTIONAL_LOCKS=0`;
- `GIT_TERMINAL_PROMPT=0`;
- bounded stdout;
- no pager;
- no remote;
- no hook execution initiated by Risk Advisor.

Results:

- exit 0 + exact bounded branch name == expected → true;
- exit 0 + another valid bounded branch name → false;
- detached HEAD/nonzero/truncated/malformed/infrastructure error → UNKNOWN.

No `git status`, `fetch`, `ls-remote`, `rev-parse` fallback chain or generic investigation is added.

---

# 21. package.node-resolve.v1

Phase 7 MUST NOT rerun `npm` or `pnpm` as the verifier.

Reason: package-manager invocation may select/download Corepack/package-manager state, contact a registry, run lifecycle behavior or otherwise exceed read-only verification.

## 21.1 Supported original forms

Only foreground, default-workdir, high-confidence single commands:

```text
npm install PACKAGE
npm i PACKAGE
pnpm add PACKAGE
pnpm install PACKAGE
```

with exactly one package and no other flags.

Package must be a conservative registry package name:

- plain package or scoped package;
- no version/range/tag suffix;
- no URL;
- no git spec;
- no file/path spec;
- no workspace/protocol spec;
- no wildcard.

Excluded:

- bare install;
- `npm ci`;
- global install;
- workspace/filter;
- lockfile-only modes;
- multiple packages;
- aliases/protocol forms.

## 21.2 Verification

Use fixed product-owned Node resolver logic in the shell execution world.

The package name is provided as bounded data, never interpolated into code.

The verifier:

- clears `NODE_OPTIONS`;
- clears `NODE_PATH`;
- never `require()`s/imports the target package;
- performs only a resolution query from the target workdir;
- never runs package code;
- never contacts network.

Frozen semantic result:

- positive successful local resolution → MATCHED / true;
- module-not-found or other negative resolution → UNKNOWN;
- malformed/truncated/error/timeout → UNKNOWN.

The initial package adapter is **positive-proof only**.

It deliberately does not emit hard semantic failure because CJS/ESM/package-export resolution differences could otherwise create a false negative.

---

# 22. No generic ctx.fs verifier

Phase 7 does not mount/use generic `ctx.fs` for postcondition evidence.

Direct `write/edit` need no post-read.

Shell-originating adapters use `ctx.shell` execution-world verifiers.

This avoids turning Phase 7 into a general filesystem Evidence Collector and keeps Phase 8 boundaries intact.

---

# 23. VerificationRecordV1

The only retained Phase-7 outcome is a sanitized bounded record:

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

No retained record may contain:

- raw arguments;
- target path;
- source/destination path;
- branch name;
- package name;
- write/edit content;
- before/after content;
- stdout/stderr;
- Git output/diff;
- manifest/lockfile body;
- secret material;
- verifier command output.

A deterministic internal verification id MAY be derived from `executionId + adapterId + schemaVersion` for idempotency, but it is not an authority token.

---

# 24. Evidence quality

Freeze:

```text
Tool Contract write/edit coherent match/mismatch → HIGH
Shell-world fixed verifier coherent result       → MEDIUM
UNKNOWN / UNAVAILABLE                            → LOW
```

Phase-7 evidence quality MUST NOT be reused to claim:

- workspaceContained;
- sandboxCovered;
- reversible;
- canonical path;
- checkpoint availability.

Those remain Phase-8 concerns.

---

# 25. Verification reason-code discipline

Reason codes are static bounded product vocabulary.

They MUST NOT embed:

- paths;
- package names;
- branch names;
- command fragments;
- raw errors;
- stdout/stderr.

Expected categories include:

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

Exact final names may follow repository naming style but semantic coverage must remain closed and static.

---

# 26. Process-local VerificationStore

Phase 7 freezes Verification as process-local Risk Advisor evidence.

Bounds:

```text
TTL                 = 5 minutes
max per Session     = 128
max global records  = 512
terminal records    = at most 1 per ExecutionId
```

The store owns:

- expected-effect lifecycle;
- terminal VerificationRecord;
- duplicate/idempotency rules;
- async job linkage.

It MUST NOT retain raw expected-effect material after terminal settlement.

Only sanitized read-only diagnostics may be exposed.

No public mutator/projector authority is exported from package root.

---

# 27. No custom durable Session event

The Preflight considered a `risk-advisor/verification` log-only Session event.

Further pinned-Harness review closes that option for Phase 7.

Facts:

1. repository-external Session event types are outside first-party `KNOWN_SESSION_EVENT_TYPES`;
2. equal-version reload accepts unknown external events only when the stored envelope explicitly carries `ignorable:true`;
3. public `Session.append()` constructs the envelope and does not expose a supported third-party argument for adding that marker;
4. unknown required external events can therefore make first-party reload refuse the Session;
5. historical migrations are stricter still.

Therefore Phase 7 MUST NOT append any custom Risk Advisor Session event.

Consequences:

- Verification durability across true process restart is not claimed;
- cold restart loses Phase-7 process-local verification evidence;
- existing Harness Session events remain durable corroboration for their own facts only;
- true cold restart remains an inherited NOT_RUN/unsupported boundary;
- no Session format/persistence package is modified.

If a future pinned Harness exposes an explicit safe out-of-tree informational-event registration/append contract, that can be reviewed separately. It is not assumed now.

---

# 28. No deprecated Session readers

Phase 7 production code MUST NOT introduce calls to:

- `Session.eventAt()`;
- `Session.snapshotEvents()`;
- `Session.ownEvents()`.

Live exact data comes from:

- `tools/pre-execute`;
- `tools/result`;
- exact Session object identity already on `exec.agent.session`;
- existing Risk Advisor bounded stores.

---

# 29. Async VerificationScheduler

Only shell-world adapters need async verification.

Frozen scheduler policy:

```text
timeoutMs              = 5_000
maxConcurrentVerifiers = 2
maxPendingVerifiers    = 8
stdoutMaxBytes          = 4_096
retryCount              = 0
```

Rules:

- direct write/edit never enter scheduler;
- one job per ExecutionId;
- finite active queue;
- finite pending queue;
- saturation returns terminal UNKNOWN;
- each job owns AbortController;
- capability generation is fenced;
- Session disposal cancels relevant jobs;
- plugin/capability disposal aborts and drains;
- late completion from an old generation is ignored;
- teardown reaches quiescence;
- no detached unowned async iterator/promise remains.

Unlike Phase-5 Fast Judge, local deterministic verifiers do not require an operator-enabled policy flag. They run when their required public capability exists and all eligibility gates pass.

---

# 30. Optional shell capability

Risk Advisor MUST continue to mount without `ctx.shell`.

Shell verification is attached only through optional capability injection.

Recommended lifecycle:

```text
Risk Advisor core
  ├── direct write/edit verifier always available
  └── optional ctx.shell attachment
         ├── attach shell verifier generation
         ├── optional sandboxPolicy use when shell is confining
         └── detach → abort/drain generation
```

If a shell executor is sandboxing but `ctx.sandboxPolicy` is unavailable, shell verification is unavailable, not widened or guessed.

Likely type dependencies are optional peer/dev dependencies for the public shell and sandbox-policy contracts. Implementation MUST NOT require those services for base plugin startup.

---

# 31. Base execution outcome + verification overlay

Phase 7 MUST NOT create a competing second execution-outcome authority.

The effective model is:

```text
BaseExecutionOutcome          # existing Phase 2 / live ToolResult authority
+
VerificationRecord            # optional semantic overlay
=
Phase7 ExecutionOutcome
```

Internal `semanticSuccess` widens to:

```ts
true | false | 'unknown'
```

Existing records without supported verification retain:

```text
semanticSuccess = unknown
```

All pre-Phase7 explicit failure behavior remains valid.

---

# 32. Semantic failure identity

Add one deterministic semantic-failure class to the internal failure vocabulary:

```text
SEMANTIC_FAILURE
```

with a static code/reason equivalent to:

```text
POSTCONDITION_MISMATCH
```

No raw target enters the failure identity.

The failure's root-cause category is `postcondition`.

This new class is emitted only when a hard mismatch satisfies Section 4.

---

# 33. FailureChain base/overlay refactor

Current RetryEscalationAnalyzer settles a single RelationOutcome directly from `tools/result`.

Phase 7 freezes a two-source internal relation model:

```text
baseOutcome     # immutable once from tools/result
verification    # optional terminal semantic overlay
        ↓
effective relation outcome
```

Rules:

### 33.1 Base failure

```text
base FAILURE
→ effective FAILURE unchanged
```

Verification cannot erase or replace it.

### 33.2 Base unknown

```text
base UNKNOWN
→ effective UNKNOWN
```

No semantic hard result is promoted over an unknown process outcome.

### 33.3 Base success + matched verification

```text
base SUCCESS
+ semanticSuccess=true
→ effective SUCCESS
```

### 33.4 Base success + mismatched verification

```text
base SUCCESS
+ semanticSuccess=false
→ effective FAILURE
  failureKind=SEMANTIC_FAILURE
```

### 33.5 Base success + unknown/unavailable verification

```text
base SUCCESS
+ semanticSuccess=unknown
→ effective process SUCCESS
  semantic remains unknown
```

It is not counted as failure.

### 33.6 Conflict

Conflicting verification evidence:

- never last-writer-wins;
- degrades verification to UNKNOWN;
- marks relation evidence degraded;
- does not fabricate a semantic failure.

---

# 34. FailureChain temporal semantics

Semantic verification may inform later approvals/retries only after it has settled.

The existing temporal rule remains:

```text
prior failure evidence must be settled before the later execution is captured
```

Therefore:

- if async semantic verification settles before the next matching execution is captured, it may form the retry/failure relation;
- if a new execution starts before the verifier settles, Phase 7 MUST NOT retroactively create a retry edge later;
- no historical relation is rewritten after capture;
- duplicate identical verification cannot increment counts twice.

This preserves deterministic temporal causality.

---

# 35. Semantic root-cause signature

A semantic mismatch signature must be stable and privacy-safe.

It MAY combine:

```text
SEMANTIC_FAILURE
+
adapterId
+
existing hashed operation fingerprint when available
```

It MUST NOT contain:

- raw path;
- package;
- branch;
- command;
- file content.

This supports same-root-cause correlation without expanding retained sensitive context.

---

# 36. Approval lifecycle boundary

Phase 7 occurs after the verified execution settles.

The approval that allowed that execution is already resolved.

Therefore Phase 7 MUST NOT:

- reopen Native Approval;
- answer approval;
- publish A3;
- mutate A1/A2;
- resurrect a closed approval shell;
- alter the user's prior decision.

Phase-7 evidence may affect only future contexts through ExecutionOutcome / FailureChain.

---

# 37. Browser boundary

No new Browser protocol is required in Phase 7.

Phase-6 Browser views remain approval-time advisory views.

Phase 7 does not push historical verification into a resolved approval card.

If a later product phase wants historical semantic-outcome UI, that requires a separate design.

---

# 38. Phase-8 boundary

Phase 8 owns general Evidence Collector capability:

```text
stat
list
canonical path
small config read
git state
checkpoint evidence
```

Phase 7 adapters may perform only the fixed minimal reads frozen inside their exact postcondition recipe.

They MUST NOT expose or reuse those observations as general Evidence Collector facts.

Specifically Phase 7 MUST NOT set:

- `workspaceContained`;
- `sandboxCovered`;
- `reversible`;
- canonical target facts;
- checkpoint/rollback facts.

---

# 39. Privacy boundary

At terminal verification, retained state may contain only VerificationRecordV1 and existing non-raw identifiers.

Privacy tests MUST prove absence of:

- raw args;
- write/edit body;
- source/destination;
- package name;
- branch name;
- command;
- verifier stdout/stderr;
- secrets.

Logs MUST use static reason codes, not raw exception text.

---

# 40. Recommended implementation structure

Implementation is expected to use approximately:

```text
src/host/shell-analysis.ts
src/host/expected-effect.ts
src/host/postcondition-verifier.ts
src/host/verification-scheduler.ts
```

and modify:

```text
src/host/rule-engine.ts
src/host/explicit-failure.ts
src/host/retry-escalation.ts
src/index.ts
package.json
```

Names may vary if repository structure makes another split cleaner, but ownership boundaries above are frozen.

The shared shell analyzer is package-private.

The verifier scheduler is Host-only.

No Client code is required.

---

# 41. Read-only diagnostics

If a Context diagnostic seam is added, it may expose only sanitized terminal records:

```ts
interface VerificationDiagnostics {
  get(executionId: ExecutionId): VerificationRecordV1 | undefined
}
```

It MUST NOT expose:

- ExpectedEffect objects;
- raw paths;
- captured strings;
- scheduler mutators;
- authoritative event/projector methods.

Package root may export sanitized data types only if needed by tests/consumers.

---

# 42. Mandatory focused tests — capture

Tests MUST cover:

- exact supported direct write shape;
- exact supported direct edit shape;
- accessor/getter not invoked;
- exotic object rejected;
- oversized content rejected/fails closed;
- unknown tool no raw traversal;
- unsupported shell no ExpectedEffect;
- background shell not eligible;
- explicit workdir not eligible;
- ambiguous/chained/piped/redirection shell not eligible;
- wrapper/env assignment not eligible;
- no raw write content retained after capture.

---

# 43. Mandatory focused tests — Tool Contract verification

Tests MUST cover:

- write exact match → true;
- write deterministic mismatch → false;
- write malformed canonical result → unknown;
- write result error → not semantic success;
- edit single-match true;
- edit replace-all true;
- edit deterministic mismatch false;
- edit LF normalization contract;
- malformed before/after → unknown;
- no retained before/after/content.

---

# 44. Mandatory focused tests — shared shell parser

Before/after extraction regression MUST prove Phase-4 accepted corpus equivalence for:

- segment splitting;
- quoting/escaping;
- pipes;
- chaining;
- substitutions;
- wrappers;
- package install findings;
- git/destructive findings;
- permission findings;
- ambiguity/degradation;
- existing RuleEvaluation result structure.

No Phase-4 risk finding may disappear because of the refactor.

---

# 45. Mandatory focused tests — execution policy

Tests MUST prove:

- same original sandbox mode reconstructed;
- never wider verifier mode;
- no approval request from verifier;
- missing sandboxPolicy → unknown;
- sandbox capability generation change → unknown;
- unsandboxed original + currently sandboxed verifier → unknown;
- sandboxed original + currently unsandboxed verifier → unknown;
- default-workdir reconstruction matches supported Bash/Pwsh cases;
- explicit workdir remains unsupported.

---

# 46. Mandatory focused tests — mkdir/copy

mkdir:

- Bash simple match;
- Bash `-p` match;
- Pwsh simple match;
- absent/wrong type mismatch;
- symlink → unknown;
- unsupported flags/multiple targets → no adapter.

copy:

- Bash simple file copy match;
- Pwsh Copy-Item file match;
- digest mismatch false;
- destination absent false when source is coherently verified;
- source missing → unknown;
- symlink → unknown;
- directory → unknown;
- >1 MiB → unknown;
- no retained file bytes/digest.

---

# 47. Mandatory focused tests — Git

Tests MUST prove:

- checkout branch match;
- switch branch match;
- create branch forms match;
- different coherent symbolic branch → false;
- detached HEAD → unknown;
- invalid/truncated output → unknown;
- unsupported Git command → no adapter;
- options/remote/path checkout excluded;
- verifier command has no remote operation;
- `GIT_OPTIONAL_LOCKS=0`;
- `GIT_TERMINAL_PROMPT=0`;
- no pager/hook/network path in the verifier recipe.

---

# 48. Mandatory focused tests — npm/pnpm

Tests MUST prove:

- npm install one plain package eligible;
- npm i one scoped package eligible;
- pnpm add eligible;
- pnpm install explicit package eligible;
- positive local resolution → true;
- missing/unresolvable → unknown;
- no target package execution/import;
- no npm/pnpm invocation by verifier;
- no network;
- no lifecycle scripts;
- multiple packages excluded;
- version/tag/url/git/file/workspace specs excluded;
- global/workspace/filter/ci/bare install excluded;
- NODE_OPTIONS/NODE_PATH neutralized.

---

# 49. Mandatory focused tests — scheduler

Tests MUST prove:

- max concurrent = 2;
- max pending = 8;
- saturation terminal unknown;
- timeout aborts;
- active cancel drains;
- queued cancel drains;
- Session disposal cancels owned jobs;
- shell capability detach drains;
- plugin disposal drains;
- late completion cannot overwrite terminal/fenced record;
- one job per ExecutionId;
- no hidden retry;
- original ToolResult is not awaited/rewritten.

---

# 50. Mandatory focused tests — outcome and FailureChain

Tests MUST prove:

- no adapter → semantic unknown;
- process success + match → semantic true;
- process success + hard mismatch → semantic false + SEMANTIC_FAILURE;
- process failure remains process failure;
- base UNKNOWN remains unknown;
- unknown verifier does not count as failure;
- semantic failure counted once;
- semantic failure settled before later capture can support retry relation;
- late semantic failure after later capture does not retroactively create retry;
- identical duplicate is idempotent;
- conflicting verification degrades;
- same-root-cause uses privacy-safe signature;
- existing Phase-3 retry/permission-escalation behavior unchanged.

---

# 51. Mandatory focused tests — approval/browser non-interference

Tests MUST prove:

- no Native Approval answerer added;
- no A3;
- no A1/A2 mutation after closure;
- no closed approval resurrection;
- Phase-6 Browser bridge schema unchanged;
- verifier timeout/saturation/error does not affect Native Approval;
- no Client package/code changes required.

---

# 52. Mandatory focused tests — persistence/session safety

Tests MUST prove:

- Phase 7 appends no custom Risk Advisor Session event;
- no `Session.append('risk-advisor/...')`;
- no deprecated Session synchronous readers in production;
- `deriveMessages()` is unchanged by Phase-7 runtime;
- existing Harness Session persistence remains untouched;
- no session-format package dependency is introduced.

---

# 53. Resource and latency measurements

Phase 7 should add a focused local benchmark/evidence section for:

- direct write verification duration;
- direct edit verification duration;
- scheduler queue behavior;
- mkdir verifier;
- copy verifier at small and 1 MiB boundary;
- Git verifier;
- Node-resolution verifier;
- timeout/saturation paths.

This is local deterministic verification, not provider latency.

No real network/provider call is allowed.

Benchmark evidence MUST distinguish:

```text
LOCAL_VERIFIER_ONLY
NETWORK_NOT_USED
PROVIDER_NOT_USED
```

---

# 54. Test/governance order

Phase-7 implementation follows:

```text
Implementation
→ P7 focused
→ shared-parser Phase4 equivalence
→ P6 regression
→ P5 regression
→ P4 regression
→ P3 regression
→ P2 regression
→ P1 / R1-R5 affected regressions
→ typecheck
→ build
→ Host/Client export checks as affected
→ declaration / pack / git diff --check
→ privacy / no-network / no-custom-session-event gates
→ P7 local verifier benchmark/evidence
→ executable commit
→ exactly one fresh complete pnpm test on that exact committed SHA
→ no executable drift
→ report/evidence-only publication
```

After the final Full:

- no executable code drift;
- no test semantic drift;
- no package/config semantic drift;
- only report/evidence/docs may follow.

---

# 55. Full regression acceptance

The final executable SHA is accepted only if:

- all P7 focused tests pass;
- all affected prior focused lanes pass;
- all static/package/privacy gates pass;
- no real network/provider calls occur;
- pinned Harness remains read-only;
- exactly one fresh complete `pnpm test` passes on the exact executable SHA;
- final published remote differs from Tested SHA only by allowed report/evidence docs.

---

# 56. STOP conditions

Implementation must stop with `PHASE7_ARCHITECTURE_DECISION_REQUIRED` if it would require:

- modifying Harness Core;
- generic Host filesystem reads for shell-originating postconditions;
- Phase-8 general evidence collection;
- any network verification;
- model/agent/user-generated checker execution;
- interpolating untrusted values into executable checker source;
- widening sandbox mode;
- asking approval for a verifier;
- blocking original ToolResult on async verification;
- persisting raw ExpectedEffect/result data;
- adding a custom required Session event;
- using deprecated Session readers;
- reopening approval or publishing A3;
- accepting parser-ambiguous shell forms;
- broadening Git/package adapter beyond the frozen subset;
- changing Phase-5 six-dimension or P0-P9 recommendation semantics.

Unknown is always preferred to crossing these boundaries.

---

# 57. Inherited open evidence boundaries

Unless directly and honestly closed by Phase 7, retain:

- F-006 PARTIAL;
- F-013 PARTIAL;
- general guard-returned denial PARTIAL/UNKNOWN where complete witness is absent;
- true disk/process restart NOT_RUN;
- real native PTC producer NOT_RUN;
- LIVE_BROWSER_NOT_RUN;
- APPROVAL_PLUGIN_COEXISTENCE_NOT_RUN;
- WebWorker NOT_VALIDATED;
- newer Harness/V4 NOT_VALIDATED;
- Phase-8 Evidence Collector NOT_IMPLEMENTED;
- Phase-9 Deep Judge NOT_IMPLEMENTED;
- real-provider Fast-Judge latency policy UNDETERMINED.

Phase 7 does not claim cold-restart recovery of process-local VerificationStore.

---

# 58. Frozen implementation invariants

The Phase-7 implementation is accepted only if all remain true:

```text
I1  exit 0 never directly implies semantic success.
I2  Only Tool Contract / Known Adapter drives hard verification.
I3  Unknown beats guessing.
I4  Direct write/edit verification performs no post-read.
I5  Shell-originating verification stays in ctx.shell execution world.
I6  Verifier policy is same-or-narrower, never wider.
I7  Verifier never asks approval.
I8  No verifier performs network access.
I9  No dynamic checker code is generated/executed.
I10 Phase4 and Phase7 share one bounded shell-analysis authority.
I11 Workdir-explicit shell calls are outside initial deterministic adapters.
I12 Generic ctx.fs evidence collection is not introduced.
I13 VerificationRecord retains no raw operation/evidence content.
I14 No custom Risk Advisor Session event is appended.
I15 Base Tool/process failure remains authoritative.
I16 Semantic mismatch is a deterministic overlay only on process success.
I17 Async verification never delays or rewrites ToolResult.
I18 FailureChain uses evidence settled before later capture; no retroactive retry edge.
I19 Phase7 never creates A3 or reopens approval.
I20 Phase8 facts remain untouched.
```

---

# 59. Architecture verdict

`PHASE7_ARCHITECTURE_FROZEN_FOR_IMPLEMENTATION`

The repository and pinned Harness expose enough safe public seams for a bounded Phase-7 implementation:

- exact live ExecutionId/ToolExecution correlation;
- canonical live `tools/result.value`;
- strong direct write/edit Tool Contracts;
- existing accepted Phase-4 shell parser;
- provider-neutral `ctx.shell`;
- explicit shell `sandboxPolicy`;
- bounded process-local stores and lifecycle patterns already established by prior phases.

The implementation is intentionally conservative:

- direct write/edit get strong deterministic verification;
- mkdir/copy/Git use only tiny closed read-only shell-world adapters;
- npm/pnpm get positive local resolution proof only;
- all other cases remain semantic UNKNOWN;
- no Session persistence extension is attempted;
- no Phase-8 Evidence Collector is pulled forward.
