# Risk Advisor V1 Final Closure Freeze

## Outcome

`V1_FINAL_CLOSURE_FROZEN_READY_FOR_IMPLEMENTATION`

Authority chain:

- Phase-10 accepted product executable: `1fa84e2a8a9de465cdb85fef928ec9e19086bba2`
- Phase-10 acceptance publication: `eef4d65b1bdca594a66291e833b7d2f4f531c6d7`
- V1 Final Closure Preflight: `251ed029d5c8b9d3a24104a85a2de014c1d77d15`
- pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`

This is not Phase 11.

No new product capability is authorized.

---

## 1. Closure scope

V1 Final Closure owns only:

1. one combined installed-profile release-candidate approval smoke;
2. exact-SHA closure regression;
3. project-level provenance reconciliation;
4. V1 DoD reconciliation;
5. explicit final non-claims;
6. final independent project acceptance.

Everything already accepted in Phase 10 remains frozen.

---

## 2. Product executable authority

Unless the release smoke exposes a real product defect, the product executable baseline remains:

`1fa84e2a8a9de465cdb85fef928ec9e19086bba2`

Validation infrastructure may create a later closure-validation SHA.

The final report must distinguish:

```text
PRODUCT_EXECUTABLE_SHA
CLOSURE_VALIDATION_SHA
FINAL_REPORT_SHA
FINAL_ACCEPTANCE_SHA
```

If no product source changes:

`PRODUCT_EXECUTABLE_UNCHANGED_FROM_PHASE10`

must be recorded.

---

## 3. Release-candidate approval smoke

Create a repository-owned offline gate that proves the original final-validation chain in one persisted disposable profile:

```text
local external bundle install
-> process A AppReady
-> public AppExit
-> process B cold restart
-> real ToolRuntime traversal
-> real ApprovalService approval
-> Risk Advisor BOUND assessment/correlation
-> separate native answerer returns allowed-once once
-> public AppExit
```

Process B is the release-candidate authority.

---

## 4. Disposable probe ownership

The probe is test/release infrastructure only.

It must not live in Risk Advisor production source.

It may be generated under a temp directory by the release gate.

The probe may use pinned public Harness services needed for the smoke:

- appReady;
- appExit;
- tools;
- sessions;
- approval;
- riskAdvisorAssessments.

It may register one deterministic bounded local tool fixture and one separate native approval answerer.

The fixture answerer is not Risk Advisor.

---

## 5. Process A

Process A proves persisted installed-profile boot.

Required:

- local Harness HEAD equals pinned SHA;
- Harness tracked tree clean before/after;
- Risk Advisor bundle count = 1;
- probe bundle count = 1;
- AppReady reached;
- Risk Advisor service available;
- natural public AppExit(0);
- no external access.

No approval traversal is required in A.

---

## 6. Process B

Process B boots the same persisted profile.

After AppReady:

1. create one disposable Session;
2. run one bounded local ToolRuntime fixture through the normal runtime;
3. fixture requests native ApprovalService approval;
4. a separate probe-owned answerer returns `allowed-once`;
5. observe exactly one `approval/asked`;
6. verify Risk Advisor current-generation assessment/correlation is present and BOUND to that live call;
7. verify exactly one native answer;
8. verify tool result completes successfully;
9. verify Risk Advisor never returns/owns ApprovalOutcome;
10. verify no late advisory publication reopens the decided approval;
11. public AppExit(0).

The smoke may remain deterministic A1-only/provider-free.

No Fast/Deep reviewer is required.

---

## 7. Required release evidence

The gate result must be bounded JSON and include at least:

```text
schema
harnessSha
productExecutableSha
profileIdentity
processA
  appReady
  naturalExit
  riskAdvisorBundleCount
  probeBundleCount
processB
  appReady
  naturalExit
  toolTraversals
  approvalAskedCount
  nativeAnswererCalls
  nativeOutcome
  riskAdvisorAssessmentPresent
  riskAdvisorAssociation
  duplicateNativeAnswers
external
  providerCalls
  externalNetworkCalls
  registryCalls
  gitRemoteCalls
  harnessTrackedMutation
