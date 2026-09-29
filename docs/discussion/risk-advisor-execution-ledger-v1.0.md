# Risk Advisor — Execution Ledger / Internal Event Model V1.0

> 状态：第三项设计完成，可进入 Critical Spike / 实现准备阶段  
> 上游依据：`Risk Advisor — Harness Integration Map v1.0`  
> 日期：2026-08-18

---

# 1. 文档目的

本文档定义 Risk Advisor 的内部事件模型、Execution Ledger、Projection、索引、查询接口，以及一致性、不变量、degraded/recovery 行为。

目标架构：

```text
Harness
  ↓
Harness Adapter / Recorder
  ↓
Risk Advisor Internal Events
  ↓
Projectors / Analyzers
  ↓
Execution Ledger
  ↓
Indexed Query API
  ↓
Failure Analyzer / Relation Analyzer / Context Builder / Risk Engine / UI
```

核心原则：

```text
Harness 原始事件与类型
只允许存在于 Harness Adapter 层。

Risk Advisor Core
只依赖自身稳定的 Internal Event / Projection Contract。
```

---

# 2. 总体设计原则

## 2.1 Event-driven Projection，而不是 Full Event Sourcing

V1 采用：

```text
Harness Runtime / Session Log
        ↓
Normalized Internal Events
        ↓
Derived Projections
        ↓
Execution Ledger
```

不把 Risk Advisor 自己的 Internal Event Log 设计成第二套 Runtime Source of Truth。

Harness Session Log 仍是 durable runtime truth；Risk Advisor Ledger 是派生状态、索引、分析缓存与事实投影。

## 2.2 Projection ≠ Risk Assessment

Ledger 负责回答：

```text
发生了什么？
执行结果是什么？
是否发生审批？
失败是什么？
验证结果是什么？
执行之间有什么关系？
```

Risk Engine 才负责回答：

```text
风险多高？
建议 Allow / Reject / Review？
为什么？
有没有更安全的替代方案？
```

## 2.3 Projector ≠ Analyzer

```text
Projector
→ fold facts

Failure Analyzer
→ interpret failure evidence

Relation Analyzer
→ infer retry / escalation / causal relations

Risk Engine
→ assess risk and recommendation
```

---

# 3. Internal Event Envelope

```ts
interface RiskAdvisorEvent<TType, TData> {
  schemaVersion: 1

  eventId: EventId
  ledgerSeq: number

  type: TType
  source: EventSource

  observedAt: number
  occurredAt?: number

  sessionId: string
  executionId?: ExecutionId

  data: TData
}
```

## 3.1 EventId

Risk Advisor 自己生成，全局唯一，例如：

```text
evt_000001
```

用于 Failure Evidence、Verification、Derived Relation 和 Durable Evidence 引用。

## 3.2 ledgerSeq

Risk Advisor 内部严格递增序号，是 Projector 的稳定 fold 顺序。

```text
timestamp
≠
可靠事件顺序
```

尤其在并发 ToolCall / nested tool / approval / durable event 情况下，统一以 `ledgerSeq` 排序。

## 3.3 observedAt / occurredAt

```text
observedAt
= Risk Advisor 观察到该事实的时间

occurredAt
= 上游事实自身记录的发生时间
```

## 3.4 EventSource

```ts
type EventSource =
  | 'HARNESS_LIVE'
  | 'HARNESS_DURABLE'
  | 'SEMANTIC_ADAPTER'
  | 'VERIFIER'
  | 'RISK_ADVISOR'
```

---

# 4. V1 Internal Event Vocabulary

V1 核心事件固定为 8 类：

```text
ExecutionStarted
ExecutionDispatchStarted
ApprovalRequested
ApprovalDecided
ExecutionFinished
FailureObserved
VerificationObserved
DurableEvidenceAttached
```

---

# 5. ExecutionStarted

主要来源：`tools/pre-execute`。

```ts
interface ExecutionStartedData {
  callId: string
  rootCallId: string

  toolName: string
  arguments: unknown

  parentExecutionId?: ExecutionId

  operationHash: string
  operationFingerprint: string
}
```

规则：

```text
Harness parent ToolExecutionToken
→ 只在 Adapter 内部解析

Internal Event
→ 只保存 parentExecutionId
```

禁止把 Harness opaque token 持久化。

---

# 6. ExecutionDispatchStarted

主要来源：`tools/execute`。

```ts
interface ExecutionDispatchStartedData {
  toolName: string
}
```

语义：

