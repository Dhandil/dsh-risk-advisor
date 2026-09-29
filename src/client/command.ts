import type { ChatSnapshot, RunningToolCall } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ToolChatData } from '@deepseek-ai/dsh-client-ui-chat/client'

/** Preserve ui-chat ApprovalCommand's public observable command semantics. */
export function commandOf(call: RunningToolCall | undefined): string | undefined {
  if (call === undefined) return undefined
  try {
    const args = JSON.parse(call.argsRaw) as Record<string, unknown>
    return typeof args.command === 'string' ? args.command : undefined
  } catch {
    return undefined
  }
}

/** Read only the running Tool call matching the native approval callId. */
export function commandForSnapshot(snapshot: ChatSnapshot, callId: string): string | undefined {
  for (const node of snapshot.nodes.values()) {
    if (node.kind !== 'tool-call') continue
    const root = (node.data as ToolChatData).root
    if (root === undefined || root.callId !== callId || 'kind' in root) continue
    return commandOf(root)
  }
  return undefined
}
