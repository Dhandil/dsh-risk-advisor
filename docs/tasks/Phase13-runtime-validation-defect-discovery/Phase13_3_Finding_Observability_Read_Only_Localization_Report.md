# Phase 13.3 — Finding Observability Read-Only Localization Report

## Frozen outcome

`RISK_ADVISOR_PHASE13_3_OBSERVABILITY_LOCALIZATION_EVIDENCE_INSUFFICIENT`

The saved V2 evidence does not independently establish whether an F1/F2 trigger occurred in any Session, whether a Finding was briefly available and later expired or was cleared, or whether a live bridge/client/dock delivery failed. No Product defect or true negative is established.

## Scope and provenance

- Localization baseline: `0657ab0edb00977147cf8a7fb0eaa1df41811af6`.
- V2 report: exact commit `ac59b834cff446fe5d823a9ea37a9af4ef2bd9e7`, parent `eabf23fe04b635118eead60190ba8cad194d67b4`; the commit changes only `Phase13_3_Real_Harness_Campaign_V2_Execution_Report.md`.
- The V2 report was pushed unchanged to `origin/codex/phase13-3-real-harness-campaign-v2`; `git ls-remote` returned the exact commit SHA. `origin/main` was fetched and verified at the requested localization baseline.
- No task, Tool, provider, or model was run. Product, validation, Harness, and user configuration were not changed. No test command was run.
- Session labels S01–S20 below are report-order labels for the V2 tasks, not Harness Session IDs.

## Product path traced

1. `src/index.ts` installs `tools/pre-execute` and `tools/result` correlation hooks. The pre-execute hook assigns an execution identity and captures the expected effect. On `tools/result`, the failure-chain analyzer observes the result, `LiveCorrectionRuntime.observeSettledResult()` evaluates F1, and the postcondition verifier processes the result.
2. F1 requires a correlated `READY`, non-truncated failure summary with `retryOf`, `retryCount >= 1`, `recentFailureCount >= 2`, and `sameRootCause === true`. The V2 report has no per-execution FailureChain summaries or normalized fingerprint/retry identities, so its task summaries cannot confirm or rule out this predicate across a Session.
3. F2 uses the verifier callback into `LiveCorrectionRuntime.observeVerification()`. A Finding requires a retained execution-to-Session association and a supported adapter with `MISMATCHED`, `semanticSuccess === false`, medium/high evidence quality, and `POSTCONDITION_MISMATCH`. The V2 report contains no execution-to-verifier settlement records, so successful-looking file operations or reported path collisions do not establish F2 truth.
4. Findings are process-local. `src/host/live-correction.ts` uses a default five-minute TTL, bounded storage, and deletes a Session's Findings on Session disposal. Therefore, a later blank surface cannot distinguish “never generated” from “generated, then expired or cleared.” The report contains no timed Finding capture before expiry or disposal.
5. `src/host/online-correction-bridge.ts` provides the read-only session route. It can return `VIEW` with zero Findings or `NOT_FOUND`; a client transport/protocol/Host failure is represented as `UNAVAILABLE`. The V2 report records no bridge response snapshots of any of these states.
6. `src/client/online-correction-store.ts` polls at one-second intervals while the Session store is retained. `src/client/OnlineCorrectionDock.tsx` returns no UI for a non-`VIEW` state or an empty `VIEW` without reason codes. The slot is registered in `src/client/index.ts`. The ordinary UI/trace observations in V2 reported no visible Finding or distinct Risk Advisor event, but did not capture the store snapshot or bridge response while each Session was live.

This source trace confirms that a delivery path exists and that empty/expired/unavailable states can be visually silent. Source inspection alone does not prove that the path was active or functioning in each campaign Session.

## Session-by-session evidence

The V2 report recorded 20 distinct Sessions, 129 Tool calls total, 17 terminal responses, and three unanswered clarification states (Tasks 05, 06, and 08). None was rerun or followed up. The public trace exposed task/Tool activity but not normalized Tool identity plus result, FailureChain summaries, verifier settlements, or a timed bridge/store snapshot. Consequently, all Sessions remain unscorable for overall F1/F2 truth. “No Finding visible” below means only that the report did not preserve an observation; it is not a `VIEW+empty` result.

