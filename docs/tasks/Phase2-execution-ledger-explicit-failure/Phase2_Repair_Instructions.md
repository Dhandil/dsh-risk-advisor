# Risk Advisor — Phase 2 Final Architecture Review Repair Instructions

**Review verdict:** `PHASE2_REPAIR_REQUIRED`  
**Date:** 2026-09-30  
**Reviewed implementation/tested SHA:** `054a0496f41ff1d56ac5fc06b50a7287c4f81dd1`  
**Reviewed report-only remote SHA:** `57dde9d105d14f80af90869f992469a9377f9ab8`  
**Frozen architecture remains authoritative:** `Phase2_Architecture_Freeze.md`  
**Pinned Harness:** `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`, read-only.

## 1. Review result

The implementation is close, but Phase 2 is not yet accepted.

The remote commit relationship, scope, report-only publication, 113-test regression evidence, pinned-Harness boundary, Phase-3 non-expansion, Live/Durable separation, timeout/cancellation mapping, approval independence, PTC reuse and no-stderr sandbox policy all passed independent source review.

One executable correctness blocker remains, plus two narrow contract-hardening repairs that should be fixed in the same bounded repair.

Do not redesign Phase 2.

## 2. F1 — shell evidence must fail closed under duplicate/conflicting live results

### Root cause

Current `LedgerController.observeResult()` stores one mutable `live.shellEvidence` whenever a successful bash/pwsh result is observed.

Current terminal deduplication compares only:

- `isError`
- sanitized error `name/code`

Therefore two observations for the same exact live execution can have the same terminal claim but different structured shell outcome:

- first: success + `exitCode=0`
- second: success + `exitCode=7`
- first: `sandbox.denied=false`
- second: `sandbox.denied=true`

The terminal claim is treated as identical, while `live.shellEvidence` is overwritten by the later observation.

Also, if one successful shell observation is followed by a conflicting error terminal claim, `projectTerminalClaims()` correctly returns terminal `UNKNOWN`, but `buildPhase2Snapshot()` still unconditionally merges the old shell evidence back into the outcome.

This violates the frozen rules:

- conflicting evidence must not select a winner;
- ambiguous/conflicted process evidence must yield `processSuccess='unknown'`;
- a classifier must never turn a conflict into a more specific failure;
- no last-writer-wins.

### Required repair

Make structured shell evidence source-qualified and conflict-aware.

A simple acceptable design is:

- retain the first sanitized shell evidence for an exact live occurrence;
- compare every later shell evidence semantically;
- exact duplicate shell evidence = idempotent;
- differing shell evidence = mark a bounded `SHELL_EVIDENCE_CONFLICT` (name may vary), degrade the execution, and never overwrite/select a later shell fact;
- once shell evidence conflicts, suppress shell-specific failure facts and expose `processSuccess='unknown'` (or omit it only if the frozen type contract still clearly communicates unknown);
- if terminal claims themselves conflict, suppress all shell-specific process/sandbox certainty for that occurrence even if a previously observed shell result was valid;
- a single unconflicted exact shell observation continues to produce the current valid process/sandbox projection.

Do not convert shell-evidence conflict into semantic failure.

Do not create unbounded shell-result history; retain only the bounded proof needed to establish first fact + conflict.

### Mandatory tests

Add focused coverage for:

1. identical repeated successful shell observation → idempotent;
2. success `exitCode=0` then success `exitCode!=0` → no last-writer-wins; process success becomes unknown/suppressed; degraded issue visible;
3. `sandbox.denied=false` then `sandbox.denied=true` → no authoritative `SANDBOX_DENIED` selected from the conflicting observation;
4. successful shell evidence followed by conflicting ToolRuntime error terminal → terminal remains `UNKNOWN` and shell/process-specific certainty is suppressed;
5. reverse-order variants where useful to prove order independence.

## 3. F2 — do not expose caller-forgeable authority witnesses at package root

Current `src/index.ts` publicly exports:

- `projectPreExecuteDecision`
- `projectGuardReturnedDenial`

