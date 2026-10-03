import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { RiskAdvisorDetail } from '../src/client/RiskAdvisorDetail.tsx'
import { en } from '../src/client/locales.ts'
import { OperationFoundation } from '../src/host/operation-foundation.ts'

afterEach(() => cleanup())

describe('Phase 10 TOCTOU and presentation truthfulness', () => {
  it('renders pre-execution disclosure for evidence-bearing Bridge V3 data', () => {
    const t = ((key: string) => en[key as keyof typeof en] ?? key) as never
    const client = { retain: () => undefined, release: () => undefined, getSource: () => undefined } as never
    render(<RiskAdvisorDetail sessionId={'p10-session' as never} callId={'p10-call' as never} presentationClient={client} t={t} useChat={() => undefined} />)
    expect(screen.getByTestId('risk-advisor-card').getAttribute('data-ra-status')).toBe('UNAVAILABLE')
    expect(en.preExecutionEvidence).toContain('observed before execution')
  })

  it('records operationHash internally while the public foundation surface remains path-free', () => {
    const foundation = new OperationFoundation()
    const session = { id: 'p10-foundation', header: { cwd: 'C:\\workspace' } }
    const exec = { name: 'write', arguments: { file_path: 'private.txt', content: 'bounded-content' }, callId: 'p10-foundation-call', rootCallId: 'p10-foundation-call', agent: { session }, signal: new AbortController().signal, token: Symbol() }
    foundation.capture(exec as never, 'p10-foundation-execution')
    const diagnostic = foundation.diagnostics.get('p10-foundation-execution')
    expect(diagnostic.status).toBe('CAPTURED')
    expect(JSON.stringify(diagnostic)).not.toContain('private.txt')
    foundation.retire(exec as never)
    foundation.dispose()
  })
})
