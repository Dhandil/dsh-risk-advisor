import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react'
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
const safeHistorySources = new WeakMap<object, { getSnapshot: () => CorrectionHistoricalContextStoreSnapshot; subscribe: (listener: () => void) => () => void }>()

export function renderOnlineCorrectionAdvisory(code: BrowserOnlineCorrectionAdvisoryCode): string {
  return ADVISORY_BODIES[code]
}

export function OnlineCorrectionDock({ sessionId, onlineCorrectionClient, correctionHistoricalContextClient, t }: OnlineCorrectionDockProps) {
  const store = onlineCorrectionClient.getSource(sessionId)
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const historyStore = safeHistorySource(correctionHistoricalContextClient, sessionId)
  const historySnapshot = useSyncExternalStore(historyStore.subscribe, historyStore.getSnapshot, historyStore.getSnapshot)
  const findings = snapshot.status === 'VIEW' ? [...snapshot.view.findings].sort(compareFinding) : []
  const visible = findings.slice(0, 3)
  const newest = visible[0]
  const [historyEnabled, setHistoryEnabled] = useState(false)

  // Key the optional read to the committed current Finding. Rendering never starts the request.
  useLayoutEffect(() => {
    let enabled = false
    if (correctionHistoricalContextClient !== undefined) {
      try {
        const configured = correctionHistoricalContextClient.setFinding(sessionId, newest?.findingId)
        enabled = newest !== undefined && configured !== false
      } catch { enabled = false }
    }
    setHistoryEnabled(enabled)
  }, [correctionHistoricalContextClient, sessionId, newest?.findingId, snapshot.status, historyStore])

  useEffect(() => {
    onlineCorrectionClient.retain(sessionId)
    return () => { onlineCorrectionClient.release(sessionId) }
  }, [onlineCorrectionClient, sessionId])

  useEffect(() => {
    if (correctionHistoricalContextClient === undefined || !historyEnabled) return
    let retained = false
    try { retained = correctionHistoricalContextClient.retain(sessionId) !== false }
    catch { retained = false }
    if (!retained) setHistoryEnabled(false)
    return () => {
      try { correctionHistoricalContextClient.release(sessionId) } catch { /* optional history cannot tear down the base dock */ }
    }
  }, [correctionHistoricalContextClient, sessionId, historyEnabled, historyStore])

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
            {index === 0 && historyEnabled && historySnapshot.status === 'VIEW' && historySnapshot.findingId === finding.findingId
              && historySnapshot.view.kind === 'VIEW' && historySnapshot.view.sessionId === sessionId
              && historySnapshot.view.findingId === finding.findingId && historySnapshot.view.findingKind === finding.kind
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

function safeHistorySource(
  client: CorrectionHistoricalContextClient | undefined,
  sessionId: string,
): { getSnapshot: () => CorrectionHistoricalContextStoreSnapshot; subscribe: (listener: () => void) => () => void } {
  if (client === undefined) return EMPTY_HISTORY_SOURCE
  let source: unknown
  try { source = client.getSource(sessionId) } catch { return EMPTY_HISTORY_SOURCE }
  if (source === null || typeof source !== 'object') return EMPTY_HISTORY_SOURCE
  const cached = safeHistorySources.get(source)
  if (cached !== undefined) return cached
  const record = source as { getSnapshot?: () => unknown; subscribe?: (listener: () => void) => unknown }
  const adapted = Object.freeze({
    getSnapshot: (): CorrectionHistoricalContextStoreSnapshot => {
      try {
        const snapshot = record.getSnapshot?.()
        if (snapshot !== null && typeof snapshot === 'object') {
          const candidate = snapshot as Record<string, unknown>
          if (candidate.status === 'EMPTY') return EMPTY_HISTORY_SNAPSHOT
          if (candidate.status === 'VIEW' && typeof candidate.findingId === 'string' && candidate.view !== null && typeof candidate.view === 'object') {
            const view = candidate.view as Record<string, unknown>
            const historical = view.historical as Record<string, unknown> | undefined
            if (view.kind === 'VIEW' && typeof view.sessionId === 'string' && view.findingId === candidate.findingId
              && (view.findingKind === 'REPEATED_FAILURE_WITHOUT_PROGRESS' || view.findingKind === 'POSTCONDITION_NOT_SATISFIED')
              && typeof view.observedAt === 'number' && Number.isFinite(view.observedAt)
              && historical !== undefined
              && ['title', 'observation', 'contextCaveat', 'nextCheck', 'authorityNotice'].every(key => typeof historical[key] === 'string')) {
              return snapshot as CorrectionHistoricalContextStoreSnapshot
            }
          }
        }
      } catch { /* optional history snapshots fail closed */ }
      return EMPTY_HISTORY_SNAPSHOT
    },
    subscribe: (listener: () => void): (() => void) => {
      try {
        const unsubscribe = record.subscribe?.(listener)
        return typeof unsubscribe === 'function' ? () => { try { (unsubscribe as () => void)() } catch { /* optional history */ } } : () => undefined
      } catch { return () => undefined }
    },
  })
  safeHistorySources.set(source, adapted)
  return adapted
}

function compareFinding(a: BrowserOnlineCorrectionFindingV1, b: BrowserOnlineCorrectionFindingV1): number {
  return b.observedAt - a.observedAt || a.findingId.localeCompare(b.findingId)
}
