# Phase 1A Execution Report

## Outcome

`PHASE1A_PUBLISHED_READY_FOR_REVIEW`

This is Codex's implementation and execution record only. Final acceptance remains with ChatGPT Web independent review. No `Acceptance_Report.md` was created, and Phase 1B/1C was not started.

## Baselines and protection

- Plugin repository: `Dhandil/dsh-risk-advisor`, branch `main`.
- Starting plugin `HEAD` / `origin/main`: `39b50d18514988de64997ad3de5569bf5c795c1c`.
- Pinned Harness read-only reference: `ddefc45fbc7f8e46dd73185e68295696d1297887` (`HEAD == origin/master`). No Harness source, index, or worktree file was modified; no Harness fetch, install, build, reset, clean, or checkout was performed.
- The separately observed Harness upstream `4878cdabd87d4041bdaff61d04c966883b9fd07a` remains unvalidated and was not used.
- Existing plugin drift was preserved and not staged: `docs/risk-advisor-current/`, `docs/tasks/T01-approval-ui/T01_Final_Runtime_Gate_Instructions.md`, `.vitest-cache/`, generated `lib/`, `node_modules/`, and `pnpm-lock.yaml`.
- Existing Harness drift was preserved: `build.log`, `install.log`, `t0-model.txt`, `t0-remote.txt`, `t0-session.txt`, `t0-storage.txt`, and `undefined/`.

## Implementation manifest

The implementation commits `a0c543569d251905492319fb7821bb7f3767373f` and `ac36a48727c06f567a1fa8305fc2b627760964cb` contain only the Phase 1A scope:

- `src/host/operation-foundation.ts` — Host-private bounded snapshot, closed read/write shape normalizer, hostile-key-safe detached data properties, public-evidence boundary metadata, SHA-256 comparison hash, TTL/capacity store, retirement, disposal, and sanitized diagnostics.
- `src/host/correlation.ts` — private parent-token witness accessor; existing public `CorrelationDiagnostics` is unchanged.
- `src/index.ts` — one shared private correlation observer for `installCorrelation` and `apply`; `apply` wires the exact returned T02 ID into Foundation capture synchronously and calls native `next()` once, while preserving the independent Ledger observer.
- `tests/p1a-operation-foundation.unit.spec.ts` — bounded input, identity, normalization, privacy, hash, parent, capacity, TTL, retirement, and disposal proof.
- `tests/p1a-runtime.integration.spec.ts` — pinned real `Context + SessionStore + ToolRuntime + ApprovalService` integration with one exact `read` traversal, native approval, sanitized diagnostics, and generation disposal.
- `package.json` — `test:p1a` and inclusion in `pnpm test`.
- The two supplied frozen Phase 1A instruction documents were preserved in this task directory unchanged.

The exact single-mint path is source-wired as:

```text
tools/pre-execute exact exec
  -> ActiveExecutionIndex.observePreExecute(exec) [sole ra-execution UUID mint]
  -> private OperationFoundation.capture(exec, returned ID, exact parent witness)
  -> native next() exactly once
tools/result exact exec
  -> private Foundation.retire(exec)
  -> existing ActiveExecutionIndex.observeResult(exec, result)
```

The public Foundation facade exposes only `get(executionId)` with detached sanitized status, tool kind, reason codes, and independently unknown boundary flags. Raw arguments, requested path/permission, cwd, hash, token, execution object, capture capability, and mutation methods are not exposed.

## Focused proof matrix

