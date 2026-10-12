# Risk Advisor 外部开发产物只读盘点报告

**审计状态：** `RISK_ADVISOR_EXTERNAL_ARTIFACT_INVENTORY_BLOCKED`
**基线 / 审计代码 SHA：** `440a89f716b33baec21e1169cb73cce76d67075d`
**Harness 固定 SHA：** `ddefc45fbc7f8e46dd73185e68295696d1297887`
**日期：** 2026-10-12

## 结论

有限范围内的外部资产已完成只读盘点。未删除、移动或修改任何外部文件；未打开包、备份、日志或测试证据内容。只读取了冻结允许的包声明/锁条目元数据。未运行构建、安装、测试、Harness、Agent、Provider 或浏览器。现有 `web` Profile 当前选择 Delivery2 Risk Advisor 包；Profile 备份、历史安装包和 Campaign/Full 证据均有明确保留理由。没有足够证据把任何候选认定为可清理项，故估算可回收空间为 **0 bytes**。本报告不授权清理。

本次审计标记为 **BLOCKED**，因为核验过程中发生了两项有界的范围偏离，详见“范围偏离”。它们没有读取文件内容或修改数据，但不能声称 S1 的严格范围完全遵守。已停止对这些范围的进一步检查；本报告完整记录所见事实供独立审查。

## S0–S4 Gate

| Gate | 结果 | 证据 / 限制 |
|---|---|---|
| S0 基线与保护 | PASS | `HEAD = origin/main = git ls-remote origin main = 440a89f716b33baec21e1169cb73cce76d67075d`；Freeze 前置 SHA `c9aa537927b1b0b78713d1f8477d19984b0fabb4` 是其祖先。Risk Advisor 主仓库 tracked 状态干净；已有未跟踪 `.vitest-cache/`、`lib/`、`node_modules/`、tarball 保持不变。Harness 固定 SHA 的 tracked tree 干净，现有未跟踪 `deepseek-harness` 符号链接保持原样。 |
| S1 有界路径 | BLOCKED | 主要检查仅限 Freeze 指定路径；但发现并记录了两项只读元数据范围偏离，见下文。没有继续扩展读取。 |
| S2 逐项分类 | PASS WITH LIMITATIONS | 表中列出路径别名、对象类型、大小、mtime、来源/用途、已知引用和保守分类。未读取备份、日志、Session、对话、凭据、Profile state 或其它插件内容。进程句柄未作穷举检查，因此不能据此认定无人使用。 |
| S3 汇总 | PASS WITH LIMITATIONS | 分类总量是 `du -sk` 分配空间估算与普通文件 `lstat.st_size` 的非重叠合计；存在块取整误差。未证明任何可回收项。 |
| S4 报告 | PASS | 本次仅新增本报告；提交前将复核 docs-only 差异，提交并推送 main 后核验远端 SHA。 |

## 范围与方法

检查范围按 Freeze 限定为：`~/.dsh/artifacts/risk-advisor/`、`~/.dsh/backups/risk-advisor/`、Web Profile 中已知的 Risk Advisor 包及必要声明/锁元数据、已记录的插件管理操作日志路径、`/private/tmp` 和当前 `$TMPDIR` 的已知 Phase/Risk Advisor 前缀，以及 Harness 插件目录与固定 Harness 的直属名称/Git 元数据。使用 `lstat`、目录项元数据和 `du -sk` 估算，不跟随符号链接。报告中的 `~`、`$TMPDIR` 和 `<run>` 是路径脱敏别名，不应据此推断私有随机标识。

**未检查**全盘、个人文件夹、浏览器数据、全局缓存内容、插件包内容、备份内容、日志内容或用户会话。Profile package/lock 仅读取 Risk Advisor 声明与对应锁条目；Profile workspace state、`.modules.yaml` 和管理器日志只取路径/类型/大小/时间元数据。

### 范围偏离

