import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PresentationClient } from '../src/client/presentation-client.ts'
import { RiskAdvisorDetail } from '../src/client/RiskAdvisorDetail.tsx'
import { en } from '../src/client/locales.ts'
import type { BrowserBridgeClientResult } from '../src/bridge-contract.ts'

function ready(): BrowserBridgeClientResult {
  const dimension = (verdict: string) => ({ verdict, source: 'RULE' as const, evidenceQuality: 'MEDIUM' as const, reasons: [] })
  return { kind: 'VIEW', view: { schemaVersion: 2, sessionId: 's', callId: 'c', assessmentId: 'a', association: 'BOUND', status: 'ready', stage: 'complete', operation: { schemaVersion: 1, kind: 'shell', toolName: 'bash', title: 'Run a shell operation', summary: 'Run the bounded command.', resources: [], parserConfidence: 'high', mutating: 'unknown', externalEffect: 'unknown', networkEffect: 'none', workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown' }, assessment: { schemaVersion: 1, assessmentId: 'a', status: 'PARTIAL', dimensions: { risk: dimension('UNKNOWN'), authorization: dimension('UNKNOWN'), necessity: dimension('UNKNOWN'), privilege: dimension('UNKNOWN'), alternatives: dimension('UNKNOWN'), evidenceQuality: dimension('MEDIUM') }, aggregate: { recommendation: 'NEED_MORE_INFORMATION', hazardLevel: 'UNKNOWN', attention: 'ELEVATED', primaryReasonCodes: [] }, findings: [], uncertainties: [], alternatives: [{ title: 'Narrower path', description: 'Use a narrower operation.', source: 'MODEL_SUGGESTED', verification: 'UNVERIFIED' }], evidence: { ledgerHealth: 'HEALTHY' }, judgeAssisted: false }, failureContext: { schemaVersion: 1, retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: 'unknown', truncated: false }, reasonCodes: [], updatedAt: 1 } }
}

describe('Phase 6 real advisory UI', () => {
  it('renders operation, six dimensions, source and display/copy-only alternative', async () => {
    const connection = { rpc: { call: vi.fn(async () => ({ ok: true, value: ready() })) } }
    const client = new PresentationClient(connection)
    const t = ((key: string) => en[key as keyof typeof en] ?? key) as never
    render(<RiskAdvisorDetail sessionId={'s' as never} callId={'c' as never} presentationClient={client} t={t} useChat={() => undefined} />)
    await waitFor(() => expect(screen.getByTestId('risk-advisor-card').getAttribute('data-ra-status')).toBe('READY'))
    expect(screen.getByTestId('risk-advisor-operation').textContent).toContain('Run a shell operation')
    expect(screen.getByTestId('risk-advisor-dimensions').querySelectorAll('details')).toHaveLength(6)
    expect(screen.getByTestId('risk-advisor-source').textContent).toContain('Rules-only')
    expect(screen.getByTestId('risk-advisor-alternative').textContent).toContain('Model suggested')
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Use|Execute|Apply/ })).toBeNull()
    client.dispose()
  })
})
