import { describe, expect, it } from 'vitest'
import { parseBridgeRead } from '../src/bridge-contract.ts'
import { phase6View } from '../src/host/presentation/presentation-source.ts'

function readyView(stage: 'fast' | 'complete' = 'fast'): Record<string, unknown> {
  const operation = { schemaVersion: 1, kind: 'filesystem-read', toolName: 'read', title: 'Read a file', summary: 'Read the requested target.', resources: [{ kind: 'path', label: 'redacted.txt' }], parserConfidence: 'high', mutating: false, externalEffect: false, networkEffect: 'none', workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown' }
  const dimension = (verdict: string) => ({ verdict, source: 'RULE', evidenceQuality: 'MEDIUM', reasons: [{ code: 'SAFE', message: 'bounded' }] })
  const assessment = { schemaVersion: 1, assessmentId: 'assessment-1', status: 'PARTIAL', dimensions: { risk: dimension('UNKNOWN'), authorization: dimension('UNKNOWN'), necessity: dimension('UNKNOWN'), privilege: dimension('UNKNOWN'), alternatives: dimension('UNKNOWN'), evidenceQuality: dimension('MEDIUM') }, aggregate: { recommendation: 'NEED_MORE_INFORMATION', hazardLevel: 'UNKNOWN', attention: 'ELEVATED', primaryReasonCodes: ['SAFE'] }, findings: [], uncertainties: [], alternatives: [], evidence: { ledgerHealth: 'HEALTHY' }, judgeAssisted: false }
  const failureContext = { schemaVersion: 1, retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: 'unknown', truncated: false }
  return { kind: 'VIEW', view: { schemaVersion: 2, sessionId: 's', callId: 'c', assessmentId: 'assessment-1', association: 'BOUND', status: 'ready', stage, operation, assessment, failureContext, reasonCodes: [], updatedAt: 1 } }
}

describe('Phase 6 Bridge V2 strict parser', () => {
  it('accepts and deeply freezes a valid A1/A2 view', () => {
    const parsed = parseBridgeRead(readyView())
    expect(parsed?.kind).toBe('VIEW')
    if (parsed?.kind !== 'VIEW' || parsed.view.schemaVersion !== 2) throw new Error('expected V2')
    expect(parsed.view.stage).toBe('fast')
    expect(Object.isFrozen(parsed.view)).toBe(true)
    expect(Object.isFrozen(parsed.view.assessment)).toBe(true)
    expect(Object.isFrozen(parsed.view.operation?.resources)).toBe(true)
  })

  it('rejects extra nested keys, accessors, invalid ready shape and unbounded strings', () => {
    const extra = readyView() as { view: Record<string, unknown> }
    ;(extra.view.assessment as Record<string, unknown>).rawArgs = 'secret'
    expect(parseBridgeRead(extra)).toBeUndefined()
    const missing = readyView() as { view: Record<string, unknown> }
    delete (missing.view as Record<string, unknown>).failureContext
    expect(parseBridgeRead(missing)).toBeUndefined()
    const accessor = readyView()
    Object.defineProperty((accessor as { view: Record<string, unknown> }).view, 'callId', { get: () => 'c' })
    expect(parseBridgeRead(accessor)).toBeUndefined()
    const huge = readyView() as { view: Record<string, unknown> }
    ;(huge.view.assessment as Record<string, unknown>).assessmentId = 'x'.repeat(257)
    expect(parseBridgeRead(huge)).toBeUndefined()
  })

  it('keeps NOT_FOUND and AMBIGUOUS transport records distinct', () => {
    expect(parseBridgeRead({ kind: 'NOT_FOUND' })).toEqual({ kind: 'NOT_FOUND' })
    expect(parseBridgeRead({ kind: 'AMBIGUOUS', reasonCodes: ['MULTIPLE_ACTIVE_APPROVALS'] })).toEqual({ kind: 'AMBIGUOUS', reasonCodes: ['MULTIPLE_ACTIVE_APPROVALS'] })
  })

  it('preserves strict V1 unavailable compatibility without treating it as ready V2', () => {
    const parsed = parseBridgeRead({ kind: 'VIEW', view: { schemaVersion: 1, sessionId: 's', callId: 'c', assessmentId: 'a1', association: 'BOUND', status: 'unavailable', stage: 'not-started', reasonCodes: ['FOUNDATION_UNAVAILABLE'], updatedAt: 1 } })
    expect(parsed).toMatchObject({ kind: 'VIEW', view: { schemaVersion: 1, status: 'unavailable', stage: 'not-started' } })
    const v2 = parseBridgeRead(readyView('complete'))
    expect(v2?.kind).toBe('VIEW')
    if (v2?.kind !== 'VIEW') throw new Error('expected V2')
    expect(JSON.stringify(v2)).not.toMatch(/rawArgs|secret|password|feature-[0-9]|event-[0-9]/i)
  })

  it('accepts only the bounded bound-pending and terminal-cancelled V2 lifecycle shapes', () => {
    const pending = parseBridgeRead({ kind: 'VIEW', view: { schemaVersion: 2, sessionId: 's', callId: 'c', assessmentId: 'a1', association: 'BOUND', status: 'pending', stage: 'rules', reasonCodes: [], updatedAt: 1 } })
    expect(pending).toMatchObject({ kind: 'VIEW', view: { status: 'pending', stage: 'rules', association: 'BOUND' } })
    const cancelled = parseBridgeRead({ kind: 'VIEW', view: { schemaVersion: 2, sessionId: 's', callId: 'c', assessmentId: 'a1', association: 'BOUND', status: 'cancelled', stage: 'complete', reasonCodes: ['NATIVE_OUTCOME_OBSERVED'], updatedAt: 2 } })
    expect(cancelled).toMatchObject({ kind: 'VIEW', view: { status: 'cancelled', stage: 'complete' } })
  })

  it('uses V2 view source without exposing full Host context', () => {
    const view = phase6View({ sessionId: 's', callId: 'c', toolName: 'read', association: 'UNBOUND', stage: 'rules', status: 'unavailable', reasonCodes: ['ASSESSOR_NOT_IMPLEMENTED'], updatedAt: 1 })
    expect(view.schemaVersion).toBe(2)
    expect(view.reasonCodes).toContain('ASSESSMENT_UNAVAILABLE')
    expect(JSON.stringify(view)).not.toContain('ASSESSOR_NOT_IMPLEMENTED')
  })
})
