# Phase 2 Execution Report — Execution Ledger + Explicit Failure

## Outcome

`PHASE2_FINAL_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Codex completed the bounded Phase 2 implementation and delivery handoff. Final acceptance remains the responsibility of ChatGPT Web. No Acceptance Report was generated and no acceptance decision was made.

## Repositories and tested state

- Plugin repository: `https://github.com/Dhandil/dsh-risk-advisor`
- Branch: `main`
- Start HEAD / synchronized `origin/main`: `d429bad37be09f6676307c2dd788748004177901` (contains the required instruction commit)
- Historical Phase 2 implementation SHA: `054a0496f41ff1d56ac5fc06b50a7287c4f81dd1`
- Final executable/tested SHA: `a664f321c0d8e7ed9d619a8065c68ca24e2df0fa`
- Report publication: report-only commit created after the final tested SHA; the final remote SHA is recorded by the post-push verification in the handoff.
- Pinned Harness: `D:\Harness\deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`
- Harness mutation count: `0`

The plugin was fetched and synchronized normally before implementation. No reset, clean, rebase, force push, dependency installation, or destructive checkout was used.

## Changed-file manifest

Historical executable Phase 2 implementation commit (`054a0496...`):

- `package.json` — added `test:p2` and included it in the full `test` chain.
- `src/host/explicit-failure.ts` — bounded typed Phase 2 terminal, explicit-failure, approval, shell DTO, guard-witness, and PTC projections.
- `src/host/ledger.ts` — evolved the existing T04 Ledger in place; added `phase2()` diagnostics, structured `error.info` identity extraction, and live shell evidence capture.
- `src/index.ts` — initially exported the Phase 2 Host types and pure projections.
- `tests/p2-explicit-failure.unit.spec.ts` — focused classifier, conflict, lifecycle, PTC, privacy, and bounds evidence.
- `tests/p2-runtime.integration.spec.ts` — real pinned `Context + SessionStore + ToolRuntime + ApprovalService` noninterference probe.

Final public-surface repair executable commit (`a664f321...`):

- `src/index.ts` — removed all seven authority-bearing pure projector exports from the package root while retaining required DTO types and unrelated services.
- `tests/p2-explicit-failure.unit.spec.ts` — moved projector coverage to the internal module and added the complete root-export absence proof.

Report-only publication file:

- `docs/tasks/Phase2-execution-ledger-explicit-failure/Execution_Report.md`

No Client source, Phase 1 UI/bridge behavior, Harness Core, baseline contract, or unrelated task file was changed.

## Implemented Phase 2 contract

- Reused one existing T04 `LedgerController`, one exact live `ToolExecution` weak identity map, existing durable source fold, existing T03 PTC projector, and existing bounded caps.
- Added detached/frozen `phase2(session)` diagnostics with `TerminalStatus`, `ExecutionTerminalFact`, `ExplicitFailureFact`, and `Phase2ExecutionOutcome`.
- Kept `semanticSuccess` fixed to `unknown`; generic ToolRuntime success does not fabricate process success.
- Kept Live and Durable facts separate. No second ExecutionId mint path and no cross-plane join by callId, time, tool name, or apparent uniqueness.
- Added structured terminal classifiers for generic tool error, `TOOL_TIMEOUT`, `ABORTED_BEFORE_DISPATCH`, `ABORTED`, and `SANDBOX_UNAVAILABLE`.
- Added effective-witness-gated pre-execute denial projection. The installed Risk Advisor observer delegates exactly once and returns the decision unchanged; its local waterfall result is not promoted as a global decision.
- Added a conservative guard-returned-denial helper. A complete public witness is required; the general installed path does not guess from missing `tools/execute`, reason text, or listener ordering.
- Added strict pinned bash/pwsh foreground DTO projection. It consumes only `kind`, numeric/null `exitCode`, and bounded sandbox booleans/enums. A structured `sandbox.denied` produces `SANDBOX_DENIED`; a structured runner failure or `SANDBOX_UNAVAILABLE` code remains distinct.
- Added independent approval failure projections for rejected, cancelled, and unavailable outcomes. Native Approval is neither registered, answered, delayed, nor overridden.
- Added bounded PTC child outcome projection through the accepted `replayPtcSnapshot()` projector; no second top-level result or live identity is minted.

