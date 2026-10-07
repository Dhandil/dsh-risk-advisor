# Risk Advisor Phase 12.2 — Architecture Review

## Verdict

`RISK_ADVISOR_PHASE12_2_REVIEW_BLOCKED_REPAIR1_AUTHORIZED`

Phase 12.2 source/provenance review found one Client lifecycle defect. The implementation is not yet eligible for Full.

## Reviewed provenance

- Architecture baseline: `b40ad80b804677592895d69bfecfebb7d564df08`
- Exact candidate: `8a4ead5e838eef74fbd04e9e0cea4f82ca96a4e5`
- Report-only commit: `5932ace075b8ada8e937b6d56b9e30bc9aaaeaf6`
- Pinned Harness: `ddefc45fbc7f8e46dd73185e68295696d1297887`

Baseline -> candidate is one executable commit. Candidate -> report is exactly one docs-only file.

The main Phase 12.2 authority, contract, privacy, Host bridge, polling, stale-state, slot, and UI boundaries are otherwise consistent with the Freeze.

## Defect

`OnlineCorrectionDock` currently allocates a store during React render:

```tsx
const store = useMemo(
  () => onlineCorrectionClient.createStore(sessionId),
  [onlineCorrectionClient, sessionId],
)
```

`createStore()` immediately:
- inserts the store into the long-lived `OnlineCorrectionClient.stores` Set;
- constructs `OnlineCorrectionStore`, whose constructor immediately subscribes to connection-generation changes.

If React invokes the render but never commits it (concurrent abandoned render, StrictMode render probing, or equivalent), the effect cleanup is never installed. That store remains retained by the Client and its connection-generation subscription remains live until whole-client disposal.

Repeated abandoned/remounted renders can therefore accumulate hidden stores/subscriptions unrelated to mounted advisory docks.

This violates the intended ownership rule that the advisory read lifecycle exists only while the Session surface is retained.

## Comparison with accepted existing pattern

The existing Phase 6 presentation path uses a stable source identity plus commit-phase ownership:

```
client.getSource(key)     // stable cached source
useEffect:
  client.retain(key)
  return client.release(key)
```

Phase 12.2 should follow the same ownership discipline, while also moving connection-generation subscription behind Store start/stop so an abandoned source lookup has no external subscription side effect.

## Next step

Apply only `Phase12_2_Repair1_Client_Lifecycle_Amendment.md`.

Do not run complete `pnpm test`.
Do not start any follow-on phase.
