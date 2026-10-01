# Risk Advisor Phase 4 — Rule Engine Execution Report

## Handoff

`PHASE4_FINAL_REPAIR_PUBLISHED_READY_FOR_REVIEW`

This is a Codex implementation handoff. Final acceptance remains with ChatGPT Web. No Acceptance Report was generated and Phase 4 was not self-declared accepted.

## Baseline, scope and repository state

- Repository: `Dhandil/dsh-risk-advisor`, branch `main`.
- Original Phase-4 implementation start SHA: `daed3eca6bff9352c41d15ad296ff69732be23e6`.
- Repair start SHA: `0cb216dd163eb93e9e9f783d01e71d4c43938d30`; confirmed as the requested `origin/main` baseline before repair.
- Final scanner repair start SHA: `78ce18b5991094db48b89bb52097ee39c95d52cd`; confirmed as the requested `origin/main` baseline before F5–F6 repair.
- Preflight publication checkpoint: `4e87d52663460d441955125974cc93422328c76c`.
- Architecture Freeze checkpoint: `55566056952454286c00133ab891f173e24137ab`.
- Implementation Instructions checkpoint/start: `daed3eca6bff9352c41d15ad296ff69732be23e6`.
- Repair Instructions publication: `0cb216dd163eb93e9e9f783d01e71d4c43938d30`.
- Accepted pre-Phase-4 product baseline: `d7fe111d9dee35073a3e11d0ad456c1030593803`.
- Pinned Harness: `deepseek-ai/deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`.
- Harness remained strictly read-only. Its final `HEAD` stayed at `ddefc45fbc7f8e46dd73185e68295696d1297887`; only pre-existing untracked Harness artifacts were present.
- Plugin user drift was preserved: `.vitest-cache/`, `docs/risk-advisor-current/`, the existing Phase-1 repair instructions, the existing T01 runtime-gate instructions, `lib/`, `node_modules/`, and `pnpm-lock.yaml` remained untracked and untouched.
- No reset, clean, rebase, force push, `pnpm install`, Harness modification, Browser change, Native Approval change, or Phase-5+ implementation was performed.

## Bounded implementation manifest

The executable candidate contains only the following Phase-4 changes:

- `src/host/rule-engine.ts`: generation-local exact-ExecutionId Rule Engine, bounded closed adapters, pure shell scanner, frozen rule matrix, sanitized DTO, TTL/capacity/dispose lifecycle.
- `src/index.ts`: existing capture-hook ordering extended as `Foundation → Phase 3 → Rule Engine`; read-only `riskAdvisorRules.get(executionId)` Context seam and Phase-4 public types.
- `tests/p4-rule-engine.unit.spec.ts`: focused adapter, rule, privacy, lifecycle and bounded-performance coverage.
- `tests/p4-runtime.integration.spec.ts`: genuine pinned Context + ToolRuntime integration, exact existing ExecutionId reuse, harmless execution, unknown-tool behavior and disposal proof.
- `package.json`: `test:p4` and inclusion in the full `test` chain.

No raw operation snapshot store, second ExecutionId owner, listener authority path, dependency, Browser route, provider/model call, or external parser was added.

## Phase-4 behavior implemented

### Closed adapters

The implementation accepts only `read`, `write`, `edit`, `bash`, `pwsh`, `web_fetch`, and `web_search`. Bash and pwsh accept both the persistent `{ command }` shape and the one-shot shape with required `description` and bounded optional fields. Unknown tools and malformed/accessor/hostile/over-budget arguments fail closed.

### Shell boundary

The scanner is synchronous and local. It recognizes top-level `;`, `&&`, `||`, `|`, `&`, and newline separators outside inert quotes, evaluates every safely segmented command, preserves independently proven later-segment facts, and does not treat quoted inert data as executable. Unbalanced quotes/escapes, redirection with unclassified effect, substitutions/backticks, dynamic interpreters, encoded execution, and sensitive environment injection degrade or produce the frozen ambiguity/dynamic findings. No shell, child process, filesystem, network, or model parser is invoked.

### Exact `phase4-v1` finding matrix

The frozen code/severity/category/hardness matrix is implemented with static sanitized summaries, `id === code`, `hard === true`, and per-evaluation deduplication:

```text
UNKNOWN_TOOL
SHELL_SEMANTICS_AMBIGUOUS
SHELL_DYNAMIC_EXECUTION
SHELL_ENCODED_EXECUTION
SHELL_ENVIRONMENT_INJECTION
DESTRUCTIVE_RECURSIVE_DELETE
DESTRUCTIVE_DISK_WIPE
DESTRUCTIVE_GIT_RESET_HARD
DESTRUCTIVE_GIT_CLEAN
DESTRUCTIVE_FORCE_PUSH
SYSTEM_LOCATION_MUTATION
SYSTEM_REGISTRY_MUTATION
SYSTEM_SERVICE_MUTATION
PERMISSION_DANGER_FULL_ACCESS
PERMISSION_PRIVILEGE_ELEVATION
PERMISSION_ACCESS_CONTROL_MUTATION
PERMISSION_ESCALATION_RETRY
CREDENTIAL_SECRET_MATERIAL_PRESENT
CREDENTIAL_RESOURCE_ACCESS
NETWORK_EXTERNAL_READ
NETWORK_EXTERNAL_WRITE
INSTALL_PACKAGE_MUTATION
INSTALL_GLOBAL_SCOPE
REVERSIBILITY_EVIDENCE_UNAVAILABLE
```

The implementation distinguishes network reads from external writes, recognizes closed destructive/system/permission/install forms, and maps only proven Phase-3 `permissionEscalation === true` to `PERMISSION_ESCALATION_RETRY`. Repeated failure alone does not create a risk finding.

### DTO, evidence gaps and lifecycle

`RuleEvaluation` is detached and deeply frozen. It exposes only fixed enums, booleans, bounded numeric/tri-state failure context, static findings and reason codes. `workspaceContained`, `sandboxCovered`, and `reversible` remain `unknown` for every Phase-4 evaluation. Destructive/system/remote-write facts add one `REVERSIBILITY_EVIDENCE_UNAVAILABLE` concern; no positive reversibility claim is made.

The store is generation-local, keyed by the existing Phase-1 ExecutionId, bounded to 512 evaluations, and uses an absolute five-minute TTL with an injectable monotonic clock. Query does not refresh TTL. Expiration, capacity exhaustion, `NOT_FOUND`, and post-dispose state are explicit lifecycle statuses. Dispose clears state and makes late observations inert.

Phase 3 is queried after its existing capture using the same exact ExecutionId. Only retry, counts, tri-state root-cause/escalation values, and degraded relation status are projected. No fingerprint, command, path, content, justification, output, error text, or guessed call relation is retained.

No Phase-8 filesystem evidence, `realpath`, stat, symlink/junction, git/checkpoint, or sandbox-coverage inference was implemented. Native Approval remains the only approval authority and remains unchanged.

## Tests and quality gates

### Focused and affected suites

The Phase-4 focused suite passed before the final full run: **2 files / 13 tests**. It covers all seven adapters, both shell compositions, malformed/accessor/oversized input, separators, quote safety, dynamic/encoded/substitution/environment ambiguity, destructive/system/permission/network/install rules, secret non-leakage, evidence gaps, Phase-3 escalation, repeated-failure behavior, TTL/capacity/query semantics, dispose, detached/frozen DTOs, exact ID reuse, and a 100-iteration bounded worst-case local performance smoke.

Affected inherited suites passed:

| Suite | Files | Tests |
| --- | ---: | ---: |
| R1 fixture/slot | 2 | 9 |
| R2 correlation | 2 | 16 |
| R3 PTC replay | 2 | 17 |
| R4 ledger | 2 | 21 |
| R5 benchmark unit | 1 | 3 |
| Phase 1A | 2 | 13 |
| Phase 1B | 2 | 14 |
| Phase 1C | 1 | 8 |
| Phase 2 | 2 | 15 |
| Phase 3 | 2 | 17 |
| Phase 4 | 2 | 13 |

The R1 fixture fault and deliberate fixture fault were expected console diagnostics; the suites passed.

### Static, export, declaration, pack and privacy gates

All passed on the final executable state:

- `pnpm run typecheck` — passed.
- `pnpm run build` — passed with the existing untracked `lib/` moved out and restored unchanged afterward.
- Host export smoke — passed for `apply`, `installCorrelation`, and `installLedger`; internal Rule Engine/scanner/evaluator helpers are not root exports.
- Client loader regression smoke — passed for `@dhandil/dsh-risk-advisor`.
- Declaration/root-export audit — passed; only DTO/service type vocabulary is public.
- `pnpm pack --dry-run --json` — passed; 21 package files, including `lib/index.js`, `lib/client.js`, and `README.md`.
- `git diff --check` — passed.
- Scope audit — passed; no Context Builder, RiskAssessment, Judge, Evidence Collector, canonical-path, Browser-risk, provider, or Native Approval implementation was added.
- Privacy audit — passed. Focused secret fixtures prove that the public DTO and retained evaluation state do not contain raw command/path/content/query/url/justification, secret material/hash, output, Session, ToolExecution, Agent, or raw exception detail.

The local bounded performance smoke repeatedly evaluated an allowed-size worst-case shell fixture without I/O or asynchronous work. The observed P4 Vitest execution was 84 ms for 13 tests in the final run; this is reported as an environment observation, not a single-machine acceptance threshold.

## Original implementation fresh complete regression (historical)

The final executable candidate was committed before the full run:

`dbf6f075b1509b8975a0b4096af4231e7ebf3591`

Exactly one fresh complete `pnpm test` was run against that SHA and passed:

- **20 test files / 146 tests passed**.
- Real provider/model calls: 0.
- Real external product/network calls: 0.
- Deployed Browser/profile runs: 0.
- Real destructive filesystem/shell actions: 0.
- Harness Core mutations: 0.
- Native Approval authority changes: 0.
- Phase-5+ implementation: 0.

The Phase-4 executable/test/config/package state was not changed after this Full run. The subsequent publication change is docs-only.

## Final repair execution — F1–F4

The repair was limited to the four frozen review findings:

- **F1 shell fail-closed status/confidence:** dynamic, encoded, sensitive-environment, generic-environment, unsupported control-flow, variable-command, source/dot-source, redirection, here-doc/process-substitution, and script-block forms now degrade the evaluation and lower parser confidence. Unquoted comments terminate scanning of comment text. Independently proven findings survive degradation.
- **F2 semantic token roles:** access-control, privilege, system-location, and credential-resource findings now require the recognized action/target role. Shell workdir and arbitrary data tokens no longer prove mutation. Filesystem `file_path` remains the valid target role; content/edit text and web-search queries receive secret-material scanning only.
- **F3 external/network direction:** shell defaults are `externalEffect=unknown` and `networkEffect=unknown`. Only proven Git push, package publish, or bounded HTTP mutation narrows them to `true/write`. `scp`, `sftp`, and `rsync` no longer imply external write from executable name alone and remain degraded/unknown without direction proof.
- **F4 generic environment preambles:** bounded `NAME=value` prefixes are consumed only to expose the following literal executable; sensitive names emit environment injection, while generic names degrade. `FOO=bar rm -rf build` therefore retains the recursive-delete fact without claiming high-confidence parsing.

Repair focused coverage passed: **2 files / 16 tests**. It proves degraded dynamic/encoded/environment status, generic env preservation, unsupported Bash/PowerShell controls, variable invocation, comment exclusion, role-sensitive false-positive negatives, absolute system targets, credential-resource target ownership, shell default unknown effects, Git push write direction, HTTP upload direction, and negative scp/rsync/sftp direction cases.

Affected inherited suites passed:

| Suite | Files | Tests |
| --- | ---: | ---: |
| Phase 1A foundation/correlation | 2 | 13 |
| R2 correlation | 2 | 16 |
| R4 ledger | 2 | 21 |
| Phase 2 | 2 | 15 |
| Phase 3 | 2 | 17 |

All pre-Full gates passed again: typecheck, build, Host export, Client loader, declaration/root-export, pack dry-run (21 files), diff-check, scope audit, privacy/secret-retention audit, and Harness mutation=0. No executable/test/config/package semantic change was made after the repair Full.

The repair does not change the closed adapter set, ExecutionId ownership, Phase-3 seam, DTO freeze, TTL/capacity policy, evidence gaps, Native Approval authority, or Phase-5+ boundary.

The repair executable/Tested SHA is:

`8707cee500d720d0a426333eec5dfc774b6513af`

Exactly one fresh complete `pnpm test` was run against that SHA and passed:

- **20 test files / 149 tests passed**.
- Provider/model calls: 0; external product/network calls: 0; deployed Browser/profile runs: 0.
- Real destructive filesystem/shell effects: 0; Harness Core mutations: 0; Native Approval changes: 0; Phase-5+ implementation: 0.

