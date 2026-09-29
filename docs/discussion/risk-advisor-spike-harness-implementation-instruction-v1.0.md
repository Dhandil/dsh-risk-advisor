# Risk Advisor — Spike Harness Implementation Instruction V1.0

> 用途：交给 Codex 执行  
> 目标仓库：`D:\Harness\deepseek-harness`  
> 目标：只实现一次性的 Risk Advisor Critical Spike 实验框架，不实现正式 Risk Advisor V1。  
> 适用环境：Windows + PowerShell 7  
> 日期：2026-08-27

---

# 0. 任务定位

你现在要在 DeepSeek Harness 源码仓库中建立一个**一次性、可删除、仅用于实验验证的 Spike Harness**。

这个 Spike Harness 用于后续依次执行：

```text
Spike 1 — Approval Middleware Ordering
Spike 2 — Approval UI Seam
Spike 3 — ActiveExecutionIndex / Approval Correlation
Spike 4 — Nested Execution / Durable Tree Reconstruction
Spike 5 — Guard Denial Detection
Spike 6 — Ledger Degraded / HMR / Recovery
Spike 7 — Assessment Latency / Bounded Advisory Path
```

本 Task 的目标不是执行七个 Spike，也不是实现正式 Risk Advisor。

本 Task 只负责：

```text
建立统一实验插件框架
+
统一 instrumentation / evidence 输出
+
Spike 选择机制
+
最小共享 runtime
+
为 7 个 Spike 预留清晰模块边界
```

---

# 1. 最高优先级约束

必须严格遵守。

## 1.1 禁止正式实现 Risk Advisor

不要实现：

```text
正式 Execution Ledger
正式 Risk Engine
六维 Evaluator
AssessmentAggregator
正式 RiskAdvisorCard
正式数据库 schema
正式持久化
正式历史查询系统
正式 Judge
正式 safer-alternative system
```

如果某个 Spike 后续需要其中的行为，只允许使用：

```text
stub
fixture
synthetic value
minimal prototype
```

---

## 1.2 禁止修改 Harness Core

默认：

```text
DO NOT MODIFY HARNESS CORE
```

包括但不限于：

```text
packages/core/*
packages/api/*
现有 approval subsystem
现有 tools runtime
现有 session runtime
现有 web client core
```

本 Task 应优先使用 Harness 已存在的：

```text
Cordis plugin
official lifecycle hooks
official tool hooks
official approval hooks
official web/client extension seam
--patch overlay
```

只有在完成代码检查后确认某个实验框架本身完全无法建立时，才记录 blocker；不要擅自修改 Core 解决。

---

## 1.3 禁止永久修改用户 Harness Profile

不要直接写入用户现有 profile。

必须使用临时 overlay / patch：

```text
pnpm dsh web --patch ...
```

Spike Harness 可以被整个目录删除而不影响原 Harness。

---

## 1.4 不允许用猜测替代 Harness API 检查

实现前必须先检查当前 checkout 中真实存在的：

```text
tool execution hook API
approval/request API
session/event API
Cordis plugin lifecycle API
Web/plugin extension API
```

不要仅根据旧文档或任务说明猜函数签名。

如果源码与本 Instruction 不一致：

```text
以当前 checkout 源码为准
```

但必须在最终报告中记录差异。

---

# 2. 开始前必须记录 Baseline

在：

```powershell
cd D:\Harness\deepseek-harness
```

执行并记录：

```powershell
git status --short
git branch --show-current
git rev-parse HEAD
node --version
pnpm --version
```

要求：

1. 不切 branch。
2. 不 reset 用户已有修改。
3. 不清理用户未跟踪文件。
4. 如果仓库不是 clean，记录状态即可。
5. Spike Harness 本身应尽量放在独立 scratch 目录。

把 baseline 写入：

```text
scratch-risk-advisor-spikes/evidence/environment-baseline.json
```

至少包含：

```json
{
  "harnessCommit": "...",
  "branch": "...",
  "nodeVersion": "...",
  "pnpmVersion": "...",
  "createdAt": "...",
  "platform": "win32",
  "purpose": "risk-advisor-critical-spikes"
}
```

---

# 3. 目标目录

优先建立：

