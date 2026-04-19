---
title: "在 Mac mini 上自建 n8n：工作流自动化的新工具"
date: 2026-04-19T13:30:00+08:00
description: "从零开始，在 macOS 上部署 n8n，实际探索它的工作流编辑器、节点系统和 AI 集成能力。"
tags: ["n8n", "自动化", "self-hosted", "macOS"]
draft: false
---

家里有一台常驻的 Mac mini M4，平时跑各种服务。最近在上面部署了 [n8n](https://n8n.io)——一个开源的工作流自动化平台。这篇文章记录从部署到实际上手的全过程。

## 为什么选 n8n

之前用过 Zapier 和 Make，但自建方案有两个明确的吸引力：

1. **数据不离开本机**。所有 workflow 配置、凭证、执行历史都存在本地 SQLite 里，不经过第三方服务器。
2. **没有执行次数上限**。SaaS 方案按执行次数收费，自建版没有这个限制。

n8n 是 [fair-code](https://faircode.io) 许可证，源码公开，可以自由部署。GitHub 上 184k star，社区很活跃。核心卖点：400+ 内置集成、原生 AI 能力（基于 LangChain）、可视化编辑器 + 自定义代码节点。

## 部署

### 环境准备

n8n 是 Node.js 应用，支持两种部署方式：

```bash
# 方式一：npx 直接试用（不安装）
npx n8n

# 方式二：全局安装
npm install n8n -g
```

我用的是 Homebrew 安装的版本（v2.16.1）：

```bash
brew install n8n
```

n8n 要求 Node.js 20.19 ~ 24.x。macOS 上通过 Homebrew 装的话依赖自动解决。

### 启动与持久化

默认数据目录是 `~/.n8n`。因为我的 Mac mini 外挂了一块大硬盘，想把数据持久化到外置存储：

```bash
#!/bin/bash
# ~/.local/bin/start-n8n.sh
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export HOME="/Users/shizhuocheng"
export N8N_USER_FOLDER="/Volumes/My Book/n8n-data"
exec /opt/homebrew/bin/n8n start --port=5678
```

`N8N_USER_FOLDER` 环境变量把所有数据（SQLite 数据库、配置、凭证加密密钥）指向外置硬盘。

> ⚠️ 注意：启动脚本本身不能放在外置硬盘上。macOS 的 SIP（System Integrity Protection）会阻止 LaunchAgent 从不受保护的卷加载脚本。脚本放在 `~/.local/bin/` 就行。

### 用 LaunchAgent 守护进程

为了让 n8n 开机自启、崩溃自动重启，写一个 LaunchAgent：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>local.n8n</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/shizhuocheng/.local/bin/start-n8n.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>AbandonProcessGroup</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/shizhuocheng/Library/Logs/n8n.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/shizhuocheng/Library/Logs/n8n-error.log</string>
</dict>
</plist>
```

放在 `~/Library/LaunchAgents/local.n8n.plist`，然后：

```bash
launchctl load ~/Library/LaunchAgents/local.n8n.plist
```

`KeepAlive` 确保进程挂了会自动重启。`AbandonProcessGroup` 防止 launchd 在unload时杀掉子进程。

### 验证

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:5678/
# 200
```

看到 200 就说明服务正常了。

## 初始化体验

第一次访问 `http://localhost:5678`，进入设置向导：

1. **创建管理员账号**。邮箱、名字、密码（8+ 字符，至少 1 个数字和 1 个大写字母）。
2. **可选问卷**。公司规模、角色、用途等，可以跳过。
3. **免费激活密钥**。n8n 提供了一个永久免费的社区版许可证，注册邮箱后可以获得高级调试、执行搜索和文件夹功能。

整个过程不到 1 分钟。

## 工作流编辑器

初始化后进入主界面，核心是**工作流编辑器**——一个可视化画布。创建第一个 workflow 时，第一步是选择触发方式：

| 触发类型 | 说明 |
|----------|------|
| 手动触发 | 点击按钮运行，适合调试和入门 |
| App 事件 | Telegram、Notion、Airtable 等应用的 webhook |
| 定时触发 | 类似 cron，支持分钟/小时/天/周/月 |
| Webhook | 收到 HTTP 请求时触发 |
| 表单提交 | n8n 内建表单生成器 |
| 被其他 workflow 调用 | 子 workflow 模式 |
| 聊天消息 | AI agent 专用 |
| 其他 | 文件变化、workflow 错误等 |

我试了一下 **Schedule Trigger**，配置面板很直观：选间隔（分钟/小时/天/周/月）、设置触发时间点。每个字段还支持 **Expression 模式**——用 JavaScript 表达式动态计算值。

节点之间的连接是可视化的拖拽操作，每条连接线代表数据流。画布支持缩放、自动整理、便签。

## 核心能力

### 400+ 集成节点

内置节点覆盖主流服务：Google Sheets、Telegram、Slack、Discord、GitHub、Notion、MySQL、PostgreSQL……几乎能想到的服务都有。如果内置的不够，还有 **HTTP Request** 节点直接调 API。

### Code 节点

可以在 workflow 中间插入 JavaScript 或 Python 代码块，处理内置节点覆盖不到的逻辑。这对开发者来说是个关键优势——不像纯低代码平台那样被限制住。

### AI 原生支持

n8n 内建了基于 LangChain 的 AI 能力：

- **AI Agent 节点**：构建对话式 AI，可以接入 OpenAI、Anthropic、Google Gemini 等模型
- **Chat Trigger**：专门为 AI 对话设计的触发器
- **MCP 集成**（Preview）：让 Claude、Lovable 等 AI 工具直接发现和执行 n8n workflow

在 Settings 页面可以看到 Instance-level MCP 配置（目前还是 Preview 状态），开启后外部 AI 助手可以通过 MCP 协议调用你的 workflow。

### 模板库

这是 n8n 的一个大杀器——**9167 个现成模板**。从应用内可以直接浏览和导入，分类包括 AI、Sales、IT Ops、Marketing、Document Ops 等。

几个有趣的入门模板：

- "Build your first AI agent" — 用 AI Agent + Simple Memory 搭建对话机器人
- "Personal life manager with Telegram" — Telegram + Google 服务 + 语音 AI
- "Talk to your Google Sheets using ChatGPT-5" — 用自然语言查表格数据
- "Scrape and summarize webpages with AI" — 网页抓取 + AI 摘要

## 数据结构与安全

所有数据存在一个 SQLite 数据库里（位于 `$N8N_USER_FOLDER/.n8n/database.sqlite`）。凭证用加密密钥保护（`config` 文件中的 `encryptionKey`）。

自建版还支持：
- **SSO / LDAP / OIDC / SAML**：企业级认证
- **API Key**：通过 REST API 程序化管理 workflow
- **Community Nodes**：安装第三方节点包扩展功能
- **Log Streaming**：将运行日志外发到外部系统

## CLI 管理

n8n 还提供了一组实用的 CLI 命令：

```bash
# 导出所有 workflow
N8N_USER_FOLDER=/path/to/data n8n export:workflow --all --output=backups/

# 导出单个 workflow
n8n export:workflow --id=5 --output=file.json --pretty

# 安全审计
n8n audit

# 数据库回滚
n8n db:revert
```

`export:workflow --backup` 参数会自动设置 `--all --pretty --separate`，适合做定期备份。

## 与其他工具的对比

和 Zapier / Make 相比，n8n 的定位是"给技术团队的自动化平台"：

| 维度 | n8n 自建 | Zapier | Make |
|------|---------|--------|------|
| 执行次数 | 无限 | 按计划限制 | 按计划限制 |
| 数据位置 | 本地 | 云端 | 云端 |
| 代码支持 | JS/Python 节点 | 有限 | 有限 |
| AI 能力 | LangChain 原生 | 需集成 | 需集成 |
| 部署方式 | 自建/云 | 仅云 | 仅云 |
| 费用 | 免费（自建） | $19.99+/月 | $9+/月 |

## 实际感受

用了几个小时下来，几个印象：

1. **编辑器体验很好**。节点配置的 UI 清晰，参数有即时说明，Expression 模式灵活。
2. **模板库节省大量时间**。不需要从零搭，找个接近的模板改改就能用。
3. **自建版功能不缩水**。SSO、LDAP、MCP 这些企业功能在社区版也能用。
4. **macOS LaunchAgent 部署方案稳定**。KeepAlive 保证高可用，日志输出到标准路径方便排查。

后续打算探索的方向：
- 接 Telegram bot 做个人助手
- 尝试 AI Agent 节点 + 本地 Ollama 模型
- 用 Webhook 节点桥接 OpenClaw 的自动化
- 配合 MCP 让 Claude 直接调用 n8n workflow

## 参考

- [n8n 官方文档](https://docs.n8n.io)
- [n8n GitHub](https://github.com/n8n-io/n8n) — 184k+ star
- [n8n AI 文档](https://docs.n8n.io/advanced-ai/)
- [n8n 模板库](https://n8n.io/workflows) — 9000+ 模板
