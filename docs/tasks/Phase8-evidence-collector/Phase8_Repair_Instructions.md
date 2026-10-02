# Phase 8 Repair Instructions

## Outcome

Independent review of:

- Tested SHA: `95ad73906d6cf5cce55f7def40f46dd688150bc6`
- Report SHA: `d7221bdb87617eab9db5a3d34e0eae0425a62373`

concludes:

`PHASE8_REPAIR_REQUIRED`

The Phase-8 architecture remains frozen. Do not redesign Phase 8 and do not start Phase 9.

Read and preserve:

- `Phase8_Preflight.md`
- `Phase8_Architecture_Freeze.md`
- `Phase8_Implementation_Instructions.md`
- Phase-7 accepted baseline and regressions.

---

## R1 — EvidenceTargetSeed must match real Harness tool schemas

The current generic field gate rejects valid calls because it requires every argument key to be in one small shared list.

Concrete gaps:

- `read` may validly contain `offset` and `limit`;
- `bash/pwsh` normal calls contain required `description`, and may contain `timeoutMs`, `run_in_background`, `justification`;
- sandboxed write/edit may contain `justification`.

As a result, normal shell calls can become `unsupported` before the shared parser is reached.

Repair:

- use strict **per-tool known-key allowlists**;
- inspect only own data properties;
- keep non-semantic valid fields accepted but never retained;
- retain only the frozen evidence fields;
- unknown extra keys/accessors/proxies still fail closed;
- no second parser.

Add focused proof using actual pinned Harness argument shapes, including:

- read with offset/limit;
- normal bash/pwsh with description;
- optional timeout/background fields;
- sandbox permission + justification;
- unknown extra field/accessor fail closed;
- expansion/wildcard/chaining/explicit workdir rules remain frozen.

Also make `take(exec)` honor TTL before returning any raw seed.

---

## R2 — Git evidence checker is not yet correct or complete

Current checker passes `fs.processPath(target)` directly to Git pathspec commands. The frozen design requires the checker itself to compute target-relative paths inside the Git execution world.

Current implementation also does not collect ignored state.

Repair the fixed product checker so it:

1. receives workspace and target process paths only as data;
2. canonicalizes/computes each target relative to the workspace **inside the checker**;
3. rejects paths escaping the workspace;
4. converts the relative path to a Git-safe pathspec representation;
5. returns bounded closed JSON including:
   - repositoryAvailable
   - tracked
   - ignored
   - clean
6. uses local-only Git;
7. disables prompt/pager/optional locks/fsmonitor and external diff/textconv where applicable;
8. never emits paths/stdout/stderr/remotes/config.

Use `git check-ignore` for ignored semantics; do not parse `.gitignore`.

Add actual disposable-local-repository tests proving tracked clean, tracked dirty, untracked and ignored states through the **product checker**.

No Git remote call.

---

## R3 — A3 trigger and merge semantics must match the freeze

### Trigger

Current coordinator checks Clause A only:

- LOW evidence quality, or
- NEED_MORE_INFORMATION.

It must also require Clause B: at least one locally resolvable Phase-8 uncertainty/fact domain for the supported operation.

Do not run Evidence merely because Authorization/Necessity are unknown.

Unsupported/network-only operations must not start filesystem/Git collection without a supported local evidence question.

### Materiality

Current code creates A3 for any non-CANCELLED snapshot, including PARTIAL/UNAVAILABLE snapshots that may contain no material fact.

Freeze requires:

- no material evidence -> keep latest A1/A2, mark complete;
- material evidence -> publish A3.

Implement an explicit deterministic materiality check.

### Reversibility

Current collector can set `rollbackMechanismKnown=true` for any single clean tracked `direct-file`, including `read`.

Positive reversible evidence is allowed only for the frozen direct **write/edit** case and must also respect the no-external/no-system scope conditions.

A read must never gain a rollback/reversible claim.

### Minimum privilege

Current `minimumScopeEvidenceAvailable` incorrectly depends on `versionControlled !== unknown` and only handles direct write/edit.

Implement the frozen closed rule:

- direct write/edit or supported simple static mkdir/cp;
- exact complete targets;
- all canonical;
- all inside workspace;
- no explicit workdir;
- no external/network/system/permission side effect.

Do not require Git/version-control evidence for minimum local scope.

### Outside-workspace risk

Current `preserveRisk()` adds an outside-workspace reason but does not actually raise the verdict.

A confirmed **mutating** outside-workspace target must raise risk to at least `HIGH`, while never lowering an existing higher/hard verdict.

Authorization and Necessity remain unchanged.

