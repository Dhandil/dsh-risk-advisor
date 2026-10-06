import type { ComponentProps } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatSnapshot, ToolChatData } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import { commandForSnapshot, commandOf } from '../src/client/command.ts'
import { RiskAdvisorDetail } from '../src/client/RiskAdvisorDetail.tsx'
import { en } from '../src/client/locales.ts'
import { FixtureProbe, R1FixtureStore } from './r1-fixture-helper.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const sid = 'session-1' as SessionId
const callId = 'call-1' as ToolCallId
const translate = (key: string): string => en[key as keyof typeof en] ?? key

function snapshotWithRoots(roots: Array<ToolChatData['root'] | undefined>): ChatSnapshot {
  return {
    nodes: {
      values: () => roots.map((root, index) => ({
        kind: 'tool-call', data: { root }, key: `node-${index}`, nodeKey: `node-${index}`,
      })),
    },
  } as unknown as ChatSnapshot
}

function snapshotWithRoot(root: ToolChatData['root']): ChatSnapshot {
  return snapshotWithRoots([root])
}

function componentProps(): ComponentProps<typeof RiskAdvisorDetail> {
  const snapshot = snapshotWithRoot({
    callId,
    name: 'bash',
    argsRaw: JSON.stringify({ command: 'echo safe' }),
    turn: 1,
    step: 1,
    time: 1,
    subCalls: [],
  })
  return {
    callId,
    sessionId: sid,
    t: translate as ComponentProps<typeof RiskAdvisorDetail>['t'],
    useChat: selector => selector(snapshot),
  } as ComponentProps<typeof RiskAdvisorDetail>
}

describe('R1 fixture store and public command projection', () => {
  it('preserves native ApprovalCommand semantics for running, malformed, unrelated, and settled calls', () => {
    const running = { callId, argsRaw: JSON.stringify({ command: 'echo safe' }) } as never
    expect(commandOf(running)).toBe('echo safe')
    expect(commandOf({ callId, argsRaw: '{bad' } as never)).toBeUndefined()
    expect(commandOf({ callId, argsRaw: JSON.stringify({ command: 42 }) } as never)).toBeUndefined()
    expect(commandOf(undefined)).toBeUndefined()

    const settled = { kind: 'tool-result', callId, argsRaw: JSON.stringify({ command: 'old' }) } as never
    expect(commandForSnapshot(snapshotWithRoot(settled), callId)).toBeUndefined()
    expect(commandForSnapshot(snapshotWithRoot({
      callId: 'other' as ToolCallId,
      name: 'bash',
      argsRaw: JSON.stringify({ command: 'other' }),
      turn: 1,
      step: 1,
      time: 1,
      subCalls: [],
    }), callId)).toBeUndefined()
  })

  it.each([
    {
      name: 'an undefined root before the matching running call',
      roots: [
        undefined,
        {
          callId,
          name: 'bash',
          argsRaw: JSON.stringify({ command: 'echo later' }),
          turn: 1,
          step: 2,
          time: 2,
          subCalls: [],
        } as ToolChatData['root'],
      ],
    },
  ])('skips $name in pure and composite projections', ({ roots }) => {
    const snapshot = snapshotWithRoots(roots)
    expect(() => commandForSnapshot(snapshot, callId)).not.toThrow()
    expect(commandForSnapshot(snapshot, callId)).toBe('echo later')

    render(<RiskAdvisorDetail
      {...componentProps()}
      useChat={selector => selector(snapshot)}
    />)
    expect(screen.getByTestId('risk-advisor-r1-command').textContent).toContain('echo later')
  })

  it('renders command and TEST FIXTURE, transitions PENDING to READY_SAMPLE, and cannot revive after disposal', () => {
    const store = new R1FixtureStore()
    const session = store.forSession(sid)
    const view = render(<><RiskAdvisorDetail {...componentProps()} /><FixtureProbe fixture={session} t={translate} /></>)

    expect(screen.getByTestId('risk-advisor-r1-command').textContent).toContain('echo safe')
    expect(screen.getByTestId('risk-advisor-r1-fixture').getAttribute('data-ra-fixture-state')).toBe('PENDING')

    act(() => { session.setState('READY_SAMPLE') })
    expect(screen.getByTestId('risk-advisor-r1-fixture').getAttribute('data-ra-fixture-state')).toBe('READY_SAMPLE')

    view.unmount()
    store.dispose()
    expect(() => { session.setState('UNAVAILABLE') }).not.toThrow()
  })

  it('keeps fixture state session-scoped', () => {
    const store = new R1FixtureStore()
    const first = store.forSession('session-1')
    const second = store.forSession('session-2')
    first.setState('READY_SAMPLE')
    expect(first.getSnapshot().state).toBe('READY_SAMPLE')
    expect(second.getSnapshot().state).toBe('PENDING')
  })

  it('isolates a fixture render fault and exposes an unavailable test fixture', () => {
    render(<RiskAdvisorDetail {...componentProps()} />)
    expect(screen.getByTestId('risk-advisor-r1-command').textContent).toContain('echo safe')
    expect(screen.getByTestId('risk-advisor-indicator').getAttribute('data-ra-status')).toBe('UNAVAILABLE')
  })
})
