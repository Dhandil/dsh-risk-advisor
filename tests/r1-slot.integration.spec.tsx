import { Context } from '@deepseek-ai/cordis'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { ApprovalComposerProps, ApprovalDetailOwnerProps, PendingApproval } from '@deepseek-ai/dsh-client-ui-approval/client'
import { PendingApproval as PendingApprovalClass } from '../../../deepseek-harness/packages/client/ui-approval/src/client/contract/slots.ts'
import { ApprovalPanel } from '../../../deepseek-harness/packages/client/ui-approval/src/client/ApprovalPanel.tsx'
import { ApprovalCommand } from '../../../deepseek-harness/packages/client/ui-chat/src/client/chat/ApprovalCommand.tsx'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { createSlotRenderer } from '../../../deepseek-harness/packages/client/ui-renderer/src/client/scoped-slots.tsx'
import type { ChatSnapshot } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { SlotScopeAdapter, StandardSourceBinding } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import { commandForSnapshot } from '../src/client/command.ts'
import { RiskAdvisorDetail } from '../src/client/RiskAdvisorDetail.tsx'
import { NS } from '../src/client/locales.ts'
import { apply, inject } from '../src/client/index.ts'

let ctx: Context | undefined

function provideUnavailableConnection(target: Context): void {
  target.provide('connection', {
    rpc: {
      call: async () => ({ ok: true, value: { kind: 'NOT_FOUND' } }),
    },
  })
}

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
    provideUnavailableConnection(ctx)
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
    let visible = true
    const NativeHost = (): ReactNode => visible ? <ApprovalPanel
        matched={pending}
        renderSlot={renderDetail}
        t={panelCopy(pending)}
      /> : null

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
    expect(screen.getByText('echo native')).toBeTruthy()
    expect(screen.getByTestId('risk-advisor-card').getAttribute('data-ra-status')).toBe('ANALYZING')
    expect((screen.getByRole('button', { name: 'Reject' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'Allow once' }) as HTMLButtonElement).disabled).toBe(false)

    await fiber.dispose()
    expect(slots.entries('conversation.approval.detail')).toHaveLength(1)
    expect(slots.entriesOfSlot('conversation.approval.detail')[0].options.priority).toBe(0)
    view.rerender(<NativeHost />)
    expect(screen.getByText('echo native')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Allow once' }) as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Allow once' }))
    await expect(pending.result).resolves.toBe('allowed-once')

    visible = false
    view.rerender(<NativeHost />)
    expect(screen.queryByTestId('risk-advisor-r1-detail')).toBeNull()
    view.rerender(<NativeHost />)
    expect(screen.queryByTestId('risk-advisor-r1-detail')).toBeNull()

    nativeEntry()
    declareRoot()
  })

  it('keeps the native command and controls when the fixture boundary fails', async () => {
    ctx = new Context()
    provideUnavailableConnection(ctx)
    await ctx.plugin(SlotRegistry).await()
    const slots = ctx.slots
    const locale = new LocaleRuntime(ctx)
    ctx.provide('locale', locale)

    const sessionId = 'session-fault' as SessionId
    const callId = 'call-fault' as ToolCallId
    const pending = new PendingApprovalClass(sessionId, {
      toolName: 'bash',
      callId,
      reason: 'fixture fault integration',
    })
    const snapshot = {
      nodes: {
        values: () => [{
          kind: 'tool-call',
          data: { root: {
            callId,
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

    slots.register({
      name: 'root',
      children: { 'conversation.approval.detail': { kind: 'single', scope: 'session' } },
    }, () => null)
    slots.register({
      name: 'conversation.approval.detail',
      priority: -100,
      locale: NS,
      inject: () => ({}),
    }, RiskAdvisorDetail)

    const renderDetail = (_key: string, owner: ApprovalDetailOwnerProps): ReactNode => {
      const entry = slots.entriesOfSlot('conversation.approval.detail')[0]
      if (entry === undefined) return null
      const injected = entry.inject?.(sessionId as never) ?? {}
      const Component = entry.component as (props: Record<string, unknown>) => ReactNode
      return <Component
        {...owner}
        sessionId={sessionId}
        useChat={(selector: (value: ChatSnapshot) => unknown) => selector(snapshot)}
        t={locale.bind(NS)}
        {...injected}
      />
    }

    render(<ApprovalPanel matched={pending} renderSlot={renderDetail} t={panelCopy(pending)} />)

    expect(screen.getByText('echo native')).toBeTruthy()
    expect(screen.getByTestId('risk-advisor-card').getAttribute('data-ra-status')).toBe('UNAVAILABLE')
    expect((screen.getByRole('button', { name: 'Reject' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'Allow once' }) as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))
    await expect(pending.result).resolves.toBe('rejected')
  })

  it('uses the public owner child path for two session bindings and restores native detail on dispose', async () => {
    ctx = new Context()
    provideUnavailableConnection(ctx)
    await ctx.plugin(SlotRegistry).await()
    const slots = ctx.slots
    const locale = new LocaleRuntime(ctx)
    ctx.provide('locale', locale)
    slots.installLocale(locale)
    slots.install(createSlotRenderer())

    const makeObservable = <T,>(value: T) => ({
      getSnapshot: () => value,
      subscribe: () => () => {},
    })
    const absentBinding: StandardSourceBinding = {
      key: undefined,
      hooks: {},
      keyedHooks: {},
      props: {},
    }
    const absentSource = makeObservable(absentBinding)
    const references = new Map<object, StandardSourceBinding>()
    const makeReference = (id: string, snapshot: ChatSnapshot): object => {
      const scopedContext = new Context()
      const binding = {
        key: id,
        ctx: scopedContext,
        hooks: { chat: makeObservable(snapshot) },
        keyedHooks: {},
        props: { sessionId: id },
      } as unknown as StandardSourceBinding
      const reference = {
        sessionId: id,
        binding: { sessionId: id, ctx: scopedContext },
        ready: Promise.resolve({ sessionId: id, ctx: scopedContext }),
        release: () => {},
      }
      references.set(reference, binding)
      return reference
    }

    const snapshotFor = (command: string, id: ToolCallId): ChatSnapshot => ({
      nodes: {
        values: () => [{
          kind: 'tool-call',
          data: { root: {
            callId: id,
            name: 'bash',
            argsRaw: JSON.stringify({ command }),
            turn: 1,
            step: 1,
            time: 1,
            subCalls: [],
          } },
        }],
      },
    } as unknown as ChatSnapshot)
    const firstChat = snapshotFor('echo first', 'call-1' as ToolCallId)
    const secondChat = snapshotFor('echo second', 'call-2' as ToolCallId)
    const first = makeReference('session-1', firstChat)
    const second = makeReference('session-2', secondChat)
    const sessionAdapter: SlotScopeAdapter = {
      current: absentSource,
      bindingSource: target => references.get(target as object) === undefined
        ? absentSource
        : makeObservable(references.get(target as object)!),
      renderArea: (_binding, props) => props.children,
    }
    slots.installScope('session', sessionAdapter)

    const pendingFirst = new PendingApprovalClass('session-1' as SessionId, {
      toolName: 'bash', callId: 'call-1' as ToolCallId, reason: 'first session',
    })
    const pendingSecond = new PendingApprovalClass('session-2' as SessionId, {
      toolName: 'bash', callId: 'call-2' as ToolCallId, reason: 'second session',
    })
    let switchSession: ((reference: object) => void) | undefined
    slots.register({
      name: 'root',
      children: {
        'conversation.approval.detail': { kind: 'single', scope: 'session' },
      },
    } as never, props => {
      const [reference, setReference] = useState(first)
      switchSession = setReference
      const pending = (reference as { sessionId: string }).sessionId === pendingFirst.sessionId ? pendingFirst : pendingSecond
      return <props.SessionProvider session={reference as never}>
        <ApprovalPanel matched={pending} renderSlot={props.renderSlot} t={panelCopy(pending)} />
      </props.SessionProvider>
    })

    slots.register({ name: 'conversation.approval.detail', priority: 0 }, ApprovalCommand)
    const view = render(<>{slots.renderSlot('root', {})}</>)
    expect(view.getByText('echo first')).toBeTruthy()
    expect(view.queryByTestId('risk-advisor-r1-detail')).toBeNull()

    const feature = ctx.plugin({ inject: [...inject], apply })
    await act(async () => { await feature.await() })
    expect(view.getByTestId('risk-advisor-r1-detail').getAttribute('data-session-id')).toBe('session-1')
    expect(view.getByText('echo first')).toBeTruthy()
    expect(view.getByTestId('risk-advisor-card').getAttribute('data-ra-status')).toBe('ANALYZING')
    expect((view.getByRole('button', { name: 'Reject' }) as HTMLButtonElement).disabled).toBe(false)

    if (switchSession === undefined) throw new Error('public owner frame did not expose session switch')
    act(() => { switchSession!(second) })
    expect(view.getByTestId('risk-advisor-r1-detail').getAttribute('data-session-id')).toBe('session-2')
    expect(view.getByText('echo second')).toBeTruthy()
    expect(view.getByTestId('risk-advisor-card').getAttribute('data-ra-status')).toBe('ANALYZING')

    await act(async () => { await feature.dispose() })
    expect(slots.entriesOfSlot('conversation.approval.detail')[0]?.component).toBe(ApprovalCommand)
    expect(view.queryByTestId('risk-advisor-r1-detail')).toBeNull()
    expect(view.getByText('echo second')).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: 'Reject' }))
    await expect(pendingSecond.result).resolves.toBe('rejected')
    await pendingFirst.answer('rejected')
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
