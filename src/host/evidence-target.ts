import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import type { ExecutionId } from './correlation.ts'
import { parseSimpleShell } from './shell-analysis.ts'

export type EvidenceOperationClass = 'direct-file' | 'simple-shell-file' | 'git-workspace' | 'package-workspace' | 'workspace-only' | 'unsupported'

export interface EvidenceTargetSeed {
  readonly executionId: ExecutionId
  readonly session: Session
  readonly toolName: string
  readonly operationClass: EvidenceOperationClass
  readonly requestedPaths: readonly string[]
  readonly exactTargetCount: boolean
  readonly explicitWorkdir: boolean
  readonly packageRelevant: boolean
  readonly requestedPermission?: 'workspace-write' | 'danger-full-access' | undefined
}

const TTL_MS = 5 * 60 * 1000
const PER_SESSION = 128
const GLOBAL = 512
const PATH_LIMIT = 8
const STRING_LIMIT = 4096

const TOOL_ARGUMENT_KEYS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  read: Object.freeze(['file_path', 'offset', 'limit']),
  write: Object.freeze(['file_path', 'content', 'sandbox_permissions', 'justification']),
  edit: Object.freeze(['file_path', 'old_string', 'new_string', 'replace_all', 'sandbox_permissions', 'justification']),
  bash: Object.freeze(['command', 'description', 'timeoutMs', 'workdir', 'run_in_background', 'sandbox_permissions', 'justification']),
  pwsh: Object.freeze(['command', 'description', 'timeoutMs', 'workdir', 'run_in_background']),
})

function fields(value: unknown, allowed: readonly string[]): Record<string, unknown> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  try {
    const keys = Reflect.ownKeys(value)
    if (keys.length > 16 || keys.some(key => typeof key !== 'string' || !allowed.includes(key))) return undefined
    const result: Record<string, unknown> = Object.create(null)
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (descriptor === undefined || !('value' in descriptor)) return undefined
      result[key as string] = descriptor.value
    }
    return result
  } catch { return undefined }
}

function staticPath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= STRING_LIMIT && !value.startsWith('-') && !/[\0\r\n]/.test(value) && !/[?*\[\]]/.test(value) && !value.includes('$') && !value.includes('`') && !value.startsWith('~')
}

function permission(value: unknown): EvidenceTargetSeed['requestedPermission'] {
  return value === 'workspace-write' || value === 'danger-full-access' ? value : undefined
}

function directSeed(exec: ToolExecution, executionId: ExecutionId, session: Session, args: Record<string, unknown>): EvidenceTargetSeed | undefined {
  if ((exec.name === 'read' || exec.name === 'write' || exec.name === 'edit') && staticPath(args.file_path)) {
    return Object.freeze({ executionId, session, toolName: exec.name, operationClass: 'direct-file', requestedPaths: Object.freeze([args.file_path]), exactTargetCount: true, explicitWorkdir: false, packageRelevant: false, ...(permission(args.sandbox_permissions) === undefined ? {} : { requestedPermission: permission(args.sandbox_permissions) }) })
  }
  return undefined
}

function shellSeed(exec: ToolExecution, executionId: ExecutionId, session: Session, args: Record<string, unknown>): EvidenceTargetSeed | undefined {
  if (exec.name !== 'bash' && exec.name !== 'pwsh') return undefined
  if (typeof args.command !== 'string' || args.command.length === 0 || args.command.length > STRING_LIMIT) return undefined
  const explicitWorkdir = Object.hasOwn(args, 'workdir')
  const parsed = parseSimpleShell(args.command, exec.name)
  const base = { executionId, session, toolName: exec.name, explicitWorkdir, requestedPermission: permission(args.sandbox_permissions) } as const
  if (parsed === undefined) return Object.freeze({ ...base, operationClass: 'unsupported', requestedPaths: Object.freeze([]), exactTargetCount: false, packageRelevant: false })
  const action = parsed.action ?? parsed.executable
  const values = [...parsed.args]
  if (action === 'mkdir') {
    const path = values.length === 1 ? values[0] : values.length === 2 && values[0] === '-p' ? values[1] : undefined
    if (staticPath(path) && (exec.name !== 'pwsh' || values.length === 1)) return Object.freeze({ ...base, operationClass: 'simple-shell-file', requestedPaths: Object.freeze([path]), exactTargetCount: true, packageRelevant: false })
  }
  if ((action === 'cp' && exec.name === 'bash') || (action === 'copy-item' && exec.name === 'pwsh')) {
    if (values.length === 2 && values.every(staticPath)) return Object.freeze({ ...base, operationClass: 'simple-shell-file', requestedPaths: Object.freeze(values), exactTargetCount: true, packageRelevant: false })
  }
  if (action === 'rm' && exec.name === 'bash') {
    const allowed = new Set(['-r', '-R', '-rf', '-fr', '--'])
    const paths = values.filter(item => item !== '--' && !allowed.has(item))
    if (paths.length > 0 && paths.length <= PATH_LIMIT && paths.every(staticPath) && values.every(item => allowed.has(item) || staticPath(item))) return Object.freeze({ ...base, operationClass: 'simple-shell-file', requestedPaths: Object.freeze(paths), exactTargetCount: true, packageRelevant: false })
  }
  if (action === 'git') return Object.freeze({ ...base, operationClass: 'git-workspace', requestedPaths: Object.freeze([]), exactTargetCount: true, packageRelevant: false })
  if (action === 'npm' || action === 'pnpm' || action === 'yarn') return Object.freeze({ ...base, operationClass: 'package-workspace', requestedPaths: Object.freeze([]), exactTargetCount: false, packageRelevant: true })
  return Object.freeze({ ...base, operationClass: 'workspace-only', requestedPaths: Object.freeze([]), exactTargetCount: false, packageRelevant: false })
}

