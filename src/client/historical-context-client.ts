import type { RuntimeRiskConnectionLike } from './runtime-risk-store.ts'
import { createHistoricalContextBridgeClient } from './historical-context-bridge.ts'
import { HistoricalContextStore } from './historical-context-store.ts'

interface Entry { readonly store: HistoricalContextStore; refs: number }

/** Owns a stable optional read source per Session; getSource is render-pure. */
export class HistoricalContextClient {
  private readonly bridge: ReturnType<typeof createHistoricalContextBridgeClient>
  private readonly stores = new Map<string, Entry>()
  private disposed = false

  constructor(private readonly connection: RuntimeRiskConnectionLike) {
    this.bridge = createHistoricalContextBridgeClient(connection.rpc)
  }

  getSource(sessionId: string): HistoricalContextStore {
    return this.entryFor(sessionId).store
  }

  retain(sessionId: string): void {
    const entry = this.entryFor(sessionId)
    entry.refs += 1
    if (entry.refs === 1) entry.store.start()
  }

  setTarget(sessionId: string, target: { readonly executionId: string; readonly assessmentId: string } | undefined): void {
    this.stores.get(sessionId)?.store.setTarget(target === undefined ? undefined : { sessionId, ...target })
  }

  release(sessionId: string): void {
    const entry = this.stores.get(sessionId)
    if (entry === undefined || entry.refs === 0) return
    entry.refs -= 1
    if (entry.refs === 0) entry.store.stop()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const entry of this.stores.values()) entry.store.dispose()
    this.stores.clear()
  }

  private entryFor(sessionId: string): Entry {
    if (this.disposed) throw new Error('historical context client disposed')
    const existing = this.stores.get(sessionId)
    if (existing !== undefined) return existing
    const entry = { store: new HistoricalContextStore(this.bridge, sessionId, this.connection), refs: 0 }
    this.stores.set(sessionId, entry)
    return entry
  }
}
