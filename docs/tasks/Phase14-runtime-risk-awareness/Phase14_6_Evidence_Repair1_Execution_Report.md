# Risk Advisor Phase 14.6 Evidence Repair1 Execution Report

**Status:** `RISK_ADVISOR_PHASE14_6_EVIDENCE_REPAIR1_READY_FOR_ARCHITECTURE_REVIEW`  
**Starting `main`:** `a5f67af539505ea161484bf50a35d9c735b68096`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Original tested candidate:** `a5cd0bcc596a671520f62e22a0930b0677a203f0`  
**Original execution report:** `9f2fd03415ddf68f9c30b21d7aa9ac352408dc29`  
**Independent review:** `41c2e974bfb8ba4020f8d9568ed799de7b67eaa3`  
**Repair1 tested candidate:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`  
**Implementation branch:** `codex/phase14-6-evidence-repair1`

This report is documentation-only. The original `a5cd0bc` Full record and its execution report remain unchanged. No main advancement or Phase 14 closure is claimed.

## Lineage and accepted history

The verified lineage is `a5f67af` → `a5cd0bc` → `9f2fd03` → `ab3e17c`. Each Phase 14.1–14.5 accepted executable is an ancestor of this candidate. The exact accepted ledger read from the final reports is:

| Phase | Accepted executable | Complete Full evidence |
| --- | --- | --- |
| 14.1 | `bd326bd6d0d550b2aa100bb7b176d2b5a4b227a1` | 68 files / 477 tests |
| 14.2 | `ab0aeec26d07bcc8a044bbec03cbb587386d1c73` | 71 files / 494 tests |
| 14.3 | `3b23d05b6ec64d68ddc211fe5dfb3154984f0982` | 73 files / 503 tests; authorized recovery Full |
| 14.4 | `ecf84c29a0ca9114ff7cd2779dca6ec021d1b699` | 76 files / 521 tests; earlier 517-test Full remains historical |
| 14.5 | `547f00ba6e7e1d2495f54093e02a03b8a74c362f` | 78 files / 548 tests |

The earlier Phase 14.6 candidate remains `a5cd0bc`, with its original fresh Full `phase14-6-full-20261010-a5cd0bc-attempt1`: 80 files / 552 tests, zero failures and zero skips. Repair1 adds two tests; it does not rewrite or supersede that historical result.

The existing C1–C12 evidence map in `Phase14_6_Integration_Execution_Report.md` remains applicable. This repair adds the missing C4/C9/C8 integrated evidence below; the new exact-candidate Full replaces only the prior Full evidence for C12.

| Gate | Evidence retained or completed |
| --- | --- |
| C1 — Accepted lineage | Five accepted executables and reports reconciled above; all accepted SHAs are ancestors of the tested candidate. Original 552/552 evidence is preserved. |
| C2 — Host route lifecycle | Existing Phase14.6 actual Host `apply()` test checks eight distinct routes through three disposal generations. |
| C3 — Native approval boundary | Existing P10 approval-parity and Phase14.1 ordinary-risk suppression regressions passed. |
| C4 — Ordinary risk/F1/F2 independence | New E1 same-Session actual Tool lifecycle, ordinary-risk read, F2 settlement, out-of-order result and duplicate-delivery proof. |
| C5 — Historical-view scope | Existing Phase14.2–14.4 Host/Client expiry, revocation, provenance and Session-scope regressions passed. |
| C6 — Combined Dock | Existing positive F2 + historical + next-check render and independent optional-read failure cases passed; E2 adds concurrent Session/generation transitions. |
| C7 — Verifier authority | Existing stored-verifier mismatch and Phase14.5 current/expired verifier regressions passed. |
| C8 — Production Browser artifact | New E3 real Chromium artifact load plus the existing pinned Harness module-system, CSS, slot and disposal test. |
| C9 — Session freshness/fencing | E2 exact Session/Finding and delayed-response generation fencing; existing Phase14.2–14.5 1Hz and 1499/1500 ms boundary tests passed. |
| C10 — Resource/HMR | Existing P10 route/lifecycle and Phase14.4/14.5 Session-store capacity/eviction regressions passed. |
| C11 — Privacy/authority | Existing F2 sentinel redaction assertions, P10 prompt-privacy and Phase12 schema/boundary tests passed; no authority or persistence path was added. |
| C12 — Release gates | All listed pre-Full gates and the one new complete Full on exact `ab3e17c` passed. |

## E1 — Same-Session ordinary risk and F2 lifecycle independence

`tests/p14-6-cross-surface.integration.spec.tsx` uses the pinned Harness ToolRuntime and actual Risk Advisor Host `apply()` in one Session. The test holds an older Tool body after pre-execution, observes its exact ordinary-risk `VIEW` and verifies the F2 read is empty before settlement. That view is explicitly `DEGRADED` with reason codes, so the proof distinguishes an available degraded projection from a missing projection and does not invent a positive risk assessment.

A newer matching Tool execution becomes the Session's ordinary-risk row. Releasing the older real Tool result produces one stored-verifier F2; the ordinary-risk row remains associated with the newer execution. Re-delivering the settled `tools/result` twice leaves the single Finding unchanged and does not restore the older risk row. F1/F2 predicates and product code were not changed.

## E2 — Two optional modules across Session and generation changes

The same integration mounts both optional Correction clients and the actual Dock against Sessions A and B. A real stored-verifier mismatch produces the current F2. The actual Host returns both historical-context and next-check `VIEW`s for A's exact Session/Finding; the test holds both responses, selects empty Session B, replaces the connection generation, then delivers the late A responses. Neither F2 nor either optional view appears in B.

On returning to A, the current F2 and next-check remain visible. The trusted failure has meanwhile invalidated the qualified Pattern, so a fresh Host historical-context read is `NOT_FOUND` and old Guidance stays hidden. The test asserts the Pattern is `INVALIDATED` and that the delayed responses were for A's exact Finding. This exercises current-authority withdrawal as well as stale-response and generation fencing; it does not treat withdrawn history as a Client defect.

## E3 — Production Client artifact in real Chromium

The exact candidate was built in the detached Full checkout. Its production `lib/client.js` SHA-256 is `52b467dd445b73435b55a8c3dd71aa18a40acce8bbd0616587199350c5c97fe3`; a static scan found no `node:` references.

An isolated Playwright context launched the installed Google Chrome **154.0.8037.99** against `about:blank`, with all non-blank requests blocked. Chromium loaded the generated bundle through the pinned-compatible `window.__ModuleLoader__.load` registration seam. The production registration identified `@dhandil/dsh-risk-advisor`, exported `apply()`, and ran against a bounded slot/locale context: the two Dock IDs registered at orders 10 and 20, one approval-detail slot registered, three locales registered, and all 13 effect disposers removed slots/locales. External requests: zero. The temporary browser and page were closed.

The separate `tests/p14-6-browser-module-loader.spec.tsx` also passed in the pinned Harness Client module system; it verifies CSS injection, actual slot registration and disposal. It is reported as the pinned-loader jsdom proof, not as the Chromium run.

## Gates and exact-candidate Full

All pre-Full gates passed:

| Gate | Result |
| --- | --- |
| Phase 14.6 focused | 2 files / 6 tests PASS |
| Phase 11.1–11.4 | 5 files / 73 tests PASS |
| Phase 12.1–12.2 | 2 files / 65 tests PASS |
| Phase 14.1–14.5 | 13 files / 94 tests PASS |
| P1C, P6, P7, P10 | 24 files / 106 tests PASS |
| Typecheck and declaration/production build | PASS |
| Package dry-run | PASS; package files/exports resolved |
| Static, diff-boundary and Browser bundle checks | PASS |
| Real Chromium E3 smoke | PASS; evidence above |

The fresh Full ran once on exact candidate `ab3e17c1834b9ae2082369e35178d7006efb9e35` in a new detached, tracked-clean checkout at `/Users/tongxin/Developer/Harness/harness-plugin/.p14-6-evidence-repair1-full`. The checkout resolved `../../deepseek-harness` to the pinned Harness SHA. `pnpm install --frozen-lockfile --offline` reused 163 cached packages and downloaded zero packages; typecheck, build, focused Phase 14.6 and package dry-run passed before Full.

- Run ID: `phase14-6-evidence-repair1-full-20261010-ab3e17c-attempt1`
- Command: `pnpm test`
- Ordered stages: 29
- Result: **PASS, exit 0; 80 test files / 554 tests passed; 0 failed, 0 skipped**
- Full log: `/tmp/phase14-6-evidence-repair1-full-ab3e17c-attempt1.log`
- Fresh Full checkout and Harness tracked trees: unchanged; generated `node_modules/`, `lib/` and `.vitest-cache/` were retained.

The trusted-history tests in this Full measured Phase14.2 exact-read p95/p99 of 0.0019/0.0038 ms at 3,333 qualified Pattern/Guidance identities, Phase14.3 approval-bound lookup p95/p99 of 0.0271/0.0405 ms at 3,333 identities, and Phase14.4 correction-history lookup p95/p99 of 0.039541/0.053625 ms at 3,333 identities. Phase14.4's 1,000-sample synchronous capture measured p95/p99 of 0.101417/0.120667 ms. These are bounded test measurements, not production latency guarantees.

The only tracked change from the original report commit `9f2fd03` through tested candidate `ab3e17c` is `tests/p14-6-cross-surface.integration.spec.tsx`. No `src/**`, prior-phase test, Harness, Freeze, `validation/**`, package, lockfile, config or benchmark file changed. After the Full, this report is the only permitted addition.

## Open Phase 13.3 validation register

Phase13.3 remains **`REAL_AGENT_GENERALIZATION_UNVERIFIED`**. This deterministic repair neither starts nor reclassifies a real-Agent campaign.

- The R1–R5 real run retained **5/20 tasks, 23 Tool calls** and stopped at R2-01 after the Agent crossed its task directory. R3–R5 were not run. Subsequent validation repair clarified that this was a task-level scope violation; it did not change the actual stop or score truth. F1 had no eligible positive retry sequence; F2 had matched supported outcomes but no controlled mismatch. Positive recall remains unmeasured.
- The later V2 observational run submitted **20 Sessions / 20 tasks** and observed **129 Tool calls**; 17 reached terminal responses and 3 awaited clarification. Public evidence did not expose a Finding or explicit no-Finding result, so F1/F2 were **UNSCORABLE**, not true negatives.
- `Phase13_3_Minimal_Campaign_Scope_Repair_Report.md` records `PHASE13_3_SCOPE_REPAIR_BLOCKED`: the pinned Harness `workspace-write` configuration does not establish a Bash read/list boundary outside the task root. It prohibits claiming a prompt, temporary HOME or directory layout is a sandbox. A complete campaign restart remains unsafe until a supported boundary is demonstrated against a synthetic decoy sibling.
- The earlier provider-environment preflight report remains part of the history, but does not replace or summarize away the later partial and unscorable runs above.

The historical reports, fixtures, Sessions, retained Workspace registration, original Phase 14.6 worktrees and prior Full artifacts were left untouched. No Harness Host, Agent or provider was started for this repair. The temporary Chromium and all test processes are closed. Remote `main` remained `a5f67af539505ea161484bf50a35d9c735b68096` at report preparation; this independent branch is submitted for architecture review only.
