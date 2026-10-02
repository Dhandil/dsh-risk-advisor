# Phase 8 Preflight — Bounded Evidence Collector

## 0. Outcome

`PHASE8_PREFLIGHT_COMPLETE_READY_FOR_ARCHITECTURE_FREEZE`

This preflight starts Phase 8 from the accepted Phase-7 baseline.

Accepted Phase-7 executable baseline:

`366305d342e3cae197cc19df8de5c434a163b82b`

Phase-7 acceptance publication:

`946544d7462513c877f88016775da012fe326cab`

Pinned Harness reference:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

This document is architecture/preflight only. No Phase-8 executable implementation is authorized by this commit.

---

## 1. Phase 8 identity

The baseline Architecture Source of Truth defines Phase 8 as the **Evidence Collector**.

Phase 8 is not:

- Deep Judge;
- a second Fast Judge;
- a hidden approval service;
- a generic agent/tool;
- a Browser-side risk engine;
- a rollback engine;
- a persistent audit database.

The intended sequence remains:

```text
A1 deterministic assessment
  -> optional A2 Fast Judge
  -> bounded read-only Evidence Collector
  -> evidence-backed superseding assessment
  -> Phase 9 Deep Judge later, only if separately authorized
```

Evidence collection is a side path. Native Approval must never await it.

---

## 2. Baseline Evidence Collector contract

The accepted baseline architecture specifies the following V1 evidence families:

- path stat;
- directory listing;
- workspace containment;
- canonical path;
- symlink / path alias;
- small text config read;
- Git tracked / untracked state;
- .gitignore / ignored state;
- package manifest;
- checkpoint existence.

Frozen baseline budgets already exist:

```text
maxEvidenceItems = 20
maxFileReads = 5
maxFileBytes = 64 KiB / file
maxTotalEvidenceChars = 64 KiB
maxDirectoryEntries = 200
```

Phase 8 must preserve or narrow these limits.

---

## 3. Existing Risk Advisor gaps Phase 8 is expected to fill

The current Phase-5 deterministic feature projection intentionally leaves later evidence facts unresolved:

```text
scope.workspaceOnly
scope.canonicalTargetsKnown
scope.targetCountKnown
scope.wildcardTarget
scope.outsideWorkspace

recovery.checkpointAvailable
recovery.versionControlled
recovery.backupKnown
recovery.rollbackMechanismKnown
recovery.reversible

privilege.minimumScopeEvidenceAvailable
```

Current A1/A2 uncertainties intentionally include:

```text
CANONICAL_TARGETS_UNAVAILABLE
RECOVERY_EVIDENCE_UNAVAILABLE
MINIMUM_PRIVILEGE_UNRESOLVED
```

These are extension points, not bugs to paper over.

Phase 8 may replace an unknown with a fact only when the fact is proven through a bounded read-only seam.

---

## 4. Pinned Harness filesystem seam

At the pinned Harness SHA, `@deepseek-ai/dsh-fs` version `0.1.6-alpha.2` exposes the public `ctx.fs` service.

Relevant read-only operations are:

```ts
resolve(path, { cwd?, signal? })
processPath(target)
fileUrl(target)
contains(parent, child)
stat(target, signal?)
lstat(path, { cwd? }, signal?)
readText(target, signal?)
readBytes(target, signal, maxBytes)
readByteRange(target, range, signal?)
listDir(target, signal?)
```

Important contract facts:

- `FsTarget.targetKey` is opaque and must not be parsed.
- `resolve` owns canonical identity.
- `contains` owns canonical containment.
- `lstat` can identify a final-component symlink.
- `stat` reports file/directory/other and optional size.
- `readBytes` enforces a complete-file byte cap and fails instead of truncating.
- `listDir` is one-level and content-free.
- the filesystem service itself does not arm an I/O timeout.

Therefore Phase 8 has a supported public seam for path/canonical/workspace/config evidence without modifying Harness Core.

---

## 5. Workspace authority

