# Phase 3 Execution Report — Retry / Escalation Analyzer

## Outcome

`PHASE3_REPAIR_PUBLISHED_READY_FOR_REVIEW`

Codex completed the bounded Phase 3 implementation and delivery handoff. Independent final acceptance remains the responsibility of ChatGPT Web. No Acceptance Report was generated and no acceptance decision was made.

## Repositories and tested state

- Plugin repository: `https://github.com/Dhandil/dsh-risk-advisor`
- Branch: `main`
- Start HEAD / synchronized `origin/main`: `00835fbd588f432e0749e88ac984c4fd08121048`
- Required start commit contained: `00835fbd588f432e0749e88ac984c4fd08121048`
- Historical Phase 3 executable/tested SHA: `c08c1d341b2b2729815c42a5543394cce1efb51c`
- Final repair executable/tested SHA: `620ed7b7293b9186aed1067bbe0d4187cc73a34b`
- Final report-only remote SHA: recorded by the post-push verification in the completion handoff after this report-only publication.
- Pinned Harness: `D:\Harness\deepseek-harness @ ddefc45fbc7f8e46dd73185e68295696d1297887`
- Harness mutation count: `0`

The plugin was fetched and fast-forward synchronized normally. No reset, clean, rebase, force push, dependency installation, broad formatter pass, or destructive checkout was used. Existing plugin and Harness drift was preserved.

## Changed-file manifest

Historical executable implementation commit (`c08c1d341b2b2729815c42a5543394cce1efb51c`):

- `package.json` — added `test:p3` and included it in the complete test chain.
- `src/host/retry-escalation.ts` — added the private, bounded exact-live fingerprint/relation analyzer and read-only summary service.
- `src/index.ts` — extended the existing correlation hook to pass the exact final result, installed one analyzer per Host generation, and provided `riskAdvisorFailureChain` without adding an identity owner.
- `tests/p3-retry-escalation.unit.spec.ts` — fingerprint safety, relation ordering, root-cause, permission, bounds, TTL, conflict, disposal, recovery and privacy proof.
- `tests/p3-runtime.integration.spec.ts` — genuine pinned `Context + SessionStore + ToolRuntime + ApprovalService` exact-live integration and Native Approval noninterference proof.

Final F1–F2 repair executable commit (`620ed7b7293b9186aed1067bbe0d4187cc73a34b`):

- `src/host/retry-escalation.ts` — mirrored the pinned adapter value constraints and corrected nearest-success status handling.
- `tests/p3-retry-escalation.unit.spec.ts` — added malformed value, escalation-pair, valid paired permission, and nearest-success `READY` proofs.

Report-only publication file:

- `docs/tasks/Phase3-retry-escalation-analyzer/Execution_Report.md`

No Client/Browser Phase 3 UI, Harness Core, Native Approval authority, Phase 1/2 product behavior, or Phase 4 behavior was changed.

## Fingerprint contract

`operationFingerprint` is private relation state only: versioned `v1` SHA-256, deterministic, Session-independent, and never returned by the public summary.

Supported controlled adapters:

| Tool | Included in fingerprint | Excluded but validated when supplied |
| --- | --- | --- |
| `read` | exact `file_path`, `offset` presence/value, `limit` presence/value | none |
| `write` | exact `file_path`, exact `content` | `sandbox_permissions`, `justification` |
| `bash` / `pwsh` | exact tool name, exact `command`, `workdir` presence/value, `run_in_background` presence/value | `description`, `timeoutMs`, `sandbox_permissions`, `justification` |

Adapters accept only plain/null-prototype objects, own data properties, bounded keys/strings/numbers, and the pinned explicit permission targets. Unknown, accessor, malformed, oversized, or unsupported input produces no fingerprint and no inferred retry relation. Shell strings are compared exactly; no shell parsing, path canonicalization, filesystem probing, or semantic command equivalence was added. Therefore `pnpm install` and `pnpm install --force` remain different fingerprints.

## Exact-live relation contract

