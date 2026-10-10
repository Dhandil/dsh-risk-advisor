import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { BrowserOnlineCorrectionAdvisoryCode, BrowserOnlineCorrectionFindingV1 } from '../online-correction-contract.ts'
import { ONLINE_CORRECTION_NS } from './online-correction-locales.ts'
import type { OnlineCorrectionClient } from './online-correction-client.ts'
import type { CorrectionHistoricalContextClient } from './correction-historical-context-client.ts'
import type { CorrectionHistoricalContextStoreSnapshot } from './correction-historical-context-store.ts'
import css from './OnlineCorrectionDock.module.css'

export interface OnlineCorrectionDockInjected {
  readonly onlineCorrectionClient: OnlineCorrectionClient
  readonly correctionHistoricalContextClient?: CorrectionHistoricalContextClient
}

export type OnlineCorrectionDockProps = PropsRuntime<'conversation.input.dock'>
  & OnlineCorrectionDockInjected
  & PropsLocale<typeof ONLINE_CORRECTION_NS>

const ADVISORY_BODIES: Readonly<Record<BrowserOnlineCorrectionAdvisoryCode, string>> = Object.freeze({
  STOP_EXACT_RETRY_PATH_V1: 'The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.',
  INSPECT_UNSATISFIED_POSTCONDITION_V1: 'The operation completed, but the verified expected postcondition was not satisfied. Do not treat this execution as goal completion; inspect the target state before continuing.',
})
const EMPTY_HISTORY_SNAPSHOT: CorrectionHistoricalContextStoreSnapshot = Object.freeze({ status: 'EMPTY' })
const EMPTY_HISTORY_SOURCE = Object.freeze({
  getSnapshot: () => EMPTY_HISTORY_SNAPSHOT,
  subscribe: (_listener: () => void) => () => undefined,
})

export function renderOnlineCorrectionAdvisory(code: BrowserOnlineCorrectionAdvisoryCode): string {
  return ADVISORY_BODIES[code]
}

export function OnlineCorrectionDock({ sessionId, onlineCorrectionClient, correctionHistoricalContextClient, t }: OnlineCorrectionDockProps) {
  const store = onlineCorrectionClient.getSource(sessionId)
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const historyStore = correctionHistoricalContextClient?.getSource(sessionId) ?? EMPTY_HISTORY_SOURCE
  const historySnapshot = useSyncExternalStore(historyStore.subscribe, historyStore.getSnapshot, historyStore.getSnapshot)
  const findings = snapshot.status === 'VIEW' ? [...snapshot.view.findings].sort(compareFinding) : []
  const visible = findings.slice(0, 3)
  const newest = visible[0]

  // Key the optional read to the committed current Finding. Rendering never starts the request.
  useLayoutEffect(() => {
    correctionHistoricalContextClient?.setFinding(sessionId, newest?.findingId)
  }, [correctionHistoricalContextClient, sessionId, newest?.findingId, snapshot.status])

  useEffect(() => {
    onlineCorrectionClient.retain(sessionId)
    return () => { onlineCorrectionClient.release(sessionId) }
  }, [onlineCorrectionClient, sessionId])

  useEffect(() => {
    if (correctionHistoricalContextClient === undefined) return
    correctionHistoricalContextClient.retain(sessionId)
    return () => { correctionHistoricalContextClient.release(sessionId) }
  }, [correctionHistoricalContextClient, sessionId])

  if (snapshot.status !== 'VIEW') return null
  const view = snapshot.view
  if (visible.length === 0 && view.reasonCodes.length === 0) return null

  return (
    <div className={css.dock} data-online-correction-dock="" role="status" aria-live="polite">
      <div className={css.panel}>
        <div className={css.title}>{t('title')}</div>
        {visible.map((finding, index) => (
          <div className={css.finding} key={finding.findingId} data-advisory-kind={finding.kind}>
            <span className={css.kind}>{t(finding.kind === 'REPEATED_FAILURE_WITHOUT_PROGRESS' ? 'kind.f1' : 'kind.f2')}</span>
            <span className={css.body}>{renderOnlineCorrectionAdvisory(finding.advisoryCode)}</span>
            {index === 0 && historySnapshot.status === 'VIEW' && historySnapshot.findingId === finding.findingId
              && historySnapshot.view.kind === 'VIEW' && historySnapshot.view.findingKind === finding.kind
              ? <details className={css.history} data-correction-history="">
                  <summary>{t('history.label')}</summary>
                  <div className={css.historyWarning}>{t('history.warning')}</div>
                  <dl className={css.historyFields}>
                    <dt>{t('history.title')}</dt><dd>{historySnapshot.view.historical.title}</dd>
                    <dt>{t('history.observation')}</dt><dd>{historySnapshot.view.historical.observation}</dd>
                    <dt>{t('history.caveat')}</dt><dd>{historySnapshot.view.historical.contextCaveat}</dd>
                    <dt>{t('history.nextCheck')}</dt><dd>{historySnapshot.view.historical.nextCheck}</dd>
                    <dt>{t('history.authority')}</dt><dd>{historySnapshot.view.historical.authorityNotice}</dd>
                  </dl>
                </details>
              : null}
          </div>
        ))}
        {findings.length > 3 && <div className={css.muted}>{t('overflow', { n: findings.length - 3 })}</div>}
        {view.reasonCodes.length > 0 && <div className={css.muted}>{t('degraded')}</div>}
      </div>
    </div>
  )
}

function compareFinding(a: BrowserOnlineCorrectionFindingV1, b: BrowserOnlineCorrectionFindingV1): number {
  return b.observedAt - a.observedAt || a.findingId.localeCompare(b.findingId)
}
