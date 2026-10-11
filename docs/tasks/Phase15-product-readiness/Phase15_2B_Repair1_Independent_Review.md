# Risk Advisor Phase 15.2B Repair1 — Independent Blocker Review

**Decision:** `RISK_ADVISOR_PHASE15_2B_REPAIR1_BUILD_PASS_ARTIFACT_PROVENANCE_OPEN`  
**Reviewer:** ChatGPT (independent remote GitHub source/report review)  
**Reviewed report SHA:** `56ff2a7cac4d34d4d7b4e145b69a51c739edcef4`  
**Accepted Phase 14 executable:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`

## Scope and evidence

The remote comparison from `7777c7db62ebff64dab6b222bceb244cc6193a0b` to the reviewed SHA is one docs-only report commit. The report's local observations are not an independent execution replay.

R1 (local toolchain, prior backup integrity, target Profile state) is documented PASS. The locally resolved TypeScript 6.0.3 and tsdown 0.22.14 executed the same `tsc -p tsconfig.json && tsdown` build sequence as the checked-in script and exited successfully, without using pnpm's dependency manager. The generated Host hash is `9525d46ccf67856d33c10af496f1a529851b348798b26c20ce7bba3d224edcfd`; the generated Client hash is `06b790cf721dbe2391c1249182b8da71a359eaf4032d062527316f4ae374e735`.

The accepted Phase14.6 Chrome-smoke Client hash was `52b467dd445b73435b55a8c3dd71aa18a40acce8bbd0616587199350c5c97fe3`. That single historical build hash is **a tested-artifact identity**, not a frozen reproducible-build contract. Hash inequality is a genuine **byte difference** and prevents claiming exact artifact identity; it is **not** proof of changed tracked code or failed build, nor does it necessarily require matching the historical hash before any source-identified successor can be accepted.

The present `tsdown.config.ts` includes a `NODE_ENV`-dependent define, a CSS-module emitter that reads source CSS, and source maps; the Phase14.6 build occurred in a detached checkout with a fresh offline `pnpm install`, whereas the current canonical repo has pre-existing dependencies, including a virtual-store lock with retained older entries. These are **hypotheses to investigate**, not established explanations for the hash difference. No baseline artifact bytes were retrieved for a byte-by-byte comparison.

The backup manifest `8ae9d01c441ed5ca6adf9d19b53668bfe5e8f1d3f3f65826b377a77c7826bae4` remained verified per report. New bundle files were written only to the repository's already untracked `lib/`. The existing `web` Profile/installed package were unchanged. Pack/install/Host/Browser, Agent/Tool/provider, and Full were NOT RUN.

## Architecture decision

Accept the **execution report as faithful blocked evidence**. Phase15.2B is **not accepted**, and no claim may be made that the new Client equals the historically tested Client.

Permit a **bounded build-provenance investigation** rather than dependency reinstall or repeated blind rebuilds. A successor may be installed only if source revision, effective toolchain/dependency graph, build inputs/output graph, fixed Client loader/Host exports, and exact newly packed artifact are sufficiently attested, with a bounded direct local smoke where needed. A reproducible output matching the historical hash is **not mandatory** if that exact-output reproducibility was never an accepted requirement, but discrepancies in source, dependency graph, code injection or unresolved artifact provenance remain blockers.

Do not touch the Profile until these gates and the preserved targeted backup/recovery gates pass. No new branch/worktree, lockfile or source edits, forced pnpm repair, broader testing, real Agent or Phase13.3 campaign.

**Next authorized document:** `Phase15_2B_Repair2_Artifact_Provenance_Amendment.md`.
