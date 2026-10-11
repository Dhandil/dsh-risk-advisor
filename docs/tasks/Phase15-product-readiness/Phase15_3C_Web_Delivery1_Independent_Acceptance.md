# Risk Advisor Phase 15.3C Web Delivery 1 — Independent Architecture Acceptance

**Decision:** `RISK_ADVISOR_PHASE15_3C_WEB_DELIVERY1_ACCEPTED_WITH_TOOLING_LOG_NOTE`  
**Independent reviewer:** ChatGPT (remote GitHub evidence and source review; no local Mac execution)  
**Reviewed deployment report/main SHA:** `3c1a9d23aef3e96d179e766eaff25934f9ebfe9c`  
**Authorized freeze SHA:** `214a058aa6556bfa4051ba23e407d4679333a9e2`  
**Accepted implementation SHA:** `9f96db5981818cd2d6958b38ff6036efd659259b`  
**Correct preceding independent Phase15.3C implementation acceptance SHA:** `e493354a8d26a8616f46071ea46c8eb6c934affe`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Scope:** existing `web` Profile Risk Advisor-only immutable package update + normal Host/Client activation-only. **Not** real Agent/Finding/Approval exercise.

## 1. Exact Git / tested product lineage

Verified GitHub `main` equals `3c1a9d23aef3e96d179e766eaff25934f9ebfe9c`. Compare with frozen authorization `214a058aa6556bfa4051ba23e407d4679333a9e2` is exactly **one added documentation report**, with no executable, fixture, test, dependency or Harness modification. Its parent is the frozen SHA. The Phase15.3C product code was independently accepted at `e493354a8d26a8616f46071ea46c8eb6c934affe`, with tested implementation at `9f96db5981818cd2d6958b38ff6036efd659259b`.

**Provenance wording note:** the deployment report's introductory `Independent architecture acceptance: 79929a453...` identifies the **Phase15.3C implementation execution-report/evidence commit**, not its actual independent acceptance. The correct independent acceptance is `e493354a8d26a8616f46071ea46c8eb6c934affe`. This clerical reference does not change executable provenance and is corrected in this review rather than rewriting prior evidence.

## 2. D0–D5 gate review

**D0 — PASS, evidence-based.** Codex reports clean fast-forwarded `main`, verified remote and pinned Harness, preserved untracked `lib/`, `node_modules/`, `.vitest-cache/` and root tarball. Direct hashes before packing:
- accepted Host `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`;
- accepted Client `93bbe22052362276079b5d5685679d12b0766987901c2081e7b7c5cb0fab9db4`;
- pre-install original package tar SHA-256 `cae4cbbd7c82f8d4feb651eb75708745918705a17db46733c12a77967befafb5`, originally installed Client `06b790cf721dbe2391c1249182b8da71a359eaf4032d062527316f4ae374e735`.
The remote source lineage was independently checked; local exact-byte and Profile observations are the executor's recorded evidence.

**D1 — PASS per executor manifest.** A fresh, private `0700` backup of the pre-update Web Profile's Risk Advisor installation and bounded metadata was recorded at `~/.dsh/backups/risk-advisor/phase15-3c-web-delivery1-20261011T102836Z-8ltHHT/`, manifest `0600`, SHA-256 `8c48413b448a543ab33922c6c476d93f4dcc474fd35dbe2487f5099c9ffa138a`. Manifest covers 97 files and seven directories. Earlier backup and old package remain. Recovery plan uses original intact root tarball with the pinned supported offline manager, followed by identity verification. **Rollback has not been executed**; readiness is not a successful restoration test.

**D2 — PASS per package attestation.** Source-identified immutable package in private persistent directory `~/.dsh/artifacts/risk-advisor/phase15-3c-web-delivery1-20261011Tn9kv_6ka/`, basename `dhandil-dsh-risk-advisor-0.1.0-r1.tgz`, SHA-256 `01a1dec387dde762293874cde6e024af6d57287a27082add349309f3623e37d3`, 90 package members, Host/Client members match the accepted bytes. The prior root tarball remains untouched. Same semantic package version `0.1.0-r1` cannot be used to claim version advancement; path, digest and installed bytes are the authority. Persistent archive must **not** be deleted or relocated while Profile references it.

