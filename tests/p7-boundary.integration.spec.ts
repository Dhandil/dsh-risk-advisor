import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const source = (...parts: string[]) => readFileSync(resolve(here, '..', ...parts), 'utf8')

describe('Phase 7 direct non-interference boundary', () => {
  it('proves the verifier repair has no approval/A3/browser/session-reader/Phase-8 side path', () => {
    const p7Sources = [
      source('src', 'host', 'expected-effect.ts'),
      source('src', 'host', 'postcondition-verifier.ts'),
      source('src', 'host', 'verification-scheduler.ts'),
      source('src', 'host', 'verification-store.ts'),
      source('src', 'host', 'shell-analysis.ts'),
      source('src', 'host', 'retry-escalation.ts'),
      source('src', 'index.ts'),
    ].join('\n')
    expect(p7Sources).not.toMatch(/PendingApproval\.answer|conversation\.composer|tools\.register/)
    expect(p7Sources).not.toMatch(/risk-advisor\/verification|eventAt\(|snapshotEvents\(|ownEvents\(/)
    expect(p7Sources).not.toMatch(/EvidenceCollector|Phase ?8|A3|verification event/)
    expect(source('src', 'host', 'postcondition-verifier.ts')).not.toMatch(/ctx\.fs|@deepseek-ai\/dsh-user-approval|browser-bridge/)
    expect(source('src', 'host', 'verification-store.ts')).not.toMatch(/raw|stdout|stderr|path|packageName|branch/)
  })
})
