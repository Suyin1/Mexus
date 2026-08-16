# Mexus 中文版

> 本文件是 [README.md](./README.md) 的中文汉化版，面向中文使用者。
> 英文原版请见 [README.md](./README.md)。
> 本分支（`i18n/zh-cn`）已将 **Web 界面、CLI 命令输出与 Hub 控制台** 汉化为中文。

**M.E.X.U.S. = Multi-agent Execution Unified System（多智能体执行统一系统）**

Mexus 是多智能体开发的**执行层**。它将分散的 CLI AI Agent 整合为一个统一的本地系统：从一个操作台运行它们、观察它们的状态、审查它们的工作。

https://github.com/user-attachments/assets/1bde703f-dda8-4a83-9421-40e212c6aba1

---

## 📌 汉化说明

本分支（`i18n/zh-cn`）基于 `main` 分支的英文版本做了界面汉化，与英文原版的差异如下：

| 范围 | 状态 |
|---|---|
| Web 控制台界面（工作区 / Hub / Mission 面板、设置、对话框等全部用户可见文案） | ✅ 已汉化 |
| `mexus` CLI 命令帮助与输出（start / init / status / stop / hub / pane / mission） | ✅ 已汉化 |
| Hub 终端控制台（ink 仪表盘）与服务端日志 | ✅ 已汉化 |
| **协议层**（WS 事件名、pane 状态值、`[Mission Inbox]` 注入消息、Mission Markdown 标记 `To Claim / In Progress / Done`、yaml 字段、Agent 指令） | 🔒 保持英文（汉化会破坏解析与 Agent 协作） |
| 技术名词（`Agent`、`Hub`、`Kanban`、`Provider`、`Worktree`、`Mission` 等） | 🔒 保持英文（通用技术术语） |

> 想跟随 `main` 分支的英文更新：`git checkout i18n/zh-cn && git merge main`
> 想合并回主线：在 GitHub 上基于 `i18n/zh-cn` 创建 Pull Request 即可。

---

## 当前特性

### 🖥️ 多智能体执行
- 支持多种 Agent：Claude Code、OpenCode、Aider、Codex、Gemini
- 每个 Agent 以受管执行面板（pane）运行
- 创建、关闭、重启、恢复 Agent 执行
- 实时状态指示（运行中 / 等待中 / 空闲 / 已停止 / 错误）
- 底部浮动 Shell 终端，随时可用

### 🔀 Git Worktree 隔离
- 每个 Agent 可在独立的 Git worktree 中工作
- 在独立分支上并行开发，互不冲突
- 面板头部显示分支名与文件改动数

### 📊 运行时观测
- 自动解析 Claude Code statusline 获取运行时信息
- 实时显示模型名称、上下文使用率 %、累计费用、会话 ID
- Agent 状态持久化在 `.nexus/` 下，保证本地会话连续性

### 📁 统一审查面
- 实时文件树，自动检测变更（chokidar）
- 内置代码查看器，Shiki 语法高亮
- Git diff 面板，支持仓库级变更检查

### ⌨️ 快捷键与命令面板
- `Cmd/Ctrl+K` — 打开命令面板
- `Cmd/Ctrl+N` — 新建 Agent 执行面板
- `Cmd/Ctrl+1-9` — 切换执行面板
- `Cmd/Ctrl+G` — 打开 Git diff
- 通过命令面板切换主题

### 🎨 主题与布局
- 可拖拽四栏布局：侧边栏 / Agent 面板区 / 编辑器 / 文件树
- 7 套内置主题：Dark IDE、GitHub Dark、Dracula、Tokyo Night、Catppuccin、Nord、Light IDE
- 大屏响应式缩放

### 📝 配置
- 全局（`~/.nexus/config.yaml`）与项目级 YAML 配置
- 每个 Agent 独立的工作目录与任务描述
- 会话启动模式：新会话或恢复指定历史会话

> 部分内部路径与兼容标识符仍沿用历史上的 Nexus 名称，保持不变以兼容既有项目与本地配置。

---

## 安装与使用

### 全局安装（发布版）

