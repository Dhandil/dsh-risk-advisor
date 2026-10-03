import { Context } from '@deepseek-ai/cordis'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { ApprovalComposerProps, ApprovalDetailOwnerProps, PendingApproval } from '@deepseek-ai/dsh-client-ui-approval/client'
import { PendingApproval as PendingApprovalClass } from '../../../deepseek-harness/packages/client/ui-approval/src/client/contract/slots.ts'
import { ApprovalPanel } from '../../../deepseek-harness/packages/client/ui-approval/src/client/ApprovalPanel.tsx'
import { ApprovalCommand } from '../../../deepseek-harness/packages/client/ui-chat/src/client/chat/ApprovalCommand.tsx'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { createSlotRenderer } from '../../../deepseek-harness/packages/client/ui-renderer/src/client/scoped-slots.tsx'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { apply, inject } from '../src/client/index.ts'
import { RiskAdvisorDetail } from '../src/client/RiskAdvisorDetail.tsx'

const t = (pending: PendingApproval): ApprovalComposerProps['t'] => {
  const copy: Record<string, string> = {
    waiting: 'Waiting',
    'detail.aria': 'Approval details',
    escalation: `Tool ${pending.toolName} asks`,
    reject: 'Reject',
    allowOnce: 'Allow once',
  }
  return ((key: string) => copy[key] ?? key) as ApprovalComposerProps['t']
}

const snapshotFor = (callId: ToolCallId, command: string): ChatSnapshot => ({
  nodes: {
    values: () => [{ kind: 'tool-call', data: { root: {
      callId, name: 'bash', argsRaw: JSON.stringify({ command }), turn: 1, step: 1, time: 1, subCalls: [],
    } } }],
  },
} as unknown as ChatSnapshot)

let ctx: Context | undefined

afterEach(async () => {
  cleanup()
  await ctx?.fiber.dispose()
  ctx = undefined
})

describe('Phase 10 actual Client Risk Advisor slot HMR', () => {
  it('mounts and disposes the actual client fiber for three cycles without slot growth', async () => {
    ctx = new Context()
    const root = ctx
    root.provide('connection', { rpc: { call: async () => ({ ok: true, value: { kind: 'NOT_FOUND' } }) } })
    await root.plugin(SlotRegistry).await()
    const slots = root.slots
    const locale = new LocaleRuntime(root)
    root.provide('locale', locale)
    slots.installLocale(locale)
    slots.install(createSlotRenderer())
    slots.register({ name: 'root', children: { 'conversation.approval.detail': { kind: 'single', scope: 'session' } } }, () => null)
    slots.register({ name: 'conversation.approval.detail', priority: 0 }, ApprovalCommand)

    let current = {
      sessionId: 'p10-client-hmr-1' as SessionId,
      callId: 'p10-client-hmr-call-1' as ToolCallId,
      pending: new PendingApprovalClass('p10-client-hmr-1' as SessionId, { toolName: 'bash', callId: 'p10-client-hmr-call-1' as ToolCallId, reason: 'HMR fixture' }),
      snapshot: snapshotFor('p10-client-hmr-call-1' as ToolCallId, 'echo hmr-1'),
    }
    const renderDetail = (_key: string, owner: ApprovalDetailOwnerProps): ReactNode => {
      const entry = slots.entriesOfSlot('conversation.approval.detail')[0]
      if (entry === undefined) return null
      const injected = entry.inject?.(current.sessionId as never) ?? {}
      const Component = entry.component as (props: Record<string, unknown>) => ReactNode
      return <Component {...owner} sessionId={current.sessionId}
        useChat={(selector: (value: ChatSnapshot) => unknown) => selector(current.snapshot)}
        t={locale.bind('risk-advisor.p10')} {...injected} />
    }
    const NativeHost = (): ReactNode => <ApprovalPanel matched={current.pending} renderSlot={renderDetail} t={t(current.pending)} />
    const view = render(<NativeHost />)
    let maxRiskEntries = 0

    for (let cycle = 1; cycle <= 3; cycle += 1) {
      if (cycle > 1) {
        const sessionId = `p10-client-hmr-${cycle}` as SessionId
        const callId = `p10-client-hmr-call-${cycle}` as ToolCallId
        current = {
          sessionId,
          callId,
          pending: new PendingApprovalClass(sessionId, { toolName: 'bash', callId, reason: 'HMR fixture' }),
          snapshot: snapshotFor(callId, `echo hmr-${cycle}`),
        }
        view.rerender(<NativeHost />)
      }

      const fiber = root.plugin({ name: `p10-risk-advisor-client-hmr-${cycle}`, inject: [...inject], apply })
      await act(async () => { await fiber.await() })
      const riskEntries = slots.entries('conversation.approval.detail').filter(entry => entry.component === RiskAdvisorDetail)
      maxRiskEntries = Math.max(maxRiskEntries, riskEntries.length)
      expect(riskEntries).toHaveLength(1)
      expect(slots.entries('conversation.approval.detail')).toHaveLength(2)
      view.rerender(<NativeHost />)
      expect(view.getByTestId('risk-advisor-r1-detail')).toBeTruthy()
      expect(view.getByRole('button', { name: 'Allow once' })).toBeTruthy()

      await act(async () => { await fiber.dispose() })
      expect(slots.entries('conversation.approval.detail')).toHaveLength(1)
      expect(slots.entries('conversation.approval.detail').filter(entry => entry.component === RiskAdvisorDetail)).toHaveLength(0)
      view.rerender(<NativeHost />)
      expect(view.queryByTestId('risk-advisor-r1-detail')).toBeNull()
      const button = view.getByRole('button', { name: 'Allow once' }) as HTMLButtonElement
      expect(button.disabled).toBe(false)
      fireEvent.click(button)
      await expect(current.pending.result).resolves.toBe('allowed-once')
    }

    expect(maxRiskEntries).toBe(1)
    expect(slots.entries('conversation.approval.detail')).toHaveLength(1)
  })
})
