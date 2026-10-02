import type { ClientConnectionLike } from './presentation-store.ts'
import { PresentationStore } from './presentation-store.ts'
import { createRiskAdvisorBridgeClient, type RiskAdvisorBridgeClient } from './assessment-bridge.ts'

interface Entry { readonly store: PresentationStore; refs: number }

export class PresentationClient {
  private readonly bridge: RiskAdvisorBridgeClient
  private readonly stores = new Map<string, Entry>()
  private disposed = false

  constructor(private readonly connection: ClientConnectionLike) {
    this.bridge = createRiskAdvisorBridgeClient(connection.rpc)
  }

  acquire(sessionId: string, callId: string): PresentationStore {
    if (this.disposed) throw new Error('presentation client disposed')
    const key = `${sessionId}\u0000${callId}`
    let entry = this.stores.get(key)
    if (entry === undefined) {
      entry = { store: new PresentationStore(this.bridge, sessionId, callId, this.connection), refs: 0 }
      this.stores.set(key, entry)
      entry.store.start()
    }
    entry.refs += 1
    return entry.store
  }

  release(sessionId: string, callId: string): void {
    const key = `${sessionId}\u0000${callId}`
    const entry = this.stores.get(key)
    if (entry === undefined) return
    entry.refs -= 1
    if (entry.refs <= 0) {
      entry.store.dispose()
      this.stores.delete(key)
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const entry of this.stores.values()) entry.store.dispose()
    this.stores.clear()
  }
}
