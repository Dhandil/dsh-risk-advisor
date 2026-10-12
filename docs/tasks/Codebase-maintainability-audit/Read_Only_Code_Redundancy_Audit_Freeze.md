# Risk Advisor — Read-Only Code Redundancy & Reachability Audit Freeze

**Authorization:** `RISK_ADVISOR_CODE_REDUNDANCY_READ_ONLY_AUDIT_AUTHORIZED`  
**Reviewer / architecture owner:** ChatGPT  
**Executor:** Codex (local Mac)  
**Exact starting main:** `914d790838b7ff73c5d653578f6e7950c7a5b782`  
**Pinned Harness, strictly read-only:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Work mode:** evidence-gathering only; **NO product refactor, deletion, cleanup, install, package rebuild, deployment or runtime use**.  
**Allowed Git modification:** add exactly one sanitized Markdown execution report at the path in A5, committed and pushed to main after static inspection. No pre-emptive architecture or implementation changes.

## Goal

Identify **provable redundant/dead production code**, **behavior-preserving deduplication opportunities**, **superseded compatibility or test code**, **redundant external dependencies**, and **test coverage wiring gaps**, without compromising the accepted advisory-only Risk Advisor V1 contracts or changing the deployed binary. A review should surface clean candidates **and** explain why highly similar but semantically distinct modules must be retained.

Work from the **actual** Host `src/index.ts` and Web Client `src/client/index.ts` plugin entrypoints, `package.json` `main`/`exports`/`files`/`dsh.bundle`, `cordis.patch.yml`, `tsdown.config.ts`, `tsconfig.json`, tests, benchmarks, validation fixtures and applicable Harness extension contracts. The previously accepted Phase11–15 contracts are constraints; past acceptance is evidence, not permission to delete an element. Keep runtime `src` separate from test and validation support.

## A0 — Baseline, scope and protections

Verify canonical `origin` and exact `main == origin/main == git ls-remote` from the SHA above, tracked clean, and pinned Harness SHA. If behind, only verified `git fetch` plus `git merge --ff-only`; STOP if diverged, unknown drift, or user activity conflicts. **SINGLE_MAIN_CONTINUOUS_COMMIT**: no branches, worktrees, force/rebase/reset/clean. Preserve all untracked and ignored repository assets, especially `lib/`, `node_modules/`, `.vitest-cache/`, preexisting tarballs; preserve the real `~/.dsh` selected Web Profile, previous archives/backups, user sessions, credentials, running Harness/browser and all Harness checkout files.

Do not run Node package-install, `pnpm install`, build, pack, Vitest/Full/benchmarks, tests, migration, provider, Agent, Tool, browser or actual Harness runtime. Do not execute transient generated project code, run code-changing linters, install `knip`/`ts-prune`, produce test caches, or write inventory files in the repository. Safe read-only `git grep`, `rg`, `git ls-files`, `git show`, `git log`, source inspection and bounded **in-memory** static parsing are allowed. No hidden entrypoints may be inferred away merely because ordinary text search found zero references.

## A1 — Complete production-reference audit

Inventory **all tracked production** `src/**/*.ts`, `src/**/*.tsx`, CSS modules and contractual entry files by path and approximate LOC. Build a static import/re-export graph with source locations and separate edges for:
1. runtime value import;
2. type-only import or exported public type;
3. test, benchmark, validation-only import;
4. dynamic import / string-based registration / plugin-loader, Cordis injection, `ctx.on`, `ctx.slots`, browser RPC endpoints and persisted format consumers;
5. package-root/`./client`/`./src/*` public exports or third-party compatibility.

Before labeling a module **UNUSED**, account for all five edge categories (and external consumption that the repo alone cannot disprove). Trace backward from both Host and Client entrypoints and package exports. For each deletion candidate provide exact file/symbol, source lines, reference search, why absent from runtime **and** public API, and tests/compatibility impact. **Negative searches alone are not proof of safe removal.** Name unknowns explicitly.

Do not treat explicit phase-tagged lifecycle observers, ephemeral stores, storage schemas, old protocol versions, data mappers, optional Judge paths, or dormant-but-configurable features as dead code without proving no retained contract depends on them.

## A2 — Duplication and maintainability

Investigate these **hypotheses**, without treating them as defects in advance:

- `src/client/index.ts` duplicates immediate-`connection` and late-`connection` setup of seven Client/store/slot lifecycles; assess whether ownership `ctx.effect` vs `connectionCtx.effect` and cancellation/generation semantics prevent trivial extraction.
- `src/client/*-bridge.ts` repeatedly implements `isPlainRecord`, `exactKeys`, `isRpcFailure`, request wrapping, result parsing and fail-closed handling. Compare per-bridge strictness and parser semantics **before** proposing a helper; flag inconsistent treatment of getters, symbols, prototypes, abort and identity checks without calling it a vulnerability absent proof.
- `src/client/*-client.ts` repeat `Map`, retain/release/start/stop/dispose, yet differ materially in target-keying, LRU, idle TTL, cancellation and capacity. Identify only safe small common seams; do not propose a global lifecycle manager without behavioral proof.
- Multiple Host browse routes, read-only history and presentation adapters, contract validators, diagnostics, fallback paths, legacy `V1–V4` DTO exports, repeated locale dictionaries and per-phase constants: distinguish necessary contract/version compatibility from truly superseded code.
- `src/client/command.ts` is actually referenced from `RiskAdvisorDetail.tsx`; do not misclassify it as dead simply because it is small.

Rank issues by **benefit, regression risk, and evidence strength**, estimate reducible LOC only for grounded candidates, and distinguish dead code deletion from feature removal or breaking a public API.

## A3 — Test, tooling and dependency classification

Inventory default `pnpm test` **explicit script coverage** versus `vitest.config.ts` include and independently invoked benchmark/release suites. Preliminary static review saw **80 explicitly enumerated files out of 94 `tests/*.spec.*` files**, 13 deliberately separate benchmark/release files plus `tests/p15-3e-repro-repair1-css-virtual-id.spec.ts` not in `pnpm test`; verify exact counts, invocation and whether the new CSS regression test needs a normal focused/test script. Do **not** mark benchmark/release tests dead merely because not in default `pnpm test`.

Check each dependency and peer dependency against imports, bundler externals, Harness runtime contract, React hooks, CSS injection and dev/test use. A dependency not appearing in source may be a required peer, side-effect import, type package or test/build tool. Never suggest removing it without a consumer and package-manager impact argument.

List `validation/phase13/`, `validation/phase15-3*/`, `benchmarks/`, historical documentation/evidence and old tests in **retained evidence/test-only** versus **candidate maintenance** categories. No historical archive pruning recommendation without a loss-of-proof discussion.

## A4 — Evidence classification and proposed roadmap

Deliver an audit table with, per candidate: **ID**, path/symbol, exact source lines, evidence of runtime/public/test use, category, estimated net LOC/complexity reduction, contract/deployment compatibility risk, test coverage required to change it, confidence (HIGH/MEDIUM/LOW), recommendation.

Allowed categories:
- `SAFE_DELETE_CANDIDATE` — provably unreachable or private redundant code, high confidence, no public surface;
- `REFACTOR_CANDIDATE` — duplicated active logic, semantics must be preserved;
- `COVERAGE_GAP` — missing automated test wiring; not itself dead code;
- `RETAIN_REQUIRED` — structurally needed production, compatibility or immutable evidence;
- `NEEDS_FURTHER_PROOF` — usage unknown/indirect; never delete now.

As an output decision, provide conservative batches `Batch 0` (test wiring only, if useful), `Batch 1` (trivial private dead code), `Batch 2` (local no-behavior-change deduplication), `Batch 3` (contract-affecting work deferred). **Zero safe-delete candidates is a valid finding.** Explain risks of modifying a product already deployed and accepted, and explicitly say that cleanup requires a new implementation freeze/authorization, focused gates and independent review.

Do not invent measured bundle savings or new test outcomes. Static estimates are estimates only.

## A5 — Reporting only

Create **one** sanitized report:
`docs/tasks/Codebase-maintainability-audit/Read_Only_Code_Redundancy_Audit_Report.md`.

Report A0–A5, actual baseline SHAs, complete module/test inventory counts, primary findings with line-level references, negative-reference methodology limitations, proposed rank/order and no-mutation evidence. No sensitive profile paths beyond ordinary symbolic `~/.dsh` descriptions, secrets, logs, session content, raw user data, screenshots, or generated archives in Git.

Commit and push **only that report** on main. Verify the diff from this freeze SHA is documentation-only, `HEAD == origin/main == git ls-remote`, tracked state and all preserved untracked user assets unchanged. **Do not implement any suggestions.** No source/test/fixture/package/lock/Harness changes.

**Success:** `RISK_ADVISOR_CODE_REDUNDANCY_AUDIT_READY_FOR_INDEPENDENT_ARCHITECTURE_REVIEW`  
**Blocked:** `RISK_ADVISOR_CODE_REDUNDANCY_AUDIT_BLOCKED`.

This freeze authorizes only the audit, **not** code simplification.
