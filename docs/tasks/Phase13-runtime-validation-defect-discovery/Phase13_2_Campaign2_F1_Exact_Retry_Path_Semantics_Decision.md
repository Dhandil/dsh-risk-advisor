# Risk Advisor Phase 13.2 Campaign-2 — F1 Exact Retry Path Semantics Decision

## Status

`RISK_ADVISOR_PHASE13_2_F1_EXACT_RETRY_PATH_SEMANTICS_FROZEN`

Campaign-2 minimal evidence recovery returned:

`ARCHITECTURE_SEMANTICS_DECISION_REQUIRED`

The recovered case is therefore classified as:

- current operation fingerprint differs from the immediately prior Tool execution;
- current operation fingerprint equals an older non-adjacent failed execution in the same Session;
- current Product reconnects to that older failure and can emit F1.

This document resolves the V1 semantics.

## Decision

For Online Correction V1:

> An F1 retry edge is a **contiguous exact retry-path edge**, not a historical same-fingerprint relation.

A current Tool execution may have `retryOf` only when the **immediately preceding Tool execution in the same Session** is the qualifying predecessor for that same exact operation fingerprint.

If any intervening Tool execution has a different fingerprint, unsupported fingerprint, or otherwise represents another operation attempt, the prior exact retry path is broken.

A later return to an older fingerprint starts a new V1 path.

It MUST NOT reconnect to the older failure solely because the fingerprint matches historical state.

## Consequence

The Campaign-2 A5 expectation is correct.

The observed F1 is a Product P1:

`PRODUCT_NON_ADJACENT_RETRY_RECONNECTION_DEFECT`

The validation campaign truth is not amended.

## Why this is the V1 interpretation

### 1. Frozen advisory semantics

F1 advisory code:

`STOP_EXACT_RETRY_PATH_V1`

The fixed renderer says:

> The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.

“Retry path” is a live sequence, not an arbitrary historical equivalence class.

### 2. Existing Phase 12 proof matrix

Phase 12.1 froze:

- C1 exact-fingerprint retry chain -> F1;
- C2 changed command/fingerprint -> no F1;
- C3 success breaks retry chain -> no F1 across it.

The conservative interpretation is that changing operation identity breaks the current exact retry path.

### 3. Precision-over-recall

Online Correction V1 deliberately favors precision.

Reconnecting across an intervening strategy change would broaden F1 from:

“you are repeating the same exact failing operation now”

to:

“you have returned to something that failed earlier”.

That broader pattern may be useful, but it is not the frozen V1 contract.

### 4. Future coverage remains possible

A later phase may define a separate pattern such as:

- returned-to-known-failing-operation;
- alternating-no-progress strategies;
- repeated semantic goal despite changed commands.

Such behavior belongs to future Pattern/Guidance or another Finding family.

It must not silently expand F1.

## Frozen adjacency rule

Let Session Tool executions have monotonic live ordinals.

For current execution `E[n]`, F1 relation eligibility requires the immediately preceding Tool execution `E[n-1]` in the same Session.

A retry edge may exist only if:

1. current fingerprint is supported;
2. predecessor fingerprint is supported;
3. fingerprints are exactly equal;
4. predecessor failure evidence is settled and causally available;
5. existing TTL/conflict/truncation requirements pass;
6. current failure eventually satisfies the existing same-root-cause F1 predicate.

If predecessor fingerprint differs:

- `retryOf` is absent;
- `retryCount = 0` for the new path;
- no historical matching fingerprint may be substituted.

If predecessor fingerprint is unsupported/unknown:

- fail closed;
- do not jump backward to an older matching fingerprint.

If predecessor is an exact matching success:

- existing success-break semantics remain.

## Product repair location

The defect is in Failure Chain relation construction, not Live Correction Finding evaluation.

Current source searches Session history backward for the nearest record with a matching fingerprint.

That behavior must be replaced by contiguous predecessor semantics.

Live Correction should continue consuming the resulting immutable `FailureChainSummary` without learning fingerprint internals.

## Invariants to preserve

The repair MUST preserve:

- fingerprint field definitions;
- sameRootCause semantics;
- failure signature semantics;
- semantic-verification overlay;
- TTL;
- per-session/global bounds;
- privacy;
- immutable captured evidence;
- overlapping-call fail-closed behavior;
- no Product authority expansion;
- no model/LLM dependency;
- existing F2 semantics.

## Campaign consequence

Campaign-2 remains stopped at its first valid Product P1.

Do not rerun Phase 13.2 until Product Repair1 is implemented, reviewed, accepted, and integrated.

After Product Repair1 acceptance, run a fresh canonical Phase 13.2 campaign with a new run identity.
