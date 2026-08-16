# Mexus 项目文档中心

本目录是 Mexus 项目的**协作文档体系**，按读者分层组织，供 **AI Agent、用户、开发者、维护者** 快速接入、了解与维护本项目。

> 文档语言约定：`docs/` 内面向 AI/维护者的文档以中文为主（配合英文术语），方便快速理解；
> 面向国际用户的基础文档在 [doc_site](../doc_site/docs/zh/index.md)（VitePress，中英双语）。

## 📚 文档结构

| 目录 / 文件 | 读者 | 内容 | 快速入口 |
|---|---|---|---|
| [`ai/onboarding.md`](./ai/onboarding.md) | **AI Agent**（Claude Code / Codex / 其他） | 项目地图、技术栈、代码结构、协议红线、开发约定——让 Agent 一轮对话内上手 | ⭐ 建议先读 |
| [`ai/project-analysis.zh-CN.md`](./ai/project-analysis.zh-CN.md) | 开发者 / 维护者 / 新成员 | 项目全景分析：定位、架构、模块、演进方向、风险与改进建议 | ⭐ 快速了解全貌 |
| [`users/usage-guide.zh-CN.md`](./users/usage-guide.zh-CN.md) | **用户**（含中文用户） | 安装启动、Agent 配置（含多 opencode 管理）、CLI 命令、Windows 注意事项、FAQ | ⭐ 使用前先读 |
| [`AGENTS.md`](../AGENTS.md) | AI Agent（开发规范） | 编码约定、UI 视觉规范、架构决策记录（与 onboarding 互补） | 开发时必读 |
| [doc_site 中文文档](../doc_site/docs/zh/index.md) | 用户 | VitePress 完整中文文档（安装/快速上手/CLI/配置/快捷键/FAQ） | 详细参考 |
| `docs/superpowers/` | 维护者 | 历史 plans/specs（设计决策记录） | 追溯设计意图 |
| `docs/User-Manual.md` / `docs/Agent-Team-and-Harness-Engineering.md` | 用户 / 维护者 | 用户手册、Agent Team 与 Harness 工程说明 | 按需查阅 |

## 🧭 快速导航（按你的身份）

- **我是 AI Agent，想接入这个项目** → 读 [`ai/onboarding.md`](./ai/onboarding.md)，再读 [`AGENTS.md`](../AGENTS.md)
- **我是新开发者，想了解项目全貌** → 读 [`ai/project-analysis.zh-CN.md`](./ai/project-analysis.zh-CN.md)
- **我是用户，想用起来（含配置多个 Agent）** → 读 [`users/usage-guide.zh-CN.md`](./users/usage-guide.zh-CN.md)
- **我是维护者，要发布/分支管理** → 看 [`scripts/release.mjs`](../scripts/release.mjs)、`change-logs/`、`release-plans/`

## 📥 信息收集与反馈

- **Bug / 功能建议**：在 [GitHub Issues](https://github.com/Suyin1/Mexus/issues) 提交，请注明系统平台（Windows/macOS/Linux）、Mexus 版本、复现步骤
- **Agent 协作经验**：Mission 工作流相关经验沉淀在 `agent-team/`，见 [`agent-team/mission-workflow.md`](../agent-team/mission-workflow.md)
- **汉化分支**：界面汉化位于 `i18n/zh-cn` 分支（Web 界面 / CLI / Hub 控制台已汉化，协议层保持英文），详见 [`README.zh-CN.md`](../README.zh-CN.md)

---
*维护提示：新增文档时请在本文档索引表中补充一行；文档更新遵循「面向读者、简洁可查」原则。*
