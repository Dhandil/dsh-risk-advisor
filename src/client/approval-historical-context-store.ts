import type { ApprovalHistoricalContextClientResult, ApprovalHistoricalContextReadV1 } from '../approval-historical-context-contract.ts'
import type { ApprovalHistoricalContextBridgeClient } from './approval-historical-context-bridge.ts'
import type { RuntimeRiskConnectionGenerationLike, RuntimeRiskConnectionLike } from './runtime-risk-store.ts'

export const APPROVAL_HISTORICAL_CONTEXT_MIN_READ_INTERVAL_MS = 1000
export const APPROVAL_HISTORICAL_CONTEXT_MAX_FRESHNESS_MS = 1500

export type ApprovalHistoricalContextStoreSnapshot =
  | { readonly status: 'EMPTY' }
  | { readonly status: 'VIEW'; readonly clientKey: string; readonly view: Extract<ApprovalHistoricalContextReadV1, { kind: 'VIEW' }> }

export interface ApprovalHistoricalContextStoreOptions {
  readonly setTimer?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  readonly clearTimer?: (timer: ReturnType<typeof setTimeout>) => void
  readonly clock?: () => number
  readonly wallClock?: () => number
}

interface Target { readonly sessionId: string; readonly callId: string; readonly clientKey: string }
const EMPTY: ApprovalHistoricalContextStoreSnapshot = Object.freeze({ status: 'EMPTY' })

/** Optional, memory-only source fenced by the Client-local pending approval key. */
export class ApprovalHistoricalContextStore {
  private snapshot: ApprovalHistoricalContextStoreSnapshot = EMPTY
  private readonly listeners = new Set<() => void>()
  private readonly setTimer: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  private readonly clearTimer: (timer: ReturnType<typeof setTimeout>) => void
  private readonly clock: () => number
  private readonly wallClock: () => number
  private target: Target | undefined
  private request: AbortController | undefined
  private pollTimer: ReturnType<typeof setTimeout> | undefined
  private expiryTimer: ReturnType<typeof setTimeout> | undefined
  private unsubscribeGeneration: (() => void) | undefined
  private connectionGeneration: unknown
  private started = false
  private disposed = false
  private generation = 0
  private requestGeneration = 0
  private lastReadStartedAt = Number.NEGATIVE_INFINITY

