import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as jsxRuntime from 'react/jsx-runtime'
import { Button } from '@phase15-pinned-harness-ui/Button.tsx'
import { Modal } from '@phase15-pinned-harness-ui/Modal.tsx'
import { StateDot } from '@phase15-pinned-harness-ui/StateDot.tsx'
import { Tag } from '@phase15-pinned-harness-ui/Tag.tsx'
import { writeClipboard } from '@phase15-pinned-harness-ui/clipboard.ts'

const primitives = { Button, Modal, StateDot, Tag, writeClipboard }

const entry = { exports: undefined }
const moduleTable = {
  react: React,
  'react/jsx-runtime': jsxRuntime,
  '@deepseek-ai/dsh-client-ui-primitives': primitives,
}
window.__ModuleLoader__ = {
  load(registration) {
    if (registration.id !== '@dhandil/dsh-risk-advisor') throw new Error('Unexpected package id')
    entry.exports = registration.factory(id => {
      if (!Object.hasOwn(moduleTable, id)) throw new Error(`Unexpected external module: ${id}`)
      return moduleTable[id]
    })
  },
}

const bundle = await fetch('/risk-advisor-client.js', { cache: 'no-store' }).then(response => {
  if (!response.ok) throw new Error(`Client artifact fetch failed: ${response.status}`)
  return response.text()
})
new Function(bundle)()
if (!entry.exports?.RuntimeRiskAwarenessDock || !entry.exports?.OnlineCorrectionDock || !entry.exports?.RiskAdvisorDetail) {
  throw new Error('Source-identified Client bundle did not expose all three real surfaces')
}

const { RuntimeRiskAwarenessDock, OnlineCorrectionDock, RiskAdvisorDetail, runtimeRiskEn, runtimeRiskZh, onlineCorrectionEn, onlineCorrectionZh, en, zh } = entry.exports
const root = createRoot(document.getElementById('root'))
const listeners = new Set()
const seed = 'phase15-3a-synthetic'
const sessionA = `${seed}-session-a`
const sessionB = `${seed}-session-b`
const callId = `${seed}-call`
const observedAt = Date.now()

const dimension = (verdict, message = 'Evidence is incomplete; inspect the intended destination.') => ({
  verdict, source: 'RULE', evidenceQuality: 'PARTIAL', reasons: [{ code: 'HIGH_HAZARD_UNRESOLVED_CONTEXT', message }],
})

function assessment(long = false) {
  const primary = long
    ? 'Confirm the explicitly synthetic destination and intended result before continuing; this bounded fixture reason is deliberately long to reveal narrow-screen wrapping and clipping behavior.'.repeat(2)
    : 'Confirm the intended destination before continuing.'
  return {
    schemaVersion: 1,
    assessmentId: `${seed}-assessment`,
    status: 'PARTIAL',
    dimensions: {
      risk: dimension('HIGH', primary), authorization: dimension('UNKNOWN'), necessity: dimension('UNKNOWN'),
      privilege: dimension('UNKNOWN'), alternatives: dimension('UNKNOWN'), evidenceQuality: dimension('LOW'),
    },
    aggregate: { recommendation: 'APPROVE_WITH_CAUTION', hazardLevel: 'HIGH', attention: 'ELEVATED', primaryReasonCodes: ['HIGH_HAZARD_UNRESOLVED_CONTEXT'] },
    findings: [{ code: 'SYNTHETIC_CONTEXT_INCOMPLETE', title: primary, detail: 'Synthetic UI-only example; no operation was executed.', dimension: 'RISK', severity: 'HIGH', strength: 'DETERMINISTIC' }],
    uncertainties: [{ code: 'SYNTHETIC_TARGET_UNCONFIRMED', description: 'The synthetic destination has not been independently confirmed.', impact: 'REVIEW', resolutionHint: 'Review the target in the real task context.' }],
    alternatives: [], evidence: { ledgerHealth: 'HEALTHY' }, judgeAssisted: false,
  }
}