> 当前 ToolExecution 已越过 pre-execute / approval / monotonic guard 等前置阶段，并进入 dispatch pipeline。

V1 不记录内部 attempt / retryCount，因为 generic Harness seam 不保证暴露 attempt-level telemetry。

---

# 7. ApprovalRequested

```ts
interface ApprovalRequestedData {
  approvalRecordId: string

  callId: string
  toolName: string

  reason?: string

  harnessApprovalId?: string
}
```

其中：

```text
approvalRecordId
= Risk Advisor 自己生成的审批记录 ID

harnessApprovalId
= Harness durable ApprovalRequestId，可后补
```

---

# 8. ApprovalDecided

```ts
type ApprovalOutcome =
  | 'allowed-once'
  | 'rejected'
  | 'cancelled'
  | 'unavailable'
```

```ts
interface ApprovalDecidedData {
  approvalRecordId: string

  outcome: ApprovalOutcome

  harnessApprovalId?: string
}
```

严格保持：

```text
ApprovalDecided
≠
FailureObserved
```

Recorder 只记录审批事实；Failure Analyzer 再把非 grant outcome 解释成 Failure。

---

# 9. ExecutionFinished

主要来源：最终 `tools/result`。

```ts
interface RuntimeSuccess {
  status: 'success'

  value?: unknown
  content: unknown[]
  meta?: unknown
}

interface RuntimeFailure {
  status: 'error'

  error: {
    message: string
    name?: string
    code?: string
  }

  content: unknown[]
  meta?: unknown
}
```

```ts
interface ExecutionFinishedData {
  callId: string

  outcome:
    | RuntimeSuccess
    | RuntimeFailure
}
```

冻结原则：

```text
ExecutionFinished
= Runtime 已结算

Runtime Success
≠
Semantic Success
```

---

# 10. FailureObserved

```ts
type EvidenceStrength =
  | 'AUTHORITATIVE'
  | 'DETERMINISTIC'
  | 'INFERRED'
```

```ts
type FailureCategory =
  | 'explicit_failure'
  | 'timeout'
  | 'approval_rejected'
  | 'approval_cancelled'
  | 'approval_unavailable'
  | 'guardrail_denial'
  | 'sandbox_denial'
  | 'semantic_failure'
  | 'verification_failure'
  | 'cancellation'
  | 'system_failure'
```

```ts
interface FailureObservedData {
  category: FailureCategory

  subtype?: string

  strength: EvidenceStrength

  code?: string
  message?: string

  facts?: Record<string, unknown>

  basisEventIds: EventId[]
}
```

`FailureObserved.eventId` 本身就是 Evidence ID，不额外生成重复 `failureEvidenceId`。

---

# 11. VerificationObserved

```ts
type VerificationOutcome =
  | 'passed'
  | 'failed'
  | 'unknown'
```

```ts
interface VerificationObservedData {
  verifierId: string

  verificationType: string

  outcome: VerificationOutcome

  target: {
    kind: 'execution' | 'resource'
    ref: string
  }

  expected?: unknown
  observed?: unknown

  facts?: Record<string, unknown>

  basisEventIds: EventId[]
}
```

`verifierId` 必须引用固定注册的 deterministic verifier，例如：

```text
bash.exit-code
sandbox.denial
fs.path-exists
fs.file-hash
git.head
process.exit-status
```

V1 禁止 LLM 动态生成 checker code 后执行。

---

# 12. DurableEvidenceAttached

```ts
type DurableHarnessEventType =
  | 'tool/call'
  | 'tool/result'
  | 'approval/asked'
  | 'approval/decided'
  | 'tool/code-dispatch-start'
  | 'tool/code-dispatch'
  | 'turn/end'
```

```ts
interface DurableEvidenceAttachedData {
  targetEventId?: EventId
  targetExecutionId?: ExecutionId

  harnessEvent: {
    type: DurableHarnessEventType
    seq: number
    time: number
  }

  correlation: {
    callId?: string
    rootCallId?: string

    parentCallId?: string
    subCallId?: string

    harnessApprovalId?: string
  }
}
```

至少有一个：

```text
targetEventId
or
targetExecutionId
```

它只负责 confirm / correlate / attach durable identity，绝不能创建第二份结果或覆盖 Runtime Outcome。

---

# 13. Event Lifecycle

普通调用：

```text
ExecutionStarted
→ ExecutionDispatchStarted
→ ExecutionFinished
```

普通 pre-dispatch Approval：

