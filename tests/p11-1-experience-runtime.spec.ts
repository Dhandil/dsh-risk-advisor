import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { apply } from '../src/index.ts'
import { ExpectedEffectRegistry } from '../src/host/expected-effect.ts'
import { ExperienceRuntime, createExperienceEpisode } from '../src/host/experience-store.ts'
import { experienceEpisodeKey } from '../src/host/experience-schema.ts'
import { PostconditionVerifier } from '../src/host/postcondition-verifier.ts'
import {
  createExecutionFixture,
  createFakeStorageFixture,
  createJsonStorageFixture,
  failureResult,
  observeApproval,
  observeSettled,
  successResult,
} from './p11-1-experience-fixtures.ts'
import type { ExecutionFixture, JsonStorageFixture } from './p11-1-experience-fixtures.ts'
import type { ToolExecutionResult } from '@deepseek-ai/dsh-tools'

const tempRoots: string[] = []

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function jsonFixture(root?: string): Promise<JsonStorageFixture> {
  const fixture = await createJsonStorageFixture(root)
  if (!tempRoots.includes(fixture.root)) tempRoots.push(fixture.root)
  return fixture
}

function runtimeFor(fixture: ExecutionFixture, options: { clock?: () => number; platform?: string } = {}): ExperienceRuntime {
  return new ExperienceRuntime(fixture.rules.diagnostics, fixture.failureChain.diagnostics, options)
}

async function waitForEpisode(runtime: ExperienceRuntime, executionId: string) {
  const key = experienceEpisodeKey(executionId)
  await vi.waitFor(() => expect(runtime.diagnostics.get(key)).toBeDefined())
  return runtime.diagnostics.get(key)!
}

async function recordOne(runtime: ExperienceRuntime, fixture: ExecutionFixture, result: ToolExecutionResult = successResult()) {
  observeSettled(fixture, runtime, result)
  return waitForEpisode(runtime, fixture.executionId)
}

async function closeRuntimeAndFixture(runtime: ExperienceRuntime, fixture: JsonStorageFixture): Promise<void> {
  await runtime.detach()
  await fixture.close()
}

