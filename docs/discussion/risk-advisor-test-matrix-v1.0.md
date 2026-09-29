# Risk Advisor — Test Matrix V1.0

> 状态：Risk Advisor 第五项 5B 正式测试契约  
> 日期：2026-08-27  
> 上游依据：
> - Risk Advisor V1 Contract
> - Harness Integration Map V1.0
> - Execution Ledger / Internal Event Model V1.0
> - Risk Engine Contract V1.0
> - Critical Spikes V1.0
>
> 目标：定义 Risk Advisor V1 的最小充分测试覆盖，证明核心安全、不变量、恢复、风险判断和 Approval UX 符合 Contract，同时避免测试数量和实现耦合失控。

---

# 1. 反过度测试审查结论

本轮审查重点检查：

```text
1. A–J 是否存在重复测试
2. 是否在测试实现细节而不是 Contract
3. 哪些案例应参数化
4. 哪些 P0 实际应降为 P1 / P2
5. 哪些 Cross-Area E2E 可以删除
6. 哪些 Critical Spike 结果应作为条件测试，而不是提前固化假设
```

最终结论：

```text
原 A–J 覆盖方向正确，
但存在：
- Duplicate / conflict 在 A 与 F 重复
- Failure primary attribution 在 D 与 E 重复
- Evaluator 与 Aggregator 有部分安全断言重复
- Cross-Area E2E 数量偏多
- 一部分 P0 实际只是核心正确性，不属于 Release Blocker
- 部分测试过度依赖预期实现结构
```

因此 V1 Test Matrix 采用：

> **Contract-first + Parameterized + Layered + Minimal E2E**

---

# 2. 反过度测试后的五条治理规则

## Rule T1 — 测 Contract，不测 private implementation

禁止把以下内容作为正式测试目标：

```text
某个 private Map 的内部结构
某个 class / function 的具体名字
具体 React component hierarchy
某个 listener 数量的内部实现方式
某个缓存容器是否使用 WeakMap / Map
```

允许测试：

```text
同一 ToolExecution 只产生一个 ExecutionId
HMR 后没有 duplicate observable behavior
resolved Approval 不会重新出现
collision 不会 last-writer-wins
```

即：

> 测可观察不变量，不锁死实现方式。

---

## Rule T2 — 同一 Contract 只在最低有效层证明一次

例如：

```text
AssessmentAggregator:
explicit denial → REJECT_RECOMMENDED
```

应主要在：

```text
L1 Pure Unit
```

证明。

L5 E2E 不再穷举所有 Aggregator 组合。

E2E 只证明：

```text
真实 Harness approval
→ RiskAssessment 被正确呈现
→ Native Approval 仍然工作
```

---

## Rule T3 — Safety Invariant 才是 P0

P0 定义收紧为：

> 失败可能造成错误 Approval Context、突破用户授权语义、虚假安全结论、Ledger silent corruption，或者让 Risk Advisor 成为 Harness Approval 可用性的单点故障。

普通核心功能错误归：

```text
P1
```

展示、排序、文案等归：

```text
P2
```

---

## Rule T4 — 组合规则用参数化，不做笛卡尔积

以下区域优先 table-driven / parameterized：

```text
Area B — Correlation outcomes
Area D — Failure classification
Area H — Dimension Evaluators
Area I — Aggregator Policy Matrix
Area F — fault/recovery variants
```

禁止六维完整笛卡尔积。

---

## Rule T5 — Spike 未验证的事实不提前固化成 Regression Contract

例如：

```text
guardrail_denial strength
Approval UI additive vs takeover
live correlation key 是 sessionId 还是 scopeIdentity
tree occurrence identity 的最终结构
latency budget 数值
```

在 Critical Spike 完成前只能写：

```text
SPIKE_CONDITIONAL
```

Spike 得出结论后再替换为正式 regression assertion。

---

# 3. 测试层级

```text
L1 — Pure Unit
L2 — Component / Contract
L3 — Harness Integration
L4 — Recovery / Fault Injection
L5 — End-to-End Approval
```

## L1 — Pure Unit

不启动 Harness。

主要覆盖：

```text
operationHash / fingerprint
Feature Extractor
Failure precedence
DimensionEvaluator
AssessmentAggregator
Relation inference rules
```

---

## L2 — Component / Contract

使用 Risk Advisor 内部真实组件 + fake/fixture Harness Adapter。

主要覆盖：

```text
Internal Event → Projection
Projection → Query
RiskContextSnapshot → RiskFeatureSet
FailureObserved → FailureRecord
VerificationObserved → VerificationRecord
```

---

## L3 — Harness Integration

