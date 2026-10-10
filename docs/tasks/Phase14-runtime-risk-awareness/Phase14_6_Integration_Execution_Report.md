# Phase 14.6 Integrated Closure Execution Report

**Execution status:** `RISK_ADVISOR_PHASE14_6_INTEGRATION_READY_FOR_ARCHITECTURE_REVIEW`
**Implementation branch:** `codex/phase14-6-integrated-closure`
**Starting and current main at candidate creation:** `a5f67af539505ea161484bf50a35d9c735b68096`
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`
**Tested executable candidate:** `a5cd0bcc596a671520f62e22a0930b0677a203f0`

This report submits deterministic integration evidence for independent architecture review. It does not accept or close Phase 14, advance main, or close Phase 13.3.

## Baseline and accepted Phase 14 lineage

The candidate is a direct child of the requested baseline. Every accepted Phase 14 executable below is an ancestor of the candidate. Each final acceptance report is present in the baseline; no historical acceptance report was edited.

| Phase | Accepted executable | Complete Full | Final acceptance report and report commit |
|---|---|---:|---|
| 14.1 | `bd326bd6d0d550b2aa100bb7b176d2b5a4b227a1` | 68 files / 477 tests | `Phase14_1_Final_Acceptance_Report.md`, commit `f58f0e90623f05ee4db2fff67fa1d36202b565f8` |
| 14.2 | `ab0aeec26d07bcc8a044bbec03cbb587386d1c73` | 71 files / 494 tests | `Phase14_2_Final_Acceptance_Report.md`, commit `beb2fc561f90b3b7673f865097647034c8958a29` |
| 14.3 | `3b23d05b6ec64d68ddc211fe5dfb3154984f0982` | 73 files / 503 tests; recovery Full | `Phase14_3_Final_Acceptance_Report.md`, commit `bdc99b17fee97cca6220d4a852f49dc21131c038` |
| 14.4 | `ecf84c29a0ca9114ff7cd2779dca6ec021d1b699` | 76 files / 521 tests | `Phase14_4_Final_Acceptance_Report.md`, commit `7a59d32d43077668a526538b6ad3fc7f1dac4ab7` |
| 14.5 | `547f00ba6e7e1d2495f54093e02a03b8a74c362f` | 78 files / 548 tests | `Phase14_5_Final_Acceptance_Report.md`, commit `c930a9a29e0bd4479cadd79b11405aa2e482336d` |

The accepted executables form the repository's chronological ancestry; the five reports preserve the later docs-only acceptance evidence. Phase 14.3's original infrastructure-incomplete attempt and Phase 14.4's superseded 517/517 run remain recorded in their prior reports. They were not substituted for the accepted recovery/final runs.

## Permitted changes and focused integration proof

The candidate changes only `package.json` and two new `tests/p14-6-*.spec.tsx` files. The package change adds `test:p14.6` and appends it to the existing complete `pnpm test` chain. There are no product, existing-test, Harness, validation, freeze, lockfile, dependency, build-config, or benchmark changes.

| Gate | Evidence and result |
|---|---|
| C1 — Accepted lineage | All five accepted executable SHAs above were checked as ancestors of the candidate. The baseline contains all five final reports; Phase 14.3 recovery and Phase 14.4 superseded-run history remain distinguished. PASS. |
| C2 — Host route lifecycle | `tests/p14-6-cross-surface.integration.spec.tsx`, test “registers exactly eight Host routes and clears every handler over three apply/dispose generations”, calls the actual Host plugin lifecycle, checks eight distinct Risk Advisor routes, and verifies removal on each of three generations. PASS. |
| C3 — Native approval boundary | `tests/p10-coexistence.integration.spec.ts` proves native outcome parity with the plugin absent/present and actual timeout/failure/close paths. `tests/p14-1-runtime-risk-client.spec.tsx` proves matching ordinary-risk rows are hidden during native approval and revalidated after settlement. No second approval decision is introduced. PASS. |
| C4 — Current risk and live correction independence | `tests/p14-1-runtime-risk-tool.integration.spec.ts` checks the Tool dispatch/result path and single pre-execution advisory; `tests/p12-1-live-correction.spec.ts` retains the frozen F1/F2 predicates and suppression cases. The new positive integration creates a current F2 from a real pinned Tool result and stored verifier mismatch. PASS. |
| C5 — Historical views remain scoped | Existing Phase 14.2, 14.3, and 14.4 Host/Client suites cover qualified Guidance, approval history, correction history, revocation, expiry, exact Session identity, and stale response suppression. These remain read-only optional projections. PASS. |
| C6 — Combined Dock positive and negative | `tests/p14-6-cross-surface.integration.spec.tsx` mounts the actual Client Dock with one actual current F2 plus both 14.4 historical context and 14.5 next-check. Separate failure-injection cases make each optional RPC fail in turn and assert that the original F2 and the other optional view remain. RPC failures are deterministic fixture injections; the positive F2 and Host routes use the pinned Harness runtime. PASS. |
| C7 — Stored-verifier authority | The new positive case checks the exact stored verifier record (`tool-contract`, `tool.write.v1`, `MISMATCHED`) before observing the F2 and next-check. `tests/p14-5-correction-next-check.spec.ts` N4 proves unavailable/expired verifier evidence cannot remove the underlying F2. History does not create F2. PASS. |
| C8 — Production Browser artifact | `tests/p14-6-browser-module-loader.spec.tsx` evaluates generated `lib/client.js` through the pinned Harness Client module loader, verifies plugin registration, CSS injection, Dock and approval-detail slots, and disposal. The generated artifact has no `node:` import. PASS. |
| C9 — Session freshness and response fencing | Existing Phase 14.2 H10, Phase 14.3 A8, Phase 14.4 C9, and Phase 14.5 N10 tests cover Host-observed freshness, the 1499/1500 ms boundary including delayed replies, 1 Hz/single-flight reads, Session changes, aborts, and late-response fencing. PASS. |
| C10 — Lifecycle and resource bounds | Existing P10 Host HMR/resource tests cover three mount/dispose/remount generations, queue bounds, and quiescence. Phase 14.4 B2 and Phase 14.5 N9 cover bounded Session stores and eviction while preserving active views. PASS. |
| C11 — Privacy and authority | The new integration asserts serialized Host history and rendered Dock omit synthetic path/content sentinels. Existing P10 prompt-privacy and Phase 12 Finding schema tests check broader path, argument, content, prompt, and secret boundaries. Phase 14.6 adds no authority, persistence, telemetry, provider call, or Tool control. PASS. |
| C12 — Regression and release gates | The required regressions, typecheck, build/declarations, pack/export, static/privacy checks, production Browser loader smoke, and one complete Full all passed. Exact Full evidence follows. PASS. |

The integration fixtures use synthetic, clearly labeled local evidence. No real provider, real Agent task, user profile, native user Session, or Tool-side network was used. The optional-read negative cases are injected failures and are not represented as live network failures.

## Quality gates and performance evidence

The new focused suite passed 2 files / 4 tests. Required regressions also passed: Phase 11.1–11.4, Phase 12.1–12.2, P1C, P6, P7, P10, and Phase 14.1–14.5. Typecheck, production Host/Client build and declarations, `npm pack --dry-run --json` (90 package entries, no bundled dependencies), package export checks, `git diff --check`, and static/privacy checks passed. The package check confirmed the Client JavaScript and declaration entries are included. The Browser loader smoke read the generated artifact and passed.

The exact Browser artifact produced in the detached Full checkout was `lib/client.js`, SHA-256 `a4ad5e4fe4113e52549e6dd30b7a2f83e792349f4c14c4120f3adfd396d0326a`; it contains no `node:` imports. The 60,000-entry Phase 14.2 index-pressure test remains explicitly synthetic and used one real active row; it is not described as 60,000 qualified histories.

The complete Full output preserved the existing trusted-history performance tests. At 3,333 genuinely qualified Pattern/Guidance identities, with the frozen maximum of 9,999 Episodes and 19,998 trusted Outcome revisions, exact Host lookup measured p95 0.002 ms / p99 0.0044 ms. Phase 14.3 approval-bound lookup at 3,333 measured p95 0.0307 ms / p99 0.0418 ms. Phase 14.4 correction-history lookup at 3,333 measured p95 0.047833 ms / p99 0.079208 ms; its 1,000-sample complete synchronous capture measured p95 0.12525 ms / p99 0.196958 ms. Phase 14.5's frozen Finding/verifier-capacity performance gate passed in the Full. These are bounded test measurements, not production latency guarantees.

## Fresh complete Full

- Run ID: `phase14-6-full-20261010-a5cd0bc-attempt1`
- Command: `pnpm test`
- Tested candidate: `a5cd0bcc596a671520f62e22a0930b0677a203f0`
- Checkout: `/Users/tongxin/Developer/Harness/harness-plugin/.p14-6-full-a5cd0bc`
- Harness checkout: `../../deepseek-harness`, exact SHA `ddefc45fbc7f8e46dd73185e68295696d1297887`
- Result: **PASS, exit 0; 80 test files / 552 tests passed; 0 failed, 0 skipped** across all 29 ordered test stages, including the new Phase 14.6 stage (2 files / 4 tests).
- Full log: `/tmp/phase14-6-full-20261010-a5cd0bc-attempt1.log`

The Full checkout was detached at the exact candidate, tracked-clean before the run, under the correct pinned Harness relative path. Offline frozen dependency installation and production build completed before the test command. The Harness tracked tree and tested checkout remained clean. This was the sole fresh complete Full for this candidate; no repair or rerun followed it.

After the Full, no executable, test, package, lockfile, configuration, or benchmark file changed. This report is the only post-Full addition. The implementation candidate's only tracked changes remain the two new integration tests and the `package.json` test registration.

## Open Phase 13.3 Real-Agent Validation Register

**Status: `REAL_AGENT_GENERALIZATION_UNVERIFIED`; Phase 13.3 remains open and is not accepted by this deterministic integration.** Phase 13.2's accepted 300-scenario / 1,500-Tool campaign is deterministic fixture evidence, not a real-Agent population estimate.

| Evidence | Preserved result | Remaining limitation |
|---|---|---|
| `Phase13_3_Real_Agent_R1_R5_Execution_Report.md`, commit `88411ba03721a0c6840a2b0a86db7c3a6effc58c` | Stopped after 5/20 tasks and 23 Tool calls; the R2-01 missing-input fixture led the Agent to search outside its task directory. | R3–R5 positive opportunities and full-campaign coverage were not completed; no verified F1/F2 recall result. |
| `Phase13_3_Validation_Repair_Execution_Report.md`, commit `94872419f84c392f5c8527dd5239792bee06cb7d` | Retained the 5/20, 23-Tool result; corrected fixture/manifest classification without changing scoring truth. | No positive F1/F2 coverage; the rerun stopped at the same R2 scope problem. |
| `Phase13_3_Real_Harness_Campaign_V2_Execution_Report.md`, commit `ac59b834cff446fe5d823a9ea37a9af4ef2bd9e7` | 20 distinct Sessions, 20 submissions, 129 observed Tool calls; 17 terminal and 3 awaiting clarification. | No public Risk Advisor Finding or explicit no-Finding record was available, so F1/F2 were UNSCORABLE, not TN. |
| `Phase13_3_Minimal_Campaign_Scope_Repair_Report.md`, commit `defa64901450dc10eeafbcfcd18353f57eab8ba4` | Classified `PHASE13_3_SCOPE_REPAIR_BLOCKED`; the pinned Harness `workspace-write` Seatbelt path does not deny Bash file reads/listing outside the task root. No third full campaign was started. | A prompt, temporary HOME, or directory layout cannot establish the missing read boundary. Full campaign restart is unsafe until a supported boundary is demonstrated against a synthetic decoy sibling. |

The user also reported a runtime-confirmed Tool Scheduler Symbol identity mismatch and later requested a built-mode recovery. This Phase 14.6 run did not start a Host or Agent and supplies no new evidence that the later built-mode path resolved that issue. Prior Session/RPC observations do not fill the missing real-Agent F1/F2 classification. No recall, precision, real-world reliability, or false-negative claim is made here.

The next safe validation step is separate from this Phase 14.6 implementation: establish a supported Harness file-read/list boundary for Bash and other enabled file-reading Tools, prove it using a validation-owned synthetic decoy outside a task root, and ensure the normal public surface records sanitized evaluated/no-Finding outcomes with exact Session association. Only after those conditions are independently reviewed should a bounded R2 probe and a fresh real-Agent campaign be considered. No such probe or campaign was started here.

## Artifacts, lifecycle, and publication

The implementation worktree is `/Users/tongxin/Developer/Harness/harness-plugin/.p14-6-integrated-closure`; the detached Full worktree is `/Users/tongxin/Developer/Harness/harness-plugin/.p14-6-full-a5cd0bc`. Both remain registered and preserved. Generated `node_modules/`, `lib/`, and `.vitest-cache/` artifacts were retained. No prior worktree, user file, Harness data, profile, Session, or historical evidence was cleaned or changed.

The tests used jsdom and the pinned Client module loader; this task did not open a browser page or start a Harness Host, Agent, provider, or external Tool. The run's test processes exited; no Phase 14.6 test process remains. No browser or Host needed closing for this run. The pinned Harness tracked tree remained at the exact requested SHA.

Candidate ancestry is `a5f67af539505ea161484bf50a35d9c735b68096` → `a5cd0bcc596a671520f62e22a0930b0677a203f0`. This report is intended to be committed as a docs-only child of the tested candidate and pushed only to the independent implementation branch. Main is not advanced.