const history = {
  guidanceId: `ra-guidance-v1_${'a'.repeat(64)}`,
  guidanceRevisionId: `ra-guidance-v1_${'a'.repeat(64)}_00000001`,
  patternId: `ra-pattern-v1_${'b'.repeat(64)}`,
  patternRevisionId: `ra-pattern-v1_${'b'.repeat(64)}_00000001`,
  patternProvenanceDigest: 'c'.repeat(64),
  evidenceStrength: 'QUALIFIED_PATTERN', supportCount: 3, supportUtcDateCount: 2,
  title: 'Verified historical pattern',
  observation: 'A qualified verified-success pattern covers 3 distinct Episodes across 2 UTC dates.',
  contextCaveat: 'Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.',
  nextCheck: 'Independently verify the current target and expected postcondition.',
  authorityNotice: 'This guidance does not determine risk or grant permission or approval.',
}

function runtimeView(sessionId, long = false) {
  return {
    schemaVersion: 1, sessionId, executionId: `${seed}-execution`, callId, assessmentId: `${seed}-assessment`,
    timing: 'PRE_EXECUTION_EVIDENCE', status: 'DEGRADED', stage: 'COMPLETE', capturedAt: observedAt,
    updatedAt: observedAt, reasonCodes: ['EVIDENCE_PARTIAL'], assessment: assessment(long),
  }
}

function finding(kind, suffix = 'one') {
  const f1 = kind === 'REPEATED_FAILURE_WITHOUT_PROGRESS'
  return {
    findingId: `${seed}-finding-${suffix}`,
    kind,
    diagnosis: f1 ? 'REPEATED_SAME_SIGNATURE_FAILURE' : 'VERIFIED_POSTCONDITION_MISMATCH',
    disposition: 'ADVISE',
    advisoryCode: f1 ? 'STOP_EXACT_RETRY_PATH_V1' : 'INSPECT_UNSATISFIED_POSTCONDITION_V1',
    observedAt,
  }
}

function correctionView(sessionId, kind = 'POSTCONDITION_NOT_SATISFIED', long = false) {
  return { schemaVersion: 1, sessionId, findings: [finding(kind)], truncated: false, reasonCodes: [], syntheticLong: long }
}

function makeStore(snapshot) {
  let current = snapshot
  const subs = new Set()
  return {
    getSnapshot: () => current,
    subscribe(listener) { subs.add(listener); return () => subs.delete(listener) },
    set(value) { current = value; for (const notify of [...subs]) notify() },
  }
}

const stores = new Map()
function storeFor(kind, sessionId) {
  const key = `${kind}:${sessionId}`
  if (!stores.has(key)) stores.set(key, makeStore({ status: 'EMPTY' }))
  return stores.get(key)
}

const runtimeClient = { getSource: sessionId => storeFor('runtime', sessionId), retain() {}, release() {}, refresh() {} }
const historyClient = { getSource: sessionId => storeFor('risk-history', sessionId), retain() { return true }, release() {}, setTarget() {} }
const correctionClient = { getSource: sessionId => storeFor('correction', sessionId), retain() {}, release() {} }
const correctionHistoryClient = {
  getSource: sessionId => storeFor('correction-history', sessionId),
  setFinding() { return true }, retain() { return true }, release() {},
}
const nextCheckClient = {
  getSource: sessionId => storeFor('next-check', sessionId),
  setFinding() { return true }, retain() { return true }, release() {},
}
const presentationClient = {
  getSource: () => storeFor('presentation', sessionA), retain() {}, release() {},
}
const approvalHistoryClient = {
  getSource: () => storeFor('approval-history', sessionA), retain() {}, release() {}, setTarget() {}, clearTarget() {},
}

const presentationSnapshot = {
  status: 'READY',
  view: {
    schemaVersion: 4, sessionId: sessionA, callId, association: 'BOUND', status: 'ready', stage: 'complete',
    operation: {
      title: 'Synthetic file operation', summary: 'A non-executed UI fixture for a bounded file action.',
      resources: [{ kind: 'file', label: 'synthetic-output.txt' }], requestedPermission: 'danger-full-access',
      workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown',
    },
    assessment: assessment(), failureContext: { retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: false, truncated: false },
    reasonCodes: [], updatedAt: observedAt, evidence: { status: 'PARTIAL', itemCount: 1 },
  },
}

function riskHistorySnapshot() {
  return { status: 'VIEW', view: { schemaVersion: 1, sessionId: sessionA, executionId: `${seed}-execution`, assessmentId: `${seed}-assessment`, historical: history, observedAt: Date.now() } }
}

