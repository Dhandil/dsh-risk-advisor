import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdtemp, mkdir, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const fixtureDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(fixtureDir, '../..')
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const clientPath = join(repoRoot, 'lib/client.js')
const expectedClientSha256 = '06b790cf721dbe2391c1249182b8da71a359eaf4032d062527316f4ae374e735'
const evidenceDir = join(repoRoot, 'docs/tasks/Phase15-product-readiness/evidence/phase15-3a')
const screenshots = []
const results = {}
let vite
let chrome
let cdp
let tempRoot
let remotePort
let externalBlocked = 0

function invariant(condition, description, evidence = undefined) {
  if (!condition) throw new Error(`ASSERTION_FAILED: ${description}${evidence === undefined ? '' : `; observed=${JSON.stringify(evidence)}`}`)
}

async function freePort() {
  const server = createServer()
  await new Promise((resolveListen, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolveListen))
  const port = server.address().port
  await new Promise(resolveClose => server.close(resolveClose))
  return port
}

async function waitFor(predicate, description, timeoutMs = 12000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) return
    await delay(60)
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
      if (message.method === 'Fetch.requestPaused') {
        const requestId = message.params.requestId
        let parsed
        try { parsed = new URL(message.params.request.url) } catch { parsed = undefined }
        if (parsed?.origin === allowedOrigin) {
          ws.send(JSON.stringify({ id: ++nextId, method: 'Fetch.continueRequest', params: { requestId } }))
        } else {
          externalBlocked += 1
          ws.send(JSON.stringify({ id: ++nextId, method: 'Fetch.failRequest', params: { requestId, errorReason: 'BlockedByClient' } }))
        }
      }
    })
  })
}

async function evaluate(expression, awaitPromise = true) {
  const response = await cdp.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture: true })
  if (response.exceptionDetails) throw new Error(`PAGE_EVALUATION_FAILED: ${response.exceptionDetails.text ?? 'page expression failed'}`)
  return response.result?.value
}

async function fixtureAction(expression) {
  await evaluate(expression)
  await delay(160)
}

async function screenshot(name) {
  invariant(screenshots.length < 8, 'screenshot budget is at most eight')
  const image = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true })
  const path = join(evidenceDir, name)
  await writeFile(path, Buffer.from(image.data, 'base64'), { flag: 'wx' })
  const contents = await readFile(path)
  screenshots.push({ name, sha256: createHash('sha256').update(contents).digest('hex'), bytes: contents.length })
}

async function metrics() { return await evaluate('window.__phase15Fixture.metrics()') }

async function selectScenario(scenario, locale = 'en', theme = 'light') {
  await fixtureAction(`document.querySelector('[data-fixture-scenario="${scenario}"]').click()`)
  await fixtureAction(`document.querySelector('[data-fixture-locale="${locale}"]').click()`)
  await fixtureAction(`document.querySelector('[data-fixture-theme="${theme}"]').click()`)
  await evaluate(`document.querySelectorAll('.dock-mount details[open]').forEach(item=>item.querySelector('summary')?.click())`)
  await delay(80)
  await waitFor(async () => (await evaluate('document.querySelector("[data-testid=fixture-state]")?.textContent'))?.includes(`${scenario} ·`), `scenario ${scenario} render`)
}

async function stopProcess(child, name) {
  if (child === undefined || child.exitCode !== null) return
  child.kill('SIGTERM')
  const cleanExit = await Promise.race([
    new Promise(resolveExit => child.once('exit', () => resolveExit(true))),
    delay(5000).then(() => false),
  ])
  invariant(cleanExit, `${name} exited after normal termination request`)
}

