export type EvidenceJobResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: 'TIMEOUT' | 'SATURATED' | 'CANCELLED' | 'ERROR' }

interface Job<T> { readonly key: string; readonly run: (signal: AbortSignal) => Promise<T>; resolve: (value: EvidenceJobResult<T>) => void; controller?: AbortController }

/** Phase-8 scheduler. A timed-out underlying promise remains owned until settle. */
export class EvidenceScheduler {
  private readonly pending: Array<Job<unknown>> = []
  private readonly active = new Set<Promise<unknown>>()
  private readonly controllers = new Map<string, AbortController>()
  private readonly keys = new Set<string>()
  private disposed = false
  constructor(private readonly maxConcurrent = 2, private readonly maxPending = 8, private readonly timeoutMs = 5000) {}

  enqueue<T>(key: string, run: (signal: AbortSignal) => Promise<T>): Promise<EvidenceJobResult<T>> {
    if (this.disposed) return Promise.resolve({ ok: false, reason: 'CANCELLED' })
    if (this.keys.has(key)) return Promise.resolve({ ok: false, reason: 'SATURATED' })
    if (this.pending.length >= this.maxPending) return Promise.resolve({ ok: false, reason: 'SATURATED' })
    return new Promise<EvidenceJobResult<T>>(resolve => {
      this.keys.add(key)
      this.pending.push({ key, run, resolve: resolve as (value: EvidenceJobResult<unknown>) => void })
      this.pump()
    })
  }

  cancel(key: string): void {
    this.controllers.get(key)?.abort()
    for (const job of this.pending.filter(item => item.key === key)) job.resolve({ ok: false, reason: 'CANCELLED' })
    for (let index = this.pending.length - 1; index >= 0; index -= 1) if (this.pending[index]!.key === key) this.pending.splice(index, 1)
    if (!this.controllers.has(key)) this.keys.delete(key)
  }

  async dispose(): Promise<void> {
    if (this.disposed) return
    this.disposed = true
    for (const controller of this.controllers.values()) controller.abort()
    for (const job of this.pending.splice(0)) job.resolve({ ok: false, reason: 'CANCELLED' })
    while (this.active.size > 0) await Promise.allSettled([...this.active])
    this.controllers.clear()
    this.keys.clear()
  }

  private pump(): void {
    if (this.disposed) return
    while (this.active.size < this.maxConcurrent && this.pending.length > 0) {
      const job = this.pending.shift()!
      const controller = new AbortController()
      job.controller = controller
      this.controllers.set(job.key, controller)
      const owned = this.run(job, controller)
      this.active.add(owned)
      void owned.finally(() => { this.active.delete(owned); this.controllers.delete(job.key); this.keys.delete(job.key); this.pump() })
    }
  }

  private async run(job: Job<unknown>, controller: AbortController): Promise<unknown> {
    let timer: ReturnType<typeof setTimeout> | undefined
    let timedOut = false
    const work = Promise.resolve().then(() => job.run(controller.signal))
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { timedOut = true; controller.abort(); reject(new Error('EVIDENCE_TIMEOUT')) }, this.timeoutMs) })
    try {
      const value = await Promise.race([work, timeout])
      if (!timedOut) job.resolve({ ok: true, value })
      return work.catch(() => undefined)
    } catch (error) {
      if (timedOut) job.resolve({ ok: false, reason: 'TIMEOUT' })
      else if (controller.signal.aborted || this.disposed) job.resolve({ ok: false, reason: 'CANCELLED' })
      else job.resolve({ ok: false, reason: 'ERROR' })
      return work.catch(() => undefined)
    } finally { if (timer !== undefined) clearTimeout(timer) }
  }
}
