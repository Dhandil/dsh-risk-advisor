# Risk Advisor — Phase 6 Final Review Repair Instructions

**Review verdict:** `PHASE6_REPAIR_REQUIRED`  
**Date:** 2026-10-02  
**Reviewed executable/Tested SHA:** `fe390832fea3f07676f6c49a317ab1bf89d42f31`  
**Reviewed report-only remote SHA:** `226aa0ee97db1ca12e43718f82200e03fcc13f84`  
**Frozen Phase-6 architecture:** `eb79c61a6661ff39f961095a40cc0239ebb6c4b9`  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, READ-ONLY.

## 1. Independent review result

Phase 6 has the correct overall architecture and the publication discipline is clean:

- `fe390832... → 226aa0ee...` is report-only;
- Fresh Full was reported on the executable SHA with no executable drift afterward;
- Host owns OperationPresentation / BrowserRiskAssessment projection;
- Bridge V2 is separate from V1;
- Browser does not reconstruct Risk Advisor facts from raw Tool Arguments;
- Native Approval authority remains unchanged;
- fixture production path was removed;
- Client polling is bounded to 1000ms and NOT_FOUND grace is intended to be 3000ms;
- safer alternatives remain display/copy-only and model suggestions are UNVERIFIED.

Acceptance is blocked by F1–F6 below. These are Phase-6 implementation repairs only.

## 2. F1 — `complete` lifecycle can still produce a future A2

### Current problem

`scheduleJudge()` currently does this when Fast Judge is enabled but no LLM capability/scheduler is attached yet:

```text
phase5.stage = 'complete'
add JUDGE_CAPABILITY_UNAVAILABLE
return
```

but it does **not** mark the record permanently attempted/terminal.

Later, `attachJudge()` loops all existing records and calls `scheduleJudge(record)` again. The same record can therefore move:

```text
complete → fast → A2
```

after Browser has already seen `ready + complete` and stopped polling.

This violates the frozen definition:

```text
complete = no future A2 can arrive
```

and can make Browser permanently miss a valid later A2.

### Required repair

Make lifecycle stage and future-A2 possibility consistent.

Preferred rule:

- if Fast Judge is enabled and the record is still eligible for a future capability attachment, do not expose `complete`; expose a non-terminal stage that keeps Browser polling, or explicitly track a `futureA2Possible` state;
- only expose `complete` once no future Judge attempt can occur for that open record;
- if capability absence is intended to be terminal instead, then mark the record terminal so later `attachJudge()` cannot schedule an A2.

Do **not** silently remove Phase-5 dynamic attach semantics without proving that this is intended.

### Mandatory tests

- create A1 with Fast Judge enabled but LLM capability absent;
- Browser-visible stage must not falsely claim terminality if later attach can produce A2;
- attach LLM later;
- either A2 is correctly observed by continuing polling, or later A2 is provably impossible because record was made terminal;
- `ready + complete` must be a one-way terminal presentation state for that open approval.

## 3. F2 — NOT_FOUND grace starts too late

### Current problem

`PresentationStore.graceStartedAt` is initialized on the **first NOT_FOUND response**.

The Freeze requires:

```text
3000ms since the first active read for that mounted (sessionId, callId) binding
```

not 3000ms after the first NOT_FOUND arrives.

A slow first request can therefore stretch a 3000ms grace into a much longer window.

### Required repair

- initialize grace start when the first active read for a new binding is issued;
- preserve that timestamp across connection resets for the same binding;
- only reset grace when sessionId or callId changes;
- a slow first NOT_FOUND must count against the original 3000ms window.

### Mandatory tests

- first active request begins at t=0 but resolves NOT_FOUND at t=2500; next poll must reach unavailable around t=3000, not t=5500;
- connection reset before first NOT_FOUND does not restart grace;
- callId/session change does create a new grace window.

## 4. F3 — React render-phase acquisition can leak a polling store

### Current problem

`RiskAdvisorDetail.AdvisoryBody` calls:

```text
client.acquire(sessionId, callId)
```

inside `useMemo()` during render.

`acquire()` is not pure: it increments a refcount, creates/starts a PresentationStore and begins RPC polling.

React is allowed to replay/abandon render work, and the pinned Harness explicitly treats StrictMode/render-to-subscribe safety as a lifecycle requirement in its client resource model.

If a render is replayed or abandoned before the effect cleanup is committed, an acquire can remain without a matching release, leaking a poller/ref.

### Required repair

