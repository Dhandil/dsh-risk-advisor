# Phase 10 Execution Report

## Outcome

`PHASE10_PUBLISHED_READY_FOR_REVIEW`

Codex implementation and execution report only. This is not an Acceptance Report and does not declare `PHASE10_ACCEPTED`.

## Identity and governance

- Start/preflight baseline: `a96147bb0444c2468d895e8354f945d97ec461f2`.
- Harness reference: `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Harness Core tracked mutation: `0`.
- Candidate / Tested SHA: `b6e1650bb40a3ba7bdfd0140e23f57e4d827087b`.
- Final report SHA: the final docs-only commit containing this report; verified against `origin/main` and `git ls-remote` after publication.
- Phase 11+: not started.
- Existing untracked user drift was preserved and excluded from the Phase 10 commits (`.vitest-cache/`, historical instruction/design files, `lib/`, `node_modules/`, `pnpm-lock.yaml`).

## H1 — shell and semantic hardening

PASS. Existing `src/host/shell-analysis.ts` remained the single shell-analysis authority. The P10 focused corpus exercised 7 adversarial forms: chaining, dynamic wrapper, command substitution, encoded PowerShell, environment injection, redirection, and destructive chained semantics. It also exercised 4 inert/segment-local role checks and 3 no-execution sentinel inputs. No corpus command was executed.

The inherited P4 parser and runtime suites passed. No second parser, RuleFinding code, or Harness change was added.

## H2 — prompt-injection and privacy hardening

PASS. A runtime-generated synthetic canary was exercised through ReviewerSeed, DirectUserRing, and Fast Judge candidate surfaces. It was not stored as an exact committed literal and did not appear in sanitized outputs. Malformed duplicate-key/extra-field reviewer output was rejected; malformed credential-bearing URLs failed closed. Fast/Deep paths remain advisory-only, bounded, redacted, and provider-free in ordinary validation.

## H3 — retry, semantic, and truthfulness hardening

PASS. The P10 retry matrix proved no correlation across session, target, or unknown-failure boundaries. ExpectedEffect capture remained limited to the frozen local adapters and reused the existing execution identity. Operation hash remains internal; Browser presentation discloses that Evidence was observed before execution and may be stale at execution time.

## H4 — lifecycle, resource, and coexistence hardening

PASS. Focused proof covered verifier timeout ownership, held slots until underlying settlement, bounded pending work, duplicate-key fencing, Evidence disposal, Fast/Deep scheduler disposal, and native ApprovalService coexistence. The real pinned `ApprovalService` remained the sole answerer/outcome authority; the P10 coexistence fixture observed one native answerer call and one native approval event. Inherited P6/P8/P9 lifecycle suites covered replacement, generation fencing, disposal, and late-result behavior.

Native Approval was not answered, reopened, or mutated by Risk Advisor. No `PendingApproval.answer()`, composer replacement, mutation RPC, hidden Judge/Evidence Tool, or custom Risk Advisor Session event was added.

## H5 — benchmark and latency policy

PASS. Benchmark artifact: [`r5-phase10-measurements.json`](evidence/r5-phase10-measurements.json). Policy: [`AdvisoryLatencyPolicy.md`](AdvisoryLatencyPolicy.md).

- Real pinned ApprovalService: 100 baseline and 100 Risk Advisor treatment samples, 5 warmups; treatment P99 `1.282 ms`, MAX `1.706 ms`; paired delta P99 `0.950 ms`, MAX `1.399 ms`.
- Real product-local distributions: 300 samples / 20 warmups for shell analysis, deterministic A1, context builder, Evidence/A3 overlay, Browser presentation, and composed local path.
- Structural local reviewer: 300 samples / 20 warmups for Fast and Deep schema seams.
- External provider latency: `NOT_VALIDATED_EXTERNAL_PROVIDER / NOT_RUN`.
- No production timeout, concurrency, or provider policy was tuned from local fake speed.

## Productization and cold restart

PASS. `package.json` preserves the existing `dsh.client`, adds one `dsh.bundle.patch`, and publishes `cordis.patch.yml` with exactly one `risk-advisor` insertion. `pnpm pack --dry-run --json` showed the manifest, Host/Client bundles, declaration tree, README, and patch; tests/benchmarks were excluded.

The disposable offline install gate activated the package through the pinned Harness CLI without registry/network/provider/Git-remote calls. True cold restart passed with two separate OS child processes booting the same persisted disposable profile sequentially: process A `PASS`, process B `PASS`. The disposable profile was cleaned after each successful run.

## Validation matrix

All pre-Full gates passed in the frozen order, including:

- P10 focused: 8 files / 18 tests.
- P9 focused: 6 files / 20 tests; P9 smoke/full benchmark PASS.
- P8 focused: 5 files / 21 tests; P8 smoke/full benchmark PASS.
- P7 focused: 6 files / 26 tests; P7 smoke/full benchmark PASS.
- P6: 5 files / 27 tests.
- P5: 4 files / 23 tests.
- P4: 2 files / 17 tests.
- P3: 2 files / 17 tests.
- P2: 2 files / 15 tests.
- P1A: 2 files / 13 tests.
- P1B: 2 files / 14 tests.
- P1C: 1 file / 8 tests.
- R1: 2 files / 9 tests; R2: 2 files / 16 tests; R3: 2 files / 17 tests; R4: 2 files / 21 tests; R5: 1 file / 3 tests.
- Typecheck, build, Host export, Client bundle wrapper, declaration/private-export audit, pack, `git diff --check`, scope/privacy/canary, no-provider/no-network/no-registry/no-Git-remote, no custom Session event, and Harness mutation `0`: PASS.
- Final exact-SHA P10 smoke/full and external-bundle/cold gate: PASS.

## Fresh complete Full

Exactly one fresh complete `pnpm test` ran on Tested SHA `b6e1650bb40a3ba7bdfd0140e23f57e4d827087b` after all executable/test/config/package/benchmark/policy content was committed.

Result: PASS — 17 scripted test groups, 54 test files, 285 tests. The Full run produced no tracked semantic drift. After Full, only this `Execution_Report.md` is changed.

## External activity and boundaries

```text
provider calls              0
external network calls      0
registry calls               0
Git remote runtime calls     0
Harness tracked mutations    0
custom RA Session events     0
Risk Advisor approval calls  0
Risk Advisor approval answerers 0
```

The final state is ready for independent ChatGPT Web review. Codex does not perform final acceptance.