## Failure-category evidence

| Category | Evidence result |
| --- | --- |
| Generic exact ToolRuntime error | `TOOL_ERROR / AUTHORITATIVE` from exact final `tools/result.isError=true` |
| `TOOL_TIMEOUT` | `TIMEOUT / AUTHORITATIVE`, only from structured `error.info.code` |
| `ABORTED_BEFORE_DISPATCH` | `CANCELLED_BEFORE_DISPATCH / AUTHORITATIVE` |
| `ABORTED` | `CANCELLED_AFTER_DISPATCH / AUTHORITATIVE` |
| Effective pre-execute deny | `PRE_EXECUTE_DENIED` only when an explicit effective witness is supplied; otherwise not promoted |
| Pre-execute cancel | `CANCELLED_BEFORE_DISPATCH`, never policy denial |
| Guard returned denial | General runtime path `UNKNOWN/PARTIAL`; helper requires the complete frozen witness |
| Guard throw | Remains generic `TOOL_ERROR`; never relabeled `GUARDRAIL_DENIED` |
| Sandbox denial | `SANDBOX_DENIED / AUTHORITATIVE` only from structured foreground `sandbox.denied=true`; no stderr heuristic |
| Sandbox unavailable | `SANDBOX_UNAVAILABLE / AUTHORITATIVE`, distinct from denial |
| Approval rejected/cancelled/unavailable | Independent `DETERMINISTIC` approval facts; no execution cause invented for unbound/ambiguous binding |
| Terminal/source conflict | `UNKNOWN` terminal and `UNKNOWN` failure evidence; no winner selected |
| PTC child settled error | Bounded `TOOL_ERROR / DETERMINISTIC` nested under the accepted replay projection |

The shell adapter does not retain or inspect stdout, stderr, spill paths, command, workdir, or textual exception details. No failure category depends on stderr or reason-string heuristics.

## Reconciliation and inherited open gates

- F-006 exact Live↔Durable positive confirmation: `PARTIAL`; equal callId remains two facts.
- F-013 exact replay/live positive witness: `PARTIAL`; no unproven overlap merge.
- True disk/process restart: `NOT_RUN`.
- Real native PTC producer: `NOT_RUN`; only source-backed replay evidence was exercised.
- Deployed Browser/profile: `NOT_RUN`.
- WebWorker: `NOT_VALIDATED / NOT_SUPPORTED_BY_PHASE1C`.
- Newer Harness/V4: `NOT_VALIDATED`.
- T05 production Assessment latency/budget fields: unchanged / `UNDETERMINED`.

## Tests and quality gates

Final focused Phase 2:

- `pnpm run test:p2`: 2 files, 15 tests passed.
- Includes P2-01 through P2-23 coverage through parameterized/component evidence, including exact error.info extraction, pre-execute delegation, guard conservatism, shell/sandbox DTO privacy, approval independence, conflict/idempotence, Live/Durable separation, PTC nesting, dispose isolation, bounds, and frozen DTOs.
- Real Host integration uses pinned `Context`, `SessionStore`, `ToolRuntime`, and `ApprovalService`; the tool is local and deterministic, and Native Approval policy remains unchanged.

Inherited direct gates passed during implementation:

- `test:r3`: 17 passed.
- `test:r4`: 21 passed.
- `test:p1a`: 13 passed.
- `test:p1b`: 14 passed.
- `test:p1c`: 8 passed.
- `pnpm run typecheck`: passed.

Final fresh complete regression, run exactly once on the final executable SHA above:

- `pnpm test`: 16 test files, 116 tests passed on `a664f321c0d8e7ed9d619a8065c68ca24e2df0fa`.
- R1: 9; R2: 16; R3: 17; R4: 21; R5: 3; P1A: 13; P1B: 14; P1C: 8; P2: 15.
- The expected R1 fixture-fault console output occurred inside passing fault-containment tests.

