# Risk Advisor Open Validation Register

**Open status:** `REAL_AGENT_GENERALIZATION_UNVERIFIED`
**Related blocker:** `PHASE13_3_SCOPE_REPAIR_BLOCKED`
**Scope:** Real-Agent generalization and independent F1/F2 scoring remain open after Phase 14 deterministic acceptance.

Phase 14 acceptance does not convert Phase 13.3's incomplete or unscorable real-Agent evidence into a pass. Historical reports and artifacts remain authoritative for what was actually run.

## Preserved evidence

| Evidence | Recorded outcome | What it establishes |
| --- | --- | --- |
| `Phase13_3_Real_Agent_R1_R5_Execution_Report.md` (commit `88411ba03721a0c6840a2b0a86db7c3a6effc58c`; run `phase13-real-agent-r1-r5-mac-20261009-v1`) | Stopped at 5/20 tasks and 23 Tool calls after R2-01 crossed its task directory and inspected the campaign root; R3–R5 did not run. | Partial execution only. No eligible positive F1 retry sequence or controlled F2 mismatch was observed; recall is unmeasured. |
| `Phase13_3_Validation_Repair_Execution_Report.md` (commit `94872419f84c392f5c8527dd5239792bee06cb7`; run `phase13-real-harness-observational-validation-repair-20261009-v1`) | A separate run also stopped at 5/20 tasks and 23 Tool calls. R2-01 searched outside the task root, inspected another campaign tree, and performed a bounded filename search under the user home; the global safety stop fired. | Fixture/manifest classification and stop scope were clarified without changing scoring truth. No complete campaign or positive F1/F2 coverage resulted. The blocked Session and Workspace evidence were retained. |
| `Phase13_3_Real_Harness_Campaign_V2_Execution_Report.md` (commit `ac59b834cff446fe5d823a9ea37a9af4ef2bd9e7`) | 20 Sessions, 20 task submissions, 129 Tool calls; 17 terminal responses and 3 awaiting clarification. | Public evidence did not expose a Finding or an explicit no-Finding result. F1/F2 are `UNSCORABLE`, not true negatives. |
| `Phase13_3_Minimal_Campaign_Scope_Repair_Report.md` (commit `defa64901450dc10eeafbcfcd18353f57eab8ba4`) | `PHASE13_3_SCOPE_REPAIR_BLOCKED`; no third full campaign was started. | Pinned Harness `workspace-write` did not provide a demonstrated Bash read/list boundary outside the task directory. |

## Blocking condition and missing proof

The pinned Harness workspace configuration does not establish that an Agent's Bash Tool cannot read or list files outside its task directory. A task prompt, temporary HOME, workspace layout, or declared workspace-write mode is not proof of an enforced file-access boundary. Both R2-01 attempts demonstrate why relying on task instructions and directory layout alone is insufficient; the later run also crossed into another campaign tree and attempted a bounded user-home filename search.

The missing proof is a supported, independently verifiable execution boundary that prevents file reads and directory listing outside the declared task root, demonstrated against a synthetic decoy sibling while preserving normal Harness Tool behavior. Until that evidence exists, a new complete real-Agent campaign cannot safely proceed under the frozen scope.

The recorded runs also lack completed R3–R5 opportunities, qualifying positive F1 coverage, a controlled F2 mismatch with independent postcondition truth, and public evidence sufficient to score the V2 observations. No recall, true-negative rate, or generalization conclusion may be inferred from these runs. The Phase 14.6 deterministic Browser and integration evidence does not fill those gaps. The final architecture review further records that the earlier Tool Scheduler Symbol identity and built-mode recovery concerns were not resolved by Phase 14.6's test-only acceptance.

## Follow-up condition

Keep this register open as `REAL_AGENT_GENERALIZATION_UNVERIFIED`. A future Phase 13.3 attempt requires a separately reviewed and authorized plan after a supported file-read/list isolation boundary has passed the synthetic-decoy proof. Any later campaign must preserve prior reports, use independent Tool and postcondition evidence, and classify absent or inaccessible Finding evidence as `UNSCORABLE` rather than `TN`. This Phase 14 closure neither authorizes that campaign nor changes its scoring rules.
