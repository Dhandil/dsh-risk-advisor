# Risk Advisor V1 Deployment Pilot Preflight

## Outcome

`V1_DEPLOYMENT_PILOT_PREFLIGHT_COMPLETE_READY_FOR_FREEZE`

This task starts **after** project-level V1 closure.

It is not Phase 11, not V2, and not a new product-development phase.

Current accepted authority:

- V1 project status: `RISK_ADVISOR_V1_CLOSED`
- V1 Final Closure Acceptance: `ae8273df00d2ac1e1dc18f0fd210eae0a4242a60`
- accepted product executable: `1fa84e2a8a9de465cdb85fef928ec9e19086bba2`
- Closure Validation SHA: `5c2aa56b4c57f00e8ccfc65622f05773f1846766`
- pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`
- package version: `0.1.0-r1`

The Pilot exists to validate real-user experience in an actual Harness Web profile.

---

## 1. Pilot question

Engineering acceptance already proved that V1 is structurally correct, bounded, installable, restartable, and non-authoritative.

The Pilot asks a different question:

> When Risk Advisor is installed in the user's real Harness Web profile and used through the real Browser UI, is it understandable, unobtrusive, timely, and useful during actual approval decisions?

The Pilot is therefore a **product-usage qualification**, not another correctness phase.

---

## 2. What this Pilot must validate

The Pilot owns five user-facing questions.

### P1 — Deployment reality

Does the accepted external bundle install into the actual target profile without breaking that profile?

### P2 — Browser reality

Does the Risk Advisor card actually appear in the real Browser approval UI beside Native Approval controls?

### P3 — Decision usefulness

Do the displayed risk reasons, uncertainty, evidence, failure context, and safer alternatives help a human understand the operation?

### P4 — Interaction quality

Does the card arrive/update without confusing flicker, stale state, duplicate cards, blocked buttons, or noticeable UI disruption?

### P5 — Operational safety

Can the plugin be enabled, restarted, used, and if desired removed without modifying Harness Core or silently corrupting profile state?

---

## 3. Pilot is not another automated acceptance suite

Do not repeat Phase-10/Final-Closure proofs merely to obtain more PASS counts.

The following are already accepted and should be treated as inherited product guarantees:

- Native Approval authority;
- Host/Client HMR;
- prompt-injection structural containment;
- secret redaction;
- shell fail-closed logic;
- Evidence/Deep lifecycle;
- resource bounds;
- external-bundle cold start;
- installed-profile ToolRuntime -> Native Approval -> RA BOUND release smoke;
- local product benchmark.

Pilot automation should only establish deployment health and collect reproducible observations needed to support real use.

---

## 4. Real profile mutation is materially different from prior validation

All prior release gates used disposable profiles.

Deployment Pilot intentionally targets a real user profile.

Pinned Harness Plugin Manager semantics state that installed profile bundles:

- persist across sessions;
- affect every session using that profile;
- execute Host code in-process outside the workspace sandbox;
- may HMR immediately when the profile supports HMR;
- can be removed through the plugin manager/CLI;
- may leave partial state if a removal operation fails.

Therefore installation must not occur until a read-only inventory and recoverable snapshot exist.

---

## 5. Target profile discovery

Before any mutation, Codex must discover locally:

- exact `DSH_HOME`;
- local Harness checkout SHA;
- available profiles;
- which profile is the user's actual Web profile;
- whether that profile is currently running;
- whether Risk Advisor is already installed;
- whether the profile already contains user-authored Risk Advisor config;
- whether HMR is enabled;
- current profile manifest/bundle selection;
- current `cordis.patch.yml`;
- current lock/build-approval metadata needed for exact rollback evidence.

Do not infer the target from a profile name alone.

If exactly one actively used Web profile cannot be established from local evidence, stop:

`V1_DEPLOYMENT_PILOT_PROFILE_SELECTION_REQUIRED`

and report the candidate profile names/paths without modifying them.

Do not guess.

---

## 6. Pre-install snapshot

Before installation, capture a bounded manifest of the target profile.

Record hashes/copies of only the mutable profile control files required to prove before/after state, such as when present:

- `package.json`;
- `pnpm-lock.yaml`;
- `pnpm-workspace.yaml`;
- `cordis.patch.yml`;
- plugin-manager relevant metadata.

The snapshot must be stored outside the target profile in a task/pilot backup area or other bounded local backup location.

Do not copy:

- credentials;
- conversation history;
- session logs;
- arbitrary user project files;
- provider secrets.

Record file hashes and presence/absence.

Never print credential values.

---

## 7. Installation source

Pilot installation must use the accepted local Risk Advisor repository/package.

Preferred source:

```text
build accepted repository
-> local pnpm pack
-> dsh plugin --profile <target> add <absolute-local-tarball>
```

No registry publication or registry install.

Do not install a different version with the same package name.

Before installation verify:

- repository product source has no drift from accepted product baseline where applicable;
- package version remains `0.1.0-r1`;
- Harness checkout is still the pinned SHA unless Pilot explicitly stops for compatibility review.

If Harness is no longer pinned, stop:

`V1_DEPLOYMENT_PILOT_HARNESS_VERSION_CHANGED`

Do not silently qualify a newer Harness in this Pilot.

---

## 8. Default Pilot mode

Pilot starts provider-free.

Frozen initial configuration:

```text
Fast Judge = disabled
Deep Judge = disabled
Evidence/local deterministic paths = normal product behavior
Native Approval = unchanged
```

Reason:

The first Pilot should isolate Risk Advisor product/UI behavior from provider latency, provider availability, credentials, and Deep Judge dependency questions.

A real-provider qualification is a separate optional follow-up only after the deterministic Pilot is useful.

Do not request or alter provider credentials.

---

## 9. Safe Pilot workspace

Real profile does not mean real valuable data must be put at risk.

Create a disposable workspace dedicated to the Pilot.

Requirements:

- clearly named pilot directory;
- contains only synthetic files/repository state;
- may be deleted after the Pilot;
- no production repository;
- no personal documents;
- no credentials;
- no system directories;
- no remote Git push target.

Any operation that is intended to be approved must be safe inside this disposable workspace.

Any intentionally dangerous-looking operation must either:

- target only disposable pilot artifacts; or
- be rejected before execution.

---

## 10. Pilot scenario set

Use a small scenario set rather than exhaustive security testing.

### Scenario A — ordinary bounded operation

Goal:

Validate normal card placement and low-noise presentation.

Use a harmless operation against the disposable workspace that causes a Native Approval in the actual profile/policy.

Observe:

- card appears once;
- summary matches the operation;
- Native Reject/Allow once remain visible and usable;
- no raw argument dump;
- no confusing warning inflation.

If the current profile policy does not request approval for ordinary reads, choose another harmless operation that naturally triggers approval. Do not weaken global policy merely to force this scenario.

### Scenario B — bounded write/change

Use a reversible write/edit inside the disposable workspace.

Observe:

- target/resource understandable;
- reversibility/evidence wording understandable;
- recommendation does not imply execution authority;
- successful approval still belongs to Native Approval.

### Scenario C — shell ambiguity/chaining

Use a harmless chained command whose effects stay inside the disposable workspace.

Example intent:

```text
read/status-like command
&&
harmless second command
```

The exact command must be reviewed for platform safety before use.

Observe:

- Risk Advisor notices shell composition/ambiguity where expected;
- card does not claim a safe first segment makes the entire command safe;
- explanation is understandable rather than parser jargon.

### Scenario D — clearly risky but safely contained

Use a destructive-looking operation whose only possible target is a disposable pilot artifact.

Prefer rejecting it in Native Approval.

Observe:

- primary reason is visible quickly;
- target scope is understandable;
- Reject remains a Native control;
- no auto-rejection occurs;
- the card does not overstate TOCTOU certainty.

### Scenario E — failure -> retry context

Create one deterministic benign failure in the Pilot workspace, then retry the same goal in a controlled way.

Do not widen to system-level permissions merely to exercise escalation.

Observe:

- failure context appears when relevant;
- retry relationship is understandable;
- previous failure does not automatically turn the new action into High Risk;
- no stale prior approval is reused.

### Scenario F — unavailable/degraded state

Trigger or observe one safe unavailable/degraded condition without breaking the profile, for example by selecting an operation whose evidence is intentionally insufficient.

Observe:

- UI says unknown/unavailable/degraded honestly;
- no UNKNOWN -> LOW presentation;
- Native Approval remains fully usable.

---

## 11. Optional scenario — cancellation

If naturally available in the real Browser flow, cancel or reject one approval.

Observe:

- Risk Advisor closes with the native decision;
- no late card resurrects the approval;
- next approval is fresh.

This is useful but should not require artificial runtime fault injection.

---

## 12. Do not use unsafe Pilot scenarios

Do not Pilot against:

- real system configuration;
- `Program Files`;
- user home cleanup;
- real credential files;
- real remote Git push/force push;
- package publication;
- database deletion;
- cloud resources;
- production services;
- actual elevated system changes.

Hardening coverage for those semantics already exists in tests.

A UX Pilot does not need to execute real destructive behavior.

---

## 13. Manual observation is first-class evidence

Automated tests cannot determine whether the card is useful to the user.

For each scenario record a short observation sheet.

Required fields:

```text
scenario
operation summary
Native Approval visible?          yes/no
Risk Advisor card visible?        yes/no
card duplicated?                  yes/no
information arrived in time?      yes/no
primary reason understandable?    yes/no + note
uncertainty understandable?       yes/no + note
recommendation wording useful?    yes/no + note
safer alternative useful?         yes/no/not shown + note
visual/layout issue?               none / note
stale/flicker issue?               none / note
unexpected false positive?         none / note
unexpected missing warning?        none / note
user decision                      allow/reject/cancel
overall usefulness                 1-5
```

Do not turn the 1–5 score into an automated product acceptance threshold by itself.

The notes matter more than the aggregate number.

---

## 14. Pilot success criteria

Pilot is successful when:

- install succeeds on the actual selected Web profile;
- profile restarts normally;
- Browser loads normally;
- RA client contribution is visible in real approval UI;
- Native Approval controls remain intact;
- at least four scenarios produce usable observations;
- no blocker-class lifecycle/UI/privacy/authority defect appears;
- no user data or profile corruption occurs;
- uninstall/retain decision is explicit.

Aesthetic or wording issues may be logged as Pilot findings without reopening V1 unless they materially impair decision use.

---

## 15. Defect classification

Pilot findings must be classified before changing code.

### BLOCKER

Examples:

- Browser cannot start;
- plugin breaks target profile;
- Native Approval buttons disappear or stop working;
- wrong approval/card correlation;
- stale assessment shown for another operation;
- secret/raw sensitive data visible;
- duplicate cards/listeners;
- approval is answered by Risk Advisor;
- uninstall/disable leaves profile unusable.

Outcome:

`V1_DEPLOYMENT_PILOT_BLOCKED_PRODUCT_REPAIR_REQUIRED`

No ad-hoc fix in the real profile.

### MAJOR

Examples:

- important warnings consistently too late;
- card hides critical information;
- common operation materially misclassified;
- repeated misleading recommendation;
- severe visual/layout break.

Outcome:

Pilot can stop for a bounded V1 maintenance decision.

### MINOR

Examples:

- wording could be clearer;
- spacing/order preference;
- low-value detail;
- minor flicker with no stale decision state.

Outcome:

Record in Pilot findings/backlog. Do not automatically reopen V1.

### ENVIRONMENT

Examples:

- unrelated profile plugin failure;
- Harness version drift;
- browser/port conflict;
- local package manager issue;
- existing broken profile state.

Outcome:

Do not misclassify as a Risk Advisor defect.

---

## 16. No product changes during observation

The first Pilot run is observation-only with respect to product source.

Do not edit Risk Advisor `src/` while collecting Pilot evidence.

If a blocker/major product defect is found:

1. preserve exact observation;
2. stop Pilot;
3. uninstall/disable only as needed for safe recovery;
4. return to architecture/maintenance review;
5. fix in repository with focused proof;
6. re-run Pilot later.

Do not live-patch the installed package.

---

## 17. Retain vs remove after Pilot

At the end of the Pilot, the user chooses one of:

### RETAIN

Leave Risk Advisor installed in the real profile for normal deterministic use.

Record exact installed package/profile state.

### REMOVE

Use the supported plugin removal path.

After removal verify:

- Risk Advisor bundle absent;
- Browser contribution absent after restart;
- profile still starts;
- Native Approval remains normal;
- relevant profile control files changed only as expected.

Do not restore snapshots by blind file overwrite while Harness/plugin manager is running.

Snapshots are evidence/recovery aids, not the normal uninstall mechanism.

If supported removal fails, stop and preserve diagnostics.

---

## 18. Rollback rule

Because official plugin-manager documentation states failed removal may retain partial changes, rollback must be explicit.

If removal fails:

`V1_DEPLOYMENT_PILOT_ROLLBACK_BLOCKED`

Then:

- stop target profile;
- capture current manifest/lock/patch state;
- compare with pre-install snapshot;
- do not reset/delete package-manager state blindly;
- require a bounded recovery decision.

Do not use `git clean`, destructive filesystem wipe, or manual dependency deletion as an automatic fallback.

---

## 19. Real-provider qualification is separate

Do not enable Fast Judge/Deep Judge merely because deterministic Pilot passes.

If the deterministic Pilot is useful, a future optional task may be:

`V1_REVIEWER_QUALIFICATION_PILOT`

That task would separately evaluate:

- real provider route;
- perceived latency;
- model output usefulness;
- provider failure behavior;
- privacy/provider policy;
- cost.

It is not part of this Pilot.

---

## 20. Pilot artifacts

Use:

`docs/tasks/V1-deployment-pilot/`

Expected artifacts:

- `V1_Deployment_Pilot_Preflight.md`
- `V1_Deployment_Pilot_Freeze.md`
- `V1_Deployment_Pilot_Implementation_Instructions.md`
- `Pilot_Observation_Template.md`
- `Execution_Report.md`

Do not create another project Acceptance Report merely for a usability Pilot.

Recommended final Pilot outcomes:

- `V1_DEPLOYMENT_PILOT_COMPLETE_RETAINED`
- `V1_DEPLOYMENT_PILOT_COMPLETE_REMOVED`
- `V1_DEPLOYMENT_PILOT_BLOCKED_PRODUCT_REPAIR_REQUIRED`
- `V1_DEPLOYMENT_PILOT_ENVIRONMENT_BLOCKED`
- `V1_DEPLOYMENT_PILOT_PROFILE_SELECTION_REQUIRED`

---

## 21. Preflight conclusion

Risk Advisor V1 is already engineering-closed.

Deployment Pilot should not ask “does the architecture pass?”

It should answer:

> “When installed into the user's actual Web profile, does this advisory card improve real approval decisions without getting in the way?”

The Pilot must begin with read-only target-profile discovery and a recoverable profile snapshot, then install the accepted local package, run a small safe real-Browser scenario set, collect human observations, and explicitly retain or remove the plugin.

Next artifact:

`docs/tasks/V1-deployment-pilot/V1_Deployment_Pilot_Freeze.md`
