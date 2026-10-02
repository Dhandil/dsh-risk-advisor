# Risk Advisor — Product Phase 6: Operation Presentation + Browser UI | Implementation Instructions

**Status:** READY FOR CODEX IMPLEMENTATION; this document does not authorize self-acceptance.  
**Date:** 2026-10-01  
**Task directory:** `docs/tasks/Phase6-operation-presentation-browser-ui/`  
**Required starting checkpoint:** `eb79c61a6661ff39f961095a40cc0239ebb6c4b9` (`Phase6_Architecture_Freeze.md`).  
**Accepted pre-Phase-6 product baseline:** `8d9bc819ad145666b2c36ac742b8d9651a367e94`.  
**Last accepted executable SHA:** `de8a7649dd3ce6deca5bb797ac6fc233abd740f3`.  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, READ-ONLY.

## 1. Startup gate

Before editing:

1. Synchronize `main` safely.
2. Verify local HEAD contains exact freeze commit `eb79c61a6661ff39f961095a40cc0239ebb6c4b9`.
3. Record local HEAD, `origin/main`, `git ls-remote origin refs/heads/main`, branch and full status.
4. Preserve all pre-existing tracked/untracked drift exactly.
5. Do not reset/clean/rebase/force-push or overwrite unrelated user files.
6. Verify pinned Harness identity `ddefc45fbc7f8e46dd73185e68295696d1297887`; do not modify Harness Core.
7. Read in full:
   - `Phase6_Preflight.md`;
   - `Phase6_Architecture_Freeze.md`;
   - current `bridge-contract.ts`, `browser-bridge.ts`, `assessment-envelope.ts`;
   - current Client slot/fixture/bridge files;
   - Phase-5 RiskAssessment/ReviewerSeed types.

STOP with `PHASE6_START_BASELINE_MISMATCH` if the freeze checkpoint is absent or remote history advanced incompatibly.

## 2. Implement exactly Phase 6

Implement only:

```text
Host presentation source/projection
OperationPresentationV1
BrowserRiskAssessmentV1
FailureContextPresentationV1
RiskAdvisorBridgeViewV2
strict V2 Host/Client projection/parser
session+call scoped Client polling source
real Risk Advisor advisory UI
safer-alternative Display + Copy
Native Approval coexistence
```

Do not modify Risk Engine semantics, Phase-4 rules, Phase-3 relations, Native Approval authority, or Phase-7+ functionality.

## 3. Expected source changes

Recommended new Host files:

```text
src/host/presentation/operation-presenter.ts
src/host/presentation/risk-assessment-presenter.ts
src/host/presentation/failure-context-presenter.ts
src/host/presentation/presentation-source.ts
```

Recommended Client files:

```text
src/client/presentation-client.ts
src/client/presentation-store.ts
src/client/components/RiskAdvisorCard.tsx
src/client/components/RiskSummary.tsx
src/client/components/RiskDetail.tsx
src/client/components/FailureSummary.tsx
src/client/components/AlternativeCard.tsx
```

Expected existing edits:

```text
src/bridge-contract.ts
src/host/browser-bridge.ts
src/host/assessment-envelope.ts   # read-only presentation/lifecycle projection only
src/client/index.ts
src/client/RiskAdvisorDetail.tsx
src/client/locales.ts
package.json
tests/*
```

Exact filenames may vary, but responsibilities and boundaries may not.

## 4. Do not modify accepted semantic engines

Do not change semantic behavior in:

```text
src/host/risk-engine.ts
src/host/assessment-aggregator.ts
src/host/rule-engine.ts
src/host/retry-escalation.ts
src/host/explicit-failure.ts
```

unless a directly exposed Phase-6 integration defect makes a minimal compatibility edit unavoidable. If such an edit would alter verdict/rule/relation semantics, STOP with `PHASE6_ARCHITECTURE_DECISION_REQUIRED`.

## 5. Add package-private Phase-6 presentation source

Extend the coordinator with a package-private read-only query for exact `(Session, callId)` presentation input.

The VIEW source may contain only:

