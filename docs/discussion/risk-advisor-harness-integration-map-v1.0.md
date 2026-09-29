# Risk Advisor — Harness Integration Map

> 状态：Risk Advisor V1 Integration Source of Truth  
> 基线仓库：`deepseek-ai/deepseek-harness`  
> 研究基线 commit：`99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`  
> 日期：2026-08-18

---

## 1. 文档目的

本文档定义 Risk Advisor 与 DeepSeek Harness 的正式集成边界，回答以下问题：

- Risk Advisor 从 Harness 哪些 seam 获取事实。
- 如何建立 `ToolCall → Approval → Result → Failure` 的完整 correlation。
- `callId / rootCallId / parent token` 分别承担什么作用。
- nested tool、retry、sandbox escalation 如何映射。
- 哪些 Failure Evidence 是 authoritative，哪些只能 deterministic / inferred。
- Risk Advisor 如何介入 Approval，又不成为第二个 Approver。
- Harness 当前有哪些真实能力缺口。

---

## 2. 总体集成原则

Risk Advisor 是：

> **Advisory / Explainability / Risk Assessment Layer**

不是：

> **Approval Authority / Execution Guard / Auto Approver**

正式边界：

```text
Risk Advisor
→ 分析
→ 解释
→ 给出风险与替代方案
→ 为用户审批提供辅助信息

Harness
→ 继续拥有真正的 Tool Execution
→ 继续拥有 Approval Authority
→ 继续拥有 Allow / Reject
→ 继续拥有 Session / Tool / Runtime Lifecycle
```

核心原则：

```text
Advisor ≠ Authority
```

Risk Advisor 不返回 `allowed-once / rejected / cancelled / unavailable`，不自动执行替代方案，不绕过 Harness 原有权限和审批链。

---

## 3. Harness Tool Execution 主链

```text
Model
 │
 │ tool/call
 ▼
Session Log
 │
 ▼
ToolRuntime.execute()
 │
 ├─ tools/pre-execute
 │      │
 │      └─ allow / deny / ask
 │               │
 │               └─ ask
 │                    ↓
 │              ApprovalService
 │                    │
 │              approval/asked
 │                    │
 │              approval/request
 │                    │
 │              approval/decided
 │
 ├─ monotonic guards
 │
 ├─ tools/execute
 │
 ├─ Tool Body
 │
 ├─ tools/post-execute
 │
 ├─ finalizeContent
 │
 └─ tools/result
         │
         ▼
   final ToolExecutionResult
         │
         ▼
     tool/result
     Session Log
```

核心顺序：

```text
tools/pre-execute
→ guard
→ tools/execute
→ tool body
→ tools/post-execute
→ finalizeContent
→ tools/result
→ durable tool/result
```

`tools/result` 是完整 pipeline 结束后的最终 frozen outcome。

---

## 4. 第一版 Integration Map

| Risk Advisor 内部概念 | Harness seam | Harness 可提供事实 | Risk Advisor 定位 |
|---|---|---|---|
| `ToolCall` | `tools/pre-execute` | callId、rootCallId、name、parsed arguments、agent、parent、signal | 实际 Operation Primary Source |
| `ApprovalRequest` | `approval/request` | agent、toolName、callId、reason、signal | 实时审批边界 |
| `ApprovalAudit` | `session/event` → `approval/asked` / `approval/decided` | approvalId、callId、reason、outcome | Durable Approval Evidence |
| `ToolResult` | `tools/result` | 完整 exec + frozen ToolExecutionResult | Live Outcome Authority |
| `Exception / Explicit Failure` | `tools/result` | isError、error、content、meta | Runtime Failure Primary Source |
| `Durable Tool Result` | `session/event` → `tool/result` | turn、step、message、error、meta | Durable Replay Authority |
| `Nested Relation` | `ToolExecution.parent` + `rootCallId` | live parent edge / tree ownership | Runtime nested correlation |
| `Durable Nested Relation` | `tool/code-dispatch-start` / `tool/code-dispatch` | rootCallId、parentCallId、subCallId | Durable nested reconstruction |
| `Turn Context` | `turn/start` / `step/start` / `step/end` / `turn/end` | Turn / Step lifecycle | Context-only evidence |