```text
ExecutionStarted
→ ApprovalRequested
→ ApprovalDecided
→ ExecutionDispatchStarted
→ ExecutionFinished
```

Sandbox Escalation：

```text
ExecutionStarted
→ ExecutionDispatchStarted
→ ApprovalRequested
→ ApprovalDecided
→ ExecutionFinished
```

因此 Approval 不是固定 lifecycle stage。

---

# 14. Execution Lifecycle

V1 execution lifecycle：

```text
PREPARING
DISPATCHING
SETTLED
```

Approval 是正交 interaction state：

```text
approvalPending = true / false
```

例如：

```text
state = DISPATCHING
approvalPending = true
```

在 sandbox escalation 中完全合法。

---

# 15. Projection Contracts

四个核心 Projection：

```text
ExecutionRecord
ApprovalRecord
FailureRecord
VerificationRecord
```

其中 `ExecutionRecord` 是 aggregation root。

---

# 16. ExecutionRecord

```ts
interface ExecutionRecord {
  schemaVersion: 1

  executionId: ExecutionId

  identity: {
    sessionId: string
    callId: string
    rootCallId: string

    rootExecutionId: ExecutionId
    parentExecutionId?: ExecutionId
  }

  operation: {
    toolName: string
    arguments: unknown

    operationHash: string
    operationFingerprint: string
  }

  lifecycle: {
    state: 'PREPARING' | 'DISPATCHING' | 'SETTLED'

    startedAt: number
    dispatchStartedAt?: number
    finishedAt?: number
  }

  runtimeOutcome?: RuntimeOutcome

  approvalRecordIds: ApprovalRecordId[]
  failureRecordIds: FailureRecordId[]
  verificationRecordIds: VerificationRecordId[]

  relations: {
    retryOf?: ExecutionId
    escalatesFrom?: ExecutionId
    causedBy?: FailureRecordId
  }

  durable: {
    confirmed: boolean
    sessionSeqs: number[]
  }

  consistency: {
    state: 'HEALTHY' | 'DEGRADED' | 'RECOVERED'
    issues: LedgerIssue[]
  }
}
```

新增 `rootExecutionId` 的原因：Risk Advisor 内部执行树不能长期依赖 Harness `rootCallId` 的唯一性。

---

# 17. ApprovalRecord

```ts
interface ApprovalRecord {
  schemaVersion: 1

  approvalRecordId: ApprovalRecordId

  executionId: ExecutionId

  identity: {
    callId: string
    harnessApprovalId?: string
  }

  request: {
    toolName: string
    reason?: string
    requestedAt: number
  }

  decision?: {
    outcome:
      | 'allowed-once'
      | 'rejected'
      | 'cancelled'
      | 'unavailable'

    decidedAt: number
  }

  state:
    | 'PENDING'
    | 'DECIDED'

  durable: {
    askedConfirmed: boolean
    decidedConfirmed: boolean

    askedSeq?: number
    decidedSeq?: number
  }
}
```

一个 Execution 可以拥有多个 ApprovalRecord。

---

# 18. FailureRecord

`FailureObserved` 是一条 Evidence；`FailureRecord` 是 Failure Analyzer 对一组 Evidence 形成的失败结论。

```ts
interface FailureRecord {
  schemaVersion: 1

  failureRecordId: FailureRecordId

  executionId: ExecutionId

  classification: {
    category: FailureCategory
    subtype?: string

    strength:
      | 'AUTHORITATIVE'
      | 'DETERMINISTIC'
      | 'INFERRED'
  }

  role:
    | 'PRIMARY'
    | 'SUPPORTING'

  summary?: {
    code?: string
    message?: string
  }

  evidence: {
    primaryEventId: EventId
    supportingEventIds: EventId[]
  }

  facts: Record<string, unknown>

  observedAt: number
}
```

V1 优先让 generic manifestation 作为 supporting evidence，而不是为了每个表现都创建一个额外 FailureRecord。

同一 Execution 最多一个 `PRIMARY` FailureRecord。

---

# 19. VerificationRecord

```ts
interface VerificationRecord {
  schemaVersion: 1

  verificationRecordId: VerificationRecordId

  executionId: ExecutionId

  verifier: {
    verifierId: string
    verificationType: string
  }

  target: {
    kind: 'execution' | 'resource'
    ref: string
  }

  outcome:
    | 'PASSED'
    | 'FAILED'
    | 'UNKNOWN'

  observation: {
    expected?: unknown
    observed?: unknown

    facts: Record<string, unknown>
  }

  evidence: {
    basisEventIds: EventId[]
  }

  observedAt: number
}
```