使用真实 Harness seam：

```text
tools/pre-execute
tools/execute
approval/request
tools/result
session/event
code-dispatch
```

主要验证：

> Adapter 对 Harness 的理解是否正确。

---

## L4 — Recovery / Fault Injection

主动破坏：

```text
missing
duplicate
out-of-order
conflict
HMR
restart
orphan approval
```

---

## L5 — End-to-End Approval

仅保留少量高价值真实链路：

```text
Tool
→ Approval
→ Assessment
→ UI
→ Human decision
→ Harness result
```

---

# 4. 优先级

## P0 — Release Blocker

任一失败均阻止 V1 发布。

典型：

```text
错误 Approval Correlation
Explicit Denial 被建议 Approve
Critical Unknown 静默变 Approve
terminal conflict last-writer-wins
recovery invents missing facts
late assessment 改写已 resolved approval
Risk Advisor failure 阻断 Native Approval
```

---

## P1 — Core Correctness

核心功能错误，需要修复，但不一定构成直接安全边界突破。

例如：

```text
retry chain 错误
Evidence Quality 分类错误
safer alternative 未识别
durable tree 非关键 edge 恢复失败但正确 degraded
```

---

## P2 — Secondary / Presentation

例如：

```text
finding 次序
secondary metadata
非关键 detail rendering
```

---

# 5. 全局 P0 不变量

最终保留 12 条全局 P0：

```text
P0-01
Risk Advisor never produces Harness ApprovalOutcome.

P0-02
Risk Advisor failure never prevents Native Approval.

P0-03
Approval never binds to a historical Execution by guess.

P0-04
Ambiguous active correlation remains AMBIGUOUS.

P0-05
Nested Approval binds to the nested Execution when exact
structural correlation is available.

P0-06
Explicit user denial always produces REJECT_RECOMMENDED.

P0-07
Authorization never reduces Hazard Level.

P0-08
Evidence Quality never mechanically increases or decreases
Hazard Level.

P0-09
Critical unknown evidence never silently becomes APPROVE.

P0-10
Conflicting terminal outcomes never use last-writer-wins.

P0-11
Recovery never invents missing facts.

P0-12
Late Assessment never changes or revives an already resolved
Harness Approval.
```

---

# 6. Area A — Execution Capture

## 目标

证明 Harness ToolExecution 被准确转换为 Risk Advisor Internal Events。

## 最终案例

| ID | Scenario | Expected | Level | Priority |
|---|---|---|---|---|
| `A-001` | 普通 ToolExecution | 同一 executionId 下产生 `ExecutionStarted → ExecutionDispatchStarted → ExecutionFinished` | L3 | P0 |
| `A-002` | `tools/result` success | `runtimeOutcome=success`；不凭成功结果自动推导 semantic success/failure | L2/L3 | P1 |
| `A-003` | `tools/result isError=true` | `ExecutionFinished=error`；保留结构化 error 信息 | L2 | P1 |
| `A-004` | parsed live args + durable raw args | Live parsed args 是实际 Operation primary evidence；durable raw args 只 corroborate | L2/L3 | P1 |
| `A-005` | execution 在 dispatch 前结束 | 不伪造 `ExecutionDispatchStarted` | L3 | P1 |

## 审查后删除 / 移动

原：

```text
duplicate ExecutionStarted
duplicate ExecutionFinished
conflicting terminal result
```

从 Area A 删除，统一移入：

```text
Area F — Recovery / Fault Injection
```

理由：

> Duplicate / conflict 本质是 consistency/recovery contract，而不是正常 capture contract。

---

# 7. Area B — Approval Correlation

## 目标

Approval 要么精确绑定一个 Active Execution，要么显式 UNBOUND / AMBIGUOUS。

## 参数化 Correlation Cases

| ID | Scenario | Expected | Level | Priority |
|---|---|---|---|---|
| `B-001` | 唯一 active call | `BOUND` 到当前 Execution | L3 | P0 |
| `B-002` | finished 后 callId 被后续 execution 重用 | 绑定新的 active Execution，不绑定历史 | L3 | P0 |
| `B-003` | 并发不同 callId | correlation 相互隔离 | L3 | P0 |
| `B-004` | active correlation key collision | `AMBIGUOUS`，禁止 newest/last-writer-wins | L3/L4 | P0 |
| `B-005` | missing callId | `UNBOUND/MISSING_CALL_ID` | L3 | P0 |
| `B-006` | callId 有值但无 active execution | `UNBOUND/NO_ACTIVE_EXECUTION`，禁止历史 fallback | L3 | P0 |
| `B-007` | 无共享 scope identity | `UNBOUND/MISSING_SCOPE_IDENTITY` | L3 | P0 |
| `B-008` | correlation degraded | Advisory degraded，但 Native Approval 继续 | L5 | P0 |

