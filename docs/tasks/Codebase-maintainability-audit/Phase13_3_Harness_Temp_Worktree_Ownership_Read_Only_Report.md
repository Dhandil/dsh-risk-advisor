# Phase 13.3 Harness 临时 Worktree 只读归属调查

**结果：** `RISK_ADVISOR_PHASE13_3_TEMP_WORKTREE_OWNERSHIP_READY_FOR_INDEPENDENT_REVIEW`
**调查基线 / 实际审计 SHA：** `193953a795f46b835fb75fd005cda947b9957cae`
**Freeze 前基线：** `6fdb010b1c5e6f21b7b4b0c471b096ab0f1446fa`
**Pinned Harness：** `ddefc45fbc7f8e46dd73185e68295696d1297887`
**唯一文件系统目标：** `/private/tmp/dsh-harness-phase13-3-readiness/`
**结论分类：** `UNKNOWN_DO_NOT_TOUCH`

## 摘要

目标是一个当前仍存在的普通目录。固定 Harness 的 Git worktree registry 仍列出同一路径，登记的 HEAD 是 pinned Harness SHA，状态为 detached；Git 同时报告该登记 prunable，原因是其 gitdir file 指向不存在的位置。目标根的 `.git` 项当前不存在。有限的精确根路径 `lsof` 查询未返回 PID，但这不是递归 open-file 检查，不能证明其子项没有被进程打开，也不能排除其他外部引用。

已提交 Phase13.3 材料证明当时曾计划/尝试隔离 Harness worktree，但没有将此精确路径与该任务建立无歧义的创建关系。目标内容、未归档证据、子项所有权和安全恢复方式按冻结限制未检查。因此不能认定它是可清理候选，不能以 `prunable` 状态授权清理或修复 worktree。

**NO CLEANUP PERFORMED.** 本报告不授权删除、移动、修复 Git 登记或回收空间。

## Q1 — 是否为同一目标对象

只对冻结列出的目标根及根级 `.git` 项调用 `lstat`，未跟随符号链接或枚举子项。

| 项目 | 观察结果 |
|---|---|
| 目标根 | 存在；普通目录，不是符号链接 |
| Owner / mode | UID 501、GID 0；mode `0755` |
| 根 inode size / mtime | 1,344 B（仅目录 inode 的 `st_size`，不是目录内容或磁盘占用）；mtime `2026-10-11T16:06:01Z` |
| 目标根 `.git` | 不存在；没有读取或搜索其它子项 |

## Q2 — Git checkout 归属

只对已知 pinned Harness checkout 运行 `git worktree list --porcelain` 与 `git rev-parse HEAD`。registry 将目标列为一条记录：

- HEAD：`ddefc45fbc7f8e46dd73185e68295696d1297887`；detached。
- 状态：`prunable`，Git 给出的原因是 “gitdir file points to non-existent location”。
- 目标目录本身仍存在，但根 `.git` 指针不存在。这证明 registry 与磁盘状态不一致；不证明目录内容无价值。
- registry 仍保有管理记录；登记详情进一步指向哪个内部管理文件未检查，因为目标 `.git` 指针缺失，且冻结不允许扫描其它 Git 管理条目。

本调查未对目标执行 `git status`、`git worktree prune/repair` 或任何写操作。

## Q3 — 历史任务归属与引用

允许范围内检索了已提交 Phase13.3 与 Codebase Audit 报告，没有查找私人磁盘上的引用。

- **精确路径引用：** 本次 Freeze 和先前的外部产物审计/独立证据审查提到了此路径。它们是审计记录，不是创建日志，也不能独立证明谁创建了目录或目录内资产的来源。
- **任务级相关性：** Phase13.3 Real Agent 执行报告记录过建立 pinned Harness 隔离 worktree 的准备尝试；报告也记录因本地 pnpm store 缺少包而未能按离线方式完成准备。Phase13.3 隔离架构材料说明了预期的独立 Harness checkout。材料与目录名称/时间线相关，但未将该精确路径绑定到特定任务执行。
- **独有证据：** 未检查目标子项或内容，所以无法确认是否包含未归档代码、依赖、构建文件、测试证据或用户数据，也无法确认这些资产是否另有副本。

## Q4 — 当前引用与活跃状态

- Git registry 是已观察到的当前引用；其登记是 stale/prunable 状态。
- 以完整目标路径执行的非递归 `lsof -nP -t` 未返回 PID。该查询只匹配目标根本身；它不覆盖打开的子文件、工作目录、其他进程缓存或应用层引用。
- 没有扫描进程环境、命令参数、其它 worktree、Profile、会话或其他项目。故状态为 **`LIVENESS_UNVERIFIED`**，不是 `NO_REFERENCES`。

## Q5 — 后续清理条件判断

**分类：`UNKNOWN_DO_NOT_TOUCH`。** 目前不足以满足单独清理提案的门槛：

1. Phase13.3 任务相关性存在，但精确创建来源未证实。
2. 目标 `.git` 不存在且 registry prunable；这不是目录内容无用的证据。
3. 子项与唯一未归档证据未经检查，不能证明无证据损失。
4. 根路径 `lsof` 查询有限，外部引用与进程活跃状态未能穷尽。
5. 目录当前磁盘占用未测量。上一份报告记录的 `1,846,616,064 B`（约 1.72 GiB）来自超出当时授权范围的递归 `du`，本次不重复、不采信为经本次验证的容量，也不视作可安全回收空间。**经证明可安全回收：0 B / 未建立。**

建议保持原样，先由独立审查确认本报告及 Phase13.3 证据关系。之后如仍要考虑清理，须另行取得明确授权并制定单独、精确范围的执行方案；本报告不预先批准该方案。

## 执行范围与命令

只使用以下只读检查：

- 目标根和目标根 `.git` 的 `lstat`；仅在根 `.git` 为普通文件时，才允许以 no-follow 方式读取 gitdir 指针。本次 `.git` 不存在。
- `git -C "$HARNESS_CHECKOUT" rev-parse HEAD`
- `git -C "$HARNESS_CHECKOUT" worktree list --porcelain`
- `lsof -nP -t "/private/tmp/dsh-harness-phase13-3-readiness"`（只针对精确根，无递归）
- 对已提交 Phase13.3/Codebase Audit 文档的有限 `rg` 检索；Risk Advisor Git baseline/status 查询。

没有递归扫描、`du`、`find`、`ls -R`、内容读取、安装、构建、测试、Harness/Agent/Provider 运行或进程启停。

## Git 与资产保护

- 起始同步后，Risk Advisor `HEAD = origin/main = 193953a795f46b835fb75fd005cda947b9957cae`，且 Freeze 前基线 `6fdb010b1c5e6f21b7b4b0c471b096ab0f1446fa` 是其祖先。
- Harness `HEAD = ddefc45fbc7f8e46dd73185e68295696d1297887`；检查到的唯一预存未跟踪项是符号链接 `deepseek-harness`，没有跟随或修改其目标。
- Risk Advisor 现有未跟踪 `.vitest-cache/`、`lib/`、`node_modules/` 和 tarball 保持不变。
- 本次仅新增此脱敏 Markdown 报告；未触碰 Profile、备份、Harness 工作目录或其它项目。

**NO CLEANUP PERFORMED.**