- sessionId/callId;
- exact association/lifecycle metadata;
- latest RiskAssessment;
- redacted ReviewerOperationSeed;
- RuleEvaluation;
- FailureChainSummary;
- sanitized assessment reason codes;
- updatedAt.

Do not expose direct-user text, ReviewerPayload, raw arguments, full Ledger, provider response or scheduler internals.

Preserve `queryActiveForCall()` P1C behavior for V1 regressions unless a shared implementation can keep its exact observable contract.

## 6. Track real Phase-5 lifecycle stage

Phase 6 needs accurate:

```text
rules | fast | complete
```

Do not derive stage only from `assessment.provenance.judge.invoked`.

Maintain/read a bounded lifecycle marker on the existing approval record:

- `fast` only while a future A2 can still publish;
- `complete` after Judge disabled/unavailable/not-eligible/terminal failure/A2 completion;
- native decision fences/terminates as already required.

This is lifecycle presentation state only; it must not change A1/A2 assessment semantics.

## 7. Implement OperationPresentationV1

Implement the exact DTO and bounds from the Freeze.

Use only redacted ReviewerOperationSeed + accepted RuleEvaluation.

Per-tool rules:

- read/write/edit: only redacted target hints; never content/diff/create-overwrite claim;
- bash/pwsh: only redacted bounded command/workdir hints;
- web_fetch: redacted URL;
- web_search: retained redacted queries;
- unknown: static unknown summary + safe tool identity, no raw args.

Keep:

```text
workspaceContained='unknown'
sandboxCovered='unknown'
reversible='unknown'
```

Do not perform filesystem/git/network evidence calls.

## 8. Implement BrowserRiskAssessmentV1

Project from latest formal RiskAssessment.

Expose only the fields/bounds frozen in Architecture Freeze:

- assessment status;
- six dimension verdict/source/evidenceQuality/reasons;
- aggregate recommendation/hazard/attention/reason codes;
- bounded findings;
- bounded uncertainties;
- bounded alternatives;
- ledger health;
- judgeAssisted boolean;
- supersedesAssessmentId when present.

Do not transmit basisFeatureIds, eventIds, feature graph, user history, ReviewerPayload, raw model response or reasoning.

Use static/sanitized Phase-5 text only and re-bound every string/array.

## 9. Implement FailureContextPresentationV1

Expose only:

```text
retryCount
recentFailureCount
sameRootCause
permissionEscalation
truncated
```

Do not expose raw Phase-3 recent entries, failure codes, fingerprints, stdout/stderr or command history.

## 10. Upgrade bridge contract with V2

Keep V1 types/parser/freeze behavior unchanged for P1C compatibility.

Add V2 types/parser/freezer exactly per Architecture Freeze.

Requirements:

- schemaVersion=2;
- exact keys recursively;
- known enums only;
- bounded IDs/strings/arrays;
- plain/null-prototype objects only;
- finite numbers / safe integer counts;
- invalid nested ready assessment rejects the whole V2 VIEW;
- parsed value deeply frozen.

`RiskAdvisorBridgeRead` may carry V1 or V2 VIEW, but the Phase-6 product path should receive V2 from Host current endpoints.

## 11. Host Browser bridge V2

Keep the existing authenticated Connection channel:

`/risk-advisor`

and endpoints:

`active`, `assessment`.

Do not add a mutation endpoint.

For `active(sessionId, callId)`:

- resolve Session through SessionStore;
- exact active presentation lookup only;
- NOT_FOUND stays NOT_FOUND;
- AMBIGUOUS stays AMBIGUOUS;
- VIEW projects to V2;
- never select a historical candidate.

For `assessment(assessmentId)`:

- read-only current open assessment lookup;
- project V2 when safely bound;
- NOT_FOUND otherwise.

Bridge faults return bounded existing RPC failure envelope; never raw exceptions.

## 12. V2 status/stage projection

Implement exactly:

- ready = safe formal A1/A2 presentation exists;
- pending = exact BOUND record but local formal assessment is still genuinely in progress;
- unavailable = no safe assessment can be presented for that record;
- cancelled = observed native cancelled lifecycle when still queryable.

