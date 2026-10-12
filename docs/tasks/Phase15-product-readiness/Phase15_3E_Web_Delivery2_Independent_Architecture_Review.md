# Risk Advisor Phase 15.3E Web Delivery 2 — Independent Architecture Review

**Decision:** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY2_REVIEW_BLOCKED_ROLLBACK_CUSTODY`  
**Reviewer:** ChatGPT (GitHub remote source/report review; did not inspect the user's local Mac)  
**Reviewed Web Delivery 2 report SHA:** `f11cd17474e95ecbb65171c6f46880c0b6eece0e`  
**Delivery authorization:** `docs/tasks/Phase15-product-readiness/Phase15_3E_Web_Delivery2_Architecture_Freeze.md`, parent baseline `13bdcb8fe36c07803bb205ce299e82bdb3c01108`  
**Accepted source/build candidate:** `9deb8c049c45cfdecb62dabbe79f5350b505f59f`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Scope:** installed package and activation evidence assessed separately from strict full Profile restoration readiness. **No rollback or further writes authorized by this review.**

## 1. Remote lineage and positively supported installation facts

GitHub `main` independently resolved to `f11cd17474e95ecbb65171c6f46880c0b6eece0e`. From authorized Delivery 2 freeze `13bdcb8fe36c07803bb205ce299e82bdb3c01108` to this report SHA, Git comparison contains **only one added Markdown report**. No tracked product, config, test, lock, fixture, source or Harness change.

Codex reports the isolated source-identified rebuild of `9deb8c049c45cfdecb62dabbe79f5350b505f59f` produced exact Client `4a49d7f5e9c57dcc3714a9081a6d0c0af6a89b1f5aabac1e2269c2c3881d2b54` (222,047 bytes), exact Host `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`, source maps and 170-map aggregate identical to the Repair1 acceptance. The independent earlier Repair1 review already examined the source, tests and synthetic Chrome screenshots; this delivery did not rerun new focused tests and did not need to.

The executor attests a new durable private archive:
`~/.dsh/artifacts/risk-advisor/phase15-3e-web-delivery2-7uxom1lz/dhandil-dsh-risk-advisor-0.1.0-r1.tgz`, SHA-256 `4ed4e14ba98673dc267da6ba6b80c519b32fa553dcc04517dd892caf36d28501`, SRI `sha512-d1YJx0M/QO5zX1AOqnRFxz9u3e0JBT/sIYDhlSZ9VTmRxyW9aSs0lJFQD9ZuH2dWKaML+DDzMP8R2PgNUVaigw==`, 90 safe package entries. All 90 installed Risk Advisor files matched packed bytes. Profile dependency, both lockfiles and modules metadata point to this archive; installed Client and Host match accepted digests. Bundle order `dsh-base → dsh-web-app → dsh-risk-advisor` and unrelated plugins/configurations were reportedly unchanged.

Web activation-only: normal pinned Harness Host and task-owned browser page loaded; callable ModuleLoader, four Risk Advisor CSS registrations and 38 HTTP 200 observations per read-only risk route in 37.3 seconds, with 1,009ms mean polling interval. This is consistent with the 1,000ms client-store interval, **not** proof of actual Finding, effective risk prevention, real Approval UI or direct browser-loaded Client-byte identity. Runtime Client-byte provenance is **INDIRECT**. No actual Agent/Tool/Provider/native approval/Canonical Full ran; own Host/page/process reportedly closed, port 3080 free. These local observations are agent attestation, not independently reproduced.

## 2. The single substantive custody exception

New non-overwriting backup at `~/.dsh/backups/risk-advisor/phase15-3e-web-delivery2-ngjjpy89/`, manifest SHA-256 `0b9d24e6fff88d07a44f57679bee1a8975cbecde5c4a272cba40f65078b3e841`, covers the frozen **90 installed files plus seven known Profile controls** (and directory metadata). The previous successful Phase15.3C package, prior tarballs, backups and user assets remain available.

However, the supported pnpm plugin-manager operation **also modified the existing** `node_modules/.pnpm-workspace-state-v1.json`, beyond the freeze's enumerated known write-set and outside those seven backed-up control files. Its pre-install SHA-256 `07c264b766a83488dcf5379ae563fa89d69a3e4a54e8a355c7d563f7adb40552`, post-install SHA-256 `8f8fdef548a6cdc2577420fe478531a9e073cd9897237da25f00d96dcbc3c2d5`; preimage bytes **were not saved**. The report says supported offline pnpm can regenerate this state from old package/lock on an eventual rollback, but this recovery path **has not been verified for the prior exact workspace state**, and the original bytes cannot be inferred from their digest.

This is **not equivalent** to the previously accepted append-only `.plugin-manager/logs/<operation-id>/pnpm.log`, which was explicitly allowed in Delivery2. Pnpm's workspace-state metadata can be used for workspace/dependency consistency checks; it is not automatically harmless simply because generated. The Delivery2 freeze expressly required a restoration-ready backup for package-manager metadata that may change and instructed that **unrecognized Profile writes be treated as install-integrity failure**. Thus D2-2 backup-completeness and D2-3 exact write-set gates **cannot be retrospectively marked clean PASS**, notwithstanding the executor's optimistic per-gate table.

**Gate classification:** D2-0 PASS (reported/remote ancestry); D2-1 PASS (recreated digest attestation); D2-2 `PARTIAL / CUSTODY EXCEPTION`; D2-3 `INSTALL OBSERVED / FULL WRITE-SET ACCEPTANCE BLOCKED`; D2-4 `ACTIVATION_ONLY_PASS` (indirect runtime identity); D2-5 PASS (Git report-only). The installation is operationally observed **in place**, but **full architecture release acceptance is withheld** pending review of this backup/rollback gap. This is not an assertion that other plugins failed or user data was lost.

## 3. Safe disposition

**Do not rollback, reinstall, delete generated state, manipulate user Profile, reopen native Approval, or launch new Agent/Tool merely to make Gate labels green.** The current installed Risk Advisor Client matches the approved build and should remain in place unless actual operational symptoms justify a separately authorized intervention.

Authorize only a separately frozen **read-only custody investigation** of the generated state file under current Profile and pinned pnpm management path: source/schema/semantics, whether it is regenerated deterministically and what can be established about safe supported rollback, without accessing application sessions or sensitive content. Exact pre-install bytes are unavailable; investigation must explicitly mark **exact pre-update byte restoration unprovable** unless independently verifiable earlier source exists. If semantic rollback can be substantiated, ChatGPT may decide whether a **user-explicit bounded exception** suffices to accept this delivery *with a permanent limitation*. If not, record a residual recovery risk rather than claiming full acceptance.

No further deployed package change, source change, fresh backup that would replace old evidence, or rollback execution is authorized now. Product implementation (15.3E / Repair1) remains independently accepted; **only Web Delivery2 release custody is pending**.

**Final:** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY2_REVIEW_BLOCKED_ROLLBACK_CUSTODY`.
