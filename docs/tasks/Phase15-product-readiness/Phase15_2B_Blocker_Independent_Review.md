# Risk Advisor Phase 15.2B — Build Blocker Independent Review

**Decision:** `RISK_ADVISOR_PHASE15_2B_BUILD_INVOCATION_BLOCKER_CONFIRMED`  
**Independent reviewer:** ChatGPT  
**Reviewed candidate/report:** `10f2af590a17be8bf29dd81d670331fa79c9f660`  
**Previous authorized instruction:** `Phase15_2B_Existing_Web_Activation_Execution_Instructions.md`  
**Accepted executable ancestor:** `ab3e17c1834b9ae2082369e35178d7006efb9e35`

## Remote provenance

GitHub compare from `7130db774d639f4045cc85114fae1b8dbd5b7ea6` to reviewed main shows one child commit adding only `Phase15_2B_Activation_Execution_Report.md`. The report does not claim successful build, installation, Host/Client activation, UX, real-Agent validation or Full.

## Findings

- B0 source and pinned Harness identity, B1 target Profile ownership/process checks and B2 narrow backup are documented PASS. The recorded backup manifest SHA-256 is `8ae9d01c441ed5ca6adf9d19b53668bfe5e8f1d3f3f65826b377a77c7826bae4`. These are **execution-agent local observations**, not a separate reviewer-side filesystem attestation.
- At B3, `pnpm exec tsc --version` invoked pnpm 11.7.0's dependency-directory check. It requested deletion of the existing `node_modules/` directory and then failed with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`. The **compiler was never entered**; this does not prove compilation failure, bad source, or broken dependencies. No pnpm confirmation bypass or reinstall was attempted.
- The report states repository `lib/`, protected `node_modules/`, `.vitest-cache/`, installed Profile package and control-file hashes were unchanged after the failed invocation. No user Profile install, Harness/Browser launch, Agent, Tool, provider, test or Full was run.
- The checked in package's official `build` script is exactly `tsc -p tsconfig.json && tsdown`. Using explicitly resolved locally installed executables could execute the same compiler/build steps **without invoking pnpm's install/status manager**. This is a *candidate mitigation*, not proof that the local executables exist or work.

## Decision

**Accept the blocked execution report as faithful blocker evidence. Do not accept Phase15.2B activation.** The original build/pack/install gate is still open; preserving `node_modules/` and the existing Profile takes priority over repair by deletion/reinstallation.

Authorize only a narrowly reviewed **toolchain invocation repair** with a read-only executable-resolution preflight, followed by **conditional** direct invocation of the same `tsc -p tsconfig.json` and `tsdown` toolchain when its integrity is established. No source, dependency, lockfile, package manifest or Harness modifications. No new branch/worktree or temp repository.

The pre-existing exact backup may be reused only after fresh inventory and hash checks prove its original files are still an intact match; it does not authorize replacing an active user-owned Profile. `pnpm pack` and subsequent existing Phase15.2B install/activation remain independently gated. If pnpm prompts to remove/repair modules anywhere, **stop instead of consenting**.

**Next:** `Phase15_2B_Build_Invocation_Repair_Amendment.md`.

**Outcome:** `RISK_ADVISOR_PHASE15_2B_BUILD_INVOCATION_BLOCKER_CONFIRMED`.
