# Risk Advisor — Critical Spikes Static Verification Preflight V1.0

> 状态：源码静态核验结果  
> 上游仓库：`deepseek-ai/deepseek-harness`  
> 核验基线：`ddefc45fbc7f8e46dd73185e68295696d1297887`  
> 上游版本：`dsh 0.1.6-alpha.2`  
> 基线日期：2026-09-17  
> 目的：优先通过当前 Harness 源码证明 Critical Spikes 中可静态证明的事实，仅保留源码无法证明的最小运行时验证。

---

# 1. 结论摘要

七个 Critical Spike 不再全部需要 exploratory runtime spike。

| Spike | 静态核验结论 | 后续处理 |
|---|---|---|
| S1 Approval Middleware Ordering | 原“必须稳定位于 Native answerer 前”假设不应作为核心依赖 | 改用 `approval/asked` durable event 作为稳定 pre-answerer advisory trigger；S1 exploratory spike 可退休 |
| S2 Approval UI Seam | 已存在 public additive seam：`conversation.approval.detail` | 冻结 ADDITIVE；仅保留一个 UI lifecycle smoke |
| S3 ActiveExecutionIndex / Correlation | Session scope 可从 `req.agent.session` 获取；`callId` 不应视为唯一 | 冻结 collision-aware active multimap；保留并发/collision/HMR integration tests |
| S4 Nested / Durable Tree | 当前 durable 事件为 `tool/ptc-dispatch-start` / `tool/ptc-dispatch`；结构字段足够建立 tree edge | 更新旧 `code-dispatch` 设计；保留正常 replay + ambiguity regression |
| S5 Guard Denial Detection | 源码足以封闭推导；Guard returned denial 可确定性识别 | 冻结 `guardrail_denial = DETERMINISTIC`；exploratory spike 可退休 |
| S6 Ledger HMR / Recovery | Cordis effect-owned listener cleanup 是框架语义；Risk Advisor 自身 runtime state recovery 仍需测试 | 改为 Ledger fault-injection/regression，不再探索 Harness listener lifecycle |
| S7 Assessment Latency | 性能预算无法静态证明 | 仍需真实 benchmark；这是主要保留的 runtime spike |

结论：

```text
Static Preflight
→ 先修订当前架构 Contract
→ 只保留最小 integration/fault tests
→ 仅 S7 保留完整 benchmark spike
```

---

# 2. S1 — Approval Middleware Ordering

## 核验源码

- `packages/interaction/user-approval/src/index.ts`
- `packages/interaction/user-approval/src/types.ts`
- `packages/api/remotes/src/remote-events.ts`
- `vendor/cordis/src/events.ts`

## 已证明事实

`ApprovalService.request(req)` 的顺序是：

```text
session.append('approval/asked')
↓
decide(req, session)
↓
approval/request waterfall
↓
session.append('approval/decided')
```

`approval/request` 是 Cordis waterfall。Listener 可以：

```text
return ApprovalOutcome
```

claim request，或：

```text
await next()
```

delegate 给后续 answerer。

Cordis 同时支持 `prepend` listener，因此一个普通 listener 的相对顺序不是一个应被 Risk Advisor 当成“组合无关强保证”的架构基础。

另一个关键事实：

```text
approval/policy = never
```

会在进入 `approval/request` waterfall 前直接返回 `rejected`，但 `approval/asked` / `approval/decided` durable pair 仍然存在。

## 架构结论

原设计：

```text
approval/request
→ Risk Advisor middleware
→ next()
→ Native Approval
```

不应作为 Risk Advisor 核心 trigger 的唯一保证。

更稳的入口：

```text
approval/asked
        ↓
Risk Advisor starts / publishes assessment
        ↓
Native approval answerer independently owns decision
```

`approval/request` middleware 可以存在于辅助路径，但 Risk Advisor 不再依赖它“必须先于所有 answerer”。

## Verdict

```text
CODE_VERIFIED_WITH_ARCHITECTURE_CHANGE
```

