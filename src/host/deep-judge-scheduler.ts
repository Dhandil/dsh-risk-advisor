import type { DeepJudgeExecutionResult, DeepJudgeFailureCode } from './deep-judge.ts'

interface Job {
  readonly key: string
  readonly run: (signal: AbortSignal) => Promise<DeepJudgeExecutionResult>
  readonly resolve: (result: DeepJudgeExecutionResult) => void
}

/** Dedicated holder-owned scheduler for Deep Judge runs. */
export class DeepJudgeScheduler {
  private readonly queue: Job[] = []
  private readonly active = new Map<string, { readonly controller: AbortController; readonly promise: Promise<void> }>()
  private stopped = false

  constructor(private readonly maxConcurrent: number, private readonly maxPending: number) {
    if (!positive(maxConcurrent, 2) || !Number.isSafeInteger(maxPending) || maxPending < 0 || maxPending > 8) throw new RangeError('Deep Judge scheduler bounds are invalid')
  }

  enqueue(key: string, run: (signal: AbortSignal) => Promise<DeepJudgeExecutionResult>): Promise<DeepJudgeExecutionResult> {
    if (this.stopped) return Promise.resolve({ ok: false, failure: 'DEEP_JUDGE_GENERATION_DISPOSED' })
    if (this.active.has(key) || this.queue.some(item => item.key === key)) return Promise.resolve({ ok: false, failure: 'DEEP_JUDGE_SUPERSEDED' })
    if (this.active.size >= this.maxConcurrent && this.queue.length >= this.maxPending) return Promise.resolve({ ok: false, failure: 'DEEP_JUDGE_QUEUE_SATURATED' })
    return new Promise(resolve => { this.queue.push({ key, run, resolve }); this.pump() })
  }

  cancel(key: string, failure: DeepJudgeFailureCode = 'DEEP_JUDGE_NATIVE_DECISION'): void {
    const index = this.queue.findIndex(item => item.key === key)
    if (index >= 0) { const [job] = this.queue.splice(index, 1); job!.resolve({ ok: false, failure }); return }
    this.active.get(key)?.controller.abort()
  }

  async dispose(): Promise<void> {
    if (this.stopped) return
    this.stopped = true
    while (this.queue.length > 0) this.queue.shift()!.resolve({ ok: false, failure: 'DEEP_JUDGE_GENERATION_DISPOSED' })
    for (const item of this.active.values()) item.controller.abort()
    await Promise.all([...this.active.values()].map(item => item.promise))
  }

  get activeCount(): number { return this.active.size }
  get pendingCount(): number { return this.queue.length }

  private pump(): void {
    while (!this.stopped && this.active.size < this.maxConcurrent && this.queue.length > 0) {
      const job = this.queue.shift()!
      const controller = new AbortController()
      const promise = Promise.resolve().then(() => job.run(controller.signal))
        .then(result => job.resolve(result), () => job.resolve({ ok: false, failure: 'DEEP_JUDGE_STREAM_ERROR' as const }))
        .finally(() => { this.active.delete(job.key); this.pump() })
      this.active.set(job.key, { controller, promise })
    }
  }
}

function positive(value: unknown, max: number): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= max }