```text
D:\Harness\deepseek-harness\
└─ scratch-risk-advisor-spikes\
   ├─ README.md
   ├─ cordis.yml
   ├─ package.json                # 仅当当前 Harness scratch plugin 需要
   ├─ tsconfig.json               # 仅当需要
   │
   ├─ src\
   │  ├─ index.ts
   │  ├─ config.ts
   │  │
   │  ├─ core\
   │  │  ├─ recorder.ts
   │  │  ├─ evidence-writer.ts
   │  │  ├─ runtime-context.ts
   │  │  ├─ scenario.ts
   │  │  └─ types.ts
   │  │
   │  ├─ spikes\
   │  │  ├─ spike-01-approval-ordering.ts
   │  │  ├─ spike-02-approval-ui.ts
   │  │  ├─ spike-03-correlation.ts
   │  │  ├─ spike-04-nested-tree.ts
   │  │  ├─ spike-05-guard-denial.ts
   │  │  ├─ spike-06-recovery.ts
   │  │  └─ spike-07-latency.ts
   │  │
   │  └─ web\                     # 只有 Spike 2 确认需要浏览器端代码时才建立
   │
   └─ evidence\
      ├─ environment-baseline.json
      └─ .gitkeep
```

允许根据当前 Harness plugin convention 微调，但必须保持：

```text
shared core
spike modules
evidence output
```

三层清晰分离。

---

# 4. Spike 选择机制

七个 Spike 禁止同时运行。

必须支持通过环境变量选择：

```powershell
$env:RA_SPIKE="1"
```

以及可选 scenario：

```powershell
$env:RA_SCENARIO="S1.1"
```

建议接口：

```ts
type SpikeId = '1' | '2' | '3' | '4' | '5' | '6' | '7'

interface SpikeRuntimeConfig {
  spikeId: SpikeId
  scenarioId?: string
  evidenceRoot: string
  runId: string
}
```

`index.ts` 行为：

```text
读取 RA_SPIKE
↓
如果不存在：
  打印帮助信息
  不注册任何危险/实验 hook
  正常返回

如果存在：
  初始化 recorder
  只 install 对应 spike module
```

禁止：

```text
加载 7 个 Spike 后再在 hook 内 if 判断
```

避免实验相互污染。

---

# 5. 统一 Run Identity

每次启动 Spike Harness 必须生成：

```text
runId
generationId
```

例如：

```text
runId:
20260827T103501Z-S3-S3.6-a8f2

generationId:
随机 UUID / monotonic local id
```

目的：

```text
区分不同实验
区分 HMR 前后 plugin generation
检测重复 listener
检测旧 generation 残留
```

---

# 6. Recorder Contract

建立统一 Recorder。

不要让每个 Spike 自己随意 `console.log`。

建议：

```ts
interface SpikeEvidenceEvent {
  schemaVersion: 1

  runId: string
  generationId: string

  spikeId: string
  scenarioId?: string

  eventId: string
  sequence: number

  observedAt: string

  event: string

  executionId?: string
  approvalId?: string
  callId?: string
  rootCallId?: string
  sessionId?: string
  scopeId?: string

  data?: Record<string, unknown>
}
```

要求：

```text
sequence
```

在单个 process/run 中严格递增。

所有关键 instrumentation 都走：

```ts
recorder.record(...)
```

---

# 7. Evidence 输出格式

每次 Run 创建独立目录：

```text
scratch-risk-advisor-spikes/evidence/
└─ <spike-id>/
   └─ <run-id>/
      ├─ environment.json
      ├─ events.jsonl
      ├─ summary.json
      └─ notes.md
```

## `events.jsonl`

一行一个 JSON object。

禁止写成：

```text
human-readable console-only logs
```

Console 可以同时输出简短信息，但 JSONL 是正式证据。

## `environment.json`

记录：

```text
Harness commit
branch
Node
pnpm
RA spike
scenario
run id
generation
startedAt
```

## `summary.json`

本 Task 暂时只需要：

```json
{
  "runId": "...",
  "spikeId": "...",
  "scenarioId": "...",
  "eventCount": 0,
  "startedAt": "...",
  "endedAt": null
}
```

后续 Spike 执行时再增加 verdict。

---

# 8. Evidence Writer 安全要求

Evidence Writer 本身不能：

```text
throw 导致 Harness tool execution 失败
阻塞 approval
无限等待 fs IO
```