For a live approval-bound execution, the Session's immutable workspace is rooted in:

```text
session.header.cwd
```

The pinned sandbox-policy service resolves the same Session workspace root from the Session header when present.

Phase 8 should therefore use the approval-bound Session and its immutable cwd as the primary workspace identity.

It must not:

- infer a workspace from process.cwd();
- use Browser working-directory guesses;
- use an arbitrary filesystem provider default when the Session cwd is absent;
- convert an unknown workspace into "inside workspace".

If the Session workspace cannot be established, containment stays unknown.

---

## 6. Filesystem read authority is broader than workspace authority

The Harness filesystem contract explicitly allows a composed `ctx.fs` reader to have authority outside the workspace.

Therefore:

```text
ctx.fs can read it
!=
the operation is workspace-contained
```

Phase 8 must itself enforce evidence-purpose bounds.

Allowed outside-workspace observation is limited to metadata for an exact operation target needed to determine containment/scope.

Content reads and directory enumeration must remain workspace-contained.

---

## 7. Shell/Git seam

The accepted Phase-7 implementation already uses the public `ctx.shell.resolve/run` seam with product-owned fixed verifier commands.

Phase 8 may use the same public shell capability for **local Git evidence only**, provided:

- commands are product-owned and closed;
- operation-controlled paths are data, never interpolated executable syntax;
- stdout/stderr are bounded;
- no Git remote operation is executed;
- no credential prompt is possible;
- fsmonitor/pager/config-driven external behavior is disabled where relevant;
- malformed output fails closed;
- shell capability generation is fenced on detach/replacement.

No second shell parser is allowed. Any shell target planning must reuse the existing shared Phase-4/7 shell-analysis authority.

---

## 8. Checkpoint preflight result

A critical distinction was verified in the pinned Harness:

Harness contains several things named "checkpoint", including:

- `session/flush` durability checkpoints;
- session projection checkpoints;
- compaction checkpoints.

These are **not workspace-file rollback checkpoints**.

They prove durability or projection state, not that a pending file/system mutation can be restored.

No public general-purpose workspace rollback/checkpoint capability was identified at the pinned Harness SHA.

Therefore Phase 8 must not map any of those Session/compaction/projection checkpoints to:

```text
recovery.checkpointAvailable = true
```

or to a false claim that no rollback checkpoint exists.

For V1 at this pinned seam:

```text
checkpointAvailable = unknown
reason = CHECKPOINT_CAPABILITY_UNAVAILABLE
```

unless implementation discovers a real public workspace-recovery capability at the exact pinned Harness SHA and stops for architecture review before using it.

This is a deliberate negative-capability result, not a missing implementation shortcut.

---

## 9. Git recovery evidence is still useful without a checkpoint seam

Git can provide bounded deterministic facts such as:

- repository present / unavailable;
- exact target tracked / untracked;
- ignored / not ignored;
- clean / dirty for the exact target.

For a narrowly known local file mutation, a tracked and clean exact target can prove that a Git restore path is available without claiming a separate Harness checkpoint exists.

However:

- "tracked" alone does not prove a safe rollback;
- a dirty target does not prove safe recovery to the user's current pre-operation state;
- a recursive directory operation with untracked descendants must not be called reversible;
- package installation and arbitrary shell execution must not inherit file-level reversibility from one tracked manifest;
- remote Git operations are never made reversible merely because the local repository exists.

Phase 8 must remain conservative.

---

## 10. Raw target problem

Phase-5 `ReviewerOperationSeed.resourceHints` are redacted presentation-safe hints.

They are not suitable as authoritative filesystem lookup paths because redaction/truncation can change identity.

Phase 8 therefore needs a separate Host-private **EvidenceTargetSeed** captured at `tools/pre-execute`.

It may retain only bounded raw values needed for read-only evidence lookup and must have:

- strict own-data-property argument access;
- closed supported tool grammar;
- max target count;
- TTL;
- per-Session/global bounds;
- one-shot removal after collection;
- Session-disposal cleanup;
- plugin-disposal cleanup;
- no Browser/root diagnostic exposure of raw paths.

