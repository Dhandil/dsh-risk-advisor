# DSH Risk Advisor / Approval Copilot 设计讨论整理

> 状态：概念设计 / PoC 前讨论稿  
> 日期：2026-08-18  
> 目标：为 DeepSeek Harness 中需要用户批准的高风险或工作区外操作提供“风险解释 + 可行性判断 + 更安全替代方案”，帮助用户做出更可靠的审批决策。

---

## 1. 背景与问题

在 DeepSeek Harness 使用过程中，Agent 经常会发起需要用户批准的操作，例如：

- 访问或修改工作区外文件；
- 写入系统目录；
- 修改 PATH、注册表或系统配置；
- 创建 junction / symlink；
- 安装软件或依赖；
- 执行删除、覆盖、重置等高风险命令；
- 从 `workspace-write` 升级到更高权限；
- 请求 `danger-full-access`。

现实问题并不是“有没有审批框”，而是：

> 用户虽然知道 Harness 在请求权限，但并不一定能判断这个操作是否真的必要、风险有多大、权限是否过度、有没有更安全的替代方案。

典型案例：

Harness 为了解决 Git Bash 探测问题，曾建议申请 `danger-full-access`，在：

```text
C:\Program Files\Git
```

建立 junction 指向：

```text
D:\Git
```

这个方案 technically feasible，但更优方案只是把：

```text
D:\Git\bin
```

放到 PATH 前面。

这说明 Harness 的执行 Agent 能提出“可行方案”，但用户仍然需要一个独立的安全视角回答：

1. 这个动作真的有必要吗？
2. 请求的权限是否大于实际需要？
3. 会影响哪些系统资源？
4. 是否可逆？
5. 最坏后果是什么？
6. 有没有权限更小、破坏面更小的替代方案？
7. 最终应该批准、拒绝，还是让用户进一步确认？

因此提出插件方向：

# `dsh-risk-advisor`

也可以命名为：

- `dsh-approval-copilot`
- `dsh-permission-advisor`
- `dsh-safety-reviewer`

当前更推荐：**dsh-risk-advisor**。

---

## 2. 插件定位

插件不是新的权限系统，也不替代 Harness 自带审批机制。

它的角色是：

> **审批辅助决策层（Decision Support Layer）**

即：

```text
Harness 原有权限请求
        ↓
Risk Advisor 分析
        ↓
向用户解释风险和替代方案
        ↓
Harness 原审批 UI
        ↓
用户最终批准 / 拒绝
```

V1 不自动批准高权限操作。

用户仍然拥有最终决策权。

---

## 3. 为什么这个方向适合 DeepSeek Harness

DeepSeek Harness 已经提供了比较合适的扩展缝隙。

### 3.1 工具执行前拦截

Harness 的工具调用链中存在：

```text
tools/pre-execute
    ↓
allow / deny / ask
    ↓
tools/execute
```

Risk Advisor 可以在工具真正执行前观察：

- tool name；
- arguments；
- callId；
- agent；
- command；
- path；
- cwd；
- 目标资源；
- 权限提升请求等。

这使得插件可以在危险操作真正发生前完成风险评估。

### 3.2 Harness 原生 approval seam

Harness 还有统一的审批服务 / seam：

```text
approval/request
```

审批请求包含：

- agent；
- toolName；
- callId；
- human-readable reason；
- signal。

其中 `callId` 很关键，可以把：

```text
tools/pre-execute
```

阶段拿到的完整工具调用信息，与：

```text
approval/request
```

阶段关联起来。

因此可以建立：

```text
callId
  ↓
RiskAssessment
```

的映射。

---

## 4. 推荐总体架构

```text
                    DeepSeek Harness
                           │
                    tools/pre-execute
                           │
                           ▼
                  ┌──────────────────┐
                  │  dsh-risk-advisor │
                  └──────────────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       Deterministic Rules        Judge Provider
       规则 / 静态分析层             判断模型层
              │                         │
              │              ┌──────────┼──────────┐
              │              ▼          ▼          ▼
              │         DeepSeek API  Claude API  External Agent
              │                                    (只读)
              └────────────┬────────────────────────┘
                           ▼
                    RiskAssessment
                           │
                         callId
                           │
                           ▼
                    approval/request
                           │
                           ▼
                 风险辅助审批信息展示
                           │
                    ┌──────┴──────┐
                    ▼             ▼
                Allow once       Reject
```

---

## 5. 为什么不能只靠 LLM

风险判断不应该完全交给大模型。

更合理的是两层结构。

### 5.1 第一层：确定性规则引擎

快速识别明确风险信号，例如：

```text
rm -rf
Remove-Item -Recurse
format / diskpart
git reset --hard
git clean -fd
Program Files
Windows Registry
HKLM / HKCU
修改 PATH
写入 workspace 外目录
删除目录
覆盖配置
网络上传
API Key / Token
管理员权限
sudo
runAs
danger-full-access
创建 symlink / junction
安装驱动 / 服务
修改防火墙
修改系统启动项
```

