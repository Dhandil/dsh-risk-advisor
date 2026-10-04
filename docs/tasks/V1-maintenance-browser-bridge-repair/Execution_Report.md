# V1 Maintenance Browser Bridge Repair — Execution Report

Status: `V1_MAINTENANCE_BROWSER_BRIDGE_REPAIR_PUBLISHED_READY_FOR_REVIEW`

This is the Codex implementation and self-test report. It is not an Acceptance Report and does not declare independent acceptance.

## Scope and root cause

The repair is limited to the Browser bridge transport. The former independent `/risk-advisor` channel entered the pinned Harness `HostConnectionService` path that attempted to register through an owning context without the Web server capability. The route therefore never became part of the real Web server, and the Browser mapped the missing transport to `TRANSPORT_UNAVAILABLE` / permanent `UNAVAILABLE`.

No Harness Core source was changed. The pinned Harness revision remained:

`ddefc45fbc7f8e46dd73185e68295696d1297887`

## Implementation

The exact committed implementation candidate is:

`TESTED_SHA=f4807e2186e43690ba6dc4c349107b55e407aa53`

Changes are limited to:

- shared `/api` Connection channel;
- exact Host routes `/api/risk-advisor/active` and `/api/risk-advisor/assessment`;
- public `connection.fetch.register()` registration and owned disposers;
- standard Connection `client-request` / `server-response` envelope validation;
- bounded malformed carrier failures and method/content-type checks;
- route disposal, remount/HMR, and partial second-registration cleanup proof;
- affected focused tests and the pinned real Connection probe.

The Client continues to use `ClientConnectionRpc.call()` with `/api` and the two `risk-advisor/*` endpoints. Risk Engine, UI content, Native Approval authority, correlation, and all later phases were not changed.

## Installed real `web` profile proof

The accepted local package was packed from `TESTED_SHA` and installed through the supported command:

`dsh plugin --profile web add --offline <local tarball>`

The real `web` profile was cleanly restarted with the pinned Harness. Browser-origin requests from the real Web page proved:

- authenticated POST `/api/risk-advisor/active`: HTTP 200, valid Connection envelope;
- authenticated POST `/api/risk-advisor/assessment`: HTTP 200, valid Connection envelope;
- valid `rpcId` correlation preserved;
- old independent `/risk-advisor/active` route was not used (HTTP 405);
- both exact routes were removed by disposal in the pinned Host probe.

The user independently observed the required real Browser approval proof:

- Native Approval appeared and remained usable;
- Risk Advisor reached `READY` / “评估就绪”;
- Risk was `HIGH`;
- Recommendation was `NEED_MORE_INFORMATION`;
- primary reason was `INSUFFICIENT_CRITICAL_EVIDENCE`;
- `danger-full-access` / permission escalation was presented correctly;
- Native Reject worked;
- no sentinel was created;
- no duplicate Risk Advisor card appeared.

## Gates and regression evidence

Focused and affected gates passed before the candidate commit:

- P1C bridge focused: 10 tests passed;
- P6 affected suite: 27 tests passed;
- P10 affected suite: 35 tests passed;
- typecheck and build: PASS;
- Host export, Client package contract, declaration/root-export audit: PASS;
- `pnpm pack --dry-run --json`: PASS;
- diff check, exact-route/privacy/no-authority static checks: PASS;
- pinned real `HostConnectionService` probe: PASS;
- provider/network/registry runtime calls: 0;
- Harness Core mutation: 0.

Inherited suites included in the final fresh run passed as follows:

| Suite | Files | Tests |
| --- | ---: | ---: |
| R1 | 2 | 9 |
| R2 | 2 | 16 |
| R3 | 2 | 17 |
| R4 | 2 | 21 |
| R5 | 1 | 3 |
| P1A | 2 | 13 |
| P1B | 2 | 14 |
| P1C | 1 | 10 |
| P2 | 2 | 15 |
| P3 | 2 | 17 |
| P4 | 2 | 17 |
| P5 | 4 | 23 |
| P6 | 5 | 27 |
| P7 | 6 | 26 |
| P8 | 5 | 21 |
| P9 | 6 | 20 |
| P10 | 12 | 35 |

## Fresh complete regression

Exactly one fresh complete command was run after the real Browser READY proof, on the exact `TESTED_SHA`:

`pnpm test`

Result: **PASS — 58 test files, 304 tests**.

After this Full PASS, no executable, test, package, or benchmark semantic content was changed. Only this report was added.

## Publication integrity

- Plugin `HEAD`, `origin/main`, and `git ls-remote origin refs/heads/main` were equal before the report-only publication.
- Harness remained at the pinned SHA above; tracked Harness source was not modified.
- Existing user drift remained untracked and was not reset, cleaned, deleted, or staged.
- No `Acceptance_Report.md` was created.
- No Phase 11/V2 work was started.

The final report-only publication SHA is the Git `HEAD` verified together with `origin/main` after this report commit.
