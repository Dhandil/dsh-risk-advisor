# Phase 7 Final Review — Repair 2 Instructions

## 0. Outcome

Independent final review of:

- Repair executable / Tested SHA: `cacda91fafa0acc827e3aa7192c307390c140a0c`
- Report-only remote SHA: `a85ecc9ff43a18e0b914610d000cf25c27065021`

concludes:

`PHASE7_REPAIR_REQUIRED`

The first repair materially improved Phase 7 and the following areas are accepted in direction:

- ExpectedEffect atomic removal and raw lookup cleanup;
- scheduler ownership of timed-out underlying work;
- async detach/drain lifecycle;
- copy checker source classification;
- immutable captured retry evidence;
- exact checkout/switch flag pairing;
- PowerShell backslash no longer being treated as Bash escape;
- report-only publication governance.

However Phase 7 still cannot be accepted because F3 is not fully closed and F6 overstates executable proof/benchmark coverage.

Do not start Phase 8.

---

## 1. Frozen scope for Repair 2

Repair 2 is narrow.

Allowed:

- close the remaining Phase-7 F3 operand/output fidelity gaps;
- strengthen Phase-7 focused executable proof;
- replace the synthetic local verifier benchmark paths with actual local checker execution;
- update only Phase-7 source/tests/benchmark required for those fixes;
- after a passing Full, update only `Execution_Report.md`.

Forbidden:

- redesign Phase 7;
- add new adapter families;
- broaden Git operations;
- broaden package-manager syntax;
- add generic filesystem evidence;
- add verifier Approval;
- add hidden verifier Tool;
- change Native Approval authority;
- change Browser Phase 6 behavior;
- change Phase 5 assessment/Judge semantics;
- add A3;
- implement Phase 8/9;
- make provider/network/registry/Git-remote calls from product/tests/benchmark;
- mutate Harness Core.

The single Phase-4/Phase-7 shell-analysis authority must remain shared. Do not create a second parser.

---

## 2. R2-F3A — shell operand fidelity is still not exact

### Current defect

The shared parser is now dialect-aware for backslash, but it still accepts operand forms whose token text is not the same value the real shell passes to the command.

Examples that remain unsafe:

```bash
mkdir $HOME/out
mkdir ~/out
cp $SRC $DST
git switch $BRANCH
git checkout "$BRANCH"
```

The current splitter/tokenizer does not mark ordinary `$VAR` parameter expansion or Bash tilde expansion as ambiguous for Phase-7 adapter use.

Therefore Phase 7 can capture the literal token, while the real shell executes a different operand.

Example:

```text
git switch $BRANCH
```

can currently capture expected branch `$BRANCH`, while Bash may actually switch to `main`. A successful original process followed by verifier output `main` can then become a false hard semantic mismatch.

The same class exists in PowerShell:

```powershell
mkdir $name
git switch $branch
```

PowerShell expands the variable, but the Phase-7 parser can retain the literal token.

There is also an independent PowerShell quoting fidelity problem. PowerShell single-quoted strings escape a literal quote by doubling it:

```powershell
mkdir 'it''s'
```

The current generic quote toggling can tokenize this as `its`, while the real PowerShell operand is `it's`.

This violates the frozen rule:

```text
Phase-7 verifier operands must be exactly the values the real dialect receives.
If exact fidelity cannot be proved, fail closed.
```

### Required repair

Keep one shared shell-analysis authority.

Add a shared, dialect-aware notion of **Phase-7 operand exactness / expansion freedom** so `parseSimpleShell()` cannot return a high-confidence command for operands whose runtime value may differ from the parsed value.

At minimum, fail closed for Phase-7 adapter recognition when relevant operands contain or use:

- Bash ordinary parameter expansion such as `$VAR`;
- Bash tilde expansion where runtime expansion can occur;
- PowerShell ordinary variable expansion such as `$name` / `$env:NAME`;
- PowerShell quoting forms that the tokenizer does not model exactly, including doubled single-quote escaping;
- any other shell-native expansion discovered while implementing this repair.

Conservative rejection is acceptable.

Do not broaden the parser merely to support more shell syntax.

If exact support is added for a form, executable proof must compare the parser operand against the value the real local dialect receives.

Phase-4 RuleEvaluation behavior must remain equivalent. If the shared tokenizer gains metadata only for Phase-7 exactness, preserve the existing Phase-4 finding semantics.