Additional gates:

- `pnpm run build`: passed.
- Host export smoke from built `lib/index.js`: required product exports remained present; all seven authority-bearing projector names were absent.
- Declaration audit: all seven authority-bearing projector names were absent from the generated package declarations.
- Client export smoke: passed; Phase 1C Client loader registration remained intact.
- `pnpm pack --dry-run --json`: passed; package manifest included Phase 2 Host declarations.
- `git diff --check`: passed.
- Privacy scan/focused assertions: passed; no raw args, command/code, stdout/stderr, spill path, reason/justification, prompt/message, Session/event, ToolExecution/token/Agent, raw exception detail, or secret was exported by the Phase 2 DTOs.
- `lint` / `publint`: `NOT_CONFIGURED`; no dependency was added to manufacture a gate.

Build output temporarily used the existing untracked `lib/` directory for the required gate and was then restored byte-for-byte. Existing untracked `lib/`, `node_modules/`, `pnpm-lock.yaml`, `.vitest-cache/`, and documentation drift remains uncommitted and preserved.

## Side effects and scope

- Provider/model calls: `0`.
- Arbitrary network/product calls: `0`.
- Deployed Browser/profile calls: `0`.
- Native Approval authority changes: `0`.
- Harness Core mutations: `0`.
- No persistent plugin audit database was added.
- No Phase 3 retry/root-cause/permission-escalation behavior was implemented. Rule Engine, Judge, Provider, Browser bridge redesign, product card, and semantic verification remain out of scope.

## Drift and final publication verification

Protected plugin drift remains untracked, including `docs/risk-advisor-current/`, prior repair instructions, `.vitest-cache/`, `lib/`, `node_modules/`, and `pnpm-lock.yaml`. Harness drift remains untracked, including its existing logs and `undefined/` directory. No drift was reset, cleaned, overwritten, or staged.

The final publication verification must show:

```text
HEAD == origin/main == git ls-remote origin refs/heads/main
```

The exact final values are recorded in the completion handoff after push. This report is an implementation handoff for independent ChatGPT Web review, not an acceptance record.

## Final Repair — F1–F3

### Repair state

- Repair starting SHA: `e4eba51c38fa89481f1b8eed83714a45c357e5bd`.
- Reviewed executable SHA repaired: `054a0496f41ff1d56ac5fc06b50a7287c4f81dd1`.
- New executable/tested SHA: `67e4890429a72ec55da4dc21f766e7457ff6fd67`.
- Repair scope: F1 shell evidence conflict handling, F2 package-root authority boundary, and F3 sandbox enum validation only.
- Repair handoff: `PHASE2_REPAIR_PUBLISHED_READY_FOR_REVIEW`.

### F1 — shell evidence fail-closed

Root cause: the previous live record retained one mutable shell DTO and overwrote it on each successful bash/pwsh result, while terminal deduplication only compared `isError` and sanitized error identity. A later `exitCode`, sandbox denial, or terminal observation could therefore become last-writer-wins.

Fix: the live record now retains the first bounded shell DTO, compares later observations semantically, treats exact duplicates as idempotent, and marks `SHELL_EVIDENCE_CONFLICT` on any difference without replacing the first fact. A shell evidence conflict suppresses shell-specific failures and yields `processSuccess='unknown'`. Any terminal-claim conflict also suppresses shell/process certainty and yields `processSuccess='unknown'`. The existing bounded issue and health projection exposes the degradation.

Focused F1 proof covers repeated identical success, both exit-code orders, both sandbox-denial orders, and successful shell evidence followed by a conflicting ToolRuntime error. No shell conflict is converted into semantic failure or `SANDBOX_DENIED` certainty.

### F2 — authority witness package boundary

Root cause: `projectPreExecuteDecision` and `projectGuardReturnedDenial` were package-root exports whose ordinary arguments could self-certify an effective/deterministic witness.

Fix: both authority-bearing helpers remain internal to `src/host/explicit-failure.ts` for conservative component tests but were removed from `src/index.ts` exports. The supported product seam remains only the frozen, read-only `riskAdvisorLedger.phase2(session)` diagnostics. Host export smoke now asserts that the two helpers are absent while required Phase2 exports remain present.

