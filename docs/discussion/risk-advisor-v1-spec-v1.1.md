# Risk Advisor v1：正式设计原则和功能边界

> 文件：`risk-advisor-v1-spec.md`  
> 状态：Frozen for v1 Implementation  
> 版本：v1.1  
> 目标平台：DeepSeek Harness  
> 文档角色：产品与功能规范（Source of Truth）

---

## 0. 文档角色

本文件定义：

> **Risk Advisor v1 要解决什么问题、提供哪些能力、遵循什么原则，以及明确不做什么。**

本文件回答的是 **WHAT / WHY**，不负责规定所有 Harness 集成细节。

配套文档：

```text
risk-advisor-v1-spec.md
        ↓
定义产品行为、设计原则、功能边界

risk-advisor-v1-architecture.md
        ↓
定义模块、数据流、Harness seam、接口与安全边界

dsh-risk-advisor-design-discussion.md
        ↓
仅保存方案演化、调研过程和历史讨论
```

如果实现与本文件冲突：

> **以本文件的产品行为与安全边界为准。**

---

# 1. 产品定位

Risk Advisor 不是自动审批器，而是：

> **DeepSeek Harness 的 AI Approval Copilot / 审批辅助决策层。**

当 Agent 请求执行需要用户授权的操作时，Risk Advisor 在用户做决定之前，帮助回答：

```text
它准备做什么？
为什么要这么做？
风险是什么？
用户是否真的授权了这件事？
这个操作真的有必要吗？
申请的权限是否过大？
有没有权限更小的替代方案？
现有证据够不够支持这个判断？
```

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

# 2. V1 核心原则

## 2.1 Advisor，不是 Authority

V1 中：

```text
Risk Advisor
→ 分析
→ 解释
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

作为自身权限决策结果。

Risk Advisor 只产生：

```text
approve
reject
investigate
```

这种**建议**。

---

## 2.2 Risk ≠ Authorization

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

虽然风险不大，但用户没有授权把数据上传到外部，所以仍不应该建议批准。

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

## 2.3 Reviewer 的权限必须小于被审查 Agent

Reviewer 不能为了判断一个高权限操作是否安全，而获得同等级甚至更高权限。

必须遵守：

```text
Main Agent
可能申请高权限
        ↓
Risk Advisor
只获得最小上下文
        ↓
Reviewer
无工具或严格只读工具
```

原则：

> **不要为了审查一个危险 Agent，再创建第二个危险 Agent。**

---

## 2.4 规则事实优先于模型判断

明显的安全事实必须由确定性规则识别。

例如：

```text
系统目录
danger-full-access
recursive delete
private key
remote publish
workspace 外写入
```

这些事实不能因为 LLM 输出：

```text
“看起来问题不大”
```

就被覆盖。

因此：

```text
Deterministic Rules
        ↓
LLM Semantic Analysis
        ↓
Local Recommendation Policy
```

而不是：

```text
LLM
→ 最终安全裁决
```

---

## 2.5 无法可靠理解，不等于低风险

如果 Risk Advisor 无法可靠解析某个命令、工具或执行语义：

```text
Unknown / Ambiguous
```

不能自动解释为：

```text
Low Risk
```

正确方向是：

```text
Evidence Quality ↓
        ↓
Investigate / Ask User
```

这条原则尤其适用于：

```text
复杂 Shell chaining
command substitution
interpreter inline code
环境变量注入
未知 Tool
编码/混淆执行
```

---

## 2.6 Risk Assessment 必须考虑实际执行边界

Risk Advisor 不能只分析：

```text
命令文本
```

还应考虑：

```text
这个操作实际上能影响到哪里？
```

例如，同一个写命令在以下环境中的实际风险不同：

```text
Workspace 内
+ 真实 Sandbox 写边界
+ 有回滚能力

vs

Workspace 外
+ 无 Sandbox
+ 不可回滚
```

因此：

> **Sandbox、Workspace containment、Target Scope、Rollback/Checkpoint 等属于风险判断的重要 Evidence，但不新增为独立评估维度。**

---

# 3. V1 六维评估模型

Risk Advisor 不使用单一的：

```text
safe / unsafe
```

而是评估六个维度。

## 3.1 Risk

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
供应链风险
跨 Workspace 影响
```

Risk 判断应结合：

```text
操作本身
+
影响范围
+
实际执行边界
+
可恢复性证据
```

