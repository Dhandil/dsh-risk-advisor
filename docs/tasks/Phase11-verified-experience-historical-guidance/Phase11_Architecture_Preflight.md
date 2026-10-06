# Risk Advisor Phase 11 — Verified Experience & Historical Guidance Architecture Preflight

## Outcome

`RISK_ADVISOR_PHASE11_ARCHITECTURE_PREFLIGHT_COMPLETE_READY_FOR_FREEZE`

Phase 11 is authorized for architecture work only.

No executable implementation is authorized by this document.

---

## 1. Baseline authority

Repository baseline at Phase 11 start:

`b2d2925196acbd6ede8d2aa151338f82df8d9b5b`

Accepted V1 product executable:

`345a54882393da7f64584f21105fa7fc56793265`

V1 Deployment Pilot:

`V1_DEPLOYMENT_PILOT_COMPLETE_RETAINED`

Pinned Harness Core:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

Phase 11 is a Risk Advisor product phase.

It is independent from Personal Agent Hub phase numbering and does not imply any PAH Phase 11/13/14 relationship.

---

## 2. Product goal

V1 answers:

> What is happening now, how risky is it, what evidence exists, and what should the user consider before Native Approval?

Phase 11 adds the historical half of the original Risk Advisor product goal:

> What happened in comparable prior executions, what was independently verified, and what historical evidence should inform the current assessment or future plan?

The intended long-term loop is:

```text
Execution
    ↓
Deterministic observation
    ↓
Independent outcome qualification
    ↓
Durable Experience Episode
    ↓
Deterministic Pattern projection
    ↓
Explainable Historical Guidance
    ↓
Risk Assessment / Agent Preflight advisory
```

Phase 11 does not give Risk Advisor execution or approval authority.

---

## 3. Architectural identity

Phase 11 is not generic Memory.

It is not a Skill library.

It is not an autonomous Learning Engine.

The frozen architectural identity for Phase 11 is:

**Verified Experience & Historical Guidance**

Experience records what the system can prove about prior execution attempts.

Historical Guidance is a bounded derived advisory projection over qualified Experience.

---

## 4. Existing V1 facts that can become Experience evidence

The current V1 already provides the required factual foundation.

### 4.1 Execution identity and correlation

Existing:

- opaque per-traversal `executionId`;
- Session/callId correlation;
- approval correlation;
- ambiguity/conflict fail-closed behavior.

Authority:

`src/host/correlation.ts`

### 4.2 Durable/recoverable execution facts

Existing Ledger records:

- execution lifecycle;
- approval lifecycle;
- terminal claims;
- provenance;
- source completeness;
- conflicts and degraded/recovered health;
- PTC recovery projections.

Authority:

`src/host/ledger.ts`

### 4.3 Explicit failure facts

Existing deterministic classifications include:

- tool error;
- timeout;
- sandbox denial/unavailability;
- Native Approval reject/cancel/unavailable;
- pre-execute/guard denial;
- semantic failure;
- system error;
- unknown.

Authority:

`src/host/explicit-failure.ts`

### 4.4 Retry / escalation facts

Existing deterministic relation state includes:

- retry relation;
- retry count;
- recent failures;
- same-root-cause relation;
- permission escalation;
- semantic verification influence.

Authority:

`src/host/retry-escalation.ts`

### 4.5 Postcondition verification

Existing verifier distinguishes:

- `MATCHED`;
- `MISMATCHED`;
- `UNKNOWN`;
- `UNAVAILABLE`;

and separately exposes:

- `semanticSuccess = true / false / unknown`;
- evidence quality;
- adapter/source;
- reason codes.

Current adapters cover bounded known operations including direct write/edit and selected shell effects such as mkdir, copy, Git branch switch, and package resolve.

Authority:

`src/host/postcondition-verifier.ts`
`src/host/verification-store.ts`
`src/host/expected-effect.ts`

### 4.6 Pre-execution evidence

Existing bounded Evidence can establish or leave unknown:

- canonical targets;
- workspace containment;
- path alias observation;
- version-controlled state;
- exact-target cleanliness;
- checkpoint / rollback evidence;
- package manifest facts.

