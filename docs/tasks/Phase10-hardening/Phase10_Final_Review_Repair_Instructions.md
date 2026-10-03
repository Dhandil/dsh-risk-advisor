# Phase 10 Final Review Repair Instructions — R1

## 0. Review outcome

`PHASE10_REPAIR_REQUIRED`

Reviewed publication:

- reported Tested SHA: `b6e1650bb40a3ba7bdfd0140e23f57e4d827087b`
- reported final/report SHA: `8f543f26fbbab537f9d2db9f6a370efa5451e69b`
- independent remote check: `main == 8f543f26fbbab537f9d2db9f6a370efa5451e69b`
- independent Tested -> final check: exactly one added file, `docs/tasks/Phase10-hardening/Execution_Report.md`

Commit governance is clean.

The current implementation is **not accepted** because several mandatory Phase-10 hardening proofs are weaker than the frozen contract and the Execution Report overstates those proof strengths.

This repair is proof-focused. Do not redesign Phase 1–9 architecture. Product-code changes are allowed only if the completed hardening proofs expose an actual defect.

Harness Core remains read-only at:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

No external provider/network/registry/Git-remote calls.

---

## 1. R1 — Complete the frozen shell adversarial corpus

Current P10 shell proof directly covers only a small subset of the frozen minimum.

Add table-driven direct proof for the remaining required cases, including at least:

- `sh -c`
- `node -e`
- `python -c`
- `perl -e`
- `cmd /c`
- `powershell -Command`
- `pwsh -c`
- `Invoke-Expression`
- `iex`
- PowerShell `& $variable`
- `find ... -exec`
- `xargs`
- `parallel`
- backticks
- newline chaining
- PowerShell semicolon chaining
- quoted separators remaining inert
- `LD_PRELOAD`
- `NODE_OPTIONS`
- generic env prefix
- PowerShell environment assignment

Use the existing shared shell analyzer / Rule Engine only.

Expected result per case:

- known dangerous semantics -> expected specific finding; or
- unsupported/dynamic semantics -> explicit DEGRADED / fail-closed; or
- inert data -> no role-sensitive false positive.

No corpus command may execute.

If a case exposes a real parser defect, repair the shared parser and rerun P4/P7.

---

## 2. R2 — Make prompt/privacy hardening genuinely end-to-end

The current runtime canary proof directly reaches only ReviewerSeed, DirectUserRing, and Fast Judge candidate parsing.

Use one runtime-generated synthetic secret canary and prove that the exact token does not survive through all frozen forbidden Risk Advisor surfaces.

At minimum exercise:

1. ReviewerOperationSeed
2. DirectUserContext
3. Fast Judge serialized payload via the real serializer
4. Fast Judge accepted candidate
5. EvidenceSnapshot / evidence projection
6. Deep Judge payload via `buildDeepJudgePayload`
7. Deep Judge accepted candidate
8. A1
9. A2 merge
10. A3 merge
11. A4 merge
12. Browser V4 projection / parser-visible DTO
13. sanitized diagnostics
14. Phase-10 benchmark result object
15. Risk Advisor-owned captured logger/console output, if any

The same generated canary token must be denied, not a different hard-coded token per surface.

Do not write the exact generated canary into committed evidence.

### Structural prompt-injection authority proof

Add hostile local Fast/Deep reviewer candidates that attempt to:

- lower a concrete deterministic/evidence-backed risk;
- add an unrequested dimension;
- assert fake authorization from plugin/project text;
- assert reversible/checkpoint/evidence-quality claims;
- add final-decision/recommendation-style authority fields;
- inject instruction text through rationale/hypothesis/alternative.

Prove:

- only direct-user context can support Authorization;
- deterministic/authoritative facts remain authoritative;
- hard/evidence risk floors cannot be lowered;
- extra/invalid fields fail closed;
- alternatives remain `MODEL_SUGGESTED / UNVERIFIED`;
- hypotheses remain hypotheses.

Reuse existing merge functions. Do not add a second authority layer.

---

## 3. R3 — Complete Native Approval coexistence proof

The current P10 coexistence test proves only one normal RA-present case.

Use the real pinned Harness `ApprovalService` plus a **separate Cordis fixture plugin/fiber** that owns one deterministic approval answerer.

Prove all frozen cases:

- RA absent vs RA present outcome parity;
- exactly one native answerer call;
- injected RA observer/side-path failure parity;
- RA side-path timeout parity;
- RA disposed before answer parity;
- fixture answerer removed -> native behavior remains native, with no RA fallback;
- RA/fixture remount -> no duplicate answerer;
- duplicate approval observation -> no double answer.

Also run/cite the existing A2/A3/A4 late-result fencing tests on the repaired exact SHA.

