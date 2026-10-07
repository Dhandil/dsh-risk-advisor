# Risk Advisor Phase 13.1 — Implementation Instructions

Current main:
`862a5b117bab3e5af12371aed32380747f964bc4`

Accepted product executable:
`28d3d204376da0a43279b949a3ceea794212d10c`

Pinned Harness:
`ddefc45fbc7f8e46dd73185e68295696d1297887`

Implement exactly:

`docs/tasks/Phase13-runtime-validation-defect-discovery/Phase13_1_Validation_Harness_Truth_Contract_Freeze.md`

Only add validation infrastructure under `validation/phase13/`.

Do not modify:
- `src/`;
- existing product tests;
- package/lock/tsconfig/bundle config;
- benchmarks;
- Harness Core.

Core requirements:

- deterministic manifest + seed replay;
- independent oracle with strict no-product-import firewall;
- validation probe mounted after Risk Advisor using public correlation lookup;
- public Live Correction/Verification diagnostics only;
- F1 synchronous grading;
- F2 DIRECT/ASYNC_SUPPORTED settlement, 15s max for serial Lane A;
- append-only hash-chained JSONL truth ledger;
- fail-closed disposable workspace manager;
- TP/FP/FN/TN + NA/UNSCORABLE summary;
- stop on deterministic P1/capture/ledger/containment blocker;
- minimal local reproducer;
- H1-H18;
- bounded smoke <=100 Tool executions.

Run focused H1-H18 + smoke, Phase12.1/12.2, P3, P7, relevant P10 boundary/lifecycle/privacy checks.

Do not run complete `pnpm test`.
Do not run Phase 13.2 high-volume campaign.
Do not call a real provider/model.

Publish exact candidate + separate docs-only report.

Final token:

`RISK_ADVISOR_PHASE13_1_READY_FOR_ARCHITECTURE_REVIEW`
