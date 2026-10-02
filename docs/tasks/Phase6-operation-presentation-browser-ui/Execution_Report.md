# Phase 6 Execution Report — Operation Presentation + Browser UI

## Outcome

`PHASE6_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Codex implemented the bounded Phase 6 product scope and did not perform final acceptance. No `Acceptance_Report.md` was created and no accepted baseline was advanced.

## Baselines and publication

| Item | SHA / result |
| --- | --- |
| Required remote starting checkpoint | `3ce76a3983c0b971c708a0052c7e296abe7f1dbf` present in `origin/main` before implementation |
| Phase 6 preflight publication checkpoint | `f291cca68be7529c60a3ecbb44c0aeb9fe532a5c` |
| Phase 6 architecture-freeze checkpoint | `eb79c61a6661ff39f961095a40cc0239ebb6c4b9` |
| Frozen Harness Core | `ddefc45fbc7f8e46dd73185e68295696d1297887` |
| Historical Phase 6 executable/test/config/package commit | `fe390832fea3f07676f6c49a317ab1bf89d42f31` |
| Final Repair start SHA | `aff60f5c663a7692faf68b2fdf1c99afb8d855c2` |
| Current executable/Tested SHA | `9583e9318f56083dcce52bb171a0cb4488862faf` |
| Final docs-only report publication | pushed after this report update; equality verified after push |

Harness Core was read-only throughout. Its tracked diff remained zero and its checked-out SHA stayed at the frozen pin. Existing untracked workspace drift was preserved and was not staged.

## Implemented scope

- Added Host-owned OperationPresentation, FailureContext presentation, and Browser-safe RiskAssessment projection. The projection is derived from the Host assessment/rule records; the Browser path does not parse `argsRaw` or reconstruct risk facts.
- Added strict Bridge V2 parsing with own-data-property/accessor rejection, exact keys, bounded collections/strings, dimension-specific verdict validation, deep freezing, and V1 compatibility for historical unavailable/not-started views.
- Changed authenticated read-only `active` / `assessment` reads to return V2 views for current Phase 6 records. No Host mutation RPC was added.
- Added session+callId scoped Client stores with one in-flight request, 1000 ms polling, 3000 ms NOT_FOUND grace, AbortController disposal, connection-generation reset, and stale-response fencing.
- Added real pending/ready/unavailable/cancelled Browser card states, six-dimension detail, findings, uncertainties, failure context, rules-only/Judge-assisted source, and Copy-only safer alternatives marked `MODEL_SUGGESTED / UNVERIFIED`.
- Used the public `writeClipboard` helper. The card never calls Native Approval answer APIs, changes Native Approval authority/buttons, or replaces the conversation composer. Shipped command detail remains visible beside the advisory card.
- Removed the fixture store from the production Client path and moved the retained fixture helper under `tests/` only. The production path has no READY_SAMPLE fallback and does not use fixtures for transport failure.
- Kept the Phase 5 Risk Engine/P0–P9 semantics, Phase 4 Rule Engine semantics, and Native Approval ownership unchanged.

## Validation gates

The prescribed order was followed before the final full run.

| Gate | Result |
| --- | --- |
| Phase 6 focused (`pnpm run test:p6`) | PASS — 4 files, 17 tests |
| Phase 5 regression | PASS — 4 files, 23 tests |
| Phase 4 regression | PASS — 2 files, 17 tests |
| Phase 3 regression | PASS — 2 files, 17 tests |
| Phase 2 regression | PASS — 2 files, 15 tests |
| Phase 1B regression | PASS — 2 files, 14 tests |
| Phase 1C / authenticated bridge | PASS — 1 file, 8 tests |
| R1/T01 slot and Native Approval regression | PASS — 2 files, 9 tests |
| R4 affected regression | PASS — 2 files, 21 tests |
| P1A affected regression | PASS — 2 files, 13 tests |
| Typecheck | PASS — `pnpm typecheck` |
| Build | PASS — `pnpm build` |
| Host export smoke | PASS |
| Client export smoke | PASS with the pinned Harness UI-primitives loader seam |
| Declaration audit | PASS — Phase 6 bridge/client/store exports present |
| Pack dry-run | PASS |
| Diff/scope/privacy audit | PASS — no `PendingApproval.answer`, composer replacement, mutation RPC, provider/network call, or Browser `argsRaw` risk derivation in the Phase 6 surface |
| Harness mutation gate | PASS — tracked diff 0, frozen SHA unchanged |
| Browser/Cordis integration | PASS — P1C Host bridge and R1/T01 slot/native coexistence suites |
| Phase 5/R5 inherited follow-up | PASS — `test:r5`, 1 file, 3 tests |
| Safe disposable live Browser smoke | `LIVE_BROWSER_NOT_RUN` — no supported disposable runner/profile was available without changing Harness or using a user profile |
| Second real approval-plugin coexistence smoke | `APPROVAL_PLUGIN_COEXISTENCE_NOT_RUN` — no public-API-only disposable fixture was available |

No real external provider/network was called for ordinary implementation or acceptance testing. No destructive filesystem command, Native Approval mutation, or production side effect was used.

## Fresh complete regression

After committing the executable state, exactly one fresh complete run was executed:

```text
SHA:    fe390832fea3f07676f6c49a317ab1bf89d42f31
Command: pnpm test
Result: PASS
Tests:  190
```

Breakdown: R1 9, R2 16, R3 17, R4 21, R5 3, P1A 13, P1B 14, P1C 8, P2 15, P3 17, P4 17, P5 23, P6 17. After this full run, no executable, test, configuration, or package semantic changes were made.

## Drift and final verification

The following pre-existing untracked drift was intentionally left untouched: `.vitest-cache/`, `docs/risk-advisor-current/`, prior repair/instruction documents, `lib/`, `node_modules/`, and `pnpm-lock.yaml`. They are not part of the Phase 6 commit.

The report-only commit will be pushed without force and then verified with all three values equal:

```text
git rev-parse HEAD
git rev-parse origin/main
git ls-remote origin refs/heads/main
```

The final status is `PHASE6_REPAIR_PUBLISHED_READY_FOR_REVIEW`; independent acceptance is reserved for ChatGPT Web.

## Final Repair F1–F6

### F1 — complete lifecycle and future A2

When Fast Judge is enabled but the LLM capability is not attached, a bound A1 now remains `ready` with non-terminal `stage: fast` and `JUDGE_CAPABILITY_UNAVAILABLE`; it is never exposed as `complete` while a later `attachJudge()` can still schedule A2. The real coordinator lifecycle proof creates A1 without LLM capability, attaches a local pinned LLM seam, observes A2 supersession as `ready + complete`, detaches/reattaches, and proves the terminal assessment ID does not change. Once A2 is complete, `attempted` fences all later scheduling.

### F2 — first-read NOT_FOUND grace

`PresentationStore` starts the fixed 3000 ms grace clock when the first active read is issued. The timestamp is preserved across connection-generation resets and is only new for a new store binding/session-call key. Focused proof covers a slow first response at t=2500, reset-before-first-response, and a new callId receiving a separate grace window.

### F3 — render-pure StrictMode ownership

`PresentationClient.getSource()` is an inert, stable source lookup. Ownership is acquired only by committed `useEffect` through `retain()` and released exactly once through `release()`. `PresentationStore.stop()` aborts requests and clears timers without making an abandoned render start a poller. StrictMode proof verifies one active source, no overlap, old-binding release on call switch, and zero in-flight work after unmount.

### F4 — missing callId

`RiskAdvisorDetail` returns no Risk Advisor card when callId is absent, never creates a source or issues RPC, while the independent command projection and Native Approval owner remain untouched. Focused UI proof asserts zero RPC calls and the existing R1/T01 Native Approval test preserves Reject/Allow-once behavior.

### F5 — frozen information hierarchy

The ready card now visibly covers PARTIAL and DEGRADED status, the first primary reason, resources, requested permission, workspace/sandbox/recovery unknown values, all six dimensions, findings, uncertainties, complete Failure Context (`sameRootCause`, `permissionEscalation`, `truncated`), source, ledger health and evidence quality. Focused UI proof covers PARTIAL, DEGRADED without translating it to LOW, true/false/unknown boolean states, truncated context, and the Copy success/failure states. No raw feature/event identifiers are rendered.

### F6 — expanded focused proof

`test:p6` now covers 5 files / 27 tests, including:

- strict V1 compatibility, bound-pending and cancelled V2 lifecycle parsing, V2 privacy bounds, and real coordinator A1→A2 late-attach/terminal fencing;
- first-read grace, reset preservation, new-binding grace, no-overlap, AMBIGUOUS bypass, terminal transport/protocol failure, stale-response fencing, and in-flight abort;
- StrictMode/refcount ownership, missing callId, PARTIAL/DEGRADED hierarchy, operation/resource/permission/unknown detail, full Failure Context, ledger/evidence detail, copy success/failure, no execution actions, local card-error isolation, and Native Approval/command coexistence.

The full repair regression was run exactly once after committing the executable state:

```text
SHA:     9583e9318f56083dcce52bb171a0cb4488862faf
Command: pnpm test
Result:  PASS
Tests:   200
```

Breakdown: R1 9, R2 16, R3 17, R4 21, R5 3, P1A 13, P1B 14, P1C 8, P2 15, P3 17, P4 17, P5 23, P6 27. Pre-Full focused/static/export/pack/privacy/Harness and Browser/Cordis gates all passed. `LIVE_BROWSER_NOT_RUN` and `APPROVAL_PLUGIN_COEXISTENCE_NOT_RUN` remain unchanged. No executable, test, config, or package semantic drift occurred after Full; only this report update is being published.
