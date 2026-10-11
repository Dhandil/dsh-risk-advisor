# Phase 15.3E Web Delivery 1 — Execution Report

**Result:** `RISK_ADVISOR_PHASE15_3E_WEB_DELIVERY1_BLOCKED`
**Starting baseline:** `9a8c586f36b4ff38fc8f1adc97d6f8d4ba50971d`
**Accepted executable candidate:** `1d5addfc1ae1daa360708bcf0e408f058c4a2cd1`
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`
**Execution date:** 2026-10-11

The delivery stopped at P1. The exact accepted Client SHA-256 could not be reproduced from the accepted executable candidate, so no package was created, no plugin-manager command was run, and the existing Web Profile was not changed.

## P0 — Baseline and Web Profile preflight: PASS

- The local checkout was fast-forwarded from `4b6d0c6e1af84352a7ba9036024368a12002b09e` to the authorized baseline. Local `HEAD`, `origin/main`, and `git ls-remote` all matched `9a8c586f36b4ff38fc8f1adc97d6f8d4ba50971d`.
- The baseline adds only the independent acceptance and Web Delivery freeze documents. The accepted executable candidate is an ancestor; later tracked changes are documentation and the four committed Phase 15.3E evidence images.
- Risk Advisor tracked files were clean. Existing untracked `.vitest-cache/`, repository-root tarball, `lib/`, and `node_modules/` were preserved.
- Harness remained at `ddefc45fbc7f8e46dd73185e68295696d1297887` with a clean tracked tree. Its pre-existing untracked entry was preserved.
- The canonical `~/.dsh/profiles/web` directory is owned by the current user and is not a symlink. Its configured bundle order includes the normal base and Web bundles followed by Risk Advisor. Its only package dependency was `@dhandil/dsh-risk-advisor`, still selected from the previously authorized Phase 15.3C tarball.
- Pre-update installed Client SHA-256 was `93bbe22052362276079b5d5685679d12b0766987901c2081e7b7c5cb0fab9db4`; Host SHA-256 was `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`.
- The previous tarball SHA-256 matched the frozen value `01a1dec387dde762293874cde6e024af6d57287a27082add349309f3623e37d3`. The previous backup manifest SHA-256 matched `8c48413b448a543ab33922c6c476d93f4dcc474fd35dbe2487f5099c9ffa138a`.
- No Harness listener was present on port 3080 and no concurrent plugin install was detected. A user Chrome process was already running; it was left untouched.

## P1 — Accepted artifact recovery: BLOCKED

The exact candidate was exported from Git into a task-owned isolated snapshot. The snapshot used the already installed TypeScript 6.0.3 and tsdown 0.22.14 toolchain directly; it did not run `pnpm exec`, install dependencies, or modify the repository's old `lib/`. Relative Harness paths resolved to the pinned Harness, and the dependency link resolved to the existing repository `node_modules/`.

Direct `tsc -p tsconfig.json` and `tsdown` completed. The resulting hashes were:

| Artifact | Rebuilt SHA-256 | Required SHA-256 | Result |
| --- | --- | --- | --- |
| Client `lib/client.js` | `7df903bcde8d03954fd373ab8fbcc3090b9fbb3b6d76a6a3225b76e250bf6ec9` | `7d3939ab3a6086248a6f351c34ee3e66e5177e857ca6078d347940ffdeb030e3` | **Mismatch — stop** |
| Host `lib/index.js` | `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd` | `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd` | Match |

The Client mismatch is the freeze's hard stop. No second build or environment adjustment was attempted, and the rebuilt Client was not substituted for the accepted bytes.

## P2–P4 — Package, installation, and activation: NOT EXERCISED

Because P1 failed, no new persistent tarball was created, no plugin manager or Profile install ran, and no activation-only Web validation was attempted. The Web Profile package selection and installed files remain on the Phase 15.3C version. No Agent, Tool, Provider, native approval, or Canonical Full ran. No browser page or task-owned Host was started.

## Backup, preservation, and cleanup

- Before the build, a fresh private backup was created at `~/.dsh/backups/risk-advisor/phase15-3e-web-delivery1-20261011T120937Z-6006491b/`, mode `0700`. It contains the seven package-manager/control metadata files and all 90 installed Risk Advisor files; its 97 entries were checked byte-for-byte against the current Profile.
- Backup manifest SHA-256: `7b12a9418109e99cbebbb5f2e1ab02562f19aecb64532b469c3339d4886471f9`.
- After the failed artifact gate, the Profile still matched all 97 backup entries. Installed Client/Host hashes, old tarball SHA, repository-root old Client/Host hashes, and Harness SHA remained unchanged.
- The isolated build snapshot and its two external links were removed after checking each link target. Existing `node_modules/`, Harness, user Chrome, old Profile package, prior tarballs, and backups were preserved. No blank page was created.

## P5 — Report and Git state

This report records the first failed gate. No deployment or acceptance is claimed. It is the only change authorized for commit and push for this attempt.
