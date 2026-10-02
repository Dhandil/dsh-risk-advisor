import type { VerificationRecordV1, VerificationReasonCode } from './verification-store.ts'

export interface VerificationJob {
  readonly executionId: string
  readonly session: object
  readonly generation: number
  readonly run: (signal: AbortSignal) => Promise<VerificationRecordV1>
  readonly unknown: (reason: VerificationReasonCode, durationMs?: number) => VerificationRecordV1
  readonly complete: (record: VerificationRecordV1) => void
}

export interface VerificationSchedulerOptions {
  readonly timeoutMs?: number
  readonly maxConcurrent?: number
  readonly maxPending?: number
  readonly clock?: () => number
  readonly setTimer?: typeof setTimeout
  readonly clearTimer?: typeof clearTimeout
}

interface ActiveJob {
  readonly job: VerificationJob
  readonly controller: AbortController
  readonly startedAt: number
  settled: boolean
  timedOut: boolean
  cancelled: boolean
}

const TIMEOUT_MS = 5_000
const MAX_CONCURRENT = 2
const MAX_PENDING = 8

/** Bounded async scheduler for local shell-world verification only. */
export class VerificationScheduler {
  readonly timeoutMs: number
  readonly maxConcurrent: number
  readonly maxPending: number
  private readonly clock: () => number
  private readonly setTimer: typeof setTimeout
  private readonly clearTimer: typeof clearTimeout
  private readonly pending: VerificationJob[] = []
  private readonly active = new Map<string, ActiveJob>()
  private readonly inflight = new Set<Promise<void>>()
  private generation = 1
  private disposed = false

  constructor(options: VerificationSchedulerOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? TIMEOUT_MS
    this.maxConcurrent = options.maxConcurrent ?? MAX_CONCURRENT
    this.maxPending = options.maxPending ?? MAX_PENDING
    this.clock = options.clock ?? (() => Date.now())
    this.setTimer = options.setTimer ?? setTimeout
    this.clearTimer = options.clearTimer ?? clearTimeout
    if (this.timeoutMs !== TIMEOUT_MS || this.maxConcurrent !== MAX_CONCURRENT || this.maxPending !== MAX_PENDING) {
      throw new RangeError('Phase-7 scheduler bounds are frozen')
    }
  }

  get currentGeneration(): number { return this.generation }
  get activeCount(): number { return this.active.size }
  get pendingCount(): number { return this.pending.length }

  enqueue(job: VerificationJob): boolean {
    if (this.disposed || job.generation !== this.generation) {
      job.complete(job.unknown('VERIFIER_ABORTED'))
      return false
    }
    if (this.active.has(job.executionId) || this.pending.some(item => item.executionId === job.executionId)) {
      job.complete(job.unknown('VERIFICATION_CONFLICT'))
      return false
    }
    if (this.pending.length >= this.maxPending && this.active.size >= this.maxConcurrent) {
      job.complete(job.unknown('VERIFIER_QUEUE_SATURATED'))
      return false
    }
    this.pending.push(job)
    this.pump()
    return true
  }

  fence(): void {
    this.generation += 1
    for (const job of this.pending.splice(0)) job.complete(job.unknown('VERIFIER_ABORTED'))
    for (const item of this.active.values()) this.cancelActive(item, 'VERIFIER_ABORTED')
  }

  cancelSession(session: object): void {
    for (let index = this.pending.length - 1; index >= 0; index -= 1) {
      const job = this.pending[index]!
      if (job.session !== session) continue
      this.pending.splice(index, 1)
      job.complete(job.unknown('VERIFIER_ABORTED'))
    }
    for (const item of this.active.values()) {
      if (item.job.session === session) this.cancelActive(item, 'VERIFIER_ABORTED')
    }
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      await Promise.allSettled([...this.inflight])
      return
    }
    this.disposed = true
    this.generation += 1
    for (const job of this.pending.splice(0)) job.complete(job.unknown('VERIFIER_ABORTED'))
    for (const item of this.active.values()) this.cancelActive(item, 'VERIFIER_ABORTED')
    await Promise.allSettled([...this.inflight])
  }

  private pump(): void {
    if (this.disposed) return
    while (this.active.size < this.maxConcurrent && this.pending.length > 0) {
      const job = this.pending.shift()!
      this.start(job)
    }
  }

  private start(job: VerificationJob): void {
    const item: ActiveJob = {
      job,
      controller: new AbortController(),
      startedAt: this.clock(),
      settled: false,
      timedOut: false,
      cancelled: false,
    }
    this.active.set(job.executionId, item)
    const task = this.run(item)
    this.inflight.add(task)
    void task.finally(() => { this.inflight.delete(task) }).catch(() => { /* contained */ })
  }

  private async run(item: ActiveJob): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = this.setTimer(() => {
        item.timedOut = true
        item.controller.abort()
        reject(new Error('verification timeout'))
      }, this.timeoutMs)
    })
    try {
      const result = await Promise.race([item.job.run(item.controller.signal), timeout])
      if (!item.settled && !this.disposed && item.job.generation === this.generation && !item.cancelled) {
        item.settled = true
        item.job.complete(result)
      }
    } catch {
      if (!item.settled && !this.disposed && item.job.generation === this.generation) {
        item.settled = true
        item.job.complete(item.job.unknown(item.timedOut ? 'VERIFIER_TIMEOUT' : item.cancelled ? 'VERIFIER_ABORTED' : 'VERIFIER_RESULT_UNSUPPORTED', Math.max(0, this.clock() - item.startedAt)))
      }
    } finally {
      if (timer !== undefined) this.clearTimer(timer)
      this.active.delete(item.job.executionId)
      this.pump()
    }
  }

  private cancelActive(item: ActiveJob, reason: VerificationReasonCode): void {
    item.cancelled = true
    item.controller.abort()
    if (!item.settled) {
      item.settled = true
      item.job.complete(item.job.unknown(reason, Math.max(0, this.clock() - item.startedAt)))
    }
  }
}
