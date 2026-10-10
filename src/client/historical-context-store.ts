import { performance } from 'node:perf_hooks'
import type { HistoricalContextReadV1 } from '../historical-context-contract.ts'
import type { HistoricalContextBridgeClient, HistoricalContextRequest } from './historical-context-bridge.ts'
import type { RuntimeRiskConnectionGenerationLike, RuntimeRiskConnectionLike } from './runtime-risk-store.ts'

export const HISTORICAL_CONTEXT_MIN_READ_INTERVAL_MS = 1000
export const HISTORICAL_CONTEXT_MAX_FRESHNESS_MS = 1500

export type HistoricalContextStoreSnapshot =
  | { readonly status: 'EMPTY' }
  | { readonly status: 'VIEW'; readonly view: Extract<HistoricalContextReadV1, { kind: 'VIEW' }>; readonly receivedAt: number }

export interface HistoricalContextStoreOptions {
  readonly setTimer?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  readonly clearTimer?: (timer: ReturnType<typeof setTimeout>) => void
  readonly clock?: () => number
  readonly wallClock?: () => number
}

interface Target extends HistoricalContextRequest {}

const EMPTY_SNAPSHOT: HistoricalContextStoreSnapshot = Object.freeze({ status: 'EMPTY' })

/** Per-Session optional read source. It never writes into the accepted Runtime Risk store. */
export class HistoricalContextStore {
  private snapshot: HistoricalContextStoreSnapshot = EMPTY_SNAPSHOT
  private readonly listeners = new Set<() => void>()
  private readonly setTimer: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  private readonly clearTimer: (timer: ReturnType<typeof setTimeout>) => void
  private readonly clock: () => number
  private readonly wallClock: () => number
  private request: AbortController | undefined
  private pollTimer: ReturnType<typeof setTimeout> | undefined
  private freshnessTimer: ReturnType<typeof setTimeout> | undefined
  private unsubscribeGeneration: (() => void) | undefined
  private connectionGeneration: unknown
  private target: Target | undefined
  private started = false
  private disposed = false
  private generation = 0
  private requestGeneration = 0
  private lastReadStartedAt = Number.NEGATIVE_INFINITY

