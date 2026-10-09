# Risk Advisor — Harness-Native Risk Intelligence Boundary V1

## Status and purpose

**Architecture decision:** `RISK_ADVISOR_HARNESS_NATIVE_RISK_INTELLIGENCE_BOUNDARY_V1_FROZEN`  
**Type:** product positioning / architecture boundary only (docs-only).  
**Product name:** **Risk Advisor — Agent Execution Reliability & Risk Intelligence**.  
**Initial integration:** DeepSeek Harness native, separately installable/uninstallable plugin.  
**This document does not authorize implementation, remove existing functionality, accept Phase 13.3, or start Phase 13.4.**

Risk Advisor is an **advisory execution-risk intelligence plugin**. Its complete user value is **observe → assess → explain/recommend → independently verify → learn from qualified evidence**. It is **not** a second approval, permission, sandbox, orchestration, or execution Control Plane. Complete product experience does not imply ownership of the whole execution stack.

This is a prospective cross-phase product boundary. Existing accepted implementation-specific freezes retain authority over their exact schemas, trigger predicates, eligibility, data ownership, thresholds, migrations, scoring, and acceptance. An apparent contradiction must be resolved by a separate scoped architecture decision; this document does not silently amend an accepted contract.

## 1. Authority and non-duplication

| Responsibility | Sole authority / implementation | Risk Advisor permitted role |
| --- | --- | --- |
| Tool allow / deny / ask, approval answer, permission escalation | Harness (`ctx.approval`, `approval/request`, Tool policy) | Observe native facts; offer non-binding reasons |
| Sandbox, filesystem/process/network access, execution | Harness and OS, including existing ToolRuntime | Observe covered execution evidence; never enforce |
| Native approval UI and pending decision lifecycle | Harness Web / approval plugins | Additive informational risk detail in the existing surface |
| Risk features, risk explanations, recommended next checks | Risk Advisor | Own advisory computation, never authoritative permission |
| Verification and qualified historical intelligence | Risk Advisor Host-side deterministic services using Harness evidence and optional Storage Domain | Write only its own evidence-bound records; no Agent-controlled canonical writes |

Risk Advisor MUST NOT **originate, substitute, override or convert** an authoritative Harness `PreToolDecision` (`allow` / `deny` / `ask`) or `ApprovalOutcome` (`allowed-once` / `rejected` / `cancelled` / `unavailable`). It MUST transparently pass through the unchanged downstream decision when listening to a decision waterfall. It MUST NOT rewrite Tool results, mutate permission presets, cancel or resume Harness Tool execution, or grant automatic approval/veto authority. This does not prohibit cancelling Risk Advisor's **own** asynchronous advisory work.

Existing internal Risk Engine recommendation names such as `APPROVE`, `APPROVE_WITH_CAUTION` and `REJECT_RECOMMENDED` are **advisory labels only**, not Harness approval outcomes. UI wording SHOULD clearly distinguish “risk recommendation” from “approval decision”. Renaming frozen internal enums or changing serialization is **not** authorized here.

**Uninstall invariant:** removing/turning off Risk Advisor MUST leave the native Harness Tool, approval, permission and sandbox pathways operable under their own policies. Loss of optional Advisor storage/LLM/bridge functionality must not cause a new execution denial or implicit grant.

## 2. Harness hook and approval integration boundary

- Current `src/index.ts` uses `tools/pre-execute` for bounded operation capture and returns `next()`; `tools/result` observes settled facts. The ledger also transparently wraps `tools/execute`. Retain their existing identity, order and observation semantics.
- Any future Risk Advisor `tools/pre-execute` listener MUST delegate through `next()` and return its **unchanged downstream decision**, never act as a terminal decision-maker. It MUST NOT alter Tool arguments, execute a replacement Tool, or convert downstream decisions.
- Snapshot creation must be synchronous/bounded and exception-contained. If an asynchronous advisory assessment is scheduled, it MUST NOT hold `next()` open waiting for model calls, verification, Browser response, or storage; it requires independent cancellation, time and capacity bounds. Scheduling does not promise that the advice appears before Tool dispatch.
- `approval/request` is an authority-bearing waterfall. Risk Advisor's correctness MUST NOT depend on registering an answerer there. If a future non-terminal observer is justified, it MUST delegate without changing Harness's result. Prefer committed `approval/asked` / `approval/decided` Session facts for attribution.
- The currently implemented `ApprovalAssessmentCoordinator` is **native approval-associated risk assessment**, triggered by observed approval events; it does not grant approval. Preserve its existing contract and do not rebuild it as a second pre-execute engine.
- Browser presentation may continue in Harness's existing `conversation.approval.detail` slot and the distinct Online Correction dock. Do not add a duplicate confirmation modal, pending-approval state machine, or secondary approval button. An Advisor detail dialog is informational, not an approval dialog.
- Fail-open means **Advisor failure does not interfere with Harness's own decision path**. It does NOT weaken or override Harness fail-closed permission semantics.

