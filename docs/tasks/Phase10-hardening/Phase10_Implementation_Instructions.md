# Phase 10 Implementation Instructions — V1 Hardening and Release Readiness

## 0. Required outcome

Implement and validate the frozen Phase-10 Hardening scope.

Final Codex handoff:

`PHASE10_PUBLISHED_READY_FOR_REVIEW`

Do not declare acceptance.

Do not create `Acceptance_Report.md`.

Do not start Phase 11 or another product phase.

---

## 1. Sync and read authority

Sync `origin/main`.

Required baseline must include:

`32c038f762931c292292a13147ebec00fae0abf4`

Read in order:

1. `docs/tasks/Phase10-hardening/Phase10_Preflight.md`
2. `docs/tasks/Phase10-hardening/Phase10_Architecture_Freeze.md`
3. `docs/tasks/Phase9-deep-judge/Acceptance_Report.md`
4. `docs/tasks/Phase8-evidence-collector/Acceptance_Report.md`
5. `docs/tasks/T05-latency-benchmark/AdvisoryLatencyPolicy_Provisional.md`
6. collaboration workflow

The Phase-10 Architecture Freeze is authoritative.

Preserve all existing user drift.

No reset/clean/force push.

Harness Core remains read-only.

---

## 2. Create Phase-10 focused suite

Add `test:p10` and organize focused tests around the frozen lanes.

Equivalent grouping is allowed, but every mandatory proof in the Architecture Freeze must have an executable owner.

Prefer parameterized/table-driven cases.

Do not create hundreds of trivial single-case tests.

---

## 3. H1 — Shell hardening

Use only the existing shared shell analyzer / Rule Engine.

Add the frozen chaining/dynamic/encoded/environment corpus.

For each case assert one of:

- exact known hazard;
- explicit DEGRADED/ambiguous fail-closed state;
- inert-data non-finding.

Never execute corpus commands.

If a real parser defect is found, repair the shared implementation and rerun P4/P7 immediately.

Do not add a Phase-10-only parser.

---

## 4. H1 — Prompt injection containment

Build deterministic hostile local reviewer fixtures.

Cover Fast Judge and Deep Judge.

At minimum attempt:

- extra dimension not requested;
- risk downgrade when deterministic/evidence risk is already concrete;
- fake recommendation/final-decision field;
- fake checkpoint/reversible/evidence-quality claim;
- operation text saying “ignore previous instructions”;
- project/plugin message asserting authorization;
- model alternative/hypothesis containing instruction text.

Prove Host validation/merge preserves frozen authority.

Only direct-user messages may enter DirectUserContext.

Report this as structural hardening, not real-provider immunity.

No external model call.

---

## 5. H1 — Synthetic secret canary

Generate one unique secret token at runtime from fragments.

Exercise the frozen canary forms and surfaces.

Collect the Risk Advisor-owned serialized/retained outputs into one deny scan.

The exact generated canary must not appear in forbidden output.

Include:

- Fast Judge payload;
- Deep Judge payload;
- accepted model text after redaction;
- A1–A4;
- Browser view;
- diagnostics;
- benchmark output;
- test-captured RA logger/console output if any.

Do not scan unrelated Harness/user logs as acceptance evidence.

Do not store the exact runtime canary in committed artifacts.

---

## 6. H1 — Retry / semantic correctness

Add the false-retry matrix from the Freeze.

Use real RetryEscalationAnalyzer product logic.

Add the semantic false-positive matrix using real verification product logic.

Do not infer success from process exit 0.

If a verifier cannot prove matched/mismatched, preserve unknown.

Late verification must not rewrite capture-boundary retry identity.

---

## 7. H2 — Whole-pipeline lifecycle

Build an integration harness over the real:

- ApprovalAssessmentCoordinator;
- Fast Judge scheduler;
- Evidence runtime;
- Deep Judge scheduler;
- Native approval observation events.

Use deterministic local fake LLM/subagent/fs/shell seams only.

Run the frozen timeout/cancel/native-outcome/session-dispose/plugin-dispose/generation replacement cases.

Abort-ignoring fakes are required.

Assert no late A2/A3/A4.

Assert all owned async work drains.

---

## 8. H2 — Resource stress

Exercise every frozen retained-state family at/over its cap.

Use behavior/diagnostics, not unreliable heap measurements.

Add one composed bounded stress run across multiple Sessions.

