import { performance } from 'node:perf_hooks'

const clock = () => performance.now()

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, Math.max(0, ms)))
}

class BoundedJudgeQueue {
  constructor({ concurrency, maxPending }) {
    this.concurrency = concurrency
    this.maxPending = maxPending
    this.active = 0
    this.pending = []
    this.maxActive = 0
    this.maxQueueDepth = 0
    this.idleResolvers = []
  }

  submit(run) {
    if (this.pending.length >= this.maxPending) {
      return Promise.resolve({ accepted: false, status: 'BACKPRESSURE' })
    }
    return new Promise(resolve => {
      this.pending.push({ run, resolve, enqueuedAt: clock() })
      this.maxQueueDepth = Math.max(this.maxQueueDepth, this.pending.length)
      this.pump()
    })
  }

  pump() {
    while (this.active < this.concurrency && this.pending.length > 0) {
      const job = this.pending.shift()
      if (job === undefined) break
      this.active += 1
      this.maxActive = Math.max(this.maxActive, this.active)
      const startedAt = clock()
      Promise.resolve()
        .then(() => job.run())
        .then(result => job.resolve({
          accepted: true,
          status: 'SETTLED',
          queueWaitMs: startedAt - job.enqueuedAt,
          executeMs: clock() - startedAt,
          result,
        }))
        .catch(error => job.resolve({
          accepted: true,
          status: 'FAILED',
          queueWaitMs: startedAt - job.enqueuedAt,
          executeMs: clock() - startedAt,
          error: String(error?.name ?? 'Error'),
        }))
        .finally(() => {
          this.active -= 1
          this.pump()
          if (this.active === 0 && this.pending.length === 0) {
            const resolvers = this.idleResolvers.splice(0)
            for (const resolve of resolvers) resolve()
          }
        })
    }
  }

  onIdle() {
    if (this.active === 0 && this.pending.length === 0) return Promise.resolve()
    return new Promise(resolve => this.idleResolvers.push(resolve))
  }
}

async function oneJob(queue, { judgeMs, timeoutMs, jobId }) {
  const start = clock()
  const contextStart = clock()
  await delay(1)
  const contextBuildMs = clock() - contextStart
  const deterministicStart = clock()
  await delay(1)
  const deterministicMs = clock() - deterministicStart
  const deterministicEnd = clock()
  const judge = queue.submit(async () => {
    // Deliberately ignores cancellation to prove late completion cannot mutate
    // the retired result. This is a simulation-only mock task.
    await delay(judgeMs)
    return { jobId, risk: 'unknown' }
  })
  const timeout = new Promise(resolve => setTimeout(() => resolve({ accepted: true, status: 'TIMEOUT' }), timeoutMs))
  const judgeOutcome = await Promise.race([judge, timeout])
  const retiredAt = clock()
  const measurement = {
    contextBuildMs,
    deterministicMs,
    judgeOutcome,
    judgeQueueWaitMs: judgeOutcome.queueWaitMs ?? null,
    judgeExecuteMs: judgeOutcome.executeMs ?? null,
    simulatedTtfMs: 0,
    simulatedTtFinalMs: 0,
    simulatedPublishMs: 0,
    lateCompletion: false,
  }
  if (judgeOutcome.status === 'TIMEOUT') {
    void judge.then(result => {
      if (result.status === 'SETTLED') measurement.lateCompletion = true
    })
  }
  await delay(1)
  const publishMs = clock() - retiredAt
  measurement.simulatedPublishMs = publishMs
  measurement.simulatedTtfMs = deterministicEnd - start
  measurement.simulatedTtFinalMs = clock() - start
  return measurement
}

export async function runControlledSimulation({ trials = 12, burstSize = 12, concurrency = 2, maxPending = 4, judgeMs = 8, timeoutMs = 3 } = {}) {
  const measurements = []
  let rejectedByBackpressure = 0
  let timeoutCount = 0
  let lateCompletionCount = 0
  let maxActive = 0
  let maxQueueDepth = 0
  for (let trial = 0; trial < trials; trial += 1) {
    const queue = new BoundedJudgeQueue({ concurrency, maxPending })
    const jobs = Array.from({ length: burstSize }, (_, jobId) => oneJob(queue, { judgeMs, timeoutMs, jobId }))
    const result = await Promise.all(jobs)
    await queue.onIdle()
    maxActive = Math.max(maxActive, queue.maxActive)
    maxQueueDepth = Math.max(maxQueueDepth, queue.maxQueueDepth)
    for (const measurement of result) {
      measurements.push(measurement)
      if (measurement.judgeOutcome.status === 'BACKPRESSURE') rejectedByBackpressure += 1
      if (measurement.judgeOutcome.status === 'TIMEOUT') timeoutCount += 1
      if (measurement.lateCompletion) lateCompletionCount += 1
    }
  }
  return Object.freeze({
    evidenceLevel: 'CONTROLLED_SIMULATION',
    config: { trials, burstSize, concurrency, maxPending, judgeMs, timeoutMs },
    measurements,
    rejectedByBackpressure,
    timeoutCount,
    lateCompletionCount,
    maxActive,
    maxQueueDepth,
  })
}
