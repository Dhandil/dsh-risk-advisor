export type RiskAdvisorLocaleKey =
  | 'command.label'
  | 'advisory.title'
  | 'advisory.disclaimer'
  | 'state.analyzing'
  | 'state.ready'
  | 'state.unavailable'
  | 'state.cancelled'
  | 'status.partial'
  | 'status.degraded'
  | 'details.open'
  | 'details.title'
  | 'details.close'
  | 'operation.title'
  | 'aggregate.title'
  | 'assessment.status'
  | 'bridge.reasons'
  | 'dimensions.title'
  | 'evidence.title'
  | 'permission.requested'
  | 'hazard.low'
  | 'hazard.medium'
  | 'hazard.high'
  | 'hazard.critical'
  | 'hazard.unknown'
  | 'recommendation.approve'
  | 'recommendation.caution'
  | 'recommendation.saferAlternative'
  | 'recommendation.moreInformation'
  | 'recommendation.reject'
  | 'reason.explicitDenial'
  | 'reason.scopeViolation'
  | 'reason.insufficientEvidence'
  | 'reason.saferAlternative'
  | 'reason.excessivePrivilegeNotNecessary'
  | 'reason.excessivePrivilegeUnjustified'
  | 'reason.privilegeScopeExcessive'
  | 'reason.criticalNotNecessary'
  | 'reason.criticalJustified'
  | 'reason.highNotNecessary'
  | 'reason.highUnresolved'
  | 'reason.highJustified'
  | 'reason.mediumHazard'
  | 'reason.lowHazard'
  | 'reason.unknownFallback'
  | 'reason.unknown'
  | 'reason.none'
  | 'resources'
  | 'requestedPermission'
  | 'workspaceContained'
  | 'sandboxCovered'
  | 'reversible'
  | 'unknown'
  | 'ledgerHealth'
  | 'failureDetails'
  | 'sameRootCause'
  | 'permissionEscalation'
  | 'truncated'
  | 'risk'
  | 'recommendation'
  | 'primaryReason'
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
  | 'preExecutionEvidence'

export const NS = 'risk-advisor.r1'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'risk-advisor.r1': RiskAdvisorLocaleKey
  }
}

export const en = {
  'state.unavailable': 'Unavailable',
  'command.label': 'Original command',
  'advisory.title': 'Risk Advisor',
  'advisory.disclaimer': 'Advisory only; Native Approval remains authoritative.',
  'state.analyzing': 'Analyzing',
  'state.ready': 'Assessment ready',
  'state.cancelled': 'Cancelled',
  'status.partial': 'PARTIAL',
  'status.degraded': 'DEGRADED',
  'details.open': 'Details',
  'details.title': 'Risk Advisor details',
  'details.close': 'Close details',
  'operation.title': 'Operation',
  'aggregate.title': 'Assessment summary',
  'assessment.status': 'Assessment status',
  'bridge.reasons': 'Bridge reason codes',
  'dimensions.title': 'Six assessment dimensions',
  'evidence.title': 'Evidence',
  'permission.requested': 'Requested permission',
  'hazard.low': 'Low risk',
  'hazard.medium': 'Medium risk',
  'hazard.high': 'High risk',
  'hazard.critical': 'Critical risk',
  'hazard.unknown': 'Unknown risk',
  'recommendation.approve': 'Approve',
  'recommendation.caution': 'Approve with caution',
  'recommendation.saferAlternative': 'Prefer safer alternative',
  'recommendation.moreInformation': 'Need more information',
  'recommendation.reject': 'Recommend rejection',
  'reason.explicitDenial': 'Authorization explicitly denied',
  'reason.scopeViolation': 'Outside authorized scope',
  'reason.insufficientEvidence': 'Critical evidence is missing',
  'reason.saferAlternative': 'A safer alternative is verified',
  'reason.excessivePrivilegeNotNecessary': 'Excessive permission is unnecessary',
  'reason.excessivePrivilegeUnjustified': 'Excessive permission is not justified',
  'reason.privilegeScopeExcessive': 'Permission scope is excessive',
  'reason.criticalNotNecessary': 'Critical-risk operation is unnecessary',
  'reason.criticalJustified': 'Critical risk has bounded justification',
  'reason.highNotNecessary': 'High-risk operation is unnecessary',
  'reason.highUnresolved': 'High-risk context is unresolved',
  'reason.highJustified': 'High risk has bounded justification',
  'reason.mediumHazard': 'Medium risk needs caution',
  'reason.lowHazard': 'Low-risk operation',
  'reason.unknownFallback': 'Risk remains unresolved',
  'reason.unknown': 'Primary reason needs review',
  'reason.none': 'No primary reason recorded',
  resources: 'Resources',
  requestedPermission: 'Requested permission',
  workspaceContained: 'Workspace containment',
  sandboxCovered: 'Sandbox coverage',
  reversible: 'Recovery / reversibility',
  unknown: 'unknown',
  ledgerHealth: 'Ledger / evidence health',
  failureDetails: 'Failure context details',
  sameRootCause: 'Same root cause',
  permissionEscalation: 'Permission escalation',
  truncated: 'Truncated',
  risk: 'Risk',
  recommendation: 'Recommendation',
  primaryReason: 'Primary reason',
  authorization: 'Authorization',
  necessity: 'Necessity',
  privilege: 'Privilege',
  alternatives: 'Alternatives',
  evidenceQuality: 'Evidence quality',
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
  preExecutionEvidence: 'Evidence was observed before execution; execution-time state may change.',
} satisfies Record<RiskAdvisorLocaleKey, string>

