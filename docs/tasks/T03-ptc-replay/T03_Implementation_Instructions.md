# T03 — R3 Durable PTC Tree Replay | Codex Implementation Instructions

**Single task:** `T03-ptc-replay`. Read sibling `T03_Architecture_Freeze.md` first. These instructions are implementation authority for Codex, **not acceptance authority**. Do not generate an Acceptance Report, announce `ACCEPTED`, or start T04.

## 0. Preflight and protected state

1. Enter `D:\Harness\harness-plugin\dsh-risk-advisor`; record branch, `git status --short`, staged/untracked files, `git rev-parse HEAD`, `git remote -v`, and `git ls-remote origin refs/heads/main`. Starting checkpoint should be `origin/main @ 697db64bab9dd20821864cca1b6fd830a12cda21`. Only fast-forward when safe; STOP for unexplained divergence. Never reset, clean, rebase, amend user work, or force-push.
2. Check reference `D:\Harness\deepseek-harness` **read-only**: `git rev-parse HEAD`, status and drift (including prior `build.log`, `install.log`, `t0-*`, `undefined/`). Expected Harness SHA `ddefc45fbc7f8e46dd73185e68295696d1297887`; if different, verify affected PTC/Session files and STOP for a material mismatch. Do not write, rebuild, install dependencies, or change user settings in the Harness tree.
3. Read the exact canonical plugin documents: `docs/baseline/risk-advisor-v1-architecture-v1.2.md` §§3.6/7.1/12/46-R3, Test Matrix Area C/F and Static Preflight S4; inspect the accepted T02 source/report. Preserve T01 bounded acceptance and `Live Browser=NOT_RUN`.
4. Inspect pinned `packages/core/tools/src/{types,ptc}.ts`, `packages/core/session/src/{types,index}.ts`, and relevant real PTC/Session tests. Confirm the payload, `SessionEvent.seq`, turn/step enclosure, ordering and same-Session replay APIs. If facts differ materially from the freeze, STOP with `T03_ARCHITECTURE_DECISION_REQUIRED`.
5. Preserve and commit the exact frozen task files in `docs/tasks/T03-ptc-replay/`. Preserve `docs/risk-advisor-current/`, the untracked T01 final runtime instructions, and all other drift; do not stage unrelated files. Keep T01/T02 Accepted code and historical reports unchanged.

## 1. Implement only the bounded R3 projection

A. Add a focused Host-only module under `src/host/` (suggest `ptc-replay.ts`) with a pure/read-only replay entry taking a known, exact Session snapshot. Use public type-only Harness interfaces and minimal explicit projection types. Export from `src/index.ts` only if necessary for package consumers/tests; do not mount a duplicate lifecycle observer and do not extend/overwrite `ctx.riskAdvisorCorrelation`.

B. Walk ordered Session events with explicit turn/step ownership and unique per-Session sequence provenance. Index each top-level `tool/call` occurrence and each PTC start **by occurrence** rather than callId. Keep only minimal sanitized structure (`sessionId` display, `(turn,step)`, seqs, rootCallId/parentCallId/subCallId, toolName, edge/settlement statuses); do not copy raw `arguments`, `content`, full `error`, or prompts into projection or logs.

C. Resolve parent/root edges only when a **single** structurally consistent candidate exists in the proven Session/step. Explicitly handle missing parent, duplicate parent call occurrence, reused parentCallId across steps, sibling dispatches, inconsistent root and invalid ancestry. Never parse `:ptc:` strings as an occurrence authority. For durable-only proof use `RECOVERED`; leave `CONFIRMED` reserved for separately proved live-token corroboration. `AMBIGUOUS`/`UNRESOLVED` must survive to exported output, not silently become an empty parent or root=self.

D. Pair start/settle by unique source-backed occurrence and complete structural tuple within the same step. Maintain independent pairing vs parent/root resolution: missing start, missing settle, duplicate start/settle, and contradictory tuples cannot fabricate a canonical outcome. Only an unambiguous paired terminal may expose a bounded `isError` flag. `START_ONLY` means unknown, never failure. Do not invent `retryOf`, `escalatesFrom`, historical active ExecutionId, an Approval binding, or an event that was not logged.

E. Validate scope/order and enforce input/occurrence/output caps. Return explicit `DEGRADED` (reason) on malformed provenance or limit excess instead of claiming that a truncated prefix is complete. Detach and freeze nested output. Replay must be repeatable without writing to Session, T02 active index, native Approval or Tool outcomes. Do not implement a persistent Ledger, recovery, provider, LLM, Browser route or actual risk judgment.

## 2. Tests to run and document

Implement the exact `R3-01..R3-12` frozen matrix, using parameterization where useful, not a cartesian explosion. At minimum the tests must visibly demonstrate:

- normal PTC root/child replay; siblings; a distinct nested parent/root chain;
- same callId reused in **different steps** and duplicate parent occurrences within **one** step; duplicate subCallId ambiguity;
- start-only, settle-only, orphan parent and mismatched root; no fabricated failure/edge;
- repeated replay of an immutable snapshot; sequence provenance and Session isolation, including distinct Session objects with equal textual IDs when applicable;
- deterministic bounds, frozen sanitized DTO (no raw args/output leak), and independence from semantic retry/escalation;
- no live T02 `ExecutionId` creation and no behavior change to T02 active correlation.

Use a pinned **real Harness SessionStore/Session** test with committed `session.append` events and `snapshotEvents()`; identify precisely that the PTC producer is simulated by the test append. If a truly disposable `run_code` producer harness is already safely available, optionally add one genuine emitted-start/settle integration using a harmless local fixture; do not touch protected Harness or invoke providers/privileged operations. Record `ACTUAL_PTC_PRODUCER=NOT_RUN` rather than falsely stating it passed if not safely available.

Important negative controls: (1) same subCallId in separate steps is **not** same occurrence; (2) a unique settle does **not** prove a unique parent; (3) `rootCallId`/`parentCallId` strings are not retry lineage; (4) missing `tool/call` root is not automatically `root=self`.

## 3. Quality gates and order

```text
Preflight / exact source seam
 -> implementation + pure focused R3 tests
 -> real Session append/snapshot integration
 -> source/architecture/scope/lifecycle audit
 -> low-cost quality gates (typecheck, lint, build, export/pack, diff-check)
 -> full relevant regression: T01 9/9 + T02 16/16 + R3 suite
 -> Execution_Report.md (Codex execution evidence only)
 -> exact-scope implementation commit + docs-only report commit
 -> normal push and remote SHA verification -> STOP
```

Respect a distinct Tested SHA: no executable drift after last executable gates. Record actual commands and counts, test levels, known warnings and all NOT_RUN states. If `git diff --check` flags preserved Markdown hard-break whitespace, report separately and never claim an unqualified all-files PASS. Inspect staged names before commit; never stage build output, source args/content, sensitive data or user drift. Package and Host export smoke must continue working. If T01/T02 regression fails because of a new test/runtime configuration change, fix in T03 within scope or STOP/return PARTIAL; do not bury the red test.

No T03 Canonical Full is defined: `NOT_APPLICABLE`. T01 deployed Live Browser remains `NOT_RUN`. R4 Ledger Fault Injection/Recovery and R5 Benchmark remain `NOT_RUN`.

## 4. Report and publish — no self-acceptance

Write `docs/tasks/T03-ptc-replay/Execution_Report.md` containing:

- Outcome: `T03_R3_PUBLISHED_READY_FOR_REVIEW` / `T03_R3_PARTIAL` / `T03_ARCHITECTURE_DECISION_REQUIRED` / `T03_BLOCKED` / `T03_FAILED` (**execution state only**).
- Plugin/Harness preflight SHA, protected drift, changed-file manifest, exact R3 architecture and differences from the freeze, known limitations.
- Per-case R3-01..12 with PASS/PARTIAL/NOT_RUN and proof level; distinguish pure fixtures, real Session append/snapshot and (if any) actual PTC producer.
- Exact command/output summary for focused/full regressions, typecheck/lint/build/pack/diff/scope gates. All prior T01/T02 counts and outstanding Live Browser caveat.
- Honest negative results, missed proof, `actual provider/network/privileged/browser calls`, Harness mutation count, Canonical Full `NOT_APPLICABLE`, R4/R5 `NOT_RUN`.
- Executable Tested SHA, implementation commit, report-only commit/final remote SHA (where the report precedes final commit, print the final SHA in Codex's terminal response; no history rewrite merely to embed its own SHA).

Normal push to `origin/main` and verify exact equality: `git rev-parse HEAD`, `git rev-parse origin/main`, `git ls-remote origin refs/heads/main`. If publication fails use `DELIVERY_BLOCKED` rather than `PUBLISHED`. Codex must **not** generate `Acceptance_Report.md`, state `ACCEPTED`, automatically begin T04, or edit frozen baseline documents silently. ChatGPT Web independently reviews the actual pushed code/diff/test evidence and decides `ACCEPTED / REPAIR / STOP`.

## STOP conditions

Material Harness schema mismatch; cannot obtain a safe exact Session event source; requires Harness Core/user profile/permanent settings changes; fabricated parent/root or reintroduced callId last-wins; leak of raw arguments/contents; accidental live ExecutionId reconstruction; unacceptable T01/T02 executable regression; unauthorized persistent Ledger/full recovery; unsafe/destructive Git operation or unexpected remote history. Preserve work and report the precise blocker.

## Compact terminal response

```text
Outcome:
R3-01..12 statuses + evidence levels:
Real Session append/snapshot test:
Actual PTC producer test: PASS / NOT_RUN (reason)
T01 9/9 + T02 16/16 regressions:
Typecheck / lint / build / pack / diff gates:
Tested SHA:
Implementation SHA:
Execution_Report.md path:
Final remote SHA and HEAD/origin/ls-remote equality:
Protected drift / limitations / STOP status:
STOP; no T04/R4/R5.
```
