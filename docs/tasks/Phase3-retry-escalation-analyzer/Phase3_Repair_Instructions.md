# Risk Advisor — Phase 3 Final Architecture Review Repair Instructions

**Review verdict:** `PHASE3_REPAIR_REQUIRED`  
**Date:** 2026-09-30  
**Reviewed executable/tested SHA:** `c08c1d341b2b2729815c42a5543394cce1efb51c`  
**Reviewed report-only remote SHA:** `25cf760fb4d107ad84590eb06697dd01e8a0293e`  
**Frozen authority:** `Phase3_Architecture_Freeze.md`  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, read-only.

## 1. Review result

Phase 3 is close but not yet accepted.

Independent review confirmed:

- Tested SHA → final remote is report-only;
- scope is Host-only Phase 3 with no Browser/Phase 4/Harness Core expansion;
- exact Session-object scoping, generation-local relations, nearest-only retry, overlap protection, TTL/bounds, conflict fail-closed, structured failure signatures, no durable guessed relation, privacy and root public-surface boundaries are directionally correct;
- final reported full regression is 18 files / 132 tests on the reviewed executable SHA.

Two bounded correctness repairs remain. Do not redesign Phase 3.

## 2. F1 — fingerprint adapters must reject pinned value-level malformed input visible at pre-execute

### Root cause

Phase 3 observes arguments in `tools/pre-execute`.

At that point Harness schema validation has run, but several tool-owned **value constraints are validated only inside the tool body**, after Phase 3 has already captured its fingerprint/permission evidence.

Pinned source proves:

- `read`: `file_path.trim().length > 0`; supplied `offset` / `limit` must be positive integers;
- `write`: `file_path.trim().length > 0`; sandbox escalation args are validated in `resolvePolicy()`;
- `bash` / `pwsh`: `command.trim().length > 0`, `description.trim().length > 0`, supplied `timeoutMs > 0`;
- shared `validateEscalationArgs()`: `sandbox_permissions` and `justification` must travel together and supplied justification must trim to non-empty.

Current `captureFingerprint()` does not fully mirror these Phase-3-relevant constraints:

- whitespace-only paths/commands can be accepted;
- read offset/limit `0` can be accepted;
- shell `timeoutMs=0` can be accepted;
- permission without justification can be accepted;
- justification without permission can be accepted;
- whitespace-only justification can be accepted;
- shell description is not required by the internal adapter and whitespace description can be accepted.

This matters because malformed requests can currently contribute a fingerprint and, most importantly, `requestedPermission`, allowing a request that the real tool will reject as malformed to become Phase-3 permission-escalation evidence.

The current positive permission focused test also constructs shell calls with `sandbox_permissions` but without the required non-empty `justification` (and without the pinned required `description`), so it proves analyzer mechanics on an input that is not a valid pinned shell call.

### Required repair

Keep the same controlled adapters, but fail closed on the relevant pinned value constraints before producing a fingerprint or requested-permission fact.

At minimum:

#### read

- `file_path.trim().length > 0`;
- supplied `offset` must be integer `>= 1`;
- supplied `limit` must be integer `>= 1`;
- retain existing bounded upper safety cap.
- Do not invent knowledge of a deployment-specific read cap that is not publicly available; the repair need only close the value constraints that can be proven from the pinned public source.

#### write

- `file_path.trim().length > 0`;
- preserve bounded string/content handling;
- enforce escalation pairing:
  - neither permission nor justification: valid;
  - both present: permission must be a closed target and justification must trim to non-empty;
  - exactly one present: unsupported;
- do not retain justification text.

#### bash / pwsh

- `command.trim().length > 0`;
- require a present bounded `description` and `description.trim().length > 0`;
- supplied `timeoutMs` must be finite and strictly `> 0` within the Phase-3 safety bound;
- preserve current workdir/background checks;
- enforce the same escalation pairing rule as above;
- do not retain description/timeout/justification in the fingerprint.

Malformed adapter input must yield no fingerprint and no `requestedPermission`, with an appropriate bounded reason code.

Do not import/call tool-private validators from Harness or mutate Harness Core. Mirror only the small pinned semantic constraints needed by the Phase-3 adapter.

### Mandatory tests

Add/adjust focused tests proving:

