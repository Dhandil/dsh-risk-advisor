import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve as resolvePath } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { performance } from 'node:perf_hooks'
import { createRequire } from 'node:module'

const run = promisify(execFile)
const require = createRequire(import.meta.url)

function makeFs(root) {
  const target = displayPath => ({ targetKey: displayPath, displayPath })
  const full = (value, cwd = root) => resolvePath(cwd, value)
  return {
    resolve: async (value, options = {}) => target(full(value, options.cwd ?? root)),
    processPath: value => value.displayPath,
    fileUrl: value => `file://${value.displayPath}`,
    contains: (parent, child) => { const path = relative(parent.displayPath, child.displayPath); return path === '' || (!path.startsWith('..') && !path.startsWith('/') && !/^[A-Za-z]:/.test(path)) },
    lstat: async (value, options = {}) => { try { const item = await import('node:fs/promises').then(fs => fs.lstat(full(value, options.cwd ?? root))); return { version: String(item.mtimeMs), type: item.isSymbolicLink() ? 'symlink' : item.isDirectory() ? 'directory' : item.isFile() ? 'file' : 'other', size: item.size } } catch { return undefined } },
    stat: async value => { try { const item = await stat(value.displayPath); return { version: String(item.mtimeMs), type: item.isDirectory() ? 'directory' : item.isFile() ? 'file' : 'other', size: item.size } } catch { return undefined } },
    readBytes: async value => new Uint8Array(await readFile(value.displayPath)),
    listDir: async value => await readdir(value.displayPath),
  }
}

function makeShell(observations) {
  return {
    resolve: request => request,
    run: async spec => {
      const request = spec
      const script = JSON.parse(request.command.slice('node -e '.length))
      try {
        const output = await run('node', ['-e', script], { cwd: request.workdir, env: { ...process.env, ...request.env }, maxBuffer: 4096 })
        observations.push(JSON.parse(output.stdout))
        return { exitCode: 0, stdout: { text: output.stdout } }
      } catch (error) {
        const failure = error
        return { exitCode: typeof failure.code === 'number' ? failure.code : 1, stdout: { text: failure.stdout ?? '' }, stderr: { text: failure.stderr ?? '' } }
      }
    },
  }
}

function execution(session, name, args, id) {
  return { name, arguments: args, callId: id, rootCallId: 'root', signal: new AbortController().signal, token: Symbol(), agent: { session } }
}

async function collect(runtime, session, id, name, args) {
  runtime.seeds.capture(execution(session, name, args, id), id)
  return await new Promise(resolve => runtime.collect(id, resolve))
}

async function localGit(root, args) { return await run('git', args, { cwd: root, maxBuffer: 8192 }) }

function deferred() {
  let resolve
  const promise = new Promise(value => { resolve = value })
  return { promise, resolve }
}

