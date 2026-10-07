# Risk Advisor Phase 13 — Runtime Validation & Defect Discovery Architecture Preflight

## Outcome

`RISK_ADVISOR_PHASE13_RUNTIME_VALIDATION_PREFLIGHT_COMPLETE`

This preflight starts after Online Correction V1 is accepted.

It authorizes architecture/design work for a high-volume validation campaign only. It does **not** authorize Risk Advisor product changes, new Finding authority, active intervention, or Harness Core changes.

## 1. Accepted baseline

- Current accepted repository main at preflight start:
  `214a829c1eb0195fbc57cb904e6d5bd864d56b61`
- Exact accepted Risk Advisor executable:
  `28d3d204376da0a43279b949a3ceea794212d10c`
- Pinned Harness Core:
  `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Accepted Phase 12.1:
  deterministic live Finding core.
- Accepted Phase 12.2:
  read-only Session advisory surface.
- Final accepted Full:
  23 suite invocations / 64 test files / 448 tests / exit 0.

Phase 13 asks a different question from engineering acceptance:

> When Harness repeatedly performs many realistic operations over long-running Sessions and diverse task shapes, what does Risk Advisor detect correctly, what does it miss inside its frozen scope, what does it warn about incorrectly, and what useful problem classes exist outside the current F1/F2 scope?

## 2. Why Phase 13 is needed

The existing suite proves the architecture and frozen semantics.

It does not prove that the current product behaves well under a broad distribution of real execution traces.

In particular:

- F1 is intentionally exact-operation / exact-fingerprint scoped.
- F2 is intentionally limited to supported deterministic postcondition adapters.
- Process success is not always goal success.
- Real Agents may alter commands between retries.
- Long-lived Sessions may create interaction patterns not represented in focused tests.
- TTL, capacity, Session churn, connection reset, HMR, and concurrent Sessions can interact with user-visible advisories.
- A technically correct Finding can still be low-value, noisy, late, or misleading in a real task sequence.

Therefore Phase 13 is a **validation and discovery phase**, not a feature-development phase.

## 3. Product remains shadow/read-only

Throughout the initial Phase 13 campaign:

- Risk Advisor observes;
- Harness executes normally;
- the user/Agent remains the execution authority;
- Online Correction remains advisory only.

Phase 13 MUST NOT introduce:

- Tool blocking;
- automatic retry/replan;
- Tool input rewriting;
- automatic cancellation;
- new Run creation;
- Approval/Risk mutation;
- Agent/model context injection from Online Correction;
- new F3/F4 Finding families;
- changed F1/F2 predicates;
- changed postcondition adapters;
- Pattern/Guidance correction authority;
- Harness Core changes.

If the campaign discovers a product defect or useful new coverage opportunity, preserve evidence and return to a separate architecture/maintenance task before changing product code.

## 4. Validation model: two truth layers

A critical distinction is required.

### 4.1 Frozen-contract truth

This asks:

> Under the already accepted F1/F2 specification, should the current Risk Advisor emit a Finding?

This truth is deterministic and must be generated independently from the observed Risk Advisor output.

Examples:

- exact same operation fails twice with the same normalized signature -> F1 expected;
- changed operation fingerprint -> F1 not expected under V1;
- supported high/medium postcondition mismatch -> F2 expected;
- unsupported/UNKNOWN/low-quality verification -> F2 not expected.

Frozen-contract evaluation yields:

- TP — expected Finding emitted correctly;
- FP — Finding emitted when frozen contract says it must not;
- FN — Finding required by frozen contract but missing;
- TN — no Finding and none required.

### 4.2 Product-opportunity truth

This asks a broader question:

> Would a competent user benefit from an advisory here even though the current F1/F2 contract may not cover it?

Examples:

- modified-command retries repeatedly hit the same underlying failure;
- several different commands make no progress toward one goal;
- exit 0 occurs but the user's higher-level goal remains false outside a supported adapter;
- repeated permission escalation;
- oscillation between two failing strategies;
- stale or confusing advisory timing.

These are **coverage opportunities**, not automatically frozen-contract false negatives.

Required label:

`OUT_OF_SCOPE_USEFUL_WARNING_CANDIDATE`

This prevents Phase 13 from falsely declaring the accepted conservative V1 implementation defective merely because broader future intelligence is desirable.

## 5. Independent truth requirement

Risk Advisor output MUST NOT be used to generate its own expected labels.

Truth sources may include:

- predeclared scenario manifest;
- exact Tool input/result;
- independent workspace state checks;
- independent filesystem hashes;
- independent local Git state;
- explicit expected exit/result class;
- explicit expected postcondition;
- deterministic scenario-specific oracle;
- bounded human review for product-opportunity labels.

Do not derive “expected F1/F2” from:

- `riskAdvisorLiveCorrection` Finding output;
- Online Correction Browser DTO;
- advisory UI text;
- Risk Advisor internal diagnosis output.

A campaign that grades Risk Advisor using Risk Advisor's own output is invalid.

## 6. Three workload lanes

Phase 13 should use three distinct lanes because they answer different questions.

### Lane A — Deterministic Ground-Truth Campaign

Purpose:

- high-volume precision/recall validation;
- reproducible defect localization;
- exact current-contract evaluation.

Harness ToolRuntime executes controlled real operations inside disposable workspaces.

Scenario families should include:

1. normal successful filesystem operations;
2. first isolated failure;
3. exact repeated same-signature failure;
4. success breaking an exact retry chain;
5. changed-command retry;
6. changed-argument retry;
7. alternating failures;
8. supported mkdir/copy/branch-switch/node-resolve postconditions;
9. matched postconditions;
10. intentionally controlled mismatched postconditions where a safe deterministic fault fixture is required;
11. unsupported/UNKNOWN verification;
12. Session disposal between operations;
13. TTL/eviction boundary cases;
14. multiple Findings in one Session;
15. F2 conflict/saturation sequences;
16. cross-Session independence.

Lane A should be deterministic and seeded. Re-running the same manifest must reproduce the same operation plan and truth labels.

### Lane B — Real Agent Task Campaign

Purpose:

- discover natural command variation and higher-level failure patterns;
- observe whether advisories are useful in actual Agent-driven execution;
- discover out-of-scope warning candidates.

Harness runs actual Agent tasks in a disposable synthetic repository/workspace.

Recommended task families:

- create/edit/copy/move/delete local files;
- repair a broken small project;
- inspect and modify local Git state;
- create/switch local branches;
- resolve intentionally broken imports/dependencies using local fixtures;
- diagnose missing files;
- fix failing local tests;
- manipulate nested directories;
- execute multi-step shell tasks;
- recover from intentionally planted benign errors;
- complete tasks where one strategy fails and Agent changes approach.

No remote Git push.
No package publication.
No production service.
No credentials.
No system-directory mutation.
No valuable repository.

Real-provider execution is allowed only when the user's already configured Harness provider route is intentionally selected for this campaign. Phase 13 must not create, rotate, print, or alter credentials.

Provider/network/model failures must be labeled environment/provider evidence unless Risk Advisor itself handles them incorrectly.

### Lane C — Lifecycle / Concurrency / Soak Campaign

Purpose:

- long-lived state validation;
- boundedness;
- stale/cross-Session Finding detection;
- HMR/reconnect lifecycle;
- advisory disappearance/reappearance correctness.

Scenario classes:

- one long-lived Session with many operations;
- many short Sessions;
- concurrent Sessions;
- Session disposal during/after findings;
- connection reset;
- client remount;
- Host/plugin HMR;
- repeated start/stop of advisory surfaces;
- Finding TTL expiry;
- global/per-Session capacity pressure;
- association pressure;
- F2 tombstone pressure/saturation;
- idle periods followed by resumed execution.

Lane C is specifically looking for:

- stale advisory;
- duplicate advisory;
- wrong Session;
- resurrected Finding;
- leaked listener/subscription;
- unbounded state;
- lifecycle crash;
- native Harness execution disruption.

## 7. Initial campaign scale

Phase 13 should be meaningfully larger than the focused test suite.

Recommended first frozen campaign target:

### Lane A
- at least 300 scenario instances;
- at least 1,500 Tool executions;
- at least 12 scenario families;
- deterministic manifest and seed;
- both expected-Finding and expected-no-Finding cases.

### Lane B
When real Agent/provider execution is explicitly available:
- at least 50 complete Agent tasks;
- at least 10 task families;
- multiple tasks that naturally require retry/recovery;
- each task uses a fresh disposable workspace or resettable snapshot.

If no provider route is intentionally available, Lane B may be reported as `PROVIDER_NOT_RUN`; do not fabricate Agent coverage.

### Lane C
- at least 2,000 Tool executions in aggregate;
- at least 20 Session lifecycles;
- at least one long-lived Session with >=500 operations;
- concurrent-Session pressure;
- repeated connection/client lifecycle cycles;
- bounded capacity/TTL pressure.

Exact implementation batching and process limits must be frozen in Phase 13.1 before execution.

## 8. Disposable environment

All mutation-heavy scenarios run only in a dedicated validation root.

Suggested shape:

```
risk-advisor-runtime-validation/
  campaign-manifest.json
  workspaces/
    lane-a/
    lane-b/
    lane-c/
  evidence/
  reports/