## Spike Conditional

`B-007` 的真实 key：

```text
(sessionId, callId)
```

还是：

```text
(scopeIdentity, callId)
```

由 Spike 3 最终决定。

测试只锁定语义：

> 必须有一个经过 Spike 验证的共同 live scope identity。

---

# 8. Area C — Nested Execution

## 目标

证明 root / parent / child 与 retry / escalation 关系严格分离。

| ID | Scenario | Expected | Level | Priority |
|---|---|---|---|---|
| `C-001` | `run_code → child` | child 的 parent/root 结构正确 | L3 | P0 |
| `C-002` | 一个 root 多 sibling | sibling 共享 root，但互不成为 parent | L3 | P1 |
| `C-003` | nested child Approval | Approval 绑定 child，不绑定 root | L3/L5 | P0 |
| `C-004` | nested child in-body escalation | Approval 不破坏 child 的 structural ownership | L3 | P0 |
| `C-005` | child failure | Failure 属于 child；root outcome 独立 | L2/L3 | P1 |
| `C-006` | restart durable reconstruction | 可证明的 edge 正确恢复；不可证明显式 unresolved/ambiguous | L4 | P0 |
| `C-007` | callId occurrence reuse | 不合并不同 occurrence | L4 | P0 |
| `C-008` | semantic retry | `retryOf` 不改变 structural parent | L1/L2 | P0 |
| `C-009` | escalation retry | `escalatesFrom` 不改变 structural parent | L1/L2 | P0 |

## 参数化合并

```text
C-008 + C-009
```

实现时应作为：

```text
semantic_relation_does_not_mutate_structural_tree[
  retry,
  escalation
]
```

参数化测试。

---

# 9. Area D — Failure Classification

## 目标

证明一个 Execution 可以拥有多个 evidence，但只形成一个正确 Primary Failure。

## D1 — Structured / Deterministic Failure Table

| Case | Input | Primary Failure | Strength | Priority |
|---|---|---|---|---|
| `D-001` | generic `isError=true` | `explicit_failure` | AUTHORITATIVE | P1 |
| `D-002` | `TOOL_TIMEOUT` | `timeout` | AUTHORITATIVE | P0 |
| `D-003` | Approval rejected | `approval_rejected` | AUTHORITATIVE | P0 |
| `D-004` | Approval cancelled | `approval_cancelled` | AUTHORITATIVE | P1 |
| `D-005` | Approval unavailable | `approval_unavailable` | AUTHORITATIVE | P1 |
| `D-006` | Bash exitCode != 0, runtime non-error | `semantic_failure` | DETERMINISTIC | P1 |
| `D-007` | `sandbox.denied=true` | `sandbox_denial` | DETERMINISTIC | P0 |
| `D-008` | explicit pre-execute deny | `pre_execute_denial` | Spike-derived | P1 |
| `D-009` | known guard deny | `guardrail_denial` 或 `pre_dispatch_block` | Spike-derived | P0 |
| `D-010` | structured abort/cancel | `cancellation` | authoritative/structured | P1 |

## D2 — Primary Failure Precedence

参数化：

```text
approval_rejected + generic runtime error
→ primary = approval_rejected

TOOL_TIMEOUT + generic runtime error
→ primary = timeout

sandbox_denial + generic semantic failure
→ primary = sandbox_denial
```

Priority：

```text
P0
```

## 审查后调整

原先：

```text
Approval cancelled/unavailable
semantic nonzero exit
```

均为 P0。

本轮降为：

```text
P1
```

理由：

> 分类错误会影响解释，但只要不越过 Approval Authority / correlation / authorization boundary，不应全部作为 Release Blocker。

---

# 10. Area E — Ledger Projection / Query

## 目标

证明 Internal Events 能稳定 fold 成 Projection，并通过 bounded Query 暴露事实。

