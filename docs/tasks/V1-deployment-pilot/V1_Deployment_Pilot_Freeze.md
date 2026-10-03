# Risk Advisor V1 Deployment Pilot Freeze

## Outcome

`V1_DEPLOYMENT_PILOT_FROZEN_READY_FOR_PREPARATION`

Authority:

- V1 closed acceptance: `ae8273df00d2ac1e1dc18f0fd210eae0a4242a60`
- Deployment Pilot Preflight: `5e02599157ceaf55bef08df2089528a77ba793c1`
- accepted product executable: `1fa84e2a8a9de465cdb85fef928ec9e19086bba2`
- package version: `0.1.0-r1`
- pinned Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887`

This task is a real deployment/usability Pilot, not a new product phase.

---

## 1. Two-stage Pilot

The Pilot is intentionally split.

### Stage A — Automated preparation

Codex may:

- inspect the local Harness/profile state read-only;
- identify the actual target Web profile;
- snapshot bounded mutable profile metadata;
- build/pack the accepted local Risk Advisor;
- install it into the selected real profile;
- perform controlled restart/health checks when safe and authorized by the frozen rules;
- prepare the disposable Pilot workspace;
- verify Browser/Host package activation;
- generate the observation sheet.

Stage A outcome:

`V1_DEPLOYMENT_PILOT_READY_FOR_USER_OBSERVATION`

### Stage B — Human observation

The user personally uses the real Browser approval flow for the frozen scenario set and records observations.

This is mandatory because Pilot success is about human decision usefulness, not DOM/test assertions.

After the user observations are available, Codex may finalize the Pilot Execution Report and, if requested, retain or remove the plugin.

Do not replace Stage B with browser automation and call it usability evidence.

---

## 2. No product-source change

Pilot preparation is installation/observation only.

Do not modify:

- `src/`;
- product tests;
- Risk Advisor runtime configuration defaults;
- accepted Phase-10/Closure evidence.

If a real product defect appears:

`V1_DEPLOYMENT_PILOT_BLOCKED_PRODUCT_REPAIR_REQUIRED`

Stop Pilot product changes and return to a separate maintenance workflow.

---

## 3. Read-only discovery gate

Before any real-profile mutation, determine:

- exact local Harness checkout;
- exact Harness SHA;
- `DSH_HOME`;
- all available profiles;
- which profiles are Web/base-backed;
- currently running Harness processes and their profile if determinable;
- candidate actual user Web profile;
- existing Risk Advisor package/bundle state;
- profile HMR capability;
- profile package manager health;
- current mutable control-file hashes.

No credential reads.

No conversation/session content reads.

No provider calls.

### Unique-profile rule

Proceed only when one actual Pilot target is established by local evidence.

If ambiguous:

`V1_DEPLOYMENT_PILOT_PROFILE_SELECTION_REQUIRED`

Report candidate names and stop before mutation.

---

## 4. Harness compatibility gate

Target Harness checkout must equal:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

If not:

`V1_DEPLOYMENT_PILOT_HARNESS_VERSION_CHANGED`

Stop before install.

Do not downgrade/upgrade/checkout Harness as part of Pilot.

---

## 5. Active-profile restart gate

If the selected target profile is currently running, first determine whether installing the bundle can safely HMR without a package-generation restart.

Pinned Plugin Manager documentation states package replacements require restart; new profile operations may apply through HMR, but a Pilot should observe a clean fresh boot before UX qualification.

Therefore a controlled fresh start is required before Stage B.

Do not kill a user's active Harness process automatically.

If the selected profile is currently active and cannot be cleanly stopped through its public lifecycle without disrupting user work:

`V1_DEPLOYMENT_PILOT_ACTIVE_PROFILE_RESTART_REQUIRED`

Stop after preparation/snapshot and tell the user which profile/process must be closed.

No force-kill.

---

## 6. Pre-install recovery snapshot

Before installation create a bounded Pilot backup directory outside the target profile.

Record/copy only profile control files needed for recovery evidence, when present:

- `package.json`;
- `pnpm-lock.yaml`;
- `pnpm-workspace.yaml`;
- `cordis.patch.yml`.

Also record:

- SHA-256 hashes;
- file presence;
- selected bundle list;
- Risk Advisor installed/selected state.

Do not copy:

- `.env`;
- credentials files;
- session logs;
- conversations;
- arbitrary app data;
- user projects.

Backup path itself must not be committed if it contains machine-specific absolute paths.

Execution Report may record sanitized relative labels and hashes.

---

## 7. Install contract

Build and pack the local accepted repository.

Install by supported profile bundle path, equivalent to:

`dsh plugin --profile <target> add <absolute-local-tarball>`

No registry.

No git URL.

No global install.

Expected after install:

- package dependency present exactly once;
- Risk Advisor selected bundle exactly once;
- no duplicate Risk Advisor Loader row;
- Host activation healthy;
- Client manifest includes Risk Advisor client contribution;
- profile still boots.

If already installed at the same accepted local version, do not duplicate installation. Verify existing package identity and continue only if it matches the accepted package contents sufficiently for the Pilot.

If a different Risk Advisor build/version is already installed, stop:

`V1_DEPLOYMENT_PILOT_EXISTING_INSTALL_CONFLICT`

---

## 8. Pilot configuration

Initial Pilot must be deterministic/provider-free:

- Fast Judge disabled;
- Deep Judge disabled;
- no new provider route;
- no credential change;
- no global permission-policy change.

Use the profile's normal Native Approval behavior.

If no safe real approval can be triggered under the user's normal/session-level approval policy, stop and report rather than weakening global policy.

---

## 9. Pilot workspace

Create one disposable local workspace separate from valuable repositories.

Suggested shape:

```text
risk-advisor-v1-pilot/
  README.txt
  note.txt
  reversible/
  disposable-delete/
  .git/
