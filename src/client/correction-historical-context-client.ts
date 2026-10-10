import type { CorrectionHistoricalContextConnectionLike } from './correction-historical-context-store.ts'
import { CorrectionHistoricalContextStore } from './correction-historical-context-store.ts'
import { createCorrectionHistoricalContextBridgeClient } from './correction-historical-context-bridge.ts'

interface Entry { readonly store: CorrectionHistoricalContextStore; refs: number }

/** Owns one optional history source per retained Session. */
export class CorrectionHistoricalContextClient {
  private readonly bridge: ReturnType<typeof createCorrectionHistoricalContextBridgeClient>
  private readonly stores = new Map<string, Entry>()
  private disposed = false

  constructor(private readonly connection: CorrectionHistoricalContextConnectionLike) {
    this.bridge = createCorrectionHistoricalContextBridgeClient(connection.rpc)
  }

  getSource(sessionId: string): CorrectionHistoricalContextStore {
    return this.entryFor(sessionId).store
  }

  setFinding(sessionId: string, findingId: string | undefined): void {
    this.entryFor(sessionId).store.setFinding(findingId)
  }

  retain(sessionId: string): void {
    const entry = this.entryFor(sessionId)
    entry.refs += 1
    if (entry.refs === 1) entry.store.start()
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
    if (this.disposed) throw new Error('correction historical context client disposed')
    const existing = this.stores.get(sessionId)
    if (existing !== undefined) return existing
    const entry = { store: new CorrectionHistoricalContextStore(this.bridge, sessionId, this.connection), refs: 0 }
    this.stores.set(sessionId, entry)
    return entry
  }
}