- One analyzer is created per Host generation and receives the existing exact Phase-1 `ExecutionId` after capture.
- Relation records are scoped to the exact same Session object, capture ordinal, and mounted generation. Equal `session.id` text or durable `callId` does not relate records.
- `retryOf` selects only the nearest earlier matching fingerprint when the prior execution had already settled with a proven failure before the current capture and the pair is within five minutes.
- A nearest success, pending, unknown, conflicted, unsupported, expired, or unavailable record blocks reaching an older failure. Overlapping calls are not retries.
- `retryOf` is derived backward only and never changes Phase-1 parent/root ownership or mints/rewrites an `ExecutionId`.
- Dispose/HMR clears state and makes late callbacks inert. Durable replay, runtime loss, and restart do not fabricate relations.

## Failure signatures and permission evidence

Phase 3 reuses the internal Phase-2 terminal and shell projectors. It does not duplicate the Phase-2 error-code taxonomy or use reason, exception text, approval text, stdout, or stderr heuristics.

| Evidence | Relation result |
| --- | --- |
| Structured Phase-2 failure with a known kind/code | failed; known bounded signature |
| Generic `TOOL_ERROR` without structured code | failed; root cause unknown |
| Exact unconflicted shell `processSuccess=false` | failed; `PROCESS_FAILURE` signature |
| Terminal or shell evidence conflict | conflicted; relation certainty suppressed |
| Equal known failure signatures on a direct retry | `sameRootCause=true` |
| Different known failure signatures on a direct retry | `sameRootCause=false` |
| Missing/unknown current or prior signature, or non-failed current | `sameRootCause='unknown'` |

Permission ordering is `read-only < workspace-write < danger-full-access`. Prior level is known only from a validated explicit request or exact unconflicted shell mode; missing prior permission is not read-only. Current level is known only from a validated explicit target. A proven direct retry yields `true` only for a strictly wider target, `false` for known equal/narrower levels, and `'unknown'` whenever either side is unavailable or conflicted. This is detection only, not necessity, authorization, proportionality, or excessiveness analysis.

## FailureChainSummary bounds and privacy

The only product seam is the frozen read-only Context service `riskAdvisorFailureChain.get(executionId)`. Each returned summary is detached and deeply frozen. It contains only execution IDs, bounded failure kind/code, status, counts, relation flags, reason codes, truncation, and at most eight recent entries.

- Per exact Session: maximum 128 retained relation records.
- Global: maximum 512 retained relation records.
- Absolute five-minute TTL from capture; query does not refresh TTL.
- Active records are not evicted merely to manufacture capacity; capacity refusal returns `CAPACITY_EXCEEDED` and native execution continues.
- Expired/settled records are preferred for eviction; unavailable history is marked degraded/truncated.
- No raw arguments, fingerprint/hash, path, content, command, workdir, permission string, justification/reason, output, Session, event, ToolExecution, token, or raw exception text is exposed or retained in the public relation state.

F-006 and F-013 remain `PARTIAL`; no cross-plane or durable guessed relation was added.

## Tests and quality gates

Final focused Phase 3:

- `pnpm run test:p3`: 2 files, 17 tests passed.
- Includes controlled adapter safety, exact-live nearest relation, overlap/session isolation, five-minute boundary, backward-only chain, max-eight truncation, same-root-cause matrix, shell process failure, conflict fail-closed, permission escalation, bounds, TTL, disposal/recovery, privacy, and real Host integration.

Affected inherited suites:

- R2: 16 passed; R3: 17 passed; R4: 21 passed.
- Phase 1A: 13 passed; Phase 1B: 14 passed; Phase 1C: 8 passed.
- Phase 2: 15 passed.

Static/export/privacy gates:

- `pnpm run typecheck`: passed.
- `pnpm run build`: passed.
- Host export smoke: required product exports remained present; all seven Phase-2 authority-bearing projector functions remained absent from the package root.
- Generated declaration audit: Phase 3 DTO/service types present; all seven Phase-2 authority-bearing projector functions absent.
- Client loader/export regression smoke: passed; Phase 1C Client registration remained intact.
- `pnpm pack --dry-run --json`: passed; package contained `lib/host/retry-escalation.d.ts` and required built outputs.
- `git diff --check`, executable scope audit, root-export audit, and privacy/secret checks: passed.
- `lint` / `publint`: `NOT_CONFIGURED`; no dependency was added to manufacture a gate.

Final fresh complete regression, run exactly once on the executable SHA above:

- `pnpm test`: 18 test files, 133 tests passed on `620ed7b7293b9186aed1067bbe0d4187cc73a34b`.
- R1: 9; R2: 16; R3: 17; R4: 21; R5: 3; P1A: 13; P1B: 14; P1C: 8; P2: 15; P3: 17.
- The inherited R1 fixture-fault console output occurred only inside passing fault-containment tests.

## Side effects and prohibited scope

- Provider/model calls: `0`.
- External product/network calls: `0`.
- Deployed Browser/profile calls: `0`.
- Real destructive filesystem/shell effects: `0`.
- Harness Core mutations: `0`.
- Native Approval authority changes: `0`.
- No Rule Engine, RiskAssessment, recommendation, ContextBuilder, Redactor, Judge, Provider, Browser Phase 3 UI, semantic verification, Evidence Collector, durable relation database, cross-session relation, or Phase 4+ behavior was implemented.

## Drift and final publication verification

Protected plugin drift remains untracked, including `.vitest-cache/`, `docs/risk-advisor-current/`, prior repair instructions, `lib/`, `node_modules/`, and `pnpm-lock.yaml`. Harness drift remains untracked, including its existing logs and `undefined/`. No drift was reset, cleaned, overwritten, or staged.

The final report-only publication verification must show:

```text
HEAD == origin/main == git ls-remote origin refs/heads/main
```

The exact final remote SHA and this equality are recorded in the completion handoff after report-only publication. This is an implementation handoff for independent ChatGPT Web review, not an acceptance record.

## Final Repair — F1–F2

### Repair state

- Repair start / synchronized remote SHA: `90993bb7283f7c8d1d9c66f909ba573dc89e2d65`.
- Reviewed historical executable SHA: `c08c1d341b2b2729815c42a5543394cce1efb51c`.
- New executable/tested SHA: `620ed7b7293b9186aed1067bbe0d4187cc73a34b`.
- Scope: F1 pinned adapter value constraints and F2 nearest-success status correction only.
- Handoff: `PHASE3_REPAIR_PUBLISHED_READY_FOR_REVIEW`.

### F1 — fail closed on pinned value-level malformed input

The controlled adapters now reject whitespace-only `read`/`write` paths, non-positive `read` offsets/limits, whitespace-only shell commands, missing or whitespace-only shell descriptions, non-positive shell timeouts, and malformed escalation pairs. `sandbox_permissions` and `justification` must be both absent or both present; when present, the permission is a pinned target and the justification is bounded and non-empty after trimming. Paired permission/justification values remain excluded from fingerprint identity, and no justification text is retained.

The repair mirrors only the small public value constraints visible at pre-execute. It does not import tool-private Harness validators, invent a deployment-specific read cap, parse shell syntax, or change Harness Core.

Focused F1 proof covers whitespace paths/commands, zero/negative numeric values, missing/blank descriptions, timeout bounds, each escalation-pair failure, blank justification, and valid paired permission fields that still match by the same fingerprint.

### F2 — nearest successful match is a normal blocker

The summary projection now distinguishes a retained, settled nearest success from incomplete or conflicted evidence. An old failure followed by a nearest matching success followed by a current execution has no `retryOf` and remains `status='READY'`. Pending, unknown, conflicted, missing, expired, or history-truncated nearest evidence remains degraded/truncated as required. The nearest-only, exact-live, settled-before-capture, five-minute, conflict, and backward-only gates are unchanged.

### Final repair evidence

- P3 focused repair suite: 2 files, 17 tests passed.
- Directly affected P2: 15 passed; R4: 21 passed.
- `pnpm run typecheck`, build, Host export smoke, Client loader smoke, declaration/root-export audit, `pnpm pack --dry-run --json`, `git diff --check`, scope, privacy and secret gates: passed.
- One fresh complete `pnpm test` run on `620ed7b7293b9186aed1067bbe0d4187cc73a34b`: 18 files, 133 tests passed.
- F-006/F-013 remain `PARTIAL`; inherited NOT_RUN/NOT_VALIDATED states remain unchanged.
- Harness remains `ddefc45fbc7f8e46dd73185e68295696d1297887` with mutation count `0`.
- No Phase 4 or later behavior was implemented; no Native Approval or Phase 1/2 behavior was changed.
- The final remote SHA and `HEAD == origin/main == git ls-remote origin refs/heads/main` equality are recorded in the completion handoff after this report-only publication.
