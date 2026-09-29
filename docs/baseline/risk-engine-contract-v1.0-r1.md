# Risk Advisor — Risk Engine Contract V1.0

> 状态：第四项正式 Risk Engine Contract；v1.0-r1 Static Preflight Integration Alignment  
> 上游依据：Architecture v1.2-r1 + Static Preflight V1.0 + Execution Ledger / Internal Event Model  
> 初版：2026-08-18；集成修订：2026-09-29  
> 目标：定义 `Context Builder → Deterministic Risk Features → 6 DimensionEvaluator → AssessmentAggregator → RiskAssessment` 的完整 V1 Contract。

---

## 集成边界修订（不改变六维规则与 Policy P0–P9）

当前 Harness 触发链：

```text
approval/asked (durable post-commit)
    → ActiveExecutionIndex(session ownership, callId?)
    → FOUND: executionId → Context Builder → Risk Engine

    → NOT_FOUND / AMBIGUOUS:
       不虚构 OperationContext / RiskContextSnapshot
       显示 assessment unavailable / insufficient evidence
       Harness Native Approval 不受阻断
```

`approval/request` 可选 listener 只能是非终结 accelerator，不能成为主正确性依赖，也不能输出 `ApprovalOutcome`。任何并发到达的 `approval/asked` 与 accelerator 必须汇入同一幂等 Assessment job。

Presenter 使用公开 `conversation.approval.detail`；只展示同一 session 当前唯一绑定的 Assessment，不接管原生 Allow/Reject。Browser 不假设可访问 Host `ApprovalRequestId`。

`ExecutionId` 不是 `callId` 或 `operationHash`。Nested durable 来源现为 `tool/ptc-dispatch-start` / `tool/ptc-dispatch`，结构边缺证据时保持 ambiguous/unresolved。

Guard returned denial 必须由完整 ControlTrace（pre final allow、无 approval/cancel、dispatch absent、post-execute observed、error result）唯一证明后才属于 `DETERMINISTIC`。缺任一必要证据时不得虚假精确归因。

以上是输入与呈现边界修订；本文件原有六维 verdict、Judge 权限、Aggregator precedence 与推荐语义维持不变。

---

# 1. 文档目的

Risk Advisor 的核心问题是：

> 当 Harness 请求用户批准一个 Tool Operation 时，如何基于当前操作、权限、历史、失败、验证和证据质量，形成一份可解释、可追溯、非自动授权的风险评估。

第四项负责：

```text
Execution Ledger
      ↓
Context Builder
      ↓
RiskContextSnapshot
      ↓
Deterministic Feature Extractors
      ↓
RiskFeatureSet
      ↓
6 × DimensionEvaluator
      ↓
AssessmentAggregator
      ↓
RiskAssessment
      ↓
Approval Presenter
```

本层只负责风险评估与解释。

它不负责：

```text
Allow / Reject
执行工具
绕过 Harness Approval
自动修改目标环境
```

---

# 2. 总体原则

## 2.1 Advisory Only

Risk Advisor 永远只是：

```text
Advisory Layer
```

而不是：

```text
Approval Authority
```

最终审批仍由：

```text
Human + Harness Native Approval
```

完成。

因此：

```text
RiskAssessment
≠
ApprovalOutcome
```

---

## 2.2 Evidence + Blast Radius > Generic Score

Risk Advisor V1 不以：

```text
Risk Score = 82
```

作为核心产物。

更重要的是回答：

```text
发生什么？
影响什么？
为什么危险？
是否可逆？
是否超出授权？
是否在请求更高权限？
此前是否失败？
是否存在更安全方案？
我们对这些判断有多确定？
```

---

## 2.3 Missing Evidence ≠ Safe

冻结原则：

```text
Absence of evidence
≠
Evidence of safety
```

例如：

```text
没有发现历史失败
```

只能解释为：

```text
no known previous failure
```

不能解释为：

```text
historically safe
```

同样：

```text
Evidence Quality = LOW
```

不能自动变成：

```text
Risk = LOW
```

也不能自动变成：

```text
Risk = CRITICAL
```

---

# 3. Risk Engine 总体边界

正确依赖：

```text
Execution Ledger
      ↓
Context Builder
      ↓
RiskContextSnapshot
      ↓
Risk Engine
```

错误依赖：

```text
Risk Engine
├── getExecution()
├── getFailure()
├── getRetryChain()
├── getApproval()
├── getVerification()
├── 解析 Harness raw events
└── 自己拼历史
```

冻结原则：

> Risk Engine 只能消费 `RiskContextSnapshot`，不得直接耦合 Execution Ledger。

---

# 4. Context Builder Contract

**前置门槛：必须先有唯一 `executionId`。** `FOUND` 才构建 `RiskContextSnapshot`；`NOT_FOUND` / `AMBIGUOUS` 不能通过“最近相似 callId”虚构当前 OperationContext。此时 Presenter 显示不可用或证据不足，不生成一个看似属于错误执行的低风险结论。

Context Builder 的职责：

> 从 Execution Ledger 中选择、裁剪并组织和当前 Approval 相关的事实。

它只组织事实，不做风险判断。

禁止输出：

```text
high risk
reject
dangerous
```

允许输出：

```text
workspace 外写入
请求 danger-full-access
此前相同 fingerprint 被 sandbox denied
当前执行是 escalation retry
目标是某个具体文件或目录
```

---

# 5. `RiskContextSnapshot`

```ts
interface RiskContextSnapshot {
  schemaVersion: 1

  contextId: ContextId
  executionId: ExecutionId
  builtAt: number

  operation: OperationContext
  authority: AuthorityContext

  history: HistoryContext
  verification: VerificationContext

  environment: EnvironmentContext

  evidence: EvidenceRef[]

  ledgerHealth: LedgerHealthSnapshot
}
```

---

# 6. `OperationContext`

回答：

> Agent 当前到底想做什么？

