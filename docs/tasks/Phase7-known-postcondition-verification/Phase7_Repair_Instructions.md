# Risk Advisor — Phase 7 Final Review Repair Instructions

**Review verdict:** `PHASE7_REPAIR_REQUIRED`  
**Date:** 2026-10-02  
**Reviewed executable/Tested SHA:** `25c9326f0c8863cd994698e220edbeaba7bed804`  
**Reviewed report-only remote SHA:** `2d762d5efa84c5cbdfe26fee44743c492523b0ab`  
**Frozen Phase-7 architecture:** `fc0ed814e5f06e720f56a62eba19ce55100f6dd2`  
**Implementation instructions:** `37b450d4a057216e7d6150a8d370992e1348f60c`  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, READ-ONLY.

## 1. Independent review result

The Phase-7 publication discipline is clean:

- `25c9326f... → 2d762d5e...` is docs-only `Execution_Report.md`;
- no post-Full executable drift is present;
- the implementation contains the intended major architecture:
  - ExpectedEffect capture;
  - shared Phase-4/7 shell analysis;
  - direct write/edit Tool-Contract verification;
  - shell-world verifiers through `ctx.shell.resolve/run`;
  - process-local VerificationStore;
  - bounded scheduler;
  - semantic overlay in FailureChain;
  - no custom Risk Advisor Session event;
  - no Browser/Native Approval redesign.

Final acceptance is blocked by F1–F6 below.

These are Phase-7 implementation repairs only. Do not redesign Phase 7 and do not enter Phase 8.

---

## 2. F1 — ExpectedEffect raw state does not obey frozen TTL/session bounds

### Current problem

`ExpectedEffectRegistry` keeps raw adapter data in:

```text
effects: Map<ExecutionId, effect>
executionsById: Map<ExecutionId, ToolExecution>
executions: WeakMap<ToolExecution, ExpectedEffect>
```

For edit/shell adapters, `ExpectedEffect` contains raw ephemeral values such as:

- oldString/newString;
- target;
- sourcePath/destinationPath;
- expectedBranch;
- packageName;
- Session.

The current cleanup paths remove `effects` and `executionsById`, but do not consistently delete the corresponding `executions` WeakMap entry:

- `sweep()` expires a record but leaves `executions.get(exec)` holding the raw effect;
- `disposeSession()` marks the execution in `disposedExecutions` but leaves the WeakMap value;
- `dispose()` cannot clear the readonly WeakMap at all.

Therefore a live ToolExecution object can keep raw ExpectedEffect material reachable beyond the frozen TTL/session lifecycle.

The registry also enforces only:

```text
max global = 512
```

but not the frozen:

```text
max per Session = 128
```

for ExpectedEffect lifecycle state.

This violates the Phase-7 resource/privacy invariant that the bounded store owns ExpectedEffect lifecycle and raw material is dropped on expiry/session disposal/terminal settlement.

### Required repair

Implement a single cleanup primitive for ExpectedEffect removal.

Every removal path must:

1. remove `effects[executionId]`;
2. remove `executionsById[executionId]`;
3. delete the exact `executions` WeakMap entry when the ToolExecution is still known;
4. make later `take(exec)` return undefined;
5. retain no raw ExpectedEffect material through another registry collection.

Recommended:

- make the execution WeakMap replaceable on full dispose, or ensure the entire map has no remaining live value references;
- use an explicit per-Session bounded index for active ExpectedEffects;
- cap one Session at 128 active effects;
- keep global cap 512;
- TTL remains five minutes;
- capacity eviction must remove every raw index atomically;
- terminal `take()` must remain exact and one-shot.

Do not expose ExpectedEffect diagnostics.

### Mandatory tests

Add executable proof for:

- TTL expiry removes all lookup paths to the raw effect;
- session disposal removes all lookup paths;
- full registry disposal removes all lookup paths;
- terminal `take()` is one-shot;
- >128 active effects in one Session cannot retain >128 raw effects;
- global bound remains 512;
- eviction/expiry never invokes hostile getters;
- edit old/new strings and shell path/package/branch data are no longer reachable through registry behavior after cleanup.

---

## 3. F2 — scheduler timeout/capability detach does not reach true quiescence

### Current timeout bug

`VerificationScheduler.run()` currently uses:

