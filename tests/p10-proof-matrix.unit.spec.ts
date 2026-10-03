import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ActiveExecutionIndex } from '../src/host/correlation.ts'

const ROOT = resolve(process.cwd())

const retainedState = [
  ['ActiveExecutionIndex', 'tests/r2-correlation.unit.spec.ts', 'snapshotObservations'],
  ['OperationFoundation', 'tests/p1a-operation-foundation.unit.spec.spec.ts', 'CAPACITY_EXCEEDED'],
  ['Ledger/PTC', 'tests/r4-ledger.unit.spec.ts', 'QUERY_LIMIT_CLAMPED'],
  ['FailureChain', 'tests/p3-retry-escalation.unit.spec.ts', 'dispose'],
  ['ReviewerSeed', 'tests/p5-repair.unit.spec.ts', 'repair-capacity'],
  ['ExpectedEffect', 'tests/p7-expected-effect.unit.spec.ts', '128'],
  ['Verification', 'tests/p7-scheduler.unit.spec.ts', 'activeCount'],
  ['Evidence raw seed', 'tests/p8-evidence-target.unit.spec.ts', '128'],
  ['Evidence sanitized store', 'tests/p8-evidence-collector.unit.spec.ts', '512'],
  ['Assessment records', 'tests/p6-lifecycle.integration.spec.ts', 'dispose'],
  ['Deep Judge parent bindings', 'tests/p9-deep-judge-lifecycle.integration.spec.ts', 'dispose'],
  ['Fast/Evidence/Deep queues', 'tests/p10-lifecycle-resource.integration.spec.ts', 'JUDGE_QUEUE_SATURATED'],
] as const

const lifecycle = [
  ['A2 native-close fencing', 'tests/p5-lifecycle.integration.spec.ts', 'native decision'],
  ['Evidence/A3 native-close fencing', 'tests/p10-native-close.integration.spec.ts', 'held Evidence work'],
  ['A4 native-close fencing', 'tests/p10-native-close.integration.spec.ts', 'held Deep runtime'],
  ['Session disposal', 'tests/p6-lifecycle.integration.spec.ts', 'session'],
  ['Plugin disposal', 'tests/p10-coexistence.integration.spec.ts', 'fiber.dispose'],
  ['Capability replacement', 'tests/p9-deep-judge-coordinator.integration.spec.ts', 'replacement'],
  ['Abort-ignoring work', 'tests/p8-evidence-lifecycle.integration.spec.ts', 'abort'],
  ['Duplicate approval observation', 'tests/p10-coexistence.integration.spec.ts', 'duplicate'],
] as const

function checkRows(rows: readonly (readonly [string, string, string])[]) {
  for (const [family, file, marker] of rows) {
    const primary = resolve(ROOT, file)
    const fallback = file.includes('.spec.spec.') ? resolve(ROOT, file.replace('.spec.spec.', '.spec.')) : primary
    expect(existsSync(primary) || existsSync(fallback), family).toBe(true)
    const text = readFileSync(existsSync(primary) ? primary : fallback, 'utf8')
    expect(text.toLowerCase(), family).toContain(marker.toLowerCase())
  }
}

describe('Phase 10 hardening executable proof matrix', () => {
  it('maps every retained-state family to a bounded executable owner', () => checkRows(retainedState))
  it('maps close, disposal, replacement, abort, and duplicate-observation fences', () => checkRows(lifecycle))

  it('proves the retained ActiveExecutionIndex observation cap at the boundary', () => {
    const index = new ActiveExecutionIndex()
    const session = { id: 'p10-active-cap' }
    for (let item = 0; item < 257; item += 1) {
      const callId = `call-${item}`
      const execution = { name: 'read', arguments: { bounded: true }, callId, signal: new AbortController().signal, token: Symbol(callId), agent: { session } }
      index.observePreExecute(execution as never)
      index.observeSessionEvent(session as never, { type: 'approval/asked', data: { id: `approval-${item}`, toolName: 'read', callId } } as never)
    }
    expect(index.snapshotObservations()).toHaveLength(256)
  })
})
