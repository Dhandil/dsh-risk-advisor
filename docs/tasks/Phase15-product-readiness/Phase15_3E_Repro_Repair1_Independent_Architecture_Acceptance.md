# Risk Advisor Phase 15.3E Repro Repair1 — Independent Architecture Acceptance

**Decision:** `RISK_ADVISOR_PHASE15_3E_REPRO_REPAIR1_ACCEPTED`  
**Reviewer / architecture authority:** ChatGPT  
**Implementation & test candidate:** `9deb8c049c45cfdecb62dabbe79f5350b505f59f`  
**Reviewed report and screenshots:** `0c1eeaa95f45e1977602743e820e0da6f8a6d2c6`  
**Authorized repair freeze:** `docs/tasks/Phase15-product-readiness/Phase15_3E_Repro_Repair1_Architecture_Freeze.md`  
**Prior accepted Phase15.3E product source:** `1d5addfc1ae1daa360708bcf0e408f058c4a2cd1`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Review scope:** GitHub remote source, test code, commit ancestry/diffs, report, and visual inspection of four committed PNGs. The reviewer did **not** rerun builds, tests, Chrome, or inspect the user's local machine/Profile.

## 1. Exact source and evidence lineage

Remote compare from authorized baseline `8331eec1482c45f7ee48b7ebe7a3bf2d71b23ccd` to exact candidate `9deb8c049c45cfdecb62dabbe79f5350b505f59f` contains **one commit with two files only**: modified `tsdown.config.ts` and new `tests/p15-3e-repro-repair1-css-virtual-id.spec.ts`. Product `src/**`, locale, Host, DTO, permission, approval, runtime stores, package/lock/deps and previous fixture are unchanged.

Remote compare from candidate to final evidence `0c1eeaa95f45e1977602743e820e0da6f8a6d2c6` shows **two downstream commits with exclusively one Markdown execution report and four PNG screenshots**. There is **no post-final-test executable, build-config, test or fixture drift**. The main branch reference matched the reported evidence SHA at review time.

## 2. Root cause and repair review

**R1 causal localization — accepted.** The prior `cssModulePlugin.resolveId` returned `\0dsh-risk-advisor-css:` concatenated with the absolute `sourceStylePath()` plus `.mjs`. The executor recorded a baseline isolated generated Client `//#region` statement embedding a task-specific temporary CSS file path, with four CSS virtual modules; source was independently inspected. This establishes the direct injection mechanism rather than inferring a cause from differing hashes alone.

**Repair semantics — accepted.** The new `cssModuleIdentity(source, importer)` validates the emitted `lib/types` boundary, finds the source CSS under the build's `src`, `realpathSync` checks both root and target, rejects traversal, symlink and out-of-client file paths, and produces a **stable POSIX project-relative** virtual ID. `sourceStylePathFromId(id)` uses that stable ID to resolve the actual CSS file under the **current build CWD** solely for `readFile` and `this.addWatchFile`, with independent path and symlink bounds checks. Build is designed to run from the plugin project root. The four IDs remain unique; CSS bytes, class-map extraction, style tag ID, browser module-loader wrapper, externals and source maps remain unchanged.

The new test covers all four ID identities across differing temporary source roots, exact `RiskAdvisorCard.module.css` byte content/class-map/tag registration, traversal refusal and cross-root symlink refusal before reading or adding watch files. The test's strict file-boundary checks and unchanged production CSS output avoid a scope-expanding bundler/plugin rewrite.

## 3. Evidence/gates, with provenance qualifiers

**R0 — PASS (executor report).** Starting origin/main and pinned Harness, clean tracked state, protected untracked repository `lib/`, `node_modules/`, `.vitest-cache/`, tarball and existing Web Profile reported unchanged.

