# Mexus — AI Agent 快速接入指南

> 目标读者：**AI Agent**（Claude Code、Codex、OpenCode 等）或任何需要快速理解本项目的协作者。
> 本文是「一轮对话即可上手」的项目地图。详细开发规范见 [AGENTS.md](../../AGENTS.md)。

---

## 1. 项目一句话定位

**Mexus（M.E.X.U.S. = Multi-agent Execution Unified System）** 是一个本地 Web 控制台：把多个 CLI AI Agent（Claude Code、OpenCode、Codex、Aider、Gemini 等）整合进一个操作台，统一运行、观测状态、审查工作、按 Mission 协作。

- 入口：`mexus` CLI 命令 → 启动 Fastify 服务 → 自动打开浏览器
- 形态：**本地单机部署**（local-first），未来规划 Mexus Cloud
- 历史：原名 Nexus，内部路径（`.nexus/`、`@nexus/*`、`NEXUS_*`）沿用旧名以兼容既有项目

## 2. 技术栈速查

| 层 | 技术 |
|---|---|
| 后端 | Node.js 22+ / TypeScript（tsx 直跑）、Fastify 5、@fastify/websocket、node-pty、@parcel/watcher、simple-git、js-yaml、ink（Hub 控制台） |
| 前端 | React 18 / TypeScript / Vite 6、xterm.js、Zustand、Tailwind CSS v4、Shiki、react-diff-view、cmdk |
| 工程 | pnpm monorepo（`packages/*` + `doc_site` + `site`）、vitest 测试 |

## 3. Monorepo 代码地图

```
packages/
├── server/            # 后端核心（~84 文件）
│   └── src/
│       ├── cli.ts             # CLI 入口：start/init/status/stop/hub/pane/mission
│       ├── index.ts           # Fastify 服务编排、REST 路由、启动消息
│       ├── pty/               # PtyManager（node-pty 生命周期）、StatuslineParser、agentCommand
│       ├── workspace/         # WorkspaceManager（状态中心）、ConfigManager（yaml 配置）、AgentsYamlWriter、SessionDiscovery
│       ├── git/               # GitService、WorktreeManager（worktree 隔离/合并/丢弃）
│       ├── fs/                # FsWatcher（文件树监听）
│       ├── history/           # SessionRecorder（终端历史/回放）
│       ├── ws/                # WebSocket 事件路由 + 回放
│       ├── hub/               # Hub：多实例注册/启动/健康检查 + ink 控制台
│       ├── mission/           # Mission 系统：Service/Routes/Inbox 管线/Kanban/Roundtable Watcher/PaneNotifier
│       ├── runtime/           # AcpRuntime（Agent Client Protocol 运行时）
│       ├── session-bind/      # 插件环境注入 + session/token 存储
│       └── models/            # ModelConnectionTester（模型 Provider 连通性测试）
├── web/               # 前端（~108 文件）
│   └── src/
│       ├── components/        # WorkspaceApp/HubApp/AgentPane/Terminal/FileTree/GitDiffPanel/missions/...
│       ├── components/ui/     # 自研 UI Kit（presentational 组件）
│       ├── stores/            # Zustand：workspaceStore/connectionStore/missionStore/terminalRegistry
│       ├── hooks/             # useWebSocket（指数退避重连）、useKeyboardShortcuts
│       └── lib/               # apiBase/terminalCommands/agentTerminalRuntime/...
├── mexus-terminal/     # 抽离的终端运行时包
├── mexus-ui/           # 纯展示组件包（落地页/mock 数据驱动）
├── mexus-plugin/       # Claude Code 运行时插件（session-start hook + Mission Inbox 唤醒）
├── plugin-agent-team/  # Markdown-only Agent Team 插件（mission-create/dispatch 等 skills）
├── file-tree/          # 抽离的文件树包
└── diff-viewer/        # 抽离的 Diff 展示包
```

## 4. 核心架构与数据流

```
浏览器（React + WebSocket）
    ↕  WS: terminal.input/output、pane.*、fs.tree、git.diff、mission.*
Node.js 服务（Fastify + @fastify/websocket）
    ↕  node-pty spawn
CLI Agent 进程（claude / opencode / codex / ...）
```

**关键设计决策**（详见 AGENTS.md）：
1. **Shell 套壳启动** — 不直接 spawn Agent CLI，先起 shell（800ms 后发命令），保证 shell 环境加载
2. **终端输出旁路 React** — 全局 `Map<paneId, writeFn>`，WS 数据直写 xterm
3. **Set-based 多客户端事件** — 每个 WS 客户端独立注册/注销监听
4. **agents.yaml 互感知** — 状态防抖写入 `.nexus/agents.yaml`，Agent 可互相感知
5. **StatuslineParser** — 从 Claude Code 输出提取 model/session_id/cost 等元数据

## 5. ⚠️ 协议红线（修改时务必遵守）

