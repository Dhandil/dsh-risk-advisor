import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import type { ExecutionId } from './correlation.ts'
import type { FailureChainSummary } from './retry-escalation.ts'

export type RuleEvaluationStatus =
  | 'READY'
  | 'DEGRADED'
  | 'UNSUPPORTED'
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'CAPACITY_EXCEEDED'

export type RuleParserConfidence = 'high' | 'medium' | 'low'

export type RuleOperationKind =
  | 'filesystem-read'
  | 'filesystem-write'
  | 'filesystem-edit'
  | 'shell'
  | 'network-read'
  | 'unknown'

export type RuleFindingCategory =
  | 'destructive'
  | 'system-change'
  | 'credential'
  | 'network'
  | 'install'
  | 'permission'
  | 'workspace-boundary'
  | 'path-alias'
  | 'shell-ambiguity'
  | 'unknown-tool'
  | 'reversibility'

export interface RuleFinding {
  readonly id: string
  readonly severity: 'info' | 'medium' | 'high' | 'critical'
  readonly category: RuleFindingCategory
  readonly summary: string
  readonly hard: boolean
}

export interface RuleFailureContext {
  readonly isRetry: boolean
  readonly retryCount: number
  readonly recentFailureCount: number
  readonly sameRootCause: boolean | 'unknown'
  readonly permissionEscalation: boolean | 'unknown'
  readonly degraded: boolean
}

export interface RuleEvaluation {
  readonly schemaVersion: 1
  readonly rulesetVersion: 'phase4-v1'
  readonly executionId: string
  readonly status: RuleEvaluationStatus
  readonly operationKind: RuleOperationKind
  readonly parserConfidence: RuleParserConfidence
  readonly mutating: boolean | 'unknown'
  readonly externalEffect: boolean | 'unknown'
  readonly networkEffect: 'none' | 'read' | 'write' | 'unknown'
  readonly requestedPermission?: 'workspace-write' | 'danger-full-access'
  readonly workspaceContained: 'unknown'
  readonly sandboxCovered: 'unknown'
  readonly reversible: 'unknown'
  readonly failureContext: RuleFailureContext
  readonly findings: readonly RuleFinding[]
  readonly reasonCodes: readonly string[]
}

export interface RuleDiagnostics {
  readonly get: (executionId: ExecutionId) => RuleEvaluation
}

export interface RuleEngineOptions {
  readonly clock?: () => number
  readonly ttlMs?: number
  readonly maxEntries?: number
}

type Permission = 'workspace-write' | 'danger-full-access'
type NetworkEffect = RuleEvaluation['networkEffect']
type FindingCode =
  | 'UNKNOWN_TOOL'
  | 'SHELL_SEMANTICS_AMBIGUOUS'
  | 'SHELL_DYNAMIC_EXECUTION'
  | 'SHELL_ENCODED_EXECUTION'
  | 'SHELL_ENVIRONMENT_INJECTION'
  | 'DESTRUCTIVE_RECURSIVE_DELETE'
  | 'DESTRUCTIVE_DISK_WIPE'
  | 'DESTRUCTIVE_GIT_RESET_HARD'
  | 'DESTRUCTIVE_GIT_CLEAN'
  | 'DESTRUCTIVE_FORCE_PUSH'
  | 'SYSTEM_LOCATION_MUTATION'
  | 'SYSTEM_REGISTRY_MUTATION'
  | 'SYSTEM_SERVICE_MUTATION'
  | 'PERMISSION_DANGER_FULL_ACCESS'
  | 'PERMISSION_PRIVILEGE_ELEVATION'
  | 'PERMISSION_ACCESS_CONTROL_MUTATION'
  | 'PERMISSION_ESCALATION_RETRY'
  | 'CREDENTIAL_SECRET_MATERIAL_PRESENT'
  | 'CREDENTIAL_RESOURCE_ACCESS'
  | 'NETWORK_EXTERNAL_READ'
  | 'NETWORK_EXTERNAL_WRITE'
  | 'INSTALL_PACKAGE_MUTATION'
  | 'INSTALL_GLOBAL_SCOPE'
  | 'REVERSIBILITY_EVIDENCE_UNAVAILABLE'

interface FindingSpec {
  readonly category: RuleFindingCategory
  readonly severity: RuleFinding['severity']
  readonly summary: string
}

const FINDINGS: Readonly<Record<FindingCode, FindingSpec>> = Object.freeze({
  UNKNOWN_TOOL: { category: 'unknown-tool', severity: 'medium', summary: 'The operation uses a tool outside the Phase 4 adapter set.' },
  SHELL_SEMANTICS_AMBIGUOUS: { category: 'shell-ambiguity', severity: 'medium', summary: 'The bounded shell analyzer could not fully understand executable semantics.' },
  SHELL_DYNAMIC_EXECUTION: { category: 'shell-ambiguity', severity: 'high', summary: 'The operation contains dynamic interpreter or invocation semantics.' },
  SHELL_ENCODED_EXECUTION: { category: 'shell-ambiguity', severity: 'high', summary: 'The operation contains an encoded or obfuscated execution form.' },
  SHELL_ENVIRONMENT_INJECTION: { category: 'shell-ambiguity', severity: 'high', summary: 'The operation changes execution semantics through sensitive environment injection.' },
  DESTRUCTIVE_RECURSIVE_DELETE: { category: 'destructive', severity: 'high', summary: 'The operation contains a recognized recursive deletion form.' },
  DESTRUCTIVE_DISK_WIPE: { category: 'destructive', severity: 'critical', summary: 'The operation contains a recognized disk format or wipe form.' },
  DESTRUCTIVE_GIT_RESET_HARD: { category: 'destructive', severity: 'high', summary: 'The operation contains a recognized hard Git reset.' },
  DESTRUCTIVE_GIT_CLEAN: { category: 'destructive', severity: 'high', summary: 'The operation contains a recognized destructive Git clean form.' },
  DESTRUCTIVE_FORCE_PUSH: { category: 'destructive', severity: 'high', summary: 'The operation contains a forced remote Git update.' },
  SYSTEM_LOCATION_MUTATION: { category: 'system-change', severity: 'high', summary: 'The mutation targets a recognized system location.' },
  SYSTEM_REGISTRY_MUTATION: { category: 'system-change', severity: 'high', summary: 'The operation contains a recognized registry mutation.' },
  SYSTEM_SERVICE_MUTATION: { category: 'system-change', severity: 'high', summary: 'The operation contains a recognized system-service mutation.' },
  PERMISSION_DANGER_FULL_ACCESS: { category: 'permission', severity: 'high', summary: 'The operation explicitly requests danger-full-access.' },
  PERMISSION_PRIVILEGE_ELEVATION: { category: 'permission', severity: 'high', summary: 'The operation contains a recognized privilege-elevation form.' },
  PERMISSION_ACCESS_CONTROL_MUTATION: { category: 'permission', severity: 'high', summary: 'The operation contains a recognized access-control mutation.' },
  PERMISSION_ESCALATION_RETRY: { category: 'permission', severity: 'high', summary: 'A prior exact-live failure relation proves permission escalation on retry.' },
  CREDENTIAL_SECRET_MATERIAL_PRESENT: { category: 'credential', severity: 'high', summary: 'The bounded operation input contains secret-like material.' },
  CREDENTIAL_RESOURCE_ACCESS: { category: 'credential', severity: 'high', summary: 'The requested lexical target matches a credential resource indicator.' },
  NETWORK_EXTERNAL_READ: { category: 'network', severity: 'info', summary: 'The known web adapter performs an external network read.' },
  NETWORK_EXTERNAL_WRITE: { category: 'network', severity: 'high', summary: 'The operation contains a recognized external write.' },
  INSTALL_PACKAGE_MUTATION: { category: 'install', severity: 'medium', summary: 'The operation contains a recognized package installation mutation.' },
  INSTALL_GLOBAL_SCOPE: { category: 'install', severity: 'high', summary: 'The operation contains a recognized global package installation form.' },
  REVERSIBILITY_EVIDENCE_UNAVAILABLE: { category: 'reversibility', severity: 'medium', summary: 'Recovery evidence is unavailable for the recognized operation fact.' },
})

