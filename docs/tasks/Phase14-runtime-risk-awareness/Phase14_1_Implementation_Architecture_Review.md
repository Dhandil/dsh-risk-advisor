# Risk Advisor Phase 14.1 — Independent Implementation Architecture Review

## Disposition

**`RISK_ADVISOR_PHASE14_1_ARCHITECTURE_REVIEW_REPAIR_REQUIRED`**

The Phase 14.1 Repair1 candidate passes the reported full test suite, but independent source review finds **two ownership/lifetime defects** in the new Phase 14.1 runtime and its approval handoff. **Do not merge this candidate into `main` or declare final acceptance.** This is a bounded Product repair, not permission to revise the accepted architecture.

## Reviewed provenance and evidence

- Accepted architecture/base `main` before review: `55c1247b0cd7c2fee9edff6cedb706cd0d0c6303`.
- Reviewed executable SHA: `2cf79c7283a5ea9c9c567446a259bb84e7a4f32e`.
- Codex published branch/report SHA: `b824b9fb3946afb295eb981ff5ef889e9df363a7`.
- `2cf79c7..b824b9f`: exactly one docs-only Repair1 Execution Report; no executable drift after the tested candidate.
- Previous failing candidate `0697fa2f117c4dca3f7a0f8320f01ab78972838a` and its original failed Full report remain historical evidence.
- Repair1 reports one fresh complete `pnpm test`: **68 files / 473 tests PASS**; focused 19, relevant regressions 253, typecheck/build/package/static PASS. These are reviewed **remote report assertions**, not a rerun by the architecture reviewer.
- `main` was checked at `55c1247b0cd7c2fee9edff6cedb706cd0d0c6303`; the implementation is still unmerged.
- Source independently read: `src/host/runtime-risk-awareness.ts`, `src/host/assessment-envelope.ts`, `src/index.ts`, `src/host/browser-bridge.ts`, `src/client/RuntimeRiskAwarenessDock.tsx`, `src/client/runtime-risk-store.ts`, new Phase 14.1 tests, and the accepted Phase14.1 Freeze/Instructions.

## Blocker B1 — In-flight same-Session records evicted by next capture

**Location:** `src/host/runtime-risk-awareness.ts`, `capturePreExecute()`.

Current behavior:

```ts
const previous = this.latestBySession.get(session)
if (previous !== undefined && !previous.approvalOwned) this.remove(previous)
```

`remove()` cancels a queued scorer, deletes its per-execution registry entry, removes its Assessment ID and clears its context. This is unconditional with respect to `CAPTURED` / `SCORING` and whether the prior Tool is settled. The accepted Freeze says **never evict a pending scorer or approval-owned record** to make room, and requires one stable pre-execution base per exact (Session identity, ExecutionId).

**Minimal deterministic counterexample:**
1. Same Session starts Tool A; capture creates record A, state `CAPTURED`, queued scorer.
2. Before Tool A settles or receives `approval/asked`, the Session starts Tool B; capture unconditionally removes A.
3. A's queued callback is cancelled, `claimForApproval(session, A)` now returns `ABSENT`. An observed approval may take the legacy fallback path with a different base/ID, although A **was** captured.

The UI's one-latest-row policy does not authorize destroying in-flight per-execution records. The existing test named “same-call concurrent executions” checks only the **earlier approval-owned** case, not the earlier unowned pending case.

**Required repair:** decouple the latest **display** selection from retention of all active per-execution records. On next same-Session capture, hide/supersede the old ordinary dock row but preserve the older in-flight base and its single-flight association until valid settlement/TTL/disposal or a permitted eviction state. Under pressure, fail the new advisory conservatively rather than evict a pending scorer. Add focused tests for A/B same Session, both distinct `ExecutionId` (with same and different callIds), A approval **after** B capture, no scorer duplication and no stale row resurrection. Keep all record/queue/TTL limits.

## Blocker B2 — Native Approval ownership is claimed before coordinator capacity admission

**Location:** `src/host/assessment-envelope.ts`, `observeAsked()`.

Current behavior:

```ts
if (bound && executionId !== undefined) runtimeBase = this.runtimeRisk?.claimForApproval(session, executionId)
if (this.records.size >= this.maxRecords) {
  const oldestClosed = [...this.records].find(record => record.shell.closed)
  if (oldestClosed === undefined) return 'CAPACITY_EXCEEDED'
  this.remove(oldestClosed)
}
```

`claimForApproval()` immediately flips `record.approvalOwned = true`, hides the ordinary dock item, protects the base from ordinary retirement, and cancels/finishes scoring. If coordinator capacity admission fails, no corresponding ApprovalAssessmentCoordinator record is created and the normal `approval/decided → releaseApproval()` path cannot find a record to release. The base therefore remains **phantom approval-owned** until expiration/teardown, violating exact ownership and bounded cleanup semantics.

**Required repair:** make coordinator capacity admission/preflight precede any ownership mutation, or use a deterministic, exception-safe transaction/rollback that does not damage the base on failure. If the approval is not recorded, its base must **not** become permanently approval-owned. Preserve existing P1B unavailable-but-BOUND diagnostic `assessmentId` behavior and Repair1 fix. Add a focused `maxRecords` capacity regression proving no phantom transfer and no duplicate scorer/approval-side computation.

## Acceptance constraints for repair

- **Only B1 and B2.** Do not change Harness, Tool/approval decisions, F1/F2, Online Correction, Phase 11 Experience lineage, accepted Phase 13.2 truth, existing UI/RPC contracts or optional approval-side Judge/Evidence behavior.
- Preserve transparent `next()`, snapshot-before-result only, reactive native pending-approval UI suppression, the separate read-only runtime-risk route, bounded 256 records / 64 queue / TTL/privacy/session isolation.
- Run the new focused counterexample tests and existing Phase 14.1 + P1B/P1C and relevant lifecycle/approval regressions, typecheck, build, static/contract/privacy checks. Follow the existing **one fresh Full per final repaired executable candidate** gate. A prior successful Full does not authorize accepting modified executable bytes without a new candidate test.
- Keep previously published `Phase14_1_Execution_Report.md` and `Phase14_1_Repair1_Execution_Report.md` unmodified. Name the new repair `Repair2`, and publish a new Execution Report with the new tested SHA, test counts, diff and remote SHA.
- Preserve any normal checkout untracked `lib/`, `node_modules/`, `.vitest-cache/`. The retained detached test worktree is **not a Product defect**, and should not be forcibly deleted. Clean it only via a separately safe bounded, authorized procedure, or retain/report it without expanding this repair.

## Reviewer actions and limits

- Source and remote Git history independently inspected. **No new tests executed**, no local Mac checkout access, no Harness runtime or provider/network campaign run, no Product executable modifications, no implementation branch force-push.
- Review outcome is `REPAIR_REQUIRED`, **not** a regression test failure claim. The two counterexamples are source-level defect candidates requiring Codex focused regression proof and minimal repair.
- Phase 13.3 remains blocked/partial; Phase 13.4 not authorized.
- This docs-only report may advance `main` as an independent review artifact, but it does not advance the accepted executable baseline.

**Next gate:** Codex returns `RISK_ADVISOR_PHASE14_1_REPAIR2_IMPLEMENTATION_READY_FOR_ARCHITECTURE_REVIEW` with tests and exact remote SHA; ChatGPT independently reviews again.
