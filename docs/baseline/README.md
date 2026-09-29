# Risk Advisor — Canonical Documentation Baseline

This directory is the cross-task canonical baseline for the frozen Risk Advisor v1.2-r1 design.

Authority order:

1. `risk-advisor-v1-architecture-v1.2.md` — technical architecture and Harness seams.
2. `risk-advisor-v1-spec-v1.2-r1.md` — product scope and safety boundaries.
3. `risk-engine-contract-v1.0-r1.md` — Risk Engine and six-dimension contract.
4. `risk-advisor-test-matrix-v1.0-r1.md` — focused regression and acceptance mapping.
5. `risk-advisor-static-preflight-v1.0.md` — static Harness verification and remaining runtime boundary.

`docs/risk-advisor-current/` is the preserved handoff/input copy. It is not a second
canonical baseline and is intentionally not duplicated into task-specific directories.
`docs/discussion/` and `docs/notes/` retain historical design material only.

The one T00 correction is the active L3 seam in the Test Matrix: current PTC durable
events are `tool/ptc-dispatch-start` and `tool/ptc-dispatch`; historical old-to-new
references remain allowed in explicitly historical text.
