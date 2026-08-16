# Mexus 项目分析报告（中文）

> 本文档是对 Mexus 项目的全景分析，供开发者、维护者、新成员快速了解项目全貌。
> 基于对代码库（`main` 分支）的静态分析整理，编写于汉化工作期间。

---

## 一、项目概览

**Mexus（M.E.X.U.S. = Multi-agent Execution Unified System）** 是一个**本地多 Agent 执行管理控制台**：把散落的 CLI AI Agent（Claude Code、OpenCode、Aider、Codex、Gemini）统一管理起来，从一个浏览器操作台同时运行、观察状态、审查它们的工作。

| 维度 | 内容 |
|---|---|
| 当前版本 | 3.7.0（根包 `mexus-cli`） |
| 定位 | 单 Repo 多 Agent 并行协作、任务分发、代码 Review 的「执行层」 |
| 入口 | `mexus` / `nexus` CLI 命令，自动拉起 Fastify 服务并打开浏览器 |
| 历史沿革 | 原名 **Nexus**，已改名 Mexus；内部路径（`.nexus/`）、包名（`@nexus/*`）、环境变量（`NEXUS_*`）仍保留旧名以兼容既有项目 |
| 许可证 | Apache-2.0（"Mexus" 商标保留，Fork 必须改名） |
| 远程仓库 | https://github.com/Suyin1/Mexus.git |

## 二、技术栈

**后端**：Node.js 22+ / TypeScript（tsx 直跑）、Fastify 5 + @fastify/websocket、node-pty（进程管理）、@parcel/watcher / chokidar（文件监听）、simple-git、js-yaml、ink（Hub 控制台）

**前端**：React 18 / TypeScript / Vite 6、xterm.js、Zustand、Tailwind CSS v4（CSS-first）、Shiki（语法高亮）、react-diff-view、cmdk（命令面板）

**工程化**：pnpm monorepo（`packages/*` + `doc_site` + `site`）、tsx 直接运行 TS、生产构建产物 `dist/cli.mjs`、vitest 测试（server 35 / web 18 / terminal 8 个测试文件）

## 三、Monorepo 结构（9 个包）

| 包 | 规模 | 职责 |
|---|---|---|
| `packages/server` (@nexus/server) | 84 文件 / ~12,000 行 | 后端核心：PTY 管理、状态中心、配置、Git、文件监听、历史、Hub、Mission 系统、ACP 运行时、session-bind |
| `packages/web` (@nexus/web) | 108 文件 / ~14,900 行 | React 前端：Workspace 模式 + Hub 模式 + Mission 面板 + 自研 UI Kit（约 35 个基础组件） |
| `packages/mexus-terminal` (@mexus/terminal) | 26 文件 / ~2,300 行 | 从 server 抽离的终端运行时包（迁移中） |
| `packages/mexus-ui` (@mexus/ui) | 18 文件 / ~2,300 行 | 纯展示组件、mock 数据驱动，供落地页和未来托管产品复用 |
| `packages/mexus-plugin` (@mexus/plugin) | — | Claude Code 运行时插件：session-start hook 注入 Mission Inbox 唤醒信号；含 Kanban 看板 Web App |
| `packages/plugin-agent-team` (@mexus/plugin-agent-team) | — | Markdown-only 的 Agent Team 插件（mission-create/activate/archive/dispatch 等 skills） |
| `packages/file-tree` / `diff-viewer` | ~415 / ~152 行 | 新抽离的文件树、Diff 展示包 |
| `plugins/mexus-agent-team` (mexus-skill) | 13 文件 / ~1,400 行 | 独立 Markdown-only Agent Team 插件（Claude Code + Codex 通用） |

另有：`site/`（Astro 落地页）、`doc_site/`（VitePress 中英双语文档）、`docs/`（本文档体系 + superpowers plans/specs）、`design/`（19 份设计文档）、`agent-team/`（Mission 工作流 + 示例 mission）。

## 四、核心架构

```
Browser (React + WebSocket)  ←——→  Node.js Server (Fastify)  ←——→  CLI Agent 进程 (node-pty)
```

关键设计决策（AGENTS.md 记录）：
1. **Shell 套壳启动** — 不直接 spawn Agent CLI，先起 shell 等 800ms 再发命令，确保 shell 环境正确加载
2. **终端输出旁路 React** — 全局 `Map<paneId, writeFn>` 注册表，WS 数据直写 xterm
3. **Set-based 多客户端事件分发** — 每个 WS 客户端独立注册/注销监听器
4. **agents.yaml 互感知** — 所有 pane 实时状态防抖写入 `.nexus/agents.yaml`（500ms）
5. **StatuslineParser** — 从 Claude Code 终端输出提取 `model/session_id/cost_usd/context_used_pct` 元数据并剥离广播
6. **类型手动同步** — server/web 各维护一份 `types.ts`，无共享类型包

