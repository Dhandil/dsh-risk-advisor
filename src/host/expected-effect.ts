import { createHash } from 'node:crypto'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import type { ExecutionId } from './correlation.ts'
import { parseSimpleShell } from './shell-analysis.ts'

export type VerificationAdapterId =
  | 'tool.write.v1'
  | 'tool.edit.v1'
  | 'shell.mkdir.v1'
  | 'shell.copy-file.v1'
  | 'git.branch-switch.v1'
  | 'package.node-resolve.v1'

type ShellToolName = 'bash' | 'pwsh'

export type ExpectedEffect =
  | {
      readonly schemaVersion: 1
      readonly executionId: ExecutionId
      readonly source: 'tool-contract'
      readonly adapterId: 'tool.write.v1'
      readonly session: Session
      readonly contentDigest: string
    }
  | {
      readonly schemaVersion: 1
      readonly executionId: ExecutionId
      readonly source: 'tool-contract'
      readonly adapterId: 'tool.edit.v1'
      readonly session: Session
      readonly oldString: string
      readonly newString: string
      readonly replaceAll: boolean
    }
  | {
      readonly schemaVersion: 1
      readonly executionId: ExecutionId
      readonly source: 'known-adapter'
      readonly adapterId: 'shell.mkdir.v1'
      readonly session: Session
      readonly toolName: ShellToolName
      readonly target: string
    }
  | {
      readonly schemaVersion: 1
      readonly executionId: ExecutionId
      readonly source: 'known-adapter'
      readonly adapterId: 'shell.copy-file.v1'
      readonly session: Session
      readonly toolName: ShellToolName
      readonly sourcePath: string
      readonly destinationPath: string
    }
  | {
      readonly schemaVersion: 1
      readonly executionId: ExecutionId
      readonly source: 'known-adapter'
      readonly adapterId: 'git.branch-switch.v1'
      readonly session: Session
      readonly toolName: ShellToolName
      readonly expectedBranch: string
    }
  | {
      readonly schemaVersion: 1
      readonly executionId: ExecutionId
      readonly source: 'known-adapter'
      readonly adapterId: 'package.node-resolve.v1'
      readonly session: Session
      readonly toolName: ShellToolName
      readonly manager: 'npm' | 'pnpm'
      readonly packageName: string
    }

/** Privacy-safe projection used only to compute the frozen Phase 11.3 identity. */
export interface ExpectedEffectIdentityV1 {
  readonly source: 'tool-contract' | 'known-adapter'
  readonly adapterId: VerificationAdapterId
}

const MAX_STRING_LENGTH = 8192
const MAX_ARGUMENT_KEYS = 64
const MAX_EFFECTS = 512
const EFFECT_TTL_MS = 5 * 60 * 1000

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  try {
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
  } catch {
    return false
  }
}

function fieldsOf(value: unknown, allowed: readonly string[]): Map<string, unknown> | undefined {
  if (!isPlainObject(value)) return undefined
  try {
    const keys = Reflect.ownKeys(value)
    if (keys.length > MAX_ARGUMENT_KEYS) return undefined
    const fields = new Map<string, unknown>()
    for (const key of keys) {
      if (typeof key !== 'string' || !allowed.includes(key)) return undefined
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (descriptor === undefined || !('value' in descriptor)) return undefined
      fields.set(key, descriptor.value)
    }
    return fields
  } catch {
    return undefined
  }
}

function stringField(fields: Map<string, unknown>, name: string, required = false): string | undefined {
  if (!fields.has(name)) return required ? undefined : undefined
  const value = fields.get(name)
  return typeof value === 'string' && value.length <= MAX_STRING_LENGTH && (!required || value.trim().length > 0)
    ? value
    : undefined
}

function digest(value: string): string | undefined {
  try { return createHash('sha256').update(value, 'utf8').digest('hex') } catch { return undefined }
}