这一层特点：

- 快；
- 可解释；
- 可测试；
- 不依赖模型；
- 不会因为 LLM 漂移而漏掉明显危险模式。

### 5.2 第二层：Judge Provider

模型负责判断语义层问题：

- 操作是否与当前任务目标一致；
- 是否真的有必要；
- 当前权限是否过度；
- 影响范围有多大；
- 是否可逆；
- 有没有更小权限的替代方案；
- 最终建议批准还是拒绝。

---

## 6. 外部 Agent 如何参与判断

当前讨论形成了三种可选方式。

### 6.1 方式 A：直接调用模型 API（推荐作为 Fast Judge）

结构：

```text
dsh-risk-advisor
      ↓
DeepSeek / OpenAI / Claude API
      ↓
结构化 RiskAssessment
```

适合：

- 每次审批快速判断；
- 不需要访问真实环境；
- 目标响应时间约 1～几秒；
- 输入主要是命令、路径、权限、reason、任务目标。

优点：

- 快；
- 稳定；
- 容易限制输出格式；
- 不需要初始化完整 Agent；
- 成本和复杂度低。

### 6.2 方式 B：启动外部 CLI Agent

例如：

```text
Codex CLI
Claude Code
Gemini CLI
其他本地 Agent
```

结构：

```text
Risk Advisor
     ↓
child_process.spawn()
     ↓
External CLI Agent
     ↓
JSON RiskAssessment
```

适合：

- 需要 Agent 做进一步环境调查；
- 需要读取项目文件；
- 需要理解复杂工程上下文。

缺点：

- 启动慢；
- 生命周期复杂；
- CLI 输出稳定性较差；
- 更容易出现超时；
- 不适合每次审批都运行。

### 6.3 方式 C：调用已有外部 Agent 调度插件

当前 Harness 环境中的 `dsh-memory-evolve` 已经具有外部 AI Agent 调度能力，可调度如 Codex / Kimi / Grok / Hermes 等外部 Agent。

它更适合：

```text
重构
代码审查
视觉改造
复杂调查
大型异步任务
```

而审批判断属于：

```text
权限请求出现
  ↓
几秒内给出判断
  ↓
用户马上做决定
```

所以 V1 不建议强依赖异步 dispatch 机制。

---

## 7. 推荐 Judge 设计

推荐抽象统一接口：

```ts
interface JudgeProvider {
  assess(request: RiskRequest): Promise<RiskAssessment>
}
```

以后可以有：

```text
JudgeProvider
├── DeepSeekJudge
├── OpenAIJudge
├── ClaudeJudge
├── CodexCliJudge
├── ClaudeCodeJudge
└── CompositeJudge
```

这样 Risk Advisor 的核心逻辑与具体模型供应商解耦。

---

## 8. Fast Judge + Deep Judge 双层模式

当前最推荐的产品形态：

### Fast Judge

每次审批都运行。

```text
规则引擎
    +
模型 API
```

目标：

- 低延迟；
- 快速给风险等级；
- 快速给是否过度授权的判断；
- 快速给替代方案。

### Deep Judge

只有以下情况触发：

```text
中高风险
且
Fast Judge 信息不足 / confidence 较低
```

Deep Judge 可以调用一个**只读外部 Agent**，执行：

- read file；
- list directory；
- git status；
- git diff；
- read package.json；
- read configuration；
- inspect dependency；
- inspect filesystem metadata。

但不允许：

- write；
- delete；
- install；
- registry edit；
- admin；
- `danger-full-access`。

安全原则：

> **负责审查危险操作的 Agent，本身不能拥有执行同类危险操作的权限。**

否则会形成安全模型倒置。

---

## 9. RiskRequest 建议结构

```ts
interface RiskRequest {
  callId: string

  toolName: string
  arguments: unknown

  command?: string
  cwd?: string
  workspaceRoot?: string

  requestedPermission?: string
  reason?: string

  userGoal?: string
  agentIntent?: string

  targetPaths?: string[]
}
```

后续可以根据 Harness 实际能拿到的上下文字段调整。

---

## 10. RiskAssessment 建议结构

```ts
interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical'

  feasible: boolean
  necessary: boolean
  reversible: boolean

  recommendation:
    | 'approve'
    | 'reject'
    | 'ask-user'

  confidence: number

  summary: string

  risks: string[]
  affectedResources: string[]

  saferAlternative?: string
}
```

未来还可以增加：

```ts
permissionExcess?: boolean
estimatedBlastRadius?: 'local' | 'project' | 'user' | 'system'
rollbackPlan?: string
requiredPermission?: string
```

---

## 11. 一个典型判断示例

输入操作：

```text
目标：让 dsh-super-injector 找到 Git Bash

命令：
New-Item -ItemType Junction \
  -Path "C:\Program Files\Git" \
  -Target "D:\Git"

申请权限：
danger-full-access
```

Risk Advisor 可以输出：

