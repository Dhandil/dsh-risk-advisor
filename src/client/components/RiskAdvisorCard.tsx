import { useState, type ReactNode } from 'react'
import { useSyncExternalStore } from 'react'
import { writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { RiskAdvisorLocaleKey } from '../locales.ts'
import type { BrowserDimension, RiskAdvisorBridgeViewV2, RiskAdvisorBridgeViewV3 } from '../../bridge-contract.ts'
import type { PresentationStore } from '../presentation-store.ts'

type CardProps = PropsLocale<'risk-advisor.r1'> & { readonly store: PresentationStore }
type RiskAdvisorView = RiskAdvisorBridgeViewV2 | RiskAdvisorBridgeViewV3
type ReadyAssessment = NonNullable<RiskAdvisorView['assessment']>

export function RiskAdvisorCard({ store, t }: CardProps): ReactNode {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  if (snapshot.status === 'ANALYZING') return <section data-testid="risk-advisor-card" data-ra-status="ANALYZING"><strong>{t('advisory.title')}</strong><span>{t('state.analyzing')}</span></section>
  if (snapshot.status === 'CANCELLED') return <section data-testid="risk-advisor-card" data-ra-status="CANCELLED"><strong>{t('advisory.title')}</strong><span>{t('state.cancelled')}</span></section>
  if (snapshot.status === 'UNAVAILABLE' || snapshot.view?.status !== 'ready' || snapshot.view.assessment === undefined || snapshot.view.operation === undefined || snapshot.view.failureContext === undefined) {
    return <section data-testid="risk-advisor-card" data-ra-status="UNAVAILABLE"><strong>{t('advisory.title')}</strong><span>{t('state.unavailable')}</span></section>
  }
  return <ReadyCard view={snapshot.view} t={t} />
}

function ReadyCard({ view, t }: { readonly view: RiskAdvisorView; readonly t: CardProps['t'] }): ReactNode {
  const assessment = view.assessment!
  return <section data-testid="risk-advisor-card" data-ra-status="READY">
    <header><strong>{t('advisory.title')}</strong><span>{t('advisory.disclaimer')}</span><span data-testid="risk-advisor-ready-state">{t('state.ready')}</span></header>
    <div data-testid="risk-advisor-operation"><strong>{view.operation!.title}</strong><span>{view.operation!.summary}</span><OperationDetails operation={view.operation!} t={t} /></div>
    <div data-testid="risk-advisor-summary">
      <span>{t('risk')}: {assessment.aggregate.hazardLevel}</span>
      <span>{t('recommendation')}: {assessment.aggregate.recommendation}</span>
      {assessment.status === 'PARTIAL' ? <span data-testid="risk-advisor-assessment-status">{t('status.partial')}</span> : null}
      {assessment.status === 'DEGRADED' ? <span data-testid="risk-advisor-assessment-status">{t('status.degraded')}</span> : null}
      {assessment.aggregate.primaryReasonCodes[0] === undefined ? null : <span data-testid="risk-advisor-primary-reason">{t('primaryReason')}: {assessment.aggregate.primaryReasonCodes[0]}</span>}
    </div>
    <DimensionDetails dimensions={assessment.dimensions} t={t} />
    <BoundedList title={t('findings')} items={assessment.findings.map(item => `${item.title}: ${item.detail}`)} testId="risk-advisor-findings" />
    <BoundedList title={t('uncertainties')} items={assessment.uncertainties.map(item => `${item.code}: ${item.description}`)} testId="risk-advisor-uncertainties" />
    <div data-testid="risk-advisor-source">{assessment.judgeAssisted ? t('judgeAssisted') : t('rulesOnly')}</div>
    <details data-testid="risk-advisor-failure-context"><summary>{t('failureContext')}</summary><span>{t('failureDetails')}</span><span>{view.failureContext!.retryCount}/{view.failureContext!.recentFailureCount}</span><span>{t('sameRootCause')}: {displayUnknown(view.failureContext!.sameRootCause, t)}</span><span>{t('permissionEscalation')}: {displayUnknown(view.failureContext!.permissionEscalation, t)}</span><span>{t('truncated')}: {view.failureContext!.truncated ? 'true' : 'false'}</span></details>
    <div data-testid="risk-advisor-evidence"><span>{t('ledgerHealth')}: {assessment.evidence.ledgerHealth}</span><span>{t('evidenceQuality')}: {assessment.dimensions.evidenceQuality.verdict} / {assessment.dimensions.evidenceQuality.evidenceQuality}</span>{view.schemaVersion === 3 && view.evidence !== undefined ? <span data-testid="risk-advisor-evidence-summary">{view.evidence.status}: {view.evidence.itemCount}</span> : null}</div>
    <AlternativeList alternatives={assessment.alternatives} t={t} />
  </section>
}

function OperationDetails({ operation, t }: { readonly operation: NonNullable<RiskAdvisorView['operation']>; readonly t: CardProps['t'] }): ReactNode {
  return <details data-testid="risk-advisor-operation-details"><summary>{t('operationDetails')}</summary>
    <div><strong>{t('resources')}</strong>{operation.resources.map(resource => <span data-testid="risk-advisor-resource" key={`${resource.kind}:${resource.label}`}>{resource.kind}: {resource.label}</span>)}</div>
    {operation.requestedPermission === undefined ? null : <span>{t('requestedPermission')}: {operation.requestedPermission}</span>}
    <span>{t('workspaceContained')}: {operation.workspaceContained}</span>
    <span>{t('sandboxCovered')}: {operation.sandboxCovered}</span>
    <span>{t('reversible')}: {operation.reversible}</span>
  </details>
}

function DimensionDetails({ dimensions, t }: { readonly dimensions: ReadyAssessment['dimensions']; readonly t: CardProps['t'] }): ReactNode {
  const labels: Array<[keyof typeof dimensions, RiskAdvisorLocaleKey]> = [['risk', 'risk'], ['authorization', 'authorization'], ['necessity', 'necessity'], ['privilege', 'privilege'], ['alternatives', 'alternatives'], ['evidenceQuality', 'evidenceQuality']]
  return <div data-testid="risk-advisor-dimensions">{labels.map(([key, label]) => <Dimension key={key} label={t(label)} dimension={dimensions[key]} />)}</div>
}

function Dimension({ label, dimension }: { readonly label: string; readonly dimension: BrowserDimension }): ReactNode {
  return <details data-testid={`risk-advisor-dimension-${label}`}><summary>{label}: {dimension.verdict}</summary><span>{dimension.source} / {dimension.evidenceQuality}</span>{dimension.reasons.map(reason => <div key={`${reason.code}:${reason.message}`}>{reason.code}: {reason.message}</div>)}</details>
}

function displayUnknown(value: boolean | 'unknown', t: CardProps['t']): string { return value === 'unknown' ? t('unknown') : value ? 'true' : 'false' }

function BoundedList({ title, items, testId }: { readonly title: string; readonly items: readonly string[]; readonly testId: string }): ReactNode {
  if (items.length === 0) return null
  return <div data-testid={testId}><strong>{title}</strong>{items.map(item => <div key={item}>{item}</div>)}</div>
}

function AlternativeList({ alternatives, t }: { readonly alternatives: ReadyAssessment['alternatives']; readonly t: CardProps['t'] }): ReactNode {
  return <div data-testid="risk-advisor-alternatives">{alternatives.map(alternative => <Alternative key={`${alternative.title}:${alternative.description}`} alternative={alternative} t={t} />)}</div>
}

function Alternative({ alternative, t }: { readonly alternative: ReadyAssessment['alternatives'][number]; readonly t: CardProps['t'] }): ReactNode {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copy = async (): Promise<void> => {
    const text = `${alternative.title}\n${alternative.description}`.slice(0, 1200)
    const accepted = await writeClipboard(text)
    setCopyState(accepted ? 'copied' : 'failed')
  }
  return <article data-testid="risk-advisor-alternative"><strong>{alternative.title}</strong><span>{alternative.description}</span><span>{alternative.source === 'MODEL_SUGGESTED' ? t('modelSuggested') : alternative.source} / {alternative.verification === 'UNVERIFIED' ? t('unverified') : alternative.verification}</span><button type="button" onClick={() => { void copy() }}>{copyState === 'copied' ? t('copied') : copyState === 'failed' ? t('copyFailed') : t('copy')}</button></article>
}
