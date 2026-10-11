# Risk Advisor Phase 15.3E — CSS Virtual Module ID Reproducibility Repair 1 Freeze

**Decision:** `RISK_ADVISOR_PHASE15_3E_REPRO_REPAIR1_CONDITIONAL_IMPLEMENTATION_AUTHORIZED`  
**Review/design authority:** ChatGPT  
**Implementation and verification executor:** **Codex**  
**Starting remote main:** `0bc0480b167e7751d173f66395ab989cbee5d14a`  
**Accepted source before repair:** `1d5addfc1ae1daa360708bcf0e408f058c4a2cd1`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Earlier Client build identity (NOT reproducible yet):** `7d3939ab3a6086248a6f351c34ee3e66e5177e857ca6078d347940ffdeb030e3`  
**Current installed Web Client:** `93bbe22052362276079b5d5685679d12b0766987901c2081e7b7c5cb0fab9db4`

## 1. Repair decision and required preflight

This is a **new, narrow source-level repair**, not a retroactive pass for the blocked artifact diagnostic or authorization to deploy. Only the CSS virtual-module build identity is in scope. Neither the historical accepted SHA nor the stopped Web Delivery 1 freeze may be relaxed or silently amended.

**R0 — Preflight:** Verify origin, tracked clean, `git ls-remote origin main` and local fast-forward to exactly the starting SHA. Only `git fetch origin main` + `git merge --ff-only origin/main` allowed when clean/ancestor. No worktree, branch, force, reset, clean, dependency install or product-runtime activities. Preserve repository untracked `lib/`, `node_modules/`, `.vitest-cache/`, old root tarball, prior immutable packages/backups, installed `web` Profile and pinned Harness. Record ownership and source SHA. Treat documented Phase15.3E implementation and history as already accepted; do not redesign UI.

**R1 — Conditional read-only defect localization:** Before editing, verify from the exact `tsdown.config.ts` source that `sourceStylePath()` produces temporary-root-dependent **absolute** pathname and `cssModulePlugin.resolveId` incorporates it into a virtual-module ID. Examine source and, if safely reproducible, emitted statement context for at least one of the four temporary-path occurrences, matching the plugin's `\0dsh-risk-advisor-css:` ID resolution mechanism. The prior report contains changed-byte locations but not surrounding emitted statement bytes. **If no specific causal ID/string link is established, STOP** with a localization report, do not speculate or implement a broad bundler refactor. This gate may use an isolated task-owned source archive and **at most one** investigation build if original bytes no longer exist. Any diagnostic produced bytes must remain task-owned. Preserve external node_modules and Harness targets.

## 2. Bounded implementation only if R1 passes

Repair **only** `tsdown.config.ts`'s custom CSS virtual-module identity:

- Use a **stable, project-relative POSIX-normalized identity** for each of the **four known tracked `.module.css` files**, without embedding absolute temporary/build-root paths in the virtual module ID. Stable IDs must be distinct across CSS files, independent of cwd/root path, and derived from source-relative path (not a constant all-files ID, arbitrary counters, or uncontrolled ordering).
- Continue resolving the real absolute CSS file pathname solely for `readFile` and `this.addWatchFile` in the task's current source root; prevent path traversal/foreign-root reads and verify CSS comes only from expected `src/**` and `components/**`. Preserve each CSS file's exact bytes, class maps, style `data-plugin-css` ID, `@dhandil/dsh-risk-advisor` registration name, 4 style tags and read/append semantics.
- Avoid plugin-scoped global maps whose iteration order or process lifetime could destabilize outputs; any resolution must remain deterministic from a normal path and the root. Preserve official bundle registration banner/footer, external module allowlist, source maps and definitions. No manual edit/normalization of generated `client.js` or its digest, no disabling sourcemaps, no new runtime I/O or cross-build tool patch.
- **Permitted tracked files**: `tsdown.config.ts`, the minimum new isolated `tests/p15-3e-repro-repair1-*.spec.ts` needed to exercise virtual-ID stability & CSS safety, and a minimal standalone verification runner under `validation/phase15-3e-repro-repair1/**` only if essential. No other product code, tests, fixture, lockfile, package, Host or Harness edits.
- For the changed build-config source, make a committed candidate on `main` **before** final gates. Use no branch/worktree.

