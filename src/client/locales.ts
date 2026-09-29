export type R1FixtureKey =
  | 'title'
  | 'disclaimer'
  | 'state.pending'
  | 'state.readySample'
  | 'state.unavailable'
  | 'command.label'

export const NS = 'risk-advisor.r1'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'risk-advisor.r1': R1FixtureKey
  }
}

export const en = {
  title: 'Risk Advisor R1 TEST FIXTURE',
  disclaimer: 'TEST FIXTURE / no real assessment',
  'state.pending': 'PENDING',
  'state.readySample': 'READY_SAMPLE',
  'state.unavailable': 'UNAVAILABLE',
  'command.label': 'Original command',
} satisfies Record<R1FixtureKey, string>

export const zh = {
  title: 'Risk Advisor R1 测试夹具',
  disclaimer: 'TEST FIXTURE / 不执行真实评估',
  'state.pending': 'PENDING',
  'state.readySample': 'READY_SAMPLE',
  'state.unavailable': 'UNAVAILABLE',
  'command.label': '原始命令',
} satisfies Record<R1FixtureKey, string>
