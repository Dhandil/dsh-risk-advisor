import { Component, useEffect, useLayoutEffect, useSyncExternalStore, type ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import { commandForSnapshot } from './command.ts'
import type { PresentationClient } from './presentation-client.ts'
import type { PresentationStore } from './presentation-store.ts'
import type { ApprovalHistoricalContextClient } from './approval-historical-context-client.ts'
import type { ApprovalHistoricalContextStore } from './approval-historical-context-store.ts'
import { APPROVAL_HISTORICAL_CONTEXT_MAX_FRESHNESS_MS } from './approval-historical-context-store.ts'
import { RiskAdvisorCard, UnavailableRiskAdvisorIndicator } from './components/RiskAdvisorCard.tsx'
import css from './ApprovalHistoricalContext.module.css'

type RiskAdvisorDetailProps = PropsRuntime<'conversation.approval.detail'> & PropsLocale<'risk-advisor.r1'> & {
  readonly presentationClient?: PresentationClient
  readonly approvalHistoricalContextClient?: ApprovalHistoricalContextClient
}
interface ErrorBoundaryProps { readonly children: ReactNode; readonly t: RiskAdvisorDetailProps['t'] }
interface ErrorBoundaryState { readonly failed: boolean }

class LocalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false }
  static getDerivedStateFromError(): ErrorBoundaryState { return { failed: true } }
  override render(): ReactNode { return this.state.failed ? <UnavailableRiskAdvisorIndicator t={this.props.t} /> : this.props.children }
}

function CommandPresentation(props: RiskAdvisorDetailProps): ReactNode {
  const command = typeof props.useChat === 'function' ? props.useChat(snapshot => commandForSnapshot(snapshot, props.callId)) : undefined
  return command === undefined ? null : <div data-testid="risk-advisor-r1-command"><span>{props.t('command.label')}</span><code>{command}</code></div>
}

function AdvisoryBody(props: RiskAdvisorDetailProps): ReactNode {
  const client = props.presentationClient
  const callId = typeof props.callId === 'string' && props.callId.length > 0 ? props.callId : undefined
  const store = client === undefined || callId === undefined ? undefined : client.getSource(String(props.sessionId), callId)
  useEffect(() => {
    if (client === undefined || callId === undefined) return
    client.retain(String(props.sessionId), callId)
    return () => { client.release(String(props.sessionId), callId) }
  }, [client, props.sessionId, callId])
  if (callId === undefined) return null
  return <>
    {store === undefined ? <UnavailableRiskAdvisorIndicator t={props.t} /> : <RiskAdvisorCard store={store} t={props.t} />}
    {store !== undefined && props.approvalHistoricalContextClient !== undefined && typeof props.useSessionStatus === 'function' && <OptionalHistoryBoundary>
      <ApprovalHistoricalContextSection
        {...props}
        presentationStore={store}
        approvalHistoricalContextClient={props.approvalHistoricalContextClient}
        callId={callId}
      />
    </OptionalHistoryBoundary>}
  </>
}

class OptionalHistoryBoundary extends Component<{ readonly children: ReactNode }, { readonly failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError(): { readonly failed: boolean } { return { failed: true } }
  override render(): ReactNode { return this.state.failed ? null : this.props.children }
}

type HistoryProps = RiskAdvisorDetailProps & {
  readonly presentationStore: PresentationStore
  readonly approvalHistoricalContextClient: ApprovalHistoricalContextClient
  readonly callId: string
}