Stage:

- rules;
- fast;
- complete.

Do not equate ready with safe/approved/COMPLETE evidence.

## 13. Add Browser-safe V2 reason mapping

Implement the frozen V2 safe reason set.

Map Host internal reasons through an allowlist only.

Never forward unknown/provider/raw exception strings.

`ASSESSOR_NOT_IMPLEMENTED` is V1 legacy only and must not appear on a real Phase-6 ready view.

Transport/protocol reasons remain Client-side `BrowserBridgeClientResult` reasons.

## 14. Client connection dependency

Add the pinned public Client connection package as required by the actual pinned package metadata:

`@deepseek-ai/dsh-client-connection`

Update:

- `dsh.client.inject`;
- peer/dev dependencies needed for type/build/tests;
- Client `inject` service names.

Use `ctx.connection.rpc` through `createRiskAdvisorBridgeClient()`.

No `fetch`, no hard-coded port/URL, no duplicate authentication.

## 15. Update createRiskAdvisorBridgeClient

Keep current cancellation/protocol behavior.

Extend parsing to V2 through shared strict `parseBridgeRead()`.

Do not add Browser-side semantic transformation that changes risk/recommendation.

Transport failures remain:

```text
TRANSPORT_UNAVAILABLE
HOST_REJECTED
PROTOCOL_INVALID
CANCELLED
```

## 16. Implement PresentationStore

One store/source per exact `(sessionId, callId)` binding.

Freeze runtime constants:

```text
POLL_INTERVAL_MS = 1000
NOT_FOUND_GRACE_MS = 3000
```

Store owns:

- immediate fetch;
- poll timer;
- grace start;
- AbortController;
- request generation;
- connection generation;
- snapshot;
- subscriber set;
- disposal.

React components must not call RPC directly.

## 17. Store state mapping

Recommended Client snapshot:

```text
ANALYZING
READY
UNAVAILABLE
CANCELLED
```

with optional parsed V2 view / transport reason.

Rules:

- first NOT_FOUND starts/exposes ANALYZING;
- NOT_FOUND stays ANALYZING until 3000ms grace expires;
- grace expiry → UNAVAILABLE;
- AMBIGUOUS → UNAVAILABLE immediately;
- transport/protocol failure → UNAVAILABLE immediately;
- ready+fast → READY and keep polling;
- ready+complete → READY and stop;
- pending/rules → ANALYZING and keep polling;
- unavailable/cancelled → terminal stop.

## 18. Generation fencing

Every async completion must verify:

```text
sessionId
callId
store generation
request generation
```

before publish.

On callId/session change:

- abort old request;
- dispose old source reference/timer;
- start new binding with new grace window.

On connection reset:

- abort in-flight;
- increment generation;
- invalidate ready Host truth;
- immediate repull if mounted;
- keep original grace-start time for the same binding.

Stale responses are no-ops.

## 19. Polling budget

Normal poll interval is exactly 1000ms.

Do not create overlapping requests. One in-flight request per binding at most.

An immediate fetch followed by 1-second polling stays below the ≤2 req/s target.

Client disposal/unmount must leave zero timers and zero active AbortControllers.

## 20. Replace production fixture path

Remove `R1FixtureStore` / READY_SAMPLE from production Client behavior after real store tests are in place.

Fixture helpers may remain under tests only.

Do not use fixtures as transport-failure fallback.

Update package description/comments that still describe the package as a disposable fixture.

## 21. Real RiskAdvisorDetail

Keep the same slot:

`conversation.approval.detail`

and priority -100.

Compose:

1. preserved command presentation;
2. local Risk Advisor error boundary;
3. real advisory card based on PresentationStore.

If `callId` is missing, Risk Advisor detail should render nothing (or only preserved command behavior if applicable) and must not affect Native Approval.

Do not create approval actions.

## 22. UI components

Implement bounded components for:

