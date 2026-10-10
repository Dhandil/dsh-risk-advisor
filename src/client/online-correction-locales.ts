export type OnlineCorrectionLocaleKey = 'title' | 'kind.f1' | 'kind.f2' | 'overflow' | 'degraded'
  | 'history.label' | 'history.warning' | 'history.title' | 'history.observation' | 'history.caveat' | 'history.nextCheck' | 'history.authority'

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
  overflow: '{n} additional live advisories',
  degraded: 'Some execution advisories may be unavailable.',
  'history.label': 'Verified historical context — not a diagnosis or fix',
  'history.warning': 'Same operation class only. Current target, Workspace and failure cause are unverified.',
  'history.title': 'Historical note',
  'history.observation': 'Evidence',
  'history.caveat': 'Applicability caveat',
  'history.nextCheck': 'Independent check',
  'history.authority': 'Authority boundary',
} satisfies Record<OnlineCorrectionLocaleKey, string>

export const onlineCorrectionZh = {
  title: '执行建议',
  'kind.f1': '重复失败',
  'kind.f2': '后置条件不匹配',
  overflow: '另有 {n} 条实时建议',
  degraded: '部分执行建议可能未显示。',
  'history.label': '已验证的历史上下文——不是诊断或修复方案',
  'history.warning': '仅表示操作类别相同。当前目标、工作区和失败原因均未验证。',
  'history.title': '历史说明',
  'history.observation': '证据',
  'history.caveat': '适用性限制',
  'history.nextCheck': '独立检查',
  'history.authority': '权限边界',
} satisfies Record<OnlineCorrectionLocaleKey, string>
