# Phase 7 Execution Report — Known Postcondition Verification

## Outcome

`PHASE7_REPAIR3_PUBLISHED_READY_FOR_REVIEW`

This report records implementation and execution evidence only. Final acceptance is reserved for independent ChatGPT review. No `Acceptance_Report.md` was created and Phase 8 was not started.

## Frozen baseline and scope

- Repair 2 start and required remote baseline: `551335ee299ab7e979ee3695bbf8b305907db47e`.
- Repair 3 start and required remote baseline: `a06589804d8e36c21a0a913ebccd4c8fd38f1ea2`.
- Earlier Phase 7 implementation baseline: `37b450d4a057216e7d6150a8d370992e1348f60c` (retained as chronology).
- Phase 7 Preflight: `cf5fb20d868c5145c983764108dd57de3a9999ec`.
- Phase 7 Architecture Freeze: `fc0ed814e5f06e720f56a62eba19ce55100f6dd2`.
- Phase 7 Implementation Instructions: `37b450d4a057216e7d6150a8d370992e1348f60c`.
- Harness reference: `deepseek-ai/deepseek-harness` at `ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Harness tracked diff: `0`; the existing Harness untracked artifacts were preserved and not modified.
- No Harness Core, Native Approval, Browser contract, Phase 4 semantics, Phase 5 risk/Judge semantics, Phase 6 behavior, Phase 8 facts, or Phase 9 behavior were changed.

## Implementation / Tested SHA

Repair 3 executable implementation and tests were committed as:

`366305d342e3cae197cc19df8de5c434a163b82b`

Repair 3 start SHA: `a06589804d8e36c21a0a913ebccd4c8fd38f1ea2`.

The preceding Repair 2 executable SHA `7766d1f8dae770f01357d5e3279638f80919b80f` and Repair 1 executable SHA `cacda91fafa0acc827e3aa7192c307390c140a0c` remain preserved as history.

The post-commit working tree contained only pre-existing protected untracked drift (`.vitest-cache/`, historical/current docs, `lib/`, `node_modules/`, and `pnpm-lock.yaml`). No intended executable, test, config, package, or benchmark drift remained.

Implemented bounded surface:

- `src/host/expected-effect.ts`: execution-scoped `ExpectedEffect` capture with the existing ExecutionId, strict own-data-property/plain-object checks, and six bounded adapters: `tool.write.v1`, `tool.edit.v1`, `shell.mkdir.v1`, `shell.copy-file.v1`, `git.branch-switch.v1`, and `package.node-resolve.v1`.
- `src/host/shell-analysis.ts`: package-private shared shell-analysis authority used by Phase 4 and Phase 7. The Phase 4 parser/evaluation output remains equivalent under the P4 focused and runtime suites.
- `src/host/postcondition-verifier.ts`: direct write/edit checks and fixed product-owned shell checkers through public `ctx.shell.resolve/run`; no approval path, generic filesystem evidence collection, or raw command interpolation.
- `src/host/verification-store.ts`: sanitized `VerificationRecordV1` and bounded process-local store with per-session/global limits and TTL.
- `src/host/verification-scheduler.ts`: asynchronous bounded scheduler with timeout `5000ms`, concurrency `2`, pending limit `8`, stdout bound `4096B`, retry `0`, cancellation, generation fencing, and quiescent disposal.
- `src/host/retry-escalation.ts` and `src/host/explicit-failure.ts`: base outcome plus verification overlay, deterministic `SEMANTIC_FAILURE`, and future-retry-only causal fencing. Late verification cannot create a retroactive retry edge.
- `src/index.ts`: lifecycle capture/verification wiring with disposal and shell capability detach handling; no custom Risk Advisor Session event or deprecated Session reader.
- `tests/p7-*.spec.ts`: focused executable proof for capture, adapters, privacy, policy/world bounds, scheduler, failure chain, ToolRuntime integration, and lifecycle.
- `benchmarks/r5-phase7.mjs` and `tests/r5-phase7-benchmark-*.spec.ts`: bounded local verifier benchmark only.

No raw args, content, path, package, branch, stdout, or stderr are retained in the store or public record. The public root export exposes only sanitized verification types/diagnostics; private adapter/parser/scheduler types are not root exports and do not contaminate the client bundle.

## Required verification sequence

All gates passed in the required order.

| Gate | Result |
|---|---:|
| Phase 7 focused (`test:p7`) | 6 files, 26 tests PASS |
| Phase 4 parser-equivalence / regression (`test:p4`) | 2 files, 17 tests PASS |
| Phase 3 (`test:p3`) | 2 files, 17 tests PASS |
| Phase 2 (`test:p2`) | 2 files, 15 tests PASS |
| Phase 6 (`test:p6`) | 5 files, 27 tests PASS |
| Phase 5 (`test:p5`) | 4 files, 23 tests PASS |
| Phase 1A (`test:p1a`) | 2 files, 13 tests PASS |
| Phase 1B (`test:p1b`) | 2 files, 14 tests PASS |
| Phase 1C (`test:p1c`) | 1 file, 8 tests PASS |
| R1 (`test:r1`) | 2 files, 9 tests PASS |
| R2 (`test:r2`) | 2 files, 16 tests PASS |
| R3 (`test:r3`) | 2 files, 17 tests PASS |
| R4 (`test:r4`) | 2 files, 21 tests PASS |
| `pnpm typecheck` | PASS |
| `pnpm run build` | PASS |
| Host export smoke | PASS (`apply` / `inject`) |
| Client export smoke | PASS (Browser module-loader wrapper) |
| Root declaration/private export audit | PASS |
| `pnpm pack --dry-run --json` | PASS |
| `git diff --check` | PASS |
| Scope/privacy/secret/no-network/no-custom-session-event/deprecated-reader audit | PASS |
| Harness tracked mutation audit | PASS, tracked diff `0` |
| Phase 7 local verifier benchmark smoke | 1 file, 1 test PASS |
| Phase 7 local verifier benchmark full | 1 file, 1 test PASS |

The verifier benchmark is explicitly `R5_PHASE7_REAL_LOCAL_VERIFIER`. It used disposable local filesystem fixtures, a local Git repository with no remote, a local resolvable package, and actual product checker execution. Provider, registry, external network, and external Git remote calls were not made. Fixture command strings are test evidence only, not external calls.

## Final Repair 2 — remaining F3/F6 blockers

Repair 2 was limited to the frozen Phase 7 scope and preserved all previously passing Repair 1 behavior.

- F1/F2 preserved: ExpectedEffect lifecycle remains atomic and bounded; scheduler timeout, capability detach, policy replacement, and disposal remain quiescent and joined.
- F3 operand fidelity: the shared dialect-aware parser now rejects Bash `$VAR`/tilde, PowerShell variable expansion and ambiguous doubled-quote/path forms; static quoted literals remain capturable. Git capture accepts only the frozen checkout/direct + `-b` and switch/direct + `-c` grammar, and rejects option-looking or invalid branch names.
- F3 stdout fidelity: Git exit-0 output is accepted only as the exact branch name with at most one terminal newline. Spaces, multiline/polluted output, malformed names, and invalid branch grammar produce `UNKNOWN`; no broad `.trim()` path is used for Git.
- F3 lifecycle proof: a single Session's 129th ExpectedEffect evicts the oldest and leaves exactly 128 active entries; the expanded test also proves another Session is not evicted.
- F3 policy-generation proof: replacement under an active verifier load aborts and drains the old generation before new policy use; stale old results remain fenced and the new policy is the only policy invoked after replacement.
- F4 copy proof: the focused suite executes the product-owned `COPY_CHECKER` source against equal, unequal, absent, EACCES, EPERM, race, access, missing, symlink, directory, special, exact-1MiB, and over-1MiB classifications. Only coherent bounded regular-file equality/difference or confirmed destination absence is hard; all access/provider/read/race and unsupported cases are `UNKNOWN`.
- F5 preserved: retry evidence selected at B capture remains an immutable sanitized snapshot; later A verification conflict can affect future captures but cannot erase B's captured `retryOf` or failure context.
- F6 expanded proof: P7 focused evidence is now 6 files / 26 tests, including the direct approval/A3/Browser/custom-Session-event/deprecated-reader non-interference gate. The real local benchmark executes direct write/edit, actual mkdir, small copy, actual near-1MiB copy, local Git, positive local Node resolution, real frozen timeout, and saturation.

## Final Repair 3

Repair 3 closed the single remaining final-review F3 blocker without redesigning Phase 7:

- The existing conservative `isValidBranchName()` predicate now rejects ASCII DEL `U+007F` in the same shared predicate; no second parser or broader Git grammar was introduced.
- Direct expected-effect proof uses `const delBranch = \`foo\\u007fbar\`` and confirms the `git.branch-switch.v1` effect is not captured.
- Direct verifier proof supplies exit-0 stdout containing `\u007f` and confirms the result is `UNKNOWN`, never `MATCHED` or `MISMATCHED`.
- The normal `main` capture/output path, all four frozen Git forms, existing invalid-branch matrix, and P4 parser/rule equivalence remain green.
- Repair 3 focused P7 remained 6 files / 26 tests PASS; inherited, static, export, declaration, package, privacy, no-network, no-custom-session-event, Harness mutation, and real-local benchmark gates all passed.