### Mandatory tests

Add focused executable cases proving at least:

- Bash `mkdir $HOME/out` is not eligible for deterministic Phase-7 verification;
- Bash `mkdir ~/out` is not eligible;
- Bash `cp $SRC $DST` is not eligible;
- Bash `git switch $BRANCH` is not eligible;
- Bash quoted variable expansion remains ineligible;
- PowerShell `mkdir $name` is not eligible;
- PowerShell `git switch $branch` is not eligible;
- PowerShell doubled-single-quote operand is either parsed exactly or rejected;
- supported plain quoted static operands still preserve exact data;
- P4 parser/rule equivalence remains green.

---

## 3. R2-F3B — Git branch validation is not yet a conservative validity proof

### Current defect

`isValidBranchName()` still accepts strings that Git rejects as branch names.

Examples include:

```text
.foo
/foo
foo//bar
foo.lock
```

The current predicate does not fully enforce component/ref constraints such as:

- no component beginning with `.`;
- no leading slash;
- no consecutive slash;
- no component ending in `.lock`.

That means malformed/polluted exit-0 stdout can still pass the local predicate and be converted into a hard `MISMATCHED`.

There is a second defect in `shellResultRecord()`:

```ts
const output = result.stdout.text.trim()
```

For Git verification, `.trim()` can sanitize polluted stdout.

Example:

```text
" main "
```

can become `main` and produce a hard match even though the observed output itself was malformed.

The Freeze requires malformed/polluted output to become UNKNOWN.

### Required repair

Use a conservative local branch grammar that is a strict subset of valid Git branch names.

It does not need to accept every valid Git ref. It must never classify a known-invalid branch string as valid.

At minimum reject:

- leading slash;
- trailing slash;
- consecutive slash;
- any component beginning with `.`;
- any component ending in `.lock`;
- `..`;
- `@{`;
- trailing dot;
- whitespace/control characters;
- `~ ^ : ? * [ \\`;
- leading `-`;
- any other form required by the chosen conservative grammar.

Use the same conservative grammar for:

1. expected branch capture;
2. observed Git verifier stdout before any hard result.

For Git stdout, do not use broad `.trim()`.

Accept only an exact branch token with, at most, the explicitly allowed line terminator behavior of the shell result. Extra leading/trailing spaces, extra lines, or other pollution must be UNKNOWN.

### Mandatory tests

Prove:

- all four frozen forms still work:
  - `git checkout BRANCH`
  - `git checkout -b BRANCH`
  - `git switch BRANCH`
  - `git switch -c BRANCH`
- wrong flag pairings remain rejected;
- invalid expected branch forms are not captured;
- observed `.foo` -> UNKNOWN;
- observed `/foo` -> UNKNOWN;
- observed `foo//bar` -> UNKNOWN;
- observed `foo.lock` -> UNKNOWN;
- observed leading/trailing-space branch output -> UNKNOWN;
- observed multi-line/polluted output -> UNKNOWN;
- normal valid branch output with the supported newline form -> MATCHED/MISMATCHED as appropriate;
- another valid bounded branch -> MISMATCHED.

---

## 4. R2-F6A — per-Session 128 proof is still missing

### Current proof gap

The expanded ExpectedEffect test creates:

- four Sessions with 128 effects each;
- one Session with 1 effect.

That proves the global 512 eviction path, but **no Session ever exceeds 128**.

Therefore the report statement that the focused suite proves the per-Session 128 bound is stronger than the executable evidence.

### Required proof

Add a direct test with one Session attempting at least 129 active effects.

Prove:

- retained active raw effects for that Session never exceed 128;
- the evicted execution no longer resolves through the object-keyed lookup;
- no other Session is incorrectly evicted by the per-Session bound;
- the global 512 bound remains independently proven.

---

## 5. R2-F6B — sandboxPolicy replacement proof does not actually exercise replacement-under-load

### Current proof gap

The focused verifier test currently:

1. starts old work;
2. calls `verifier.detach()`;
3. waits for the old work to drain;
4. then calls `attachGeneration(newShell, newPolicy)`.

This proves detach/drain, but it does not prove that **attachGeneration itself fences and drains an active old policy generation before replacement**.

The report currently describes this as policy replacement proof.

### Required proof

