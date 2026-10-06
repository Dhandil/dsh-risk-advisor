# Risk Advisor Phase 11.2 — Implementation Instructions

## Authorized outcome

Implement exactly the frozen contract in:

`docs/tasks/Phase11-verified-experience-historical-guidance/Phase11_2_Outcome_Qualification_Freeze.md`

Architecture Preflight baseline: `26504a73577a9fe994f56cacce4b2d7ac4bb9ef8`

Accepted Phase 11.1 tested candidate: `f7be0ed60a2cece0765f003b704113acd43cf4ee`

Pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`

These instructions describe a later, separately requested implementation. They do not authorize starting implementation as part of the documentation-only Architecture Preflight task.

## 1. Preflight

Before editing:

1. Fetch `origin/main` and verify it contains the Architecture Preflight and Freeze.
2. Verify the exact pinned Harness SHA.
3. Preserve all user/untracked files; do not reset, clean, stash, or delete local artifacts.
4. Require a clean tracked baseline or stop and report tracked drift. Do not infer permission to absorb unrelated changes.
5. Create an implementation branch from the then-current `origin/main` without rewriting history.

## 2. Implement only Phase 11.2

Add the Host-only `OutcomeRevisionV1` runtime and schema backed by `ctx.storageDomain` using the exact domain, table, key, revision schema, qualification precedence, append rules, caps, privacy boundary, diagnostics, recovery, and lifecycle contract in the Freeze.

Keep `ExperienceEpisodeV1` bytes/semantics, domain name/version/layout/table, and commit trigger unchanged. Connect Outcome persistence only after the Episode durable write has resolved. Do not await either write from the Harness Tool result path.

Route sanitized `PostconditionVerifier.onRecord` observations to the Outcome runtime after the existing failure-chain observer. Buffer a bounded synchronous verifier handoff until Episode durability is acknowledged. Route later verifier callbacks into append-only revisions. Keep verifier execution asynchronous and never wait for it to qualify or commit an Episode.

The current qualification must be derived from a complete validated chain; do not add a mutable head row or any API that updates/deletes a revision. Validate chains and reconcile Episodes without revisions on open as specified in the Freeze.

## 3. Preserve runtime boundaries

Do not change:

- Risk Engine or assessment aggregation;
- Browser bridge, Browser routes, or Browser UI;
- Host execution/runtime authority;
- Native Approval;
- Harness Core;
- Fast Judge or Deep Judge behavior;
- Experience Episode schema, storage, privacy, capacity, or lifecycle semantics.

Do not implement Pattern, Guidance, Historical Risk Evidence, Online Correction, automatic retries, command rewriting, permission changes, or model-facing Experience/Outcome tools.

## 4. Required tests

Implement the full O1–O15 matrix in the Freeze. Include isolated durable restart and privacy serialization proof using a temporary storage root only. Cover direct synchronous and shell asynchronous verifier ordering, late revision lineage, conflict handling, partial Episode/Outcome commit recovery, malformed/forked history, caps, and drain/close ordering.

Existing Phase 11.1 E1–E14 and V1 behavior must remain passing. Never use the user's real `$DSH_HOME/storages` for fixtures or destructive setup.

## 5. Gate order

Run gates in this order:

1. Focused Phase 11.2 O1–O15 tests.
2. Phase 11.1 E1–E14 regression.
3. Affected V1 regressions, including the existing P2/P3/P4/P7/P10 suites as applicable.
4. Source and focused-test typecheck.
5. Production build.
6. Package, declaration, export, dependency, and static gates.
7. Isolated durable restart/reconciliation proof.
8. Persisted Outcome and Episode privacy inspection.
9. Only after all prior gates pass, run exactly one fresh complete `pnpm test` on the exact final executable candidate.

If the full suite fails, stop and report its exact result. Do not fix and silently rerun. After a passing full suite, executable/test/package/config/benchmark semantic drift is forbidden; only a Phase 11.2 Execution Report may be added.

## 6. Publication boundary for the future implementation task

The future implementation request must separately define whether to push the exact tested candidate and report. If authorized to publish, fast-forward only, verify `HEAD == origin/main == git ls-remote`, and make the post-Full commit report-only. Do not create `Acceptance_Report.md`, declare Phase 11.2 accepted, or start Phase 11.3.

## 7. Final implementation report

Report the tested candidate, focused/regression/static/persistence/privacy evidence, one Full result, remote identity if publication was authorized, and confirmation that only report documentation changed after Full. Do not claim this documentation-only preflight implemented Phase 11.2.