**D3 — ACCEPTED WITH DOCUMENTED TOOLING-SIDE-EFFECT EXCEPTION.** The official pinned Harness offline plugin manager changed only the Risk Advisor package `file:` source/integrity, matching lockfile and virtual-store references, installed 90 files, and did not change the other selected bundles, workspace policy or Cordis patch according to the report. Installed new Host `9525d46c...` and new Client `93bbe220...` match accepted package. **One extra operation-generated `.plugin-manager/logs/<operation-id>/pnpm.log` was added in the Profile.** The freeze's literal permitted write-set did not explicitly list this path. Accordingly, D3 is **not represented as an unqualified exact-path PASS**: the append-only, operation-scoped manager-log side effect is accepted as a **narrow bounded installation-tooling exception** on the available evidence; it is not a precedent authorizing unrelated settings/log inspection, arbitrary Profile file writes or deletion. Executor did not inspect the log's contents; reviewer cannot independently attest content. If future installs repeatedly create unenumerated changes, classify and explicitly freeze their tool-managed write-sets before executing. No repair/reinstall/rollback is needed solely to remove this log.

**D4 — PASS for activation-only with INDIRECT Client-byte runtime identity.** Task-owned normal Host started on otherwise free port 3080; normal Web module loader and four Risk Advisor style registrations observed, as were 77 HTTP 200 request observations for each `/api/risk-advisor/online-correction` and `/api/risk-advisor/runtime-risk`. The reviewer inspected `src/client/online-correction-store.ts` and `src/client/runtime-risk-store.ts`: both explicitly use a **1,000 ms** poll interval. 77 responses on each route are **consistent with** approximately a minute-plus of normal ongoing polling; without request timestamps, route counts alone neither establish excessive polling nor independently rule out duplicate requests. This is route reachability, **not** Finding/Tool evaluation. Browser did **not** provide direct loaded Client bytes; runtime identity is properly `INDIRECT`, supported by exact installed candidate bytes + normal Client CSS/dock request behavior. No native approval/Finding was actually exercised.

**D5 — PASS.** The executor reports task-owned browser tab, Host and loopback listener closed, port 3080 free, user tabs/Chrome untouched, temporary token-containing logs/cache removed, and backups/tarballs left untouched. Report-only Git commit/push independently verified. No full tests, Canonical Full, Agent, Tool, provider, or approval execution was authorized or claimed in this delivery.

## 3. Architecture verdict and limits

**ACCEPT** Phase15.3C Web Delivery 1 for the **bounded target state**: the selected existing `web` Profile now points to a durable, source-identified Phase15.3C Risk Advisor package, with an installed Client matching the accepted UI build and the normal Host/Client activation-only path observed. The product was not subsequently modified in Git. The additional manager-generated `.plugin-manager/logs/.../pnpm.log` is a **named nonproduct tooling-side-effect exception**, not an unmentioned perfect write-set match.

**Not accepted/proven:** actual ordinary Tool risk card during a real Tool event; real Native Approval UX and allow/reject; actual online F1/F2 Finding, recall, accuracy; host decision correctness; production performance; user satisfaction; direct runtime browser-loaded Client hash; empirical rollback; Phase13.3 `REAL_AGENT_GENERALIZATION_UNVERIFIED` blocker clearance. Do not confuse installation/activation acceptance with those claims. Existing private backups and both old/new immutable tarballs remain protected.

**Next work only with separate authorization:** user-led ordinary Web visual check without launching real Agent/Tool automatically, and independently designed Phase15.3D F1/F2 bilingual microcopy/Host-contract decision. Do not auto-run other phases or deploy further packages.

**Final:** `RISK_ADVISOR_PHASE15_3C_WEB_DELIVERY1_ACCEPTED_WITH_TOOLING_LOG_NOTE`.
