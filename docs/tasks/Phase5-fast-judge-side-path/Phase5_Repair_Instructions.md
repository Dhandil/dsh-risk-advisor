# Risk Advisor — Phase 5 Final Review Repair Instructions

**Review verdict:** `PHASE5_REPAIR_REQUIRED`  
**Date:** 2026-10-01  
**Reviewed Tested SHA:** `b32d4dbb612dbbf7dabee6e0254b01a44083a0c1`  
**Reviewed report/evidence SHA:** `dd14339aa53af65b70c68a0817cf9faf4cfc829e`  
**Frozen architecture:** `578b1b434d2d366ecd7e9ccf9ec20ca27fe3cf11`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`, read-only.

## 1. Review result

Phase 5 has the correct overall architecture but is not accepted yet. The A1→optional A2 model, direct `ctx.llm.stream()` side path, local P0–P9 Aggregator, Native Approval non-interference, docs-only post-Full publication, and local-only R5 follow-up are all retained.

Repair only F1–F5 below. Do not redesign Phase 5 and do not enter Phase 6+.

## 2. F1 — ReviewerSeed raw-input safety and privacy

Current `allowlistedOperationFields()` accepts broad aliases such as `command`, `exec`, `fetch`, `search`, `read_file`, etc. and `firstString()` / `firstStringArray()` directly read `value[key]`. This violates the frozen exact closed-adapter and no-accessor boundary.

Required:

- raw extraction only for exact frozen tool names: `read`, `write`, `edit`, `bash`, `pwsh`, `web_fetch`, `web_search`;
- require RuleEvaluation to agree with the supported adapter; unsupported/unknown tool must not traverse raw args;
- no aliases;
- plain/null-prototype objects only;
- own data descriptors only;
- getters/setters/accessors rejected without invocation;
- bounded arrays read through own data descriptors only;
- no arbitrary recursion;
- write/edit retain path only; never content/old/new/justification;
- unknown tool may retain only static/sanitized tool identity, never raw argument detail.

`redactCredentialUrls()` must also fail closed. A malformed credential-bearing URL may not be returned raw merely because `new URL()` failed. Either deterministically redact it with a bounded lexical fallback or fail redaction so Judge/seed detail is omitted.

Mandatory F1 tests:

1. command getter is never invoked;
2. file_path getter is never invoked;
3. query array accessor is never invoked;
4. unknown `command` tool does not retain command;
5. unknown `fetch` tool does not retain URL;
6. unknown `read_file` tool does not retain path;
7. exact bash/pwsh capture only bounded redacted command;
8. write/edit content and justification stay absent;
9. malformed credential URL never survives unredacted.

## 3. F2 — deterministic feature and provenance mapping

Repair the following exact mappings from the Architecture Freeze:

- `operation.changesPermissions=true` only for `PERMISSION_ACCESS_CONTROL_MUTATION`, not every permission finding;
- `operation.deletesState=true` only for frozen deletion facts such as recursive delete, disk wipe, destructive git clean; do not equate every destructive finding with deletion;
- `operation.changesConfiguration=true` only for frozen registry/service configuration mutation, not generic system-location mutation;
- `operation.executesCode=true` for known shell, false only for known supported non-shell operations, and `unknown` for unsupported/unknown tools;
- deterministic authorization `grantSource` is `none`, not `unknown`, when no structured grant exists.

Finding dimension mapping must be exact:

- destructive/system-change/credential/network/install/reversibility → `RISK`;
- permission → `PRIVILEGE`;
- shell-ambiguity/unknown-tool/path-alias/workspace-boundary → `EVIDENCE_QUALITY`.

Current `AssessmentFinding.basisFeatureIds` contains synthetic `rule.<code>` IDs that are absent from RiskFeatureSet. Every non-empty basisFeatureId must reference a real retained feature. Either add bounded deterministic rule features, map to existing feature IDs, or use an empty basis list when no honest mapping exists.

Policy flags must correctly preserve Phase-3/4 facts while keeping Aggregator pure. Deterministic DimensionReason projection must make these flags true when proven:

- `privilegeEscalation`;
- `repeatedFailure`;
- `repeatedEscalation`.

Do not make Aggregator query Context/Ledger directly.

Positive-proof false placeholders must not be sent to Judge as strong negative facts. In particular, reviewer input must not imply:

- `scope.outsideWorkspace=false` means workspace-only;
- `scope.systemScope=false` means non-system;
- `recovery.checkpointAvailable=false` proves no checkpoint;
- `rollbackMechanismKnown=false` proves rollback impossible.

Preferred repair: a Judge-facing known-fact projection that converts these not-proven false placeholders to unknown/omits them. An explicit static semantic qualification is also acceptable if executable tests prove it.

Mandatory F2 tests cover every mapping above, prove all finding basis IDs exist, and prove policy flags for escalation/repeated failure.

## 4. F3 — local deterministic A1 must not depend on ReviewerPayload

Current `buildPhase5Context()` builds the local snapshot and then immediately serializes/bounds ReviewerPayload. If payload bounding throws, `observeAsked()` leaves the exact BOUND record without A1.

This violates the frozen invariant:

`BOUND approval → deterministic local A1 first → optional Reviewer/Judge`.

Separate local assessment context from reviewer egress construction. Equivalent design:

- `buildLocalPhase5Context(...)` always produces a bounded local snapshot/degraded snapshot for an exact binding;
- `buildReviewerPayload(...)` may return READY or UNAVAILABLE with a static reason.

If reviewer payload cannot be safely redacted/serialized/bounded:

- A1 remains present;
- status is PARTIAL/DEGRADED as appropriate;
- Judge is skipped;
- add sanitized context/redaction reason;
- Native Approval remains unchanged.

When a real Phase-5 A1 is created, remove stale `ASSESSOR_NOT_IMPLEMENTED` from that record. Preserve it only for genuine Phase-1B-only coordinators where Phase-5 dependencies are absent. Do not redesign the Phase-1C Browser bridge in this repair.

Mandatory F3 tests:

- forced ReviewerPayload failure still yields BOUND A1;
- redaction failure still yields DEGRADED A1 and no Judge;
- successful A1 diagnostics do not contain `ASSESSOR_NOT_IMPLEMENTED`;
- legacy P1B-only tests still do contain it.

## 5. F4 — strict JSON duplicate keys and post-redaction bounds

`JSON.parse()` followed by `Object.keys()` cannot detect duplicate object members because JSON.parse silently applies last-key-wins semantics.

Add a bounded, string-aware duplicate-key validator before normal JSON.parse, or an equivalent package-local strict parser. It must respect JSON escaping and reject duplicate keys in envelope/result/proposedFact/alternative objects. Do not use a naive regex that matches key-like text inside string values.

Keep the 8192-char total response cap and existing exact schema checks.

After SecretRedactor normalization, re-check/bound stored rationale/proposed-fact/alternative string lengths so URL normalization/redaction cannot create an over-limit retained value.

Mandatory F4 tests:

- duplicate top-level `results` rejected;
- duplicate result `verdict` rejected;
- duplicate proposedFact `statement` rejected;
- duplicate alternative `title` rejected;
- key-like text inside a JSON string does not false-positive;
- existing fence/trailing/extra/bad-enum/unknown-feature cases remain rejected;
- post-redaction stored strings stay within frozen limits.

## 6. F5 — mandatory scheduler/lifecycle/security proof is incomplete

Current `test:p5` is only 2 files / 5 tests. It proves the happy path but does not prove many mandatory Architecture Freeze §39 asynchronous/security boundaries. Expand focused tests substantially; parameterization is encouraged.

At minimum prove:

### Context / seed / privacy

- direct-user ring excludes injected/tool/assistant/system sources;
- 4-message / 8000-char cap and historyOmitted behavior;
- Session disposal clears ring;
- seed TTL/capacity behavior;
- hostile accessor cases from F1;
- user-message secret redaction;
- no raw write/edit content/justification;
- ReviewerPayload contains no known secret fixture.

### Config / route / eligibility

- Judge disabled by default;
- invalid enabled config preserves A1 and fails Judge closed;
- dedicated route beats session requestHeader route;
- session route fallback works;
- partial reviewer pair rejected;
- no route never guesses;
- zero eligible dimensions produces no Judge call;
- EvidenceQuality is never requested.

### Strict parser / stream

- all F4 duplicate-key cases;
- tool-call/non-text block rejected;
- finish error and aborted finish rejected;
- missing/duplicate requested dimension rejected;
- oversized output/arrays/fields rejected;
- hypotheses remain HYPOTHESIS;
- alternatives remain MODEL_SUGGESTED/UNVERIFIED.

### Scheduler / concurrency

- max active concurrency enforced;
- pending queue cap enforced;
- saturation returns `JUDGE_QUEUE_SATURATED` and leaves A1;
- duplicate scheduler key rejected;
- timeout aborts underlying stream and quiesces;
- queued cancellation resolves boundedly;
- active cancellation cannot publish;
- scheduler dispose aborts and drains all owned jobs.

### Assessment fencing

- approval/decided before Judge completion prevents A2;
- late timeout result cannot publish;
- Session disposal prevents A2;
- plugin/HMR disposal prevents old-generation A2;
- two rapid approvals remain identity-isolated;
- duplicate approval/asked does not duplicate A1/Judge;
- NOT_FOUND/AMBIGUOUS never starts Judge;
- llm capability detach aborts/drains and keeps A1;
- deterministic A1 remains readable after Judge failure;
- valid A2 supersedes A1 without mutating A1.

### Aggregator / provenance / Native Approval

- all named P0–P9 invariants from Risk Engine Contract;
- all F2 feature/provenance mapping cases;
- Judge cannot overwrite non-UNKNOWN deterministic dimensions;
- Judge-only alternative cannot trigger P3;
- exactly one Native Approval answerer;
- timeout/saturation/provider failure never answers or changes Native Approval;
- no durable reviewer user/assistant messages;
- no Main Agent followup/steer/inject/inbox mutation.

## 7. Preserve accepted Phase-5 behavior

Do not regress:

- single exact capture chain and sole Phase-1 ExecutionId authority;
- deterministic A1 before optional A2;
- Fast Judge disabled by default;
- explicit bounded runtime enablement;
- optional `ctx.llm` capability;
- fixed system-policy/data separation;
- direct one-shot `ctx.llm.stream()` + BlockAssembler;
- no tools/sessionId/purpose/hidden retries;
- EvidenceQuality fully deterministic;
- Judge fills only UNKNOWN dimensions;
- model hypotheses remain hypotheses;
- model alternatives remain UNVERIFIED;
- pure local P0–P9 Aggregator;
- Native Approval non-interference;
- no Phase 6/7/8/9;
- real-provider latency remains unvalidated.

## 8. R5 follow-up

Rerun Phase-5 R5 smoke/full after repair because context/A1/scheduler code changes. Keep exact labels:

`LOCAL_MOCK_ONLY`, `REAL_PROVIDER_NOT_RUN`, `PRODUCTION_POLICY_UNDETERMINED`.

Do not claim real provider percentiles.

## 9. Validation order

1. implement F1–F5 only;
2. expanded P5 focused tests;
3. P4 regression;
4. P3 regression;
5. P2 regression;
6. P1B/P1C and R4 regressions;
7. typecheck;
8. build;
9. Host export smoke;
10. Client export smoke;
11. declaration/root-export audit;
12. `pnpm pack --dry-run --json`;
13. `git diff --check` + scope/privacy/secret audit;
14. Harness mutation=0 verification;
15. Phase-5 R5 smoke/full local follow-up;
16. commit final executable/test/config/package repair;
17. run exactly one fresh complete `pnpm test` on that exact executable SHA.

After passing Full, no executable/test/config/package semantic drift. Only Execution Report and bounded benchmark evidence may change.

## 10. Execution Report update

Update `docs/tasks/Phase5-fast-judge-side-path/Execution_Report.md` with a distinct Final Repair F1–F5 section. Record new Tested SHA, focused/regression counts, R5 evidence, static/export/pack/privacy gates, fresh Full count, and Tested→remote docs/evidence-only proof.

Keep original `b32d4dbb...` as historical chronology only. Carry inherited PARTIAL/NOT_RUN/NOT_VALIDATED boundaries unchanged.

## 11. Scope prohibitions

Do not change P0–P9 policy, Native Approval authority, Harness Core, Phase-4 rule outcomes, Browser Phase 6 presentation, Phase 7 verification, Phase 8 evidence collection, or Phase 9 Deep Judge. No real provider/network acceptance call and no raw prompt/argument/secret persistence.

## 12. Allowed handoff

After repair, expanded focused proof, R5 follow-up, one fresh final Full, report-only publication, push and remote equality verification, return:

`PHASE5_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE5_ACCEPTED` and do not start Phase 6.