```ts
interface OperationContext {
  toolName: string

  operationHash: string
  operationFingerprint: string

  arguments: unknown

  intent: {
    category: OperationCategory
    summary?: string
  }

  targets: ResourceTarget[]
}
```

V1 Operation Category：

```ts
type OperationCategory =
  | 'read'
  | 'write'
  | 'edit'
  | 'delete'
  | 'execute'
  | 'network'
  | 'process'
  | 'unknown'
```

优先来源：

```text
tool-specific deterministic adapter
```

例如：

```text
fs_read  → read
fs_write → write
fs_edit  → edit
bash     → execute
```

---

# 7. `ResourceTarget`

```ts
interface ResourceTarget {
  kind:
    | 'file'
    | 'directory'
    | 'process'
    | 'network'
    | 'environment'
    | 'unknown'

  locator: string

  scope:
    | 'workspace'
    | 'outside-workspace'
    | 'system'
    | 'external'
    | 'unknown'

  access:
    | 'read'
    | 'write'
    | 'delete'
    | 'execute'
    | 'unknown'
}
```

Risk Advisor 更关心：

```text
目标是什么？
位于哪里？
会对它做什么？
```

而不是单纯：

```text
bash 风险高不高？
```

---

# 8. `AuthorityContext`

回答：

> 当前操作申请了什么 Authority，是否在扩大权限？

```ts
interface AuthorityContext {
  currentSandboxMode?: string
  requestedSandboxMode?: string

  approvalReason?: string

  requiresApproval: boolean
  isEscalation: boolean

  escalationChain: {
    executionId: ExecutionId
    requestedMode?: string
  }[]
}
```

`isEscalation` 应优先来自：

```text
Relation Analyzer
→ escalatesFrom
```

而不是仅因为参数出现 `sandbox_permissions` 就直接判断。

---

# 9. `HistoryContext`

只保存 bounded history：

```ts
interface HistoryContext {
  retryChain: HistoricalExecutionRef[]

  recentSimilar: HistoricalExecutionRef[]

  previousPrimaryFailure?: FailureSummary

  repetitionCount: number
}
```

例如：

```text
当前 E42

retryChain:
E31 → E42

recentSimilar:
E12 sandbox_denial
E31 sandbox_denial

previousPrimaryFailure:
sandbox_denial
```

---

# 10. `ContextBuildPolicy`

Context Builder 必须有硬预算：

```ts
interface ContextBuildPolicy {
  maxSimilarExecutions: number
  maxRetryDepth: number
  maxEscalationDepth: number
  maxVerificationRecords: number

  maxArgumentChars: number
  maxEvidenceChars: number
}
```

原因：

```text
Session 长时间运行
→ Execution 数量持续增长
```

Risk Context 不能无限膨胀。

冻结原则：

> Risk Context 必须 bounded by contract。

---

# 11. `LedgerHealthSnapshot`

```ts
interface LedgerHealthSnapshot {
  state:
    | 'HEALTHY'
    | 'DEGRADED'
    | 'RECOVERED'

  issues: {
    code: string
    message?: string
  }[]
}
```

此处三态是第四项原冻结模型；Static Preflight 未证明是否应采用“consistency + provenance”二轴模型，R4 完成后再确定。`RECOVERED` 不等于证据完整或安全。

`DEGRADED` 表示：

```text
上下文证据不完整
```

而不是：

```text
safe
```

或：

```text
dangerous
```

---

# 12. Deterministic Feature Layer

RiskContextSnapshot 不直接进入六维 Evaluator。

先经过：

```text
RiskContextSnapshot
        ↓
Deterministic Feature Extractors
        ↓
RiskFeatureSet
```

Deterministic Risk Feature 是：

> 可证明的事实特征。

不是：

```text
隐形风险分
```

---

# 13. `RiskFeature`

```ts
interface RiskFeature<T = unknown> {
  featureId: string
  key: string

  value: T

  strength:
    | 'AUTHORITATIVE'
    | 'DETERMINISTIC'
    | 'INFERRED'

  basisEventIds: EventId[]

  explanation?: string
}
```

例如：

```ts
{
  key: 'target.outside_workspace',
  value: true,
  strength: 'DETERMINISTIC'
}
```

---

# 14. `RiskFeatureSet`

V1 按 7 个 Feature Family 组织：

```ts
interface RiskFeatureSet {
  operation: OperationFeatures
  scope: ScopeFeatures
  authority: AuthorityFeatures
  recoverability: RecoverabilityFeatures
  history: HistoryFeatures
  authorization: AuthorizationFeatures
  evidence: EvidenceFeatures
}
```

注意：

```text
Feature Family
≠
Risk Dimension
```

一个 Feature 可以影响多个维度。

---

# 15. Operation Features

```ts
interface OperationFeatures {
  mutatesState: boolean | 'unknown'
  deletesState: boolean | 'unknown'

  executesCode: boolean
  installsSoftware: boolean
  changesConfiguration: boolean

  accessesCredentials: boolean | 'unknown'
  changesPermissions: boolean | 'unknown'

  networkEgress: boolean | 'unknown'
  remoteWrite: boolean | 'unknown'

  persistentEffect: boolean | 'unknown'
}
```

---

# 16. Scope Features

```ts
interface ScopeFeatures {
  workspaceOnly: boolean | 'unknown'
  outsideWorkspace: boolean
  systemScope: boolean

  recursive: boolean | 'unknown'
  wildcardTarget: boolean | 'unknown'

  targetCountKnown: boolean
  targetCount?: number

  canonicalTargetsKnown: boolean
}
```

---

# 17. Recoverability Features

```ts
interface RecoverabilityFeatures {
  reversible:
    | 'yes'
    | 'no'
    | 'unknown'

  checkpointAvailable: boolean
  versionControlled: boolean | 'unknown'
  backupKnown: boolean | 'unknown'

  rollbackMechanismKnown: boolean
}
```

---

# 18. Authorization Features