Authority:

`src/host/evidence-collector.ts`
`src/host/evidence-types.ts`

These sources are sufficient to start a verified historical layer without trusting Agent self-report.

---

## 5. Experience write authority

### 5.1 Direct Agent writes are forbidden

An Agent must not create, edit, delete, promote, or mark an Experience Episode successful.

Agent statements such as:

- "the task succeeded";
- "this permission was necessary";
- "this is the best approach";

are not Experience facts.

### 5.2 Runtime commit authority

Experience Episode commits are owned by the Risk Advisor Host deterministic pipeline.

An Agent may contribute ordinary execution inputs because those are already observed by the Host, but it receives no Experience write API.

No model-facing Experience mutation tool is introduced.

### 5.3 User approval is not outcome proof

`allowed-once` means the user permitted an attempt.

It does not mean:

- the operation was appropriate;
- the permission was minimal;
- the goal succeeded;
- the operation should become historical guidance.

Likewise, `rejected` means the operation did not receive authorization. It must not count as execution failure.

---

## 6. Process success is not semantic success

Phase 11 must not classify an episode as verified success merely because:

- a tool returned without throwing;
- a shell process exited zero;
- the Agent claimed success;
- the user allowed the operation.

High-confidence positive historical evidence requires independent outcome qualification.

Where a supported Postcondition verifier reports:

`MATCHED + semanticSuccess=true`

that may support `VERIFIED_SUCCESS`.

Where it reports:

`MISMATCHED + semanticSuccess=false`

that may support `VERIFIED_FAILURE`.

Unsupported or unavailable semantic verification must remain explicitly unverified/unknown even when process execution succeeded.

The exact Phase 11 qualification vocabulary and precedence are frozen in subphase 11.2, not invented ad hoc by the writer.

---

## 7. Durable persistence seam

### 7.1 Use Harness Storage Domain

Pinned Harness provides the correct persistence capability:

- `ctx.storage`;
- default `storage-json` backend;
- `ctx.storageDomain`;
- schema-validated typed records;
- durability-before-memory-update;
- serialized per-domain write ordering;
- restart persistence.

The default base-backed profile mounts:

```text
storage
storage-json -> $DSH_HOME/storages
storage-domain -> backend: json
```

Therefore Phase 11 must not create a private JSON persistence format or append custom Session event types.

### 7.2 Experience is non-session durable application state

Experience belongs in a plugin-owned Storage Domain.

It does not belong in:

- the canonical Session event log;
- Browser localStorage;
- prompt memory;
- arbitrary files under the workspace;
- user project repositories.

### 7.3 Authoritative versus derived domains

Experience Episodes are authoritative historical assets once committed.

Their durable schema must fail loud on malformed stored records.

Future Pattern / Guidance projections are derived and rebuildable and may use a more disposable recovery policy if separately frozen.

Do not put authoritative Episodes and disposable projections into one storage-failure policy.

### 7.4 Domain evolution

Pinned Harness Storage Domain has no general migration facility.

Phase 11 must therefore avoid one monolithic long-lived schema whose future extension forces destructive rewrites.

Preferred direction:

- separate versioned durable domain for Experience Episodes;
- separate future derived domains for Patterns and Guidance;
- explicit schema/version evolution;
- no silent in-place reinterpretation.

---

## 8. Episode data minimization

A durable Episode must contain only facts needed for historical qualification and later structured compatibility.

Do not persist by default:

- raw command text;
- raw Tool arguments;
- file contents;
- user message bodies;
- model completions;
- credentials;
- provider diagnostics;
- unrestricted absolute paths;
- arbitrary stderr/stdout.

Initial Episode direction includes bounded structural facts such as:

- opaque episode identity;
- opaque source execution identity;
- timestamps;
- operation/tool class;
- requested permission class;
- bounded target/scope classification when independently available;
- terminal/process outcome facts;
- approval outcome as a separate fact;
- semantic/postcondition facts;
- verification source/quality;
- failure classification;
- retry/escalation facts;
- bounded environmental compatibility facts;
- provenance and schema version.

The precise 11.1 schema must prove no raw-sensitive content persistence.

