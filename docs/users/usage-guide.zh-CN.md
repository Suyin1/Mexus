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

## 2. Agent 接入：自动检测与自定义配置

### 2.1 内置 Agent：自动检测（无需手动配置）

Mexus 内置 5 种常见 Agent 的自动检测。只要对应 CLI 已安装且在 PATH 中，服务启动时会自动识别，**无需手动配置**，UI 新建面板即可见：

| Agent 类型 | 检测的二进制 | 安装方式示例 |
|---|---|---|
| Claude Code | `claude` | `npm install -g @anthropic-ai/claude-code` |
| Codex | `codex` | `npm install -g @openai/codex` |
| OpenCode | `opencode` | `npm install -g opencode-ai` |
| Kimi CLI | `kimi` | `pip install kimi-cli` |
| Qoder CLI | `qodercli` | 见官方文档 |

> 例如：新装了 Claude Code（`npm install -g @anthropic-ai/claude-code`）→ 重启 Mexus → 新建面板就会出现 Claude Code，无需任何配置。

### 2.2 「没有可用的已配置Agent」是什么意思？

新建面板时，弹窗只显示"检测到已安装"的 Agent。列表为空时提示此信息，常见原因：
1. **本机未安装任何 Agent CLI**（最常见）——先安装你要用的 Agent
2. **⚠️ Windows 旧版本 bug（已修复）**：旧版用 `which` 检测（Windows 没有此命令）导致全部判定为未安装。汉化分支 `i18n/zh-cn` 已修复，更新到最新提交后重启服务即可
3. **Agent 已安装但不在 PATH 中**——加入 PATH，或手动配置（见 2.3）

### 2.3 接入自定义 Agent（如自研 WebAgent）⭐

对于内置 5 种之外的 Agent（例如你自研的、在 cmd 里用 `webagent` 命令启动的 WebAgent），需要**在全局配置中手动定义**。配置文件：`~/.nexus/config.yaml`。

在 `agents:` 块下新增一个条目（缩进与现有条目对齐，位于 `mission_defaults:` 之前）：

```yaml
agents:
  # ... 已有的 claudecode / opencode 等（自动检测生成，无需改动）...
  webagent:                          # ← 自定义 key，会显示在 UI 上
    bin: webagent                    # cmd 中启动它的命令名（或完整路径）
    continue_flag: ""                # 续跑会话的参数，如 "--continue"；不支持就留空
    resume_flag: ""                  # 恢复指定会话的参数，如 "--resume <id>"；不支持就留空
    yolo_flag: ""                    # 跳过权限确认的参数；不支持就留空
    default_args: []                 # 每次启动附加的固定参数
    statusline: false                # 是否支持 statusline 元数据（一般 false）
    transport: pty                   # pty（终端）或 acp（Agent Client Protocol）
    env: {}                          # 需要传给它的环境变量，如 { API_KEY: "${API_KEY}" }
```

保存后**重启服务**，新建面板即可看到 WebAgent 卡片（图标自动用首字母圆形标记，名称显示 `webagent`）。

> **自动检测（2.1）与手动配置（2.3）的区别**：内置 5 种装好即自动出现；自定义 Agent 必须手动在 config.yaml 添加后才可见。

### 2.4 快速验证

```bash
# 1) 确认命令可用
where webagent                        # Windows（有输出即可用）
which webagent                        # macOS / Linux

# 2) 重启服务后，检查 API 是否识别（浏览器打开 http://localhost:7700/api/agents）
#    → 应看到 "webagent": { "installed": true, "bin": "webagent" }

# 3) 用 CLI 直接创建测试面板
npx tsx packages/server/src/cli.ts pane create --name "测试" --agent webagent --task "..."
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

**Q2：我想接入自研的 Agent（如 WebAgent，cmd 里输入 `webagent` 可启动），怎么接？**
完全支持。在 `~/.nexus/config.yaml` 的 `agents:` 块下添加定义（`bin: webagent` 等字段），保存后重启服务，新建面板即可看到它并创建实例。完整教程见上文 **2.3 接入自定义 Agent**。内置 5 种 Agent（Claude Code 等）则无需配置，装好即自动识别（见 2.1）。

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