1. 在 Profile 元数据核验中，曾枚举 `~/.dsh/profiles/web` 根目录的直属名称和基础 stat，超出了 Freeze 仅允许已知 Risk Advisor 包路径及声明/锁元数据的边界。未读取这些直属项目的内容；本报告不列出无关插件名或数据，且没有写入。
2. 对已知的 `/private/tmp/dsh-harness-phase13-3-readiness` Harness 临时 worktree，盘点脚本对该目录运行了 `du -sk`，导致递归遍历其目录元数据以求空间估算。Freeze 对 Harness 只允许直属名称与 Git 元数据；这次递归超出该限制。没有读取文件内容、打开文件或修改目录。`git worktree list` 显示它是固定 Harness SHA 的历史 checkout，登记状态为 prunable（gitdir 指向不存在的位置），但目录仍存在。其测得的约 1,846,616,064 bytes 不纳入 Risk Advisor 分类总量，亦不构成清理建议。

## 外部资产清单

大小口径：目录为 `du -sk` 的 KiB 分配量换算，普通文件为 `lstat.st_size`。时间均为 UTC。除“已核对不存在”外，下表对象均存在；已检查对象是 uid 501 拥有的普通文件/目录，未发现符号链接。`UNKNOWN_DO_NOT_TOUCH` 表示没有足够证据判断其可丢弃性；不等于无用。

### Web Profile 与包工件

| 脱敏路径 | 类型 / 当前观测 | 来源、用途与引用 | 分类 / 信心 |
|---|---|---|---|
| `~/.dsh/profiles/web/node_modules/@dhandil/dsh-risk-advisor/` | 普通目录，约 1,253,376 B；mtime 2026-10-12 00:37:36Z | 当前安装包。Profile `package.json`、`pnpm-lock.yaml` 与 `node_modules/.pnpm/lock.yaml` 的 Risk Advisor 条目均指向 Delivery2 tarball；历史 Delivery2 报告记录安装文件与 tarball 匹配。此次未重新读取包内容或重算 bundle hash。实时进程引用未验证。 | `KEEP_ACTIVE` / HIGH |
| `~/.dsh/artifacts/risk-advisor/<delivery2-run>/dhandil-dsh-risk-advisor-0.1.0-r1.tgz` | 普通文件，203,161 B；父目录约 204,800 B；mtime 2026-10-12 00:36:53Z | 当前 Profile package/lock 的本地 tarball 来源。历史 Delivery2 报告记录 tarball SHA-256 `4ed4e14ba98673dc267da6ba6b80c519b32fa553dcc04517dd892caf36d28501`。本次仅核路径、锁引用与 stat，未重算内容 hash。 | `KEEP_ACTIVE` / HIGH |
| `~/.dsh/profiles/web/{package.json,pnpm-lock.yaml,node_modules/.pnpm/lock.yaml,node_modules/.modules.yaml,node_modules/.pnpm-workspace-state-v1.json,pnpm-workspace.yaml}` | 文件，分别 402、1,896、1,896、862、900、61 B；除 workspace YAML 外，mtime 2026-10-12 00:37:36Z | 声明/锁及包管理器状态元数据。Risk Advisor 锁项含 tarball integrity `sha512-d1YJx0M/QO5zX1AOqnRFxz9u3e0JBT/sIYDhlSZ9VTmRxyW9aSs0lJFQD9ZuH2dWKaML+DDzMP8R2PgNUVaigw==`。state 内容未读；历史 custody 报告说明其原始字节恢复限制，属于受保护管理状态。 | `KEEP_ACTIVE` / HIGH |
| `~/.dsh/profiles/web/.plugin-manager/logs/<known-operation>/pnpm.log` | 普通文件，0 B | 已知 Delivery2 管理器操作日志路径；内容未读。路径来自既有脱敏执行报告。 | `KEEP_EVIDENCE` / MEDIUM |
| `~/.dsh/artifacts/risk-advisor/<phase15-3c-delivery1>/dhandil-dsh-risk-advisor-0.1.0-r1.tgz` | 普通文件，202,851 B；父目录约 204,800 B；mtime 2026-10-11 10:29:16Z | 历史 Web Delivery1 回滚包。Freeze/执行报告将旧包列为保护资产；历史 SHA-256 `01a1dec387dde762293874cde6e024af6d57287a27082add349309f3623e37d3`。 | `KEEP_ROLLBACK` / HIGH |
| `~/.dsh/artifacts/risk-advisor/<phase13-web-reconcile>/dhandil-dsh-risk-advisor-0.1.0-r1.tgz` | 普通文件，158,005 B；父目录约 159,744 B；mtime 2026-10-08 06:17:10Z | 历史 Web Profile reconciliation 报告将其列为当时被选包，并记录包与安装 Host/Client 的 hash 比对。当前 Profile 已改指 Delivery2；历史用途明确，不能按当前未选中推断为垃圾。 | `KEEP_EVIDENCE` / HIGH |
| `~/.dsh/artifacts/risk-advisor/v1-ux/<rejected-candidate>/` | 普通目录，约 143,360 B；内含 tarball 115,285 B 及候选/审查元数据；mtime 2026-10-06 | 路径 keyed by 被拒绝候选 SHA；保存候选与 Profile 安装前状态证据。未读取元数据或 tarball 内容。 | `KEEP_EVIDENCE` / MEDIUM |
| `~/.dsh/artifacts/risk-advisor/v1-ux-compact-risk-indicator/<candidate>/` | 普通目录，约 143,360 B；内含 tarball 117,347 B 及安装证据元数据；mtime 2026-10-06 | Phase 13.3 stale-client 审查明确引用该旧包并用其解释旧 Client 状态。不是当前 Client；对历史归因仍有价值。 | `KEEP_EVIDENCE` / HIGH |