```text
Promise.race([
  job.run(signal),
  timeoutPromise
])
```

At timeout:

1. AbortController is aborted;
2. timeout Promise rejects;
3. scheduler publishes UNKNOWN;
4. `run()` exits;
5. active slot is deleted;
6. `pump()` may start another verifier.

But the underlying `job.run(signal)` promise is no longer awaited/tracked after the race loses.

With the pinned shell executor, abort initiates subprocess termination and the shell promise can settle later after provider/process cleanup.

That means the scheduler can:

- consider a timed-out slot free before the underlying verifier process is actually quiescent;
- briefly exceed the frozen real-concurrency bound;
- remove the task from `inflight` while the shell run still owns work;
- let `dispose()` complete without joining that timed-out underlying promise.

This violates:

```text
abort + drain
no unowned detached async work
maxConcurrentVerifiers = 2 as real owned verifier work
teardown reaches quiescence
```

### Current capability-detach bug

`PostconditionVerifier.detach()` is synchronous:

```text
scheduler.fence()
return
```

and the Cordis shell child disposer calls it without awaiting a drain.

The Freeze requires shell capability detach to fence, abort **and drain** the owned generation.

### Current sandboxPolicy generation bug

The plugin injects only:

```text
ctx.inject(['shell'], ...)
```

then snapshots:

```text
shellCtx.get('sandboxPolicy', false)
```

If a confining shell remains mounted while `sandboxPolicy` is removed/replaced, Risk Advisor does not receive a capability-generation transition and can retain/use the stale policy object.

That violates the frozen capability-generation fence.

### Required repair

Refactor scheduler ownership so timeout/cancel/fence semantics distinguish:

```text
logical terminal record
from
underlying verifier work quiescence
```

Requirements:

- timeout may publish terminal UNKNOWN at 5000ms;
- abort the underlying run;
- keep the underlying run promise tracked/owned until it settles;
- do not free the real concurrency slot until underlying run settles;
- do not start replacement work merely because the timeout record was published;
- `dispose()` awaits all owned underlying work;
- capability detach awaits draining the detached generation;
- late underlying completion never publishes a second result.

Implement an async capability teardown API such as:

```text
await verifier.detach()
```

or an equivalent `fenceAndDrainGeneration()`.

Cordis supports async effect disposers; use that capability so shell/sandbox-policy unload does not return before verifier generation quiescence.

For a sandboxing shell, lifecycle ownership must include the `sandboxPolicy` capability:

- if shell is unsandboxed, shell alone is sufficient;
- if shell is sandboxing, attach usable verification only while both shell and sandboxPolicy are present;
- sandboxPolicy unload/replacement must fence + abort + drain the old verifier generation;
- do not retain/use a stale policy service.

A nested optional injection or equivalent lifecycle-safe composition is acceptable.

### Mandatory tests

Prove:

- timeout publishes one UNKNOWN at 5000ms;
- underlying run remains owned after timeout until it actually settles;
- active real-work count is not freed early;
- next queued job does not start before timed-out underlying run settles;
- dispose does not resolve before underlying aborted run settles;
- capability detach does not resolve before old generation settles;
- detach + reattach cannot let old completion publish into new generation;
- sandboxPolicy unload while shell remains fences old work;
- sandboxPolicy replacement uses new capability only;
- no stale policy object is used after unload;
- active+pending counts reach zero after awaited detach/dispose;
- no hidden detached promise remains.

Use deterministic deferred promises/fake timers; do not sleep real five seconds.

---

## 4. F3 — frozen shell adapter grammar is broader/less faithful than allowed

### F3.1 Git form pairing is wrong

Current capture accepts either `-b` or `-c` for either checkout or switch:

```text
git checkout -b BRANCH    # frozen valid
git checkout -c BRANCH    # currently accepted, frozen invalid

git switch -c BRANCH      # frozen valid
git switch -b BRANCH      # currently accepted, frozen invalid
```

The adapter must implement the exact frozen command set only.

### F3.2 Path-like operands beginning with `-` are treated as data

Current `mkdir` / `cp` / `Copy-Item` recognition can treat an operand beginning with `-` as a target/source/destination.

Examples such as:

```text
mkdir -x
cp -T dest
Copy-Item -Path foo
```

are not the frozen simple operand forms.