const MAX_ARGUMENT_BYTES = 16 * 1024
const MAX_KEYS = 64
const MAX_STRING_LENGTH = 8192
const MAX_ARRAY_ITEMS = 32
const MAX_DEPTH = 3
const MAX_NUMBER = 1_000_000
const MAX_TIMEOUT = 10 * 60 * 1000
const DEFAULT_TTL = 5 * 60 * 1000
const DEFAULT_MAX_ENTRIES = 512
const PERMISSIONS: readonly Permission[] = ['workspace-write', 'danger-full-access']

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values])
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value
  Object.freeze(value)
  if (Array.isArray(value)) {
    for (const child of value) deepFreeze(child)
  } else {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  }
  return value
}

function safeString(value: unknown, nonEmpty = false): string | undefined {
  return typeof value === 'string'
    && value.length <= MAX_STRING_LENGTH
    && (!nonEmpty || value.trim().length > 0)
    ? value
    : undefined
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  try {
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
  } catch {
    return false
  }
}

interface BoundedValue {
  readonly value: unknown
  readonly bytes: number
  readonly keys: number
}

function boundedValue(value: unknown, depth = 0): BoundedValue | undefined {
  if (depth > MAX_DEPTH) return undefined
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) return undefined
    return { value, bytes: value.length * 4 + 4, keys: 0 }
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) && Number.isSafeInteger(value)
      ? { value, bytes: 16, keys: 0 }
      : undefined
  }
  if (typeof value === 'boolean') return { value, bytes: 8, keys: 0 }
  if (value === null) return { value, bytes: 4, keys: 0 }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) return undefined
    try {
      const prototype = Object.getPrototypeOf(value)
      if (prototype !== Array.prototype && prototype !== null) return undefined
      const ownKeys = Reflect.ownKeys(value)
      if (ownKeys.some(key => key !== 'length' && (typeof key !== 'string' || !/^\d+$/.test(key)))) return undefined
      if (ownKeys.length !== value.length + 1) return undefined
    } catch {
      return undefined
    }
    let bytes = 8
    let keys = 0
    const values: unknown[] = []
    for (let index = 0; index < value.length; index += 1) {
      let descriptor: PropertyDescriptor | undefined
      try { descriptor = Object.getOwnPropertyDescriptor(value, String(index)) } catch { return undefined }
      if (descriptor === undefined || !('value' in descriptor)) return undefined
      const bounded = boundedValue(descriptor.value, depth + 1)
      if (bounded === undefined) return undefined
      bytes += bounded.bytes
      keys += bounded.keys
      values.push(bounded.value)
      if (bytes > MAX_ARGUMENT_BYTES || keys > MAX_KEYS) return undefined
    }
    return { value: values, bytes, keys }
  }
  if (!isPlainObject(value)) return undefined
  let keys = 0
  let bytes = 8
  const result: Record<string, unknown> = Object.create(null)
  let ownKeys: readonly (string | symbol)[]
  try { ownKeys = Reflect.ownKeys(value) } catch { return undefined }
  if (ownKeys.length > MAX_KEYS) return undefined
  for (const key of ownKeys) {
    if (typeof key !== 'string') return undefined
    let descriptor: PropertyDescriptor | undefined
    try { descriptor = Object.getOwnPropertyDescriptor(value, key) } catch { return undefined }
    if (descriptor === undefined || !('value' in descriptor)) return undefined
    const bounded = boundedValue(descriptor.value, depth + 1)
    if (bounded === undefined) return undefined
    result[key] = bounded.value
    keys += 1 + bounded.keys
    bytes += key.length * 4 + bounded.bytes
    if (bytes > MAX_ARGUMENT_BYTES || keys > MAX_KEYS) return undefined
  }
  return { value: result, bytes, keys }
}

function boundedFields(value: unknown, allowed: readonly string[]): Map<string, unknown> | undefined {
  const bounded = boundedValue(value)
  if (bounded === undefined || !isPlainObject(value)) return undefined
  const fields = new Map<string, unknown>()
  let keys: readonly (string | symbol)[]
  try { keys = Reflect.ownKeys(value) } catch { return undefined }
  for (const key of keys) {
    if (typeof key !== 'string' || !allowed.includes(key)) return undefined
    let descriptor: PropertyDescriptor | undefined
    try { descriptor = Object.getOwnPropertyDescriptor(value, key) } catch { return undefined }
    if (descriptor === undefined || !('value' in descriptor)) return undefined
    fields.set(key, (bounded.value as Record<string, unknown>)[key])
  }
  return fields
}

function optionalString(fields: Map<string, unknown>, key: string): string | undefined | false {
  if (!fields.has(key)) return undefined
  const value = safeString(fields.get(key))
  return value === undefined ? false : value
}

function optionalInteger(fields: Map<string, unknown>, key: string, max: number, min = 0): number | undefined | false {
  if (!fields.has(key)) return undefined
  const value = fields.get(key)
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max ? value : false
}

