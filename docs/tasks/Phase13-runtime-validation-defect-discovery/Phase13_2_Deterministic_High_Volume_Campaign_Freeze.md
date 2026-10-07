# Risk Advisor Phase 13.2 — Deterministic High-Volume Campaign Freeze

## Status

`RISK_ADVISOR_PHASE13_2_FROZEN_READY_FOR_EXECUTION`

Phase 13.2 is the first high-volume runtime validation campaign using the accepted Phase 13.1 validation harness.

It validates the frozen Online Correction V1 contract under large deterministic Harness Tool workloads.

It does not change Product code and does not introduce new correction authority.

## 1. Baseline

- Phase 13.1 accepted validation harness:
  `8ff9997dd8cb584ef079e1492759ea206477b966`
- Phase 13.1 Acceptance Report:
  `9cb205295fdd04bfa459ad24d4c1d52273dde4e2`
- Accepted Risk Advisor Product executable:
  `28d3d204376da0a43279b949a3ceea794212d10c`
- Pinned Harness Core:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`

## 2. Cost / model policy

### Phase 13.2

**No conversation model is used.**

Frozen requirement:

```
provider calls = 0
model calls = 0
LLM calls = 0
Judge calls = 0
Deep Judge calls = 0
Subagent calls = 0
```

Lane A executes deterministic Tool workloads directly through the pinned Harness runtime and accepted Product wiring.

Therefore Phase 13.2 model cost is effectively zero.

Do not create a model-backed Session merely to generate Tool operations.

Do not call a provider for scenario generation, classification, retry planning, summaries, or defect triage.

### Future Phase 13.3 low-cost Agent profile

Phase 13.3 is not authorized by this Freeze, but the intended cost policy is reserved now:

- provider: `deepseek-official`;
- model: `deepseek-v4-flash`;
- reasoning effort: `low`;
- do not use `high` or `max`;
- Fast Judge: disabled unless separately justified;
- Deep Judge: disabled;
- subagents: disabled unless a future scenario explicitly requires them;
- short task prompts;
- synthetic bounded workspaces;
- no unnecessary conversational follow-up.

Harness DeepSeek reasoning levels are model-owned and support `off`, `low`, `high`, and `max` on the pinned adapter when thinking is enabled.

The default Phase 13.3 profile uses `low`, because the campaign needs ordinary Agent planning while minimizing reasoning cost.

A future Phase 13.3 Freeze may use `off` for explicitly trivial task families, but it must not silently upgrade above `low`.

This future profile does not cause any provider call in Phase 13.2.

## 3. Campaign question

Phase 13.2 answers:

> Across a large deterministic distribution of real Harness Tool executions, does accepted Online Correction V1 obey its frozen F1/F2 contract without false positives, false negatives, duplicate Findings, wrong-Session attribution, or lifecycle corruption?

A second output is discovery:

> Which repeated execution patterns look useful to warn about but are intentionally outside current F1/F2 scope?

Those are coverage opportunities, not automatic defects.

## 4. Exact campaign scale

Freeze one canonical Lane A campaign:

- exactly **300 scenarios**;
- at least **1500 Tool executions**;
- target exactly **1500 Tool executions** unless a blocking defect stops the run early;
- at least 12 deterministic scenario families;
- at least 20 independent Session identities;
- both F1 positive/negative cases;
- both F2 positive/negative cases;
- matched, mismatched, unsupported, unknown/degraded verifier cases;
- changed-command and changed-argument retry cases;
- success-breaking-chain cases;
- two-Session and multi-Session isolation cases;
- bounded retirement/capacity-compatible cases.

Run policy:

```
maxScenarios = 300
maxToolExecutions = 1500
```

The manifest must contain exactly the planned campaign. No dynamic expansion after observing Product output.

## 5. Deterministic seed

Use one frozen seed:

`phase13-lane-a-canonical-v1`

The generator version remains:

`phase13-generator-v1`

The generated manifest must be canonicalized and SHA-256 recorded before execution.

A replay generation from the same seed/config must be byte-identical before campaign execution begins.

## 6. Scenario family distribution

The campaign must include at least these families.

### A1 — successful no-Finding operations

Purpose:
- large TN population;
- prove ordinary success stays quiet.

### A2 — isolated failure

One failure without exact retry.

Expected:
- no F1.

### A3 — exact repeated same-signature failure

At least two failures with exact operation identity/signature.

Expected:
- F1 on the frozen qualifying step.

### A4 — changed operation retry

Change command/tool operation enough to break exact-operation identity.

Expected:
- no F1 under V1.

May be labeled as a coverage opportunity only when the broader task pattern would genuinely help a user.

### A5 — changed argument retry

Same Tool family but different relevant arguments.

Expected:
- no F1 when frozen fingerprint/retry relation no longer qualifies.

### A6 — success breaks retry chain

Failure -> success -> later failure.

Expected:
- later failure does not inherit the prior exact retry chain.

### A7 — direct F2 matched

Supported `tool.write.v1` / `tool.edit.v1` successful matched outcome.

Expected:
- no F2.

### A8 — direct F2 controlled mismatch

Validation-owned fault fixture.

Expected:
- F2.

Label these rows as fault-fixture evidence, not real-agent evidence.

### A9 — async supported matched

Known adapters:
- mkdir;
- copy-file;
- git branch switch;
- node package resolve where locally fixtureable.

Expected:
- no F2 when matched.

### A10 — async controlled mismatch

Validation-owned safe fault fixture.

Expected:
- F2.

### A11 — unsupported / unknown / unavailable verification

Expected:
- no F2.

Do not turn verifier absence into an Online Correction FN.

### A12 — Session isolation / retirement / ownership

Use many Sessions and legitimate Finding retirement.

Expected:
- no cross-Session identity;
- no normal-removal defect;
- no retired identity reappearance.

## 7. Distribution requirements

The final manifest must include:

- >=100 F1 expected-positive steps;
- >=400 F1 expected-negative scorable steps;
- >=100 F2 expected-positive steps;
- >=400 F2 expected-negative scorable steps;
- >=100 changed-operation/changed-argument steps;
- >=50 success-break-chain steps;
- >=50 multi-Session isolation/ownership-sensitive steps;
- >=50 unsupported/unknown verification steps.

Steps may contribute to more than one descriptive family only when their frozen truth semantics are unambiguous.

Do not manufacture class balance by changing Product output after observation.

## 8. No model-generated manifest

The campaign manifest is generated deterministically from validation code and the frozen seed.

Do not ask a model to invent or mutate scenarios.

Do not let Product output influence which scenario executes next.

This is required for zero provider cost and unbiased truth.

## 9. Workspace safety

Use only the Phase 13 accepted disposable workspace manager.

Never touch:

- user repositories;
- Risk Advisor source checkout;
- Harness source checkout;
- user home files;
- credentials;
- remote repositories;
- package publication;
- cloud resources;
- production services.

Local Git fixtures must have no remote.

All destructive-looking operations remain inside the validation temporary root.

## 10. Capture and grading

Use the accepted Phase 13.1 seams only:

- executionId: public `riskAdvisorCorrelation.lookup()`;
- actual Findings: public Live Correction diagnostics;
- verification settlement: public Verification diagnostics;
- truth: predeclared immutable manifest labels.

Do not add Product-private reads.

Do not import Product implementation into truth/oracle modules.

## 11. Scoring

Report separately for F1 and F2:

- expected positives;
- expected negatives;
- TP;
- FP;
- FN;
- TN;
- NA;
- unscorable;
- precision;
- recall.

Also report:

- duplicate Finding count;
- wrong-Session count;
- resurrected Finding count;
- Finding lifetime violation count;
- capture failure count;
- upstream verification missing count;
- environment failure count;
- opportunity candidate count.

A denominator of zero remains `N/A`.

## 12. Acceptance expectation

For frozen-contract correctness, the target is strict:

- FP = 0;
- FN = 0;
- duplicate = 0;
- wrong-Session = 0;
- resurrected Finding = 0;
- Product-attributable lifecycle violation = 0.

This is not statistical model evaluation.

The Product contract is deterministic; one reproducible FP/FN is a correctness defect.

Do not average a deterministic defect away because overall precision looks high.

## 13. Stop conditions

Stop scheduling new scenarios immediately on:

- Product P0;
- reproducible frozen-contract P1;
- wrong-Session Finding;
- duplicate Finding;
- retired Finding resurrection;
- ledger integrity failure;
- capture integrity failure in deterministic campaign;
- workspace containment failure;
- Product/Harness SHA drift.

On blocker:

- preserve completed ledger;
- preserve minimal reproducer;
- stop the campaign;
- do not patch Product;
- do not restart with the same run ID.

## 14. Environment/upstream failures

If an upstream verifier record does not settle within the frozen deadline:

- mark unscorable;
- classify as upstream verification issue;
- stop deterministic scoring if required by accepted harness policy;
- do not call it F2 FN.

If the failure is clearly package-manager/OS/environment-related:

- classify ENVIRONMENT;
- do not change Product source during the run.

## 15. Opportunity discovery

Phase 13.2 may record:

`OUT_OF_SCOPE_USEFUL_WARNING_CANDIDATE`

for predeclared scenario families such as:

- changed-command same-goal repeated failure;
- alternating no-progress strategies;
- unsupported but useful postcondition families.

Opportunity labels remain excluded from F1/F2 precision/recall.

Do not use a model to decide opportunity labels during the run.

Human architecture review may cluster them after the deterministic campaign.

## 16. Evidence artifacts

Large raw artifacts stay local and untracked.

Required local artifacts:

- canonical manifest JSON;
- manifest SHA-256;
- truth ledger JSONL;
- final ledger head hash;
- minimal reproducer if blocked;
- bounded machine-readable summary.

Committed report contains only:

- candidate Product/Harness identities;
- generator version and seed;
- manifest SHA;
- ledger head hash;
- scenario/execution counts;
- F1/F2 confusion matrices;
- lifecycle/capture/environment counters;
- opportunity totals by family;
- blocker/reproducer summary if any.

Do not commit raw Tool outputs or high-volume ledger by default.

## 17. No Product changes

Phase 13.2 is execution/observation only.

Do not modify:

- `src/`;
- existing Product tests;
- `validation/phase13/` accepted harness code;
- package/lock/config;
- Harness Core.

If the accepted validation harness itself fails at campaign scale, stop and return for a Phase 13.1 maintenance decision.

If Product P1 is found, stop and return for a separate Product Repair architecture task.

## 18. No complete pnpm test

Do not run complete `pnpm test` merely because Phase 13.2 is a campaign.

The accepted Product baseline already has its Full.

Phase 13.2 evidence comes from the canonical high-volume campaign itself.

A Product repair would have its own regression/full policy later.

## 19. Execution report states

If clean:

`RISK_ADVISOR_PHASE13_2_CAMPAIGN_READY_FOR_ARCHITECTURE_REVIEW`

If Product blocker:

`RISK_ADVISOR_PHASE13_2_BLOCKED_PRODUCT_REPAIR_REQUIRED`

If validation instrument blocker:

`RISK_ADVISOR_PHASE13_2_BLOCKED_VALIDATION_HARNESS_REPAIR_REQUIRED`

If environment blocker:

`RISK_ADVISOR_PHASE13_2_ENVIRONMENT_BLOCKED`

Do not self-declare Phase 13.2 accepted.

## 20. Boundary

Phase 13.2 does not authorize:

- Phase 13.3 real Agent/provider calls;
- active correction;
- automatic retry/replan;
- new Finding families;
- Pattern/Guidance authority;
- Product repair.

It is a deterministic high-volume observation campaign only.