After Session/plugin disposal prove observable state returns to zero/baseline where the subsystem exposes a bounded diagnostic.

Do not add public raw-state debug APIs.

A host-private sanitized count accessor is allowed only if no existing diagnostic can prove a mandatory bound; keep it unexported.

---

## 9. H2 — Coexistence

Use the real pinned Harness ApprovalService.

Mount a separate Cordis fixture plugin that registers the deterministic approval answerer.

Risk Advisor must not own this answerer.

Prove:

- exactly one answerer call;
- native outcome parity with RA absent/present;
- parity under injected RA failure;
- parity under RA timeout;
- parity when RA disposes before answer;
- no duplicate answerer on reload.

Also inspect the local plugin workspace for an already-existing approval-answerer plugin without changing/installing it.

If one is available and safely composable, run an additional read-only coexistence lane.

Otherwise record:

`NAMED_EXTERNAL_APPROVAL_PLUGIN_NOT_AVAILABLE`

Do not install one.

---

## 10. H3 — TOCTOU truthfulness

Do not add execution authority.

Add/extend tests proving private operationHash identity behavior and same-ExecutionId evidence binding.

Update the Risk Advisor UI/presentation to disclose that Evidence is pre-execution observation.

Use localized copy equivalent to the frozen English/Chinese text.

Show it only where Evidence-backed assessment is relevant.

Do not change Bridge V1–V4 schemas solely for this.

Add UI proof that no execution-time verification claim is made.

---

## 11. H4 — External bundle packaging

Add:

`cordis.patch.yml`

with the exact frozen single Risk Advisor row.

Update package.json:

- preserve current `dsh.client`;
- add `dsh.bundle.patch = ./cordis.patch.yml`;
- include `cordis.patch.yml` in `files`.

Do not enable Fast Judge or Deep Judge in the bundle patch.

No new runtime dependency is required solely for packaging.

---

## 12. H4 — README

Replace the obsolete T01 fixture README.

Document current V1 honestly.

Required sections:

- purpose;
- advisory-only authority;
- external bundle install;
- default provider-free behavior;
- optional Fast Judge;
- Deep Judge default-off + trusted-parent-composition limitation;
- privacy boundaries;
- pre-execution Evidence / TOCTOU limitation;
- local development checks;
- pinned Harness compatibility.

Do not claim npm publication if not verified.

---

## 13. H4 — Package contract tests

Add direct tests for:

- `dsh.bundle.patch`;
- patch file existence;
- exactly one Risk Advisor row;
- existing client declaration preserved;
- pack file allowlist/denylist;
- no absolute developer path;
- no test/benchmark inclusion;
- no dependency on unavailable dsh-subagent;
- default configuration makes zero reviewer calls.

Use pinned public bundle parsing/validation helpers if already resolvable locally.

Do not import private Harness internals just for the test.

---

## 14. H4 — Local external install

Use a disposable `DSH_HOME` / profile.

Use the pinned Harness-supported absolute local package-path installation route when available.

Force offline/no-registry behavior.

Never target the user's real web/desktop profile.

Prove activation from the installed external bundle, not by directly calling Risk Advisor `apply()`.

If client roster proof is available through an already-built pinned public/test-support seam, prove the client package is discovered too.

---

## 15. H4 — True cold restart

Use two separate child processes.

Process A and B must boot the same disposable installed profile sequentially.

Each proves exactly one Risk Advisor activation.

Each exits cleanly under a hard timeout.

No orphan process.

No external provider/model.

No registry/network.

Do not build Harness Core.

If required Harness runtime artifacts are absent and cold start cannot run without building Harness or network/install work, stop with:

`PHASE10_COLD_START_ENVIRONMENT_BLOCKED`

Do not continue to publication as PASS.

---

## 16. H5 — Phase-10 benchmark

Add the Phase-10 benchmark and smoke/full tests.

Use the existing R5 stats utilities where appropriate.

Measure the frozen distributions.

For local model paths use deterministic adapters.

For Deep Judge use the accepted structural public-seam fake.

No sleep-based result should be mislabeled as provider latency.

Capture n / warmup / P50 / P95 / P99 / MAX / mean and evidence class.

Keep benchmark output bounded and sanitized.

---

## 17. H5 — AdvisoryLatencyPolicy

Create before the final Tested SHA:

`docs/tasks/Phase10-hardening/AdvisoryLatencyPolicy.md`

