# V1 Deployment Pilot — Objective Test Report

## Status

`V1_DEPLOYMENT_PILOT_OBJECTIVE_VALIDATION_READY_FOR_USER_REVIEW`

This report records only objectively observable evidence from the real local `web` profile. It does not make a Pilot COMPLETE, RETAIN, or REMOVE decision, and it does not replace the user's subjective UX observation.

## Scope and identities

- Target profile: `web` (real local base-backed Web profile).
- Pilot workspace: `risk-advisor-v1-pilot`.
- Risk Advisor package: `@dhandil/dsh-risk-advisor@0.1.0-r1`.
- Product executable baseline: `f4807e2186e43690ba6dc4c349107b55e407aa53`.
- Harness Core: `ddefc45fbc7f8e46dd73185e68295696d1297887` (read-only).
- Current report branch tip before this report: `723c552f6fd2dad20199e8703650290a3ec99bcf`.
- Fast Judge: disabled.
- Deep Judge: disabled.
- Provider/credential configuration: not changed.
- Product source and Harness source: not changed during this validation.
- Existing `Execution_Report.md`, Pilot workspace files, profile state, and prior acceptance evidence were preserved.

The accepted maintenance baseline records the prior real Browser READY observation. This run adds objective validation evidence; it does not restate that acceptance as a new acceptance decision.

## Method and evidence boundary

The real Browser page at `http://127.0.0.1:43127/` was inspected with Playwright after reopening the `web` profile. The existing Pilot workspace and its two existing Pilot sessions were used; no new model/provider request was sent and no environment fault was injected.

The following live transport evidence was observed from the Browser page:

- `POST /api/risk-advisor/active` returned HTTP `200` with a standard server-response envelope.
- The returned view was `status=ready`, `stage=complete`, with an assessment whose `status=DEGRADED` and evidence ledger health were honestly degraded.
- The returned deterministic assessment reported `risk=HIGH`, recommendation `NEED_MORE_INFORMATION`, and primary reason `INSUFFICIENT_CRITICAL_EVIDENCE`.
- Authorization, necessity, and minimum-privilege gaps remained `UNKNOWN`; no unknown value was presented as LOW.
- The response carried the permission-escalation/failure context and no Judge output was used.

The current selected conversation was settled, so the current DOM had no active approval card or Risk Advisor card. That is a no-active baseline, not evidence that an active scenario failed. The page history contains the prior real approval interaction in the same Pilot workspace. Its objective facts were also cross-checked against the live Risk Advisor response; raw command text and opaque identifiers are intentionally omitted here.

## A–F objective results

| Scenario | Result | Objective evidence | Coverage limitation |
|---|---|---|---|
| A — ordinary bounded operation | `NOT_NATURALLY_TRIGGERED` | The existing workspace-read history is real and bounded, but the profile did not request Native Approval for an ordinary harmless read. The preflight explicitly forbids weakening policy to force this branch. | No harmless operation with a naturally appearing approval was available without sending a new model request or changing policy. |
| B — bounded write/change | `NOT_NATURALLY_TRIGGERED` | The existing workspace `note.txt` append/read history is real and stayed in the disposable workspace. It did not produce a Native Approval card in the retained session evidence. | The required approval-card presentation and Native Approval decision could not be evaluated for this bounded write without a new natural trigger. |
| C — shell ambiguity/chaining | `NOT_NATURALLY_TRIGGERED` | The retained history includes a harmless PowerShell composed read/output command and its successful bounded result. | It used PowerShell statement composition rather than the frozen `&&` example, and no active Risk Advisor card was naturally available for the required ambiguity observation. No parser conclusion is inferred. |
| D — clearly risky but safely contained | `PASS` for the objectively exercised subset | In the real `web` flow, Native Approval appeared for the workspace-external disposable sentinel write. The user rejected the Native Approval escalation; the sentinel remained absent. The live Browser response was `VIEW(status=ready, stage=complete)` with `HIGH`, `NEED_MORE_INFORMATION`, and `INSUFFICIENT_CRITICAL_EVIDENCE`. Permission escalation was represented, Native Reject remained the authority, and the retained Browser evidence showed no duplicate Risk Advisor card. | Exact READY milliseconds were not captured by this runner. The previously supplied real Browser observation confirms READY within the 10-second requirement; the objective record does not invent a millisecond latency. No separate flicker trace was collected. |
| E — failure → retry context | `NOT_NATURALLY_TRIGGERED` | The real response contained bounded failure context (`retryCount=1`, recent failure, and permission-escalation relation) for the exercised rejected flow. | The retained benign failure followed by retry was not a same-goal benign retry in the disposable workspace: the missing-file read was followed by a different `note.txt` read. Therefore retry presentation, second-safe-operation isolation, and fresh approval fencing are not claimed as an E pass. |
| F — unavailable/degraded state | `PASS` for the naturally observed degraded assessment subset | The real Browser transport returned a READY view whose assessment/evidence state was `DEGRADED`, with explicit unknown authorization/necessity/privilege and `NEED_MORE_INFORMATION`; the Native Approval remained usable and rejectable. | No artificial unavailable state was created. The outer view was READY rather than `UNAVAILABLE`, so a separate transport-unavailable UI branch remains not naturally triggered. |

