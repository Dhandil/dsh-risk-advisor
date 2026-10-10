import type { DomainFacility, Domain } from '@deepseek-ai/dsh-storage-domain'
import { platform as runtimePlatform } from 'node:os'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import type { ActiveExecutionIndex, CorrelationObservation, ExecutionId } from './correlation.ts'
import type { FailureChainDiagnostics } from './retry-escalation.ts'
import type { RuleDiagnostics } from './rule-engine.ts'
import {
  experienceDomainSpec,
  experienceEpisodeKey,
  experienceEpisodeSchema,
  MAX_EXPERIENCE_EPISODES,
  normalizeExperiencePlatform,
  normalizeExperienceToolName,
} from './experience-schema.ts'
import type { ExperienceEpisodeId, ExperienceEpisodeV1 } from './experience-schema.ts'

export type ExperienceStatus = 'READY' | 'UNAVAILABLE' | 'CAPACITY_EXCEEDED' | 'CONFLICTED'

export interface ExperienceDiagnostics {
  readonly status: () => ExperienceStatus
  readonly size: () => number
  readonly get: (episodeId: string) => ExperienceEpisodeV1 | undefined
  readonly reasonCodes: () => readonly string[]
}

type ExperienceDomain = Domain<typeof experienceDomainSpec>
type ApprovalOutcome = NonNullable<ExperienceEpisodeV1['approval']['outcome']>

const ERROR_NAME = /^[A-Za-z][A-Za-z0-9_.-]{0,127}$/
const ERROR_CODE = /^[A-Za-z0-9_.:-]{1,128}$/
const REASON_CODE = /^[A-Za-z0-9_.:-]{1,128}$/

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value
  Object.freeze(value)
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  return value
}

function safeReasonCodes(values: readonly unknown[]): string[] {
  const result: string[] = []
  for (const value of values) {
    if (typeof value !== 'string' || !REASON_CODE.test(value) || result.includes(value)) continue
    result.push(value)
    if (result.length >= 32) break
  }
  return result
}

function ownData(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined
  } catch {
    return undefined
  }
}

function terminalFacts(result: Readonly<ToolExecutionResult>): ExperienceEpisodeV1['terminal'] {
  const isError = ownData(result, 'isError') === true
  if (!isError) return { isError: false }
  const failure = ownData(result, 'error')
  const info = ownData(failure, 'info')
  const name = ownData(info, 'name')
  const code = ownData(info, 'code')
  if (typeof name !== 'string' || !ERROR_NAME.test(name) || typeof code !== 'string' || !ERROR_CODE.test(code)) {
    return { isError: true }
  }
  return { isError: true, error: { name, code } }
}

function outcomeOf(value: unknown): ApprovalOutcome | undefined {
  return value === 'allowed-once' || value === 'rejected' || value === 'cancelled' || value === 'unavailable'
    ? value
    : undefined
}

function approvalFacts(
  exec: Readonly<ToolExecution>,
  executionId: ExecutionId,
  observations: readonly CorrelationObservation[],
): { readonly approval: ExperienceEpisodeV1['approval']; readonly reasonCodes: readonly string[] } {
  const session = exec.agent?.session as Session | undefined
  const sessionId = session === undefined ? undefined : String(session.id)
  const callId = typeof exec.callId === 'string' ? exec.callId : undefined
  if (sessionId === undefined || callId === undefined) {
    return { approval: { observed: false }, reasonCodes: Object.freeze([]) }
  }

  const related = observations.filter(observation =>
    observation.sessionId === sessionId
    && observation.callId === callId
    && observation.toolName === exec.name,
  )
  const exact = related.filter(observation =>
    !observation.conflict
    && observation.lookup.status === 'FOUND'
    && observation.lookup.executionId === executionId,
  )
  const bindingToCurrent = related.filter(observation => {
    if (observation.lookup.status === 'FOUND') return observation.lookup.executionId === executionId
    if (observation.lookup.status === 'AMBIGUOUS') return observation.lookup.executionIds.includes(executionId)
    return observation.recordedLookup?.status === 'FOUND' && observation.recordedLookup.executionId === executionId
  })
  if (exact.length === 1 && bindingToCurrent.length === 1) {
    const outcome = outcomeOf(exact[0]!.decidedOutcome)
    return {
      approval: { observed: true, ...outcome === undefined ? {} : { outcome } },
      reasonCodes: Object.freeze(outcome === undefined ? ['APPROVAL_OUTCOME_UNAVAILABLE'] : []),
    }
  }

  if (bindingToCurrent.length === 0) {
    const unavailable = related.some(observation => observation.lookup.status === 'NOT_FOUND')
    return {
      approval: { observed: false },
      reasonCodes: Object.freeze(unavailable ? ['APPROVAL_BINDING_UNAVAILABLE'] : []),
    }
  }
  const conflicted = bindingToCurrent.some(observation => observation.conflict)
  const ambiguous = bindingToCurrent.some(observation => observation.lookup.status === 'AMBIGUOUS')
  const lookupUnavailable = bindingToCurrent.some(observation => observation.lookup.status === 'NOT_FOUND')
  const reason = conflicted
    ? 'APPROVAL_BINDING_CONFLICT'
    : ambiguous || exact.length > 1
      ? 'APPROVAL_BINDING_AMBIGUOUS'
      : lookupUnavailable
        ? 'APPROVAL_BINDING_UNAVAILABLE'
        : 'APPROVAL_BINDING_AMBIGUOUS'
  return { approval: { observed: false }, reasonCodes: Object.freeze([reason]) }
}

