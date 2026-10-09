import type { RuntimeRiskConnectionLike } from './runtime-risk-store.ts'
import { RuntimeRiskStore } from './runtime-risk-store.ts'
import { createRuntimeRiskBridgeClient } from './runtime-risk-bridge.ts'

interface Entry { readonly store: RuntimeRiskStore; refs: number }

/** Owns one render-pure, session-scoped source and its effect-phase lifetime. */
export class RuntimeRiskClient {
  private readonly bridge: ReturnType<typeof createRuntimeRiskBridgeClient>
  private readonly stores = new Map<string, Entry>()
  private disposed = false

  constructor(private readonly connection: RuntimeRiskConnectionLike) {
    this.bridge = createRuntimeRiskBridgeClient(connection.rpc)
  }

  getSource(sessionId: string): RuntimeRiskStore {
    return this.entryFor(sessionId).store
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

  refresh(sessionId: string): void { this.stores.get(sessionId)?.store.refreshNow() }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const entry of this.stores.values()) entry.store.dispose()
    this.stores.clear()
  }

  private entryFor(sessionId: string): Entry {
    if (this.disposed) throw new Error('runtime risk client disposed')
    const existing = this.stores.get(sessionId)
    if (existing !== undefined) return existing
    const entry = { store: new RuntimeRiskStore(this.bridge, sessionId, this.connection), refs: 0 }
    this.stores.set(sessionId, entry)
    return entry
  }
}