function riskContext(requestedPermission) {
  const findings = requestedPermission === 'danger-full-access' ? [{ id: 'PERMISSION_DANGER_FULL_ACCESS', category: 'permission', severity: 'high', summary: 'requested width', hard: true }] : []
  const feature = (id, value) => ({ id, value, source: 'DETERMINISTIC', strength: 'DETERMINISTIC' })
  return {
    schemaVersion: 1,
    contextId: `p8-benchmark-${requestedPermission}`,
    executionId: `p8-benchmark-${requestedPermission}`,
    seed: { schemaVersion: 1, executionId: `p8-benchmark-${requestedPermission}`, toolName: 'write', operationText: 'write', resourceHints: [], requestedPermission, truncated: false },
    ruleEvaluation: { schemaVersion: 1, rulesetVersion: 'phase4-v1', executionId: `p8-benchmark-${requestedPermission}`, status: 'READY', operationKind: 'filesystem-write', parserConfidence: 'high', mutating: true, externalEffect: false, networkEffect: 'none', requestedPermission, workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown', failureContext: { isRetry: false, retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: 'unknown', degraded: false }, findings, reasonCodes: [] },
    failureSummary: { executionId: `p8-benchmark-${requestedPermission}`, retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: 'unknown', truncated: false, reasonCodes: [] },
    directUser: { messages: [], historyOmitted: false, degraded: false },
    ledger: { health: 'HEALTHY', sourceComplete: true, truncated: false, issueCodes: [] },
    features: { schemaVersion: 1, features: [feature('scope.canonicalTargetsKnown', 'unknown'), feature('scope.workspaceOnly', 'unknown'), feature('scope.outsideWorkspace', false), feature('scope.pathAliasObserved', 'unknown'), feature('scope.targetCountKnown', 'unknown'), feature('recovery.rollbackMechanismKnown', 'unknown'), feature('recovery.reversible', 'unknown'), feature('privilege.minimumScopeEvidenceAvailable', false), feature('privilege.requestedScope', requestedPermission === 'danger-full-access' ? 'unrestricted' : 'workspace')] },
    degraded: false,
    historyOmitted: false,
  }
}

function riskAssessment(context) {
  const dimension = (name, verdict, source = 'UNKNOWN') => ({ dimension: name, verdict, source, evidenceQuality: 'MEDIUM', basisFeatureIds: [], basisEventIds: [], reasons: [] })
  return { schemaVersion: 1, assessmentId: `a1-${context.executionId}`, executionId: context.executionId, contextId: context.contextId, createdAt: 1, status: 'PARTIAL', dimensions: { risk: dimension('RISK', 'LOW', 'RULE'), authorization: dimension('AUTHORIZATION', 'UNKNOWN'), necessity: dimension('NECESSITY', 'UNKNOWN'), privilege: dimension('PRIVILEGE', 'UNKNOWN'), alternatives: dimension('ALTERNATIVES', 'NO_KNOWN_SAFER_ALTERNATIVE', 'RULE'), evidenceQuality: dimension('EVIDENCE_QUALITY', 'MEDIUM', 'RULE') }, aggregate: { recommendation: 'NEED_MORE_INFORMATION', hazardLevel: 'LOW', attention: 'ELEVATED', primaryReasonCodes: [] }, findings: [], alternatives: [], uncertainties: [], evidence: { featureIds: [], eventIds: [], counts: { authoritative: 0, deterministic: 0, inferred: 0, judge: 0 }, ledgerHealth: 'HEALTHY' }, provenance: { rulesetVersion: 'phase4-v1', featureSchemaVersion: 1, contextBuilderVersion: 'phase5-context-v1', aggregatorVersion: 'phase5-aggregator-v1', judge: { invoked: false, dimensions: [] } } }
}

function evidenceSnapshot(executionId) {
  return { schemaVersion: 1, evidenceId: `evidence-${executionId}`, executionId, status: 'COMPLETE', observedAt: 1, facts: { targetCountKnown: true, canonicalTargetsKnown: true, workspaceContained: true, pathAliasObserved: false, versionControlled: true, exactTargetsClean: true, checkpointAvailable: 'unknown', rollbackMechanismKnown: true, packageManifestPresent: 'unknown', packageManifestValid: 'unknown', lifecycleScriptsPresent: 'unknown' }, counts: { evidenceItems: 1, fileReads: 0, evidenceChars: 0, directoryEntries: 0 }, truncated: false, reasonCodes: [] }
}

async function minimumScopeProof(overlayEvidenceContext, mergeEvidenceAssessment) {
  const results = {}
  for (const permission of ['workspace-write', 'danger-full-access']) {
    const base = riskContext(permission)
    const evidence = overlayEvidenceContext(base, evidenceSnapshot(base.executionId))
    const merged = mergeEvidenceAssessment(riskAssessment(base), base, evidence, evidenceSnapshot(base.executionId), `a3-${permission}`, 2)
    results[permission] = { privilege: merged.dimensions.privilege.verdict, reversible: evidence.features.features.find(item => item.id === 'recovery.reversible')?.value }
  }
  return results
}

async function staleGenerationProof(EvidenceCollector, root) {
  const session = { id: 'p8-stale-session', header: { cwd: root } }
  const gate = deferred()
  const started = deferred()
  const target = value => ({ targetKey: value, displayPath: value })
  const oldFs = { resolve: async (value, options = {}) => target(value.startsWith('/') ? value : `${options.cwd ?? '/workspace'}/${value}`), processPath: value => value.displayPath, contains: () => true, lstat: async () => { started.resolve(); await gate.promise; return { version: '1', type: 'file', size: 1 } }, stat: async () => ({ version: '1', type: 'file', size: 1 }), readBytes: async () => new Uint8Array(), listDir: async () => [] }
  const runtime = new EvidenceCollector()
  runtime.attachFs(oldFs)
  const oldExecution = execution(session, 'write', { file_path: 'stale.txt', content: 'x' }, 'stale-old')
  runtime.seeds.capture(oldExecution, 'stale-old')
  const oldResult = new Promise(resolve => runtime.collect('stale-old', resolve))
  await started.promise
  runtime.attachFs(makeFs(root))
  await writeFile(join(root, 'fresh.txt'), 'fresh')
  const newExecution = execution(session, 'write', { file_path: 'fresh.txt', content: 'x' }, 'stale-new')
  runtime.seeds.capture(newExecution, 'stale-new')
  const newResult = new Promise(resolve => runtime.collect('stale-new', resolve))
  gate.resolve()
  const [oldSnapshot, newSnapshot] = await Promise.all([oldResult, newResult])
  await runtime.dispose()
  return { oldStatus: oldSnapshot.status, newStatus: newSnapshot.status, oldSuccessPublished: oldSnapshot.status === 'COMPLETE' }
}

export async function main({ smoke = true } = {}) {
  const samples = smoke ? 1 : 2
  const root = await mkdtemp(join(tmpdir(), 'dsh-risk-advisor-p8-'))
  const outside = await mkdtemp(join(tmpdir(), 'dsh-risk-advisor-p8-outside-'))
  const observations = []
  const paths = { mkdir: [], copy: [], copyNear1MiB: [], git: [], nodeResolve: [], outside: [], package: [], packageOverLimit: [], directoryBudget: [] }
  const started = performance.now()
  const { EvidenceCollector } = await import('../src/host/evidence-collector.ts')
  const { EvidenceScheduler } = await import('../src/host/evidence-scheduler.ts')
  const { mergeEvidenceAssessment, overlayEvidenceContext } = await import('../src/host/risk-engine.ts')
  const minimumScope = await minimumScopeProof(overlayEvidenceContext, mergeEvidenceAssessment)
  let previousFsmonitorSentinel = process.env.P8_FSMONITOR_SENTINEL
  const fsmonitorSentinel = join(root, 'fsmonitor-sentinel.txt')
  try {
    await writeFile(join(root, 'tracked.txt'), 'tracked')
    await localGit(root, ['init', '--quiet'])
    await localGit(root, ['config', 'user.email', 'phase8@example.invalid'])
    await localGit(root, ['config', 'user.name', 'Phase 8 Benchmark'])
    await localGit(root, ['add', 'tracked.txt'])
    await localGit(root, ['commit', '--quiet', '-m', 'benchmark'])
    process.env.P8_FSMONITOR_SENTINEL = fsmonitorSentinel
    await localGit(root, ['config', 'core.fsmonitor', "node -e \"require('node:fs').writeFileSync(process.env.P8_FSMONITOR_SENTINEL,'executed')\""])
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'phase8-fixture', version: '1.0.0', scripts: { prepare: 'echo bounded' } }))
    await writeFile(join(root, '.gitignore'), 'ignored.txt\n')
    await writeFile(join(root, 'untracked.txt'), 'untracked')
    await writeFile(join(root, 'ignored.txt'), 'ignored')
    await writeFile(join(outside, 'outside.txt'), 'outside metadata only')
    const session = { id: 'phase8-benchmark-session', header: { cwd: root } }
    const runtime = new EvidenceCollector()
    runtime.attachFs(makeFs(root))
    runtime.attachShell(makeShell(observations))
    for (let i = 0; i < samples; i += 1) {
      const dir = join(root, `actual-dir-${i}`)
      await mkdir(dir)
      const mkdirEvidence = await collect(runtime, session, `mkdir-${i}`, 'bash', { command: `mkdir actual-dir-${i}`, description: 'Create local benchmark directory' })
      paths.mkdir.push({ operation: 'mkdir', status: mkdirEvidence.status, counts: mkdirEvidence.counts, realProductExecution: true })

      const source = join(root, `source-${i}.txt`)
      const destination = join(root, `destination-${i}.txt`)
      await writeFile(source, 'small evidence copy')
      await writeFile(destination, await readFile(source))
      const copyEvidence = await collect(runtime, session, `copy-${i}`, 'bash', { command: `cp source-${i}.txt destination-${i}.txt`, description: 'Copy local benchmark file' })
      paths.copy.push({ operation: 'copy', status: copyEvidence.status, counts: copyEvidence.counts, fixtureBytes: (await stat(source)).size, realProductExecution: true })

      const near = join(root, `near-${i}.bin`)
      await writeFile(near, Buffer.alloc(1024 * 1024 - 1, 7))
      const nearEvidence = await collect(runtime, session, `near-${i}`, 'write', { file_path: `near-${i}.bin`, content: 'bounded benchmark placeholder' })
      paths.copyNear1MiB.push({ operation: 'near-1MiB-target', status: nearEvidence.status, counts: nearEvidence.counts, fixtureBytes: (await stat(near)).size, realProductExecution: true })

      const states = []
      const clean = await collect(runtime, session, `git-clean-${i}`, 'write', { file_path: 'tracked.txt', content: 'tracked' })
      states.push({ state: 'tracked-clean', versionControlled: clean.facts.versionControlled, exactTargetsClean: clean.facts.exactTargetsClean, checker: observations.at(-1) })
      await writeFile(join(root, 'tracked.txt'), `dirty-${i}`)
      const dirty = await collect(runtime, session, `git-dirty-${i}`, 'write', { file_path: 'tracked.txt', content: `dirty-${i}` })
      states.push({ state: 'tracked-dirty', versionControlled: dirty.facts.versionControlled, exactTargetsClean: dirty.facts.exactTargetsClean, checker: observations.at(-1) })
      const untracked = await collect(runtime, session, `git-untracked-${i}`, 'write', { file_path: 'untracked.txt', content: 'untracked' })
      states.push({ state: 'untracked', versionControlled: untracked.facts.versionControlled, exactTargetsClean: untracked.facts.exactTargetsClean, checker: observations.at(-1) })
      const ignored = await collect(runtime, session, `git-ignored-${i}`, 'write', { file_path: 'ignored.txt', content: 'ignored' })
      states.push({ state: 'ignored', versionControlled: ignored.facts.versionControlled, exactTargetsClean: ignored.facts.exactTargetsClean, checker: observations.at(-1) })
      paths.git.push({ operation: 'git-local-product-checker', states, fsmonitorDisabled: !(await stat(fsmonitorSentinel).then(() => true).catch(() => false)), realProductExecution: true })

      const outsideEvidence = await collect(runtime, session, `outside-${i}`, 'write', { file_path: join(outside, 'outside.txt'), content: 'outside' })
      paths.outside.push({ operation: 'outside-metadata-only', status: outsideEvidence.status, workspaceContained: outsideEvidence.facts.workspaceContained, contentRead: outsideEvidence.counts.fileReads > 0, realProductExecution: true })

      const packageEvidence = await collect(runtime, session, `package-${i}`, 'bash', { command: 'npm install', description: 'Inspect local package manifest' })
      paths.package.push({ operation: 'package-manifest', status: packageEvidence.status, valid: packageEvidence.facts.packageManifestValid, realProductExecution: true })
      await writeFile(join(root, 'package.json'), `${'x'.repeat(64 * 1024 + 1)}`)
      const packageOverLimit = await collect(runtime, session, `package-over-${i}`, 'bash', { command: 'npm install', description: 'Inspect oversized local package manifest' })
      paths.packageOverLimit.push({ operation: 'package-over-limit', status: packageOverLimit.status, reasonCodes: packageOverLimit.reasonCodes, realProductExecution: true })

      const budgetDir = join(root, `budget-dir-${i}`)
      await mkdir(budgetDir)
      for (let entry = 0; entry < 220; entry += 1) await writeFile(join(budgetDir, `entry-${entry}.txt`), 'x')
      const directoryEvidence = await collect(runtime, session, `directory-${i}`, 'write', { file_path: `budget-dir-${i}`, content: 'directory target' })
      paths.directoryBudget.push({ operation: 'directory-budget', status: directoryEvidence.status, retainedEntries: directoryEvidence.counts.directoryEntries, reasonCodes: directoryEvidence.reasonCodes, realProductExecution: true })

      const packageRoot = join(root, 'node_modules', 'benchmark-local')
      await mkdir(packageRoot, { recursive: true })
      await writeFile(join(packageRoot, 'package.json'), JSON.stringify({ name: 'benchmark-local', version: '1.0.0', main: 'index.js' }))
      await writeFile(join(packageRoot, 'index.js'), 'module.exports = 1\n')
      paths.nodeResolve.push({ operation: 'node-resolve', status: require.resolve('benchmark-local', { paths: [root] }) ? 'MATCHED' : 'UNKNOWN', realLocalExecution: true })
    }

    const staleGeneration = await staleGenerationProof(EvidenceCollector, root)

    const timeoutScheduler = new EvidenceScheduler(1, 1, 5000)
    let settled = false
    const timeoutStarted = performance.now()
    const slow = timeoutScheduler.enqueue('timeout', async () => { await new Promise(resolve => setTimeout(resolve, 5050)); settled = true; return 'settled' })
    const timeoutResult = await slow
    const timeout = { result: timeoutResult.reason ?? 'MATCHED', activeAfterTimeout: settled ? 0 : 1, ownedUntilSettle: true, elapsedMs: performance.now() - timeoutStarted }
    await timeoutScheduler.dispose()

    const saturationScheduler = new EvidenceScheduler(2, 8, 5000)
    let concurrent = 0; let maxConcurrent = 0
    const saturationJobs = Array.from({ length: 11 }, (_, i) => saturationScheduler.enqueue(`saturation-${i}`, async () => { concurrent += 1; maxConcurrent = Math.max(maxConcurrent, concurrent); await new Promise(resolve => setTimeout(resolve, 10)); concurrent -= 1; return i }))
    const saturationResults = await Promise.all(saturationJobs)
    const saturation = { maxConcurrent, maxPending: 8, saturated: saturationResults.filter(item => !item.ok && item.reason === 'SATURATED').length, realScheduler: true }
    await saturationScheduler.dispose()
    await runtime.dispose()
    return Object.freeze({ run: Object.freeze({ benchmark: 'R5_PHASE8_LOCAL_EVIDENCE', mode: smoke ? 'SMOKE' : 'FULL', samples, labels: ['LOCAL_EVIDENCE_ONLY', 'NETWORK_NOT_USED', 'PROVIDER_NOT_USED', 'REGISTRY_NOT_USED', 'GIT_REMOTE_NOT_USED'], realLocalExecution: true, elapsedMs: performance.now() - started }), paths, minimumScope, staleGeneration, timeout, saturation, nonClaims: Object.freeze({ provider: 'PROVIDER_NOT_USED', network: 'NETWORK_NOT_USED', registry: 'REGISTRY_NOT_USED', gitRemote: 'GIT_REMOTE_NOT_USED' }) })
  } finally {
    if (previousFsmonitorSentinel === undefined) delete process.env.P8_FSMONITOR_SENTINEL
    else process.env.P8_FSMONITOR_SENTINEL = previousFsmonitorSentinel
    await rm(root, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
}
