# Risk Advisor — Read-Only Code Redundancy Audit Independent Architecture Acceptance

**Decision:** `RISK_ADVISOR_CODE_REDUNDANCY_AUDIT_ACCEPTED_NO_PROVEN_SAFE_DELETION`  
**Independent reviewer:** ChatGPT  
**Reviewed audit report SHA:** `4d8ff741943ea40f660d1bbdb4539ae97e1c29fd`  
**Audited code baseline / freeze commit:** `be05d22b2d967511d9054de427aec15553a36bc8`  
**Report:** `docs/tasks/Codebase-maintainability-audit/Read_Only_Code_Redundancy_Audit_Report.md`  
**Freeze:** `docs/tasks/Codebase-maintainability-audit/Read_Only_Code_Redundancy_Audit_Freeze.md`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Scope:** independent GitHub review of read-only static audit evidence. This document does **not** authorize source changes, refactoring, file removal, tests, builds or user Profile mutation.

## 1. Git and scope verification

The reviewer retrieved `main` on GitHub at `4d8ff741943ea40f660d1bbdb4539ae97e1c29fd`. Comparing `be05d22b2d967511d9054de427aec15553a36bc8` to that SHA shows **exactly one commit and one added Markdown file**: the requested audit report under `docs/tasks/Codebase-maintainability-audit/`. No tracked source, tests, configuration, dependencies, build setup, validation, or Harness files changed. The report's Mac-local preflight, absence of test/build/browser/Host execution and preservation of untracked `lib/`, `node_modules/`, `.vitest-cache/` and tarball are executor attestations, not directly independently reproduced.

The Freeze's own `Exact starting main` records the pre-freeze parent `914d790838b7ff73c5d653578f6e7950c7a5b782`; the audit properly used the **post-freeze report-requested** baseline `be05d22b2d967511d9054de427aec15553a36bc8`. This is consistent with the intended doc-only freeze lineage, not an implementation-scope deviation.

## 2. Acceptance of bounded static findings

**A0/A5 — PASS on independently checked remote change scope and executor's unmodified-local attestation.**

**A1 — PASS with static-method limitation.** Report inventories 90 tracked `src/` files (Host 47, Client 36, shared/root 7; about 19,119 nonblank LOC). Its lexical graph found 89/90 reachable from two runtime entrypoints and the remaining `src/client/css-modules.d.ts` used by TypeScript compilation. This supports **no proven removable production file**, not a blanket proof that every private symbol is used. External consumers of `./src/*`, dynamic registration and reflection cannot be ruled out by repo-only static search. The reviewer independently checked source entrypoint and re-export shape against `src/client/index.ts`, plus package export/allowlist metadata.

**A2 — PASS.** D1's duplicate `src/client/index.ts` client setup is real, but `ctx.effect` and `connectionCtx.effect` have different generation ownership; do not perform a mechanical refactor. D2/D3 RPC scaffolding and validators genuinely repeat but differ on validation strictness and endpoint identity. D4 refcount/store lifecycles repeat but have distinct Session key, TTL, LRU and teardown contracts. D5/D6 versioned bridge schemas, locale namespaces and `src/client/command.ts` are not unused. Source-level net-LOC estimates are tentative, not measured bundle/performance savings.

**A3 — PASS.** Independent `package.json` inspection confirms `pnpm test` chains 29 focused phase scripts without a script for `tests/p15-3e-repro-repair1-css-virtual-id.spec.ts`; `vitest.config.ts` matches `tests/**/*.spec.ts[x]`. The report's 94 discoverable specs, 80 explicitly chained specs and 14 excluded specs (12 separately invoked benchmark specs, one release-candidate spec, one CSS test) are consistent with tracked file/script comparisons. The CSS test really exercises build-root-stable CSS module identifiers, safe source containment, watch registration and rejection of path/symlink escape; it is a **coverage wiring gap**, not dead production code. The declared `./src/*` export versus published `files` allowlist is a contract uncertainty, not proven dead export; dependency deletion is unsupported.

**A4 — PASS.** Findings distinguish `REFACTOR_CANDIDATE`, `COVERAGE_GAP`, `RETAIN_REQUIRED` and `NEEDS_FURTHER_PROOF`, assign source lines and compatibility impact, and report **zero** `SAFE_DELETE_CANDIDATE`. Rough 10–50 LOC candidate estimates cannot be summed as expected concrete savings without an implementation plan. No production deletion or automatic mass cleanup is justified by this audit.

## 3. Independent next-step priority

**Priority 1 — Batch 0 (recommended; not yet authorized):** a bounded test-wiring maintenance change that registers the Phase15.3E CSS virtual-module regression as an explicit `test:*` script and includes it in default `pnpm test`; verify exact test selection, existing named benchmark/release separation, and no source/bundle/config drift. This is a reliability improvement, not a code-size cleanup. Existing `pnpm test` success on older candidates cannot implicitly cover this test. Any implementation requires a separate user-accepted maintenance scope and focused tests.

**Priority 2 — D1 (optional, defer by default):** review only the `src/client/index.ts` duplicate initialization, with a typed lifecycle owner and before/after immediate/late connection, child-generation, disposal and slot-order parity proofs. The report's estimated 10–18 LOC reduction is minor relative to regression risk; do not implement unless maintainability benefit warrants it.

**Priority 3 — D2/D3/D4 (defer):** shared RPC validation, Host envelopes and Store bookkeeping can only be refactored after behavioral parity matrices and contract-focused regressions. No global Store manager, automatic transport normalizer or version-schema deletion.

**Do not do:** delete versioned DTOs, published exports, tests/benchmarks, persistent storage schema, optional Judge paths, diagnostics or build module-table entries based on static reference absence. Do not deploy an unnecessary new package merely to perform this audit.

The codebase appears **structurally used rather than littered with proven dead modules**. This is **not a compiler-backed symbol-by-symbol dead-code certification**. Further exhaustive symbol-level proof should be weighed against low likely benefit rather than automatically opening more audits.

## 4. Closure

**Accept the read-only audit and its zero-safe-delete conclusion as scoped.** No new source optimization phase is automatically opened. The installed, previously accepted Phase15.3E Web package remains unchanged; no fresh Canonical Full, browser or real Harness execution was performed or implied.

**Final:** `RISK_ADVISOR_CODE_REDUNDANCY_AUDIT_ACCEPTED_NO_PROVEN_SAFE_DELETION`.