This is analogous to Phase-7 ExpectedEffect lifecycle discipline, but it is a separate evidence-purpose record.

---

## 11. Candidate target planning

Direct tool contracts can supply exact evidence targets for:

- `read.file_path`;
- `write.file_path`;
- `edit.file_path`.

Shell evidence planning may use only the existing shared high-confidence parser and a closed subset of static path operations.

Candidate initial subset:

- Bash/Pwsh mkdir positional target;
- Bash cp source/destination;
- conservative Bash rm static positional targets;
- conservative Pwsh Remove-Item static positional targets if exact operand fidelity is proven;
- Git/package operations: workspace-root evidence only unless an exact file target is independently known.

Expansion, wildcard, chaining, dynamic execution, explicit unsupported workdir semantics, or ambiguous quoting must fail closed to no canonical target claim.

---

## 12. Evidence retention and privacy

Phase 8 should collect facts, not create a second raw context store.

The final retained EvidenceSnapshot should not contain:

- raw file content;
- raw absolute canonical paths;
- opaque `FsTargetKey`;
- raw Git stdout/stderr;
- raw directory names;
- secrets;
- full package.json;
- full .gitignore;
- user conversation content.

Preferred retained facts are booleans/counts/static enums, e.g.:

```text
target count known
all targets canonicalized
all targets inside workspace
target exists/type
path alias observed
directory listing truncated
git repo available
target tracked
target ignored
target clean
package manifest present
lifecycle scripts present
checkpoint capability unavailable
```

Any future Phase-9 model payload must be built later from these sanitized facts plus the existing bounded/redacted context.

---

## 13. Small config evidence

V1 should keep config reads closed.

Recommended initial config scope:

- `package.json` when package/install evidence is relevant;
- `.gitignore` existence may be observed, but ignore semantics should prefer Git's own bounded local query rather than reimplementing Git ignore rules.

For `package.json`:

- file must be workspace-contained;
- final path must not be an unsupported symlink;
- file must be regular;
- complete bytes must fit the 64 KiB cap;
- parse failures become unknown;
- retain only derived safe facts such as lifecycle-script presence and bounded counts/flags;
- do not retain script bodies or dependency names unless a later frozen requirement explicitly needs them.

No generic arbitrary-config reader is authorized in Phase 8 V1.

---

## 14. Directory listing limitation

`ctx.fs.listDir` returns one full direct-child array and has no caller-provided pagination cap.

Phase 8 may retain at most 200 directory entries worth of evidence and must mark truncation beyond that budget.

It must not recursively enumerate.

Because the service may internally produce an array larger than 200 before the consumer slices it, directory listing should be used only when it materially resolves an evidence question, not as unconditional workspace inventory.

---

## 15. Assessment integration

Phase 8 is not merely a diagnostics store.

The evidence phase must be able to produce an immutable **superseding evidence assessment (A3)** when authoritative evidence materially changes the assessment.

A3 may:

- add authoritative evidence features;
- add static evidence findings;
- improve/downgrade evidence-quality verdict according to collection completeness;
- prove workspace containment/outside-workspace;
- prove version-control facts;
- prove a narrower minimum authority for a closed local operation;
- preserve or increase hazard based on newly proven scope/path facts.

A3 must not:

- invent user authorization;
- invent necessity;
- treat Agent justification as authorization;
- lower an accepted hard finding;
- silently overwrite Judge provenance;
- convert missing checkpoint capability into reversible=true;
- use model inference.

A3 supersedes the latest A1/A2 and must preserve its causal identity through `supersedesAssessmentId`.

---

## 16. Browser lifecycle implication

Phase-6 Bridge V2 froze stages:

```text
rules | fast | complete
```

and specifically defined `fast` as the interval in which A2 may still arrive.

Phase 8 must not repurpose `fast` to mean evidence collection.