**R1 — PASS (source review + executor's one baseline build).** Old virtual CSS ID was demonstrated in emitted region comment rather than merely hypothesized.

**R2 — PASS for two reported independent roots, not generalized proof for all environments.** Both clean builds of **same exact candidate SHA** output:
- Client `lib/client.js`: **222,047 bytes**, SHA-256 **`4a49d7f5e9c57dcc3714a9081a6d0c0af6a89b1f5aabac1e2269c2c3881d2b54`** in A **and** B.
- Client map: `0ea55dbc3ac3b77623483bb392ea963107d641dd1e12e99b924083de60e4da33` in both.
- Host `lib/index.js`: `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd` in both; matches frozen invariant.
- Host map: `076c6a3a194271626757f29731ed566aa3afc2f799f503a55b51e4063c27c4c1` in both.
- 170 emitted `lib/types/**/*.map` entries: matching sorted aggregate `510507464342f992705b9218067db7d238354e6f70be6522d7eea6310d39a109`, plus detailed manifest in the execution report.

The report records identical 37 Client map source bodies, 54 Host map source bodies, all four exact CSS asset bytes and source SHA, four stable region identifiers, unchanged browser registration/external allowlist, and absence of temporary absolute root strings in Client bundles. These measured artifact hashes are **Codex-attested; the reviewer inspected the report and source, not the temporary build files**.

**R3 — PASS by recorded focused verification.** 14 spec files / **130 tests PASS**, including Phase12.2 U9 canonical Host/Client English parity and Phase15.3E locale-only UI; historical Guidance, native Approval UI, correction next-check and Phase14.6 cross-surface integration. TypeScript, direct production build, 90-member temporary `npm pack --ignore-scripts` smoke PASS. The temporary archive included the byte-identical new Client. No Canonical Full was authorized or run.

**R4 — PASS within synthetic browser scope.** Four actual committed PNGs were independently fetched and visually inspected:
- `01-desktop-en-light.png`: exact English F1/F2 diagnostic.
- `02-desktop-zh-dark.png`: exact approved Chinese F1/F2 diagnostic only.
- `03-mobile-en-light.png`: narrow English text wraps without obvious clipping.
- `04-mobile-zh-dark.png`: narrow Chinese text wraps without obvious clipping.

The real production bundle/CSS was loaded in an isolated Chrome synthetic Finding fixture according to executor's report, with four `data-plugin-css` registrations, no observed external network/error or horizontal overflow. These screenshots **do not prove** actual Agent/Tool/Host Finding detection or real Web UX. Screenshot SHA-256 values remain executor-attested; actual committed image blobs were fetched visually, but not independently hashed from bytes.

**R5 — PASS by executor's protected-state report.** No normal Web Profile/Host, package installation, persistent tarball, backup, Agent/Tool/Provider, native approval or Canonical Full. Existing repository `lib/client.js` remains old installed-phase Client SHA `93bbe22052362276079b5d5685679d12b0766987901c2081e7b7c5cb0fab9db4`; task-owned isolated build/browser roots reportedly removed. Do not mistake the current old `lib/` for the newly accepted repaired output.

**R6 — PASS by independent GitHub ancestry and docs-only report diff.** Candidate committed/pushed before final tests, with no later executable/config/test change.

## 4. Architecture conclusion and forward authorization boundary

**ACCEPT** the bounded CSS virtual ID path-stabilization repair and its **new reproducible build identity** for future Phase15.3E product delivery planning. In the tested/pinned environment, two independent differently rooted builds reproducibly emitted identical Client binaries from the same repaired source. The frozen old accepted pre-repair Client digest `7d3939ab3a6086248a6f351c34ee3e66e5177e857ca6078d347940ffdeb030e3` was **not** recovered and must remain an historical pre-repair artifact identity; **do not silently replace the old Web Delivery freeze's required digest**.

The currently installed `web` Profile still contains Phase15.3C Client SHA `93bbe22052362276079b5d5685679d12b0766987901c2081e7b7c5cb0fab9db4`. Nothing in Repair1 acceptance authorizes installation. A **fresh independently frozen** delivery from exact candidate `9deb8c049c45cfdecb62dabbe79f5350b505f59f` must use **new accepted Client `4a49d7f5e9c57dcc3714a9081a6d0c0af6a89b1f5aabac1e2269c2c3881d2b54`**, verify exact Host `9525d46c...` and unchanged-source ancestor, then preserve previous immutable packages/backups and use the previously validated narrow offline plugin-manager/update + activation-only procedure. Such a delivery requires a **separate explicit user approval and independent review**.

**Remaining limits:** two-build same-env reproducibility, not a general reproducible-build guarantee across Node/OS/toolchain versions; no independent Mac rerun; unknown performance under production load; real Agent generalization still unverified.

**Final:** `RISK_ADVISOR_PHASE15_3E_REPRO_REPAIR1_ACCEPTED`.
