# Risk Advisor — Phase 1B Implementation Instructions (Codex)

**First read adjacent `Phase1B_Architecture_Freeze.md` in full. It is the implementation authority.** Phase1B is a formal product Host task, not another R-spike. Codex implements, tests and reports; ChatGPT Web alone independently accepts or requests repair.

## 0. Exact preflight and protections

1. Work ONLY in `D:\Harness\harness-plugin\dsh-risk-advisor`. Record branch/status/index/untracked and prove `HEAD == origin/main == git ls-remote origin refs/heads/main` or safely fast-forward linear plugin `main`. Expected start `0954d92e6ae0018e9c2c58401e4b6635402cfe94`; STOP for unexpected divergence. Never reset, clean, rebase, force or stage unrelated drift. Protect especially `docs/risk-advisor-current/`, local `Phase1A_Repair_Instructions.md`, `T01_Final_Runtime_Gate_Instructions.md`, `.vitest-cache/`, `lib/`, `node_modules/`, untracked `pnpm-lock.yaml` and newly discovered drift.
2. Inspect `D:\Harness\deepseek-harness` local `ddefc45fbc7f8e46dd73185e68295696d1297887` source/status **read-only**; never fetch/pull/checkout/build/install or write its tree or `.git`. Preserve `build.log`, `install.log`, `t0-*`, `undefined/` etc. The newer remote `4878cdab...` is not this phase's reference.
3. Verify both exact supplied Phase1B documents in `docs/tasks/Phase1B-assessment-envelope/`. Read canonical Architecture §§5 (ADR-001/003/004), 7.13, 12–13, 30, 37–39, 43–47; Risk Engine Contract §§41–55 (especially distinct immutable completed RiskAssessment); Test Matrix P0, Area B and J; T06 gap/proposal; accepted Phase1A source/report; current `src/index.ts`, `correlation.ts`, `operation-foundation.ts`, `ledger.ts` and all inherited tests. Verify real frozen `ApprovalService.request()` commit/notification and `approval/asked` / `approval/decided` event shapes, not just mocks.

## 1. Implement the approved private composition

- Add bounded `ApprovalAssessmentCoordinator` + `AssessmentStore`/shell under `src/host/`; create only the Phase1B shell specified in Freeze. Prefer a pure reducer/store plus a small Event-to-store adapter. Wire its observer through the existing private correlation installer, reusing **its single exact ActiveExecutionIndex** and Phase1A diagnostics. Preserve external `installCorrelation(ctx)` and `riskAdvisorCorrelation`, `riskAdvisorFoundation`, `riskAdvisorLedger` facades unmodified; preserve `apply(ctx)` one index/one Foundation/one Ledger. Do not add another UUID mint or read a Ledger ordinal for execution identity.
- Observe the post-commit `session/event` of `approval/asked` and `approval/decided`. Identify exact `(Session object, approvalId)`, normalize only bounded safe ID strings, call the existing `index.lookup(session,callId)` on asked, and read `foundation.diagnostics.get(executionId)` only after unique FOUND. Do not read `approval/asked.reason`; never read private raw Foundation Snapshot/hash. Duplicate asked/decided and conflicting same-id events must be idempotent/degraded without rebinding or overwriting an observed final native outcome. Scope-bound orphan decision is not a synthetic request.
- Model `AssessmentEnvelopeShell` separately from full canonical AssessmentEnvelope. Only a proven FOUND may mint its fresh assessmentId and carry an executionId. While no actual engine exists, immediately resolve an internally created pending shell to `unavailable / ASSESSOR_NOT_IMPLEMENTED`; never expose a fictitious ready score, recommendation, Assessment, rule stage or operationHash. If a unique live ID exists but snapshot is missing/degraded, preserve that distinction in safe status/reasons. Unbound and ambiguous are unavailable and have no candidate executionId.
- On real decided, mark closed; no late result, repeated event, session disposal or old HMR generation may revive/alter assessment or imply it was shown to the user. Do not create `presentedAssessmentId`. Match Session identity and approval id exactly. Clean up `session/disposed`; effect disposal clears the generation.
- Enforce bounded max 256 records, completed TTL 10min (monotonic injectable test clock), completed-first eviction and conservative all-active refusal with Native path unchanged. No active-approval auto-cancellation or synthetic timeout based on T05; no unbounded tombstones. Expose only immutable detached read-only Host diagnostics (`getForApproval(session,id)`; optionally exact `getByAssessmentId(id)`), no writer/capture/Session/exec/private args/exception text. Provide reason codes, not source strings.
- Failure containment: all observational steps are bounded/synchronous, never throw through Native `session.append` or use `approval/request`; never return Harness ApprovalOutcome. No pending promises keeping Native awaiting adviser; no external/provider/network/Browser calls.

