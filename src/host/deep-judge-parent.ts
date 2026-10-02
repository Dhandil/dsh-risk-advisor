import type { Session } from '@deepseek-ai/dsh-session'

interface ParentEntry {
  readonly sessionRef: WeakRef<Session>
  readonly agentRef: WeakRef<object>
  readonly capturedAt: number
}

const TTL_MS = 10 * 60 * 1000
const PER_SESSION_LIMIT = 128
const GLOBAL_LIMIT = 256

/** Host-private exact parent identity binding; no ToolExecution is retained. */
export class DeepJudgeParentBindingStore {
  private readonly values = new Map<string, ParentEntry>()
  private readonly bySession = new WeakMap<Session, Set<string>>()
  private active = true

  constructor(private readonly clock: () => number = () => Date.now()) {}

  capture(executionId: string | undefined, session: Session, agent: unknown): void {
    if (!this.active || executionId === undefined || !isObject(agent)) return
    this.sweep()
    this.values.delete(executionId)
    const sessionKeys = this.bySession.get(session) ?? new Set<string>()
    if (sessionKeys.size >= PER_SESSION_LIMIT) this.evictOldest(sessionKeys)
    while (this.values.size >= GLOBAL_LIMIT) this.evictOldestGlobal()
    const entry: ParentEntry = { sessionRef: new WeakRef(session), agentRef: new WeakRef(agent), capturedAt: this.readClock() }
    this.values.set(executionId, entry)
    sessionKeys.add(executionId)
    this.bySession.set(session, sessionKeys)
  }

  get(executionId: string, session: Session): object | undefined {
    if (!this.active) return undefined
    this.sweep()
    const entry = this.values.get(executionId)
    if (entry === undefined || entry.sessionRef.deref() !== session) return undefined
    const agent = entry.agentRef.deref()
    if (agent === undefined) { this.remove(executionId); return undefined }
    return agent
  }

  disposeSession(session: Session): void {
    const keys = this.bySession.get(session)
    if (keys === undefined) return
    for (const key of keys) this.values.delete(key)
    keys.clear()
    this.bySession.delete(session)
  }

  dispose(): void {
    this.active = false
    this.values.clear()
  }

  get size(): number { return this.values.size }

  private sweep(): void {
    const now = this.readClock()
    for (const [key, entry] of this.values) {
      if (now - entry.capturedAt >= TTL_MS || entry.sessionRef.deref() === undefined || entry.agentRef.deref() === undefined) this.remove(key)
    }
  }

  private remove(key: string): void {
    const entry = this.values.get(key)
    if (entry === undefined) return
    this.values.delete(key)
    const session = entry.sessionRef.deref()
    if (session !== undefined) this.bySession.get(session)?.delete(key)
  }

  private evictOldest(keys: Set<string>): void {
    let oldest: string | undefined
    let oldestAt = Number.POSITIVE_INFINITY
    for (const key of keys) {
      const entry = this.values.get(key)
      if (entry !== undefined && entry.capturedAt < oldestAt) { oldest = key; oldestAt = entry.capturedAt }
    }
    if (oldest !== undefined) this.remove(oldest)
  }

  private evictOldestGlobal(): void {
    let oldest: string | undefined
    let oldestAt = Number.POSITIVE_INFINITY
    for (const [key, entry] of this.values) if (entry.capturedAt < oldestAt) { oldest = key; oldestAt = entry.capturedAt }
    if (oldest !== undefined) this.remove(oldest)
  }

  private readClock(): number {
    try { const value = this.clock(); return Number.isFinite(value) && value >= 0 ? value : 0 } catch { return 0 }
  }
}

function isObject(value: unknown): value is object { return value !== null && typeof value === 'object' }
