# Phase 7 Acceptance Report — Known Postcondition Verification

## Outcome

`PHASE7_ACCEPTED`

Phase 7 is accepted after independent final review.

Accepted executable / Tested SHA:

`366305d342e3cae197cc19df8de5c434a163b82b`

Reviewed report-only remote SHA:

`d0b94207e3cced7e73a4af675ac03a09294dd4cc`

Harness reference:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

Phase 8 was not started as part of this acceptance.

---

## 1. Review lineage

Independent review covered the original Phase-7 implementation and three bounded repair rounds.

Chronology:

- Original executable: `25c9326f0c8863cd994698e220edbeaba7bed804`
- Repair 1 executable: `cacda91fafa0acc827e3aa7192c307390c140a0c`
- Repair 2 executable: `7766d1f8dae770f01357d5e3279638f80919b80f`
- Repair 3 executable / accepted Tested SHA: `366305d342e3cae197cc19df8de5c434a163b82b`
- Final Repair-3 execution-report publication: `d0b94207e3cced7e73a4af675ac03a09294dd4cc`

The final publication diff from the accepted Tested SHA is docs-only.

---

## 2. Accepted architecture

The accepted Phase-7 implementation preserves the frozen architecture:

- ExpectedEffect is captured at the existing execution boundary.
- Phase 4 and Phase 7 share one shell-analysis authority.
- direct write/edit verification uses Tool Contract results without filesystem post-read.
- shell-world verification uses public `ctx.shell.resolve/run`.
- no hidden verifier Tool exists.
- verifier does not request or reopen Native Approval.
- no generic `ctx.fs` Evidence Collector was introduced.
- VerificationStore retains only sanitized process-local verification records.
- package verification is positive-only.
- retry/failure-chain semantics preserve causal ordering and historical retry immutability.
- Browser Phase 6 behavior remains unchanged.
- A3 remains absent.
- Phase 8/9 remain unimplemented.

---

## 3. Final resolution of F1–F6

### F1 — ExpectedEffect raw-state lifecycle

Accepted.

The final implementation provides:

- TTL cleanup;
- Session disposal cleanup;
- terminal one-shot removal;
- full plugin disposal cleanup;
- object-keyed raw lookup removal;
- per-Session active bound of 128;
- global active bound of 512.

Focused proof includes the direct single-Session 129 → 128 eviction case and independent global-bound proof.

### F2 — scheduler and capability quiescence

Accepted.

The scheduler publishes a logical timeout without releasing ownership of underlying verifier work.

Accepted properties include:

- real active slot remains occupied until underlying settlement;
- timeout abort does not release real concurrency early;
- dispose joins underlying work;
- detach aborts and drains;
- sandboxPolicy replacement under active load fences and drains the old generation before new policy use;
- stale generation work cannot publish a late successful semantic result.

### F3 — frozen adapter grammar and operand/output fidelity

Accepted.

The final implementation:

- recognizes only the frozen Git forms:
  - `git checkout BRANCH`
  - `git checkout -b BRANCH`
  - `git switch BRANCH`
  - `git switch -c BRANCH`
- rejects checkout `-c` and switch `-b`;
- rejects option-looking mkdir/copy operands;
- rejects shell operands requiring runtime expansion when exact fidelity is not proven;
- preserves supported static PowerShell path data and fails closed on ambiguous quoting/expansion;
- uses a conservative Git branch grammar;
- rejects invalid branch component/ref forms;
- rejects ASCII DEL `U+007F`;
- treats malformed/polluted Git verifier output as UNKNOWN;
- permits at most the supported terminal newline form;
- produces hard Git mismatch only for another valid bounded branch name.

The final Repair-3 proof directly covers U+007F on both expected capture and observed verifier output.

### F4 — copy verifier classification

Accepted.

The product-owned COPY_CHECKER is executable-proven for:

- equal bounded regular files → MATCHED;
- unequal bounded regular files → MISMATCHED;
- destination confirmed absent → MISMATCHED;
- destination EACCES/EPERM → UNKNOWN;
- destination read/disappearance race → UNKNOWN;
- source access/missing → UNKNOWN;
- symlink/directory/special → UNKNOWN;
- exactly 1 MiB regular file boundary;
- greater than 1 MiB → UNKNOWN.

Access/provider/read/race ambiguity is not converted into semantic failure.

### F5 — FailureChain temporal immutability

Accepted.

Retry evidence selected at a later execution's capture boundary is retained as immutable causal history.

A later verification conflict on the earlier execution may affect future captures but cannot erase or rewrite a retry relation already captured.

Duplicate verification remains idempotent and conflict does not become last-writer-wins semantic failure.

### F6 — executable proof and benchmark coverage

Accepted.

Final Phase-7 focused suite:

`6 files / 26 tests PASS`

The real local benchmark executes:

- direct write;
- direct edit;
- actual mkdir checker;
- actual small-file copy checker;
- actual 1,048,575-byte near-1MiB copy;
- local Git branch verification in a disposable repository with no remote;
- positive local Node resolution from disposable local `node_modules`;
- real frozen timeout path;
- scheduler saturation path.

It is no longer marker-only simulation.

Direct Phase-7 boundary proof also covers absence of approval/A3/Browser/custom-Session-event/deprecated-reader/Phase-8 side paths.

---

## 4. Final acceptance evidence

The final Repair-3 execution report records all required gates as PASS.

Key acceptance evidence:

- Phase 7 focused: 6 files / 26 tests PASS.
- Phase 4 parser/rule equivalence: 2 files / 17 tests PASS.
- P1A/P1B/P1C, P2, P3, P5, P6, R1–R4 regressions: PASS.
- typecheck: PASS.
- build: PASS.
- host/client export checks: PASS.
- declaration/root-export audit: PASS.
- package dry-run: PASS.
- `git diff --check`: PASS.
- scope/privacy/secret/no-network/no-custom-session-event/deprecated-reader gates: PASS.
- Harness tracked mutation audit: PASS.
- Phase-7 real local benchmark smoke/full: PASS.
- fresh complete `pnpm test`: 35 files / 226 tests PASS at exact Tested SHA `366305d342e3cae197cc19df8de5c434a163b82b`.

No executable/test/config/package/benchmark semantic drift occurred after the passing Full.

---

## 5. Side-effect and scope boundaries

Accepted evidence records:

- provider/model calls: 0;
- product/test/benchmark external network calls: 0;
- package registry calls: 0;
- product/test/benchmark external Git remote calls: 0;
- Harness tracked mutations: 0;
- custom Risk Advisor Session events: 0;
- hidden verifier Tool registrations: 0;
- Native Approval authority changes: 0;
- Browser Phase-6 changes: 0;
- A3 implementation: 0;
- Phase-8/9 implementation: 0.

Governance-only Git synchronization/push/equality checks are not product-runtime external calls.

Existing PARTIAL / NOT_RUN / NOT_VALIDATED boundaries remain unchanged and were not upgraded by Phase 7 acceptance.

---

## 6. Acceptance boundary

This report accepts Phase 7 only.

It does not accept or imply completion of:

- Phase 8;
- Phase 9;
- real-provider latency/policy validation;
- true cold restart;
- native PTC validation;
- live-browser validation;
- WebWorker validation;
- any previously documented partial/not-run/not-validated evidence.

Phase 8 may begin only as a separate phase from the accepted Phase-7 baseline.

---

## 7. Final state

`PHASE7_ACCEPTED`

Accepted Tested SHA:

`366305d342e3cae197cc19df8de5c434a163b82b`

Reviewed report SHA:

`d0b94207e3cced7e73a4af675ac03a09294dd4cc`

The acceptance publication itself is documentation-only and does not alter the accepted executable evidence.
