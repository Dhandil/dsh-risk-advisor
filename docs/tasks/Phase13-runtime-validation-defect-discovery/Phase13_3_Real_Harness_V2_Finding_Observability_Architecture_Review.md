# Phase 13.3 — Real Harness V2 Finding Observability Preliminary Architecture Review

## Status

`RISK_ADVISOR_PHASE13_3_FINDING_OBSERVABILITY_LOCALIZATION_REQUIRED`

The executor reports 20 real Harness Sessions submitted, with 17 completed or safely blocked and three awaiting clarification, but no independently scorable F1/F2 Finding evidence in the ordinary UI/trace. This is a genuine real-environment coverage milestone, **not** an accepted Product accuracy result.

The executor-reported docs-only local commit `ac59b834cff446fe5d823a9ea37a9af4ef2bd9e7` is not yet remote-verifiable. Do not interpret this preliminary review as acceptance of that report, task counts, provenance or claimed Product behavior. Push and verify the exact report before further decisions.

## Read-only source findings at main `eabf23fe04b635118eead60190ba8cad194d67b4`

The accepted Product already contains a **public, session-scoped Finding delivery path**, not an ordinary chat-message persistence path:

1. `src/index.ts` installs `LiveCorrectionRuntime`, supplies `riskAdvisorLiveCorrection` diagnostics, and installs `installOnlineCorrectionBrowserBridge` when normal Harness connection/sessions capabilities are available.
2. `src/host/live-correction.ts` creates F1/F2 Finding only when their frozen conditions are met, stores them process-locally with default 5-minute TTL (64 per Session/256 globally), and deletes Session's Findings on disposal.
3. `src/host/online-correction-bridge.ts` exposes a read-only per-Session view through the normal Host Connection at `risk-advisor/online-correction`. It can return `VIEW` with zero Findings or `NOT_FOUND`; neither equals evidence of Product failure.
4. `src/client/online-correction-store.ts` polls through the existing RPC path every 1000 ms **while its Session store is retained**.
5. `src/client/OnlineCorrectionDock.tsx` renders only when an active `VIEW` contains one or more Findings or degradation reason codes. An empty state intentionally displays no dock.
6. `src/client/index.ts` registers the dock in `conversation.input.dock`; a separate approval-detail integration exists and must not be confused with live F1/F2 delivery.

Hence a later ordinary chat transcript cannot prove whether a transient Finding once existed.

## Open hypotheses (not verdicts)

- **H1 — no qualifying events**: the Agent's real Tool steps did not meet frozen contiguous F1 or verified F2-mismatch conditions. Zero Finding then may be correct, but requires an independently scorable Tool/execution truth.
- **H2 — transient evidence lost**: a Finding was generated but expired, was deleted with Session disposal, or was not retained/captured while the relevant UI Session was active.
- **H3 — Product/bridge/client issue**: qualifying Tool events occurred but Finding generation, Host bridge availability, Session mapping, polling or dock rendering failed.
- **H4 — scoring evidence insufficiency**: ordinary Harness transcripts omit normalized Tool identities/verifier settlements required for event-level F1/F2 scoring even if no Finding is expected.

Do not infer H1 from no visible dock; do not infer H3 from no visible dock either.

## Decision

**Do not replay all 20 tasks, trigger new model/provider calls, add a second Harness runner, or modify Product now.**

First do an exact report provenance check and read-only, layer-by-layer localization using **existing** report, sanitized Session traces, retained screenshots, existing public bridge/code, and available local evidence.

For every Session, distinguish:

- task completed / safety blocked / awaiting clarification;
- observable Tool count and supported operation families;
- demonstrable F1/F2 expected-positive events from independent evidence;
- actual Finding observation while active (if captured);
- `VIEW+findings`, `VIEW+empty`, `NOT_FOUND`, `UNAVAILABLE`, or unobserved/expired;
- whether a real Product FP/FN can be established or event is simply unscorable.

Three awaiting clarification must not be silently counted as completed.

If an already-ended Session has no timely Finding snapshot, do **not** call its absence TN or FN.

## Exit of localization

Produce one bounded docs-only report with:

1. exact uploaded V2 report provenance;
2. per-Session summary counts, **not** private raw transcripts;
3. which existing public data can and cannot establish F1/F2 truth;
4. first unsupported/missing link (Host capture, Finding generation, Host bridge, Client store/dock, evidence collection);
5. minimal next action choice: `NO_PRODUCT_REPAIR_NEEDED`, `TARGETED_PUBLIC_OBSERVABILITY_REPAIR_PROPOSED`, or `BOUNDED_REAL_HARNESS_PROBE_NEEDED`, with supporting evidence.

A Product repair or any new Agent task must be separately authorized after review. Do not enter Phase 13.4.
