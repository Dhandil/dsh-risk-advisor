# Risk Advisor Phase 15.3E Web Delivery 2 — Final Independent Architecture Acceptance

**Final decision:** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY2_ACCEPTED_WITH_WORKSPACE_STATE_ROLLBACK_LIMITATION`  
**Decision owner:** ChatGPT, after explicit user approval on 2026-10-12  
**Reviewed GitHub main:** `9326770265673e8508e4b7bb6d56f0f362cd6cc2`  
**Accepted executable / build candidate:** `9deb8c049c45cfdecb62dabbe79f5350b505f59f`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Deployment execution evidence:** `Phase15_3E_Web_Delivery2_Execution_Report.md`, commit `f11cd17474e95ecbb65171c6f46880c0b6eece0e`  
**Custody inspection evidence:** `Phase15_3E_Web_Delivery2_Workspace_State_Custody_Report.md`, commit `eb2f76a1c4e44c8e9761be96f4ededf77ec9a1d9`  
**Independent prior reviews:** `Phase15_3E_Web_Delivery2_Independent_Architecture_Review.md`, `Phase15_3E_Web_Delivery2_Custody_Independent_Evidence_Review.md`  
**Scope:** operational installation and normal Web activation of previously accepted Phase15.3E Repair1. **No real Agent, Tool, Provider, Finding-detection, native approval or rollback performance is claimed.**

## 1. Independent decision and unchanged historical evidence

The user explicitly agreed to adopt a **functional/semantic rollback** standard for manager-generated, reproducible workspace state and to accept this specific Web Delivery2 with a bounded exception. This authorizes closing the **release-acceptance decision**, not installing, restarting, rewriting, rolling back or retesting the existing user Profile.

The prior Web Delivery 1 `BLOCKED` evidence remains unchanged. The Delivery2 first independent review `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY2_REVIEW_BLOCKED_ROLLBACK_CUSTODY` and S1 `CUSTODY_BLOCKED` remain truthful **historical gate states**. This *new, user-authorized final acceptance* records a known exception; it does not claim those earlier literal gates passed. The method-scope deviation in S1 (schema-only parsing of a nonmatching historical backup beyond manifest-only authorization) remains a disclosed **procedural violation**, with no reported mutation and no evidence it changes the package/activation result.

## 2. Deployment identity and functional activation accepted

From the executor's sanitized report, and consistent with the separately inspected accepted source and synthetic Chrome evidence:

- **New Client:** `lib/client.js` SHA-256 `4a49d7f5e9c57dcc3714a9081a6d0c0af6a89b1f5aabac1e2269c2c3881d2b54` (222,047 bytes).
- **Unchanged Host:** `lib/index.js` SHA-256 `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`.
- **Durable installed archive:** `~/.dsh/artifacts/risk-advisor/phase15-3e-web-delivery2-7uxom1lz/dhandil-dsh-risk-advisor-0.1.0-r1.tgz`, SHA-256 `4ed4e14ba98673dc267da6ba6b80c519b32fa553dcc04517dd892caf36d28501`, 90 safe members; 90 installed members were reported byte-identical.
- **Backup:** `~/.dsh/backups/risk-advisor/phase15-3e-web-delivery2-ngjjpy89/` (manifest SHA-256 `0b9d24e6fff88d07a44f57679bee1a8975cbecde5c4a272cba40f65078b3e841`), with known exception below.
- **Selected Profile:** existing `~/.dsh/profiles/web` selects `dsh-base → dsh-web-app → dsh-risk-advisor`; official pinned-Harness offline installer, package dependency/source, lockfile/SRI, installed Client/Host identities were reported consistent. Other plugins and user data showed no unexpected changes in the recorded inventory.
- **Activation-only:** live module loader, 4 CSS module registrations, and 38 HTTP 200 observations for each of two read-only risk endpoints in 37.3 seconds. Activation Client identity remains **INDIRECT** (packaged and installed hashes plus normal activation, not browser-loaded byte hash). Task-owned Host/tab were closed, port 3080 was free at conclusion. No real Agent/Tool/Provider/native approval or Canonical Full was run.

The reviewer verified GitHub commit lineage and source/read-only documentation evidence; local SHA, backups and browser observations are executor attestations rather than independent Mac reruns.

## 3. Explicitly accepted, permanently documented exception

The pinned offline package manager changed the **pnpm-generated** `node_modules/.pnpm-workspace-state-v1.json` in addition to the frozen expected write-set. The prior bytes were not saved in the pre-install backup: historical SHA-256 `07c264b766a83488dcf5379ae563fa89d69a3e4a54e8a355c7d563f7adb40552`; current file SHA-256 `8f8fdef548a6cdc2577420fe478531a9e073cd9897237da25f00d96dcbc3c2d5`. An older, different backup copy does not match. **The original exact bytes cannot be recovered from the available protected backups.**

Codex's read-only pnpm 11.7.0 source inspection establishes that workspace state is generated on successful package operations and is **consumed** during workspace/dependency verification. On a future **successful** supported offline reversal to the preserved Phase15.3C package, pnpm is expected to generate a compatible state for the restored workspace. This is **source-predicted semantic recovery, not a completed rollback test**. Generated timestamps may differ; a failed/partial package operation has different risk and is not guaranteed to recover automatically.

This exception permits **this particular** Delivery2 to be accepted as operationally installed and activated despite its incomplete byte-backup coverage. It **does not** exempt user data, package manifests, lockfiles or plugin artifacts from identity/custody checks; does not waive scope violations; does not authorize future unreviewed Profile changes; and does not retroactively change prior frozen requirements.

**Risk statement:** future rollback is supported by a preserved previous immutable package and core metadata, but has not been tested and cannot be proven byte-exact for the generated workspace-state file.

## 4. Closure and future policy

**Accept and close Phase15.3E Web Delivery 2 with the exception above.** The installed accepted Client can remain in place. **No additional action on the live Profile is necessary or authorized for closure.**

Going forward, apply the *prospective* practical plugin delivery contract (separately documented as `Plugin_Delivery_Acceptance_Policy_v2.md`): protect user-owned state and package/lock identities rigorously; use supported official plugin management; verify installed package and activation; allow expected generated metadata to be rebuilt/semantically reconciled rather than requiring stale byte equality; prefer saving a pre-install copy of known mutable manager-generated metadata to aid diagnosis. If any previously unknown path changes, investigate and classify it—do not automatically pretend it was in the original freeze. Actual rollback success must be proven only when tested, and a high-impact migration requires its own reversible data plan.

**Final status:** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY2_ACCEPTED_WITH_WORKSPACE_STATE_ROLLBACK_LIMITATION`.
