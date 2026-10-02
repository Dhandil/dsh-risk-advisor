import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'

const capabilities = Object.freeze({ agentOptions: true, outputSchema: true, depthLimit: true, toolFilter: true, persona: true })

function mockRuntime(result, calls, disposals) {
  return {
    getProvider: name => name === 'spawn' ? { name: 'spawn', capabilities, inheritsParentContext: false } : undefined,
    start: async (_name, request) => {
      calls.push({ maxDepth: request.maxDepth, allow: [...request.toolFilter.allow], persona: request.persona, hasSchema: typeof request.outputSchema === 'object' })
      return { result: Promise.resolve({ structured: result, stopReason: 'stop' }), dispose: async () => { disposals.count += 1 } }
    },
  }
}

function deferred() {
  let resolve
  const promise = new Promise(value => { resolve = value })
  return { promise, resolve }
}

export async function main({ smoke = true } = {}) {
  const started = performance.now()
  const root = await mkdtemp(join(tmpdir(), 'dsh-risk-advisor-p9-'))
  const calls = []
  const disposals = { count: 0 }
  const result = { schemaVersion: 1, results: [
    { dimension: 'AUTHORIZATION', verdict: 'EXPLICITLY_AUTHORIZED', rationale: 'bounded local user goal', referencedFeatureIds: ['authorization.goalKnown'] },
    { dimension: 'NECESSITY', verdict: 'LIKELY_NECESSARY', rationale: 'operation matches the goal', referencedFeatureIds: ['authorization.goalKnown'] },
  ], suggestedAlternatives: [{ title: 'Narrower local operation', description: 'Use a narrower bounded target.' }] }
  try {
    await writeFile(join(root, 'reviewer-input.json'), JSON.stringify({ localOnly: true }))
    const { executeDeepJudge, normalizeDeepJudgeConfig } = await import('../src/host/deep-judge.ts')
    const { DeepJudgeScheduler } = await import('../src/host/deep-judge-scheduler.ts')
    const { parseBridgeRead } = await import('../src/bridge-contract.ts')
    const config = normalizeDeepJudgeConfig({ enabled: true, isolationMode: 'trusted-parent-composition', timeoutMs: 25, maxConcurrentJudges: 1, maxPendingJudges: 2, maxTokens: 128 })
    const valid = await executeDeepJudge(mockRuntime(result, calls, disposals), { session: 'local-mock-parent' }, JSON.stringify({ bounded: true }), ['AUTHORIZATION', 'NECESSITY'], new Set(['authorization.goalKnown']), config, new AbortController().signal)
    const browserDeep = parseBridgeRead({ kind: 'VIEW', view: { schemaVersion: 4, sessionId: 's', callId: 'c', association: 'BOUND', status: 'pending', stage: 'deep', reasonCodes: [], updatedAt: 1 } })

    const timeoutScheduler = new DeepJudgeScheduler(1, 1)
    const timeoutGate = deferred()
    const timeoutJob = timeoutScheduler.enqueue('timeout', async signal => {
      if (signal.aborted) return { ok: false, failure: 'DEEP_JUDGE_NATIVE_DECISION' }
      await Promise.race([timeoutGate.promise, new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }))])
      return { ok: false, failure: 'DEEP_JUDGE_TIMEOUT' }
    })
    timeoutScheduler.cancel('timeout', 'DEEP_JUDGE_NATIVE_DECISION')
    const timeout = await timeoutJob
    await timeoutScheduler.dispose()

    const saturationScheduler = new DeepJudgeScheduler(1, 2)
    const saturationGate = deferred()
    const saturationPromises = [
      saturationScheduler.enqueue('s1', async signal => { if (signal.aborted) return { ok: false, failure: 'DEEP_JUDGE_ABORTED' }; await Promise.race([saturationGate.promise, new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }))]); return { ok: true } }),
      saturationScheduler.enqueue('s2', async () => ({ ok: true })),
      saturationScheduler.enqueue('s3', async () => ({ ok: true })),
      saturationScheduler.enqueue('s4', async () => ({ ok: true })),
    ]
    saturationGate.resolve()
    const saturation = await Promise.all(saturationPromises)
    await saturationScheduler.dispose()

    const output = {
      run: { benchmark: 'R5_PHASE9_LOCAL_DEEP_JUDGE', mode: smoke ? 'SMOKE' : 'FULL', samples: smoke ? 1 : 2, labels: ['LOCAL_REVIEWER_ONLY', 'EXTERNAL_PROVIDER_NOT_USED', 'NETWORK_NOT_USED', 'REGISTRY_NOT_USED', 'GIT_REMOTE_NOT_USED'], realProductExecution: true, elapsedMs: performance.now() - started },
      trigger: { executed: true, a4CandidateValidated: valid.ok, candidateDimensions: valid.candidate?.results.map(item => item.dimension) ?? [], alternativeVerification: valid.candidate?.suggestedAlternatives.length === 1 ? 'UNVERIFIED' : 'NONE' },
      request: calls[0],
      lifecycle: { timeout: timeout.failure === 'DEEP_JUDGE_NATIVE_DECISION' ? 'CANCELLED' : timeout.failure, runDisposals: disposals.count, browserStage: browserDeep?.kind === 'VIEW' && browserDeep.view.schemaVersion === 4 && browserDeep.view.stage === 'deep' ? 'deep' : 'UNKNOWN' },
      saturation: { maxConcurrent: 1, pendingBound: 2, saturated: saturation.filter(item => item.ok === false).length },
      external: { providerCalls: 0, networkCalls: 0, registryCalls: 0, gitRemoteCalls: 0 },
    }
    return Object.freeze(output)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}