| ID | Scenario | Expected | Level | Priority |
|---|---|---|---|---|
| `E-001` | `ExecutionStarted` | 创建 PREPARING ExecutionRecord | L2 | P1 |
| `E-002` | `ExecutionDispatchStarted` | PREPARING → DISPATCHING | L2 | P1 |
| `E-003` | `ExecutionFinished` | → SETTLED，保存唯一 runtime outcome | L2 | P0 |
| `E-004` | Approval request / decision | 独立 ApprovalRecord；Execution 只引用其 ID | L2 | P1 |
| `E-005` | Verification UNKNOWN | 保持 UNKNOWN，不转 FAILED | L2 | P0 |
| `E-006` | durable confirmation | 只确认，不创建第二份 Result | L2 | P0 |
| `E-007` | bounded history query | `limit` 必须生效 | L1/L2 | P1 |
| `E-008` | similar query | 只读取当前 execution 之前、同 scope 的 history | L1/L2 | P1 |
| `E-009` | retry / escalation chain | 按因果顺序返回，且彼此独立 | L1 | P1 |
| `E-010` | `getExecutionContext` | 只返回 fact context，不产生 risk/recommendation | L2 | P1 |

## 审查后移动

原：

```text
多个 FailureObserved → 一个 Primary Failure
```

移到：

```text
Area D
```

理由：

> Primary Failure 是 Failure Analyzer contract，不属于 Projection fold。

---

# 11. Area F — Recovery / Degraded

## 目标

证明缺失、重复、冲突、HMR、restart 时不 silent repair。

## F1 — Missing / Duplicate / Conflict

| ID | Scenario | Expected | Level | Priority |
|---|---|---|---|---|
| `F-001` | result without start | 从完整 exec 确定性恢复；标 recovered provenance | L4 | P0 |
| `F-002` | start without result | 保持 last-known lifecycle + DEGRADED；禁止 auto-fail | L4 | P0 |
| `F-003` | duplicate identical event | idempotent no-op | L4 | P1 |
| `F-004` | conflicting terminal outcomes | DEGRADED；保留双方 evidence；禁止 overwrite | L4 | P0 |
| `F-005` | orphan Approval | UNBOUND / buffer；禁止 fake Execution | L4 | P0 |
| `F-006` | matching Live + Durable result | confirmation only | L4 | P1 |
| `F-007` | Live / Durable conflict | explicit conflict + DEGRADED | L4 | P0 |

## F2 — Lifecycle / Recovery

| ID | Scenario | Expected | Level | Priority |
|---|---|---|---|---|
| `F-008` | HMR idle | observable behavior 无 duplication | L4 | P1 |
| `F-009` | HMR during active execution | lost correlation → DEGRADED，不猜 | L4 | P0 |
| `F-010` | full restart | 重建 minimum viable ledger；不能恢复的事实保留 unknown | L4 | P1 |
| `F-011` | recovery repeated | idempotent | L4 | P1 |
| `F-012` | durable out-of-order | 按 source seq reconcile | L4 | P1 |
| `F-013` | replay + live race | 不制造 duplicate Execution | L4 | P0 |
| `F-014` | stale pending approval | 不自动 cancelled；显式 stale/degraded | L4 | P1 |
| `F-015` | unresolved parent | 不默认 root=self | L4 | P0 |

## 审查后 P0 降级

以下从 P0 调整为 P1：

```text
duplicate identical event
full restart 能否完整重建 minimum ledger
recovery idempotency
durable out-of-order
```

理由：

> 它们是重要 correctness，但只要系统在失败时进入 degraded、且不编造事实，不必全部作为直接 Release Blocker。

对应的真正 P0 是：

```text
不能 silent overwrite
不能 fake correlation
不能 invent missing facts
```

---

# 12. Area G — Context Builder / Deterministic Features

## 目标

证明进入 Risk Engine 的是 bounded、evidence-backed facts。

| ID | Scenario | Expected | Level | Priority |
|---|---|---|---|---|
| `G-001` | workspace read | read-only / workspace scope 正确 | L1/L2 | P1 |
| `G-002` | outside-workspace write | outsideWorkspace + mutation 正确 | L1/L2 | P1 |
| `G-003` | recursive delete | destructive + recursive + scope 正确 | L1 | P1 |
| `G-004` | credential access + network egress | 两类事实独立存在 | L1 | P1 |
| `G-005` | prior sandbox denial + escalation | history features 正确 | L2 | P1 |
| `G-006` | Agent justification，无用户 grant | justification 不提升 Authorization | L1 | P0 |
| `G-007` | 没找到 safer alternative | 只能 `no known safer alternative` | L1 | P0 |
| `G-008` | rollback 未知 | 保持 unknown，不默认 yes/no | L1 | P0 |
| `G-009` | DEGRADED Ledger | evidence features 反映不完整 | L2 | P1 |
| `G-010` | 长 Session | Context Builder 仍 bounded | L2/benchmark | P1 |
| `G-011` | oversized args | bounded/truncated；不进行无界解析 | L2 | P1 |
| `G-012` | feature provenance | feature 可追溯 basis | L1 | P1 |

## 审查后 P0 调整