```ts
interface AuthorizationFeatures {
  explicitGrantPresent: boolean
  explicitDenialPresent: boolean

  operationMatched: boolean | 'unknown'
  targetMatched: boolean | 'unknown'
  scopeMatched: boolean | 'unknown'
  privilegeMatched: boolean | 'unknown'

  grantSource:
    | 'user_message'
    | 'developer_instruction'
    | 'ui_action'
    | 'none'

  agentJustificationPresent: boolean
}
```

关键规则：

```text
Agent justification
≠
User authorization
```

---

# 19. Necessity Features

```ts
interface NecessityFeatures {
  goalKnown: boolean

  operationGoalRelationKnown: boolean

  narrowerAttemptObserved: boolean
  narrowerAttemptFailed: boolean

  blockedWithoutCurrentAction: boolean | 'unknown'

  dependencyRequiresAction: boolean | 'unknown'

  minimumRequiredOperationKnown: boolean
}
```

冻结：

```text
Previous failure
≠
Current necessity
```

例如：

```text
低权限失败
```

只能说明低权限路径失败。

不能直接证明：

```text
danger-full-access 是完成用户目标的必要条件
```

---

# 20. Authority / Privilege Features

```ts
interface AuthorityFeatures {
  currentSandboxMode?: string
  requestedSandboxMode?: string

  privilegeEscalation: boolean

  escalationDepth: number

  requestedScope:
    | 'workspace'
    | 'user'
    | 'system'
    | 'unrestricted'
    | 'unknown'

  minimumRequiredScope:
    | 'workspace'
    | 'user'
    | 'system'
    | 'unrestricted'
    | 'unknown'

  minimumScopeEvidenceAvailable: boolean
}
```

---

# 21. Alternative Features

```ts
interface AlternativeFeatures {
  registeredAlternativeAvailable: boolean

  historicallySuccessfulAlternativeAvailable: boolean

  narrowerScopeAlternativeAvailable: boolean

  lowerPrivilegeAlternativeAvailable: boolean

  moreReversibleAlternativeAvailable: boolean

  alternativeIds: string[]
}
```

冻结：

```text
No deterministic alternative found
≠
No safer alternative exists
```

---

# 22. Evidence Features

```ts
interface EvidenceFeatures {
  toolKnown: boolean
  argumentsNormalized: boolean

  targetsExtracted: boolean
  targetsCanonicalized: boolean

  operationSemanticsKnown: boolean

  sandboxBoundaryKnown: boolean
  authorizationContextAvailable: boolean

  historyAvailable: boolean
  ledgerHealthy: boolean

  recoveryEvidenceAvailable: boolean

  verifierCoverage:
    | 'none'
    | 'partial'
    | 'sufficient'

  unknownFeatureCount: number
}
```

---

# 23. History Features

```ts
interface HistoryFeatures {
  retryCount: number
  escalationCount: number

  priorSameFingerprintFailure: boolean

  priorSandboxDenial: boolean
  priorApprovalRejection: boolean

  repeatedFailureCount: number

  previousPrimaryFailureCategory?: FailureCategory
}
```

History Features 是跨维度信号。

例如：

```text
priorSandboxDenial
→ Risk
→ Necessity
→ Privilege
→ Evidence Quality
```

---

# 24. 六个风险维度

V1 固定六维：

```text
Risk
Authorization
Necessity
Privilege
Alternatives
Evidence Quality
```

六个维度必须保持正交。

禁止：

```text
Risk 高
→ 自动 Necessity 低

Authorization 高
→ 自动 Risk 低
```

---

# 25. Risk Dimension

问题：

> 如果执行这个操作，潜在实际损害有多大？

Verdict：

```ts
type RiskVerdict =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'UNKNOWN'
```

主要 Deterministic Features：

```text
destructive semantics
state mutation
target scope
system scope
credential exposure
network exposure
blast radius
recoverability
history escalation
```

---

# 26. Authorization Dimension

问题：

> 用户是否授权了这个具体操作？

Verdict：

```ts
type AuthorizationVerdict =
  | 'EXPLICITLY_AUTHORIZED'
  | 'PARTIALLY_AUTHORIZED'
  | 'NOT_AUTHORIZED'
  | 'EXPLICITLY_DENIED'
  | 'UNKNOWN'
```

关键：

```text
No explicit authorization
≠
NOT_AUTHORIZED
```

如果没有足够事实，应允许：

```text
UNKNOWN
```

---

# 27. Necessity Dimension

问题：

> 为了完成用户当前目标，这个操作是否必要？

Verdict：

```ts
type NecessityVerdict =
  | 'NECESSARY'
  | 'LIKELY_NECESSARY'
  | 'NOT_NECESSARY'
  | 'UNKNOWN'
```

这是最适合 Side-Path Judge 的维度之一。

---

# 28. Privilege Dimension

问题：

> 当前申请的 Authority 是否超过完成任务所需最低权限？

Verdict：

```ts
type PrivilegeVerdict =
  | 'MINIMAL'
  | 'PROPORTIONATE'
  | 'EXCESSIVE'
  | 'UNKNOWN'
```

核心比较：

```text
Requested Authority
vs
Minimum Required Authority
```

如果 minimum required scope 不知道：

```text
Privilege = UNKNOWN
```

而不是凭请求权限高就自动判 Excessive。

---

# 29. Alternatives Dimension

问题：

> 是否存在更安全、更窄、更可逆的替代方案？

Verdict：

```ts
type AlternativesVerdict =
  | 'SAFER_ALTERNATIVE_AVAILABLE'
  | 'NO_KNOWN_SAFER_ALTERNATIVE'
  | 'UNKNOWN'
```

禁止：

```text
NO_ALTERNATIVE_EXISTS
```

因为几乎无法证明。

---

# 30. Evidence Quality Dimension

问题：

> 前五个维度的判断依据有多完整？

Verdict：

```ts
type EvidenceQualityVerdict =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
```

该维度完全 deterministic。

不允许 Judge。

---

