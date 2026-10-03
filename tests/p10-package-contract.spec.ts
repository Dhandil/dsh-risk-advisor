import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('Phase 10 package and productization contract', () => {
  it('ships exactly one external bundle patch and preserves the existing client bundle', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as Record<string, any>
    const patch = await readFile('cordis.patch.yml', 'utf8')
    expect(packageJson.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(packageJson.dsh.client).toBeDefined()
    expect(packageJson.files).toContain('cordis.patch.yml')
    expect(patch.trim()).toBe("- insert:\n    - id: risk-advisor\n      name: '@dhandil/dsh-risk-advisor'")
    expect(patch).not.toContain('apply')
    expect(packageJson.scripts.test).toContain('test:p10')
  })

  it('keeps the default reviewer path disabled and the package surface bounded', async () => {
    const source = await readFile('src/index.ts', 'utf8')
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as Record<string, any>
    expect(source).not.toMatch(/PendingApproval\.answer|conversation\.composer/)
    expect(packageJson.dsh.client.platform).toBe('web')
    expect(packageJson.files).not.toContain('tests')
    expect(packageJson.files).not.toContain('benchmarks')
  })
})
