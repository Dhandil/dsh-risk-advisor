import type { CorrectionHistoricalContextConnectionLike } from './correction-historical-context-store.ts'
import { CorrectionHistoricalContextStore } from './correction-historical-context-store.ts'
import { createCorrectionHistoricalContextBridgeClient } from './correction-historical-context-bridge.ts'

export const CORRECTION_HISTORICAL_CONTEXT_MAX_SESSION_STORES = 64
export const CORRECTION_HISTORICAL_CONTEXT_IDLE_RETENTION_MS = 60_000

export interface CorrectionHistoricalContextStoreSource {
  readonly getSnapshot: CorrectionHistoricalContextStore['getSnapshot']
  readonly subscribe: CorrectionHistoricalContextStore['subscribe']
}

export interface CorrectionHistoricalContextClientOptions {
  /** Test seams may lower this bound; production callers cannot raise it. */
  readonly maxStores?: number
  readonly idleRetentionMs?: number
  readonly setTimer?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  readonly clearTimer?: (timer: ReturnType<typeof setTimeout>) => void
}

interface Entry {
  readonly sessionId: string
  readonly store: CorrectionHistoricalContextStore
  refs: number
  lastUsed: number
  idleTimer: ReturnType<typeof setTimeout> | undefined
}

const EMPTY_SNAPSHOT = Object.freeze({ status: 'EMPTY' as const })
const DISABLED_SOURCE: CorrectionHistoricalContextStoreSource = Object.freeze({
  getSnapshot: () => EMPTY_SNAPSHOT,
  subscribe: (_listener: () => void) => () => undefined,
})

/** Owns one optional history source per retained Session. */
export class CorrectionHistoricalContextClient {
  private readonly bridge: ReturnType<typeof createCorrectionHistoricalContextBridgeClient> | undefined
  private readonly stores = new Map<string, Entry>()
  private readonly maxStores: number
  private readonly idleRetentionMs: number
  private readonly setTimer: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  private readonly clearTimer: (timer: ReturnType<typeof setTimeout>) => void
  private sequence = 0
  private disposed = false

  constructor(private readonly connection: CorrectionHistoricalContextConnectionLike, options: CorrectionHistoricalContextClientOptions = {}) {
    const requestedMax = options.maxStores
    this.maxStores = requestedMax === undefined || !Number.isFinite(requestedMax)
      ? CORRECTION_HISTORICAL_CONTEXT_MAX_SESSION_STORES
      : Math.max(1, Math.min(CORRECTION_HISTORICAL_CONTEXT_MAX_SESSION_STORES, Math.floor(requestedMax)))
    const requestedIdle = options.idleRetentionMs
    this.idleRetentionMs = requestedIdle === undefined || !Number.isFinite(requestedIdle)
      ? CORRECTION_HISTORICAL_CONTEXT_IDLE_RETENTION_MS
      : Math.max(0, Math.min(CORRECTION_HISTORICAL_CONTEXT_IDLE_RETENTION_MS, Math.floor(requestedIdle)))
    this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay))
    this.clearTimer = options.clearTimer ?? (timer => clearTimeout(timer))
    try { this.bridge = createCorrectionHistoricalContextBridgeClient(connection.rpc) }
    catch { this.bridge = undefined }
  }

  getSource(sessionId: string): CorrectionHistoricalContextStoreSource {
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
      try { entry.store.start() }
      catch { this.retire(entry); return false }
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
    try { entry.store.stop() }
    catch { this.retire(entry); return false }
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
    if (existing !== undefined) {
      existing.lastUsed = ++this.sequence
      return existing
    }
    while (this.stores.size >= this.maxStores && this.evictLeastRecentlyUsedIdle()) { /* reclaim only idle optional stores */ }
    if (this.stores.size >= this.maxStores) return undefined
    let store: CorrectionHistoricalContextStore
    try { store = new CorrectionHistoricalContextStore(this.bridge, sessionId, this.connection) }
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
      try { this.clearTimer(entry.idleTimer) } catch { /* bounded cleanup remains best-effort */ }
      entry.idleTimer = undefined
    }
    try { entry.store.dispose() } catch { /* optional client disposal cannot affect the base dock */ }
  }
}
