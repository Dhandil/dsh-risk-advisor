# Risk Advisor Phase 13.1 — Maintenance Repair2: Settlement Capability & Blocker Taxonomy Amendment

## Status

`RISK_ADVISOR_PHASE13_1_MAINTENANCE_REPAIR2_AUTHORIZED`

This is validation-instrument maintenance discovered by the first Phase 13.2 campaign.

No Product `src/` change is authorized.

## R1 — Operation verification capability

Extend validation-owned operation metadata with an independent capability declaration.

Frozen values:

```ts
type ValidationVerificationCapability =
  | 'NONE'
  | 'DIRECT'
  | 'ASYNC_SUPPORTED'
```

For the accepted operation registry:

- `read-failure` -> NONE
- `read-success` -> NONE
- `read-different-failure` -> NONE
- `write-match` -> DIRECT
- `write-mismatch-fault` -> DIRECT
- `bash-mkdir-match` -> ASYNC_SUPPORTED
- `bash-mkdir-mismatch-fault` -> ASYNC_SUPPORTED
- `bash-unsupported` -> NONE

This metadata belongs to validation truth only.

It MUST NOT import Product expected-effect/verifier implementation.

## R2 — Pre-execution settlement compatibility gate

Before creating the campaign workspace or executing any Tool, validate every step:

```
step.f2Settlement === operation.verificationCapability
```

Exception:

A capability `NONE` step must use `f2Settlement = NONE`.

No implicit upgrade/downgrade is allowed.

If incompatible:

- reject campaign before Tool execution;
- classify as validation manifest/instrument error;
- Tool executions = 0;
- Product defect = false.

Frozen issue:

`SETTLEMENT_CAPABILITY_MISMATCH`

## R3 — F2 expected-label compatibility

Pre-execution validation must also enforce:

- F2 EXPECTED requires DIRECT or ASYNC_SUPPORTED;
- NONE capability cannot declare F2 EXPECTED;
- unsupported/no-verifier scenarios use F2 NOT_EXPECTED or NOT_APPLICABLE according to the frozen scenario truth.

The existing schema check for EXPECTED + NONE settlement remains, but operation-capability compatibility is additionally required.

## R4 — Explicit blocker taxonomy

Remove:

```
if (issues.length > 0) return BLOCKED_P1
```

No unknown issue code may silently become Product P1.

Freeze explicit issue classes.

### Product P0

- WRONG_SESSION_FINDING

### Product P1

Only explicit Product correctness issues:

- FROZEN_CONTRACT_MISMATCH
- DUPLICATE_FINDING
- UNEXPECTED_SIGNAL_ON_NOT_APPLICABLE
- RESURRECTED_FINDING
- FINDING_LIFETIME_VIOLATION
- PROCESS_CLASS_MISMATCH when the process oracle itself is valid and the mismatch is Product-attributable

### Capture

- CAPTURE_INVALID

### Ledger

- LEDGER_INTEGRITY_INVALID

### Environment

- ENVIRONMENT_FAILURE

### Upstream verifier candidate

- UPSTREAM_VERIFICATION_MISSING

### Validation instrument / manifest

- SETTLEMENT_CAPABILITY_MISMATCH
- any unknown/unclassified issue code

Unknown issue codes must fail closed as validation-instrument failure, not Product P1.

## R5 — Campaign status extension

Add explicit internal statuses if needed:

- `BLOCKED_UPSTREAM`
- `BLOCKED_VALIDATION`

The docs-level Phase 13.2 mapping is:

- BLOCKED_UPSTREAM after supported-operation proof -> candidate Product verifier repair review;
- BLOCKED_VALIDATION -> `RISK_ADVISOR_PHASE13_2_BLOCKED_VALIDATION_HARNESS_REPAIR_REQUIRED`.

Do not map raw `UPSTREAM_VERIFICATION_MISSING` directly to Product Repair before supported-operation provenance is present.

## R6 — Supported upstream-missing evidence

When a prevalidated DIRECT/ASYNC_SUPPORTED operation still has no verification record:

the minimal reproducer must include bounded validation-owned facts:

- scenarioId;
- stepId;
- operationRef;
- verificationCapability;
- f2Settlement;
- expected F2 label;
- captured executionId presence (not raw private data beyond existing opaque ID policy);
- verifier settlement result = MISSING;
- ledger head hash.

This allows architecture review to distinguish a real Product verifier defect from manifest error.

## R7 — DIRECT missing

DIRECT verification is synchronous by accepted Product architecture.

If a prevalidated DIRECT operation has no record immediately after Tool settlement:

- issue `UPSTREAM_VERIFICATION_MISSING`;
- stop;
- classify as upstream Product verifier candidate.

Do not wait 15 seconds.

## R8 — ASYNC supported missing

For a prevalidated ASYNC_SUPPORTED operation:

- poll public Verification diagnostics using the accepted 15s deadline;
- if still missing, issue `UPSTREAM_VERIFICATION_MISSING`;
- stop;
- classify as upstream Product verifier candidate.

Only this prevalidated path may reach upstream-product review.

## R9 — Campaign-1 quarantine

Do not resume Campaign-1.

Its partial ledger/report may be retained locally as defect-discovery evidence.

After Repair2 acceptance, Phase 13.2 must use:

- a new campaignRunId;
- the same frozen seed/config semantics unless a later Architecture Amendment changes them;
- a newly generated and prevalidated canonical manifest.

## R10 — Scope

Repair2 may modify only:

`validation/phase13/`

Do not modify:

- Product `src/`;
- existing Product tests;
- package/lock/root config;
- benchmarks;
- Harness Core.

## Required proofs

- **M1** each operation carries exactly one frozen verification capability.
- **M2** unsupported/NONE + ASYNC_SUPPORTED declaration fails before workspace/Tool execution.
- **M3** DIRECT operation + NONE or ASYNC declaration fails pre-execution.
- **M4** ASYNC operation + DIRECT/NONE declaration fails pre-execution.
- **M5** NONE operation cannot declare F2 EXPECTED.
- **M6** valid smoke manifest passes capability validation.
- **M7** `UPSTREAM_VERIFICATION_MISSING` maps to BLOCKED_UPSTREAM, not BLOCKED_P1.
- **M8** unknown issue maps to BLOCKED_VALIDATION, not Product P1.
- **M9** explicit frozen-contract mismatch still maps Product P1.
- **M10** wrong-session remains Product P0.
- **M11** supported ASYNC missing produces bounded upstream reproducer evidence.
- **M12** supported DIRECT missing produces bounded upstream reproducer evidence without sleep.
- **M13** settlement mismatch runs 0 Tools.
- **M14** K1-K12 and H1-H18 remain PASS.
- **M15** bounded smoke remains clean and provider/model/Judge/subagent calls remain 0.

## Verification

Run only Repair2 focused proofs, retained Phase 13 validation proofs, bounded smoke, and relevant P12/P3/P7/P10 regressions.

Do not run complete `pnpm test`.

Do not rerun Phase 13.2 canonical campaign under Repair2 implementation authorization.

Do not call provider/model.
