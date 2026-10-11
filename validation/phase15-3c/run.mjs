import { execFile as execFileCallback, spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { createHash } from 'node:crypto'
import { access, lstat, mkdir, readFile, readdir, realpath, rm, rmdir, stat, writeFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const execFile = promisify(execFileCallback)
const fixtureDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(fixtureDir, '../..')
const harnessRoot = resolve(repoRoot, '../../deepseek-harness')
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const clientPath = join(repoRoot, 'lib/client.js')
const evidenceDir = join(repoRoot, 'docs/tasks/Phase15-product-readiness/evidence/phase15-3c')
const expectedHarness = 'ddefc45fbc7f8e46dd73185e68295696d1297887'
const screenshotFiles = [
  '01-default-history-collapsed-desktop-en-light.png',
  '02-history-open-narrow-zh-dark.png',
  '03-approval-metadata-narrow-zh-dark.png',
  '04-approval-metadata-desktop-en-light.png',
]
const evidence = []
let vite
let chrome
let cdp
let tempRoot
let externalBlocked = 0
let createdEvidenceDir = false
let evidenceDirExists = false
const resumePartialEvidence = process.argv.includes('--resume-partial')

function invariant(condition, description, observed = undefined) {
  if (!condition) throw new Error(`ASSERTION_FAILED: ${description}${observed === undefined ? '' : `; observed=${JSON.stringify(observed)}`}`)
}

async function freePort() {
  const server = createServer()
  await new Promise((resolveListen, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolveListen))
  const port = server.address().port
  await new Promise(resolveClose => server.close(resolveClose))
  return port
}

async function waitFor(predicate, description, timeoutMs = 15000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) return
    await delay(50)
  }
  throw new Error(`TIMEOUT: ${description}`)
}

function openCdp(url, allowedOrigin) {
  return new Promise((resolveOpen, rejectOpen) => {
    const ws = new WebSocket(url)
    const pending = new Map()
    let nextId = 0
    ws.addEventListener('open', () => resolveOpen({
      send(method, params = {}) {
        const id = ++nextId
        return new Promise((resolveReply, rejectReply) => {
          pending.set(id, { resolve: resolveReply, reject: rejectReply })
          ws.send(JSON.stringify({ id, method, params }))
        })
      },
      close: async () => {
        if (ws.readyState === WebSocket.CLOSED) return
        await new Promise(resolveClose => {
          ws.addEventListener('close', resolveClose, { once: true })
          if (ws.readyState < WebSocket.CLOSING) ws.close()
        })
      },
    }))
    ws.addEventListener('error', rejectOpen, { once: true })
    ws.addEventListener('message', event => {
      let message
      try { message = JSON.parse(String(event.data)) } catch { return }
      if (message.id !== undefined) {
        const request = pending.get(message.id)
        if (request === undefined) return
        pending.delete(message.id)
        if (message.error !== undefined) request.reject(new Error(message.error.message ?? 'CDP command failed'))
        else request.resolve(message.result)
        return
      }
      if (message.method !== 'Fetch.requestPaused') return
      const requestId = message.params.requestId
      let parsed
      try { parsed = new URL(message.params.request.url) } catch { parsed = undefined }
      if (parsed?.origin === allowedOrigin) {
        ws.send(JSON.stringify({ id: ++nextId, method: 'Fetch.continueRequest', params: { requestId } }))
      } else {
        externalBlocked += 1
        ws.send(JSON.stringify({ id: ++nextId, method: 'Fetch.failRequest', params: { requestId, errorReason: 'BlockedByClient' } }))
      }
    })
  })
}

async function evaluate(expression) {
  const response = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })
  if (response.exceptionDetails) throw new Error(`PAGE_EVALUATION_FAILED: ${response.exceptionDetails.text ?? 'page expression failed'}`)
  return response.result?.value
}

