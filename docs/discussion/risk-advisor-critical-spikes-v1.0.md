# Risk Advisor — Critical Spikes V1.0

> 状态：Risk Advisor 第五项 5A 正式设计文档  
> 日期：2026-08-27  
> 上游依据：Harness Integration Map V1.0、Execution Ledger / Internal Event Model V1.0、Risk Engine Contract V1.0  
> 目标：在正式实现 Risk Advisor V1 前，对可能导致架构返工的 Harness 集成假设进行最小、可观测、可判定的实验验证。

---

# 1. 文档目的

前四项已经完成 Risk Advisor V1 的纸面设计：

```text
1. V1 Contract
2. Harness Integration Map
3. Execution Ledger / Internal Event Model
4. Risk Engine Contract
```

5A 不继续扩展功能，而是：

```text
架构假设
   ↓
Critical Spike
   ↓
真实 Harness 行为
   ↓
PASS / PARTIAL_PASS / FAIL / BLOCKED
   ↓
冻结或修订 Contract
   ↓
进入正式实现
```

---

# 2. Spike 总体原则

所有 Spike 必须遵守：

```text
1. 最小实验
2. 只验证关键假设
3. 不顺手实现正式功能
4. 必须记录可观测事实
5. 必须提前定义 PASS / FAIL
6. 失败后必须有明确 Architecture Action
7. 不允许用 workaround 掩盖 seam 本身的问题
```

统一结构：

```text
CriticalSpike
├── id
├── question
├── architecturalAssumption
├── whyCritical
├── minimalExperiment
├── scenarios[]
├── observables[]
├── passCriteria[]
├── failCriteria[]
├── architectureOnPass
├── architectureOnFail
└── implementationForbidden
```

---

# 3. 共同安全原则

```text
Wrong correlation
> Missing correlation

Recovery correctness
> Recovery completeness

Authoritative evidence
> Deterministic inference
> Inferred explanation

Risk Advisor failure
→ Native Harness Approval continues

Risk Advisor
≠ Approval Authority
```

---

# 4. Spike 总览

```text
Spike 1  Approval Middleware Ordering
Spike 2  Approval UI Seam
Spike 3  ActiveExecutionIndex / Approval Correlation
Spike 4  Nested Execution / Durable Tree Reconstruction
Spike 5  Guard Denial Detection
Spike 6  Ledger Degraded / HMR / Recovery
Spike 7  Assessment Latency / Bounded Advisory Path
```

---

# 5. Spike 1 — Approval Middleware Ordering

## Question

验证 Risk Advisor 是否可以稳定参与 `approval/request` waterfall，在 Harness Native Human Approval answerer 之前完成 advisory work，随后调用 `next()`，最终仍由 Harness Native Approval 决策。

目标：

```text
Tool Execution
      ↓
approval/request
      ↓
Risk Advisor Advisory Middleware
      │
      ├── observe
      ├── correlate
      ├── bounded assessment
      └── next()
             ↓
Harness Native Approval
             ↓
Human
             ↓
ApprovalOutcome
```

## Assumption

```text
Risk Advisor
= Bounded Advisory Middleware

Risk Advisor
≠ Approval Answerer
```

## Why Critical

如果 Native Approval 在 Risk Advisor 之前消费 request，则实时风险评估失去意义，可能需要改为 `tools/pre-execute` 预计算或 Host Pending Approval Registry side-channel。

## Minimal Experiment

记录：

```text
RA_BEFORE_NEXT
next()
RA_AFTER_NEXT
NATIVE_APPROVAL_VISIBLE
USER_DECISION
```

理想顺序：

```text
RA_BEFORE_NEXT
↓
NATIVE_APPROVAL_VISIBLE
↓
USER_DECISION
↓
RA_AFTER_NEXT
```

## Scenarios

```text
S1.1  普通单次 approval
S1.2  连续两次 approval
S1.3  并发 ToolCall
S1.4  nested tool approval
S1.5  bash sandbox escalation approval
S1.6  RA middleware throw
S1.7  RA middleware timeout / bounded fallback
S1.8  dispose → reload
S1.9  多次 HMR
S1.10 改变正常插件加载顺序
```