Because Evidence is asynchronous and A3 must remain observable to Browser clients, Phase 8 requires an explicit protocol evolution.

Recommended:

```text
RiskAdvisorBridgeViewV3
stage = rules | fast | evidence | complete
```

V1/V2 parsers and semantics remain unchanged.

The V3 payload may otherwise reuse the already accepted bounded Browser-safe operation/assessment/failure DTOs.

OperationPresentationV1's frozen pre-Evidence fields:

```text
workspaceContained='unknown'
sandboxCovered='unknown'
reversible='unknown'
```

must not be silently widened in-place.

Evidence facts can be surfaced through A3 findings/reasons and an optional V3 sanitized evidence summary if frozen in the Phase-8 architecture.

---

## 17. Evidence trigger

Baseline trigger:

```text
evidenceQuality = LOW
OR
candidate suggests investigate
```

Current product vocabulary uses `NEED_MORE_INFORMATION` rather than a literal "investigate" token.

Architecture freeze should map the trigger narrowly:

- evidence quality LOW; or
- latest recommendation NEED_MORE_INFORMATION;
- AND at least one unresolved uncertainty is in the collector's supported fact domain.

Supported fact-domain examples:

- canonical targets;
- workspace containment;
- path alias;
- version-control/recovery facts;
- minimum local permission scope.

Do not run filesystem/Git evidence merely because authorization or necessity is semantically unknown and no local evidence can resolve it.

---

## 18. Lifecycle/concurrency requirement

Evidence collection is asynchronous and capability-bound.

The architecture freeze should define:

- one collection attempt per approval generation unless explicitly retried after capability replacement;
- max concurrent evidence jobs;
- bounded pending queue;
- hard collection timeout;
- AbortSignal propagation;
- Session/native-outcome cancellation;
- capability generation fencing;
- dispose-and-drain semantics;
- no late A3 after native approval resolves;
- no orphan filesystem/shell work.

A 5-second hard evidence-job timeout, max concurrency 2 and pending limit 8 are reasonable symmetry with the accepted Phase-7 local-verifier scheduler and will be frozen unless a pinned seam contradicts them.

---

## 19. Dependency impact

Risk Advisor currently does not declare `@deepseek-ai/dsh-fs`.

Phase 8 will need the public filesystem contract for type-safe use of `ctx.fs`.

At the pinned Harness SHA:

```text
@deepseek-ai/dsh-fs = 0.1.6-alpha.2
```

Expected package change:

- peer dependency `@deepseek-ai/dsh-fs >=0.1.6-alpha.2`;
- dev dependency `@deepseek-ai/dsh-fs 0.1.6-alpha.2`.

No provider implementation dependency is required in the published plugin.

Do not add a new package solely to obtain a private Harness implementation seam.

---

## 20. Phase-7 preservation

Phase 8 must preserve the accepted Phase-7 executable semantics:

- shared Phase-4/7 shell analysis;
- exact Phase-7 adapter grammar;
- ExpectedEffect raw-state lifecycle;
- verifier scheduler quiescence;
- copy classification;
- Git output fail-closed behavior;
- retry temporal immutability;
- real local Phase-7 benchmark;
- no provider/network/registry/Git-remote calls;
- Harness Core read-only.

Phase 8 may use `ctx.fs` because Evidence Collector is now the explicitly authorized phase; this does not retroactively alter Phase-7 verifier design.

---

## 21. Preflight decision

No architecture STOP condition was found.

Public pinned seams are sufficient for a bounded Evidence Collector if the architecture freezes the following conservative limitations:

1. no fake workspace checkpoint evidence;
2. no generic config reader;
3. no recursive filesystem inventory;
4. no raw canonical-path/browser leakage;
5. local Git evidence only;
6. no second shell parser;
7. A3 cannot change authorization/necessity by itself;
8. Browser protocol evolves explicitly rather than mutating frozen V2 semantics.

Next artifact:

`Phase8_Architecture_Freeze.md`