They must be excluded rather than interpreted as deterministic paths.

### F3.3 PowerShell backslashes are parsed with Bash escape semantics

The shared tokenizer treats `\` as an escape in both dialects.

PowerShell native paths use backslash as a normal path separator.

Therefore a command such as:

```text
mkdir C:\temp\out
```

can be tokenized into a value different from the command PowerShell actually receives.

Using that transformed value as a deterministic postcondition target can produce false semantic mismatch.

Phase 4 inherited parser behavior was previously advisory; Phase 7 now uses parsed operands as verification authority, so operand fidelity must be exact before a hard result is allowed.

### F3.4 Git observed output is not validated before hard mismatch

For `git.branch-switch.v1`, current verifier maps any non-empty bounded exit-0 stdout unequal to expected branch into:

```text
MISMATCHED / semanticSuccess=false
```

The Freeze permits false only for:

```text
another valid bounded branch name
```

Malformed/polluted output must be UNKNOWN.

### Required repair

Implement exact frozen recognition:

```text
git checkout BRANCH
git checkout -b BRANCH
git switch BRANCH
git switch -c BRANCH
```

and nothing else.

For mkdir/copy path operands:

- reject option-looking operands in the initial subset;
- PowerShell named-parameter forms remain unsupported;
- preserve exact operand text used by the real dialect before accepting adapter eligibility.

For PowerShell:

- either make the shared tokenizer dialect-aware so backslash is preserved and prove Phase-4 output equivalence;
- or conservatively reject Phase-7 Pwsh path operands whose exact fidelity cannot be proven.

Do not create a second parser.

If changing shared tokenization, rerun the full P4 equivalence corpus and preserve RuleEvaluation semantics.

For Git verifier output:

- validate stdout with the same conservative local branch grammar before emitting hard mismatch;
- invalid/malformed output → UNKNOWN.

### Mandatory tests

Add:

- checkout -b accepted;
- checkout -c rejected;
- switch -c accepted;
- switch -b rejected;
- mkdir option-looking target rejected;
- Bash cp option-looking source/destination rejected;
- Pwsh Copy-Item named-parameter form rejected;
- Pwsh native backslash path is either preserved exactly or rejected to UNKNOWN/no adapter;
- quoted Pwsh path with spaces retains exact data if supported;
- Git exit-0 malformed output → UNKNOWN;
- Git exit-0 another valid branch → MISMATCHED;
- P4 equivalence remains green.

---

## 5. F4 — copy verifier converts verifier/access errors into hard semantic mismatch

### Current problem

Current fixed copy checker has an inner destination block equivalent to:

```text
try {
  lstat(destination)
  ...
  read/compare
} catch {
  output MISMATCHED
}
```

This means all destination-side exceptions can become hard semantic failure, including cases such as:

- EACCES;
- EPERM;
- provider/transient filesystem failure;
- race between lstat and read;
- other non-ENOENT read errors.

The Architecture Freeze allows:

```text
destination confirmed absent
→ MISMATCHED
```

but requires:

```text
access/provider/runtime/race ambiguity
→ UNKNOWN
```

A verifier infrastructure/read failure must never become deterministic semantic failure.

### Required repair

Classify destination-side failures exactly:

- confirmed ENOENT absence after coherent source observation → MISMATCHED;
- EACCES/EPERM/other access or provider errors → UNKNOWN;
- read failure after successful lstat → UNKNOWN;
- file changed/disappeared during verification → UNKNOWN unless the only coherent observation is confirmed final absence under the frozen recipe;
- symlink/special/directory/oversize → UNKNOWN;
- only coherent regular bounded unequal files → MISMATCHED.

Prefer a structured fixed checker output with closed static markers if needed.

Do not leak filesystem error text/codes into retained VerificationRecord beyond a static reason category.

### Mandatory tests

Use disposable local or deterministic injected fixtures to prove:

- equal regular files → MATCHED;
- unequal regular files → MISMATCHED;
- destination confirmed absent → MISMATCHED;
- destination EACCES → UNKNOWN;
- destination EPERM → UNKNOWN;
- destination disappears/read races → UNKNOWN;
- source access failure → UNKNOWN;
- source missing → UNKNOWN;
- symlink/directory/special/oversize → UNKNOWN;
- no raw path/error/output retained.

---

## 6. F5 — verification conflict can retroactively rewrite an already-captured retry relation

### Current problem

Phase 7 correctly tries to enforce:

```text
semantic failure must settle before later capture
```

However `FailureChainSummary` still recomputes `directPrior()` dynamically from the **current** prior record state.

Scenario:

1. execution A settles process-success;
2. verification A = semantic mismatch;
3. execution B is captured and correctly obtains retry relation to A;
4. later conflicting verification for A arrives;
5. A becomes CONFLICTED / base success;
6. querying B again can lose `retryOf=A` because `directPrior()` now sees A as no longer settled failure.

That rewrites a historical relation **after B capture**, violating:

```text
no historical relation is rewritten after capture
```

The conflict path is explicitly part of the frozen contract and must behave deterministically even if normal runtime duplication is rare.

### Required repair

Freeze the retry evidence selected at B's capture boundary.

A later verification conflict may:

- degrade A for future captures;
- prevent new later retry edges from using A;

but must not erase or rewrite the retry edge already captured for B.

Recommended:

- store the eligible prior relation identity/evidence snapshot on the later record at capture;
- or otherwise make `retryOf` causally immutable once selected.

Do not revert Phase-3 nearest-prior semantics.

### Mandatory tests

Prove:

1. A semantic mismatch settles;
2. B captures afterward and has `retryOf=A`;
3. conflicting verification for A arrives;
4. B still reports the same historical `retryOf=A`;
5. B's captured failure-context count does not silently rewrite;
6. a new later capture after the conflict does not incorrectly use conflicted A;
7. identical duplicate verification remains idempotent;
8. conflict never creates last-writer-wins semantic failure.

---

## 7. F6 — focused proof and benchmark coverage do not match the frozen mandatory matrix

### Current focused evidence

Current Phase-7 focused suite reports:

```text
5 files / 16 tests
```

The existing tests prove important happy paths but do not executable-prove many mandatory frozen boundaries.

Examples currently not adequately covered include:

- ExpectedEffect TTL cleanup;
- per-Session 128 bound;
- exact session-disposal raw-state cleanup;
- scheduler timeout underlying-run quiescence;
- capability detach drain;
- sandboxPolicy unload/replacement generation fence;
- full exact Git form matrix;
- option-looking mkdir/copy exclusion;
- PowerShell native path fidelity;
- Git malformed-output UNKNOWN;
- mkdir absent/non-dir/symlink behavior against actual checker logic;
- copy access/race/error classifications;
- copy 1 MiB boundary;
- package negative-resolution checker path through an attached shell;
- conflict/idempotency in VerificationStore + FailureChain;
- approval/A3/browser non-interference as direct Phase-7 proof;
- no custom Session event/deprecated reader as executable/static gate tied to P7.

### Current benchmark gap

`benchmarks/r5-phase7.mjs` currently measures:

- direct write;
- direct edit;
- synthetic scheduler completion.

It does **not** measure the implemented local verifier paths required by the implementation instructions:

- mkdir verifier;
- small copy verifier;
- copy near 1 MiB bound;
- Git branch verifier;
- positive Node-resolution verifier;
- real timeout/saturation scheduler path.

The report therefore overstates completion of the Phase-7 benchmark requirement.

### Required repair

Expand focused proof using parameterized tests rather than artificial test-count inflation.

The final focused suite must executable-prove every mandatory repair above and the material Architecture Freeze §§42–52 boundaries.

Expand the local Phase-7 benchmark to exercise the actual implemented local verifier paths:

```text
direct write
direct edit
scheduler enqueue/settle
mkdir
small copy
copy near 1 MiB
Git branch
positive Node resolution
timeout
saturation
```

Keep labels:

```text
LOCAL_VERIFIER_ONLY
NETWORK_NOT_USED
PROVIDER_NOT_USED
```

Do not make external network/registry/Git-remote calls.

Do not install new packages from registry for the benchmark.

---

## 8. Preserve accepted implementation

Do not regress:

- shared Phase-4/7 shell-analysis authority;
- direct write/edit no-post-read design;
- public `ctx.shell.resolve/run` verifier seam;
- no hidden verifier Tool;
- no verifier approval;
- no custom Risk Advisor Session event;
- no deprecated Session readers;
- process-local sanitized VerificationRecord;
- positive-only package resolution semantics;
- no generic `ctx.fs` Evidence Collector;
- no Browser Phase-7 changes;
- no A3;
- no Native Approval changes;
- no Phase-8/9 implementation;
- provider/network/registry/Git remote call count = 0;
- Harness Core read-only.

---

## 9. Do not use repair as scope expansion

Do not add:

- additional Git operations;
- richer npm/pnpm syntax;
- explicit-workdir deterministic adapters;
- generic PowerShell command support;
- directory-copy semantics;
- custom durability;
- general filesystem evidence;
- generic process-output interpretation.

If a frozen adapter cannot be made reliable inside the frozen subset, fail closed to UNKNOWN rather than broaden it.

---

## 10. Repair validation order

Use the established governance.

1. Implement only F1–F6.
2. Run expanded `test:p7`.
3. Run P4 parser-equivalence / focused regression.
4. Run P3 focused regression.
5. Run P2 focused regression.
6. Run P6 focused regression.
7. Run P5 focused regression.
8. Run P1A/P1B/P1C + R1–R4 affected regressions.
9. Typecheck.
10. Build.
11. Host export smoke.
12. Client export regression smoke.
13. Declaration/root-export audit.
14. `pnpm pack --dry-run --json`.
15. `git diff --check`.
16. Scope/privacy/secret audit.
17. no-network/no-provider/no-registry/Git-remote audit.
18. no-custom-Session-event/deprecated-reader audit.
19. Harness mutation=0 verification.
20. expanded Phase-7 local verifier benchmark smoke/full.
21. Commit all executable/source/test/package/benchmark repair changes.
22. Record exact repair executable SHA.
23. Run exactly one fresh complete `pnpm test` on that exact committed SHA.

If the Full fails:

- preserve the failed attempt;
- repair only within frozen Phase-7 scope;
- rerun affected pre-Full gates;
- create a new executable commit;
- run a new fresh Full on the new exact SHA.

After a passing Full, no executable/test/config/package/benchmark semantic drift.

---

## 11. Report update

After the passing repair Full, update only:

`docs/tasks/Phase7-known-postcondition-verification/Execution_Report.md`

Add a distinct **Final Repair F1–F6** section and update the current top-level Tested SHA/evidence.

Record:

- repair start SHA;
- new executable/Tested SHA;
- F1 raw-state lifecycle/per-session-bound proof;
- F2 timeout/detach/sandboxPolicy quiescence proof;
- F3 exact grammar/Pwsh path/Git-output proof;
- F4 copy error-classification proof;
- F5 immutable captured retry relation proof;
- F6 expanded focused matrix/count;
- expanded benchmark paths/results;
- inherited regression/static/package/privacy gates;
- exact fresh Full file/test count;
- Tested→remote docs-only proof;
- inherited PARTIAL/NOT_RUN/NOT_VALIDATED boundaries unchanged.

Historical `25c9326f...` / 216-test Full remains chronology only after a repaired executable is published.

---

## 12. Side-effect limits

Repair execution must keep:

```text
real provider/model calls = 0
real external network calls = 0
package registry calls = 0
Git remote calls = 0
Harness tracked mutations = 0
custom Risk Advisor Session events = 0
Native Approval authority changes = 0
Phase-8+ implementation = 0
```

Disposable local filesystem/Git/node_modules fixtures are allowed.

---

## 13. STOP conditions

STOP with `PHASE7_ARCHITECTURE_DECISION_REQUIRED` if repair would require:

- changing the frozen adapter families rather than narrowing them;
- generic Host filesystem evidence;
- network verification;
- widening sandbox policy;
- verifier Approval;
- a hidden verifier Tool;
- custom Session persistence;
- Phase-8 evidence collection;
- Browser protocol changes;
- Phase-5 assessment/recommendation semantic changes;
- Harness Core changes;
- abandoning quiescence because the underlying pinned shell cannot be joined after abort.

Do not improvise around a STOP condition.

---

## 14. Allowed handoff

After repaired implementation, expanded focused proof, all inherited/static/privacy gates, expanded local benchmark, one fresh complete Full, report-only publication, push and remote equality verification, return:

`PHASE7_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE7_ACCEPTED`.

Do not create `Acceptance_Report.md`.

Do not start Phase 8.
