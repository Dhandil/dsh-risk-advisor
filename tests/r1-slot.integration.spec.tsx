import { Context } from '@deepseek-ai/cordis'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { ApprovalComposerProps, ApprovalDetailOwnerProps, PendingApproval } from '@deepseek-ai/dsh-client-ui-approval/client'
import { PendingApproval as PendingApprovalClass } from '../../../deepseek-harness/packages/client/ui-approval/src/client/contract/slots.ts'
import { ApprovalPanel } from '../../../deepseek-harness/packages/client/ui-approval/src/client/ApprovalPanel.tsx'
import { ApprovalCommand } from '../../../deepseek-harness/packages/client/ui-chat/src/client/chat/ApprovalCommand.tsx'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import { commandForSnapshot } from '../src/client/command.ts'
import { apply, inject } from '../src/client/index.ts'

let ctx: Context | undefined

afterEach(async () => {
  cleanup()
  await ctx?.fiber.dispose()
  ctx = undefined
})

function panelCopy(pending: PendingApproval): ApprovalComposerProps['t'] {
  const copy: Record<string, string> = {
    waiting: 'Waiting',
    'detail.aria': 'Approval details',
    escalation: `Tool ${pending.toolName} asks`,
    reject: 'Reject',
    allowOnce: 'Allow once',
  }
  return ((key: string) => copy[key] ?? key) as ApprovalComposerProps['t']
}

const chatSnapshot = {
  nodes: {
    values: () => [{
      kind: 'tool-call',
      data: { root: {
        callId: 'call-1' as ToolCallId,
        name: 'bash',
        argsRaw: JSON.stringify({ command: 'echo native' }),
        turn: 1,
        step: 1,
        time: 1,
        subCalls: [],
      } },
    }],
  },
} as unknown as ChatSnapshot

describe('R1 real SlotCore + Native ApprovalPanel integration', () => {
  it('shadows the single detail cell, composes the fixture, and restores the slot on dispose', async () => {
    ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    const slots = ctx.slots
    const locale = new LocaleRuntime(ctx)
    ctx.provide('locale', locale)

    const sessionId = 'session-1' as SessionId
    const callId = 'call-1' as ToolCallId
    const pending = new PendingApprovalClass(sessionId, {
      toolName: 'bash',
      callId,
      reason: 'fixture integration',
    })

    const declareRoot = slots.register({
      name: 'root',
      children: { 'conversation.approval.detail': { kind: 'single', scope: 'session' } },
    }, () => null)
    const nativeEntry = slots.register({
      name: 'conversation.approval.detail',
      priority: 0,
    }, ApprovalCommand)

    const renderDetail = (_key: string, owner: ApprovalDetailOwnerProps): ReactNode => {
      const entry = slots.entriesOfSlot('conversation.approval.detail')[0]
      if (entry === undefined) return null
      const injected = entry.inject?.(sessionId as never) ?? {}
      const Component = entry.component as (props: Record<string, unknown>) => ReactNode
      return <Component
        {...owner}
        sessionId={sessionId}
        useChat={(selector: (snapshot: ChatSnapshot) => unknown) => selector(chatSnapshot)}
        t={locale.bind('risk-advisor.r1')}
        {...injected}
      />
    }
    const NativeHost = (): ReactNode => <ApprovalPanel
      matched={pending}
      renderSlot={renderDetail}
      t={panelCopy(pending)}
    />

    expect(commandForSnapshot(chatSnapshot, callId)).toBe('echo native')
    const direct = render(<ApprovalCommand
      callId={callId}
      useChat={(selector) => selector(chatSnapshot)}
    />)
    expect(direct.container.textContent).toBe('echo native')
    direct.unmount()
    const view = render(<NativeHost />)
    expect(screen.getByText('echo native')).toBeTruthy()
    expect(slots.entriesOfSlot('conversation.approval.detail')[0].component).toBe(ApprovalCommand)

    const fiber = ctx.plugin({ inject: [...inject], apply })
    await fiber.await()
    expect(slots.entries('conversation.approval.detail')).toHaveLength(2)
    expect(slots.entriesOfSlot('conversation.approval.detail')[0].component).not.toBe(ApprovalCommand)
    view.rerender(<NativeHost />)
    expect(screen.getByTestId('risk-advisor-r1-detail')).toBeTruthy()
    expect(screen.getByTestId('risk-advisor-r1-fixture').getAttribute('data-ra-fixture-state')).toBe('PENDING')
    expect((screen.getByRole('button', { name: 'Reject' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'Allow once' }) as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Allow once' }))
    await expect(pending.result).resolves.toBe('allowed-once')

    const detail = slots.entriesOfSlot('conversation.approval.detail')[0]
    const fixture = (detail.inject as unknown as (id: SessionId) => {
      fixture: { setState(state: 'READY_SAMPLE'): void }
    })(sessionId).fixture
    act(() => { fixture.setState('READY_SAMPLE') })
    expect(screen.getByTestId('risk-advisor-r1-fixture').getAttribute('data-ra-fixture-state')).toBe('READY_SAMPLE')

    await fiber.dispose()
    expect(slots.entries('conversation.approval.detail')).toHaveLength(1)
    expect(slots.entriesOfSlot('conversation.approval.detail')[0].options.priority).toBe(0)
    view.rerender(<NativeHost />)
    expect(screen.getByText('echo native')).toBeTruthy()
    act(() => { fixture.setState('UNAVAILABLE') })
    view.rerender(<NativeHost />)
    expect(screen.queryByTestId('risk-advisor-r1-detail')).toBeNull()
    expect(screen.getByText('echo native')).toBeTruthy()

    nativeEntry()
    declareRoot()
  })

  it('keeps the native panel usable when callId is absent and does not invoke the detail slot', async () => {
    ctx = new Context()
    const pending = new PendingApprovalClass('session-no-call' as SessionId, { toolName: 'read' })
    const renderSlot = vi.fn(() => null)
    render(<ApprovalPanel matched={pending} renderSlot={renderSlot} t={panelCopy(pending)} />)

    expect(renderSlot.mock.calls.length).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
    await expect(pending.result).resolves.toBe('rejected')
  })
})