Add a focused test where:

1. old shell + old policy are attached;
2. old verification is active and underlying work is still unsettled;
3. `attachGeneration(same-or-new-shell, newPolicy)` is called directly;
4. the replacement promise remains pending while old work is owned;
5. old work receives abort;
6. old work settles;
7. only then does the new generation attach;
8. new verification uses only the new policy;
9. old generation cannot publish a late successful semantic result.

Keep shell detach proof separately.

---

## 6. R2-F6C — copy checker proof is marker simulation, not checker execution

### Current proof gap

The current focused test named around copy EACCES/EPERM/race does not execute those filesystem states.

It calls a synthetic shell that directly returns strings such as:

```text
MATCHED
MISMATCHED
UNKNOWN
```

and then verifies that `PostconditionVerifier` maps the marker to the corresponding record.

That proves marker decoding, but it does **not** executable-prove that the product-owned `COPY_CHECKER` emits the correct marker for:

- EACCES;
- EPERM;
- destination disappearance/read race;
- source access failure;
- source missing;
- symlink/directory/special file;
- oversize file;
- exactly-at-boundary file.

The test additionally checks substrings inside the checker source, which is not equivalent to executing the checker.

### Required proof

Execute the actual product-owned copy checker logic.

Use a deterministic local harness. Suitable approaches include:

- running the exact checker source in a controlled Node VM with a deterministic `node:fs` stub;
- or running the exact checker through a local subprocess against disposable real files where reliable;
- or another deterministic mechanism that executes the same checker code the verifier sends to `ctx.shell.run`.

Do not duplicate the checker into a second test-only implementation.

Mandatory executable cases:

- equal bounded regular files -> MATCHED;
- unequal bounded regular files -> MISMATCHED;
- destination confirmed absent -> MISMATCHED;
- destination EACCES -> UNKNOWN;
- destination EPERM -> UNKNOWN;
- destination disappears/read race -> UNKNOWN;
- source access failure -> UNKNOWN;
- source missing -> UNKNOWN;
- source symlink -> UNKNOWN;
- destination symlink -> UNKNOWN;
- directory/special -> UNKNOWN;
- exactly 1 MiB regular file boundary -> allowed by the frozen recipe;
- greater than 1 MiB -> UNKNOWN;
- raw path/error/output data is not retained.

---

## 7. R2-F6D — the expanded benchmark is still synthetic

### Current benchmark defect

`benchmarks/r5-phase7.mjs` now routes through `PostconditionVerifier`, but its `localShell().run()` does not execute the verifier command.

Instead it inspects the command string and returns hard-coded output such as:

```text
MATCHED
benchmark-branch
```

The so-called near-1MiB path is only identified by the filename:

```text
near-1MiB-source
```

No near-1MiB file is created or read.

The timeout path also manually invokes an injected timer callback instead of exercising the real 5-second scheduler timeout.

Therefore the report statement:

```text
The expanded benchmark executes direct write/edit, mkdir, small copy,
near-1MiB copy, Git, positive Node resolution, timeout, and saturation paths.
```

is too strong.

The benchmark currently measures verifier orchestration around simulated markers, not the actual local verifier operations required by the Repair Instructions.

### Required benchmark

Replace the synthetic marker runner with a disposable **real local shell seam** used only by tests/benchmark.

It must execute the command/spec produced by the product verifier locally, with:

- no provider calls;
- no external network;
- no registry;
- no Git remote;
- no Harness mutation.

The benchmark must create disposable local fixtures and exercise:

1. direct write;
2. direct edit;
3. mkdir checker against an actual created directory;
4. small copy checker against actual files;
5. near-1MiB copy checker against an actual near-boundary file;
6. Git branch verifier inside a disposable local Git repository with no remote;
7. positive Node resolution using a disposable local resolvable module / already-local package, without registry access;
8. real scheduler timeout ownership path;
9. saturation path.

For the timeout benchmark, use the actual frozen timeout behavior rather than manually firing an injected callback. It is acceptable for the local benchmark to spend approximately the frozen timeout duration once.

The benchmark result must still carry:

```text
LOCAL_VERIFIER_ONLY
NETWORK_NOT_USED
PROVIDER_NOT_USED
```

but these labels are non-claims unless the underlying paths are actually executed.

### Mandatory benchmark assertions