## Observables

```text
listener instance id
approval request identity
callId
middleware enter timestamp
next invocation
middleware exit timestamp
native approval appeared
native decision completed
dispose timestamp
```

## PASS

```text
P1  RA 在 Native decision 前进入
P2  next() 后 Native Approval 正常
P3  RA 从不产生 ApprovalOutcome
P4  普通 / in-body escalation 都成立
P5  nested approval 通过同一 advisory path
P6  多 approval 不串线
P7  throw / timeout 后 Native Approval 仍可用
P8  HMR 后旧 listener 不再触发
P9  同一 request 只被一个有效 RA instance 处理
P10 正常加载顺序变化不破坏 ordering contract
```

## FAIL

```text
Native answerer 抢先消费
必须成为 terminal answerer 才能看到 request
next() 无法可靠进入原生 flow
HMR 后 listener 重复
nested / escalation 绕过 middleware
顺序依赖偶然加载时机
RA 异常导致 Approval 挂起
```

## Architecture Action

PASS：

```text
Approval Integration
= Bounded Advisory Middleware
```

FAIL：

```text
顺序不可保证
→ pre-execute 预计算

Native answerer 抢占
→ Host Pending Approval Registry side-channel

HMR cleanup 不可靠
→ singleton service + generation fencing

某些 Approval source 绕过
→ 重绘 Approval Source Map
```

---

# 6. Spike 2 — Approval UI Seam

## Question

验证 Risk Advisor 是否能在不接管 Approval Authority、不复制 Pending Approval 状态机、不破坏原生 Allow / Reject RPC 的前提下，把 RiskAssessment 稳定呈现在审批界面中。

## Candidate Priority

```text
A. Native Additive Enrichment
        >
B. conversation.composer Takeover
        >
C. Adjacent / Sidecar Surface
```

### A. Additive

```text
Harness Native ApprovalPanel
├── Native content
├── RiskAdvisorCard
└── Native Allow / Reject
```

仅在存在 `PUBLIC_SUPPORTED` additive seam 时成立。

### B. Takeover

```text
conversation.composer
        ↓
RiskAdvisorApprovalPanel
├── Harness PendingApproval
├── RiskAssessment
├── Reject
└── Allow
        ↓
PendingApproval.answer()
```

冻结：

```text
Harness PendingApproval
= 唯一 Approval State Authority

RiskAdvisorApprovalPanel
= Presentation only
```

### C. Sidecar

当 A、B 都不可接受时，Risk Advisor Card 与 Native Approval Composer 相邻显示。

## Scenarios

```text
S2.1  普通 Approval
S2.2  Allow
S2.3  Reject
S2.4  Cancelled
S2.5  Unavailable / disappearing approval
S2.6  A1 → A2 连续 Approval
S2.7  不同 Tool Approval
S2.8  nested approval
S2.9  sandbox escalation
S2.10 Approval ready / Assessment pending
S2.11 Assessment supersession
S2.12 Approval resolve / Assessment arrival race
S2.13 Session switch
S2.14 plugin dispose
S2.15 HMR
```

## Identity

每次 render 至少记录：

```text
sessionId
approvalId
callId?
executionId?
assessmentId?
panel instance id
```

最强 UI identity：

```text
sessionId + approvalId
```

## PASS — Additive

```text
A1  Risk Card 稳定插入 Native Approval
A2  不替换原生按钮
A3  不调用 answer()
A4  resolve 后 Risk Card 自动消失
A5  Approval / Assessment correlation 正确
A6  支持 pending / update
A7  nested / escalation 一致
A8  Session switch 无残留
A9  HMR 无重复 UI
A10 使用 public supported seam
```

## PASS — Takeover

```text
B1  takeover 稳定
B2  PendingApproval 是唯一 state source
B3  只通过 PendingApproval.answer()
B4  无双 response
B5  resolved approval 不被 Assessment 复活
B6  支持 pending assessment
B7  支持 supersession
B8  nested / escalation correlation 正确
B9  dispose / HMR ownership 正确释放
B10 RA failure / disable 后 Native UI 恢复
```

