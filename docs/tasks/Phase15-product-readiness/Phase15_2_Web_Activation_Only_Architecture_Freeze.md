# Risk Advisor Phase 15.2 — Web Activation-Only Verification Freeze

**Decision:** `RISK_ADVISOR_PHASE15_2_PREPARED_AWAITING_USER_PROFILE_AUTHORIZATION`  
**Architecture owner:** ChatGPT  
**Execution agent:** zcode (only after user authorizes a specific target and the exact mutation envelope)  
**Starting main:** `39269079c78effe5def719726d568ff9d0dccf9c`  
**Accepted Phase 14 executable:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`  
**Pinned Harness reference:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

## Objective

Determine whether the exact accepted Risk Advisor implementation can be selected and activated through **normal Harness Web Host + Client registration**, using **one explicitly user-selected profile**. This is a product delivery/activation smoke, **not** an Agent execution, F1/F2 recall study, Docker/guest isolation project, new UI, or model/provider benchmark.

Phase 15.1's source-grounded design and `Phase15_1_Independent_Architecture_Review.md` are accepted. The report's proposed UI hierarchy is not implemented.

## User choice required before any runtime or profile action

User must explicitly choose either:
- **Disposable isolated profile:** create a new task-owned Harness profile without importing user credentials, session content or model configuration. Preferred for the first activation/slot-registration smoke; no real Tool/Finding UI is expected.
- **Existing Web profile:** user specifies its exact name/location and separately approves the package install/selection/restart or other planned profile mutation after the agent gives a bounded before/after manifest and rollback procedure. Do not infer that mere profile inventory authorizes modification.

If the profile is unspecified or the selected profile's state/ownership is uncertain, do not read private profile data, build, install, launch, alter process state, or proceed. Return a blocker requesting user direction.

## Execution stages and scope

**A. Read-only plan / preflight (once user identifies target).** Verify `main` and accepted executable ancestry; ensure no unauthorized runtime/process is running; identify the exact target only; inspect narrowly bounded plugin selection/manifest metadata without reading credentials, conversation or other projects. Determine the pinned Harness compatibility, local package vs installed version, potential file writes, existing listeners, resource ownership, and clear recovery procedure. Print the exact read/mutation plan; require user authorization if a mutable target is selected. Do not silently upgrade Harness, change provider/model settings or delete previous installation.

**B. Activation-only (separate user authorization).** Under a newly created disposable profile, or an explicitly approved existing profile with a reversible targeted snapshot, reproducibly build/pack the accepted product source; record source commit, build/pack identity, package SHA-256 and Host/Client bundle SHA-256 before profile changes. Package version alone (`0.1.0-r1`) is not evidence of accepted identity. Verify the package's Host and Client registration through supported Harness plugin management; launch the normal Web Host/Client, inspect module/slot/route identity, note relevant nonsecret errors and actual user-visible state. No Tool, Agent, provider or real task runs; nothing may induce approval or F1/F2. Close only task-owned resources; preserve user's already active Harness and other plugin configurations.

**C. Evidence and user observation.** Report artifact/profile identity, exact source/build hashes, registrations actually observed, Browser/Host state, whether a real UI element actually rendered, the absence of Tool-derived findings where no Tool ran, explicit not-run items, changes/rollback snapshot if relevant, and clean resource teardown. Ask for user's impression if there was an observed UI surface; do not fabricate one. A registration-level smoke cannot claim ordinary risk, native approval or Online Correction experience when those surfaces were not naturally exercised.

## Acceptance / stop gates

- **A1 identity:** accepted executable and exact installed/package hashes attested, no source or Harness mutation.
- **A2 profile:** explicit user-selected target, single owner, read boundaries, and reversible snapshot if mutable.
- **A3 deployment:** supported installation/plugin selection and normal Web Host/Client registration honestly evidenced; no inference from a simulated module loader.
- **A4 integrity:** zero Agent/Tool/provider/approval/campaign, no unsafe task reading, no invented Findings/true negatives; no change to Harness Core or other plugins.
- **A5 closeout:** only task-owned processes/files cleaned up; prior settings and user state preserved; errors and limitations reported.
- **A6 Git:** `SINGLE_MAIN_CONTINUOUS_COMMIT`, every report/change as bounded Commit + immediate Push to `main`, independent architecture review required before Accepted. Existing `.vitest-cache/`, `lib/`, `node_modules/` preserved unless user authorizes a precise build-output overwrite after establishing hashes and impact.

**Current state: prepared design only.** This freeze is **not** authorization to start preflight, install, build, Browser, Agent or provider activity. A concrete user profile choice and separately accepted action envelope come first. The next zcode instruction must be narrowed to the user's explicit selection.

**Status:** `RISK_ADVISOR_PHASE15_2_PREPARED_AWAITING_USER_PROFILE_AUTHORIZATION`.