# 31. Dimension Assessment Contract

六个 Evaluator 共用统一 Envelope：

```ts
interface DimensionAssessment<TVerdict extends string> {
  dimension: DimensionName

  verdict: TVerdict

  source:
    | 'RULE'
    | 'JUDGE'
    | 'MIXED'
    | 'UNKNOWN'

  evidenceQuality:
    | 'HIGH'
    | 'MEDIUM'
    | 'LOW'

  basisFeatureIds: string[]
  basisEventIds: EventId[]

  reasons: DimensionReason[]

  judge?: {
    invoked: boolean
    model?: string
    rationale?: string
  }
}
```

```ts
interface DimensionReason {
  code: string
  message: string

  strength:
    | 'AUTHORITATIVE'
    | 'DETERMINISTIC'
    | 'INFERRED'
}
```

---

# 32. Evaluator 总决策顺序

所有 Evaluator 统一采用：

```text
Authoritative Fact
      ↓
Deterministic Rule
      ↓
Unknown Gap Check
      ↓
Optional Side-Path Judge
```

冻结：

> Judge 只能填补语义缺口，不能覆盖 authoritative / deterministic facts。

---

# 33. RiskEvaluator Contract

规则优先。

典型直接规则：

```text
system scope
+
delete / permission change / credential exposure
→ CRITICAL
```

```text
outside workspace
+
destructive
+
recursive
+
rollback unknown
→ 至少 HIGH
```

```text
read-only
+
workspace-only
+
no network
+
no credential access
→ LOW candidate
```

如果 command semantics、target、scope 大量未知：

```text
Risk = UNKNOWN
```

而不是默认 LOW。

Judge 只能帮助解释未知 shell semantics，不得把假设升级成 authoritative fact。

---

# 34. AuthorizationEvaluator Contract

Rule-only 例：

```text
用户明确授权具体 operation + target
→ EXPLICITLY_AUTHORIZED
```

```text
用户只授权 workspace
当前目标 workspace 外
→ NOT_AUTHORIZED
```

```text
用户明确禁止系统配置修改
当前要修改系统配置
→ EXPLICITLY_DENIED
```

Judge 只允许做：

```text
用户自然语言目标
↔
当前 operation
```

之间的受限语义匹配。

Agent justification 永远不能当授权证据。

---

# 35. NecessityEvaluator Contract

仅在强证据时 deterministic：

```text
系统明确要求某唯一操作
+
无其它技术路径
→ NECESSARY
```

历史低权限尝试失败：

```text
narrowerAttemptObserved = true
narrowerAttemptFailed = true
```

通常只支持：

```text
LIKELY_NECESSARY
```

而不是直接 NECESSARY。

如果：

```text
goalKnown = true
operation semantics known
deterministic evidence 不足
```

允许 Side-Path Judge。

如果 goal 本身不清楚：

```text
UNKNOWN
```

---

# 36. PrivilegeEvaluator Contract

如果：

```text
requested = danger-full-access
minimumRequired = workspace-write
```

直接：

```text
EXCESSIVE
```

如果：

```text
requested = workspace-write
minimumRequired = workspace-write
```

直接：

```text
MINIMAL
```

如果 minimum required scope 无法确定：

```text
UNKNOWN
```

Judge 只能帮助理解目标资源与权限关系，不能自行发明“管理员权限是必要的”。

---

# 37. AlternativesEvaluator Contract

Deterministic 来源：

```text
Registered Safe Recipe
Historically Successful Alternative
Tool Capability Rule
```

如果找到：

```text
SAFER_ALTERNATIVE_AVAILABLE
```

如果没找到：

```text
NO_KNOWN_SAFER_ALTERNATIVE
```

不能解释为：

```text
不存在替代方案
```

Judge 可以提出候选 alternative，但必须标记：

```text
MODEL_SUGGESTED
UNVERIFIED
```

---

# 38. EvidenceQualityEvaluator Contract

完全 deterministic。

大致：

```text
tool known
arguments normalized
targets canonicalized
sandbox known
ledger healthy
authorization available
verification sufficient
→ HIGH
```

部分缺失：

```text
→ MEDIUM
```

大量关键事实未知：

```text
→ LOW
```

---

# 39. Judge Invocation Contract

```ts
interface JudgeRequest<TDimension extends DimensionName> {
  dimension: TDimension

  knownFacts: RiskFeature[]
  unresolvedQuestions: string[]

  prohibitedOverrides: {
    featureIds: string[]
  }
}
```

Judge 输出：

```ts
interface JudgeResult<TVerdict extends string> {
  verdict: TVerdict | 'UNKNOWN'

  rationale: string

  referencedFeatureIds: string[]

  proposedFacts?: {
    statement: string
    status: 'HYPOTHESIS'
  }[]
}
```

Judge 提出的新事实只能是：

```text
HYPOTHESIS
```

不能直接写成：

```text
AUTHORITATIVE
DETERMINISTIC
```

---

# 40. Judge 使用矩阵

| Dimension | Rule-first | Judge |
|---|---:|---:|
| Risk | 是 | 受限 |
| Authorization | 是 | 受限语义匹配 |
| Necessity | 是 | 允许 |
| Privilege | 是 | 受限 |
| Alternatives | 是 | 允许提出候选 |
| Evidence Quality | 完全 deterministic | 禁止 |

优先级：

```text
AUTHORITATIVE
>
DETERMINISTIC
>
JUDGE
>
UNKNOWN
```

---

# 41. `RiskAssessment` 总体 Contract

