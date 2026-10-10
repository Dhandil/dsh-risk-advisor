import type { Session } from '@deepseek-ai/dsh-session'
import type { ExecutionId } from './correlation.ts'

export const CORRECTION_HISTORICAL_IDENTITY_MAX_ENTRIES = 512
export const CORRECTION_HISTORICAL_IDENTITY_MAX_CAPTURE_AGE_MS = 10 * 60 * 1000
export const CORRECTION_HISTORICAL_IDENTITY_MAX_SETTLED_AGE_MS = 5 * 60 * 1000
const IDENTIFIER_LIMIT = 256
const PATTERN_ID = /^ra-pattern-v1_[a-f0-9]{64}$/

interface Entry {
  readonly executionId: ExecutionId
  readonly sessionRef: WeakRef<Session>
  readonly sessionId: string
  readonly capturedAt: number
  readonly generation: symbol
  patternId?: string
  settledAt?: number
  conflicted: boolean
}

/** Process-local, optional bridge between settled Findings and precomputed Pattern IDs. */
export class CorrectionHistoricalIdentityRegistry {
  private readonly entries = new Map<ExecutionId, Entry>()
  private readonly generation = Symbol('correction-historical-identity-generation')
  private readonly clock: () => number
  private active = true

  constructor(options: { readonly clock?: () => number } = {}) {
    this.clock = options.clock ?? (() => Date.now())
  }

  /** Copies only an already-derived opaque identity; does not inspect Tool data or read storage. */
  capture(session: Session, executionId: ExecutionId | undefined, patternId: unknown): void {
    if (!this.active || executionId === undefined || typeof executionId !== 'string'
      || executionId.length < 1 || executionId.length > IDENTIFIER_LIMIT) return
    const sessionId = readSessionId(session)
    if (sessionId === undefined) return
    const now = this.clock()
    this.sweep(now)
    const prior = this.entries.get(executionId)
    if (prior !== undefined) {
      this.poison(prior)
      return
    }
    if (typeof patternId !== 'string' || !PATTERN_ID.test(patternId)) return
    if (this.entries.size >= CORRECTION_HISTORICAL_IDENTITY_MAX_ENTRIES && !this.makeRoom()) return
    this.entries.set(executionId, {
      executionId,
      sessionRef: new WeakRef(session),
      sessionId,
      capturedAt: now,
      generation: this.generation,
      patternId,
      conflicted: false,
    })
  }

  /** Must run after FailureChain settlement and before Phase 12 verifier observation. */
  settle(session: Session | undefined, executionId: ExecutionId | undefined): void {
    if (!this.active || session === undefined || executionId === undefined) return
    const entry = this.entries.get(executionId)
    if (entry === undefined) return
    const now = this.clock()
    this.sweep(now)
    if (this.entries.get(executionId) !== entry) return
    if (entry.settledAt !== undefined || entry.sessionRef.deref() !== session
      || entry.sessionId !== readSessionId(session) || entry.generation !== this.generation || entry.patternId === undefined) {
      this.poison(entry)
      return
    }
    if (now - entry.capturedAt >= CORRECTION_HISTORICAL_IDENTITY_MAX_CAPTURE_AGE_MS) {
      this.entries.delete(executionId)
      return
    }
    entry.settledAt = now
  }

  /** Returns an opaque Pattern ID only for the exact live Session and settled Execution. */
  currentForSettled(session: Session, executionId: ExecutionId): string | undefined {
    if (!this.active) return undefined
    const now = this.clock()
    this.sweep(now)
    const entry = this.entries.get(executionId)
    if (entry === undefined || entry.conflicted || entry.generation !== this.generation
      || entry.settledAt === undefined || entry.patternId === undefined
      || entry.sessionRef.deref() !== session || entry.sessionId !== readSessionId(session)) return undefined
    return entry.patternId
  }

  disposeSession(session: Session): void {
    for (const [executionId, entry] of this.entries) {
      if (entry.sessionRef.deref() === session) this.entries.delete(executionId)
    }
  }

  dispose(): void {
    if (!this.active) return
    this.active = false
    this.entries.clear()
  }

  private makeRoom(): boolean {
    let oldest: Entry | undefined
    for (const entry of this.entries.values()) {
      if (entry.settledAt !== undefined && (oldest === undefined || entry.settledAt < oldest.settledAt!)) oldest = entry
    }
    if (oldest === undefined) return false
    this.entries.delete(oldest.executionId)
    return true
  }

  private sweep(now: number): void {
    for (const [executionId, entry] of this.entries) {
      const absoluteExpired = now - entry.capturedAt >= CORRECTION_HISTORICAL_IDENTITY_MAX_CAPTURE_AGE_MS
      const settledExpired = entry.settledAt !== undefined
        && now - entry.settledAt >= CORRECTION_HISTORICAL_IDENTITY_MAX_SETTLED_AGE_MS
      if (absoluteExpired || settledExpired || entry.sessionRef.deref() === undefined) this.entries.delete(executionId)
    }
  }

  private poison(entry: Entry): void {
    entry.conflicted = true
    delete entry.patternId
  }
}

function readSessionId(session: Session): string | undefined {
  try {
    const id = (session as unknown as { readonly id?: unknown }).id
    return typeof id === 'string' && id.length > 0 && id.length <= IDENTIFIER_LIMIT ? id : undefined
  } catch { return undefined }
}
