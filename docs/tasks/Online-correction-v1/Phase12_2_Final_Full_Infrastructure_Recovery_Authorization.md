# Risk Advisor Phase 12.2 — Final Full Infrastructure Recovery Authorization

## Status

`RISK_ADVISOR_PHASE12_2_FINAL_FULL_INFRA_RECOVERY_AUTHORIZED`

The previously authorized Final Full did **not** reach the repository test script.

Observed result:

- exact candidate verified: `28d3d204376da0a43279b949a3ceea794212d10c`;
- pinned Harness verified: `ddefc45fbc7f8e46dd73185e68295696d1297887`;
- `pnpm test` invocation exited before test-script execution with
  `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`;
- test files executed: **0**;
- tests executed: **0**;
- exit code: **1**;
- no executable/test/package/config/benchmark change followed;
- no Final Full report or Acceptance Report was committed.

This is classified as **pre-test infrastructure/setup failure**, not a Phase 12.2 test failure and not a consumed completed Full.

Current main remains exactly:

`aefbf2abf978d3591082c0312f9c97c8946e93db`

## Recovery rules

One replacement Final Full is authorized on the same exact executable candidate:

`28d3d204376da0a43279b949a3ceea794212d10c`

Pinned Harness remains:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

Use a **fresh detached verification worktree** for the exact candidate.

Do not copy, symlink, or reuse the original checkout's `node_modules` directory into that worktree.

Prepare the verification worktree independently:

```
pnpm install --frozen-lockfile
```

The global pnpm content-addressed store/cache may be reused normally; the worktree's own `node_modules` must be created by pnpm for that worktree.

Dependency preparation is infrastructure setup and is not the Final Full.

After dependency preparation succeeds, verify again:

- worktree HEAD == exact candidate;
- Harness HEAD == pinned Harness;
- tracked candidate tree is clean;
- no executable/test/package/config/benchmark drift.

Then run exactly one replacement complete:

```
pnpm test
```

## Failure handling

If dependency preparation fails:
- stop;
- do not alter product/test/package/config semantics;
- report the infrastructure failure;
- do not run `pnpm test`.

If the replacement `pnpm test` starts the repository test scripts and then fails:
- that replacement Full is consumed;
- stop;
- do not patch or rerun;
- report exact failure.

If it passes:
- record full test-file/test totals and exit 0;
- return to current main lineage;
- add only one docs-only Final Full report;
- do not create Acceptance Report;
- do not start any follow-on phase.

## Provenance boundary

No executable/test/package/config/benchmark change is authorized.

The original checkout's existing `.vitest-cache/`, `lib/`, and `node_modules/` must remain untouched.
