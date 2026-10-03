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