```bash
# 全局安装
npm install -g mexus-cli

# 推荐：启动 Mexus Hub
mexus hub

# 直接启动单个工作区
mexus

# 以指定项目路径启动单个工作区
mexus ~/projects/my-app

# 初始化项目配置
mexus init ~/projects/my-app

# 查看工作区状态
mexus status

# 停止服务
mexus stop

# 自定义端口
NEXUS_PORT=8080 mexus

# 自定义 Hub 端口
NEXUS_HUB_PORT=8081 mexus hub
```

### 从源码运行汉化版（本分支）

> ⚠️ **Windows 用户注意**：项目 npm 脚本（`pnpm dev` 等）使用了 `$PWD` 等 bash 语法，在 Windows 的 cmd / PowerShell 下会失败。请使用下面的「方式 A」，或在 Git Bash / WSL 中运行。

**方式 A：直接启动（Windows PowerShell 推荐）**

```powershell
cd E:\ai\Mexus\Mexus          # 换成你的项目路径
$env:NEXUS_PROJECT_DIR = $PWD
npx tsx packages/server/src/cli.ts
```

启动后自动打开浏览器 → **http://localhost:7700**（中文界面）。

**方式 B：启动 Hub（多工作区管理）**

```powershell
$env:NEXUS_PROJECT_DIR = $PWD
npx tsx packages/server/src/cli.ts hub
```

→ **http://localhost:7600**（Hub 中文仪表盘）。

**方式 C：Git Bash / WSL（标准开发模式）**

```bash
cd /path/to/Mexus
npx pnpm dev        # 构建前端并启动服务
npx pnpm dev:full   # 前后端并行热更新
```

### CLI 命令（汉化版输出示例）

```bash
# 查看工作区状态（输出已汉化）
npx tsx packages/server/src/cli.ts status
# → 工作区: my-app
# → 执行面板: 3

# 初始化配置
npx tsx packages/server/src/cli.ts init .
# → 已在 ... 中初始化 .nexus/

# 查看 Mission 列表
npx tsx packages/server/src/cli.ts mission list
```

### 开发

```bash
# 安装依赖
pnpm install

# 开发模式（先构建前端，再启动带 watch 的服务）
pnpm dev

# 完整开发模式（前后端并行热更新）
pnpm dev:full

# 生产构建
pnpm build

# 启动生产服务
pnpm start
```

---

## 技术栈

**后端**
- Node.js 22+、TypeScript、Fastify 5、@fastify/websocket
- node-pty（终端进程管理）
- chokidar（文件监听）、simple-git（Git 操作）

**前端**
- React 18、TypeScript、Vite 6
- Tailwind CSS v4、xterm.js、Zustand
- Shiki（语法高亮）、react-diff-view、cmdk

---

## 架构

```
浏览器（React + WebSocket）
    ↕
Node.js 服务（Fastify）
    ↕
CLI Agent 进程（node-pty）
```

---

## 中文文档

- **项目文档中心**：[docs/README.md](./docs/README.md) — 按读者分层（AI / 用户 / 开发者 / 维护者）的文档导航
- **AI Agent 快速接入**：[docs/ai/onboarding.md](./docs/ai/onboarding.md) — 项目地图、协议红线、开发命令
- **项目分析报告**：[docs/ai/project-analysis.zh-CN.md](./docs/ai/project-analysis.zh-CN.md) — 架构、模块、演进方向与改进建议
- **用户使用指南**：[docs/users/usage-guide.zh-CN.md](./docs/users/usage-guide.zh-CN.md) — 安装启动、Agent 配置（含多 opencode 管理）、FAQ
- 更详细的文档见 [doc_site 中文文档](./doc_site/docs/zh/index.md)（VitePress，含安装、快速上手、CLI、配置、快捷键、FAQ 等）

---

## 许可证

Copyright (c) 2026 yofine

基于 Apache License 2.0 许可。详见 [LICENSE](./LICENSE) 与 [NOTICE](./NOTICE)。

"Mexus" 与 "M.E.X.U.S." 是 yofine 的商标。Apache License 2.0 **不**授予使用这些名称的许可，Fork 版本必须改名。

---

## Star 历史

[![Star History Chart](https://api.star-history.com/image?repos=yofine/Nexus&type=date&legend=top-left)](https://www.star-history.com/?repos=yofine%2FNexus&type=date&legend=top-left)

<br/>
