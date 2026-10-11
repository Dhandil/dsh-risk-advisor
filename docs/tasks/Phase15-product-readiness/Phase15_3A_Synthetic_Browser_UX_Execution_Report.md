# Phase 15.3A Synthetic Browser UX Execution Report

**Result:** `RISK_ADVISOR_PHASE15_3A_UX_EVIDENCE_READY_FOR_ARCHITECTURE_REVIEW`
**Starting baseline:** `3f0a15535744ee7410a1ae119f027748115b8a20`
**Fixture SHA used for final run:** `f226e887eb55b0aeb012b185e630f8ebfd8383c6`
**Risk Advisor Client artifact SHA-256:** `06b790cf721dbe2391c1249182b8da71a359eaf4032d062527316f4ae374e735`
**Pinned Harness source:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

## Scope and fidelity

The final observation rendered the three actual exported React components from the source-identified `lib/client.js`: `RuntimeRiskAwarenessDock`, `OnlineCorrectionDock`, and `RiskAdvisorDetail`. The production Client artifact installed its own Risk Advisor CSS Modules in the page. Browser observations confirmed the plugin CSS tags were present. The fixture used real pinned-Harness `Button`, `Modal`, `StateDot`, and `Tag` components plus their CSS from tracked Harness source at the pinned SHA; React and ReactDOM were deduplicated to the Risk Advisor workspace instance.

The fixture’s bridge/store adapters and all DTOs, Session IDs, Finding IDs, operation names, file labels, and content were synthetic and in-memory. They issued no RPC. The banner says “SYNTHETIC UI FIXTURE · NOT LIVE HARNESS EVIDENCE.” The page did not register real slots or start a Harness Host. The V3 surface displayed only the Risk Advisor extension; it did not render approval decision controls. This validates component rendering and interaction, not normal-Web activation, Risk Host predicates, Finding recall, or real Agent behavior.

Vite 8.3.2 served the fixture on an ephemeral loopback port and the exact `lib/client.js` artifact. Google Chrome `154.0.8037.99` ran with a new temporary user-data directory and an ephemeral DevTools port. Chrome request interception continued only the task-owned loopback origin and failed other page requests; Chrome also used a resolver rule denying non-loopback hosts. The final run observed zero external page requests. Its temporary browser profile, Chrome process, and Vite server were closed after the run. The existing `web` Profile, installed package, rollback backup, and user tabs were not used or changed.

Only `validation/phase15-3/**` changed in the fixture commits. The initial Chrome launch attempt on `02630c90b88ee42b95ba727a6a48d8f397838f70` timed out before any scenario because a preselected debugging port raced. The port allocation was corrected in `947348574155b5af1f7afbdcd03052caee777615`. A subsequent visual review found disclosure state carried from V5 into V6; those seven task-generated screenshots were SHA-checked and removed. The fixture then reset disclosures between scenarios and set the selected document language in `f226e887…`. The complete final run below is from that exact SHA. No product source, existing test, package, dependency, lockfile, Harness source, or Profile change followed it.

## V1–V7 observations

| Scenario | Result | Browser evidence |
| --- | --- | --- |
| V1 — ordinary `DEGRADED/PARTIAL` risk, default Details state | `PASS` — risk, recommendation, primary reason, incomplete-evidence caveat and advisory authority were visible; Details remained collapsed. The real risk dock measured 174 px high in this fixture; the synthetic composer shell measured 236 px including its prompt placeholder. | [V1 desktop, English, light](evidence/phase15-3a/01-V1-desktop-en-light-default.png) |
| V2 — optional historical context present | `OBSERVED_UX_CONCERN` — historical Guidance-shaped content renders inline. The risk dock grew from 174 px to 340 px (166 px increase); synthetic composer shell grew from 236 px to 402 px. This is a UI fixture, not qualified historical authority. | [V2 desktop, Chinese, dark](evidence/phase15-3a/02-V2-desktop-zh-dark-inline-history.png) |
| V3 — pending-approval context, advisory Details/modal | `OBSERVED_UX_CONCERN` — the indicator measured 28 px, `danger-full-access` and PARTIAL remained visible, Details opened the actual modal, and the ordinary risk dock suppressed for the matching pending call. The approval metadata (“Resources”, permission, containment and reversibility) runs together with insufficient spacing in the modal. No approval action was rendered. | [V3 approval detail modal](evidence/phase15-3a/03-V3-pending-approval-details-modal.png) |
| V4 — synthetic F1 | `PASS` — the row is labeled “Repeated failure”; its advisory describes a repeated normalized failure signature and asks the user to inspect the cause. Optional next-check and history disclosures remained collapsed. | [V4 F1, desktop, English, dark](evidence/phase15-3a/04-V4-f1-desktop-en-dark.png) |
| V5 — synthetic F2, next-check and history | `OBSERVED_UX_CONCERN` — the row says “Postcondition mismatch”; the separately labeled manual next-check and historical context disclosures open independently. The fixed F2 advisory and several fixed historical strings remain English in the Chinese UI state, and the expanded material forms a tall stack. These DTOs do not prove an actual postcondition or historical qualification. | [V5 F2 with both disclosures open](evidence/phase15-3a/05-V5-f2-next-check-and-history-open.png) |
| V6 — both composer docks, bounded long text, narrow viewport | `PASS` — at 390 px viewport width, the document and composer had no horizontal overflow; the current F2 and risk caveat remained visible. Details were reset to the default collapsed state. Long primary-reason text wrapped across lines. Theme tokens and locale were fixture-controlled, not loaded from the actual Web Profile. | [V6 narrow, Chinese, dark](evidence/phase15-3a/06-V6-narrow-zh-dark-both-docks.png) |
| V7 — unavailable/no Finding and Session A→B→A | `UNSCORABLE` — returning to synthetic Session A showed the neutral no-Finding state and an explicit unavailable risk message. The fixture’s keyed snapshots do not emulate asynchronous Host/client delivery, so late/stale response fencing was not exercised. No blank state was scored as a true negative. | [V7 neutral unavailable state](evidence/phase15-3a/07-V7-neutral-unavailable-session-a-b-a.png) |