## 3. Risk assessment layers — shared evidence, distinct contracts

| Layer | Trigger and timing | Semantics | Output / present state |
| --- | --- | --- | --- |
| Existing approval-associated assessment | Observed native `approval/asked` and correlated operation evidence | Non-binding risk analysis for an already pending native approval | Existing Risk Engine assessment and Harness approval detail |
| General pre-execution assessment (future) | Snapshot at `tools/pre-execute` independent of whether approval is requested | Predictive, before-result evidence only; may complete after dispatch | Risk prediction + explanation + advisory next check; **not implemented/authorized by this freeze** |
| F1 Online Correction | Settled Tool failure chain | **Contiguous**, immediately preceding, same-Session, supported exact operation-fingerprint retry path with frozen matching failure semantics | Advisory correction Finding; current frozen contract |
| F2 Online Correction | Tool settlement plus independent supported postcondition verification | Supported, evidence-qualified `MISMATCHED` postcondition, not merely exit code / Agent assertion | Advisory correction Finding; current frozen contract |

Shared foundations MAY include bounded correlation, Evidence, six-dimensional Risk Engine and independently qualified historical Pattern/Guidance. Shared foundations DO NOT imply shared trigger, validity predicate, identity, timing, Finding taxonomy, or authorization. Existing F1/F2 definitions and adapters MUST NOT expand to fit a future pre-execution feature. Unsupported, unavailable, conflicted or insufficient verification must remain explicitly unknown / not-applicable / unscorable as required by the existing contract; never invent a mismatch or success.

Any future general pre-execution assessment, new evidence bridge, or historical-intelligence consumer needs a separate versioned freeze with schemas, scheduling, privacy, lifecycle, stale-evidence handling, UI ownership and failure behavior.

## 4. Experience Loop authority — preserve Phase 11

The accepted Host-side durable lineage is:

`Harness tools/result → immutable ExperienceEpisodeV1 → append-only OutcomeRevisionV1 → qualified Pattern revisions → deterministic Historical Guidance revisions`.

1. **Episode** is a privacy-bounded immutable fact of one settled Tool attempt. Risk Advisor's deterministic Host runtime writes it on the authoritative `tools/result` event, independently of semantic-success verification; failed and not-executed attempts can have Episodes. An Episode does **not** mean “trusted successful experience”.
2. **Outcome** is a separate evidence-backed interpretation. Only the exact supported, internally consistent high/medium quality postcondition-verifier evidence can produce `VERIFIED_SUCCESS` or `VERIFIED_FAILURE` according to Phase 11.2. Approval, process exit 0, Tool `isError=false`, and Agent/user narrative alone cannot prove goal success.
3. **Pattern** is extracted only from qualified current verified-success Outcomes under Phase 11.3's deterministic eligibility and provenance rules. Trusted verified failure, uncertainty, suspension and invalidation continue to use the accepted revision semantics.
4. **Guidance** is a deterministic, immutable-provenance advisory projection of validated Pattern history under Phase 11.4. It currently does **not** automatically feed the Risk Engine, Browser, native approval, Tool dispatch or Agent prompts.

Only deterministic, authorized Host services commit the authoritative records. No direct Agent, model, browser or user write/overwrite path to Episode / Outcome / Pattern / Guidance is introduced. A hypothetical `ExperienceCandidate`, rollback-aware trust extension or new consumer is **future design**, not a new V1 writer or qualification rule. Do not replace existing Phase 11 storage or overwrite immutable history.

### Future historical evidence consumer (design guardrail; not implemented)

The first useful integration SHOULD expose provenance-linked, non-authoritative historical context or next-check guidance, **without directly changing risk level, allow/deny, or an existing F1/F2 Finding**. Require a separately frozen applicability/staleness check, uncertainty and conflict suppression, privacy budget and evidence provenance before surfacing advice. Exact fingerprint/workspace equivalence is **not** declared sufficient or necessary by this positioning freeze.

## 5. Coverage and competitive-value evidence

A positive is established by **independent eligible ground truth**, not by the presence of a Risk Advisor Finding. A missed eligible positive is FN. Report F1 and F2 separately with eligible positives/negatives, TP/FP/FN/TN, NA, unscorable, precision `TP/(TP+FP)`, recall `TP/(TP+FN)`, and false-positive rate `FP/(FP+TN)` where denominators exist; otherwise `N/A`. Track duplicates, wrong-Session attribution, stale/lifetime violations and upstream verifier gaps separately.

