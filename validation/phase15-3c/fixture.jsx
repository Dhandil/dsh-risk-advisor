import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import * as jsxRuntime from 'react/jsx-runtime'
import { Button } from '@phase15-pinned-harness-ui/Button.tsx'
import { Modal } from '@phase15-pinned-harness-ui/Modal.tsx'
import { StateDot } from '@phase15-pinned-harness-ui/StateDot.tsx'
import { Tag } from '@phase15-pinned-harness-ui/Tag.tsx'
import { writeClipboard } from '@phase15-pinned-harness-ui/clipboard.ts'

const modules = { react: React, 'react/jsx-runtime': jsxRuntime, '@deepseek-ai/dsh-client-ui-primitives': { Button, Modal, StateDot, Tag, writeClipboard } }
const registration = { exports: undefined }
window.__ModuleLoader__ = { load(value) {
  if (value.id !== '@dhandil/dsh-risk-advisor') throw new Error('Unexpected Client module identity')
  registration.exports = value.factory(specifier => {
    if (!Object.hasOwn(modules, specifier)) throw new Error(`Unexpected external module: ${specifier}`)
    return modules[specifier]
  })
} }

const source = await fetch('/risk-advisor-client.js', { cache: 'no-store' }).then(response => {
  if (!response.ok) throw new Error(`Client bundle request failed: ${response.status}`)
  return response.text()
})
new Function(source)()
const { RuntimeRiskAwarenessDock, RiskAdvisorDetail, runtimeRiskEn, runtimeRiskZh, en, zh } = registration.exports ?? {}
if (typeof RuntimeRiskAwarenessDock !== 'function' || typeof RiskAdvisorDetail !== 'function') throw new Error('Real exported Client components were not registered')

const root = createRoot(document.getElementById('root'))
const sessionId = 'phase15-3c-synthetic-session'
const callId = 'phase15-3c-synthetic-call'
const executionId = 'phase15-3c-synthetic-execution'
const assessmentId = 'phase15-3c-synthetic-assessment'
const observedAt = Date.now()
const historical = {
  guidanceId: `ra-guidance-v1_${'a'.repeat(64)}`,
  guidanceRevisionId: `ra-guidance-v1_${'a'.repeat(64)}_00000001`,
  patternId: `ra-pattern-v1_${'b'.repeat(64)}`,
  patternRevisionId: `ra-pattern-v1_${'b'.repeat(64)}_00000001`,
  patternProvenanceDigest: 'c'.repeat(64), evidenceStrength: 'QUALIFIED_PATTERN', supportCount: 3, supportUtcDateCount: 2,
  title: 'Verified historical pattern',
  observation: 'A qualified verified-success pattern covers 3 distinct Episodes across 2 UTC dates.',
  contextCaveat: 'Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.',
  nextCheck: 'Independently verify the current target and expected postcondition.',
  authorityNotice: 'This guidance does not determine risk or grant permission or approval.',
}

const dimension = (verdict, evidenceQuality = 'MEDIUM') => ({ verdict, source: 'RULE', evidenceQuality, reasons: [{ code: 'SYNTHETIC_RULE', message: 'Synthetic UI evidence only.' }] })
const assessment = {
  schemaVersion: 1, assessmentId, status: 'PARTIAL',
  dimensions: {
    risk: dimension('HIGH', 'PARTIAL'), authorization: dimension('UNKNOWN'), necessity: dimension('UNKNOWN'),
    privilege: dimension('UNKNOWN'), alternatives: dimension('UNKNOWN'), evidenceQuality: dimension('LOW'),
  },
  aggregate: { recommendation: 'APPROVE_WITH_CAUTION', hazardLevel: 'HIGH', attention: 'ELEVATED', primaryReasonCodes: ['HIGH_HAZARD_UNRESOLVED_CONTEXT'] },
  findings: [{ code: 'SYNTHETIC_CONTEXT_INCOMPLETE', title: 'Confirm the current target before continuing', detail: 'This synthetic fixture did not execute an operation.', dimension: 'RISK', severity: 'WARNING', strength: 'DETERMINISTIC' }],
  uncertainties: [{ code: 'SYNTHETIC_TARGET_UNCONFIRMED', description: 'The synthetic destination has not been independently confirmed.', impact: 'REVIEW' }],
  alternatives: [], evidence: { ledgerHealth: 'HEALTHY' }, judgeAssisted: false,
}

const runtimeView = {
  schemaVersion: 1, kind: 'VIEW', sessionId, executionId, callId, assessmentId,
  timing: 'PRE_EXECUTION_EVIDENCE', status: 'DEGRADED', stage: 'COMPLETE', capturedAt: observedAt,
  updatedAt: observedAt, reasonCodes: ['EVIDENCE_PARTIAL'], assessment,
}
const historyView = { status: 'VIEW', view: { schemaVersion: 1, kind: 'VIEW', sessionId, executionId, assessmentId, historical, observedAt } }
function staticStore(snapshot) { return { getSnapshot: () => snapshot, subscribe: () => () => undefined } }
const runtimeStore = staticStore({ status: 'VIEW', view: runtimeView })
const historyStore = staticStore(historyView)
const runtimeRiskClient = { getSource: () => runtimeStore, retain() {}, release() {}, refresh() {} }
const historicalContextClient = { getSource: () => historyStore, retain() {}, release() {}, setTarget() {} }