S1 exploratory runtime spike 可退休。

---

# 3. S2 — Approval UI Seam

## 核验源码

- `packages/client/ui-approval/src/client/index.ts`
- `packages/client/ui-approval/src/client/contract/slots.ts`
- `packages/client/ui-approval/src/client/ApprovalPanel.tsx`

## 已证明事实

当前 `ui-approval` 注册：

```text
conversation.composer
```

并在 Approval composer 下公开子 slot：

```text
conversation.approval.detail
```

其 contract：

```ts
interface ApprovalDetailOwnerProps {
  callId: ToolCallId
}
```

`ApprovalPanel` 实际调用：

```ts
props.renderSlot(
  'conversation.approval.detail',
  { callId: approval.callId }
)
```

Native `ApprovalPanel` 自己继续拥有：

```text
Reject
Allow once
PendingApproval.answer()
```

Risk Advisor 可以只向：

```text
conversation.approval.detail
```

注册 additive detail renderer。

## 架构结论

旧的三选一：

```text
ADDITIVE
vs
COMPOSER_TAKEOVER
vs
SIDECAR
```

已经不需要探索。

正式选择：

```text
APPROVAL_UI_SEAM = ADDITIVE
```

Risk Advisor 不替换 `conversation.composer`，不拥有按钮，不调用 `PendingApproval.answer()`。

## Verdict

```text
CODE_VERIFIED
```

只保留一个 UI smoke/lifecycle regression。

---

# 4. S3 — ActiveExecutionIndex / Approval Correlation

## 核验源码

- `packages/interaction/user-approval/src/types.ts`
- `packages/interaction/user-approval/src/index.ts`
- `packages/core/tools/src/index.ts`
- Tool/Agent Loop call-id propagation code

## 已证明事实

Host-side `ApprovalRequestEvent` 包含：

```text
agent
toolName
callId?
reason?
signal?
```

因此 Approval correlation 不需要猜 Session：

```text
req.agent.session
```

就是当前 Session ownership。

Tool runtime 的 live execution 同样携带：

```text
agent
callId
rootCallId
```

因此共同 live correlation basis 可以建立在：

```text
Session identity + callId
```

上。

但源码没有建立“一个 Session 中 callId 永久唯一”的 invariant。模型/provider 的 `callId` 被直接沿 pipeline 保留，因此不能作为 Risk Advisor `ExecutionId`。

## 架构结论

不能使用：

```text
Map<(sessionId, callId), ExecutionId>
```

并 silent overwrite。

应冻结：

```text
(sessionIdentity, callId)
→ Set<ExecutionId>
```

lookup：

```text
FOUND
NOT_FOUND
AMBIGUOUS
```

并保持：

```text
historical same-callId fallback = forbidden
```

另外，Client `PendingApproval` 不暴露 Host `ApprovalRequestId`；UI addon 应利用 session-scoped slot + `callId` 查找当前 assessment，而不是假设存在 browser `approvalId`。

## Verdict

```text
PARTIALLY_CODE_VERIFIED
```

保留 focused runtime tests：

```text
concurrent active calls
callId collision
callId reuse
HMR/runtime-state loss
```

它们是 integration regression，不再是 schema discovery spike。

---

# 5. S4 — Nested Execution / Durable Tree Reconstruction

## 核验源码

- `packages/core/tools/src/types.ts`
- `packages/core/tools/src/ptc.ts`
- `packages/core/session/src/known-event-types.ts`

## 重大版本变化

旧设计使用：

```text
tool/code-dispatch-start
tool/code-dispatch
<parent>:code:<n>
```

当前源码已经是：

```text
tool/ptc-dispatch-start
tool/ptc-dispatch
<parent>:ptc:<n>
```

架构文件必须更新。

## 当前 durable payload

`tool/ptc-dispatch-start` 包含：

```text
rootCallId
parentCallId
subCallId
name
arguments
```

