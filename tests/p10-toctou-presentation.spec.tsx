import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PresentationClient } from '../src/client/presentation-client.ts'
import { RiskAdvisorDetail } from '../src/client/RiskAdvisorDetail.tsx'
import { en } from '../src/client/locales.ts'
import { OperationFoundation } from '../src/host/operation-foundation.ts'
import type { BrowserBridgeClientResult } from '../src/bridge-contract.ts'

afterEach(() => cleanup())

describe('Phase 10 TOCTOU and presentation truthfulness', () => {
  it('keeps PARTIAL visible in the compact row and moves pre-execution disclosure into Modal', async () => {
    const t = ((key: string) => en[key as keyof typeof en] ?? key) as never
    const value: BrowserBridgeClientResult = { kind: 'VIEW', view: { schemaVersion: 3, sessionId: 'p10-session', callId: 'p10-call', assessmentId: 'p10-assessment', association: 'BOUND', status: 'ready', stage: 'complete', operation: { schemaVersion: 1, kind: 'filesystem-write', toolName: 'write', title: 'Write a bounded file', summary: 'A pre-execution operation presentation.', resources: [{ kind: 'path', label: 'workspace/target' }], requestedPermission: 'workspace-write', parserConfidence: 'high', mutating: true, externalEffect: false, networkEffect: 'none', workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown' }, assessment: { schemaVersion: 1, assessmentId: 'p10-assessment', status: 'PARTIAL', dimensions: Object.fromEntries(['risk', 'authorization', 'necessity', 'privilege', 'alternatives', 'evidenceQuality'].map(key => [key, { verdict: key === 'evidenceQuality' ? 'MEDIUM' : 'UNKNOWN', source: 'RULE', evidenceQuality: 'MEDIUM', reasons: [] }])) as never, aggregate: { recommendation: 'NEED_MORE_INFORMATION', hazardLevel: 'UNKNOWN', attention: 'ELEVATED', primaryReasonCodes: ['CONTEXT_DEGRADED'] }, findings: [], uncertainties: [], alternatives: [], evidence: { ledgerHealth: 'HEALTHY' }, judgeAssisted: false }, failureContext: { schemaVersion: 1, retryCount: 0, recentFailureCount: 0, sameRootCause: false, permissionEscalation: false, truncated: false }, reasonCodes: ['CONTEXT_DEGRADED'], updatedAt: 1, evidence: { status: 'COMPLETE', workspaceContained: true, canonicalTargetsKnown: true, versionControlled: true, checkpointAvailable: 'unknown', pathAliasObserved: false, itemCount: 1, truncated: false } } } as never
    const client = new PresentationClient({ rpc: { call: vi.fn(async () => ({ ok: true, value })) } })
    render(<RiskAdvisorDetail sessionId={'p10-session' as never} callId={'p10-call' as never} presentationClient={client} t={t} useChat={() => undefined} />)
    await waitFor(() => expect(screen.getByTestId('risk-advisor-indicator').getAttribute('data-ra-status')).toBe('READY'))
    const row = screen.getByTestId('risk-advisor-indicator')
    expect(row.textContent).toContain('PARTIAL')
    expect(row.querySelector('section, details')).toBeNull()
    expect(screen.queryByTestId('risk-advisor-toctou-disclosure')).toBeNull()
    screen.getByRole('button', { name: 'Details' }).click()
    expect(await screen.findByRole('dialog', { name: 'Risk Advisor details' })).toBeTruthy()
    expect(screen.getByTestId('risk-advisor-toctou-disclosure').textContent).toContain('observed before execution')
    screen.getByRole('button', { name: 'Close details' }).click()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(screen.getByTestId('risk-advisor-indicator')).toBe(row)
    client.dispose()
  })

  it('records operationHash internally while the public foundation surface remains path-free', () => {
    const foundation = new OperationFoundation()
    const session = { id: 'p10-foundation', header: { cwd: 'C:\\workspace' } }
    const make = (callId: string, filePath: string) => ({ name: 'write', arguments: { file_path: filePath, content: 'bounded-content' }, callId, rootCallId: callId, agent: { session }, signal: new AbortController().signal, token: Symbol() })
    const first = make('p10-foundation-call-1', 'private.txt')
    const equivalent = make('p10-foundation-call-2', 'private.txt')
    const different = make('p10-foundation-call-3', 'different.txt')
    foundation.capture(first as never, 'p10-foundation-execution-1')
    foundation.capture(equivalent as never, 'p10-foundation-execution-2')
    foundation.capture(different as never, 'p10-foundation-execution-3')
    const entries = (foundation as unknown as { snapshots: Map<string, { snapshot: Record<string, unknown> }> }).snapshots
    expect(entries.get('p10-foundation-execution-1')?.snapshot.operationHash).toBe(entries.get('p10-foundation-execution-2')?.snapshot.operationHash)
    expect(entries.get('p10-foundation-execution-1')?.snapshot.operationHash).not.toBe(entries.get('p10-foundation-execution-3')?.snapshot.operationHash)
    for (const id of ['p10-foundation-execution-1', 'p10-foundation-execution-2', 'p10-foundation-execution-3']) {
      expect(JSON.stringify(foundation.diagnostics.get(id))).not.toContain('private.txt')
      expect(JSON.stringify(foundation.diagnostics.get(id))).not.toContain('different.txt')
    }
    foundation.retire(first as never)
    foundation.retire(equivalent as never)
    foundation.retire(different as never)
    foundation.dispose()
  })
})