```ts
interface RiskAssessment {
  schemaVersion: 1

  assessmentId: AssessmentId

  executionId: ExecutionId
  contextId: ContextId

  createdAt: number

  status: AssessmentStatus

  dimensions: {
    risk: DimensionAssessment<RiskVerdict>

    authorization:
      DimensionAssessment<AuthorizationVerdict>

    necessity:
      DimensionAssessment<NecessityVerdict>

    privilege:
      DimensionAssessment<PrivilegeVerdict>

    alternatives:
      DimensionAssessment<AlternativesVerdict>

    evidenceQuality:
      DimensionAssessment<EvidenceQualityVerdict>
  }

  aggregate: AggregateAssessment

  findings: AssessmentFinding[]

  alternatives: SaferAlternative[]

  uncertainties: AssessmentUncertainty[]

  evidence: AssessmentEvidenceSummary

  provenance: AssessmentProvenance

  supersedesAssessmentId?: AssessmentId
}
```

---

# 42. AssessmentStatus

```ts
type AssessmentStatus =
  | 'COMPLETE'
  | 'PARTIAL'
  | 'DEGRADED'
```

`COMPLETE`：

> 主要风险判断有足够事实支持。

不代表安全。

`PARTIAL`：

> 一部分信息缺失，但仍能形成有意义建议。

`DEGRADED`：

> 关键 correlation / target / evidence 出现明显缺口，必须对 UI 明示。

---

# 43. AggregateAssessment

```ts
interface AggregateAssessment {
  hazardLevel: HazardLevel

  recommendation: AdvisoryRecommendation

  attentionLevel: AttentionLevel

  primaryReasonCodes: string[]

  policyFlags: {
    explicitDenial: boolean
    authorizationGap: boolean

    excessivePrivilege: boolean
    privilegeEscalation: boolean

    saferAlternativeAvailable: boolean

    criticalUnknowns: boolean
    degradedEvidence: boolean

    repeatedFailure: boolean
    repeatedEscalation: boolean
  }
}
```

---

# 44. HazardLevel

```ts
type HazardLevel =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL'
  | 'UNKNOWN'
```

它直接忠实于：

```text
RiskEvaluator.verdict
```

禁止因为授权明确而降低 Hazard。

---

# 45. AdvisoryRecommendation

```ts
type AdvisoryRecommendation =
  | 'APPROVE'
  | 'APPROVE_WITH_CAUTION'
  | 'PREFER_SAFER_ALTERNATIVE'
  | 'NEED_MORE_INFORMATION'
  | 'REJECT_RECOMMENDED'
```

注意：

```text
REJECT_RECOMMENDED
≠
Harness Reject
```

最终仍由用户决定。

---

# 46. Recommendation 语义

## APPROVE

表示：

> 当前已知事实没有显示明显需要阻止或额外警惕的问题。

典型：

```text
Risk LOW
Authorization clear
Privilege MINIMAL / PROPORTIONATE
Evidence >= MEDIUM
```

---

## APPROVE_WITH_CAUTION

表示：

> 操作存在真实风险，但授权、必要性和权限范围基本合理。

典型：

```text
Risk HIGH
Authorization EXPLICITLY_AUTHORIZED
Necessity LIKELY_NECESSARY
Privilege PROPORTIONATE
No known safer alternative
```

---

## PREFER_SAFER_ALTERNATIVE

表示：

> 当前目标可能合理，但存在已经确认的更低风险或更窄权限方案。

---

## NEED_MORE_INFORMATION

表示：

> 关键事实不足，当前不能可靠推荐批准或拒绝。

---

## REJECT_RECOMMENDED

表示：

> 已有较强事实说明当前具体请求不应被批准。

例如：

```text
explicit denial
confirmed authorization violation
critical action + unnecessary
excessive privilege + unjustified
```

---

# 47. AttentionLevel

```ts
type AttentionLevel =
  | 'NORMAL'
  | 'ELEVATED'
  | 'URGENT'
```

只控制 UI emphasis。

不影响 Harness Approval Authority。

---

# 48. `AssessmentFinding`

```ts
interface AssessmentFinding {
  findingId: string

  dimension: DimensionName

  severity:
    | 'INFO'
    | 'WARNING'
    | 'SERIOUS'
    | 'CRITICAL'

  code: string

  title: string
  detail: string

  strength:
    | 'AUTHORITATIVE'
    | 'DETERMINISTIC'
    | 'INFERRED'
    | 'JUDGE'

  basisFeatureIds: string[]
  basisEventIds: EventId[]
}
```

Presenter 的 Primary Findings：

```text
≤ 3
```

优先级：

```text
explicit authorization problem
↓
critical destructive / blast radius
↓
privilege escalation
↓
verified safer alternative
↓
retry / failure history
↓
recoverability
↓
other context
```

---

# 49. `SaferAlternative`

```ts
interface SaferAlternative {
  alternativeId: string

  title: string
  description: string

  source:
    | 'REGISTERED_RECIPE'
    | 'HISTORICAL_SUCCESS'
    | 'CAPABILITY_RULE'
    | 'MODEL_SUGGESTED'

  verification:
    | 'VERIFIED'
    | 'UNVERIFIED'

  improvements: {
    lowerRisk: boolean
    lowerPrivilege: boolean
    narrowerScope: boolean
    moreReversible: boolean
  }

  relatedExecutionId?: ExecutionId
}
```

规则：

```text
MODEL_SUGGESTED
→ UNVERIFIED
```

直到 deterministic mechanism 验证。

---

# 50. `AssessmentUncertainty`

```ts
interface AssessmentUncertainty {
  uncertaintyId: string

  code: string

  dimension?: DimensionName

  description: string

  impact:
    | 'LOW'
    | 'MEDIUM'
    | 'HIGH'

  resolvable: boolean

  resolutionHint?: string
}
```

用于明确展示：

```text
我们具体不知道什么？
```

---

# 51. `AssessmentEvidenceSummary`

```ts
interface AssessmentEvidenceSummary {
  featureIds: string[]
  eventIds: EventId[]

  counts: {
    authoritative: number
    deterministic: number
    inferred: number
    judge: number
  }

  ledgerHealth:
    | 'HEALTHY'
    | 'RECOVERED'
    | 'DEGRADED'
}
```

不使用虚假的：

```text
confidence = 0.87
```

---

# 52. `AssessmentProvenance`