---

## 9. Immutable fact / revisable interpretation split

Historical facts must not be silently rewritten when a verifier or classifier improves.

Architectural rule:

```text
Experience Episode        immutable fact envelope
Qualification Revision    append/versioned interpretation
Pattern                   rebuildable projection
Guidance                  rebuildable/supersedable projection
```

If a past verifier is later discovered to be defective:

- do not edit history invisibly;
- append an invalidation/requalification record;
- rebuild affected Pattern/Guidance projections.

Phase 11.1 establishes Episode authority.
Phase 11.2 establishes qualification semantics and revision rules.

---

## 10. No self-reinforcing learning

This is a Phase 11 invariant.

Risk Advisor's own prior Guidance must never become evidence that the Guidance was correct merely because the Agent followed it.

Forbidden reinforcement:

```text
Guidance A
  ↓
Agent follows A
  ↓
"Agent followed A" counted as success evidence
  ↓
Guidance A confidence increases
```

Only independent execution facts and independently qualified outcomes may strengthen historical evidence.

Guidance provenance must remain distinguishable from outcome provenance.

---

## 11. Structured retrieval before semantic retrieval

Phase 11 does not begin with vector search over commands or conversations.

Initial retrieval must be based on explicit structured compatibility.

Planned compatibility dimensions include:

```text
Operation Signature
Target / Scope Class
Permission Class
Environment Signature
```

Compatibility fields will be separated into:

- hard compatibility fields — mismatch excludes a historical record/pattern;
- soft compatibility fields — mismatch reduces applicability but does not necessarily exclude.

Exact signature design belongs to 11.3.

LLM similarity is not allowed to define Pattern membership in the initial Phase 11 architecture.

---

## 12. Pattern derivation

Patterns are deterministic projections over eligible qualified Episodes.

Pattern aggregation must expose its evidence basis numerically.

A future Pattern may contain:

- eligible sample count;
- verified-success count;
- verified-failure count;
- unknown/unverified count;
- not-executed count;
- permission distribution;
- verified minimum permission evidence;
- counterexamples;
- first/last observed time;
- compatibility scope.

A Pattern must not hide contradictory episodes.

No model-generated "similarity" or "confidence" determines membership.

---

## 13. Guidance confidence

Historical Guidance must be explainable.

A confidence presentation may be derived only from explicit factors such as:

- qualified sample count;
- verified successes;
- verified failures;
- contradictory examples;
- unknown outcomes;
- compatibility quality;
- time window/freshness.

Forbidden:

`confidence = HIGH because the model says so`

Any user-visible confidence must be decomposable back to concrete historical counts and applicability facts.

---

## 14. Experience is Evidence, not Authority

Historical Guidance may have two read-only consumers:

```text
Historical Guidance
       ├── Risk Assessment Historical Evidence
       └── Agent Preflight Advisory Projection
```

It must not directly:

- approve/reject Native Approval;
- modify sandbox policy;
- promote/demote requested permission;
- rewrite commands;
- execute safer alternatives;
- silently alter Agent plans.

An Agent may use advisory Guidance to propose a different plan.

The normal authority chain remains:

`Agent proposes -> Harness/Control boundary validates -> Native Approval/user decides where required`.

---

## 15. Relationship to Memory

Experience is not generic Agent Memory.

Conceptually:

```text
Memory      = what the system/user knows or prefers
Experience  = what prior executions did and what was independently observed
```

Raw Episodes are Host-owned evidence and are not directly model-readable.

Future Agent exposure is limited to a bounded Guidance projection.

Do not inject raw Experience history into the normal model context.

---

## 16. Relationship to Skill

Experience is evidence; Skill is reusable instruction/capability.

Possible future promotion path:

```text
Qualified Experience
    ↓
Pattern
    ↓
Guidance
    ↓
Skill Candidate
    ↓
separate validation/governance
    ↓
Skill
```

No automatic Experience-to-Skill promotion is authorized in Phase 11.

---

## 17. Relationship to future Online Correction

Phase 11 covers historical evidence and guidance.

Real-time challenge/replan behavior is explicitly deferred to a separate future phase:

**Online Execution Correction**

Phase 11 may provide historical evidence to that later phase, but must not introduce:

- automatic retries;
- command rewriting;
- forced replan;
- execution blocking beyond existing Native boundaries.

---

## 18. Cross-process limitation

Pinned Harness Storage Domain guarantees in-process ordered writes and restart durability but does not provide cross-process change push.

Phase 11 must not claim live multi-process historical convergence.

Initial acceptance scope is the retained single real `web` profile / ordinary single active Host process.

Any future multi-process reconciliation requires a separate design.

---

## 19. Phase 11 decomposition

Phase 11 is frozen at the roadmap level as:

### 11.1 — Experience Episode Authority & Durable Schema

Establish:

- plugin-owned durable Episode domain;
- Host-only commit authority;
- immutable Episode envelope;
- sanitized bounded facts;
- restart persistence;
- capacity/failure behavior;
- no product behavior change.

### 11.2 — Outcome Qualification & Revision

Establish:

- qualification vocabulary;
- deterministic precedence;
- `VERIFIED_SUCCESS`;
- `VERIFIED_FAILURE`;
- `UNKNOWN/UNVERIFIED`;
- `NOT_EXECUTED`;
- invalidation/requalification lineage;
- no approval-as-success shortcut.

### 11.3 — Experience Signature & Compatibility

Establish:

- structured operation signature;
- target/scope class;
- permission class;
- environment signature;
- hard versus soft compatibility;
- no semantic/vector membership.

### 11.4 — Pattern Projection

Establish deterministic aggregation and contradiction-preserving statistics.

### 11.5 — Historical Risk Evidence

Feed qualified historical evidence into Risk Assessment as a new bounded evidence source.

Historical evidence may affect assessment reasoning but does not become authority.

### 11.6 — Verified Alternatives & Minimum Permission Evidence

Derive evidence that a safer/lower-permission alternative has actually succeeded under compatible historical conditions.

Do not auto-execute or auto-change permissions.

### 11.7 — Agent Preflight Guidance

Expose a minimal structured historical Guidance projection to the Agent before execution/planning where the Harness integration supports it.

Advisory only.

### 11.8 — Effectiveness & Contamination Evaluation

Measure whether historical guidance:

- reduces repeated failures;
- reduces unnecessary privilege escalation;
- reduces redundant execution;
- improves decision quality;

while explicitly testing:

- wrong-experience propagation;
- stale guidance;
- compatibility mismatch;
- self-reinforcement;
- poisoning/contamination paths.

---

## 20. Phase-wide invariants

The following invariants apply to every Phase 11 subphase:

1. **No Agent Experience write authority.**
2. **No user approval = success shortcut.**
3. **No process exit = semantic success shortcut.**
4. **No raw sensitive execution payload persistence.**
5. **No LLM-defined Pattern membership.**
6. **No opaque model confidence.**
7. **No silent history rewrite.**
8. **No self-reinforcing Guidance.**
9. **No Guidance-based automatic authority change.**
10. **No direct Experience-to-Skill promotion.**
11. **No Harness Core modification unless a later separately frozen blocker proves unavoidable.**
12. **Native Approval remains the only interactive allow/reject authority.**

---

## 21. 11.1 implementation preconditions

Before authorizing 11.1 implementation, Architecture Freeze must decide:

- exact Episode schema;
- exact commit trigger;
- exact persistence domain name/layout/version;
- capacity behavior;
- storage capability absence/failure behavior;
- whether 11.1 records only facts or also an initial qualification placeholder;
- restart/HMR lifecycle;
- package dependency changes;
- privacy tests;
- real-profile persistence proof;
- final Full governance.

No implementation should start before that Freeze exists.

---

## 22. Preflight conclusion

Risk Advisor V1 already contains enough independently observed execution facts to support a trustworthy historical layer.

Pinned Harness already supplies an appropriate durable non-session storage seam in the real Web composition.

Therefore Phase 11 does not need to invent generic Memory, a vector database, or a new storage engine.

The correct next step is:

**11.1 Experience Episode Authority & Durable Schema — Architecture Freeze.**
