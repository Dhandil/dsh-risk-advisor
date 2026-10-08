# Risk Advisor Phase 13.3 — V2 Readiness Validation Blocker Architecture Review

## Verdict

`RISK_ADVISOR_PHASE13_3_V2_READINESS_VALIDATION_BLOCKER_CONFIRMED`

The v2 stop is a validation/readiness instrumentation defect, not a Risk Advisor Product defect and not a DeepSeek provider failure.

## Reported evidence

- main baseline: `97c3553c3935218341c3ef69afdfc1880e133335`
- local docs-only v2 report commit: `209b76558d0140e90cca2a3b0a8317990f9057d6`
- pinned Harness dependency hydration: PASS
- pinned Harness SHA: unchanged
- Harness tracked tree: clean
- `eventsource-parser@3.1.0`: resolvable
- v2 manifest replay: byte-identical
- v2 manifest SHA-256:
  `dc43f322c2c6b0e8ffe40326a4eb31fe3aea1912d2a692ef9a27c65a895f1200`

The single readiness provider request was issued.

The temporary readiness reader then threw a `TypeError` because it read provider stream data through an incorrect `chunk.delta` field.

No readiness retry occurred.

Canonical campaign execution did not start:

- canonical tasks: 0
- canonical Sessions: 0
- Tool executions: 0

## Classification

The failure occurred after provider request dispatch but inside validation-owned response consumption.

Therefore it is:

`VALIDATION_READINESS_STREAM_CONSUMER_DEFECT`

It is not evidence that:

- `deepseek-official` is unavailable;
- `deepseek-v4-flash` failed;
- reasoning=`low` is unsupported;
- Risk Advisor emitted an incorrect Finding;
- Harness ToolRuntime failed.

## Architecture decision

The readiness probe MUST NOT implement its own provider-chunk schema parser.

Do not repair this by replacing `chunk.delta` with another guessed field.

Instead, readiness must use the same pinned Harness public Agent/provider response-consumption path that canonical Agent execution uses.

Validation may observe only the assembled/public completion result and public provider/model identity.

Raw provider stream chunk structure is not validation authority.

## V2 identity

Do not reuse:

`phase13-real-agent-canonical-v2`

Its single allowed readiness request has already been consumed and its blocked preflight is preserved as historical evidence.

## V3

The next canonical identity is:

`phase13-real-agent-canonical-v3`

No Product repair is authorized.

No Harness source repair is authorized.

No accepted F1/F2 truth change is authorized.
