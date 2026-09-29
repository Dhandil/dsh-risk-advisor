# T02 — R2 Live Correlation | Codex Execution Report

**Outcome:** `T02_R2_PUBLISHED_READY_FOR_REVIEW`

This is Codex's implementation and self-test report for independent ChatGPT review. It is not an Acceptance Report and does not declare `ACCEPTED`.

## Repair scope and preflight

- Repair authority: `docs/tasks/T02-live-correlation/T02_Repair_Instructions.md`, independent review `REPAIR` dated 2026-09-29.
- Plugin repair starting SHA: `ee4348c3df21b31a1eebc0366bf9887fb3d59c25`.
- Plugin preflight branch: `main`; `origin/main` and `git ls-remote origin refs/heads/main` both matched the repair starting SHA. No synchronization write was needed.
- Harness read-only SHA: `ddefc45fbc7f8e46dd73185e68295696d1297887`, branch `master`; local HEAD matched `origin/master`.
- Harness was not modified. Existing Harness drift was retained: `build.log`, `install.log`, `t0-model.txt`, `t0-remote.txt`, `t0-session.txt`, `t0-storage.txt`, and `undefined/`.
- Existing plugin drift was retained and not staged: `docs/risk-advisor-current/` and `docs/tasks/T01-approval-ui/T01_Final_Runtime_Gate_Instructions.md`.
- No reset, clean, rebase, force-push, permanent setting change, old seven-Spike command, provider, network, privileged, or browser call was used.

## Changed-file manifest

Implementation commit `7c63c01d3692ebb6ac0366c7287d13bd0e1d44e4` contains only the repair scope:

- `src/host/correlation.ts` — generation-safe opaque ExecutionIds, immutable lookup results and detached fail-closed snapshots.
- `src/index.ts` — Context-provided frozen read-only diagnostic facade; mutable index remains private to native listeners.
- `tests/r2-correlation.unit.spec.ts` — opaque-ID, HMR generation, stale-result, facade snapshot, exact Session identity, and multiple-approval regressions.
- `tests/r2-runtime.integration.spec.ts` — facade/native listener probe, real policy=`never` integration, and real short-circuit negative control.
- `vitest.config.ts` — single React and `use-sync-external-store` test-runtime resolution for the linked Harness browser source.
- `package.json` — test scripts and host/test-only type/runtime dependencies.
- `tsconfig.json` — explicit Node and Harness type roots for the Host entry.
- `docs/tasks/T02-live-correlation/T02_Repair_Instructions.md` — preserved exact task instruction file.

No `src/client/**` or Harness Core file changed.

## F1–F4 repair results

### F1 — generation-safe ExecutionId

`ActiveExecutionIndex` now mints `ra-execution-<randomUUID>` for every newly observed traversal. The per-object WeakMap still makes the same ToolExecution idempotent within a generation; exact Session identity and callId Set membership are unchanged. Tests treat the ID as opaque, assert distinct traversals, create two separate indexes, and prove a late old-generation result cannot retire a new same-Session/same-callId member.

Result: PASS.

### F2 — read-only diagnostics and detached snapshots

The Context value `riskAdvisorCorrelation` is a frozen facade exposing only `lookup` and `snapshotObservations`. It has no runtime `observe*` or `dispose` method. Lookup results, outer snapshots, nested lookup objects, and ambiguity arrays are frozen copies. Contradictory repeated approval IDs preserve the original `recordedLookup` while exposing `lookup: NOT_FOUND/OBSERVATION_UNAVAILABLE` and `conflict: true`, so a later consumer cannot use the record as an unqualified FOUND.

Result: PASS. The real integration also proves the private native listeners continue to capture and close approval observations through the facade boundary.

### F3 — T01 regression path

Vitest now pins React, React DOM, and `use-sync-external-store` to one physical test runtime. Harness browser source remains source-resolved for the R1 Slot test; no accepted T01 product source was rewritten.

Result: PASS — all 9 T01 tests pass: 5 fixture-unit tests and 4 public Slot owner/child integration tests.

### F4 — bounded negative controls

