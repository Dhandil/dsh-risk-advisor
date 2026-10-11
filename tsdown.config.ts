import { realpathSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import type { UserConfig } from 'tsdown'
import type { TsdownPlugin } from 'tsdown'

const packageId = '@dhandil/dsh-risk-advisor'

// These are the Harness module-table entries used by the supported browser
// loader. The R1 source currently has only type-only Harness imports, but the
// complete declaration keeps the package boundary explicit for future fixture
// additions and prevents accidental duplicate React runtimes.
const moduleTable = new Set([
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-agent',
  '@deepseek-ai/dsh-session',
  '@deepseek-ai/dsh-tools',
  '@deepseek-ai/dsh-user-approval',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
  '@deepseek-ai/dsh-client-ui-locale',
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-ui-approval',
  '@deepseek-ai/dsh-client-ui-chat',
  '@deepseek-ai/dsh-client-ui-renderer',
])

function isModuleTableEntry(specifier: string): boolean {
  return moduleTable.has(specifier)
}

const cssModulePrefix = '\0dsh-risk-advisor-css:'
const cssModuleSuffix = '.mjs'
const emittedTypesMarker = `${sep}lib${sep}types${sep}`

function isWithinDirectory(parent: string, path: string): boolean {
  const child = relative(parent, path)
  return child !== '' && child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child)
}

function toPosixPath(path: string): string {
  return path.split(sep).join('/')
}

/** Resolve one emitted CSS import to a stable source-relative virtual identity. */
function cssModuleIdentity(source: string, importer: string): string {
  const resolvedImporter = resolve(importer)
  const boundary = resolvedImporter.lastIndexOf(emittedTypesMarker)
  if (boundary < 0) throw new Error('Risk Advisor CSS importer is outside lib/types')

  const lexicalProjectRoot = resolvedImporter.slice(0, boundary)
  const emittedRoot = resolve(lexicalProjectRoot, 'lib', 'types')
  const emittedFile = resolve(dirname(resolvedImporter), source)
  if (!isWithinDirectory(emittedRoot, emittedFile)) {
    throw new Error('Risk Advisor CSS import escapes the emitted client source tree')
  }

  const sourceRelative = relative(emittedRoot, emittedFile)
  if (!sourceRelative.endsWith('.module.css')) {
    throw new Error('Risk Advisor CSS import is not a CSS module')
  }

  const projectRoot = realpathSync(lexicalProjectRoot)
  const sourceRoot = realpathSync(resolve(projectRoot, 'src'))
  const sourceFile = resolve(sourceRoot, sourceRelative)
  if (!isWithinDirectory(sourceRoot, sourceFile)) {
    throw new Error('Risk Advisor CSS import escapes src')
  }

  const file = realpathSync(sourceFile)
  if (!isWithinDirectory(sourceRoot, file)) {
    throw new Error('Risk Advisor CSS file resolves outside src')
  }

  const projectRelative = toPosixPath(relative(projectRoot, file))
  if (!projectRelative.startsWith('src/client/') || !projectRelative.endsWith('.module.css')) {
    throw new Error('Risk Advisor CSS file is outside the client CSS source tree')
  }

  return `${cssModulePrefix}${projectRelative}${cssModuleSuffix}`
}

/** Resolve a stable virtual ID against this build's source root, never an encoded host path. */
function sourceStylePathFromId(id: string): string {
  const projectRelative = id.slice(cssModulePrefix.length, -cssModuleSuffix.length)
  const segments = projectRelative.split('/')
  if (
    projectRelative.includes('\\') ||
    !projectRelative.startsWith('src/client/') ||
    !projectRelative.endsWith('.module.css') ||
    segments.some(segment => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new Error('Invalid Risk Advisor CSS virtual module identity')
  }

  const projectRoot = realpathSync(process.cwd())
  const sourceRoot = realpathSync(resolve(projectRoot, 'src'))
  const sourceFile = resolve(projectRoot, ...segments)
  if (!isWithinDirectory(sourceRoot, sourceFile)) {
    throw new Error('Risk Advisor CSS virtual module escapes src')
  }

  const file = realpathSync(sourceFile)
  if (!isWithinDirectory(sourceRoot, file)) {
    throw new Error('Risk Advisor CSS virtual module resolves outside src')
  }
  return file
}

/** Keep the row's namespaced CSS module in this plugin's standalone client bundle. */
const cssModulePlugin: TsdownPlugin = {
  name: 'dsh-risk-advisor-css-module',
  resolveId(source, importer) {
    if (!source.endsWith('.module.css') || importer === undefined) return null
    return cssModuleIdentity(source, importer)
  },
  async load(id) {
    if (!id.startsWith(cssModulePrefix) || !id.endsWith(cssModuleSuffix)) return null
    const file = sourceStylePathFromId(id)
    this.addWatchFile(file)
    const css = await readFile(file, 'utf8')
    const classes = [...new Set([...css.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)].map(match => match[1]))]
    const classMap = Object.fromEntries(classes.map(name => [name, name]))
    const styleId = `${packageId}/${basename(file)}`
    return [
      `const css = ${JSON.stringify(css)};`,
      `const tagId = ${JSON.stringify(styleId)};`,
      "if (typeof document !== 'undefined' && !Array.from(document.querySelectorAll('style')).some(tag => tag.getAttribute('data-plugin-css') === tagId)) {",
      "  const tag = document.createElement('style');",
      `  tag.dataset.plugin = ${JSON.stringify(packageId)};`,
      '  tag.dataset.pluginCss = tagId;',
      '  tag.textContent = css;',
      '  document.head.appendChild(tag);',
      '}',
      `export default ${JSON.stringify(classMap)};`,
    ].join('\n')
  },
}

const host: UserConfig = {
  name: packageId,
  entry: { index: 'lib/types/index.js' },
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  sourcemap: true,
  clean: false,
}

const client: UserConfig = {
  name: `${packageId}/client`,
  entry: { client: 'lib/types/client/index.js' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
  dts: false,
  sourcemap: true,
  clean: false,
  deps: {
    neverBundle: isModuleTableEntry,
    alwaysBundle: (specifier: string) => !isModuleTableEntry(specifier),
  },
  plugins: [cssModulePlugin],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    chunkFileNames: 'client.[name].js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageId)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default [host, client]