---

## 5. Operation Source：为什么是 `tools/pre-execute`

`tool/call` Session Event 记录的是模型最初产生的调用：

```text
callId
name
arguments: raw JSON string
turn
step
```

而 `tools/pre-execute` 拿到：

```text
callId
rootCallId
name
parsed arguments
agent
parent
signal
```

Risk Advisor 关心的是：

> 实际准备进入 Harness Tool Pipeline 的 Operation。

因此冻结：

```text
tools/pre-execute
= Operation Primary Source

tool/call
= Durable Model-Intent Corroboration
```

---

## 6. Outcome Source：为什么是 `tools/result`

`tools/post-execute` 仍属于 waterfall，后续 listener 仍可能 `accept / replace / enrich / block`。

所以在 `tools/post-execute` 看见的结果不一定是 Harness 最终返回结果。

而 `tools/result`：

- 完整 pipeline 已结束；
- 结果已规范化；
- execution 和 result 都已 frozen；
- listener 只能观察，不能再修改最终 outcome。

冻结：

```text
tools/post-execute
→ 可作为中间诊断

tools/result
→ Live Authoritative Tool Outcome
```

---

## 7. Live Plane 与 Durable Plane

### 7.1 Live Execution Plane

```text
tools/pre-execute
approval/request
tools/result
```

用于回答：

```text
现在准备执行什么？
参数是什么？
是否正在等待审批？
最终 Runtime Outcome 是什么？
```

### 7.2 Durable Audit Plane

```text
session/event
```

用于回答：

```text
过去真正 commit 过什么？
Approval 是否真正发生？
最终 outcome 是什么？
ToolCall / ToolResult 是否已进入 Session Log？
```

推荐结构：

```text
             Harness Runtime

       Live Events        Durable Events
           │                   │
 pre-execute/result        session/event
 approval/request               │
           │                   │
           └─────────┬─────────┘
                     ▼
             Execution Recorder
                     │
                     ▼
             Execution Ledger
```

---

## 8. Approval Integration

### 8.1 Risk Advisor 不能成为 Approval Answerer

禁止：

```text
approval/request
        ↓
Risk Advisor LLM
        ↓
allowed-once / rejected
```

正确方式：

```text
approval/request
        │
        ▼
 Risk Advisor Advisory Middleware
        │
        ├─ lookup ToolCall
        ├─ build context
        ├─ run risk assessment
        ├─ cache assessment
        │
        └─ ALWAYS next()
                │
                ▼
       Harness Native Answerer
                │
                ▼
             Human
        Allow / Reject
```

冻结：

```text
Risk Advisor 永远不返回 ApprovalOutcome。
```

---

## 9. Bounded Advisory Middleware

推荐 Host 侧 Approval 流程：

```text
approval/request
        ↓
Risk Advisor
        ↓
开始 Risk Assessment
        ↓
固定时间预算内等待
        ├──────────────┐
        │              │
 assessment OK     timeout / error
        │              │
 cache result      degraded state
        │              │
        └──────┬───────┘
               ↓
             next()
               ↓
       Native Approval
```

必须区分：

```text
Harness Approval
→ fail closed

Risk Advisor
→ fail open to Native Approval
```

这里 `fail open` 仅表示恢复 Harness 原生人工审批，绝不表示自动 Allow。

---

## 10. `callId / rootCallId / parent token`

### 10.1 `callId`

表示一次工具调用在调用协议里的局部 ID。

它可用于：

```text
ToolExecution
↔ ApprovalRequest
↔ ToolResult
```

但：

