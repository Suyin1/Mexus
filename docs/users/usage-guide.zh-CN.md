# Mexus 用户使用指南（中文）

> 面向使用 Mexus 管理多个 CLI AI Agent 的用户。本指南覆盖安装启动、Agent 配置、多 opencode 管理、CLI 命令与常见问题。
> 详细参考文档见 [doc_site 中文文档](../../doc_site/docs/zh/index.md)。

---

## 1. 快速启动

### 1.1 全局安装（发布版）

```bash
npm install -g mexus-cli
mexus               # 启动，自动打开浏览器 http://localhost:7700
mexus hub           # 启动 Hub（多工作区管理）http://localhost:7600
```

### 1.2 从源码运行（汉化版 i18n/zh-cn 分支）

> ⚠️ **Windows 注意**：项目 npm 脚本（`pnpm dev` 等）使用 `$PWD` 等 bash 语法，在 cmd/PowerShell 下会失败。请用方式 A，或在 Git Bash / WSL 中运行。

**方式 A：Windows PowerShell 直接启动**

```powershell
cd E:\ai\Mexus\Mexus            # 换成你的项目路径
$env:NEXUS_PROJECT_DIR = $PWD
npx tsx packages/server/src/cli.ts
```

**方式 B：Git Bash / WSL**

```bash
cd /path/to/Mexus
npx pnpm dev                    # 构建前端 + 启动服务
npx pnpm dev:full               # 前后端并行热更新
```

---

## 2. Agent 配置：理解「没有可用的已配置Agent」

### 2.1 这句话是什么意思？

当你在界面点击新建执行面板（`+` / `Cmd+N`），弹窗会向服务端请求 `/api/agents`，**只显示"已检测到已安装"的 Agent 类型**。如果列表为空，就会显示：

> 没有可用的已配置Agent

### 2.2 为什么会这样？

Mexus 通过检查 **Agent CLI 是否在你的 `PATH` 中**来判断可用性：

| Agent 类型 | 检测的二进制 | 安装方式示例 |
|---|---|---|
| Claude Code | `claude` | `npm install -g @anthropic-ai/claude-code` |
| Codex | `codex` | `npm install -g @openai/codex` |
| OpenCode | `opencode` | `npm install -g opencode-ai`（或官方安装方式） |
| Kimi CLI | `kimi` | `pip install kimi-cli` |
| Qoder CLI | `qodercli` | 见官方文档 |

出现「没有可用的已配置Agent」的常见原因：
1. **本机没有安装任何 Agent CLI**（最常见）——先安装你要用的 Agent
2. **⚠️ Windows 平台 bug（已修复）**：旧版本用 `which` 检测（Windows 没有此命令），导致全部判定为未安装。**汉化分支 `i18n/zh-cn` 已修复**（Windows 改用 `where`），更新到最新提交后重启服务即可
3. Agent 装了但不在 PATH 中（如手动解压的二进制）——把它加入 PATH，或手动配置（见 2.3）

### 2.3 如何手动配置 Agent（~/.nexus/config.yaml）

全局配置文件在 `~/.nexus/config.yaml`。自动检测不到的 Agent 可以手动添加：

```yaml
version: "1"

agents:
  opencode:
    bin: opencode                 # 二进制名或完整路径
    continue_flag: "--continue"   # 续跑会话用的参数
    statusline: false
    transport: pty                # pty 或 acp
    env:
      OPENAI_API_KEY: "${OPENAI_API_KEY}"   # 需要传给 Agent 的环境变量
```

修改后重启服务即可生效。

### 2.4 快速验证

```bash
# 查看本机安装了哪些 Agent CLI
where claude; where opencode; where codex    # Windows
which claude; which opencode; which codex    # macOS / Linux
```

---

## 3. 管理多个 OpenCode（核心教程）

### 3.1 前置条件

1. 安装 opencode：`npm install -g opencode-ai`（或官方方式）
2. 确认 `opencode` 命令可用（`where opencode` / `which opencode` 有输出）
3. 启动 Mexus（见第 1 节）

### 3.2 图形界面方式（推荐）

