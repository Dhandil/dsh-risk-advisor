export type OnlineCorrectionLocaleKey = 'title' | 'kind.f1' | 'kind.f2' | 'overflow' | 'degraded'

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
} satisfies Record<OnlineCorrectionLocaleKey, string>

export const onlineCorrectionZh = {
  title: '执行建议',
  'kind.f1': '重复失败',
  'kind.f2': '后置条件不匹配',
  overflow: '另有 {n} 条实时建议',
  degraded: '部分执行建议可能未显示。',
} satisfies Record<OnlineCorrectionLocaleKey, string>