## 五、核心功能模块

- **多 Agent 执行**：pane 创建/关闭/重启/续跑，5 种状态（running/waiting/idle/stopped/error），底部浮动 Shell
- **Git Worktree 隔离**：每个 Agent 独立 worktree 并行开发，pane 头显示分支名与改动数
- **统一 Review 面**：实时文件树 + Shiki 代码查看器 + Git Diff 面板 + 注释回传
- **7 套主题** + 四栏可拖拽布局 + Cmd+K 命令面板
- **配置体系**：全局 `~/.nexus/config.yaml`（Agent CLI 定义）+ 项目 `.nexus/config.yaml`（panes）+ 运行时 `agents.yaml`
- **Hub（多工作区编排）**：扫描本机端口/实例、spawn/停止/健康检查多个 workspace server、反向代理进 Hub 仪表盘、ink 终端控制台
- **Mission / Agent Team（最新主线）**：以 Markdown 为状态的多 Agent 协作（mission/agents/kanban/roundtable/squad-lead 五文件），kanban+roundtable 监听器 → inbox → 向运行中的 Agent pane 注入 `[Mission Inbox]` 唤醒信号
- **AcpRuntime**：基于 Agent Client Protocol 的备选运行方式
- **session-bind**：插件环境注入 + session/token 存储，跨重启保持 Agent 会话连续性

## 六、最新发展方向（近 2 个月提交脉络）

1. **终端运行时抽包**（`mexus-terminal-runtime-package-design.md`）— terminal 运行时拆为独立包
2. **文件树包抽离**（`@mexus/file-tree`，倾向 trees.software 方案）
3. **Mission 系统持续演进**：Phase 5 A2A inbox 管线 → Phase 6 Agent Team 插件 + CLI/REST 基础
4. **Cloud Hub 方向**（草案）：本地离线版 + Mexus Cloud 双链路，`mexus connect` / `mexus cloud link` 桥接
5. **品牌重塑**：Mexus 品牌 topbar、落地页（Astro）、移动端布局设计
6. **稳定性与工程化**：CLI 自更新、WS 背压优化、稳定性审计、发布质量计划

## 七、工程实践亮点

- **文档文化极强**：设计先行（design/ + docs/superpowers 的 plans/specs），代码与文档配套
- **测试较扎实**：65 个测试文件（server 35、web 18、terminal 8），含 UI 组件测试、WS 回放测试、mission 解析测试、插件 smoke test
- **渐进式模块化**：monorepo 正在从单体 server/web 向可复用 npm 包演进（terminal、file-tree、diff-viewer、ui kit）
- **团队协作机制**：项目自用 Agent Team Mission 工作流（Ars Goetia 命名、roster 长期记忆、kanban 驱动），并沉淀为可复用插件

## 八、风险与改进建议

1. **命名双轨制**：Nexus/Mexus 混用贯穿包名、环境变量、目录名——对外发布（`@nexus/*`、`NEXUS_*`）会造成困惑，建议制定迁移路线图
2. **前后端类型手写双份**：协议改动需同时改两处，易漏改——抽共享 `@mexus/protocol` 类型包收益明确
3. **两个运行时并存**：shell-PTY（PtyManager）与 AcpRuntime 职责部分重叠，长期应明确唯一运行时
4. **Windows 支持偏弱**（已部分修复）：默认 shell、PATH 逻辑以 Unix/macOS 为主；`which` 检测 Agent 在 Windows 下失败的问题已在汉化分支修复（改用 `where`）；node-pty 在 Windows 需要原生编译
5. **版本号不一致**：根包 3.7.0 但子包仍为 0.1.0，且无 `.github` CI 配置——发布自动化已有雏形（scripts/release.mjs），建议补 CI
6. **克隆后需先构建**：node_modules、dist 均不入库，需 `pnpm install`（node-pty 需 Node 22+ 原生编译）

## 九、总结

Mexus 是一个**架构清晰、文档完备、功能完整的本地多 Agent 执行控制台**，已经从「终端管理器」进化为包含 **Hub 多实例编排 + Mission Markdown 协作系统 + ACP 运行时 + 插件生态**的平台。最有特色的资产：
- **Mission Inbox 注入机制**——让 CLI Agent 在运行中感知协作任务变化
- **深厚的文档/设计文化**——设计文档 + superpowers plans/specs 让项目历史可追溯
- **明确的产品演进路线**——local-first 离线版 → 包抽离 → Mexus Cloud 托管服务

当前处于「单体 → 多包 → 云产品」转型期，主要工程债集中在命名统一、类型共享、双运行时收敛和 CI 缺失。**从「抽共享类型包」或「terminal 运行时迁移收尾」入手是价值最高且风险可控的切入点。**
