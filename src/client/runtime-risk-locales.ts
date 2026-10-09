export type RuntimeRiskLocaleKey =
  | 'title' | 'advisory' | 'queued' | 'unavailable' | 'degraded' | 'details' | 'preExecution'
  | 'risk' | 'authorization' | 'necessity' | 'privilege' | 'alternatives' | 'evidenceQuality'
  | 'recommendation' | 'reason' | 'unknown' | 'low' | 'medium' | 'high' | 'critical'
  | 'approve' | 'caution' | 'saferAlternative' | 'moreInformation' | 'reject'

export const RUNTIME_RISK_NS = 'risk-advisor.runtime-risk'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'risk-advisor.runtime-risk': RuntimeRiskLocaleKey }
}

export const runtimeRiskEn = {
  title: 'Risk Advisor',
  advisory: 'Advisory only. Harness execution and Native Approval remain authoritative.',
  queued: 'Assessment is being prepared from evidence captured before execution.',
  unavailable: 'Risk assessment is unavailable.',
  degraded: 'Assessment is incomplete or has unknown evidence.',
  details: 'Details',
  preExecution: 'Based on evidence captured before execution.',
  risk: 'Risk',
  authorization: 'Authorization',
  necessity: 'Necessity',
  privilege: 'Privilege',
  alternatives: 'Alternatives',
  evidenceQuality: 'Evidence quality',
  recommendation: 'Recommendation',
  reason: 'Primary reason',
  unknown: 'Unknown',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
  approve: 'Approve',
  caution: 'Approve with caution',
  saferAlternative: 'Prefer a safer alternative',
  moreInformation: 'More information needed',
  reject: 'Reject recommended',
} satisfies Record<RuntimeRiskLocaleKey, string>

export const runtimeRiskZh = {
  title: 'Risk Advisor 风险提示',
  advisory: '仅供参考；Harness 执行与原生审批仍具最终效力。',
  queued: '正在根据执行前采集的证据生成评估。',
  unavailable: '风险评估暂不可用。',
  degraded: '评估不完整或证据状态未知。',
  details: '详情',
  preExecution: '依据执行前采集的证据。',
  risk: '风险',
  authorization: '授权',
  necessity: '必要性',
  privilege: '权限范围',
  alternatives: '替代方案',
  evidenceQuality: '证据质量',
  recommendation: '建议',
  reason: '主要原因',
  unknown: '未知',
  low: '低',
  medium: '中',
  high: '高',
  critical: '严重',
  approve: '可批准',
  caution: '谨慎批准',
  saferAlternative: '优先考虑更安全的替代方案',
  moreInformation: '需要更多信息',
  reject: '建议拒绝',
} satisfies Record<RuntimeRiskLocaleKey, string>