## 3.2 Authorization

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
用户明确 UI 选择
```

不能把：

```text
Agent justification
代码注释
文件内容
网页内容
Tool output
```

当作用户授权证据。

## 3.3 Necessity

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

因为完全可能通过修改用户 PATH 完成。

Risk Advisor 不只回答“危险不危险”，还应该回答：

```text
为了当前目标，真的需要这样做吗？
```

## 3.4 Privilege

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

Risk Advisor 的重要差异化能力：

> **Permission Minimizer**

目标：

```text
Requested Permission
        ↓
Real Goal
        ↓
Minimum Required Permission
```

## 3.5 Alternatives

判断是否存在更安全、权限更小、影响范围更窄、更可逆的替代方案。

例如：

```text
当前方案：
建立 Program Files junction

Alternative:
修改用户 PATH
```

最终 Risk Advisor 不只是说 Reject，而应该告诉用户：

```text
Reject current approach.
Use the lower-privilege alternative instead.
```

## 3.6 Evidence Quality

判断当前结论到底有多少可靠证据支持：

```text
high
medium
low
```

例如：

```text
Risk:
Low

Evidence Quality:
Low
```

意味着：

> “目前看起来风险低，但证据不足。”

正确行为应该是：

```text
Investigate
```

而不是建议批准。

Evidence Quality 应综合：

```text
Tool 是否已知
操作是否可规范化
路径是否已 canonicalize
Sandbox coverage 是否确定
Rollback 是否有实际证据
用户授权上下文是否完整
必要环境事实是否已调查
```

---

# 4. 最终评估模型

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

V1 不使用模型 `confidence` 作为安全决策依据。

---

# 5. Reversible 必须 Evidence-backed

`reversible` 不能仅依赖 LLM 主观判断。

优先证据包括：

```text
Git 是否跟踪该文件
是否存在 checkpoint
是否存在文件级 backup
是否只是 workspace 内修改
是否涉及远程写入
是否涉及数据库/生产系统
是否涉及系统配置
是否存在明确 undo 路径
```

例如：

```text
修改 tracked file
+ checkpoint exists
→ reversible=true 的证据较强
```

而：

```text
git push --force
npm publish
drop table
系统级配置修改
```

不能因为“理论上可以补救”就标记为 true。

当证据不足时：

```text
reversible = unknown
```

---

# 6. V1 工作流程

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
Operation Presentation
          ↓
Risk Advisor UI
          ↓
Harness Native Approval
          ↓
        用户决定
```

---

# 7. Operation Snapshot

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

同时收集：

```text
workspaceContained
targetScope
sandboxActive
sandboxCovered
rollbackAvailable
```

并建议生成：

```text
operationHash
```

用于降低：

```text
审查 A
↓
实际执行 B
```

的风险。

---

# 8. Fast Judge

Fast Judge 是 V1 默认智能分析路径：

```text
Rule Engine
+
LLM
```

而不是完整 Agent。

Fast Judge 必须被定义成：

> **Side-Path Review**

含义：

```text
不写入主 Conversation
不改变 Main Agent trajectory
不产生工具调用
不修改 Session 状态
独立 timeout
独立 cancellation
失败不影响 Harness 原生审批
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

Fast Judge 没有工具，只负责语义分析。

---

# 9. Rule Engine

LLM 之前必须先跑确定性规则。

典型高风险类别：

```text
删除
递归删除
格式化磁盘
系统目录修改
Program Files
Windows 系统目录
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

Shell 规则不能只做简单关键词匹配，还应尽量识别：

```text
&& / || / ; / |
command substitution
$()
backticks
interpreter -c / -e
encoded execution
environment assignment
wrapper binary
eval / exec
unknown shell constructs
```

原则：

> **对于 Allow/Low-Risk 判断要 fail closed；无法完整理解的 Shell 语义降低 Evidence Quality。**

---

# 10. Deep Judge

Deep Judge 只在以下情况触发：

```text
Fast Judge 信息不足
+
缺失信息可以通过只读调查获得
```

允许的能力应是受控 Evidence Tool，例如：

```text
stat
list directory
read small text file
canonical path
git status
git tracked status
.gitignore evidence
读取 package manifest
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

原则：

> **Reviewer 的权限必须小于被审查 Agent 的权限。**

---

# 11. Trust Boundary

Risk Advisor 必须区分：

## Trusted

```text
用户原始消息
开发者规则
Risk Advisor Policy
用户显式选择
```

## Untrusted

```text
Agent justification
Shell command
工具参数
文件内容
Tool output
网页内容
代码注释
README
项目中的 Agent 指令文件
```

## Sensitive

```text
API Key
Token
Cookie
Private Key
Password
Authorization Header
环境变量中的 Secret
```

Sensitive 数据：

```text
本地识别
↓
Redaction
↓
最小化
↓
必要时才发送 Reviewer
```

---

# 12. 外部 LLM 安全原则

如果配置独立 Reviewer Provider：

```text
Main Agent
→ DeepSeek