async function capture(name) {
  invariant(evidence.length < 5, 'screenshot count does not exceed five')
  const image = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true })
  if (!evidenceDirExists) {
    await mkdir(evidenceDir)
    createdEvidenceDir = true
    evidenceDirExists = true
  }
  const path = join(evidenceDir, name)
  await writeFile(path, Buffer.from(image.data, 'base64'), { flag: 'wx' })
  const bytes = await readFile(path)
  evidence.push({ path: `docs/tasks/Phase15-product-readiness/evidence/phase15-3c/${name}`, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length })
}

async function captureIfMissing(name) {
  if (evidence.some(item => item.path.endsWith(`/${name}`))) return
  await capture(name)
}

async function stopProcess(child, name) {
  if (child === undefined || child.exitCode !== null) return
  child.kill('SIGTERM')
  const exited = await Promise.race([
    new Promise(resolveExit => child.once('exit', () => resolveExit(true))),
    delay(5000).then(() => false),
  ])
  invariant(exited, `${name} stopped after normal termination request`)
}

try {
  const { stdout: harnessSha } = await execFile('git', ['rev-parse', 'HEAD'], { cwd: harnessRoot })
  invariant(harnessSha.trim() === expectedHarness, 'pinned Harness SHA matches', harnessSha.trim())
  const { stdout: harnessStatus } = await execFile('git', ['status', '--porcelain=v1', '--untracked-files=no'], { cwd: harnessRoot })
  invariant(harnessStatus.trim() === '', 'pinned Harness tracked tree is clean')
  const clientBytes = await readFile(clientPath)
  const clientSha256 = createHash('sha256').update(clientBytes).digest('hex')
  await access(join(repoRoot, 'node_modules/.bin/vite'))
  await access(chromePath)
  const chromeRealpath = await realpath(chromePath)
  invariant(chromeRealpath === chromePath, 'installed Chrome binary path is expected', chromeRealpath)
  try {
    await stat(evidenceDir)
    invariant(resumePartialEvidence, 'existing Phase 15.3C evidence is refused unless explicit partial-run resume was requested')
    const existingNames = await readdir(evidenceDir)
    invariant(existingNames.length > 0 && existingNames.every(name => screenshotFiles.includes(name)), 'partial evidence contains only this runner’s labelled screenshot names', existingNames)
    for (const name of existingNames) {
      const path = join(evidenceDir, name)
      const details = await lstat(path)
      invariant(details.isFile() && !details.isSymbolicLink(), 'partial screenshot is a regular file, not a link', name)
      const bytes = await readFile(path)
      evidence.push({ path: `docs/tasks/Phase15-product-readiness/evidence/phase15-3c/${name}`, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length })
    }
    evidenceDirExists = true
    invariant(evidence.length < 5, 'partial run leaves screenshot budget for final checks', evidence.length)
  } catch (error) { if (error.code !== 'ENOENT') throw error }

  tempRoot = await (await import('node:fs/promises')).mkdtemp(join(tmpdir(), 'ra-phase15-3c-browser-'))
  const canonicalTemp = await realpath(tempRoot)
  const canonicalTempBase = await realpath(tmpdir())
  invariant(canonicalTemp.startsWith(`${canonicalTempBase}/ra-phase15-3c-browser-`), 'unique browser temp root is inside system temporary directory')
  const appPort = await freePort()
  const allowedOrigin = `http://127.0.0.1:${appPort}`
  vite = spawn(join(repoRoot, 'node_modules/.bin/vite'), ['--config', join(fixtureDir, 'vite.config.mjs'), '--host', '127.0.0.1', '--port', String(appPort), '--strictPort'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none', VITE_TELEMETRY_DISABLED: '1', RISK_ADVISOR_PHASE15_3C_VITE_CACHE: join(canonicalTemp, 'vite-cache') },
  })
  let viteOutput = ''
  for (const stream of [vite.stdout, vite.stderr]) stream.on('data', chunk => { viteOutput = `${viteOutput}${String(chunk)}`.slice(-5000) })
  await waitFor(async () => {
    if (vite.exitCode !== null) throw new Error(`VITE_EXITED: ${viteOutput.replaceAll(repoRoot, '<repo>')}`)
    try { return (await fetch(`${allowedOrigin}/`)).ok } catch { return false }
  }, 'loopback-only synthetic Vite fixture')

  const profilePath = join(canonicalTemp, 'chrome-profile')
  chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-features=MediaRouter,OptimizationHints',
    '--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
    `--user-data-dir=${profilePath}`, '--remote-debugging-port=0', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' } })
  let chromeErrors = ''
  chrome.stderr.on('data', chunk => { chromeErrors = `${chromeErrors}${String(chunk)}`.slice(-2000) })
  const devtoolsFile = join(profilePath, 'DevToolsActivePort')
  await waitFor(async () => {
    if (chrome.exitCode !== null) throw new Error(`CHROME_EXITED: ${chromeErrors.slice(-1000)}`)
    try { return (await readFile(devtoolsFile, 'utf8')).trim().length > 0 } catch { return false }
  }, 'fresh temporary-profile Chrome DevTools endpoint')
  const [devtoolsPort] = (await readFile(devtoolsFile, 'utf8')).trim().split('\n')
  const target = await fetch(`http://127.0.0.1:${devtoolsPort}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json())
  cdp = await openCdp(target.webSocketDebuggerUrl, allowedOrigin)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] })
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  await cdp.send('Page.navigate', { url: `${allowedOrigin}/` })
  await waitFor(async () => await evaluate('Boolean(window.__phase15C?.metrics)'), 'real exported components mount')
  const browser = await cdp.send('Browser.getVersion')
  const userAgent = await evaluate('navigator.userAgent')
  invariant(userAgent.includes('Chrome/'), 'browser is installed Chrome channel', userAgent)
  const styleEvidence = await evaluate(`(() => {
    const styles=[...document.querySelectorAll('style[data-plugin-css^="@dhandil/dsh-risk-advisor/"]')];
    return {count:styles.length, runtime:styles.some(x=>x.textContent.includes('.historical summary')), operation:styles.some(x=>x.textContent.includes('.riskAdvisor__operationDetails'))};
  })()`)
  invariant(styleEvidence.runtime && styleEvidence.operation, 'built Client injected the updated production CSS modules', styleEvidence)

  let observed = await evaluate('window.__phase15C.metrics()')
  invariant(observed.historyDetails.length === 1 && observed.historyDetails[0].open === false, 'A1 history starts closed in native details', observed.historyDetails)
  invariant(observed.historyDetails[0].summary.includes('Historical context') && observed.historyDetails[0].summary.toLowerCase().includes('unverified'), 'history summary communicates source and current applicability limit', observed.historyDetails[0].summary)
  invariant(observed.ordinaryHeight > 0 && observed.ordinaryHeight < 340, 'collapsed history keeps default synthetic risk surface below the V2 340px inline fixture', observed.ordinaryHeight)
  await captureIfMissing(screenshotFiles[0])

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
  await evaluate(`window.__phase15C.setLocale('zh'); window.__phase15C.setTheme('dark'); document.querySelector('[data-runtime-risk-dock] details summary').click()`)
  await delay(160)
  observed = await evaluate('window.__phase15C.metrics()')
  invariant(observed.viewportWidth === 390 && observed.documentWidth <= 390 && observed.composerScrollWidth <= observed.composerClientWidth, 'expanded bilingual history has no horizontal overflow at 390px', observed)
  invariant(observed.historyDetails.length === 1 && observed.historyDetails[0].open, 'Chinese native disclosure expands for review')
  const historyText = await evaluate('document.querySelector("[data-runtime-risk-dock] details")?.innerText')
  for (const field of ['Verified historical pattern', 'A qualified verified-success pattern covers 3 distinct Episodes across 2 UTC dates.', 'Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.', 'Independently verify the current target and expected postcondition.', 'This guidance does not determine risk or grant permission or approval.']) {
    invariant(historyText.includes(field), 'all original history source fields stay intact and visible when expanded', field)
  }
  await captureIfMissing(screenshotFiles[1])

  await evaluate(`document.querySelector('[data-mode="approval"]').click()`)
  await waitFor(async () => await evaluate(`document.querySelector('[data-testid="risk-advisor-indicator"] button') !== null`), 'approval detail component mounts')
  await evaluate(`document.querySelector('[data-testid="risk-advisor-indicator"] button').click()`)
  await waitFor(async () => await evaluate('Boolean(document.querySelector("[role=dialog],dialog[open]"))'), 'approval Details modal opens')
  await delay(100)
  observed = await evaluate('window.__phase15C.metrics()')
  invariant(observed.indicatorHeight === 28, 'Native Approval contribution remains exactly 28px', observed.indicatorHeight)
  invariant(observed.resourceCount === 2 && observed.dangerPermissionVisible, 'all individual resources and danger-full-access remain visible in the existing modal', observed)
  invariant(observed.operationRows.length === 5 && observed.operationRows.every(columns => columns.trim().split(/\s+/).length === 1), 'operation metadata uses a stacked narrow-width layout', observed.operationRows)
  invariant(observed.viewportWidth === 390 && observed.documentWidth <= 390 && observed.composerScrollWidth <= observed.composerClientWidth, 'narrow approval modal has no horizontal overflow', observed)
  invariant(observed.decisionControls.length === 0 && !observed.correctionDockMounted, 'fixture adds no decision control or correction finding surface', observed)
  await captureIfMissing(screenshotFiles[2])

  await evaluate(`document.querySelector('[role="dialog"] button[aria-label]').click(); document.querySelector('[data-locale="en"]').click(); document.querySelector('[data-theme="light"]').click()`)
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  await delay(160)
  await evaluate(`document.querySelector('[data-testid="risk-advisor-indicator"] button').click()`)
  await waitFor(async () => await evaluate('Boolean(document.querySelector("[role=dialog],dialog[open]"))'), 'desktop approval Details modal reopens')
  observed = await evaluate('window.__phase15C.metrics()')
  invariant(observed.indicatorHeight === 28 && observed.operationRows.length === 5, 'desktop Native Approval indicator and all semantic metadata rows remain', observed)
  invariant(observed.operationRows.every(columns => columns.trim().split(/\s+/).length >= 2), 'desktop metadata uses labelled two-column row layout', observed.operationRows)
  invariant(observed.decisionControls.length === 0, 'no second approval decision authority appears')
  await captureIfMissing(screenshotFiles[3])

  invariant(externalBlocked === 0, 'no external browser request was attempted', externalBlocked)
  console.log(JSON.stringify({
    fixture: 'Phase 15.3C synthetic-only real-component browser validation',
    testedClientSha256: clientSha256,
    harnessSha: harnessSha.trim(),
    browser: browser.product,
    userAgent,
    externalRequestBlockedCount: externalBlocked,
    styleEvidence,
    screenshots: evidence,
    cleanup: 'Chrome and Vite are closed and the unique temporary profile/cache root is removed in finally.',
  }, null, 2))
} catch (error) {
  console.error(String(error?.stack ?? error).replaceAll(repoRoot, '<repo>').replaceAll(tempRoot ?? '<temp-unset>', '<phase15-3c-temporary-root>'))
  process.exitCode = 1
} finally {
  if (cdp !== undefined) {
    try { await cdp.send('Browser.close') } catch { /* Chrome may already be exiting */ }
    try { await cdp.close() } catch { /* normal socket close */ }
  }
  await stopProcess(chrome, 'temporary Chrome')
  await stopProcess(vite, 'Vite fixture server')
  if (tempRoot !== undefined) {
    const canonicalTemp = await realpath(tempRoot)
    const canonicalTempBase = await realpath(tmpdir())
    invariant(canonicalTemp.startsWith(`${canonicalTempBase}/ra-phase15-3c-browser-`), 'cleanup remains inside this run’s unique temporary root')
    await rm(canonicalTemp, { recursive: true, force: false })
  }
  if (createdEvidenceDir && evidence.length === 0) await rmdir(evidenceDir)
}
