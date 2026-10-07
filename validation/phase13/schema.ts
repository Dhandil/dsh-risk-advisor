export const PHASE13_GENERATOR_VERSION = 'phase13-generator-v1' as const
export const PHASE13_STRUCTURAL_MAX_SCENARIOS = 512
export const PHASE13_STRUCTURAL_MAX_TOOL_EXECUTIONS = 4096
export const PHASE13_1_SMOKE_MAX_SCENARIOS = 30
export const PHASE13_1_SMOKE_MAX_TOOL_EXECUTIONS = 100

export interface Phase13RunPolicy {
  readonly maxScenarios: number
  readonly maxToolExecutions: number
}

export const PHASE13_1_SMOKE_POLICY: Phase13RunPolicy = Object.freeze({
  maxScenarios: PHASE13_1_SMOKE_MAX_SCENARIOS,
  maxToolExecutions: PHASE13_1_SMOKE_MAX_TOOL_EXECUTIONS,
})

export type FindingLifetimeExpectation = 'NO_ASSERTION' | 'PRESERVE_PRIOR' | 'ALLOW_PRIOR_REMOVAL'
export const FINDING_LIFETIME_EXPECTATIONS = new Set<FindingLifetimeExpectation>([
  'NO_ASSERTION', 'PRESERVE_PRIOR', 'ALLOW_PRIOR_REMOVAL',
])

export const F1_KIND = 'REPEATED_FAILURE_WITHOUT_PROGRESS' as const
export const F2_KIND = 'POSTCONDITION_NOT_SATISFIED' as const
export type Phase13FindingKind = typeof F1_KIND | typeof F2_KIND
export type ExpectedSignal = 'EXPECTED' | 'NOT_EXPECTED' | 'NOT_APPLICABLE'
export type ExpectedProcess = 'SUCCESS' | 'FAILURE' | 'EITHER'
export type F2Settlement = 'NONE' | 'DIRECT' | 'ASYNC_SUPPORTED'
export type OpportunityLabel = 'NONE' | 'OUT_OF_SCOPE_USEFUL_WARNING_CANDIDATE'

export interface Phase13ExpectedV1 {
  readonly f1: ExpectedSignal
  readonly f2: ExpectedSignal
}

export interface Phase13StepV1 {
  readonly stepId: string
  readonly operationRef: string
  readonly expectedProcess: ExpectedProcess
  readonly expected: Phase13ExpectedV1
  readonly f2Settlement: F2Settlement
  readonly opportunity: OpportunityLabel
  readonly findingLifetime: FindingLifetimeExpectation
}

export interface Phase13ScenarioV1 {
  readonly scenarioId: string
  readonly family: string
  readonly sessionKey: string
  readonly steps: readonly Phase13StepV1[]
}

export interface Phase13ManifestV1 {
  readonly schemaVersion: 1
  readonly generatorVersion: typeof PHASE13_GENERATOR_VERSION
  readonly campaignRunId: string
  readonly seed: string
  readonly lane: 'A' | 'B' | 'C'
  readonly scenarios: readonly Phase13ScenarioV1[]
}

export class ManifestValidationError extends Error {
  constructor(readonly reason: string) {
    super(`invalid-phase13-manifest:${reason}`)
    this.name = 'ManifestValidationError'
  }
}

export class RunPolicyError extends Error {
  constructor(readonly reason: string) {
    super(`phase13-run-policy:${reason}`)
    this.name = 'RunPolicyError'
  }
}

const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const EXPECTED_SIGNALS = new Set<ExpectedSignal>(['EXPECTED', 'NOT_EXPECTED', 'NOT_APPLICABLE'])
const EXPECTED_PROCESSES = new Set<ExpectedProcess>(['SUCCESS', 'FAILURE', 'EITHER'])
const SETTLEMENTS = new Set<F2Settlement>(['NONE', 'DIRECT', 'ASYNC_SUPPORTED'])
const OPPORTUNITIES = new Set<OpportunityLabel>(['NONE', 'OUT_OF_SCOPE_USEFUL_WARNING_CANDIDATE'])

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Reflect.ownKeys(value)
  return keys.length === expected.length
    && keys.every(key => typeof key === 'string' && expected.includes(key))
}

function boundedId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !ID.test(value) || value.includes('..')) throw new ManifestValidationError(`${label}-invalid`)
  return value
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
    Object.freeze(value)
  }
  return value
}