  constructor(
    private readonly bridge: HistoricalContextBridgeClient,
    readonly sessionId: string,
    private readonly connection?: RuntimeRiskConnectionLike,
    options: HistoricalContextStoreOptions = {},
  ) {
    this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay))
    this.clearTimer = options.clearTimer ?? (timer => clearTimeout(timer))
    this.clock = options.clock ?? (() => performance.now())
    this.wallClock = options.wallClock ?? (() => Date.now())
  }

  getSnapshot = (): HistoricalContextStoreSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  setTarget(target: HistoricalContextRequest | undefined): void {
    if (this.disposed || sameTarget(this.target, target)) return
    this.target = target === undefined ? undefined : Object.freeze({ ...target })
    this.generation += 1
    this.requestGeneration += 1
    this.clearTimers()
    this.request?.abort()
    this.request = undefined
    this.publish(EMPTY_SNAPSHOT)
    if (this.started && this.target !== undefined) this.scheduleRead()
  }

  start(): void {
    if (this.started || this.disposed) return
    this.started = true
    this.subscribeToConnectionGeneration()
    if (this.target !== undefined) this.scheduleRead()
  }

  stop(): void {
    if (this.started) {
      this.started = false
      this.generation += 1
      this.requestGeneration += 1
    }
    this.unsubscribeGeneration?.()
    this.unsubscribeGeneration = undefined
    this.connectionGeneration = undefined
    this.target = undefined
    this.clearTimers()
    this.request?.abort()
    this.request = undefined
    this.publish(EMPTY_SNAPSHOT)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.listeners.clear()
    this.stop()
  }

  private scheduleRead(): void {
    if (this.disposed || !this.started || this.target === undefined || this.request !== undefined || this.pollTimer !== undefined) return
    const wait = Math.max(0, this.lastReadStartedAt + HISTORICAL_CONTEXT_MIN_READ_INTERVAL_MS - this.clock())
    this.pollTimer = this.setTimer(() => {
      this.pollTimer = undefined
      void this.readNow()
    }, wait)
  }

  private async readNow(): Promise<void> {
    if (this.disposed || !this.started || this.target === undefined || this.request !== undefined) return
    const target = this.target
    const generation = this.generation
    const requestGeneration = ++this.requestGeneration
    const startedAt = this.clock()
    this.lastReadStartedAt = startedAt
    const controller = new AbortController()
    this.request = controller
    let result: Awaited<ReturnType<HistoricalContextBridgeClient['read']>>
    try { result = await this.bridge.read(target, controller.signal) }
    catch { result = Object.freeze({ kind: 'CLIENT_UNAVAILABLE', reason: 'TRANSPORT_UNAVAILABLE' }) }
    const current = !this.disposed && this.started && generation === this.generation
      && requestGeneration === this.requestGeneration && this.request === controller
      && sameTarget(this.target, target)
    if (this.request === controller) this.request = undefined
    if (!current) return
    if (result.kind === 'VIEW' && result.sessionId === target.sessionId
      && result.executionId === target.executionId && result.assessmentId === target.assessmentId) {
      const receivedAt = this.clock()
      const hostAge = this.wallClock() - result.observedAt
      if (hostAge >= 0 && hostAge <= HISTORICAL_CONTEXT_MAX_FRESHNESS_MS) {
        this.publish(Object.freeze({ status: 'VIEW', view: result, receivedAt }))
        this.scheduleExpiry(receivedAt)
      } else this.publish(EMPTY_SNAPSHOT)
    } else this.publish(EMPTY_SNAPSHOT)
    this.scheduleRead()
  }

  private scheduleExpiry(receivedAt: number): void {
    if (this.freshnessTimer !== undefined) this.clearTimer(this.freshnessTimer)
    const expire = (): void => {
      this.freshnessTimer = undefined
      if (this.snapshot.status !== 'VIEW' || this.snapshot.receivedAt !== receivedAt) return
      const remaining = HISTORICAL_CONTEXT_MAX_FRESHNESS_MS - (this.clock() - receivedAt)
      if (remaining <= 0) this.publish(EMPTY_SNAPSHOT)
      else this.freshnessTimer = this.setTimer(expire, remaining)
    }
    this.freshnessTimer = this.setTimer(expire, HISTORICAL_CONTEXT_MAX_FRESHNESS_MS)
  }

  private subscribeToConnectionGeneration(): void {
    const generation: RuntimeRiskConnectionGenerationLike | undefined = this.connection?.generation
    if (generation === undefined) return
    this.connectionGeneration = generation.getSnapshot()
    this.unsubscribeGeneration = generation.subscribe(() => this.onConnectionReset(generation.getSnapshot()))
  }

  private onConnectionReset(next: unknown): void {
    if (this.disposed || !this.started || Object.is(this.connectionGeneration, next)) return
    this.connectionGeneration = next
    this.generation += 1
    this.requestGeneration += 1
    this.clearTimers()
    this.request?.abort()
    this.request = undefined
    this.publish(EMPTY_SNAPSHOT)
    if (this.target !== undefined) this.scheduleRead()
  }

  private clearTimers(): void {
    if (this.pollTimer !== undefined) this.clearTimer(this.pollTimer)
    if (this.freshnessTimer !== undefined) this.clearTimer(this.freshnessTimer)
    this.pollTimer = undefined
    this.freshnessTimer = undefined
  }

  private publish(snapshot: HistoricalContextStoreSnapshot): void {
    if (sameSnapshot(this.snapshot, snapshot)) return
    this.snapshot = snapshot
    for (const listener of [...this.listeners]) {
      try { listener() } catch { /* a view subscriber cannot affect Host history */ }
    }
  }
}

function sameTarget(a: Target | undefined, b: HistoricalContextRequest | undefined): boolean {
  return a === b || (a !== undefined && b !== undefined && a.sessionId === b.sessionId
    && a.executionId === b.executionId && a.assessmentId === b.assessmentId)
}

function sameSnapshot(a: HistoricalContextStoreSnapshot, b: HistoricalContextStoreSnapshot): boolean {
  if (a === b) return true
  try { return JSON.stringify(a) === JSON.stringify(b) } catch { return false }
}