export interface ExperienceEpisodeFacts {
  readonly executionId: ExecutionId
  readonly exec: Readonly<ToolExecution>
  readonly result: Readonly<ToolExecutionResult>
  readonly observations: readonly CorrelationObservation[]
  readonly rules: RuleDiagnostics
  readonly failureChain: FailureChainDiagnostics
  readonly now?: number
  readonly platform?: string
}

export interface ExperienceRuntimeOptions {
  readonly clock?: () => number
  readonly platform?: string
  readonly onCommitted?: (episode: ExperienceEpisodeV1) => void
  readonly onCommitFailed?: (executionId: ExecutionId) => void
}

/** Build only the frozen structural facts; raw Tool payloads never enter the returned object. */
export function createExperienceEpisode(facts: ExperienceEpisodeFacts): ExperienceEpisodeV1 {
  const { executionId, exec } = facts
  const rule = facts.rules.get(executionId)
  const retry = facts.failureChain.get(executionId)
  const approval = approvalFacts(exec, executionId, facts.observations)
  const toolName = normalizeExperienceToolName(exec.name)
  const reasonCodes = safeReasonCodes([...rule.reasonCodes, ...retry.reasonCodes, ...approval.reasonCodes])
  const episode = experienceEpisodeSchema.parse({
    schemaVersion: 1,
    episodeId: experienceEpisodeKey(executionId),
    sourceExecutionId: executionId,
    observedAt: facts.now ?? Date.now(),
    runtime: { platform: normalizeExperiencePlatform(facts.platform ?? runtimePlatform()) },
    operation: {
      toolName,
      kind: rule.operationKind,
      parserConfidence: rule.parserConfidence,
      mutating: rule.mutating,
      externalEffect: rule.externalEffect,
      networkEffect: rule.networkEffect,
      ...rule.requestedPermission === undefined ? {} : { requestedPermission: rule.requestedPermission },
    },
    approval: approval.approval,
    terminal: terminalFacts(facts.result),
    retry: {
      status: retry.status,
      retryCount: retry.retryCount,
      recentFailureCount: retry.recentFailureCount,
      sameRootCause: retry.sameRootCause,
      permissionEscalation: retry.permissionEscalation,
    },
    provenance: {
      source: 'LIVE_TOOLS_RESULT',
      ruleStatus: rule.status,
      reasonCodes,
    },
  })
  return deepFreeze(episode)
}

/** One Host-owned immutable Episode writer for a single plugin generation. */
export class ExperienceRuntime {
  private handle: ExperienceDomain | undefined
  private table: ReturnType<ExperienceDomain['table']> | undefined
  private opening: Promise<void> | undefined
  private writeTail: Promise<void> = Promise.resolve()
  private lifecycleTail: Promise<void> = Promise.resolve()
  private generation = 0
  private accepting = false
  private writeFaulted = false
  private queuedWrites = 0
  private queueSaturated = false
  private detaching = false
  private intakeStopped = false
  private currentStatus: ExperienceStatus = 'UNAVAILABLE'
  private currentReasons: readonly string[] = Object.freeze(['STORAGE_ABSENT'])
  private readonly clock: () => number
  private readonly platform: string | undefined
  private readonly onCommitted: ((episode: ExperienceEpisodeV1) => void) | undefined
  private readonly onCommitFailed: ((executionId: ExecutionId) => void) | undefined

  readonly diagnostics: ExperienceDiagnostics = Object.freeze({
    status: () => { this.readSize(); return this.currentStatus },
    size: () => this.readSize(),
    get: (episodeId: string) => this.readEpisode(episodeId),
    reasonCodes: () => { this.readSize(); return this.currentReasons },
  })

