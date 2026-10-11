# Risk Advisor Phase 15.3A — Independent Browser UX Evidence Acceptance

**Decision:** `RISK_ADVISOR_PHASE15_3A_ACCEPTED_WITH_V7_LIMITATION`  
**Independent reviewer:** ChatGPT  
**Reviewed report/main SHA:** `91e8a542eedd4e96053306927705763e390807d5`  
**Final tested fixture SHA:** `f226e887eb55b0aeb012b185e630f8ebfd8383c6`  
**Starting Architecture Freeze SHA:** `3f0a15535744ee7410a1ae119f027748115b8a20`  
**Source-identified Client SHA-256 (as reported):** `06b790cf721dbe2391c1249182b8da71a359eaf4032d062527316f4ae374e735`  
**Accepted Phase14 executable:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`

## Independent remote / source checks

The GitHub compare from the freeze to the final submission shows **four linear commits**: initial fixture, Chrome/port race correction, per-scenario disclosure/language correction and final docs/evidence. Relative to the tested fixture SHA, **exactly one docs/evidence-only commit** adds `Phase15_3A_Synthetic_Browser_UX_Execution_Report.md` plus seven PNGs. No `src/`, original tests, build configuration, package dependencies, lockfiles, Harness or Profile are tracked changes.

The reviewer inspected the exact fixture code and runner in `validation/phase15-3/`, the current Risk Advisor components/stylesheet implementations, the report, and **all seven actual PNGs** fetched from their committed GitHub blobs. The screenshots visibly label themselves `SYNTHETIC UI FIXTURE · NOT LIVE HARNESS EVIDENCE`. The source-based fixture loads `lib/client.js` through the bundle registration envelope, uses its exported real Risk/Correction/Approval components, their CSS, and actual pinned Harness UI primitives, while providing in-memory synthetic stores. This is stronger than an HTML imitation but **not the actual Harness Host, Profile, live SlotRegistry, native permission controls, or verified Finding authority**. The reviewer did not independently execute the runner, and the locally reported PNG SHA-256 values/resource teardown were not separately recalculated or rerun.

## U1–U6 review

| Gate | Independent conclusion |
| --- | --- |
| U1 — actual component/CSS and clear fixture boundary | PASS; examined `fixture.jsx`, `vite.config.mjs`, `fixture.css`, exported source and captured screenshots |
| U2 — bounded V1–V7 | PASS WITH LIMIT; real browser component screenshots exist for each; V7 keyed snapshot/session A→B→A is observed, but **late/asynchronous responses NOT EXERCISED / UNSCORABLE** |
| U3 — approval/Finding and runtime boundary | PASS per code/evidence; synthetic only. No native approval decision rendered; no real Tool, Agent or provider authorized/claimed |
| U4 — screenshot provenance and inspectable UX | PASS as source/evidence review; seven committed screenshots, bounded synthetic labels, report hashes and reproducible runner. Local reported hashes are not an independent byte-level rehash by the reviewer |
| U5 — task-owned teardown and user Profile protection | PASS per execution report; not independently replayed |
| U6 — exact tested fixture and remote Git ancestry | PASS independently verified; final commit adds only report and PNG evidence |

## Observed design inputs (not automatic product defects)

- **Ordinary history height — observed concern, priority P1.** V1 ordinary risk measured 174px; V2 with qualified-history-shaped fixture measured 340px (+166px). The actual Risk Dock source renders eligible historical Guidance inline, and the V2 screenshot confirms it dominates the default card. Default-collapsed history is a product-design proposal, not current behavior.
- **Approval detail metadata — observed concern, priority P1/P2.** V3 screenshot confirms the *actual* RiskAdvisorDetail/RiskAdvisorCard modal packs Resources, Requested permission, Workspace containment, Sandbox coverage and Recovery/reversibility into near-adjacent words, while the accepted default indicator remains 28px. This is a real component-level readability concern; it is not evidence of duplicate real Harness controls or native approval authority failure. Prefer deliberate spacing/grouping inside Details without increasing the default approval footprint.
- **Chinese copy mixing — observed concern, priority P2.** V2/V5 show Chinese section labels surrounded by English source reason strings, fixed F2 advisory, and historical text. `OnlineCorrectionDock.tsx` contains English constant fixed advisory sentences; historical Guidance content comes from fixed fields and must not be silently paraphrased or represented as translated verified source. Localization is a separately scoped design decision with source/provenance constraints.
- **V5 expanded vertical density — observed concern.** Next-check and historical sections are independently collapsible, but an intentionally both-open state occupies a tall stack. No invented real-user annoyance or safety outcome.
- **V6 narrow width — observed satisfactory.** The 390px screenshot shows long synthetic text wrapping and both docks visible with no reported horizontal overflow. This is a fixture/layout result, not a claim about all actual Web viewports or Session selection.
- **V4 F1 and V7 neutral state — bounded observations.** Correctly separate F1 advice from ordinary risk; do not interpret absence of a Finding as a detection true negative or view the V7 screenshot as proof of async race fencing.

No independently established source-contract defect, unauthorized Tool action, or finding-accuracy evidence follows from these images.

## Acceptance boundary / next step

**Accept Phase 15.3A as completed synthetic real-component Browser UX evidence.** Do not equate this with real Agent classification, native approval UI E2E, true qualified history/verified verifier evidence, async stale-response coverage, or the user's real `web` Profile experience. Existing `REAL_AGENT_GENERALIZATION_UNVERIFIED` and Phase13.3 scope blocker remain open.

Next: a **Phase 15.3B UX decision/design review** informed by these screenshots and user choices, before authorizing `src/` changes. Suggested priorities are (1) collapsible ordinary history, (2) approval-modal operation metadata spacing, (3) wording/language policy for fixed F1/F2 vs evidence-bearing historical text, with compactness as an invariant. Do **not** implement these solely on the strength of this acceptance. If user wants to compare alternatives, prepare bounded design proposals using the existing snapshots and no product mutations.

**Final:** `RISK_ADVISOR_PHASE15_3A_ACCEPTED_WITH_V7_LIMITATION`.
