import type { BrowserBridgeClientResult, RiskAdvisorBridgeViewV2, RiskAdvisorBridgeViewV3, RiskAdvisorBridgeViewV4 } from '../bridge-contract.ts'
import type { RiskAdvisorBridgeClient } from './assessment-bridge.ts'

export const POLL_INTERVAL_MS = 1000
export const NOT_FOUND_GRACE_MS = 3000

export type PresentationStoreStatus = 'ANALYZING' | 'READY' | 'UNAVAILABLE' | 'CANCELLED'
export interface PresentationStoreSnapshot {
  readonly status: PresentationStoreStatus
  readonly view?: RiskAdvisorBridgeViewV2 | RiskAdvisorBridgeViewV3 | RiskAdvisorBridgeViewV4
  readonly reason?: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED' | 'NO_ACTIVE_EXECUTION' | 'AMBIGUOUS_EXECUTION'
}

export interface ClientConnectionGenerationLike {
  readonly getSnapshot: () => unknown
  readonly subscribe: (listener: () => void) => () => void
}

export interface ClientConnectionLike {
  readonly rpc: { readonly call: (channel: string, endpoint: string, payload: unknown, signal?: AbortSignal) => Promise<unknown> }
  readonly generation?: ClientConnectionGenerationLike
}

export interface PresentationStoreOptions {
  readonly now?: () => number
  readonly setTimer?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  readonly clearTimer?: (timer: ReturnType<typeof setTimeout>) => void
}

export class PresentationStore {
  private snapshot: PresentationStoreSnapshot = Object.freeze({ status: 'ANALYZING' as const })
  private readonly listeners = new Set<() => void>()
  private readonly now: () => number
  private readonly setTimer: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  private readonly clearTimer: (timer: ReturnType<typeof setTimeout>) => void
  private timer: ReturnType<typeof setTimeout> | undefined
  private request: AbortController | undefined
  private unsubscribeGeneration: (() => void) | undefined
  private started = false
  private disposed = false
  private storeGeneration = 0
  private requestGeneration = 0
  private graceStartedAt: number | undefined
  private connectionGeneration: unknown

  constructor(
    private readonly bridge: RiskAdvisorBridgeClient,
    readonly sessionId: string,
    readonly callId: string,
    connection?: ClientConnectionLike,
    options: PresentationStoreOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now())
    this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay))
    this.clearTimer = options.clearTimer ?? (timer => clearTimeout(timer))
    if (connection?.generation !== undefined) {
      this.connectionGeneration = connection.generation.getSnapshot()
      this.unsubscribeGeneration = connection.generation.subscribe(() => this.onConnectionReset(connection.generation!.getSnapshot()))
    }
  }

  getSnapshot = (): PresentationStoreSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  start(): void {
    if (this.started || this.disposed) return
    this.started = true
    if (this.graceStartedAt === undefined) this.graceStartedAt = this.safeNow()
    void this.readNow()
  }

  stop(): void {
    if (!this.started) return
    this.started = false
    this.storeGeneration += 1
    this.requestGeneration += 1
    this.clearScheduled()
    this.request?.abort()
    this.request = undefined
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.stop()
    this.unsubscribeGeneration?.()
    this.unsubscribeGeneration = undefined
    this.listeners.clear()
  }

  private async readNow(): Promise<void> {
    if (this.disposed || !this.started || this.request !== undefined) return
    const storeGeneration = this.storeGeneration
    const requestGeneration = ++this.requestGeneration
    const controller = new AbortController()
    this.request = controller
    let result: BrowserBridgeClientResult
    try {
      result = await this.bridge.active(this.sessionId, this.callId, controller.signal)
    } catch {
      result = { kind: 'UNAVAILABLE', reason: 'TRANSPORT_UNAVAILABLE' }
    }
    if (this.disposed || !this.started || storeGeneration !== this.storeGeneration || requestGeneration !== this.requestGeneration || this.request !== controller) return
    this.request = undefined
    this.applyResult(result)
  }

  private applyResult(result: BrowserBridgeClientResult): void {
    if (result.kind === 'NOT_FOUND') {
      const graceStartedAt = this.graceStartedAt ?? this.safeNow()
      if (this.safeNow() - graceStartedAt >= NOT_FOUND_GRACE_MS) {
        this.publish({ status: 'UNAVAILABLE', reason: 'NO_ACTIVE_EXECUTION' })
        this.clearScheduled()
      } else {
        this.publish({ status: 'ANALYZING' })
        this.schedulePoll()
      }
      return
    }
    if (result.kind === 'AMBIGUOUS') {
      this.publish({ status: 'UNAVAILABLE', reason: 'AMBIGUOUS_EXECUTION' })
      this.clearScheduled()
      return
    }
    if (result.kind === 'UNAVAILABLE') {
      this.publish({ status: result.reason === 'CANCELLED' ? 'CANCELLED' : 'UNAVAILABLE', reason: result.reason })
      this.clearScheduled()
      return
    }
    if (result.view.schemaVersion !== 2 && result.view.schemaVersion !== 3 && result.view.schemaVersion !== 4) {
      this.publish({ status: 'UNAVAILABLE', reason: 'PROTOCOL_INVALID' })
      this.clearScheduled()
      return
    }
    const view = result.view
    if (view.status === 'ready') {
      this.publish({ status: 'READY', view })
      if (view.stage === 'fast' || view.stage === 'evidence' || view.stage === 'deep') this.schedulePoll()
      else this.clearScheduled()
      return
    }
    if (view.status === 'pending') {
      this.publish({ status: 'ANALYZING', view })
      this.schedulePoll()
      return
    }
    this.publish({ status: view.status === 'cancelled' ? 'CANCELLED' : 'UNAVAILABLE', view })
    this.clearScheduled()
  }

  private schedulePoll(): void {
    if (this.disposed || !this.started || this.timer !== undefined || this.request !== undefined) return
    this.timer = this.setTimer(() => {
      this.timer = undefined
      void this.readNow()
    }, POLL_INTERVAL_MS)
  }

  private clearScheduled(): void {
    if (this.timer !== undefined) this.clearTimer(this.timer)
    this.timer = undefined
  }

  private onConnectionReset(nextGeneration: unknown): void {
    if (Object.is(this.connectionGeneration, nextGeneration)) return
    this.connectionGeneration = nextGeneration
    if (this.disposed || !this.started) return
    this.storeGeneration += 1
    this.requestGeneration += 1
    this.clearScheduled()
    this.request?.abort()
    this.request = undefined
    this.publish({ status: 'ANALYZING' })
    void this.readNow()
  }

  private safeNow(): number {
    try {
      const value = this.now()
      return Number.isFinite(value) && value >= 0 ? value : 0
    } catch { return 0 }
  }

  private publish(snapshot: PresentationStoreSnapshot): void {
    this.snapshot = Object.freeze(snapshot)
    for (const listener of [...this.listeners]) {
      try { listener() } catch { /* a subscriber cannot veto Host truth */ }
    }
  }
}