## Fresh complete regression

After Repair 3 executable commit `366305d342e3cae197cc19df8de5c434a163b82b`, exactly one fresh complete `pnpm test` was run at that exact SHA. It passed:

- 35 test files PASS.
- 226 tests PASS.
- Included R1–R5, P1A–P1C, P2–P7 in the package full-test chain.
- No executable/test/config/package/benchmark semantic drift occurred after the Full run.

The historical `25c9326f0c8863cd994698e220edbeaba7bed804` / 216-test Full, Repair 1 `34`-file / `223`-test Full, and Repair 2 `35`-file / `226`-test Full remain chronology only; the Repair 3 evidence and Tested SHA are the values above.

## Boundary and privacy evidence

- Provider calls: `0`.
- Provider, external network, registry, and Git remote calls from implementation/tests/benchmark: `0` (Git remote was used only for the required governance sync/push/equality check).
- Harness Core mutations: `0` tracked changes.
- Custom Risk Advisor Session events: `0`.
- Deprecated Session readers: `0`.
- Hidden verifier Tool registration: `0`.
- Native Approval authority remains unchanged; verifier does not call approval APIs or reopen approval.
- Browser UI, `argsRaw` risk derivation, mutation RPCs, A3, Phase 8 Evidence Collector, and Phase 9 Deep Judge remain out of scope.
- Same-or-narrower verifier sandbox and world checks are enforced; unsupported or ambiguous shell contexts fail closed to `unknown`.
- Existing open/partial/not-run/not-validated evidence was not upgraded. In particular, real-provider latency/policy remains undetermined, true cold restart remains not run, native PTC remains not run, live browser remains not run, WebWorker remains not validated, and Phase 8/9 remain not implemented.