const operation = {
  schemaVersion: 1, kind: 'shell', toolName: 'bash', title: 'Synthetic file operation',
  summary: 'A bounded example shown only to review the existing approval detail surface.',
  resources: [
    { kind: 'file', label: 'synthetic-output-' + 'very-long-resource-name-'.repeat(4) + 'final.txt' },
    { kind: 'directory', label: 'synthetic-workspace/exports' },
  ],
  requestedPermission: 'danger-full-access', parserConfidence: 'high', mutating: 'unknown', externalEffect: 'unknown',
  networkEffect: 'unknown', workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown',
}
const approvalView = {
  schemaVersion: 4, sessionId, callId, association: 'BOUND', status: 'ready', stage: 'complete', operation,
  assessment: { ...assessment, status: 'DEGRADED' },
  failureContext: { schemaVersion: 1, retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: false, truncated: false },
  reasonCodes: ['EVIDENCE_PARTIAL'], updatedAt: observedAt, evidence: { status: 'PARTIAL', itemCount: 1 },
}
const presentationStore = staticStore({ status: 'READY', view: approvalView })
const presentationClient = { getSource: () => presentationStore, retain() {}, release() {} }

function translator(table) { return key => table[key] ?? key }
function useNoPendingStatus(selector) { return selector({ get: () => undefined }) }
function useApprovalPendingStatus(selector) {
  return selector({ get: id => id === sessionId ? { pendingInteraction: { kind: 'approval', sessionId, callId, key: 'phase15-3c-synthetic-approval', result: new Promise(() => {}) } } : undefined })
}
const commandState = { nodes: { values: () => [{ kind: 'tool-call', data: { root: { callId, name: 'bash', argsRaw: JSON.stringify({ command: 'printf synthetic-only' }) } } }] } }

function App() {
  const [mode, setMode] = useState('ordinary')
  const [locale, setLocale] = useState('en')
  const [theme, setTheme] = useState('light')
  React.useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.lang = locale }, [theme, locale])
  const riskLocale = locale === 'zh' ? runtimeRiskZh : runtimeRiskEn
  const detailLocale = locale === 'zh' ? zh : en
  window.__phase15C = {
    setMode, setLocale, setTheme,
    metrics() {
      const ordinary = document.querySelector('[data-runtime-risk-dock]')
      const indicator = document.querySelector('[data-testid="risk-advisor-indicator"]')
      const modal = document.querySelector('[role="dialog"], dialog[open]')
      const composer = document.querySelector('[data-testid="synthetic-composer"]')
      const operationDetails = document.querySelector('[data-testid="risk-advisor-operation-details"]')
      return {
        mode, locale, theme, viewportWidth: innerWidth, documentWidth: document.documentElement.scrollWidth,
        composerHeight: Math.round(composer?.getBoundingClientRect().height ?? 0),
        ordinaryHeight: Math.round(ordinary?.getBoundingClientRect().height ?? 0),
        historyDetails: [...document.querySelectorAll('[data-runtime-risk-dock] details[aria-label]')].map(item => ({ open: item.open, summary: item.querySelector('summary')?.innerText })),
        indicatorHeight: Math.round(indicator?.getBoundingClientRect().height ?? 0), modal: !!modal,
        resourceCount: operationDetails?.querySelectorAll('[data-testid="risk-advisor-resource"]').length ?? 0,
        operationRows: [...(operationDetails?.querySelectorAll('.riskAdvisor__operationRow') ?? [])].map(item => getComputedStyle(item).gridTemplateColumns),
        dangerPermissionVisible: document.body.innerText.includes('danger-full-access'),
        correctionDockMounted: !!document.querySelector('[data-online-correction-dock]'),
        decisionControls: [...document.querySelectorAll('button')].map(item => item.innerText).filter(text => /^(allow|reject|approve|deny)$/i.test(text)),
        composerScrollWidth: composer?.scrollWidth ?? 0, composerClientWidth: composer?.clientWidth ?? 0,
      }
    },
  }
  return <main className="fixture">
    <header><h1>Phase 15.3C · isolated component validation</h1><span className="banner">SYNTHETIC FIXTURE · NO HARNESS / AGENT / TOOL / PROVIDER</span></header>
    <nav className="controls" aria-label="Synthetic fixture controls">
      <button data-mode="ordinary" aria-pressed={mode === 'ordinary'} onClick={() => setMode('ordinary')}>Ordinary risk</button>
      <button data-mode="approval" aria-pressed={mode === 'approval'} onClick={() => setMode('approval')}>Native Approval details</button>
      <button data-locale="en" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>EN</button>
      <button data-locale="zh" aria-pressed={locale === 'zh'} onClick={() => setLocale('zh')}>中文</button>
      <button data-theme="light" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>Light</button>
      <button data-theme="dark" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>Dark</button>
    </nav>
    <div className="caption">Real Risk Advisor Client bundle, React components and embedded production CSS · synthetic data only</div>
    <section className="composer" data-testid="synthetic-composer">
      <div className="surface">
        {mode === 'ordinary'
          ? <RuntimeRiskAwarenessDock sessionId={sessionId} session={{}} input={{}} useSession={() => ({})} useProjection={() => undefined}
              useSessions={() => ({})} useSessionStatus={useNoPendingStatus} useSessionRetainInfo={() => ({})}
              runtimeRiskClient={runtimeRiskClient} historicalContextClient={historicalContextClient} t={translator(riskLocale)} />
          : <div className="approval"><h2>Native Approval (synthetic context)</h2><p>Harness remains the only decision authority; fixture controls contain no approval actions.</p>
              <RiskAdvisorDetail sessionId={sessionId} callId={callId} session={{}} input={{}} useSessionStatus={useApprovalPendingStatus}
                useChat={selector => selector(commandState)} presentationClient={presentationClient} t={translator(detailLocale)} />
              <p>No Allow / Reject action is rendered by this fixture.</p>
            </div>}
        <div className="prompt">Synthetic prompt area · no operation executed</div>
      </div>
    </section>
    <div className="state" data-testid="fixture-state">Mode {mode} · locale {locale} · session {sessionId} · synthetic DTOs only</div>
  </main>
}

root.render(<App />)
