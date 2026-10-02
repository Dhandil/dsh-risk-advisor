import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PresentationClient } from '../src/client/presentation-client.ts'
import { RiskAdvisorDetail } from '../src/client/RiskAdvisorDetail.tsx'
import { en } from '../src/client/locales.ts'
import type { BrowserBridgeClientResult } from '../src/bridge-contract.ts'

vi.mock('@deepseek-ai/dsh-client-ui-primitives', () => ({ writeClipboard: vi.fn(async () => true) }))
import { writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'

afterEach(() => { cleanup(); vi.clearAllMocks() })

function ready(status: 'PARTIAL' | 'DEGRADED' = 'PARTIAL'): BrowserBridgeClientResult {
  const dimension = (verdict: string) => ({ verdict, source: 'RULE' as const, evidenceQuality: 'MEDIUM' as const, reasons: [] })
  return { kind: 'VIEW', view: { schemaVersion: 2, sessionId: 's', callId: 'c', assessmentId: 'a', association: 'BOUND', status: 'ready', stage: 'complete', operation: { schemaVersion: 1, kind: 'shell', toolName: 'bash', title: 'Run a shell operation', summary: 'Run the bounded command.', resources: [{ kind: 'workdir', label: 'workspace/project' }, { kind: 'other', label: 'redacted target' }], requestedPermission: 'workspace-write', parserConfidence: 'high', mutating: 'unknown', externalEffect: 'unknown', networkEffect: 'none', workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown' }, assessment: { schemaVersion: 1, assessmentId: 'a', status, dimensions: { risk: dimension('UNKNOWN'), authorization: dimension('UNKNOWN'), necessity: dimension('UNKNOWN'), privilege: dimension('UNKNOWN'), alternatives: dimension('UNKNOWN'), evidenceQuality: dimension('MEDIUM') }, aggregate: { recommendation: 'NEED_MORE_INFORMATION', hazardLevel: 'UNKNOWN', attention: 'ELEVATED', primaryReasonCodes: ['CONTEXT_DEGRADED'] }, findings: [], uncertainties: [], alternatives: [{ title: 'Narrower path', description: 'Use a narrower operation.', source: 'MODEL_SUGGESTED', verification: 'UNVERIFIED' }], evidence: { ledgerHealth: 'DEGRADED' }, judgeAssisted: false }, failureContext: { schemaVersion: 1, retryCount: 2, recentFailureCount: 3, sameRootCause: true, permissionEscalation: 'unknown', truncated: true }, reasonCodes: ['CONTEXT_DEGRADED'], updatedAt: 1 } }
}

describe('Phase 6 real advisory UI', () => {
  it('renders operation, six dimensions, source and display/copy-only alternative', async () => {
    const connection = { rpc: { call: vi.fn(async () => ({ ok: true, value: ready() })) } }
    const client = new PresentationClient(connection)
    const t = ((key: string) => en[key as keyof typeof en] ?? key) as never
    render(<RiskAdvisorDetail sessionId={'s' as never} callId={'c' as never} presentationClient={client} t={t} useChat={() => undefined} />)
    await waitFor(() => expect(screen.getByTestId('risk-advisor-card').getAttribute('data-ra-status')).toBe('READY'))
    expect(screen.getByTestId('risk-advisor-operation').textContent).toContain('Run a shell operation')
    expect(screen.getByTestId('risk-advisor-operation-details').textContent).toContain('workspace/project')
    expect(screen.getByTestId('risk-advisor-operation-details').textContent).toContain('workspace-write')
    expect(screen.getByTestId('risk-advisor-operation-details').textContent).toContain('unknown')
    expect(screen.getByTestId('risk-advisor-dimensions').querySelectorAll('details')).toHaveLength(6)
    expect(screen.getByTestId('risk-advisor-source').textContent).toContain('Rules-only')
    expect(screen.getByTestId('risk-advisor-assessment-status').textContent).toContain('PARTIAL')
    expect(screen.getByTestId('risk-advisor-primary-reason').textContent).toContain('CONTEXT_DEGRADED')
    expect(screen.getByTestId('risk-advisor-failure-context').textContent).toContain('Same root cause: true')
    expect(screen.getByTestId('risk-advisor-failure-context').textContent).toContain('Permission escalation: unknown')
    expect(screen.getByTestId('risk-advisor-failure-context').textContent).toContain('Truncated: true')
    expect(screen.getByTestId('risk-advisor-evidence').textContent).toContain('DEGRADED')
    expect(screen.getByTestId('risk-advisor-alternative').textContent).toContain('Model suggested')
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Use|Execute|Apply/ })).toBeNull()
    vi.mocked(writeClipboard).mockResolvedValueOnce(true)
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy())
    vi.mocked(writeClipboard).mockResolvedValueOnce(false)
    fireEvent.click(screen.getByTestId('risk-advisor-alternative').querySelector('button')!)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy unavailable' })).toBeTruthy())
    client.dispose()
  })

  it('renders DEGRADED distinctly and never translates it into LOW', async () => {
    const connection = { rpc: { call: vi.fn(async () => ({ ok: true, value: ready('DEGRADED') })) } }
    const client = new PresentationClient(connection)
    const t = ((key: string) => en[key as keyof typeof en] ?? key) as never
    render(<RiskAdvisorDetail sessionId={'s' as never} callId={'c' as never} presentationClient={client} t={t} useChat={() => undefined} />)
    await waitFor(() => expect(screen.getByTestId('risk-advisor-card').getAttribute('data-ra-status')).toBe('READY'))
    expect(screen.getByTestId('risk-advisor-assessment-status').textContent).toContain('DEGRADED')
    expect(screen.getByTestId('risk-advisor-card').textContent).not.toContain('Risk: LOW')
    client.dispose()
  })

  it('keeps missing callId render-pure with no advisory card or RPC', () => {
    const call = vi.fn(async () => ({ ok: true, value: ready() }))
    const client = new PresentationClient({ rpc: { call } })
    const t = ((key: string) => en[key as keyof typeof en] ?? key) as never
    render(<RiskAdvisorDetail sessionId={'s' as never} presentationClient={client} t={t} useChat={() => undefined} />)
    expect(screen.queryByTestId('risk-advisor-card')).toBeNull()
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
    const t = ((key: string) => en[key as keyof typeof en] ?? key) as never
    const view = render(<StrictMode><RiskAdvisorDetail sessionId={'s' as never} callId={'c1' as never} presentationClient={client} t={t} useChat={() => undefined} /></StrictMode>)
    await waitFor(() => expect(active).toBe(1))
    expect(maxActive).toBe(1)
    view.rerender(<StrictMode><RiskAdvisorDetail sessionId={'s' as never} callId={'c2' as never} presentationClient={client} t={t} useChat={() => undefined} /></StrictMode>)
    await waitFor(() => expect(active).toBe(1))
    view.unmount()
    expect(active).toBe(0)
    client.dispose()
  })

  it('keeps command detail when the advisory card render throws locally', () => {
    let firstTitle = true
    const t = ((key: string) => {
      if (key === 'advisory.title' && firstTitle) { firstTitle = false; throw new Error('card-only fault') }
      return en[key as keyof typeof en] ?? key
    }) as never
    const snapshot = { nodes: { values: () => [{ kind: 'tool-call', data: { root: { callId: 'c', name: 'bash', argsRaw: JSON.stringify({ command: 'echo safe' }) } } }] } } as never
    render(<RiskAdvisorDetail sessionId={'s' as never} callId={'c' as never} t={t} useChat={selector => selector(snapshot)} />)
    expect(screen.getByTestId('risk-advisor-r1-command').textContent).toContain('echo safe')
    expect(screen.getByTestId('risk-advisor-card').getAttribute('data-ra-status')).toBe('UNAVAILABLE')
  })
})
