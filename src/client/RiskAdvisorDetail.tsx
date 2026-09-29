import { Component, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { R1FixtureSession, R1FixtureSnapshot } from './fixture-store.ts'
import type { R1FixtureKey } from './locales.ts'
import { commandForSnapshot } from './command.ts'

type RiskAdvisorDetailProps = PropsRuntime<'conversation.approval.detail'>
  & PropsLocale<'risk-advisor.r1'>
  & { fixture: R1FixtureSession }

interface ErrorBoundaryProps { readonly children: ReactNode; readonly t: RiskAdvisorDetailProps['t'] }
interface ErrorBoundaryState { readonly failed: boolean }

// React's class boundary is written explicitly to keep a fixture render fault local to this cell.
class LocalErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  override render(): ReactNode {
    if (this.state.failed) return <UnavailableFixture t={this.props.t} />
    return this.props.children
  }
}

function stateLabel(t: RiskAdvisorDetailProps['t'], state: R1FixtureSnapshot['state']): string {
  const key: R1FixtureKey = state === 'PENDING'
    ? 'state.pending'
    : state === 'READY_SAMPLE' ? 'state.readySample' : 'state.unavailable'
  return t(key)
}

function FixtureBody(props: RiskAdvisorDetailProps): ReactNode {
  const snapshot = useSyncExternalStore(
    props.fixture.subscribe,
    props.fixture.getSnapshot,
    props.fixture.getSnapshot,
  )
  return <div data-testid="risk-advisor-r1-fixture" data-ra-fixture-state={snapshot.state}>
    <strong>{props.t('title')}</strong>
    <span>{props.t('disclaimer')} / {stateLabel(props.t, snapshot.state)}</span>
  </div>
}

function CommandPresentation(props: RiskAdvisorDetailProps): ReactNode {
  // A real Harness session always supplies useChat. Keeping the runtime guard
  // makes the isolated fixture safe in a minimal slot harness as well.
  const command = typeof props.useChat === 'function'
    ? props.useChat(snapshot => commandForSnapshot(snapshot, props.callId))
    : undefined
  return command === undefined ? null : <div data-testid="risk-advisor-r1-command">
    <span>{props.t('command.label')}</span>
    <code>{command}</code>
  </div>
}

function UnavailableFixture(props: { readonly t: RiskAdvisorDetailProps['t'] }): ReactNode {
  return <div data-testid="risk-advisor-r1-fixture" data-ra-fixture-state="UNAVAILABLE">
    <strong>{props.t('title')}</strong>
    <span data-testid="risk-advisor-r1-error">{props.t('disclaimer')} / {props.t('state.unavailable')}</span>
  </div>
}

export function RiskAdvisorDetail(props: RiskAdvisorDetailProps): ReactNode {
  return <div data-testid="risk-advisor-r1-detail" data-session-id={String(props.sessionId)} data-call-id={props.callId}>
    <CommandPresentation {...props} />
    <LocalErrorBoundary t={props.t}>
      <FixtureBody {...props} />
    </LocalErrorBoundary>
  </div>
}