  constructor(
    private readonly rules: RuleDiagnostics,
    private readonly failureChain: FailureChainDiagnostics,
    options: ExperienceRuntimeOptions = {},
  ) {
    this.clock = options.clock ?? Date.now
    this.platform = options.platform
    this.onCommitted = options.onCommitted
    this.onCommitFailed = options.onCommitFailed
  }

  /** Open once per capability generation; open failures are contained as optional degradation. */
  attach(storageDomain: DomainFacility): Promise<void> {
    if (!this.detaching && this.handle !== undefined) return Promise.resolve()
    if (!this.detaching && this.opening !== undefined) return this.opening
    const generation = ++this.generation
    this.accepting = false
    this.intakeStopped = false
    this.queueSaturated = false
    this.currentStatus = 'UNAVAILABLE'
    this.currentReasons = Object.freeze(['STORAGE_OPENING'])
    const opening = this.enqueueLifecycle(async () => {
      if (generation !== this.generation) return
      this.detaching = false
      let domain: ExperienceDomain | undefined
      try {
        domain = await storageDomain.open(experienceDomainSpec)
        const table = domain.table('episodes')
        for (const [key, raw] of table.entries()) {
          const episode = experienceEpisodeSchema.parse(raw)
          if (episode.episodeId !== key || episode.episodeId !== experienceEpisodeKey(episode.sourceExecutionId)) {
            throw new Error('episode-key-mismatch')
          }
          deepFreeze(raw)
        }
        if (generation !== this.generation || this.detaching) {
          await domain.close()
          return
        }
        this.handle = domain
        this.table = table
        this.writeFaulted = false
        const atCapacity = table.size >= MAX_EXPERIENCE_EPISODES
        this.accepting = !atCapacity && !this.queueSaturated
        this.currentStatus = atCapacity || this.queueSaturated ? 'CAPACITY_EXCEEDED' : 'READY'
        this.currentReasons = Object.freeze(atCapacity || this.queueSaturated ? ['CAPACITY_EXCEEDED'] : [])
      } catch {
        if (domain !== undefined) {
          try { await domain.close() } catch { /* Keep V1 available if storage teardown also failed. */ }
        }
        if (generation === this.generation) {
          this.handle = undefined
          this.table = undefined
          this.accepting = false
          this.currentStatus = 'UNAVAILABLE'
          this.currentReasons = Object.freeze(['STORAGE_OPEN_FAILED'])
        }
      }
    })
    const settled = opening.finally(() => { if (this.opening === settled) this.opening = undefined })
    this.opening = settled
    return settled
  }

  /** tools/result observer: snapshot synchronously, then own and contain the async write. */
  observeResult(
    exec: Readonly<ToolExecution>,
    result: Readonly<ToolExecutionResult>,
    index: ActiveExecutionIndex,
    executionId: ExecutionId | undefined,
  ): void {
    const opening = this.opening
    if (this.intakeStopped || this.detaching || this.currentStatus === 'CAPACITY_EXCEEDED' || (!this.accepting && opening === undefined)) return
    if (executionId === undefined) return
    let episode: ExperienceEpisodeV1
    try {
      episode = createExperienceEpisode({
        executionId,
        exec,
        result,
        observations: index.snapshotObservations(),
        rules: this.rules,
        failureChain: this.failureChain,
        now: this.clock(),
        ...this.platform === undefined ? {} : { platform: this.platform },
      })
    } catch {
      this.fail('EPISODE_FACTS_INVALID')
      this.notifyCommitFailed(executionId)
      return
    }
    if (this.table === undefined && opening === undefined) {
      this.notifyCommitFailed(executionId)
      return
    }
    if (this.queuedWrites >= MAX_EXPERIENCE_EPISODES) {
      this.accepting = false
      this.queueSaturated = true
      this.currentStatus = 'CAPACITY_EXCEEDED'
      this.currentReasons = Object.freeze(['CAPACITY_EXCEEDED'])
      this.notifyCommitFailed(executionId)
      return
    }
    this.queuedWrites += 1
    const tableAtCapture = this.table
    const generation = this.generation
    const write = this.writeTail.then(async () => {
      // `accepting` fences new observations only. Work already queued before
      // teardown must drain even after detach has stopped intake.
      if (opening !== undefined) {
        await opening
        // Do not carry a settlement across a retired storage capability.
        if (generation !== this.generation) { this.notifyCommitFailed(executionId); return }
      }
      if (this.writeFaulted) { this.notifyCommitFailed(executionId); return }
      const table = tableAtCapture ?? this.table
      if (table === undefined) { this.notifyCommitFailed(executionId); return }
      const key = experienceEpisodeKey(executionId)
      const existing = table.get(key)
      if (existing !== undefined) {
        if (JSON.stringify(existing) === JSON.stringify(episode)) { this.notifyCommitted(episode); return }
        this.fail('EPISODE_KEY_CONFLICT', 'CONFLICTED')
        this.notifyCommitFailed(executionId)
        return
      }
      if (table.size >= MAX_EXPERIENCE_EPISODES) {
        this.fail('CAPACITY_EXCEEDED', 'CAPACITY_EXCEEDED')
        this.notifyCommitFailed(executionId)
        return
      }
      try {
        await table.put(key, episode)
        this.notifyCommitted(episode)
      } catch {
        this.fail('STORAGE_WRITE_FAILED')
        this.notifyCommitFailed(executionId)
      }
    }).catch(() => {
      this.fail('STORAGE_WRITE_FAILED')
      this.notifyCommitFailed(executionId)
    }).finally(() => { this.queuedWrites -= 1 })
    this.writeTail = write.then(() => undefined, () => undefined)
    void write.catch(() => undefined)
  }

