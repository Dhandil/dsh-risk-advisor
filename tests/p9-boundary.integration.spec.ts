import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

describe('Phase 9 dependency and authority boundaries', () => {
  it('keeps the optional runtime structural and package-private', async () => {
    const root = join(process.cwd())
    const packageText = await readFile(join(root, 'package.json'), 'utf8')
    expect(packageText).not.toContain('@deepseek-ai/dsh-subagent')
    const sourceFiles = ['src/host/deep-judge-subagent.ts', 'src/host/deep-judge.ts', 'src/index.ts']
    const source = (await Promise.all(sourceFiles.map(file => readFile(join(root, file), 'utf8')))).join('\n')
    expect(source).not.toMatch(/from\s+['"][^'"]*packages[\\/]subagent[\\/]/)
    expect(source).not.toMatch(/from\s+['"]@deepseek-ai\/dsh-subagent['"]/)
    expect(source).toContain("get('subagents', false)")
    expect(source).toContain("start('spawn'")
  })

  it('keeps Deep Judge advisory-only and does not add authority seams', async () => {
    const source = await readFile(join(process.cwd(), 'src/host/deep-judge.ts'), 'utf8')
    expect(source).toContain('Do not attempt tools')
    expect(source).toContain('toolFilter: { allow: Object.freeze([]) }')
    expect(source).not.toContain('PendingApproval.answer')
    expect(source).not.toContain('conversation.composer')
    expect(source).not.toContain('ApprovalOutcome')
  })
})
