import { Component, useEffect, type ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { commandForSnapshot } from './command.ts'
import type { PresentationClient } from './presentation-client.ts'
import { RiskAdvisorCard, UnavailableRiskAdvisorIndicator } from './components/RiskAdvisorCard.tsx'

type RiskAdvisorDetailProps = PropsRuntime<'conversation.approval.detail'> & PropsLocale<'risk-advisor.r1'> & { readonly presentationClient?: PresentationClient }
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
  return store === undefined ? <UnavailableRiskAdvisorIndicator t={props.t} /> : <RiskAdvisorCard store={store} t={props.t} />
}

export function RiskAdvisorDetail(props: RiskAdvisorDetailProps): ReactNode {
  return <div data-testid="risk-advisor-r1-detail" data-session-id={String(props.sessionId)} data-call-id={props.callId}>
    <CommandPresentation {...props} />
    <LocalErrorBoundary t={props.t}><AdvisoryBody {...props} /></LocalErrorBoundary>
  </div>
}