`tool/ptc-dispatch` 在此基础上增加：

```text
isError
content
error? { name, code, reason? }
```

Nested dispatch live input：

```text
callId = subCallId
rootCallId = parent.rootCallId
parent = parent.exec.token
agent = parent.agent
```

因此 live tree 和 durable tree 的结构关系是明确存在的。

## 限制

Durable PTC event 本身不携带一个额外的全局 Execution occurrence ID；若上游 call IDs 发生重复，历史重建仍可能产生 ambiguity。

因此不应该把：

```text
parentExecutionId?
```

中的“没有 parent”与“无法证明 parent”混在一起。

## 架构结论

建议正式引入 edge resolution：

```text
CONFIRMED
RECOVERED
AMBIGUOUS
UNRESOLVED
```

至少在 recovery projection 层表达。

## Verdict

```text
PARTIALLY_CODE_VERIFIED
```

保留两类 focused regression：

```text
normal durable replay
ambiguous occurrence recovery
```

不再需要探索 durable event schema。

---

# 6. S5 — Guard Denial Detection

## 核验源码

- `packages/core/tools/src/index.ts`

## 当前 PreToolDecision

当前源码已经是：

```ts
type PreToolDecision =
  | { kind: 'allow' }
  | { kind: 'deny'; reason: string; info?: ToolErrorInfo }
  | { kind: 'cancel' }
  | { kind: 'ask'; reason?: string }
```

旧 Risk Advisor contract 需要补入：

```text
cancel
deny.info
```

## 实际 pipeline

`prepareExecution()`：

```text
tools/pre-execute
↓
ask → ApprovalService（如需要）
↓
cancel handling
↓
if decision == allow:
    denialReason = guardReason(exec)
else:
    denialReason = decision.reason
↓
if denialReason:
    produce post-result error
↓
otherwise dispatch
```

关键差异：

### pre-execute deny

可以携带：

```text
decision.info
```

最终进入 structured error info。

### guard returned denial

`guard()` 只返回 reason string。

因此最终 error 本身没有 authoritative guard identity。

但 pipeline 是封闭的：

```text
pre final decision = allow
+
tools/execute absent
+
tools/post-execute observed
+
error result
+
no cancellation/approval denial
```

唯一落点就是：

```text
guard returned denial
```

因此它不是 AUTHORITATIVE direct fact，但可以由源码 invariant 唯一推导。

### guard throws

Guard exception 落入 `catch`：

```text
final-result
```

并绕过 `tools/post-execute`。

所以与 returned denial 可以区分。

## 架构结论

冻结：

```text
guardrail_denial
strength = DETERMINISTIC
```

但必须由 control trace 支撑。

Control trace 应包含：

```text
pre decision
approval outcome
dispatch observed
post-execute observed
result observed
cancellation evidence
```

不能仅凭：

```text
pre seen + execute absent + result error
```

判断 Guard。

## Verdict

```text
CODE_VERIFIED
```

S5 exploratory spike 可退休，仅保留 regression/negative-control tests。

---

# 7. S6 — Ledger Degraded / HMR / Recovery

## 核验范围

- Cordis event/effect lifecycle
- Harness plugin HMR lifecycle
- Session durable event semantics

## 已证明 Harness 行为

使用 Cordis 正式 effect-owned API 注册的 listener/resource 随 fiber/plugin unload 清理。

因此：

```text
old plugin listener should be disposed on HMR
```

是框架应该提供的 lifecycle contract，不需要再作为“未知 Harness 行为”探索。

同时：

```text
session/event
```

属于 durable post-commit observer；observer failure 不会回滚已提交 session append。

## 仍不能由 Harness 源码替 Risk Advisor 证明的部分

Risk Advisor 自己的 runtime-only state：

```text
WeakMap<ToolExecution, ExecutionId>
ActiveExecutionIndex
unfinished AssessmentJob
temporary parent-token map
```

在 reload/restart 后是否正确 degraded/recovered，是 Risk Advisor 自己的实现问题。

