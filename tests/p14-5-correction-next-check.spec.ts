import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution, ToolExecutionResult, ToolExecutionToken } from '@deepseek-ai/dsh-tools'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CORRECTION_NEXT_CHECK_ENDPOINT,
  CORRECTION_NEXT_CHECK_MAX_RESPONSE_CHARS,
  parseCorrectionNextCheckRead,
  parseCorrectionNextCheckRequest,
} from '../src/correction-next-check-contract.ts'
import { handleCorrectionNextCheckRpc } from '../src/host/correction-next-check-bridge.ts'
import { LiveCorrectionRuntime, liveCorrectionFindingId } from '../src/host/live-correction.ts'
import { RetryEscalationAnalyzer } from '../src/host/retry-escalation.ts'
import type { ExecutionId } from '../src/host/correlation.ts'
import { VerificationStore } from '../src/host/verification-store.ts'
import type { VerificationRecordV1, VerificationDiagnostics } from '../src/host/verification-store.ts'
import type { VerificationAdapterId } from '../src/host/expected-effect.ts'
import { ExpectedEffectRegistry } from '../src/host/expected-effect.ts'
import { PostconditionVerifier } from '../src/host/postcondition-verifier.ts'
import { handleOnlineCorrectionRpc } from '../src/host/online-correction-bridge.ts'

interface Environment {
  readonly owner: Session
  readonly live: LiveCorrectionRuntime
  readonly store: VerificationStore
  readonly sessions: { get: (id: string) => Session | undefined }
  readonly setNow: (value: number) => void
}

const environments: Environment[] = []
afterEach(() => { for (const env of environments.splice(0)) { env.live.dispose(); env.store.dispose() } })

function createEnvironment(id: string, opts: { readonly verifierTtl?: number } = {}): Environment {
  let now = 10_000
  const owner = { id, header: { cwd: '/workspace/phase14-5-fixture' } } as unknown as Session
  const env: Environment = {
    owner,
    live: new LiveCorrectionRuntime({ clock: () => now }),
    store: new VerificationStore({ clock: () => now, ttlMs: opts.verifierTtl ?? 5 * 60 * 1000 }),
    sessions: { get: (sessionId: string) => sessionId === owner.id ? owner : undefined },
    setNow: (value: number) => { now = value },
  }
  environments.push(env)
  return env
}

function execution(owner: Session, id: string, command = 'pnpm test'): ToolExecution {
  return {
    callId: id, rootCallId: id, name: 'bash', arguments: { command, description: 'Synthetic deterministic failure fixture' },
    agent: { session: owner }, signal: new AbortController().signal, token: Symbol(id) as ToolExecutionToken,
  } as unknown as ToolExecution
}

function failedResult(): ToolExecutionResult {
  return { isError: true, content: [], error: { message: 'private failure sentinel', info: { name: 'HarnessError', code: 'TOOL_TIMEOUT' } } } as ToolExecutionResult
}

function emitRealF1(env: Environment, id: string, command = 'pnpm test') {
  const analyzer = new RetryEscalationAnalyzer()
  const prior = execution(env.owner, `${id}-prior`, command)
  analyzer.observePreExecute(prior, `${id}-prior`)
  analyzer.observeResult(prior, failedResult())
  const current = execution(env.owner, id, command)
  analyzer.observePreExecute(current, id)
  analyzer.observeResult(current, failedResult())
  const summary = analyzer.diagnostics.get(id as ExecutionId)
  env.live.observeSettledResult(current, id as ExecutionId, summary)
  return { summary, finding: env.live.diagnostics.forSession(env.owner).findings.find(item => item.executionId === id)! }
}

