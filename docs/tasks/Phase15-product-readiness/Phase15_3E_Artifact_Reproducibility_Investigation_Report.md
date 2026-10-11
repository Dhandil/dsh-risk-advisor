# Phase 15.3E Client Artifact Reproducibility Investigation

**Result:** `RISK_ADVISOR_PHASE15_3E_ARTIFACT_DIAGNOSTIC_BLOCKED`
**Diagnostic classification:** `INVESTIGATION_BLOCKED`
**User-authorized baseline:** `5ea2ccc6fbfa8b9b14dd7d815131b33b4ba25dbd`
**Accepted executable candidate:** `1d5addfc1ae1daa360708bcf0e408f058c4a2cd1`
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`
**Execution date:** 2026-10-11

This report records two independent isolated builds and their comparison. It does not rebaseline the accepted Client hash or authorize packaging, deployment, or another build.

## A0 — Preconditions and controlled environment: PASS

- Local `HEAD`, `origin/main`, and `git ls-remote` matched the user-authorized baseline `5ea2ccc6fbfa8b9b14dd7d815131b33b4ba25dbd`. The Freeze document records an older starting SHA; the intervening change to this user-specified baseline was documentation-only.
- The accepted candidate is an ancestor of the baseline. Tracked files were clean. The candidate-to-baseline diff contains only documentation and the already committed Phase 15.3E evidence images.
- Harness remained at the pinned SHA with a clean tracked tree. Existing untracked files and build assets were not modified.
- Toolchain: Node `v24.21.0`, TypeScript `6.0.3`, tsdown `0.22.14`. Both builds used the same explicit environment: `NODE_ENV=production`, `TZ=UTC`, `LC_ALL=C`, `LANG=C`, `TMPDIR=/private/tmp`; `NODE_OPTIONS` and `SOURCE_DATE_EPOCH` were unset. The only intended environmental difference was the independent temporary root and resulting CWD shape: `/private/tmp/<unique>/harness-plugin/dsh-risk-advisor`.
- Each snapshot came from `git archive` of the exact accepted commit. Relative Harness paths resolved to the pinned Harness; `node_modules` linked to the existing dependency tree. The direct local `tsc -p tsconfig.json` and `tsdown` binaries were used. No install, pack, Profile access, Browser, Agent, Tool, Provider, or Harness runtime was used.
- The build configuration writes to task-owned `lib/` outputs and has `clean: false`; package lifecycle hooks were not invoked.

## A1 — Two independent builds: completed, digest record incomplete

Both isolated builds completed. The first build's retained artifact measurements are:

| Build A output | Bytes | SHA-256 |
| --- | ---: | --- |
| `lib/client.js` | 222,395 | `4b3c18f6da97c1eb249c4a1504423b38324000558975523eb30e989814c41e50` |
| `lib/client.js.map` | 344,787 | `0ea55dbc3ac3b77623483bb392ea963107d641dd1e12e99b924083de60e4da33` |
| `lib/index.js` | 578,907 | `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd` |
| `lib/index.js.map` | 1,086,249 | `076c6a3a194271626757f29731ed566aa3afc2f799f503a55b51e4063c27c4c1` |

Build A emitted 170 `lib/types/**/*.map` files. The comparison process reported the Client map, Host map, and all 170 type maps byte-identical between Builds A and B. However, verbose tool output was truncated before Build B's Client SHA-256 and the complete per-file type-map digest inventory could be retained. Those values are not reconstructed or guessed here. No third build is authorized, so A1's required full digest record is incomplete.

## A2 — Bounded comparison findings

- The two Client files had equal length (222,395 bytes) but were not byte-identical. The comparison reported the first differing offset at 7,797 and eight changed byte ranges: `[7797,7798)`, `[7799,7807)`, `[31173,31174)`, `[31175,31183)`, `[144357,144358)`, `[144359,144367)`, `[194426,194427)`, and `[194428,194436)`.
- Each built Client contained its own unique temporary-root string four times. The build roots/CWD were the only intended change between the builds. This is direct evidence of temporary-path dependence in the Client output; the exact source/module that introduces those path strings was not isolated.
- Client and Host source maps were byte-identical across the two builds. Their normalized source lists and `sourcesContent` arrays also matched: 37 Client sources and 54 Host sources. Neither map contained a temporary-root or home-directory string. The Client and Host `sourceMappingURL` references were present.
- Both Host bundles matched the frozen invariant Host SHA. The complete `lib/` inventories were not equal, consistent with the differing Client bundle; their second aggregate digest was not retained.
- The exact candidate contains four tracked CSS inputs. Their SHA-256 values were: `ApprovalHistoricalContext.module.css` `7abb67f1135770edad680afab42bcfa8db99297978380d328265c04a4df481a8`; `OnlineCorrectionDock.module.css` `44ee6c6285f0cffe3d1b6611341a50f40408916d20de80f18b836f4a6b9698c`;
  `RuntimeRiskAwarenessDock.module.css` `0f248da7d5360c22a85a65a7ec7ab927925352c329d6c62120daa26c74c50a7f`; and `components/RiskAdvisorCard.module.css` `9536ab95aba4c3b750493479dc83b4f71a04cdf4f07fc1872d3abf7dbe688894`.
- The emitted bundle scan found the four namespaced CSS module ID prefixes, but its match expression truncated each filename suffix; complete emitted IDs and CSS-body-to-input comparisons were not retained. Those details are part of the incomplete A2 evidence, not inferred from source configuration.
- The accepted Client bytes are unavailable in retained local evidence. The prior report retains the accepted SHA only; old-versus-new byte offsets and source-map differences are therefore **NOT COMPARABLE**. No claim is made that the accepted build was tampered with or functionally different.
- The prior stopped reproduction reported Client SHA `7df903bcde8d03954fd373ab8fbcc3090b9fbb3b6d76a6a3225b76e250bf6ec9`; Build A differs from that value and from the accepted `7d3939ab...` value. The complete Build B hash is missing from retained output, so no exact three-way digest comparison is claimed.

The CSS source hashes above were captured from the accepted Git tree. The source maps show the same source closure for Builds A and B, but this investigation did not prove every external dependency input or recover the accepted Client's source closure.

## A3 — Decision, preservation, and next decision

The comparison strongly indicates a path-dependent Client build because each output embeds its distinct temporary root while the source maps and other measured inputs remain equal. The exact path-injection point and Build B's full digest were not retained. Since the Freeze requires complete hashes and explicitly prohibits a third build, the investigation cannot provide the complete evidence package for architecture review. The diagnostic is therefore **blocked**, rather than claiming a fully supported root-cause conclusion.

Both task-owned temporary roots were removed after comparison. Metadata/content fingerprints confirmed the existing repository `node_modules/`, old `lib/`, `.vitest-cache/`, and root tarball were unchanged. The pinned Harness was untouched, and the normal Web Profile was not accessed. No new tarball, backup, package install, or browser page was created.

The next decision requires separate authorization for a bounded evidence-capture attempt that writes each build's complete artifact digest manifest inside its task-owned root before cleanup. It must preserve the original accepted SHA gate; no new artifact may be promoted without the separate acceptance required by the Freeze.
