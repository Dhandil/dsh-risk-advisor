import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import configs from '../tsdown.config'

const cssCases = [
  {
    importPath: './ApprovalHistoricalContext.module.css',
    importer: 'lib/types/client/RiskAdvisorDetail.js',
    projectRelative: 'src/client/ApprovalHistoricalContext.module.css',
  },
  {
    importPath: './OnlineCorrectionDock.module.css',
    importer: 'lib/types/client/OnlineCorrectionDock.js',
    projectRelative: 'src/client/OnlineCorrectionDock.module.css',
  },
  {
    importPath: './RuntimeRiskAwarenessDock.module.css',
    importer: 'lib/types/client/RuntimeRiskAwarenessDock.js',
    projectRelative: 'src/client/RuntimeRiskAwarenessDock.module.css',
  },
  {
    importPath: './RiskAdvisorCard.module.css',
    importer: 'lib/types/client/components/RiskAdvisorCard.js',
    projectRelative: 'src/client/components/RiskAdvisorCard.module.css',
  },
] as const

type CssPlugin = {
  resolveId(source: string, importer?: string): unknown
  load(this: { addWatchFile(file: string): void }, id: string): Promise<string | null>
}

const clientConfig = configs[1] as (typeof configs)[number] & { plugins?: unknown[] }
const cssPlugin = clientConfig.plugins?.[0] as CssPlugin
const cssModulePrefix = '\0dsh-risk-advisor-css:'
const cssModuleSuffix = '.mjs'
const tempRoots: string[] = []

function makeSourceRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'phase15-3e-repro-repair1-css-'))
  tempRoots.push(root)
  mkdirSync(join(root, 'src/client/components'), { recursive: true })
  for (const { projectRelative } of cssCases) {
    const source = resolve(process.cwd(), projectRelative)
    const target = join(root, projectRelative)
    mkdirSync(join(target, '..'), { recursive: true })
    copyFileSync(source, target)
  }
  return root
}

function resolveCss(importPath: string, importer: string): string {
  const id = cssPlugin.resolveId(importPath, importer)
  if (typeof id !== 'string') throw new Error(`Expected CSS virtual ID for ${importPath}`)
  return id
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
    expect(existsSync(root)).toBe(false)
  }
})

describe('Phase 15.3E Repair1 CSS virtual module identity', () => {
  it('uses four distinct POSIX source-relative IDs across different temporary roots', () => {
    const rootA = makeSourceRoot()
    const rootB = makeSourceRoot()
    const idsA = cssCases.map(testCase =>
      resolveCss(testCase.importPath, join(rootA, testCase.importer)),
    )
    const idsB = cssCases.map(testCase =>
      resolveCss(testCase.importPath, join(rootB, testCase.importer)),
    )

    expect(idsA).toEqual(idsB)
    expect(new Set(idsA).size).toBe(cssCases.length)
    for (const [index, testCase] of cssCases.entries()) {
      expect(idsA[index]).toBe(`${cssModulePrefix}${testCase.projectRelative}${cssModuleSuffix}`)
      expect(idsA[index]).not.toContain(rootA)
      expect(idsB[index]).not.toContain(rootB)
    }
  })

  it('reads exact CSS bytes from the current source root and preserves registration and class-map output', async () => {
    const { importPath, importer, projectRelative } = cssCases[3]
    const id = resolveCss(importPath, resolve(process.cwd(), importer))
    const css = readFileSync(resolve(process.cwd(), projectRelative), 'utf8')
    const addWatchFile = vi.fn()
    const module = await cssPlugin.load.call({ addWatchFile }, id)

    expect(module).not.toBeNull()
    expect(module).toContain(`const css = ${JSON.stringify(css)};`)
    expect(module).toContain(
      `const tagId = ${JSON.stringify(`@dhandil/dsh-risk-advisor/${basename(projectRelative)}`)};`,
    )
    expect(module).toContain("tag.dataset.plugin = \"@dhandil/dsh-risk-advisor\";")
    expect(module).toContain('tag.dataset.pluginCss = tagId;')
    expect(module).toContain('document.head.appendChild(tag);')

    const classes = [...new Set([...css.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map(match => match[1]))]
    const expectedClassMap = Object.fromEntries(classes.map(name => [name, name]))
    const exportLine = module?.match(/export default (.+);$/m)?.[1]
    expect(exportLine).toBe(JSON.stringify(expectedClassMap))
    expect(addWatchFile).toHaveBeenCalledWith(resolve(process.cwd(), projectRelative))
  })

  it('rejects traversal and symlink escapes before registering or reading foreign CSS', async () => {
    const rootA = makeSourceRoot()
    const rootB = makeSourceRoot()
    const importer = join(rootA, 'lib/types/client/index.js')
    expect(() => resolveCss('../../../../../../outside.module.css', importer)).toThrow(
      /escapes the emitted client source tree/,
    )

    const outsideCss = join(rootB, cssCases[3].projectRelative)
    const symlinkPath = join(rootA, 'src/client/Foreign.module.css')
    symlinkSync(outsideCss, symlinkPath)
    expect(() => resolveCss('./Foreign.module.css', importer)).toThrow(/resolves outside src/)

    const addWatchFile = vi.fn()
    await expect(
      cssPlugin.load.call(
        { addWatchFile },
        `${cssModulePrefix}src/client/../../../../outside.module.css${cssModuleSuffix}`,
      ),
    ).rejects.toThrow(/Invalid Risk Advisor CSS virtual module identity/)
    expect(addWatchFile).not.toHaveBeenCalled()
  })
})