冻结：

```text
UNKNOWN ≠ FAILED
UNKNOWN ≠ SAFE
```

---

# 20. Runtime Correlation Index

仅运行时存在：

```text
WeakMap<ToolExecution, ExecutionId>

(sessionId, callId) active
→ ExecutionId

ToolExecutionToken
→ ExecutionId
```

用途分别是：

```text
pre-execute ↔ result
approval/request ↔ active execution
nested parent token ↔ parentExecutionId
```

ExecutionFinished 后必须从 Active Call Index 移除。

---

# 21. Persistent Projection Index

```text
ExecutionId → ExecutionRecord
ApprovalRecordId → ApprovalRecord
FailureRecordId → FailureRecord
VerificationRecordId → VerificationRecord

sessionId → ordered ExecutionId[]

rootExecutionId → ExecutionId[]
parentExecutionId → children[]

(sessionId, toolName, operationFingerprint)
→ ordered ExecutionId[]

executionId → approvals[]
executionId → pending approvals[]

executionId → failures[]
executionId → primary failure?

executionId → verifications[]
(executionId, verifierId) → latest verification

executionId → retries[]
executionId → escalations[]

failureRecordId → caused executions[]
```

---

# 22. Session Ordering

`ExecutionsBySession` 按 `ExecutionStarted.ledgerSeq` 排序，而不是 `finishedAt`。

例如：

```text
E1 started
E2 started
E2 finished
E1 finished
```

标准历史顺序仍是：

```text
E1
E2
```

---

# 23. Fingerprint Index

```text
(sessionId, toolName, operationFingerprint)
→ ordered ExecutionId[]
```

V1 similarity / retry / escalation 默认 `session scoped`，暂不跨 Session 推断。

---

# 24. Query Contract

后续模块禁止直接读取 Map / Array / SQL table / Harness Session Log。

统一通过：

```ts
interface ExecutionLedgerQuery
```

---

# 25. Entity Queries

```ts
getExecution(
  executionId: ExecutionId
): ExecutionRecord | undefined

getApproval(
  approvalRecordId: ApprovalRecordId
): ApprovalRecord | undefined

getFailure(
  failureRecordId: FailureRecordId
): FailureRecord | undefined

getVerification(
  verificationRecordId: VerificationRecordId
): VerificationRecord | undefined
```

---

# 26. Runtime Correlation Query

```ts
getActiveExecution(params: {
  sessionId: string
  callId: string
}): ExecutionRecord | undefined
```

严格只查询 active execution。

找不到时返回 `undefined`，进入 degraded correlation；禁止 fallback 到历史中最近相同 callId。

---

# 27. History Queries

```ts
listExecutions(params: {
  sessionId: string
  beforeExecutionId?: ExecutionId
  limit: number
}): ExecutionRecord[]
```

```ts
findSimilarExecutions(params: {
  sessionId: string
  toolName: string
  operationFingerprint: string
  beforeExecutionId: ExecutionId
  limit: number
}): ExecutionRecord[]
```

所有历史查询必须 bounded。

`beforeExecutionId` 防止 replay 时读取 future execution。

---

# 28. Structure Queries

```ts
getExecutionTree(
  rootExecutionId: ExecutionId
): ExecutionRecord[]

getChildren(
  executionId: ExecutionId
): ExecutionRecord[]
```

---

# 29. Approval Queries

```ts
listApprovals(
  executionId: ExecutionId
): ApprovalRecord[]

listPendingApprovals(
  executionId: ExecutionId
): ApprovalRecord[]

getCurrentApproval(
  executionId: ExecutionId
): ApprovalRecord | undefined
```

`getCurrentApproval()` 返回最近一个 PENDING Approval。

如果存在多个 Pending Approval，返回最新一个，同时记录 invariant warning，不能静默把它当正常状态。

---

# 30. Failure Queries

```ts
getPrimaryFailure(
  executionId: ExecutionId
): FailureRecord | undefined

getCausingFailure(
  executionId: ExecutionId
): FailureRecord | undefined
```

---

# 31. Verification Queries

```ts
listVerifications(
  executionId: ExecutionId
): VerificationRecord[]

getLatestVerification(params: {
  executionId: ExecutionId
  verifierId: string
}): VerificationRecord | undefined
```

不提供只返回成功验证的 Query，因为 FAILED / UNKNOWN 同样是重要风险证据。