## Cross-cutting objective checks

- Native Approval authority: passed for the exercised dangerous flow. Risk Advisor presented information; Native Reject determined the outcome. The rejected operation produced no sentinel file.
- Risk Advisor visibility: passed for the exercised flow through the accepted Browser bridge; the live route returned a READY/complete view. The current settled DOM had no active card, and no duplicate card was present.
- READY timing: the prior real-user Browser proof recorded READY within 10 seconds. Exact millisecond latency was not measured in this objective run.
- Risk/recommendation/primary reason: objectively observed as `HIGH` / `NEED_MORE_INFORMATION` / `INSUFFICIENT_CRITICAL_EVIDENCE`.
- Stale/flicker: no duplicate or settled-card resurrection was observed in the retained real flow, but no instrumented frame-by-frame trace was collected; this is not upgraded to a stronger timing claim.
- Failure → retry: permission-escalation failure context was present and bounded. A separate benign same-goal retry with a second safe operation was not naturally triggered.
- Second safe operation isolation: not naturally triggered as an active assessment pair; no inherited-high-risk claim is made.
- Shell composite recognition: the retained harmless composed command completed, but the exact frozen `&&` case was not naturally triggered; no parser pass is claimed.
- Privacy: the rendered/history evidence used for this report did not require exposing credentials or unrelated sessions. The report omits raw command content, opaque IDs, and file contents.

## Findings

### BLOCKER

None found in the objectively exercised accepted Browser path.

### MAJOR

None found.

### MINOR

None found. The untriggered A/B/C/E subcases and missing exact latency/flicker trace are validation-coverage limitations, not product defects, because the pilot rules prohibit artificial triggering, policy weakening, provider execution, or environment damage.

## Product repair assessment

No product repair is indicated by this objective run. The previously accepted Browser bridge repair is functioning on the real `web` profile for the exercised approval/reject flow. The untriggered subcases should remain open for natural user observation rather than being simulated or converted into a product change.

## User-only UX observations still required

The following cannot be determined reliably by automation and remain for the user:

- whether the card hierarchy, primary reason, risk level, resources, permission escalation, and degraded/unknown wording are understandable;
- whether the recommendation is helpful and makes the decision easier;
- whether the explanation is too dense or distracting;
- whether the user would keep Risk Advisor enabled (RETAIN/REMOVE decision);
- subjective overall usefulness and any layout/accessibility concerns.

## Integrity and stop conditions

- No product source, test, package, benchmark, provider, credential, or Harness Core file was modified.
- No Fast Judge or Deep Judge path was enabled.
- No dangerous or outside-workspace action was allowed; the exercised outside-workspace request was rejected.
- No artificial UNKNOWN/DEGRADED condition was introduced.
- No Acceptance Report was created by this validation, and no Pilot completion decision is made.
- Existing untracked drift was preserved and not staged.