## FAIL

```text
只能依赖 private component
Risk Card 与 Approval identity 错配
resolve 后 UI 残留
Assessment arrival 复活 resolved approval
takeover 需要复制 pending state machine
takeover 需要自建 approval API
HMR 出现多个 composer owner
RA disable 后 Native Approval 无法恢复
Session switch 显示旧 assessment
```

---

# 7. Spike 3 — ActiveExecutionIndex / Approval Correlation

## Question

验证：

```text
tools/pre-execute
      ↓
mint ExecutionId
      ↓
ActiveExecutionIndex
      ↓
approval/request(callId)
      ↓
准确找到当前 Execution
```

核心目标：

```text
Approval A
→ Exactly One Active Execution E
```

## Critical Assumptions

```text
1. approval/request 能获得与 pre/result 共享的 session/scope identity
2. callId 在 active correlation window 中足够区分当前 Execution
```

## Safety Rule

禁止：

```text
last writer wins
最近同 callId 猜测
```

Active Index 必须支持：

```text
UNIQUE
AMBIGUOUS
NOT_FOUND
```

## Scenarios

```text
S3.1  普通单 Execution
S3.2  连续重复 callId
S3.3  并发不同 callId
S3.4  active callId collision
S3.5  nested execution
S3.6  sandbox in-body escalation
S3.7  denied → new escalation execution
S3.8  missing callId
S3.9  late approval after cleanup
S3.10 HMR / reload
S3-ID shared scope identity
```

## Lifecycle Rule

```text
Active Execution
从 ExecutionStarted
持续到 ExecutionFinished
```

不能在 `ExecutionDispatchStarted` 时清理。

## ApprovalCorrelation Candidate

```ts
type ApprovalCorrelation =
  | {
      status: 'BOUND'
      executionId: ExecutionId
      basis: 'ACTIVE_CALL'
    }
  | {
      status: 'UNBOUND'
      reason:
        | 'MISSING_CALL_ID'
        | 'NO_ACTIVE_EXECUTION'
        | 'MISSING_SCOPE_IDENTITY'
    }
  | {
      status: 'AMBIGUOUS'
      candidateExecutionIds: ExecutionId[]
    }
```

## PASS

```text
P1  正常 Approval → exactly one active Execution
P2  callId reuse 不绑定旧 execution
P3  并发不串线
P4  collision → AMBIGUOUS
P5  nested approval 绑定 nested execution
P6  in-body escalation 仍能绑定
P7  escalation retry 绑定新 execution
P8  missing callId → UNBOUND
P9  finish 后 active index 清理
P10 找到稳定 scope identity
P11 HMR 丢 correlation → DEGRADED
P12 correlation failure 不阻断 Native Approval
```

---

# 8. Spike 4 — Nested Execution / Durable Tree Reconstruction

## Question

验证：

```text
Live:
parent token
→ parentExecutionId

Durable:
tool/code-dispatch-start
tool/code-dispatch
+
rootCallId / parentCallId / subCallId
→ 是否足以重建执行树
```

必须区分：

```text
Nested Tree
≠
Retry Chain
≠
Escalation Chain
```

## Scenarios

```text
S4.1  单层 nested
S4.2  多 siblings
S4.3  child failure
S4.4  nested child approval
S4.5  nested child sandbox escalation
S4.6  multiple roots
S4.7  callId reuse across step
S4.8  missing dispatch-start
S4.9  missing settled dispatch
S4.10 root missing / child durable exists
S4.11 retry 不进入 tree
S4.12 escalation 不进入 tree
```

## Reconstruction

```text
1. 读取 bounded relevant Session Events
2. 建立 root execution occurrence
3. 读取 code-dispatch-start
4. 建立 parent / child occurrence
5. assign parentExecutionId
6. assign rootExecutionId
7. reconcile settled dispatch
8. detect collision / ambiguity
9. unresolved → DEGRADED，不猜
```

## Edge Status Candidate

```text
CONFIRMED
RECOVERED
AMBIGUOUS
UNRESOLVED
```