---

# 32. Relation Queries

```ts
getRetryChain(
  executionId: ExecutionId
): ExecutionRecord[]
```

返回最早 ancestor → 当前 execution。

```ts
getEscalationChain(
  executionId: ExecutionId
): ExecutionRecord[]
```

同样返回因果顺序，而不是 newest-first。

---

# 33. ExecutionContextSnapshot

```ts
interface ExecutionContextSnapshot {
  current: ExecutionRecord

  currentApproval?: ApprovalRecord
  primaryFailure?: FailureRecord

  retryChain: ExecutionRecord[]
  escalationChain: ExecutionRecord[]

  recentSimilar: {
    execution: ExecutionRecord
    primaryFailure?: FailureRecord
  }[]

  latestVerifications: VerificationRecord[]
}
```

```ts
getExecutionContext(
  executionId: ExecutionId
): ExecutionContextSnapshot
```

该 Snapshot 是 Fact Context Projection，不包含风险等级或审批建议。

---

# 34. Query 全局规则

```text
Rule 1
所有历史查询必须 bounded。

Rule 2
Similarity 默认只允许向过去看。

Rule 3
V1 similarity / retry / escalation 默认 Session Scoped。

Rule 4
Query 层不做安全判断。
```

---

# 35. 一致性模型

V1 采用：

> **Live-first, durable-reconciled consistency**

即：

```text
Live Harness Events
→ 立即驱动当前 Execution Ledger

Durable Session Events
→ 后续确认、补身份、支持恢复与重建
```

风险评估不能等待所有 durable event 才开始，否则 Approval UX 延迟过高；但 durable evidence 必须用于最终确认和恢复。

因此：

```text
Live
= current truth for active runtime decision support

Durable
= committed truth for replay / recovery / long-term history
```

---

# 36. LedgerIssue / Consistency State

```ts
type LedgerIssueCode =
  | 'MISSING_EXECUTION_START'
  | 'MISSING_DISPATCH_START'
  | 'MISSING_EXECUTION_FINISH'
  | 'ORPHAN_APPROVAL'
  | 'DUPLICATE_START'
  | 'DUPLICATE_DISPATCH_START'
  | 'DUPLICATE_FINISH'
  | 'CONFLICTING_TERMINAL_RESULT'
  | 'MULTIPLE_PENDING_APPROVALS'
  | 'DURABLE_EVIDENCE_MISSING'
  | 'DURABLE_CONFLICT'
  | 'PARENT_NOT_FOUND'
  | 'RELATION_CYCLE'
  | 'RECOVERED_FROM_DURABLE'
  | 'HMR_BOUNDARY'
```

```ts
interface LedgerIssue {
  code: LedgerIssueCode
  message: string
  observedAt: number
  relatedEventIds?: EventId[]
  relatedExecutionIds?: ExecutionId[]
}
```

每个 ExecutionRecord：

```text
HEALTHY
DEGRADED
RECOVERED
```

语义：

```text
HEALTHY
= 正常 live correlation，关键不变量均成立

DEGRADED
= 事实不完整或存在冲突，但仍有足够信息继续 advisory

RECOVERED
= 主要状态是从 durable history 重建，而非完整 live path 捕获
```

---

# 37. 全局不变量

## 37.1 Event Identity

```text
eventId 全局唯一
ledgerSeq 严格递增
```

重复 `eventId`：幂等忽略。

同一 `eventId` 但 payload 不同：标记 invariant violation，不覆盖原事实。

## 37.2 Execution Identity

每个 `executionId`：

```text
最多一个 ExecutionStarted
最多一个 ExecutionDispatchStarted
最多一个 ExecutionFinished
```

## 37.3 Active Call Uniqueness

同一时间：

```text
(sessionId, callId)
→ 最多一个 active ExecutionId
```

如果出现冲突，不能猜绑定哪个；标记 DEGRADED，并停止依赖该 key 做自动 correlation。

## 37.4 Parent / Root Invariant

```text
root execution:
rootExecutionId == executionId

child execution:
parentExecutionId exists
rootExecutionId == parent.rootExecutionId
```

禁止 parent cycle / root cycle。

## 37.5 Terminal Invariant

`ExecutionFinished` 后：

```text
lifecycle.state = SETTLED
```

不能再次进入 PREPARING / DISPATCHING。

后续允许追加：

```text
DurableEvidence
Failure analysis
Verification
Relations
Consistency issue
```

但不能重开该 execution。

