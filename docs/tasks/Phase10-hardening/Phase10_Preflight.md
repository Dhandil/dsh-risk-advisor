# Phase 10 Preflight — V1 Hardening and Release Readiness

## 0. Outcome

`PHASE10_PREFLIGHT_COMPLETE_READY_FOR_ARCHITECTURE_FREEZE`

Phase 10 starts from the independently accepted Phase-9 publication:

- Phase-9 accepted executable: `45115742be6ad93e58eb8f9967f5b176ff67cc9c`
- Phase-9 acceptance publication / task-start baseline: `7c9dccf3a592ad0e1fb30e6fdf003c355e2c1064`
- pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`

At preflight start, repository `main` was exactly the Phase-9 acceptance publication.

This document authorizes no executable changes by itself.

---

## 1. Baseline Phase-10 definition

The frozen v1.2 architecture defines:

`Phase 10: Hardening`

with the following required families:

- Prompt Injection
- Secret leakage
- Shell chaining bypass
- Encoded execution
- False retry correlation
- Semantic false positive
- Timeout
- Cancellation
- Plugin coexistence
- TOCTOU
- Resource limits
- Cold restart

Phase 10 is the final hardening phase of the current V1 roadmap. It is not a new reasoning layer after Deep Judge.

---

## 2. Phase-10 role

Phase 1–9 asked primarily:

> Does each Risk Advisor capability work correctly in isolation and along its intended pipeline?

Phase 10 asks:

> Does the composed V1 remain fail-closed, bounded, private, non-authoritative, and installable when inputs are adversarial, asynchronous work races, capacities saturate, plugins coexist, and the process starts from a cold installed bundle?

Therefore Phase 10 is both:

1. adversarial hardening; and
2. V1 release-readiness closure.

It may repair defects exposed by hardening proof, but must not add a new advisory architecture layer.

---

## 3. Already-proven capabilities that must not be reimplemented

### 3.1 Shell fail-closed foundation

The accepted shared shell analyzer already detects or degrades for:

- top-level separators `;`, `&&`, `||`, `|`, `&`, newline;
- destructive later segments such as `git status && rm -rf build`;
- `bash/sh -c`;
- `node -e`;
- `python -c`;
- `perl -e`;
- `cmd /c`;
- PowerShell `-command/-c/-encodedcommand/-enc`;
- variable execution;
- substitution / backticks;
- wrapper forms;
- `find -exec`;
- pipes into interpreters;
- PATH / LD_PRELOAD / NODE_OPTIONS environment injection;
- redirection and unsupported shell grammar;
- privilege/system/network/install/destructive families.

Existing Phase-4 tests already include direct shell-chaining and encoded-command proof.

Phase 10 should build an adversarial corpus around this authority, not create a second parser.

### 3.2 Secret/redaction foundation

Existing Phase-4/5 proof already covers:

- Authorization Bearer material;
- common API-key/token assignments;
- private-key markers;
- credential URLs;
- credential resource paths;
- write/edit body exclusion from reviewer seed;
- shell operation redaction;
- malformed credential URL fail-closed behavior;
- direct-user redaction;
- direct-user-only trust partition;
- bounded direct-user history.

Phase 10 must prove cross-surface non-leakage rather than invent another redactor.

### 3.3 Per-stage lifecycle ownership

Accepted Fast Judge, Evidence Collector, Postcondition Verifier, and Deep Judge already have bounded timeout/cancellation/generation semantics.

Phase 10 needs whole-pipeline adversarial composition and repeated lifecycle stress, not parallel replacement schedulers.

### 3.4 Retry and semantic foundations

Retry/Failure Chain already has:

- TTL 5m;
- 128 records / Session;
- 512 global;
- bounded recent history;
- immutable capture-boundary prior relation;
- same-root-cause and permission-escalation semantics.

Known Postcondition Verification already distinguishes:

- process success;
- semantic success;
- `true / false / unknown`.

Phase 10 should attack false-correlation and false-semantic-success boundaries.

---

## 4. Hardening gaps that remain

### 4.1 Cross-stage Prompt Injection proof

Current static personas correctly state that operation/file/tool/project text is untrusted.

Missing V1 proof is end-to-end:

```text
malicious operation / resource text
-> Rule Engine
-> Reviewer payload
-> hostile model candidate
-> A2/A3/A4 Host merge
-> Browser presentation
```

The Host must preserve deterministic/authoritative facts even when the model candidate explicitly asks to override them.

README/file/project injection must never become authorization evidence.

Only direct-user context may support Authorization.

### 4.2 Cross-surface privacy canary

Current tests verify local redaction paths, but there is no one composed canary proving the same secret cannot escape through:

- RuleEvaluation;
- ReviewerSeed;
- Fast Judge payload;
- EvidenceSnapshot;
- Deep Judge payload;
- RiskAssessment findings/uncertainties/alternatives;
- Browser V4 DTO;
- diagnostics;
- benchmark/report/log capture.

Phase 10 needs a unique synthetic secret canary and an exact deny scan over all retained/presented surfaces.

No real credential is used.

### 4.3 False retry correlation matrix

Need adversarial proof for:

- same command text, different canonical/semantic target -> no retry;
- same target but materially different operation -> no retry;
- different Session object with same textual id -> no cross-session relation;
- permission escalation only when a captured prior relation actually exists;
- late postcondition evidence cannot retroactively manufacture a retry relation;
- capacity/TTL degradation never becomes a false positive.

### 4.4 Semantic false-positive matrix

Need composed proof:

```text
exit 0 + known postcondition mismatch -> semanticSuccess=false
exit 0 + inaccessible/ambiguous checker -> unknown
exit 0 + unsupported adapter -> unknown
checker timeout/cancel -> unknown
late checker result after retirement/cancel -> cannot rewrite terminal meaning
```

Unknown is never silently converted to success.

### 4.5 Whole-pipeline timeout/cancellation

Need one coordinator-level proof across:

```text
A1 -> optional A2 -> Evidence/A3 -> optional A4 -> complete
```

under:

- Fast Judge timeout;
- Evidence timeout;
- Deep Judge timeout;
- Native Approval while any side path is active;
- Session disposal;
- plugin disposal;
- capability replacement;
- abort-ignoring fake operations.

Native Approval remains independently available.

No late A2/A3/A4 may publish after Native outcome.

### 4.6 Integrated resource stress

Individual stores are bounded, but there is no final V1 integrated stress proof.

Need stress around:

- ActiveExecutionIndex;
- OperationFoundation;
- Ledger/replay;
- FailureChain;
- ReviewerSeed;
- ExpectedEffect;
- Verification;
- raw Evidence seed;
- sanitized Evidence store;
- Assessment records;
- Deep Judge parent bindings;
- Fast/Evidence/Deep schedulers.

At limit:

- deterministic eviction/degradation/refusal;
- no unbounded retention;
- no raw-data retention growth;
- no Native Approval block;
- Session/plugin disposal returns owned state to zero/baseline.

---

## 5. TOCTOU — V1 limitation and hardening stance

The private pre-execute Operation Foundation already records:

- exact ExecutionId;
- creation timestamp;
- stable operationHash when the operation is fully known;
- exact live ToolExecution identity while active.

Phase-8 Evidence is also explicitly observed before execution.

Risk Advisor has no public authority seam that can atomically revalidate filesystem/Git evidence immediately before the native mutation commits.

Therefore Phase 10 must **not** claim TOCTOU elimination.

Frozen V1 stance to carry into Architecture Freeze:

```text
Evidence = pre-execution observation
operationHash = review-time operation identity witness
execution-time state revalidation = not provided by Risk Advisor V1
```

Required hardening:

- prove the review path is tied to the same ExecutionId/operation capture;
- prove operationHash changes for materially different captured operations and is stable for equivalent normalization;
- never expose raw arguments through the witness;
- UI/presentation must not state that execution-time state was verified;
- where Evidence is shown, presentation should clearly describe it as pre-execution / approval-time observation.

Do not add a Tool guard or veto path merely to simulate atomic revalidation.

A future public commit/revalidation seam would require a separate architecture decision.

---

## 6. Plugin coexistence preflight

The baseline test matrix names:

- Risk Advisor only;
- Risk Advisor + dsh-smart-approval;
- Risk Advisor + dsh-approve-for-me.

Those named packages are not present in the pinned Harness repository, and repository search found no such package in this plugin repository.

Phase 10 must not fabricate named-plugin proof.

Required executable coexistence proof can use:

1. the real pinned Harness `ApprovalService`;
2. real native approval/client composition where locally available;
3. an independent Cordis approval-answerer fixture mounted as a separate plugin, never as Risk Advisor-owned authority.

The fixture must prove:

- Risk Advisor returns no ApprovalOutcome;
- independent answerer owns the answer;
- exactly one answer is observed;
- Risk Advisor failure/timeout/disposal cannot change the answer;
- add/remove/reload does not duplicate answerers.

If an actual pre-existing approval-answerer plugin is locally available without registry installation, Codex may add an extra read-only coexistence lane and report its exact identity.

Do not install a package solely to satisfy coexistence.

---

## 7. Cold-start productization gap

Current package is not yet a complete installable external Harness bundle:

- repository root has no `cordis.patch.yml`;
- package.json has no `dsh.bundle.patch`;
- packed `files` does not include a bundle patch;
- root README still describes the package as the old “T01 R1 fixture”.

Pinned Harness external bundle contract supports:

```json
"dsh": {
  "bundle": {
    "patch": "./cordis.patch.yml"
  }
}
```

and the patch inserts the package into the profile composition.

The same package already declares a Web client face under `dsh.client`, so an enabled package row can supply both Host and Client faces according to the pinned bundle/client graph.

Phase 10 therefore must include productization:

- add the bundle patch;
- declare `dsh.bundle.patch`;
- include the patch in packed files;
- replace stale fixture README with actual Risk Advisor V1 install/config/safety documentation;
- prove packed artifact contents;
- prove local tarball/profile cold start in disposable state if supported by the pinned local Harness.

No registry install is needed or allowed for acceptance.

---

## 8. Cold restart proof target

Preferred executable proof:

```text
build/pack Risk Advisor locally
-> disposable DSH_HOME/profile
-> install/add local absolute tarball or local bundle path through pinned Harness-supported path
-> start fresh process
-> confirm Risk Advisor Host services / package activation
-> stop
-> start second fresh process from same disposable profile
-> confirm activation again
```

Where feasible, also prove the client roster discovers the same package.

Use only disposable profile/home paths.

Never mutate the user's real Harness profile.

Never modify Harness Core tracked files.

If pinned Harness local CLI/build prerequisites make true process cold-start impossible without unrelated Harness build/install/network work, STOP that lane as `COLD_START_ENVIRONMENT_UNAVAILABLE`; do not substitute an in-process remount and call it cold restart.

---

## 9. T05 latency follow-up is now due

The early T05/R5 benchmark explicitly froze all production assessment budgets as `UNDETERMINED` because Context Builder / Fast Judge / Evidence / Deep Judge were not implemented then.

Those product paths now exist.

Phase 10 must therefore run the promised follow-up benchmark.

Required evidence classes:

### REAL_PINNED_RUNTIME

Re-measure native ApprovalService baseline vs Risk Advisor installed for synchronous/non-interference overhead.

### REAL_PRODUCT_LOCAL

Measure actual product code with local deterministic dependencies:

- A1 deterministic assessment;
- Context Builder;
- Fast Judge scheduler + deterministic local LLM adapter;
- Phase-8 local Evidence path;
- A3 merge;
- Phase-9 structural Deep Judge path;
- A4 merge;
- Browser presentation/query cost.

### NOT_REAL_PROVIDER

External model/provider latency remains outside acceptance because Phase 10 must make zero external provider calls.

Do not label mock-model latency as provider latency.

Produce P50/P95/P99/MAX for local distributions with documented sample count/method.

A final Phase-10 AdvisoryLatencyPolicy may freeze local Host/scheduler/resource budgets and preserve explicit `NOT_VALIDATED_EXTERNAL_PROVIDER` qualifications where appropriate.

Do not tune timeouts merely to make benchmark numbers pass.

---

## 10. Prompt injection and Deep Judge architectural correction

The original baseline V1 DoD says “Deep Judge 仅使用受控只读 Evidence Tools”.

Phase-9 accepted architecture superseded that design for the current pinned Harness:

```text
Deep Judge V1 = tool-less spawn reviewer
+ sanitized Phase-8 Evidence payload
+ toolFilter { allow: [] }
```

Phase 10 must preserve the accepted Phase-9 design.

It must not reintroduce custom Evidence Tools as a “hardening” change.

Doing so requires a separate future architecture decision.

---

## 11. Phase-10 proposed work lanes

### H1 — Adversarial semantics

- prompt injection;
- secret canary;
- shell bypass corpus;
- encoded/dynamic execution corpus;
- false retry correlation;
- semantic false positive;
- malformed model output;
- Host authoritative-floor preservation.

### H2 — Lifecycle / resources / coexistence

- whole-pipeline timeout/cancel;
- abort-ignoring work;
- capability generation replacement;
- HMR/reload ownership;
- integrated capacity stress;
- independent approval answerer coexistence;
- Native Approval non-interference.

### H3 — TOCTOU / presentation truthfulness

- exact operation review witness;
- pre-execution Evidence timing;
- no execution-time verification claim;
- no authority escalation.

### H4 — Bundle / cold restart

- package manifest;
- cordis.patch.yml;
- README productization;
- pack artifact proof;
- disposable-profile local install;
- true two-process cold restart where environment supports it.

### H5 — Final latency/resource policy

- T05 follow-up on actual product paths;
- bounded reproducible distributions;
- final V1 local policy;
- explicit external-provider non-claims.

---

## 12. What Phase 10 may repair

Phase 10 may make bounded executable repairs when a hardening proof demonstrates a defect in an accepted V1 path.

Examples:

- missed shell fail-closed case;
- leaked secret field;
- false retry relation;
- semantic false positive;
- stale/late side-path publication;
- unbounded state;
- duplicate listener/task after reload;
- misleading pre-execution UI wording;
- missing external bundle packaging metadata.

Every repair must preserve the existing architecture.

---

## 13. What Phase 10 may not do

Do not:

- modify Harness Core;
- replace Native Approval;
- answer PendingApproval;
- add automatic approval/rejection;
- add generic reviewer tools;
- restore Deep Judge Evidence Tools;
- add network/provider calls for acceptance;
- use real credentials;
- add arbitrary telemetry;
- create a new persistence layer;
- add execution-time mutation guards to simulate TOCTOU closure;
- silently upgrade structural/mock proof to real-provider proof;
- start a Phase 11 or new product feature.

---

## 14. Required end state

Phase 10 should end with enough evidence for a separate final V1 release-readiness adjudication.

Expected task artifacts:

- `Phase10_Architecture_Freeze.md`
- `Phase10_Implementation_Instructions.md`
- `Execution_Report.md`
- final hardening matrix / latency policy artifacts as frozen by Architecture Freeze.

Codex final handoff will be:

`PHASE10_PUBLISHED_READY_FOR_REVIEW`

Final acceptance remains ChatGPT Web authority.

---

## 15. Preflight conclusion

Phase 10 is feasible on the accepted Phase-9 baseline without Harness Core changes.

The largest new executable productization item is the missing external bundle/cold-start packaging surface.

The largest proof items are cross-stage security/privacy, integrated lifecycle/resource stress, coexistence, TOCTOU truthfulness, and the now-due T05 product-latency follow-up.

Next artifact:

`docs/tasks/Phase10-hardening/Phase10_Architecture_Freeze.md`
