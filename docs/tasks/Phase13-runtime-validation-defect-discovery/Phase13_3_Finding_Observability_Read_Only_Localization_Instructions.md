# Phase 13.3 — Finding Observability Read-Only Localization Instructions

Status: `RISK_ADVISOR_PHASE13_3_FINDING_OBSERVABILITY_LOCALIZATION_AUTHORIZED_READ_ONLY`

## Preflight

- Push unchanged the current local V2 report commit `ac59b834cff446fe5d823a9ea37a9af4ef2bd9e7` on its existing branch; verify exact docs-only report diff relative to main `eabf23fe04b635118eead60190ba8cad194d67b4`.
- Sync current main and read `Phase13_3_Real_Harness_V2_Finding_Observability_Architecture_Review.md`.

## Scope

No new real tasks, no model/provider request, no task rerun, no Harness restart, no private/raw credential access, no manual Tool execution.

Only inspect existing code, already captured sanitized trace/evidence, Session metadata and available normal public UI/bridge observations. Do not create a new public API or a custom Host/Agent/provider wrapper.

Trace the actual native Product chain:

`Tool event -> correlation/verification -> LiveCorrectionRuntime -> Host OnlineCorrection bridge -> Client store -> OnlineCorrectionDock`.

Distinguish event **absence**, transient Finding **lifetime**, bridge/client **availability**, and **insufficient grading evidence**.

Key existing paths:

- `src/index.ts`
- `src/host/live-correction.ts`
- `src/host/online-correction-bridge.ts`
- `src/client/online-correction-store.ts`
- `src/client/OnlineCorrectionDock.tsx`
- `src/online-correction-contract.ts`

For 20 Sessions, report aggregate outcomes and whether F1/F2 truth is independently scorable. Never convert unknowns to true negatives; do not equate blank dock/chat transcript with no generated Finding.

Three awaiting clarification remain incomplete/pending; do not prompt additional user messages under this task.

Commit only a bounded docs-only localization report, no raw prompts, private paths, URLs/tokens or transcript dumps.

Outcomes:

- `RISK_ADVISOR_PHASE13_3_OBSERVABILITY_LOCALIZATION_READY_FOR_ARCHITECTURE_REVIEW`
- `RISK_ADVISOR_PHASE13_3_OBSERVABILITY_LOCALIZATION_EVIDENCE_INSUFFICIENT`

No Product repair or new campaign execution is authorized.
