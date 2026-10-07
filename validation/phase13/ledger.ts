import { appendFile, readFile } from 'node:fs/promises'
import { canonicalJson, sha256Hex } from './canonical.ts'

export const PHASE13_LEDGER_GENESIS = '0'.repeat(64)
export const PHASE13_LEDGER_MAX_BYTES = 2 * 1024 * 1024
export const PHASE13_LEDGER_MAX_LINE_BYTES = 16 * 1024

export type LedgerRecordType = 'RUN_START' | 'SCENARIO_START' | 'STEP_RESULT' | 'SCENARIO_END' | 'RUN_END'
export interface LedgerRecordV1 {
  readonly schemaVersion: 1
  readonly sequence: number
  readonly campaignRunId: string
  readonly type: LedgerRecordType
  readonly payload: Readonly<Record<string, unknown>>
  readonly prevHash: string
  readonly recordHash: string
}

export type LedgerVerification =
  | { readonly status: 'VALID'; readonly records: readonly LedgerRecordV1[]; readonly headHash: string; readonly completed: boolean }
  | { readonly status: 'LEDGER_INTEGRITY_INVALID'; readonly reason: string; readonly records: readonly [] }

const HASH = /^[a-f0-9]{64}$/
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const RECORD_TYPES = new Set<LedgerRecordType>(['RUN_START', 'SCENARIO_START', 'STEP_RESULT', 'SCENARIO_END', 'RUN_END'])
const FORBIDDEN_KEY = /(?:command|argument|cwd|path|stdout|stderr|content|justification|sessionid|callid|approval|credential|secret|token|prompt|model|body|raw|output|environment)/i
const PAYLOAD_KEYS: Record<LedgerRecordType, readonly string[]> = {
  RUN_START: ['generatorVersion', 'seed', 'lane', 'manifestSha256', 'subjectBoundary'],
  SCENARIO_START: ['scenarioId', 'family', 'sessionKey'],
  STEP_RESULT: ['scenarioId', 'stepId', 'family', 'sessionKey', 'operationRef', 'executionCapture', 'expected', 'actualKinds', 'actualFindingIds', 'verificationStatus', 'processObserved', 'classification', 'issueCodes', 'opportunity', 'beforeSessionFindingIds', 'afterSessionFindingIds', 'afterSessionTruncated'],
  SCENARIO_END: ['scenarioId', 'status'],
  RUN_END: ['status', 'scenarioCount', 'toolExecutionCount', 'blocker'],
}
const CAMPAIGN_STATUSES = new Set(['RUNNING', 'COMPLETE', 'BLOCKED_P0', 'BLOCKED_P1', 'BLOCKED_CAPTURE', 'BLOCKED_LEDGER', 'BLOCKED_ENVIRONMENT'])
const SIGNAL_LABELS = new Set(['EXPECTED', 'NOT_EXPECTED', 'NOT_APPLICABLE'])
const CLASSIFICATIONS = new Set(['TP', 'FP', 'FN', 'TN', 'NA', 'UNSCORABLE'])
const FINDING_KINDS = new Set(['REPEATED_FAILURE_WITHOUT_PROGRESS', 'POSTCONDITION_NOT_SATISFIED'])

function boundedLabel(value: unknown): value is string { return typeof value === 'string' && RUN_ID.test(value) && !value.includes('..') }