```

Do not store raw prompts, raw tool arguments, credentials, or private user paths.

---

## 8. Exact acceptance values

Required release smoke outcome:

```text
process A natural exit                  = true
process B natural exit                  = true
Risk Advisor bundle A/B                 = 1 / 1
probe bundle A/B                        = 1 / 1
process B ToolRuntime traversal         = 1
process B approval/asked                = 1
process B native answerer calls         = 1
process B native outcome                = allowed-once
process B RA assessment present         = true
process B RA association                = BOUND
duplicate native answers                = 0
Risk Advisor approval answerer calls    = 0
Risk Advisor ApprovalOutcome returns    = 0
provider calls                          = 0
external network calls                  = 0
registry calls                          = 0
Git remote runtime calls                = 0
Harness tracked mutations               = 0
Harness SHA                             = pinned exact SHA
```

Any deviation fails the release gate.

---

## 9. Offline boundary

The gate must fail loud on:

- registry access;
- external HTTP/HTTPS;
- provider/model request;
- Git remote command;
- mutation of pinned Harness tracked files;
- mutation of user profile/home.

Loopback/local Harness IPC is allowed and must be separately identified.

Use only disposable temp state.

No global package installation.

---

## 10. No Browser deployment requirement

Do not add a live interactive browser requirement to this closure.

Accepted V1 client evidence already covers:

- real public additive slot;
- Host RPC contract;
- rendering states;
- client ownership;
- HMR 3/3;
- native controls;
- privacy/bounds.

Final Closure records:

`DEPLOYED_INTERACTIVE_BROWSER_NOT_RUN`

as an explicit deployment non-claim.

Do not block closure on launching a user's browser profile.

---

## 11. No real provider/subagent requirement

Final Closure records:

```text
EXTERNAL_PROVIDER_LATENCY = NOT_VALIDATED_EXTERNAL_PROVIDER
REAL_CONCRETE_SUBAGENT_SPAWN = NOT_RUN
```

These are explicit non-claims already accepted by Phase 9/10.

Do not install or call them.

---

## 12. Historical baseline reconciliation

Do not rewrite the original frozen architecture/spec to make historical text look current.

The final Closure report must explicitly record accepted supersessions:

- Deep Judge controlled Evidence Tools -> tool-less reviewer + sanitized Phase-8 Evidence;
- named approval-plugin examples -> real ApprovalService + independent Cordis answerer proof in the pinned available environment;
- provisional T05 -> Phase-10 AdvisoryLatencyPolicy;
- early Phase 1–6 report governance -> current Phase-10 integrated accepted Full.

---

## 13. Phase 1–6 legacy provenance

Do not create retroactive individual Acceptance Reports.

Final project closure must state:

```text
Phase 1–6 standalone historical Acceptance_Report: absent
Phase 1–6 current-code regression: included in accepted Phase-10 Full
Phase 1–6 current product authority: inherited by accepted Phase-10 baseline
```

Phase 7–10 retain their explicit Acceptance Reports.

---

## 14. Package/release naming

Keep package version unchanged unless a real product repair independently requires a package change.

Do not:

- bump to 1.0.0;
- publish to npm;
- create GitHub Release;
- create tag.

V1 Final Closure is a milestone closure, not distribution publication.

---

## 15. Closure validation files

Expected new validation infrastructure:

```text
benchmarks/v1-release-candidate.mjs
tests/v1-release-candidate.spec.ts
```

Add one package script:

`gate:v1:release`

Equivalent bounded names are acceptable.

The gate/test must be part of the repository test surface or explicitly run before Full.

---

## 16. Validation order

Before the final closure Full:

1. release-candidate smoke focused;
2. current P10 focused;
3. current P9/P8/P7 focused;
4. current P6/P5/P4/P3/P2/P1A/P1B/P1C;
5. R1–R5;
6. typecheck;
7. build;
8. Host export;
9. Client export;
10. declaration/root-export audit;
11. external bundle/patch contract;
12. pack dry-run;
13. diff/privacy/boundary/no-authority audit;
14. P10 benchmark smoke/full;
15. P10 cold-start;
16. V1 release-candidate approval smoke;
17. Harness exact SHA and tracked-clean audit;
18. no external provider/network/registry/Git-remote audit.

Do not run a fresh complete `pnpm test` before these are green.

---

## 17. Closure candidate and Full

When all pre-Full gates pass:

1. commit the exact validation-infrastructure candidate;
2. record `CLOSURE_VALIDATION_SHA`;
3. rerun the V1 release smoke on that exact SHA;
4. rerun P10 cold-start and benchmark smoke/full on that exact SHA;
5. verify Harness pin/clean;
6. run exactly one fresh complete `pnpm test` on that exact SHA.

If any gate fails:

repair -> new closure validation SHA -> rerun affected gates -> new fresh Full.

If a real product defect is found:

stop treating Phase-10 product SHA as final;
repair product narrowly;
establish a new product executable SHA;
then repeat closure validation.

---

## 18. Post-Full rule

After the passing final Full, executable/test/config/package/benchmark semantics are frozen.

Only:

`docs/tasks/V1-final-closure/Execution_Report.md`

may be created/updated before independent review.

No baseline README/navigation edits before independent acceptance.

---

## 19. Final Execution Report

The report must record:

- Phase-10 product executable SHA;
- closure validation SHA;
- whether product executable changed;
- release-candidate smoke exact evidence;
- process A/B identities and exits;
- native approval counts/outcome;
- RA correlation/association;
- all external activity counters;
- Harness SHA/clean;
- inherited regression counts;
- exact Full count;
- Tested/closure SHA -> report SHA report-only proof;
- Phase 1–6 provenance reconciliation;
- Phase 7–10 acceptance lineage;
- historical supersessions;
- explicit non-claims;
- package version unchanged;
- no later Phase started.

Codex outcome:

`V1_FINAL_CLOSURE_PUBLISHED_READY_FOR_REVIEW`

Codex does not declare V1 closed.

---

## 20. Independent final acceptance

Only ChatGPT Web may create:

`docs/tasks/V1-final-closure/Acceptance_Report.md`

and declare:

`RISK_ADVISOR_V1_CLOSED`

After acceptance, a separate docs-only navigation/index update may point repository readers at the final closure artifact.

No public distribution action is implied.

---

## 21. STOP conditions

Stop with:

`V1_FINAL_CLOSURE_PRODUCT_REPAIR_REQUIRED`

if the installed-profile smoke exposes a product defect.

Stop with:

`V1_FINAL_CLOSURE_ENVIRONMENT_BLOCKED`

if the smoke cannot run without:

- modifying/building Harness Core;
- registry/external network;
- user profile mutation;
- unavailable mandatory local runtime prerequisite.

Do not weaken the gate or substitute an in-process direct `apply()` call.

---

## 22. Frozen conclusion

The V1 product is already accepted at Phase 10.

Final Closure requires only one missing combined release-candidate observation:

```text
installed external bundle
+ persisted cold restart
+ real native approval
+ live Risk Advisor correlation
```

No Phase 11 and no new product feature are authorized.