function permissionPair(fields: Map<string, unknown>): { permission?: Permission; invalid: boolean } {
  const hasPermission = fields.has('sandbox_permissions')
  const hasJustification = fields.has('justification')
  if (hasPermission !== hasJustification) return { invalid: true }
  if (!hasPermission) return { invalid: false }
  const permission = fields.get('sandbox_permissions')
  const justification = safeString(fields.get('justification'))
  if (!PERMISSIONS.includes(permission as Permission) || justification === undefined || justification.trim().length === 0) {
    return { invalid: true }
  }
  return { permission: permission as Permission, invalid: false }
}

function hasSecret(value: string): boolean {
  return /\bsk-[A-Za-z0-9_-]{4,}\b/i.test(value)
    || /\bgithub_pat_[A-Za-z0-9_]{8,}\b/i.test(value)
    || /\bghp_[A-Za-z0-9]{8,}\b/i.test(value)
    || /\bauthorization\s*:\s*bearer\s+\S+/i.test(value)
    || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(value)
    || /\b(?:password|token|api[_-]?key)\s*=\s*[^\s&;]+/i.test(value)
    || /(?:[?&](?:token|password|api[_-]?key)=|:\/\/[^\s/@]+:[^\s/@]+@)/i.test(value)
}

function hasCredentialResource(value: string): boolean {
  const normalized = value.replaceAll('\\', '/').toLowerCase()
  return /(?:^|\/)(?:id_rsa|id_ed25519|id_ecdsa|id_dsa)(?:$|[/?#])/.test(normalized)
    || normalized.includes('/.aws/credentials')
    || normalized.endsWith('/.npmrc')
    || normalized.endsWith('/.pypirc')
    || normalized.endsWith('/.docker/config.json')
}

function isSystemLocation(value: string): boolean {
  const normalized = value.replaceAll('\\', '/').toLowerCase()
  return /^(?:[a-z]:)?\/(?:windows|program files(?: \(x86\))?|programdata)(?:\/|$)/.test(normalized)
    || /^(?:[a-z]:)?\/(?:etc|usr|bin|sbin|system|library)(?:\/|$)/.test(normalized)
}

function lowerTokens(tokens: readonly string[]): string[] {
  return tokens.map(token => token.toLowerCase())
}

interface ShellScan {
  readonly codes: readonly FindingCode[]
  readonly ambiguous: boolean
  readonly degraded: boolean
  readonly tokens: readonly string[]
  readonly systemLocation: boolean
}

interface ShellSegment {
  readonly text: string
  readonly pipedFrom: boolean
}

function splitShell(command: string): { segments: ShellSegment[]; ambiguous: boolean; unsupported: boolean } {
  const segments: ShellSegment[] = []
  let current = ''
  let quote: 'single' | 'double' | undefined
  let escaped = false
  let ambiguous = false
  let unsupported = false
  let comment = false
  let pipedFrom = false
  const pushSegment = () => {
    if (current.trim()) segments.push({ text: current, pipedFrom })
    current = ''
    pipedFrom = false
  }
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index]!
    if (comment) {
      if (char === '\n') {
        pushSegment()
        comment = false
      }
      continue
    }
    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === '\\' && quote !== 'single') {
      current += char
      if (index === command.length - 1) ambiguous = true
      else escaped = true
      continue
    }
    if (char === "'" && quote !== 'double') {
      quote = quote === 'single' ? undefined : 'single'
      current += char
      continue
    }
    if (char === '"' && quote !== 'single') {
      quote = quote === 'double' ? undefined : 'double'
      current += char
      continue
    }
    if (quote === undefined) {
      if (char === '#' && (index === 0 || /\s/.test(command[index - 1]!))) {
        comment = true
        continue
      }
      if (char === '$' && command[index + 1] === '(') ambiguous = true
      if (char === '`') ambiguous = true
      if (char === '<' || char === '>') {
        ambiguous = true
        if (command[index + 1] === char || command[index + 1] === '(') unsupported = true
        current += char
        continue
      }
      if (char === '(' || char === ')' || char === '{' || char === '}') {
        ambiguous = true
        unsupported = true
      }
      if ((char === '@' && (command[index + 1] === '"' || command[index + 1] === "'"))
        || (char === '$' && command[index + 1] === '{')) unsupported = true
      if (char === '\n' || char === ';') {
        pushSegment()
        continue
      }
      if (char === '&' || char === '|') {
        const next = command[index + 1]
        if (char === '|' && next !== '|') {
          pushSegment()
          pipedFrom = true
        } else {
          if (next === char) index += 1
          pushSegment()
        }
        continue
      }
    } else if (quote === 'double' && ((char === '$' && command[index + 1] === '(') || char === '`')) {
      ambiguous = true
    }
    current += char
  }
  if (quote !== undefined || escaped) ambiguous = true
  pushSegment()
  return { segments, ambiguous, unsupported }
}

function tokenizeSegment(segment: string): { tokens: string[]; ambiguous: boolean } {
  const tokens: string[] = []
  let current = ''
  let quote: 'single' | 'double' | undefined
  let escaped = false
  let ambiguous = false
  const push = () => { if (current.length > 0) tokens.push(current); current = '' }
  for (let index = 0; index < segment.length; index += 1) {
    const char = segment[index]!
    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === '\\' && quote !== 'single') {
      escaped = true
      continue
    }
    if (char === "'" && quote !== 'double') {
      quote = quote === 'single' ? undefined : 'single'
      continue
    }
    if (char === '"' && quote !== 'single') {
      quote = quote === 'double' ? undefined : 'double'
      continue
    }
    if (quote === undefined && /\s/.test(char)) {
      push()
      continue
    }
    current += char
  }
  if (quote !== undefined || escaped) ambiguous = true
  push()
  return { tokens, ambiguous }
}

function hasFlag(tokens: readonly string[], ...flags: string[]): boolean {
  return tokens.some(token => {
    const lower = token.toLowerCase()
    return flags.some(flag => lower === flag || lower.startsWith(`${flag}=`))
  })
}

function commandToken(tokens: readonly string[]): { command?: string; args: readonly string[]; assignments: readonly string[] } {
  let index = 0
  const assignments: string[] = []
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.+/.test(tokens[index]!)) {
    assignments.push(tokens[index]!)
    index += 1
  }
  if (tokens[index]?.toLowerCase() === 'export') {
    index += 1
    while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=.+/.test(tokens[index]!)) {
      assignments.push(tokens[index]!)
      index += 1
    }
  }
  const command = tokens[index]
  return {
    ...command === undefined ? {} : { command: command.toLowerCase() },
    args: tokens.slice(index + 1),
    assignments,
  }
}