---

## R4 — Capability/session lifecycle is incomplete

### Shell detach

The root shell capability disposer currently detaches only the Phase-7 verifier.

It must also detach/drain Phase-8 shell evidence.

Do not attach Evidence shell a second time from the nested sandboxPolicy lifecycle; Evidence does not use sandboxPolicy as its authority.

### Replacement-under-load

Add executable proof that fs and shell replacement/detach while evidence is active:

- aborts old work;
- drains owned work;
- prevents stale-generation A3 publication;
- attaches/uses only the new generation afterward.

If current attach APIs cannot guarantee this, repair them with an explicit quiescent generation handoff.

### Session cleanup

Sanitized EvidenceSnapshot retention must obey:

- max 128 per Session;
- max 512 global;
- 5-minute TTL.

Current snapshot records have no per-Session bound and survive Session disposal until TTL.

Add Session ownership/indexing and ensure Session disposal:

- cancels active jobs;
- clears raw seeds;
- clears sanitized snapshots for that Session.

---

## R5 — Evidence budgets/config semantics must be enforced, not implied

Enforce the frozen total budgets explicitly:

- evidence items <= 20;
- file reads <= 5;
- each file <= 64 KiB;
- total evidence chars <= 64 KiB;
- total retained directory entries <= 200.

Current directory count can exceed 200 across multiple directory targets.

Use one shared per-job budget object and stop the relevant branch with static reason codes when exhausted.

For package evidence:

- resolve/read `package.json` through the filesystem namespace rooted in the approval-bound Session workspace; reserve `fs.processPath` for the local Git execution-world bridge;
- lifecycle script positive set is exactly:
  - preinstall
  - install
  - postinstall
  - prepare
- add the frozen safe derived packageManager/dependency-count facts if retained by the implementation;
- retain no names/script bodies/raw JSON.

Keep checkpoint evidence exactly unknown / `CHECKPOINT_CAPABILITY_UNAVAILABLE`.

---

## R6 — focused proof and Phase-8 benchmark are not acceptance-grade yet

Current `test:p8` is 4 files / 9 tests and does not executable-prove the frozen matrix.

The lifecycle test only attach/detaches empty capabilities.

The current Phase-8 benchmark does not call the product Evidence Collector/Git checker/scheduler. Its timeout and saturation results are hand-built, and several paths are Phase-7-style file-copy checks rather than Phase-8 evidence collection.

Expand focused proof for the repaired requirements above, especially:

- real tool-schema target capture;
- Git checker tracked/dirty/untracked/ignored;
- outside-workspace no-content fence;
- total directory budget;
- package exact 64-KiB / over-limit;
- trigger Clause A + B;
- no-material -> no A3;
- A3 over A1 and A2/Judge provenance;
- Authorization/Necessity unchanged;
- outside mutation -> >= HIGH;
- write/edit-only reversibility;
- minimum privilege frozen matrix;
- native outcome late-A3 fence;
- fs/shell replacement-under-load;
- Session snapshot cleanup/per-session bound;
- strict V1/V2/V3 Browser lifecycle.

Replace the Phase-8 benchmark with an actual product path using disposable local fixtures and the real:

- EvidenceTargetSeed;
- BoundedEvidenceRuntime;
- product Git checker;
- EvidenceScheduler.

Benchmark at minimum:

- inside target;
- outside metadata/no content read;
- tracked clean;
- tracked dirty;
- untracked;
- ignored;
- valid package manifest;
- >64-KiB package fail-closed;
- directory budget;
- real Evidence timeout ownership;
- real queue saturation.

Do not hard-code outcome markers.

---

## Revalidation and publication

Follow the existing Phase-8 Implementation Instructions validation order.

Required before Full:

- expanded `test:p8`;
- P7 focused + real-local P7 benchmark;
- P6/P5/P4/P3/P2/P1/R1-R5;
- typecheck/build/exports/declarations/pack/diff/privacy;
- zero provider/network/registry/Git-remote calls;
- zero Harness mutations;
- zero custom Risk Advisor Session events;
- repaired real Phase-8 benchmark smoke/full.

Then:

1. commit the exact executable/source/test/package/benchmark repair;
2. record the new executable/Tested SHA;
3. run exactly one fresh complete `pnpm test` on that exact SHA.

After a passing Full, no executable semantic drift.

Only update:

`docs/tasks/Phase8-evidence-collector/Execution_Report.md`

Push and verify remote equality.

Final handoff:

`PHASE8_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE8_ACCEPTED`.

Do not create `Acceptance_Report.md`.

Do not start Phase 9.
