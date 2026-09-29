import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import { replayPtcSession } from '../src/index.ts'

describe('T03 bounded replay runtime integration', () => {
  it('replays a real Session append/snapshot log and remains deterministic', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    try {
      const session = ctx.sessions.create()
      session.append('turn/start', { turn: 1 })
      session.append('step/start', { turn: 1, step: 1 })
      session.append('tool/call', {
        turn: 1,
        step: 1,
        callId: ToolCallId('r3-runtime-root'),
        name: 'run_code',
        arguments: '{"code":"simulated"}',
      })
      session.append('tool/ptc-dispatch-start', {
        rootCallId: ToolCallId('r3-runtime-root'),
        parentCallId: ToolCallId('r3-runtime-root'),
        subCallId: ToolCallId('r3-runtime-child'),
        name: 'echo',
        arguments: { value: 'do-not-export' },
      })
      session.append('tool/ptc-dispatch', {
        rootCallId: ToolCallId('r3-runtime-root'),
        parentCallId: ToolCallId('r3-runtime-root'),
        subCallId: ToolCallId('r3-runtime-child'),
        name: 'echo',
        arguments: { value: 'do-not-export' },
        isError: false,
        content: [{ type: 'text', text: 'simulated result' }],
      })
      session.append('step/end', { turn: 1, step: 1 })
      session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })

      const first = replayPtcSession(session)
      const second = replayPtcSession(session)
      expect(first).toEqual(second)
      expect(first.status).toBe('COMPLETE')
      expect(first.sourceEventCount).toBe(7)
      expect(first.occurrences).toHaveLength(1)
      expect(first.occurrences[0]).toMatchObject({
        occurrence: { sessionId: session.id, seq: 3, callId: 'r3-runtime-child', name: 'echo' },
        parent: { status: 'RECOVERED', target: { callId: 'r3-runtime-root', seq: 2 } },
        root: { status: 'RECOVERED', target: { callId: 'r3-runtime-root', seq: 2 } },
        settlement: { status: 'PAIRED', isError: false, settlement: { seq: 4, type: 'tool/ptc-dispatch' } },
      })
      expect(JSON.stringify(first)).not.toContain('do-not-export')
      expect(JSON.stringify(first)).not.toContain('simulated result')
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