```text
callId ≠ 全局唯一 Execution ID
```

Harness 自身已明确：adapter 提供的 call id 可能在不同 step 中重复。

### 10.2 `rootCallId`

表示当前 ToolExecution 所属执行树最上层的 model-requested call。

顶层调用：

```text
callId     = C1
rootCallId = C1
```

nested call：

```text
run_code
callId     = C1
rootCallId = C1

bash
callId     = C1:code:1
rootCallId = C1
```

因此：

```text
rootCallId
= Execution Tree Grouping
```

不是 retry / cause / escalation identity。

### 10.3 `parent token`

Harness 为每个 `ToolExecution` 创建一个新的 `ToolExecutionToken`，本质是 opaque Symbol。

nested execution：

```text
child.parent = parent.token
```

作用：

```text
Live Runtime Parent-Child Correlation
```

限制：

```text
不能跨进程
不能进入 JSON
不能写入 durable log
不能持久化
```

所以：

```text
parent token
= live-only identity edge
```

---

## 11. Risk Advisor 自己必须生成 `ExecutionId`

推荐：

```text
ExecutionRecord
├── executionId        ← Risk Advisor 自己生成
├── sessionId
├── callId
├── rootCallId
├── parentExecutionId?
├── operationHash
├── fingerprint
├── approvals[]
├── result
└── relations[]
```

实时维护：

```text
WeakMap<ToolExecution, ExecutionId>
```

同时维护：

```text
ActiveExecutionIndex
(sessionId, callId) → executionId
```

后者只用于 Approval 这种没有直接 ToolExecution 对象的中途事件关联。

---

## 12. Nested Tool Correlation

以 Code Mode 为例：

```text
Execution E1
run_code
callId     = C1
rootCallId = C1
token      = T1
parent     = none

          │
          ▼

Execution E2
bash
callId     = C1:code:1
rootCallId = C1
token      = T2
parent     = T1
```

Code Mode 子调用使用：

```text
subCallId = <parent-call-id>:code:<n>

child.callId     = subCallId
child.rootCallId = parent.rootCallId
child.parent     = parent.token
```

同时 Harness durable log 记录：

```text
tool/code-dispatch-start
├── rootCallId
├── parentCallId
├── subCallId
├── name
└── arguments

tool/code-dispatch
├── rootCallId
├── parentCallId
├── subCallId
├── name
├── arguments
├── isError
└── content
```

因此：

```text
Live Parent Edge
→ parent token

Durable Parent Edge
→ parentCallId / subCallId / rootCallId
```

---

## 13. Approval 与 Nested Tool

Approval 使用当前 Execution 的 `callId`。

如果：

```text
run_code C1
└── bash C1:code:1
```

nested bash 触发审批：

```text
approval.request
callId = C1:code:1
```

因此可建立：

```text
Approval
  │ callId
  ▼
Nested Execution
  │ rootCallId
  ▼
Execution Tree
```

---

## 14. Sandbox Escalation 的真实位置

`approval/request` 不是固定 pipeline stage。

普通 pre-execute ask：

```text
tools/pre-execute
        ↓
ask
        ↓
approval/request
        ↓
guard
        ↓
tools/execute
```

但 Bash Sandbox Escalation：

```text
tools/pre-execute
        ↓
allow
        ↓
guards
        ↓
tools/execute
        ↓
bash.execute()
        ↓
sandbox_permissions present
        ↓
approveEscalation()
        ↓
approval/request
        ↓
human allow
        ↓
shell command executes
        ↓
tools/post-execute
        ↓
tools/result
```

所以：

```text
approval/request
= Interaction Event
```

不是固定的 Pre-Execute Stage。

不过 escalation approval 仍然使用当前 `exec.callId`，因此 correlation 仍然成立。

---

## 15. Sandbox Denial 后重新请求更高权限

第一次：

```text
Execution E1

bash {
  command: "pnpm install"
}
```