| Proof | Result | Evidence |
|---|---|---|
| P1A-01 exact real object and single existing ID | PASS | Real Host integration; Foundation receives the ID returned by the existing index; one observation and one approval request. |
| P1A-02 same-object idempotency and identity separation | PASS | Unit WeakMap idempotency; inherited T02 collision/scope suite remains green. |
| P1A-03 missing Session/callId and no historical reconstruction | PASS | Unit unavailable outcomes; inherited T02 retirement/history and missing-scope tests remain green. |
| P1A-04 closed `read` / `write` shape | PASS | Unit adapters classify only valid exact shapes; write content/justification/requested permission stay private. |
| P1A-05 unknown, invalid, oversized, cyclic, accessor-hostile input | PASS | Unit bounded early-stop/degraded cases; native arguments are not mutated. |
| P1A-06 boundary provenance | PASS | Unit and runtime evidence keep all unproven fields independently `unknown`; session cwd is not public or promoted to workspace truth. |
| P1A-07 complete-input private hash | PASS | Unit stable object-key ordering produces equal private hashes; invalid/unknown input has no hash. |
| P1A-08 cap, settled eviction, all-active refusal, absolute TTL | PASS | Unit injected-clock and bounded-store cases. |
| P1A-09 result retirement and disposal/HMR generation stop | PASS | Unit raw-copy purge and no revival; runtime disposal check. |
| P1A-10 parent identity | PASS | Unit stores only the exact parent witness supplied by the T02 index; existing T02 parent-token coverage remains green. |
| P1A-11 failure containment and native continuation | PASS | Shared observer catches observational Foundation failures and delegates `next()` once; inherited T02/native runtime parity tests remain green. |
| P1A-12 detached frozen privacy facade | PASS | Unit/runtime JSON assertions and frozen diagnostic design. |
| P1A-13 pinned real Host integration | PASS | `p1a-runtime.integration.spec.ts`, real Context/SessionStore/ToolRuntime/ApprovalService, native `allowed-once`, one correlation owner, disposal. |
| P1A-14 inherited regression | PASS | Final `pnpm test`: 66 inherited tests plus 10 Phase 1A tests. |

## Commands and gates

All executable checks below were run on the final executable content; the final full regression ran after the last executable commit.

| Check | Result |
|---|---|
| `pnpm run typecheck` | PASS |
| `pnpm run test:p1a` | PASS — 2 files, 10 tests |
| `pnpm run build` | PASS — Host and Client bundles |
| Host export smoke (`lib/index.js`) | PASS — `apply`, `installCorrelation`, `ActiveExecutionIndex` present |
| `pnpm pack --dry-run` | PASS — package contents limited to package allowlist |
| `git diff --check -- package.json src tests` | PASS |
| Full `git diff --cached --check` | Supplied frozen Markdown files retain their original Markdown hard-break trailing spaces; no implementation/test whitespace errors. The exact supplied documents were not normalized. |
| lint / publint | `NOT_CONFIGURED` — no project scripts or binaries present |
| final `pnpm test` | PASS — T01 9 + T02 16 + T03 17 + T04 21 + T05 3 + P1A 10 = **76 tests** |

The final full regression command was:

```text
pnpm test
  test:r1  9 passed
  test:r2 16 passed
  test:r3 17 passed
  test:r4 21 passed
  test:r5  3 passed
  test:p1a 10 passed
```

The T05 benchmark unit suite ran as the inherited 3-test regression. The separate R5 smoke/full benchmark was not run because Phase 1A did not introduce a justified benchmark-policy change.

## Architecture, privacy, and scope audit

- No UUID or alternate identity is minted in Foundation; only the existing T02 index mints `ra-execution-<UUID>`.
- No `lookup(Session, callId)` or durable Session event is used as a live identity substitute.
- `read` and `write` are name-and-shape-only provisional classifications. Unknown tools, including shell/PTC-style names, remain unknown.
- There is no filesystem, shell, process, network/provider, Browser RPC, LLM/Judge, assessment, approval answerer, or native outcome authority added by Phase 1A.
- Snapshot detachment is early-stop bounded at 16 KiB UTF-8 budget, depth 8, 256 nodes, 64 keys per object, and 8192-character strings; cycles, accessors/proxy failures, unsupported values, and budget breaches degrade without raw retention.
- The store is capped at 512 entries with an absolute five-minute injectable-clock TTL, settled-first eviction, all-active refusal, exact-result raw purge, and generation disposal/no-revival.
- T01 Browser fixture, T02 correlation, T03 replay, T04 ledger, and T05 benchmark/statistics behavior were not rewritten or promoted into Phase 1A product claims. T04 exact cross-plane F-006/F-007/F-013 gates remain open.
- No `docs/baseline/**`, prior task report, Harness Core file, or protected drift was changed.

## Explicit non-runs and limitations

The following remain outside this bounded phase or were not performed: Browser/live runner, provider/model calls, real native PTC producer, disk/process restart, filesystem/sandbox private APIs, new-upstream compatibility, Canonical Full infrastructure, R5 benchmark smoke/full, and any Phase 1B/1C work. The harmless integration fixture is not evidence of a real filesystem producer or cross-plane durable identity.

## SHA handoff

- Tested / final implementation SHA: `ac36a48727c06f567a1fa8305fc2b627760964cb`.
- Report-only publication commit and final remote SHA are verified in the terminal handoff after this report is committed and pushed.
- STOP after publication for ChatGPT Web independent review; Codex does not declare `ACCEPTED`.