要求：

```text
best-effort
failure-contained
```

如果 evidence 写入失败：

```text
console.error
```

但不能：

```text
改变 Harness ApprovalOutcome
改变 Tool Result
阻断 next()
```

---

# 9. Lifecycle / Dispose

这是本 Task 必须做好的一部分，因为 Spike 1 和 Spike 6 会依赖。

需要明确记录：

```text
PLUGIN_INSTALL
PLUGIN_DISPOSE_BEGIN
PLUGIN_DISPOSE_END
```

如果 Harness/Cordis 提供正式 dispose 生命周期，必须使用。

所有实验 listener / resource：

```text
必须通过当前 Harness/Cordis 推荐 lifecycle 注册
```

不要建立无法回收的：

```text
process-global singleton listener
裸 EventEmitter listener
setInterval 未清理
```

如果必须使用 timer：

```text
dispose 时 cancel
```

---

# 10. Runtime Context

共享 runtime 至少提供：

```ts
interface SpikeRuntimeContext {
  config: SpikeRuntimeConfig
  recorder: SpikeRecorder

  runId: string
  generationId: string
}
```

不要提前放：

```text
Risk Engine
Ledger
RiskAssessment
```

除非后续某个 Spike 需要最小 prototype，再在对应 spike module 内局部实现。

---

# 11. Spike Module Contract

建议统一：

```ts
interface SpikeModule {
  id: SpikeId
  name: string

  install(
    ctx: HarnessContext,
    runtime: SpikeRuntimeContext,
  ): void | Promise<void>
}
```

如果当前 Harness plugin typing 不适合暴露统一 `HarnessContext` 类型，可按实际 API 调整。

核心原则：

```text
index.ts 不包含具体 Spike 逻辑
```

---

# 12. 七个 Spike 文件本 Task 的实现深度

本 Task 不执行七个 Spike。

每个 spike 文件只做到：

```text
模块存在
可以被选择加载
有 install skeleton
记录 SPIKE_INSTALL
记录 SPIKE_READY
```

只有为了验证 Spike Harness 本身可工作所必需的最小 hook，可以先实现。

---

# 13. Spike 1 最小预埋

`spike-01-approval-ordering.ts`

如果当前 Harness API 已确认 `approval/request` hook 签名，可实现最小 instrumentation：

```text
APPROVAL_MIDDLEWARE_ENTER
BEFORE_NEXT
AFTER_NEXT
APPROVAL_MIDDLEWARE_EXIT
```

但禁止：

```text
返回 ApprovalOutcome
实现 assessment
实现 correlation
```

异常处理要求：

```text
recorder failure 不阻止 next()
```

如果为了本 Task 验证框架需要一个 smoke test，优先用 Spike 1 最小 hook。

---

# 14. Spike 2 仅留 UI Discovery 边界

`spike-02-approval-ui.ts`

本 Task 不实现正式 Web UI。

只允许：

```text
记录当前发现的 public UI extension candidates
预留 host/client module boundary
```

如果当前 Harness scratch-plugin convention 强制 host/client 分包，不要过度搭建。

最终先留下：

```text
TODO_SPIKE_2_UI_DISCOVERY
```

及源码位置说明。

---

# 15. Spike 3 预留 Runtime Identity Instrumentation

`spike-03-correlation.ts`

本 Task 可定义局部实验类型：

```ts
type ActiveLookup =
  | { status: 'FOUND'; executionId: string }
  | { status: 'NOT_FOUND' }
  | { status: 'AMBIGUOUS'; executionIds: string[] }
```

但不要实现正式 Ledger。

如果建立最小 index：

```text
仅属于 Spike module
不能被误用为正式 Risk Advisor component
```

建议在代码注释写：

```text
EXPERIMENTAL_ONLY
```

---

# 16. Spike 4 预留 Durable Event Recorder

`spike-04-nested-tree.ts`

本 Task 只需要确认当前 Harness 是否能监听：

```text
session/event
```

并记录当前源码中 code-dispatch durable event 的真实字段。

如果能安全加入 generic session event recorder，可实现。

不要实现正式 tree reconstruction。

---

# 17. Spike 5 预留 Test Guard

`spike-05-guard-denial.ts`

本 Task 可以预留：

```text
TestDenyGuard
```

但默认：