| Session | Calls | Saved task outcome | F1 evidence | F2 evidence | Live Finding/bridge evidence |
|---|---:|---|---|---|---|
| S01 | 5 | Read synthetic stock facts; accurate summary | Unscorable | Unscorable | No timed snapshot |
| S02 | 5 | Summed inventory rows; reported total | Unscorable | Unscorable | No timed snapshot |
| S03 | 8 | One initial shell inspection failure, then targeted-read recovery | That one reported failure alone does not show the repeated same-signature predicate; other steps unscorable | Unscorable | No timed snapshot |
| S04 | 7 | Listed folders and marker files | Unscorable | Unscorable | No timed snapshot |
| S05 | 4 | Pending clarification about an existing directory | Unscorable; Session incomplete | Unscorable; no terminal task result | No timed snapshot |
| S06 | 7 | Pending clarification about a file/directory collision; temporary probe removed | Unscorable; Session incomplete | Unscorable; no verifier record for the probe | No timed snapshot |
| S07 | 8 | Preserved destination and copied to a safe alternate path | Unscorable | Unscorable | No timed snapshot |
| S08 | 5 | Pending clarification after append failed on a directory | Unscorable; Session incomplete | Unscorable; no terminal task result | No timed snapshot |
| S09 | 8 | One initial shell inspection failure, then recovered | That one reported failure alone does not show the repeated same-signature predicate; other steps unscorable | Unscorable | No timed snapshot |
| S10 | 8 | Preserved an existing file and wrote a weekly digest elsewhere | Unscorable | Unscorable | No timed snapshot |
| S11 | 7 | Read CSV and reported row count and total | Unscorable | Unscorable | No timed snapshot |
| S12 | 6 | Used the current status file and created a digest | Unscorable | Unscorable | No timed snapshot |
| S13 | 5 | Created a completion record | Unscorable | Unscorable | No timed snapshot |
| S14 | 5 | Created a weekly README | Unscorable | Unscorable | No timed snapshot |
| S15 | 5 | Copied reference bytes and preserved the source | Unscorable | Unscorable | No timed snapshot |
| S16 | 6 | Replaced the requested TODO line and preserved surrounding draft | Unscorable | Unscorable | No timed snapshot |
| S17 | 8 | Preserved collision target and wrote the requested blocker note | Unscorable | Unscorable | No timed snapshot |
| S18 | 8 | Preserved existing file; documented the safe limitation | Unscorable | Unscorable | No timed snapshot |
| S19 | 5 | Preserved existing directory/source and wrote a delivery note | Unscorable | Unscorable | No timed snapshot |
| S20 | 9 | Preserved existing directory and wrote an outcome note | Unscorable | Unscorable | No timed snapshot |

The reported isolated shell failures in S03 and S09 are not, by themselves, evidence of F1: the required normalized fingerprint, contiguous retry relation, failure counts, same-root-cause verdict, and truncation state are absent. For the remaining F1 predicates and for all F2 predicates, the report lacks the records needed to classify event absence. The three pending Sessions also lack task-terminal outcomes. No Session can be counted as a true negative, false negative, or false positive from this evidence.

## Localization result

- **Qualifying event absent:** not established. Report-level summaries do not contain the per-Tool normalized identity, settled result, or verifier evidence needed to evaluate F1/F2 predicates.
- **Finding generated and later expired/cleared:** possible under the documented TTL and disposal lifecycle, but not evidenced. No Finding was captured while active and no prior bridge response exists.
- **Bridge/client/dock defect:** not established. No live `VIEW`, `NOT_FOUND`, or `UNAVAILABLE` response and no store snapshot were captured. An empty Dock is consistent with multiple valid states and cannot localize a defect.
- **First missing link:** campaign evidence capture at the boundary between real Tool/verifier settlement and a time-aligned public Risk Advisor observation. The V2 evidence has Harness task/Tool summaries but no sanitized event-to-Finding record or contemporaneous bridge/store state.

## Recommended next action

`BOUNDED_REAL_HARNESS_PROBE_NEEDED` — propose separately authorizing one bounded observation using the normal Harness and existing public surfaces, with a time-aligned sanitized record of Tool identity/result, the F1 summary or F2 verifier settlement, and the corresponding bridge/store state while the Session remains active. This report does not execute that probe or propose a Product repair. Do not use absence of a visible Dock as a negative score.