```

Requirements:

- no production repository;
- no personal documents;
- no credentials;
- no system paths;
- no cloud resources;
- no remote Git origin;
- no package publication;
- no destructive database targets.

Each scenario must have an explicit workspace boundary.

Destructive-looking scenarios may affect only files created inside the validation root.

## 9. Campaign Truth Ledger

Phase 13 requires a separate validation ledger owned by the campaign harness, not by Risk Advisor.

This is test evidence, not product persistence.

Recommended record per scenario/operation:

```json
{
  "campaignRunId": "...",
  "scenarioId": "...",
  "lane": "A|B|C",
  "sessionLabel": "...",
  "step": 12,
  "operationFamily": "...",
  "expectedContract": {
    "f1": "EXPECTED|NOT_EXPECTED|NOT_APPLICABLE",
    "f2": "EXPECTED|NOT_EXPECTED|NOT_APPLICABLE"
  },
  "actualFindingKinds": [],
  "oracle": {
    "processSuccess": true,
    "postconditionSatisfied": true,
    "goalSatisfied": "TRUE|FALSE|UNKNOWN"
  },
  "classification": [],
  "opportunityLabel": "NONE|OUT_OF_SCOPE_USEFUL_WARNING_CANDIDATE",
  "environmentStatus": "OK|ENVIRONMENT_FAILURE",
  "notes": []
}
```

Do not store raw secrets, full prompts, credentials, arbitrary stdout/stderr, or unrelated user data.

Opaque/session/run identifiers in campaign artifacts should be synthetic labels where exact native IDs are not necessary for defect localization.

## 10. Capture timing

The campaign must capture Risk Advisor state closely enough that TTL/capacity eviction does not erase evidence before grading.

For deterministic Lane A/C workloads, preferred capture is immediately after each relevant settled operation and after asynchronous verifier settlement where applicable.

For real Browser/Agent Lane B, bounded polling/observation may be used, but the campaign must distinguish:

- “Finding not emitted”
from
- “Finding may have existed but observer missed it”.

An observation mechanism with known gaps cannot be used to declare a frozen-contract FN.

Phase 13.1 must freeze the exact capture seam before high-volume execution.

## 11. Metrics

At minimum report:

### Frozen-contract metrics

Per F1 and F2:

- expected positive count;
- expected negative count;
- TP;
- FP;
- FN;
- TN;
- precision;
- recall;
- duplicate Finding count;
- wrong-session Finding count;
- stale-after-disposal count.

A denominator of zero must be reported as N/A, not as 100%.

### Product-discovery metrics

- out-of-scope useful-warning candidates;
- repeated candidate pattern count;
- scenario families involved;
- user-visible low-value/noisy advisory count;
- advisory latency observations where measurable;
- stale/flicker/duplicate observations;
- environment/provider failures;
- campaign harness failures.

Do not collapse product-opportunity candidates into F1/F2 recall.

## 12. Defect classification

### P0 — Authority / privacy / corruption blocker

Examples:

- Risk Advisor changes Tool execution;
- wrong Session advisory;
- sensitive/raw prohibited data reaches Browser DTO/UI;
- stale advisory causes cross-task confusion;
- Harness/profile/workspace corruption attributable to Risk Advisor;
- unbounded resource leak;
- native Approval authority altered.

Action:

Stop affected campaign lane immediately.

Status:

`PHASE13_BLOCKED_P0_PRODUCT_DEFECT`

### P1 — Frozen-contract correctness defect

Examples:

- deterministic F1/F2 false positive;
- deterministic F1/F2 false negative;
- duplicate same-identity user-visible Finding;
- terminal conflict/saturation invariant violation;
- lifecycle resurrection.

Action:

Preserve exact minimal reproducer and stop code-changing activity.

Status:

`PHASE13_BLOCKED_P1_PRODUCT_REPAIR_REQUIRED`

### P2 — Coverage opportunity

Examples:

- changed-command same-root failure not detected;
- goal-level no-progress pattern;
- unsupported but valuable postcondition family;
- useful higher-level warning absent by design.

Action:

Continue campaign, aggregate evidence, do not patch V1.

Label:

`OUT_OF_SCOPE_USEFUL_WARNING_CANDIDATE`

### P3 — UX/noise issue

Examples:

- correct but low-value advisory;
- wording/timing/layout annoyance;
- excessive repeated user attention without correctness violation.

Action:

Record and continue unless severe enough to impair use.

### ENVIRONMENT

Examples:

- provider outage;
- package-manager failure;
- unrelated Harness defect;
- OS-specific command unavailable;
- test harness failure.

Do not misclassify as Risk Advisor product defect.

## 13. Stop conditions

The campaign must stop or quarantine a lane when:

- any P0 occurs;
- any reproducible P1 occurs;
- truth ledger integrity is compromised;
- campaign workspace containment cannot be proven;
- observer/capture failure makes FN claims unreliable;
- Harness SHA or Risk Advisor executable drifts;
- product source changes during a run.

Do not continue collecting thousands of observations after a known correctness blocker if those observations would be contaminated by the same defect.

P2/P3 findings do not automatically stop the campaign.

## 14. No live product repair

During a campaign run:

Do not modify:

- `src/`;
- product tests;
- package/config semantics;
- accepted F1/F2 logic;
- Harness Core.

If a P0/P1 defect is found:

1. freeze the exact campaign run;
2. preserve the smallest reproducer;
3. classify the defect;
4. return to architecture review;
5. create a separate Repair task;
6. test and accept the repair;
7. start a new campaign run ID.

Never patch the product in place and continue the same campaign as though the baseline were unchanged.

## 15. Phase 13 proposed structure

### Phase 13.1 — Validation Harness & Truth Contract

Freeze and implement only campaign infrastructure:

- scenario manifest schema;
- truth ledger schema;
- independent oracles;
- capture seam;
- disposable workspace manager;
- deterministic seed/replay;
- summary/classification tooling.

No Risk Advisor product semantics change.

### Phase 13.2 — Deterministic High-Volume Campaign

Run Lane A at frozen scale.

Primary output:

- F1/F2 precision/recall;
- minimal reproducers for any P1;
- first coverage-opportunity inventory.

### Phase 13.3 — Real Agent Task Campaign

Run Lane B with an intentionally selected existing provider route, if available.

Primary output:

- natural recovery/retry traces;
- out-of-scope opportunity clusters;
- advisory usefulness/noise observations.

No credential mutation.

### Phase 13.4 — Lifecycle / Concurrency / Soak

Run Lane C.

Primary output:

- boundedness/lifecycle evidence;
- stale/duplicate/wrong-session counts;
- HMR/reset/session-pressure findings.

### Phase 13.5 — Defect Triage & Next-Authority Decision

Aggregate all campaign evidence.

Possible outcomes:

- `PHASE13_RUNTIME_VALIDATION_CLEAN`
- `PHASE13_PRODUCT_REPAIR_REQUIRED`
- `PHASE13_COVERAGE_EXPANSION_CANDIDATES_IDENTIFIED`
- `PHASE13_ENVIRONMENT_BLOCKED`

Only after this triage should the project decide whether to:
- repair current F1/F2;
- add new deterministic Finding families;
- improve verifier coverage;
- explore experience-guided correction;
- design active intervention.

## 16. Campaign artifacts

Recommended path:

`docs/tasks/Phase13-runtime-validation-defect-discovery/`

Architecture artifacts:

- `Phase13_Runtime_Validation_Architecture_Preflight.md`
- future `Phase13_1_Validation_Harness_Truth_Contract_Freeze.md`
- future implementation instructions.

Generated high-volume raw evidence should **not** be committed blindly to Git.

Commit only bounded summaries, schemas, representative minimal reproducers, hashes/manifests, and final reports.

Large raw campaign evidence should remain in a gitignored local validation artifact directory unless a later Freeze explicitly defines a bounded archive policy.

## 17. Relationship to prior Deployment Pilot

The prior V1 Deployment Pilot asked whether the Browser approval advisory was useful in a small number of real interactions.

Phase 13 is different:

- much higher operation volume;
- Online Correction F1/F2 focus;
- independent truth ledger;
- precision/recall;
- repeated workload generation;
- long-lived state and concurrency;
- systematic defect discovery.

However it inherits two Pilot principles:

1. real-world validation is not replaced by another unit-test count;
2. observation and product repair must remain separate workflows.

## 18. Preflight conclusion

Phase 13 should begin now.

The next step is **not** to let an Agent randomly mutate a workspace without instrumentation.

The next step is Phase 13.1:

> build a deterministic validation harness and independent truth contract so that thousands of Harness operations produce trustworthy defect evidence rather than just a large log.

Once Phase 13.1 is frozen and accepted, Codex can begin the high-volume campaigns.