```text
DISABLED
```

必须只有同时满足：

```text
RA_SPIKE=5
+
RA_SCENARIO=明确 guard scenario
```

才注册。

它只能影响专门的：

```text
test spike target
```

禁止写：

```text
deny all bash
deny all tools
```

不要让 Test Guard 干扰正常 Harness 使用。

---

# 18. Spike 6 预留 Fault Injection Boundary

`spike-06-recovery.ts`

Fault injection 必须发生在：

```text
Harness event
↓
Spike Adapter / Experimental Ledger input
```

禁止直接破坏 Harness 自己的 runtime/event bus。

例如：

```text
DROP_START
```

含义是：

> Spike 侧故意不把 Start event 喂给实验 projection。

不是：

> 阻止 Harness 发 Start。

本 Task 只搭接口：

```ts
type FaultMode =
  | 'NONE'
  | 'DROP_START'
  | 'DROP_RESULT'
  | 'DUPLICATE_START'
  | 'DUPLICATE_RESULT'
  | 'CONFLICT_RESULT'
  | 'DROP_DURABLE_CONFIRMATION'
```

默认 `NONE`。

---

# 19. Spike 7 预留 Timing Instrumentation

`spike-07-latency.ts`

本 Task 可以实现：

```ts
mark(name)
measure(start, end)
```

级别的 timing helper。

必须使用：

```text
monotonic clock
```

优先当前 Node 推荐的高精度 monotonic timer。

不要使用 wall-clock difference 作为 performance measurement。

不要实现 Judge。

可以预留：

```text
syntheticDelayMs
```

但默认 0。

---

# 20. Cordis Overlay

创建 scratch overlay，使用户可以运行：

```powershell
$env:RA_SPIKE="1"
pnpm dsh web --patch .\scratch-risk-advisor-spikes\cordis.yml
```

如果当前 Harness 实际 `--patch` schema 与示例不同：

1. 检查现有 docs / repo examples。
2. 使用当前 checkout 的正确格式。
3. 不修改用户原 profile。
4. 在 README 写精确启动命令。

---

# 21. README 必须包含

`scratch-risk-advisor-spikes/README.md`

至少包括：

## Purpose

```text
Disposable experimental harness for Risk Advisor Critical Spikes.
Not production Risk Advisor code.
```

## Start

PowerShell 7 示例：

```powershell
cd D:\Harness\deepseek-harness

$env:RA_SPIKE="1"
$env:RA_SCENARIO="S1.1"

pnpm dsh web --patch .\scratch-risk-advisor-spikes\cordis.yml
```

## Stop / Clear

```powershell
Remove-Item Env:RA_SPIKE -ErrorAction SilentlyContinue
Remove-Item Env:RA_SCENARIO -ErrorAction SilentlyContinue
```

## Evidence Location

```text
scratch-risk-advisor-spikes/evidence/
```

## Safety

明确：

```text
Do not use Spike 5 guard / Spike 6 fault injection outside explicit spike scenarios.
```

---

# 22. 不要自动执行危险 Spike

本 Task 完成后：

```text
不要自动触发 outside-workspace delete
不要自动触发 privilege escalation
不要自动执行 sandbox escape
不要自动 HMR / restart 用户环境
不要自动制造 destructive operation
```

只搭实验框架。

真正 Spike scenario 后续由独立 instruction 驱动。

---

# 23. Smoke Test

完成框架后做一个**无危险副作用** smoke test。

目标：

```text
1. Harness 能用 --patch 正常启动
2. Spike plugin install 成功
3. environment.json 被创建
4. events.jsonl 有：
   PLUGIN_INSTALL
   SPIKE_INSTALL
   SPIKE_READY
5. 停止 / dispose 时没有明显异常
6. 原 Harness 在未设置 RA_SPIKE 时行为不受影响
```

如果可以安全触发一个普通非危险 hook，再补一条事件即可。

不要为了 smoke test 人为触发危险 Approval。

---

# 24. Validation Commands

根据当前仓库已有 tooling，优先运行：

```powershell
pnpm exec prettier --check .\scratch-risk-advisor-spikes
```

如果 Harness 使用自己的 formatter/linter，以仓库实际命令为准。

同时至少做：

```text
TypeScript typecheck
lint / format check
plugin load smoke test
```