以上两个 V1 工件目录中额外读取的只是直属名称和 stat：`v1-ux/<rejected-candidate>/dhandil-dsh-risk-advisor-0.1.0-r1.tgz` 115,285 B（2026-10-06 08:30:00Z）、`candidate.json` 708 B、`review-target.json` 187 B、`approval-target/` 与 `profile-before-install/` 两个目录（均约 192–224 B directory-entry size，2026-10-06 08:29–08:34Z）；`v1-ux-compact-risk-indicator/<candidate>/dhandil-dsh-risk-advisor-0.1.0-r1.tgz` 117,347 B（2026-10-06 10:05:17Z）、`profile-before-install/` 目录 224 B、`profile-install-evidence.json` 1,053 B（均 2026-10-06 10:07:36Z）。未读取这些文件内容；目录分配总量按上表，不重复计算子项。

### Profile 回滚目录

以下备份仅检查目录 stat、所有者和大小；未列举或打开内部文件。历史 manifest SHA 来自已提交报告，不是本次重新计算。

| 脱敏路径 | 大小 / mtime | 来源与引用 | 分类 / 信心 |
|---|---:|---|---|
| `~/.dsh/backups/risk-advisor/<phase15-2b-run>/` | 4,087,808 B；2026-10-11 05:25Z | Phase15.2B Web Profile 备份；历史 manifest SHA `8ae9d01c441ed5ca6adf9d19b53668bfe5e8f1d3f3f65826b377a77c7826bae4`。 | `KEEP_ROLLBACK` / HIGH |
| `~/.dsh/backups/risk-advisor/<phase15-3c-delivery1-run>/` | 1,318,912 B；2026-10-11 10:28Z | Web Delivery1 Profile 备份；历史 manifest SHA `8c48413b448a543ab33922c6c476d93f4dcc474fd35dbe2487f5099c9ffa138a`。 | `KEEP_ROLLBACK` / HIGH |
| `~/.dsh/backups/risk-advisor/<phase15-3e-delivery1-run>/` | 1,306,624 B；2026-10-11 12:09Z | Delivery1 在 P1 阻塞时建立的 Profile 备份；历史 manifest SHA `7b12a9418109e99cbebbb5f2e1ab02562f19aecb64532b469c3339d4886471f9`。 | `KEEP_ROLLBACK` / HIGH |
| `~/.dsh/backups/risk-advisor/<phase15-3e-delivery2-run>/` | 1,310,720 B；2026-10-12 00:36Z | 当前 Delivery2 回滚依据；历史 manifest SHA `0b9d24e6fff88d07a44f57679bee1a8975cbecde5c4a272cba40f65078b3e841`。 | `KEEP_ROLLBACK` / HIGH |