## 架构结论

S6 不再叫 Harness exploratory spike。

改成：

```text
Risk Advisor Ledger Fault-Injection / Recovery Regression
```

重点测试：

```text
missing event
duplicate event
conflicting terminal result
orphan approval
runtime index loss
restart replay
replay/live race
```

## Verdict

```text
HARNESS_LIFECYCLE_CODE_VERIFIED
RA_RECOVERY_RUNTIME_TEST_REQUIRED
```

---

# 8. S7 — Assessment Latency / Bounded Advisory Path

## 静态可证明部分

可以从架构约束确保：

```text
Deterministic fast path
= local facts / bounded Ledger query / features / rules / aggregation

Judge/network
= optional slow path
```

但源码无法证明：

```text
T_sync
P50
P95
P99
MAX
maxConcurrentJudges
long-session tail latency
oversized-argument cost
```

## Verdict

```text
RUNTIME_REQUIRED
```

S7 保留为真实 benchmark spike。

---

# 9. Preflight 后的架构修订清单

必须修订当前架构/contract：

```text
1. Approval assessment trigger
   从依赖 approval/request ordering
   改为优先观察 durable approval/asked。

2. Approval UI
   正式冻结 conversation.approval.detail additive slot。

3. Active correlation
   使用 session ownership + callId 的 collision-aware multimap。

4. Client correlation
   不假设 browser 有 Host ApprovalRequestId。

5. Nested durable events
   code-dispatch → ptc-dispatch
   :code: → :ptc:

6. Durable tree recovery
   显式表达 ambiguous / unresolved edge。

7. PreToolDecision
   加入 cancel 与 deny.info。

8. Guard failure
   guardrail_denial = DETERMINISTIC when full control trace uniquely proves it。

9. Control Trace
   增加 post-execute observed marker。

10. HMR
    正式使用 Cordis effect-owned lifecycle；
    不做 process-global listener workaround。
```

---

# 10. 精简后的运行时验证计划

源码 Preflight 后，不再运行 7 个完整 exploratory spikes。

建议收敛为：

```text
R1 — Approval UI Additive Smoke
验证 conversation.approval.detail
与 Native Approval lifecycle 正确组合。

R2 — Live Correlation Integration
并发 / callId collision / reuse / HMR state loss。

R3 — Durable PTC Tree Replay
正常 replay + ambiguity case。

R4 — Ledger Fault Injection
missing / duplicate / conflict / restart / replay race。

R5 — Bounded Advisory Benchmark
真实测 T_sync / P50 / P95 / P99 / Judge timeout/saturation。
```

其中：

```text
S1 exploratory spike = RETIRED
S5 exploratory spike = RETIRED
S2/S3/S4/S6 = reduced focused verification
S7 = retained benchmark
```

---

# 11. Baseline Caveat

本报告核验的是 GitHub upstream：

```text
deepseek-ai/deepseek-harness
ddefc45fbc7f8e46dd73185e68295696d1297887
```

Workbuddy 在本地真正开始实施前，必须先执行：

```powershell
cd D:\Harness\deepseek-harness
git rev-parse HEAD
git status --short
```

若本地 HEAD 与本报告基线不同：

```text
不要直接假定完全等价。
```

应对涉及文件做 local diff / re-verification，尤其是：

```text
user-approval
ui-approval
core/tools
core/session
Cordis event lifecycle
```

---

# 12. Preflight Final Verdict

```text
STATIC_PREFLIGHT = PASS_WITH_ARCHITECTURE_UPDATES
```

结论：

> 当前 Risk Advisor 的总体架构方向成立，但若干早期 Harness 集成假设已经被新源码明确替代。  
> 在正式实现之前，应先更新 Architecture / Spec / Risk Engine Integration Contracts，再执行精简后的 5 组运行时验证；无需再搭建原计划中面向 7 个完整 exploratory spike 的重型 Spike Harness。