interface WrapperView {
  readonly action?: string
  readonly args: readonly string[]
  readonly assignments?: readonly string[]
  readonly degraded: boolean
  readonly privilegeWrapper: boolean
}

const PRIVILEGE_VALUE_OPTIONS = new Set(['-u', '--user', '-g', '--group'])
const ENV_VALUE_OPTIONS = new Set(['-u', '--unset'])

function transparentWrapper(executable: string | undefined, args: readonly string[], dialect: 'bash' | 'pwsh'): WrapperView {
  if (executable === 'sudo' || executable === 'doas' || executable === 'pkexec') {
    let index = 0
    while (index < args.length) {
      const value = args[index]!
      if (value === '--') { index += 1; break }
      if (!value.startsWith('-')) break
      const lower = value.toLowerCase()
      if ([...PRIVILEGE_VALUE_OPTIONS].some(option => lower === option || lower.startsWith(`${option}=`))) {
        if (!lower.includes('=') && index + 1 >= args.length) return { args: [], degraded: true, privilegeWrapper: true }
        index += lower.includes('=') ? 1 : 2
        continue
      }
      if (['-e', '--preserve-env', '-h', '--help', '-n', '--non-interactive', '-s', '--shell', '-l', '--login'].includes(lower)) {
        index += 1
        continue
      }
      return { args: [], degraded: true, privilegeWrapper: true }
    }
    const action = args[index]
    return action === undefined
      ? { args: [], degraded: true, privilegeWrapper: true }
      : { action: action.toLowerCase(), args: args.slice(index + 1), degraded: false, privilegeWrapper: true }
  }

  if (executable === 'env') {
    const assignments: string[] = []
    let index = 0
    while (index < args.length && /^[A-Za-z_][A-Za-z0-9_]*=.+/.test(args[index]!)) {
      assignments.push(args[index]!)
      index += 1
    }
    while (index < args.length && args[index]!.startsWith('-')) {
      const option = args[index]!.toLowerCase()
      if (ENV_VALUE_OPTIONS.has(option)) {
        if (index + 1 >= args.length) return { assignments, args: [], degraded: true, privilegeWrapper: false }
        index += 2
      } else if (option === '-i' || option === '--ignore-environment') {
        index += 1
      } else {
        return { assignments, args: [], degraded: true, privilegeWrapper: false }
      }
    }
    const action = args[index]
    return action === undefined
      ? { assignments, args: [], degraded: true, privilegeWrapper: false }
      : { action: action.toLowerCase(), args: args.slice(index + 1), assignments, degraded: true, privilegeWrapper: false }
  }

  if (executable === 'command' || executable === 'exec') {
    if (args[0]?.startsWith('-')) return { args: [], degraded: true, privilegeWrapper: false }
    return args[0] === undefined
      ? { args: [], degraded: true, privilegeWrapper: false }
      : { action: args[0].toLowerCase(), args: args.slice(1), degraded: true, privilegeWrapper: false }
  }

  if (executable === 'xargs' || executable === 'parallel') {
    const index = args.findIndex(arg => !arg.startsWith('-'))
    return index < 0
      ? { args: [], degraded: true, privilegeWrapper: false }
      : { action: args[index]!.toLowerCase(), args: args.slice(index + 1), degraded: true, privilegeWrapper: false }
  }

  return { ...executable === undefined ? {} : { action: executable }, args, assignments: [], degraded: false, privilegeWrapper: dialect === 'bash' && executable === 'sudo' }
}

function systemTargetOperands(action: string | undefined, args: readonly string[]): readonly string[] {
  if (action === undefined) return []
  const operands = args.filter(arg => !arg.startsWith('-'))
  if (['chmod', 'chown', 'chgrp'].includes(action)) return operands.slice(1)
  if (['rm', 'remove-item', 'ri', 'del', 'erase', 'setfacl', 'icacls', 'takeown', 'set-acl'].includes(action)) return operands
  return []
}

