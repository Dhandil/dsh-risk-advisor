# Phase 9 Execution Report — Deep Judge

## Outcome

`PHASE9_PUBLISHED_READY_FOR_REVIEW`

Codex implementation and execution evidence are complete. This is not an acceptance report and does not declare `PHASE9_ACCEPTED`.

## Baselines and dependency recovery

- Plugin start and confirmed remote baseline: `6e4e6a50ac8fc4d6b0413f64bf887cb002191fe1`.
- Implementation/Tested SHA: `9948e416b52544c59c24a35c441874d52df4b906`.
- Recovery Amendment: `820fabd27aa99c5ff79142b9662a89c3479a7637`.
- Frozen Harness reference: `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Original stop condition was `PHASE9_DEPENDENCY_UNAVAILABLE`; the Recovery Amendment authorizes the optional runtime capability plus internal structural adapter.
- `@deepseek-ai/dsh-subagent` was not installed, added, or referenced as a package dependency. No registry install, `file:` dependency, symlink, junction, or lockfile change was made.

The adapter is host-private and uses an erased optional lookup of `ctx.get('subagents', false)`. It validates a structural runtime before use and fails closed for missing, throwing, or malformed capabilities. The adapter requires the exact `spawn` provider surface, `inheritsParentContext === false`, all five required provider capabilities, and a structured result with a disposable run. No direct import from Harness `packages/subagent/**` exists.

## Implemented boundaries

- Deep Judge is disabled by default and requires the frozen trusted-parent-composition opt-in.
- Requests are limited to `spawn`, `maxDepth: 1`, `toolFilter.allow: []`, static persona, bounded output schema, and bounded reviewer input.
- No reviewer tools, subagents, CLI, child process, provider/network call, durable reviewer message, custom Risk Advisor Session event, Approval action, approval reopen, or Native Approval authority change was added.
- Parent binding is exact-session / exact-Agent, WeakRef-backed, TTL 10 minutes, bounded to 128 active bindings per session and 256 globally, and is disposed on session/runtime teardown.
- A dedicated scheduler enforces concurrency 2, pending 8, timeout no greater than 10 seconds, cancellation, disposal, queue fencing, and generation fencing.
- Deep Judge only fills eligible `UNKNOWN` semantic dimensions. Deterministic facts, evidence facts, authorization, necessity, and existing hazards are preserved. Suggestions remain `MODEL_SUGGESTED` / `UNVERIFIED`; the host performs the deterministic A4 merge.
- Payloads are bounded and sanitized; raw operation paths, content, package/branch data, transcripts, tool details, and provider diagnostics are not retained or surfaced.
- Bridge V4 adds `rules | fast | evidence | deep | complete`; the client polls the deep stage and preserves V1/V2/V3 behavior.

## Verification gates

All pre-Full gates passed in the required order:

- Phase 9 focused: 6 files / 15 tests PASS.
- Phase 9 benchmark smoke and full: PASS with local deterministic mock reviewer; no real provider.
- Phase 8 focused and smoke/full benchmark: PASS.
- Phase 7 focused and smoke/full benchmark: PASS.
- P6 / P5 / P4 / P3 / P2: PASS.
- P1A / P1B / P1C and R1 / R2 / R3 / R4 / R5: PASS.
- Typecheck: PASS.
- Build: PASS.
- Host export and client export checks: PASS.
- Declaration/root-export audit: PASS; no packed runtime reference to the unavailable package or Harness subagent source.
- `pnpm pack --dry-run --json`: PASS.
- `git diff --check`: PASS.
- Scope, privacy, no-network, no-custom-session-event, and no-deprecated-reader gates: PASS for Phase 9 changes.
- Harness Core tracked mutation: `0`.

The inherited `snapshotEvents()` references in pre-existing ledger/PTC code were not changed by Phase 9 and are outside the Deep Judge path. The actual local Harness subagent spawn integration remains `NOT_RUN (package unavailable without install)`, as required by the Recovery Amendment. Structural public-seam integration is PASS.

## Fresh complete regression

After all executable/source/test/config/package/benchmark changes were committed at the exact Tested SHA above, exactly one fresh complete `pnpm test` was run.

- Result: PASS.
- Test files: 46.
- Tests: 262.
- No executable, test, config, package, or benchmark semantic changes were made after that Full run.

## Privacy and external-side-effect evidence

- Provider calls: `0`.
- External network / registry / Git remote runtime calls: `0`.
- Harness Core edits or tracked mutations: `0`.
- Custom Risk Advisor Session events: `0`.
- No `Acceptance_Report.md` was created.
- Phase 10 was not started.

## Publication chronology

The executable implementation was committed as `9948e416b52544c59c24a35c441874d52df4b906`, then the fresh complete regression was run on that exact SHA. This report is the only post-Full change and is published as a docs-only commit; the final report commit SHA and `origin/main` SHA are recorded in the publication verification below.

## Publication verification

- `HEAD == origin/main == git ls-remote origin refs/heads/main`: verified after the docs-only report commit.
- Final remote/report SHA: recorded by the publishing command and final remote verification.