try {
  const clientBytes = await readFile(clientPath)
  const actualClientSha256 = createHash('sha256').update(clientBytes).digest('hex')
  invariant(actualClientSha256 === expectedClientSha256, 'source-identified built Client SHA-256 matches Freeze', actualClientSha256)
  const evidenceParent = dirname(evidenceDir)
  await mkdir(evidenceParent, { recursive: true })
  try { await stat(evidenceDir); throw new Error('REFUSING_TO_OVERWRITE_EXISTING_PHASE15_3A_EVIDENCE') }
  catch (error) { if (error.code !== 'ENOENT') throw error }
  await mkdir(evidenceDir)

  const appPort = await freePort()
  const allowedOrigin = `http://127.0.0.1:${appPort}`
  const viteExecutable = join(repoRoot, 'node_modules/.bin/vite')
  vite = spawn(viteExecutable, ['--config', join(fixtureDir, 'vite.config.mjs'), '--host', '127.0.0.1', '--port', String(appPort), '--strictPort'], {
    cwd: repoRoot, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, BROWSER: 'none', VITE_TELEMETRY_DISABLED: '1' },
  })
  let viteOutput = ''
  for (const stream of [vite.stdout, vite.stderr]) stream.on('data', chunk => { viteOutput = `${viteOutput}${String(chunk)}`.slice(-6000) })
  await waitFor(async () => {
    if (vite.exitCode !== null) throw new Error(`VITE_EXITED: ${viteOutput.replaceAll(repoRoot, '<repo>')}`)
    try { const response = await fetch(`${allowedOrigin}/`); return response.ok } catch { return false }
  }, 'loopback-only fixture server')

  tempRoot = await mkdtemp(join(tmpdir(), 'phase15-3a-chrome-'))
  const profilePath = join(tempRoot, 'profile')
  const chromePathExists = await realpath(chromePath)
  invariant(chromePathExists === chromePath, 'installed Google Chrome executable path is exact')
  // Let Chrome atomically allocate an ephemeral port and publish it in
  // DevToolsActivePort; probing a free port first would have a TOCTOU race.
  chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-features=MediaRouter,OptimizationHints',
    '--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
    `--user-data-dir=${profilePath}`, '--remote-debugging-port=0', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' } })
  let chromeErrors = ''
  chrome.stderr.on('data', chunk => { chromeErrors = `${chromeErrors}${String(chunk)}`.slice(-3000) })
  const devtoolsFile = join(profilePath, 'DevToolsActivePort')
  await waitFor(async () => {
    if (chrome.exitCode !== null) throw new Error(`CHROME_EXITED: ${chromeErrors.slice(-1200)}`)
    try { return (await readFile(devtoolsFile, 'utf8')).trim().length > 0 } catch { return false }
  }, 'temporary-profile Chrome DevTools endpoint')
  const devtools = (await readFile(devtoolsFile, 'utf8')).trim().split('\n')
  remotePort = Number(devtools[0])
  const newTarget = await fetch(`http://127.0.0.1:${remotePort}/json/new?about:blank`, { method: 'PUT' }).then(response => response.json())
  cdp = await openCdp(newTarget.webSocketDebuggerUrl, allowedOrigin)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Network.enable')
  await cdp.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] })
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  await cdp.send('Page.navigate', { url: `${allowedOrigin}/` })
  await waitFor(async () => await evaluate('Boolean(window.__phase15Fixture?.metrics)'), 'real component fixture mount')

  const browser = await cdp.send('Browser.getVersion').catch(() => ({ product: 'Google Chrome (CDP version unavailable)' }))
  const userAgent = await evaluate('navigator.userAgent')
  invariant(userAgent.includes('Chrome/'), 'browser is the installed Chrome channel', userAgent)
  invariant(await evaluate('document.querySelectorAll("style[data-plugin-css^=\\"@dhandil/dsh-risk-advisor/\\"]").length') >= 3, 'built Client injected its real namespaced CSS Modules')

  await selectScenario('V1', 'en', 'light')
  let observed = await evaluate(`(() => {
    const text=document.body.innerText, details=[...document.querySelectorAll('.dock-mount details')];
    const m=window.__phase15Fixture.metrics();
    return { ...m, riskLabel:text.includes('Risk'), recommendation:text.includes('Recommendation'), primaryReason:text.includes('Primary reason'), degraded:text.includes('incomplete or has unknown evidence'), defaultDetailsCollapsed:details.length>0&&details.every(x=>!x.open), onlineDockCount:document.querySelectorAll('[data-online-correction-dock]').length };
  })()`)
  invariant(observed.riskLabel && observed.recommendation && observed.primaryReason && observed.degraded, 'V1 key information and DEGRADED caveat visible', observed)
  invariant(observed.defaultDetailsCollapsed && observed.onlineDockCount === 0 && observed.composerHeight < 260, 'V1 default state is collapsed and compact', observed)
  results.V1 = { outcome: 'PASS', observed }
  await screenshot('01-V1-desktop-en-light-default.png')

  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
  await selectScenario('V2', 'zh', 'dark')
  observed = await evaluate(`(() => ({...window.__phase15Fixture.metrics(), language:document.documentElement.lang, inlineHistory:!!document.querySelector('[aria-label="Verified historical context"]'), historyHeading:document.querySelector('[aria-label="Verified historical context"]')?.innerText, bodyBackground:getComputedStyle(document.body).backgroundColor, rootBackground:getComputedStyle(document.documentElement).backgroundColor, syntheticBanner:document.querySelector('.synthetic-banner')?.innerText}))()`)
  invariant(observed.inlineHistory && observed.historyHeading?.includes('qualified verified-success pattern') && observed.composerHeight > results.V1.observed.composerHeight, 'V2 qualified-history-shaped context is actually inline and adds height', observed)
  invariant(observed.syntheticBanner?.includes('SYNTHETIC') && observed.currentSession.includes('locale zh') && observed.language === 'zh', 'V2 visibly labels its Chinese history DTO as synthetic and marks the document language', observed)
  results.V2 = { outcome: 'OBSERVED_UX_CONCERN', concern: 'Historical Guidance-shaped block is inline rather than collapsed; it materially increases default composer height.', observed }
  await screenshot('02-V2-desktop-zh-dark-inline-history.png')

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  await selectScenario('V3', 'en', 'light')
  await fixtureAction(`document.querySelector('[data-testid="risk-advisor-indicator"] button').click()`)
  observed = await evaluate(`(() => ({...window.__phase15Fixture.metrics(), modal:!!document.querySelector('[role="dialog"], dialog[open]'), dangerPermission:document.body.innerText.includes('danger-full-access'), ordinaryRiskSuppressed:!document.querySelector('[data-runtime-risk-dock]'), onlyAdvisoryNoApprovalControl:document.querySelectorAll('[data-testid="risk-advisor-indicator"]').length===1&&![...document.querySelectorAll('button')].some(b=>/allow|reject/i.test(b.innerText))}))()`)
  invariant(observed.modal && observed.approvalRowHeight === 28 && observed.dangerPermission && observed.ordinaryRiskSuppressed && observed.onlyAdvisoryNoApprovalControl, 'V3 real compact indicator/modal renders while ordinary dock is suppressed and no approval authority is added', observed)
  results.V3 = { outcome: 'PASS', observed }
  await screenshot('03-V3-pending-approval-details-modal.png')
  await fixtureAction(`document.querySelector('[aria-label="Close details"]')?.click()`)

  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
  await selectScenario('V4', 'en', 'dark')
  observed = await evaluate(`(() => ({...window.__phase15Fixture.metrics(), findingKind:document.querySelector('[data-advisory-kind]')?.getAttribute('data-advisory-kind'), findingText:document.querySelector('[data-online-correction-dock]')?.innerText, f1Label:document.querySelector('[data-advisory-kind="REPEATED_FAILURE_WITHOUT_PROGRESS"]')?.innerText}))()`)
  invariant(observed.f1Count === 1 && observed.f2Count === 0 && observed.findingKind === 'REPEATED_FAILURE_WITHOUT_PROGRESS' && observed.findingText.includes('Stop repeating this exact retry path'), 'V4 F1 keeps repeated-failure predicate distinct', observed)
  results.V4 = { outcome: 'PASS', observed }
  await screenshot('04-V4-f1-desktop-en-dark.png')

  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  await selectScenario('V5', 'zh', 'light')
  await fixtureAction(`document.querySelectorAll('.dock-mount details').forEach(x=>{if(!x.open)x.querySelector('summary').click()})`)
  observed = await evaluate(`(() => ({...window.__phase15Fixture.metrics(), findingKind:document.querySelector('[data-advisory-kind]')?.getAttribute('data-advisory-kind'), nextCheck:!!document.querySelector('[data-correction-next-check]'), history:!!document.querySelector('[data-correction-history]'), labels:document.querySelector('[data-online-correction-dock]')?.innerText, evidence:document.querySelector('[data-correction-next-check]')?.innerText, visibleDetails:[...document.querySelectorAll('.dock-mount details')].filter(x=>x.open).length}))()`)
  invariant(observed.f2Count === 1 && observed.f1Count === 0 && observed.nextCheck && observed.history && observed.visibleDetails >= 2, 'V5 F2 finding, manual next check and history are separately labeled and individually expandable', observed)
  invariant(observed.labels.includes('后置条件不匹配') && observed.evidence.includes('后置条件不匹配'), 'V5 distinguishes F2 postcondition evidence from F1 retry evidence in Chinese', observed)
  results.V5 = { outcome: 'PASS', observed }
  await screenshot('05-V5-f2-next-check-and-history-open.png')

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] })
  await selectScenario('V6', 'zh', 'dark')
  observed = await evaluate(`(() => ({...window.__phase15Fixture.metrics(), composerClientWidth:document.querySelector('[data-testid="synthetic-composer"]')?.clientWidth, composerScrollWidth:document.querySelector('[data-testid="synthetic-composer"]')?.scrollWidth, riskText:document.querySelector('[data-runtime-risk-dock]')?.innerText?.slice(0,180), correctionText:document.querySelector('[data-online-correction-dock]')?.innerText?.slice(0,180), mediaDark:matchMedia('(prefers-color-scheme: dark)').matches, rootTheme:document.documentElement.dataset.theme}))()`)
  invariant(observed.viewportWidth === 390 && observed.documentWidth <= 390 && observed.composerScrollWidth <= observed.composerClientWidth, 'V6 narrow viewport has no horizontal overflow', observed)
  invariant(observed.f1Count === 0 && observed.f2Count === 1 && observed.rootTheme === 'dark' && observed.mediaDark, 'V6 narrow Chinese dark state preserves F2 semantic label', observed)
  results.V6 = { outcome: 'PASS', observed, note: 'Long bounded synthetic primary reason wraps; page and composer have no horizontal overflow.' }
  await screenshot('06-V6-narrow-zh-dark-both-docks.png')

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false })
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] })
  await selectScenario('V7', 'en', 'light')
  await fixtureAction(`window.__phase15Fixture.setSession('B')`)
  await fixtureAction(`window.__phase15Fixture.setSession('A')`)
  observed = await evaluate(`(() => ({...window.__phase15Fixture.metrics(), noFinding:!document.querySelector('[data-advisory-kind]'), noCorrectionDock:!document.querySelector('[data-online-correction-dock]'), unavailable:document.body.innerText.includes('Risk assessment is unavailable.'), session:document.querySelector('[data-testid="fixture-state"]')?.innerText, banner:document.querySelector('.synthetic-banner')?.innerText}))()`)
  invariant(observed.noFinding && observed.noCorrectionDock && observed.unavailable && observed.session.includes('session A'), 'V7 A→B→A returns to neutral no-Finding/unavailable view without success claim', observed)
  results.V7 = { outcome: 'PASS', observed, staleResponse: 'NOT_EXERCISED; adapters expose only keyed snapshots and do not emulate Host/client async delivery.' }
  await screenshot('07-V7-neutral-unavailable-session-a-b-a.png')

  const screenshotsWithHashes = screenshots.map(item => ({ ...item, path: `docs/tasks/Phase15-product-readiness/evidence/phase15-3a/${item.name}` }))
  console.log(JSON.stringify({
    fixture: 'Phase 15.3A synthetic-only component rendering',
    clientSha256: actualClientSha256,
    browser: browser.product,
    userAgent,
    allowedOrigin,
    externalRequestBlockedCount: externalBlocked,
    scenarios: results,
    screenshots: screenshotsWithHashes,
  }, null, 2))
} catch (error) {
  console.error(String(error?.stack ?? error).replaceAll(repoRoot, '<repo>').replaceAll(tempRoot ?? '<temp-unset>', '<temporary-profile>'))
  process.exitCode = 1
} finally {
  if (cdp !== undefined) {
    try { await cdp.send('Browser.close') } catch { /* Chrome may already have exited */ }
    try { await cdp.close() } catch { /* ignore normal socket close */ }
  }
  await stopProcess(chrome, 'isolated Chrome')
  await stopProcess(vite, 'Vite fixture server')
  if (tempRoot !== undefined) {
    const canonicalTemp = await realpath(tempRoot)
    const canonicalTempBase = await realpath(tmpdir())
    invariant(canonicalTemp.startsWith(`${canonicalTempBase}/phase15-3a-chrome-`), 'temporary Chrome directory remains inside its unique OS temp root')
    await rm(canonicalTemp, { recursive: true, force: false })
  }
}