结果：sandbox denied。

随后模型重新调用：

```text
Execution E2

bash {
  command: "pnpm install",
  sandbox_permissions: "danger-full-access",
  justification: "..."
}
```

这里：

```text
E1 ≠ E2
```

而且通常：

```text
E1.rootCallId ≠ E2.rootCallId
```

因此 `rootCallId` 不能表示 Retry 或 Escalation Relation。

Risk Advisor 必须自己推导：

```text
E2.retryOf = E1
E2.escalatesFrom = E1
```

---

## 16. Structural Identity 与 Semantic Relation

Harness 原生结构关系：

```text
callId
rootCallId
parent token
```

Risk Advisor 推导语义关系：

```text
retryOf
causedBy
escalatesFrom
```

正式分层：

```text
Harness Structural Identity
──────────────────────────
callId
rootCallId
parent token

Risk Advisor Semantic Relation
──────────────────────────────
retryOf
causedBy
escalatesFrom
```

---

## 17. operationHash 与 fingerprint

### 17.1 operationHash

严格操作身份：

```text
tool + 完整 arguments
```

例如普通 bash 与增加 `sandbox_permissions` 的 bash，其 operationHash 应不同。

### 17.2 operationFingerprint

表示核心操作意图是否相同。

Bash 可重点使用：

```text
command
workdir
```

并忽略：

```text
description
justification
sandbox_permissions
```

结合：

```text
same fingerprint
+
previous sandbox denial
+
new escalation args
```

即可较可靠地推导：

```text
escalatesFrom
```

---

## 18. Retry 的两种不同含义

### 18.1 Agent 重新发起 ToolCall

```text
E1 failed
        ↓
Model observes failure
        ↓
E2 new ToolCall
```

这是新的 `ToolExecution`，Risk Advisor 可建立 `retryOf`。

### 18.2 `tools/execute` 内部 wrapper retry

```text
tools/pre-execute       ← once
        ↓
tools/execute wrapper
        ↓
attempt 1
        ↓
retry
        ↓
attempt 2
        ↓
tools/result            ← once
```

此时 `callId / rootCallId / token` 都没有改变，Risk Advisor generic seam 只能看到一个 ToolExecution。

V1 不推测内部 retry attempt 次数。

若未来需要 attempt-level telemetry，需要具体 retry wrapper 显式暴露事件。

---

# 19. Failure Evidence Map

## 19.1 统一模型

推荐：

```text
FailureEvidence
├── evidenceId
├── executionId
├── source
├── category
├── subtype?
├── strength
├── timestamp
├── code?
├── message?
├── approvalId?
├── sessionSeq?
├── facts
└── derived
```

Evidence Strength：

```text
AUTHORITATIVE
DETERMINISTIC
INFERRED
```

禁止使用 `confidence = 0.83` 一类数值作为安全依据。

---

## 20. Failure Evidence 总体结构

```text
                         Tool Execution
                              │
        ┌─────────────────────┼──────────────────────┐
        │                     │                      │
        ▼                     ▼                      ▼
   Runtime Outcome       Control Outcome       Semantic Outcome
        │                     │                      │
 tools/result          approval/*              Tool-specific
                         guard                  postcondition
        │                     │                      │
        ▼                     ▼                      ▼
 explicit error        rejected / denied       command failed
 timeout               cancelled               sandbox denied
 cancellation          unavailable             semantic failure
 system failure        guardrail block         etc.
        │                     │                      │
        └─────────────────────┼──────────────────────┘
                              ▼
                      FailureEvidence[]
                              │
                              ▼
                       FailureAnalyzer
                              │
                              ▼
                         FailureChain
```

`session/event` 不是第四类 Failure，而是 Durable Evidence Plane。

---

## 21. `tools/result` Failure Mapping

如果：

```text
result.isError === true
```

生成：

```text
category = explicit_failure
strength = AUTHORITATIVE
```