function seedFor(exec: ToolExecution, executionId: ExecutionId, session: Session): EvidenceTargetSeed {
  const args = fields(exec.arguments, TOOL_ARGUMENT_KEYS[exec.name] ?? [])
  const direct = args === undefined ? undefined : directSeed(exec, executionId, session, args)
  if (direct !== undefined) return direct
  const shell = args === undefined ? undefined : shellSeed(exec, executionId, session, args)
  if (shell !== undefined) return shell
  return Object.freeze({ executionId, session, toolName: typeof exec.name === 'string' ? exec.name.slice(0, 128) : 'unknown', operationClass: 'unsupported', requestedPaths: Object.freeze([]), exactTargetCount: false, explicitWorkdir: false, packageRelevant: false })
}

export class EvidenceTargetSeedRegistry {
  private values = new Map<ExecutionId, { readonly seed: EvidenceTargetSeed; readonly execution: ToolExecution; readonly createdAt: number }>()
  private byExecution = new WeakMap<ToolExecution, EvidenceTargetSeed>()
  private bySession = new WeakMap<Session, Set<ExecutionId>>()
  private active = true

  constructor(private readonly clock: () => number = () => Date.now()) {}

  capture(exec: ToolExecution, executionId: ExecutionId | undefined): void {
    if (!this.active || executionId === undefined) return
    this.sweep()
    let session: Session | undefined
    try { session = exec.agent?.session } catch { return }
    if (session === undefined) return
    const seed = seedFor(exec, executionId, session)
    const ids = this.bySession.get(session) ?? new Set<ExecutionId>()
    while (ids.size >= PER_SESSION) this.remove(ids.values().next().value as ExecutionId)
    while (this.values.size >= GLOBAL) this.remove(this.values.keys().next().value as ExecutionId)
    this.remove(executionId)
    this.values.set(executionId, { seed, execution: exec, createdAt: this.clock() })
    this.byExecution.set(exec, seed)
    ids.add(executionId)
    this.bySession.set(session, ids)
  }

  take(exec: Readonly<ToolExecution>): EvidenceTargetSeed | undefined {
    if (!this.active) return undefined
    this.sweep()
    const seed = this.byExecution.get(exec as ToolExecution)
    if (seed !== undefined) this.remove(seed.executionId)
    return seed
  }

  takeById(executionId: ExecutionId): EvidenceTargetSeed | undefined {
    if (!this.active) return undefined
    this.sweep()
    const item = this.values.get(executionId)
    if (item === undefined) return undefined
    this.remove(executionId)
    return item.seed
  }

  has(executionId: ExecutionId): boolean { if (!this.active) return false; this.sweep(); return this.values.has(executionId) }

  hasSupportedEvidenceQuestion(executionId: ExecutionId): boolean {
    if (!this.active) return false
    this.sweep()
    const operationClass = this.values.get(executionId)?.seed.operationClass
    return operationClass === 'direct-file' || operationClass === 'simple-shell-file' || operationClass === 'package-workspace'
  }

  sessionOf(executionId: ExecutionId): Session | undefined { if (!this.active) return undefined; this.sweep(); return this.values.get(executionId)?.seed.session }

  disposeSession(session: Session): void {
    const ids = this.bySession.get(session)
    if (ids === undefined) return
    for (const id of [...ids]) this.remove(id)
    this.bySession.delete(session)
  }

  dispose(): void { this.active = false; this.values.clear(); this.byExecution = new WeakMap(); this.bySession = new WeakMap() }

  private sweep(): void {
    const now = this.clock()
    for (const [id, item] of this.values) if (!Number.isFinite(now) || now - item.createdAt >= TTL_MS) this.remove(id)
  }

  private remove(id: ExecutionId): void {
    const item = this.values.get(id)
    if (item === undefined) return
    this.values.delete(id)
    this.byExecution.delete(item.execution)
    this.bySession.get(item.seed.session)?.delete(id)
  }
}

export const EVIDENCE_TARGET_LIMITS = Object.freeze({ perSession: PER_SESSION, global: GLOBAL, ttlMs: TTL_MS, maxPaths: PATH_LIMIT })