function scanShell(command: string, dialect: 'bash' | 'pwsh'): ShellScan {
  const split = splitShell(command)
  const codes = new Set<FindingCode>()
  let ambiguous = split.ambiguous || split.unsupported
  let systemLocation = false
  const unsupportedCommands = new Set([
    'if', 'then', 'elif', 'elseif', 'else', 'fi', 'for', 'foreach', 'while', 'until', 'do', 'done',
    'case', 'esac', 'function', 'switch', 'try', 'catch', 'finally',
  ])
  if (/^\s*&\s+\$/.test(command)) codes.add('SHELL_DYNAMIC_EXECUTION')
  for (const segment of split.segments) {
    const tokenized = tokenizeSegment(segment.text)
    ambiguous ||= tokenized.ambiguous
    const tokens = tokenized.tokens
    const lower = lowerTokens(tokens)
    const parsed = commandToken(tokens)
    const executable = parsed.command
    const wrapper = transparentWrapper(executable, parsed.args, dialect)
    const action = wrapper.action
    const actionArgs = wrapper.args
    const segmentCodes = new Set<FindingCode>()
    const assignments = [...parsed.assignments, ...(wrapper.assignments ?? [])]
    const executableIsVariable = executable !== undefined && (executable.startsWith('$') || executable.startsWith('${'))
    const sensitiveAssignment = assignments.some(value => /^(?:PATH|LD_PRELOAD|NODE_OPTIONS)=/i.test(value))
    if (sensitiveAssignment || lower.some(token => /^\$env:(?:path|ld_preload|node_options)=/i.test(token))) {
      segmentCodes.add('SHELL_ENVIRONMENT_INJECTION')
    }
    if (assignments.length > 0 && !sensitiveAssignment) ambiguous = true
    if (lower.some(token => /^\$env:[a-z_][a-z0-9_]*=/.test(token))) ambiguous = true
    if (tokens.some(token => hasSecret(token))) segmentCodes.add('CREDENTIAL_SECRET_MATERIAL_PRESENT')

    const interpreter = action ?? executable
    const interpreterArgs = action === undefined ? parsed.args : actionArgs
    const dynamic = interpreter === 'eval'
      || interpreter === 'invoke-expression'
      || interpreter === 'iex'
      || interpreter === 'source'
      || interpreter === '.'
      || executableIsVariable
      || (['bash', 'sh', 'node', 'python', 'perl', 'powershell', 'pwsh', 'cmd'].includes(interpreter ?? '')
        && interpreterArgs.some(arg => {
          const flag = arg.toLowerCase()
          if (interpreter === 'cmd') return flag === '/c'
          if (interpreter === 'powershell' || interpreter === 'pwsh') return flag === '-command' || flag === '-c' || flag === '-encodedcommand' || flag === '-enc'
          if (interpreter === 'bash' || interpreter === 'sh') return flag === '-c'
          return (interpreter === 'node' && flag === '-e') || (interpreter === 'python' && flag === '-c') || (interpreter === 'perl' && flag === '-e')
        }))
    if (dynamic) segmentCodes.add('SHELL_DYNAMIC_EXECUTION')
    if (dynamic && (executableIsVariable || interpreter === 'source' || interpreter === '.')) ambiguous = true
    if ((interpreter === 'powershell' || interpreter === 'pwsh') && interpreterArgs.some(arg => ['-encodedcommand', '-enc'].includes(arg.toLowerCase()))) {
      segmentCodes.add('SHELL_ENCODED_EXECUTION')
    }
    if (tokens.some(token => /^(?:&|\.\s*)\$/.test(token))) segmentCodes.add('SHELL_DYNAMIC_EXECUTION')
    if (unsupportedCommands.has(executable ?? '') || unsupportedCommands.has(action ?? '')) ambiguous = true
    if (wrapper.degraded) ambiguous = true
    if (['command', 'exec', 'xargs', 'parallel'].includes(executable ?? '')) segmentCodes.add('SHELL_DYNAMIC_EXECUTION')
    if (executable === 'find' && parsed.args.some(arg => arg.toLowerCase() === '-exec')) segmentCodes.add('SHELL_DYNAMIC_EXECUTION')
    if (segment.pipedFrom && ['bash', 'sh', 'powershell', 'pwsh', 'python', 'perl', 'node'].includes(interpreter ?? '')) {
      segmentCodes.add('SHELL_DYNAMIC_EXECUTION')
    }

    if ((dialect === 'bash' && action === 'rm') && actionArgs.some(arg => arg.toLowerCase() === '--recursive' || (/^-[^-]/.test(arg) && arg.toLowerCase().includes('r')))) {
      segmentCodes.add('DESTRUCTIVE_RECURSIVE_DELETE')
    }
    if (dialect === 'pwsh' && ['remove-item', 'ri', 'del', 'erase'].includes(action ?? '')
      && hasFlag(actionArgs, '-recurse', '-r', '-recursive')) {
      segmentCodes.add('DESTRUCTIVE_RECURSIVE_DELETE')
    }
    if ((dialect === 'bash' && (action?.startsWith('mkfs') ?? false))
      || (dialect === 'pwsh' && ['format-volume', 'clear-disk', 'diskpart'].includes(action ?? ''))) {
      segmentCodes.add('DESTRUCTIVE_DISK_WIPE')
    }
    if (action === 'git' && actionArgs[0]?.toLowerCase() === 'reset' && actionArgs.some(arg => arg.toLowerCase() === '--hard')) {
      segmentCodes.add('DESTRUCTIVE_GIT_RESET_HARD')
    }
    if (action === 'git' && actionArgs[0]?.toLowerCase() === 'clean' && actionArgs.some(arg => arg.toLowerCase() === '--force' || (/^-[^-]/.test(arg) && arg.toLowerCase().includes('f')))) {
      segmentCodes.add('DESTRUCTIVE_GIT_CLEAN')
    }
    if (action === 'git' && actionArgs[0]?.toLowerCase() === 'push') {
      segmentCodes.add('NETWORK_EXTERNAL_WRITE')
      if (actionArgs.some(arg => ['--force', '--force-with-lease', '-f'].includes(arg.toLowerCase()))) segmentCodes.add('DESTRUCTIVE_FORCE_PUSH')
    }

    const registryMutation = action === 'reg' || action === 'reg.exe'
      ? ['add', 'delete', 'import', 'copy'].includes(actionArgs[0]?.toLowerCase() ?? '')
      : dialect === 'pwsh'
        && ['set-itemproperty', 'new-itemproperty', 'remove-itemproperty'].includes(action ?? '')
        && actionArgs.some(token => /registry|hklm:|hkcu:/i.test(token))
    if (registryMutation) segmentCodes.add('SYSTEM_REGISTRY_MUTATION')
    const serviceMutation = (action === 'systemctl' && ['enable', 'disable', 'start', 'stop', 'restart', 'mask', 'unmask'].includes(actionArgs[0]?.toLowerCase() ?? ''))
      || (action === 'sc' && ['create', 'config', 'delete', 'start', 'stop'].includes(actionArgs[0]?.toLowerCase() ?? ''))
      || (action === 'service' && ['start', 'stop', 'restart', 'enable', 'disable'].includes(actionArgs[0]?.toLowerCase() ?? ''))
      || (dialect === 'pwsh' && ['new-service', 'set-service', 'remove-service', 'start-service', 'stop-service', 'restart-service'].includes(action ?? ''))
    if (serviceMutation) segmentCodes.add('SYSTEM_SERVICE_MUTATION')

    const startProcessRunAs = dialect === 'pwsh' && action === 'start-process'
      && actionArgs.some((arg, position) => arg.toLowerCase() === '-verb' && actionArgs[position + 1]?.toLowerCase() === 'runas')
    if ((dialect === 'bash' && wrapper.privilegeWrapper) || startProcessRunAs) segmentCodes.add('PERMISSION_PRIVILEGE_ELEVATION')
    if (['chmod', 'chown', 'chgrp', 'setfacl', 'icacls', 'takeown'].includes(action ?? '')
      || (dialect === 'pwsh' && action === 'set-acl')) {
      segmentCodes.add('PERMISSION_ACCESS_CONTROL_MUTATION')
    }

    if ((action === 'npm' || action === 'pnpm') && ['install', 'add', 'ci'].includes(actionArgs[0]?.toLowerCase() ?? '')) {
      segmentCodes.add('INSTALL_PACKAGE_MUTATION')
      if (actionArgs.some(arg => ['-g', '--global'].includes(arg.toLowerCase()))) segmentCodes.add('INSTALL_GLOBAL_SCOPE')
    }
    if ((action === 'npm' || action === 'pnpm') && actionArgs[0]?.toLowerCase() === 'publish') segmentCodes.add('NETWORK_EXTERNAL_WRITE')
    if (['curl', 'wget', 'invoke-webrequest', 'invoke-restmethod'].includes(action ?? '')
      && (actionArgs.some(arg => ['-d', '--data', '--data-raw', '--data-binary', '--upload-file', '-t', '--post-file'].includes(arg.toLowerCase()))
        || actionArgs.some((arg, position) => arg.toLowerCase() === '-x' && ['post', 'put', 'patch', 'delete'].includes(actionArgs[position + 1]?.toLowerCase() ?? ''))
        || actionArgs.some(arg => /^-method:(post|put|patch|delete)$/i.test(arg)))) {
      segmentCodes.add('NETWORK_EXTERNAL_WRITE')
    }
    if (['scp', 'sftp', 'rsync'].includes(action ?? '')) ambiguous = true

    const systemTargetAction = (segmentCodes.has('DESTRUCTIVE_RECURSIVE_DELETE')
      && ['rm', 'remove-item', 'ri', 'del', 'erase'].includes(action ?? ''))
      || (segmentCodes.has('PERMISSION_ACCESS_CONTROL_MUTATION')
        && ['chmod', 'chown', 'chgrp', 'setfacl', 'icacls', 'takeown', 'set-acl'].includes(action ?? ''))
    if (systemTargetAction && systemTargetOperands(action, actionArgs).some(token => isSystemLocation(token))) {
      segmentCodes.add('SYSTEM_LOCATION_MUTATION')
    }
    for (const code of segmentCodes) codes.add(code)
  }
  const degradedByFinding = [...codes].some(code => ['SHELL_SEMANTICS_AMBIGUOUS', 'SHELL_DYNAMIC_EXECUTION', 'SHELL_ENCODED_EXECUTION', 'SHELL_ENVIRONMENT_INJECTION'].includes(code))
  if (ambiguous) codes.add('SHELL_SEMANTICS_AMBIGUOUS')
  const degraded = ambiguous || degradedByFinding
  return { codes: [...codes], ambiguous, degraded, tokens: split.segments.flatMap(segment => tokenizeSegment(segment.text).tokens), systemLocation }
}