原：

```text
outside-workspace
recursive delete
credential+network
```

均为 P0。

本轮降为 P1。

理由：

> Feature extractor 本身是核心正确性；真正 Release Blocking 的是其错误最终导致授权/风险 policy 违反。最终安全边界由 H/I/J 的 P0 测试覆盖。

---

# 13. Area H — Six Dimension Evaluators

## 目标

只覆盖每个 evaluator 的语义边界，不与 Aggregator 做重复组合测试。

## H1 RiskEvaluator — P1 参数化

```text
read-only + workspace + known scope
→ LOW candidate

destructive + outside workspace + recursive + weak recovery
→ HIGH candidate

critical destructive/system/credential exposure rule
→ CRITICAL candidate

semantics/target 不足
→ UNKNOWN
```

Priority：

```text
P1
```

---

## H2 AuthorizationEvaluator

```text
explicit matching grant
→ EXPLICITLY_AUTHORIZED        P1

explicit denial
→ EXPLICITLY_DENIED            P0

confirmed scope mismatch
→ NOT_AUTHORIZED               P0

insufficient authorization evidence
→ UNKNOWN                      P1

agent justification only
→ 不提升 authorization          P0
```

---

## H3 NecessityEvaluator — P1 参数化

```text
唯一已证明技术路径
→ NECESSARY

narrower attempt failed，但唯一性未证明
→ LIKELY_NECESSARY

已完成目标但继续 destructive repeat
→ NOT_NECESSARY

goal unknown
→ UNKNOWN
```

---

## H4 PrivilegeEvaluator

```text
requested == minimum
→ MINIMAL                       P1

requested proportional
→ PROPORTIONATE                 P1

requested unrestricted + minimum workspace
→ EXCESSIVE                     P1

minimum unknown
→ UNKNOWN，不能凭高 privilege 自动 EXCESSIVE   P0
```

---

## H5 AlternativesEvaluator

```text
registered safe recipe
→ SAFER_ALTERNATIVE_AVAILABLE        P1

historical lower-risk success
→ SAFER_ALTERNATIVE_AVAILABLE        P1

nothing deterministic found
→ NO_KNOWN_SAFER_ALTERNATIVE         P0

LLM candidate only
→ 不能升级为 VERIFIED alternative      P0
```

---

## H6 EvidenceQualityEvaluator

```text
complete enough facts
→ HIGH

partial gaps
→ MEDIUM

critical data gaps
→ LOW

Judge output tries to influence EvidenceQuality
→ ignored / forbidden
```

Priority：

```text
前 3 项 P1
Judge 禁止影响 EvidenceQuality = P0
```

---

# 14. Area I — AssessmentAggregator Policy Matrix

## 目标

Aggregator 是 pure deterministic policy engine，因此采用单一参数化 suite。

## I1 — Release-Blocking Policy Cases

| ID | Input | Expected | Priority |
|---|---|---|---|
| `I-P0-01` | LOW Risk + EXPLICITLY_DENIED | `hazard=LOW`, `REJECT_RECOMMENDED` | P0 |
| `I-P1-01` | LOW Risk + NOT_AUTHORIZED | `REJECT_RECOMMENDED` | P0 |
| `I-P2-01` | Risk UNKNOWN | `NEED_MORE_INFORMATION` | P0 |
| `I-P2-02` | HIGH + Authorization UNKNOWN | `NEED_MORE_INFORMATION` | P0 |
| `I-P2-03` | CRITICAL + Privilege UNKNOWN | `NEED_MORE_INFORMATION` | P0 |
| `I-P9-01` | no reliable rule | `NEED_MORE_INFORMATION` | P0 |

## I2 — Core Policy Correctness

| ID | Input | Expected | Priority |
|---|---|---|---|
| `I-P3-01` | verified safer alternative + meaningful hazard | `PREFER_SAFER_ALTERNATIVE` | P1 |
| `I-P4-01` | excessive + not necessary | `REJECT_RECOMMENDED` | P1 |
| `I-P4-02` | excessive + necessity unknown | `NEED_MORE_INFORMATION` | P1 |
| `I-P4-03` | excessive + necessary | `PREFER_SAFER_ALTERNATIVE` | P1 |
| `I-P5-01` | critical + strong justification | `APPROVE_WITH_CAUTION` | P1 |
| `I-P5-02` | critical + not necessary | `REJECT_RECOMMENDED` | P1 |
| `I-P6-01` | high + justified | `APPROVE_WITH_CAUTION` | P1 |
| `I-P6-02` | high + partial authorization | `NEED_MORE_INFORMATION` | P1 |
| `I-P7-01` | medium + no blocker | `APPROVE_WITH_CAUTION` | P1 |
| `I-P8-01` | low + no blocker | `APPROVE` | P1 |