### Repair 2 bounded local benchmark evidence

| Path | Evidence |
|---|---|
| direct write/edit | Actual Tool Contract result paths; no post-read |
| mkdir | Actual disposable directory; product checker executed once; `MATCHED` |
| small copy | Actual bounded regular files; product checker executed once; `MATCHED` |
| near-1MiB copy | Actual `1,048,575`-byte files; product checker executed once; `MATCHED` |
| Git | Disposable local repository, no remote; exact branch output; `MATCHED` |
| Node resolution | Disposable local `node_modules/benchmark-local`; positive `require.resolve`; `MATCHED` |
| timeout | Real frozen timeout elapsed at least `5000ms`; published `VERIFIER_TIMEOUT`; active slot remained `1` until settle |
| saturation | Ten real scheduler jobs completed under max concurrency `2`; queue saturation remained at pending limit `8` |

The focused product-checker matrix additionally proves the exact `1 MiB` boundary and `>1 MiB` fail-closed classification. The benchmark creates and removes only a disposable OS temp directory.

## Publication

The report is the only post-Full change. The docs-only publication commit is pushed to `origin/main`; final remote equality is verified with:

```text
HEAD == origin/main == git ls-remote origin refs/heads/main
```

The final remote/report SHA is the docs-only publication commit containing this report. The diff from Tested SHA `366305d342e3cae197cc19df8de5c434a163b82b` to that publication SHA is docs/evidence only. No `Acceptance_Report.md` was created and no accepted baseline was advanced.