- Real compiled Harness `ApprovalService` with `policy: 'never'`: `approval/asked` commits, `approval/request` answerer is not entered, the native outcome is `rejected`, and RA records only the observation.
- Real short-circuited `tools/pre-execute`: the RA listener is not invoked, the tool body is not run, and a following committed asked event remains `NOT_FOUND/NO_ACTIVE_EXECUTION`; no synthetic execution is created.
- Pure exact-object isolation covers two distinct Session objects with equal textual IDs.
- Pure R2-10 coverage includes two distinct approval IDs for one uniquely active execution.

Result: PASS for the bounded controls. No R3 durable replay, R4 ledger, or R5 latency work was added.

## R2 matrix

| Case | Evidence level | Result |
|---|---|---|
| R2-01 real pre-execute + same-Session asked | pure + actual pinned Host integration | PASS |
| R2-02 distinct callIds | pure component | PASS |
| R2-03 same callId across Sessions | pure component + exact-object negative control | PASS |
| R2-04 same Session/callId collision | pure component | PASS |
| R2-05 exact collision-member retirement | pure component | PASS |
| R2-06 finish then callId reuse | pure component | PASS |
| R2-07 missing callId/scope/orphan/short-circuit | pure + actual negative control | PASS |
| R2-08 in-body approval remains active until result | pure + actual ApprovalService integration | PASS |
| R2-09 parent/nested traversal distinction | pure component | PASS |
| R2-10 duplicate asked, decided pairing, conflicts, simultaneous IDs | pure + actual ApprovalService pairing | PASS |
| R2-11 disposal/HMR generation loss and stale result | pure component | PASS |
| R2-12 native coexistence, policy-never and bypass/short-circuit | pure + actual policy/short-circuit controls | PASS |

## Contract and lifecycle audit

- `tools/pre-execute` registers before delegating and calls native `next()` exactly once; the native decision is returned unchanged.
- `session/event` uses the exact callback Session object and is observational; it does not append, answer, mutate ApprovalOutcome, or consume `approval/request`.
- `tools/result` retires only the exact WeakMap-associated execution; no history fallback exists.
- Disposal deactivates the generation and clears transient state. Retired callbacks cannot revive or remove a new generation.
- Observations are bounded to 256 sanitized records and contain no raw arguments, prompt, secret, network, or filesystem data.
- No Browser route, Host–Browser bridge, risk verdict, provider, LLM, or privileged action was introduced.

## Commands and results

- `pnpm test`: PASS — T01 9/9 and R2 16/16.
- `pnpm run typecheck`: PASS.
- `pnpm run build`: PASS — Host `lib/index.js` and existing Client `lib/client.js` emitted during the check.
- Host export smoke (`apply`, `ActiveExecutionIndex`): PASS.
- `pnpm pack --dry-run --json`: PASS — Host/Client bundles and declarations listed.
- Harness oxlint (`D:\Harness\deepseek-harness\node_modules\.bin\oxlint.cmd src tests`): exit 0; one pre-existing T01 warning remains at `src/client/fixture-store.ts:54` (`unicorn/no-useless-spread`).
- Harness publint: completed with the inherited package warnings that `exports["./src/*"]` matches no packaged files and CJS `./client` is interpreted under package `type: module`.
- Intended implementation diff-check: PASS. The exact supplied Repair Instructions file retains its original trailing whitespace on five Markdown lines; it was not reformatted.
- T01 live deployed Browser: `NOT_RUN`, unchanged and not converted into PASS.
- Canonical Full: `NOT_APPLICABLE` for T02.

## Publication handoff

- Executable Tested SHA: `7c63c01d3692ebb6ac0366c7287d13bd0e1d44e4`.
- Implementation commit: `7c63c01d3692ebb6ac0366c7287d13bd0e1d44e4`.
- The report-only commit is made separately after the executable commit; its exact SHA and the final `origin/main` verification are supplied in the terminal handoff.
- R3–R5: `NOT_RUN`.
- No Acceptance Report was generated. Codex stops at T02 and awaits ChatGPT's independent remote-code review.