## 37.6 Approval Invariant

每个 `approvalRecordId`：

```text
必须先 ApprovalRequested
最多一个 ApprovalDecided
```

`DECIDED → PENDING` 禁止。

## 37.7 Primary Failure Invariant

同一个 Execution：

```text
最多一个 PRIMARY FailureRecord
```

Analyzer 如果改变归因，应替换 derived projection，而不是同时保留两个 PRIMARY。

## 37.8 Durable Evidence Invariant

`DurableEvidenceAttached`：

```text
只能 confirm / correlate / attach durable identity
不能修改 live runtime outcome
```

---

# 38. Duplicate Event 行为

## 38.1 Duplicate Start

完全相同：幂等忽略，记录 telemetry。

字段冲突：保留第一份，标记：

```text
DUPLICATE_START
DEGRADED
```

禁止 silently overwrite。

## 38.2 Duplicate DispatchStarted

V1 不把第二次解释成 retry attempt。

标记：

```text
DUPLICATE_DISPATCH_START
```

保留第一份。

## 38.3 Duplicate ExecutionFinished

若 canonicalized outcome 相同：幂等忽略。

若 outcome 冲突：

```text
CONFLICTING_TERMINAL_RESULT
DEGRADED
```

保留第一份 live terminal result，并把冲突作为 diagnostics / supporting evidence；禁止静默覆盖。

---

# 39. 收到 tools/result 但没有 ExecutionStarted

这是重要 recovery case。

`tools/result` 自身包含完整 exec，因此 Adapter 可以重建：

```text
callId
rootCallId
toolName
arguments
agent
parent information（若仍可解析）
```

处理：

```text
1. mint 新 ExecutionId
2. synthesize ExecutionStarted
3. immediately apply ExecutionFinished
4. mark consistency.state = RECOVERED
5. add MISSING_EXECUTION_START
```

如果 parent token 已无法解析：

```text
parentExecutionId = undefined
PARENT_NOT_FOUND
```

禁止为了修复 parent relation 而依据最近相同 callId 猜测父执行。

---

# 40. Approval 找不到 Active Execution

收到 `approval/request`：

```text
(sessionId, callId)
→ no active execution
```

禁止：

```text
从历史记录中找最近相同 callId 并绑定
```

处理方式：

```text
1. 将 approval 放入 runtime-only UnboundApprovalBuffer
2. Risk Advisor 本次 assessment 进入 degraded / unavailable
3. ALWAYS delegate to Harness Native Approval
4. 等待可能的 live/durable correlation 补齐
5. 若仍无法绑定，记录 ORPHAN_APPROVAL diagnostic
```

由于 Risk Advisor 是 advisory，这种情况绝不能阻塞 Harness 原生审批。

---

# 41. UnboundApprovalBuffer

这是 runtime correlation 辅助结构，不属于四个 Projection。

概念：

```text
(sessionId, callId)
→ pending unbound approval descriptors[]
```

只用于短期等待 correlation。

如果后续 ExecutionStarted / durable approval event 可以可靠绑定，则转换为正常 ApprovalRecord。

如果无法绑定，则保持 diagnostic，不生成假的 Execution relation。

---

# 42. Live Event 已有，但 Durable Event 缺失

不要用简单 wall-clock timeout 立即判定 durable 丢失。

优先使用语义边界：

```text
step/end
turn/end
session recovery boundary
```

当相关 lifecycle 已完成后仍没有预期 durable evidence，标记：

```text
DURABLE_EVIDENCE_MISSING
DEGRADED
```

对于 top-level execution，通常期待 durable `tool/result`。

对于 Code Mode nested execution，通常期待 durable `tool/code-dispatch-start` / `tool/code-dispatch`。

---

# 43. Live 与 Durable 发生冲突

正常情况 Durable Event 应确认 Live Projection。

如果 durable payload 与 live canonical outcome 冲突：

```text
DURABLE_CONFLICT
DEGRADED
```

规则：

```text
禁止 silently overwrite
保留 live 与 durable 两份 provenance
```

Canonical 使用策略：

```text
当前 live session 内：
live tools/result 仍是当时 Risk Advisor 决策上下文的 runtime authority

重启 / replay / rebuild 后：
Harness durable log 是恢复时的 source of truth
```

冲突本身必须进入 diagnostics，而不是被 reconciliation 隐藏。

---

# 44. HMR / Plugin Dispose 行为

Risk Advisor listener 必须随 Cordis fiber 正确 dispose，禁止留下重复 listener / approval middleware。

