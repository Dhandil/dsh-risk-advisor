# Phase 8 Acceptance Report — Bounded Evidence Collector

## Outcome

`PHASE8_ACCEPTED`

Phase 8 is accepted after independent final review.

Accepted executable / Tested SHA:

`0516d950a4bc8c2c485cecf32db8fedd6c4be035`

Reviewed report-only remote SHA:

`db4b2aa5a0963ecb4111c3a3aae5ed0551653fe2`

Pinned Harness reference:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

Phase 9 was not started as part of this acceptance.

---

## 1. Review lineage

Independent Phase-8 review covered the initial implementation and two repair rounds.

Final lineage:

- Phase-8 architecture/instructions baseline: `a6de19b7605e849b573da28b95fe1c1a31700829`
- Initial Phase-8 executable: `95ad73906d6cf5cce55f7def40f46dd688150bc6`
- Repair-1 executable: `6b6f10d37dcc4fc8a2685c4496be6f2ec9829df5`
- Repair-2 executable / accepted Tested SHA: `0516d950a4bc8c2c485cecf32db8fedd6c4be035`
- Final Repair-2 execution-report publication: `db4b2aa5a0963ecb4111c3a3aae5ed0551653fe2`

The final publication diff from the accepted Tested SHA is report-only.

---

## 2. Accepted architecture

The accepted implementation preserves the frozen Phase-8 role:

```text
read-only bounded Evidence acquisition
+ deterministic evidence normalization
+ deterministic A3 assessment supersession
```

It does not introduce:

- a Deep Judge;
- a hidden Evidence Tool;
- Approval authority;
- a rollback executor;
- generic recursive filesystem traversal;
- generic arbitrary config reads;
- raw Evidence Session events;
- provider/model calls.

Native Approval remains authoritative and asynchronous Evidence never vetoes execution.

---

## 3. Evidence target capture

Accepted.

The final EvidenceTargetSeed implementation:

- uses pinned per-tool allowlists;
- accepts the pinned read/write/edit/bash/pwsh schemas;
- includes PowerShell `sandbox_permissions` and `justification`;
- reads only own data properties;
- rejects accessors/proxies/unknown keys fail-closed;
- reuses the shared shell parser;
- rejects dynamic expansion/wildcards/ambiguous forms;
- treats explicit shell workdir as unresolved for hard canonical-target evidence;
- applies 5-minute TTL;
- enforces 128 raw seeds per Session and 512 global;
- performs one-shot consumption and Session/plugin cleanup.

No second shell parser was introduced.

---

## 4. Filesystem and bounded Evidence

Accepted.

The collector uses the public pinned `ctx.fs` seam for:

- canonical resolution;
- lstat/stat metadata;
- canonical workspace containment;
- bounded directory listing;
- bounded package manifest reads;
- execution-world process paths for local Git.

Frozen limits are enforced:

```text
maxEvidenceItems = 20
maxFileReads = 5
maxFileBytes = 64 KiB
maxTotalEvidenceChars = 64 KiB
maxDirectoryEntries = 200
maxRequestedTargets = 8
```

Outside-workspace targets receive metadata-only observation; content/config/list traversal is not used as evidence there.

Retained EvidenceSnapshot objects remain path/content/Git-output free.

Checkpoint remains:

```text
checkpointAvailable = unknown
CHECKPOINT_CAPABILITY_UNAVAILABLE
```

Session/projection/compaction durability state is not misrepresented as workspace rollback capability.

---

## 5. Local Git evidence

Accepted.

The product-owned checker now:

- receives workspace/targets only as data;
- computes repository-relative target pathspecs inside the local execution world;
- rejects workspace escapes;
- produces only bounded closed booleans:
  - repositoryAvailable
  - tracked
  - ignored
  - clean
- uses local Git only;
- uses `git check-ignore` rather than reimplementing ignore rules;
- disables prompt/pager/optional locks;
- disables external diff/textconv;
- explicitly overrides `core.fsmonitor=false`;
- retains no path/stdout/stderr/remote/config data.

Disposable local proof covers:

- tracked clean;
- tracked dirty;
- untracked;
- ignored;
- configured fsmonitor sentinel not executed.

External Git remote calls remained zero.

---

## 6. A3 and assessment semantics

Accepted.

Evidence triggering requires both:

- LOW Evidence Quality or NEED_MORE_INFORMATION; and
- a locally supported Evidence question.

No-material Evidence does not manufacture A3.

A3:

- supersedes the latest A1/A2;
- preserves Judge provenance where applicable;
- preserves Authorization;
- preserves Necessity;
- cannot lower an accepted hard hazard;
- raises confirmed mutating outside-workspace scope to at least HIGH;
- removes only actually resolved evidence uncertainties;
- retains unresolved recovery/checkpoint uncertainty.