If no actual named external approval plugin is locally available without installation, record exactly:

`NAMED_EXTERNAL_APPROVAL_PLUGIN_NOT_AVAILABLE`

Do not install one.

Risk Advisor must still register zero approval answerers and return zero ApprovalOutcome values.

---

## 4. R4 — Strengthen cold-start proof

The current script does use two OS processes and a persisted disposable profile, which is good, but its verifier is insufficient:

- it reports a pinned Harness SHA without checking the local checkout;
- it treats any stdout/stderr substring containing `risk-advisor` as activation;
- it does not prove exactly one Risk Advisor activation/service instance;
- its zero-external-activity record is declarative rather than a strong fail-loud guard.

Repair the gate.

### Harness identity

Before install/boot, verify the local Harness checkout is exactly:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

using local Git only.

No fetch.

Fail if it differs.

Allow the Harness path to be supplied by a bounded environment variable with the current local path as fallback; do not silently test another checkout.

### Exact activation probe

Do not use a generic stdout substring as the activation authority.

Create a disposable, test-only external probe plugin/bundle in the temp area, separate from Risk Advisor product source.

The probe must:

- inject/wait on a Risk Advisor Host service such as `riskAdvisorAssessments`;
- emit one exact bounded marker only after that service is available;
- request bounded clean process exit through the public app lifecycle;
- contain no provider/model/network behavior.

Install/activate the probe locally in the same disposable profile.

For process A and process B independently assert:

- exit 0;
- exact activation marker count = 1;
- no duplicate activation marker;
- same persisted profile used;
- Risk Advisor bundle appears exactly once in the profile bundle list.

### Offline/fail-loud

Keep pnpm/corepack offline settings.

Also make general external HTTP fail loud for the child processes without breaking loopback/local IPC.

No external provider/network/registry/Git-remote call.

The gate result must report observed proof fields, not constant zero claims alone.

---

## 5. R5 — Implement the actual T05 product-path follow-up benchmark

The current Phase-10 benchmark is too shallow for the frozen T05 follow-up:

- Fast/Deep lanes measure candidate parsers, not actual scheduler/execution/merge paths;
- Evidence lane measures `overlayEvidenceContext`, not actual Evidence collection;
- Browser lane measures protocol parsing, not actual presentation/query projection;
- `composedLocalPath` is only A1 + Evidence overlay and is not A1 -> A4;
- the policy does not explicitly address every frozen policy field.

Repair the benchmark using real product code and deterministic local dependencies only.

### Required measured lanes

Keep the real pinned ApprovalService baseline/treatment measurement.

Add actual local product measurements for:

1. deterministic A1
2. Context Builder
3. Fast Judge scheduler + `executeFastJudge` using a deterministic local LLM adapter + A2 merge
4. Phase-8 Evidence collection through the actual collector/scheduler with bounded local fs/shell fixtures + A3 merge
5. Deep Judge scheduler + accepted structural local subagent seam + A4 merge
6. actual Browser projection/query path, not only `parseBridgeRead`
7. one triggerable composed local pipeline from A1 through terminal A4

Use real coordinator/product functions where that is the cleanest way to measure the composed path.

No real provider.

No sleep-only number may be labeled product/provider latency.

### Sampling

- cheap/local lanes: >=300 measured samples after warmup
- heavier composed path: >=100 if practical
- if lower, label P99 `LOW_CONFIDENCE`

Report nearest-rank P50/P95/P99/MAX/mean/n/warmup.

### Privacy

The benchmark result must be produced from bounded sanitized fields and must be included in the R2 canary deny scan.

Do not represent a constant `privacy: { secrets: 0 }` object as proof by itself.

---

## 6. R6 — Complete the AdvisoryLatencyPolicy

Update:

`docs/tasks/Phase10-hardening/AdvisoryLatencyPolicy.md`

from the repaired exact benchmark evidence.

Explicitly address, one by one:

- `T_sync`
- deterministic assessment local budget
- context-build local budget
- Evidence local budget
- Browser presentation/query local budget
- Fast Judge timeout
- Deep Judge timeout
- Fast Judge concurrency/pending bounds
- Deep Judge concurrency/pending bounds
- total advisory lifecycle bound
- external provider latency

For each field state one of:

- supported numeric candidate;
- observation-only;
- contract-only;
- unchanged runtime bound;
- undetermined;
- `NOT_VALIDATED_EXTERNAL_PROVIDER`.

Include measured basis/evidence class/P99/MAX/headroom rationale when numeric.

Do not tune runtime configuration merely to fit local fake speed.

Historical T05 policy remains unchanged.

---

## 7. R7 — Repair TOCTOU proof quality

The product UI change itself is correct and the modified P6 UI test does render the disclosure.