export const zh = {
  'state.unavailable': '暂不可用',
  'command.label': '原始命令',
  'advisory.title': 'Risk Advisor',
  'advisory.disclaimer': '仅提供风险建议；最终以 Native Approval 为准。',
  'state.analyzing': '分析中',
  'state.ready': '评估就绪',
  'state.cancelled': '已取消',
  'status.partial': 'PARTIAL（部分）',
  'status.degraded': 'DEGRADED（降级）',
  'details.open': '详情',
  'details.title': 'Risk Advisor 详细分析',
  'details.close': '关闭详情',
  'operation.title': '操作',
  'aggregate.title': '评估摘要',
  'assessment.status': '评估状态',
  'bridge.reasons': 'Bridge 原因代码',
  'dimensions.title': '六项评估维度',
  'evidence.title': '证据',
  'permission.requested': '请求权限',
  'hazard.low': '低风险',
  'hazard.medium': '中风险',
  'hazard.high': '高风险',
  'hazard.critical': '严重风险',
  'hazard.unknown': '风险未知',
  'recommendation.approve': '建议允许',
  'recommendation.caution': '谨慎允许',
  'recommendation.saferAlternative': '优先选择更安全方案',
  'recommendation.moreInformation': '需要更多信息',
  'recommendation.reject': '建议拒绝',
  'reason.explicitDenial': '授权已明确拒绝',
  'reason.scopeViolation': '超出授权范围',
  'reason.insufficientEvidence': '缺少关键证据',
  'reason.saferAlternative': '已确认更安全的替代方案',
  'reason.excessivePrivilegeNotNecessary': '过宽权限并非必要',
  'reason.excessivePrivilegeUnjustified': '过宽权限缺少依据',
  'reason.privilegeScopeExcessive': '权限范围过宽',
  'reason.criticalNotNecessary': '无须执行此严重风险操作',
  'reason.criticalJustified': '严重风险有明确边界和依据',
  'reason.highNotNecessary': '无须执行此高风险操作',
  'reason.highUnresolved': '高风险操作的上下文尚未确认',
  'reason.highJustified': '高风险有明确边界和依据',
  'reason.mediumHazard': '中等风险，需要谨慎',
  'reason.lowHazard': '低风险操作',
  'reason.unknownFallback': '风险尚未确认',
  'reason.unknown': '主要原因需查看详情',
  'reason.none': '未记录主要原因',
  resources: '资源',
  requestedPermission: '请求权限',
  workspaceContained: '工作区包含性',
  sandboxCovered: '沙箱覆盖',
  reversible: '恢复性 / 可逆性',
  unknown: '未知',
  ledgerHealth: 'Ledger / 证据健康度',
  failureDetails: '失败上下文详情',
  sameRootCause: '相同根因',
  permissionEscalation: '权限升级',
  truncated: '已截断',
  risk: '风险',
  recommendation: '建议',
  primaryReason: '主要原因',
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
  preExecutionEvidence: '证据采集于执行前，实际执行时状态可能已变化。',
} satisfies Record<RiskAdvisorLocaleKey, string>