Both accept ordinary caller-constructible objects that assert authority:

- `{ effective: true, ... }`
- a boolean-filled `GuardDenialTrace`

The reviewed product runtime does **not** possess the globally final pre-policy/guard witness required by the freeze. The report correctly leaves the general guard-returned path `UNKNOWN/PARTIAL`.

A package consumer must therefore not be able to manufacture an apparently authoritative/deterministic Phase-2 fact simply by calling a public helper with self-certified booleans.

### Required repair

Prefer the smallest safe option:

- remove authority-bearing projection helpers from the package-root public exports;
- keep them module-private/internal for focused tests if useful; tests may import the internal module directly;
- the supported product seam remains the read-only bounded `riskAdvisorLedger.phase2(session)` diagnostics.

If you instead introduce an opaque/branded witness, it must be impossible for external callers to construct and must be minted only by an actually proven public runtime witness. Since the reviewed pinned runtime currently lacks that witness, do not invent a constructor merely to preserve a public helper.

The same principle applies to any other helper that would let an external caller self-certify provenance/authority. Do not broaden the repair into a public API redesign.

Update Host export smoke expectations accordingly.

## 4. F3 — close the sandbox enum/bounds adapter

Current `projectShellResult()` accepts arbitrary strings for:

- `sandbox.mode`
- `sandbox.enforcement`

The frozen contract permits only typed bounded sandbox facts from the pinned producer.

### Required repair

Validate the pinned closed vocabularies before exporting them:

- mode: `read-only | workspace-write | danger-full-access`
- enforcement when present: `full | partial`

Malformed/unexpected values must not be copied to the Phase-2 DTO. Fail closed according to the existing adapter semantics; do not pass arbitrary strings through.

Continue to ignore and never retain stdout, stderr, spill paths, command, workdir or other raw value fields.

Add focused tests for malformed/oversized/unexpected mode/enforcement values and privacy.

## 5. Preserve accepted parts

Do not change these unless directly required by F1–F3:

- one existing T04 Ledger;
- sole Phase-1/T02 ExecutionId owner;
- F-006 and F-013 remain PARTIAL;
- no callId/time-based Live↔Durable merge;
- `TOOL_TIMEOUT` structured classification;
- `ABORTED_BEFORE_DISPATCH` vs `ABORTED`;
- generic ToolRuntime error fallback;
- `SANDBOX_UNAVAILABLE` distinct from `SANDBOX_DENIED`;
- approval facts remain independent from execution cause when unbound/ambiguous;
- PTC projector reuse;
- `semanticSuccess='unknown'`;
- Browser/Client behavior;
- Native Approval authority;
- all bounds/privacy protections;
- Phase 3+ remains out of scope.

Do not modify Harness Core or frozen baseline architecture/spec files.

## 6. Test / acceptance order

Use the established order:

1. implement F1–F3 only;
2. Phase-2 focused tests;
3. directly affected R4 / Phase-2 tests as needed;
4. typecheck;
5. build;
6. Host export smoke;
7. Client regression export smoke;
8. pack dry-run;
9. diff/scope/privacy/secret gates;
10. freeze the executable repair commit;
11. run one fresh complete `pnpm test` on that exact executable SHA.

After the final passing full regression, no executable/test/config/package semantic drift is allowed. Only the repair Execution Report update may follow as report-only documentation.

No provider/model/browser/network product calls. Real PTC producer and true disk restart remain NOT_RUN unless separately authorized; do not add them merely for this repair.

## 7. Repair report

Update the existing Phase-2 `Execution_Report.md` with a clearly separated final-repair section containing:

- repair starting SHA;
- exact F1/F2/F3 root causes and fixes;
- focused repair tests and counts;
- static/pack/privacy gates;
- new executable Tested SHA;
- fresh complete regression count;
- confirmation that F-006/F-013 and all inherited NOT_RUN/NOT_VALIDATED gates remain unchanged;
- confirmation of no Phase 3 work and zero Harness Core mutation.

Publish and verify remote equality.

Allowed handoff:

`PHASE2_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE2_ACCEPTED`.