## PASS

```text
P1  单层 parent-child 可恢复
P2  siblings 不串 parent
P3  child failure 保持 child ownership
P4  nested approval durable 后仍绑定 child
P5  in-body escalation 不破坏 tree
P6  不同 root 不混合
P7  callId reuse 有 occurrence disambiguation
P8  dispatch ordering 不影响 correctness
P9  缺部分 evidence → recovered/degraded
P10 retry 不进入 nested tree
P11 escalation 不进入 nested tree
P12 restart 后 tree 与 live 等价或明确 unresolved
```

## Potential Contract Revision

若 Partial PASS：

```ts
interface ParentRelation {
  status:
    | 'ROOT'
    | 'CONFIRMED'
    | 'RECOVERED'
    | 'AMBIGUOUS'
    | 'UNRESOLVED'

  parentExecutionId?: ExecutionId
  basisSeqs: number[]
}
```

Root relation 同理。

---

# 9. Spike 5 — Guard Denial Detection

## Question

验证：

```text
pre-execute completed
+
dispatch absent
+
result failure
+
known alternatives excluded
→ guardrail_denial ?
```

并确认 Harness 是否存在结构化 Guard evidence。

## Ground Truth / Observer

实验必须同时记录：

```text
Ground Truth
→ TestDenyGuard 确知发生了什么

Observer View
→ Risk Advisor 通过 public seams 实际看到什么
```

## 必须区分

```text
pre_execute_denial
guardrail_denial
approval_rejected
approval_cancelled
approval_unavailable
cancellation
sandbox_denial
timeout
system_failure
unknown_pre_dispatch_block
```

## Scenarios

```text
S5.1  known guard denial
S5.2  pre-execute explicit denial
S5.3  approval rejected
S5.4  approval cancelled
S5.5  approval unavailable
S5.6  abort before dispatch
S5.7  pre-execute middleware throws
S5.8  guard throws vs guard returns deny
S5.9  sandbox denial
S5.10 sandbox approval rejection
S5.11 timeout
S5.12 unknown pre-dispatch failure
```

## Detection Precedence Candidate

```text
1. TOOL_TIMEOUT
   → timeout

2. Approval outcome
   → approval_*

3. Explicit abort
   → cancellation

4. Explicit pre-execute deny
   → pre_execute_denial

5. sandbox.denied
   → sandbox_denial

6. structured guard evidence
   → guardrail_denial

7. otherwise:
   pre allowed
   + dispatch absent
   + result failure
   + known causes excluded
   → inferred pre_dispatch_block
```

## Possible Results

```text
A. structured Guard evidence
→ guardrail_denial / AUTHORITATIVE

B. closed pipeline invariant
→ guardrail_denial / DETERMINISTIC

C. multiple possible causes remain
→ pre_dispatch_block / INFERRED
```

## PASS

```text
P1  pre-execute deny 可识别
P2  approval outcomes 不误判 Guard
P3  abort 不误判 Guard
P4  sandbox denial 不误判 Guard
P5  timeout 不误判 Guard
P6  guard deny runtime/durable 表现完整记录
P7  guard throw 与 deny 尽量区分
P8  明确最终 evidence strength
P9  无法证明 Guard 时使用更宽 category
P10 live / durable classification 可 reconcile
P11 detection failure 不影响 Harness control
```

---

# 10. Spike 6 — Ledger Degraded / HMR / Recovery

## Question

验证 missing、duplicate、delayed、conflicting、HMR、restart 情况下 Ledger 是否明确 `DEGRADED` 或可证明恢复，而不是 silent repair。

## Core Rule

```text
Recovery correctness
>
Recovery completeness
```

以及：

```text
Missing Event
不能通过默认值伪装成 Negative Evidence
```

## Candidate Issues

```text
MISSING_EXECUTION_START
DUPLICATE_EXECUTION_START
MISSING_EXECUTION_FINISH
DUPLICATE_EXECUTION_FINISH
ORPHAN_APPROVAL
AMBIGUOUS_APPROVAL
MISSING_DURABLE_CONFIRMATION
LIVE_DURABLE_CONFLICT
UNRESOLVED_PARENT
AMBIGUOUS_PARENT
HMR_STATE_LOSS
RECOVERY_INCOMPLETE
```

