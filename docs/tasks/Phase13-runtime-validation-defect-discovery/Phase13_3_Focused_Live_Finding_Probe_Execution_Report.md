# Phase 13.3 — Focused Live Finding Probe Report

## Frozen outcome

`RISK_ADVISOR_PHASE13_3_PUBLIC_FINDING_PATH_DEFECT_LOCALIZED`

Phase A stopped before Agent execution. The normal Harness Web page had Risk Advisor enabled and ordinary Host RPCs were succeeding, but the Client did not issue a read to the existing `risk-advisor/online-correction` route. The first observed break is at or before the Client slot/store read boundary; the Host bridge did not receive a request, so its response behavior remains untested. This is not a Finding accuracy result or Phase 13.3 acceptance.

## Baseline and provenance

- Localization report `e6c33f28c67f28501e1b9f7f84859d50d6d373e5` was pushed unchanged to `origin/codex/phase13-3-finding-observability-localization`; the remote ref was verified at that exact SHA.
- Main was fetched and verified at `319b9e7216df8eb34041c62bea762d082ffc643e` before observation.
- The V2 campaign and previous localization conclusions were reviewed. They contain no contrary evidence; both state that no live Finding or bridge snapshot was saved.
- Harness remained at the pinned `ddefc45fbc7f8e46dd73185e68295696d1297887`. The normal Web page showed the installed `risk-advisor` plugin enabled.
- No Product, validation, Harness, or profile configuration files were changed. No test was run; Phase 13.4 was not entered.

## Phase A — normal Web read-path observation

Observation time: `2026-10-08 12:23:50 Asia/Shanghai`.

- The ordinary local Harness Web interface loaded in Chrome. Its selected conversation was an already-completed V2 Task 20 session, shown as about 57 minutes old. No task was submitted, resumed, or followed up.
- The installed Plugins panel showed `risk-advisor` enabled. The selected conversation view and composer were present.
- Chrome DevTools Network recorded the same page reload: 37 requests, including normal Harness RPC traffic; the Session list request returned `200`.
- Filtering those captured requests for `risk-advisor/online-correction` returned no matching request. No request or response body, cookie, authorization header, or private trace payload was opened or recorded.
- Result: the native bridge state is **unobserved**. There was no request from which to classify `VIEW`, `NOT_FOUND`, or `UNAVAILABLE`. A missing Dock is not used as evidence of an empty Finding set.

## Localization

The source path expects `src/client/index.ts` to create `OnlineCorrectionClient` from the normal Client connection and register `conversation.input.dock`; `src/client/OnlineCorrectionDock.tsx` retains its per-Session source in an effect; `src/client/online-correction-store.ts` starts polling on retain. The normal page's other Host RPCs worked, but no Online Correction read was emitted after the same page reloaded with the completed conversation selected.

This localizes the first observed gap to the Client slot/store invocation boundary before the Host bridge. The available evidence does not distinguish whether Client plugin connection injection, dock registration/mount, or store retention failed. The Host route itself cannot be declared faulty because it was never reached.

## Phase B — not started

The public-read gate did not pass, so the probe stopped as instructed:

- New tasks / Sessions: `0`
- Provider or model requests: `0`
- Tool executions: `0`
- Previous 20 tasks: not rerun, resumed, or prompted
- F1/F2 scoring: `NOT SCORED`; no new execution facts or Finding snapshots were produced

## Next step

Request a separate architecture review of the Client-side connection injection, `conversation.input.dock` registration/mount, and store-retain boundary. Recheck the public route before authorizing any real task. This report does not implement or prescribe an unreviewed Product change.
