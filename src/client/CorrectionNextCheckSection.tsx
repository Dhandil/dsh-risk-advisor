import { Component, useEffect, useLayoutEffect, useState, useSyncExternalStore } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import type { CorrectionNextCheckCodeV1 } from '../correction-next-check-contract.ts'
import type { BrowserOnlineCorrectionFindingV1 } from '../online-correction-contract.ts'
import type { OnlineCorrectionLocaleKey } from './online-correction-locales.ts'
import type { CorrectionNextCheckClient } from './correction-next-check-client.ts'
import type { CorrectionNextCheckStoreSnapshot } from './correction-next-check-store.ts'
import css from './OnlineCorrectionDock.module.css'

export interface CorrectionNextCheckSectionProps {
  readonly client?: CorrectionNextCheckClient | undefined
  readonly sessionId: string
  readonly finding: BrowserOnlineCorrectionFindingV1
  readonly t: (key: OnlineCorrectionLocaleKey) => string
}

const EMPTY_SNAPSHOT: CorrectionNextCheckStoreSnapshot = Object.freeze({ status: 'EMPTY' })
const EMPTY_SOURCE = Object.freeze({
  getSnapshot: () => EMPTY_SNAPSHOT,
  subscribe: (_listener: () => void) => () => undefined,
  isHealthy: () => false,
})
interface SafeSource {
  readonly getSnapshot: () => CorrectionNextCheckStoreSnapshot
  readonly subscribe: (listener: () => void) => () => void
  readonly isHealthy: () => boolean
}
const safeSources = new WeakMap<object, SafeSource>()

const CHECK_TEXT: Readonly<Record<CorrectionNextCheckCodeV1, OnlineCorrectionLocaleKey>> = Object.freeze({
  REVIEW_EXACT_RETRY_PREREQUISITES_V1: 'nextCheck.reviewRetry',
  INSPECT_WRITTEN_CONTENT_V1: 'nextCheck.inspectWrite',
  INSPECT_EDIT_REPLACEMENT_V1: 'nextCheck.inspectEdit',
  CHECK_DIRECTORY_POSTSTATE_V1: 'nextCheck.checkDirectory',
  CHECK_COPY_DESTINATION_V1: 'nextCheck.checkCopy',
  CHECK_ACTIVE_GIT_BRANCH_V1: 'nextCheck.checkBranch',
  CHECK_DEPENDENCY_RESOLUTION_V1: 'nextCheck.checkDependency',
})

/** The optional subtree owns its own React error boundary. */
export class CorrectionNextCheckBoundary extends Component<{ readonly children?: ReactNode }, { readonly failed: boolean }> {
  override state = { failed: false }

  static getDerivedStateFromError(): { readonly failed: boolean } { return { failed: true } }
  override componentDidCatch(_error: Error, _info: ErrorInfo): void { /* do not log live execution evidence */ }

  override render(): ReactNode { return this.state.failed ? null : this.props.children }
}

export function CorrectionNextCheckSection({ client, sessionId, finding, t }: CorrectionNextCheckSectionProps) {
  const source = safeSource(client, sessionId)
  const snapshot = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot)
  const [retained, setRetained] = useState(false)
  const [configured, setConfigured] = useState(false)

  useLayoutEffect(() => {
    let ready = false
    if (client !== undefined) {
      try { ready = client.setFinding(sessionId, finding.findingId) === true && source.isHealthy() }
      catch { ready = false }
    }
    setConfigured(ready)
  }, [client, sessionId, finding.findingId, source])

  useEffect(() => {
    if (client === undefined) { setRetained(false); return }
    let acquired = false
    try { acquired = client.retain(sessionId) }
    catch { acquired = false }
    setRetained(acquired)
    return () => {
      if (acquired) {
        try { client.release(sessionId) } catch { /* base advisory remains independent */ }
      }
    }
  }, [client, sessionId, source])

  if (!configured || !retained || !source.isHealthy() || snapshot.status !== 'VIEW' || snapshot.findingId !== finding.findingId) return null
  const view = snapshot.view
  if (view.kind !== 'VIEW' || view.sessionId !== sessionId || view.findingId !== finding.findingId
    || view.findingKind !== finding.kind) return null

  const evidenceKey: OnlineCorrectionLocaleKey = view.evidenceCode === 'F1_CONTIGUOUS_RETRY_FINDING_V1'
    ? 'nextCheck.evidence.f1' : 'nextCheck.evidence.f2'
  return (
    <details className={css.nextCheck} data-correction-next-check="">
      <summary>{t('nextCheck.label')}</summary>
      <div className={css.nextCheckWarning}>{t('nextCheck.warning')}</div>
      <div className={css.nextCheckEvidence}>{t(evidenceKey)}</div>
      <div className={css.nextCheckBody}>{t(CHECK_TEXT[view.checkCode])}</div>
    </details>
  )
}

function safeSource(client: CorrectionNextCheckClient | undefined, sessionId: string) {
  if (client === undefined) return EMPTY_SOURCE
  let source: unknown
  try { source = client.getSource(sessionId) } catch { return EMPTY_SOURCE }
  if (source === null || typeof source !== 'object') return EMPTY_SOURCE
  const cached = safeSources.get(source)
  if (cached !== undefined) return cached
  const record = source as { getSnapshot?: () => unknown; subscribe?: (listener: () => void) => unknown }
  let healthy = typeof record.getSnapshot === 'function' && typeof record.subscribe === 'function'
  const failClosed = (listener?: () => void): void => {
    healthy = false
    try { listener?.() } catch { /* React owns no optional authority */ }
  }
  const adapted = Object.freeze({
    isHealthy: () => healthy,
    getSnapshot: (): CorrectionNextCheckStoreSnapshot => {
      if (!healthy) return EMPTY_SNAPSHOT
      try {
        const candidate = record.getSnapshot?.()
        if (candidate !== null && typeof candidate === 'object') {
          const value = candidate as Record<string, unknown>
          if (value.status === 'EMPTY') return EMPTY_SNAPSHOT
          if (value.status === 'VIEW' && typeof value.findingId === 'string' && value.view !== null && typeof value.view === 'object') {
            const view = value.view as Record<string, unknown>
            if (view.kind === 'VIEW' && view.findingId === value.findingId && typeof view.sessionId === 'string'
              && (view.findingKind === 'REPEATED_FAILURE_WITHOUT_PROGRESS' || view.findingKind === 'POSTCONDITION_NOT_SATISFIED')
              && typeof view.checkCode === 'string' && typeof view.evidenceCode === 'string'
              && typeof view.observedAt === 'number' && Number.isSafeInteger(view.observedAt)) {
              return candidate as CorrectionNextCheckStoreSnapshot
            }
          }
        }
      } catch { failClosed(); return EMPTY_SNAPSHOT }
      healthy = false
      return EMPTY_SNAPSHOT
    },
    subscribe: (listener: () => void): (() => void) => {
      try {
        const unsubscribe = record.subscribe?.(listener)
        if (typeof unsubscribe !== 'function') { failClosed(listener); return () => undefined }
        return () => { try { (unsubscribe as () => void)() } catch { failClosed() } }
      } catch { failClosed(listener); return () => undefined }
    },
  }) satisfies SafeSource
  safeSources.set(source, adapted)
  return adapted
}
