# Risk Advisor — Phase 1C Implementation Instructions (Codex)

**Authority:** read adjacent `Phase1C_Architecture_Freeze.md` fully before implementation. It controls all Phase 1C decisions.  
**Task:** implement the safe Host-to-Browser Assessment Bridge only.  
**Expected plugin starting remote:** `b81cff6e02b2dd520e2ccb4b9a04d829e8dfc4a6`.  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`, strictly read-only.  
**Acceptance authority:** ChatGPT Web only.

## 0. Preflight and protection

1. In `D:\Harness\harness-plugin\dsh-risk-advisor`, inspect branch, HEAD, status, index, untracked files, `origin/main`, and `git ls-remote origin refs/heads/main`. Safely fast-forward only if linear. STOP on unexplained divergence.
2. Never reset/clean/rebase/force. Preserve all existing plugin drift, especially `.vitest-cache/`, `docs/risk-advisor-current/`, T01/Phase1A/Phase1B local repair instruction files, generated `lib/`, `node_modules/`, `pnpm-lock.yaml`, and any newly observed user files.
3. Read frozen Harness source at `ddefc45f...` only. No fetch/pull/checkout/install/build/source write/.git write in Harness. Preserve all known Harness drift.
4. Read:
   - Phase1C Architecture Freeze;
   - accepted Phase1B source/report and repair;
   - Phase1A source/report;
   - canonical Architecture §§3.3, 31–33, 45, 47;
   - V1 Spec §§14–17;
   - Test Matrix P0 + Area J;
   - pinned `dsh-client-connection` Host/Client RPC contracts and SessionStore live `get`.
5. Confirm current plugin remote still matches the expected Phase1B accepted checkpoint before changing executable files.

## 1. Implement the Host bridge

Add a small Host module, e.g. `src/host/browser-bridge.ts`.

Use only the public pinned Connection RPC seam:

```text
ctx.connection.rpc.handle('/risk-advisor', handler)
```

Supported endpoints:

```text
active
assessment
```

Do NOT register a direct `webServer` route.

The handler must:

- strictly validate endpoint and payload shape;
- bound all identifiers;
- return safe `ConnectionRpcResult` values;
- never echo rejected IDs/payloads into errors;
- honor an already-aborted signal;
- never call tools/fs/network/provider;
- never mutate coordinator/native approval/session;
- catch unexpected local defects and map them to one fixed safe failure without arbitrary exception text.

`active`:

```text
payload {sessionId, callId}
-> ctx.sessions.get(sessionId)
-> exact live Session
-> Phase1B private active-call query
-> VIEW | NOT_FOUND | AMBIGUOUS
```

`assessment`:

```text
payload {assessmentId}
-> bounded open-assessment query
-> VIEW | NOT_FOUND
```

No historical lookup or Ledger join.

Mount the channel compositionally only when `connection` and `sessions` are available. Disposal/HMR must withdraw the channel. There must be one registration for one plugin generation.

## 2. Add minimal Phase1B private read helpers

Modify `assessment-envelope.ts` only as needed to support the bridge.

Required semantics:

- query by exact Session object + exact callId;
- only open records participate;
- zero -> NOT_FOUND;
- >1 -> AMBIGUOUS, never pick newest/first/last;
- conflicted UNBOUND shell stays UNBOUND with no recovered IDs;
- query by assessmentId only returns one still-open record that still owns that id;
- closed/expired/evicted/disposed -> NOT_FOUND;
- no method returns mutable internal record, Session ref, approvalId, ToolExecution, or raw Foundation values.

Keep the existing `riskAdvisorAssessments` Host diagnostic behavior compatible unless the Freeze explicitly requires a safe additive change.

## 3. Define Browser-safe DTOs

Create a transport DTO module shared by Host and Client only if it remains browser-safe; otherwise duplicate a narrow validated schema.

The current DTO may contain only:

```text
schemaVersion
sessionId
callId
assessmentId?   // only valid unique BOUND shell
association     // BOUND | UNBOUND
status          // unavailable
stage           // not-started
safe reason codes
updatedAt
```

It must not contain:

```text
approvalId
executionId
observedOutcome
raw reason
raw args
path/target/cwd
operationHash
Session/exec/token/signal
Ledger/evidence
provider/model
exception text
issue counters
```

Add an explicit `AMBIGUOUS` bridge response with no candidate identities.

Strictly reject unknown DTO fields on the Browser parser so future accidental Host data widening fails closed instead of silently leaking.

## 4. Implement Browser client adapter without changing UI

Add e.g. `src/client/assessment-bridge.ts`.

It should accept the public pinned `ClientConnectionRpc` and call:

```text
rpc.call('/risk-advisor', 'active', ...)
rpc.call('/risk-advisor', 'assessment', ...)
```

Runtime-validate every `unknown` Host success value.

Map:

- Host VIEW -> validated detached/frozen VIEW;
- Host NOT_FOUND -> NOT_FOUND;
- Host AMBIGUOUS -> AMBIGUOUS;
- Host RPC error -> UNAVAILABLE/HOST_REJECTED;
- transport throw -> UNAVAILABLE/TRANSPORT_UNAVAILABLE;
- malformed Host success -> UNAVAILABLE/PROTOCOL_INVALID;
- aborted call -> UNAVAILABLE/CANCELLED.

Never expose Host error message/details to the product result.

Export the adapter from `src/client/index.ts`, but DO NOT inject it into `RiskAdvisorDetail.tsx` and DO NOT replace `R1FixtureStore`.

The current T01 slot must remain fixture-only in this phase.

## 5. Package metadata

A narrow `package.json` change is allowed to declare the pinned public `@deepseek-ai/dsh-client-connection` dependency/peer relationship if required by the imports and current package policy.

Do not install or upgrade packages.

Do not add Typert generation, Router libraries, HTTP libraries, polling libraries, state libraries, or new runtime dependencies.

Add a `test:p1c` script and include it in the complete `pnpm test` chain.

## 6. Required tests

Create focused Phase1C Host/client tests implementing `P1C-01..P1C-12` from the Freeze.

At minimum include:

- unique live active approval -> exact bridge VIEW;
- current SessionStore resolution and wrong/disposed session;
- same-callId multiple active approvals -> AMBIGUOUS;
- conflicted Phase1B record cannot recover prior assessment identity;
- real `approval/decided` removes Browser active/by-id visibility;
- by-assessment id only while open;
- invalid/oversized/extra payload fields and unknown endpoint;
- aborted signal;
- Host DTO privacy;
- Browser strict parser privacy;
- transport throw/Host error/malformed value -> safe client result;
- dedicated real pinned Connection RPC registration/dispatch/disposal;
- no raw `webServer` feature route;
- T01 fixture unchanged;
- no Native approval answerer.

Use real `Context + SessionStore + ToolRuntime + ApprovalService` where the assessment lifecycle itself is being proved.

For transport, exercise the real pinned `HostConnectionService` dedicated RPC channel or plugin-composed equivalent. A disposable structural/fake WebServer and in-memory auth fixture are allowed. Do not launch a user's live Browser.

Any manually appended approval events are fault injectors only; label them as such.

## 7. Architecture/privacy/source audits

Before final full regression, audit production diffs for:

```text
no approval/request listener
no PendingApproval.answer
no Native outcome mutation
no second ExecutionId mint
no Ledger/history identity join
no raw webServer route for Risk Advisor
no hard-coded port/origin
no global fetch path as product bridge
no raw approval reason/args/path/cwd/hash/evidence in DTO
no Rule Engine/Judge/Provider/OperationPresentation
no Phase 1C UI takeover
```

Also verify:

- dedicated channel exactly `/risk-advisor`;
- only `active` / `assessment` endpoints;
- strict bounded request validation;
- active-only Browser visibility;
- channel disposal after HMR/plugin teardown.

## 8. Quality gates and final regression order

Execute in this order:

```text
preflight + pinned source verification
-> implement Host query/bridge + unit tests
-> implement client adapter + parser tests
-> real Approval lifecycle integration
-> real Connection RPC registration/dispatch/disposal integration
-> architecture/privacy/source audit
-> typecheck
-> available lint/publint (honest NOT_CONFIGURED if absent)
-> build Host + Client
-> Host export smoke
-> Client export smoke
-> pnpm pack --dry-run
-> git diff --check for executable scope
-> secret/privacy/scope scans
-> fix and rerun affected focused/static gates
-> exactly ONE fresh final complete pnpm test on final executable SHA
-> Execution_Report.md only
-> implementation/test commit
-> optional separate report-only commit
-> normal push
-> verify HEAD == origin/main == git ls-remote
-> STOP
```

Inherited baseline before Phase1C is **93 tests**:

```text
T01 9
T02 16
T03 17
T04 21
T05 3
Phase1A 13
Phase1B 14
```

Final full must include all 93 plus every new Phase1C test.

If any executable change occurs after the final full regression, the old full is no longer final. Re-run relevant focused/static checks and one fresh final full on the new executable SHA.

## 9. Report

Update only:

`docs/tasks/Phase1C-browser-bridge/Execution_Report.md`

Do not create `Acceptance_Report.md`.

Report must include:

- exact starting plugin SHA and pinned Harness SHA;
- implementation manifest;
- proof that the transport uses authenticated Connection RPC, not a raw feature Web route;
- exact active-session/call lookup semantics and no historical fallback;
- DTO allowlist / forbidden data;
- P1C-01..12 evidence and exact test counts;
- genuine ApprovalService integration vs component fault injection;
- real Connection RPC integration vs direct decoded carrier tests;
- typecheck/build/Host export/Client export/pack/privacy/scope results;
- final full regression count and Tested SHA;
- report-only final remote SHA if used;
- protected drift;
- zero provider/Judge/browser-live/native-PTC calls;
- inherited open gates;
- explicit statement that no real Assessment engine, OperationPresentation or product UI has been implemented.

## 10. Publication and STOP

Commit only intended Phase1C files. Push normally.

Verify:

```text
HEAD
origin/main
git ls-remote origin refs/heads/main
```

all equal.

Successful handoff:

`PHASE1C_PUBLISHED_READY_FOR_REVIEW`

STOP after publication. Do not start the next phase.

STOP earlier with `PHASE1C_ARCHITECTURE_DECISION_REQUIRED` if the frozen design cannot be implemented safely without widening scope.

### Compact Codex startup text

```text
Enter dsh-risk-advisor and execute Phase 1C only.

Verify/sync origin/main and preserve all existing drift.
Read and obey:
docs/tasks/Phase1C-browser-bridge/Phase1C_Architecture_Freeze.md
docs/tasks/Phase1C-browser-bridge/Phase1C_Implementation_Instructions.md

Implement the authenticated read-only Connection-RPC Host-to-Browser bridge,
strict Browser-safe DTO/client validation, Phase1B active-only queries,
focused + real pinned Host/Connection integrations, static gates, and exactly
one final fresh full regression.

Harness remains frozen/read-only at ddefc45f...
Do not modify the T01 fixture UI, do not implement Rule Engine/Judge/Provider/
OperationPresentation/product card, do not own Native Approval, and do not
enter the next phase.

Update Execution_Report.md, commit/push, verify remote SHA, then STOP.
No Acceptance Report and no self-declared ACCEPTED.
```
