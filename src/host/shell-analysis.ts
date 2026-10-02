/**
 * The single bounded shell-analysis authority shared by Phase 4 and Phase 7.
 * This module is Host-private and intentionally has no package-root export.
 */

export type ShellFindingCode =
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

type Dialect = 'bash' | 'pwsh'

export interface ShellScan {
  readonly codes: readonly ShellFindingCode[]
  readonly ambiguous: boolean
  readonly degraded: boolean
  readonly tokens: readonly string[]
  readonly systemLocation: boolean
}

export interface SimpleShellCommand {
  readonly dialect: Dialect
  readonly executable?: string
  readonly action?: string
  readonly args: readonly string[]
  readonly assignments: readonly string[]
  readonly tokens: readonly string[]
  readonly parserConfidence: 'high' | 'low'
  readonly wrapper: boolean
}

interface ShellSegment {
  readonly text: string
  readonly pipedFrom: boolean
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

export function hasSecret(value: string): boolean {
  return /\bsk-[A-Za-z0-9_-]{4,}\b/i.test(value)
    || /\bgithub_pat_[A-Za-z0-9_]{8,}\b/i.test(value)
    || /\bghp_[A-Za-z0-9]{8,}\b/i.test(value)
    || /\bauthorization\s*:\s*bearer\s+\S+/i.test(value)
    || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i.test(value)
    || /\b(?:password|token|api[_-]?key)\s*=\s*[^\s&;]+/i.test(value)
    || /(?:[?&](?:token|password|api[_-]?key)=|:\/\/[^\s/@]+:[^\s/@]+@)/i.test(value)
}

export function hasCredentialResource(value: string): boolean {
  const normalized = value.replaceAll('\\', '/').toLowerCase()
  return /(?:^|\/)(?:id_rsa|id_ed25519|id_ecdsa|id_dsa)(?:$|[/?#])/.test(normalized)
    || normalized.includes('/.aws/credentials')
    || normalized.endsWith('/.npmrc')
    || normalized.endsWith('/.pypirc')
    || normalized.endsWith('/.docker/config.json')
}

export function isSystemLocation(value: string): boolean {
  const normalized = value.replaceAll('\\', '/').toLowerCase()
  return /^(?:[a-z]:)?\/(?:windows|program files(?: \(x86\))?|programdata)(?:\/|$)/.test(normalized)
    || /^(?:[a-z]:)?\/(?:etc|usr|bin|sbin|system|library)(?:\/|$)/.test(normalized)
}

function lowerTokens(tokens: readonly string[]): string[] {
  return tokens.map(token => token.toLowerCase())
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

function transparentWrapper(executable: string | undefined, args: readonly string[], dialect: Dialect): WrapperView {
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

export function analyzeShell(command: string, dialect: Dialect): ShellScan {
  const split = splitShell(command)
  const codes = new Set<ShellFindingCode>()
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
    const segmentCodes = new Set<ShellFindingCode>()
    const assignments = [...parsed.assignments, ...(wrapper.assignments ?? [])]
    const executableIsVariable = executable !== undefined && (executable.startsWith('$') || executable.startsWith('${'))
    const sensitiveAssignment = assignments.some(value => /^(?:PATH|LD_PRELOAD|NODE_OPTIONS)=/i.test(value))
    if (sensitiveAssignment || lower.some(token => /^\$env:(?:path|ld_preload|node_options)=/i.test(token))) segmentCodes.add('SHELL_ENVIRONMENT_INJECTION')
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
    if ((interpreter === 'powershell' || interpreter === 'pwsh') && interpreterArgs.some(arg => ['-encodedcommand', '-enc'].includes(arg.toLowerCase()))) segmentCodes.add('SHELL_ENCODED_EXECUTION')
    if (tokens.some(token => /^(?:&|\.\s*)\$/.test(token))) segmentCodes.add('SHELL_DYNAMIC_EXECUTION')
    if (unsupportedCommands.has(executable ?? '') || unsupportedCommands.has(action ?? '')) ambiguous = true
    if (wrapper.degraded) ambiguous = true
    if (['command', 'exec', 'xargs', 'parallel'].includes(executable ?? '')) segmentCodes.add('SHELL_DYNAMIC_EXECUTION')
    if (executable === 'find' && parsed.args.some(arg => arg.toLowerCase() === '-exec')) segmentCodes.add('SHELL_DYNAMIC_EXECUTION')
    if (segment.pipedFrom && ['bash', 'sh', 'powershell', 'pwsh', 'python', 'perl', 'node'].includes(interpreter ?? '')) segmentCodes.add('SHELL_DYNAMIC_EXECUTION')

    if ((dialect === 'bash' && action === 'rm') && actionArgs.some(arg => arg.toLowerCase() === '--recursive' || (/^-[^-]/.test(arg) && arg.toLowerCase().includes('r')))) segmentCodes.add('DESTRUCTIVE_RECURSIVE_DELETE')
    if (dialect === 'pwsh' && ['remove-item', 'ri', 'del', 'erase'].includes(action ?? '') && hasFlag(actionArgs, '-recurse', '-r', '-recursive')) segmentCodes.add('DESTRUCTIVE_RECURSIVE_DELETE')
    if ((dialect === 'bash' && (action?.startsWith('mkfs') ?? false)) || (dialect === 'pwsh' && ['format-volume', 'clear-disk', 'diskpart'].includes(action ?? ''))) segmentCodes.add('DESTRUCTIVE_DISK_WIPE')
    if (action === 'git' && actionArgs[0]?.toLowerCase() === 'reset' && actionArgs.some(arg => arg.toLowerCase() === '--hard')) segmentCodes.add('DESTRUCTIVE_GIT_RESET_HARD')
    if (action === 'git' && actionArgs[0]?.toLowerCase() === 'clean' && actionArgs.some(arg => arg.toLowerCase() === '--force' || (/^-[^-]/.test(arg) && arg.toLowerCase().includes('f')))) segmentCodes.add('DESTRUCTIVE_GIT_CLEAN')
    if (action === 'git' && actionArgs[0]?.toLowerCase() === 'push') {
      segmentCodes.add('NETWORK_EXTERNAL_WRITE')
      if (actionArgs.some(arg => ['--force', '--force-with-lease', '-f'].includes(arg.toLowerCase()))) segmentCodes.add('DESTRUCTIVE_FORCE_PUSH')
    }

    const registryMutation = action === 'reg' || action === 'reg.exe'
      ? ['add', 'delete', 'import', 'copy'].includes(actionArgs[0]?.toLowerCase() ?? '')
      : dialect === 'pwsh' && ['set-itemproperty', 'new-itemproperty', 'remove-itemproperty'].includes(action ?? '') && actionArgs.some(token => /registry|hklm:|hkcu:/i.test(token))
    if (registryMutation) segmentCodes.add('SYSTEM_REGISTRY_MUTATION')
    const serviceMutation = (action === 'systemctl' && ['enable', 'disable', 'start', 'stop', 'restart', 'mask', 'unmask'].includes(actionArgs[0]?.toLowerCase() ?? ''))
      || (action === 'sc' && ['create', 'config', 'delete', 'start', 'stop'].includes(actionArgs[0]?.toLowerCase() ?? ''))
      || (action === 'service' && ['start', 'stop', 'restart', 'enable', 'disable'].includes(actionArgs[0]?.toLowerCase() ?? ''))
      || (dialect === 'pwsh' && ['new-service', 'set-service', 'remove-service', 'start-service', 'stop-service', 'restart-service'].includes(action ?? ''))
    if (serviceMutation) segmentCodes.add('SYSTEM_SERVICE_MUTATION')

    const startProcessRunAs = dialect === 'pwsh' && action === 'start-process' && actionArgs.some((arg, position) => arg.toLowerCase() === '-verb' && actionArgs[position + 1]?.toLowerCase() === 'runas')
    if ((dialect === 'bash' && wrapper.privilegeWrapper) || startProcessRunAs) segmentCodes.add('PERMISSION_PRIVILEGE_ELEVATION')
    if (['chmod', 'chown', 'chgrp', 'setfacl', 'icacls', 'takeown'].includes(action ?? '') || (dialect === 'pwsh' && action === 'set-acl')) segmentCodes.add('PERMISSION_ACCESS_CONTROL_MUTATION')

    if ((action === 'npm' || action === 'pnpm') && ['install', 'add', 'ci'].includes(actionArgs[0]?.toLowerCase() ?? '')) {
      segmentCodes.add('INSTALL_PACKAGE_MUTATION')
      if (actionArgs.some(arg => ['-g', '--global'].includes(arg.toLowerCase()))) segmentCodes.add('INSTALL_GLOBAL_SCOPE')
    }
    if ((action === 'npm' || action === 'pnpm') && actionArgs[0]?.toLowerCase() === 'publish') segmentCodes.add('NETWORK_EXTERNAL_WRITE')
    if (['curl', 'wget', 'invoke-webrequest', 'invoke-restmethod'].includes(action ?? '')
      && (actionArgs.some(arg => ['-d', '--data', '--data-raw', '--data-binary', '--upload-file', '-t', '--post-file'].includes(arg.toLowerCase()))
        || actionArgs.some((arg, position) => arg.toLowerCase() === '-x' && ['post', 'put', 'patch', 'delete'].includes(actionArgs[position + 1]?.toLowerCase() ?? ''))
        || actionArgs.some(arg => /^-method:(post|put|patch|delete)$/i.test(arg)))) segmentCodes.add('NETWORK_EXTERNAL_WRITE')
    if (['scp', 'sftp', 'rsync'].includes(action ?? '')) ambiguous = true

    const systemTargetAction = (segmentCodes.has('DESTRUCTIVE_RECURSIVE_DELETE') && ['rm', 'remove-item', 'ri', 'del', 'erase'].includes(action ?? ''))
      || (segmentCodes.has('PERMISSION_ACCESS_CONTROL_MUTATION') && ['chmod', 'chown', 'chgrp', 'setfacl', 'icacls', 'takeown', 'set-acl'].includes(action ?? ''))
    if (systemTargetAction && systemTargetOperands(action, actionArgs).some(token => isSystemLocation(token))) segmentCodes.add('SYSTEM_LOCATION_MUTATION')
    for (const code of segmentCodes) codes.add(code)
  }
  const degradedByFinding = [...codes].some(code => ['SHELL_SEMANTICS_AMBIGUOUS', 'SHELL_DYNAMIC_EXECUTION', 'SHELL_ENCODED_EXECUTION', 'SHELL_ENVIRONMENT_INJECTION'].includes(code))
  if (ambiguous) codes.add('SHELL_SEMANTICS_AMBIGUOUS')
  const degraded = ambiguous || degradedByFinding
  return { codes: [...codes], ambiguous, degraded, tokens: split.segments.flatMap(segment => tokenizeSegment(segment.text).tokens), systemLocation }
}

/**
 * Return the exact single-command view used by Phase-7 adapter recognition.
 * It deliberately reuses the same splitter/tokenizer/wrapper as analyzeShell.
 */
export function parseSimpleShell(command: string, dialect: Dialect): SimpleShellCommand | undefined {
  const split = splitShell(command)
  if (split.segments.length !== 1 || split.ambiguous || split.unsupported) return undefined
  const tokenized = tokenizeSegment(split.segments[0]!.text)
  if (tokenized.ambiguous || split.segments[0]!.pipedFrom || tokenized.tokens.length === 0) return undefined
  const parsed = commandToken(tokenized.tokens)
  if (parsed.command === undefined || parsed.assignments.length > 0) return undefined
  const wrapper = transparentWrapper(parsed.command, parsed.args, dialect)
  const scan = analyzeShell(command, dialect)
  if (wrapper.degraded || scan.degraded) return undefined
  return {
    dialect,
    ...parsed.command === undefined ? {} : { executable: parsed.command },
    ...wrapper.action === undefined ? {} : { action: wrapper.action },
    args: wrapper.args,
    assignments: Object.freeze([]),
    tokens: Object.freeze([...tokenized.tokens]),
    parserConfidence: 'high',
    wrapper: false,
  }
}
