import type { CorrectionNextCheckClientResult, CorrectionNextCheckReadV1 } from '../correction-next-check-contract.ts'
import type { CorrectionNextCheckBridgeClient } from './correction-next-check-bridge.ts'
import type { RuntimeRiskConnectionGenerationLike, RuntimeRiskConnectionLike } from './runtime-risk-store.ts'

export const CORRECTION_NEXT_CHECK_MIN_READ_INTERVAL_MS = 1000
export const CORRECTION_NEXT_CHECK_MAX_FRESHNESS_MS = 1500

export type CorrectionNextCheckStoreSnapshot =
  | { readonly status: 'EMPTY' }
  | { readonly status: 'VIEW'; readonly findingId: string; readonly view: Extract<CorrectionNextCheckReadV1, { kind: 'VIEW' }> }

export interface CorrectionNextCheckStoreOptions {
  readonly setTimer?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  readonly clearTimer?: (timer: ReturnType<typeof setTimeout>) => void
  readonly clock?: () => number
  readonly wallClock?: () => number
}

export type CorrectionNextCheckConnectionLike = RuntimeRiskConnectionLike
interface Target { readonly sessionId: string; readonly findingId: string }
const EMPTY: CorrectionNextCheckStoreSnapshot = Object.freeze({ status: 'EMPTY' })

/** One current-Finding, optional, abortable read source. */
export class CorrectionNextCheckStore {
  private snapshot: CorrectionNextCheckStoreSnapshot = EMPTY
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
    private readonly bridge: CorrectionNextCheckBridgeClient,
    readonly sessionId: string,
    private readonly connection?: CorrectionNextCheckConnectionLike,
    options: CorrectionNextCheckStoreOptions = {},
  ) {
    this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay))
    this.clearTimer = options.clearTimer ?? (timer => clearTimeout(timer))
    this.clock = options.clock ?? (() => globalThis.performance.now())
    this.wallClock = options.wallClock ?? (() => Date.now())
  }

  getSnapshot = (): CorrectionNextCheckStoreSnapshot => this.snapshot
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }

  setFinding(findingId: string | undefined): void {
    if (this.disposed) return
    const next = findingId === undefined ? undefined : Object.freeze({ sessionId: this.sessionId, findingId })
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

  start(): void {
    if (this.started || this.disposed) return
    this.started = true
    this.subscribeToConnectionGeneration()
    if (this.target !== undefined) this.scheduleRead()
  }

  stop(): void {
    if (this.started) { this.started = false; this.generation += 1; this.requestGeneration += 1 }
    try { this.unsubscribeGeneration?.() } catch { /* optional lifecycle must fail closed */ }
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
    const wait = Math.max(0, this.lastReadStartedAt + CORRECTION_NEXT_CHECK_MIN_READ_INTERVAL_MS - this.clock())
    const generation = this.generation
    try {
      this.pollTimer = this.setTimer(() => {
        if (generation !== this.generation || this.disposed || !this.started) return
        this.pollTimer = undefined
        void this.readNow()
      }, wait)
    }
    catch { this.pollTimer = undefined; this.publish(EMPTY) }
  }

  private async readNow(): Promise<void> {
    if (this.disposed || !this.started || this.target === undefined || this.request !== undefined) return
    const target = this.target
    const generation = this.generation
    const requestGeneration = ++this.requestGeneration
    this.lastReadStartedAt = this.clock()
    const controller = new AbortController()
    this.request = controller
    let result: CorrectionNextCheckClientResult
    try { result = await this.bridge.read(target, controller.signal) }
    catch { result = Object.freeze({ kind: 'CLIENT_UNAVAILABLE', reason: 'TRANSPORT_UNAVAILABLE' }) }
    const current = !this.disposed && this.started && generation === this.generation
      && requestGeneration === this.requestGeneration && this.request === controller && sameTarget(this.target, target)
    if (this.request === controller) this.request = undefined
    if (!current) return
    if (result.kind === 'VIEW' && result.sessionId === target.sessionId && result.findingId === target.findingId) {
      const hostAge = this.wallClock() - result.observedAt
      if (hostAge >= 0 && hostAge < CORRECTION_NEXT_CHECK_MAX_FRESHNESS_MS) {
        this.publish(Object.freeze({ status: 'VIEW', findingId: target.findingId, view: result }))
        this.scheduleExpiry(CORRECTION_NEXT_CHECK_MAX_FRESHNESS_MS - hostAge)
      } else this.publish(EMPTY)
    } else this.publish(EMPTY)
    this.scheduleRead()
  }

  private scheduleExpiry(remainingMs: number): void {
    if (this.expiryTimer !== undefined) {
      try { this.clearTimer(this.expiryTimer) } catch { this.expiryTimer = undefined; this.publish(EMPTY); return }
    }
    const expiresAt = this.clock() + remainingMs
    const view = this.snapshot.status === 'VIEW' ? this.snapshot.view : undefined
    const expire = (): void => {
      this.expiryTimer = undefined
      if (view === undefined || this.snapshot.status !== 'VIEW' || this.snapshot.view !== view) return
      const left = expiresAt - this.clock()
      if (left <= 0) this.publish(EMPTY)
      else {
        try { this.expiryTimer = this.setTimer(expire, left) }
        catch { this.expiryTimer = undefined; this.publish(EMPTY) }
      }
    }
    try { this.expiryTimer = this.setTimer(expire, remainingMs) }
    catch { this.expiryTimer = undefined; this.publish(EMPTY) }
  }

  private subscribeToConnectionGeneration(): void {
    const generation: RuntimeRiskConnectionGenerationLike | undefined = this.connection?.generation
    if (generation === undefined) return
    try {
      this.connectionGeneration = generation.getSnapshot()
      this.unsubscribeGeneration = generation.subscribe(() => this.onConnectionReset(generation.getSnapshot()))
    } catch {
      this.connectionGeneration = undefined
      this.unsubscribeGeneration = undefined
      this.publish(EMPTY)
    }
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
    if (this.pollTimer !== undefined) { try { this.clearTimer(this.pollTimer) } catch { /* fail closed below */ } }
    if (this.expiryTimer !== undefined) { try { this.clearTimer(this.expiryTimer) } catch { /* fail closed below */ } }
    this.pollTimer = undefined
    this.expiryTimer = undefined
  }

  private publish(snapshot: CorrectionNextCheckStoreSnapshot): void {
    if (this.snapshot === snapshot || (this.snapshot.status === 'EMPTY' && snapshot.status === 'EMPTY')) return
    this.snapshot = snapshot
    for (const listener of [...this.listeners]) { try { listener() } catch { /* optional advice is isolated */ } }
  }
}

function sameTarget(a: Target | undefined, b: Target | undefined): boolean {
  return a === b || (a !== undefined && b !== undefined && a.sessionId === b.sessionId && a.findingId === b.findingId)
}