```ts
interface AssessmentProvenance {
  rulesetVersion: string
  featureSchemaVersion: number

  contextBuilderVersion: string
  aggregatorVersion: string

  judge: {
    invoked: boolean
    dimensions: DimensionName[]
    model?: string
  }
}
```

用于审计：

```text
这次 Assessment 是哪一版规则产生的？
```

---

# 53. RiskAssessment Immutable

RiskAssessment 生成后不原地修改。

如果：

```text
Verification 到达
Durable Evidence 补齐
Context 改变
```

重新生成：

```text
Assessment A2
```

并：

```text
A2.supersedesAssessmentId = A1
```

---

# 54. ApprovalRecord 补充字段

建议在第三项 ApprovalRecord 中增加：

```ts
presentedAssessmentId?: AssessmentId
```

用于记录：

> 用户真正做出审批决定时，UI 展示的是哪一版 RiskAssessment。

必须以真实 render/decision 事件为依据。迟到的 A2 即使进入分析历史，也不能回填成用户当时看过的版本，不能复活 resolved Approval。Browser 的 display association 不依赖不存在的 Host approvalId。

---

# 55. AssessmentAggregator Boundary

Aggregator 只消费：

```text
六个 DimensionAssessment
+
assessmentStatus
```

禁止：

```text
查询 Ledger
解析 Tool Arguments
重新生成 Feature
调用 Verifier
调用 LLM
```

正确：

```text
DimensionAssessments
        ↓
AssessmentAggregator
        ↓
AggregateAssessment
```

---

# 56. AggregatorInput

```ts
interface AggregatorInput {
  risk: DimensionAssessment<RiskVerdict>
  authorization: DimensionAssessment<AuthorizationVerdict>
  necessity: DimensionAssessment<NecessityVerdict>
  privilege: DimensionAssessment<PrivilegeVerdict>
  alternatives: DimensionAssessment<AlternativesVerdict>
  evidenceQuality: DimensionAssessment<EvidenceQualityVerdict>

  assessmentStatus:
    | 'COMPLETE'
    | 'PARTIAL'
    | 'DEGRADED'
}
```

---

# 57. Hazard 聚合规则

冻结：

```ts
hazardLevel = input.risk.verdict
```

其它维度不得升降 Hazard。

---

# 58. Aggregator Policy Precedence

正式优先级：

```text
P0  Explicit Denial
        ↓
P1  Confirmed Authorization Violation
        ↓
P2  Critical Evidence Gap
        ↓
P3  Verified Safer Alternative
        ↓
P4  Excessive Privilege
        ↓
P5  Critical Hazard
        ↓
P6  High Hazard
        ↓
P7  Medium Hazard
        ↓
P8  Low Hazard
        ↓
P9  Unknown Fallback
```

Recommendation：

```text
first terminal rule wins
```

Policy Flags：

```text
全部独立计算
```

不会因为 terminal rule 命中而停止 flag 收集。

---

# 59. P0 — Explicit Denial

条件：

```text
Authorization =
EXPLICITLY_DENIED
```

结果：

```text
REJECT_RECOMMENDED
URGENT
```

Reason：

```text
AUTH_EXPLICIT_DENIAL
```

冻结：

> 用户明确拒绝不能被其它维度覆盖。

---

# 60. P1 — Confirmed Authorization Violation

条件：

```text
Authorization =
NOT_AUTHORIZED
```

结果：

```text
REJECT_RECOMMENDED
```

Reason：

```text
AUTH_SCOPE_VIOLATION
```

不因 Risk LOW 而改变。

---

# 61. P2 — Critical Evidence Gap

典型触发：

```text
assessmentStatus = DEGRADED
```

或：

```text
Risk = UNKNOWN
```

或：

```text
Authorization = UNKNOWN
AND
Risk ∈ {HIGH, CRITICAL}
```

或：

```text
Privilege = UNKNOWN
AND
Risk = CRITICAL
```

或：

```text
Necessity = UNKNOWN
AND
Risk = CRITICAL
```

结果：

```text
NEED_MORE_INFORMATION
```

Reason：

```text
INSUFFICIENT_CRITICAL_EVIDENCE
```

冻结：

> Evidence Quality Low 本身不是 Risk Upgrader，而是可能形成 Recommendation Gate。

---

# 62. `criticalUnknowns`

V1 建议：

```ts
criticalUnknowns =
  risk === 'UNKNOWN'
  ||
  (
    authorization === 'UNKNOWN'
    &&
    risk in ['HIGH', 'CRITICAL']
  )
  ||
  (
    privilege === 'UNKNOWN'
    &&
    risk === 'CRITICAL'
  )
  ||
  (
    necessity === 'UNKNOWN'
    &&
    risk === 'CRITICAL'
  )
```

第一版保持简单。

---

# 63. P3 — Verified Safer Alternative

条件：

```text
Alternatives =
SAFER_ALTERNATIVE_AVAILABLE
```

并：

```text
Risk ∈ {MEDIUM, HIGH, CRITICAL}
OR
Privilege = EXCESSIVE
```

结果：

```text
PREFER_SAFER_ALTERNATIVE
```

Reason：

```text
VERIFIED_SAFER_ALTERNATIVE
```

例外：

```text
P0 / P1
```

永远优先。

---

# 64. P4 — Excessive Privilege

条件：

```text
Privilege = EXCESSIVE
```

### P4a

```text
Necessity = NOT_NECESSARY
```

结果：

```text
REJECT_RECOMMENDED
```

Reason：

```text
EXCESSIVE_PRIVILEGE_NOT_NECESSARY
```

### P4b

```text
Necessity = UNKNOWN
```

结果：

```text
NEED_MORE_INFORMATION
```

Reason：

```text
EXCESSIVE_PRIVILEGE_UNJUSTIFIED
```

### P4c

其它：

```text
PREFER_SAFER_ALTERNATIVE
```

Reason：

