# T03 — R3 Durable PTC Replay | Codex Execution Report

**Outcome:** `T03_R3_PUBLISHED_READY_FOR_REVIEW`

This is Codex's implementation and self-test report for independent ChatGPT
review. It is not an Acceptance Report and does not declare `ACCEPTED`.

## Scope and safety

- Authority read and followed: `T03_Architecture_Freeze.md` and
  `T03_Implementation_Instructions.md`.
- Plugin starting SHA: `697db64bab9dd20821864cca1b6fd830a12cda21`.
- At preflight, local `HEAD`, `origin/main`, and
  `git ls-remote origin refs/heads/main` matched that SHA; no synchronization
  write was needed before implementation.
- Harness read-only reference: `D:\Harness\deepseek-harness`, `master @
  ddefc45fbc7f8e46dd73185e68295696d1297887`; Harness was not modified.
- Harness drift was retained: `build.log`, `install.log`, `t0-model.txt`,
  `t0-remote.txt`, `t0-session.txt`, `t0-storage.txt`, and `undefined/`.
- Existing plugin drift was retained and not staged:
  `docs/risk-advisor-current/` and
  `docs/tasks/T01-approval-ui/T01_Final_Runtime_Gate_Instructions.md`.
- No reset, clean, rebase, force-push, old seven-Spike command, provider,
  privileged, browser, filesystem, or network integration call was used.
- Harness Core and `src/client/**` were not modified. T01/T02 accepted product
  behavior was not changed. R4/R5 were not entered.

## Changed-file manifest

Implementation commit `bb9d41c3a7a145222ec6eff53b0c49c356a4937c` contains:

- `src/host/ptc-replay.ts` — bounded, read-only Host replay projection over an
  exact Session snapshot or source-shaped test snapshot.
- `src/index.ts` — public Host exports for the replay projection and frozen
  limits; existing T02 exports remain unchanged.
- `tests/r3-ptc-replay.unit.spec.ts` — R3-01 through R3-12 bounded structural
  matrix and fail-closed cases.
- `tests/r3-runtime.integration.spec.ts` — real `Context`, `SessionStore`,
  `Session.append`, and `snapshotEvents()` integration.
- `package.json` — R3 test scripts and inclusion in the existing full test
  command.
- The exact frozen T03 Architecture Freeze and Implementation Instructions
  files, preserved as task history and authority.

No T01/T02 source behavior, Browser route, ledger, verdict, provider, LLM,
filesystem, or UI path was added.

## R3 implementation contract

The replay is deliberately a bounded projection, not a live correlation index
and not an `ExecutionId` reconstruction. It reads one exact `Session` object
through `snapshotEvents()`, validates contiguous sequence and turn/step scope,
indexes durable top-level `tool/call` and PTC START/SETTLE evidence, and returns
detached frozen data.

- Parent and root resolution are independent. Top-level parent matches require
  one unique earlier call in the same `(turn, step)`; nested parents require one
  unique earlier PTC START with a consistent root.
- START/SETTLE pairing requires the same scope and full structural tuple
  `(rootCallId, parentCallId, subCallId, name)`. Duplicate or contradictory
  evidence remains `AMBIGUOUS` or `UNRESOLVED`.
- `isError` is exposed only for a unique paired settlement. START_ONLY and
  SETTLE_ONLY are represented without being treated as tool failure.
- The projection retains no raw arguments, content, error detail, prompt, or
  secret. Limits are 10,000 source events, 512 PTC evidence items, and 128
  recorded issues.
- Malformed envelopes, sequence gaps, scope violations, missing roots, root
  contradictions, cycles, duplicate parents, and duplicate pairing evidence
  fail closed without throwing from the projection.

## R3 matrix

| Case | Evidence level | Result |
|---|---|---|
| R3-01 normal root/child | pure bounded fixture | PASS |
| R3-02 sibling occurrences | pure bounded fixture | PASS |
| R3-03 nested parent chain | pure bounded fixture | PASS |
| R3-04 deterministic replay | pure fixture + real Session snapshot | PASS |
| R3-05 equal IDs in different steps | pure bounded fixture | PASS |
| R3-06 duplicate parent evidence | pure bounded fixture | PASS — `AMBIGUOUS` |
| R3-07 duplicate sub-ID/pairing evidence | pure bounded fixture | PASS — fail closed |
| R3-08 missing START/SETTLE/parent evidence | pure bounded fixture | PASS |
| R3-09 root/scope/cycle-invalid evidence | pure bounded fixture | PASS — degraded/unresolved |
| R3-10 sequence, limits, sanitization, immutability | pure bounded fixture | PASS |
| R3-11 structural edges only; no retry/escalation semantics | pure bounded fixture | PASS |
| R3-12 T1/T2 isolation and read-only boundary | pure isolation + full prior regression | PASS |

### Runtime evidence boundary

The integration test creates a real Cordis `Context`, installs the real
`SessionStore`, appends the source-shaped turn/step/tool/PTC events to a real
`Session`, and passes the immutable `snapshotEvents()` result through the
replay. It verifies sequence ownership, parent/root recovery, paired
settlement, sanitized output, and deterministic repeated replay.

`ACTUAL_PTC_PRODUCER=NOT_RUN`: this task did not have a safe disposable
plugin-local configured PTC producer/runtime harness that could be run without
starting a model/provider flow. The integration is therefore explicitly
Session append/snapshot evidence with simulated PTC producer events, not a
claim of live producer execution. The frozen instructions permit this result
when the producer prerequisite is unavailable.

## Commands and results

- `pnpm test`: PASS — T01 9/9, T02 16/16, R3 13/13; 38/38 total.
- `pnpm run test:r3`: PASS — 2 files, 13 tests.
- `pnpm run typecheck`: PASS.
- `pnpm run build`: PASS — Host `lib/index.js`, Client `lib/client.js`, and
  declarations emitted.
- Host export smoke for `apply`, `installCorrelation`,
  `replayPtcSession`, `replayPtcSnapshot`, and `PTC_REPLAY_LIMITS`: PASS.
- `pnpm pack --dry-run --json`: PASS — intended Host/Client bundles,
  declarations, README, and package manifest listed.
- Harness oxlint (`D:\Harness\deepseek-harness\node_modules\.bin\oxlint.cmd
  src tests`): exit 0; only the pre-existing warning at
  `src/client/fixture-store.ts:54` remains.
- Harness publint: completed with inherited package warnings for
  `exports["./src/*"]` matching no packaged files and CJS `./client` being
  interpreted under package `type: module`.
- Implementation source/test diff-check: PASS. The exact supplied frozen
  Architecture Freeze retains its original five Markdown hard-break trailing
  spaces and was not normalized.
- T01 live Browser: `NOT_RUN`, preserved from prior evidence.
- Canonical Full: `NOT_APPLICABLE` for T03.
- R4/R5: `NOT_RUN`.

The T01 fixture-fault tests intentionally print React diagnostic stacks while
their assertions pass; the final regression command exited successfully with
all 38 tests passing.

## Publication handoff

- Executable Tested SHA: `bb9d41c3a7a145222ec6eff53b0c49c356a4937c`.
- Implementation push: normal `git push origin main` completed.
- Immediately after implementation push, local `HEAD`, `origin/main`, and
  `git ls-remote origin refs/heads/main` all matched
  `bb9d41c3a7a145222ec6eff53b0c49c356a4937c`.
- The report-only commit is separate; its exact SHA and the final remote SHA
  are supplied in the terminal handoff after that commit is pushed.

No Acceptance Report was generated. Codex stops at T03 and awaits ChatGPT's
independent review.
