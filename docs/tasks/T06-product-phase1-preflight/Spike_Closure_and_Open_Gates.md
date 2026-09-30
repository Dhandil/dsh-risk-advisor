# T06 — T00–T05 Spike Closure and Open Gates

## Closure position

The five focused spikes are closed only as bounded evidence handoffs. They do not constitute a Risk Advisor V1 release. The current product is `V1_NOT_RELEASE_READY`: the real Assessment pipeline, production Context Builder, Judge/scheduler, AssessmentStore, safe Host-to-Browser assessment bridge, and the remaining P0 product proofs do not exist.

The following evidence levels are preserved exactly:

| Task | Published outcome / checkpoint | Evidence actually established | Boundary that remains open |
|---|---|---|---|
| T00 | `T00_FOUNDATION_PUBLISHED`; foundation commit `946a959`, report-only follow-up `5e54baa` | Repository, canonical docs, task layout, remote publication and static baseline alignment. | No production functionality; historical `code-dispatch` text may remain, while the canonical active Test Matrix uses `tool/ptc-dispatch-start` / `tool/ptc-dispatch`. |
| T01 / R1 | `T01_R1_PARTIAL`; tested SHA `e2802490d895979cb14e1b7e27c4d8ba075b3189`; latest report sequence ends at `3615fd3` | `FIXTURE_ONLY` additive `conversation.approval.detail` surface, R1 fixture store, React/jsdom and real SlotCore + Native ApprovalPanel composition tests. | Deployed Live Browser smoke is `NOT_RUN`; the fixture is not a real Assessment UI or Host-to-Browser bridge. |
| T02 / R2 | repair implementation `7c63c01`, publication/report sequence through `697db64` | `REAL_PINNED_RUNTIME` Host ToolRuntime/ApprovalService observation plus bounded pure tests. `ActiveExecutionIndex` mints opaque live IDs and preserves exact Session-object/callId collision semantics. | Diagnostic facade is read-only; no durable correlation or Assessment creation. Current public seams do not prove cross-plane invocation identity. |
| T03 / R3 | implementation `aa00f96`, publication/report sequence through `3c3fd9d` | `IMPLEMENTED_COMPONENT` conservative source-backed PTC replay with deterministic structural edges, ambiguity and degraded output; real trusted Session snapshot replay integration. | Actual native PTC producer is `NOT_RUN`; source replay is not live identity and does not implement Failure Analyzer or semantic retry/escalation. |
| T04 / R4 | repair implementation `2dfb7c2`, publication/report `2abafc7` | `IMPLEMENTED_COMPONENT` bounded Live/Durable/Approval ledger facts, source audit, recovery and cap behavior; pinned runtime observation controls. | Exact F-006/F-007/F-013 cross-plane invocation witness remains `PARTIAL/OPEN`; separate facts are not proof of two physical executions. True disk/process restart is `NOT_RUN`. |
| T05 / R5 | implementation `52e5a35`, final publication/report `9b453fd` | `REAL_PINNED_RUNTIME` paired native ApprovalService baseline/treatment, `IMPLEMENTED_COMPONENT` latency, and explicitly separated `CONTROLLED_SIMULATION`. Full run was 300 baseline + 300 treatment with 20 warmups. | No production Assessment/Context Builder/Judge/Publisher exists. `T_sync` is only a paired-delta estimate; all six provisional policy fields remain `UNDETERMINED`. Shared desktop host limits generalization. |

The exact full SHAs are recorded in the corresponding task reports and the current repository history. T06 does not edit those historical records.

## Inherited open-gate ledger

| Gate | Current status | Owner / dependency | Unlock condition |
|---|---|---|---|
| T01 deployed Live Browser | `NOT_RUN` | Product/UI owner; safe disposable Browser runner/profile and verified transport | Run a supported isolated Browser smoke against the packaged plugin without changing Harness/user state. |
| Native PTC producer | `NOT_RUN` | Harness/runtime owner; a real producer emitting the pinned durable event vocabulary | Capture real producer events and reconcile them without treating manually appended fixtures as producer proof. |
| T04 exact F-006 confirmation | `PARTIAL/OPEN` | Architecture + Harness seam owner; exact invocation witness | Prove one physical live traversal and one durable confirmation refer to the same invocation using a verified identity, not `(Session, callId, name)` guessing. |
| T04 exact F-007 cross-plane conflict | `PARTIAL/OPEN` | Architecture + Harness seam owner | Exercise a real exact witness with contradictory terminal claims and retain both facts without unsupported identity joins. Local reducer conflict handling is not this witness. |
| T04 exact F-013 cross-plane dedupe | `PARTIAL/OPEN` | Architecture + Harness seam owner | Prove overlap identity across live and durable planes; until then keep facts separate. |
| True disk/process restart | `NOT_RUN` | Persistence/runtime owner | A safe restart fixture with trusted committed Session source and explicit persistence semantics. In-process reconstruction is not process-restart evidence. |
| Current upstream Session V4 | `NOT_VALIDATED` | Compatibility owner | Independent review and a separately approved baseline change; frozen T06 Harness pin remains authoritative here. |
| Real Assessment lifecycle | `NOT_IMPLEMENTED` | Product architecture/implementation | Implement and test `AssessmentEnvelope`, `AssessmentStore`, coordinator, lifecycle expiry and resolved-approval immutability. |
| Context Builder / deterministic features | `NOT_IMPLEMENTED` | Product architecture/implementation | Implement a bounded facts-only Context Builder after exact live identity is available. |
| Judge / publisher / real latency policy | `NOT_IMPLEMENTED` / `UNDETERMINED` | Product architecture/implementation | Implement production paths, then remeasure real TTF/TTFinal, timeouts, concurrency and `T_sync`; T05 simulation values are not defaults. |
| Browser read bridge / product presentation | `NOT_IMPLEMENTED` | Product + verified Host/Browser seam owner | Freeze a public transport and DTO ownership contract, then implement a degraded-safe read surface. |

## Gate classes

### Product readiness

`NOT_READY`. Phase 1 Host Skeleton items are incomplete, and Phase 2–10 product behavior must not be inferred from T02–T05 components. There is no RiskAssessment recommendation path and no production Assessment UI.

### Compatibility

`PINNED_ONLY`. All runtime evidence is tied to local Harness `ddefc45fbc7f8e46dd73185e68295696d1297887`. The separately observed upstream `4878cdabd87d4041bdaff61d04c966883b9fd07a` is not a new baseline and remains unvalidated.

### Safety

`BOUNDED_PARTIAL`. Existing code preserves native Approval authority, fail-open observer behavior, collision ambiguity and degraded recovery. P0 product invariants involving actual Assessment, critical unknown policy, resolved-approval presentation and exact cross-plane identity remain unproven.

### Performance

`BOUNDED_CURRENT-HOOK_ONLY`. T05 measured current native approval overhead and component paths. It did not measure a production Assessment. No numeric production timeout or concurrency threshold is accepted by this document.

## Closure rule

T00–T05 are suitable inputs to a new architecture review. They are not a V1 release, not permission to begin Phase 1A, and not an `ACCEPTED` judgment. The next action is ChatGPT Web review of the Phase 1 gap manifest and the proposed Phase 1A cut.
