# Risk Advisor Phase 15.2B Repair1 — Build Invocation Execution

**Result:** `RISK_ADVISOR_PHASE15_2B_REPAIR1_BLOCKED`

**Repair baseline:** `7777c7db62ebff64dab6b222bceb244cc6193a0b`  
**Accepted executable source ancestor:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`  
**Pinned Harness:** `ddefc45fbc7f8e46dd73185e68295696d1297887`  
**Target:** existing `web` Profile

## Outcome

The local compiler invocation repair avoided pnpm's dependency-directory status check, and both build commands completed. The generated Client bundle did not match the frozen Phase 14.6 Client SHA. The tracked source and build configuration since the accepted executable are documentation-only, and the local tool versions match the project lock, but the available records do not explain the byte difference. Per the frozen stop condition, packaging, Profile installation, and activation were not attempted.

## R1 — Read-only toolchain and state proof: PASS

- Local `main`, `origin/main`, and `git ls-remote` matched `7777c7db62ebff64dab6b222bceb244cc6193a0b`. The tracked diff from the accepted executable ancestor is documentation-only. Existing untracked `.vitest-cache/`, `lib/`, and `node_modules/` were preserved.
- Harness remained at `ddefc45fbc7f8e46dd73185e68295696d1297887`; its tracked tree was clean and its pre-existing untracked `deepseek-harness` path was preserved.
- The local `node_modules/.bin/tsc` and `node_modules/.bin/tsdown` launchers resolve to this repository's pnpm virtual store. Direct version probes returned TypeScript `6.0.3`, tsdown `0.22.14`, and Node `v24.21.0`. The 32-package required compiler/bundler dependency closure resolved inside the repository and to versions represented by `pnpm-lock.yaml`; missing optional native bindings were for non-Darwin platforms.
- The existing virtual-store lock differs from the current project lock because it retains older DSH storage and `zod` entries removed from the project lock. The compiler closure itself matches the current pinned toolchain. No pnpm-managed invocation, installation, repair, or dependency-directory deletion was performed.
- Existing backup manifest SHA-256 is still `8ae9d01c441ed5ca6adf9d19b53668bfe5e8f1d3f3f65826b377a77c7826bae4`. All 190 repository `lib/` manifest entries and all 80 targeted Profile backup entries were checked; file bytes, hashes, and file modes matched. The two shared `node_modules` parent directories are backup structure only and are not restore targets. The existing `lib/` bytes matched the backup before the build. The original artifact remains unchanged at SHA-256 `4dd3c86d62ca106be670c7c6c73215d6c00b31cd1618473318ac293cd1f8cf35`.
- The selected Profile remained `~/.dsh/profiles/web`, with the same saved bundle order and existing local tarball selection. Profile manifest SHA-256 remained `02da15ae9d6704c00557e28d9151608bb1e692a12b434f76737890dd9cc45aff`. Installed Host and Client SHA-256 remained `64c8a854bcc87264882307c2e5204fb1c47da9a1253a2a14a0ba54502f8f9aa3` and `2f005aea5bf90619a34057299c5ed021212e9c9646a5e17840ecab2191484910`. No process held the inspected Profile control or installed package files; no matching Harness Host/listener was found.

## R2 — Direct build: completed; artifact identity gate blocked

The exact local launchers were invoked in the frozen order, without `pnpm exec`, `pnpm run`, `npx`, a global compiler, or dependency repair:

```text
./node_modules/.bin/tsc -p tsconfig.json
./node_modules/.bin/tsdown
```

Both exited successfully. The generated bundle hashes are:

| Artifact | SHA-256 |
|---|---|
| `lib/index.js` | `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd` |
| `lib/client.js` | `06b790cf721dbe2391c1249182b8da71a359eaf4032d062527316f4ae374e735` |
| `lib/index.js.map` | `076c6a3a194271626757f29731ed566aa3afc2f799f503a55b51e4063c27c4c1` |
| `lib/client.js.map` | `c6b18e1fc02beb693a89f80284e996f8f3329803ff558587ba86b752ecad4d2b` |

The frozen accepted Client identity is `52b467dd445b73435b55a8c3dd71aa18a40acce8bbd0616587199350c5c97fe3`; the generated Client SHA differs. The accepted executable is an ancestor of this main and every intervening tracked change is documentation-only. The project manifest and lock pin the observed TypeScript/tsdown tool versions and the resolved bundler closure. However, the accepted build report does not record enough build-environment/artifact detail to establish why an equivalent-source build produced different bytes. This discrepancy remains unresolved, so the new artifact is not authorized for packaging or installation.

The existing `lib/` output was overwritten by the authorized direct build. Its complete previous bytes remain in the verified private backup at `~/.dsh/backups/risk-advisor/phase15-2b-web-20261011T052436Z/`. The new output remains in the repository's untracked `lib/`; it was not copied to the Profile or elsewhere.

## R3 and remaining activation gates: NOT RUN

No `pnpm pack`, package-manager operation, Profile mutation, Host/Browser start, test, Agent, Tool, Provider, approval, or Full run occurred. The existing Web Profile, its installed package, bundle selection, other plugins, model/provider configuration, and original tarball remain unchanged. No task-owned page or process was started.

| Gate | Result |
|---|---|
| R1 — read-only local toolchain, backup, and Profile proof | **PASS** |
| R2 — direct compiler/bundler execution | **PASS** |
| R2 — accepted Client artifact identity/provenance | **BLOCKED — SHA mismatch unexplained** |
| R3 — pack, install, activation-only | **NOT RUN — stopped at R2 identity gate** |

This report records a blocked Repair1 execution. It does not claim activation readiness or acceptance.
