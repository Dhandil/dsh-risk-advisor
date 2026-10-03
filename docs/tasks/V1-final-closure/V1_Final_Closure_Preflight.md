# Risk Advisor V1 Final Closure Preflight

## Outcome

`V1_FINAL_CLOSURE_PREFLIGHT_COMPLETE_RELEASE_SMOKE_REQUIRED`

This is a project-level closure task.

It is **not Phase 11** and does not add a new product capability layer.

Current repository authority at preflight start:

- `main == eef4d65b1bdca594a66291e833b7d2f4f531c6d7`
- Phase-10 accepted product executable: `1fa84e2a8a9de465cdb85fef928ec9e19086bba2`
- Phase-10 Acceptance publication: `eef4d65b1bdca594a66291e833b7d2f4f531c6d7`
- pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`

Harness Core remains read-only.

No executable change is authorized by this Preflight itself.

---

## 1. Closure objective

The purpose of V1 Final Closure is to answer one project-level question:

> Is the accepted Phase-1–10 product evidence sufficient to close the Risk Advisor V1 milestone, and if not, what is the smallest remaining release-candidate proof?

The closure task must not invent another numbered product phase.

Expected result after closure:

```text
accepted product baseline
+ reconciled Phase 1–10 provenance
+ exact V1 capability/non-claim ledger
+ one final installed-profile approval smoke
+ final fresh regression provenance
= V1 milestone closed
```

This is a repository/release-readiness closure, not npm/registry publication.

---

## 2. Current accepted product baseline

Phase 10 independently accepted the final V1 hardening product baseline.

Accepted executable:

`1fa84e2a8a9de465cdb85fef928ec9e19086bba2`

Final Phase-10 Full:

```text
17 scripted groups
58 test files
302 tests
PASS
```

The complete Full includes:

- R1–R5;
- Phase 1A;
- Phase 1B;
- Phase 1C;
- Phase 2;
- Phase 3;
- Phase 4;
- Phase 5;
- Phase 6;
- Phase 7;
- Phase 8;
- Phase 9;
- Phase 10.

Therefore the current V1 product baseline is not a collection of isolated historical phase snapshots; it is one final integrated accepted executable lineage.

---

## 3. Acceptance provenance reconciliation

### Phase 7–10

These phases have explicit independent Acceptance Reports:

- Phase 7: `PHASE7_ACCEPTED`
- Phase 8: `PHASE8_ACCEPTED`
- Phase 9: `PHASE9_ACCEPTED`
- Phase 10: `PHASE10_ACCEPTED`

### Phase 1–6

Phase 1A–6 were implemented under an earlier repository governance style.

Their task directories contain Codex execution reports ending in variants of:

`*_PUBLISHED_READY_FOR_REVIEW`

but no standalone `Acceptance_Report.md`.

This is a provenance-format gap, not evidence that the current product is untested.

Those implementations have subsequently been:

1. inherited by later accepted phases;
2. repeatedly exercised by later focused regressions;
3. included in the final accepted Phase-10 fresh Full;
4. covered by Phase-10 project-level hardening and lifecycle tests.

### Closure decision

Do **not** fabricate six retroactive phase Acceptance Reports.

Instead the final V1 Closure artifact must contain a single explicit legacy-provenance reconciliation:

```text
Phase 1–6 standalone historical acceptance documents: absent
Current-code regression authority: final Phase-10 accepted Full
Current product baseline: Phase-10 accepted executable
```

Historical phase reports remain historical evidence.

---

## 4. Frozen baseline documents contain known historical supersessions

The original V1 architecture/spec remain valuable design history, but some text is no longer the final implementation authority.

The final closure must record these supersessions rather than silently editing history.

### 4.1 Deep Judge Evidence Tools

Original V1 DoD says:

`Deep Judge 仅使用受控只读 Evidence Tools`

Accepted Phase-9 architecture supersedes that with:

```text
tool-less spawn reviewer
+ toolFilter { allow: [] }
+ sanitized Phase-8 Evidence in bounded payload
```

This is the accepted V1 implementation.

Do not reintroduce custom Evidence Tools during closure.

### 4.2 Named approval-plugin coexistence

Original test matrix names:

- dsh-smart-approval;
- dsh-approve-for-me.

Those concrete packages were not locally available for the frozen pinned environment without installation.

Phase 10 instead accepted executable coexistence against:

```text
real pinned ApprovalService
+ separate Cordis approval-answerer fixture
+ actual Risk Advisor plugin lifecycle
```

This proves the public authority/non-interference boundary.

The final closure must not claim the unavailable named packages were executed.

### 4.3 External provider performance

Fast/Deep product paths are implemented and locally benchmarked.

External provider/model latency remains:

`NOT_VALIDATED_EXTERNAL_PROVIDER / NOT_RUN`

This is not a V1 release blocker because:

- the default installation is provider-free;
- Fast Judge is optional;
- Deep Judge is default-off;
- the README makes no external-provider SLA claim.

Do not call a real provider solely for closure.

### 4.4 Real concrete subagent package

Phase 9 accepted the public structural subagent seam because the concrete package was unavailable without installation.

Real Harness spawn remains:

`NOT_RUN`

The current release claim is public-seam compatibility, not real-provider/subagent execution.

Do not install `@deepseek-ai/dsh-subagent` for closure.

### 4.5 Deployed interactive Browser

The client has accepted public-slot, RPC, lifecycle, HMR, privacy, and rendering proof.

Phase 10 additionally proves external bundle/client package productization and cold-start Host activation.

A deployed interactive user Browser profile is not claimed as executed.

This remains a deployment-environment non-claim, not a product-authority gap.

---

## 5. Package/version meaning

Current package version:

`0.1.0-r1`

Current README title:

`DSH Risk Advisor V1`

These are not contradictory for project closure.

For this repository:

- “V1” is the accepted product architecture/milestone;
- `0.1.0-r1` is the current package version;
- registry publication is explicitly not claimed.

V1 Final Closure must **not** automatically bump the package to `1.0.0`, create a registry publication, or create a GitHub Release/tag.

Those are separate delivery decisions requiring explicit user intent.

---

## 6. V1 DoD status after Phase 10

The original V1 Definition of Done is materially satisfied by the accepted current baseline, with the historical supersessions above.

Accepted evidence now covers:

- external plugin packaging;
- zero Harness Core modification;
- real ToolExecution snapshot/correlation;
- Native Approval non-authority/non-interference;
- deterministic boundary/rule/failure/retry semantics;
- Fast Judge Side-Path;
- trust partition and secret redaction;
- six-dimension RiskAssessment and local recommendation policy;
- operation presentation and additive Browser UI;
- bounded durable PTC replay;
- Known Postcondition Verification;
- Evidence Collector;
- tool-less bounded Deep Judge;
- prompt-injection structural hardening;
- timeout/cancellation;
- plugin coexistence;
- HMR;
- resource bounds;
- pre-execution TOCTOU disclosure;
- external bundle install;
- two-process AppReady cold restart;
- local product latency policy;
- no raw secret/prompt/arguments in forbidden RA surfaces.

One original final-validation sentence remains only partially combined:

```text
official profile installation
-> cold restart
-> real approval
```

Phase 10 proves the first two together.

Other accepted integration suites prove real pinned Native Approval traversal.

What has not yet been proven is:

> a real Native Approval traversal occurring inside the same disposable external-bundle profile after the cold-restart boot.

That is the sole executable closure gap.

---

## 7. Required final executable gate — Installed Profile Approval Smoke

Create one project-level release-candidate smoke.

Suggested task identity:

`V1_RELEASE_CANDIDATE_APPROVAL_SMOKE`

It must use:

- pinned local Harness checkout;
- exact pinned Harness SHA;
- local packed Risk Advisor external bundle;
- disposable `DSH_HOME` / profile;
- offline/fail-loud registry/external-network environment;
- test-only disposable probe plugin;
- real pinned ToolRuntime / SessionStore / ApprovalService seams;
- actual Risk Advisor bundle activated by the persisted profile.

Do not directly call Risk Advisor `apply()` from the parent test process as the release authority.

The smoke must occur inside the booted installed profile process.

---

## 8. Release smoke required sequence

### Install / first boot

1. build/pack local Risk Advisor package;
2. create disposable profile;
3. install/activate the external bundle locally;
4. verify one Risk Advisor bundle row;
5. boot process A;
6. wait for AppReady with Risk Advisor service available;
7. exit cleanly through public AppExit.

This may reuse the accepted Phase-10 cold-start pattern.

### Cold-restart approval boot

Boot process B from the same persisted profile.

After AppReady, the disposable probe must execute one bounded local ToolRuntime traversal that produces a real native approval.

The probe may provide a separate deterministic native answerer fixture.

Risk Advisor must remain only an observer/advisor.

Required observations:

```text
ToolRuntime traversal                   = 1
approval/asked                          = 1
separate native answerer calls          = 1
native outcome                          = allowed-once
Risk Advisor approval answerer calls    = 0
Risk Advisor ApprovalOutcome returns    = 0
Risk Advisor assessment correlation     = BOUND / present
duplicate native answer                 = 0
process exit                            = 0
```

The assessment may be deterministic/provider-free.

No external reviewer is required.

After native decision, no late RA publication may reopen the approval.

Process B exits through public AppExit.

---

## 9. Release smoke security boundary

The final release smoke must make the following fail loud:

- registry access;
- external HTTP/HTTPS;
- provider/model calls;
- Git remote operations;
- Harness tracked mutation;
- user's real profile mutation.

Loopback/internal local runtime IPC required by Harness is allowed and must be reported separately.

No real credential.

No user profile.

No global install.

No Harness build or source modification.

---

## 10. Reproducibility

The final gate should be committed as a bounded repository-owned release validation script/test, rather than an undocumented one-off terminal command.

Suggested files:

```text
benchmarks/v1-release-candidate.mjs
tests/v1-release-candidate.spec.ts
```

and an explicit package script such as:

`gate:v1:release`

Equivalent naming is acceptable.

The gate is validation infrastructure, not a new product feature.

---

## 11. Product baseline vs closure validation SHA

The closure must distinguish two identities.

### Product executable baseline

Remains the Phase-10 accepted product executable unless closure smoke exposes a real product defect:

`1fa84e2a8a9de465cdb85fef928ec9e19086bba2`

### Closure validation SHA

A later SHA may add only:

- release-candidate validation script/test;
- package test/gate script metadata;
- closure evidence/docs.

If no product source changes are required, the final closure report must explicitly say:

`PRODUCT_EXECUTABLE_UNCHANGED_FROM_PHASE10`

If the release smoke exposes a product defect, stop and perform a bounded product repair with a new product executable baseline before closure.

---

## 12. Final regression rule

Because committed validation infrastructure changes the repository test surface, Final Closure must have its own exact validation SHA.

Required order:

1. release smoke focused PASS;
2. Phase-10 focused PASS;
3. all inherited R1–R5 / P1–P10 gates as defined by current package scripts;
4. typecheck;
5. build;
6. Host/Client exports;
7. declaration/package/bundle/pack checks;
8. privacy/boundary/no-authority checks;
9. release smoke rerun on exact committed closure candidate;
10. cold-start gate PASS on exact candidate;
11. Harness pinned/clean;
12. no external provider/network/registry/Git-remote calls;
13. exactly one fresh complete `pnpm test` on the exact final closure validation SHA.

If product source did not change, this Full validates the closure candidate while the product executable authority remains the Phase-10 accepted baseline.

After the passing Full, only the Final Closure Execution Report may change before independent review.

---

## 13. Final Closure artifacts

Create project-level task directory:

`docs/tasks/V1-final-closure/`

Expected artifacts:

- `V1_Final_Closure_Preflight.md` — this document;
- `V1_Final_Closure_Freeze.md`;
- `V1_Final_Closure_Implementation_Instructions.md`;
- `Execution_Report.md`;
- after independent acceptance: `Acceptance_Report.md`.

The final Acceptance Report should contain:

- final product executable baseline;
- closure validation SHA;
- Phase 1–10 provenance reconciliation;
- V1 DoD reconciliation;
- accepted supersessions;
- explicit non-claims;
- final release smoke evidence;
- Full evidence;
- pinned Harness compatibility;
- external side-effect boundary;
- statement that no later Phase was started.

---

## 14. What Final Closure is not

Do not during closure:

- start Phase 11;
- add new risk dimensions;
- add automatic approval/rejection;
- add new Evidence/Deep tools;
- call a real external model;
- upgrade Harness;
- broaden supported tools;
- add durable persistence;
- redesign UI;
- publish to npm;
- create a GitHub Release/tag;
- bump to 1.0.0 merely for naming consistency.

If any of these becomes necessary, stop for a separate user decision.

---

## 15. Preflight conclusion

Risk Advisor V1 is functionally and architecturally complete on the Phase-10 accepted baseline.

There is no new product-development phase required.

The only remaining executable closure gap is one combined installed-profile release smoke proving:

```text
external bundle
+ persisted cold restart
+ real ToolRuntime traversal
+ real Native Approval
+ live Risk Advisor correlation
+ clean public exit
```

in the same disposable pinned-Harness profile.

After that gate and one final exact-SHA Full, V1 can proceed to independent project-level closure acceptance.

Next artifact:

`docs/tasks/V1-final-closure/V1_Final_Closure_Freeze.md`
