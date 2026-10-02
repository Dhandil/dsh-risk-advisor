# Phase 8 Repair 2 Instructions

## Outcome

Independent review of:

- Repair Tested SHA: `6b6f10d37dcc4fc8a2685c4496be6f2ec9829df5`
- Report SHA: `f031e3b4482a058a9a21b0987bbef2a14da8c6db`

concludes:

`PHASE8_REPAIR_REQUIRED`

The Phase-8 architecture remains frozen. This is a narrow final repair. Do not start Phase 9.

---

## R2-1 — Pinned PowerShell tool schema is still incomplete

The pinned Harness `PwshToolArgs` includes:

```text
command
description
timeoutMs?
workdir?
run_in_background?
sandbox_permissions?
justification?
```

Current `TOOL_ARGUMENT_KEYS.pwsh` omits:

```text
sandbox_permissions
justification
```

Therefore a valid sandbox/escalation-aware pwsh call can still be downgraded to unsupported before the shared parser runs.

Repair the per-tool allowlist to match the pinned public schema.

Mandatory proof:

- valid pwsh command + description;
- timeout/background;
- sandbox_permissions + justification;
- unknown extra key rejected;
- accessor/proxy rejected;
- expansion/ambiguous quoting/explicit-workdir fail-closed behavior unchanged.

Do not broaden to unknown keys.

---

## R2-2 — danger-full-access minimum-privilege verdict is currently unreachable

The frozen rule requires that when the operation's actual minimum local scope is proven:

```text
requested workspace-write   -> PROPORTIONATE
requested danger-full-access -> EXCESSIVE
```

Current `safeLocalMutation` rejects `danger-full-access` itself and also rejects every generic `permission` finding. This means the exact case Phase 8 is supposed to identify as excessive can never become eligible.

Repair the logic so that:

- the **requested permission width itself** does not disqualify minimum-scope proof;
- `PERMISSION_DANGER_FULL_ACCESS` does not count as an operation side effect;
- actual privilege elevation/access-control mutation/retry escalation still blocks the closed minimum-scope proof when appropriate;
- network/system/install/credential/destructive/ambiguous operations remain ineligible;
- exact-target/canonical/workspace/static-operation requirements remain mandatory.

Add direct tests:

- proven direct write/edit + workspace-write -> PROPORTIONATE;
- same proven operation + danger-full-access -> EXCESSIVE;
- actual permission mutation/elevation -> no minimum-scope verdict;
- unsupported/destructive/network case -> no minimum-scope verdict.

Also keep reversibility independent from the width of requested permission. A clean tracked local write/edit is not made physically non-reversible merely because the request asked for wider authority.

---

## R2-3 — local Git checker must explicitly disable fsmonitor

The frozen Git checker hardening requires fsmonitor to be disabled where applicable.

Current checker disables prompt/pager/optional locks and external diff/textconv, but repository-local Git config can still enable `core.fsmonitor`, which may invoke an external hook/process during local inspection.

Harden every product-owned Git invocation with an explicit local override equivalent to:

```text
-c core.fsmonitor=false
```

or another proven Git-native mechanism that prevents fsmonitor command/hook execution.

Preserve:

- local-only Git;
- no remote;
- no credential interaction;
- no external diff/textconv;
- bounded closed JSON;
- no raw path/stdout/stderr retention.

Add executable proof using a disposable repository configured with a sentinel fsmonitor command/hook. The sentinel must not execute while Evidence collection still succeeds/fails closed deterministically.

---

## R2-4 — cancellation/replacement must not publish stale success

Current EvidenceScheduler aborts a controller on cancel/dispose, but if a job ignores AbortSignal and later resolves normally, the scheduler can still resolve it as `ok:true`.

The collector also does not re-check fs generation after every possible late fs operation before final success publication.

This leaves a stale-generation success window if capability replacement happens after the initial workspace resolve.

Repair the lifecycle so that:

- cancelled/disposed/rotated jobs can never resolve as `ok:true` after their controller was aborted;
- before publishing a successful snapshot, current fs/shell generation and scheduler ownership are revalidated;
- old generation may settle, but cannot publish authoritative success or A3;
- replacement waits for the previous scheduler to drain before new-generation evidence publication;
- native decision still fences late A3.

Mandatory proof with an AbortSignal-ignoring fake capability:

1. fs replacement occurs after workspace resolve but during later lstat/stat/read;
2. old work eventually resolves normally;
3. old result is CANCELLED/stale, not successful Evidence;
4. no old-generation A3 is published;
5. new generation can collect successfully after drain;
6. equivalent shell replacement-under-load case around the Git checker.

Do not weaken Phase-7 scheduler semantics.

---

## R2-5 — cancellation tombstones must remain bounded

Current `cancelled: Set<ExecutionId>` grows for every cancelled/native-decided execution and is not TTL-, Session-, or capacity-bounded.

Phase 8 is a bounded long-running collector; do not keep unbounded string tombstones.

Repair by either:

- removing the tombstone set through lifecycle ownership guarantees; or
- making cancellation state Session-owned and bounded/TTL-cleaned with deterministic cleanup.

At minimum prove:

- repeated native decisions do not grow retained Phase-8 state without bound;
- Session disposal removes cancellation state;
- plugin disposal clears it;
- cancelled execution cannot later be collected.

---

## Revalidation

Run the existing Phase-8 validation order.

Before Full:

- expanded `test:p8` covering R2-1 through R2-5;
- P7 focused + P7 real-local benchmark;
- P6/P5/P4/P3/P2/P1/R1-R5;
- typecheck/build/exports/declarations/pack/diff/privacy;
- no provider/network/registry/Git-remote calls;
- Harness mutation = 0;
- no custom Risk Advisor Session event;
- real Phase-8 benchmark smoke/full.

The Phase-8 benchmark should include the repaired product path for at least:

- danger-full-access minimum-scope classification;
- fsmonitor-disabled local Git inspection;
- stale-generation cancellation/replacement proof.

Then:

1. commit the exact executable/source/test/benchmark repair;
2. record the new Tested SHA;
3. run exactly one fresh complete `pnpm test` on that SHA.

After passing Full, only `Execution_Report.md` may change.

Final handoff:

`PHASE8_REPAIR2_PUBLISHED_READY_FOR_REVIEW`

Do not declare `PHASE8_ACCEPTED`.

Do not create `Acceptance_Report.md`.

Do not start Phase 9.