function correctionHistorySnapshot(kind = 'POSTCONDITION_NOT_SATISFIED') {
  const f = finding(kind)
  return { status: 'VIEW', findingId: f.findingId, view: { kind: 'VIEW', sessionId: sessionA, findingId: f.findingId, findingKind: kind, historical: history, observedAt: Date.now() } }
}

function nextCheckSnapshot(kind = 'POSTCONDITION_NOT_SATISFIED') {
  const f = finding(kind)
  return { status: 'VIEW', findingId: f.findingId, view: { kind: 'VIEW', sessionId: sessionA, findingId: f.findingId, findingKind: kind,
    checkCode: 'INSPECT_WRITTEN_CONTENT_V1', evidenceCode: kind === 'POSTCONDITION_NOT_SATISFIED' ? 'F2_VERIFIED_POSTCONDITION_MISMATCH_V1' : 'F1_CONTIGUOUS_RETRY_FINDING_V1', observedAt: Date.now() } }
}

function translate(table) { return (key, vars) => {
  const raw = table[key] ?? key
  if (vars === undefined) return raw
  return raw.replace(/\{(\w+)\}/g, (_match, name) => String(vars[name] ?? ''))
} }

const localeTables = { en: { risk: runtimeRiskEn, online: onlineCorrectionEn, approval: en }, zh: { risk: runtimeRiskZh, online: onlineCorrectionZh, approval: zh } }

function pendingState(activeSession, pending) {
  return selector => selector({ get: sessionId => sessionId === activeSession && pending ? { pendingInteraction: {
    kind: 'approval', sessionId, callId, key: `${seed}-approval`, result: Promise.resolve(undefined),
  } } : undefined })
}

function seedScenario(scenario, activeSession) {
  const sessions = [sessionA, sessionB]
  for (const id of sessions) {
    storeFor('runtime', id).set(scenario === 'V7' ? { status: 'UNAVAILABLE' } : { status: 'VIEW', view: runtimeView(id, scenario === 'V6') })
    storeFor('risk-history', id).set(scenario === 'V2' ? riskHistorySnapshot() : { status: 'EMPTY' })
    const correctionEnabled = ['V4', 'V5', 'V6'].includes(scenario)
    const kind = scenario === 'V4' ? 'REPEATED_FAILURE_WITHOUT_PROGRESS' : 'POSTCONDITION_NOT_SATISFIED'
    storeFor('correction', id).set(correctionEnabled ? { status: 'VIEW', view: correctionView(id, kind, scenario === 'V6') } : { status: 'EMPTY' })
    storeFor('correction-history', id).set((scenario === 'V5' || scenario === 'V4') ? correctionHistorySnapshot(kind) : { status: 'EMPTY' })
    storeFor('next-check', id).set((scenario === 'V5' || scenario === 'V4') ? nextCheckSnapshot(kind) : { status: 'EMPTY' })
  }
  storeFor('presentation', sessionA).set(presentationSnapshot)
  storeFor('approval-history', sessionA).set({ status: 'VIEW', clientKey: `${seed}-approval`, view: {
    sessionId: sessionA, callId, observedAt: Date.now(), historical: history,
  } })
}

function Surface({ scenario, activeSession, pending, locale }) {
  const lang = localeTables[locale]
  const f1 = scenario === 'V4'
  const correctionsEnabled = ['V4', 'V5', 'V6'].includes(scenario)
  return <>
    <div className="surface-caption">Synthetic conversation.input.dock · order 10 then 20 · no real slot registration</div>
    <div className="composer-shell" data-testid="synthetic-composer">
      <div className="dock-mount">
        {correctionsEnabled && <OnlineCorrectionDock sessionId={activeSession} input={{}} session={{}} useSessionStatus={pendingState(activeSession, false)}
          onlineCorrectionClient={correctionClient} correctionHistoricalContextClient={correctionHistoryClient} correctionNextCheckClient={nextCheckClient} t={translate(lang.online)} />}
        <RuntimeRiskAwarenessDock sessionId={activeSession} session={{}} input={{}} useSession={() => ({})} useProjection={() => undefined}
          useSessions={() => ({})} useSessionStatus={pendingState(activeSession, pending)} useSessionRetainInfo={() => ({})}
          runtimeRiskClient={runtimeClient} historicalContextClient={historyClient} t={translate(lang.risk)} />
      </div>
      <div className="fixture-prompt">Synthetic prompt area · task-owned fixture only</div>
    </div>
    {scenario === 'V3' && <>
      <div className="surface-caption">Synthetic Native Approval detail extension · Harness Allow/Reject controls intentionally omitted</div>
      <div className="approval-shell">
        <h2>Native Approval (synthetic context)</h2>
        <p>Harness remains the only approval authority. This fixture renders the real Risk Advisor detail extension.</p>
        <RiskAdvisorDetail sessionId={sessionA} callId={callId} session={{}} input={{}} useChat={selector => selector({ nodes: new Map([['synthetic-tool', { kind: 'tool-call', data: { root: { callId, argsRaw: JSON.stringify({ command: 'printf synthetic' }) } } }]]) })}
          useSessionStatus={pendingState(sessionA, true)} presentationClient={presentationClient} approvalHistoricalContextClient={approvalHistoryClient} t={translate(lang.approval)} />
        <div className="approval-controls-omitted">No Allow/Reject action is present in the fixture.</div>
      </div>
    </>}
    <div className="fixture-state" data-testid="fixture-state">{scenario} · session {activeSession === sessionA ? 'A' : 'B'} · locale {locale} · explicitly synthetic DTOs</div>
  </>
}