HMR 边界时：

```text
1. 停止旧 listener
2. 不再接收新事件
3. 不伪造 active execution 已完成
4. 清理 process-local WeakMap / token index
5. 对未完成的 live records 标记 HMR_BOUNDARY（若状态仍可保留）
```

新实例启动后：

```text
1. 从 Risk Advisor derived cache（若存在）加载
2. 与 Harness Session Log reconcile
3. 对漏掉的 live result 使用 result-without-start recovery
4. 对仍无法补齐的记录标记 DEGRADED
```

如果 HMR 期间 Harness Native Approval 仍在等待，Risk Advisor 不得接管或破坏它；最差情况是 risk assessment unavailable，原生 Approval 继续工作。

---

# 45. Restart Recovery

V1 Recovery 优先级：

```text
Level 1
Risk Advisor persisted projection/cache 可用
→ load
→ reconcile Harness durable log

Level 2
Risk Advisor cache 不可用 / 损坏
→ rebuild minimal Ledger from Harness Session Log
```

Risk Advisor 的 projection storage 是 derived cache，不是比 Harness Session Log 更高的 authority。

---

# 46. 从 Harness Session Log 重建 Ledger

按 Session Event `seq` 严格顺序 replay：

```text
tool/call
→ reconstruct top-level Execution skeleton

approval/asked
→ reconstruct ApprovalRequested

approval/decided
→ reconstruct ApprovalDecided

tool/result
→ reconstruct ExecutionFinished

tool/code-dispatch-start
→ reconstruct nested ExecutionStarted + tree relation

tool/code-dispatch
→ reconstruct nested ExecutionFinished

turn/end
→ attach turn-level context
```

重建出的 Execution：

```text
consistency.state = RECOVERED
issues += RECOVERED_FROM_DURABLE
```

随后重新运行：

```text
Semantic Adapters
Failure Analyzer
Relation Analyzer
```

恢复 deterministic failure / retry / escalation 关系。

---

# 47. Recovery 中无法恢复的内容

Harness durable log 不能保证恢复全部 live-only 信息。

典型不可恢复信息：

```text
ToolExecutionToken
live WeakMap identity
某些未持久化 verifier 的临时 observation
内部 tools/execute wrapper retry attempts
HMR 期间未 commit 的 transient assessment
```

处理：

```text
UNKNOWN / DEGRADED
```

禁止猜测。

---

# 48. ExecutionId 与 Recovery

`ExecutionId` 是 Risk Advisor 内部 ID，不等于 Harness callId。

V1 允许两种实现：

```text
A. persisted projection 中保存原 executionId
→ clean restart 后继续使用

B. 纯 durable rebuild 时重新 mint executionId
→ relations 通过 durable ids / seq 重建
→ consistency = RECOVERED
```

因此 V1 不要求 ExecutionId 在“完全丢失 Risk Advisor storage 后”仍保持同一个字符串值。

要求的是：

> execution identity 在一次正常 Ledger 生命周期内稳定；恢复后语义关系可重建。

---

# 49. Recovery 幂等性

同一 Harness durable event `sessionId + seq` 只能 attach / replay 一次。

维护：

```text
DurableSeenIndex
(sessionId, seq)
→ processed
```

重复 replay：幂等忽略。

同一 seq 内容发生变化属于 Harness persistence invariant violation，应 fail loud / mark `DURABLE_CONFLICT`。

---

# 50. Relation Invariants

## retryOf

```text
retryOf 必须指向同 Session 中更早的 Execution
```

## escalatesFrom

```text
escalatesFrom 必须指向同 Session 中更早的 Execution
```

## causedBy

```text
causedBy 必须指向一个已存在 FailureRecord
```

Relation Analyzer 必须阻止 cycle：

```text
E1.retryOf = E2
E2.retryOf = E1
```

这种情况标记 `RELATION_CYCLE`，不提交关系。

---

# 51. Degraded Mode 的产品语义

`DEGRADED` 不代表操作危险，也不代表安全。

它只表示：

> Risk Advisor 当前证据不完整或存在 consistency issue。

Risk Engine 必须把它作为一个 `evidence-quality` 事实，而不是直接映射成 High Risk。

Approval UI 推荐表达：

```text
Risk analysis incomplete
部分执行历史无法关联 / 恢复
```

而不是：

```text
Safe
```

也不是：

```text
Dangerous
```

---

# 52. Fail-open / Fail-closed 边界

必须再次冻结：