type F2Pair = { readonly source: 'tool-contract' | 'known-adapter'; readonly adapterId: VerificationAdapterId }
const F2_PAIRS: readonly F2Pair[] = [
  { source: 'tool-contract', adapterId: 'tool.write.v1' },
  { source: 'tool-contract', adapterId: 'tool.edit.v1' },
  { source: 'known-adapter', adapterId: 'shell.mkdir.v1' },
  { source: 'known-adapter', adapterId: 'shell.copy-file.v1' },
  { source: 'known-adapter', adapterId: 'git.branch-switch.v1' },
  { source: 'known-adapter', adapterId: 'package.node-resolve.v1' },
]
const F2_CODES = [
  'INSPECT_WRITTEN_CONTENT_V1', 'INSPECT_EDIT_REPLACEMENT_V1', 'CHECK_DIRECTORY_POSTSTATE_V1',
  'CHECK_COPY_DESTINATION_V1', 'CHECK_ACTIVE_GIT_BRANCH_V1', 'CHECK_DEPENDENCY_RESOLUTION_V1',
] as const

function makeVerifierRecord(id: string, pair: F2Pair, observedAt = 10_000): VerificationRecordV1 {
  return Object.freeze({ schemaVersion: 1, executionId: id as ExecutionId, source: pair.source, adapterId: pair.adapterId,
    status: 'MISMATCHED', semanticSuccess: false, evidenceQuality: 'high',
    reasonCodes: Object.freeze(['POSTCONDITION_MISMATCH']), observedAt, durationMs: 2 })
}

function emitStoredF2(env: Environment, id: string, pair: F2Pair = F2_PAIRS[0]!, observedAt = 10_000) {
  // The Finding is produced by the accepted Phase 12 runtime from its Session association and stored verifier record.
  const base = execution(env.owner, id, 'safe synthetic operation')
  const attempted = { ...base, name: 'write', arguments: {
    file_path: '/private/phase14-5/synthetic-target.txt', content: 'PHASE14_5_PRIVATE_CONTENT_SENTINEL',
  } } as ToolExecution
  env.live.observeSettledResult(attempted, id as ExecutionId, undefined)
  const record = env.store.put(makeVerifierRecord(id, pair, observedAt), env.owner)
  env.live.observeVerification(record)
  const finding = env.live.diagnostics.forSession(env.owner).findings.find(item => item.executionId === id)!
  return { record, finding }
}

async function nextCheck(env: Environment, findingId: string, verification: VerificationDiagnostics = env.store.diagnostics) {
  return handleCorrectionNextCheckRpc(env.sessions as never, env.live.diagnostics, verification,
    CORRECTION_NEXT_CHECK_ENDPOINT, { sessionId: env.owner.id, findingId }, new AbortController().signal)
}