### `$TMPDIR` 下的 Risk Advisor Phase13 数据

目录均为用户拥有的普通目录；只检查指定顶层 RA 前缀及这些 RA 专用根的直属子目录元数据。根目录空间已包含其子项，统计时不重复累加子目录。

| 路径 | 根目录大小 / mtime | 直属子项（路径尾段；各项均为目录） | 来源 / 分类 |
|---|---:|---|---|
| `$TMPDIR/dsh-risk-advisor-phase13/` | 2,891,776 B；2026-10-08 01:27:07Z | 子目录大小/mtime：`phase13-2-lane-a-canonical-v1` 40,960 B / 2026-10-07 07:59:45Z；`phase13-2-lane-a-freeze-v1` 376,832 B / 07:55:17Z；`phase13-campaign2-evidence-recovery-v1` 4,096 B / 11:06:37Z；`phase13-lane-a-canonical-v2` 12,288 B / 10:14:25Z；`phase13-lane-a-canonical-v2-freeze` 397,312 B / 10:08:56Z；`phase13-lane-a-canonical-v2-replay-check` 401,408 B / 10:10:31Z；`phase13-lane-a-canonical-v3` 1,626,112 B / 12:29:01Z；`phase13-real-agent-canonical-v3` 0 B / 2026-10-08 01:09:42Z；`phase13-real-agent-canonical-v4` 32,768 B / 01:33:05Z | Manifest/replay/campaign 数据对应已提交 Phase13 执行记录；直属子项均为目录。`KEEP_EVIDENCE` / HIGH |
| `$TMPDIR/dsh-risk-advisor-phase13-3-evidence/` | 12,288 B；2026-10-07 13:38:00Z | `phase13-real-agent-canonical-v1` 12,288 B；mtime 13:38:00Z | Campaign 证据，子项为目录。`KEEP_EVIDENCE` / HIGH |
| `$TMPDIR/dsh-risk-advisor-phase13-campaign3-evidence/` | 761,856 B；2026-10-07 12:24:27Z | `phase13-lane-a-canonical-v3` 761,856 B；mtime 12:29:33Z | Phase13.2 Campaign-3 报告引用的 evidence root，子项为目录。`KEEP_EVIDENCE` / HIGH |
| `$TMPDIR/dsh-risk-advisor-phase13-evidence/` | 69,632 B；2026-10-08 00:54:36Z | `phase13-real-agent-canonical-v2` 28,672 B / 2026-10-07 14:11:33Z；`phase13-real-agent-canonical-v3` 40,960 B / 2026-10-08 01:09:42Z | Campaign evidence，子项为目录。`KEEP_EVIDENCE` / HIGH |
| `$TMPDIR/dsh-risk-advisor-phase13-vitest-cache-v1/` | 4,096 B；2026-10-07 06:44:49Z | `vitest/` 4,096 B；mtime 06:44:49Z | 可重建缓存，但当前使用/句柄及唯一性未核实；内容未读。子项为目录。`UNKNOWN_DO_NOT_TOUCH` / LOW |

### `/private/tmp` 中的有界条目

