import { describe, expect, it } from 'vitest'
import { EvidenceCollector } from '../src/host/evidence-collector.ts'

describe('Phase 8 lifecycle fences', () => {
  it('replacing a capability fences the old generation and disposal drains', async () => {
    const collector = new EvidenceCollector()
    collector.attachFs({} as never)
    await collector.detachFs()
    collector.attachFs({} as never)
    await collector.dispose()
    expect(collector.diagnostics.snapshot()).toEqual([])
  })
})