async function emitVerifierBackedF2(env: Environment, id: string, pair: F2Pair) {
  let attempted: ToolExecution
  let result: ToolExecutionResult
  if (pair.adapterId === 'tool.write.v1') {
    attempted = { ...execution(env.owner, id), name: 'write', arguments: {
      file_path: '/private/phase14-5/expected.txt', content: 'intended content sentinel',
    } } as ToolExecution
    result = { isError: false, content: [], value: {
      operation: 'create', path: '/private/phase14-5/expected.txt', before: null, after: 'different content',
    } } as ToolExecutionResult
  } else if (pair.adapterId === 'tool.edit.v1') {
    attempted = { ...execution(env.owner, id), name: 'edit', arguments: {
      file_path: '/private/phase14-5/edit.txt', old_string: 'old', new_string: 'new',
    } } as ToolExecution
    result = { isError: false, content: [], value: { path: '/private/phase14-5/edit.txt', before: 'old', after: 'wrong' } } as ToolExecutionResult
  } else {
    const command = pair.adapterId === 'shell.mkdir.v1' ? 'mkdir synthetic-directory'
      : pair.adapterId === 'shell.copy-file.v1' ? 'cp synthetic-source synthetic-destination'
        : pair.adapterId === 'git.branch-switch.v1' ? 'git switch expected-branch'
          : 'pnpm add synthetic-package'
    attempted = { ...execution(env.owner, id, command), arguments: { command, description: 'Synthetic verifier fixture' } } as ToolExecution
    result = { isError: false, content: [], value: { kind: 'foreground', exitCode: 0 } } as ToolExecutionResult
  }
  env.live.observeSettledResult(attempted, id as ExecutionId, undefined)
  const registry = new ExpectedEffectRegistry()
  registry.capture(attempted, id as ExecutionId)
  const verifier = new PostconditionVerifier(registry, { onRecord: record => env.live.observeVerification(record) })
  verifier.attach({
    resolve: (request: Record<string, unknown>) => request,
    run: async () => ({ exitCode: 0, timedOut: false, aborted: false,
      stdout: { text: pair.adapterId === 'git.branch-switch.v1' ? 'other-branch\n' : 'MISMATCHED', truncated: false },
      stderr: { text: '', truncated: false } }),
  })
  verifier.observeResult(attempted, result)
  // The accepted verifier schedules shell checks asynchronously. Let the
  // bounded scheduler settle before fencing its generation for this fixture.
  await new Promise(resolve => setTimeout(resolve, 0))
  await verifier.fenceAndDrain()
  const record = verifier.store.diagnostics.get(id as ExecutionId)
  if (record === undefined || record.status !== 'MISMATCHED' || record.reasonCodes[0] !== 'POSTCONDITION_MISMATCH') {
    await verifier.dispose()
    throw new Error(`trusted verifier fixture did not produce a mismatch for ${pair.adapterId}`)
  }
  const finding = env.live.diagnostics.forSession(env.owner).findings.find(item => item.executionId === id)
  if (finding === undefined) { await verifier.dispose(); throw new Error('trusted verifier record did not produce a Phase 12 Finding') }
  return { finding, record, verifier }
}

