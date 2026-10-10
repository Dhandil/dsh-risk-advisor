import { createApprovalHistoricalContextBridgeClient } from './approval-historical-context-bridge.ts'
import type { RuntimeRiskConnectionLike } from './runtime-risk-store.ts'
import { ApprovalHistoricalContextStore } from './approval-historical-context-store.ts'

const MAX_STORES = 64
interface Entry { readonly store: ApprovalHistoricalContextStore; refs: number; touched: number }

/** Bounded optional history sources for mounted native approval detail entries. */
export class ApprovalHistoricalContextClient {
  private readonly bridge: ReturnType<typeof createApprovalHistoricalContextBridgeClient>
  private readonly stores = new Map<string, Entry>()
  private disposed = false
  private sequence = 0

  constructor(private readonly connection: RuntimeRiskConnectionLike) {
    this.bridge = createApprovalHistoricalContextBridgeClient(connection.rpc)
  }

  getSource(sessionId: string, callId: string): ApprovalHistoricalContextStore {
    return this.entryFor(sessionId, callId).store
  }

  retain(sessionId: string, callId: string): void {
    const entry = this.entryFor(sessionId, callId)
    entry.refs += 1
    entry.touched = ++this.sequence
    if (entry.refs === 1) entry.store.start()
  }

  setTarget(sessionId: string, callId: string, clientKey: string | undefined): void {
    this.stores.get(keyOf(sessionId, callId))?.store.setTarget(clientKey)
  }

  clearTarget(sessionId: string, callId: string, clientKey: string): void {
    this.stores.get(keyOf(sessionId, callId))?.store.clearTarget(clientKey)
  }

  release(sessionId: string, callId: string): void {
    const entry = this.stores.get(keyOf(sessionId, callId))
    if (entry === undefined || entry.refs === 0) return
    entry.refs -= 1
    entry.touched = ++this.sequence
    if (entry.refs === 0) entry.store.stop()
    this.pruneIdle()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const entry of this.stores.values()) entry.store.dispose()
    this.stores.clear()
  }

  private entryFor(sessionId: string, callId: string): Entry {
    if (this.disposed) throw new Error('approval historical context client disposed')
    const key = keyOf(sessionId, callId)
    const existing = this.stores.get(key)
    if (existing !== undefined) { existing.touched = ++this.sequence; return existing }
    this.pruneIdle()
    if (this.stores.size >= MAX_STORES) throw new Error('approval historical context store capacity reached')
    const entry = { store: new ApprovalHistoricalContextStore(this.bridge, sessionId, callId, this.connection), refs: 0, touched: ++this.sequence }
    this.stores.set(key, entry)
    return entry
  }

  private pruneIdle(): void {
    if (this.stores.size < MAX_STORES) return
    const idle = [...this.stores.entries()].filter(([, entry]) => entry.refs === 0).sort((a, b) => a[1].touched - b[1].touched)
    while (this.stores.size >= MAX_STORES && idle.length > 0) {
      const [key, entry] = idle.shift()!
      entry.store.dispose()
      this.stores.delete(key)
    }
  }
}

function keyOf(sessionId: string, callId: string): string { return `${sessionId}\u0000${callId}` }