## 3. Fresh exact-candidate repair acceptance gates

**R2 — Determinism:** Build the **same newly committed repair candidate** twice from two independent, clean, differently named and **equally shaped** task-owned source archives, with same pinned Harness+toolchain/deps/env. Do not compare builds from different Git SHAs. Capture compact machine-readable per-build evidence **to task-owned manifest files before emitting CLI output**, including full SHA-256 and lengths for `client.js`, `client.js.map`, `index.js`, `index.js.map`, and aggregate digest/inventory of the 170 `lib/types/**/*.map` files; print concise summary afterward to avoid the previous output-truncation error. The two fresh `client.js` SHA values **must exactly match one another**; Host must remain `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`; CSS source maps + emitted types must not lose provenance. Verify no task-root absolute strings in distributable Client, no CSS tags/classes/source-field drift, all 4 style assets and expected plugin registration/externals. If divergence persists, BLOCK; don't issue a third final-gate build to fish for matching output.

**R3 — Product correctness:** On that same committed repair SHA, verify exact previously approved F1/F2 Chinese-only and English-only behavior and preserved Host/Client U9 parity, Phase15.3C historical/Approval semantics, source/evidence byte preservation, and no new mutation or approval authority. Run appropriate existing focused Phase12.2/14.4/14.5/14.6 and 15.3C tests, TypeScript, build, package **in task-owned temporary directories only**. The new reproducible Client will almost certainly have a **new SHA distinct from the earlier accepted build**: this is a new candidate requiring focused component and exact bundled Chrome verification, not a retroactive acceptance of `7d3939ab...`.

**R4 — Browser artifact evidence:** Use actual new production-built Client + CSS Modules in a synthetic isolated Chrome setup (new `validation/` directory or safely reused read-only existing fixture). Confirm en/zh, F1/F2 both, 1280px/390px light/dark, no duplicate languages, no horizontal overflow; verify actual 4 style registrations and expected import/module boundaries. No normal `web` Profile, real Agent/Tool/Provider/approval. At most four new screenshots under `docs/tasks/Phase15-product-readiness/evidence/phase15-3e-repro-repair1/` (do not alter prior screenshot evidence).

**R5 — No Profile or asset mutation:** Do not run normal Harness Web, create backup, package into an existing persistent tarball or touch Profile. Retain all previous persistent archives/backups. Production compile output and temporary smoke archive may be created in task-owned verified roots only; never overwrite existing repository `lib/`, never follow dependency symlinks when removing task scratch. Clean only owned process/temp roots.

**R6 — Exact SHA gate:** Candidate with source/tests/fixture committed & pushed to `main` before final tests/build/browser. All final evidence must be based on that one candidate SHA. If executable/test/fixture changes afterward, rerun affected gates against new candidate and record why; do not carry old test passes forward. Follow with report + <=4 screenshots docs-only commit, no executable drift. Verify remote and report exact SHA.

## 4. Outcome and next phase, explicitly not deployment

Publish `docs/tasks/Phase15-product-readiness/Phase15_3E_Repro_Repair1_Execution_Report.md` documenting R0–R6 with PASS/BLOCKED/NOT_EXERCISED, source-level causal proof, the exact candidate SHA, both root-independent full Client/Host/map digests, complete output manifest and cleanup, tests/build/Chrome proofs, CSS external/provenance checks, nonrun categories and any residual caveats. For failure before implementation, publish precise first blocker and do not manufacture a "fixed SHA".

**Success only if all repair gates pass:** `RISK_ADVISOR_PHASE15_3E_REPRO_REPAIR1_READY_FOR_INDEPENDENT_ARCHITECTURE_REVIEW`  
**Blocked:** `RISK_ADVISOR_PHASE15_3E_REPRO_REPAIR1_BLOCKED`

Architecture reviewer then separately decides whether new reproducible Client+source identity can replace the non-reproducible accepted *artifact* for **future delivery**. This conditional repair is not itself Phase15.3E Web delivery authorization. A new delivery freeze after independent acceptance is required. No Canonical Full is authorized by this bounded repair.