```

Initialize local Git only if useful for evidence/reversibility.

No remote.

No secrets.

No package publish configuration.

All approved mutations must remain inside this workspace.

---

## 10. Real Browser requirement

Stage B must use the actual Web UI served by the selected profile.

Required visible invariants:

- Native Approval Panel present;
- Risk Advisor additive card present when an assessment is available;
- Native Reject/Allow once controls remain owned by Harness;
- command/tool detail remains visible;
- Risk Advisor does not replace composer;
- no duplicate RA card;
- no raw args/secret dump.

Screenshots are optional evidence and must be reviewed for secrets/private content before storage.

Do not commit screenshots by default.

---

## 11. Frozen scenario set

Attempt six scenarios, but Pilot may complete with at least four useful observations when a scenario cannot naturally trigger under the selected profile.

### A — ordinary bounded approval

Harmless operation.

Purpose: low-noise card and layout.

### B — reversible workspace write/edit

Purpose: resources/reversibility/evidence wording.

### C — harmless shell composition

A harmless chained command fully contained in the Pilot workspace.

Purpose: shell semantics/explanation.

### D — risky-looking contained operation

Only disposable Pilot target.

Prefer Native Reject.

Purpose: high-salience reason and decision support.

### E — benign failure then retry

Controlled missing file/invalid local target followed by a corrected retry.

Purpose: failure/retry context.

### F — honest degraded/unknown

Select a safe operation whose evidence is insufficient.

Purpose: verify unknown/degraded is understandable and not presented as safe.

Optional G — native reject/cancel and next fresh approval.

---

## 12. Safety requirements for scenarios

Never execute against real valuable data.

For Scenario D, the command/path must be inspected before use and constrained to a disposable Pilot artifact.

Never use:

- system directories;
- home-directory cleanup;
- actual credentials;
- real remote repositories;
- cloud resources;
- production endpoints;
- package publish;
- DB destructive actions.

Reject rather than execute if containment cannot be proven.

---

## 13. Human observation template authority

The committed:

`Pilot_Observation_Template.md`

is the evidence schema for Stage B.

The user may fill it manually in Markdown or communicate equivalent observations in chat.

Do not fabricate user ratings.

Do not mark subjective fields PASS based on automated DOM checks.

---

## 14. Blocker classification

### Product blocker

Any of:

- wrong approval-card correlation;
- Native Approval broken/hidden;
- secret/raw-sensitive exposure;
- duplicate/stale card crossing operations;
- Browser/profile crash caused by Risk Advisor;
- Risk Advisor answers approval;
- inability to remove/disable without leaving target profile unusable.

Status:

`V1_DEPLOYMENT_PILOT_BLOCKED_PRODUCT_REPAIR_REQUIRED`

### Environment blocker

Examples:

- pinned Harness mismatch;
- unrelated broken profile;
- port/browser issue unrelated to RA;
- package-manager/profile corruption predating install.

Status:

`V1_DEPLOYMENT_PILOT_ENVIRONMENT_BLOCKED`

### UX findings

Clarity/ordering/wording/spacing/minor flicker are recorded without reopening V1 automatically.

---

## 15. Retention decision

No automatic uninstall at the end of Stage B.

User chooses:

- `RETAIN`;
- `REMOVE`.

### RETAIN

Record installed package/bundle state and leave the accepted V1 in the target profile.

### REMOVE

Use supported plugin manager/CLI removal.

Then restart/refresh as required and verify:

- bundle absent;
- client contribution absent;
- profile boots;
- Native Approval normal.

Do not blindly restore the backup files.

---

## 16. Removal failure

Official Plugin Manager documentation warns that failed removal can leave partial state.

If removal fails:

`V1_DEPLOYMENT_PILOT_ROLLBACK_BLOCKED`

Stop.

Capture current profile control-file hashes and plugin-manager diagnostics.

Do not:

- delete node_modules manually;
- overwrite the live profile with backup files automatically;
- run broad cleanup;
- reset user state.

A separate bounded recovery decision is required.

---

## 17. Pilot reporting

Stage A report must contain only environment/deployment facts and end at:

`V1_DEPLOYMENT_PILOT_READY_FOR_USER_OBSERVATION`

Stage B final report records:

- target profile identity (sanitized name only where appropriate);
- accepted package/source identity;
- before/after control-file hashes;
- install/restart health;
- Browser visibility;
- scenario observation summary;
- blocker/major/minor findings;
- user retain/remove decision;
- final installed state;
- no provider/credential changes;
- no Harness Core modification.

No fresh Canonical Full is required unless product source changes, which would end this Pilot and start a maintenance task.

---

## 18. Completion states

Valid final Pilot states:

- `V1_DEPLOYMENT_PILOT_COMPLETE_RETAINED`
- `V1_DEPLOYMENT_PILOT_COMPLETE_REMOVED`
- `V1_DEPLOYMENT_PILOT_BLOCKED_PRODUCT_REPAIR_REQUIRED`
- `V1_DEPLOYMENT_PILOT_ENVIRONMENT_BLOCKED`
- `V1_DEPLOYMENT_PILOT_PROFILE_SELECTION_REQUIRED`
- `V1_DEPLOYMENT_PILOT_ACTIVE_PROFILE_RESTART_REQUIRED`
- `V1_DEPLOYMENT_PILOT_ROLLBACK_BLOCKED`

There is no `ACCEPTED` milestone state because V1 is already accepted.

---

## 19. Frozen conclusion

Deployment Pilot is a real-profile, real-Browser usability qualification.

Automation owns safe deployment preparation.

The human user owns the subjective decision-usefulness evidence.

No Pilot result silently changes the already accepted V1 product baseline.
