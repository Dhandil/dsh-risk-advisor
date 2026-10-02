import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { defineTool } from '@deepseek-ai/dsh-tools'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { apply } from '../src/index.ts'

describe('Phase 7 pinned Host runtime', () => {
  it('keeps one ExecutionId and native ToolResult behavior while producing direct verification', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    apply(ctx)
    const session = ctx.sessions.create('p7-runtime-session')
    session.append('turn/start', { turn: 1 })
    const agent = { session } as unknown as Agent
    const ids = new Map<string, string>()
    ctx.on('tools/pre-execute', (tool, next) => {
      const found = ctx.get('riskAdvisorCorrelation').lookup(tool.agent?.session, tool.callId)
      if (found.status === 'FOUND') ids.set(String(tool.callId), found.executionId)
      return next()
    })
    ctx.tools.register(defineTool({
      name: 'write',
      description: 'p7 write fixture',
      parameters: { file_path: { type: 'string', required: true }, content: { type: 'string', required: true } },
      output: {
        schema: { type: 'object', additionalProperties: true },
        render: () => [{ type: 'text' as const, text: 'write fixture' }],
      },
      async execute(args) {
        return { path: args.file_path, operation: 'create', before: null, after: args.content }
      },
    }))
    try {
      const callId = ToolCallId('p7-runtime-write')
      const result = await ctx.tools.execute({ signal: new AbortController().signal, callId, name: 'write', arguments: { file_path: 'runtime.txt', content: 'runtime' }, agent })
      expect(result.isError).toBe(false)
      const executionId = ids.get(callId)
      expect(executionId).toBeDefined()
      expect(ctx.get('riskAdvisorVerification').get(executionId!)).toMatchObject({ adapterId: 'tool.write.v1', status: 'MATCHED', semanticSuccess: true })
      expect(ctx.get('riskAdvisorFailureChain').get(executionId!).status).toBe('READY')
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
