import type { OnlineCorrectionConnectionLike } from './online-correction-store.ts'
import { OnlineCorrectionStore } from './online-correction-store.ts'
import { createOnlineCorrectionBridgeClient } from './online-correction-bridge.ts'

/** Owns only ephemeral read stores for currently mounted Session docks. */
export class OnlineCorrectionClient {
  private readonly bridge: ReturnType<typeof createOnlineCorrectionBridgeClient>
  private readonly stores = new Set<OnlineCorrectionStore>()
  private disposed = false

  constructor(private readonly connection: OnlineCorrectionConnectionLike) {
    this.bridge = createOnlineCorrectionBridgeClient(connection.rpc)
  }

  createStore(sessionId: string): OnlineCorrectionStore {
    const store = new OnlineCorrectionStore(this.bridge, sessionId, this.connection, {}, disposedStore => {
      this.stores.delete(disposedStore)
    })
    this.stores.add(store)
    if (this.disposed) store.dispose()
    return store
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const store of [...this.stores]) store.dispose()
    this.stores.clear()
  }
}
