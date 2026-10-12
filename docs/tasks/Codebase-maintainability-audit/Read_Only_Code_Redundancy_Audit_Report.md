# Risk Advisor — Read-Only Code Redundancy & Reachability Audit

**Status:** Ready for independent architecture review; no code or test change is proposed for implementation in this audit.
**Requested baseline:** `be05d22b2d967511d9054de427aec15553a36bc8`
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`
**Repository:** `Dhandil/dsh-risk-advisor` (`origin` is the canonical GitHub repository).
**Audit date:** 2026-10-12.
**Mode:** static read-only source, metadata and Git inspection. No product execution was performed.

## A0 — Baseline, scope and protections

The audited checkout is on `main` at `be05d22b2d967511d9054de427aec15553a36bc8`; local `origin/main` and `git ls-remote origin refs/heads/main` matched that SHA. The checkout tracked worktree was clean before the report was created. The pinned Harness checkout remained at `ddefc45fbc7f8e46dd73185e68295696d1297887` with a clean tracked worktree. The Freeze file names an older historical starting SHA (`914d790838b7ff73c5d653578f6e7950c7a5b782`); the user's explicit baseline superseded it. The tree diff from that freeze SHA to the requested baseline contains only the Freeze document itself.

Pre-existing untracked assets were left untouched: `.vitest-cache/`, `dhandil-dsh-risk-advisor-0.1.0-r1.tgz`, `lib/`, and `node_modules/`. No test, build, benchmark, package, install, browser, Harness, Agent, Tool or Provider command was run. No project runtime or browser process was started or stopped. No profile, dependency, cache, backup, archive or user data was opened or changed.

The only permitted output is this Markdown report. This audit does not authorize implementing any recommendation.

## A1 — Production reference and entrypoint audit

The inventory contains **90 tracked production source files** (`.ts`, `.tsx`, `.css`) and approximately **19,119 nonblank source lines**: Host 47 files / 14,019 lines; Client 36 files / 3,798 lines; shared/root 7 files / 1,302 lines. The complete path inventory is in Appendix A.

Entrypoints and indirect reachability inspected:

- Host package entry is `package.json:6-11` (`lib/index.js`; declarations at `lib/types/index.d.ts`). `src/index.ts` wires Cordis lifecycle and Harness hooks: `tools/pre-execute`, `tools/result`, `session/event`, and `session/disposed` at `src/index.ts:77-95`; capability and storage injections appear at `src/index.ts:186-257`. Browser route registration is generation-scoped at `src/host/browser-bridge.ts:69-118`, with optional route registration guarded by runtime/guidance availability.
- Client package entry is `package.json:13-16` (`lib/client.js`; declarations at `lib/types/client/index.d.ts`). `src/client/index.ts:124-206` registers three locale namespaces, the approval detail and two input-dock slots, and seven clients across immediate and late connection lifecycles. `package.json:20-33` also carries the Web platform and client-injection contract; `cordis.patch.yml:1-3` registers the plugin under `@dhandil/dsh-risk-advisor`.
- `package.json:17` exposes `./src/*`; `package.json:132-138` does not include `src/**` in the package `files` allowlist. This means the repository contains a declared source subpath whose availability in a packed/published artifact is not proven by this read-only source audit. Treat source modules as potential external API until package-artifact behavior and consumers are verified.
- The in-memory lexical graph resolved relative `.ts`, `.tsx`, and CSS-module imports from the Host and Client entries. It found 171 local runtime-or-mixed edges and 208 type-only edges. Manual review found **zero runtime dynamic imports**: the two `import('./assessment-aggregator.ts').DimensionName` expressions at `src/host/assessment-envelope.ts:872,938` are TypeScript type queries, not runtime loaders. The graph also recorded 116 external import sites across 24 external specifiers. **89/90** source nodes are reachable from runtime entry roots; the remaining `src/client/css-modules.d.ts` is a compile-time declaration included by `tsconfig.json:37-40`, not a runtime module. Reachability does not prove removability because the package exposes `./src/*` and external consumers are not visible in this repository.
- String and framework registrations were inspected separately from imports: `ctx.inject`, `ctx.effect`, `ctx.on`, `ctx.slots.inject/register`, connection RPC route constants, public exports, Cordis patch metadata, Harness module-table entries, storage-domain tables, and versioned DTO parsers. No production file is classified as unused or safe to delete.

### Complete production path and approximate LOC inventory

LOC are nonblank source lines, reported only as an approximate inventory; they are not measured savings.

| Group | Path | Nonblank LOC |
|---|---|---:|
| Shared/root | `src/approval-historical-context-contract.ts` | 92 |
| Shared/root | `src/bridge-contract.ts` | 407 |
| Client | `src/client/ApprovalHistoricalContext.module.css` | 30 |
| Client | `src/client/CorrectionNextCheckSection.tsx` | 129 |
| Client | `src/client/OnlineCorrectionDock.module.css` | 78 |
| Client | `src/client/OnlineCorrectionDock.tsx` | 166 |
| Client | `src/client/RiskAdvisorDetail.tsx` | 126 |
| Client | `src/client/RuntimeRiskAwarenessDock.module.css` | 37 |
| Client | `src/client/RuntimeRiskAwarenessDock.tsx` | 145 |
| Client | `src/client/approval-historical-context-bridge.ts` | 47 |
| Client | `src/client/approval-historical-context-client.ts` | 65 |
| Client | `src/client/approval-historical-context-store.ts` | 162 |
| Client | `src/client/assessment-bridge.ts` | 56 |
| Client | `src/client/command.ts` | 22 |
| Client | `src/client/components/RiskAdvisorCard.module.css` | 146 |
| Client | `src/client/components/RiskAdvisorCard.tsx` | 228 |
| Client | `src/client/correction-historical-context-bridge.ts` | 55 |
| Client | `src/client/correction-historical-context-client.ts` | 138 |
| Client | `src/client/correction-historical-context-store.ts` | 159 |
| Client | `src/client/correction-next-check-bridge.ts` | 49 |
| Client | `src/client/correction-next-check-client.ts` | 134 |
| Client | `src/client/correction-next-check-store.ts` | 179 |
| Client | `src/client/css-modules.d.ts` | 4 |
| Client | `src/client/historical-context-bridge.ts` | 58 |
| Client | `src/client/historical-context-client.ts` | 44 |
| Client | `src/client/historical-context-store.ts` | 176 |
| Client | `src/client/index.ts` | 203 |
| Client | `src/client/locales.ts` | 239 |
| Client | `src/client/online-correction-bridge.ts` | 62 |
| Client | `src/client/online-correction-client.ts` | 46 |
| Client | `src/client/online-correction-locales.ts` | 66 |
| Client | `src/client/online-correction-store.ts` | 166 |
| Client | `src/client/presentation-client.ts` | 51 |
| Client | `src/client/presentation-store.ts` | 175 |
| Client | `src/client/runtime-risk-bridge.ts` | 58 |
| Client | `src/client/runtime-risk-client.ts` | 42 |
| Client | `src/client/runtime-risk-locales.ts` | 70 |
| Client | `src/client/runtime-risk-store.ts` | 187 |
| Shared/root | `src/correction-historical-context-contract.ts` | 92 |
| Shared/root | `src/correction-next-check-contract.ts` | 111 |
| Shared/root | `src/historical-context-contract.ts` | 130 |
| Host | `src/host/assessment-aggregator.ts` | 117 |
| Host | `src/host/assessment-envelope.ts` | 948 |
| Host | `src/host/browser-bridge.ts` | 442 |
| Host | `src/host/context-builder.ts` | 133 |
| Host | `src/host/correction-historical-context-bridge.ts` | 195 |
| Host | `src/host/correction-historical-identity.ts` | 119 |
| Host | `src/host/correction-next-check-bridge.ts` | 229 |
| Host | `src/host/correlation.ts` | 298 |
| Host | `src/host/deep-judge-parent.ts` | 81 |
| Host | `src/host/deep-judge-scheduler.ts` | 46 |
| Host | `src/host/deep-judge-subagent.ts` | 83 |
| Host | `src/host/deep-judge.ts` | 352 |
| Host | `src/host/evidence-collector.ts` | 316 |
| Host | `src/host/evidence-materiality.ts` | 18 |
| Host | `src/host/evidence-scheduler.ts` | 65 |
| Host | `src/host/evidence-target.ts` | 152 |
| Host | `src/host/evidence-types.ts` | 83 |
| Host | `src/host/expected-effect.ts` | 306 |
| Host | `src/host/experience-schema.ts` | 77 |
| Host | `src/host/experience-store.ts` | 440 |
| Host | `src/host/explicit-failure.ts` | 340 |
| Host | `src/host/fast-judge.ts` | 298 |
| Host | `src/host/guidance-schema.ts` | 186 |
| Host | `src/host/guidance-store.ts` | 494 |
| Host | `src/host/ledger.ts` | 1,010 |
| Host | `src/host/live-correction.ts` | 388 |
| Host | `src/host/online-correction-bridge.ts` | 135 |
| Host | `src/host/operation-foundation.ts` | 492 |
| Host | `src/host/outcome-schema.ts` | 114 |
| Host | `src/host/outcome-store.ts` | 497 |
| Host | `src/host/pattern-schema.ts` | 222 |
| Host | `src/host/pattern-store.ts` | 857 |
| Host | `src/host/postcondition-verifier.ts` | 334 |
| Host | `src/host/presentation/failure-context-presenter.ts` | 14 |
| Host | `src/host/presentation/operation-presenter.ts` | 61 |
| Host | `src/host/presentation/presentation-source.ts` | 84 |
| Host | `src/host/presentation/risk-assessment-presenter.ts` | 51 |
| Host | `src/host/ptc-replay.ts` | 570 |
| Host | `src/host/redactor.ts` | 61 |
| Host | `src/host/retry-escalation.ts` | 746 |
| Host | `src/host/reviewer-seed.ts` | 251 |
| Host | `src/host/risk-engine.ts` | 545 |
| Host | `src/host/rule-engine.ts` | 553 |
| Host | `src/host/runtime-risk-awareness.ts` | 479 |
| Host | `src/host/shell-analysis.ts` | 431 |
| Host | `src/host/verification-scheduler.ts` | 176 |
| Host | `src/host/verification-store.ts` | 130 |
| Shared/root | `src/index.ts` | 352 |
| Shared/root | `src/online-correction-contract.ts` | 118 |

### Reachability conclusion

There are **zero `SAFE_DELETE_CANDIDATE` production modules**. Every runtime `.ts`, `.tsx`, and CSS module participates in an entry/import/registration path or a public contract. The sole non-runtime declaration file has a TypeScript compile-time consumer. Negative text searches were not treated as dead-code proof. Computed imports, package-manager linking, external consumers, runtime reflection, Harness module-loader behavior and packed artifact behavior cannot be disproven by this repository-only lexical graph.

## A2 — Duplication hypotheses

### D1 — Client initialization copied for immediate and late connection

`src/client/index.ts:162-180` creates the seven clients, registers disposal, and installs the slots when `connection` is already present. `src/client/index.ts:181-205` repeats the same construction and slot setup inside `ctx.inject(['connection'], connectionCtx => ...)` when connection is late. This is a real duplication of the client/slot sequence, but the disposal owner differs: root `ctx.effect` versus `connectionCtx.effect`. The latter is tied to the connection child context/generation. The duplicated client set is Presentation, ApprovalHistoricalContext, OnlineCorrection, CorrectionHistoricalContext, CorrectionNextCheck, RuntimeRisk, and HistoricalContext.

**Recommendation:** `REFACTOR_CANDIDATE`, limited to extracting a private installer that accepts an explicitly typed lifecycle owner/effect registrar. Keep the two ownership paths and slot identity/order unchanged. A rough static estimate is 10–18 net LOC after adding the adapter; no bundle savings are claimed. Regression risk is medium because partial setup, child-context disposal, connection replacement, and HMR semantics can be changed by a superficially simple extraction. Before any implementation, cover connection-present and late-connect paths, generation replacement, disposal exactly once, slot identity/order, and setup failure.

### D2 — Host HTTP/RPC route envelope repeated across dedicated bridges

`src/host/browser-bridge.ts:123-178` implements a shared route envelope for five route variants. Separate `handleFetch` implementations in `src/host/online-correction-bridge.ts:101-128`, `src/host/correction-historical-context-bridge.ts:141-166,212-216`, and `src/host/correction-next-check-bridge.ts:127-152,251-255` repeat POST/content-type/JSON parsing, `clientRequestSchema` parsing, route-method matching, failure wrapping and JSON response construction.

The transport scaffolding is substantially similar, but endpoint-specific identity checks differ: Online Correction calls `isOnlineCorrectionIdentifier` (`online-correction-bridge.ts:117`); Next Check calls `isTransportIdentifier` (`correction-next-check-bridge.ts:144`); the correction-history wrapper has no corresponding extra transport-ID predicate at its fetch layer; and the grouped bridge relies on its route schema/handler. Separate route installation also carries distinct effect labels and lifecycle boundaries. This audit does not establish that these variations are accidental.

**Recommendation:** `REFACTOR_CANDIDATE` for a private transport-envelope helper only after recording each route's method, media-type, request schema, RPC-id policy, abort handling, error code/body, and response shape. Estimate 25–45 net LOC at most, a source-level estimate; risk medium-high because changing fail-closed wire behavior can break deployed clients. Required proof: table-driven parity tests for malformed method/content-type/JSON/envelope, wrong endpoint, invalid identifiers, aborted requests, thrown handler, and route teardown.

### D3 — Client-side RPC carrier validators have repeated code and non-identical strictness

The repeated `isPlainRecord` / `exactKeys` / `isRpcFailure` and carrier/result handling occurs in `src/client/approval-historical-context-bridge.ts:15-46`, `historical-context-bridge.ts:24-61`, `online-correction-bridge.ts:17-65`, `runtime-risk-bridge.ts:17-61`, `correction-historical-context-bridge.ts:17-58`, and `correction-next-check-bridge.ts:17-55`; the original Assessment bridge is at `src/client/assessment-bridge.ts:26-53`.

These copies are not behavior-identical. The assessment bridge's `isRpcFailure` accepts extra fields and its success-carrier check requires own `value` but not exact keys (`assessment-bridge.ts:38-42,48-53`). The strict bridges use exact own-key checking, but `isPlainRecord` varies: some reject symbol/accessor/non-enumerable properties and catch reflection failures (`online-correction-bridge.ts:49-59`, `runtime-risk-bridge.ts:45-55`); Next Check's version checks the prototype but does not wrap reflection in `try/catch` (`correction-next-check-bridge.ts:41-45`). Request identity correlation and request parsing also vary by contract. These distinctions must not be silently normalized.

**Recommendation:** `REFACTOR_CANDIDATE` only for a future explicitly parameterized private carrier primitive after a behavior matrix has been frozen. Estimate 25–50 net LOC as a rough source-level ceiling, not an outcome. Regression risk is high until getters, symbols, non-enumerable fields, null prototypes, thrown reflection, extra keys, stale identity, abort timing, and each endpoint's current result type are tested. Do not weaken strictness or claim a vulnerability from these differences alone.

### D4 — Client map/refcount and Store start/stop logic repeats, while keys and policies differ

Client map/refcount/disposal patterns appear in `approval-historical-context-client.ts:5-73`, `online-correction-client.ts:1-54`, `presentation-client.ts:1-54`, `runtime-risk-client.ts:1-48`, and `historical-context-client.ts` (client lifecycle); bounded optional stores are separately managed by `correction-historical-context-client.ts:5-153` and `correction-next-check-client.ts:6-149`. Store lifecycle/read gating repeats, for example `approval-historical-context-store.ts:76-130` and `correction-historical-context-store.ts:73-127`.

The apparent repetition has material differences: keys include session-only, finding, or session-plus-call identities; Approval and Presentation must remain tied to the same native approval; some clients have bounded capacity/LRU/idle retirement while others do not; stores have different polling intervals, read throttles, stale-age handling, host `observedAt` TTL, connection-generation behavior, target clearing, and optional-failure isolation. Phase-specific capacity/freshness constants are observable contracts and are exported from `src/client/index.ts:27,34-39,56,88-99`.

**Recommendation:** `REFACTOR_CANDIDATE` only for a narrowly scoped primitive (e.g. common idempotent subscription/refcount bookkeeping) after each client/store is documented in a behavior matrix. Estimated potential 15–35 net LOC is speculative and limited to boilerplate; there is no evidence to replace stores with one global lifecycle manager. Regression risk is high for late replies, A→B→A session changes, generation replacement, eviction, TTL, cancellation and F1/F2 Dock availability. Keep target keys, per-phase bounds, expiry policy and current bridge authority separate unless tests prove exact parity.

### D5 — Versioned contracts, locale namespaces, storage records and diagnostic fallbacks

`src/bridge-contract.ts:135-179,193-208` preserves V1–V4 view shapes and dispatches parsing by `schemaVersion`; `src/index.ts:285` publicly exports those versioned view and reason-code types. Other contracts are split by consumer/authority (`historical-context-contract.ts`, `approval-historical-context-contract.ts`, `correction-historical-context-contract.ts`, and `correction-next-check-contract.ts`). Host entry wiring and explicit `ctx.effect` labels (`src/index.ts:77-257`) tie resource disposal to plugin and capability generations. Locale files are namespaced by UI surface and phase; storage schemas/stores and optional Judge/evidence paths are similarly contract-bearing.

**Recommendation:** `RETAIN_REQUIRED` unless a consumer/protocol migration proves a version or surface is retired. Similar field names, locale strings, schema validators, route wrappers, and phase labels are not sufficient deletion evidence. No historical validation, benchmark, test, or execution evidence is proposed for pruning.

### D6 — `command.ts` is live and public

`src/client/command.ts:1-22` is imported by `src/client/RiskAdvisorDetail.tsx:4` and re-exported from `src/client/index.ts:25`. It is not dead code despite its small size.

**Recommendation:** `RETAIN_REQUIRED`.

### D7 — CSS regression exists but is outside the default test chain

`tests/p15-3e-repro-repair1-css-virtual-id.spec.ts` covers stable CSS virtual IDs, copied temporary roots, emitted CSS/classes, watch-file registration, traversal and symlink-escape rejection. The root `test` script at `package.json:39` chains 29 phase scripts; resolving all script arguments and the `test:p14.6` globs against tracked specs yields **80 unique spec files**. `vitest.config.ts:43-59` includes **94** tracked `tests/**/*.spec.ts[x]` files. Fourteen are therefore not in the default chain: thirteen independently named benchmark/release tests and this CSS regression. The CSS test is not included in another named `test:*` script; `package.json` has no script naming this CSS test, so it is not wired into the default or an explicit test script.

**Recommendation:** `COVERAGE_GAP`, high confidence. In a separately authorized maintenance change, add a focused CSS test script and include it in the normal test chain, or document a deliberate equivalent gate. No tests were run in this audit.

### D8 — `./src/*` export versus published `files` allowlist

`package.json:8-18` declares a public source wildcard, while `package.json:132-138` ships only built JavaScript/declarations/docs/patch. The repo-local import graph cannot prove whether consumers resolve this subpath from a checkout, a packed artifact, a workspace link, or not at all.

**Recommendation:** `NEEDS_FURTHER_PROOF`; do not remove the export or its target files. Verify actual supported consumption modes, package contents and consumer references before any change. Risk is a breaking import path or release artifact mismatch.

### D9 — Dependency and external-module classification

`zod` is directly imported by the Experience, Outcome, Pattern and Guidance schemas (`src/host/experience-schema.ts`, `outcome-schema.ts`, `pattern-schema.ts`, `guidance-schema.ts`) and is a production dependency (`package.json:129-130`). The declared Harness peer dependencies map to imported host/client APIs or the `dsh.client.inject` and Cordis bundle contracts (`package.json:20-33,94-107`); they are not candidate removals. The development dependencies have source/test/build roles: Harness storage packages support storage tests, Testing Library/React/jsdom support client integration tests, TypeScript and `@types/*` are referenced by build configuration, tsdown owns both bundles and the CSS plugin, and Vitest owns the test suite. `use-sync-external-store` is pinned by `vitest.config.ts:10-29` to keep the test Harness React runtime singular, despite not appearing as a direct Risk Advisor source import. `@types/node` is selected through `tsconfig.json:11` as the `node` type library rather than a literal package string in source.

`tsdown.config.ts:9-32` also has explicit module-table entries, including entries not currently imported by visible production source; its comment explicitly describes the table as a forward-compatible package boundary and duplicate-React safeguard. `@deepseek-ai/dsh-client-locale` appears in `package.json:25-30` injection metadata and the bundler table but is not listed as a direct peer dependency. The active Host's transitive Harness ownership and packaging policy need to be checked before adding/removing dependency declarations. No dependency was proven redundant.

**Recommendation:** no dependency deletion candidate. Preserve every peer, runtime and dev dependency in this audit; mark the unpaired locale peer/module-table relation as `NEEDS_FURTHER_PROOF` rather than infer a packaging defect from source-only metadata.

## A3 — Test, tooling, dependency and retained-evidence classification

| Inventory | Static result | Classification |
|---|---:|---|
| Tracked production `src` modules (`.ts`, `.tsx`, `.css`) | 90; ~19,119 nonblank LOC | Production inventory; no safe-delete finding |
| Tracked test/support files under `tests/` | 99 | 94 spec files plus 5 support/probe files |
| Files selected by `vitest.config.ts` include | 94 | Discovery universe, not the same as default `pnpm test` |
| Unique specs reached by recursive expansion of `pnpm test` scripts | 80 | Default chain coverage, statically derived, not executed |
| Tracked specs outside default chain | 14 | 12 R5 benchmark smoke/full/phase benchmark suites, `tests/v1-release-candidate.spec.ts`, and CSS regression `tests/p15-3e-repro-repair1-css-virtual-id.spec.ts` |
| `validation/phase13/` tracked files | 15 | Retained validation oracle/evidence; not product source |
| `validation/phase15-3*/` tracked files | 14 | Retained validation/support evidence; not product source |
| `benchmarks/` tracked files | 10 | Separately invoked benchmark/release support; do not call dead because outside default chain |
| `docs/tasks/` tracked files | 371 | Historical governance, implementation, review and execution evidence; retain |

The five non-spec test support files are: `tests/p11-1-experience-fixtures.ts`, `tests/p14-2-historical-context-fixtures.ts`, `tests/p14-3-approval-history-performance.ts`, `tests/p1c-pinned-connection.probe.mjs`, and `tests/r1-fixture-helper.tsx`. Static references or report history were found for all five. The 13 benchmark/release specs are invoked through separate scripts or gates (`package.json:69-82`) and are intentionally not default-chain cases; their exclusion is not a dead-test determination.

The dependency review was limited to declared package metadata, source/test imports, the TypeScript config, Vitest aliases and tsdown module table. No installed package tree was resolved or changed. There is no evidence-based dependency removal recommendation.

## A4 — Evidence-ranked candidates and conservative roadmap

| ID | Path/symbol and source evidence | Use evidence | Category | Rough net reduction | Compatibility risk / tests needed | Confidence and recommendation |
|---|---|---|---|---:|---|---|
| D1 | `src/client/index.ts:162-205`, immediate vs late seven-client setup | Both branches construct the same clients and install the same slots; owner context differs | `REFACTOR_CANDIDATE` | 10–18 LOC | Medium; immediate/late injection, connection generation replacement, child disposal, partial setup, slot identity/order | High evidence of duplication; medium confidence in safe extraction. Keep ownership explicit. |
| D2 | `src/host/*-bridge.ts` transport wrappers; lines above | Three standalone wrappers repeat HTTP/RPC envelope; grouped Browser bridge has shared handler | `REFACTOR_CANDIDATE` | 25–45 LOC | Medium-high; malformed input, route mismatch, endpoint-specific RPC-id checks, abort, failure code, response and teardown parity | High evidence; only parameterized transport helper after table-driven parity tests. |
| D3 | six `src/client/*-bridge.ts` carrier validators | Same helper families recur; own-key/prototype/accessor and extra-key strictness differ | `REFACTOR_CANDIDATE` | 25–50 LOC (rough ceiling) | High until adversarial shape and endpoint identity matrix proves behavior | High evidence of textual duplication, medium-low evidence of safely shared semantics; freeze behavior first. |
| D4 | `src/client/*-client.ts` and `*-store.ts` lifecycles | Shared map/refcount/start-stop/dispose shapes; keying, bounded eviction, timers, freshness and cancellation differ | `REFACTOR_CANDIDATE` | 15–35 LOC (speculative) | High; A→B→A, late reply, TTL, reconnection, ref counts, capacity, optional history failure vs base Dock | Medium; extract only narrow bookkeeping seams after a behavior matrix. |
| D5 | V1–V4 DTOs, storage/event lifecycle labels, phase-specific locales/constants | Public exports, version-dispatch parsers, compatibility and generation ownership are explicit | `RETAIN_REQUIRED` | 0 | Breaking compatibility or resource/privacy semantics; requires migration proof and dedicated tests | High; retain. |
| D6 | `src/client/command.ts:1-22` | Imported by `RiskAdvisorDetail.tsx:4`, exported at Client entry line 25 | `RETAIN_REQUIRED` | 0 | User-visible command presentation regression | High; retain. |
| D7 | `tests/p15-3e-repro-repair1-css-virtual-id.spec.ts` | Tracked regression not selected by the default test chain | `COVERAGE_GAP` | 0 product LOC | CSS asset omission/path/symlink behavior could escape the normal Full; add a normal test script and verify file appears in expanded chain | High; Batch 0. |
| D8 | `package.json:8-18,132-138` source export / file allowlist | Potential external source subpath; packed content not inspected because pack/build are forbidden | `NEEDS_FURTHER_PROOF` | 0 | Could break source imports or reveal a package artifact mismatch; inspect supported consumers and actual already-available package metadata under separate authorization | High that uncertainty exists; retain. |
| D9 | `package.json:94-130`, `tsconfig.json:11`, `vitest.config.ts:10-29`, `tsdown.config.ts:9-32` | Imports, peer injection, type roots, tests and bundler module table support declared dependencies | `NEEDS_FURTHER_PROOF` for locale/module-table metadata; **no dependency deletion candidate** | 0 | Package resolution, peer ownership and duplicate React runtime risk | High that deletion is unsupported; retain dependencies pending package-contract evidence. |
| D10 | `src/client/css-modules.d.ts:1-4` | No runtime edge, but included by TS project and supplies CSS module typing | `RETAIN_REQUIRED` | 0 | Build/type declaration failure if removed | High; retain. |

**Batch 0 — test wiring only:** in a separately authorized change, add the CSS virtual-module regression to a normal explicit focused script and the default chain. Keep benchmark/release cases separately invoked and documented.

**Batch 1 — trivial private dead code:** none proven. Zero safe-delete candidates is the result, not an omission.

**Batch 2 — local no-behavior-change deduplication:** first consider D1's installer extraction with an explicit lifecycle-owner parameter; then assess D2 transport-envelope consolidation; D3 and D4 require frozen behavior matrices before any helper. Do not combine unrelated phases or route authorities as a “cleanup” sweep.

**Batch 3 — contract-affecting work deferred:** versioned DTOs, public `./src/*` exports, dependency declarations, store keying/capacity/TTL, Bridge strictness, Host route and storage contracts, Phase-tagged resource ownership, historical evidence and validation/test archives. Each needs a specific migration or compatibility decision and independent review.

This is a deployed and accepted product. Even source-only simplification can alter package-loader identity, Web profile delivery, lifecycle ownership, RPC wire strictness, privacy expiry, or optional-surface failure isolation. Any implementation requires a separate implementation freeze/authorization, focused regression gates and independent architecture review. This report grants none.

## A5 — No-mutation evidence and reporting

The audit used Git metadata and read-only source/config/test/doc inspection plus bounded in-memory lexical parsing. No runtime test result, bundle size, performance result, dependency install state, or package artifact was generated or inferred. No test was executed and no test outcome is asserted. Before this report was written, the only tracked diff was empty; the pre-existing untracked assets listed in A0 were preserved. The final Git commit is constrained to this report only. The audit produced no executable, test, package, configuration, benchmark, Harness or profile change.

### Method limits

The local graph is a bounded lexical inventory, not a TypeScript compiler or packager. It resolves standard relative source extensions and separately checks the explicit Cordis, slot, RPC, package-export, module-table, storage and persisted-schema registrations. It cannot prove absence of computed imports, third-party/plugin-loader use, workspace-link consumption, consumer imports outside this repository, or runtime reflection. It therefore supports reachability evidence and identifies uncertainty; it does not certify safe deletion. LOC are approximate nonblank lines. Candidate savings are rough static estimates, not measured results.

## Appendix B — Tracked spec files excluded from default `pnpm test`

The 14-file difference between the 94-file Vitest include set and the 80-file expanded default chain is exactly:

- 12 separately invoked R5 benchmark specs: `tests/r5-benchmark-{smoke,full}.spec.ts` and `tests/r5-phase{5,7,8,9,10}-benchmark-{smoke,full}.spec.ts`.
- `tests/v1-release-candidate.spec.ts`, invoked by the separate release gate.
- `tests/p15-3e-repro-repair1-css-virtual-id.spec.ts`, with no reference in the default chain or any other named `test:*` script.

The excluded benchmark/release tests are not proposed for deletion. The CSS test is a normal regression-coverage wiring gap. This count is derived from `package.json` script expansion and tracked file paths; the test runner was not launched.
