# Risk Advisor v1：正式设计原则与功能边界

## 1. 产品定位

Risk Advisor 不是自动审批器，而是：

> **DeepSeek Harness 的 AI 审批辅助决策层。**

当 Agent 请求执行需要用户授权的操作时，Risk Advisor 在用户做决定之前，帮助回答：

- 它准备做什么？
- 为什么要这么做？
- 风险是什么？
- 用户是否真的授权了这件事？
- 这个操作真的有必要吗？
- 申请的权限是否过大？
- 有没有权限更小的替代方案？
- 现有证据够不够支持这个判断？

最终输出：

```text
Risk Assessment
+
Recommendation
+
Safer Alternative
```

**最终审批权仍属于用户。**

---

## 2. V1 核心原则

### 原则一：Advisor，不是 Authority

V1 中：

```text
Risk Advisor
→ 分析
→ 建议
→ 用户决定
```

而不是：

```text
Risk Advisor
→ 自动批准 / 自动拒绝
```

因此 V1 不把 Harness 的：

```text
allowed-once
rejected
```

作为自身最终权限决策。

它只产生：

```text
approve
reject
investigate
```

这种**建议**。

---

### 原则二：Risk ≠ Authorization

必须把：

```text
操作安全吗？
```

和：

```text
用户授权了吗？
```

分开。

例如：

```text
操作：上传日志

Risk:
Low

Authorization:
Low
```

虽然风险不大，但用户没要求上传，所以仍不应该建议批准。

反过来：

```text
用户明确要求：
删除整个数据库

Authorization:
High

Risk:
Critical
```

用户授权并不意味着操作安全。

---

## 3. V1 六维评估模型

Risk Advisor 不使用单一的：

```text
safe / unsafe
```

而是评估六个维度。

### 3.1 Risk

操作本身的潜在危害：

```text
low
medium
high
critical
```

重点关注：

```text
数据丢失
系统修改
凭证
网络外发
不可逆操作
软件安装
权限修改
远程写入
```

---

### 3.2 Authorization

用户是否明确授权这项具体行为：

```text
high
medium
low
unknown
```

可信证据主要来自：

```text
用户原始消息
开发者指令
明确用户选择
```

不能把：

```text
Agent justification
```

当作用户授权证据。

---

### 3.3 Necessity

当前方案是否真的有必要。

例如：

```text
目标：
让程序找到 bash

Agent 方案：
修改 C:\Program Files

Necessity:
Low
```

因为完全可能通过 PATH 解决。

---

### 3.4 Privilege

判断申请权限是否超过完成任务所需的最低权限。

核心问题：

> **这个 Agent 是不是申请了比实际需要更大的权限？**

例如：

```text
Requested:
danger-full-access

Minimum Required:
user-level PATH modification

Privilege:
Excessive
```

这会成为 Risk Advisor 的重要差异化能力：

> **Permission Minimizer**

---

### 3.5 Alternatives

是否存在更安全、更小权限、更可逆的替代方案。

例如：

```text
当前方案：
建立 Program Files junction

Alternative:
修改用户 PATH
```

最终 Risk Advisor 不只是说：

```text
Reject
```

而应该告诉用户：

```text
Reject current approach.
Use PATH instead.
```

---

### 3.6 Evidence Quality

判断当前结论到底有多少可靠证据支持。

例如：

```text
Risk:
Low

Evidence Quality:
Low
```

意味着：

> “目前看起来风险低，但证据不足。”

此时正确行为应该是：

```text
Investigate
```

而不是直接建议批准。

---

## 4. 最终评估模型

V1 标准结果：

```ts
interface RiskAssessment {
  riskLevel:
    | 'low'
    | 'medium'
    | 'high'
    | 'critical'

  authorization:
    | 'high'
    | 'medium'
    | 'low'
    | 'unknown'

  necessity:
    | 'high'
    | 'medium'
    | 'low'
    | 'unknown'

  privilege:
    | 'minimal'
    | 'reasonable'
    | 'excessive'
    | 'unknown'

  evidenceQuality:
    | 'high'
    | 'medium'
    | 'low'

  recommendation:
    | 'approve'
    | 'reject'
    | 'investigate'

  summary: string

  risks: string[]

  affectedResources: string[]

  reversible:
    | true
    | false
    | 'unknown'

  saferAlternative?: string
}
```

V1 不需要：

```text
confidence: 0.93
```

作为安全决策依据。

模型自己的“信心”不能当成安全证明。

---

## 5. V1 工作流程

