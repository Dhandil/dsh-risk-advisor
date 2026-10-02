import type { OperationPresentationV1, BrowserOperationKind, BrowserResourceKind } from '../../bridge-contract.ts'
import type { ReviewerOperationSeed } from '../reviewer-seed.ts'
import type { RuleEvaluation } from '../rule-engine.ts'

const TOOL_LIMIT = 128
const RESOURCE_LIMIT = 512

export function presentOperation(toolName: string, seed: ReviewerOperationSeed | undefined, evaluation: RuleEvaluation): OperationPresentationV1 {
  const kind = seed?.operationKind ?? evaluation.operationKind
  const safeToolName = boundedIdentity(seed?.toolName ?? toolName)
  const title = titleFor(kind)
  const resources: Array<{ readonly kind: BrowserResourceKind; readonly label: string }> = []
  const hints = seed?.resourceHints ?? []
  if (kind === 'shell') {
    for (const hint of hints.slice(0, 8)) resources.push({ kind: 'workdir', label: boundText(hint, RESOURCE_LIMIT) })
  } else if (kind === 'network-read') {
    const resourceKind: BrowserResourceKind = safeToolName === 'web_search' ? 'query' : 'url'
    for (const hint of hints.slice(0, 8)) resources.push({ kind: resourceKind, label: boundText(hint, RESOURCE_LIMIT) })
    if (resources.length === 0 && seed?.operationText !== undefined) resources.push({ kind: resourceKind, label: boundText(seed.operationText, RESOURCE_LIMIT) })
  } else if (kind !== 'unknown') {
    for (const hint of hints.slice(0, 8)) resources.push({ kind: 'path', label: boundText(hint, RESOURCE_LIMIT) })
  }
  const operationText = seed?.operationText === undefined ? undefined : boundText(seed.operationText, kind === 'shell' ? 900 : RESOURCE_LIMIT)
  const summary = summaryFor(kind, operationText, resources)
  const requestedPermission = evaluation.requestedPermission ?? seed?.requestedPermission
  return deepFreeze({
    schemaVersion: 1,
    kind,
    toolName: safeToolName,
    title,
    summary,
    resources,
    ...(requestedPermission === undefined ? {} : { requestedPermission }),
    parserConfidence: seed?.parserConfidence ?? evaluation.parserConfidence,
    mutating: evaluation.mutating,
    externalEffect: evaluation.externalEffect,
    networkEffect: evaluation.networkEffect,
    workspaceContained: 'unknown',
    sandboxCovered: 'unknown',
    reversible: 'unknown',
  })
}

function titleFor(kind: BrowserOperationKind): string {
  if (kind === 'filesystem-read') return 'Read a file'
  if (kind === 'filesystem-write') return 'Write local state'
  if (kind === 'filesystem-edit') return 'Edit a file'
  if (kind === 'shell') return 'Run a shell operation'
  if (kind === 'network-read') return 'Retrieve external information'
  return 'Unknown operation'
}

function summaryFor(kind: BrowserOperationKind, operationText: string | undefined, resources: readonly { readonly kind: BrowserResourceKind; readonly label: string }[]): string {
  if (kind === 'filesystem-read') return resources[0] === undefined ? 'Read a requested file target.' : `Read the requested target: ${resources[0].label}`
  if (kind === 'filesystem-write') return resources[0] === undefined ? 'Write local state at a redacted target.' : `Write local state at: ${resources[0].label}`
  if (kind === 'filesystem-edit') return resources[0] === undefined ? 'Edit local state at a redacted target.' : `Edit local state at: ${resources[0].label}`
  if (kind === 'shell') return operationText === undefined ? 'Run a bounded shell operation.' : `Run the bounded command: ${operationText}`
  if (kind === 'network-read') return resources[0] === undefined ? 'Read information from an external service.' : `Read external information from: ${resources[0].label}`
  return 'The tool identity is known only as an unsupported operation; arguments are unavailable.'
}

function boundedIdentity(value: string): string {
  return /^[A-Za-z0-9_.:-]+$/.test(value) && value.length > 0 ? value.slice(0, TOOL_LIMIT) : 'unknown'
}

function boundText(value: string, limit: number): string { return value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, limit) }
function deepFreeze<T>(value: T): T { if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.freeze(value); if (Array.isArray(value)) for (const item of value) deepFreeze(item); else for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child); return value }