以下内容属于**协议/存储层，保持英文，禁止汉化或改写**（破坏了会引发解析错误或协作失效）：

- **WS 事件名**：`terminal.input`、`pane.status`、`fs.tree`、`git.diff` 等（见 `types.ts`）
- **pane 状态值**：`running` / `waiting` / `idle` / `stopped` / `error`
- **Agent 类型**：`claudecode` / `opencode` / `codex` / `kimi-cli` / `qodercli` / `__shell__`
- **Mission Markdown 标记**：`To Claim` / `In Progress` / `Done`、`To:` / `From:` / `Scope:`、`Mission:` / `Lifecycle:` 等（missionParsers 解析依赖）
- **Mission Inbox 注入消息**：`[Mission Inbox]` 前缀（Agent 侧 skill 匹配此前缀）
- **yaml 字段**：`.nexus/config.yaml`、`agents.yaml`、`~/.nexus/config.yaml` 的字段名
- **发给 Agent 的 prompt 模板**（`pty/agentCommand.ts`、`AddPaneDialog.buildPaneMission`）

## 6. 接入自定义 Agent（配置）

Mexus 内置 5 种 Agent 自动检测（claudecode/codex/opencode/kimi-cli/qodercli，检测对应 bin 是否在 PATH）。**其他任何 CLI Agent 都可通过全局配置接入**（`~/.nexus/config.yaml` 的 `agents:` 块），例如自研 WebAgent：

```yaml
agents:
  webagent:
    bin: webagent          # 启动命令名或完整路径
    continue_flag: ""      # 续跑参数（如 "--continue"）
    resume_flag: ""        # 恢复会话参数（如 "--resume <id>"）
    yolo_flag: ""          # 跳过权限确认参数
    default_args: []       # 固定附加参数
    statusline: false      # 是否支持 statusline 元数据
    transport: pty         # pty | acp
    env: {}                # 注入的环境变量
```

- `checkAgentAvailability`（`workspace/ConfigManager.ts`）会合并检测配置中的自定义 agent；`/api/agents` 返回全部（内置+自定义）
- 前端新建面板的 Agent 列表从 `/api/agents` 动态生成，自定义 agent 自动显示（图标回退为首字母标记，名称回退为 key）
- 创建校验：`pane/routes.ts` 以 `getAgentDefinition(agent)` 是否存在于配置为准，CLI `pane create --agent <key>` 同样可用

## 7. 汉化状态（i18n/zh-cn 分支）

| 范围 | 状态 |
|---|---|
| Web 界面 / CLI 输出 / Hub 控制台 | ✅ 已汉化为中文（`i18n/zh-cn` 分支） |
| 协议层（上节所列） | 🔒 保持英文 |
| 技术名词（Agent/Hub/Kanban/Mission/Provider/Worktree） | 🔒 保持英文 |

主分支 `main` 为英文原版；`i18n/zh-cn` 为汉化版。汉化分支同步 main：`git merge main`。

## 7. 常用开发命令

```bash
# 安装依赖（Windows：npx pnpm install；注意 node-pty 需要原生编译）
pnpm install

# 开发模式（注意：脚本含 $PWD bash 语法，Windows 用 Git Bash/WSL 或 npx tsx 方式）
pnpm dev            # 构建前端 + tsx 启动服务（端口 7700）
pnpm dev:full       # 前后端并行热更新

# 测试
pnpm --filter @nexus/server test        # server 测试（vitest）
pnpm --filter @nexus/web build          # web 构建（tsc -b + vite build）

# 构建/发布
pnpm build
pnpm release:patch | release:minor | release:major   # 版本发布（scripts/release.mjs）

# 直接启动（Windows PowerShell 推荐）
$env:NEXUS_PROJECT_DIR = $PWD
npx tsx packages/server/src/cli.ts      # 或 cli.ts hub 启动 Hub（端口 7600）
```

## 8. 测试约定

- server：`packages/server` 下 `npx vitest run`（35 个测试文件）
- web：`packages/web` 下 `npx vitest run`（18 个测试文件，renderToStaticMarkup 快照断言，不依赖 DOM）
- 注意：部分测试在 Windows 下因平台差异失败（路径分隔符 `\` vs `/`、`content-type` charset、chmod），与代码逻辑无关，可在 Unix 环境验证
- **改 UI 文本时**：若组件文本被测试断言（如 `data-tooltip="..."`、`toContain('...')`），需同步更新测试

## 9. 相关文档

- 开发规范 / UI 视觉规范：[AGENTS.md](../../AGENTS.md)
- 项目全景分析：[project-analysis.zh-CN.md](./project-analysis.zh-CN.md)
- 用户使用指南（含多 Agent 配置）：[users/usage-guide.zh-CN.md](../users/usage-guide.zh-CN.md)
- 中文完整文档：`doc_site/docs/zh/`
- 历史设计决策：`docs/superpowers/`（plans/specs）