function ApprovalHistoricalContextSection(props: HistoryProps): ReactNode {
  const sessionIdentity = props.sessionId
  const sessionId = String(sessionIdentity)
  const presentation = useSyncExternalStore(props.presentationStore.subscribe, props.presentationStore.getSnapshot, props.presentationStore.getSnapshot)
  const store: ApprovalHistoricalContextStore = props.approvalHistoricalContextClient.getSource(sessionId, props.callId)
  const history = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const pending = props.useSessionStatus(snapshot => snapshot.get(sessionIdentity)?.pendingInteraction)
  const approval = readPendingApproval(pending, sessionId, props.callId)
  const clientKey = approval?.key
  const readyBound = presentation.status === 'READY' && presentation.view?.association === 'BOUND'
    && presentation.view.callId === props.callId && presentation.view.sessionId === sessionId

  useEffect(() => {
    props.approvalHistoricalContextClient.retain(sessionId, props.callId)
    return () => { props.approvalHistoricalContextClient.release(sessionId, props.callId) }
  }, [props.approvalHistoricalContextClient, sessionId, props.callId])

  useLayoutEffect(() => {
    const liveKey = approval !== undefined && readyBound ? approval.key : undefined
    props.approvalHistoricalContextClient.setTarget(sessionId, props.callId, liveKey)
    return () => { if (liveKey !== undefined) props.approvalHistoricalContextClient.clearTarget(sessionId, props.callId, liveKey) }
  }, [props.approvalHistoricalContextClient, sessionId, props.callId, approval?.key, readyBound])

  useEffect(() => {
    if (approval === undefined) return
    const result = approval.result
    let active = true
    void result.then(() => {
      if (active) props.approvalHistoricalContextClient.clearTarget(sessionId, props.callId, approval.key)
    }, () => {
      if (active) props.approvalHistoricalContextClient.clearTarget(sessionId, props.callId, approval.key)
    })
    return () => { active = false }
  }, [props.approvalHistoricalContextClient, sessionId, props.callId, approval?.key, approval?.result])

  if (approval === undefined || clientKey === undefined || !readyBound || history.status !== 'VIEW' || history.clientKey !== clientKey) return null
  const view = history.view
  const age = Date.now() - view.observedAt
  if (age < 0 || age >= APPROVAL_HISTORICAL_CONTEXT_MAX_FRESHNESS_MS
    || view.sessionId !== sessionId || view.callId !== props.callId) return null
  return <details className={css.section} data-testid="approval-historical-context">
    <summary className={css.summary}>Verified historical context — advisory only</summary>
    <p className={css.warning}>Host-storage-scoped history; target and Workspace applicability unproven.</p>
    <dl className={css.fields}>
      <dt>Title</dt><dd>{view.historical.title}</dd>
      <dt>Observation</dt><dd>{view.historical.observation}</dd>
      <dt>Context caveat</dt><dd>{view.historical.contextCaveat}</dd>
      <dt>Next check</dt><dd>{view.historical.nextCheck}</dd>
      <dt>Authority notice</dt><dd>{view.historical.authorityNotice}</dd>
    </dl>
  </details>
}

interface PendingApprovalSnapshot {
  readonly key: string
  readonly result: Promise<unknown>
}

function readPendingApproval(value: unknown, sessionId: string, callId: string): PendingApprovalSnapshot | undefined {
  if (value === null || typeof value !== 'object') return undefined
  try {
    const pending = value as { kind?: unknown; key?: unknown; sessionId?: unknown; callId?: unknown; result?: unknown }
    if (pending.kind !== 'approval' || pending.sessionId !== sessionId || pending.callId !== callId
      || typeof pending.key !== 'string' || pending.key.length === 0
      || pending.result === null || typeof pending.result !== 'object' || typeof (pending.result as Promise<unknown>).then !== 'function') return undefined
    return { key: pending.key, result: pending.result as Promise<unknown> }
  } catch { return undefined }
}

export function RiskAdvisorDetail(props: RiskAdvisorDetailProps): ReactNode {
  return <div data-testid="risk-advisor-r1-detail" data-session-id={String(props.sessionId)} data-call-id={props.callId}>
    <CommandPresentation {...props} />
    <LocalErrorBoundary t={props.t}><AdvisoryBody {...props} /></LocalErrorBoundary>
  </div>
}
