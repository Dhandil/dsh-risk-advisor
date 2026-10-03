# Phase 10 Final Review Repair 3 Instructions — Real Plugin Lifecycle / HMR Closure

## Outcome

Independent review of:

- R2 Tested SHA: `01a26b2e14cf7c5ec4102dd4d70b6550f2b1d036`
- R2 final/report SHA: `12e68e740dedb481bf12b07bd083b2b818ccb6f7`

concludes:

`PHASE10_R3_REQUIRED`

R2 closed the AppReady cold-start, native-close A3/A4, real Evidence canary, hostile Deep authority, and benchmark-label/path blockers.

The remaining blocker is narrow:

**the frozen real plugin lifecycle / HMR proof is still missing, and the current dispose-before-answer coexistence test uses a no-op Risk Advisor disposer.**

Do not redesign Phase 10.

Do not change benchmark/cold-start/privacy logic unless a real lifecycle test exposes a defect.

Harness Core remains read-only.

No external provider/network/registry/Git-remote calls.

---

## 1. Fix dispose-before-answer to dispose the real Risk Advisor fiber

Current `tests/p10-coexistence.integration.spec.ts` mounts Risk Advisor in `setup()` by calling:

`apply(ctx, ...)`

and returns a synthetic:

`{ dispose: async () => undefined }`

Therefore the test named “RA is disposed before answer” does not actually dispose Risk Advisor.

Replace this with a real Cordis child plugin/fiber.

Use an equivalent wrapper:

```ts
const riskFiber = ctx.plugin({
  name: 'p10-risk-advisor-under-test',
  inject: ['tools'],
  apply(owner) {
    applyRiskAdvisor(owner, config)
  },
})
await riskFiber.await()
```

Use the real returned fiber for:

`await riskFiber.dispose()`

The native ApprovalService and separate fixture answerer remain outside that RA fiber.

Direct proof:

1. native approval request is pending;
2. Risk Advisor is actually mounted and has published its services;
3. dispose the actual RA fiber before native answer;
4. verify RA services/owned bridge registrations are removed or unavailable according to Cordis lifecycle;
5. resolve fixture native answer;
6. native result remains `allowed-once`;
7. answerer call count remains exactly 1;
8. no late RA assessment/publication appears after disposal.

Do not use a no-op/synthetic disposer.

---

## 2. Run timeout/failure coexistence through the actual Risk Advisor plugin fiber

R2's timeout/failure harness manually constructs `ApprovalAssessmentCoordinator` and supporting product components.

That proved the coordinator behavior, but Phase 10 HMR/coexistence closure requires the actual package `apply()` lifecycle.

Mount the actual Risk Advisor child fiber with:

- real `LlmRuntime`;
- deterministic local reviewer adapter;
- configured Fast Judge timeout/failure mode;
- real pinned ApprovalService;
- separate native answerer fixture.

For both:

- held reviewer -> real RA timeout;
- throwing reviewer -> real RA failure;

prove:

- RA reviewer request actually started;
- native answer completes independently;
- exactly one native answerer call;
- timeout/failure cannot change native outcome;
- late reviewer release cannot publish after native close;
- disposing RA fiber drains its owned work.

The existing lower-level coordinator tests remain useful regressions, but do not substitute for this plugin-level proof.

---

## 3. Add the frozen three-cycle Host HMR/reload proof

The Phase-10 Architecture Freeze requires at least:

`3 x mount -> dispose -> remount`

using real Cordis plugin lifecycle semantics.

Create a focused integration test using a persistent root Context that owns the surrounding Harness services while Risk Advisor is mounted as a child fiber each cycle.

Each of three cycles must:

1. mount actual Risk Advisor through `ctx.plugin(...)`;
2. await mount;
3. verify current RA Host services are available;
4. execute at least one bounded tool/native-approval traversal;
5. verify exactly one current-generation assessment/observation path;
6. verify exactly one native answer;
7. dispose the actual RA child fiber;
8. await disposal/quiescence;
9. verify the disposed generation cannot observe/publish later work.

### Browser bridge registration

Provide a deterministic local `connection.rpc.handle` fixture through the public connection capability.

Track active handlers for `RISK_ADVISOR_RPC_CHANNEL`.

For every cycle prove:

- after RA mount: exactly 1 active Risk Advisor handler;
- active handler count never exceeds 1;
- after RA dispose: 0 active Risk Advisor handlers;
- next remount creates exactly one fresh handler.

No stale handler from a previous cycle may answer a current request.

### Host event/listener generation

Retain references to old generation diagnostics before disposal.

After a later generation mounts and processes a new tool/approval:

- old correlation diagnostics must not gain the new execution;
- old assessment diagnostics must not gain the new approval;
- old reviewer adapter/generation must receive no new requests;
- old pending/held work must be drained/fenced.

This is the executable proof for no duplicate tools/session/optional-capability listener generation.

Do not add public debug APIs solely for listener counts.

---

## 4. Add the frozen three-cycle Client slot HMR proof

Phase-10 Freeze also requires no duplicate Browser slot contribution.

