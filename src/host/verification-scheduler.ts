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

  /** Fence the generation and await every underlying verifier promise. */
  async fenceAndDrain(): Promise<void> {
    if (!this.disposed) this.fence()
    await this.drain()
  }

  /** Await owned work without releasing any active slot early. */
  async drain(): Promise<void> {
    while (this.inflight.size > 0) await Promise.allSettled([...this.inflight])
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
      await this.drain()
      return
    }
    this.disposed = true
    this.generation += 1
    for (const job of this.pending.splice(0)) job.complete(job.unknown('VERIFIER_ABORTED'))
    for (const item of this.active.values()) this.cancelActive(item, 'VERIFIER_ABORTED')
    await this.drain()
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
    const timeout = new Promise<void>(resolve => {
      timer = this.setTimer(() => {
        item.timedOut = true
        item.controller.abort()
        resolve()
      }, this.timeoutMs)
    })
    const underlying = Promise.resolve().then(() => item.job.run(item.controller.signal))
    try {
      const winner = await Promise.race([
        underlying.then(result => ({ kind: 'result' as const, result }), () => ({ kind: 'error' as const })),
        timeout.then(() => ({ kind: 'timeout' as const })),
      ])
      if (winner.kind === 'result') {
        if (!item.settled && !this.disposed && item.job.generation === this.generation && !item.cancelled) {
          item.settled = true
          item.job.complete(winner.result)
        }
      } else if (winner.kind === 'error') {
        if (!item.settled && !this.disposed && item.job.generation === this.generation) {
          item.settled = true
          item.job.complete(item.job.unknown(item.cancelled ? 'VERIFIER_ABORTED' : 'VERIFIER_RESULT_UNSUPPORTED', Math.max(0, this.clock() - item.startedAt)))
        }
      } else if (!item.settled && !this.disposed && item.job.generation === this.generation) {
        item.settled = true
        item.job.complete(item.job.unknown('VERIFIER_TIMEOUT', Math.max(0, this.clock() - item.startedAt)))
      }
      // A timeout/cancellation only publishes a logical terminal record. The
      // underlying shell operation remains owned until this await settles.
      await underlying.catch(() => undefined)
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