describe('Phase 14.5 evidence-bound Host projection N1–N8', () => {
  it('N1/N3 derives the optional F1 code only from the accepted contiguous RetryEscalationAnalyzer → LiveCorrection chain', async () => {
    const env = createEnvironment('n1-f1')
    const { summary, finding } = emitRealF1(env, 'n1-contiguous')
    expect(summary).toMatchObject({ status: 'READY', retryOf: 'n1-contiguous-prior', retryCount: 1, recentFailureCount: 2, sameRootCause: true, truncated: false })
    expect(finding).toMatchObject({ kind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', diagnosis: 'REPEATED_SAME_SIGNATURE_FAILURE',
      disposition: 'ADVISE', advisoryCode: 'STOP_EXACT_RETRY_PATH_V1', retryCount: 1, recentFailureCount: 2 })
    const result = await nextCheck(env, finding.findingId)
    expect(result).toMatchObject({ ok: true, value: { kind: 'VIEW', findingKind: 'REPEATED_FAILURE_WITHOUT_PROGRESS',
      checkCode: 'REVIEW_EXACT_RETRY_PREREQUISITES_V1', evidenceCode: 'F1_CONTIGUOUS_RETRY_FINDING_V1' } })
    const wire = JSON.stringify(result)
    expect(wire).not.toContain('n1-contiguous')
    expect(wire).not.toContain('private failure sentinel')
    expect(wire).not.toContain('/workspace/phase14-5-fixture')
    expect(env.live.diagnostics.get(finding.findingId)).toEqual(finding)
    const base = await handleOnlineCorrectionRpc(env.sessions as never, env.live.diagnostics,
      'risk-advisor/online-correction', { sessionId: env.owner.id }, new AbortController().signal)
    expect(base).toMatchObject({ ok: true, value: { kind: 'VIEW', view: { findings: [{ findingId: finding.findingId,
      kind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', advisoryCode: 'STOP_EXACT_RETRY_PATH_V1' }] } } })
  })

  it('N4 keeps a live F2 Finding intact when the separately stored verifier evidence expires or is unavailable', async () => {
    const env = createEnvironment('n4-expiry', { verifierTtl: 10 })
    const { finding } = emitStoredF2(env, 'n4-f2')
    expect((await nextCheck(env, finding.findingId)).value).toMatchObject({ kind: 'VIEW', evidenceCode: 'F2_CURRENT_VERIFIED_MISMATCH_V1' })
    env.setNow(10_011)
    expect((await nextCheck(env, finding.findingId)).value).toMatchObject({ kind: 'NOT_FOUND' })
    expect(env.live.diagnostics.forSession(env.owner).findings).toContainEqual(finding)

    const conflictRecord = Object.freeze({ ...makeVerifierRecord('n4-f2', F2_PAIRS[0]!, 10_000),
      status: 'UNKNOWN', semanticSuccess: 'unknown', evidenceQuality: 'low', reasonCodes: ['VERIFICATION_CONFLICT'] }) as unknown as VerificationRecordV1
    const conflictedRecord = { get: () => conflictRecord } as unknown as VerificationDiagnostics
    expect((await nextCheck(env, finding.findingId, conflictedRecord)).value).toMatchObject({ kind: 'NOT_FOUND' })
    expect(env.live.diagnostics.forSession(env.owner).findings).toContainEqual(finding)

    const unavailable = { get: (_id: ExecutionId) => { throw new Error('diagnostic unavailable') } }
    expect((await nextCheck(env, finding.findingId, unavailable)).value).toMatchObject({ kind: 'UNAVAILABLE', reasonCodes: ['EVIDENCE_UNAVAILABLE'] })
    expect(env.live.diagnostics.forSession(env.owner).findings).toContainEqual(finding)
  })

  it('N5 maps exactly the six accepted stored F2 adapter records and has no generic fallback', async () => {
    for (let index = 0; index < F2_PAIRS.length; index += 1) {
      const env = createEnvironment(`n5-${index}`)
      const { finding, record, verifier } = await emitVerifierBackedF2(env, `n5-f2-${index}`, F2_PAIRS[index]!)
      expect(verifier.store.diagnostics.get(record.executionId)).toEqual(record)
      const result = await nextCheck(env, finding.findingId, verifier.store.diagnostics)
      expect(result.value).toMatchObject({ kind: 'VIEW',
        findingKind: 'POSTCONDITION_NOT_SATISFIED', checkCode: F2_CODES[index], evidenceCode: 'F2_CURRENT_VERIFIED_MISMATCH_V1' })
      const wire = JSON.stringify(result)
      expect(wire).not.toContain('n5-f2-')
      expect(wire).not.toContain('tool-contract')
      expect(wire).not.toContain('known-adapter')
      expect(wire).not.toContain('/private/phase14-5/synthetic-target.txt')
      expect(wire).not.toContain('PHASE14_5_PRIVATE_CONTENT_SENTINEL')
      await verifier.dispose()
    }
    const env = createEnvironment('n5-unsupported')
    const { finding } = emitStoredF2(env, 'n5-unsupported-f2', F2_PAIRS[0]!)
    const unsupported = { get: () => ({ ...makeVerifierRecord('n5-unsupported-f2', F2_PAIRS[0]!), adapterId: 'tool.unknown.v1' }) } as unknown as VerificationDiagnostics
    expect((await nextCheck(env, finding.findingId, unsupported)).value).toMatchObject({ kind: 'NOT_FOUND' })
  })

  it('N3 does not derive an F1 check from an unsupported or noncontiguous Tool relation', async () => {
    const env = createEnvironment('n3-negative')
    const analyzer = new RetryEscalationAnalyzer()
    const first = execution(env.owner, 'n3-first', 'pnpm test')
    analyzer.observePreExecute(first, 'n3-first'); analyzer.observeResult(first, failedResult())
    const blocker = { ...execution(env.owner, 'n3-unsupported', 'pnpm test --force'), arguments: {} } as ToolExecution
    analyzer.observePreExecute(blocker, 'n3-unsupported'); analyzer.observeResult(blocker, failedResult())
    const current = execution(env.owner, 'n3-last', 'pnpm test')
    analyzer.observePreExecute(current, 'n3-last'); analyzer.observeResult(current, failedResult())
    const summary = analyzer.diagnostics.get('n3-last' as ExecutionId)
    env.live.observeSettledResult(current, 'n3-last' as ExecutionId, summary)
    expect(summary.retryOf).toBeUndefined()
    expect(env.live.diagnostics.forSession(env.owner).findings).toEqual([])
    expect((await nextCheck(env, liveCorrectionFindingId('n3-last', 'REPEATED_FAILURE_WITHOUT_PROGRESS'))).value).toMatchObject({ kind: 'NOT_FOUND' })
  })

  it('N2 selects only the current top Finding by observedAt then findingId and binds the exact Session object', async () => {
    const env = createEnvironment('n2-order')
    const a = emitRealF1(env, 'n2-a')
    const b = emitRealF1(env, 'n2-b')
    const top = [a.finding, b.finding].sort((left, right) => right.observedAt - left.observedAt || left.findingId.localeCompare(right.findingId))[0]!
    const old = top.findingId === a.finding.findingId ? b.finding : a.finding
    expect((await nextCheck(env, old.findingId)).value).toMatchObject({ kind: 'NOT_FOUND' })
    expect((await nextCheck(env, top.findingId)).value).toMatchObject({ kind: 'VIEW', findingId: top.findingId })
    const sameIdDifferentSession = { id: env.owner.id, header: env.owner.header } as unknown as Session
    const foreign = { get: (id: string) => id === env.owner.id ? sameIdDifferentSession : undefined }
    const result = await handleCorrectionNextCheckRpc(foreign as never, env.live.diagnostics, env.store.diagnostics,
      CORRECTION_NEXT_CHECK_ENDPOINT, { sessionId: env.owner.id, findingId: top.findingId }, new AbortController().signal)
    expect(result.value).toMatchObject({ kind: 'NOT_FOUND' })
    env.live.disposeSession(env.owner)
    expect((await nextCheck(env, top.findingId)).value).toMatchObject({ kind: 'NOT_FOUND' })
  })

  it('N7 revalidates the exact stored verifier projection immediately before VIEW', async () => {
    const env = createEnvironment('n7-reentrant')
    const { finding, record } = emitStoredF2(env, 'n7-f2')
    let reads = 0
    const reentrant = { get: (id: ExecutionId) => {
      reads += 1
      return reads === 1 ? record : Object.freeze({ ...record, status: 'UNKNOWN', semanticSuccess: 'unknown', evidenceQuality: 'low', reasonCodes: ['VERIFICATION_CONFLICT'] })
    } } as unknown as VerificationDiagnostics
    expect((await nextCheck(env, finding.findingId, reentrant)).value).toMatchObject({ kind: 'NOT_FOUND' })
    expect(reads).toBe(2)
    expect(env.live.diagnostics.forSession(env.owner).findings).toContainEqual(finding)
  })

  it('N6 enforces exact request/response keys, cross-field codes, bounded wire and no internal selector', async () => {
    const id = liveCorrectionFindingId('opaque-execution', 'REPEATED_FAILURE_WITHOUT_PROGRESS')
    expect(parseCorrectionNextCheckRequest({ sessionId: 'safe-session', findingId: id })).toEqual({ sessionId: 'safe-session', findingId: id })
    expect(parseCorrectionNextCheckRequest({ sessionId: 'safe-session', findingId: id, adapterId: 'tool.write.v1' })).toBeUndefined()
    expect(parseCorrectionNextCheckRequest({ sessionId: 'safe-session', findingId: id, executionId: 'private' })).toBeUndefined()
    expect(parseCorrectionNextCheckRequest({ sessionId: 'x'.repeat(257), findingId: id })).toBeUndefined()
    const valid = { schemaVersion: 1, kind: 'VIEW', sessionId: 'safe-session', findingId: id,
      findingKind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', checkCode: 'REVIEW_EXACT_RETRY_PREREQUISITES_V1',
      evidenceCode: 'F1_CONTIGUOUS_RETRY_FINDING_V1', observedAt: 1 }
    expect(parseCorrectionNextCheckRead(valid)).toMatchObject({ kind: 'VIEW' })
    expect(parseCorrectionNextCheckRead({ ...valid, checkCode: 'INSPECT_WRITTEN_CONTENT_V1' })).toBeUndefined()
    expect(parseCorrectionNextCheckRead({ ...valid, executionId: 'secret' })).toBeUndefined()
    expect(parseCorrectionNextCheckRead({ ...valid, observedAt: Number.POSITIVE_INFINITY })).toBeUndefined()
    expect(new TextEncoder().encode(JSON.stringify(parseCorrectionNextCheckRead(valid))).length).toBeLessThanOrEqual(CORRECTION_NEXT_CHECK_MAX_RESPONSE_CHARS)
    const env = createEnvironment('n6-bad-request')
    expect((await handleCorrectionNextCheckRpc(env.sessions as never, env.live.diagnostics, env.store.diagnostics,
      CORRECTION_NEXT_CHECK_ENDPOINT, { sessionId: env.owner.id, findingId: id, adapterId: 'tool.write.v1' }, new AbortController().signal)).ok).toBe(false)
    expect((await handleCorrectionNextCheckRpc(env.sessions as never, env.live.diagnostics, env.store.diagnostics,
      'unknown-endpoint', { sessionId: env.owner.id, findingId: id }, new AbortController().signal)).ok).toBe(false)
    expect((await handleCorrectionNextCheckRpc(env.sessions as never, env.live.diagnostics, env.store.diagnostics,
      CORRECTION_NEXT_CHECK_ENDPOINT, { sessionId: env.owner.id, findingId: id }, AbortSignal.abort())).ok).toBe(false)
  })

  it('N8 keeps the dock in its existing slot and current-only route never touches the Tool/approval waterfall', async () => {
    const source = await readFile(join(process.cwd(), 'src/index.ts'), 'utf8')
    const clientSource = await readFile(join(process.cwd(), 'src/client/index.ts'), 'utf8')
    const dockSource = await readFile(join(process.cwd(), 'src/client/OnlineCorrectionDock.tsx'), 'utf8')
    const contract = await readFile(join(process.cwd(), 'src/online-correction-contract.ts'), 'utf8')
    expect(source).toContain("ctx.inject(['connection', 'sessions']")
    expect(source).toContain('installCorrectionNextCheckBrowserBridge(bridgeCtx, connection as OnlineCorrectionHostConnectionLike')
    expect(source.match(/installCorrectionNextCheckBrowserBridge\(/g)).toHaveLength(1)
    expect(clientSource).toContain("id: 'risk-advisor-online-correction'")
    expect(clientSource).not.toContain('risk-advisor-correction-next-check-dock')
    expect(dockSource).toContain('CorrectionNextCheckBoundary')
    expect(dockSource.indexOf('<CorrectionNextCheckSection')).toBeLessThan(dockSource.indexOf('data-correction-history'))
    expect(contract).toContain("export const ONLINE_CORRECTION_ROUTE = '/api/risk-advisor/online-correction' as const")
    const bridge = await readFile(join(process.cwd(), 'src/host/correction-next-check-bridge.ts'), 'utf8')
    expect(bridge).not.toContain('ExpectedEffectRegistry')
    expect(bridge).not.toContain('ToolExecution')
    expect(bridge).not.toContain('GuidanceDiagnostics')
    expect(bridge).not.toContain('postconditionVerifier')
  })
})

describe('Phase 14.5 controlled Host read performance N12', () => {
  it('stays within p95 5ms / p99 10ms for 1, 64, 256 Finding and 512-verifier pressure', async () => {
    for (const total of [1, 64, 256]) {
      const env = createEnvironment(`n12-${total}`)
      const owners = Array.from({ length: Math.max(1, Math.ceil(total / 64)) }, (_, index) =>
        index === 0 ? env.owner : { id: `n12-${total}-session-${index}`, header: {} } as unknown as Session)
      const analyzers = owners.map(() => new RetryEscalationAnalyzer())
      for (let index = 0; index < total; index += 1) {
        const ownerIndex = Math.floor(index / 64)
        const owner = owners[ownerIndex]!
        const analyzer = analyzers[ownerIndex]!
        const id = `n12-${total}-finding-${index}`
        const prior = execution(owner, `${id}-prior`)
        analyzer.observePreExecute(prior, `${id}-prior`)
        analyzer.observeResult(prior, failedResult())
        const current = execution(owner, id)
        analyzer.observePreExecute(current, id)
        analyzer.observeResult(current, failedResult())
        env.live.observeSettledResult(current, id as ExecutionId, analyzer.diagnostics.get(id as ExecutionId))
      }
      const selectedSession = owners[0]!
      const selected = [...env.live.diagnostics.forSession(selectedSession).findings]
        .sort((a, b) => b.observedAt - a.observedAt || a.findingId.localeCompare(b.findingId))[0]!
      const samples: number[] = []
      for (let index = 0; index < 350; index += 1) {
        const started = performance.now()
        await handleCorrectionNextCheckRpc(env.sessions as never, env.live.diagnostics, env.store.diagnostics,
          CORRECTION_NEXT_CHECK_ENDPOINT, { sessionId: selectedSession.id, findingId: selected.findingId }, new AbortController().signal)
        if (index >= 50) samples.push(performance.now() - started)
      }
      if (total === 256) {
        for (let index = 0; index < 512; index += 1) env.store.put(Object.freeze({ schemaVersion: 1,
          executionId: `n12-verifier-pressure-${index}` as ExecutionId, source: 'tool-contract', adapterId: 'tool.write.v1',
          status: 'UNKNOWN', semanticSuccess: 'unknown', evidenceQuality: 'low', reasonCodes: Object.freeze(['RUNTIME_STATE_LOST']), observedAt: 10_000, durationMs: 1 }))
        env.setNow(10_001)
        const f2Id = 'n12-f2-verifier-pressure' as ExecutionId
        env.live.observeSettledResult(execution(env.owner, String(f2Id), 'safe synthetic operation'), f2Id, undefined)
        const record = env.store.put(makeVerifierRecord(String(f2Id), F2_PAIRS[0]!, 10_001), env.owner)
        env.live.observeVerification(record)
        const f2Finding = env.live.diagnostics.forSession(env.owner).findings.find(item => item.executionId === f2Id)!
        // This variant exercises VerificationStore.get with its full 512-record bound while retaining the same live F1 set.
        samples.length = 0
        for (let index = 0; index < 350; index += 1) {
          const started = performance.now()
          await handleCorrectionNextCheckRpc(env.sessions as never, env.live.diagnostics, env.store.diagnostics,
            CORRECTION_NEXT_CHECK_ENDPOINT, { sessionId: selectedSession.id, findingId: f2Finding.findingId }, new AbortController().signal)
          if (index >= 50) samples.push(performance.now() - started)
        }
      }
      samples.sort((a, b) => a - b)
      const p95 = samples[Math.floor(samples.length * 0.95)]!
      const p99 = samples[Math.floor(samples.length * 0.99)]!
      expect({ total, p95, p99 }).toMatchObject({ total })
      expect(p95).toBeLessThanOrEqual(5)
      expect(p99).toBeLessThanOrEqual(10)
    }
  }, 60_000)
})