function urlHasCredential(value: string): boolean {
  return hasSecret(value)
}

interface EvaluationParts {
  status: RuleEvaluationStatus
  operationKind: RuleOperationKind
  parserConfidence: RuleParserConfidence
  mutating: boolean | 'unknown'
  externalEffect: boolean | 'unknown'
  networkEffect: NetworkEffect
  requestedPermission?: Permission
  findings: Set<FindingCode>
  reasonCodes: Set<string>
  failureContext: RuleFailureContext
}

function emptyFailureContext(summary: FailureChainSummary | undefined): RuleFailureContext {
  const degraded = summary === undefined || summary.status !== 'READY'
  return {
    isRetry: summary?.retryOf !== undefined,
    retryCount: summary?.retryCount ?? 0,
    recentFailureCount: summary?.recentFailureCount ?? 0,
    sameRootCause: summary?.sameRootCause ?? 'unknown',
    permissionEscalation: summary?.permissionEscalation ?? 'unknown',
    degraded,
  }
}

function addFinding(parts: EvaluationParts, code: FindingCode): void {
  parts.findings.add(code)
}

function invalidParts(kind: RuleOperationKind, summary: FailureChainSummary | undefined, reason = 'RULE_ARGUMENT_UNSUPPORTED'): EvaluationParts {
  return {
    status: 'UNSUPPORTED', operationKind: kind, parserConfidence: 'low', mutating: 'unknown', externalEffect: 'unknown', networkEffect: 'unknown',
    findings: new Set(), reasonCodes: new Set([reason]), failureContext: emptyFailureContext(summary),
  }
}

function scanSecretValues(parts: EvaluationParts, values: readonly (string | undefined)[]): void {
  for (const value of values) {
    if (value === undefined) continue
    if (hasSecret(value)) addFinding(parts, 'CREDENTIAL_SECRET_MATERIAL_PRESENT')
  }
}

function scanCredentialTarget(parts: EvaluationParts, value: string): void {
  if (hasCredentialResource(value)) addFinding(parts, 'CREDENTIAL_RESOURCE_ACCESS')
}