export function isValidBranchName(value: string): boolean {
  const components = value.split('/')
  return value.length > 0
    && value.length <= 256
    && !value.startsWith('-')
    && !value.startsWith('/')
    && !value.endsWith('/')
    && !value.includes('//')
    && !value.includes('..')
    && !value.includes('@{')
    && !/[\s\u0000-\u001f\u007f~^:?*[\\]/.test(value)
    && !value.endsWith('.')
    && components.every(component => component.length > 0 && !component.startsWith('.') && !component.endsWith('.lock') && !component.endsWith('.'))
}

function packageName(value: string): boolean {
  return /^(?:@[a-z0-9][a-z0-9._-]{0,63}\/[a-z0-9][a-z0-9._-]{0,100}|[a-z0-9][a-z0-9._-]{0,100})$/.test(value)
}

function noWildcard(value: string): boolean {
  return value.length > 0 && value.length <= MAX_STRING_LENGTH && !value.startsWith('-') && !/[\\*?\[\]]/.test(value)
}

function captureToolContract(exec: ToolExecution, executionId: ExecutionId, session: Session): ExpectedEffect | undefined {
  if (exec.name === 'write') {
    const fields = fieldsOf(exec.arguments, ['file_path', 'content', 'sandbox_permissions', 'justification'])
    if (fields === undefined) return undefined
    const path = stringField(fields, 'file_path', true)
    const content = stringField(fields, 'content')
    if (path === undefined || content === undefined) return undefined
    const contentDigest = digest(content)
    if (contentDigest === undefined) return undefined
    return Object.freeze({ schemaVersion: 1, executionId, source: 'tool-contract', adapterId: 'tool.write.v1', session, contentDigest })
  }
  if (exec.name === 'edit') {
    const fields = fieldsOf(exec.arguments, ['file_path', 'old_string', 'new_string', 'replace_all', 'sandbox_permissions', 'justification'])
    if (fields === undefined) return undefined
    const path = stringField(fields, 'file_path', true)
    const oldString = stringField(fields, 'old_string', true)
    const newString = stringField(fields, 'new_string')
    if (path === undefined || oldString === undefined || newString === undefined || oldString === newString) return undefined
    if (fields.has('replace_all') && typeof fields.get('replace_all') !== 'boolean') return undefined
    return Object.freeze({ schemaVersion: 1, executionId, source: 'tool-contract', adapterId: 'tool.edit.v1', session, oldString, newString, replaceAll: fields.get('replace_all') === true })
  }
  return undefined
}

function captureShell(exec: ToolExecution, executionId: ExecutionId, session: Session): ExpectedEffect | undefined {
  if (exec.name !== 'bash' && exec.name !== 'pwsh') return undefined
  const fields = fieldsOf(exec.arguments, ['command', 'description', 'timeoutMs', 'workdir', 'run_in_background', 'sandbox_permissions', 'justification'])
  if (fields === undefined || fields.has('workdir')) return undefined
  if (fields.has('run_in_background') && fields.get('run_in_background') !== false) return undefined
  const command = stringField(fields, 'command', true)
  if (command === undefined) return undefined
  const parsed = parseSimpleShell(command, exec.name)
  if (parsed === undefined || parsed.assignments.length > 0 || parsed.wrapper) return undefined
  const action = parsed.action
  const args = parsed.args
  if (action === 'mkdir') {
    const target = args.length === 1 ? args[0] : args.length === 2 && args[0] === '-p' ? args[1] : undefined
    if (target === undefined || !noWildcard(target) || (exec.name === 'pwsh' && args.length !== 1)) return undefined
    return Object.freeze({ schemaVersion: 1, executionId, source: 'known-adapter', adapterId: 'shell.mkdir.v1', session, toolName: exec.name, target })
  }
  if (action === 'cp' && exec.name === 'bash' && args.length === 2 && args.every(noWildcard)) {
    return Object.freeze({ schemaVersion: 1, executionId, source: 'known-adapter', adapterId: 'shell.copy-file.v1', session, toolName: exec.name, sourcePath: args[0]!, destinationPath: args[1]! })
  }
  if (action === 'copy-item' && exec.name === 'pwsh' && args.length === 2 && args.every(noWildcard)) {
    return Object.freeze({ schemaVersion: 1, executionId, source: 'known-adapter', adapterId: 'shell.copy-file.v1', session, toolName: exec.name, sourcePath: args[0]!, destinationPath: args[1]! })
  }
  if (action === 'git' && args.length >= 2) {
    const operation = args[0]!.toLowerCase()
    const expected = operation === 'checkout'
      ? args.length === 2 ? args[1] : args.length === 3 && args[1] === '-b' ? args[2] : undefined
      : operation === 'switch'
        ? args.length === 2 ? args[1] : args.length === 3 && args[1] === '-c' ? args[2] : undefined
      : undefined
    if (expected !== undefined && isValidBranchName(expected)) {
      return Object.freeze({ schemaVersion: 1, executionId, source: 'known-adapter', adapterId: 'git.branch-switch.v1', session, toolName: exec.name, expectedBranch: expected })
    }
  }
  if ((action === 'npm' || action === 'pnpm') && args.length === 2) {
    const subcommand = args[0]!.toLowerCase()
    const eligible = exec.name === 'bash' || exec.name === 'pwsh'
    const validSubcommand = action === 'npm' ? subcommand === 'install' || subcommand === 'i' : subcommand === 'add' || subcommand === 'install'
    if (eligible && validSubcommand && packageName(args[1]!)) {
      return Object.freeze({ schemaVersion: 1, executionId, source: 'known-adapter', adapterId: 'package.node-resolve.v1', session, toolName: exec.name, manager: action, packageName: args[1]! })
    }
  }
  return undefined
}

/** Host-private registry; it never exposes raw ExpectedEffect data through diagnostics. */
export class ExpectedEffectRegistry {
  private readonly effects = new Map<ExecutionId, { readonly effect: ExpectedEffect; readonly createdAt: number }>()
  private readonly executionsById = new Map<ExecutionId, ToolExecution>()
  private executions = new WeakMap<ToolExecution, ExpectedEffect>()
  private disposedExecutions = new WeakSet<ToolExecution>()
  private bySession = new WeakMap<Session, Set<ExecutionId>>()
  private readonly clock: () => number
  private active = true

  constructor(options: { readonly clock?: () => number } = {}) {
    this.clock = options.clock ?? (() => Date.now())
  }

  capture(exec: ToolExecution, executionId: ExecutionId | undefined): void {
    if (!this.active || executionId === undefined || this.effects.has(executionId)) return
    this.sweep(this.clock())
    let session: Session | undefined
    try { session = exec.agent?.session } catch { session = undefined }
    if (session === undefined) return
    let effect: ExpectedEffect | undefined
    try { effect = captureToolContract(exec, executionId, session) ?? captureShell(exec, executionId, session) } catch { effect = undefined }
    if (effect === undefined) return
    const sessionIds = this.bySession.get(session) ?? new Set<ExecutionId>()
    while (sessionIds.size >= 128) {
      const oldest = sessionIds.values().next().value as ExecutionId | undefined
      if (oldest === undefined) break
      this.remove(oldest)
    }
    while (this.effects.size >= MAX_EFFECTS) {
      const oldest = this.effects.keys().next().value as ExecutionId | undefined
      if (oldest === undefined) break
      this.remove(oldest)
    }
    this.effects.set(executionId, { effect, createdAt: this.clock() })
    this.executionsById.set(executionId, exec)
    this.executions.set(exec, effect)
    sessionIds.add(executionId)
    this.bySession.set(session, sessionIds)
  }

  take(exec: Readonly<ToolExecution>): ExpectedEffect | undefined {
    if (this.disposedExecutions.has(exec as ToolExecution)) return undefined
    const effect = this.executions.get(exec as ToolExecution)
    if (effect === undefined) return undefined
    this.remove(effect.executionId)
    return effect
  }

  /**
   * Read the still-live effect's identity without consuming or exposing its
   * target, content, digest, arguments, or retained Session object.
   */
  peekIdentity(
    exec: Readonly<ToolExecution>,
    executionId: ExecutionId,
    session: Session,
  ): ExpectedEffectIdentityV1 | undefined {
    if (!this.active || this.disposedExecutions.has(exec as ToolExecution)) return undefined
    const effect = this.executions.get(exec as ToolExecution)
    const entry = this.effects.get(executionId)
    if (effect === undefined || entry === undefined) return undefined
    if (effect.executionId !== executionId || effect.session !== session
      || this.executionsById.get(executionId) !== exec
      || this.executions.get(exec as ToolExecution) !== effect) return undefined
    try {
      if (exec.agent?.session !== session) return undefined
    } catch { return undefined }
    if (this.clock() - entry.createdAt >= EFFECT_TTL_MS) {
      this.remove(executionId)
      return undefined
    }
    return Object.freeze({ source: effect.source, adapterId: effect.adapterId })
  }

  disposeSession(session: Session): void {
    const ids = this.bySession.get(session)
    if (ids === undefined) return
    for (const executionId of [...ids]) this.remove(executionId)
    ids.clear()
    this.bySession.delete(session)
  }

  dispose(): void {
    this.active = false
    this.effects.clear()
    this.executionsById.clear()
    this.executions = new WeakMap()
    this.disposedExecutions = new WeakSet()
    this.bySession = new WeakMap()
  }

  private sweep(now: number): void {
    for (const [executionId, item] of this.effects) {
      if (now - item.createdAt < EFFECT_TTL_MS) continue
      this.remove(executionId)
    }
  }

  /** Remove every raw lookup atomically, including the object-keyed index. */
  private remove(executionId: ExecutionId): void {
    const item = this.effects.get(executionId)
    if (item === undefined) return
    const execution = this.executionsById.get(executionId)
    if (execution !== undefined) {
      this.executions.delete(execution)
      this.disposedExecutions.add(execution)
    }
    this.effects.delete(executionId)
    this.executionsById.delete(executionId)
    this.bySession.get(item.effect.session)?.delete(executionId)
  }
}