- advisory header/disclaimer;
- operation summary;
- Risk + Recommendation summary;
- status badge for COMPLETE/PARTIAL/DEGRADED;
- expandable six dimensions;
- findings;
- uncertainties;
- failure context;
- rules-only / Judge-assisted source;
- safer alternative.

Do not render Host objects generically with JSON/stringify.

Do not show chain-of-thought, prompts, raw feature/event IDs, provider errors or raw args.

## 23. Safer Alternative

Display only.

For MODEL_SUGGESTED/UNVERIFIED show explicit labels.

Copy uses pinned public `writeClipboard` helper from `@deepseek-ai/dsh-client-ui-primitives`.

Copy text:

```text
<title>\n<description>
```

bounded to 1200 chars.

Copy result may update local UI only.

Do not add Use/Execute/Apply/composer-write/new-approval actions.

## 24. Localization

Add the frozen Phase-6 UI vocabulary to `zh` and `en` dictionaries.

Keep raw bounded operation text as React children rather than interpolating it into translation templates when possible.

Missing locale key must not crash Native Approval; local card error boundary remains required.

## 25. Preserve shipped command-detail observable

Keep `commandForSnapshot()` behavior covered by existing tests.

`argsRaw` is allowed only for that compatibility rendering.

Do not feed the command text back into OperationPresenter, Bridge V2 risk fields, dimensions, recommendation or alternative logic.

## 26. Focused test files

Recommended Phase-6 suite:

```text
tests/p6-operation-presenter.unit.spec.ts
tests/p6-browser-bridge-v2.spec.ts
tests/p6-client-store.unit.spec.ts
tests/p6-ui.integration.spec.tsx
```

Additional narrow parser/privacy test files are allowed.

Add:

`test:p6`

to package scripts and append it to the complete `test` chain.

Do not delete prior test scripts.

## 27. Mandatory P6 proofs

Cover every Architecture Freeze §30 requirement.

Especially prove:

- all seven operation kinds/unknown;
- no content/diff/raw args leakage;
- V1 parser unchanged;
- V2 exact-key/bound strictness;
- real A1 and A2 projections;
- fast→complete lifecycle;
- NOT_FOUND 3s grace;
- 1s polling;
- no overlapping polls;
- A1→A2 update;
- stale response fencing;
- connection reset behavior;
- unmount/plugin disposal cleanup;
- UNKNOWN/PARTIAL/DEGRADED not rendered as LOW;
- six dimensions/detail;
- MODEL_SUGGESTED/UNVERIFIED + Copy only;
- no `PendingApproval.answer()` use;
- no composer replacement;
- no Host mutation RPC;
- Native buttons/command behavior preserved.

Use fake timers for grace/polling tests; do not sleep real seconds.

## 28. Pinned Native Approval integration

Use authentic Cordis/jsdom slot integration already established by T01/P1C.

Prove:

- priority -100 detail renderer wins while plugin is active;
- native command observable still appears;
- Native Reject / Allow once remain owned by shipped ApprovalPanel;
- Risk Advisor never answers them;
- Client dispose restores shipped priority-0 detail renderer.

Do not import private runtime components just to assert internals; use public slot behavior/test harness already accepted.

## 29. Optional live Browser smoke

Inspect repository/pinned Harness for an already-supported disposable Browser runner/profile.

If safe and available, run one local disposable smoke covering Pending→Ready and Native buttons.

If not available without new browser dependency, user profile/settings mutation or Harness change, record:

`LIVE_BROWSER_NOT_RUN`.

Do not add Playwright solely for this gate.

## 30. Coexistence evidence

If a second approval plugin can be staged through existing public APIs with no new dependency/Harness change, run one coexistence smoke.

Otherwise record:

`APPROVAL_PLUGIN_COEXISTENCE_NOT_RUN`.

Do not claim coexistence from source inspection alone.

## 31. Privacy/scope audit

Before final Full, inspect executable diff and built declarations/bundles.

Must prove Browser V2/Client store/rendered snapshots contain no:

- user history;
- ReviewerPayload;
- raw args;
- write/edit content;
- justification;
- secret fixture/hash;
- provider raw output/error;
- private reasoning;
- stdout/stderr;
- fingerprints/hashes;
- full RiskFeatureSet/event IDs.

Also prove:

- no `PendingApproval.answer()` call from Risk Advisor;
- no `conversation.composer` registration;
- no raw fetch/hard-coded Host URL;
- no Phase-7/8/9 code;
- no Harness mutation.

## 32. Regression order while iterating

During implementation run the smallest relevant suites.

Recommended:

1. `test:p6`;
2. P1C bridge tests when contract/bridge changes;
3. R1/T01 slot tests when Client renderer changes;
4. P5 tests when coordinator lifecycle projection changes;
5. P4/P3/P2/P1 tests only when shared Host types/plumbing are affected.

Do not repeatedly run the complete suite during coding.

## 33. Pre-Full quality-gate order

When implementation is complete:

1. P6 focused;
2. P5 regression;
3. P4 regression;
4. P3 regression;
5. P2 regression;
6. P1B/P1C + R1/T01/R4 affected regressions;
7. typecheck;
8. build;
9. Host export smoke;
10. Client export smoke;
11. declaration/root-export audit;
12. `pnpm pack --dry-run --json`;
13. `git diff --check`;
14. scope/privacy/secret audit;
15. Harness mutation=0 verification;
16. Browser/Cordis integration;
17. optional live Browser/coexistence gates with honest NOT_RUN if unavailable.

Repair any failure before the final Full.

## 34. Final executable SHA and exactly one fresh complete Full

Commit all executable/source/test/config/package changes first.

Record that exact commit as candidate Tested SHA.

Then run exactly one fresh complete:

`pnpm test`

on that exact committed SHA.

Current accepted pre-Phase-6 full baseline is 24 test files / 173 tests. Do not hard-code the new final count; report actual results.

If Full fails:

- preserve/report the failed attempt;
- repair within Phase-6 scope;
- rerun affected focused/static gates;
- create a new executable commit;
- run a new fresh complete Full on the new exact SHA.

After passing Full: no executable/test/config/package semantic drift.

## 35. Side-effect limits

Required:

```text
provider/model calls = 0
external product/network calls = 0
real destructive shell/filesystem effects = 0
Harness Core mutations = 0
Native Approval authority changes = 0
Phase-7+ implementation = 0
```

Browser local Connection RPC/jsdom integration is allowed.

## 36. Execution Report

After passing Full create:

`docs/tasks/Phase6-operation-presentation-browser-ui/Execution_Report.md`

Report at minimum:

1. outcome token;
2. implementation start SHA;
3. Preflight SHA;
4. Architecture Freeze SHA;
5. final executable/Tested SHA;
6. final report-only remote SHA;
7. changed-file manifest;
8. Bridge V2 contract/parser proof;
9. OperationPresenter per-tool proof;
10. failure-context proof;
11. Client grace/poll/store generation proof;
12. A1→A2 update proof;
13. UI hierarchy and fixture retirement proof;
14. Native Approval/command-detail coexistence proof;
15. safer-alternative UNVERIFIED/Copy-only proof;
16. privacy/secret proof;
17. P6 focused counts;
18. inherited regression counts;
19. typecheck/build/export/declaration/pack results;
20. Browser/Cordis integration result;
21. live Browser/coexistence evidence or explicit NOT_RUN;
22. fresh complete Full exact file/test count;
23. Harness pin/mutation=0;
24. provider/network/destructive side-effect counts;
25. inherited PARTIAL/NOT_RUN/NOT_VALIDATED boundaries;
26. Tested SHA → final remote docs-only proof.

Post-Full changes must be report/docs evidence only.

## 37. Allowed handoff

Successful implementation may return only:

`PHASE6_PUBLISHED_READY_FOR_REVIEW`

or:

`PHASE6_ARCHITECTURE_DECISION_REQUIRED`
`PHASE6_BLOCKED`.

Do not create `Acceptance_Report.md`.

Do not declare `PHASE6_ACCEPTED`.

Do not advance accepted baseline or start Phase 7.