Do not perform refcount/poller side effects from render/useMemo.

Use a StrictMode-safe source model, for example:

- `getSource(sessionId, callId)` returns a stable inert store without incrementing ownership;
- `useEffect`/subscription lifecycle acquires/starts and releases/stops;
- or another design where render is pure and every committed hold has an exact cleanup.

Requirements:

- stable source identity for one binding;
- no duplicate poller under StrictMode replay;
- abandoned render cannot start an orphan poller;
- final unmount releases all timers/requests.

### Mandatory tests

- render under React `StrictMode`;
- exactly one active polling source for the binding;
- unmount leaves zero refs/timers/in-flight request;
- remount does not leak the abandoned/old source;
- session/call switch releases the old binding exactly once.

## 5. F4 — missing callId behavior violates the Freeze

### Current problem

When `callId` is absent, `AdvisoryBody` has no store but renders `UnavailableCard`.

The Freeze requires:

```text
missing callId → Risk Advisor advisory detail absent
(preserved command behavior may remain if applicable)
Native Approval remains usable
```

A missing correlation identity must not be presented as a real Risk Advisor unavailable assessment.

### Required repair

- if callId is absent, render no Risk Advisor advisory card;
- do not acquire a PresentationStore;
- do not call Host RPC;
- preserve any independently valid shipped command-detail behavior;
- Native Reject / Allow once remain unaffected.

### Mandatory tests

- missing callId produces zero Risk Advisor RPC calls;
- no advisory card is rendered;
- Native Approval controls remain functional.

## 6. F5 — UI does not implement the frozen information hierarchy

### Current problem

The current Ready card omits several mandatory Phase-6 presentation elements.

#### Always-visible omissions

Freeze requires:

- operation summary;
- Risk;
- Recommendation;
- one primary reason;
- PARTIAL/DEGRADED status when applicable;
- safer alternative when present.

Current code does not visibly render:

- `assessment.status` (PARTIAL / DEGRADED);
- aggregate `primaryReasonCodes` / primary reason.

#### Operation/detail omissions

Freeze requires expandable visibility for:

- affected resources;
- requested permission / scope;
- workspace containment unknown;
- sandbox coverage unknown;
- recovery/reversibility unknown.

Current UI renders only operation title + summary and drops these structured fields.

#### Failure-context omissions

Frozen FailureContext contains:

```text
retryCount
recentFailureCount
sameRootCause
permissionEscalation
truncated
```

Current UI renders only `retryCount/recentFailureCount` and drops the remaining three fields.

### Required repair

Implement the frozen hierarchy without inventing new evidence.

Always-visible ready summary must show:

- risk;
- recommendation;
- PARTIAL/DEGRADED badge when not COMPLETE;
- first primaryReasonCode when present;
- safer alternative teaser/card when present.

Expandable detail must show:

- operation resources;
- requested permission when present;
- workspaceContained/sandboxCovered/reversible exactly as `unknown` when unknown;
- all six dimensions;
- findings/uncertainties;
- full bounded FailureContext including sameRootCause, permissionEscalation and truncated;
- rules-only vs Judge-assisted source;
- ledger health/evidence quality where already present in DTO.

Do not translate UNKNOWN into LOW/safe.

### Mandatory tests

- PARTIAL visible;
- DEGRADED visible and not styled/texted as LOW;
- primary reason visible when present;
- resource list and requested permission visible;
- workspace/sandbox/recovery unknown labels visible;
- sameRootCause true/false/unknown rendered honestly;
- permission escalation true/false/unknown rendered honestly;
- truncated failure context visibly indicates truncation;
- ledger health/evidence-quality detail rendered without raw feature IDs.

## 7. F6 — Phase-6 focused proof is materially incomplete

### Current evidence gap

`test:p6` reports 4 files / 17 tests, but several Architecture Freeze §30 mandatory boundaries are not actually exercised.

At minimum add executable proofs for:

### Host / Bridge

- real A1 `fast` lifecycle from coordinator, not only synthetic DTO;
- real A2 supersession → `complete` V2;
- exact bound pending source where reachable;
- bound/unbound unavailable projection;
- cancelled/closed projection behavior or explicit proof why it is no longer renderable;
- V1 compatibility remains unchanged;
- serialized V2 contains no raw prompt/args/secret/evidence IDs.

### Client source