function validPayload(type: LedgerRecordType, payload: Record<string, unknown>): boolean {
  const keys = Reflect.ownKeys(payload)
  if (keys.some(key => typeof key !== 'string' || !PAYLOAD_KEYS[type].includes(key))) return false
  const has = (...required: readonly string[]) => required.every(key => Object.hasOwn(payload, key))
  if (type === 'RUN_START') return has('generatorVersion', 'seed', 'lane', 'manifestSha256', 'subjectBoundary')
    && payload.generatorVersion === 'phase13-generator-v1' && boundedLabel(payload.seed)
    && ['A', 'B', 'C'].includes(String(payload.lane)) && typeof payload.manifestSha256 === 'string' && HASH.test(payload.manifestSha256)
    && payload.subjectBoundary === 'PINNED_HARNESS_PUBLIC_DIAGNOSTICS'
  if (type === 'SCENARIO_START') return has('scenarioId', 'family', 'sessionKey')
    && boundedLabel(payload.scenarioId) && boundedLabel(payload.family) && boundedLabel(payload.sessionKey)
  if (type === 'SCENARIO_END') return has('scenarioId', 'status') && boundedLabel(payload.scenarioId) && (payload.status === 'COMPLETE' || String(payload.status).startsWith('BLOCKED_'))
  if (type === 'RUN_END') return has('status', 'scenarioCount', 'toolExecutionCount') && CAMPAIGN_STATUSES.has(String(payload.status))
    && Number.isSafeInteger(payload.scenarioCount) && Number(payload.scenarioCount) >= 0 && Number(payload.scenarioCount) <= 30
    && Number.isSafeInteger(payload.toolExecutionCount) && Number(payload.toolExecutionCount) >= 0 && Number(payload.toolExecutionCount) <= 100
  if (!has('scenarioId', 'stepId', 'family', 'sessionKey', 'operationRef', 'executionCapture', 'expected', 'actualKinds', 'actualFindingIds', 'processObserved', 'classification', 'issueCodes', 'opportunity', 'beforeSessionFindingIds', 'afterSessionFindingIds', 'afterSessionTruncated')) return false
  if (![payload.scenarioId, payload.stepId, payload.family, payload.sessionKey, payload.operationRef].every(boundedLabel)) return false
  if (payload.executionCapture !== 'VALID' && payload.executionCapture !== 'CAPTURE_INVALID') return false
  if (payload.processObserved !== 'SUCCESS' && payload.processObserved !== 'FAILURE' && payload.processObserved !== 'UNKNOWN') return false
  if (payload.opportunity !== 'NONE' && payload.opportunity !== 'OUT_OF_SCOPE_USEFUL_WARNING_CANDIDATE') return false
  if (typeof payload.afterSessionTruncated !== 'boolean') return false
  if (payload.verificationStatus !== undefined && !['MATCHED', 'MISMATCHED', 'UNKNOWN', 'UNAVAILABLE'].includes(String(payload.verificationStatus))) return false
  if (!Array.isArray(payload.actualKinds) || payload.actualKinds.length > 64 || !payload.actualKinds.every(kind => FINDING_KINDS.has(String(kind)))) return false
  if (!Array.isArray(payload.actualFindingIds) || payload.actualFindingIds.length > 64 || !payload.actualFindingIds.every(id => typeof id === 'string' && /^ra-correction-v1_[a-f0-9]{64}$/.test(id))) return false
  if (!Array.isArray(payload.beforeSessionFindingIds) || payload.beforeSessionFindingIds.length > 64 || !payload.beforeSessionFindingIds.every(id => typeof id === 'string' && /^ra-correction-v1_[a-f0-9]{64}$/.test(id))) return false
  if (!Array.isArray(payload.afterSessionFindingIds) || payload.afterSessionFindingIds.length > 64 || !payload.afterSessionFindingIds.every(id => typeof id === 'string' && /^ra-correction-v1_[a-f0-9]{64}$/.test(id))) return false
  if (!Array.isArray(payload.issueCodes) || payload.issueCodes.length > 32 || !payload.issueCodes.every(code => typeof code === 'string' && /^[A-Z0-9_]{1,64}$/.test(code))) return false
  const expected = payload.expected; const classification = payload.classification
  if (!plain(expected) || !plain(classification)) return false
  return Object.keys(expected).length === 2 && SIGNAL_LABELS.has(String(expected.f1)) && SIGNAL_LABELS.has(String(expected.f2))
    && Object.keys(classification).length === 2 && CLASSIFICATIONS.has(String(classification.f1)) && CLASSIFICATIONS.has(String(classification.f2))
}

function plain(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function assertSafePayload(value: unknown, depth = 0): void {
  if (depth > 8) throw new TypeError('ledger-payload-depth')
  if (value === null || typeof value === 'boolean') return
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) && !Number.isFinite(value)) throw new TypeError('ledger-number-invalid')
    return
  }
  if (typeof value === 'string') {
    if (value.length > 512 || /(?:\/Users\/|[A-Za-z]:\\|\/home\/)/i.test(value)) throw new TypeError('ledger-string-unbounded-or-path')
    return
  }
  if (Array.isArray(value)) {
    if (value.length > 128) throw new TypeError('ledger-array-cap')
    for (const item of value) assertSafePayload(item, depth + 1)
    return
  }
  if (!plain(value)) throw new TypeError('ledger-value-not-plain-json')
  const keys = Reflect.ownKeys(value)
  if (keys.length > 64) throw new TypeError('ledger-object-cap')
  for (const key of keys) {
    if (typeof key !== 'string' || FORBIDDEN_KEY.test(key)) throw new TypeError('ledger-forbidden-key')
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined || !('value' in descriptor)) throw new TypeError('ledger-accessor')
    assertSafePayload(descriptor.value, depth + 1)
  }
}