### F3 — sandbox enum closure

Root cause: the adapter copied arbitrary `sandbox.mode` and `sandbox.enforcement` strings.

Fix: the adapter now accepts only pinned producer vocabularies: modes `read-only | workspace-write | danger-full-access`, and enforcement `full | partial`. Unexpected, oversized, or malformed values fail closed and are not copied. Output, stderr, spill paths, command, workdir and other raw fields remain ignored.

### Repair evidence and gates

- Phase2 focused repair suite: 2 files, 15 tests passed.
- Directly affected R4 suite: 2 files, 21 tests passed.
- `pnpm run typecheck`: passed.
- `pnpm run build`: passed.
- Host export smoke: required exports present; authority-bearing helpers absent.
- Client export smoke: passed; Phase 1C Client loader remained intact.
- `pnpm pack --dry-run --json`: passed.
- `git diff --check`, scope audit, root export scan, enum scan, and privacy/secret checks: passed.
- Fresh complete regression run exactly once on `67e4890429a72ec55da4dc21f766e7457ff6fd67`: 16 test files, 116 tests passed.
- The inherited R1 fixture-fault console output remained expected inside passing fault-containment tests.

F-006/F-013 remain `PARTIAL`; real native PTC producer and true disk/process restart remain `NOT_RUN`; Browser/profile, WebWorker, and newer Harness gates remain unchanged. Harness Core mutation remains zero. No provider/model/browser product calls were made. No Phase 3 or later behavior was implemented, and no Native Approval authority was changed.

The final report-only publication SHA and the post-push equality `HEAD == origin/main == git ls-remote origin refs/heads/main` are recorded in the completion handoff after publication.

## Final Public-Surface Repair

### Repair state

- Final repair starting SHA: `d429bad37be09f6676307c2dd788748004177901`.
- Previous repair executable SHA retained as historical evidence: `67e4890429a72ec55da4dc21f766e7457ff6fd67`.
- Final executable/tested SHA: `a664f321c0d8e7ed9d619a8065c68ca24e2df0fa`.
- Scope: final Phase 2 public-surface closure and Execution Report consistency only.
- Handoff: `PHASE2_FINAL_REPAIR_PUBLISHED_READY_FOR_REVIEW`.

### Public-surface closure

The package root no longer exports any of the seven authority-bearing pure projectors: `projectPreExecuteDecision`, `projectGuardReturnedDenial`, `projectApprovalOutcome`, `projectPtcProjection`, `projectShellResult`, `projectTerminalClaim`, and `projectTerminalClaims`. They remain internal implementation helpers only where focused component coverage requires direct testing. The supported public seam remains the frozen read-only `riskAdvisorLedger.phase2(session)` diagnostics. Built Host exports and generated declarations agree, while required product exports and the Phase 1C Client loader remain present.

### Final evidence and consistency

- Final focused Phase 2 suite: 2 files, 15 tests passed.
- Directly affected R4 suite: 2 files, 21 tests passed.
- `pnpm run typecheck`, build, Host export smoke, declaration audit, Client export smoke, `pnpm pack --dry-run --json`, `git diff --check`, scope audit, and privacy/secret checks: passed.
- One fresh complete `pnpm test` run on `a664f321c0d8e7ed9d619a8065c68ca24e2df0fa`: 16 files, 116 tests passed.
- F1 shell conflict handling and F3 sandbox enum closure remain unchanged from the previously repaired implementation and their passing evidence is retained above.
- The tested SHA `a664f321c0d8e7ed9d619a8065c68ca24e2df0fa` differs from the final remote only by the report-only `Execution_Report.md` publication.
- Harness Core remains fixed at `ddefc45fbc7f8e46dd73185e68295696d1297887` with zero mutations. No Phase 3 behavior, Native Approval authority, or unrelated product scope was entered.
- The final remote SHA and the post-push equality `HEAD == origin/main == git ls-remote origin refs/heads/main` are recorded in the completion handoff after this report-only publication.