Reuse the real SlotRegistry / client plugin scaffolding already used by the existing R1/P6 integration tests.

On one persistent client Context:

For three cycles:

1. mount the actual Risk Advisor client plugin/fiber;
2. verify the Risk Advisor detail entry shadows native detail exactly once;
3. verify the slot contains exactly one RA contribution;
4. dispose the RA client fiber;
5. verify native detail is restored;
6. verify zero RA slot contributions remain.

Across all three cycles:

- slot entry count must not grow;
- no stale session binding may survive;
- Native approval buttons remain usable after every dispose.

Do not simulate this by directly adding/removing the RA component; use the real client plugin lifecycle.

---

## 5. HMR with held async work

At least one Host HMR cycle must dispose Risk Advisor while a deterministic local Fast Judge request is held/abort-ignoring or otherwise still owned.

Prove:

- disposal initiates cancellation/fencing;
- old generation cannot publish A2 after disposal;
- old work reaches quiescence before the fiber is considered fully disposed, according to the accepted scheduler semantics;
- remounted generation can process a fresh approval independently;
- old adapter receives no request from the new generation.

You may reuse accepted P5 scheduler fixtures, but the owning lifecycle must be the real RA plugin fiber.

No need to repeat Evidence/Deep generation stress already accepted in P8/P9/R2 unless the real plugin test exposes a regression.

---

## 6. Resource stress status

Do not invent a new mandatory soak test in this repair.

The accepted Phase-10 proof matrix plus inherited at/over-cap tests remain the resource-bound authority.

If the three-cycle HMR test exposes retained-state growth, repair it and add a bounded regression.

Otherwise no additional 500–1000 operation benchmark is required for R3.

---

## 7. Keep R2 accepted evidence frozen

Do not regress:

- full shell adversarial corpus;
- actual Evidence canary;
- hostile Fast/Deep authority proof;
- A3 native-close fencing;
- A4 native-close fencing;
- AppReady/public-app-exit cold-start;
- pinned Harness SHA verification;
- external bundle counts;
- corrected Fast+A2 / Evidence+A3 / Deep+A4 benchmark lanes;
- evidence-enriched composed A1→A4 path;
- terminal Browser complete/ready;
- AdvisoryLatencyPolicy R2 evidence;
- provider/network/registry/Git-remote = 0.

Unless product code changes due to a discovered HMR defect, do not alter benchmark/policy/cold-start semantics.

---

## 8. Focused proof naming

Add or expand focused P10 tests so the test titles explicitly distinguish:

- actual RA fiber dispose-before-answer;
- actual RA plugin timeout coexistence;
- actual RA plugin failure coexistence;
- three-cycle Host HMR;
- held-work Host HMR;
- three-cycle Client slot HMR.

Avoid titles whose body exercises only a synthetic no-op.

---

## 9. Validation order

Run:

1. repaired P10 coexistence focused
2. new P10 Host HMR focused
3. new P10 Client HMR/slot focused
4. P5 lifecycle regression
5. P6 UI/client lifecycle regression
6. P8 lifecycle regression
7. P9 lifecycle/coordinator regression
8. all remaining P10 focused
9. all inherited Phase-10 gates
10. typecheck/build/Host+Client exports/declarations/pack/diff/privacy/boundary
11. P10 benchmark smoke/full
12. AppReady cold-start A/B
13. Harness mutation / no-external-activity audit

Then:

1. commit exact executable/test candidate;
2. rerun P10 benchmark smoke/full and cold-start on that exact SHA;
3. run exactly one fresh complete `pnpm test` on that exact SHA.

If any gate fails after the candidate commit:

repair -> new SHA -> affected gates -> new fresh Full.

After passing Full, only:

`docs/tasks/Phase10-hardening/Execution_Report.md`

may change.

Every post-Full commit must be report-only.

---

## 10. Execution Report additions

The final report must state:

- actual RA fiber dispose-before-answer: PASS;
- actual RA plugin timeout coexistence: PASS;
- actual RA plugin failure coexistence: PASS;
- Host HMR cycles: `3/3 PASS`;
- Client slot HMR cycles: `3/3 PASS`;
- maximum simultaneous RA Browser RPC handlers observed: `1`;
- post-dispose RA RPC handlers: `0`;
- old-generation diagnostics did not observe new-generation work;
- held old reviewer work fenced/drained;
- native answer count remained exactly one per traversal.

Keep the previously accepted R2 evidence and exact statuses.

---

## 11. Final handoff

Return:

`PHASE10_R3_PUBLISHED_READY_FOR_REVIEW`

with:

- Tested SHA
- final remote/report SHA
- fresh Full count
- P10 focused count
- real dispose-before-answer PASS
- Host HMR 3/3 PASS
- Client HMR 3/3 PASS
- max RA RPC handler count = 1
- post-dispose RA RPC handlers = 0
- held-work HMR PASS
- benchmark/cold-start regression PASS
- provider/network/registry/Git-remote = 0
- Harness mutation = 0

Do not create `Acceptance_Report.md`.

Do not start another phase.
