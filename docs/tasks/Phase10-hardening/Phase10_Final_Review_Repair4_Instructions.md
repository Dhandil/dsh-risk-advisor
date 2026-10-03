# Phase 10 Final Review Repair 4 Instructions — Held-Work HMR Proof Fidelity

## Outcome

Independent review of:

- R3 Tested SHA: `a911b325b7282576ce7b4bba4014ed0205289cb3`
- R3 final/report SHA: `1f7b99d83abcf908804b46b43f0af55d279801cd`

concludes:

`PHASE10_R4_REQUIRED`

All ordinary Host HMR 3/3, Client slot HMR 3/3, real Risk Advisor dispose-before-answer, real Risk Advisor timeout/failure coexistence, R2 native-close, cold-start, privacy, and benchmark gates are accepted.

One proof-fidelity blocker remains:

The current held-work Host HMR test adds a test-owned cleanup effect that:

1. calls `held.release()`; and
2. waits on a separate `ownedWork` promise.

That artificial cleanup promise can make `fiber.dispose()` appear blocked even if Risk Advisor's own Judge scheduler did not retain ownership until the held reviewer settled.

The frozen requirement is specifically to prove **Risk Advisor's own plugin lifecycle** waits for its owned Fast Judge work to quiesce.

Do not redesign Phase 10.

Do not modify product code unless this direct proof exposes a defect.

---

## 1. Remove the artificial disposal blocker

In:

`tests/p10-host-hmr.integration.spec.ts`

replace the current held-work HMR proof.

Remove the test-only RA-fiber effect equivalent to:

```ts
owner.effect(() => async () => {
  held.release()
  await ownedWork
})
```

and remove the unrelated `ownedWork` / `releaseOwnedWork` gate.

The only reason the Risk Advisor child fiber may remain undisposed must be the actual Risk Advisor-owned asynchronous Judge work.

---

## 2. Use an abort-ignoring held reviewer

Create a deterministic local Fast Judge adapter whose stream:

- records that the request started;
- ignores the supplied AbortSignal;
- waits on a test-controlled release promise;
- after release emits a syntactically valid bounded candidate and finish event.

Do not release it from an RA test-owned cleanup effect.

The adapter itself is the only held underlying work.

---

## 3. Direct real-fiber quiescence proof

Mount actual Risk Advisor through a Cordis child fiber using the held adapter.

Create one real bounded tool/native-approval traversal and wait until:

`adapter.requests === 1`

Capture before disposal:

- old `riskAdvisorAssessments` diagnostics object;
- old `riskAdvisorCorrelation` diagnostics object;
- the current approval id;
- the latest pre-dispose assessment id;
- old adapter request count.

Then call:

`const disposing = riskFiber.dispose()`

without releasing the adapter.

After at least one microtask/macrotask turn, assert:

- disposal promise is still unresolved;
- adapter remains held;
- Browser RPC handler for old RA generation has not been replaced by a new generation;
- no A2 has appeared from the held candidate.

This unresolved state must result from Risk Advisor's own `ApprovalAssessmentCoordinator.dispose() -> JudgeScheduler.dispose() -> active promise` ownership.

No additional test-owned effect may block the fiber.

---

## 4. Release and prove quiescent disposal

Release the held adapter.

Await:

`riskFiber.dispose()`

Then assert:

- disposal resolves;
- old Browser RPC handler count = 0;
- old RA services are unavailable from the root;
- old assessment diagnostics cannot publish a new A2 after disposal;
- old latest assessment id remains the pre-dispose id or becomes unavailable according to the accepted disposal contract;
- no unhandled rejection;
- old adapter request count stops changing.

Because the candidate becomes available only during disposal, it must never become a post-dispose advisory publication.

---

## 5. Remount generation fence

Mount a fresh actual Risk Advisor child fiber with a fresh deterministic adapter.

Run a new bounded approval traversal.

Prove:

- exactly one fresh Browser RPC handler;
- new adapter receives the new request;
- old adapter receives no new request;
- old diagnostics do not observe the new execution/approval;
- native answer count remains exactly one;
- fresh generation can publish its own normal assessment independently.

Dispose the fresh fiber and assert RPC handler count returns to 0.

---

## 6. Keep all other R3 evidence frozen

Do not alter, except for necessary test maintenance:

- ordinary Host HMR 3/3;
- Client HMR 3/3;
- real dispose-before-answer;
- real timeout/failure coexistence;
- R2 A3/A4 native-close;
- actual Evidence canary;
- hostile Deep/A4 authority;
- AppReady/public-exit cold-start;
- corrected Phase-10 benchmark;
- AdvisoryLatencyPolicy.

No new benchmark or policy numbers are required if product/benchmark code is unchanged.

---

## 7. Validation

Run:

1. repaired held-work Host HMR focused test;
2. full P10 focused;
3. P5 lifecycle;
4. P6 lifecycle/client regressions;
5. P8 lifecycle;
6. P9 lifecycle/coordinator;
7. all remaining Phase-10 inherited gates;
8. typecheck/build/exports/declarations/pack/diff/privacy/boundary;
9. benchmark smoke/full;
10. AppReady cold-start A/B;
11. no-external-activity / Harness-mutation audit.

Then commit the exact final executable/test candidate.

On that exact SHA rerun:

- P10 benchmark smoke/full;
- cold-start A/B;
- repaired held-work HMR gate.

Then run exactly one fresh complete:

`pnpm test`

If any gate fails after commit:

repair -> new Tested SHA -> affected gates -> new fresh Full.

After passing Full, only:

`docs/tasks/Phase10-hardening/Execution_Report.md`

may change.

---

## 8. Final report wording

The final Execution Report may claim:

`held-work Host HMR PASS`

only if it explicitly records:

- no artificial plugin cleanup gate;
- reviewer ignored AbortSignal;
- real RA fiber dispose remained pending while reviewer remained unresolved;
- reviewer release allowed RA-owned scheduler quiescence;
- held candidate did not publish A2 after disposal;
- remounted generation did not reuse old adapter/diagnostics.

---

## 9. Final handoff

Return:

`PHASE10_R4_PUBLISHED_READY_FOR_REVIEW`

with:

- Tested SHA;
- final report SHA;
- fresh Full count;
- P10 focused count;
- held reviewer abort-ignoring proof PASS;
- dispose pending-before-release PASS;
- no late A2 PASS;
- remount generation isolation PASS;
- Host HMR 3/3 PASS;
- Client HMR 3/3 PASS;
- benchmark/cold-start regression PASS;
- provider/network/registry/Git-remote = 0;
- Harness mutation = 0.

Do not create Acceptance Report.

Do not start another phase.