1. whitespace-only read/write `file_path` → UNSUPPORTED;
2. read offset/limit zero or negative → UNSUPPORTED;
3. whitespace-only shell command → UNSUPPORTED;
4. missing/whitespace shell description → UNSUPPORTED where directly testing the analyzer;
5. shell timeout `0` / negative → UNSUPPORTED;
6. permission without justification → UNSUPPORTED;
7. justification without permission → UNSUPPORTED;
8. whitespace-only justification with permission → UNSUPPORTED;
9. valid paired permission + non-empty justification still excludes both fields from fingerprint identity;
10. update all positive permission-escalation tests to use valid pinned adapter arguments.

Do not turn deployment-specific read-cap uncertainty into a broad Phase-3 redesign.

## 3. F2 — nearest successful match is a normal blocker, not degraded evidence

### Root cause

The frozen retry rule says:

- nearest matching FAILURE → may form `retryOf`;
- nearest matching SUCCESS → no retry;
- nearest matching PENDING / UNKNOWN / CONFLICTED / unavailable evidence → no retry and may be degraded.

Current `summaryStatus()` effectively does:

```text
nearestPriorOrdinal exists
+ directPrior() is undefined
→ NEAREST_MATCH_BLOCKED
→ DEGRADED
```

This incorrectly marks the ordinary complete-history case:

```text
old failure
→ nearest matching success
→ current execution
```

as evidence-degraded.

A known successful nearest match is not missing/ambiguous evidence. It is the exact fact that intentionally prevents reaching back to the older failure.

This false `DEGRADED` status would contaminate later evidence-quality/context phases.

### Required repair

Differentiate the reason that `directPrior()` is absent.

For a retained exact nearest match:

- prior `SETTLED + SUCCESS` → no `retryOf`, summary remains `READY` (unless some independent degraded condition exists);
- prior `SETTLED + FAILURE` but not eligible only because of a proven non-error relation condition that is complete should use a precise non-degraded result where appropriate;
- prior PENDING / UNKNOWN / CONFLICTED / missing / expired / history-truncated → no retry and `DEGRADED` when evidence is incomplete/conflicted as frozen;
- never skip the nearest record.

Do not weaken the five-minute, same-Session, settled-before-capture, conflict or exact-live gates.

### Mandatory tests

Add focused proof for:

1. old failure → nearest success → current: no retry and `status=READY`;
2. nearest pending → no retry and DEGRADED;
3. nearest conflicted/unknown → no retry and DEGRADED;
4. expired/missing nearest remains degraded/truncated as currently intended.

## 4. Preserve accepted Phase-3 behavior

Do not change unless strictly required by F1/F2:

- one existing Phase-1 ExecutionId owner;
- exact Session-object scoping;
- generation-local only relations;
- no durable guessed retry reconstruction;
- nearest-only retry semantics;
- overlapping calls not retries;
- five-minute absolute TTL;
- max 128/session, max 512 global, max 8 returned chain;
- sameRootCause structured-only logic;
- permission ladder `read-only < workspace-write < danger-full-access`;
- missing prior/current permission remains `unknown`;
- no reason/error/stdout/stderr heuristic;
- no operation fingerprint/hash in public DTO;
- no Phase-3 authority/projector functions at package root;
- Native Approval noninterference;
- F-006/F-013 remain PARTIAL;
- no Phase 4+ implementation;
- Harness Core unchanged.

## 5. Validation order

Use the established governance order:

1. implement F1/F2 only;
2. run P3 focused tests;
3. run directly affected inherited P2 / R4 as needed;
4. typecheck;
5. build;
6. Host export smoke;
7. Client export regression smoke;
8. declaration/root-export audit;
9. pack dry-run;
10. diff/scope/privacy/secret gates;
11. commit the executable repair;
12. run one fresh complete `pnpm test` on that exact executable SHA.

If the fresh full fails, preserve the failed attempt, repair only within frozen scope, create a new executable SHA and run a new final full.

After the passing full, no executable/test/config/package semantic drift. Only report documentation may follow.

## 6. Execution Report update

Update `Execution_Report.md` with a distinct final-repair section:

- repair start SHA;
- F1 root cause and exact pinned value constraints mirrored;
- F2 root cause and status correction;
- focused repair tests/count;
- static/export/declaration/pack/privacy gates;
- new executable Tested SHA;
- fresh full regression count/result;
- F-006/F-013 and inherited NOT_RUN/NOT_VALIDATED states unchanged;
- no Phase 4 work;
- Harness mutation 0;
- final remote verification.

The top-level current Tested SHA must be the new final repair SHA; older `c08c1d34...` remains historical only.

Allowed handoff:

`PHASE3_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE3_ACCEPTED`.