1. 打开浏览器 → http://localhost:7700
2. 点击左侧 `+`（或按 `Cmd/Ctrl+N`）打开「新建执行面板」
3. Agent 选择 **OpenCode**
4. 填写：
   - **名称**：如 `任务A-后端`、`任务B-前端`
   - **任务**：描述该 opencode 实例要做什么
   - **隔离模式**：`共享`（同一目录）或 `Worktree`（每个实例独立 Git worktree，互不干扰，推荐并行开发）
5. 点击「创建执行面板」

**重复上述步骤即可创建多个 opencode 实例**——每个实例是独立的 opencode 进程，有独立的终端、任务、状态，可同时运行、分别管理（重启/恢复/查看上下文与费用）。

### 3.3 CLI 方式

```bash
# 创建多个 opencode 执行面板
npx tsx packages/server/src/cli.ts pane create --name "任务A" --agent opencode --workdir src/backend --task "实现登录接口"
npx tsx packages/server/src/cli.ts pane create --name "任务B" --agent opencode --workdir src/frontend --task "实现登录页面"

# 列出所有面板
npx tsx packages/server/src/cli.ts pane list

# 关闭某个面板
npx tsx packages/server/src/cli.ts pane close <pane-id>
```

### 3.4 配合 Git Worktree 并行开发

在「新建执行面板」中选择 `Worktree` 隔离，Mexus 会为每个面板创建独立 Git worktree 与分支：

- 各 opencode 实例在独立分支上工作，互不冲突
- 面板头部显示分支名与文件改动数
- 完成后可用「合并到基础分支」按钮将改动合并回来

---

## 4. CLI 命令速查（汉化版）

```bash
mexus                      # 启动（默认端口 7700）
mexus init [dir]           # 初始化 .nexus/ 配置
mexus status [dir]         # 查看工作区状态
mexus stop                 # 停止服务
mexus hub                  # 启动 Hub（默认端口 7600）
mexus pane create|list|close   # 执行面板管理（REST）
mexus mission list|active|activate|archive|validate   # Mission 管理（REST）

# 环境变量
NEXUS_PORT=8080 mexus          # 自定义服务端口
NEXUS_HUB_PORT=8081 mexus hub  # 自定义 Hub 端口
```

## 5. 常见问题（FAQ）

**Q1：界面提示「没有可用的已配置Agent」怎么办？**
先安装 Agent CLI（`npm install -g opencode-ai` 等）并确认命令可用；确认使用的是汉化分支最新提交（含 Windows `which`→`where` 修复）；重启服务后重试。仍不行则手动配置 `~/.nexus/config.yaml`（见 2.3）。

**Q2：创建面板后终端是空白的/没有反应？**
Mexus 用 Shell 套壳启动（约 800ms 后发送命令）。等待几秒；检查项目目录是否有读写权限；Windows 下确认默认 shell 配置（全局配置 `defaults.shell`，如 `C:\Program Files\Git\bin\bash.exe`）。

**Q3：怎么查看 Agent 的上下文使用率/费用？**
仅 Claude Code 支持 statusline 解析（模型名、上下文 %、累计费用、会话 ID 实时显示在面板头部）。其他 Agent 显示基础状态。

**Q4：会话中断了怎么恢复？**
面板上有「恢复会话」按钮（有会话 ID 时出现），会以 `--continue` 参数重启 Agent 续跑；历史可在「回放历史」中查看。

**Q5：Mission 是什么？**
Mission 是 Mexus 的多人多 Agent 协作机制：以 Markdown 文件（mission/agents/kanban/roundtable/squad-lead）为状态，通过面板注入 `[Mission Inbox]` 唤醒信号让 Agent 协作。详见 [agent-team/mission-workflow.md](../../agent-team/mission-workflow.md)。

**Q6：协议层为什么还是英文？**
WS 事件名、pane 状态、Mission 标记（To Claim/Done 等）属于 Agent 协作协议，汉化会破坏解析与 Agent 之间的通信，故保持英文（详见 [docs/ai/onboarding.md](../ai/onboarding.md) 第 5 节）。

---

## 6. 相关文档

- 完整中文文档：[doc_site 中文](../../doc_site/docs/zh/index.md)
- 汉化说明与分支：[README.zh-CN.md](../../README.zh-CN.md)
- 开发者 / AI 接入：[docs/ai/onboarding.md](../ai/onboarding.md)