整体流程：

```text
Harness Agent
      ↓
准备执行 Tool Call
      ↓
tools/pre-execute
      ↓
Operation Snapshot
      ↓
approval/request
      ↓
Risk Advisor
      ↓
Rule Engine
      ↓
Fast Judge
      ↓
证据是否足够？
   ┌──────┴──────┐
   │             │
  Yes            No
   │             │
   │        Evidence Collector
   │             ↓
   │         Deep Judge
   │             │
   └──────┬──────┘
          ↓
   RiskAssessment
          ↓
      Approval UI
          ↓
        用户决定
```

---

## 6. Operation Snapshot

每个审批必须和**真实操作**绑定，而不是只看 Agent 写的理由。

至少绑定：

```text
callId
toolName
arguments
workspace
cwd
requestedPermission
timestamp
```

并建议生成：

```text
operationHash
```

基于规范化后的：

```text
toolName + arguments + permission + target
```

这样防止：

```text
审查 A
↓
实际执行 B
```

---

## 7. Fast Judge

Fast Judge 是 V1 默认路径。

实现：

```text
Rule Engine
+
LLM
```

而不是完整 Agent。

例如：

```text
ctx.llm.stream(...)
```

输入经过：

```text
Context Minimization
↓
Secret Redaction
↓
Trust Separation
↓
Structured Prompt
```

Fast Judge：

```text
没有工具
不能修改环境
不能联网调查
只负责语义分析
```

目标是：

```text
1~几秒完成评估
```

---

## 8. Rule Engine

LLM 之前必须先跑确定性规则。

典型高风险类别：

```text
删除
递归删除
格式化磁盘
系统目录修改
Program Files
Windows
注册表
sudo / admin
danger-full-access
权限修改
凭证读取
Secret
API Key
网络上传
远程写入
Package Install
Lifecycle Script
Git destructive operation
PATH / 环境配置修改
workspace 外写入
```

规则负责：

```text
明显危险 → 标记
```

LLM 负责：

```text
理解语义和上下文
```

不能反过来让 LLM 覆盖硬规则。

---

## 9. Deep Judge

Deep Judge 只在以下情况触发：

```text
Fast Judge 信息不足
+
这项信息可以通过只读调查获得
```

例如：

```text
“cache-temp 是否真的可以删除？”
```

Deep Judge 可以启动：

```text
Harness Subagent
```

但只能给**严格只读能力**。

允许：

```text
read
list directory
stat
git status
git ls-files
读取 package.json
读取 .gitignore
读取配置
```

禁止：

```text
write
edit
delete
任意 shell
软件安装
远程写
网络上传
admin
danger-full-access
```

核心原则：

> **Reviewer 的权限必须小于被审查 Agent 的权限。**

---

## 10. Trust Boundary

Risk Advisor 必须明确区分三类数据。

### Trusted

```text
用户原始消息
开发者规则
Risk Advisor Policy
用户显式选择
```

### Untrusted

```text
Agent justification
Shell command
工具参数
文件内容
Tool output
网页内容
代码注释
```

### Sensitive

```text
API Key
Token
Cookie
Private Key
Password
Authorization Header
环境变量中的 Secret
```

Sensitive 数据处理流程：

```text
优先本地规则处理
↓
Redaction
↓
尽量不发送给 Reviewer LLM
```

---

## 11. 外部 LLM 安全原则

如果配置独立 Reviewer Provider：

```text
Main Agent
→ DeepSeek

Reviewer
→ GPT / Claude / Gemini
```

必须遵守：

```text
最小上下文
Secret Redaction
严格 JSON
无 Tool Calling
超时控制
Prompt Injection 防护
Provider failure fallback
```

Reviewer Provider 挂掉：

```text
Assessment unavailable
```

不能变成：

```text
默认批准
```

---

## 12. TOCTOU

Risk Advisor 必须承认：

```text
Review
↓
User Approve
↓
Execute
```

之间环境可能发生变化。

例如：

```text
文件被替换
目录变 junction
symlink 目标变化
Git 状态变化
```

V1 至少：

```text
记录审查时关键 evidence
```

对于关键资源建议：

```text
执行前重新校验 path / target
```

V1 不承诺解决所有 TOCTOU。

---

## 13. 多步风险

V1 主要审查：

```text
Single Tool Call
```

但架构必须允许以后加入：

```text
Operation Chain
```

因为：

```text
写脚本
+
赋执行权限
+
运行脚本
```

每一步单独看可能正常，组合起来风险却很高。

