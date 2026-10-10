# Risk Advisor Phase 14.1 — Final Architecture Acceptance Report

## Final disposition

**`RISK_ADVISOR_PHASE14_1_FINAL_ACCEPTED_BASELINE_ADVANCED`**

Accepted feature: **Phase 14.1 Runtime Risk Awareness**, an advisory, non-blocking pre-execution-evidence deterministic risk assessment for ordinary Harness Tools, with native-approval A1 reuse and no competing approval control.

**Accepted executable/tested SHA:** `bd326bd6d0d550b2aa100bb7b176d2b5a4b227a1`  
**Implementation branch/report SHA merged into main:** `5119252e66b864fdac6eff4087fddf4585c974ac`  
**Pre-merge main:** `cf1ae64a97bc5116cffda48851be3708311c7fe8`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`

This final report is documentation-only and does not change the executable accepted SHA. Phase 13.3 remains BLOCKED/PARTIAL; Phase 13.4 is not authorized by this report.

## Historical evidence and repair lineage

| Candidate | Result | Role |
| --- | --- | --- |
| `0697fa2f117c4dca3f7a0f8320f01ab78972838a` | Fresh Full FAILED at P1B | Superseded diagnostic-only implementation attempt |
| `2cf79c7283a5ea9c9c567446a259bb84e7a4f32e` | Fresh Full 473/473 PASS | Repair1 candidate, rejected at independent architecture review for B1/B2 |
| `bd326bd6d0d550b2aa100bb7b176d2b5a4b227a1` | Fresh Full **477/477 PASS** | **Final accepted executable candidate (Repair2)** |

The original failed Full report and the Repair1 report remain unmodified. The `bd326bd..5119252` compare has **exactly one docs-only file**, `Phase14_1_Repair2_Execution_Report.md`. No executable, test, configuration, benchmark, package or build changes follow the final Full's tested SHA.

## Independent architecture review

The architecture reviewer retrieved the actual remote source, Phase 14.1 tests and three execution reports, verified commit ancestry, re-compared the source diff and found both previously blocking defects repaired:

1. **B1 — pending same-Session capture retention:** `src/host/runtime-risk-awareness.ts` no longer removes the prior non-approval record just because a new ExecutionId becomes the Session's latest display row. An older in-flight execution retains exact Session+ExecutionId association, queued scorer and stable A1; it can be claimed for its own later Native Approval. Latest UI projection stays singular. Focused regression covers same/different callIds, A/B overlaps and A approval after B capture without stale A row resurrection.
2. **B2 — capacity before ownership:** `src/host/assessment-envelope.ts` performs bounded coordinator capacity admission **before** calling `runtimeRisk.claimForApproval()`. An admission rejection leaves the ordinary base visible, queued, unowned and claimable later; no untracked phantom approval ownership. The deterministic capacity regression exercises rejection, later successful admission, A1 ID and assessment object reuse.

Other reviewed invariants:

- `tools/pre-execute` performs bounded observational capture, calls `next()` once and returns the unchanged downstream decision. Ordinary risk assessment is scheduled, not awaited in Harness Tool dispatch.
- The existing deterministic six-dimension assessment path is reused. Approval-side Fast/Deep Judge and Evidence continuation is separate; later revision IDs need not equal shared A1 ID. Nothing in Phase 14.1 originates an authoritative allow/deny/ask or changes native approval outcome.
- The existing native-approval status suppresses the order-20 ordinary risk dock reactively; the original approval-detail remains authoritative. F1/F2 Online Correction remains order 10.
- Browser route is read-only and Session-scoped, with bounded/sanitized DTO, optional opaque callId and no raw Tool arguments, path hints, prompt, result body, or verification secrets.
- Process-local records/queues, TTL, storage-free ordinary path, teardown/abort, and existing F1/F2 / Phase 11 writer contracts are preserved. No Harness Core/sandbox/permission modification or cross-framework Adapter.

No further acceptance-blocking architecture contradiction was identified in the reviewed scope. This is a bounded independent source review, not a fresh runtime audit performed by the reviewer.

## Evidence gates (Codex execution evidence reviewed, not rerun by ChatGPT)

| Gate | Evidence |
| --- | --- |
| Focused Phase 14.1 Host/Client/Tool, including B1/B2 | **23 tests / 3 files PASS** |
| P1B/P1C/P5/P6/P10 related regressions | **117 tests / 24 files PASS** |
| One fresh complete `pnpm test` on exact final candidate | **477 tests / 68 files PASS**, exit 0 |
| TypeScript typecheck and declaration production builds | PASS |
| Package export/dependency/declaration/dry-run | PASS (70 entries) |
| Static/authority/privacy/persistence/diff | PASS |
| Observed provider/model calls and Phase 13 Campaign | Not invoked as part of accepted focused/full tests |
| Independent architecture source, tests, SHA and remote diff review | PASS |

The review verified the execution report and remote source chain; it **did not** independently invoke `pnpm test`, rerun a provider, execute a real Agent task, or operate the local Mac checkout. Existing untracked `lib/`, `node_modules/` and `.vitest-cache/` and retained unclean detached test worktrees were explicitly preserved, not force removed. Their cleanup is a separate optional housekeeping action and not a Product acceptance gate.

## Merge and accepted baseline

A non-forced, expected-SHA-checked fast-forward advanced `main` from `cf1ae64a97bc5116cffda48851be3708311c7fe8` to `5119252e66b864fdac6eff4087fddf4585c974ac`. This final acceptance report is the only subsequent docs-only artifact. The accepted **executable** SHA stays `bd326bd6d0d550b2aa100bb7b176d2b5a4b227a1`.

- Phase 14.1: **FINAL_ACCEPTED**.
- Phase 13.2 deterministic truth: **unchanged**.
- Phase 13.3 real Harness positive coverage: **BLOCKED/PARTIAL, not cleared by Phase 14.1**.
- Phase 13.4 and follow-on Product implementation: **not started/authorized by this report**.

**Final authority:** Risk Advisor observes, assesses and advises; Harness independently authorizes and executes.