## I3 — Cross-Dimension Safety Invariants

```text
I-X-01
Authorization does not reduce Hazard.          P0

I-X-02
Evidence Quality does not mechanically change Hazard.   P0

I-X-03
Necessity does not override EXCESSIVE privilege.         P0

I-X-04
Explicit denial outranks safer-alternative deflection.   P0

I-X-05
Terminal recommendation does not suppress other policy flags.  P1
```

## 审查后 P0 调整

原先 P3–P8 基本全部为 P0。

本轮只保留真正 safety gates 为 P0：

```text
explicit denial
not authorized
critical unknown
hazard orthogonality
necessity cannot wash excessive privilege
unknown fallback
```

普通 policy routing 归 P1。

---

# 15. Area J — Approval UX / Latency

## 目标

证明 Risk Advisor 不成为 Native Approval 的可用性单点故障，且 UI 不出现错误上下文。

## J1 — Approval / Assessment Lifecycle

| ID | Scenario | Expected | Level | Priority |
|---|---|---|---|---|
| `J-001` | Assessment 已 ready | 正确 assessment 与正确 Approval 同屏 | L5 | P0 |
| `J-002` | Approval 先 ready、Assessment pending | 可显示 analyzing；Native Approval 仍可用 | L5 | P0 |
| `J-003` | A1 → A2 supersedes，Approval仍 pending | UI 可更新到 A2 | L5 | P1 |
| `J-004` | Approval resolved 后 A2 才到 | 不复活 UI，不改写当时 presentedAssessmentId | L5 | P0 |
| `J-005` | Presenter crash / disabled | Native Approval fallback | L5 | P0 |
| `J-006` | correlation UNBOUND / AMBIGUOUS | 明示 degraded，不显示错误 candidate 风险 | L5 | P0 |
| `J-007` | 两个 Approval 快速出现 | assessment 不串 approval identity | L5 | P0 |
| `J-008` | session switch | 不显示上一 Session assessment | L5 | P0 |
| `J-009` | HMR during pending Approval | 无 duplicate panel / double-answer；fallback 可恢复 | L4/L5 | P0 |
| `J-010` | 双击 Allow | 至多一次 native answer effect | L5 | P0 |

## J2 — Bounded Advisory / Judge

| ID | Scenario | Expected | Level | Priority |
|---|---|---|---|---|
| `J-011` | Judge timeout/provider failure | deterministic assessment 保留；Native Approval 不阻塞 | L3/L5 | P0 |
| `J-012` | Judge saturation | deterministic path 不等待 Judge capacity | Benchmark | P0 |
| `J-013` | oversized args | bounded parsing，不造成无界 Approval delay | Benchmark | P0 |
| `J-014` | Risk Advisor overall timeout | 达到 validated T_sync 后 delegate `next()` | L3/L5 | P0 |
| `J-015` | long Session | P95/P99 在 Spike 7 最终 budget 内 | Benchmark | P1 |

## J3 — Presentation

```text
hazard / recommendation / findings emphasis
finding ordering
secondary details
```

归：

```text
P2
```

不再将 Attention Level 的纯视觉映射设为 P1/P0。

---

# 16. Cross-Area E2E 反过度审查

原计划有 6 个 Cross-Area Scenario：

```text
Normal Approval
Sandbox Escalation
Explicit User Denial
Correlation Failure
Restart Recovery
Judge Failure
```

审查后缩减为 4 个。

## X-001 — Normal Approval

```text
Execution
→ exact correlation
→ deterministic assessment
→ Native Approval
→ result
→ durable confirmation
```

目标：

> 验证基本 happy path 的真实 wiring。

---

## X-002 — Sandbox Escalation

```text
E1 sandbox denial
↓
E2 wider privilege
↓
Approval
↓
Risk Context sees prior denial / escalation
↓
Assessment
↓
Native decision
```

目标：

> 验证最重要的真实风险场景。

---

## X-003 — Correlation Failure

```text
Approval
+
AMBIGUOUS / UNBOUND execution
```

必须：

```text
DEGRADED
NEED_MORE_INFORMATION
Native Approval continues
```

目标：

> 验证“宁可不知道，不要错关联”。

---

## X-004 — Advisory Failure / Judge Failure

```text
fast deterministic assessment
+
Judge timeout / Risk Advisor failure
```

必须：

```text
Native Approval remains available
late result never revives resolved Approval
```

---

## 删除的 E2E

### Explicit User Denial

