import type { CorrectionNextCheckStoreSnapshot } from './correction-next-check-store.ts'
import { CorrectionNextCheckStore } from './correction-next-check-store.ts'
import type { CorrectionNextCheckConnectionLike } from './correction-next-check-store.ts'
import { createCorrectionNextCheckBridgeClient } from './correction-next-check-bridge.ts'

export const CORRECTION_NEXT_CHECK_MAX_SESSION_STORES = 64
export const CORRECTION_NEXT_CHECK_IDLE_RETENTION_MS = 60_000

export interface CorrectionNextCheckStoreSource {
  readonly getSnapshot: CorrectionNextCheckStore['getSnapshot']
  readonly subscribe: CorrectionNextCheckStore['subscribe']
}

export interface CorrectionNextCheckClientOptions {
  /** Test seams may lower limits, never raise the frozen production bounds. */
  readonly maxStores?: number
  readonly idleRetentionMs?: number
  readonly setTimer?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  readonly clearTimer?: (timer: ReturnType<typeof setTimeout>) => void
}

interface Entry {
  readonly sessionId: string
  readonly store: CorrectionNextCheckStore
  refs: number
  lastUsed: number
  idleTimer: ReturnType<typeof setTimeout> | undefined
}

const EMPTY_SNAPSHOT: CorrectionNextCheckStoreSnapshot = Object.freeze({ status: 'EMPTY' })
const DISABLED_SOURCE: CorrectionNextCheckStoreSource = Object.freeze({
  getSnapshot: () => EMPTY_SNAPSHOT,
  subscribe: (_listener: () => void) => () => undefined,
})

/** Bounded optional Client; it owns no unbounded per-Session state. */
export class CorrectionNextCheckClient {
  private readonly bridge: ReturnType<typeof createCorrectionNextCheckBridgeClient> | undefined
  private readonly stores = new Map<string, Entry>()
  private readonly maxStores: number
  private readonly idleRetentionMs: number
  private readonly setTimer: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  private readonly clearTimer: (timer: ReturnType<typeof setTimeout>) => void
  private sequence = 0
  private disposed = false

  constructor(private readonly connection: CorrectionNextCheckConnectionLike, options: CorrectionNextCheckClientOptions = {}) {
    const max = options.maxStores
    this.maxStores = max === undefined || !Number.isFinite(max)
      ? CORRECTION_NEXT_CHECK_MAX_SESSION_STORES
      : Math.max(1, Math.min(CORRECTION_NEXT_CHECK_MAX_SESSION_STORES, Math.floor(max)))
    const idle = options.idleRetentionMs
    this.idleRetentionMs = idle === undefined || !Number.isFinite(idle)
      ? CORRECTION_NEXT_CHECK_IDLE_RETENTION_MS
      : Math.max(0, Math.min(CORRECTION_NEXT_CHECK_IDLE_RETENTION_MS, Math.floor(idle)))
    this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay))
    this.clearTimer = options.clearTimer ?? (timer => clearTimeout(timer))
    try { this.bridge = createCorrectionNextCheckBridgeClient(connection.rpc) }
    catch { this.bridge = undefined }
  }

  getSource(sessionId: string): CorrectionNextCheckStoreSource {
    return this.entryFor(sessionId)?.store ?? DISABLED_SOURCE
  }

  setFinding(sessionId: string, findingId: string | undefined): boolean {
    if (this.disposed) return false
    const entry = this.stores.get(sessionId)
    if (entry === undefined) return false
    entry.lastUsed = ++this.sequence
    try { entry.store.setFinding(findingId); return true }
    catch { this.retire(entry); return false }
  }

  retain(sessionId: string): boolean {
    if (this.disposed) return false
    const entry = this.stores.get(sessionId)
    if (entry === undefined) return false
    if (entry.idleTimer !== undefined) {
      try { this.clearTimer(entry.idleTimer) } catch { this.retire(entry); return false }
      entry.idleTimer = undefined
    }
    entry.lastUsed = ++this.sequence
    if (entry.refs === 0) {
      try { entry.store.start() } catch { this.retire(entry); return false }
    }
    entry.refs += 1
    return true
  }

  release(sessionId: string): boolean {
    const entry = this.stores.get(sessionId)
    if (entry === undefined || entry.refs === 0) return false
    entry.refs -= 1
    entry.lastUsed = ++this.sequence
    if (entry.refs > 0) return true
    try { entry.store.stop() } catch { this.retire(entry); return false }
    if (this.idleRetentionMs === 0) this.retire(entry)
    else {
      try {
        entry.idleTimer = this.setTimer(() => {
          if (this.stores.get(sessionId) === entry && entry.refs === 0) this.retire(entry)
        }, this.idleRetentionMs)
      } catch { this.retire(entry); return false }
    }
    return true
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    for (const entry of [...this.stores.values()]) this.retire(entry)
    this.stores.clear()
  }

  private entryFor(sessionId: string): Entry | undefined {
    if (this.disposed || this.bridge === undefined) return undefined
    const existing = this.stores.get(sessionId)
    if (existing !== undefined) { existing.lastUsed = ++this.sequence; return existing }
    while (this.stores.size >= this.maxStores && this.evictLeastRecentlyUsedIdle()) { /* reclaim only idle sources */ }
    if (this.stores.size >= this.maxStores) return undefined
    let store: CorrectionNextCheckStore
    try { store = new CorrectionNextCheckStore(this.bridge, sessionId, this.connection) }
    catch { return undefined }
    const entry: Entry = { sessionId, store, refs: 0, lastUsed: ++this.sequence, idleTimer: undefined }
    this.stores.set(sessionId, entry)
    return entry
  }

  private evictLeastRecentlyUsedIdle(): boolean {
    let candidate: Entry | undefined
    for (const entry of this.stores.values()) {
      if (entry.refs !== 0) continue
      if (candidate === undefined || entry.lastUsed < candidate.lastUsed) candidate = entry
    }
    if (candidate === undefined) return false
    this.retire(candidate)
    return true
  }

  private retire(entry: Entry): void {
    if (this.stores.get(entry.sessionId) === entry) this.stores.delete(entry.sessionId)
    if (entry.idleTimer !== undefined) {
      try { this.clearTimer(entry.idleTimer) } catch { /* optional cleanup is isolated */ }
      entry.idleTimer = undefined
    }
    try { entry.store.dispose() } catch { /* optional cleanup cannot affect F1/F2 */ }
  }
}