| 路径 | 大小 / mtime | 来源、引用及进程状态 | 分类 / 信心 |
|---|---:|---|---|
| `/private/tmp/phase13-real-harness-observational-v1/` | 147,456 B；2026-10-08 02:51Z | 历史 Real Harness Observational Campaign 目录；关联报告存在。进程引用未穷举。 | `KEEP_EVIDENCE` / HIGH |
| `/private/tmp/phase13-real-harness-observational-v2/` | 212,992 B；2026-10-08 03:15Z | 历史 Campaign V2 目录；关联报告存在。进程引用未穷举。 | `KEEP_EVIDENCE` / HIGH |
| 六个 Phase14 Full 日志：`phase14-4-full-58a275f.log`、`phase14-4-repair1-full-ecf84c2.log`、`phase14-6-evidence-repair1-full-ab3e17c-attempt1.log`、`phase14-6-full-20261010-a5cd0bc-attempt1.log`、`phase14_2_full_73cdecf.log`、`phase14_2_repair1_full_ab0aeec.log` | 合计 73,168 B；2026-10-10 | 已提交 Phase14 执行报告引用这些 Full 日志名/运行；日志内容未读。 | `KEEP_EVIDENCE` / HIGH |
| Phase13 V3/V4 临时流程脚本：`phase13-3-real-agent-v3-generate.mjs` (10,473 B)、`phase13-3-real-agent-v3-preflight.mjs` (6,127 B)、`phase13-3-real-agent-v4-generate.mjs` (12,182 B)、`phase13-3-real-agent-v4-preflight.mjs` (10,067 B)、`phase13-v3-campaign.mjs` (42,054 B)、`phase13-v3-canonical-readiness.mjs` (9,012 B)、`phase13-v3-tsconfig.json` (38,006 B)、`phase13-v4-campaign.mjs` (40,866 B)、`phase13-v4-canonical-readiness.mjs` (10,454 B)、`phase13-v4-dependency-preflight.mjs` (3,015 B)、`phase13-v4-paths.mjs` (2,786 B) | 合计 185,042 B；mtime 2026-10-08 | 名称显示 Phase13 任务来源，但没有在限定报告检索中找到逐文件归档/引用；未读内容。 | `UNKNOWN_DO_NOT_TOUCH` / LOW |
| `/private/tmp/phase13-real-agent-v3-manifest-first-run.json` | 9,578 B；2026-10-08 00:54Z；权限 0600 | 任务名明确但具体用途/外部引用未能由文档确认；内容未读。 | `UNKNOWN_DO_NOT_TOUCH` / LOW |
| `phase14_2_repair1_p14_2_focused.log`、`phase14_2_repair1_package.json`、`phase14_2_repair1_regression.log` | 合计 5,796 B；2026-10-10 | Phase14.2 相关临时文件，但所检阅报告未逐文件引用；JSON/log 内容未读。 | `UNKNOWN_DO_NOT_TOUCH` / LOW |
| `/private/tmp/dsh-harness-phase13-3-readiness/` | 本次 `du` 观测约 1,846,616,064 B；目录 mtime 2026-10-11 | Harness Git 元数据将它列为固定 Harness SHA 的历史 worktree，注册因 gitdir 缺失而 prunable；不是已确认的 RA 独有资产。此次递归 `du` 超范围（见偏离），未检查内容。不得清理或计入 RA 可回收量。 | `OUT_OF_SCOPE_NEEDS_AUTHORIZATION` / LOW |

`/private/tmp` 上述日志与脚本/manifest 的 mtime（2026-10-10 或 2026-10-08 UTC）均逐项由 `lstat` 获取；其具体时间分别为：Phase14 Full 日志 07:04:10、07:46:47、11:52:02、10:47:17、02:41:17、03:14:39Z；Phase13 脚本依报告表列顺序为 01:07:14、01:07:28、01:28:01、01:29:39、01:07:18、00:56:45、01:09:32、01:32:36、01:32:07、01:26:40、01:28:42Z，V3 manifest 为 00:54:38Z；三项未逐文件引用的 Phase14.2 临时文件分别为 03:03:28、03:05:33、03:04:34Z。所有这些时间的日期均为相应表中注明日期。

### 已核对不存在的历史临时根

以下精确已知路径当前 `lstat` 为不存在；不据此推断其它未列路径不存在：