优先保留：

```text
result.error.message
result.error.info.name
result.error.info.code
```

不要优先依赖字符串解析。

---

## 22. Timeout Mapping

Harness timeout-policy 生成结构化：

```text
isError: true

error: {
  message: "...",
  info: {
    name: "ToolTimeoutError",
    code: "TOOL_TIMEOUT"
  }
}
```

因此：

```text
error.info.code == TOOL_TIMEOUT
        ↓
category = timeout
strength = AUTHORITATIVE
```

Durable Session Event 中：

```text
tool/result.error.code == TOOL_TIMEOUT
```

可以恢复同一事实。

禁止以 `message.includes("timeout")` 作为主要判断方法。

---

## 23. Approval Failure Mapping

Approval outcome：

```text
allowed-once
rejected
cancelled
unavailable
```

正式映射：

| Harness outcome | Risk Advisor Evidence |
|---|---|
| `allowed-once` | 不是 Failure |
| `rejected` | `approval_rejected` |
| `cancelled` | `approval_cancelled` |
| `unavailable` | `approval_unavailable` |

`approval_rejected` 表示人明确拒绝；`approval_unavailable` 表示系统没有可用 Approval Channel，二者不能混同。

---

## 24. Approval Evidence 优先于 Generic Tool Error

如果：

```text
approval/decided
outcome = rejected
```

随后：

```text
tools/result
isError = true
```

不要生成两个平级根因。

推荐：

```text
Primary Failure
= approval_rejected

Supporting Evidence
= tools/result isError
```

原则：

```text
Specific Cause
      ↓
Generic Manifestation
```

---

## 25. Guard Denial

Harness 有 `ctx.tools.guard()`，位于：

```text
tools/pre-execute
        ↓
Monotonic Guard
        ↓
tools/execute
```

Guard 返回 reason 即拒绝。

但当前未发现正式公共：

```text
guard/denied
guardId
guardName
```

也没有稳定 guard identity 被写入 `tools/result`。

所以 Risk Advisor 不能伪装成知道“具体哪个 Guard 一定拒绝了操作”。

---

## 26. Guard Denial 的 V1 识别方式

实时记录：

```text
PRE_SEEN
EXECUTE_SEEN
RESULT_SEEN
```

如果：

```text
pre seen
+
execute not seen
+
result isError
+
not approval rejection/cancel/unavailable
+
not explicit abort-before-dispatch
```

可推导：

```text
category = guardrail_denial
strength = INFERRED
```

不是 AUTHORITATIVE。

这是 Harness 当前 Integration Gap。

---

## 27. Semantic Failure

Semantic Failure 与 `isError` 必须独立。

例如 Bash：

```text
exitCode = 1
```

不一定意味着：

```text
tools/result.isError = true
```

Bash canonical result 本身包含：

```text
exitCode
signal
timedOut
aborted
stdout
stderr
sandbox {
  mode
  denied
  enforcement?
  runnerFailed?
}
```

所以：

```text
Process Success
≠
Semantic Success
```

---

## 28. Known Semantic Adapters

推荐：

```text
tools/result
        ↓
Semantic Adapter Registry
        │
        ├── bash
        ├── pwsh
        ├── fs
        ├── git
        └── ...
```

示例：

```text
bash.exitCode != 0
→ semantic_failure
→ DETERMINISTIC

sandbox.denied == true
→ sandbox_denial
→ DETERMINISTIC

known postcondition == false
→ semantic_failure
→ DETERMINISTIC
```

V1 不允许让 LLM 通过自由文本动态生成 checker code。

---

## 29. Sandbox Denial

Sandbox Denial 单独分类：

```text
category = guardrail_denial
subtype = sandbox_denial
strength = DETERMINISTIC
```

典型 Failure Chain：

```text
E1
│
├── sandbox denied
│
└──── escalatesFrom ───► E2
                           │
                           ├── Approval Requested
                           ├── Approval Outcome
                           └── Result
```

