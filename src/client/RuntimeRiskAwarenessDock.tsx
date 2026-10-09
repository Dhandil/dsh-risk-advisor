import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { BrowserRiskAssessmentV1 } from '../bridge-contract.ts'
import type { RuntimeRiskClient } from './runtime-risk-client.ts'
import { RUNTIME_RISK_NS } from './runtime-risk-locales.ts'
import css from './RuntimeRiskAwarenessDock.module.css'

export interface RuntimeRiskAwarenessDockInjected { readonly runtimeRiskClient: RuntimeRiskClient }

export type RuntimeRiskAwarenessDockProps = PropsRuntime<'conversation.input.dock'>
  & RuntimeRiskAwarenessDockInjected
  & PropsLocale<typeof RUNTIME_RISK_NS>

export function RuntimeRiskAwarenessDock({ sessionId, runtimeRiskClient, useSessionStatus, t }: RuntimeRiskAwarenessDockProps) {
  const store = runtimeRiskClient.getSource(sessionId)
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const pendingInteraction = useSessionStatus(state => state.get(sessionId)?.pendingInteraction)
  const pendingApproval = pendingInteraction?.kind === 'approval'
  const pendingCallId = readCallId(pendingInteraction)
  const view = snapshot.status === 'VIEW' ? snapshot.view : undefined
  const pendingMatches = pendingApproval && (view === undefined || view.callId === undefined || pendingCallId === undefined || view.callId === pendingCallId)
  const previousPending = useRef(pendingApproval)
  const [awaitingFreshHostRead, setAwaitingFreshHostRead] = useState(false)

  useEffect(() => {
    runtimeRiskClient.retain(sessionId)
    return () => { runtimeRiskClient.release(sessionId) }
  }, [runtimeRiskClient, sessionId])

  useLayoutEffect(() => {
    if (pendingMatches) setAwaitingFreshHostRead(true)
    if (previousPending.current && !pendingApproval) {
      setAwaitingFreshHostRead(true)
      runtimeRiskClient.refresh(sessionId)
    }
    previousPending.current = pendingApproval
  }, [pendingMatches, pendingApproval, runtimeRiskClient, sessionId])

  useEffect(() => {
    if (!pendingApproval && awaitingFreshHostRead && snapshot.status !== 'EMPTY') setAwaitingFreshHostRead(false)
  }, [awaitingFreshHostRead, pendingApproval, snapshot])

  if (snapshot.status === 'EMPTY') return null
  if (snapshot.status === 'UNAVAILABLE') {
    if (pendingApproval || awaitingFreshHostRead) return null
    return <div className={css.dock} role="status" aria-live="polite"><div className={css.panel}>
      <div className={css.title}>{t('title')}</div><div className={css.caveat}>{t('unavailable')}</div><div className={css.muted}>{t('advisory')}</div>
    </div></div>
  }
  if (snapshot.status === 'NOT_FOUND') return null
  if (snapshot.status !== 'VIEW') return null

  if (pendingMatches || awaitingFreshHostRead) return null

  const currentView = snapshot.view
  if (currentView.status === 'PENDING') return <div className={css.dock} role="status" aria-live="polite"><div className={css.panel}>
    <div className={css.title}>{t('title')}</div><div>{t('queued')}</div><div className={css.muted}>{t('preExecution')}</div><div className={css.muted}>{t('advisory')}</div>
  </div></div>

  const assessment = currentView.assessment
  const hazard = assessment?.aggregate.hazardLevel ?? 'UNKNOWN'
  const recommendation = assessment?.aggregate.recommendation
  const primaryReason = assessment?.findings[0]?.title
    ?? assessment?.dimensions.risk.reasons[0]?.message
    ?? t('unknown')
  const degraded = currentView.status === 'DEGRADED' || assessment === undefined || assessment.status !== 'COMPLETE' || hazard === 'UNKNOWN'

  return <div className={css.dock} role="status" aria-live="polite" data-runtime-risk-dock="">
    <div className={css.panel}>
      <div className={css.heading}><strong className={css.title}>{t('title')}</strong><span className={css.hazard} data-severity={hazard.toLowerCase()}>{t(hazard.toLowerCase() as 'low' | 'medium' | 'high' | 'critical' | 'unknown')}</span></div>
      {recommendation !== undefined && <div><span className={css.label}>{t('recommendation')}: </span>{t(recommendationKey(recommendation))}</div>}
      <div className={css.reason}><span className={css.label}>{t('reason')}: </span>{primaryReason}</div>
      <div className={degraded ? css.caveat : css.muted}>{degraded ? t('degraded') : t('preExecution')}</div>
      <div className={css.muted}>{t('advisory')}</div>
      {assessment !== undefined && <details className={css.details}>
        <summary>{t('details')}</summary>
        <dl>{dimensionRows(assessment).map(([name, value]) => <div className={css.dimension} key={name}>
          <dt>{t(name)}</dt><dd>{value.verdict} · {value.evidenceQuality}</dd>
        </div>)}</dl>
        {assessment.findings.length > 1 && <ul>{assessment.findings.slice(1, 9).map((finding, index) => <li key={`${finding.code}-${index}`}>{finding.title}: {finding.detail}</li>)}</ul>}
        {assessment.uncertainties.length > 0 && <ul>{assessment.uncertainties.slice(0, 8).map((item, index) => <li key={`${item.code}-${index}`}>{item.description}</li>)}</ul>}
      </details>}
    </div>
  </div>
}

function readCallId(value: unknown): string | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const callId = (value as { readonly callId?: unknown }).callId
  return typeof callId === 'string' && callId.length > 0 && callId.length <= 256 ? callId : undefined
}

function recommendationKey(value: string): 'approve' | 'caution' | 'saferAlternative' | 'moreInformation' | 'reject' {
  switch (value) {
    case 'APPROVE': return 'approve'
    case 'APPROVE_WITH_CAUTION': return 'caution'
    case 'PREFER_SAFER_ALTERNATIVE': return 'saferAlternative'
    case 'NEED_MORE_INFORMATION': return 'moreInformation'
    default: return 'reject'
  }
}

function dimensionRows(assessment: BrowserRiskAssessmentV1) {
  return [
    ['risk', assessment.dimensions.risk],
    ['authorization', assessment.dimensions.authorization],
    ['necessity', assessment.dimensions.necessity],
    ['privilege', assessment.dimensions.privilege],
    ['alternatives', assessment.dimensions.alternatives],
    ['evidenceQuality', assessment.dimensions.evidenceQuality],
  ] as const
}