Do not edit historical T05 policy.

For each field state:

- numeric candidate only when supported;
- otherwise CONTRACT_ONLY / UNDETERMINED / NOT_VALIDATED_EXTERNAL_PROVIDER;
- measured basis;
- evidence class;
- P99/MAX;
- headroom rationale if any;
- whether product runtime config changes.

Do not automatically change Fast/Deep timeout/concurrency configuration based on local fake speed.

If no safe evidence supports a new numeric runtime threshold, keep the accepted runtime bound and label its evidence honestly.

---

## 18. Phase-10 benchmark canary/privacy

Benchmark artifacts must not contain:

- raw ToolExecution arguments;
- raw user prompt;
- secret canary;
- file contents;
- canonical private paths;
- model/provider credentials.

Use synthetic generic target names and temp roots.

Environment metadata may include OS/Node/CPU but not user home path.

---

## 19. Boundary audit

Add a Phase-10 boundary test/source audit proving product code still does not:

- answer PendingApproval;
- register an approval answerer;
- mutate Native Approval outcome;
- add a generic Deep Judge tool;
- register custom Deep Judge Evidence Tools;
- create custom Risk Advisor Session events;
- perform external network/provider/registry/Git-remote activity;
- log raw prompt/raw arguments/secrets;
- modify Harness Core.

Also verify Deep Judge remains default-off.

---

## 20. Pre-Full validation

Run the exact order frozen in `Phase10_Architecture_Freeze.md`.

Do not skip inherited P1–P9 or R1–R5/T05 regressions.

Static gates precede the fresh Full.

The Phase-10 benchmark and cold-start gates are mandatory pre-Full executable gates.

---

## 21. Candidate iteration

Before the final commit, it is acceptable to run focused gates/benchmark/cold-start repeatedly while repairing Phase-10 defects.

Do not run the fresh complete `pnpm test` during this iteration.

When all candidate gates are green:

- generate final Phase-10 policy/evidence;
- stage only intended Phase-10 files;
- commit.

Record the exact candidate SHA.

---

## 22. Exact committed-SHA revalidation

On the exact committed candidate SHA:

- rerun P10 benchmark smoke/full;
- rerun external bundle install proof;
- rerun true cold restart;
- verify no tracked drift was created.

If any fails:

- repair;
- create a new commit/SHA;
- rerun affected gates.

Only after these are green does that commit become the Tested SHA.

---

## 23. Fresh complete Full

On exact final Tested SHA run:

`pnpm test`

exactly once.

This is the final executable acceptance gate.

If it fails:

- preserve evidence;
- repair;
- rerun affected pre-Full gates;
- create a new Tested SHA;
- run a new fresh complete Full.

After PASS, executable/test/config/package/benchmark/policy/README/patch content is frozen.

---

## 24. Post-Full report only

After the passing Full, only create/update:

`docs/tasks/Phase10-hardening/Execution_Report.md`

No other semantic file change.

Push and verify:

`HEAD == origin/main == git ls-remote origin refs/heads/main`

and prove Tested -> final is report-only.

---

## 25. Execution Report required matrix

Report exact status for:

### Security
- shell corpus;
- structural prompt injection;
- privacy canary;
- malformed reviewer output.

### Correctness
- false retry;
- semantic false positive;
- TOCTOU stance.

### Lifecycle
- timeout;
- cancellation;
- generation;
- HMR/reload;
- resource caps.

### Coexistence
- real ApprovalService fixture plugin;
- actual named external plugin availability.

### Productization
- bundle patch;
- pack contents;
- local install;
- process A/B cold restart.

### Performance
- benchmark artifact;
- final policy;
- evidence classes;
- external provider = NOT_VALIDATED.

### Governance
- Harness mutation 0;
- provider/network/registry/Git remote 0;
- Full count;
- Tested SHA;
- final report SHA;
- report-only diff;
- no Phase 11.

---

## 26. STOP conditions

Honor every STOP in the Architecture Freeze.

Especially stop rather than weakening evidence if:

- cold restart requires Harness build/network/user-profile mutation;
- a secret canary leaks;
- Native Approval parity breaks;
- a side path publishes after native close;
- capacity grows unbounded;
- fixing a defect requires new approval authority or Harness changes.

---

## 27. Final response

Return only the compact completion summary and:

`PHASE10_PUBLISHED_READY_FOR_REVIEW`

Do not create Acceptance Report.