## 2. Focused and real integration proof

Implement the numbered `P1B-01..12` gates from Freeze using pure/component negative tests PLUS actual frozen Host `Context + SessionStore + ToolRuntime + ApprovalService`. At least one integration must invoke genuine `ctx.approval.request` from a harmless local tool while Native answerer is deliberately held pending; inspect coordinator while pending, then resolve `allowed-once` and prove closed state and one native answerer. Add actual policy-never (no approval/request invocation) and failure containment controls. Synthetic `Session.append()` may inject duplicate, conflicting, missing ID, orphan, out-of-order and disposal events but MUST be marked component-only. Test exact same-Session object vs another Session object with equal `.id`, callId reuse, collision, two rapid approvals and no association to history. Test CAPTURED/DEGRADED/expired Foundation diagnostic distinction and no fabricated complete Envelope. Test privacy with secret `reason` and tool payload; freeze/detach returned objects; no `ready` or presented association. Use injectable clock for capacity/TTL, no wall-clock sleeps as proof.

Focused test count is whatever the implementation honestly creates; inherited baseline is 79 (T01 9, T02 16, T03 17, T04 21, T05 3, Phase1A 13). Do not claim canonical Test Matrix J-001/004 Browser E2E passed from Host integration. Negative checks: `rg`/source audits show no new `approval/request` answerer, mutation of Native outcome, provider/LLM, raw source payload in diagnostics, historical join, second ExecutionId mint, new Browser/product UI route or public mutable store.

## 3. Gates, final full regression and scope

Execute in this order:

```text
preflight + exact pinned-source read-only verification
→ pure reducer / bounded shell implementation
→ same-owner Host wiring + focused unit/fault tests
→ genuine ApprovalService integration and observer/failure/privacy proof
→ architecture/P0/scope audit
→ low-cost gates: typecheck, available lint (NOT_CONFIGURED if absent),
   build Host+Client, Host export smoke, pack dry-run, diff/secret/privacy checks
→ fix issues and rerun affected focused/static checks as needed
→ exactly ONE final fresh complete `pnpm test` on final executable state
→ report / explicit open-gate recording (docs-only after final test)
→ exact-scope implementation/test commit and separate report-only commit if practical
→ normal push, verify HEAD == origin/main == git ls-remote origin refs/heads/main
→ STOP for ChatGPT Web independent source/diff/evidence audit
```

If a real executable fix follows the full regression, its previous evidence is no longer final: re-run relevant checks and a fresh final full on the new tested SHA. `pnpm test` includes the P1B suite via narrow package script edit. Do not run PAH Canonical Full or re-run R5 full benchmark without a justified new measurable product pipeline (none is authorized here).

Allowed paths: new Host shell/controller, minimal `src/index.ts` / private correlation wiring, focused tests, `package.json` test scripts, the two supplied docs, and one updated task `Execution_Report.md`. No frozen baseline/prior task report/source beyond this necessary seam change; no dependency install or Harness edits; no Phase1C/Phase2 work. Preserve local user drift without staging it; if the repair file for Phase1A is untracked, preserve it unmodified.

## 4. Execution Report and STOP

Author `docs/tasks/Phase1B-assessment-envelope/Execution_Report.md` ONLY (no Acceptance Report). Include exact source and identity proof; implementation manifest; real `approval/asked/decided` and independent answerer evidence; P1B-01..12 proof levels/counts; capacity, TTL, disposal, privacy; new/tested and report-only SHAs; full inherited + new regression and low-cost gates; Harness strictly read-only; user drift protection; zero provider/privileged/Browser/native PTC calls; all inherited OPEN gates; no real Assessment/Rule Engine/Context Builder/Judge/Publish and all six T05 budgets still UNDETERMINED. Clearly distinguish internal shell and completed RiskAssessment.

STOP with `PHASE1B_ARCHITECTURE_DECISION_REQUIRED` if exact single index cannot be shared, real approval seam differs from frozen source, semantics require inventing operationHash/full RiskAssessment, Foundation public facade would have to expose raw details, Native Approval is changed or blocked, bounds/privacy fail, unexpected remote ancestry/drift cannot be protected, or task needs Phase1C/provider/Harness changes. Otherwise hand off outcome `PHASE1B_PUBLISHED_READY_FOR_REVIEW`, without self-declared ACCEPTED. Do not auto-start Phase1C.

### Compact Codex handoff

```text
Outcome / task directory:
Frozen plugin/Harness base:
New shell/coordinator source, exact identity/approval ownership:
Actual Native Approval integration and privacy:
P1B focused / inherited full / typecheck / build / export / pack / scope:
Current missing real engine, Browser and inherited OPEN gates:
Tested SHA, report, final remote SHA equality:
Protected drift intact; no Acceptance Report; STOP.
```