Reviewer
→ GPT / Claude / Gemini / 其他
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

不能默认批准。

---

# 13. Operation Presentation

Risk Advisor UI 不应该把原始 Tool Arguments 直接扔给用户。

目标：

```text
Raw Tool Call
      ↓
NormalizedOperation
      ↓
OperationPresenter
      ↓
Decision-oriented Presentation
```

不同操作采用不同展示：

```text
Shell
→ Command / CWD / Target / Permission

File Write
→ Path / Change Summary / Scope

File Edit
→ Path / Diff Summary

Delete
→ Target / Recursive / Scope / Recoverability

Network
→ Destination / Data Direction / External Effect

Permission Escalation
→ Requested Permission / Minimum Required Permission

Package Install
→ Package / Scope / Global vs Project / Lifecycle Risk
```

原则：

> **UI 要帮助用户判断，而不是要求用户先理解工具协议。**

---

# 14. Approval UI

默认 UI 必须简洁。

```text
Risk Advisor

风险：
High

建议：
拒绝当前方案

准备做什么：
在系统级目录创建链接

权限：
申请权限明显高于实际需要

替代：
修改当前用户 PATH
```

展开后显示：

```text
Authorization
Necessity
Privilege
Evidence Quality
Affected Resources
Reversibility
Execution Boundary
Rule Findings
Reviewer Source
```

避免 Approval Fatigue。

---

# 15. UI 与 Harness 的职责边界

Harness 原生 Approval UI 继续负责：

```text
Reject
Allow once
```

Risk Advisor 只增加：

```text
风险解释
操作摘要
权限分析
证据质量
更安全方案
```

Risk Advisor 不重新实现审批系统。

---

# 16. UI 措辞原则

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

Risk Advisor 提供风险判断，不提供安全证明。

---

# 17. “使用更安全方案”

Risk Advisor 应尽可能提供：

```text
Safer Alternative
```

产品目标可以包括：

```text
[使用更安全方案]
```

但 V1 不允许 Risk Advisor 自动执行替代方案。

如果 Harness 没有安全公共 seam 支持“拒绝原操作 + 给 Main Agent 提交替代指令”，则 V1 降级为：

```text
[复制安全方案]
```

---

# 18. TOCTOU

Risk Advisor 必须承认：

```text
Review
↓
User Approve
↓
Execute
```

之间环境可能变化：

```text
文件被替换
目录变 junction
symlink 目标变化
Git 状态变化
Sandbox coverage 变化
```

V1 至少记录审查时关键 Evidence 和 operationHash。

---

# 19. 多步风险

V1 主要审查：

```text
Single Tool Call
```

但架构必须允许以后加入：

```text
Operation Chain
```

V1 暂不实现复杂行为链检测。

---

# 20. 日志与审计

可以记录：

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

默认不持久化：

```text
完整命令
完整 Prompt
完整文件内容
Secret
raw Tool Arguments
完整 LLM reasoning
```

---

# 21. 插件共存原则

需要兼容：

```text
dsh-smart-approval
dsh-approve-for-me
其他 approval answerer
```

Risk Advisor 定位：

```text
Observe
↓
Analyze
↓
Present
```

不成为 terminal approval answerer。

---

# 22. V1 明确不做

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
替代 Harness Sandbox
替代 Harness Approval Service
```

---

# 23. V1 最终功能边界

```text
                 Risk Advisor v1

                      │
            捕获审批真实操作
                      │
            收集执行边界 Evidence
                      │
                Rule Engine
                      │
                 Fast Judge
                 (Side Path)
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
             Evidence-backed
              Reversibility
                      │
             OperationPresenter
                      │
                 Recommendation
                      │
            Risk Advisor Card
                      │
             Harness Native UI
                      │
                    用户
```

---

# 24. 一句话定义

> **Risk Advisor v1 是一个不替用户授权的 AI Approval Copilot：它通过确定性规则、实际执行边界证据、最小上下文 Side-Path LLM 审查和必要时的只读证据调查，分析操作风险、用户授权、操作必要性、权限是否过度、替代方案及证据质量，并将真实 Tool Call 转换成面向用户决策的风险说明，在 Harness 执行高权限操作前提供可解释的建议。**

---

# 25. 文档冻结规则

从 v1.1 起：

> **本文件视为 V1 产品规范冻结版。**

后续调研结果优先记录到：

```text
design-discussion / research notes
```

只有发现真实安全缺陷、Harness seam 重大变化或产品边界必须调整时，才修改本文件。