function evaluateOperation(toolName: string, args: unknown, summary: FailureChainSummary | undefined): EvaluationParts {
  if (toolName === 'read') {
    const fields = boundedFields(args, ['file_path', 'offset', 'limit'])
    if (fields === undefined) return invalidParts('filesystem-read', summary)
    const path = safeString(fields.get('file_path'), true)
    const offset = optionalInteger(fields, 'offset', MAX_NUMBER, 1)
    const limit = optionalInteger(fields, 'limit', MAX_NUMBER, 1)
    if (path === undefined || offset === false || limit === false) return invalidParts('filesystem-read', summary, 'RULE_READ_VALUE_UNSUPPORTED')
    const parts: EvaluationParts = {
      status: 'READY', operationKind: 'filesystem-read', parserConfidence: 'high', mutating: false, externalEffect: false, networkEffect: 'none',
      findings: new Set(), reasonCodes: new Set(), failureContext: emptyFailureContext(summary),
    }
    scanSecretValues(parts, [path])
    scanCredentialTarget(parts, path)
    return parts
  }
  if (toolName === 'write') {
    const fields = boundedFields(args, ['file_path', 'content', 'sandbox_permissions', 'justification'])
    if (fields === undefined) return invalidParts('filesystem-write', summary)
    const path = safeString(fields.get('file_path'), true)
    const content = safeString(fields.get('content'))
    const pair = permissionPair(fields)
    if (path === undefined || content === undefined || pair.invalid) return invalidParts('filesystem-write', summary, pair.invalid ? 'RULE_ESCALATION_PAIR_UNSUPPORTED' : 'RULE_WRITE_VALUE_UNSUPPORTED')
    const parts: EvaluationParts = {
      status: 'READY', operationKind: 'filesystem-write', parserConfidence: 'high', mutating: true, externalEffect: false, networkEffect: 'none',
      ...pair.permission === undefined ? {} : { requestedPermission: pair.permission },
      findings: new Set(), reasonCodes: new Set(), failureContext: emptyFailureContext(summary),
    }
    scanSecretValues(parts, [path, content])
    scanCredentialTarget(parts, path)
    if (isSystemLocation(path)) addFinding(parts, 'SYSTEM_LOCATION_MUTATION')
    if (pair.permission === 'danger-full-access') addFinding(parts, 'PERMISSION_DANGER_FULL_ACCESS')
    return parts
  }
  if (toolName === 'edit') {
    const fields = boundedFields(args, ['file_path', 'old_string', 'new_string', 'replace_all', 'sandbox_permissions', 'justification'])
    if (fields === undefined) return invalidParts('filesystem-edit', summary)
    const path = safeString(fields.get('file_path'), true)
    const oldString = safeString(fields.get('old_string'), true)
    const newString = safeString(fields.get('new_string'))
    const pair = permissionPair(fields)
    if (fields.has('replace_all') && typeof fields.get('replace_all') !== 'boolean') return invalidParts('filesystem-edit', summary, 'RULE_EDIT_VALUE_UNSUPPORTED')
    if (path === undefined || oldString === undefined || newString === undefined || oldString === newString || pair.invalid) return invalidParts('filesystem-edit', summary, pair.invalid ? 'RULE_ESCALATION_PAIR_UNSUPPORTED' : 'RULE_EDIT_VALUE_UNSUPPORTED')
    const parts: EvaluationParts = {
      status: 'READY', operationKind: 'filesystem-edit', parserConfidence: 'high', mutating: true, externalEffect: false, networkEffect: 'none',
      ...pair.permission === undefined ? {} : { requestedPermission: pair.permission },
      findings: new Set(), reasonCodes: new Set(), failureContext: emptyFailureContext(summary),
    }
    scanSecretValues(parts, [path, oldString, newString])
    scanCredentialTarget(parts, path)
    if (isSystemLocation(path)) addFinding(parts, 'SYSTEM_LOCATION_MUTATION')
    if (pair.permission === 'danger-full-access') addFinding(parts, 'PERMISSION_DANGER_FULL_ACCESS')
    return parts
  }
  if (toolName === 'bash' || toolName === 'pwsh') {
    const fields = boundedFields(args, ['command', 'description', 'timeoutMs', 'workdir', 'run_in_background', 'sandbox_permissions', 'justification'])
    if (fields === undefined) return invalidParts('shell', summary)
    const command = safeString(fields.get('command'), true)
    if (command === undefined) return invalidParts('shell', summary, 'RULE_COMMAND_UNSUPPORTED')
    const persistent = fields.size === 1
    if (!persistent) {
      const description = optionalString(fields, 'description')
      const timeout = optionalInteger(fields, 'timeoutMs', MAX_TIMEOUT, 1)
      const workdir = optionalString(fields, 'workdir')
      if (description === undefined || description === false || description.trim().length === 0 || timeout === false || workdir === false
        || (fields.has('run_in_background') && typeof fields.get('run_in_background') !== 'boolean')) {
        return invalidParts('shell', summary, 'RULE_SHELL_VALUE_UNSUPPORTED')
      }
    }
    const pair = permissionPair(fields)
    if (pair.invalid) return invalidParts('shell', summary, 'RULE_ESCALATION_PAIR_UNSUPPORTED')
    const scan = scanShell(command, toolName)
    const parts: EvaluationParts = {
      status: scan.degraded ? 'DEGRADED' : 'READY', operationKind: 'shell', parserConfidence: scan.degraded ? 'medium' : 'high', mutating: 'unknown', externalEffect: 'unknown', networkEffect: 'unknown',
      ...pair.permission === undefined ? {} : { requestedPermission: pair.permission },
      findings: new Set(scan.codes), reasonCodes: new Set(scan.degraded ? ['RULE_SHELL_AMBIGUOUS'] : []), failureContext: emptyFailureContext(summary),
    }
    if (pair.permission === 'danger-full-access') addFinding(parts, 'PERMISSION_DANGER_FULL_ACCESS')
    if (scan.codes.includes('NETWORK_EXTERNAL_WRITE')) {
      parts.externalEffect = true
      parts.networkEffect = 'write'
    }
    if (scan.systemLocation) addFinding(parts, 'SYSTEM_LOCATION_MUTATION')
    if (summary?.permissionEscalation === true) addFinding(parts, 'PERMISSION_ESCALATION_RETRY')
    if (parts.failureContext.degraded) {
      parts.status = 'DEGRADED'
      parts.parserConfidence = 'medium'
      parts.reasonCodes.add('RULE_FAILURE_CONTEXT_DEGRADED')
    }
    return parts
  }
  if (toolName === 'web_fetch') {
    const fields = boundedFields(args, ['url'])
    const url = fields === undefined ? undefined : safeString(fields.get('url'), true)
    let parsed: URL | undefined
    try { if (url !== undefined) parsed = new URL(url) } catch { parsed = undefined }
    if (url === undefined || parsed === undefined || !['http:', 'https:'].includes(parsed.protocol)) return invalidParts('network-read', summary, 'RULE_URL_UNSUPPORTED')
    const parts: EvaluationParts = {
      status: 'READY', operationKind: 'network-read', parserConfidence: 'high', mutating: false, externalEffect: true, networkEffect: 'read',
      findings: new Set(['NETWORK_EXTERNAL_READ']), reasonCodes: new Set(), failureContext: emptyFailureContext(summary),
    }
    if (urlHasCredential(url)) addFinding(parts, 'CREDENTIAL_SECRET_MATERIAL_PRESENT')
    if (parts.failureContext.degraded) { parts.status = 'DEGRADED'; parts.parserConfidence = 'medium'; parts.reasonCodes.add('RULE_FAILURE_CONTEXT_DEGRADED') }
    return parts
  }
  if (toolName === 'web_search') {
    const fields = boundedFields(args, ['queries'])
    const queries = fields?.get('queries')
    if (!Array.isArray(queries) || queries.length === 0 || queries.length > MAX_ARRAY_ITEMS || queries.some(query => safeString(query, true) === undefined)) return invalidParts('network-read', summary, 'RULE_QUERIES_UNSUPPORTED')
    const parts: EvaluationParts = {
      status: 'READY', operationKind: 'network-read', parserConfidence: 'high', mutating: false, externalEffect: true, networkEffect: 'read',
      findings: new Set(['NETWORK_EXTERNAL_READ']), reasonCodes: new Set(), failureContext: emptyFailureContext(summary),
    }
    scanSecretValues(parts, queries as string[])
    if (parts.failureContext.degraded) { parts.status = 'DEGRADED'; parts.parserConfidence = 'medium'; parts.reasonCodes.add('RULE_FAILURE_CONTEXT_DEGRADED') }
    return parts
  }
  return {
    status: 'UNSUPPORTED', operationKind: 'unknown', parserConfidence: 'low', mutating: 'unknown', externalEffect: 'unknown', networkEffect: 'unknown',
    findings: new Set(['UNKNOWN_TOOL']), reasonCodes: new Set(['RULE_TOOL_UNSUPPORTED']), failureContext: emptyFailureContext(summary),
  }
}

