/**
 * Host-private structural seam for the optional public `subagents` capability.
 *
 * This deliberately does not name or import a concrete Harness subagent
 * package.  Deep Judge consumes only this small public capability surface.
 */
import type { ContentBlock } from '@deepseek-ai/dsh-llm'

export interface DeepJudgeSubagentCapabilitiesLike {
  readonly agentOptions: boolean
  readonly outputSchema: boolean
  readonly depthLimit: boolean
  readonly toolFilter: boolean
  readonly persona: boolean
}

export interface DeepJudgeSubagentProviderLike {
  readonly name: string
  readonly capabilities: DeepJudgeSubagentCapabilitiesLike
  readonly inheritsParentContext: boolean
}

export interface DeepJudgeSubagentResultLike {
  readonly structured?: unknown
  readonly stopReason: string
  readonly diagnostic?: string
}

export interface DeepJudgeSubagentRunLike {
  readonly result: Promise<DeepJudgeSubagentResultLike>
  dispose(): Promise<void>
}

export interface DeepJudgeSubagentStartRequestLike {
  readonly parent: unknown
  readonly label: string
  readonly prompt: ContentBlock[]
  readonly signal: AbortSignal
  readonly agentOptions: Readonly<Record<string, unknown>>
  readonly outputSchema: Readonly<Record<string, unknown>>
  readonly maxDepth: 1
  readonly toolFilter: Readonly<{ readonly allow: readonly string[] }>
  readonly persona: string
}

export interface DeepJudgeSubagentRuntimeLike {
  getProvider(name: string): DeepJudgeSubagentProviderLike | undefined
  start(name: string, request: DeepJudgeSubagentStartRequestLike): Promise<DeepJudgeSubagentRunLike>
}

export type DeepJudgeCapabilityFailure = 'DEEP_JUDGE_CAPABILITY_UNAVAILABLE' | 'DEEP_JUDGE_PROVIDER_UNSUPPORTED'

export type DeepJudgeProviderPreflight =
  | { readonly ok: true; readonly provider: DeepJudgeSubagentProviderLike }
  | { readonly ok: false; readonly failure: DeepJudgeCapabilityFailure }

interface DynamicContextLike {
  get(name: string, required?: boolean): unknown
}

export function getSubagentsCapability(ctx: unknown): DeepJudgeSubagentRuntimeLike | undefined {
  let value: unknown
  try {
    const dynamic = ctx as DynamicContextLike
    if (dynamic === null || typeof dynamic !== 'object' || typeof dynamic.get !== 'function') return undefined
    value = dynamic.get('subagents', false)
  } catch {
    return undefined
  }
  return isDeepJudgeSubagentRuntimeLike(value) ? value : undefined
}

export function isDeepJudgeSubagentRuntimeLike(value: unknown): value is DeepJudgeSubagentRuntimeLike {
  try { return isObject(value) && typeof value.getProvider === 'function' && typeof value.start === 'function' } catch { return false }
}

export function preflightDeepJudgeProvider(runtime: DeepJudgeSubagentRuntimeLike): DeepJudgeProviderPreflight {
  if (!isDeepJudgeSubagentRuntimeLike(runtime)) return { ok: false, failure: 'DEEP_JUDGE_CAPABILITY_UNAVAILABLE' }
  let provider: unknown
  try { provider = runtime.getProvider('spawn') } catch { return { ok: false, failure: 'DEEP_JUDGE_CAPABILITY_UNAVAILABLE' } }
  try {
    if (!isObject(provider) || provider.name !== 'spawn' || provider.inheritsParentContext !== false) return { ok: false, failure: 'DEEP_JUDGE_PROVIDER_UNSUPPORTED' }
    const capabilities = provider.capabilities
    if (!isObject(capabilities)
      || capabilities.agentOptions !== true
      || capabilities.outputSchema !== true
      || capabilities.depthLimit !== true
      || capabilities.toolFilter !== true
      || capabilities.persona !== true) return { ok: false, failure: 'DEEP_JUDGE_PROVIDER_UNSUPPORTED' }
    return { ok: true, provider: provider as DeepJudgeSubagentProviderLike }
  } catch { return { ok: false, failure: 'DEEP_JUDGE_PROVIDER_UNSUPPORTED' } }
}

function isObject(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object'
}
