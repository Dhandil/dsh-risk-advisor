# Risk Advisor V1 Deployment Pilot — Stage A Implementation Instructions

## Required outcome

Prepare the real deployment Pilot safely and stop before subjective user observation.

Successful handoff:

`V1_DEPLOYMENT_PILOT_READY_FOR_USER_OBSERVATION`

Do not declare the Pilot complete.

Do not fabricate user observations.

Do not start reviewer qualification, V2, or Phase 11.

---

## 1. Sync authority

Sync `origin/main`.

Required baseline must include:

`33e7bab1825940d0db8a1c4dc5d316f74c0ce4c0`

Read in order:

1. `docs/tasks/V1-deployment-pilot/V1_Deployment_Pilot_Preflight.md`
2. `docs/tasks/V1-deployment-pilot/V1_Deployment_Pilot_Freeze.md`
3. `docs/tasks/V1-deployment-pilot/Pilot_Observation_Template.md`
4. V1 Final Closure Acceptance Report
5. current README
6. pinned Harness Plugin Manager documentation

The Deployment Pilot Freeze is authoritative.

Preserve user drift.

No reset/clean/force push.

---

## 2. Stage A only

This run owns only:

- read-only target-profile discovery;
- pre-install profile snapshot;
- local package build/pack;
- install into the uniquely identified real Web profile;
- clean profile restart/health verification when safe;
- real Browser availability verification;
- disposable Pilot workspace preparation;
- creation of a bounded Stage-A execution report.

Do not run the subjective scenarios on the user's behalf.

Do not decide RETAIN/REMOVE.

---

## 3. Read-only discovery first

Before changing anything, determine locally:

- Harness checkout path;
- Harness SHA;
- DSH_HOME;
- available profiles;
- profile manifests/bundles;
- which candidate is the actual user Web profile;
- currently running dsh/Harness processes where profile identity can be established;
- whether Risk Advisor is already installed;
- current package/bundle identity;
- HMR/profile manager availability.

Do not read credentials, conversations, session contents, or arbitrary user files.

### If target profile is ambiguous

Stop:

`V1_DEPLOYMENT_PILOT_PROFILE_SELECTION_REQUIRED`

Return candidate profile names and enough non-sensitive facts for the user to select one.

Do not mutate any profile.

---

## 4. Harness pin

Verify target Harness checkout:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

If different:

`V1_DEPLOYMENT_PILOT_HARNESS_VERSION_CHANGED`

Stop before install.

Do not checkout/reset/fetch/upgrade Harness.

---

## 5. Active profile handling

If the target profile is currently running:

- identify whether a clean public shutdown path is available;
- do not force-kill;
- do not interrupt active user work.

If a clean restart cannot be performed safely without user action, complete discovery + snapshot preparation only and stop:

`V1_DEPLOYMENT_PILOT_ACTIVE_PROFILE_RESTART_REQUIRED`

State what must be closed/restarted.

Do not install into an actively used profile and then leave a mixed old/new JavaScript generation for Stage B.

---

## 6. Pre-install snapshot

Create a bounded local Pilot backup directory outside the target profile.

Copy/hash only when present:

- target profile `package.json`;
- `pnpm-lock.yaml`;
- `pnpm-workspace.yaml`;
- `cordis.patch.yml`.

Record:

- SHA-256;
- existence;
- selected bundle list;
- installed Risk Advisor state.

Do not copy/read:

- .env;
- credentials;
- sessions/logs;
- conversations;
- user project contents.

The backup directory is local recovery evidence and must not be committed.

---

## 7. Accepted package source

Use this Risk Advisor repository only.

Verify:

- package version = `0.1.0-r1`;
- accepted V1 product source has no unexpected tracked `src/` drift from the closed baseline;
- current repository changes are Pilot docs/validation only unless already accepted.

Build and pack locally.

Do not use npm registry or git package specs.

---

## 8. Existing installation decision

### Not installed

Install local tarball via supported profile plugin CLI/manager.

### Already installed and matches accepted local package

Do not duplicate. Record identity and continue.

### Already installed but differs

Stop:

`V1_DEPLOYMENT_PILOT_EXISTING_INSTALL_CONFLICT`

Do not overwrite silently.

---

## 9. Installation

Use supported external bundle installation equivalent to:

`dsh plugin --profile <target> add <absolute-local-tarball>`

No registry.

No global install.

After installation verify:

- dependency present once;
- bundle selected once;
- no duplicate Risk Advisor row;
- profile manifest valid;
- plugin manager reports healthy application or a clean restart makes it healthy.

Capture bounded installation diagnostics.

Do not commit machine-specific absolute paths.

---

## 10. Deterministic configuration

Keep:

- Fast Judge disabled;
- Deep Judge disabled;
- provider credentials untouched;
- global permission policy unchanged.

Do not modify the user's provider config.

Do not add a model route.

---

## 11. Clean target-profile boot

Start/restart the selected real Web profile using its normal supported launch path.

Verify:

- process starts successfully;
- AppReady/startup health is normal;
- Risk Advisor Host service is active;
- Risk Advisor client contribution is present in the served client module roster/installed plugin inventory where observable;
- no duplicate package/bundle;
- no unrelated startup failure introduced by RA.

Do not use a disposable profile as a substitute.

This must be the actual selected user profile.

---

## 12. Browser readiness

Stage A need not judge usability, but must establish that the real Browser surface is reachable.

Record sanitized facts such as:

- profile Web server started;
- Browser URL/port reachable locally;
- Risk Advisor client module loaded/advertised where observable;
- plugin inventory shows Risk Advisor enabled;
- no startup/client-loader error attributable to Risk Advisor.

Do not store auth tokens or private URLs in committed docs.

Do not interact with unrelated existing sessions.

Prefer creating a fresh Pilot session/workspace for Stage B.

---

## 13. Pilot workspace

Create a disposable non-sensitive workspace.

Recommended contents:

- `README.txt`;
- `note.txt`;
- `reversible/`;
- `disposable-delete/`;
- optional local git repo with no remote.

Record only a sanitized workspace label, not a personal absolute path, in committed docs.

All Stage-B approved mutations must remain here.

---

## 14. Observation sheet preparation

Create a local working copy of:

`docs/tasks/V1-deployment-pilot/Pilot_Observation_Template.md`

for the user to fill.

Do not pre-fill subjective answers.

You may pre-fill only objective metadata:

- date;
- selected profile label;
- package version;
- Fast/Deep disabled;
- Pilot workspace label.

Do not commit the user's completed observations unless the user later asks to.

---

## 15. Stage-A safety checks

Before handoff verify:

- Harness tracked mutation = 0;
- Risk Advisor product source mutation = 0;
- provider calls = 0;
- external provider configuration changes = 0;
- no credential file reads by the Pilot workflow;
- no registry install;
- no Git remote runtime operation for the installation;
- target profile boots;
- Native Approval UI still exists in a fresh Browser session where observable;
- Risk Advisor installation is exactly one bundle.

Do not run destructive Pilot scenarios during Stage A.

---

## 16. Stage-A report

Create:

`docs/tasks/V1-deployment-pilot/Execution_Report.md`

but clearly mark it as Stage A / pending user observation.

Record:

- outcome;
- selected profile sanitized identity;
- discovery basis;
- Harness SHA;
- accepted Risk Advisor package identity;
- pre-install snapshot file hash table;
- installation result;
- after-install profile control-file hash table;
- bundle/package counts;
- restart/Browser readiness;
- Pilot workspace readiness;
- Fast/Deep disabled;
- provider/credential changes = 0;
- whether user action was required;
- next exact step: complete Pilot Observation Template in real Browser.

Do not claim Pilot success.

---

## 17. Commit scope

Stage-A repository commit should be docs-only unless a tiny Pilot helper is explicitly required.

Do not modify package/product/test code for Pilot preparation.

Do not commit:

- profile backups;
- DSH_HOME data;
- absolute machine paths;
- auth values;
- browser cookies;
- session logs;
- screenshots;
- completed personal observation notes.

If no repository change beyond Execution Report is needed, that is preferred.

---

## 18. Handoff

On successful preparation return:

`V1_DEPLOYMENT_PILOT_READY_FOR_USER_OBSERVATION`

Include compactly:

- target profile label;
- Risk Advisor install state;
- real Browser readiness;
- Pilot workspace ready;
- Fast/Deep disabled;
- profile backup captured;
- Harness mutation 0;
- product source mutation 0;
- exact location of the local observation template/work copy if safe to share;
- next user action: run scenarios A–F and record observations.

Do not remove Risk Advisor.

Do not declare RETAIN.

Do not declare REMOVE.

---

## 19. STOP states

Use the exact frozen stop states where applicable:

- `V1_DEPLOYMENT_PILOT_PROFILE_SELECTION_REQUIRED`
- `V1_DEPLOYMENT_PILOT_HARNESS_VERSION_CHANGED`
- `V1_DEPLOYMENT_PILOT_ACTIVE_PROFILE_RESTART_REQUIRED`
- `V1_DEPLOYMENT_PILOT_EXISTING_INSTALL_CONFLICT`
- `V1_DEPLOYMENT_PILOT_ENVIRONMENT_BLOCKED`
- `V1_DEPLOYMENT_PILOT_BLOCKED_PRODUCT_REPAIR_REQUIRED`

Do not work around a stop by mutating unrelated profile state.