describe('Phase 11.1 Experience settlement and durable lifecycle', () => {
  it('E1 records one allowed tools/result attempt without semantic qualification', async () => {
    const backing = await jsonFixture()
    const execution = createExecutionFixture()
    const runtime = runtimeFor(execution, { clock: () => 1_800_000_000_000, platform: 'darwin' })
    await runtime.attach(backing.facility)
    observeApproval(execution, 'allowed-once')
    expect(runtime.diagnostics.size()).toBe(0)

    const episode = await recordOne(runtime, execution)
    expect(episode).toMatchObject({
      schemaVersion: 1,
      sourceExecutionId: execution.executionId,
      observedAt: 1_800_000_000_000,
      runtime: { platform: 'darwin' },
      approval: { observed: true, outcome: 'allowed-once' },
      terminal: { isError: false },
      provenance: { source: 'LIVE_TOOLS_RESULT' },
    })
    expect(JSON.stringify(episode)).not.toMatch(/VERIFIED_SUCCESS|VERIFIED_FAILURE/)
    expect(runtime.diagnostics.size()).toBe(1)
    await closeRuntimeAndFixture(runtime, backing)
  })

  it.each([
    ['E2', 'rejected'],
    ['E3', 'cancelled'],
    ['E4', 'unavailable'],
  ] as const)('%s commits exactly one Episode with the exact approval outcome', async (_case, outcome) => {
    const backing = await jsonFixture()
    const execution = createExecutionFixture()
    const runtime = runtimeFor(execution)
    await runtime.attach(backing.facility)
    observeApproval(execution, outcome)

    const episode = await recordOne(runtime, execution, failureResult())
    expect(episode.approval).toEqual({ observed: true, outcome })
    expect(episode.terminal).toEqual({ isError: true, error: { name: 'ProbeFailure', code: 'PROBE_FAILURE' } })
    expect(runtime.diagnostics.size()).toBe(1)
    await closeRuntimeAndFixture(runtime, backing)
  })

  it('E5 records no fabricated approval when no exact approval observation exists', async () => {
    const backing = await jsonFixture()
    const execution = createExecutionFixture()
    const runtime = runtimeFor(execution)
    await runtime.attach(backing.facility)

    const episode = await recordOne(runtime, execution)
    expect(episode.approval).toEqual({ observed: false })
    await closeRuntimeAndFixture(runtime, backing)
  })

  it('E6 serializes no raw command, paths, content, approval justification, result body, or live private IDs', async () => {
    const backing = await jsonFixture()
    const execution = createExecutionFixture({
      name: 'bash',
      arguments: {
        command: 'echo PRIVATE_COMMAND_SENTINEL',
        description: 'PRIVATE_DESCRIPTION_SENTINEL',
        workdir: '/PRIVATE_CWD_SENTINEL',
        sandbox_permissions: 'danger-full-access',
        justification: 'PRIVATE_JUSTIFICATION_SENTINEL',
        file_path: '/PRIVATE_PATH_SENTINEL',
        content: 'PRIVATE_FILE_CONTENT_SENTINEL',
        old_string: 'PRIVATE_OLD_SENTINEL',
        new_string: 'PRIVATE_NEW_SENTINEL',
      },
      callId: 'PRIVATE_CALL_ID_SENTINEL',
      sessionId: 'PRIVATE_SESSION_ID_SENTINEL',
    })
    const runtime = runtimeFor(execution)
    await runtime.attach(backing.facility)
    observeApproval(execution, 'allowed-once', 'PRIVATE_APPROVAL_ID_SENTINEL')

    const episode = await recordOne(runtime, execution, failureResult({
      message: 'PRIVATE_ERROR_MESSAGE_SENTINEL',
      reason: 'PRIVATE_ERROR_REASON_SENTINEL',
      content: 'PRIVATE_STDOUT_SENTINEL',
    }))
    const recordPath = join(backing.root, 'risk_advisor_experience', 'episodes', `${episode.episodeId}.json`)
    const serialized = await readFile(recordPath, 'utf8')
    for (const sentinel of [
      'PRIVATE_COMMAND_SENTINEL', 'PRIVATE_DESCRIPTION_SENTINEL', 'PRIVATE_CWD_SENTINEL',
      'PRIVATE_JUSTIFICATION_SENTINEL', 'PRIVATE_PATH_SENTINEL', 'PRIVATE_FILE_CONTENT_SENTINEL',
      'PRIVATE_OLD_SENTINEL', 'PRIVATE_NEW_SENTINEL', 'PRIVATE_ERROR_MESSAGE_SENTINEL',
      'PRIVATE_ERROR_REASON_SENTINEL', 'PRIVATE_STDOUT_SENTINEL', 'PRIVATE_CALL_ID_SENTINEL',
      'PRIVATE_SESSION_ID_SENTINEL', 'PRIVATE_APPROVAL_ID_SENTINEL',
    ]) expect(serialized).not.toContain(sentinel)
    expect(JSON.parse(serialized)).toBeDefined()
    await closeRuntimeAndFixture(runtime, backing)
  })

  it('E7 restores the same immutable Episode identity after reopening the JSON medium', async () => {
    const firstMedium = await jsonFixture()
    const execution = createExecutionFixture()
    const firstRuntime = runtimeFor(execution, { clock: () => 1_800_000_000_000 })
    await firstRuntime.attach(firstMedium.facility)
    observeApproval(execution, 'allowed-once')
    const before = await recordOne(firstRuntime, execution)
    const root = firstMedium.root
    const serializedBefore = JSON.stringify(before)
    await closeRuntimeAndFixture(firstRuntime, firstMedium)

    const reopenedMedium = await jsonFixture(root)
    const reopenedRuntime = runtimeFor(execution, { clock: () => 1_900_000_000_000 })
    await reopenedRuntime.attach(reopenedMedium.facility)
    expect(reopenedRuntime.diagnostics.status()).toBe('READY')
    expect(reopenedRuntime.diagnostics.get(before.episodeId)).toBeDefined()
    expect(JSON.stringify(reopenedRuntime.diagnostics.get(before.episodeId))).toBe(serializedBefore)
    await closeRuntimeAndFixture(reopenedRuntime, reopenedMedium)
  })

  it('E8 treats identical same-key commits as idempotent no-ops', async () => {
    const execution = createExecutionFixture()
    const fake = createFakeStorageFixture()
    const runtime = runtimeFor(execution, { clock: () => 1_800_000_000_000 })
    await runtime.attach(fake.facility)
    const result = successResult()
    observeSettled(execution, runtime, result)
    await vi.waitFor(() => expect(fake.calls.put).toHaveLength(1))

    observeSettled(execution, runtime, result)
    await vi.waitFor(() => expect(runtime.diagnostics.get(experienceEpisodeKey(execution.executionId))).toBeDefined())
    expect(fake.calls.put).toHaveLength(1)
    await runtime.detach()
  })

  it('E9 never overwrites a divergent same-key Episode and reports a conflict', async () => {
    const execution = createExecutionFixture()
    const fake = createFakeStorageFixture()
    let now = 1_800_000_000_000
    const runtime = runtimeFor(execution, { clock: () => now })
    await runtime.attach(fake.facility)
    execution.failureChain.observeResult(execution.exec, successResult())
    runtime.observeResult(execution.exec, successResult(), execution.index, execution.executionId)
    await vi.waitFor(() => expect(fake.calls.put).toHaveLength(1))
    const original = fake.records.get(experienceEpisodeKey(execution.executionId))
    now += 1

    runtime.observeResult(execution.exec, successResult(), execution.index, execution.executionId)
    await vi.waitFor(() => expect(runtime.diagnostics.status()).toBe('CONFLICTED'))
    expect(fake.calls.put).toHaveLength(1)
    expect(fake.records.get(experienceEpisodeKey(execution.executionId))).toBe(original)
    expect(runtime.diagnostics.reasonCodes()).toEqual(['EPISODE_KEY_CONFLICT'])
    await runtime.detach()
  })

  it('E10 retains prior Episodes and skips new commits at the hard capacity', async () => {
    const prior = createExecutionFixture()
    const priorEpisode = createExperienceEpisode({
      executionId: prior.executionId,
      exec: prior.exec,
      result: successResult(),
      observations: prior.index.snapshotObservations(),
      rules: prior.rules.diagnostics,
      failureChain: prior.failureChain.diagnostics,
      now: 1_700_000_000_000,
      platform: 'linux',
    })
    const fake = createFakeStorageFixture({
      size: 10_000,
      seed: [[priorEpisode.episodeId, priorEpisode]],
    })
    const incoming = createExecutionFixture()
    const runtime = runtimeFor(incoming)
    await runtime.attach(fake.facility)
    expect(runtime.diagnostics.status()).toBe('CAPACITY_EXCEEDED')
    expect(runtime.diagnostics.get(priorEpisode.episodeId)).toBeDefined()

    observeSettled(incoming, runtime, successResult())
    await vi.waitFor(() => expect(runtime.diagnostics.reasonCodes()).toEqual(['CAPACITY_EXCEEDED']))
    expect(fake.calls.put).toHaveLength(0)
    expect(fake.records.get(priorEpisode.episodeId)).toBe(priorEpisode)
    expect(runtime.diagnostics.size()).toBe(10_000)
    await runtime.detach()
  })

  it('E11 contains absent, open, and write failures while the V1 Tool/approval path still runs', async () => {
    const absentFixture = createExecutionFixture()
    const absent = new ExperienceRuntime(
      absentFixture.rules.diagnostics,
      absentFixture.failureChain.diagnostics,
    )
    expect(absent.diagnostics.status()).toBe('UNAVAILABLE')
    expect(absent.diagnostics.reasonCodes()).toEqual(['STORAGE_ABSENT'])

    const openFailureFixture = createExecutionFixture()
    const openFailure = runtimeFor(openFailureFixture)
    await openFailure.attach(createFakeStorageFixture({ open: async () => { throw new Error('private open failure') } }).facility)
    expect(openFailure.diagnostics.status()).toBe('UNAVAILABLE')
    expect(openFailure.diagnostics.reasonCodes()).toEqual(['STORAGE_OPEN_FAILED'])
    await openFailure.detach()

    const writeFailureFixture = createExecutionFixture()
    const writeFailure = runtimeFor(writeFailureFixture)
    const failingStore = createFakeStorageFixture({ put: async () => { throw new Error('private write failure') } })
    await writeFailure.attach(failingStore.facility)
    observeSettled(writeFailureFixture, writeFailure, successResult())
    await vi.waitFor(() => expect(writeFailure.diagnostics.reasonCodes()).toEqual(['STORAGE_WRITE_FAILED']))
    await writeFailure.detach()

    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(ApprovalService, { policy: 'never' })
    apply(ctx)
    let executed = 0
    const session = ctx.sessions.create()
    session.append('turn/start', { turn: 1 })
    session.append('step/start', { turn: 1, step: 1 })
    const agent = { session } as unknown as Agent
    const approvalCallId = ToolCallId('p11-storage-absent-call')
    session.append('tool/call', {
      turn: 1,
      step: 1,
      callId: approvalCallId,
      name: 'p11-storage-absent-probe',
      arguments: '{}',
    })
    ctx.tools.register(defineContentToolFixture({
      name: 'p11-storage-absent-probe',
      description: 'keeps execution independent from optional Episode persistence',
      parameters: {},
      async execute(_args, exec) {
        executed += 1
        const outcome = await ctx.approval.request({ agent: exec.agent!, toolName: exec.name, callId: exec.callId, signal: exec.signal })
        return [{ type: 'text' as const, text: outcome }]
      },
    }))
    try {
      const result = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId: approvalCallId,
        name: 'p11-storage-absent-probe',
        arguments: {},
        agent,
      })
      expect(result.isError, JSON.stringify(result)).toBe(false)
      expect(executed).toBe(1)
      expect(ctx.get('riskAdvisorExperience')!.status()).toBe('UNAVAILABLE')
      expect(ctx.get('riskAdvisorCorrelation')!.snapshotObservations()).toMatchObject([{ decidedOutcome: 'rejected' }])
      session.append('step/end', { turn: 1, step: 1 })
      session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('E12 drains an already queued durable commit, closes once, and permits a clean reopen', async () => {
    const execution = createExecutionFixture()
    const gate = Promise.withResolvers<void>()
    const firstStore = createFakeStorageFixture({ put: async () => await gate.promise })
    const runtime = runtimeFor(execution)
    await runtime.attach(firstStore.facility)
    observeSettled(execution, runtime, successResult())
    await vi.waitFor(() => expect(firstStore.calls.put).toHaveLength(1))

    let didDrain = false
    const draining = runtime.detach().then(() => { didDrain = true })
    await Promise.resolve()
    expect(didDrain).toBe(false)
    gate.resolve()
    await draining
    expect(firstStore.records.size).toBe(1)
    expect(firstStore.calls.closed).toBe(1)

    const secondStore = createFakeStorageFixture()
    await runtime.attach(secondStore.facility)
    expect(runtime.diagnostics.status()).toBe('READY')
    await runtime.detach()
    expect(secondStore.calls.closed).toBe(1)
  })

  it('captures a settled result while the optional storage capability is still opening', async () => {
    const execution = createExecutionFixture()
    const gate = Promise.withResolvers<void>()
    const store = createFakeStorageFixture({ beforeOpen: () => gate.promise })
    const runtime = runtimeFor(execution)
    const opening = runtime.attach(store.facility)
    await vi.waitFor(() => expect(runtime.diagnostics.reasonCodes()).toEqual(['STORAGE_OPENING']))

    observeSettled(execution, runtime, successResult())
    expect(store.calls.put).toHaveLength(0)
    gate.resolve()
    await opening
    await vi.waitFor(() => expect(store.calls.put).toHaveLength(1))
    expect(runtime.diagnostics.get(experienceEpisodeKey(execution.executionId))).toBeDefined()
    await runtime.detach()
  })

  it('E13 commits at tools/result without waiting for async shell verification and never revises Episode', async () => {
    const backing = await jsonFixture()
    const execution = createExecutionFixture({
      name: 'bash',
      arguments: { command: 'mkdir -p p11-async-verifier-target', description: 'Phase 11.1 verifier test' },
    })
    const runtime = runtimeFor(execution, { clock: () => 1_800_000_000_000 })
    await runtime.attach(backing.facility)
    const registry = new ExpectedEffectRegistry()
    registry.capture(execution.exec, execution.executionId)
    const verifier = new PostconditionVerifier(registry, { onRecord: record => execution.failureChain.observeVerification(record) })
    const verifierStarted = Promise.withResolvers<void>()
    const verifierResult = Promise.withResolvers<{ exitCode: number; stdout: { text: string; truncated: boolean }; stderr: { text: string; truncated: boolean } }>()
    verifier.attach({
      resolve: (request: Record<string, unknown>) => request,
      run: async () => {
        verifierStarted.resolve()
        return await verifierResult.promise
      },
    })
    const result = successResult({ kind: 'foreground', exitCode: 0 })

    execution.failureChain.observeResult(execution.exec, result)
    verifier.observeResult(execution.exec, result)
    runtime.observeResult(execution.exec, result, execution.index, execution.executionId)
    const episode = await waitForEpisode(runtime, execution.executionId)
    await verifierStarted.promise
    const before = JSON.stringify(episode)
    expect(verifier.store.diagnostics.get(execution.executionId)).toBeUndefined()

    verifierResult.resolve({ exitCode: 0, stdout: { text: 'MATCHED', truncated: false }, stderr: { text: '', truncated: false } })
    await vi.waitFor(() => expect(verifier.store.diagnostics.get(execution.executionId)?.status).toBe('MATCHED'))
    expect(JSON.stringify(runtime.diagnostics.get(episode.episodeId))).toBe(before)
    await verifier.dispose()
    await closeRuntimeAndFixture(runtime, backing)
  })

  it('E14 runs Risk Advisor without Storage Domain while retaining its established Host behavior', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    apply(ctx)
    const session = ctx.sessions.create()
    const agent = { session } as unknown as Agent
    let executions = 0
    ctx.tools.register(defineContentToolFixture({
      name: 'p11-v1-regression-probe',
      description: 'ordinary deterministic regression tool',
      parameters: {},
      async execute() {
        executions += 1
        return [{ type: 'text' as const, text: 'executed' }]
      },
    }))
    try {
      const result = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId: ToolCallId('p11-v1-regression-call'),
        name: 'p11-v1-regression-probe',
        arguments: {},
        agent,
      })
      expect(result.isError).toBe(false)
      expect(executions).toBe(1)
      expect(ctx.get('riskAdvisorCorrelation')!.snapshotObservations()).toEqual([])
      expect(ctx.get('riskAdvisorExperience')!.status()).toBe('UNAVAILABLE')
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
