import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PresentationClient } from '../src/client/presentation-client.ts'
import { RiskAdvisorDetail } from '../src/client/RiskAdvisorDetail.tsx'
import { RiskAdvisorCard } from '../src/client/components/RiskAdvisorCard.tsx'
import { en } from '../src/client/locales.ts'
import type { BrowserBridgeClientResult } from '../src/bridge-contract.ts'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', async importOriginal => {
  const actual = await importOriginal<typeof import('@deepseek-ai/dsh-client-ui-primitives')>()
  return { ...actual, writeClipboard: vi.fn(async () => true) }
})
import { writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'

afterEach(() => { cleanup(); vi.clearAllMocks() })

type Hazard = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN'
type Recommendation = 'APPROVE' | 'APPROVE_WITH_CAUTION' | 'PREFER_SAFER_ALTERNATIVE' | 'NEED_MORE_INFORMATION' | 'REJECT_RECOMMENDED'
interface ReadyOverrides {
  hazardLevel?: Hazard
  recommendation?: Recommendation
  primaryReasonCodes?: string[]
  requestedPermission?: string | null
  evidenceStatus?: 'COMPLETE' | 'PARTIAL'
}

function ready(status: 'PARTIAL' | 'DEGRADED' = 'PARTIAL', overrides: ReadyOverrides = {}): BrowserBridgeClientResult {
  const dimension = (verdict: string) => ({ verdict, source: 'RULE' as const, evidenceQuality: 'MEDIUM' as const, reasons: [{ code: 'DIMENSION_RULE', message: 'Dimension detail retained in the analysis.' }] })
  return { kind: 'VIEW', view: {
    schemaVersion: 3, sessionId: 's', callId: 'c', assessmentId: 'a', association: 'BOUND', status: 'ready', stage: 'complete',
    operation: {
      schemaVersion: 1, kind: 'shell', toolName: 'bash', title: 'Run a shell operation', summary: 'Run the bounded command.',
      resources: [{ kind: 'workdir', label: 'workspace/project' }, { kind: 'other', label: 'redacted target' }],
      ...(overrides.requestedPermission === null ? {} : { requestedPermission: overrides.requestedPermission ?? 'workspace-write' }),
      parserConfidence: 'high', mutating: 'unknown', externalEffect: 'unknown', networkEffect: 'none', workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown',
    },
    assessment: {
      schemaVersion: 1, assessmentId: 'a', status,
      dimensions: { risk: dimension('UNKNOWN'), authorization: dimension('UNKNOWN'), necessity: dimension('UNKNOWN'), privilege: dimension('UNKNOWN'), alternatives: dimension('UNKNOWN'), evidenceQuality: dimension('MEDIUM') },
      aggregate: {
        recommendation: overrides.recommendation ?? 'NEED_MORE_INFORMATION',
        hazardLevel: overrides.hazardLevel ?? 'UNKNOWN',
        attention: 'ELEVATED',
        primaryReasonCodes: overrides.primaryReasonCodes ?? ['INSUFFICIENT_CRITICAL_EVIDENCE'],
      },
      findings: [{ code: 'AUTH_RULE', title: 'Authorization needs confirmation', detail: 'The operation scope is not fully known.', dimension: 'AUTHORIZATION', severity: 'WARNING', strength: 'DETERMINISTIC' }],
      uncertainties: [{ code: 'CANONICAL_TARGETS_UNAVAILABLE', description: 'The canonical target is not resolved.', dimension: 'NECESSITY', impact: 'HIGH', resolutionHint: 'Inspect the bounded target.' }],
      alternatives: [{ title: 'Narrower path', description: 'Use a narrower operation.', source: 'MODEL_SUGGESTED', verification: 'UNVERIFIED' }],
      evidence: { ledgerHealth: 'DEGRADED' }, judgeAssisted: false,
    },
    failureContext: { schemaVersion: 1, retryCount: 2, recentFailureCount: 3, sameRootCause: true, permissionEscalation: 'unknown', truncated: true },
    reasonCodes: ['CONTEXT_DEGRADED'], updatedAt: 1,
    evidence: { status: overrides.evidenceStatus ?? 'PARTIAL', workspaceContained: 'unknown', canonicalTargetsKnown: 'unknown', versionControlled: 'unknown', checkpointAvailable: 'unknown', pathAliasObserved: false, itemCount: 1, truncated: false },
  } }
}

function translator(key: string): string { return en[key as keyof typeof en] ?? key }
const t = translator as never

function renderReady(value: BrowserBridgeClientResult = ready()) {
  const connection = { rpc: { call: vi.fn(async () => ({ ok: true, value })) } }
  const client = new PresentationClient(connection)
  const snapshot = { nodes: { values: () => [{ kind: 'tool-call', data: { root: { callId: 'c', name: 'bash', argsRaw: JSON.stringify({ command: 'touch bounded.txt' }) } } }] } } as never
  const view = render(<RiskAdvisorDetail sessionId={'s' as never} callId={'c' as never} presentationClient={client} t={t} useChat={selector => selector(snapshot)} />)
  return { client, view }
}

async function findReadyIndicator(): Promise<HTMLElement> {
  await waitFor(() => expect(screen.getByTestId('risk-advisor-indicator').getAttribute('data-ra-status')).toBe('READY'))
  return screen.getByTestId('risk-advisor-indicator')
}

describe('Phase 6 real advisory UI', () => {
  it('keeps the default READY contribution to one row and moves full analysis into Modal', async () => {
    const { client } = renderReady()
    const row = await findReadyIndicator()
    expect(row.tagName).toBe('DIV')
    expect(row.querySelector('section, details')).toBeNull()
    expect(row.textContent).toContain('Risk Advisor')
    expect(row.textContent).toContain('Unknown risk')
    expect(row.textContent).toContain('Need more information')
    expect(row.textContent).toContain('Critical evidence is missing')
    expect(row.textContent).toContain('workspace-write')
    expect(row.textContent).toContain('PARTIAL')
    expect(row.textContent).not.toContain('CONTEXT_DEGRADED')
    expect(row.textContent).not.toContain('INSUFFICIENT_CRITICAL_EVIDENCE')
    expect(row.querySelector('[data-state="warning"]')).toBeTruthy()
    expect(screen.getByTestId('risk-advisor-r1-command').textContent).toContain('touch bounded.txt')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByTestId('risk-advisor-dimensions')).toBeNull()
    expect(screen.queryByRole('button', { name: /Allow|Reject|Execute|Apply/i })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Details' }))
    const dialog = await screen.findByRole('dialog', { name: 'Risk Advisor details' })
    expect(dialog.textContent).toContain('Native Approval remains authoritative')
    expect(screen.getByTestId('risk-advisor-operation').textContent).toContain('Run a shell operation')
    expect(screen.getByTestId('risk-advisor-operation-details').textContent).toContain('workspace/project')
    expect(screen.getByTestId('risk-advisor-operation-details').textContent).toContain('workspace-write')
    expect(screen.getByTestId('risk-advisor-operation-details').textContent).toContain('Workspace containment: unknown')
    expect(screen.getByTestId('risk-advisor-dimensions').querySelectorAll('details')).toHaveLength(6)
    expect(screen.getByTestId('risk-advisor-dimensions').textContent).toContain('DIMENSION_RULE')
    expect(screen.getByTestId('risk-advisor-findings').textContent).toContain('Authorization needs confirmation')
    expect(screen.getByTestId('risk-advisor-uncertainties').textContent).toContain('CANONICAL_TARGETS_UNAVAILABLE')
    expect(screen.getByTestId('risk-advisor-summary').textContent).toContain('INSUFFICIENT_CRITICAL_EVIDENCE')
    expect(screen.getByTestId('risk-advisor-bridge-reasons').textContent).toContain('CONTEXT_DEGRADED')
    expect(screen.getByTestId('risk-advisor-source').textContent).toContain('Rules-only')
    expect(screen.getByTestId('risk-advisor-failure-context').textContent).toContain('Same root cause: true')
    expect(screen.getByTestId('risk-advisor-failure-context').textContent).toContain('Permission escalation: unknown')
    expect(screen.getByTestId('risk-advisor-failure-context').textContent).toContain('Truncated: true')
    expect(screen.getByTestId('risk-advisor-evidence').textContent).toContain('DEGRADED')
    expect(screen.getByTestId('risk-advisor-toctou-disclosure').textContent).toContain('observed before execution')
    expect(screen.getByTestId('risk-advisor-alternative').textContent).toContain('Model suggested')
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Allow|Reject|Execute|Apply/i })).toBeNull()
    vi.mocked(writeClipboard).mockResolvedValueOnce(true)
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Close details' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByTestId('risk-advisor-indicator')).toBe(row)
    expect(screen.getByTestId('risk-advisor-r1-command').textContent).toContain('touch bounded.txt')
    expect(screen.getByTestId('risk-advisor-indicator').getAttribute('data-ra-status')).toBe('READY')
    client.dispose()
  })

  it.each([
    ['LOW', 'APPROVE', 'done'],
    ['MEDIUM', 'APPROVE_WITH_CAUTION', 'warning'],
    ['HIGH', 'NEED_MORE_INFORMATION', 'warning'],
    ['HIGH', 'PREFER_SAFER_ALTERNATIVE', 'warning'],
    ['CRITICAL', 'NEED_MORE_INFORMATION', 'error'],
    ['CRITICAL', 'REJECT_RECOMMENDED', 'error'],
    ['UNKNOWN', 'NEED_MORE_INFORMATION', 'warning'],
  ] as const)('maps %s / %s to %s attention without changing the visible assessment', async (hazardLevel, recommendation, expectedDot) => {
    const { client } = renderReady(ready('PARTIAL', { hazardLevel, recommendation }))
    const row = await findReadyIndicator()
    expect(row.querySelector(`[data-state="${expectedDot}"]`)).toBeTruthy()
    expect(row.textContent).toContain(translator(hazardLevel === 'UNKNOWN' ? 'hazard.unknown' : `hazard.${hazardLevel.toLowerCase()}`))
    expect(row.textContent).toContain(translator(recommendation === 'APPROVE' ? 'recommendation.approve' : recommendation === 'APPROVE_WITH_CAUTION' ? 'recommendation.caution' : recommendation === 'PREFER_SAFER_ALTERNATIVE' ? 'recommendation.saferAlternative' : recommendation === 'REJECT_RECOMMENDED' ? 'recommendation.reject' : 'recommendation.moreInformation'))
    client.dispose()
  })

  it('keeps elevated permission and a DEGRADED caveat visible in the compact row', async () => {
    const { client } = renderReady(ready('DEGRADED', { hazardLevel: 'HIGH', requestedPermission: 'danger-full-access', evidenceStatus: 'PARTIAL' }))
    const row = await findReadyIndicator()
    expect(row.textContent).toContain('danger-full-access')
    expect(row.querySelector('[data-tone="danger"]')?.textContent).toContain('danger-full-access')
    expect(row.textContent).toContain('DEGRADED')
    expect(row.textContent).toContain('PARTIAL')
    expect(row.textContent).not.toContain('Workspace containment')
    expect(row.textContent).not.toContain('Sandbox coverage')
    client.dispose()
  })

  it('renders CANCELLED as a compact neutral row without analysis content', () => {
    const snapshot = { status: 'CANCELLED' }
    const store = { getSnapshot: () => snapshot, subscribe: () => () => undefined }
    render(<RiskAdvisorCard store={store as never} t={t} />)
    const row = screen.getByTestId('risk-advisor-indicator')
    expect(row.getAttribute('data-ra-status')).toBe('CANCELLED')
    expect(row.tagName).toBe('DIV')
    expect(row.querySelector('section, details')).toBeNull()
    expect(row.querySelector('[data-state="idle"]')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps missing callId render-pure with no indicator or RPC', () => {
    const call = vi.fn(async () => ({ ok: true, value: ready() }))
    const client = new PresentationClient({ rpc: { call } })
    render(<RiskAdvisorDetail sessionId={'s' as never} presentationClient={client} t={t} useChat={() => undefined} />)
    expect(screen.queryByTestId('risk-advisor-indicator')).toBeNull()
    expect(call).not.toHaveBeenCalled()
    client.dispose()
  })

  it('keeps StrictMode ownership render-pure and releases the only poller on switch/unmount', async () => {
    let active = 0
    let maxActive = 0
    const call = vi.fn(async (_channel: string, _endpoint: string, _payload: unknown, signal?: AbortSignal) => await new Promise<{ ok: true; value: { kind: 'NOT_FOUND' } }>(resolve => {
      active += 1
      maxActive = Math.max(maxActive, active)
      signal?.addEventListener('abort', () => { active -= 1; resolve({ ok: true, value: { kind: 'NOT_FOUND' } }) }, { once: true })
    }))
    const client = new PresentationClient({ rpc: { call } })
    const view = render(<StrictMode><RiskAdvisorDetail sessionId={'s' as never} callId={'c1' as never} presentationClient={client} t={t} useChat={() => undefined} /></StrictMode>)
    await waitFor(() => expect(active).toBe(1))
    expect(maxActive).toBe(1)
    view.rerender(<StrictMode><RiskAdvisorDetail sessionId={'s' as never} callId={'c2' as never} presentationClient={client} t={t} useChat={() => undefined} /></StrictMode>)
    await waitFor(() => expect(active).toBe(1))
    view.unmount()
    expect(active).toBe(0)
    client.dispose()
  })

  it('keeps command detail when the advisory indicator render throws locally', () => {
    let firstTitle = true
    const throwingT = ((key: string) => {
      if (key === 'advisory.title' && firstTitle) { firstTitle = false; throw new Error('indicator-only fault') }
      return en[key as keyof typeof en] ?? key
    }) as never
    const snapshot = { nodes: { values: () => [{ kind: 'tool-call', data: { root: { callId: 'c', name: 'bash', argsRaw: JSON.stringify({ command: 'echo safe' }) } } }] } } as never
    render(<RiskAdvisorDetail sessionId={'s' as never} callId={'c' as never} t={throwingT} useChat={selector => selector(snapshot)} />)
    expect(screen.getByTestId('risk-advisor-r1-command').textContent).toContain('echo safe')
    expect(screen.getByTestId('risk-advisor-indicator').getAttribute('data-ra-status')).toBe('UNAVAILABLE')
  })
})