  constructor(
    private readonly bridge: ApprovalHistoricalContextBridgeClient,
    readonly sessionId: string,
    readonly callId: string,
    private readonly connection?: RuntimeRiskConnectionLike,
    options: ApprovalHistoricalContextStoreOptions = {},
  ) {
    this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay))
    this.clearTimer = options.clearTimer ?? (timer => clearTimeout(timer))
    this.clock = options.clock ?? (() => globalThis.performance.now())
    this.wallClock = options.wallClock ?? (() => Date.now())
  }

  getSnapshot = (): ApprovalHistoricalContextStoreSnapshot => this.snapshot
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }

  setTarget(clientKey: string | undefined): void {
    if (this.disposed) return
    const next = clientKey === undefined ? undefined : Object.freeze({ sessionId: this.sessionId, callId: this.callId, clientKey })
    if (sameTarget(this.target, next)) return
    this.target = next
    this.generation += 1
    this.requestGeneration += 1
    this.clearTimers()
    this.request?.abort()
    this.request = undefined
    this.publish(EMPTY)
    if (this.started && next !== undefined) this.scheduleRead()
  }

  clearTarget(clientKey: string): void {
    if (this.target?.clientKey === clientKey) this.setTarget(undefined)
  }

  start(): void {
    if (this.started || this.disposed) return
    this.started = true
    this.subscribeToConnectionGeneration()
    if (this.target !== undefined) this.scheduleRead()
  }

  stop(): void {
    if (this.started) { this.started = false; this.generation += 1; this.requestGeneration += 1 }
    this.unsubscribeGeneration?.()
    this.unsubscribeGeneration = undefined
    this.connectionGeneration = undefined
    this.target = undefined
    this.clearTimers()
    this.request?.abort()
    this.request = undefined
    this.publish(EMPTY)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.listeners.clear()
    this.stop()
  }

  private scheduleRead(): void {
    if (this.disposed || !this.started || this.target === undefined || this.request !== undefined || this.pollTimer !== undefined) return
    const wait = Math.max(0, this.lastReadStartedAt + APPROVAL_HISTORICAL_CONTEXT_MIN_READ_INTERVAL_MS - this.clock())
    this.pollTimer = this.setTimer(() => { this.pollTimer = undefined; void this.readNow() }, wait)
  }

  private async readNow(): Promise<void> {
    if (this.disposed || !this.started || this.target === undefined || this.request !== undefined) return
    const target = this.target
    const generation = this.generation
    const requestGeneration = ++this.requestGeneration
    this.lastReadStartedAt = this.clock()
    const controller = new AbortController()
    this.request = controller
    let result: ApprovalHistoricalContextClientResult
    try { result = await this.bridge.read({ sessionId: target.sessionId, callId: target.callId }, controller.signal) }
    catch { result = Object.freeze({ kind: 'CLIENT_UNAVAILABLE', reason: 'TRANSPORT_UNAVAILABLE' }) }
    const current = !this.disposed && this.started && generation === this.generation
      && requestGeneration === this.requestGeneration && this.request === controller && sameTarget(this.target, target)
    if (this.request === controller) this.request = undefined
    if (!current) return
    if (result.kind === 'VIEW' && result.sessionId === target.sessionId && result.callId === target.callId) {
      const hostAge = this.wallClock() - result.observedAt
      if (hostAge >= 0 && hostAge < APPROVAL_HISTORICAL_CONTEXT_MAX_FRESHNESS_MS) {
        this.publish(Object.freeze({ status: 'VIEW', clientKey: target.clientKey, view: result }))
        this.scheduleExpiry(APPROVAL_HISTORICAL_CONTEXT_MAX_FRESHNESS_MS - hostAge)
      } else this.publish(EMPTY)
    } else this.publish(EMPTY)
    this.scheduleRead()
  }

  private scheduleExpiry(remainingMs: number): void {
    if (this.expiryTimer !== undefined) this.clearTimer(this.expiryTimer)
    const expiresAt = this.clock() + remainingMs
    const view = this.snapshot.status === 'VIEW' ? this.snapshot.view : undefined
    const expire = (): void => {
      this.expiryTimer = undefined
      if (view === undefined || this.snapshot.status !== 'VIEW' || this.snapshot.view !== view) return
      const left = expiresAt - this.clock()
      if (left <= 0) this.publish(EMPTY)
      else this.expiryTimer = this.setTimer(expire, left)
    }
    this.expiryTimer = this.setTimer(expire, remainingMs)
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
    this.publish(EMPTY)
    if (this.target !== undefined) this.scheduleRead()
  }

  private clearTimers(): void {
    if (this.pollTimer !== undefined) this.clearTimer(this.pollTimer)
    if (this.expiryTimer !== undefined) this.clearTimer(this.expiryTimer)
    this.pollTimer = undefined
    this.expiryTimer = undefined
  }

  private publish(snapshot: ApprovalHistoricalContextStoreSnapshot): void {
    if (this.snapshot === snapshot || (this.snapshot.status === 'EMPTY' && snapshot.status === 'EMPTY')) return
    this.snapshot = snapshot
    for (const listener of [...this.listeners]) { try { listener() } catch { /* isolated optional consumer */ } }
  }
}

function sameTarget(a: Target | undefined, b: Target | undefined): boolean {
  return a === b || (a !== undefined && b !== undefined && a.sessionId === b.sessionId && a.callId === b.callId && a.clientKey === b.clientKey)
}