- F1 future-A2/complete invariant;
- F2 first-read grace semantics;
- no overlapping active RPCs;
- AMBIGUOUS bypasses grace;
- transport/protocol failure terminal behavior;
- connection reset preserves original grace;
- StrictMode/refcount lifecycle from F3;
- unmount aborts an in-flight real bridge call;
- stale old binding response cannot publish after session/call switch.

### UI / authority

- F4 missing-callId behavior;
- all F5 information hierarchy states;
- copy success and copy failure both report honestly;
- no Use/Execute/Apply action;
- local card render error does not remove command detail or Native controls;
- plugin disposal restores shipped priority-0 renderer;
- Native Reject and Allow once outcome parity remains unchanged.

Parameterization is encouraged. Proof quality matters more than raw test count.

## 8. Preserve accepted Phase-6 implementation

Do not regress:

- Bridge V2 separate from V1;
- strict V2 exact-key/enum/bound parsing;
- Host-owned OperationPresentation;
- no Browser risk reconstruction from argsRaw;
- no mutation RPC;
- no `PendingApproval.answer()` use;
- no `conversation.composer` replacement;
- 1000ms normal polling ceiling;
- one in-flight request per binding;
- stale response fencing;
- fixture removed from production path;
- MODEL_SUGGESTED / UNVERIFIED;
- public `writeClipboard` helper;
- Native Approval command/buttons ownership;
- Phase-5/4/3 semantics unchanged.

## 9. Live Browser / coexistence boundaries

Keep current honest evidence:

```text
LIVE_BROWSER_NOT_RUN
APPROVAL_PLUGIN_COEXISTENCE_NOT_RUN
```

unless a pre-existing supported disposable path is actually available.

Do not add a new browser dependency or mutate user/Harness profiles merely to close these.

## 10. Validation order

Use the existing governance:

1. implement only F1–F6;
2. expanded Phase-6 focused tests;
3. Phase-5 regression;
4. Phase-4 regression;
5. Phase-3 regression;
6. Phase-2 regression;
7. Phase-1B/P1C + R1/T01/R4 affected regressions;
8. typecheck;
9. build;
10. Host export smoke;
11. Client export smoke;
12. declaration/root-export audit;
13. `pnpm pack --dry-run --json`;
14. `git diff --check` + scope/privacy/secret audit;
15. Harness mutation=0 verification;
16. Browser/Cordis integration;
17. commit final executable/test/package repair;
18. run exactly one fresh complete `pnpm test` on that exact repair SHA.

If Full fails, preserve/report the failed attempt, repair within Phase-6 scope, rerun affected pre-Full gates, create a new executable SHA, and run a new fresh Full.

After a passing Full, no executable/test/config/package semantic drift.

## 11. Report update

Update:

`docs/tasks/Phase6-operation-presentation-browser-ui/Execution_Report.md`

Add a distinct **Final Repair F1–F6** section recording:

- repair start SHA;
- new executable/Tested SHA;
- F1 complete/future-A2 proof;
- F2 first-read grace proof;
- F3 StrictMode/store lifecycle proof;
- F4 missing-callId proof;
- F5 UI hierarchy proof;
- F6 expanded focused matrix/count;
- regression/static/export/pack/privacy results;
- Browser/Cordis integration;
- fresh complete Full exact count;
- Tested→remote docs-only proof;
- inherited NOT_RUN/PARTIAL/NOT_VALIDATED boundaries unchanged.

Historical Tested SHA `fe390832...` remains chronology only; top/current Tested SHA must become the repair executable SHA.

## 12. Scope prohibitions

Do not:

- change six-dimension or P0–P9 semantics;
- alter Phase-4 deterministic rule outputs;
- add Phase-7 verification;
- add Phase-8 evidence collection;
- add Phase-9 Deep Judge;
- modify Harness Core;
- change Native Approval ownership/buttons/outcomes;
- introduce Browser-side raw-args risk derivation;
- add a mutation RPC;
- add safer-alternative execution/composer actions;
- make real provider/network acceptance calls.

## 13. STOP conditions

Stop with `PHASE6_ARCHITECTURE_DECISION_REQUIRED` if repair would require:

- changing Phase-5 Judge attachment semantics rather than only presenting them correctly;
- replacing Native ApprovalPanel/composer;
- private Harness DOM/input hooks;
- new risk inference;
- new evidence collection;
- Harness Core modification.

## 14. Allowed handoff

After repair, expanded focused proof, regressions/static gates, Browser/Cordis integration, a fresh complete Full, report-only publication, push and remote equality verification, return:

`PHASE6_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE6_ACCEPTED` and do not start Phase 7.