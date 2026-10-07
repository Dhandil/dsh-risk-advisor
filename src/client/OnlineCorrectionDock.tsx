import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { BrowserOnlineCorrectionAdvisoryCode, BrowserOnlineCorrectionFindingV1 } from '../online-correction-contract.ts'
import { ONLINE_CORRECTION_NS } from './online-correction-locales.ts'
import type { OnlineCorrectionClient } from './online-correction-client.ts'
import css from './OnlineCorrectionDock.module.css'

export interface OnlineCorrectionDockInjected {
  readonly onlineCorrectionClient: OnlineCorrectionClient
}

export type OnlineCorrectionDockProps = PropsRuntime<'conversation.input.dock'>
  & OnlineCorrectionDockInjected
  & PropsLocale<typeof ONLINE_CORRECTION_NS>

const ADVISORY_BODIES: Readonly<Record<BrowserOnlineCorrectionAdvisoryCode, string>> = Object.freeze({
  STOP_EXACT_RETRY_PATH_V1: 'The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.',
  INSPECT_UNSATISFIED_POSTCONDITION_V1: 'The operation completed, but the verified expected postcondition was not satisfied. Do not treat this execution as goal completion; inspect the target state before continuing.',
})

export function renderOnlineCorrectionAdvisory(code: BrowserOnlineCorrectionAdvisoryCode): string {
  return ADVISORY_BODIES[code]
}

export function OnlineCorrectionDock({ sessionId, onlineCorrectionClient, t }: OnlineCorrectionDockProps) {
  const store = useMemo(() => onlineCorrectionClient.createStore(sessionId), [onlineCorrectionClient, sessionId])
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  useEffect(() => {
    store.start()
    return () => { store.dispose() }
  }, [store])

  if (snapshot.status !== 'VIEW') return null
  const view = snapshot.view
  const findings = [...view.findings].sort(compareFinding)
  const visible = findings.slice(0, 3)
  if (visible.length === 0 && view.reasonCodes.length === 0) return null

  return (
    <div className={css.dock} data-online-correction-dock="" role="status" aria-live="polite">
      <div className={css.panel}>
        <div className={css.title}>{t('title')}</div>
        {visible.map(finding => (
          <div className={css.finding} key={finding.findingId} data-advisory-kind={finding.kind}>
            <span className={css.kind}>{t(finding.kind === 'REPEATED_FAILURE_WITHOUT_PROGRESS' ? 'kind.f1' : 'kind.f2')}</span>
            <span className={css.body}>{renderOnlineCorrectionAdvisory(finding.advisoryCode)}</span>
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
