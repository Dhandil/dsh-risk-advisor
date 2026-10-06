# Risk Advisor Phase 11.1 — Implementation Instructions

## Authorized outcome

Implement exactly the frozen Phase 11.1 contract:

`docs/tasks/Phase11-verified-experience-historical-guidance/Phase11_1_Experience_Episode_Freeze.md`

Architecture baseline:

`e08ffb7d36531f6ac6cee9cb133a5275ea6392df`

Pinned Harness Core:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

Do not start Phase 11.2.

---

## 1. Preflight

Before editing:

1. fetch `origin/main`;
2. require `origin/main == e08ffb7d36531f6ac6cee9cb133a5275ea6392df`;
3. require pinned Harness SHA exactly matches;
4. preserve all user/untracked files;
5. report and stop on tracked executable drift not belonging to this task.

Never reset, clean, force-push, delete `lib/`, `node_modules/`, or other user drift.

---

## 2. Implement only 11.1

Create a Host-only durable Experience subsystem backed by Harness Storage Domain.

Required product behavior:

- one immutable `ExperienceEpisodeV1` per settled observed execution;
- commit trigger only on `tools/result`;
- use `ctx.storageDomain`;
- domain `risk_advisor_experience`, version 1, per-record layout, table `episodes`;
- authoritative malformed records fail open loudly;
- storage absence/failure never blocks Tool execution, Native Approval, Risk Assessment, or Browser UI;
- no semantic outcome qualification yet.

---

## 3. Episode facts

Persist only the exact frozen fields.

Use:

- Rule Engine diagnostics for operation facts;
- exact live correlation for approval outcome;
- final `tools/result` for terminal facts;
- Retry/Escalation diagnostics for retry facts;
- `process.platform` normalized to the frozen platform vocabulary.

Do not persist raw execution payload.

Forbidden durable content includes:

- commands;
- raw args;
- paths/cwd;
- file/edit content;
- stdout/stderr;
- result content/value;
- approval justification;
- Session/call/approval IDs;
- user/model content;
- credentials/secrets.

---

## 4. Internal result ordering

Preserve this order in Risk Advisor's result observer:

1. `failureChain.observeResult`
2. `verifier.observeResult`
3. Experience settlement capture / async durable commit
4. `foundation.retire`
5. correlation retirement

Do not await the durable Experience write on the Harness result path.

Contain/observe every persistence promise.

No unhandled rejection.

Do not wait for asynchronous verifier completion.

---

## 5. Immutability

Episode key:

`ra-episode-v1:<executionId>`

Rules:

- absent -> put;
- identical existing -> idempotent no-op;
- divergent existing -> no overwrite, diagnostics `CONFLICTED`.

No Episode update API.
No delete behavior.
No overwrite repair.

---

## 6. Capacity

Hard cap:

`10_000` Episodes.

Serialize Experience commits.

At cap:

- retain all prior Episodes;
- skip new Episode;
- diagnostics `CAPACITY_EXCEEDED`.

No automatic eviction.

---

## 7. Lifecycle

Mount Experience only while optional `storageDomain` capability is available.

Own exactly one domain handle per active generation.

On teardown:

- stop accepting new commits;
- drain already-started commits;
- close domain;
- leave no observer/promise leak.

Reopen must restore prior Episodes.

---

## 8. Dependencies

Add explicit dependency contracts needed for:

- `@deepseek-ai/dsh-storage-domain`;
- `zod ^4.4.3`.

Do not use Storage JSON directly in product code.

Keep package lock/declaration/export/package-contract evidence consistent.

Do not change package version.

---

## 9. Tests

Add focused 11.1 coverage for E1–E14 from the Freeze.

Must include:

- allowed;
- rejected;
- cancelled;
- unavailable;
- no approval;
- privacy serialization sentinel proof;
- restart persistence;
- idempotency;
- same-key conflict;
- capacity;
- storage absent/open/write failure;
- lifecycle drain;
- async verifier non-mutation;
- existing V1 behavior regression.

Use temporary isolated storage roots only.

Do not write test fixtures to the user's real `$DSH_HOME/storages`.

---

## 10. Gate order

Run in this order:

1. focused 11.1;
2. affected R2/R4/P2/P3/P4/P7/P10 regressions as applicable;
3. typecheck;
4. build;
5. package/declaration/export/static gates;
6. isolated durable restart proof;
7. privacy serialization inspection;
8. only then exactly one fresh complete `pnpm test` on the exact final executable candidate.

If the Full fails:

- stop;
- do not repair and silently rerun;
- report the exact failure state for architecture review.

If the Full passes:

- do not modify executable/test/package/config/benchmark semantics afterward;
- push exact candidate;
- add only:
  `docs/tasks/Phase11-verified-experience-historical-guidance/Phase11_1_Execution_Report.md`;
- push report-only commit;
- verify `HEAD == origin/main == git ls-remote`.

---

## 11. Forbidden

Do not:

- implement 11.2 qualification;
- add Pattern/Guidance;
- feed Experience into Risk Assessment;
- inject Agent context;
- add Browser UI/routes;
- enable Fast Judge/Deep Judge;
- modify Native Approval;
- modify Harness Core;
- add automatic correction;
- change permission behavior;
- create `Acceptance_Report.md`;
- declare ACCEPTED.

---

## 12. Required final response

Return:

`RISK_ADVISOR_PHASE11_1_PUBLISHED_READY_FOR_REVIEW`

with:

- implementation/Tested SHA;
- Full result;
- report SHA;
- remote identity;
- focused/regression/static/persistence/privacy evidence;
- confirmation that post-Full diff is report-only;
- confirmation that 11.2 was not started.