不要为了 scratch plugin 跑整个 Harness 全量 regression，除非修改到了共享仓库代码。

如果只新增独立 scratch directory：

```text
Focused validation only
```

---

# 25. Git Boundary

本 Task 默认：

```text
不要 commit
不要 push
```

除非用户明确要求。

不要：

```text
git add -A
```

以免把用户其它未跟踪内容加入。

最终只报告：

```text
新增文件
修改文件
git diff -- scratch-risk-advisor-spikes
```

---

# 26. 最终交付物

完成后必须有：

```text
scratch-risk-advisor-spikes/
```

可启动。

并输出一份：

```text
scratch-risk-advisor-spikes/IMPLEMENTATION_REPORT.md
```

报告必须包含：

```text
1. Harness baseline commit
2. 当前 Harness API 实际确认结果
3. 创建的目录 / 文件
4. Spike selection mechanism
5. Recorder / evidence design
6. lifecycle / dispose behavior
7. overlay 启动方式
8. smoke test result
9. validation commands + results
10. 与本 Instruction 的偏差
11. blockers / remaining unknowns
12. 明确声明：
    no formal Risk Advisor implementation performed
    no Harness Core modification performed
```

如果实际不得不修改 Harness Core：

```text
立即停止
不要继续
报告原因
```

除非用户另行批准。

---

# 27. Acceptance Criteria

本 Task 只有全部满足才 PASS：

```text
AC-01
存在独立 disposable scratch plugin 目录。

AC-02
通过 RA_SPIKE 一次只加载一个 Spike。

AC-03
支持 RA_SCENARIO。

AC-04
每次 Run 有 runId + generationId。

AC-05
所有 evidence 使用统一 JSONL Recorder。

AC-06
evidence writer failure 不影响 Harness execution / approval。

AC-07
plugin lifecycle 有明确 install/dispose instrumentation。

AC-08
7 个 Spike 模块边界已建立。

AC-09
Spike 5 test guard 默认关闭且只允许精确测试目标。

AC-10
Spike 6 fault injection 只破坏 Spike observation/projection，
不破坏 Harness runtime。

AC-11
Spike 7 timing 使用 monotonic measurement。

AC-12
用户现有 Harness profile 没有永久修改。

AC-13
Harness Core 没有修改。

AC-14
无正式 Risk Advisor 功能被实现。

AC-15
--patch 启动 smoke test 成功。

AC-16
README 含 Windows PowerShell 7 精确运行步骤。

AC-17
IMPLEMENTATION_REPORT.md 完整记录结果。
```

---

# 28. Hard Fail Conditions

以下任意情况直接 FAIL：

```text
修改 Harness Approval semantics
Risk Advisor Spike 返回 ApprovalOutcome
修改用户 profile 作为正式集成方式
7 个 Spike 同时注册
Test Guard 默认生效
Fault injection 破坏 Harness 自身事件流
Recorder error 可导致 Tool / Approval failure
创建正式 Risk Advisor database / service
进入六维 Risk Engine 实现
加入正式 production UI
未验证当前 Harness API 就猜签名
使用 git reset / clean 破坏用户工作区
```

---

# 29. 推荐执行顺序

Codex 按以下顺序工作：

```text
Step 1
Inspect current Harness plugin / tool / approval / session APIs

Step 2
Record baseline

Step 3
Create scratch directory and overlay

Step 4
Implement config + runtime context

Step 5
Implement recorder + evidence writer

Step 6
Implement plugin lifecycle instrumentation

Step 7
Create seven spike module skeletons

Step 8
Add only minimal safe instrumentation required for smoke test

Step 9
Write README

Step 10
Run focused validation + plugin load smoke test

Step 11
Write IMPLEMENTATION_REPORT.md

Step 12
Stop
```

不要在 Step 12 后自行进入 Spike 1 execution。

---

# 30. 最终停止点

完成本 Instruction 后停下来。

不要：

```text
开始跑 Spike 1 scenarios
开始正式 Risk Advisor 实现
开始修改 Contracts
开始生成 Risk Engine
```

最终只向用户汇报：

```text
Spike Harness Framework: PASS / FAIL

Harness commit:
...

Core modifications:
none / STOPPED

Smoke test:
...

Ready for:
Spike 1 — Approval Middleware Ordering
```

