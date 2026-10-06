import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  experienceDomainSpec,
  experienceEpisodeKey,
  experienceEpisodeSchema,
} from '../src/host/experience-schema.ts'

function episode(executionId = 'ra-execution-schema-fixture') {
  return {
    schemaVersion: 1,
    episodeId: experienceEpisodeKey(executionId),
    sourceExecutionId: executionId,
    observedAt: 1_800_000_000_000,
    runtime: { platform: 'darwin' },
    operation: {
      toolName: 'write',
      kind: 'filesystem-write',
      parserConfidence: 'high',
      mutating: true,
      externalEffect: false,
      networkEffect: 'none',
      requestedPermission: 'danger-full-access',
    },
    approval: { observed: true, outcome: 'allowed-once' },
    terminal: { isError: false },
    retry: {
      status: 'READY',
      retryCount: 0,
      recentFailureCount: 0,
      sameRootCause: 'unknown',
      permissionEscalation: 'unknown',
    },
    provenance: { source: 'LIVE_TOOLS_RESULT', ruleStatus: 'READY', reasonCodes: [] },
  } as const
}

describe('Phase 11.1 Experience Episode schema and package contract', () => {
  it('uses the frozen path-safe SHA-256 identity over exact UTF-8 executionId bytes', () => {
    const executionId = 'ra-execution-épisode-✓'
    const digest = createHash('sha256').update(Buffer.from(executionId, 'utf8')).digest('hex')
    const key = experienceEpisodeKey(executionId)
    expect(key).toBe(`ra-episode-v1_${digest}`)
    expect(key).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(key).toHaveLength('ra-episode-v1_'.length + 64)
  })

  it('declares the authoritative version 1 per-record episodes domain without skip policy', () => {
    expect(experienceDomainSpec).toMatchObject({ name: 'risk_advisor_experience', version: 1, layout: 'per-record' })
    expect(Object.hasOwn(experienceDomainSpec, 'invalidRecords')).toBe(false)
    expect(Object.keys(experienceDomainSpec.tables)).toEqual(['episodes'])
    expect(experienceEpisodeSchema.parse(episode())).toMatchObject({ schemaVersion: 1, provenance: { source: 'LIVE_TOOLS_RESULT' } })
  })

  it('rejects semantic drift, key mismatch, unsafe values, and invalid bounds', () => {
    const valid = episode()
    expect(experienceEpisodeSchema.safeParse({ ...valid, unapprovedField: 'x' }).success).toBe(false)
    expect(experienceEpisodeSchema.safeParse({ ...valid, episodeId: `ra-episode-v1:${'a'.repeat(64)}` }).success).toBe(false)
    expect(experienceEpisodeSchema.safeParse({ ...valid, episodeId: `ra-episode-v1_${'a'.repeat(64)}` }).success).toBe(false)
    expect(experienceEpisodeSchema.safeParse({ ...valid, observedAt: Number.POSITIVE_INFINITY }).success).toBe(false)
    expect(experienceEpisodeSchema.safeParse({ ...valid, sourceExecutionId: 'session-id/raw' }).success).toBe(false)
    expect(experienceEpisodeSchema.safeParse({ ...valid, provenance: { ...valid.provenance, reasonCodes: Array.from({ length: 33 }, () => 'SAFE_CODE') } }).success).toBe(false)
  })

  it('declares direct storage-domain and zod dependencies without changing package version or using JSON in product source', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as Record<string, any>
    const source = await readFile('src/host/experience-schema.ts', 'utf8')
    const runtime = await readFile('src/host/experience-store.ts', 'utf8')
    expect(packageJson.version).toBe('0.1.0-r1')
    expect(packageJson.peerDependencies['@deepseek-ai/dsh-storage-domain']).toBe('>=0.1.6-alpha.2')
    expect(packageJson.devDependencies['@deepseek-ai/dsh-storage-domain']).toBe('0.1.6-alpha.2')
    expect(packageJson.dependencies.zod).toBe('^4.4.3')
    expect(`${source}\n${runtime}`).not.toContain('@deepseek-ai/dsh-storage-json')
  })

  it('keeps Experience Host-only and captures only between verifier and retirement', async () => {
    const [index, runtime, schema, riskEngine, assessment, bridge, client] = await Promise.all([
      readFile('src/index.ts', 'utf8'),
      readFile('src/host/experience-store.ts', 'utf8'),
      readFile('src/host/experience-schema.ts', 'utf8'),
      readFile('src/host/risk-engine.ts', 'utf8'),
      readFile('src/host/assessment-envelope.ts', 'utf8'),
      readFile('src/host/browser-bridge.ts', 'utf8'),
      readFile('src/client/RiskAdvisorDetail.tsx', 'utf8'),
    ])
    const resultHook = index.slice(index.indexOf("retire: (exec, result, index, executionId) => {"))
    expect(index).toContain("ctx.inject(['storageDomain']")
    expect(resultHook.indexOf('failureChain.observeResult')).toBeLessThan(resultHook.indexOf('verifier.observeResult'))
    expect(resultHook.indexOf('verifier.observeResult')).toBeLessThan(resultHook.indexOf('experience.observeResult'))
    expect(resultHook.indexOf('experience.observeResult')).toBeLessThan(resultHook.indexOf('foundation.retire'))
    expect(runtime).not.toMatch(/VERIFIED_SUCCESS|VERIFIED_FAILURE|Pattern|Guidance|update\(|delete\(/)
    expect(schema).not.toMatch(/VERIFIED_SUCCESS|VERIFIED_FAILURE|Pattern|Guidance/)
    for (const downstream of [riskEngine, assessment, bridge, client]) {
      expect(downstream.toLowerCase()).not.toContain('experience')
    }
  })
})