function hashable(record: Omit<LedgerRecordV1, 'recordHash'>): string {
  return sha256Hex(canonicalJson(record))
}

function exactRecord(value: unknown): value is LedgerRecordV1 {
  if (!plain(value)) return false
  const keys = Reflect.ownKeys(value)
  return keys.length === 7 && ['schemaVersion', 'sequence', 'campaignRunId', 'type', 'payload', 'prevHash', 'recordHash'].every(key => keys.includes(key))
}

export function verifyLedgerText(text: string, expectedRunId?: string): LedgerVerification {
  if (Buffer.byteLength(text, 'utf8') > PHASE13_LEDGER_MAX_BYTES) return { status: 'LEDGER_INTEGRITY_INVALID', reason: 'ledger-byte-cap', records: [] }
  if (text.length === 0 || !text.endsWith('\n')) return { status: 'LEDGER_INTEGRITY_INVALID', reason: 'truncated-terminal-line', records: [] }
  const lines = text.slice(0, -1).split('\n')
  if (lines.length > 2048) return { status: 'LEDGER_INTEGRITY_INVALID', reason: 'record-count-cap', records: [] }
  const records: LedgerRecordV1[] = []
  let previous = PHASE13_LEDGER_GENESIS
  let runId: string | undefined
  let terminal = false
  let openScenario: string | undefined
  const scenarioIds = new Set<string>()
  const stepIds = new Set<string>()
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!
    if (Buffer.byteLength(line, 'utf8') > PHASE13_LEDGER_MAX_LINE_BYTES) return { status: 'LEDGER_INTEGRITY_INVALID', reason: 'line-byte-cap', records: [] }
    let value: unknown
    try { value = JSON.parse(line) } catch { return { status: 'LEDGER_INTEGRITY_INVALID', reason: `json-${index}`, records: [] } }
    if (!exactRecord(value)) return { status: 'LEDGER_INTEGRITY_INVALID', reason: `record-shape-${index}`, records: [] }
    if (value.schemaVersion !== 1 || value.sequence !== index + 1 || !RUN_ID.test(value.campaignRunId)
      || !RECORD_TYPES.has(value.type) || !HASH.test(value.prevHash) || !HASH.test(value.recordHash) || !plain(value.payload)) {
      return { status: 'LEDGER_INTEGRITY_INVALID', reason: `record-fields-${index}`, records: [] }
    }
    if (index === 0) runId = value.campaignRunId
    if (value.campaignRunId !== runId || (expectedRunId !== undefined && value.campaignRunId !== expectedRunId)) {
      return { status: 'LEDGER_INTEGRITY_INVALID', reason: 'run-id-mismatch', records: [] }
    }
    if (terminal) return { status: 'LEDGER_INTEGRITY_INVALID', reason: 'record-after-run-end', records: [] }
    if (value.prevHash !== previous) return { status: 'LEDGER_INTEGRITY_INVALID', reason: `prev-hash-${index}`, records: [] }
    try { assertSafePayload(value.payload) } catch (error) { return { status: 'LEDGER_INTEGRITY_INVALID', reason: error instanceof Error ? error.message : 'payload-invalid', records: [] } }
    if (!validPayload(value.type, value.payload)) return { status: 'LEDGER_INTEGRITY_INVALID', reason: `payload-schema-${index}`, records: [] }
    if (value.type === 'SCENARIO_START') {
      const id = String(value.payload.scenarioId)
      if (openScenario !== undefined || scenarioIds.has(id)) return { status: 'LEDGER_INTEGRITY_INVALID', reason: 'scenario-transition-invalid', records: [] }
      openScenario = id; scenarioIds.add(id)
      if (scenarioIds.size > 30) return { status: 'LEDGER_INTEGRITY_INVALID', reason: 'scenario-cap', records: [] }
    } else if (value.type === 'STEP_RESULT') {
      const scenarioId = String(value.payload.scenarioId)
      const stepId = String(value.payload.stepId)
      if (openScenario !== scenarioId || stepIds.has(stepId) || stepIds.size >= 100) return { status: 'LEDGER_INTEGRITY_INVALID', reason: 'step-transition-invalid', records: [] }
      stepIds.add(stepId)
    } else if (value.type === 'SCENARIO_END') {
      if (openScenario === undefined || value.payload.scenarioId !== openScenario) return { status: 'LEDGER_INTEGRITY_INVALID', reason: 'scenario-end-invalid', records: [] }
      openScenario = undefined
    } else if (value.type === 'RUN_END' && openScenario !== undefined) {
      return { status: 'LEDGER_INTEGRITY_INVALID', reason: 'run-end-with-open-scenario', records: [] }
    }
    const { recordHash, ...base } = value
    if (hashable(base) !== recordHash) return { status: 'LEDGER_INTEGRITY_INVALID', reason: `record-hash-${index}`, records: [] }
    if (index === 0 && value.type !== 'RUN_START') return { status: 'LEDGER_INTEGRITY_INVALID', reason: 'missing-run-start', records: [] }
    if (value.type === 'RUN_START' && index !== 0) return { status: 'LEDGER_INTEGRITY_INVALID', reason: 'duplicate-run-start', records: [] }
    if (value.type === 'RUN_END') terminal = true
    previous = recordHash
    records.push(Object.freeze(value))
  }
  return { status: 'VALID', records: Object.freeze(records), headHash: previous, completed: terminal }
}