- F1 truth follows the frozen **contiguous exact retry-path** and same-root-cause semantics; altered or intervening Tool attempts break the path.
- F2 truth follows the existing supported Tool-contract / known-adapter postcondition check with independent expected effect and observed target state. An unsupported adapter is not a Product FN.
- Distinguish deterministic synthetic campaigns, controlled local fixtures run by real Agents, and naturally occurring real-Agent cases. Never reclassify fixture positives as spontaneous real-world failures.
- Suggested **future evidence-collection targets**: at least 20 independently scorable real-Agent F1 positives and at least 10 F2 positives accumulated across suitable campaigns. These are planning targets, **not** retroactive Phase 13.3 acceptance thresholds or statistical guarantees. Sample denominators, false positives and uncertainty must be published; arbitrary `<10%` / `<5%` FPR declarations without adequate negatives and confidence analysis are not accepted.
- Phase 13.2's accepted deterministic Campaign-3 (300 scenarios / 1500 Tool executions; F1 TP=160, F2 TP=250) remains accepted **deterministic evidence only**. The newer Phase 13.3 real Harness campaigns remain **blocked/partial** with no eligible observed F1/F2 positives and no measured positive-event recall. No Product defect or successful Phase 13.3 acceptance can be inferred from the absence of Findings.
- Agent attempts to read outside the declared task area are execution/environment/campaign-safety observations. They do not automatically establish F1/F2 failure or confer a new interception duty on Risk Advisor. Any later Campaign safety decision remains separately governed by its accepted testing contract.

The differentiator to demonstrate is **actionable execution reliability evidence**: earlier recognition of real repeated failures; credible postcondition mismatch discovery; useful, grounded recovery advice; trustworthy historical context; and bounded false positives/latency/privacy overhead. No claim of unique industry novelty or proven superiority is made by this freeze.

## 6. V1 non-goals

No new:
- universal multi-Agent governance system, general Control Plane, scheduler or Agent orchestration;
- independent approval service, approval UI/state machine, permission grants, sandbox or filesystem/network/process gate;
- `Guarded Mode` with veto/auto-approve/auto-retry semantics;
- generic observability dashboard or generic model/evaluator platform;
- model-quality benchmarking, prompt optimization engine or generalized Agent performance optimizer;
- PAH, Claude Code or other framework adapters, or premature generic Adapter/Core extraction;
- automatic Agent steering, Tool rewrite, autonomous correction or reinforcement from unverified outcomes.

Advisory suggestions of safer actions and human-readable explanations remain in scope; these are **not** equivalent to executing, applying, or enforcing them.

## 7. Work plan and acceptance boundary

**Now:** freeze these product/architecture boundaries and check existing code for contradictions. Preserve `src/index.ts` observation chain, `ApprovalAssessmentCoordinator`, Risk Engine, F1/F2, postcondition verifier, Experience Loop and approval-detail UI unless a separately evidenced defect warrants minimal repair. Optional future UI wording changes must not mutate serialized recommendation contracts without their own review.

**Later, separately authorized:** (a) complete trustworthy real Harness evidence under the existing Phase 13 constraints, (b) provenance-aware historical advice delivery, (c) truly general predictive pre-execution assessment. No new executable phase starts merely because this positioning is frozen.

**Proofs required before implementing future additions:** (1) unchanged native allow/deny/ask and approval answer with or without the plugin; (2) unchanged downstream `next()` and non-blocking failure behavior; (3) no duplicated approval UI or permissions state; (4) no Agent-authored canonical Experience history; (5) exact F1/F2 semantics and independent scoring preserved; (6) graceful optional dependency, cancellation and uninstall; (7) evidence/secret/privacy and lifecycle budgets respected.

## 8. Frozen reference authority

- `docs/baseline/risk-advisor-v1-architecture-v1.2.md` — approved Harness integration and plugin architecture.
- `docs/baseline/risk-advisor-v1-spec-v1.2-r1.md` and `risk-engine-contract-v1.0-r1.md` — existing product and Risk Engine contracts.
- `docs/tasks/Phase11-verified-experience-historical-guidance/Phase11_Final_Closure_Report.md` and Phase 11.1–11.4 freezes — immutable Episode / Outcome / Pattern / Guidance authority.
- `docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_2_Campaign2_F1_Exact_Retry_Path_Semantics_Decision.md` — contiguous exact retry path.
- `docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_2_Final_Acceptance_Report.md` — accepted deterministic validation.
- `docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_3_Real_Harness_Observational_Architecture_Amendment.md` — real Harness authority and observational responsibility; later unaccepted campaigns retain their own historical reports.
- Pinned Harness `ddefc45fbc7f8e46dd73185e68295696d1297887`. Accepted Risk Advisor Product executable `b1b605e91aec356b8a6e47d16a8c9ef70b0ad3df`.

**Final boundary:** Risk Advisor advises; Harness authorizes and executes. Verification qualifies outcomes; historical facts do not grant permission. Harness-first is a V1 product choice, not permission to move Risk Advisor into Harness Core.