不单独保留完整 E2E。

理由：

```text
AuthorizationEvaluator + Aggregator
已经在 L1 以 P0 完整证明。
```

可以在任一已有 E2E fixture 中顺带 smoke，但不额外建立独立复杂 E2E。

### Restart Recovery

保留在：

```text
L4 Recovery / Fault Injection
```

不强制 L5 UI E2E。

理由：

> Recovery 的 Contract 更适合在 L4 精确验证；把 restart + UI + Approval 全绑在一个 E2E 会变脆且诊断困难。

---

# 17. 参数化合并计划

正式实现时建议：

## Suite A — Execution Lifecycle

```text
normal success
runtime error
pre-dispatch end
```

一个 table-driven lifecycle suite。

---

## Suite B — Approval Correlation

```text
FOUND
NOT_FOUND
AMBIGUOUS
MISSING_CALL_ID
MISSING_SCOPE_IDENTITY
CALL_ID_REUSE
```

一个参数化 suite。

---

## Suite C — Structural vs Semantic Relations

```text
nested
retry
escalation
```

共同断言：

```text
semantic relation never mutates structural parent tree
```

---

## Suite D — Failure Classification

输入：

```text
structured evidence set
```

输出：

```text
primary category
strength
supporting evidence
```

统一参数化。

---

## Suite F — Recovery Fault Injection

```text
missing
duplicate
conflict
out-of-order
replay race
```

统一 fault fixture。

---

## Suite H — Dimension Evaluators

每个 evaluator 一个 table-driven suite。

禁止一个 case 一个 test file。

---

## Suite I — Aggregator Policy

全部 P0–P9：

```text
AggregatorInput
→ AggregateAssessment
```

统一 parameterized pure-function suite。

---

# 18. Critical Spike → Regression Mapping

Spike 执行完后必须建立下列映射。

| Spike | 最终至少留下的 Regression |
|---|---|
| S1 Approval Middleware Ordering | Native Approval 前 advisory ordering + failure fallback |
| S2 Approval UI Seam | 最终选定 seam 的 lifecycle / fallback / no duplicate regression |
| S3 ActiveExecutionIndex | B Area correlation parameterized suite |
| S4 Durable Tree | C-006/C-007 reconstruction regression |
| S5 Guard Detection | D-009 + negative controls |
| S6 Ledger Recovery | F Area fault-injection regression |
| S7 Latency | J-012~J-015 benchmark / bounded advisory regression |

如果 Spike 为：

```text
PARTIAL_PASS
```

Regression 必须覆盖：

```text
degraded / ambiguous / unresolved
```

语义，而不是只覆盖 happy path。

---

# 19. Spike Conditional Assertions

以下内容在 Spike 结果出来前不写死：

```text
Approval UI 最终是 additive / takeover / sidecar

Active live key 是：
(sessionId, callId)
还是
(scopeIdentity, callId)

guard denial strength 是：
AUTHORITATIVE
DETERMINISTIC
还是
pre_dispatch_block / INFERRED

durable tree relation 是否需要：
CONFIRMED / RECOVERED / AMBIGUOUS / UNRESOLVED

Ledger Health 是否最终采用：
HEALTHY / DEGRADED / RECOVERED
还是
consistency + provenance 二轴模型

T_sync
T_deterministic
T_judge
maxConcurrentJudges
```

Test Matrix 只要求：

> Spike 完成后这些位置必须被具体化。

---

# 20. Benchmark Contract

Benchmark 不要求普通 unit suite 每次执行。

建议分层：

```text
PR / Task focused tests
→ 不跑完整 latency benchmark

Critical integration checkpoint
→ 跑 bounded benchmark subset

Phase Acceptance / Release
→ 跑完整 Spike 7 benchmark
```

指标至少：

```text
Native approval baseline

Added approval latency:
P50
P95
P99
MAX

Time To First Assessment

Time To Final Assessment

Context Builder latency

Deterministic path latency

Judge queue / execution latency
```

阈值：

```text
由 Spike 7 实测后写入 AdvisoryLatencyPolicy
```

不得提前猜。

---

# 21. P0 Test Set 最终收敛

P0 不再等同于“重要”。

最终 P0 主要集中在五类：

```text
A. Approval Authority / Availability
B. Exact Correlation
C. Authorization / Critical Unknown policy
D. No Silent Corruption / No Invented Recovery
E. Late / Async Race Safety
```

代表性 P0：