---

## 30. Durable Session Evidence

```text
tools/result
= Live Authoritative Execution Result

session/event → tool/result
= Durable Authoritative Replay Evidence
```

不要生成两个 Failure。

正确：

```text
tools/result
→ create FailureEvidence F1

later session tool/result
→ attach durable seq / confirmation to F1
```

错误：

```text
F1 = live failure
F2 = durable failure
```

---

## 31. Turn-Level Evidence

Session `turn/end` reason 包括：

```text
completed
aborted
blocked
error
max-tokens
interrupted
```

这些属于 Turn-level Context Evidence，不是 Tool-level Failure。

因此：

```text
turn/end reason=error
```

不能自动归因给最后一个 ToolCall，尤其是在并行工具场景下。

---

## 32. 最终 Failure Evidence Map

| 原始来源 | 检测 | Normalized Failure | 强度 |
|---|---|---|---|
| `tools/result` | `isError=true` | `explicit_failure` | AUTHORITATIVE |
| `tools/result` | `error.info.code=TOOL_TIMEOUT` | `timeout` | AUTHORITATIVE |
| `approval/decided` | `rejected` | `approval_rejected` | AUTHORITATIVE |
| `approval/decided` | `cancelled` | `approval_cancelled` | AUTHORITATIVE |
| `approval/decided` | `unavailable` | `approval_unavailable` | AUTHORITATIVE |
| Semantic Adapter | Bash `exitCode != 0` | `semantic_failure` | DETERMINISTIC |
| Semantic Adapter | `sandbox.denied=true` | `sandbox_denial` | DETERMINISTIC |
| Semantic Adapter | known postcondition false | `semantic_failure` | DETERMINISTIC |
| Pipeline correlation | pre seen + execute absent + non-abort + non-approval failure | `guardrail_denial` | INFERRED |
| `turn/end` | `reason=error` | `turn_failure` | AUTHORITATIVE / Context-only |
| `turn/end` | `reason=aborted` | `turn_cancelled` | AUTHORITATIVE / Context-only |
| `session/event tool/result` | durable error/code | 对既有 Failure 的持久确认 | AUTHORITATIVE |

---

## 33. Primary Failure 归因原则

同一个 Execution 只保留：

```text
一个 Primary Failure
```

其它作为：

```text
supportingEvidence
```

优先级：

```text
Specific Cause
↓
Generic Manifestation
```

例如：

```text
approval_rejected
↓
pre-dispatch denial
↓
tools/result isError
```

Primary：`approval_rejected`。

另一个例子：

```text
TOOL_TIMEOUT
↓
tools/result isError
```

Primary：`timeout`。

---

## 34. 推荐的 ExecutionRecord

```text
ExecutionRecord
├── executionId
├── sessionId
├── callId
├── rootCallId
├── parentExecutionId?
├── toolName
├── arguments
├── operationHash
├── fingerprint
├── status
│
├── approvals[]
│   ├── approvalId
│   ├── reason
│   └── outcome
│
├── result
│   ├── isError
│   ├── code?
│   ├── message?
│   └── meta?
│
├── evidence[]
│
├── failure?
│   ├── category
│   ├── subtype?
│   ├── strength
│   ├── primaryEvidence
│   └── supportingEvidence[]
│
└── relations[]
    ├── parentOf / childOf
    ├── retryOf
    ├── causedBy
    └── escalatesFrom
```

---

## 35. 当前 Harness Integration Gap

### 35.1 Generic Guard Attribution

当前没有稳定公共：

```text
guard/denied
guardId
guardName
```

所以通用 Guard attribution 只能推导，不能标记为 AUTHORITATIVE。

V1：

```text
strength = INFERRED
```

未来如确有必要，再考虑增加最小 extension seam。

### 35.2 Internal Retry Attempt Telemetry