/** Parse by copying only the frozen V1 whitelist, then deeply freeze the copy. */
export function parsePhase13ManifestV1(value: unknown, declaredOperationRefs: readonly string[]): Phase13ManifestV1 {
  if (!isPlainRecord(value) || !exactKeys(value, ['schemaVersion', 'generatorVersion', 'campaignRunId', 'seed', 'lane', 'scenarios'])) {
    throw new ManifestValidationError('root-shape')
  }
  if (value.schemaVersion !== 1) throw new ManifestValidationError('schema-version')
  if (value.generatorVersion !== PHASE13_GENERATOR_VERSION) throw new ManifestValidationError('generator-version')
  const campaignRunId = boundedId(value.campaignRunId, 'campaign-run-id')
  const seed = boundedId(value.seed, 'seed')
  if (value.lane !== 'A' && value.lane !== 'B' && value.lane !== 'C') throw new ManifestValidationError('lane')
  if (!Array.isArray(value.scenarios) || value.scenarios.length === 0 || value.scenarios.length > PHASE13_STRUCTURAL_MAX_SCENARIOS) {
    throw new ManifestValidationError('scenario-count')
  }
  const operationRefs = new Set<string>()
  for (const ref of declaredOperationRefs) {
    boundedId(ref, 'operation-ref')
    if (operationRefs.has(ref)) throw new ManifestValidationError('duplicate-operation-declaration')
    operationRefs.add(ref)
  }

  const scenarioIds = new Set<string>()
  const stepIds = new Set<string>()
  let stepCount = 0
  const scenarios = value.scenarios.map((scenarioValue, scenarioIndex): Phase13ScenarioV1 => {
    if (!isPlainRecord(scenarioValue) || !exactKeys(scenarioValue, ['scenarioId', 'family', 'sessionKey', 'steps'])) {
      throw new ManifestValidationError(`scenario-${scenarioIndex}-shape`)
    }
    const scenarioId = boundedId(scenarioValue.scenarioId, 'scenario-id')
    const family = boundedId(scenarioValue.family, 'family')
    const sessionKey = boundedId(scenarioValue.sessionKey, 'session-key')
    if (scenarioIds.has(scenarioId)) throw new ManifestValidationError('duplicate-scenario-id')
    scenarioIds.add(scenarioId)
    if (!Array.isArray(scenarioValue.steps) || scenarioValue.steps.length === 0) throw new ManifestValidationError('empty-scenario')
    const steps = scenarioValue.steps.map((stepValue, stepIndex): Phase13StepV1 => {
      stepCount += 1
      if (stepCount > PHASE13_STRUCTURAL_MAX_TOOL_EXECUTIONS) throw new ManifestValidationError('step-count')
      if (!isPlainRecord(stepValue)
        || !(exactKeys(stepValue, ['stepId', 'operationRef', 'expectedProcess', 'expected', 'f2Settlement', 'opportunity'])
          || exactKeys(stepValue, ['stepId', 'operationRef', 'expectedProcess', 'expected', 'f2Settlement', 'opportunity', 'findingLifetime']))) {
        throw new ManifestValidationError(`step-${scenarioIndex}-${stepIndex}-shape`)
      }
      const stepId = boundedId(stepValue.stepId, 'step-id')
      const operationRef = boundedId(stepValue.operationRef, 'operation-ref')
      if (stepIds.has(stepId)) throw new ManifestValidationError('duplicate-step-id')
      stepIds.add(stepId)
      if (!operationRefs.has(operationRef)) throw new ManifestValidationError('unresolved-operation-ref')
      if (typeof stepValue.expectedProcess !== 'string' || !EXPECTED_PROCESSES.has(stepValue.expectedProcess as ExpectedProcess)) {
        throw new ManifestValidationError('expected-process')
      }
      if (!isPlainRecord(stepValue.expected) || !exactKeys(stepValue.expected, ['f1', 'f2'])) throw new ManifestValidationError('expected-shape')
      const f1 = stepValue.expected.f1
      const f2 = stepValue.expected.f2
      if (typeof f1 !== 'string' || !EXPECTED_SIGNALS.has(f1 as ExpectedSignal)
        || typeof f2 !== 'string' || !EXPECTED_SIGNALS.has(f2 as ExpectedSignal)) {
        throw new ManifestValidationError('expected-label')
      }
      if (typeof stepValue.f2Settlement !== 'string' || !SETTLEMENTS.has(stepValue.f2Settlement as F2Settlement)) {
        throw new ManifestValidationError('f2-settlement')
      }
      const f2Settlement = stepValue.f2Settlement as F2Settlement
      if (f2 === 'EXPECTED' && f2Settlement === 'NONE') throw new ManifestValidationError('expected-f2-without-settlement')
      if (typeof stepValue.opportunity !== 'string' || !OPPORTUNITIES.has(stepValue.opportunity as OpportunityLabel)) {
        throw new ManifestValidationError('opportunity')
      }
      const findingLifetime = stepValue.findingLifetime ?? 'NO_ASSERTION'
      if (typeof findingLifetime !== 'string' || !FINDING_LIFETIME_EXPECTATIONS.has(findingLifetime as FindingLifetimeExpectation)) {
        throw new ManifestValidationError('finding-lifetime')
      }
      return {
        stepId,
        operationRef,
        expectedProcess: stepValue.expectedProcess as ExpectedProcess,
        expected: { f1: f1 as ExpectedSignal, f2: f2 as ExpectedSignal },
        f2Settlement,
        opportunity: stepValue.opportunity as OpportunityLabel,
        findingLifetime: findingLifetime as FindingLifetimeExpectation,
      }
    })
    return { scenarioId, family, sessionKey, steps }
  })
  return deepFreeze({ schemaVersion: 1, generatorVersion: PHASE13_GENERATOR_VERSION, campaignRunId, seed, lane: value.lane, scenarios })
}

/** Apply an explicit campaign policy after structural manifest parsing. */
export function enforcePhase13RunPolicy(manifest: Phase13ManifestV1, policy: Phase13RunPolicy): void {
  if (!Number.isSafeInteger(policy.maxScenarios) || policy.maxScenarios < 1
    || policy.maxScenarios > PHASE13_STRUCTURAL_MAX_SCENARIOS
    || !Number.isSafeInteger(policy.maxToolExecutions) || policy.maxToolExecutions < 1
    || policy.maxToolExecutions > PHASE13_STRUCTURAL_MAX_TOOL_EXECUTIONS) {
    throw new RunPolicyError('outside-structural-cap')
  }
  if (manifest.scenarios.length > policy.maxScenarios) throw new RunPolicyError('scenario-cap-exceeded')
  const plannedSteps = manifest.scenarios.reduce((total, scenario) => total + scenario.steps.length, 0)
  if (plannedSteps > policy.maxToolExecutions) throw new RunPolicyError('tool-execution-cap-exceeded')
}

export function isPhase13Label(value: unknown): value is string {
  return typeof value === 'string' && ID.test(value) && !value.includes('..')
}
