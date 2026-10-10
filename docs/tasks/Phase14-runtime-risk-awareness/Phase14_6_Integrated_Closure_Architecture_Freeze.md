# Risk Advisor Phase 14.6 — Integrated Closure & Release-Evidence Architecture Freeze

**Decision:** `RISK_ADVISOR_PHASE14_6_INTEGRATED_CLOSURE_ARCHITECTURE_FROZEN`
**Architecture/acceptance owner:** ChatGPT. **Execution agent:** Codex, after docs-only baseline advancement.
**Starting `main`:** `c930a9a29e0bd4479cadd79b11405aa2e482336d`.
**Latest accepted executable:** `547f00ba6e7e1d2495f54093e02a03b8a74c362f` (Phase 14.5).
**Pinned read-only Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`.

## 1. Purpose and the meaning of completion

Phase 14.6 is the **last planned Phase 14 subphase**, concerned solely with *integrated verification, evidence reconciliation, release posture and closure*. It adds **no new Risk Advisor product feature, endpoint, protocol, user-facing string, authority, storage, runtime behavior or provider integration**.

Phase 14.1–14.5 are independently accepted and closed. Their accepted executable SHAs and complete-Full records must be reconciled by exact Git ancestry and preserved reports; never rewrite a prior acceptance artifact. Phase 14.5 ended with 78 test files / 548 tests on the accepted executable. Those counts are historical evidence and **not a substitute** for the one new final-candidate Full if Phase14.6 introduces integration tests or test registration.

**Completion has two explicitly distinct axes:**
1. `PHASE14_DETERMINISTIC_INTEGRATION_ACCEPTED`: the Phase14 scope is proven under pinned, deterministic integration/Browser, regressions, privacy and performance gates. Once independently accepted, Phase14 may be marked CLOSED.
2. `REAL_AGENT_GENERALIZATION_UNVERIFIED`: Phase13.3 real-Agent positive coverage remains BLOCKED/PARTIAL and is *not* made PASS by Phase14 closure. Do not claim real-world detection precision/recall, reliability or autonomous intervention. This outstanding validation is an explicit release limitation and future separate work.

If any integrated invariant fails, the correct outcome is `PHASE14_6_REVIEW_BLOCKED`; do not quietly reduce scope, remove tests, label it accepted or modify earlier freezes.

## 2. Source-verified inventory and immutable authority

The 2026-10-10 remote main contains five final acceptance reports in `docs/tasks/Phase14-runtime-risk-awareness/`: `Phase14_1_Final_Acceptance_Report.md` through `Phase14_5_Final_Acceptance_Report.md`.

Accepted executable trail (historical candidates, not a single global immutable executable):
- 14.1: `bd326bd6d0d550b2aa100bb7b176d2b5a4b227a1`; accepted Full 477/477 (68 files).
- 14.2: `ab0aeec26d07bcc8a044bbec03cbb587386d1c73`; accepted Full 494/494 (71 files).
- 14.3: `3b23d05b6ec64d68ddc211fe5dfb3154984f0982`; recovery Full 503/503 (73 files); original infrastructure-incomplete attempt retained.
- 14.4: `ecf84c29a0ca9114ff7cd2779dca6ec021d1b699`; accepted Full 521/521 (76 files); original 517/517 preserved as superseded.
- 14.5: `547f00ba6e7e1d2495f54093e02a03b8a74c362f`; accepted Full 548/548 (78 files).

These records must be reconciled against Git and each accepted phase's final report rather than assumed from the table above.

Currently installed Host plugin at `src/index.ts` mounts the Phase14.1 ordinary risk bridge, native approval projection, Phase12 Online Correction, Phase14.4 historical correction bridge, and Phase14.5 next-check bridge plus Phase11 history/Guidance. The accepted P10 Host HMR integration expects **eight** `/api/risk-advisor/*` registered Host routes with cleanup between generations. Phase14.3's native approval remains separate. Browser `OnlineCorrectionDock` renders frozen F1/F2 text, 14.5 current-evidence next-check subsection and 14.4 historical Guidance subsection without making either an authority.

Authoritative constraints remain:
- Phase11 only learns from qualified verified outcome/episode evidence; approval acceptance or exit code is not proof of goal success.
- Phase12 owns F1/F2 eligibility, suppression, immutability and Session TTL; optional 14.4/14.5 reads cannot create, change or mask Findings.
- Phase14.1 is purely advisory and never overrides Harness-native permission/approval.
- Phase14.2/14.3/14.4 qualified historical Guidance is separate from present-F2 verification and never an instruction to execute.
- Phase14.5 next-check is a fixed code for one current Finding, not a diagnosis of true root cause or a correction action.

## 3. Phase13 status reconciliation and truthful release claims

The accepted Phase13.2 deterministic high-volume campaign completed 300 scenarios / 1,500 Tool executions; its scenario truth and measurements are **deterministic fixtures**, not a provider-powered population estimate. Phase13.3 real-Agent attempts and subsequent browser/validation probes had environmental, observer, readiness, Client-delivery and positive-coverage limitations. Different reports explain different attempts; do not overwrite them into one simplistic `provider blocked` statement. The current overall status remains **not independently accepted**, with no verified comprehensive positive F1/F2 real-Agent outcome campaign. `Phase13_3_Real_Agent_Campaign_Execution_Report.md` is an earlier stopped preflight report, not the whole later history.

The Phase14 closure report must include a clearly labeled **Open Validation Register** with the Phase13.3 status, links/references to the relevant historical reports, exact evidence still missing, and a bounded next independent validation proposal. It may not assert full release-to-production readiness or zero false negatives. Nor should Phase14.6 initiate provider/Agent campaigns, change natural Agent behavior, repair Phase13 observer scripts or ask the user to delete real Harness user data.

## 4. Permitted change envelope

**Allowed executable-tree modifications:** only `tests/p14-6-*.spec.ts(x)`, plus a narrowly scoped `package.json` script addition to include `test:p14.6` in `pnpm test`. A test fixture `tests/p14-6-*.ts` is allowed only if needed by those tests. All test dependencies must be existing/pinned. No lockfile/dependency/version changes.

**Forbidden:** every `src/**` file; `validation/**`; `benchmarks/**` implementations; `pnpm-lock.yaml`; `tsconfig*`, `vitest.config*`, native Harness; environment/user profile and home; Risk Advisor permissions, events, approval/Tool hooks, route registrations, any DTO, Phase11 writers, Phase12 predicates, Phase14.1–14.5 UI, Client, Host, test fixtures or accepted reports. Existing tests may **not** be weakened/edited to make the suite pass. Full output and new reports may be added under the dedicated Phase14 task docs path only.

If new integration tests reveal a real executable defect, **stop and report exact defect localization**, do not take discretionary product repair scope. A separate architecture-authorized repair can then establish a new final tested candidate.

The work uses the existing branch-first, isolated-worktree, candidate-push and independent-acceptance process. Do not fast-forward `main` until separately authorized.

## 5. Integrated proof plan

Use **genuine pinned Harness core in a disposable deterministic fixture**, with local mock answerers/inert LLM when necessary. Never use real providers, prompt a real Agent or generate new ordinary user Sessions. Emphasize actual package `apply()`/Client `apply()`, native route registration, Lifecycle and rendered fixed text where feasible; isolated mocks may inject precisely bounded trusted evidence but must be labelled. Do not implement false `all features in one execution` simulation where they are mutually exclusive by design.

| Gate | Required demonstration |
| --- | --- |
| C1 | Reconcile five accepted phase reports: exact accepted executable SHA, Full counts, provenance, chronological ancestry, final main and zero late executable drift |
| C2 | Actual pinned Host plugin registration provides expected eight distinct read-only Risk Advisor routes, registers each once, and handles 3 mount/unmount/remount generations without stale handler |
| C3 | Native Approval decision parity (plugin absent/present), ordinary-risk advisory suppression during native approval, and no duplicate allow/deny/ask authority |
| C4 | Same-Session ordinary risk and F1/F2 independence across Tool start/settlement; duplicate/later/out-of-order events cannot conjure Finding or stale base risk |
| C5 | Existing 14.2 historical Guidance, 14.3 approval history and 14.4 correction history stay scoped, source-qualified and retractable; revocation/expiry/Session mismatch suppress only their optional views |
| C6 | Combined existing Dock mounts F1/F2, 14.5 next-check (only newest) and 14.4 historical note independently; failure of one optional subsystem cannot hide the other or original warnings |
| C7 | Real 14.5 F2 verifier mismatches are current-store backed; expired/conflicted/replaced records withdraw the additional check, not F2; history never used to fabricate F2 verification |
| C8 | Browser actual production `lib/client.js` loaded via pinned Harness-compatible module loader: `apply`, native slot injection, CSS, presentational boundaries; no `node:` import, malformed fallback or duplicate Dock |
| C9 | Exact Session/Finding/generation, stale-response/abort, Host-observedAt 1499/1500ms and <=1Hz single-flight behavior under simultaneous optional widgets and different Session views |
| C10 | Resource/HMR pressure: established global caps (risk, Findings, verifier, Session stores, history), active-session preservation, idle eviction/disposal, and no runaway timers/subscriptions/Host registrations |
| C11 | Privacy/authority gates: no raw path/args/content, user prompt, verifier ExecutionId/adapter, provider payload or native approval justification leaked into new wire/display; zero new authority, persistence, telemetry and provider calls |
| C12 | Full regression and provenance: all prior Phase11/12/14, P1–P10 included, typecheck, build/declarations, package, browser smoke, deterministic latency existing thresholds; exactly one fresh complete `pnpm test` on a precisely committed and clean candidate |

The integration suite must provide **at least one meaningful positive and one meaningful negative cross-feature scenario** in addition to individual existing phase tests. Claiming C2/C3/C6/C7 only because previously independent tests pass is insufficient. Collect a clear proof-to-test map; do not fake a live provider/Agent result.

For C12, reuse established Phase14.2/14.4 trusted-history 3,333-identity / 9,999-Episode proof, Phase14.5 1/64/256 Finding and 512 verifier pressure, and earlier frozen p95/p99 thresholds. Do not add a new unbounded benchmark, invent measurements or use mocked `60,000 qualified histories`.

## 6. Execution gates and exactly-one-Full contract

Preflight on a clean isolated worktree rooted beneath the pinned Harness parent so `../../deepseek-harness` resolves correctly. Verify Git main SHA, exact pinned Harness SHA and tracked cleanliness; no active competing `pnpm test` or browser smoke on the same test workspace. Preserve pre-existing untracked `node_modules/`, `lib/`, `.vitest-cache/`, local logs, real `~/.dsh`, current user sessions and all other worktrees.

Run new C1–C12 focused tests and their relevant Phase11/12/14/P10 regressions; inspect realistic lifecycle/performance/privacy evidence; run typecheck, build/declarations, dry-run pack, static/secret/diff checks and one controlled Browser module-loader smoke. Host/browser must be shut down and artifacts preserved. If a gate fails, stop with `BLOCKED`, without relaxing the Freeze.

When all pre-Full gates pass, commit exact candidate with new tests and `package.json` script, preflight a **new detached clean checkout** under the correct Harness relative path and **run one fresh complete `pnpm test`**. If Full fails or is incomplete, stop and preserve its diagnostics; no automatic second Full. Build/install are allowed preconditions but must be offline/frozen. No provider/registry/real Agent traffic.

After the completed Full, **no executable/test/config/package drift**. Only docs-only Execution Report can be committed after it, and pushed to the independent implementation branch. Report exact tested SHA, Run ID, count/stages, failures/skips, Gate C1–C12 evidence, benchmark p95/p99, bundled client hash, active/closed processes, artifact preservation, and Open Validation Register.

## 7. Independent acceptance & closure status vocabulary

- `RISK_ADVISOR_PHASE14_6_INTEGRATION_READY_FOR_ARCHITECTURE_REVIEW`: the one new Full and C1–C12 passed; implementation candidate and report are pushed for independent review. **Not final acceptance**.
- `RISK_ADVISOR_PHASE14_6_INTEGRATION_BLOCKED`: any required positive/negative integration proof or quality gate is missing/failed. Do not change the definition to pass.
- `RISK_ADVISOR_PHASE14_6_IMPLEMENTATION_ACCEPTED_CLOSURE_AUTHORIZED`: only after ChatGPT independently checks source tests, Full, evidence and branch diffs.
- `RISK_ADVISOR_PHASE14_FINAL_ACCEPTED_WITH_REAL_AGENT_VALIDATION_OPEN`: only after a docs-only Phase14 Completion Report, a docs-only Open Validation Register, accepted execution evidence, and **non-forced** baseline fast-forward are independently verified.

This terminal status **closes Phase14's accepted deterministic scope, not Phase13.3 real-Agent validation**. No Phase14.7 is planned. Do not start Phase15 merely because the integration tests are green.
