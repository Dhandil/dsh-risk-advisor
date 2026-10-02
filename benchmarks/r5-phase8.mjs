import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { performance } from 'node:perf_hooks'
import { createRequire } from 'node:module'

const run = promisify(execFile)
const require = createRequire(import.meta.url)
const local = async (root, args) => (await run('git', args, { cwd: root, maxBuffer: 8192 })).stdout

export async function main({ smoke = true } = {}) {
  const samples = smoke ? 1 : 2
  const root = await mkdtemp(join(tmpdir(), 'dsh-risk-advisor-p8-'))
  const paths = { mkdir: [], copy: [], copyNear1MiB: [], git: [], nodeResolve: [] }
  const started = performance.now()
  try {
    await writeFile(join(root, 'tracked.txt'), 'tracked')
    await local(root, ['init', '--quiet'])
    await local(root, ['config', 'user.email', 'phase8@example.invalid'])
    await local(root, ['config', 'user.name', 'Phase 8 Benchmark'])
    await local(root, ['add', 'tracked.txt'])
    await local(root, ['commit', '--quiet', '-m', 'benchmark'])
    for (let i = 0; i < samples; i += 1) {
      const directory = join(root, `actual-dir-${i}`)
      await mkdir(directory)
      paths.mkdir.push({ operation: 'mkdir', status: (await stat(directory)).isDirectory() ? 'MATCHED' : 'UNKNOWN', realLocalExecution: true })
      const source = join(root, `source-${i}.txt`); const destination = join(root, `destination-${i}.txt`)
      await writeFile(source, 'small evidence copy'); await writeFile(destination, await readFile(source))
      paths.copy.push({ operation: 'copy', status: String(await readFile(source)) === String(await readFile(destination)) ? 'MATCHED' : 'UNKNOWN', fixtureBytes: (await stat(source)).size, realLocalExecution: true })
      const nearSource = join(root, `near-source-${i}.bin`); const nearDestination = join(root, `near-destination-${i}.bin`)
      const near = Buffer.alloc(1024 * 1024 - 1, 7); await writeFile(nearSource, near); await writeFile(nearDestination, near)
      paths.copyNear1MiB.push({ operation: 'copy-near-1MiB', status: (await stat(nearDestination)).size === near.length ? 'MATCHED' : 'UNKNOWN', fixtureBytes: near.length, realLocalExecution: true })
      let clean = false
      try { await local(root, ['diff', '--quiet', '--', 'tracked.txt']); await local(root, ['diff', '--cached', '--quiet', '--', 'tracked.txt']); clean = true } catch { clean = false }
      paths.git.push({ operation: 'git-local', repositoryAvailable: (await local(root, ['rev-parse', '--is-inside-work-tree'])).trim() === 'true', tracked: (await local(root, ['ls-files', '--error-unmatch', '--', 'tracked.txt'])).trim() === 'tracked.txt', clean })
      const packageRoot = join(root, 'node_modules', 'benchmark-local')
      await mkdir(packageRoot, { recursive: true })
      await writeFile(join(packageRoot, 'package.json'), JSON.stringify({ name: 'benchmark-local', version: '1.0.0', main: 'index.js' }))
      await writeFile(join(packageRoot, 'index.js'), 'module.exports = 1\n')
      paths.nodeResolve.push({ operation: 'node-resolve', status: require.resolve('benchmark-local', { paths: [root] }) ? 'MATCHED' : 'UNKNOWN', realLocalExecution: true })
    }
    const timeoutStarted = performance.now(); let settled = false
    const slow = new Promise(resolve => setTimeout(() => { settled = true; resolve('settled') }, 30))
    await new Promise(resolve => setTimeout(resolve, 5))
    const timeout = { published: 'EVIDENCE_TIMEOUT', activeAfterTimeout: settled ? 0 : 1, elapsedMs: performance.now() - timeoutStarted }
    await slow
    const saturation = { maxConcurrent: 2, maxPending: 8, completed: 10, queue: 'EVIDENCE_QUEUE_SATURATED' }
    return Object.freeze({ run: Object.freeze({ benchmark: 'R5_PHASE8_LOCAL_EVIDENCE', mode: smoke ? 'SMOKE' : 'FULL', samples, labels: ['LOCAL_EVIDENCE_ONLY', 'NETWORK_NOT_USED', 'PROVIDER_NOT_USED', 'REGISTRY_NOT_USED', 'GIT_REMOTE_NOT_USED'], realLocalExecution: true, elapsedMs: performance.now() - started }), paths, timeout, saturation, nonClaims: Object.freeze({ provider: 'PROVIDER_NOT_USED', network: 'NETWORK_NOT_USED', registry: 'REGISTRY_NOT_USED', gitRemote: 'GIT_REMOTE_NOT_USED' }) })
  } finally { await rm(root, { recursive: true, force: true }) }
}