function App() {
  const [scenario, setScenario] = useState('V1')
  const [locale, setLocale] = useState('en')
  const [activeSession, setActiveSession] = useState(sessionA)
  const [theme, setTheme] = useState('light')
  React.useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  React.useEffect(() => { document.documentElement.lang = locale }, [locale])
  React.useEffect(() => { seedScenario(scenario, activeSession) }, [scenario, activeSession])
  window.__phase15Fixture = {
    setScenario(value) { setScenario(value); setActiveSession(sessionA) },
    setLocale, setTheme,
    setSession(value) { setActiveSession(value === 'A' ? sessionA : sessionB) },
    sessionA, sessionB,
    metrics() {
      const composer = document.querySelector('[data-testid="synthetic-composer"]')
      const runtimeDock = document.querySelector('[data-runtime-risk-dock]')
      const onlineDock = document.querySelector('[data-online-correction-dock]')
      const row = document.querySelector('[data-testid="risk-advisor-indicator"]')
      return {
        viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth,
        composerHeight: Math.round(composer?.getBoundingClientRect().height ?? 0),
        runtimeDockHeight: Math.round(runtimeDock?.getBoundingClientRect().height ?? 0),
        onlineDockHeight: Math.round(onlineDock?.getBoundingClientRect().height ?? 0),
        approvalRowHeight: Math.round(row?.getBoundingClientRect().height ?? 0),
        detailsOpen: [...document.querySelectorAll('details')].map(item => item.open),
        currentSession: document.querySelector('[data-testid="fixture-state"]')?.textContent,
        f1Count: document.querySelectorAll('[data-advisory-kind="REPEATED_FAILURE_WITHOUT_PROGRESS"]').length,
        f2Count: document.querySelectorAll('[data-advisory-kind="POSTCONDITION_NOT_SATISFIED"]').length,
        syntheticBannerVisible: !!document.querySelector('.synthetic-banner'),
      }
    },
  }
  return <main className="fixture-shell">
    <header className="fixture-heading"><h1>Phase 15.3A · Synthetic browser observation</h1><span className="synthetic-banner">SYNTHETIC UI FIXTURE · NOT LIVE HARNESS EVIDENCE</span></header>
    <nav className="fixture-controls" aria-label="Synthetic scenarios">
      <span className="fixture-label">Scenario:</span>
      {['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7'].map(value => <button key={value} data-fixture-scenario={value} aria-pressed={scenario === value} onClick={() => { setScenario(value); setActiveSession(sessionA) }}>{value}</button>)}
      <span className="fixture-label">Locale:</span>
      <button data-fixture-locale="en" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>EN</button>
      <button data-fixture-locale="zh" aria-pressed={locale === 'zh'} onClick={() => setLocale('zh')}>中文</button>
      <span className="fixture-label">Theme:</span>
      <button data-fixture-theme="light" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>Light</button>
      <button data-fixture-theme="dark" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>Dark</button>
    </nav>
    <Surface scenario={scenario} activeSession={activeSession} pending={scenario === 'V3'} locale={locale} />
  </main>
}

root.render(<App />)