For smoke and full:

- each required path was actually invoked;
- each checker command was actually executed;
- actual fixture identity/size/state matches the intended case;
- near-1MiB is proven by byte count, not filename;
- Git repo has no remote;
- Node-resolution fixture is local;
- timeout record is `VERIFIER_TIMEOUT`;
- active slot remains owned after logical timeout until underlying work settles;
- saturation reports `VERIFIER_QUEUE_SATURATED`;
- no external calls occur.

---

## 8. R2-F6E — remaining direct Phase-7 non-interference proof

The Repair Instructions required focused proof tied directly to Phase 7 for approval/A3/browser non-interference.

The current 5-file / 23-test P7 suite does not directly prove the complete matrix.

Add a bounded Phase-7 integration/static proof establishing that this repair does not:

- invoke or reopen Native Approval;
- register a hidden verifier Tool;
- emit a custom Risk Advisor Session event;
- read deprecated Session surfaces;
- mutate Browser Phase-6 contract/state;
- introduce A3;
- introduce Phase-8 Evidence Collector behavior.

Do not inflate test counts with trivial assertions. One well-scoped integration/static gate is sufficient if it proves the complete boundary.

Inherited P1/P6 regressions still remain required.

---

## 9. Revalidation order

Use the established order.

1. Implement only Repair-2 findings above.
2. Run expanded `test:p7`.
3. Run P4 parser-equivalence/regression.
4. Run P3.
5. Run P2.
6. Run P6.
7. Run P5.
8. Run P1A/P1B/P1C.
9. Run R1–R4.
10. Typecheck.
11. Build.
12. Host export smoke.
13. Client export smoke.
14. Declaration/root-export audit.
15. `pnpm pack --dry-run --json`.
16. `git diff --check`.
17. scope/privacy/secret audit.
18. no-network/no-provider/no-registry/Git-remote audit.
19. no-custom-Session-event/deprecated-reader audit.
20. Harness mutation=0 verification.
21. run the **real** expanded Phase-7 benchmark smoke/full.
22. commit all executable/source/test/benchmark Repair-2 changes.
23. record the exact new executable SHA.
24. run exactly one fresh complete `pnpm test` on that exact committed SHA.

If Full fails, preserve the failed evidence, repair only the failing frozen scope, create a new executable SHA, rerun affected pre-Full gates, then run a new fresh Full.

After a passing Full, no executable/test/config/package/benchmark semantic drift.

---

## 10. Report-only publication

After a passing fresh Full, update only:

`docs/tasks/Phase7-known-postcondition-verification/Execution_Report.md`

Add a distinct `Final Repair 2` section.

Correct the previous benchmark wording so historical synthetic benchmark evidence is chronology only and the new real-local benchmark is the current acceptance evidence.

Record:

- Repair-2 start SHA;
- new executable/Tested SHA;
- exact F3 operand-fidelity proof;
- conservative Git branch/output proof;
- per-Session 129->128 proof;
- policy replacement-under-load proof;
- actual copy-checker classification proof;
- actual 1 MiB boundary proof;
- direct non-interference proof;
- real local benchmark paths and results;
- inherited/static/package/privacy gates;
- fresh complete Full file/test count;
- Tested -> remote docs-only proof;
- provider/network/registry/Git-remote product/test/benchmark calls = 0;
- Harness tracked mutations = 0;
- Phase 8 not started.

Then push and verify:

```text
HEAD == origin/main == git ls-remote origin refs/heads/main
```

---

## 11. STOP conditions

Return `PHASE7_ARCHITECTURE_DECISION_REQUIRED` instead of improvising if the repair would require:

- a second parser;
- broad shell emulation;
- generic filesystem Evidence Collector;
- network verification;
- verifier Approval;
- hidden verifier Tool;
- widening sandbox policy;
- custom Session persistence/event;
- Browser protocol changes;
- Phase-5 semantics changes;
- Phase-8/9 implementation;
- Harness Core changes;
- abandoning scheduler/capability quiescence.

---

## 12. Allowed handoff

After all Repair-2 focused proof, real local benchmark, inherited/static/privacy gates, one fresh complete Full, report-only publication, push, and remote equality verification, return only:

`PHASE7_REPAIR2_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE7_ACCEPTED`.

Do not create `Acceptance_Report.md`.

Do not start Phase 8.
