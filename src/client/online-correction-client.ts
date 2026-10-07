import type { OnlineCorrectionConnectionLike } from './online-correction-store.ts'
import { OnlineCorrectionStore } from './online-correction-store.ts'
import { createOnlineCorrectionBridgeClient } from './online-correction-bridge.ts'

interface Entry { readonly store: OnlineCorrectionStore; refs: number }

/** Owns one ephemeral read source per Session with commit-phase refcounts. */
export class OnlineCorrectionClient {
  private readonly bridge: ReturnType<typeof createOnlineCorrectionBridgeClient>
  private readonly stores = new Map<string, Entry>()
  private disposed = false

  constructor(private readonly connection: OnlineCorrectionConnectionLike) {
    this.bridge = createOnlineCorrectionBridgeClient(connection.rpc)
  }

  /** Render-pure source lookup. It never starts polling or claims ownership. */
  getSource(sessionId: string): OnlineCorrectionStore {
    return this.entryFor(sessionId).store
  }

  /** Commit-phase ownership. Each retain must have a matching release. */
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
    if (this.disposed) throw new Error('online correction client disposed')
    const existing = this.stores.get(sessionId)
    if (existing !== undefined) return existing
    const entry = {
      store: new OnlineCorrectionStore(this.bridge, sessionId, this.connection),
      refs: 0,
    }
    this.stores.set(sessionId, entry)
    return entry
  }
}
