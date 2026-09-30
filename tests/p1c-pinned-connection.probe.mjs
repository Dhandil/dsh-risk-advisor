/*
 * Phase 1C recovery acceptance-only probe.
 *
 * This intentionally imports the frozen Harness build by absolute repository
 * path. It is not part of the package test chain: adding a normal plugin test
 * would require installing the pinned Connection package or coupling the
 * published plugin to this repository layout. The probe uses the actual
 * HostConnectionService and only isolates WebServer/BrowserAuth seams.
 */
import { strict as assert } from 'node:assert'
import { EventEmitter } from 'node:events'
import { Readable } from 'node:stream'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const harnessRoot = process.env.RISK_ADVISOR_FROZEN_HARNESS_ROOT ?? 'D:\\Harness\\deepseek-harness'
const harnessModule = (...segments) => import(pathToFileURL(join(harnessRoot, ...segments)).href)
const { Context } = await harnessModule('vendor', 'cordis', 'lib', 'index.js')
const { HostConnectionService } = await harnessModule('packages', 'client', 'connection', 'lib', 'index.js')
const { handleRiskAdvisorRpc } = await import(new URL('../lib/types/host/browser-bridge.js', import.meta.url).href)

const routes = []
const webServer = {
  register(route) {
    assert.equal(routes.some(candidate => candidate.kind === route.kind && candidate.path === route.path), false)
    routes.push(route)
    return () => {
      const index = routes.indexOf(route)
      if (index >= 0) routes.splice(index, 1)
    }
  },
}

function fakeRequest(headers, url, body) {
  const request = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))])
  Object.assign(request, {
    url,
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
  })
  return request
}

function fakeResponse() {
  const state = { status: undefined, headers: undefined, body: undefined }
  const chunks = []
  const response = Object.assign(new EventEmitter(), {
    writableEnded: false,
    writeHead(status, headers) {
      state.status = status
      state.headers = headers
      return this
    },
    write(value) {
      chunks.push(Buffer.from(value))
      return true
    },
    end(value) {
      if (typeof value === 'string' || value instanceof Uint8Array) chunks.push(Buffer.from(value))
      if (chunks.length > 0) state.body = Buffer.concat(chunks).toString()
      this.writableEnded = true
      return this
    },
  })
  return { response, state }
}

const session = { id: 'probe-session' }
const sessions = {
  get(sessionId) {
    return sessionId === session.id ? session : undefined
  },
}
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
  queryActiveForCall(currentSession, callId) {
    return currentSession === session && callId === safeSnapshot.callId
      ? { kind: 'VIEW', snapshot: safeSnapshot }
      : { kind: 'NOT_FOUND' }
  },
  queryOpenByAssessmentId(assessmentId) {
    return assessmentId === safeSnapshot.assessmentId
      ? { kind: 'VIEW', snapshot: safeSnapshot }
      : { kind: 'NOT_FOUND' }
  },
}

const browserAuthFixture = {
  isAuthenticated(request) {
    return request.headers.cookie === 'probe=valid'
  },
}

const ctx = new Context()
ctx.provide('webServer', webServer)
const fiber = ctx.plugin({
  apply(owner) {
    const connection = new HostConnectionService(owner, [], browserAuthFixture)
    assert.equal(connection instanceof HostConnectionService, true)
    owner.effect(
      () => connection.rpc.handle('/risk-advisor', (endpoint, payload, signal) =>
        handleRiskAdvisorRpc(sessions, coordinator, endpoint, payload, signal)),
      'phase1c-pinned-risk-advisor-bridge',
    )
  },
})
await fiber.await()

assert.equal(routes.length, 1)
const route = routes[0]
assert.deepEqual({ kind: route.kind, path: route.path }, { kind: 'prefix', path: '/risk-advisor' })

const unauthenticated = fakeResponse()
await route.handler(fakeRequest({ host: 'localhost' }, '/risk-advisor/active'), unauthenticated.response)
assert.deepEqual({ status: unauthenticated.state.status, body: unauthenticated.state.body }, { status: 401, body: 'unauthorized' })

const untrusted = fakeResponse()
await route.handler(fakeRequest({ host: 'other.example', cookie: 'probe=valid' }, '/risk-advisor/active'), untrusted.response)
assert.deepEqual({ status: untrusted.state.status, body: untrusted.state.body }, { status: 403, body: 'forbidden' })

const authenticated = fakeResponse()
await route.handler(fakeRequest(
  { host: 'localhost', cookie: 'probe=valid' },
  '/risk-advisor/active',
  {
    type: 'client-request',
    rpcId: 'p1c-pinned-rpc',
    method: 'active',
    payload: { sessionId: session.id, callId: safeSnapshot.callId },
  },
), authenticated.response)
assert.equal(authenticated.state.status, 200)
const serverResponse = JSON.parse(authenticated.state.body)
assert.deepEqual(serverResponse.result, {
  ok: true,
  value: {
    kind: 'VIEW',
    view: {
      schemaVersion: 1,
      sessionId: session.id,
      callId: safeSnapshot.callId,
      assessmentId: safeSnapshot.assessmentId,
      association: 'BOUND',
      status: 'unavailable',
      stage: 'not-started',
      reasonCodes: ['ASSESSOR_NOT_IMPLEMENTED'],
      updatedAt: 123,
    },
  },
})
const serialized = JSON.stringify(serverResponse)
for (const forbidden of ['approvalId', 'executionId', 'rawArguments', 'cwd', 'operationHash']) {
  assert.equal(serialized.includes(forbidden), false)
}

await fiber.dispose()
assert.equal(routes.length, 0)

console.log('PINNED_HARNESS_SHA=ddefc45fbc7f8e46dd73185e68295696d1297887')
console.log('REAL_HOST_CONNECTION_SERVICE=true')
console.log('ROUTE_REGISTERED=/risk-advisor')
console.log('UNAUTHENTICATED_STATUS=401')
console.log('UNTRUSTED_HOST_STATUS=403')
console.log('AUTHENTICATED_STATUS=200')
console.log('RISK_ADVISOR_RESPONSE=VIEW')
console.log('PRIVACY_SAFE=true')
console.log('ROUTE_AFTER_DISPOSE=0')
console.log('P1C_PINNED_CONNECTION_PROBE=PASS')
