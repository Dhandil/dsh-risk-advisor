/*
 * Phase 1C maintenance probe.
 *
 * This imports the frozen Harness build by absolute repository path and uses
 * the real HostConnectionService public exact-fetch registry. The only local
 * seam is the WebServer/auth carrier around the already-mounted /api route.
 */
import { strict as assert } from 'node:assert'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const harnessRoot = process.env.RISK_ADVISOR_FROZEN_HARNESS_ROOT ?? fileURLToPath(new URL('../../../deepseek-harness/', import.meta.url))
const harnessModule = (...segments) => import(pathToFileURL(join(harnessRoot, ...segments)).href)
const { Context } = await harnessModule('vendor', 'cordis', 'lib', 'index.js')
const { HostConnectionService } = await harnessModule('packages', 'client', 'connection', 'lib', 'index.js')
const { installRiskAdvisorBrowserBridge } = await import(new URL('../lib/types/host/browser-bridge.js', import.meta.url).href)

const session = { id: 'probe-session' }
const sessions = { get: sessionId => sessionId === session.id ? session : undefined }
const safeSnapshot = Object.freeze({
  sessionId: session.id,
  callId: 'probe-call',
  assessmentId: 'ra-assessment-00000000-0000-4000-8000-000000000000',
  association: 'BOUND',
  status: 'unavailable',
  stage: 'not-started',
  reasonCodes: Object.freeze(['ASSESSOR_NOT_IMPLEMENTED']),
  updatedAt: 123,
})
const coordinator = {
  queryActivePresentationForCall(currentSession, callId) {
    return currentSession === session && callId === safeSnapshot.callId
      ? { kind: 'VIEW', view: safeSnapshot }
      : { kind: 'NOT_FOUND' }
  },
  queryOpenPresentationByAssessmentId(assessmentId) {
    return assessmentId === safeSnapshot.assessmentId
      ? { kind: 'VIEW', view: safeSnapshot }
      : { kind: 'NOT_FOUND' }
  },
}

const browserAuthFixture = { isAuthenticated: request => request.headers.get('cookie') === 'probe=valid' }
const ctx = new Context()
ctx.provide('sessions', sessions)
ctx.provide('webServer', { register() { throw new Error('exact fetch repair must not register a WebServer route') } })
const fiber = ctx.plugin({
  apply(owner) {
    const connection = new HostConnectionService(owner, [], browserAuthFixture)
    installRiskAdvisorBrowserBridge(owner, connection, coordinator)
    ctx.provide('probeConnection', connection)
  },
})
await fiber.await()

const connection = ctx.get('probeConnection')
const shared = connection.createSharedFetchHandler('/api')

function request(path, body, headers = { host: 'localhost', cookie: 'probe=valid', 'content-type': 'application/json' }, method = 'POST') {
  return new Request(`http://localhost${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

async function serve(input) {
  const rejection = connection.requestRejection(input)
  if (rejection !== undefined) return new Response(rejection === 401 ? 'unauthorized' : 'forbidden', { status: rejection })
  return shared.fetch(input)
}

const activeRequest = {
  type: 'client-request',
  rpcId: 'p1c-maintenance-active',
  method: 'risk-advisor/active',
  payload: { sessionId: session.id, callId: safeSnapshot.callId },
}
const assessmentRequest = {
  type: 'client-request',
  rpcId: 'p1c-maintenance-assessment',
  method: 'risk-advisor/assessment',
  payload: { assessmentId: safeSnapshot.assessmentId },
}

const unauthenticated = await serve(request('/api/risk-advisor/active', activeRequest, { host: 'localhost', 'content-type': 'application/json' }))
assert.equal(unauthenticated.status, 401)
const untrusted = await serve(request('/api/risk-advisor/active', activeRequest, { host: 'other.example', cookie: 'probe=valid', 'content-type': 'application/json' }))
assert.equal(untrusted.status, 403)

const active = await serve(request('/api/risk-advisor/active', activeRequest))
assert.equal(active.status, 200)
const activeResponse = await active.json()
assert.deepEqual(activeResponse, {
  type: 'server-response',
  rpcId: activeRequest.rpcId,
  result: { ok: true, value: { kind: 'VIEW', view: safeSnapshot } },
})

const assessment = await serve(request('/api/risk-advisor/assessment', assessmentRequest))
assert.equal(assessment.status, 200)
const assessmentResponse = await assessment.json()
assert.deepEqual(assessmentResponse, {
  type: 'server-response',
  rpcId: assessmentRequest.rpcId,
  result: { ok: true, value: { kind: 'VIEW', view: safeSnapshot } },
})

const mismatch = await serve(request('/api/risk-advisor/active', { ...assessmentRequest }))
assert.equal(mismatch.status, 200)
const mismatchResponse = await mismatch.json()
assert.deepEqual(mismatchResponse.result, {
  ok: false,
  error: { code: 'gateway/bad-request', message: 'request method does not match route endpoint', details: {} },
})

const oldChannel = await serve(request('/risk-advisor/active', activeRequest))
assert.equal(oldChannel.status, 404)

const serialized = JSON.stringify(activeResponse)
for (const forbidden of ['approvalId', 'executionId', 'rawArguments', 'cwd', 'operationHash']) {
  assert.equal(serialized.includes(forbidden), false)
}

await fiber.dispose()
assert.equal((await serve(request('/api/risk-advisor/active', activeRequest))).status, 404)
assert.equal((await serve(request('/api/risk-advisor/assessment', assessmentRequest))).status, 404)

console.log('PINNED_HARNESS_SHA=ddefc45fbc7f8e46dd73185e68295696d1297887')
console.log('REAL_HOST_CONNECTION_SERVICE=true')
console.log('EXACT_ROUTE_ACTIVE=/api/risk-advisor/active')
console.log('EXACT_ROUTE_ASSESSMENT=/api/risk-advisor/assessment')
console.log('UNAUTHENTICATED_STATUS=401')
console.log('UNTRUSTED_HOST_STATUS=403')
console.log('AUTHENTICATED_STATUS=200')
console.log('RPC_ENVELOPE_COMPATIBLE=true')
console.log('OLD_INDEPENDENT_CHANNEL_STATUS=404')
console.log('PRIVACY_SAFE=true')
console.log('ROUTES_AFTER_DISPOSE=0')
console.log('P1C_PINNED_CONNECTION_PROBE=PASS')
