# Risk Advisor — Phase 2 Final Public-Surface Repair Instructions

**Review verdict:** `PHASE2_FINAL_REPAIR_REQUIRED`  
**Date:** 2026-09-30  
**Repair start / current remote:** `ec976ac4de846d5a5acb8c16fcedb156f33895a1`  
**Current executable/tested SHA:** `67e4890429a72ec55da4dc21f766e7457ff6fd67`  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, read-only.

## 1. Scope

This is the final narrow Phase-2 repair.

F1 shell-conflict handling and F3 sandbox enum closure are accepted as implemented. Do not redesign or modify them unless a regression requires a strictly equivalent correction.

The only executable blocker is incomplete closure of F2: package-root public Phase-2 projection helpers can still let an external caller self-certify provenance/evidence and obtain facts marked `AUTHORITATIVE` or `DETERMINISTIC`.

## 2. Root cause

The previous repair removed:

- `projectPreExecuteDecision`
- `projectGuardReturnedDenial`

from `src/index.ts`, but these Phase-2 projection helpers remain exported from the package root:

- `projectApprovalOutcome`
- `projectPtcProjection`
- `projectShellResult`
- `projectTerminalClaim`
- `projectTerminalClaims`

At least:

- `projectTerminalClaim({ provenance: 'LIVE_FINAL', ... })` can create an `AUTHORITATIVE` failure fact from caller-constructed structural data;
- `projectShellResult(..., value, evidence)` can create `SANDBOX_DENIED / AUTHORITATIVE` from a caller-constructed value/evidence object;
- the approval/PTC projections likewise accept ordinary caller-constructible source/provenance structures and return product-strength facts.

That conflicts with the frozen repair rule that the supported Phase-2 product authority seam is the runtime-owned read-only `riskAdvisorLedger.phase2(session)` projection, not caller-minted evidence.

## 3. Required executable repair

Remove **all Phase-2 authority-bearing pure projection functions** from the package-root exports in `src/index.ts`:

- `projectApprovalOutcome`
- `projectPtcProjection`
- `projectShellResult`
- `projectTerminalClaim`
- `projectTerminalClaims`
- and keep the already removed `projectPreExecuteDecision` / `projectGuardReturnedDenial` absent.

They may remain internal implementation functions in `src/host/explicit-failure.ts` and focused tests may import that internal module by repository-relative path.

Do not add branded/factory public witnesses merely to keep these exports.

The package root may continue exporting **types** required to inspect the frozen `riskAdvisorLedger.phase2(session)` DTO, provided those types do not themselves execute/mint authority.

Do not remove unrelated pre-existing R2/R3/R4 public surfaces such as `installLedger` or replay diagnostics unless required by a direct regression. This repair is only about the new Phase-2 fact-minting helpers.

## 4. Mandatory focused proof

Update the F2 root-export test to assert that **none** of the following exist on the package root:

```text
projectPreExecuteDecision
projectGuardReturnedDenial
projectApprovalOutcome
projectPtcProjection
projectShellResult
projectTerminalClaim
projectTerminalClaims
```

Continue testing internal pure projectors through direct internal-module imports.

Host export smoke must be updated accordingly:

- required runtime product exports remain present;
- all Phase-2 authority-bearing pure projector functions above are absent.

Build declarations/pack output must agree with runtime exports.

## 5. Preserve accepted behavior

Do not change:

- F1 shell-evidence conflict semantics;
- F3 sandbox mode/enforcement closure;
- one T04 Ledger;
- Phase-1 sole ExecutionId ownership;
- F-006/F-013 PARTIAL;
- guard general runtime path UNKNOWN/PARTIAL;
- timeout/cancellation taxonomy;
- Native Approval behavior;
- PTC replay semantics;
- privacy/bounds;
- semanticSuccess unknown;
- Client/browser code;
- Harness Core;
- any Phase 3+ behavior.

## 6. Final validation order

Because `src/index.ts` and tests change, this is executable/package semantic drift and requires a new tested SHA.

Run:

1. focused Phase-2 tests;
2. R4 if directly affected (recommended, cheap);
3. typecheck;
4. build;
5. Host export smoke proving projector absence;
6. Client export regression smoke;
7. pack dry-run and declaration/export audit;
8. diff/scope/privacy gates;
9. commit executable/test repair;
10. run exactly one fresh complete `pnpm test` on that exact executable SHA.

After that full regression, no executable/test/config/package semantic drift.

## 7. Execution Report correction

The current report's early "Repositories and tested state" section still names the old pre-repair executable/tested SHA `054a0496...`, while the later repair section correctly names `67e489...`.

When publishing this final repair report, make the report internally consistent:

- top-level/current Executable/Tested SHA = the **new final executable repair SHA**;
- retain `054a0496...` and `67e489...` only as historical implementation/repair SHAs in the chronology;
- final complete regression count/result must correspond to the new final executable SHA;
- final remote SHA after the report-only commit must be recorded;
- explicitly state that Tested SHA → final remote differs only by `Execution_Report.md`.

Preserve all inherited OPEN/NOT_RUN/NOT_VALIDATED claims.

## 8. Handoff

Allowed outcome:

`PHASE2_FINAL_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE2_ACCEPTED`. Stop after push and remote equality verification.
