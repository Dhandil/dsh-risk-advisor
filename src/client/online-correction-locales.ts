export type OnlineCorrectionLocaleKey = 'title' | 'kind.f1' | 'kind.f2' | 'overflow' | 'degraded'
  | 'advisory.f1' | 'advisory.f2'
  | 'history.label' | 'history.warning' | 'history.title' | 'history.observation' | 'history.caveat' | 'history.nextCheck' | 'history.authority'
  | 'nextCheck.label' | 'nextCheck.warning' | 'nextCheck.evidence.f1' | 'nextCheck.evidence.f2'
  | 'nextCheck.reviewRetry' | 'nextCheck.inspectWrite' | 'nextCheck.inspectEdit' | 'nextCheck.checkDirectory'
  | 'nextCheck.checkCopy' | 'nextCheck.checkBranch' | 'nextCheck.checkDependency'

export const ONLINE_CORRECTION_NS = 'risk-advisor.online-correction'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'risk-advisor.online-correction': OnlineCorrectionLocaleKey
  }
}

export const onlineCorrectionEn = {
  title: 'Execution advisory',
  'kind.f1': 'Repeated failure',
  'kind.f2': 'Postcondition mismatch',
  'advisory.f1': 'The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.',
  'advisory.f2': 'The operation completed, but the verified expected postcondition was not satisfied. Do not treat this execution as goal completion; inspect the target state before continuing.',
  overflow: '{n} additional live advisories',
  degraded: 'Some execution advisories may be unavailable.',
  'history.label': 'Verified historical context — not a diagnosis or fix',
  'history.warning': 'Same operation class only. Current target, Workspace and failure cause are unverified.',
  'history.title': 'Historical note',
  'history.observation': 'Evidence',
  'history.caveat': 'Applicability caveat',
  'history.nextCheck': 'Independent check',
  'history.authority': 'Authority boundary',
  'nextCheck.label': 'Evidence-grounded next check — advisory only',
  'nextCheck.warning': 'Manual inspection only. The cause, target and corrective action are not verified.',
  'nextCheck.evidence.f1': 'Based on an existing contiguous repeated-retry finding.',
  'nextCheck.evidence.f2': 'Based on a current verified postcondition mismatch.',
  'nextCheck.reviewRetry': 'Compare the prerequisites and repeated failure path before another attempt; do not repeat the same unchanged operation.',
  'nextCheck.inspectWrite': 'Independently inspect the final content against the intended write result.',
  'nextCheck.inspectEdit': 'Check the intended replacement and the surrounding result.',
  'nextCheck.checkDirectory': 'Independently check directory existence and accessibility.',
  'nextCheck.checkCopy': 'Inspect the destination state and expected copy correspondence.',
  'nextCheck.checkBranch': 'Independently confirm the active branch matches the intention.',
  'nextCheck.checkDependency': 'Check package resolution in the current project and runtime environment.',
} satisfies Record<OnlineCorrectionLocaleKey, string>

export const onlineCorrectionZh = {
  title: '执行建议',
  'kind.f1': '重复失败',
  'kind.f2': '后置条件不匹配',
  'advisory.f1': '同一操作反复失败，且归一化后的失败特征一致。请停止按原方式重试，先检查原因，再决定是否继续。',
  'advisory.f2': '操作已结束，但经验证，预期后置条件未满足。不能认定本次目标已完成；继续前请核对目标状态。',
  overflow: '另有 {n} 条实时建议',
  degraded: '部分执行建议可能未显示。',
  'history.label': '已验证的历史上下文——不是诊断或修复方案',
  'history.warning': '仅表示操作类别相同。当前目标、工作区和失败原因均未验证。',
  'history.title': '历史说明',
  'history.observation': '证据',
  'history.caveat': '适用性限制',
  'history.nextCheck': '独立检查',
  'history.authority': '权限边界',
  'nextCheck.label': '基于证据的下一项检查——仅供参考',
  'nextCheck.warning': '仅建议人工检查。原因、目标和纠正措施均未经过验证。',
  'nextCheck.evidence.f1': '依据是当前连续重复重试 Finding。',
  'nextCheck.evidence.f2': '依据是当前已验证的后置条件不匹配。',
  'nextCheck.reviewRetry': '再次尝试前，比较前置条件与重复失败路径；不要重复执行未改变的相同操作。',
  'nextCheck.inspectWrite': '独立检查最终内容是否符合预期写入结果。',
  'nextCheck.inspectEdit': '检查预期替换内容及其周边结果。',
  'nextCheck.checkDirectory': '独立检查目录是否存在且可访问。',
  'nextCheck.checkCopy': '检查目标位置状态及其与预期副本的对应关系。',
  'nextCheck.checkBranch': '独立确认当前分支是否符合预期。',
  'nextCheck.checkDependency': '检查当前项目和运行环境中的包解析情况。',
} satisfies Record<OnlineCorrectionLocaleKey, string>