export class TruthLedger {
  private sequence = 0
  private previous = PHASE13_LEDGER_GENESIS
  private ended = false
  private constructor(readonly path: string, readonly campaignRunId: string) {}

  static async create(path: string, campaignRunId: string, startPayload: Readonly<Record<string, unknown>>): Promise<TruthLedger> {
    if (!RUN_ID.test(campaignRunId)) throw new TypeError('ledger-run-id-invalid')
    const ledger = new TruthLedger(path, campaignRunId)
    const prior = await readFile(path, 'utf8').catch(error => (error as NodeJS.ErrnoException).code === 'ENOENT' ? '' : Promise.reject(error))
    if (prior !== '') throw new Error('ledger-already-exists')
    await ledger.append('RUN_START', startPayload)
    return ledger
  }

  async assertHealthy(): Promise<readonly LedgerRecordV1[]> {
    if (this.sequence === 0) return Object.freeze([])
    let text: string
    try { text = await readFile(this.path, 'utf8') }
    catch { throw new Error('LEDGER_INTEGRITY_INVALID') }
    const verified = verifyLedgerText(text, this.campaignRunId)
    if (verified.status !== 'VALID' || verified.completed || verified.records.length !== this.sequence || verified.headHash !== this.previous) {
      throw new Error('LEDGER_INTEGRITY_INVALID')
    }
    return verified.records
  }

  async append(type: LedgerRecordType, payload: Readonly<Record<string, unknown>>): Promise<LedgerRecordV1> {
    if (this.ended || !RECORD_TYPES.has(type) || (this.sequence === 0 && type !== 'RUN_START') || (this.sequence > 0 && type === 'RUN_START')) throw new Error('ledger-state-invalid')
    const prior = this.sequence > 0 ? await this.assertHealthy() : Object.freeze([])
    assertSafePayload(payload)
    if (!plain(payload) || !validPayload(type, payload)) throw new TypeError('ledger-payload-schema')
    const openScenario = [...prior].reverse().find(record => record.type === 'SCENARIO_START' || record.type === 'SCENARIO_END')
    const activeScenario = openScenario?.type === 'SCENARIO_START' ? String(openScenario.payload.scenarioId) : undefined
    if (type === 'SCENARIO_START' && activeScenario !== undefined) throw new Error('ledger-scenario-already-open')
    if ((type === 'STEP_RESULT' || type === 'SCENARIO_END') && (activeScenario === undefined || payload.scenarioId !== activeScenario)) throw new Error('ledger-scenario-transition-invalid')
    if (type === 'RUN_END' && activeScenario !== undefined) throw new Error('ledger-run-end-with-open-scenario')
    const base = { schemaVersion: 1 as const, sequence: this.sequence + 1, campaignRunId: this.campaignRunId, type, payload, prevHash: this.previous }
    const record = Object.freeze({ ...base, recordHash: hashable(base) })
    const line = `${canonicalJson(record)}\n`
    if (Buffer.byteLength(line, 'utf8') > PHASE13_LEDGER_MAX_LINE_BYTES) throw new RangeError('ledger-line-byte-cap')
    await appendFile(this.path, line, { encoding: 'utf8', flag: 'a', mode: 0o600 })
    this.sequence += 1
    this.previous = record.recordHash
    this.ended = type === 'RUN_END'
    return record
  }

  get headHash(): string { return this.previous }
  get recordCount(): number { return this.sequence }
}

export async function readVerifiedLedger(path: string, expectedRunId?: string): Promise<LedgerVerification> {
  try { return verifyLedgerText(await readFile(path, 'utf8'), expectedRunId) }
  catch { return { status: 'LEDGER_INTEGRITY_INVALID', reason: 'ledger-read-failed', records: [] } }
}
