# Risk Advisor — Product Phase 1B: Approval-bound Assessment Envelope & Coordinator

**Status:** FROZEN FOR IMPLEMENTATION. ChatGPT Web independently decides `ACCEPTED / REPAIR / STOP` after inspecting pushed source and evidence.  
**Task directory:** `docs/tasks/Phase1B-assessment-envelope/`  
**Plugin starting checkpoint:** `Dhandil/dsh-risk-advisor`, `main @ 0954d92e6ae0018e9c2c58401e4b6635402cfe94` (Phase 1A bounded accepted).  
**Harness:** local `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, STRICTLY READ-ONLY; observed upstream `4878cdabd87d4041bdaff61d04c966883b9fd07a` remains NOT_VALIDATED.  
**Identity:** Risk Advisor never authorizes, answers, denies or changes Native Approval; this is not Phase 1C or V1 release.

## 1. Verified source baseline and precise deliverable

The pinned `ApprovalService.request()` appends a service-issued `approval/asked` (`id`, `toolName`, optional `callId`, optional sensitive `reason`) inside an open Session turn, enters its own `approval/request` decision path, then appends the matching `approval/decided` (`id`, `outcome`). The Session `session/event` feed is post-commit and contained, not an approval answerer. The exact Session object is provided to its observer. Never treat a manually appended fixture as production ApprovalService proof.

Current plugin `apply(ctx)` mounts ONE private T02 `ActiveExecutionIndex` through `installCorrelationInternal`; its exact `ToolExecution` mints the sole `ExecutionId`, Phase 1A captures a bounded snapshot using that same ID, and T04 installs a separate bounded Ledger observer. The public `riskAdvisorCorrelation.lookup(session,callId)` returns `FOUND | NOT_FOUND | AMBIGUOUS`. The read-only `riskAdvisorFoundation.get(executionId)` returns `CAPTURED | DEGRADED | ...` without raw args, operationHash, targets or cwd. T02's approval observations are audit/diagnostics, not a new assessment store. Preserve all existing public APIs and behavior.

**Implement exactly:** a plugin-private, in-process `ApprovalAssessmentCoordinator` and bounded `AssessmentStore` for approval-bound lifecycle *shells*, observing committed `approval/asked` and `approval/decided`; expose a sanitized read-only Host diagnostic, with exact Session-object ownership for lookup. No assessment algorithm, model, context builder, score, recommendation, UI, Browser RPC, native answerer, filesystem access, durable write or Provider call.

## 2. Freeze the identity and wiring decision

- Reuse the SAME `ActiveExecutionIndex` installed by `apply(ctx)`; wire a PRIVATE same-generation `session/event` hook in `installCorrelationInternal` or a compositionally equivalent private adapter. Call `index.observeSessionEvent(session,event)` as before; for `approval/asked`, resolve `index.lookup(session, safeCallId)` **at event observation time** using that exact Session object, and read Phase 1A Foundation's sanitized diagnostic by the returned `ExecutionId`. No second index, duplicate `approval/asked` subscription that races index ownership, historical callId fallback, sessionId-string-only join, Ledger ordinal or recovered PTC occurrence masquerading as live identity.
- The authoritative approval identity is **(exact Session object, service-issued approval id)**, not approval id alone. Use `WeakMap<Session, Map<approvalId, ...>>` or equivalent exact owner; expose a Host read-only `getForApproval(session,approvalId)` only, plus optionally `getByAssessmentId(id)` for genuine bound shells. If a bounded global list/index is used, its entries must not strongly retain Session, ToolExecution, tokens, Agent or raw arguments. The Session id text is display metadata, not a join key.
- `FOUND` with a present Phase 1A diagnostic can bind an existing live execution. If that diagnostic is `DEGRADED`, binding is still structurally exact but evidence is degraded. If its snapshot is missing/expired/capacity-exceeded, retain the exact ID *as an observed association* but show `unavailable` and a reason; never recreate a snapshot or synthesize operationHash. `NOT_FOUND`, missing callId and `AMBIGUOUS` are `UNBOUND/AMBIGUOUS` and produce **no executionId** in the corresponding approval advisory. Never choose a candidate from an ambiguous set.
- A fresh opaque `assessmentId` is minted at most once **only after a unique `FOUND` correlation** for a given exact `(Session,approvalId)` (even if the associated Foundation diagnostic is incomplete). A new approval id gets a new shell, even when the same live execution asks twice. Duplicate replay/notification of the same actual event must be idempotent; contradictory same approval id metadata fails closed and must not rebind/mint another shell.

## 3. Phase 1B shell is NOT a completed RiskAssessment

Canonical Architecture §7.13 `AssessmentEnvelope` requires `operationHash`, `RuleFinding[]` and later real RiskAssessment; the Risk Engine Contract separately defines immutable, dimension-filled RiskAssessment revisions. Phase 1A intentionally has no public operationHash and the assessment engine does not exist. **Do not fabricate these fields or call the Phase 1B shell a completed canonical Assessment.** Implement an explicit typed `ApprovalAssessmentShell` / `AssessmentEnvelopeShell`, convertible to the canonical Envelope only in a separately approved future implementation with the required genuine evidence.

Minimal internal record (field names may vary while preserving semantics):

```ts
ApprovalAssessmentShell {
  schemaVersion: 1
  assessmentId?: string          // absent on NOT_FOUND/AMBIGUOUS
  sessionId: string             // display only
  approvalId: string
  executionId?: string         // ONLY exact FOUND
  association: 'BOUND' | 'UNBOUND' | 'AMBIGUOUS'
  status: 'pending' | 'unavailable' | 'cancelled'
  stage: 'not-started'
  reasonCodes: readonly SafeReasonCode[]
  startedAt: number
  updatedAt: number
  closed: boolean
  // optional observed native outcome, never RA's decision
}
```

The coordinator may atomically create a `pending` shell internally to establish the lifecycle, but **must immediately leave it `unavailable` with `ASSESSOR_NOT_IMPLEMENTED` on this product build**; there is no actual pipeline that could make it ready. Unbound/ambiguous approvals are unavailable with their own explicit reason. `ready`, RiskAssessment, finding, severity, recommendation, actual Assessment timing and `presentedAssessmentId` must not be exported or invented. The shell describes correlation and availability, not a risk judgment. `stage: 'not-started'` is deliberately a Phase-1B-only shell sentinel, not a false assertion that the canonical rules stage ran.

Future A1/A2/supersession, immutable completed RiskAssessment and `presentedAssessmentId` need their real engine and verified Browser render/decision witness; expressly NOT implemented now. Do not infer that anything was displayed to the user just because a Host shell exists.

## 4. Lifecycle, failure containment, bounded storage

- Consume only actual `session/event` post-commit events; do not synthesize `approval/asked`, call `session.append`, subscribe to/return from `approval/request`, or make Native Approval await advisor work. Phase 1B coordination is synchronous, bounded, observational. Handle post-commit observer exceptions locally with safe `unavailable`, without logging sensitive source data. A malformed event may be ignored/degraded but never affect the native committed event.
- Exactly one record per exact `(Session,approvalId)` in the mounted generation; validate nonempty bounded identifiers and event type before allocating. Do not copy `approval/asked.reason`, raw tool args, target path, cwd, tool result, Session history, secret content or `ToolExecution` into records/public diagnostics. Duplicate identical asked is a no-op. Same id with contradictory tool/call data flags `CORRELATION_CONFLICT`, never last-writer-wins and never reassociates.
- On matching `approval/decided`, mark that shell `closed` and immutable against *any* later assessment update, async callback, same-id replay or generation change. If a pending experimental/injected job exists in isolated tests, cancel/retire it; no late `ready`, no UI resurrection. Preserve Native outcome as **observed** only, not advisor-issued. Orphan/contradictory decision is a bounded issue (no fabricated matching asked or authority). On `session/disposed`, end this exact session's advisory ownership; on plugin effect dispose/HMR, deactivate/clear generation and prevent all late callbacks from reviving it.
- Accepted implementation bounds: `maxRecords = 256`, `completedTTL = 10 minutes` from Architecture §30 (injectable monotonic clock; neither a measured Assessment timeout nor one of T05's six undetermined policy fields). Active record retention is the matching approval lifetime; no speculative native cancellation on advisory TTL. At capacity, evict oldest **closed** records first; if all tracked records are active, fail the newly arrived advisory as unavailable/capacity (or omit it with explicit bounded diagnostic), NEVER block/deny Native Approval or evict a live approval association. No unbounded tombstone/issue/event/raw-record cache; dispose/session disposal release ownership. TTL read does not refresh retention. If a leaked native approval with no decision cannot be safely distinguished from live, keep it active until session disposal/generation disposal and fail capacity conservatively.
- Expose only detached deeply frozen diagnostics (e.g. `riskAdvisorAssessments.getForApproval(session,id)`), including safe association/status/stage, optional exact execution/assessment IDs, reason codes, closed and observed outcome. Do not expose `Session`, `ToolExecution`, actual private Foundation snapshot, raw args, operationHash, source event reason, setter, coordinator instance, arbitrary exception text or user content. No Browser route yet.

## 5. Tests: formal Phase-1B proof

Number the new cases `P1B-01` onward (test files/count flexible); prove at minimum:

1. P1B-01: real pinned `Context + SessionStore + ToolRuntime + ApprovalService`, a harmless local tool, one actual `approval/asked` from service, same exact Session + active call ID → one new opaque assessment shell and original exact `ExecutionId`; native answerer is invoked once and its result unchanged.
2. P1B-02: missing callId / no live execution / wrong exact Session with equal sessionId string → unavailable/UNBOUND, no historical or cross-session fallback and no invented assessmentId.
3. P1B-03: two same-callId active executions produce AMBIGUOUS → no chosen execution; nested unique child approval uses T02 exact active witness (only where actually proven).
4. P1B-04: duplicate `approval/asked` same id same data idempotent; conflicting toolName/callId fail-closed; distinct service approval ids sharing an execution remain separate; two fast approvals never cross-bind.
5. P1B-05: present CAPTURED vs DEGRADED vs EXPIRED/NOT_FOUND Foundation diagnostics; real-bound identity is separate from snapshot completeness. No operationHash synthesized and no `ready` without assessor.
6. P1B-06: real committed `approval/decided` transitions to closed and preserves native `allowed-once | rejected | cancelled | unavailable` vocabulary as observation only, never as advisor return.
7. P1B-07: late completion/injected future update after closure or disposal cannot set ready, supersede, remint or revive an approval; stale/contradictory/orphan decisions do not rewrite the original association/outcome.
8. P1B-08: independent exact-session ownership and `session/disposed` cleanup; Session string collision not identity; generation disposal/HMR and no late callbacks.
9. P1B-09: cap=256, completed-first eviction, all-active fail-open capacity, injected-clock completed TTL; no unbounded retention or misleading active eviction.
10. P1B-10: privacy/freeze proofs under sensitive reason/args, external diagnostic mutation attempts and thrown observer/injected-clock faults; original args, Session log and Native Approval remain untouched.
11. P1B-11: observer order, `policy: never`, native slow/faulting answerer, RA unavailable, and coexistence with a second independent answerer where feasible. Prove no RA `approval/request` interception and no added result.
12. P1B-12: inherited T01 9 + T02 16 + T03 17 + T04 21 + T05 pure 3 + Phase1A 13 = **79 existing tests**, plus all Phase1B. Typecheck, build, Host export, pack, privacy/secret, source/scope and native noninterference gates before ONE final complete `pnpm test`.

Tests that manually `session.append('approval/asked',...)` are **component fault injectors**, not genuine native producer evidence. A real integration test MUST use actual pinned ApprovalService.request path; Browser/deployed UI, native PTC producer, new Harness V4, disk/process restart, provider/model calls remain NOT_RUN/NOT_VALIDATED. No R5 full benchmark unless Phase1B actually adds an assessment latency/product-policy path; do not claim real TTF/TTFinal or freeze any of six still-UNDETERMINED budgets.

## 6. Scope, inherited OPEN gates and STOP

Allowed: new Host assessment-shell/coordinator/store, minimal private `src/index.ts`/correlation wiring necessary for same-generation index reuse, tests, narrow package test script and Phase1B docs/report. Phase1A private memory/privacy invariants must survive. Not allowed: Harness or upstream changes; T02/03/04 historical reidentity; modification of frozen baselines/T01 fixture; real Rule Engine/ContextBuilder/LLM/Judge/Provider/Recommendation/Browser DTO/Bridge; modifying native ApprovalService, answerer, policy, `ApprovalOutcome`; persistent audit/database; auto-approval; new dependencies absent separate authorization.

Carry forward: T01 Live Browser NOT_RUN, genuine PTC Producer NOT_RUN, T04 positive exact F-006/F-007/F-013 PARTIAL/OPEN, true disk restart NOT_RUN, new Harness V4 NOT_VALIDATED, T05 `T_sync` direct PARTIAL and six policy fields UNDETERMINED. A completed Phase1B shell is NOT a user-visible assessment and does not satisfy Test Matrix J-001/J-004 deployed Browser proofs.

STOP / request architecture decision if actual pinned `approval/asked` is not post-commit and Session-exact, index cannot be shared without a second mint, Phase1B requires accessing raw snapshot/undocumented private Harness service, engine fields would have to be fabricated to satisfy canonical Envelope, a valid Native Approval is blocked/double-answered, raw data escape/bounds cannot be enforced, material scope diverges, or remote/protected work cannot be preserved.

**Deliverable outcome** after verified remote publication: `PHASE1B_PUBLISHED_READY_FOR_REVIEW` or `PHASE1B_ARCHITECTURE_DECISION_REQUIRED / BLOCKED / PARTIAL` with reasons. Codex writes only `Execution_Report.md` for this task and never self-awards `ACCEPTED` or implements Phase1C.