```json
{
  "riskLevel": "high",
  "feasible": true,
  "necessary": false,
  "reversible": true,
  "recommendation": "reject",
  "confidence": 0.94,
  "summary": "操作可行，但为了修复 Git Bash 探测而修改 Program Files 并申请 danger-full-access，权限与影响范围明显过大。",
  "risks": [
    "修改系统级 Program Files 目录结构",
    "可能影响其他程序对 Git 安装位置的判断",
    "申请的权限高于实际任务需要"
  ],
  "affectedResources": [
    "C:\\Program Files\\Git",
    "系统级文件系统结构"
  ],
  "saferAlternative": "将 D:\\Git\\bin 放到 PATH 前部，让 bash 优先解析为 Git Bash。"
}
```

最终用户看到：

```text
风险等级：高
建议：拒绝

为什么：
- 操作本身可行
- 但不必要
- 权限过度
- 会修改系统级目录

更安全方案：
把 D:\Git\bin 加到 PATH 前部

[Allow once] [Reject]
```

---

## 12. V1 建议范围

V1 不追求完整自动审批系统。

只验证最核心闭环：

```text
捕获待执行操作
      ↓
构造 RiskRequest
      ↓
规则扫描
      ↓
调用 Fast Judge
      ↓
得到 RiskAssessment
      ↓
把结果展示给用户
```

### V1 做

- 监听 `tools/pre-execute`；
- 获取 tool / args / callId；
- 规则引擎；
- 一个 Judge Provider；
- 结构化风险输出；
- 保存 `callId → RiskAssessment`；
- 最小 UI 或日志展示。

### V1 暂时不做

- 自动 approve；
- 自动执行替代方案；
- 持久化“永久允许”；
- 复杂权限策略数据库；
- 多模型投票；
- 完整历史审计中心；
- 自动修改 Harness 原审批机制。

---

## 13. 后续阶段

### Phase 1：Risk Assessment PoC

目标：证明能监听工具调用并返回结构化风险报告。

### Phase 2：Approval Integration

通过 `callId` 把 RiskAssessment 与 `approval/request` 关联。

### Phase 3：UI

在审批信息附近展示：

- 风险等级；
- 风险原因；
- 是否必要；
- 是否可逆；
- 更安全方案；
- 推荐批准 / 拒绝。

### Phase 4：Deep Judge

引入只读外部 Agent 做上下文调查。

### Phase 5：受控自动策略

成熟后才考虑：

```text
低风险 + 高置信度
→ 可配置自动批准

高风险 / Critical
→ 可配置自动拒绝

中风险 / 信息不足
→ 用户最终决定
```

这一阶段必须建立清晰的 fail-closed 原则和审计能力。

---

## 14. 开发方式

当前环境已安装 `dsh-super-injector`，因此该插件非常适合采用运行时开发闭环：

```text
写插件
  ↓
build
  ↓
dev_inject_plugin
  ↓
制造一次需要审批的操作
  ↓
观察 Risk Advisor
  ↓
修改代码
  ↓
build
  ↓
热重载
  ↓
再次测试
```

建议项目目录独立于 Workbench，作为一个独立 DSH 插件开发。

---

## 15. 当前核心结论

1. **插件方向成立，而且有实际价值。**
2. **不替代 Harness 原审批机制，只做辅助决策。**
3. **V1 不自动批准，用户保留最终决定权。**
4. **优先使用规则引擎 + 模型 API 作为 Fast Judge。**
5. **外部 Agent 只用于信息不足时的 Deep Judge。**
6. **Deep Judge 必须限制为只读，不允许持有危险权限。**
7. **核心数据关联键使用 `callId`。**
8. **优先利用 Harness 的 `tools/pre-execute` 与 `approval/request` 扩展缝隙。**
9. **Judge Provider 要抽象，避免绑定某个模型或 CLI。**
10. **先做最小 Risk Assessment PoC，再碰审批 UI 和自动策略。**

---

## 16. 参考依据

本设计讨论主要基于以下 DeepSeek Harness 机制：

- `dsh-tools` 工具执行流水线：`tools/pre-execute → tools/execute → tools/post-execute`；
- `dsh-user-approval` 的统一 approval seam；
- `approval/request` 携带 `agent / toolName / callId / reason`；
- Harness approval 的 one-shot `allowed-once / rejected / cancelled / unavailable` 模型；
- `dsh-memory-evolve` 的外部 AI Agent 调度能力；
- `dsh-super-injector` 的运行时插件注入 / 热重载能力。

---

## 17. 下一步建议

下一步不直接写完整插件。

先冻结 3 个接口：

```text
RiskRequest
    ↓
JudgeProvider
    ↓
RiskAssessment
```

然后做一个最小 PoC：

```text
tools/pre-execute
→ RiskRequest
→ DeepSeekJudge（或其他 API Judge）
→ RiskAssessment
→ console / 简单 UI 输出
```

这条链路跑通后，再进入 `approval/request` 集成。