因此 V1：

> 暂不实现复杂行为链检测，但 Operation Snapshot 数据结构不能阻碍以后增加这一能力。

---

## 14. Approval UI

默认 UI 必须简洁。

首先只展示：

```text
Risk: Medium

建议：
拒绝当前方案

原因：
申请权限明显超过完成任务所需权限。

替代：
修改用户 PATH 即可。
```

用户展开后才显示：

```text
Authorization
Necessity
Privilege
Evidence
Affected Resources
Reversibility
Rule Hits
LLM Assessment
```

避免：

> **Approval Fatigue**

---

## 15. UI 措辞原则

禁止：

```text
✅ 安全
100% 安全
AI 已确认无风险
```

应该使用：

```text
风险评估：低

当前证据中未发现明显高风险因素。
```

因为 Risk Advisor：

> **提供风险判断，而不是安全证明。**

---

## 16. V1 关键功能：使用更安全方案

除了：

```text
[批准]
[拒绝]
```

建议加入：

```text
[使用更安全方案]
```

例如 Risk Advisor 给出：

```text
Current:
创建 Program Files junction

Alternative:
修改用户 PATH
```

用户点击：

```text
使用更安全方案
```

然后把建议反馈给主 Agent：

```text
Do not perform the requested system-level modification.

Use this lower-privilege alternative instead:

Prepend D:\Git\bin to the current user's PATH.
```

这是 Risk Advisor 相比普通安全扫描器很有价值的一点：

> **不仅阻止危险方案，还帮助 Agent 继续完成任务。**

---

## 17. 日志与审计

V1 可以记录：

```text
callId
operationHash
toolName
riskLevel
authorization
necessity
privilege
evidenceQuality
recommendation
ruleHits
provider
model
policyVersion
timestamp
最终用户决定
```

默认不要持久化：

```text
完整命令
完整 Prompt
完整文件内容
Secret
完整 LLM reasoning
```

---

## 18. 插件共存原则

Risk Advisor 不应该抢占 Harness 的最终审批权。

尤其需要兼容：

```text
dsh-smart-approval
dsh-approve-for-me
其他 approval answerer
```

因此 V1 定位：

```text
Observe
↓
Analyze
↓
Present
```

而不是：

```text
成为 terminal approval answerer
```

这样：

```text
Risk Advisor
→ 负责解释

Smart Approval
→ 可以负责自动化

Human
→ 可以负责最终审批
```

三者可以同时存在。

---

## 19. V1 明确不做

为了防止范围失控，V1 **不实现**：

```text
自动批准
自动永久授权
目录永久 allowlist
风险结果永久缓存授权
完整行为链检测
自动执行替代方案
任意 Shell 调查
联网调查
修改 Harness Core
训练自己的安全模型
多个 LLM 投票系统
复杂历史信誉系统
```

这些全部留给后续版本。

---

## 20. V1 最终功能边界

最终可以把 V1 压缩成：

```text
                 Risk Advisor v1

                      │
            捕获审批真实操作
                      │
                Rule Engine
                      │
                 Fast Judge
                      │
            ┌─────────┴─────────┐
            │                   │
         信息充分             信息不足
            │                   │
            │            Read-only Evidence
            │                   │
            │               Deep Judge
            │                   │
            └─────────┬─────────┘
                      │
                RiskAssessment
                      │
       ┌──────────────┼──────────────┐
       │              │              │
      Risk       Authorization   Necessity
       │              │              │
       ├──────── Privilege ──────────┤
       │              │              │
       └──── Alternatives + Evidence ┘
                      │
                 Recommendation
                      │
           ┌──────────┼──────────┐
           │          │          │
         批准        拒绝     使用安全方案
           │          │          │
           └──────── 用户 ───────┘
```

---

## 21. 一句话定义

> **Risk Advisor v1 是一个不替用户授权的 AI Approval Copilot：它通过确定性规则、最小上下文 LLM 审查和必要时的只读证据调查，分析操作风险、用户授权、操作必要性、权限是否过度、替代方案及证据质量，并在 Harness 执行高权限操作前向用户提供可解释的决策建议。**

---

## 22. 文档角色

本文件作为：

> **Risk Advisor v1 的正式产品与功能规范（Source of Truth）**

后续开发、架构设计和 Codex 实现应以本文为准。

原有 `dsh-risk-advisor-design-discussion.md` 保留为设计讨论记录，仅用于理解背景、方案演化和被放弃的设计，不应覆盖本文件中的正式规范。