- `/private/tmp/ra-phase15-3e-repro-repair1-r1.VYF2Vi`
- `/private/tmp/ra-phase15-3e-repro-repair1-r2.NHCDo8`
- `/private/tmp/phase15-3e-delivery2-build`
- `$TMPDIR/phase15-3e-delivery2-7uxom1lz`
- `$TMPDIR/phase15-3e-repro-repair1-r1.VYF2Vi`
- `$TMPDIR/phase15-3e-repro-repair1-r2.NHCDo8`

历史 Delivery2/Repair1 报告也记录其任务专属临时根清理并核验不存在。当前限定前缀检查未发现新的 `$TMPDIR/dsh-risk-advisor*` 根之外其它 RA 命名根。

## 分类空间估算

| 分类 | 非重叠估算 | 说明 |
|---|---:|---|
| `KEEP_ACTIVE` | ~1,464,193 B | 已安装包约 1,253,376 B、活动 tarball 所在目录约 204,800 B、声明/锁/状态元数据约 6,017 B。 |
| `KEEP_ROLLBACK` | ~8,228,864 B | 四个 Profile 备份目录约 8,024,064 B，加 Phase15.3C 回滚 tarball 目录约 204,800 B。 |
| `KEEP_EVIDENCE` | ~4,615,632 B | 历史 artifacts 目录约 446,464 B；TMPDIR campaign roots 约 3,735,552 B；两份真实 Harness observation 约 360,448 B；Full 日志 73,168 B。 |
| `UNKNOWN_DO_NOT_TOUCH` | ~204,512 B | 未归档流程脚本/manifest 194,620 B、未逐文件引用的测试文件 5,796 B、Phase13 Vitest cache 4,096 B。 |
| `KEEP_SHARED` | 0 B 计入 | 本报告没有确认可独立归属 Risk Advisor 的共享缓存。全局共享缓存未扫描。 |
| `POSSIBLE_TASK_TEMP` | 0 B | 无条目通过正向归属、无引用及无未保存证据的清理门槛。 |
| `NOT_PRESENT` | 0 B | 上节列出的已核对临时路径不存在。 |
| `OUT_OF_SCOPE_NEEDS_AUTHORIZATION` | 未计入 | Harness readiness 临时 worktree；非已确认 RA 独有资产，保留。 |
| 可回收候选 | **0 B** | 没有条目同时满足来源明确、无未保存内容、无 Profile/进程/测试/回滚/证据引用。 |

以上总量不包含超出范围的 Harness 临时 worktree、用户主仓库未跟踪文件、全局缓存或未盘点的其他项目；`du -sk` 有 1 KiB 取整和目录块分配差异。

## 保护与限制

- 未检查 Web Profile 的凭据、Session、对话、memory/storage 或其它插件内容；也未检查 Web Host 进程状态。当前安装身份来自 Profile/lock 声明与历史 Delivery2 执行报告，不代表本次证明了运行时激活。
- 未枚举备份内部文件或读取日志/Manifest 内容。旧包是否被正在运行的进程持有未被穷举证明；基于历史用途一律保留。
- Risk Advisor 项目根中现有 `.vitest-cache/`、`lib/`、`node_modules/` 和未跟踪 tarball 不属于本次外部清理目标，保持原样。
- `~/Developer/Harness/harness-plugin/` 的限定直属名称/Git 元数据未发现其它 RA sibling worktree；其它项目、个人目录、Docker、浏览器、Archives 和全局缓存均未检查。Harness checkout 中发现预存的未跟踪 `deepseek-harness` 符号链接，未读取其目标、未跟随或修改。
- 本报告不提出清理动作。任何后续清理都需在消除范围不确定性并获得单独授权后按精确路径规划。

## 变更与远端核验

本次只新增本报告，不改产品、测试、配置、用户 Profile 或外部资产。提交前基线核验为 `HEAD = origin/main = git ls-remote = 440a89f716b33baec21e1169cb73cce76d67075d`。报告提交及推送后将在此处补记报告提交 SHA、最终 main SHA、远端对齐结果与 docs-only 检查结果。