## Scenarios

```text
S6.1  happy path
S6.2  result without start
S6.3  start without result
S6.4  duplicate ExecutionStarted
S6.5  duplicate ExecutionFinished
S6.6  orphan approval
S6.7  live + durable consistent
S6.8  live / durable conflict
S6.9  durable confirmation never arrives
S6.10 HMR idle
S6.11 HMR during PREPARING
S6.12 HMR during DISPATCHING
S6.13 HMR after ApprovalRequested
S6.14 full restart recovery
S6.15 recovery idempotency
S6.16 out-of-order durable events
S6.17 replay + live race
S6.18 multiple pending approvals
S6.19 stale pending approval
```

## Recovery Rules

```text
Result without Start
→ deterministic recovery from tools/result
→ mark recovered provenance

Start without Result
→ retain last-known lifecycle
→ DEGRADED
→ never auto-fail

Duplicate identical
→ idempotent

Duplicate conflicting terminal outcome
→ DEGRADED
→ no last-writer-wins

Orphan approval
→ UNBOUND / buffer
→ no fake Execution

Live + Durable consistent
→ confirmation only

Live + Durable conflict
→ DEGRADED
→ preserve both evidence
```

## Durable Replay

候选：

```text
ProcessedDurableEventIndex:
(sessionId, seq)
→ processed

RecoveryWatermark:
(sessionId, durableSeq)
```

## Health Model Candidate

建议验证从三态：

```text
HEALTHY
DEGRADED
RECOVERED
```

升级为二轴：

```text
Consistency:
HEALTHY | DEGRADED

Provenance:
LIVE | RECOVERED | MIXED
```

## PASS

```text
P1  Missing Start 可恢复且标 provenance
P2  Missing Result 不自动失败
P3  duplicate identical idempotent
P4  conflicting terminal event → DEGRADED
P5  orphan approval 不猜
P6  durable confirmation 不复制 outcome
P7  live/durable conflict 显式 DEGRADED
P8  missing durable confirmation 不抹 live result
P9  HMR 不产生 duplicate listener/record
P10 HMR state loss → safe degraded
P11 restart 可重建 minimum viable ledger
P12 non-recoverable live facts → UNKNOWN
P13 recovery idempotent
P14 durable replay 使用 source seq
P15 replay/live race 不重复 execution
P16 resolved issue 保留 provenance
P17 current degradation 进入 Evidence Quality
P18 Ledger failure 不破坏 Harness control
```

---

# 11. Spike 7 — Assessment Latency / Bounded Advisory Path

## Question

验证完整 advisory path 的实际 latency，并确定：

```text
T_sync
T_deterministic
T_judge
```

## 双路径架构

```text
Assessment Path
├── Deterministic Fast Path
└── Optional Judge Slow Path
```

推荐：

```text
Fast Path
↓
Assessment A1

Judge
↓
Assessment A2
supersedes A1
```

## Fast Path 禁止

```text
LLM
network search
新 shell 命令
大目录递归
全仓扫描
远程 API
embedding retrieval
```

## Metrics

必须测：

```text
P50
P95
P99
MAX
```

以及：

```text
Approval Added Latency
Time To First Assessment
Time To Final Assessment
```

必须有 Native Approval baseline。

## Scenarios

```text
S7.1  simple low-risk
S7.2  deterministic high-risk
S7.3  retry/escalation history
S7.4  long session
S7.5  nested tree
S7.6  degraded ledger
S7.7  judge required
S7.8  judge fast
S7.9  judge slow
S7.10 judge timeout
S7.11 judge/provider failure
S7.12 assessment after user decision
S7.13 assessment immediately before decision
S7.14 concurrent assessments
S7.15 judge concurrency saturation
S7.16 context builder timeout
S7.17 pathological oversized input
```

## Bounded Runtime Candidate