```text
Harness Authorization
→ fail closed

Risk Advisor Advisory Layer
→ fail open to Native Approval
```

即：

```text
Risk Advisor correlation / ledger / analyzer failure
≠
automatic allow
```

而是：

```text
Risk Advisor unavailable
→ 用户仍通过 Harness Native Approval 决策
```

---

# 53. Ledger Health Query

建议额外暴露轻量 Query：

```ts
interface LedgerHealthSnapshot {
  state: 'HEALTHY' | 'DEGRADED'
  activeExecutions: number
  unboundApprovals: number
  unresolvedIssues: LedgerIssue[]
}
```

```ts
getLedgerHealth(): LedgerHealthSnapshot
```

该接口只用于 diagnostics / observability，不参与审批 authority。

---

# 54. 第三项最终冻结结论

V1 Execution Ledger 正式冻结：

```text
1. Internal Events 与 Harness 原始 Event 解耦。

2. V1 核心 Internal Event 共 8 类。

3. 采用 Event-driven Projection，不采用 Full Event Sourcing。

4. Harness Session Log 仍是 durable runtime source of truth。

5. ExecutionRecord 是 Ledger aggregation root。

6. ApprovalRecord / FailureRecord / VerificationRecord 分离建模。

7. Execution lifecycle = PREPARING / DISPATCHING / SETTLED。

8. Approval 是正交 interaction state，不是固定 lifecycle stage。

9. ExecutionFinished ≠ Semantic Success。

10. Projector 只 fold facts；Analyzer 才做 failure / relation interpretation。

11. Runtime correlation 使用 ToolExecution object / active call / parent token 三套索引。

12. Persistent Ledger 通过 ExecutionId / session / root / fingerprint / approval / failure / verification / relation 索引查询。

13. 所有历史查询必须 bounded。

14. Similarity 默认只能向过去看，V1 默认 Session Scoped。

15. Query 层不做安全判断。

16. Ledger 一致性模型为 Live-first, durable-reconciled。

17. Duplicate / missing / orphan / conflict 不能 silent repair；必须产生 consistency issue。

18. result-without-start 可以从 tools/result exec 确定性恢复，但必须标记 RECOVERED。

19. Approval 无法关联 active execution 时禁止历史猜测，必须 degraded 并继续 Native Approval。

20. Durable event 只确认已有事实；Live/Durable 冲突不能静默覆盖。

21. HMR / restart 后优先 reconcile derived cache；必要时从 Harness Session Log 重建 minimal Ledger。

22. 无法恢复的 live-only 信息统一 UNKNOWN / DEGRADED，不猜测。

23. Risk Advisor 故障永远不能自动授权操作。
```

---

# 55. 第三项完成后的整体架构

```text
Harness
│
├── tools/pre-execute
├── tools/execute
├── approval/request
├── tools/result
├── session/event
└── code-dispatch
        │
        ▼
Harness Adapter / Recorder
        │
        ▼
Internal Event Contract
        │
        ├── ExecutionStarted
        ├── ExecutionDispatchStarted
        ├── ApprovalRequested
        ├── ApprovalDecided
        ├── ExecutionFinished
        ├── FailureObserved
        ├── VerificationObserved
        └── DurableEvidenceAttached
        │
        ▼
Projectors / Analyzers
        │
        ├── Execution Projector
        ├── Approval Projector
        ├── Verification Projector
        ├── Failure Analyzer
        └── Relation Analyzer
        │
        ▼
Execution Ledger
        │
        ├── ExecutionRecord
        ├── ApprovalRecord
        ├── FailureRecord
        └── VerificationRecord
        │
        ▼
Indexes + Query Contract
        │
        ▼
ExecutionContextSnapshot
        │
        ▼
Context Builder
        │
        ▼
Risk Engine
        │
        ▼
Approval UI / Execution History UI
```

---

# 56. 下一阶段

第三项完成后，可以进入第四项：

> **Risk Engine Contract / Context Builder Contract**

建议顺序：

```text
Execution Ledger
↓
Failure Analyzer rules
↓
Relation Analyzer rules
↓
Context Builder
↓
Deterministic Risk Signals
↓
LLM Side Judge
↓
Structured RiskAssessment
↓
Approval Presenter
```

在进入完整实现前，仍应对上一阶段标出的 Critical Spike 做验证，尤其是：

```text
approval/request middleware ordering
HMR disposal
nested call correlation
active call lookup
Durable reconciliation
Approval UI integration seam
```
