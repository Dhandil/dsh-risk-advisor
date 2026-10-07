import type { BrowserOnlineCorrectionViewV1, OnlineCorrectionClientResult } from '../online-correction-contract.ts'
import type { OnlineCorrectionBridgeClient } from './online-correction-bridge.ts'

export const ONLINE_CORRECTION_POLL_INTERVAL_MS = 1000

export interface OnlineCorrectionConnectionGenerationLike {
  readonly getSnapshot: () => unknown
  readonly subscribe: (listener: () => void) => () => void
}

export interface OnlineCorrectionConnectionLike {
  readonly rpc: { readonly call: (channel: string, endpoint: string, payload: unknown, signal?: AbortSignal) => Promise<unknown> }
  readonly generation?: OnlineCorrectionConnectionGenerationLike
}

export type OnlineCorrectionStoreSnapshot =
  | { readonly status: 'EMPTY' }
  | { readonly status: 'VIEW'; readonly view: BrowserOnlineCorrectionViewV1 }
  | { readonly status: 'NOT_FOUND' }
  | { readonly status: 'UNAVAILABLE'; readonly reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' }

export interface OnlineCorrectionStoreOptions {
  readonly setTimer?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  readonly clearTimer?: (timer: ReturnType<typeof setTimeout>) => void
}

const EMPTY_SNAPSHOT: OnlineCorrectionStoreSnapshot = Object.freeze({ status: 'EMPTY' })

/** Session-scoped read poller with ephemeral snapshots only. */
export class OnlineCorrectionStore {
  private snapshot: OnlineCorrectionStoreSnapshot = EMPTY_SNAPSHOT
  private readonly listeners = new Set<() => void>()
  private readonly setTimer: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  private readonly clearTimer: (timer: ReturnType<typeof setTimeout>) => void
  private timer: ReturnType<typeof setTimeout> | undefined
  private request: AbortController | undefined
  private unsubscribeGeneration: (() => void) | undefined
  private connectionGeneration: unknown
  private started = false
  private disposed = false
  private refreshPending = false
  private storeGeneration = 0
  private requestGeneration = 0

  constructor(
    private readonly bridge: OnlineCorrectionBridgeClient,
    readonly sessionId: string,
    private readonly connection?: OnlineCorrectionConnectionLike,
    options: OnlineCorrectionStoreOptions = {},
  ) {
    this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay))
    this.clearTimer = options.clearTimer ?? (timer => clearTimeout(timer))
  }

  getSnapshot = (): OnlineCorrectionStoreSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  start(): void {
    if (this.started || this.disposed) return
    this.started = true
    this.subscribeToConnectionGeneration()
    if (this.request !== undefined) {
      this.refreshPending = true
      return
    }
    void this.readNow()
  }

  stop(): void {
    const wasStarted = this.started
    this.started = false
    if (wasStarted) {
      this.storeGeneration += 1
      this.requestGeneration += 1
    }
    this.unsubscribeGeneration?.()
    this.unsubscribeGeneration = undefined
    this.connectionGeneration = undefined
    this.clearScheduled()
    this.request?.abort()
    this.refreshPending = false
    this.publish(EMPTY_SNAPSHOT)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.listeners.clear()
    this.stop()
  }

  private async readNow(): Promise<void> {
    if (this.disposed || !this.started) return
    if (this.request !== undefined) {
      this.refreshPending = true
      return
    }
    const storeGeneration = this.storeGeneration
    const requestGeneration = ++this.requestGeneration
    const controller = new AbortController()
    this.request = controller
    let result: OnlineCorrectionClientResult
    try { result = await this.bridge.read(this.sessionId, controller.signal) }
    catch { result = Object.freeze({ kind: 'UNAVAILABLE', reason: 'TRANSPORT_UNAVAILABLE' }) }
    const current = !this.disposed && this.started && storeGeneration === this.storeGeneration
      && requestGeneration === this.requestGeneration && this.request === controller
    if (this.request === controller) this.request = undefined
    if (!current) {
      if (this.started && !this.disposed && this.refreshPending) {
        this.refreshPending = false
        void this.readNow()
      }
      return
    }
    this.refreshPending = false
    this.applyResult(result)
  }

  private applyResult(result: OnlineCorrectionClientResult): void {
    if (result.kind === 'NOT_FOUND') {
      this.publish(Object.freeze({ status: 'NOT_FOUND' }))
      this.schedulePoll()
      return
    }
    if (result.kind === 'UNAVAILABLE') {
      if (result.reason === 'CANCELLED') {
        this.publish(EMPTY_SNAPSHOT)
        return
      }
      this.publish(Object.freeze({ status: 'UNAVAILABLE', reason: result.reason }))
      this.schedulePoll()
      return
    }
    this.publish(Object.freeze({ status: 'VIEW', view: result.view }))
    this.schedulePoll()
  }

  private schedulePoll(): void {
    if (this.disposed || !this.started || this.timer !== undefined || this.request !== undefined) return
    this.timer = this.setTimer(() => {
      this.timer = undefined
      void this.readNow()
    }, ONLINE_CORRECTION_POLL_INTERVAL_MS)
  }

  private clearScheduled(): void {
    if (this.timer !== undefined) this.clearTimer(this.timer)
    this.timer = undefined
  }

  private subscribeToConnectionGeneration(): void {
    const generation = this.connection?.generation
    if (generation === undefined) return
    this.connectionGeneration = generation.getSnapshot()
    this.unsubscribeGeneration = generation.subscribe(() => this.onConnectionReset(generation.getSnapshot()))
  }

  private onConnectionReset(nextGeneration: unknown): void {
    if (this.disposed || !this.started) return
    if (Object.is(this.connectionGeneration, nextGeneration)) return
    this.connectionGeneration = nextGeneration
    this.storeGeneration += 1
    this.requestGeneration += 1
    this.clearScheduled()
    this.request?.abort()
    if (this.request !== undefined) this.refreshPending = true
    this.publish(EMPTY_SNAPSHOT)
    if (this.request === undefined) void this.readNow()
  }

  private publish(snapshot: OnlineCorrectionStoreSnapshot): void {
    if (sameSnapshot(this.snapshot, snapshot)) return
    this.snapshot = snapshot
    for (const listener of [...this.listeners]) {
      try { listener() } catch { /* a subscriber cannot veto Host diagnostics */ }
    }
  }
}

function sameSnapshot(a: OnlineCorrectionStoreSnapshot, b: OnlineCorrectionStoreSnapshot): boolean {
  if (a === b) return true
  try { return JSON.stringify(a) === JSON.stringify(b) } catch { return false }
}