Evidence remains deterministic and model-free.

---

## 7. Reversibility and minimum privilege

Accepted.

Positive reversibility is confined to the frozen narrow local case:

```text
direct write/edit
+ exact canonical single target
+ inside workspace
+ local Git tracked
+ exact target clean
+ no external/network/system side effect
```

Requested permission width does not incorrectly change physical reversibility.

Minimum-scope proof is independent from Git recovery and supports the frozen comparison:

```text
proven local exact scope + workspace-write
  -> PROPORTIONATE

proven local exact scope + danger-full-access
  -> EXCESSIVE
```

The danger-full-access request itself is not confused with an operation side effect.

Actual privilege elevation, access-control mutation, retry escalation, destructive, network, system/install/credential, ambiguous or unsupported operations remain ineligible.

---

## 8. Scheduler and capability lifecycle

Accepted.

The final scheduler/collector semantics prove:

- max concurrency 2;
- max pending 8;
- logical timeout 5000 ms;
- timed-out underlying work remains owned until settlement;
- cancelled/aborted jobs cannot later resolve as successful jobs;
- fs capability generation replacement aborts and drains old work;
- shell capability generation replacement aborts and drains old Git work;
- old abort-ignoring fs/shell generations may settle but cannot publish successful Evidence/A3;
- new-generation publication waits behind the lifecycle drain;
- native outcome fences late A3;
- plugin disposal joins owned work.

Product code revalidates scheduler/capability generation after relevant async boundaries and again before final successful snapshot publication.

---

## 9. Bounded retained state

Accepted.

Sanitized Evidence snapshots:

- TTL 5 minutes;
- max 128 per Session;
- max 512 global;
- Session disposal cleanup;
- plugin disposal cleanup.

Cancellation tombstones are no longer unbounded:

- TTL-bound;
- global bounded capacity;
- Session ownership when known;
- Session disposal cleanup;
- plugin disposal cleanup;
- cancelled execution cannot later begin Evidence collection.

---

## 10. Browser protocol

Accepted.

Phase-6 V1/V2 semantics remain frozen.

Phase 8 adds explicit Bridge V3 with:

```text
rules | fast | evidence | complete
```

Client behavior:

- V2 remains compatible;
- V3 parser is strict;
- fast/evidence stages continue polling;
- complete stops polling;
- stale request/generation fencing remains;
- Native Approval UI remains authoritative and separate.

Browser Evidence projection is sanitized and bounded.

---

## 11. Final executable proof

Final Phase-8 focused suite:

`5 files / 21 tests PASS`

Inherited acceptance evidence:

- Phase 7: 6 files / 26 tests PASS
- Phase 6: 5 files / 27 tests PASS
- Phase 5: 4 files / 23 tests PASS
- Phase 4: 2 files / 17 tests PASS
- Phase 3: 2 files / 17 tests PASS
- Phase 2: 2 files / 15 tests PASS
- Phase 1A: 2 files / 13 tests PASS
- Phase 1B: 2 files / 14 tests PASS
- Phase 1C: 1 file / 8 tests PASS
- R1–R5 regressions: PASS
- typecheck/build/export/declaration/pack/diff/privacy gates: PASS
- Phase-7 real-local benchmark smoke/full: PASS
- Phase-8 real-local benchmark smoke/full: PASS

Fresh complete Full on exact accepted Tested SHA:

`pnpm test`

Result:

`40 files / 247 tests PASS`

No executable/test/config/package/benchmark semantic drift occurred after this Full.

---

## 12. Side-effect boundaries

Accepted evidence records:

- provider/model calls: 0;
- product/test/benchmark external network calls: 0;
- package registry calls: 0;
- external Git remote calls: 0;
- Harness Core tracked mutations: 0;
- custom Risk Advisor Session Evidence events: 0;
- hidden Evidence Tool registrations: 0;
- Approval authority changes: 0;
- Phase-9 implementation: 0.

Existing untracked local drift was preserved and was not included in the accepted executable commit.

---

## 13. Acceptance boundary

This report accepts Phase 8 only.

It does not accept or imply completion of:

- Phase 9 / Deep Judge;
- real-provider semantic validation;
- live external-network behavior;
- any new workspace checkpoint capability;
- any previously documented PARTIAL / NOT_RUN / NOT_VALIDATED claims outside Phase 8.

Phase 9 may begin only as a separate phase from this accepted baseline.

---

## 14. Final state

`PHASE8_ACCEPTED`

Accepted executable baseline:

`0516d950a4bc8c2c485cecf32db8fedd6c4be035`

Reviewed execution-report SHA:

`db4b2aa5a0963ecb4111c3a3aae5ed0551653fe2`

This acceptance publication is documentation-only and does not alter executable evidence.