The seven PNGs are ordinary files and each SHA-256 was checked before this report commit. Their hashes are:

| Screenshot | SHA-256 |
| --- | --- |
| `01-V1-desktop-en-light-default.png` | `6f8c2895aafd9f106d5d4de8271be698f102fea256af6d1bfe00cf571a04f925` |
| `02-V2-desktop-zh-dark-inline-history.png` | `7a6a04dd18ef23b8118c19f5d1c459f8043c33b02341ca57f7044a42463bd912` |
| `03-V3-pending-approval-details-modal.png` | `a303de880b25e6aff01a4a5dddc5ff3d4ce14a67dfa47b880c3789d0669d9522` |
| `04-V4-f1-desktop-en-dark.png` | `b3fb3963ee2bc5f2af8a265785a0a5d9e8c0b466dadd657a5489de76edecf173` |
| `05-V5-f2-next-check-and-history-open.png` | `67ab0d4666ec7c66b82f2c79beb028116cd75768f33c9aeec55dc8b9cd57e876` |
| `06-V6-narrow-zh-dark-both-docks.png` | `c93a8bd923feae8d5210336a6b9a43040c38db9506ae857f80e4e09abb4ad15f` |
| `07-V7-neutral-unavailable-session-a-b-a.png` | `636dd7b94df30e5d126e8a520d830e0e6d68b47c4651d4129abc8edd395e3ef1` |

## Prioritized UX observations

1. **`OBSERVED_UX_CONCERN` — Inline history dominates the default surface when present.** In V2, the historical block adds 166 px to the risk dock before Details is opened. Recommendation for a future approved design decision: consider a separate collapsed history disclosure, while preserving the explicit advisory and applicability caveats.
2. **`OBSERVED_UX_CONCERN` — Approval operation metadata is visually compressed.** V3 shows resource, permission and workspace/sandbox/recovery fields adjacent without clear row spacing. Recommendation: evaluate a definition-list/grid treatment in a later authorized product phase; no source change is made here.
3. **`OBSERVED_UX_CONCERN` — Fixed F1/F2 and history prose is not fully localized.** V5 translated the F2 kind and section labels, but the fixed advisory sentence and historical content remain English. The observed hard-coded advisory renderer is in `src/client/OnlineCorrectionDock.tsx`; historical strings are also emitted directly by the current components. Recommendation: ask whether bilingual fixed copy is acceptable before proposing localization work.
4. **`NEEDS_HUMAN_FEEDBACK` — Default ordinary risk height.** V1’s risk dock is 174 px even with Details collapsed. The content is readable and the caveat is prominent, but the space cost should be reviewed against real composer use before any redesign.
5. **No `SOURCE_CONFIRMED_DEFECT` is declared.** This phase observes UI presentation only and makes no claims about scoring, authority, runtime correctness, recall, or real-user impact.

## U1–U6 gates

| Gate | Result | Evidence/limit |
| --- | --- | --- |
| U1 — real component/CSS fidelity and synthetic isolation | `PASS` | Exact source-identified Risk Advisor Client artifact; embedded CSS Modules loaded; real pinned-Harness primitives; synthetic adapters only; explicitly not full Harness Web activation. |
| U2 — bounded V1–V7 observations | `PASS_WITH_EXPLICIT_LIMIT` | Seven scenario families observed/classified, desktop and 390 px width, English/Chinese, light/dark. V7’s late/stale asynchronous response behavior is `NOT_EXERCISED` and classified `UNSCORABLE`. |
| U3 — authority and execution boundaries | `PASS` | No Harness Host, existing Profile, Agent, Tool, provider, real Finding, approval decision, or real session was used. No product authority was added. |
| U4 — privacy, reproducibility and inspectable findings | `PASS` | Visible synthetic labels, no personal data, seven hashed PNGs, loopback-only page requests, no external page requests observed, evidence labels and outcomes recorded above. |
| U5 — task-owned resource teardown | `PASS` | Temporary Chrome profile and Chrome/Vite processes were closed; no existing browser tab or Web Profile was used. |
| U6 — exact SHA and push lineage | `PASS` | Final run used fixture SHA `f226e887eb55b0aeb012b185e630f8ebfd8383c6`; this report and screenshots are a separate docs/evidence-only commit pushed directly to `main`; remote equality was checked after push. |

## Questions for human review

1. Is the 174 px default ordinary-risk dock acceptable while Details is collapsed?
2. Should optional historical Guidance remain inline, or appear behind its own collapsed disclosure?
3. Does the 28 px approval indicator provide enough context, and should operation metadata in its modal use more spacing or grouped rows?
4. Should F1/F2 fixed advisories and historical text be localized when the surrounding labels are Chinese?
5. In V5, is the distinction between current F2 evidence, manual next-check, and historical experience clear enough when both optional sections are opened?

## Execution boundary

Focused fixture syntax checks and the local fixture browser assertions were run. No product test suite, existing regression test, Canonical Full, real Web Profile, Agent, Tool, or provider was run. The only changes after the tested fixture SHA are this report and the seven screenshots. Phase 15.3A remains subject to independent architecture review; this report does not declare acceptance or authorize product changes.
