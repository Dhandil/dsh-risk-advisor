# Risk Advisor Phase 11.4 — Implementation Instructions

## Authorized outcome

Implement exactly the frozen contract in:

`docs/tasks/Phase11-verified-experience-historical-guidance/Phase11_4_Verified_Historical_Guidance_Freeze.md`

Architecture Preflight baseline: `54a6129fe8d437fa26a4f7d6844cafbe69f9ea6e`

Pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`

These instructions are prospective. This documentation-only Architecture Preflight does not authorize implementation. A separate explicit request must start Phase 11.4 implementation.

## 1. Preflight before implementation

1. Fetch `origin/main`; verify it contains the Phase 11.4 Preflight, Freeze, and Instructions.
2. Verify the change from the stated baseline is docs-only with executable/test/package/config/benchmark drift `0`.
3. Verify the exact pinned Harness SHA.
4. Require a clean tracked baseline. Preserve all user/untracked files, including `.vitest-cache/`, `lib/`, and `node_modules/`; never reset, clean, stash, or delete them.
5. Start from then-current `origin/main` on an independent implementation branch. Do not rewrite accepted history.
6. Confirm the Phase 11.1 E1–E14, Phase 11.2 O1–O15, and Phase 11.3 P1–P17 suites remain present and preserve their contracts.

## 2. Implement only Verified Historical Guidance

Add one Host-owned `risk_advisor_guidance` v1 per-record `revisions` domain and a deterministic Guidance runtime exactly as frozen. Use only validated complete Pattern chains. Do not open another Pattern, Outcome, or Experience domain handle.

Add a private internal Pattern-to-Guidance snapshot/subscription seam only as necessary. It must expose complete validated Pattern history only while Pattern is `READY`, subscribe before snapshot, and emit only after a Pattern revision has durably committed and its in-memory projection advanced. Do not expose the seam through the package root, Browser, tools, or model/Agent context.

Map every Pattern revision to exactly one same-ordinal append-only Guidance revision. Enforce insert-only behavior above `KvTable.put()`; identical content is idempotent and divergent same-key content fails closed. Reconcile missing Guidance rows only by replaying validated Pattern history and appending the frozen mapping.

Perform explicit capacity checks before schema parsing and before append. Keep the Guidance Zod schema shape-safe without `.max()` bounds that would cause pinned `DomainFacility.open()` to reject an over-limit application count before the runtime can report `CAPACITY_EXCEEDED`. Keep fixed wording and strength semantics exactly as frozen.

Do not read Episode or Outcome for Guidance extraction. Do not generate active Guidance from a non-`QUALIFIED` Pattern. Do not add LLMs, embeddings, Browser/UI, Risk Assessment, Native Approval, Agent context, Online Correction, retries, command/permission changes, or execution authority.

## 3. Preserve existing boundaries

Do not change:

- Episode or Outcome schemas, bytes, keys, authority, capacity, or lifecycle;
- Pattern eligibility, identity, trusted-evidence predicate, state transitions, provenance, storage, or lifecycle semantics;
- Risk Assessment or assessment aggregation;
- Browser bridge/routes/UI;
- Native Approval;
- Tool, Host execution, permission, or retry behavior;
- Harness Core or pinned Harness SHA;
- Fast/Deep Judge or Online Correction behavior.

No new external dependency should be required. Do not modify `pnpm-lock.yaml` absent a separately reviewed implementation necessity.

## 4. Required tests

Implement all G1–G20 proofs in the Phase 11.4 Freeze. In addition, preserve and run the Phase 11.1 E1–E14, Phase 11.2 O1–O15, and Phase 11.3 P1–P17 suites. Fixtures must use isolated temporary Storage roots, never the user's real storage profile.

The focused suite must include the startup handoff race, delayed Guidance durability followed by restart/reconciliation, exact Pattern-to-Guidance ordinal mapping, suspension/terminal invalidation withdrawal, suspended reactivation, idempotent duplicate notifications, divergent-key non-overwrite, capacity classification before parse, stale-view suppression, and persisted privacy sentinels.

## 5. Verification gate order

Run in this order:

1. Focused Phase 11.4 G1–G20 tests.
2. Phase 11.1 E1–E14 regression.
3. Phase 11.2 O1–O15 regression.
4. Phase 11.3 P1–P17 regression.
5. Affected existing V1 P1/P2/P3/P4/P6/P7/P10 and package/boundary regressions.
6. Source and focused-test typecheck.
7. Production build and declaration generation.
8. Package, declaration, export, dependency, and static boundary gates.
9. Isolated durable restart/reconciliation and persisted privacy proof.
10. Only after every prior gate passes, run exactly one fresh complete `pnpm test` on the exact final executable candidate.

If Full fails, stop and report the exact failure; do not modify code or silently rerun. After Full passes, executable/test/package/config/benchmark semantic drift is forbidden. Any authorized post-Full addition must be report-only.

## 6. Publication and reporting boundary

The separate implementation request must establish whether executable candidate/report publication is authorized. If authorized, push the exact tested candidate fast-forward only and verify `HEAD == origin/main == git ls-remote`. Do not force-push.

Do not create `Acceptance_Report.md`, declare Phase 11.4 accepted, or begin Phase 11.5. Final acceptance remains the user's review authority.

## 7. Future execution report

The report should identify the exact tested candidate, Pattern-only source authority, identity and revision mapping, fixed wording/strength semantics, provenance, withdrawal/reactivation, capacity, privacy, startup/recovery/lifecycle results, all E/O/P regressions, static/package results, one Full result, and remote identity if publication is authorized. State the post-Full drift count. Do not claim acceptance.
