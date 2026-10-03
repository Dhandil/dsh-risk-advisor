# Risk Advisor V1 Final Closure Implementation Instructions

## Required outcome

Complete the frozen V1 Final Closure validation task.

Final Codex handoff:

`V1_FINAL_CLOSURE_PUBLISHED_READY_FOR_REVIEW`

Do not declare V1 closed.

Do not create `Acceptance_Report.md`.

Do not start Phase 11.

---

## 1. Sync authority

Sync `origin/main`.

Required baseline must include:

`322e8802faf0870a6ca54ac0bf4dbdf4a8abfe0c`

Read:

1. `V1_Final_Closure_Preflight.md`
2. `V1_Final_Closure_Freeze.md`
3. Phase-10 Acceptance Report
4. Phase-10 cold-start script
5. collaboration workflow

The Closure Freeze is authoritative.

Preserve user drift.

No reset/clean/force push.

Harness Core read-only.

---

## 2. Product semantics

Do not modify Risk Advisor product source unless the release smoke exposes a real defect.

Expected normal outcome:

`PRODUCT_EXECUTABLE_UNCHANGED_FROM_PHASE10`

with product executable:

`1fa84e2a8a9de465cdb85fef928ec9e19086bba2`

Validation/test infrastructure may change.

---

## 3. Add reproducible release gate

Add a bounded repository-owned release smoke, preferably:

- `benchmarks/v1-release-candidate.mjs`
- `tests/v1-release-candidate.spec.ts`
- package script `gate:v1:release`

Reuse safe patterns from Phase-10 cold-start instead of inventing a second install system.

---

## 4. Release gate process A

Using:

- exact pinned local Harness;
- locally packed Risk Advisor;
- disposable DSH_HOME/profile;
- offline/fail-loud environment;

install/activate the external Risk Advisor bundle and disposable probe.

Process A must:

- boot the installed profile;
- reach AppReady;
- observe Risk Advisor service available;
- prove one RA bundle and one probe bundle;
- exit via public AppExit(0).

No parent kill on success.

---

## 5. Release gate process B

Boot the same persisted profile.

After AppReady, the disposable probe must run one real bounded local tool traversal through real ToolRuntime.

That traversal must request real pinned Native Approval.

The probe may register exactly one separate deterministic native answerer returning:

`allowed-once`

Required proof:

- ToolRuntime traversal = 1;
- approval/asked = 1;
- native answerer calls = 1;
- native outcome = allowed-once;
- RA assessment/correlation present;
- RA association = BOUND;
- duplicate native answers = 0;
- RA approval answerer calls = 0;
- RA ApprovalOutcome returns = 0;
- tool completes successfully;
- no post-decision advisory reopen;
- public AppExit(0).

No reviewer/provider is required.

---

## 6. Probe constraints

The disposable probe is validation infrastructure only.

Do not add it to production source or packed Risk Advisor files.

Use public pinned Harness services.

Do not call Risk Advisor `apply()` directly as the release proof.

Risk Advisor must be active because the installed external bundle/profile mounted it.

---

## 7. Fail-loud external boundary

For install/boot/smoke:

- external provider calls = 0;
- external HTTP/HTTPS = 0;
- registry calls = 0;
- Git remote runtime calls = 0;
- Harness tracked mutation = 0;
- user profile mutation = 0.

Local loopback/internal IPC may be allowed and reported separately.

Verify local Harness HEAD exactly:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

No fetch.

---

## 8. Release evidence artifact

Produce bounded sanitized JSON under:

`docs/tasks/V1-final-closure/evidence/`

or an equivalent task-local path.

Do not store raw prompts/tool arguments/private paths/secrets.

Include the exact fields required by the Closure Freeze.

---

## 9. Pre-Full gates

Run the exact order frozen in `V1_Final_Closure_Freeze.md`.

At minimum:

- new release smoke focused;
- P10 through P1/R1-R5 regressions;
- typecheck/build;
- exports/declarations;
- bundle/pack;
- privacy/authority;
- P10 benchmark smoke/full;
- P10 cold-start;
- V1 installed-profile approval smoke;
- Harness pin/clean;
- no external activity.

No fresh complete `pnpm test` during iteration.

---

## 10. Exact closure candidate

When pre-Full gates are green:

1. stage only intended validation/test/package-script/evidence files;
2. commit;
3. record exact `CLOSURE_VALIDATION_SHA`;
4. rerun V1 release smoke on that exact SHA;
5. rerun P10 cold-start;
6. rerun P10 benchmark smoke/full;
7. verify no tracked drift.

If product source stayed unchanged, report:

`PRODUCT_EXECUTABLE_UNCHANGED_FROM_PHASE10`

---

## 11. Fresh Full

On the exact closure validation SHA run exactly one fresh complete:

`pnpm test`

If it fails:

repair -> new closure SHA -> rerun affected gates -> new fresh Full.

After PASS, validation/product/test/package semantics are frozen.

---

## 12. Post-Full report only

After the passing Full, only update/create:

`docs/tasks/V1-final-closure/Execution_Report.md`

Push and verify remote equality.

Closure validation SHA -> final report SHA must be report-only.

---

## 13. Report required contents

Record:

- product executable SHA;
- closure validation SHA;
- final report SHA;
- `PRODUCT_EXECUTABLE_UNCHANGED_FROM_PHASE10` or repaired product SHA;
- release smoke process A/B;
- AppReady/AppExit;
- real ToolRuntime traversal;
- approval/asked/native answer counts;
- RA BOUND correlation;
- no RA authority;
- Harness pin/clean;
- external activity zero;
- exact Full result;
- Phase 1–6 legacy provenance reconciliation;
- Phase 7–10 accepted lineage;
- Deep Judge/tool-less supersession;
- named approval-plugin non-claim;
- external provider latency non-claim;
- real concrete subagent spawn non-claim;
- deployed interactive browser non-claim;
- package version remains `0.1.0-r1`;
- no registry/tag/release action;
- no Phase 11.

---

## 14. STOP

If installed-profile approval smoke exposes a real product defect, stop with:

`V1_FINAL_CLOSURE_PRODUCT_REPAIR_REQUIRED`

If the environment cannot run the frozen gate without Harness modification/network/user-profile mutation, stop with:

`V1_FINAL_CLOSURE_ENVIRONMENT_BLOCKED`

Do not weaken the proof.

---

## 15. Final response

Return compactly:

`V1_FINAL_CLOSURE_PUBLISHED_READY_FOR_REVIEW`

with closure validation SHA, final report SHA, release-smoke result, Full count, external counters, Harness status, and product-executable unchanged/changed status.