  /** Snapshot durable Episodes for Outcome startup validation/recovery. */
  snapshotEpisodes(): readonly ExperienceEpisodeV1[] {
    const table = this.table
    if (table === undefined) return Object.freeze([])
    try { return Object.freeze([...table.entries()].map(([, episode]) => episode)) } catch {
      this.fail('STORAGE_READ_FAILED')
      return Object.freeze([])
    }
  }

  /** Stop new settlement capture without closing the domain; queued commits still drain. */
  stopAccepting(): void {
    this.intakeStopped = true
    this.accepting = false
    if (this.currentStatus !== 'CONFLICTED' && this.currentStatus !== 'CAPACITY_EXCEEDED') {
      this.currentStatus = 'UNAVAILABLE'
      this.currentReasons = Object.freeze(['STORAGE_CLOSING'])
    }
  }

  /** Drain an in-flight open and every captured Episode write/commit callback. */
  async drain(): Promise<void> {
    const opening = this.opening
    if (opening !== undefined) await opening
    await this.writeTail
  }

  /** Stop intake, drain owned writes, and release the Domain handle. */
  async detach(): Promise<void> {
    if (this.detaching) {
      await this.lifecycleTail
      return
    }
    const generation = ++this.generation
    this.detaching = true
    this.stopAccepting()
    if (this.currentStatus !== 'CONFLICTED' && this.currentStatus !== 'CAPACITY_EXCEEDED') {
      this.currentStatus = 'UNAVAILABLE'
      this.currentReasons = Object.freeze(['STORAGE_CLOSING'])
    }
    const closing = this.enqueueLifecycle(async () => {
      await this.writeTail
      const handle = this.handle
      this.handle = undefined
      this.table = undefined
      if (handle !== undefined) await handle.close()
      if (generation === this.generation) {
        this.currentStatus = 'UNAVAILABLE'
        if (this.currentReasons[0] === 'STORAGE_CLOSING') this.currentReasons = Object.freeze(['STORAGE_CLOSED'])
        this.detaching = false
      }
    })
    try {
      await closing
    } catch {
      if (generation === this.generation) {
        this.currentStatus = 'UNAVAILABLE'
        this.currentReasons = Object.freeze(['STORAGE_CLOSE_FAILED'])
        this.detaching = false
      }
    }
  }

  private enqueueLifecycle(job: () => Promise<void>): Promise<void> {
    const operation = this.lifecycleTail.then(job)
    this.lifecycleTail = operation.then(() => undefined, () => undefined)
    void operation.catch(() => undefined)
    return operation
  }

  private readSize(): number {
    const table = this.table
    if (table === undefined) return 0
    try { return table.size } catch {
      this.fail('STORAGE_READ_FAILED')
      return 0
    }
  }

  private readEpisode(episodeId: string): ExperienceEpisodeV1 | undefined {
    if (!/^ra-episode-v1_[a-f0-9]{64}$/.test(episodeId)) return undefined
    const table = this.table
    if (table === undefined) return undefined
    try { return table.get(episodeId as ExperienceEpisodeId) } catch {
      this.fail('STORAGE_READ_FAILED')
      return undefined
    }
  }

  private fail(reason: string, status: ExperienceStatus = 'UNAVAILABLE'): void {
    this.accepting = false
    this.writeFaulted = true
    this.currentStatus = status
    this.currentReasons = Object.freeze([reason])
  }

  private notifyCommitted(episode: ExperienceEpisodeV1): void {
    try { this.onCommitted?.(episode) } catch { /* Outcome persistence is observational. */ }
  }

  private notifyCommitFailed(executionId: ExecutionId): void {
    try { this.onCommitFailed?.(executionId) } catch { /* Outcome persistence is observational. */ }
  }
}
