# Risk Advisor Phase 12.2 — Repair1 Client Lifecycle Amendment

## Status

`RISK_ADVISOR_PHASE12_2_REVIEW_BLOCKED_REPAIR1_AUTHORIZED`

## Goal

Repair only Online Correction Client/store ownership so React render is not an ownership boundary.

## Frozen ownership model

`OnlineCorrectionClient` must own one stable Store per `sessionId`.

Recommended interface:

```ts
getSource(sessionId: string): OnlineCorrectionStore
retain(sessionId: string): void
release(sessionId: string): void
dispose(): void
```

Internal map:

```
sessionId -> { store, refs }
```

Rules:

1. `getSource(sessionId)` returns the same Store for the same session while the Client generation is alive.
2. `getSource` MUST NOT start polling.
3. `getSource` MUST NOT establish a connection-generation subscription.
4. First `retain(sessionId)` starts the Store.
5. Additional retain calls do not start duplicate polling/subscriptions.
6. Final matching `release(sessionId)` stops the Store, aborts in-flight read, clears timers/current browser view, and releases its connection-generation subscription.
7. A later retain may restart the same Store cleanly.
8. Client `dispose()` disposes all cached stores and clears the map.
9. Session A/B ownership is independent.

## Store lifecycle

Move connection-generation subscription ownership out of the Store constructor.

Constructor may capture the connection reference, but must have no external subscription/timer/request side effect.

On first `start()`:
- snapshot current connection generation if available;
- subscribe to generation changes;
- begin the existing read/poll lifecycle.

On `stop()`:
- unsubscribe generation listener;
- abort request;
- clear timer / refresh state;
- publish EMPTY as already frozen.

On restart:
- take a fresh generation snapshot and re-subscribe exactly once.

Existing one-in-flight, stale fencing, NOT_FOUND/unavailable recovery, snapshot dedupe, and 1s cadence semantics remain unchanged.

## Dock ownership

`OnlineCorrectionDock` must follow commit-phase retain/release:

```tsx
const store = onlineCorrectionClient.getSource(sessionId)

useEffect(() => {
  onlineCorrectionClient.retain(sessionId)
  return () => onlineCorrectionClient.release(sessionId)
}, [onlineCorrectionClient, sessionId])
```

Do not allocate/register a new client-owned Store from a render-only `useMemo` factory.

## Scope exclusions

Do not change:
- wire contract/DTO;
- Host bridge;
- Phase 12.1 diagnostics or Finding semantics;
- slot identity/order;
- advisory text;
- UI latest-three/degradation behavior;
- Approval/Risk;
- Pattern/Guidance/model/Agent boundaries;
- persistence;
- Harness Core.

## Required Repair1 proofs

- **L1 Stable source:** repeated `getSource(sessionId)` returns the same Store.
- **L2 Render-only lookup:** `getSource` alone starts no poll and creates no connection-generation subscription.
- **L3 First/last ownership:** first retain starts exactly one poll/subscription; final release aborts/stops/unsubscribes and clears view.
- **L4 Refcount:** multiple retain calls do not duplicate polling/subscription; only final release stops.
- **L5 Restart:** retain after full release cleanly re-subscribes and polls once.
- **L6 Session isolation:** different sessions own independent stores/refcounts.
- **L7 Client disposal:** disposes all active/inactive cached stores and leaves zero generation subscriptions/in-flight reads/timers.
- **L8 Dock commit boundary:** component uses stable source + effect retain/release and no render-time `createStore`.
- **L9 Regression:** U1-U22 remain PASS.

## Verification boundary

Run:
1. Phase 12.2 focused U1-U22 + L1-L9;
2. Phase 12.1 focused;
3. P1c;
4. P6;
5. relevant P10 client/HMR/lifecycle/package/boundary checks;
6. typecheck/build/declarations/package/static gates.

Do not run complete `pnpm test`.

After Repair1 source/provenance review passes, final review may authorize exactly one fresh Full on the repaired exact candidate.