```text
approval/request
      ↓
start assessment
      ↓
wait up to T_sync
      │
      ├── assessment ready
      │      ↓
      │   publish
      │
      └── not ready
             ↓
          mark pending
      ↓
next()
      ↓
Native Approval
```

后台：

```text
assessment continues
↓
new Assessment
↓
update only if Approval still pending
```

## Late Result

```text
Approval Pending
+
new Assessment
→ UI may update

Approval Resolved
+
new Assessment
→ save only
→ never revive UI
```

## PASS

```text
P1  added latency 有明确上界
P2  deterministic tail latency 支持短 T_sync
P3  Judge 非 Native Approval 硬依赖
P4  Judge timeout/failure 不阻塞 Approval
P5  长 Session 不导致无界 latency
P6  nested/retry history bounded
P7  degraded path 快速返回
P8  oversized args bounded
P9  concurrent assessments 不互相阻塞
P10 Judge saturation 不影响 deterministic path
P11 resolved approval 不被 late assessment 复活
P12 presentedAssessmentId 正确
P13 异步阶段均有 timeout/cancel
P14 latency failure 最终回落 Native Approval
```

## Budget Contract

Spike 完成后填写：

```ts
interface AdvisoryLatencyPolicy {
  synchronousWaitMs: number
  deterministicAssessmentTimeoutMs: number
  judgeTimeoutMs: number
  maxConcurrentJudges: number
  contextBuildTimeoutMs: number
  publishTimeoutMs: number
}
```

数字必须来自 benchmark。

---

# 12. Cross-Spike Dependency

建议实际执行顺序：

```text
S1 Approval Middleware Ordering
        ↓
S2 Approval UI Seam

S3 ActiveExecutionIndex
        ↓
S4 Durable Tree Reconstruction

S5 Guard Denial Detection

S6 Ledger Recovery

S7 Assessment Latency
```

关系：

```text
S1 验证能不能可靠进入审批链
S2 验证风险信息能不能可靠呈现
S3 验证 Approval 属于哪个 Execution
S4 验证 restart 后 nested ownership
S5 验证 Failure attribution 边界
S6 验证 Ledger 长期运行不会腐烂
S7 验证 Advisory Path 不拖垮 UX
```

---

# 13. Spike Result Status

每项只能使用：

```text
PASS
PARTIAL_PASS
FAIL
BLOCKED
```

语义：

```text
PASS
→ 原 Contract 可冻结

PARTIAL_PASS
→ 可用，但必须显式增加 ambiguity/degraded semantics

FAIL
→ 原架构假设被推翻，执行 Architecture Action

BLOCKED
→ 当前 Harness seam / 环境无法完成验证
```

---

# 14. Spike Evidence Package

每个 Spike 最终至少保留：

```text
1. Test environment
2. Harness commit
3. Test plugin commit / patch
4. Scenario list
5. Raw instrumentation logs
6. Observed behavior
7. PASS / PARTIAL_PASS / FAIL / BLOCKED
8. Contract changes
9. Remaining unknowns
```

---

# 15. 5A Exit Criteria

5A 只有满足以下条件才能关闭：

```text
1. 七个 Spike 都有正式状态
2. 所有 Critical FAIL 都已有架构决策
3. 不再存在会导致大规模返工的未知 Harness seam
4. Approval Authority 仍完全归 Harness / Human
5. Correlation 不能证明时明确 degraded
6. Recovery 不能证明时明确 degraded
7. Failure attribution 不虚假精确
8. Advisory path 有严格 latency bound
```

---

# 16. 5A 最终冻结目标

```text
The Risk Advisor V1 architecture is implementation-ready
only after its approval, correlation, nested execution,
failure attribution, recovery, UI, and latency assumptions
have been validated against real Harness behavior.

Any uncertainty that remains must be represented explicitly
as degraded, ambiguous, unresolved, partial, or bounded;
it must never be silently converted into a confident safety claim.
```

---

# 17. 下一阶段

进入：

```text
5B — Test Matrix
```

目标：

> 把 V1 Contract、Execution Ledger、Risk Engine、Policy Matrix 和七个 Critical Spikes 转化为完整、可执行、可验收的测试覆盖模型。