```text
PRIVILEGE_SCOPE_EXCESSIVE
```

冻结：

> Necessity 高不能洗掉 Excessive Privilege。

---

# 65. P5 — Critical Hazard

如果：

```text
Risk = CRITICAL
```

且：

```text
Authorization = EXPLICITLY_AUTHORIZED

Necessity =
NECESSARY / LIKELY_NECESSARY

Privilege =
MINIMAL / PROPORTIONATE

Alternatives =
NO_KNOWN_SAFER_ALTERNATIVE

EvidenceQuality =
HIGH / MEDIUM
```

则：

```text
APPROVE_WITH_CAUTION
```

Reason：

```text
CRITICAL_BUT_JUSTIFIED
```

Attention：

```text
URGENT
```

如果：

```text
Necessity = UNKNOWN
```

则：

```text
NEED_MORE_INFORMATION
```

如果：

```text
Necessity = NOT_NECESSARY
```

则：

```text
REJECT_RECOMMENDED
```

---

# 66. P6 — High Hazard

如果：

```text
Risk = HIGH

Authorization = EXPLICITLY_AUTHORIZED

Necessity =
NECESSARY / LIKELY_NECESSARY

Privilege =
MINIMAL / PROPORTIONATE

Alternatives =
NO_KNOWN_SAFER_ALTERNATIVE

Evidence >= MEDIUM
```

则：

```text
APPROVE_WITH_CAUTION
```

如果：

```text
Authorization = PARTIALLY_AUTHORIZED
```

则：

```text
NEED_MORE_INFORMATION
```

如果：

```text
Necessity = NOT_NECESSARY
```

则：

```text
REJECT_RECOMMENDED
```

---

# 67. P7 — Medium Hazard

V1 固定：

```text
Risk = MEDIUM
且没有更高优先级 blocker
→ APPROVE_WITH_CAUTION
```

这样 UX 稳定：

```text
LOW
→ APPROVE

MEDIUM
→ APPROVE_WITH_CAUTION
```

---

# 68. P8 — Low Hazard

如果：

```text
Risk = LOW
```

并：

```text
Authorization =
EXPLICITLY_AUTHORIZED
或 PARTIALLY_AUTHORIZED

Privilege != EXCESSIVE

Necessity != NOT_NECESSARY

不存在 verified safer alternative blocker
```

则：

```text
APPROVE
```

Attention：

```text
NORMAL
```

---

# 69. P9 — Unknown Fallback

如果没有任何规则可以形成可靠结论：

```text
NEED_MORE_INFORMATION
```

禁止默认：

```text
APPROVE
```

---

# 70. 正式 Policy Matrix

| Priority | Condition | Recommendation |
|---|---|---|
| P0 | `Authorization = EXPLICITLY_DENIED` | `REJECT_RECOMMENDED` |
| P1 | `Authorization = NOT_AUTHORIZED` | `REJECT_RECOMMENDED` |
| P2 | Critical evidence gap / degraded critical context | `NEED_MORE_INFORMATION` |
| P3 | Verified safer alternative + meaningful hazard / excessive privilege | `PREFER_SAFER_ALTERNATIVE` |
| P4a | `Privilege = EXCESSIVE` + `Necessity = NOT_NECESSARY` | `REJECT_RECOMMENDED` |
| P4b | `Privilege = EXCESSIVE` + `Necessity = UNKNOWN` | `NEED_MORE_INFORMATION` |
| P4c | `Privilege = EXCESSIVE` otherwise | `PREFER_SAFER_ALTERNATIVE` |
| P5a | `Risk = CRITICAL` + strong justification | `APPROVE_WITH_CAUTION` |
| P5b | `Risk = CRITICAL` + `Necessity = NOT_NECESSARY` | `REJECT_RECOMMENDED` |
| P5c | `Risk = CRITICAL` + unresolved key dimension | `NEED_MORE_INFORMATION` |
| P6a | `Risk = HIGH` + authorization + necessity + proportional privilege | `APPROVE_WITH_CAUTION` |
| P6b | `Risk = HIGH` + `Necessity = NOT_NECESSARY` | `REJECT_RECOMMENDED` |
| P6c | `Risk = HIGH` + unresolved authorization/necessity | `NEED_MORE_INFORMATION` |
| P7 | `Risk = MEDIUM` and no stronger blocker | `APPROVE_WITH_CAUTION` |
| P8 | `Risk = LOW` and no blocker | `APPROVE` |
| P9 | No reliable result | `NEED_MORE_INFORMATION` |

---

# 71. Policy Flags

Policy Flags 全部独立计算：

```text
explicitDenial
authorizationGap
excessivePrivilege
privilegeEscalation
saferAlternativeAvailable
criticalUnknowns
degradedEvidence
repeatedFailure
repeatedEscalation
```

例如：

```text
Authorization = EXPLICITLY_DENIED
Risk = CRITICAL
Privilege = EXCESSIVE
Alternative = available
```

最终 Recommendation：

```text
REJECT_RECOMMENDED
```

但所有相关 flags 仍保留。

---

# 72. `attentionLevel` 映射

建议：

```text
CRITICAL hazard
→ URGENT

REJECT_RECOMMENDED + HIGH/CRITICAL
→ URGENT

HIGH hazard
→ ELEVATED

PREFER_SAFER_ALTERNATIVE
→ 至少 ELEVATED

NEED_MORE_INFORMATION + criticalUnknown
→ ELEVATED / URGENT

LOW + APPROVE
→ NORMAL
```

不要单独做复杂 Attention Engine。

---

# 73. `primaryReasonCodes`

Aggregator 返回：

```text
1~3 个最关键 Recommendation 原因
```

例如：

```text
AUTH_EXPLICIT_DENIAL
DESTRUCTIVE_SYSTEM_SCOPE
```

完整证据由：

```text
findings[]
```

负责。

---

# 74. Aggregator 实现骨架