However the new P10 test titled “renders pre-execution disclosure” currently renders `UNAVAILABLE` and only checks the locale constant.

Replace that false-positive-style test with real evidence-bearing rendering proof or remove the duplicate and explicitly rely on the real P6 UI integration proof.

Also add direct private identity proof for the remaining frozen TOCTOU contract:

- equivalent normalized operation -> stable private operationHash;
- materially different operation -> different private operationHash;
- operationHash/raw args remain absent from public diagnostics/Browser;
- Evidence/A3/A4 cannot be substituted across ExecutionId.

Do not expose operationHash publicly merely for testing.

Reuse the existing private test technique from P1A where appropriate.

---

## 8. Resource/lifecycle proof mapping

Do not duplicate hundreds of already-valid cap tests unnecessarily.

Create a concise Phase-10 hardening proof matrix in tests or task docs that maps every frozen retained-state family to its executable test owner on the repaired SHA:

- ActiveExecutionIndex
- OperationFoundation
- Ledger/PTC
- FailureChain
- ReviewerSeed
- ExpectedEffect
- Verification
- Evidence raw seed
- Evidence sanitized store
- Assessment records
- Deep Judge parent bindings
- Fast/Evidence/Deep queues

If any family lacks an executable at/over-cap proof, add one.

Also map:

- A2 native-close fencing
- Evidence/A3 native-close fencing
- A4 native-close fencing
- Session disposal
- plugin disposal
- capability replacement
- abort-ignoring work
- duplicate approval observation

Add only the missing executable cases.

---

## 9. Correct reporting claims

The current Execution Report may remain as historical evidence until the repaired candidate passes.

The repaired final report must not claim more than the executable proof demonstrates.

In particular distinguish:

- `STRUCTURAL_PROMPT_INJECTION_HARDENING`
- `REAL_PRODUCT_LOCAL`
- `STRUCTURAL_LOCAL_REVIEWER`
- `REAL_PINNED_RUNTIME`
- `NOT_VALIDATED_EXTERNAL_PROVIDER`

and explicitly record:

- named external approval plugin availability status;
- observed cold-start activation marker counts;
- verified local Harness SHA;
- full canary surface matrix;
- actual composed A1 -> A4 benchmark lane.

---

## 10. Validation order

This repair changes tests/benchmark/cold-start executable evidence, so the old Full is not the final acceptance gate.

Run:

1. repaired P10 shell focused
2. repaired P10 prompt/privacy focused
3. repaired P10 coexistence/lifecycle focused
4. repaired P10 TOCTOU focused
5. all affected P1–P9 focused regressions
6. P10 benchmark smoke/full
7. repaired external-bundle install + true cold restart
8. policy/evidence consistency audit
9. typecheck
10. build
11. Host/Client export checks
12. declaration/private-export audit
13. pack dry-run JSON
14. git diff --check
15. no-provider/no-external-network/no-registry/no-Git-remote audit
16. Harness mutation = 0
17. all inherited regression groups required by Phase10 Freeze
18. commit the final executable candidate
19. rerun benchmark/cold-start on that exact committed SHA
20. exactly one fresh complete `pnpm test`

If anything fails after the candidate commit, repair -> new SHA -> repeat affected gates -> new fresh Full.

After the passing Full, only `Execution_Report.md` may change.

---

## 11. Commit governance

Preserve current repository history.

Do not reset or rewrite the Phase-10 publication.

Expected repair history:

```text
current docs-only review baseline
-> R1 executable/test/benchmark/cold-start/policy commit(s)
-> exact final Tested SHA
-> exactly one fresh complete Full
-> Execution_Report docs-only commit
```

Tested -> final must again be report-only.

Verify remote equality.

---

## 12. STOP conditions

Stop with `PHASE10_R1_ARCHITECTURE_DECISION_REQUIRED` if any repair would require:

- Harness Core modification;
- new approval authority;
- a generic Deep Judge tool;
- new durable persistence;
- execution-time veto/guard;
- real external provider/network use.

Stop with `PHASE10_R1_COLD_START_ENVIRONMENT_BLOCKED` if exact pinned two-process external-bundle proof cannot run without building/modifying Harness Core or using registry/network/user-profile state.

---

## 13. Final handoff

On success return:

`PHASE10_R1_PUBLISHED_READY_FOR_REVIEW`

Include:

- R1 Tested SHA
- final remote/report SHA
- repaired P10 focused counts
- benchmark smoke/full result
- exact Harness SHA verified by cold-start gate
- process A/B exact activation marker counts
- full canary matrix PASS
- coexistence matrix PASS
- fresh complete Full count
- provider/network/registry/Git-remote = 0
- Harness mutation = 0

Do not create `Acceptance_Report.md`.
