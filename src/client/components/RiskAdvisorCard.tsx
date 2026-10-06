import { useState, type ReactNode } from 'react'
import { useSyncExternalStore } from 'react'
import { Button, Modal, StateDot, Tag, writeClipboard, type StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { RiskAdvisorLocaleKey } from '../locales.ts'
import type { BrowserDimension, RiskAdvisorBridgeViewV2, RiskAdvisorBridgeViewV3, RiskAdvisorBridgeViewV4 } from '../../bridge-contract.ts'
import type { PresentationStore } from '../presentation-store.ts'
import css from './RiskAdvisorCard.module.css'

type CardProps = PropsLocale<'risk-advisor.r1'> & { readonly store: PresentationStore }
type RiskAdvisorView = RiskAdvisorBridgeViewV2 | RiskAdvisorBridgeViewV3 | RiskAdvisorBridgeViewV4
type ReadyAssessment = NonNullable<RiskAdvisorView['assessment']>

export function RiskAdvisorCard({ store, t }: CardProps): ReactNode {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  if (snapshot.status === 'ANALYZING') return <CompactStatus status="ANALYZING" label={t('state.analyzing')} dot="ongoing" t={t} />
  if (snapshot.status === 'CANCELLED') return <CompactStatus status="CANCELLED" label={t('state.cancelled')} dot="idle" t={t} />
  if (snapshot.status === 'UNAVAILABLE' || snapshot.view?.status !== 'ready' || snapshot.view.assessment === undefined || snapshot.view.operation === undefined || snapshot.view.failureContext === undefined) {
    return <CompactStatus status="UNAVAILABLE" label={t('state.unavailable')} dot="idle" t={t} />
  }
  return <ReadyIndicator view={snapshot.view} t={t} />
}

export function UnavailableRiskAdvisorIndicator({ t }: { readonly t: CardProps['t'] }): ReactNode {
  return <CompactStatus status="UNAVAILABLE" label={t('state.unavailable')} dot="idle" t={t} />
}

function CompactStatus({ status, label, dot, t }: {
  readonly status: 'ANALYZING' | 'UNAVAILABLE' | 'CANCELLED'
  readonly label: string
  readonly dot: StateDotState
  readonly t: CardProps['t']
}): ReactNode {
  return <div className={css.riskAdvisor__row} data-testid="risk-advisor-indicator" data-ra-status={status} role="status" aria-label={`${t('advisory.title')}: ${label}`}>
    <StateDot state={dot} />
    <span className={css.riskAdvisor__provenance}>{t('advisory.title')}</span>
    <span className={css.riskAdvisor__separator} aria-hidden="true">·</span>
    <span className={css.riskAdvisor__summary}>{label}</span>
  </div>
}

function ReadyIndicator({ view, t }: { readonly view: RiskAdvisorView; readonly t: CardProps['t'] }): ReactNode {
  const assessment = view.assessment!
  const { hazardLevel, recommendation, primaryReasonCodes } = assessment.aggregate
  const [detailsOpen, setDetailsOpen] = useState(false)
  const primaryReason = primaryReasonCodes[0]
  const summary = [
    t(hazardLocaleKey(hazardLevel)),
    t(recommendationLocaleKey(recommendation)),
    ...(primaryReason === undefined ? [] : [t(reasonLocaleKey(primaryReason))]),
  ].join(' · ')
  const caveats = assessmentCaveats(view)
  const requestedPermission = view.operation!.requestedPermission
  const requestedDangerousAccess = requestedPermission === 'danger-full-access'
  const accessibleSummary = [
    t('advisory.title'), summary,
    ...(requestedPermission === undefined ? [] : [t('permission.requested'), requestedPermission]),
    ...caveats.map(caveat => t(caveat === 'PARTIAL' ? 'status.partial' : 'status.degraded')),
  ].join('. ')

  return <>
    <div className={css.riskAdvisor__row} data-testid="risk-advisor-indicator" data-ra-status="READY" role="group" aria-label={accessibleSummary}>
      <StateDot state={severityState(hazardLevel, recommendation)} />
      <span className={css.riskAdvisor__provenance}>{t('advisory.title')}</span>
      <span className={css.riskAdvisor__separator} aria-hidden="true">·</span>
      <span className={css.riskAdvisor__summary} data-testid="risk-advisor-row-summary" title={summary}>{summary}</span>
      {requestedPermission === undefined ? null : <Tag tone={requestedDangerousAccess ? 'danger' : 'neutral'} className={css.riskAdvisor__tag}>
        <span className={css.riskAdvisor__tagText} title={`${t('permission.requested')}: ${requestedPermission}`}>{requestedPermission}</span>
      </Tag>}
      {caveats.map(caveat => <Tag tone="warning" className={css.riskAdvisor__tag} key={caveat}>
        {t(caveat === 'PARTIAL' ? 'status.partial' : 'status.degraded')}
      </Tag>)}
      <Button type="button" variant="ghost" size="sm" className={css.riskAdvisor__detailsButton} aria-haspopup="dialog" aria-expanded={detailsOpen} onClick={() => { setDetailsOpen(true) }}>
        {t('details.open')}
      </Button>
    </div>
    <Modal
      open={detailsOpen}
      onClose={() => { setDetailsOpen(false) }}
      title={t('details.title')}
      closeLabel={t('details.close')}
      description={t('advisory.disclaimer')}
      className={css.riskAdvisor__modalDialog ?? ''}
      contentClassName={css.riskAdvisor__modalContent ?? ''}
    >
      <RiskAdvisorAnalysis view={view} t={t} />
    </Modal>
  </>
}

function severityState(hazard: string, recommendation: string): StateDotState {
  if (hazard === 'CRITICAL' || recommendation === 'REJECT_RECOMMENDED') return 'error'
  if (hazard === 'LOW' && recommendation === 'APPROVE') return 'done'
  if (hazard === 'HIGH' || hazard === 'MEDIUM' || recommendation === 'APPROVE_WITH_CAUTION' || recommendation === 'NEED_MORE_INFORMATION' || recommendation === 'PREFER_SAFER_ALTERNATIVE') return 'warning'
  // UNKNOWN and future values stay visibly unresolved rather than healthy.
  return 'warning'
}

function hazardLocaleKey(hazard: string): RiskAdvisorLocaleKey {
  switch (hazard) {
    case 'LOW': return 'hazard.low'
    case 'MEDIUM': return 'hazard.medium'
    case 'HIGH': return 'hazard.high'
    case 'CRITICAL': return 'hazard.critical'
    default: return 'hazard.unknown'
  }
}

function recommendationLocaleKey(recommendation: string): RiskAdvisorLocaleKey {
  switch (recommendation) {
    case 'APPROVE': return 'recommendation.approve'
    case 'APPROVE_WITH_CAUTION': return 'recommendation.caution'
    case 'PREFER_SAFER_ALTERNATIVE': return 'recommendation.saferAlternative'
    case 'REJECT_RECOMMENDED': return 'recommendation.reject'
    default: return 'recommendation.moreInformation'
  }
}

const REASON_LABELS: Readonly<Record<string, RiskAdvisorLocaleKey>> = {
  AUTH_EXPLICIT_DENIAL: 'reason.explicitDenial',
  AUTH_SCOPE_VIOLATION: 'reason.scopeViolation',
  INSUFFICIENT_CRITICAL_EVIDENCE: 'reason.insufficientEvidence',
  VERIFIED_SAFER_ALTERNATIVE: 'reason.saferAlternative',
  EXCESSIVE_PRIVILEGE_NOT_NECESSARY: 'reason.excessivePrivilegeNotNecessary',
  EXCESSIVE_PRIVILEGE_UNJUSTIFIED: 'reason.excessivePrivilegeUnjustified',
  PRIVILEGE_SCOPE_EXCESSIVE: 'reason.privilegeScopeExcessive',
  CRITICAL_HAZARD_NOT_NECESSARY: 'reason.criticalNotNecessary',
  CRITICAL_BUT_JUSTIFIED: 'reason.criticalJustified',
  HIGH_HAZARD_NOT_NECESSARY: 'reason.highNotNecessary',
  HIGH_HAZARD_UNRESOLVED_CONTEXT: 'reason.highUnresolved',
  HIGH_HAZARD_JUSTIFIED: 'reason.highJustified',
  MEDIUM_HAZARD: 'reason.mediumHazard',
  LOW_HAZARD: 'reason.lowHazard',
  UNKNOWN_FALLBACK: 'reason.unknownFallback',
}

function reasonLocaleKey(code: string): RiskAdvisorLocaleKey {
  return REASON_LABELS[code] ?? 'reason.unknown'
}

function assessmentCaveats(view: RiskAdvisorView): Array<'PARTIAL' | 'DEGRADED'> {
  const assessment = view.assessment!
  const caveats: Array<'PARTIAL' | 'DEGRADED'> = []
  if (assessment.status === 'PARTIAL' || ((view.schemaVersion === 3 || view.schemaVersion === 4) && view.evidence?.status === 'PARTIAL')) caveats.push('PARTIAL')
  if (assessment.status === 'DEGRADED') caveats.push('DEGRADED')
  return caveats
}

function RiskAdvisorAnalysis({ view, t }: { readonly view: RiskAdvisorView; readonly t: CardProps['t'] }): ReactNode {
  const assessment = view.assessment!
  const operation = view.operation!
  const failureContext = view.failureContext!
  return <div className={css.riskAdvisor__analysis} data-testid="risk-advisor-analysis">
    <section data-testid="risk-advisor-operation">
      <h3>{t('operation.title')}</h3>
      <strong>{operation.title}</strong>
      <p>{operation.summary}</p>
      <div data-testid="risk-advisor-operation-details">
        <strong>{t('resources')}</strong>
        {operation.resources.map(resource => <span data-testid="risk-advisor-resource" key={`${resource.kind}:${resource.label}`}>{resource.kind}: {resource.label}</span>)}
        {operation.requestedPermission === undefined ? null : <span>{t('requestedPermission')}: {operation.requestedPermission}</span>}
        <span>{t('workspaceContained')}: {operation.workspaceContained}</span>
        <span>{t('sandboxCovered')}: {operation.sandboxCovered}</span>
        <span>{t('reversible')}: {operation.reversible}</span>
      </div>
    </section>
    <section data-testid="risk-advisor-summary">
      <h3>{t('aggregate.title')}</h3>
      <span>{t('risk')}: {assessment.aggregate.hazardLevel}</span>
      <span>{t('recommendation')}: {assessment.aggregate.recommendation}</span>
      <span>{t('primaryReason')}: {assessment.aggregate.primaryReasonCodes.join(', ') || t('reason.none')}</span>
      <span data-testid="risk-advisor-assessment-status">{t('assessment.status')}: {assessment.status.toUpperCase()}</span>
      {view.reasonCodes.length === 0 ? null : <span data-testid="risk-advisor-bridge-reasons">{t('bridge.reasons')}: {view.reasonCodes.join(', ')}</span>}
    </section>
    <DimensionDetails dimensions={assessment.dimensions} t={t} />
    <BoundedList title={t('findings')} items={assessment.findings.map(item => `${item.code}: ${item.title}: ${item.detail} (${item.dimension}, ${item.severity}, ${item.strength})`)} testId="risk-advisor-findings" />
    <BoundedList title={t('uncertainties')} items={assessment.uncertainties.map(item => `${item.code} (${item.impact}): ${item.description}${item.resolutionHint === undefined ? '' : ` — ${item.resolutionHint}`}`)} testId="risk-advisor-uncertainties" />
    <div data-testid="risk-advisor-source">{assessment.judgeAssisted ? t('judgeAssisted') : t('rulesOnly')}</div>
    <section data-testid="risk-advisor-failure-context">
      <h3>{t('failureContext')}</h3>
      <span>{t('failureDetails')}</span>
      <span>{failureContext.retryCount}/{failureContext.recentFailureCount}</span>
      <span>{t('sameRootCause')}: {displayUnknown(failureContext.sameRootCause, t)}</span>
      <span>{t('permissionEscalation')}: {displayUnknown(failureContext.permissionEscalation, t)}</span>
      <span>{t('truncated')}: {failureContext.truncated ? 'true' : 'false'}</span>
    </section>
    <section data-testid="risk-advisor-evidence">
      <h3>{t('evidence.title')}</h3>
      <span>{t('ledgerHealth')}: {assessment.evidence.ledgerHealth}</span>
      <span>{t('evidenceQuality')}: {assessment.dimensions.evidenceQuality.verdict} / {assessment.dimensions.evidenceQuality.evidenceQuality}</span>
      {(view.schemaVersion === 3 || view.schemaVersion === 4) && view.evidence !== undefined ? <span data-testid="risk-advisor-evidence-summary">{view.evidence.status}: {view.evidence.itemCount}</span> : null}
      {(view.schemaVersion === 3 || view.schemaVersion === 4) && view.evidence !== undefined ? <span data-testid="risk-advisor-toctou-disclosure">{t('preExecutionEvidence')}</span> : null}
    </section>
    <AlternativeList alternatives={assessment.alternatives} t={t} />
  </div>
}

function DimensionDetails({ dimensions, t }: { readonly dimensions: ReadyAssessment['dimensions']; readonly t: CardProps['t'] }): ReactNode {
  const labels: Array<[keyof typeof dimensions, RiskAdvisorLocaleKey]> = [['risk', 'risk'], ['authorization', 'authorization'], ['necessity', 'necessity'], ['privilege', 'privilege'], ['alternatives', 'alternatives'], ['evidenceQuality', 'evidenceQuality']]
  return <section data-testid="risk-advisor-dimensions">
    <h3>{t('dimensions.title')}</h3>
    {labels.map(([key, label]) => <Dimension key={key} label={t(label)} dimension={dimensions[key]} />)}
  </section>
}

function Dimension({ label, dimension }: { readonly label: string; readonly dimension: BrowserDimension }): ReactNode {
  return <details data-testid={`risk-advisor-dimension-${label}`}>
    <summary>{label}: {dimension.verdict}</summary>
    <span>{dimension.source} / {dimension.evidenceQuality}</span>
    {dimension.reasons.map(reason => <div key={`${reason.code}:${reason.message}`}>{reason.code}: {reason.message}</div>)}
  </details>
}

function displayUnknown(value: boolean | 'unknown', t: CardProps['t']): string { return value === 'unknown' ? t('unknown') : value ? 'true' : 'false' }

function BoundedList({ title, items, testId }: { readonly title: string; readonly items: readonly string[]; readonly testId: string }): ReactNode {
  if (items.length === 0) return null
  return <section data-testid={testId}><h3>{title}</h3>{items.map(item => <div key={item}>{item}</div>)}</section>
}

function AlternativeList({ alternatives, t }: { readonly alternatives: ReadyAssessment['alternatives']; readonly t: CardProps['t'] }): ReactNode {
  if (alternatives.length === 0) return null
  return <section data-testid="risk-advisor-alternatives"><h3>{t('alternatives')}</h3>
    {alternatives.map(alternative => <Alternative key={`${alternative.title}:${alternative.description}`} alternative={alternative} t={t} />)}
  </section>
}

function Alternative({ alternative, t }: { readonly alternative: ReadyAssessment['alternatives'][number]; readonly t: CardProps['t'] }): ReactNode {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copy = async (): Promise<void> => {
    const text = `${alternative.title}\n${alternative.description}`.slice(0, 1200)
    const accepted = await writeClipboard(text)
    setCopyState(accepted ? 'copied' : 'failed')
  }
  return <article data-testid="risk-advisor-alternative">
    <strong>{alternative.title}</strong>
    <span>{alternative.description}</span>
    <span>{alternative.source === 'MODEL_SUGGESTED' ? t('modelSuggested') : alternative.source} / {alternative.verification === 'UNVERIFIED' ? t('unverified') : alternative.verification}</span>
    <Button type="button" variant="ghost" size="sm" onClick={() => { void copy() }}>{copyState === 'copied' ? t('copied') : copyState === 'failed' ? t('copyFailed') : t('copy')}</Button>
  </article>
}
