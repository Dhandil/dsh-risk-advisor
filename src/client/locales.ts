export type RiskAdvisorLocaleKey =
  | 'command.label'
  | 'advisory.title'
  | 'advisory.disclaimer'
  | 'state.analyzing'
  | 'state.ready'
  | 'state.unavailable'
  | 'state.cancelled'
  | 'risk'
  | 'recommendation'
  | 'authorization'
  | 'necessity'
  | 'privilege'
  | 'alternatives'
  | 'evidenceQuality'
  | 'findings'
  | 'uncertainties'
  | 'failureContext'
  | 'rulesOnly'
  | 'judgeAssisted'
  | 'modelSuggested'
  | 'unverified'
  | 'copy'
  | 'copied'
  | 'copyFailed'

export const NS = 'risk-advisor.r1'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'risk-advisor.r1': RiskAdvisorLocaleKey
  }
}

export const en = {
  'state.unavailable': 'UNAVAILABLE',
  'command.label': 'Original command',
  'advisory.title': 'Risk Advisor',
  'advisory.disclaimer': 'Advisory presentation only; Native Approval remains authoritative.',
  'state.analyzing': 'ANALYZING',
  'state.ready': 'ASSESSMENT READY',
  'state.cancelled': 'CANCELLED',
  risk: 'Risk',
  recommendation: 'Recommendation',
  authorization: 'Authorization',
  necessity: 'Necessity',
  privilege: 'Privilege',
  alternatives: 'Alternatives',
  evidenceQuality: 'Evidence Quality',
  findings: 'Findings',
  uncertainties: 'Uncertainties',
  failureContext: 'Failure context',
  rulesOnly: 'Rules-only assessment',
  judgeAssisted: 'Judge-assisted semantic gap fill',
  modelSuggested: 'Model suggested',
  unverified: 'Unverified',
  copy: 'Copy',
  copied: 'Copied',
  copyFailed: 'Copy unavailable',
} satisfies Record<RiskAdvisorLocaleKey, string>

export const zh = {
  'state.unavailable': 'UNAVAILABLE',
  'command.label': '原始命令',
  'advisory.title': 'Risk Advisor',
  'advisory.disclaimer': '仅提供风险建议；Native Approval 仍是唯一权威。',
  'state.analyzing': '分析中',
  'state.ready': '评估就绪',
  'state.cancelled': '已取消',
  risk: '风险',
  recommendation: '建议',
  authorization: '授权',
  necessity: '必要性',
  privilege: '权限',
  alternatives: '替代方案',
  evidenceQuality: '证据质量',
  findings: '发现',
  uncertainties: '不确定性',
  failureContext: '失败上下文',
  rulesOnly: '仅规则评估',
  judgeAssisted: 'Judge 辅助语义补全',
  modelSuggested: '模型建议',
  unverified: '未验证',
  copy: '复制',
  copied: '已复制',
  copyFailed: '无法复制',
} satisfies Record<RiskAdvisorLocaleKey, string>