`tools/execute` wrapper 可以内部 retry，但当前 generic Harness seam 不一定逐 attempt 发布：

```text
attempt/start
attempt/end
retry/reason
```

因此 Risk Advisor V1 不猜内部 attempt 次数，只记录 ToolExecution level。

如果未来需要 attempt-level telemetry，应由对应 retry policy / wrapper 显式暴露。

---

## 36. 正式冻结结论

以下结论可作为 Risk Advisor V1 Integration Contract：

```text
1. tools/pre-execute
   = Operation Primary Source

2. tools/result
   = Live Execution Outcome Authority

3. session/event → tool/result
   = Durable Replay Authority

4. Risk Advisor 自己生成 executionId。
   callId 不是全局唯一 Execution ID。

5. callId
   = 当前 ToolExecution / Approval / Result 的局部 Join Key

6. rootCallId
   = Execution Tree Grouping
   不是 retry / cause / escalation identity

7. parent token
   = live-only nested parent relation
   禁止持久化

8. retryOf / causedBy / escalatesFrom
   = Risk Advisor Semantic Relation
   不是 Harness Structural Identity

9. Risk Advisor 永远不是 Approval Answerer。
   approval/request 分析后必须 next()。

10. Risk Advisor 失败只能降级回 Native Approval，
    绝不能自动批准。

11. Approval failure
    以 approval/decided 为 Primary Evidence。

12. Timeout
    使用结构化 TOOL_TIMEOUT，
    不依赖字符串匹配。

13. Semantic Failure
    与 isError 独立。

14. Known Semantic Adapter
    优先使用 deterministic evidence。

15. Generic Guard attribution
    如果没有直接 Harness 证据，
    必须标记 INFERRED。

16. 同一个 Execution
    只能有一个 Primary Failure，
    其它结果作为 Supporting Evidence。
```

---

## 37. 下一阶段

Harness Integration Map 完成后，下一项进入：

> **Execution Ledger / Internal Event Model**

目标：把 Harness 原始事件转换成 Risk Advisor 自己稳定的数据模型：

```text
Harness Events
        ↓
Adapter / Recorder
        ↓
Risk Advisor Internal Events

ToolCall
ToolResult
ApprovalRequest
ApprovalDecision
Guardrail
Verification
Exception
FailureEvidence
```

后续：

```text
Failure Analyzer
Context Builder
Risk Engine
Presenter
```

只依赖 Risk Advisor 内部模型，不直接耦合 Harness 原始类型。

---

## 38. 主要参考源码

研究基线：

```text
deepseek-ai/deepseek-harness
commit: 99f6f02fecdb7dff40c3fbc9470f5907c29f74ca
```

主要文件：

```text
packages/core/tools/src/index.ts
packages/core/tools/src/invariant.ts
packages/core/tools/src/types.ts
packages/core/tools/src/code-mode.ts

packages/guard/timeout-policy/src/index.ts
packages/sandbox/sandbox/src/escalation.ts
packages/shell/tool-bash/src/index.ts
packages/core/session/src/types.ts
packages/subagent/subagent-in-process-driver/src/structured.ts

packages/interaction/user-approval/...
packages/host/apiproxy/...

docs/tool-execution-pipeline.md
docs/subsystems/tools.md
```

---

## 39. 当前文档状态

```text
Harness Integration Map
= 基本冻结
```

仍需 Critical Spike 验证：

```text
1. approval/request middleware 是否能稳定排在 Web terminal answerer 前
2. HMR / 插件重载时是否保持顺序和清理正确
3. ActiveExecutionIndex 在并发 / nested call 下是否正确
4. parent token → parentExecutionId live correlation 是否稳定
5. Durable code-dispatch 是否能准确重建 nested tree
6. generic guard denial 能检测到什么程度
7. Approval UI 最终采用 takeover 还是找到更小的 additive seam
```

只有这些 Spike 通过后，再进入完整实现。
