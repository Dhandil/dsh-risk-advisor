import type { BrowserDimension, BrowserFindingDimension, BrowserRiskAssessmentV1 } from '../../bridge-contract.ts'
import type { RiskAssessment } from '../risk-engine.ts'
import type { DimensionAssessment } from '../assessment-aggregator.ts'

export function presentRiskAssessment(assessment: RiskAssessment): BrowserRiskAssessmentV1 {
  const dimensions = {
    risk: presentDimension(assessment.dimensions.risk),
    authorization: presentDimension(assessment.dimensions.authorization),
    necessity: presentDimension(assessment.dimensions.necessity),
    privilege: presentDimension(assessment.dimensions.privilege),
    alternatives: presentDimension(assessment.dimensions.alternatives),
    evidenceQuality: presentDimension(assessment.dimensions.evidenceQuality),
  }
  return deepFreeze({
    schemaVersion: 1,
    assessmentId: bound(assessment.assessmentId, 256),
    status: assessment.status,
    dimensions,
    aggregate: {
      recommendation: assessment.aggregate.recommendation,
      hazardLevel: assessment.aggregate.hazardLevel,
      attention: assessment.aggregate.attentionLevel,
      primaryReasonCodes: assessment.aggregate.primaryReasonCodes.slice(0, 8).map(item => bound(item, 128)),
    },
    findings: assessment.findings.slice(0, 32).map(item => ({
      code: bound(item.code, 128), title: bound(item.title, 160), detail: bound(item.detail, 800),
      dimension: item.dimension, severity: item.severity, strength: item.strength,
    })),
    uncertainties: assessment.uncertainties.slice(0, 16).map(item => ({
      code: bound(item.code, 128), description: bound(item.description, 800),
      ...(item.dimension === undefined ? {} : { dimension: item.dimension as BrowserFindingDimension }),
      impact: item.impact,
      ...(item.resolutionHint === undefined ? {} : { resolutionHint: bound(item.resolutionHint, 800) }),
    })),
    alternatives: assessment.alternatives.slice(0, 3).map(item => ({
      title: bound(item.title, 160), description: bound(item.description, 800), source: item.source, verification: item.verification,
    })),
    evidence: { ledgerHealth: assessment.evidence.ledgerHealth },
    judgeAssisted: assessment.provenance.judge.invoked,
    ...(assessment.supersedesAssessmentId === undefined ? {} : { supersedesAssessmentId: bound(assessment.supersedesAssessmentId, 256) }),
  })
}

function presentDimension(dimension: DimensionAssessment): BrowserDimension {
  return {
    verdict: bound(dimension.verdict, 64),
    source: dimension.source,
    evidenceQuality: dimension.evidenceQuality,
    reasons: dimension.reasons.slice(0, 8).map(reason => ({ code: bound(reason.code, 256), message: bound(reason.message, 256) })),
  }
}

function bound(value: string, limit: number): string { return value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, limit) }
function deepFreeze<T>(value: T): T { if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.freeze(value); if (Array.isArray(value)) for (const item of value) deepFreeze(item); else for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child); return value }