```ts
function aggregate(
  input: AggregatorInput
): AggregateAssessment {
  const flags = computePolicyFlags(input)

  const hazardLevel = input.risk.verdict

  if (isExplicitlyDenied(input)) {
    return result(
      hazardLevel,
      'REJECT_RECOMMENDED',
      'URGENT',
      flags,
      ['AUTH_EXPLICIT_DENIAL']
    )
  }

  if (isNotAuthorized(input)) {
    return result(
      hazardLevel,
      'REJECT_RECOMMENDED',
      attentionFor(hazardLevel),
      flags,
      ['AUTH_SCOPE_VIOLATION']
    )
  }

  if (hasCriticalEvidenceGap(input)) {
    return result(
      hazardLevel,
      'NEED_MORE_INFORMATION',
      attentionFor(hazardLevel),
      flags,
      ['INSUFFICIENT_CRITICAL_EVIDENCE']
    )
  }

  if (shouldPreferSaferAlternative(input)) {
    return result(
      hazardLevel,
      'PREFER_SAFER_ALTERNATIVE',
      attentionFor(hazardLevel),
      flags,
      ['VERIFIED_SAFER_ALTERNATIVE']
    )
  }

  if (input.privilege.verdict === 'EXCESSIVE') {
    return aggregateExcessivePrivilege(input)
  }

  return aggregateByHazard(input)
}
```

Aggregator 应是：

```text
pure deterministic function
```

非常适合单元测试。

---

# 75. Aggregator 禁止事项

AssessmentAggregator 禁止：

```text
1. 调用 LLM
2. 查询 Execution Ledger
3. 解析 Tool Arguments
4. 修改 DimensionAssessment
5. 推导新的 authoritative fact
6. 使用 numeric score 聚合六维
7. 因 Authorization 高而降低 Hazard
8. 因 Risk 高而自动认为 Necessity 低
9. 因 Evidence Low 而自动认为 Risk High
10. 输出 Harness ApprovalOutcome
```

---

# 76. 核心安全不变量

正式冻结：

```text
Authorization Denial
> 其它一切正向条件

Confirmed Authorization Violation
> Necessity

Critical Unknown
> Convenience

Verified Safer Alternative
> 高权限当前方案

High Necessity
不能洗掉 Excessive Privilege

Explicit Authorization
不能降低 Hazard
```

---

# 77. 建议的核心单测

以下名称可以直接作为测试用例：

```text
explicit_denial_overrides_low_hazard

authorization_does_not_reduce_hazard

critical_unknown_blocks_approval_recommendation

verified_safer_alternative_deflects_high_risk_action

necessity_does_not_override_excessive_privilege

low_evidence_does_not_increase_hazard

not_authorized_overrides_low_risk

critical_but_justified_returns_approve_with_caution

high_risk_partial_authorization_requires_more_information

medium_risk_defaults_to_approve_with_caution

low_risk_without_blocker_returns_approve

unknown_fallback_never_defaults_to_approve
```

---

# 78. 完整第四项数据流

```text
Execution Ledger
      ↓
Context Builder
      ↓
RiskContextSnapshot
      ↓
Deterministic Feature Extractors
      ↓
RiskFeatureSet
      ↓

┌─────────────────────────────┐
│ RiskEvaluator               │
│ AuthorizationEvaluator      │
│ NecessityEvaluator          │
│ PrivilegeEvaluator          │
│ AlternativesEvaluator       │
│ EvidenceQualityEvaluator    │
└─────────────────────────────┘
      ↓
DimensionAssessments
      ↓
AssessmentAggregator
      ↓
RiskAssessment
      ↓
Approval Presenter
```

---

# 79. 第四项冻结结论

V1 正式冻结：

```text
1.
Context Builder 只组织事实，不做风险判断。

2.
Risk Engine 只消费 RiskContextSnapshot，
不直接访问 Ledger。

3.
Risk Feature 是 evidence-backed fact，
不是隐形 risk score。

4.
六个风险维度：
Risk
Authorization
Necessity
Privilege
Alternatives
Evidence Quality

5.
Judge 只能补语义缺口，
不能覆盖 authoritative / deterministic facts。

6.
Evidence Quality 完全 deterministic。

7.
Hazard Level 与 Recommendation 分离。

8.
RiskAssessment 不使用总数值风险分。

9.
AssessmentAggregator 为 pure deterministic policy engine。

10.
Explicit Denial / Confirmed Authorization Violation
拥有最高 Advisory 优先级。

11.
Critical Unknown 可以输出 NEED_MORE_INFORMATION。

12.
Verified Safer Alternative 优先于更高权限当前方案。

13.
Necessity 不能洗掉 Excessive Privilege。

14.
RiskAssessment 是 Advisory Artifact，
永远不能直接转换成 Harness ApprovalOutcome。

15.
RiskAssessment immutable；
新证据到达时生成新的 Assessment，并使用 supersedes 关系。
```

---

# 80. 第四项完成状态

当前第四项已经覆盖：

```text
Context Builder Contract
RiskContextSnapshot
Operation Context
Resource Targets
Authority Context
History Context
Context Budget
Ledger Health

Deterministic Feature Contract
RiskFeature
RiskFeatureSet
Operation / Scope / Recoverability /
Authorization / Necessity / Privilege /
Alternative / Evidence / History Features

6 DimensionEvaluator Contract
Judge Boundary
Judge Invocation Contract
Unknown Semantics

RiskAssessment Contract
Hazard Level
Recommendation
Attention Level
Findings
Safer Alternatives
Uncertainties
Evidence Summary
Provenance

AssessmentAggregator
Policy Precedence
Policy Matrix
Critical Unknown Rules
Policy Flags
Implementation Skeleton
Core Unit-Test Invariants
```

因此：

```text
Risk Engine Contract V1.0
= 可冻结
```

第五项静态核验已完成并修订架构；后续按照 `risk-advisor-test-matrix-v1.0-r1.md` 执行 R1–R5 focused runtime validation。没有实测前不能填入 latency budget。