## Final Scanner Repair F5–F6

The final scanner repair remained inside the frozen Phase-4 Rule Engine and added no RuleFinding code.

- **F5 segment-local, target-role-aware system mutation:** deterministic shell findings are accumulated per segment. `SYSTEM_LOCATION_MUTATION` is now derived only from a recognized filesystem mutation action and its closed target operands (`rm`/PowerShell recursive delete or access-control mutation). Global findings from an earlier segment cannot contaminate `echo`, Git remote operands, package source operands, service/registry data, or network arguments. Cross-segment and package-source negatives, plus absolute `/etc` mutation positives, are covered.
- **F6 pipeline and wrapper fail-closed behavior:** pipeline RHS metadata is retained; a pipeline into `bash`, `sh`, `powershell`, `pwsh`, `python`, `perl`, or `node` emits the existing `SHELL_DYNAMIC_EXECUTION` and degrades status/confidence without inspecting piped content. A bounded wrapper policy handles literal nested commands for `env`, `command`, `exec`, `xargs`, `sudo`, and `doas`; wrapper semantics degrade, unknown privilege options degrade without guessing, and nested destructive findings remain visible. No external parser or execution was introduced.

Final scanner focused coverage passed: **2 files / 17 tests**. It covers all six F5 required cases, pipeline-to-interpreter cases, `env`/`command`/`exec`/`xargs`, `sudo -u`, `doas -u`, unsupported wrapper options, nested destructive-fact preservation, and no-new-finding-code proof by static matrix audit.

Affected inherited suites passed again:

| Suite | Files | Tests |
| --- | ---: | ---: |
| Phase 1A foundation/correlation | 2 | 13 |
| R2 correlation | 2 | 16 |
| R4 ledger | 2 | 21 |
| Phase 2 | 2 | 15 |
| Phase 3 | 2 | 17 |

All final pre-Full gates passed: typecheck, build, Host export, Client loader, declaration/root-export, pack dry-run (21 files), diff-check, scope, privacy/secret-retention, and Harness mutation=0. The `phase4-v1` finding matrix is unchanged; no new public code/category/severity/hardness was added.

Final scanner repair executable/Tested SHA:

`f2582981767e1892a72314fe931ff7562c7b1899`

Exactly one fresh complete `pnpm test` was run against that SHA and passed:

- **20 test files / 150 tests passed**.
- Provider/model calls: 0; external product/network calls: 0; deployed Browser/profile runs: 0.
- Real destructive filesystem/shell effects: 0; Harness Core mutations: 0; Native Approval changes: 0; Phase-5+ implementation: 0.

No executable, test, configuration, package, or dependency semantic change was made after this Full run. Only this report documentation may change.

## Publication verification

- Historical original Tested SHA: `dbf6f075b1509b8975a0b4096af4231e7ebf3591`.
- Historical F1–F4 repair Tested SHA: `8707cee500d720d0a426333eec5dfc774b6513af`.
- Current final scanner repair Tested SHA: `f2582981767e1892a72314fe931ff7562c7b1899`.
- Historical original report-only remote SHA: `66a2d36e090e8b3f1c897e2c48abeecc213000cf`.
- Historical F1–F4 repair report-only remote SHA: `dc2e30ee4113136d70b91c72615699db491594f3`.
- The final report-only remote SHA is the docs-only publication commit created after this report; its exact value and `HEAD == origin/main == git ls-remote` equality are recorded in the completion handoff because a commit cannot contain its own final SHA.
- The final scanner repair Tested SHA → final report-only delta is restricted to `docs/tasks/Phase4-rule-engine/Execution_Report.md`; no executable, test, package, dependency, or configuration semantic change is included.

## Inherited open and not-run boundaries preserved

The following remain unchanged and are not promoted by Phase 4: F-006 `PARTIAL`; F-013 `PARTIAL`; general guard-returned denial `PARTIAL/UNKNOWN`; true disk/process restart `NOT_RUN`; real native PTC producer `NOT_RUN`; deployed Live Browser/profile `NOT_RUN`; WebWorker `NOT_VALIDATED`; newer Harness/V4 `NOT_VALIDATED`; T05 production Assessment budgets `UNDETERMINED`; semantic verification `NOT_IMPLEMENTED`; and Phase-8 canonical path/git/checkpoint evidence `NOT_IMPLEMENTED`.
