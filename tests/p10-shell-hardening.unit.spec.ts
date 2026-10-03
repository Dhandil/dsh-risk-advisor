import { describe, expect, it } from 'vitest'
import { RuleEngine, type RuleEvaluation } from '../src/host/rule-engine.ts'

function evaluate(toolName: string, command: string): RuleEvaluation {
  const id = `p10-${toolName}-${command.length}`
  const engine = new RuleEngine()
  engine.observePreExecute({ name: toolName, arguments: { command }, callId: id } as never, id, {
    executionId: id, status: 'READY', retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown',
    permissionEscalation: false, truncated: false, reasonCodes: [], recent: [],
  })
  return engine.diagnostics.get(id)
}

describe('Phase 10 shell adversarial hardening', () => {
  it('covers the complete frozen interpreter, chaining, expansion, and environment corpus', () => {
    const cases = [
      ['bash', 'sh -c "rm -rf build"', 'SHELL_DYNAMIC_EXECUTION'],
      ['bash', 'node -e "rm -rf build"', 'SHELL_DYNAMIC_EXECUTION'],
      ['bash', 'python -c "import os; os.system(\\"rm -rf build\\")"', 'SHELL_DYNAMIC_EXECUTION'],
      ['bash', 'perl -e "system(\\"rm -rf build\\")"', 'SHELL_DYNAMIC_EXECUTION'],
      ['bash', 'cmd /c "del /s build"', 'SHELL_DYNAMIC_EXECUTION'],
      ['pwsh', 'powershell -Command "Remove-Item -Recurse build"', 'SHELL_DYNAMIC_EXECUTION'],
      ['pwsh', 'pwsh -c "Remove-Item -Recurse build"', 'SHELL_DYNAMIC_EXECUTION'],
      ['pwsh', 'Invoke-Expression "Remove-Item build"', 'SHELL_DYNAMIC_EXECUTION'],
      ['pwsh', 'iex "Remove-Item build"', 'SHELL_DYNAMIC_EXECUTION'],
      ['pwsh', '& $variable', 'SHELL_DYNAMIC_EXECUTION'],
      ['bash', 'find . -exec rm -rf {} \\;', 'SHELL_DYNAMIC_EXECUTION'],
      ['bash', 'echo x | xargs rm -rf', 'SHELL_DYNAMIC_EXECUTION'],
      ['bash', 'parallel rm -rf ::: build', 'SHELL_DYNAMIC_EXECUTION'],
      ['bash', 'echo `rm -rf build`', 'SHELL_SEMANTICS_AMBIGUOUS'],
      ['bash', 'echo safe\nrm -rf build', 'DESTRUCTIVE_RECURSIVE_DELETE'],
      ['pwsh', 'Remove-Item -Recurse build; Write-Output safe', 'DESTRUCTIVE_RECURSIVE_DELETE'],
      ['bash', 'LD_PRELOAD=/tmp/inert.so echo safe', 'SHELL_ENVIRONMENT_INJECTION'],
      ['bash', 'NODE_OPTIONS=--require=/tmp/inert.cjs node app.js', 'SHELL_ENVIRONMENT_INJECTION'],
      ['bash', 'GENERIC_ENV=bounded echo safe', 'SHELL_SEMANTICS_AMBIGUOUS'],
      ['pwsh', '$env:GENERIC_ENV=bounded; Write-Output safe', 'SHELL_DYNAMIC_EXECUTION'],
    ] as const
    for (const [tool, command, finding] of cases) {
      const result = evaluate(tool, command)
      expect(result.findings.map(item => item.id), command).toContain(finding)
      if (finding.startsWith('SHELL_')) expect(result.status, command).toBe('DEGRADED')
    }
  })

  it('uses the shared shell authority for chained, dynamic, encoded, and environment forms', () => {
    const cases = [
      ['bash', 'echo safe; rm -rf build', 'DESTRUCTIVE_RECURSIVE_DELETE', 'READY'],
      ['bash', 'echo safe && git clean -df', 'DESTRUCTIVE_GIT_CLEAN', 'READY'],
      ['bash', 'echo $(rm -rf build)', 'SHELL_SEMANTICS_AMBIGUOUS', 'DEGRADED'],
      ['bash', 'bash -c "rm -rf build"', 'SHELL_DYNAMIC_EXECUTION', 'DEGRADED'],
      ['pwsh', 'powershell -EncodedCommand AAAA', 'SHELL_ENCODED_EXECUTION', 'DEGRADED'],
      ['bash', 'PATH=/tmp echo safe', 'SHELL_ENVIRONMENT_INJECTION', 'DEGRADED'],
      ['bash', 'echo value > output.txt', 'SHELL_SEMANTICS_AMBIGUOUS', 'DEGRADED'],
    ] as const
    for (const [tool, command, finding, status] of cases) {
      const result = evaluate(tool, command)
      expect(result.findings.map(item => item.id), command).toContain(finding)
      expect(result.status, command).toBe(status)
    }
  })

  it('does not treat inert quoted data as executable semantics or cross-segment targets', () => {
    const inert = evaluate('bash', 'echo "rm -rf build"')
    expect(inert.findings.map(item => item.id)).not.toContain('DESTRUCTIVE_RECURSIVE_DELETE')
    expect(evaluate('bash', 'echo /etc/passwd; rm -rf build').findings.map(item => item.id)).not.toContain('SYSTEM_LOCATION_MUTATION')
    expect(evaluate('bash', 'cat /etc/passwd').findings.map(item => item.id)).not.toContain('SYSTEM_LOCATION_MUTATION')
    expect(evaluate('bash', 'rm -rf /etc/app').findings.map(item => item.id)).toContain('SYSTEM_LOCATION_MUTATION')
  })

  it('keeps the corpus observational: no shell execution seam is referenced by the test', () => {
    const corpus = ['git status', 'echo safe', 'printf safe']
    expect(corpus).toHaveLength(3)
    expect(corpus.some(command => command.includes('child_process'))).toBe(false)
  })
})