```text
Risk Advisor never returns ApprovalOutcome

Native Approval remains available on RA failure

AMBIGUOUS correlation never guesses

Explicit Denial → REJECT_RECOMMENDED

Critical Unknown never → APPROVE

Authorization never lowers Hazard

terminal conflict never last-writer-wins

recovery never invents facts

resolved Approval never revived

Judge failure never blocks Native Approval
```

其它正确性尽量归：

```text
P1
```

---

# 22. P2 收敛

以下默认不进入核心 release blocker：

```text
Finding 顺序
secondary detail formatting
非关键 metadata
Attention Level 纯视觉层映射
history 展示样式
```

除非它们导致：

```text
错误 Approval identity
错误 Hazard / Recommendation
隐藏关键 explicit denial / critical finding
```

才升级 P0/P1。

---

# 23. 测试文件组织建议

V1 不按每行 Matrix 创建文件。

建议概念组织：

```text
tests/
├── unit/
│   ├── failure_classifier
│   ├── feature_extractors
│   ├── dimension_evaluators
│   ├── aggregator
│   └── relations
│
├── component/
│   ├── internal_events
│   ├── projectors
│   ├── ledger_queries
│   └── context_builder
│
├── integration/
│   ├── tool_pipeline
│   ├── approval_correlation
│   ├── approval_ui
│   └── nested_execution
│
├── fault/
│   ├── ledger_recovery
│   └── hmr_restart
│
└── e2e/
    ├── normal_approval
    ├── sandbox_escalation
    ├── correlation_degraded
    └── advisory_failure_fallback
```

这是逻辑组织建议，不锁死实现仓库实际目录。

---

# 24. Test Case Contract

正式测试描述最少包含：

```ts
interface RiskAdvisorTestCase {
  id: string
  area: TestArea

  scenario: string
  purpose: string

  preconditions: string[]

  expected: {
    events?: ExpectedEvent[]
    projection?: ExpectedProjection
    correlation?: ExpectedCorrelation
    failure?: ExpectedFailure
    dimensions?: ExpectedDimensions
    assessment?: ExpectedAssessment
    harnessBehavior?: ExpectedHarnessBehavior
  }

  invariants: string[]

  level:
    | 'L1'
    | 'L2'
    | 'L3'
    | 'L4'
    | 'L5'

  priority:
    | 'P0'
    | 'P1'
    | 'P2'

  source:
    | 'V1_CONTRACT'
    | 'INTEGRATION_MAP'
    | 'LEDGER_CONTRACT'
    | 'RISK_ENGINE_CONTRACT'
    | 'CRITICAL_SPIKE'
}
```

不要求每个测试 fixture 都真的序列化成该接口。

它是：

> 测试设计 Contract。

---

# 25. 5B Exit Criteria

5B 完成后，V1 实现验收必须满足：

```text
1. 所有 P0 tests PASS。

2. 所有 Critical Spike 的最终 PASS/PARTIAL Contract
   都有 regression test。

3. 不存在：
   Wrong Approval Correlation
   Silent Recovery Guess
   Last-Writer-Wins Terminal Conflict
   Judge overriding deterministic facts
   Risk Advisor blocking Native Approval

4. P1 核心正确性达到阶段验收要求。

5. L5 E2E 仅验证真实 wiring，
   不代替 L1/L2 contract tests。

6. Spike 7 最终 latency budget
   有稳定 benchmark acceptance。

7. 每个 P0 requirement
   可追溯到：
   Contract / Integration Map / Ledger /
   Risk Engine / Critical Spike。
```

---

# 26. 5B 反过度测试最终结论

审查后，V1 测试策略正式冻结为：

```text
Contract-first
↓
Lowest-effective-layer
↓
Parameterized boundaries
↓
Fault injection for uncertainty
↓
Minimal high-value E2E
```

明确禁止：

```text
六维笛卡尔积
每条 Matrix 一个 E2E
同一 invariant 在 L1/L2/L3/L5 重复完整验证
测试 private implementation container
为了 coverage 数字增加无语义案例
把所有“重要功能”都标成 P0
```

正式原则：

> **测试数量不是质量目标；能最小充分地证明 Risk Advisor 不会错关联、错授权、虚假安全、silent corruption 或阻断 Harness Approval，才是 V1 测试目标。**

---

# 27. 第五项状态

```text
5A — Critical Spikes Design
= COMPLETE

5B — Test Matrix Design
= COMPLETE

5B Anti-Overtesting Review
= COMPLETE
```

但：

```text
Critical Spikes Execution
```

尚未实际执行。

因此第五项当前含义是：

> **实现前验证计划和验收体系已经完成，下一步应先执行 Critical Spikes，再根据真实结果回填 Conditional Contracts，随后进入正式 V1 Implementation Plan。**
