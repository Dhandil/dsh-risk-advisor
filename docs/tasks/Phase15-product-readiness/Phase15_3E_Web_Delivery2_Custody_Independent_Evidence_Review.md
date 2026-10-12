# Risk Advisor Phase 15.3E Web Delivery 2 — Independent Custody Evidence Review

**Decision:** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY2_CUSTODY_FACTS_REVIEWED_EXCEPTION_PENDING`  
**Independent reviewer:** ChatGPT  
**Reviewed report SHA:** `eb2f76a1c4e44c8e9761be96f4ededf77ec9a1d9`  
**Deployment report:** `Phase15_3E_Web_Delivery2_Execution_Report.md` at `f11cd17474e95ecbb65171c6f46880c0b6eece0e`  
**Prior independent deployment review:** `Phase15_3E_Web_Delivery2_Independent_Architecture_Review.md`  
**Custody instruction:** `Phase15_3E_Web_Delivery2_Workspace_State_Custody_Freeze.md`  
**Accepted executable:** `9deb8c049c45cfdecb62dabbe79f5350b505f59f`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

## 1. Independently established Git and report provenance

Verified GitHub `main` = `eb2f76a1c4e44c8e9761be96f4ededf77ec9a1d9`. Compare from the custody authorization `7d0efb3aa9edf43e2f2f51e73d0b639de32b2a77` shows **one** new Markdown report `Phase15_3E_Web_Delivery2_Workspace_State_Custody_Report.md`, no executable, test, package, Harness or source changes. The review reads Codex's sanitized report; it does **not** directly inspect local Profile bytes, private backups, or installed pnpm source on the Mac.

## 2. Scope breach classification

**S0: PASS on reported facts plus remote Git lineage.**

**S1: BLOCKED — read-only method-scope breach.** The freeze allowed comparison of the four **manifest inventories** and, if an actual listed backup state file existed, its exact digest. Codex additionally parsed the schema/fields of a **known nonmatching** older backup state payload after digest mismatch had already been established. This was not authorized in S1 and was not necessary to conclude no exact preimage existed. The report says no write, restoration, duplication, or data-content publication occurred; a tool response exposed a Profile-root metadata key, which was omitted from committed evidence. The breach affects **procedural compliance**, and cannot be recast as an S1 PASS simply because it was nonmutating. No evident manipulation of backup content or falsification of the preimage finding is reported; the older payload is not the missing pre-update file.

**S2: source-based findings usable, not a recovery-test PASS.** The report records explicit inspected pnpm 11.7.0 read/write paths in `loadWorkspaceState`, `createWorkspaceState`, `updateWorkspaceState`, and `add/installSome`, with the generated file `node_modules/.pnpm-workspace-state-v1.json`. `lastValidatedTimestamp` is refreshed as part of generating state, so semantic regeneration does not imply byte identity. The current workspace-state schema/settings/project identity reportedly match the current Profile; the actual archive identity is established **separately** by package metadata/lockfile and installed Client SHA, not by this state alone. Source evidence indicates that a **successful supported offline** reversal to preserved Phase15.3C should regenerate a semantically compatible workspace-state file for then-current workspace configuration. This is a prediction, not an executed rollback, and does **not** guarantee safe partial-failure cleanup or absence of pnpm workspace-state fast-path issues.

**S3: BLOCKED under literal freeze because S1 was exceeded**, despite bounded factual conclusions.

## 3. Permanent residual limitation and practical risk

Delivery2 state `node_modules/.pnpm-workspace-state-v1.json` changed from SHA-256 `07c264b766a83488dcf5379ae563fa89d69a3e4a54e8a355c7d563f7adb40552` to `8f8fdef548a6cdc2577420fe478531a9e073cd9897237da25f00d96dcbc3c2d5`. The four authorized backups contain **no byte-exact preimage**; one earlier backup contains a different file (SHA `8840eaf3ecc87b870ed3efca7d7bde3db34ec950ffa8ab40bf489c917577a872`). A hash by itself cannot restore old content. This is a permanent historical **byte-restoration proof gap** in the present evidence. No additional read-only inspection can manufacture that missing preimage.

Pnpm uses the generated state for dependency/workspace validation and potential optimistic repeat-install decisions. It is therefore not appropriate to call the file an inert cache. The same source-based checks give reasonable confidence that a future *successful* pinned-Harness offline old-package selection will generate a corresponding current state. However, neither exact-byte rollback nor an actual end-to-end supported rollback has been tested. Old durable Phase15.3C tarball, previous saved Profile controls and new Delivery2 archive/backup remain available by Codex attestation; the deployed Client matches accepted Repair1 and normal Web activation-only already passed.

## 4. Architecture decision and user exception requirement

The previous `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY2_REVIEW_BLOCKED_ROLLBACK_CUSTODY` remains in force **until the user explicitly accepts an exception**. The technical installation and activation evidence is sufficient for the bounded delivered product identity, but the freeze's byte-custody requirement was not met for one generated pnpm metadata file, and the S1 procedural breach remains recorded. The architecture reviewer cannot pretend those gates were unqualified PASS.

**Recommended bounded exception for user decision:** accept Phase15.3E Web Delivery2 as **operationally installed and activated**, with a permanent explicit exception that exact old `.pnpm-workspace-state-v1.json` bytes cannot be restored and that only source-predicted *semantic* regeneration on a future **successful offline rollback** is currently supported. This is not permission to run rollback, reinstall, change any current Profile state, waive custody requirements for other files, declare real Agent/Tool functionality proven, or call the unsupported S1 method compliant.

If user **approves** this specific exception, ChatGPT may write a **separate** final independent architecture acceptance with status `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY2_ACCEPTED_WITH_WORKSPACE_STATE_ROLLBACK_LIMITATION` and explicit S1 deviation. If user **declines**, the release remains in-place but architecturally **NOT ACCEPTED**, pending a separately authorized prospective restoreability proof/repair; preserve all current packages and backups either way.

**Future delivery prevention:** include `.pnpm-workspace-state-v1.json` and other manager-generated mutable metadata in **pre-install byte backups** and exact path-level write-set before install. Preserve the old snapshots/manifest and verify restoration semantics without in-place trial runs by default. Do not retroactively revise the prior freeze or report.

**Final:** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY2_CUSTODY_FACTS_REVIEWED_EXCEPTION_PENDING`.