function completeEvaluation(executionId: string, parts: EvaluationParts): RuleEvaluation {
  if (parts.failureContext.degraded && parts.status === 'READY') {
    parts.status = 'DEGRADED'
    parts.parserConfidence = 'medium'
    parts.reasonCodes.add('RULE_FAILURE_CONTEXT_DEGRADED')
  }
  if (parts.failureContext.permissionEscalation === true) addFinding(parts, 'PERMISSION_ESCALATION_RETRY')
  if ([...parts.findings].some(code => ['DESTRUCTIVE_RECURSIVE_DELETE', 'DESTRUCTIVE_DISK_WIPE', 'DESTRUCTIVE_GIT_RESET_HARD', 'DESTRUCTIVE_GIT_CLEAN', 'DESTRUCTIVE_FORCE_PUSH', 'SYSTEM_LOCATION_MUTATION', 'SYSTEM_REGISTRY_MUTATION', 'SYSTEM_SERVICE_MUTATION', 'NETWORK_EXTERNAL_WRITE'].includes(code))) {
    addFinding(parts, 'REVERSIBILITY_EVIDENCE_UNAVAILABLE')
  }
  const findings = [...parts.findings].map(code => {
    const spec = FINDINGS[code]
    return Object.freeze({ id: code, severity: spec.severity, category: spec.category, summary: spec.summary, hard: true as const })
  })
  return deepFreeze({
    schemaVersion: 1 as const,
    rulesetVersion: 'phase4-v1' as const,
    executionId,
    status: parts.status,
    operationKind: parts.operationKind,
    parserConfidence: parts.parserConfidence,
    mutating: parts.mutating,
    externalEffect: parts.externalEffect,
    networkEffect: parts.networkEffect,
    ...parts.requestedPermission === undefined ? {} : { requestedPermission: parts.requestedPermission },
    workspaceContained: 'unknown' as const,
    sandboxCovered: 'unknown' as const,
    reversible: 'unknown' as const,
    failureContext: {
      isRetry: parts.failureContext.isRetry,
      retryCount: parts.failureContext.retryCount,
      recentFailureCount: parts.failureContext.recentFailureCount,
      sameRootCause: parts.failureContext.sameRootCause,
      permissionEscalation: parts.failureContext.permissionEscalation,
      degraded: parts.failureContext.degraded,
    },
    findings: freezeArray(findings),
    reasonCodes: freezeArray([...parts.reasonCodes]),
  })
}

function lifecycleEvaluation(executionId: string, status: RuleEvaluationStatus, reason: string): RuleEvaluation {
  return deepFreeze({
    schemaVersion: 1 as const,
    rulesetVersion: 'phase4-v1' as const,
    executionId,
    status,
    operationKind: 'unknown' as const,
    parserConfidence: 'low' as const,
    mutating: 'unknown' as const,
    externalEffect: 'unknown' as const,
    networkEffect: 'unknown' as const,
    workspaceContained: 'unknown' as const,
    sandboxCovered: 'unknown' as const,
    reversible: 'unknown' as const,
    failureContext: {
      isRetry: false,
      retryCount: 0,
      recentFailureCount: 0,
      sameRootCause: 'unknown' as const,
      permissionEscalation: 'unknown' as const,
      degraded: true,
    },
    findings: freezeArray([]),
    reasonCodes: freezeArray([reason]),
  })
}

interface StoredEvaluation {
  readonly createdAt: number
  readonly evaluation: RuleEvaluation
}

export class RuleEngine {
  private readonly records = new Map<ExecutionId, StoredEvaluation>()
  private readonly retired = new Map<ExecutionId, { status: RuleEvaluationStatus; reason: string }>()
  private readonly clock: () => number
  private readonly ttlMs: number
  private readonly maxEntries: number
  private active = true

  readonly diagnostics: RuleDiagnostics = Object.freeze({ get: this.get.bind(this) })

  constructor(options: RuleEngineOptions = {}) {
    this.clock = options.clock ?? (() => performance.now())
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES
    if (![this.ttlMs, this.maxEntries].every(value => Number.isSafeInteger(value) && value > 0)) throw new RangeError('Rule Engine bounds must be positive safe integers')
    if (this.maxEntries > DEFAULT_MAX_ENTRIES) throw new RangeError('Rule Engine capacity cannot exceed 512')
  }

  observePreExecute(exec: ToolExecution, executionId: ExecutionId | undefined, summary?: FailureChainSummary): void {
    if (!this.active || executionId === undefined || this.records.has(executionId)) return
    const now = this.clock()
    this.sweep(now)
    if (this.records.size >= this.maxEntries) {
      this.retired.set(executionId, { status: 'CAPACITY_EXCEEDED', reason: 'CAPACITY_EXCEEDED' })
      return
    }
    let toolName: string | undefined
    let args: unknown
    try {
      toolName = typeof exec.name === 'string' ? exec.name : undefined
      args = exec.arguments
    } catch {
      const parts = invalidParts('unknown', summary, 'RULE_EXACT_LIVE_SCOPE_UNAVAILABLE')
      this.records.set(executionId, { createdAt: now, evaluation: completeEvaluation(executionId, parts) })
      return
    }
    let parts: EvaluationParts
    try {
      parts = toolName === undefined
        ? invalidParts('unknown', summary, 'RULE_EXACT_LIVE_SCOPE_UNAVAILABLE')
        : evaluateOperation(toolName, args, summary)
    } catch {
      parts = invalidParts('unknown', summary, 'RULE_ARGUMENT_SHAPE_UNSUPPORTED')
    }
    this.records.set(executionId, { createdAt: now, evaluation: completeEvaluation(executionId, parts) })
  }

  dispose(): void {
    this.active = false
    this.records.clear()
    this.retired.clear()
  }

  private sweep(now: number): void {
    for (const [executionId, record] of this.records) {
      if (now - record.createdAt >= this.ttlMs) {
        this.records.delete(executionId)
        this.retired.set(executionId, { status: 'EXPIRED', reason: 'TTL_EXPIRED' })
      }
    }
    while (this.retired.size > this.maxEntries * 2) this.retired.delete(this.retired.keys().next().value!)
  }

  private get(executionId: ExecutionId): RuleEvaluation {
    if (!this.active) return lifecycleEvaluation(executionId, 'NOT_FOUND', 'RUNTIME_STATE_LOST')
    this.sweep(this.clock())
    const record = this.records.get(executionId)
    if (record !== undefined) return record.evaluation
    const retired = this.retired.get(executionId)
    return retired === undefined
      ? lifecycleEvaluation(executionId, 'NOT_FOUND', 'NO_RETAINED_EVALUATION')
      : lifecycleEvaluation(executionId, retired.status, retired.reason)
  }
}
