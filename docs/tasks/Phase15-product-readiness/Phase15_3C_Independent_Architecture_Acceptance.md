# Risk Advisor Phase 15.3C — Independent Architecture Acceptance

**Decision:** `RISK_ADVISOR_PHASE15_3C_IMPLEMENTATION_ACCEPTED`  
**Reviewer / UX design authority:** ChatGPT  
**Tested implementation + fixture:** `9f96db5981818cd2d6958b38ff6036efd659259b`  
**Reviewed execution report and four screenshots:** `79929a453f1373918bdda7a960f825830c5222a7`  
**Design approval:** `Phase15_3B_User_Approved_UX_Design_Decision.md`  
**Freeze:** `Phase15_3C_UX_Implementation_Architecture_Freeze.md`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

## 1. Independently checked Git lineage and scope

Remote compare from frozen start `759432a23955d7ea1887278a385b63ecfddf71b6` to tested candidate shows **one** implementation commit modifying only the five explicitly authorized `src/client/` UX/locale files, two focused existing test files, and one new isolated `validation/phase15-3c/**` fixture directory. No Host, bridge/store, approval authority, F1/F2, dependency, package, lockfile, config, Harness or previously accepted validation-fixture source was tracked as modified.

The next single commit `79929a4` adds **only** the execution report plus four synthetic browser PNGs under `docs/tasks/Phase15-product-readiness/evidence/phase15-3c/`. Git has no executable/fixture delta after the reported exact tested SHA. This lineage and file set were verified independently against GitHub.

## 2. Reviewed implementation and focused evidence

**I1/A1 — PASS.** `RuntimeRiskAwarenessDock.tsx` retains its existing Session/execution/assessment match and 1,500ms freshness checks. The previously inline five historical fields are now in a native `<details>`, closed by default, with a separate source/applicability disclaimer. Field text and order are unchanged. The disclosure is rendered only for a matching, visible historical view and keyed by `[sessionId,executionId,assessmentId]`. Existing summary/DEGRADED/advisory details remain independently visible. The four browser screenshots were inspected; the desktop default screenshot has a one-line historical disclosure rather than the earlier 166px-expanded historical field block; the narrow expanded screenshot retains the original source fields and wraps correctly.

**I2 — PASS on focused real Client/store deterministic seam, not real Host/Agent.** In `p14-2-historical-context-client.spec.tsx`, new tests cover A→B→A with a delayed, aborted B reply, opened/closed disclosure state, execution and assessment ID changes, NOT_FOUND withdrawal, and a real history-store freshness-expiry timer. Existing Phase14.2 store read-boundary and identity/fencing tests also remain. This specifically adds the deterministic delayed-response coverage that Phase15.3A V7's synthetic snapshots did **not** exercise; it does **not** convert that old screenshot into a test of real Agent/Host behavior.

**I3/B1 — PASS.** `RiskAdvisorCard.tsx` replaces concatenated resource/permission/containment/sandbox/reversibility markup **inside Details only** with a semantic `<dl>/<dt>/<dd>` definition list, preserving multiple resources and unknowns. CSS uses a two-column grid on desktop and stacked rows for widths <=480px. The independent screenshot inspection confirms readable rows in both 1280px and 390px fixtures; the UI tests verify labels, resources and preserved fields. Existing outer indicator CSS is unchanged, explicitly bounded by `min-height/max-height:28px`, and the browser runner measured 28px. The modal renders no newly added Allow/Reject decision controls.

**I4/C — PASS.** Only the three requested bilingual product-owned labels/helper strings were added in `runtime-risk-locales.ts`; source-bearing `historical.*` fields remain verbatim. The `src/host/`, correction fixed F1/F2 body, approval authority and runtime risk rules are untouched. The accepted language design still defers any F1/F2-body translation/Host parity revision to a separate explicitly approved scope.

**I5 — PASS based on execution evidence, not independent rerun.** The report records focused tests across seven files **67/67 PASS**, direct local TypeScript check and compiler/bundler build PASS, isolated package smoke (90 entries) PASS and real Chrome synthetic-component smoke PASS. The reviewer inspected the frozen focused runner and visual evidence, but did not execute them on the user's Mac. Production Client SHA-256 recorded for candidate: `93bbe22052362276079b5d5685679d12b0766987901c2081e7b7c5cb0fab9db4`; Host bundle remains `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`. No fresh Canonical Full was run, and it was not required by this bounded freeze.

**I6 — PASS.** Final reported focused/build/browser gates executed after candidate push, followed by exactly one docs/evidence-only commit. The local no-profile-mutation and task-owned Chrome/Vite cleanup are supported by the agent's report, not an independent filesystem inspection.

## 3. Screenshot evidence independently inspected

Four committed PNGs were fetched and viewed:
- `01-default-history-collapsed-desktop-en-light.png`: history closed by default, Risk current summary and caveat primary.
- `02-history-open-narrow-zh-dark.png`: five original historical fields displayed after expansion, clear Chinese source/provenance labels, no visible horizontal clipping.
- `03-approval-metadata-narrow-zh-dark.png`: narrow one-column labelled operation metadata with separate multiple resources and unknown values.
- `04-approval-metadata-desktop-en-light.png`: desktop two-column operation metadata, resources, permission and incomplete evidence displayed without concatenated labels.

The screenshots are **synthetic fixtures with actual Client bundle and CSS**, not actual Harness Web/Agent/tool/approval events. The reviewer did not independently recalculate the screenshots' reported SHA-256 from downloaded bytes; their exact committed Git blobs and visible contents were independently checked.

## 4. Remaining boundary and delivery note

The Phase15.3C changes have **not** been deployed to the existing `web` Profile. That Profile still references the earlier Phase15.2B local `0.1.0-r1` tarball (SHA-256 `cae4cbbd7c82f8d4feb651eb75708745918705a17db46733c12a77967befafb5` as last attested). The Phase15.3C build produces a **new Client SHA**, and its prior root tarball must not be overwritten or moved while referenced by the Profile.

No Agent, Tool, Provider, native approval decision or Canonical Full was executed. `REAL_AGENT_GENERALIZATION_UNVERIFIED` and the Phase13.3 execution isolation blocker remain open. User satisfaction and end-to-end native approval UX cannot be inferred from these synthetic fixtures.

**Architecture verdict:** Phase15.3C UI implementation and its bounded verification **ACCEPTED**. Preserve exact tested SHA. If the user wants these changes in daily Web usage, first freeze a **separate narrowly scoped profile upgrade/activation** with a new uniquely named immutable package artifact, old tarball/backup preservation and provenance/rollback gates; do not auto-install or treat acceptance as deployment. F1/F2 localization (proposed Phase15.3D) is a separate design/contract decision.

**Final:** `RISK_ADVISOR_PHASE15_3C_IMPLEMENTATION_ACCEPTED`.
