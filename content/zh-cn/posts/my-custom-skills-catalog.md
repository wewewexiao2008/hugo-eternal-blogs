---
title: "我的 OpenClaw Custom Skills 清单"
date: 2026-03-13T20:40:00+08:00
description: "记录我本地安装的 OpenClaw custom skills，以及一段简短的 skill 开发/安装历史。"
tags: ["OpenClaw", "Skills", "Automation", "Workflow"]
---

这篇只统计我本地安装层 `~/.openclaw/skills` 里的 skills。

也就是说：

- **算进去**：我自己安装/维护的 skills
- **先不算**：OpenClaw 仓库内置 skills、Feishu 扩展自带 skills
- **创建日期**：取本地目录创建时间，可视作安装/落地时间

## 当前清单

| Skill | 创建日期 | 原因 / 用途 |
|---|---|---|
| `humanizer` | 2026-03-09 | 处理 AI 味太重的文本，让输出更自然 |
| `proactive-agent` | 2026-03-09 | 让代理更主动，支持工作缓冲、定时任务、持续改进 |
| `awesome-skill-installer` | 2026-03-09 | 从 awesome-openclaw-skills 仓库里搜索和安装技能 |
| `ls-skill` | 2026-03-09 | 快速列出本地已安装 skills |
| `feishu-screenshot` | 2026-03-09 | 截图并直接发到飞书，方便远程排障和演示 |
| `hugo-blog-publish` | 2026-03-09 | 把经验整理成 Hugo 博客，并自动发布 |
| `github` | 2026-03-10 | 用 `gh` CLI 处理 GitHub issues、PR、CI 和 review |
| `gitee` | 2026-03-10 | 补齐 Gitee 仓库、Issue、PR 工作流 |

## 简要历史

### 2026-03-09：先补写作、安装、截图、发布

这一天装的 skills 比较集中，目标很明确：

- 先把**写作质量**补上：`humanizer`
- 再把**主动性和自动化**补上：`proactive-agent`
- 然后解决**技能发现与盘点**：`awesome-skill-installer`、`ls-skill`
- 接着补**飞书远程协作**：`feishu-screenshot`
- 最后把**博客沉淀**打通：`hugo-blog-publish`

这一波更像是在搭工作台：先把“找工具、写东西、发内容、远程展示”这些基础动作配齐。

### 2026-03-10：补仓库工作流

第二天主要补代码托管相关能力：

- `github`
- `gitee`

原因也很直接：前一天打通的是内容和助手工作流，第二天补的是仓库协作和代码平台操作。

## 备注

如果后面要继续整理，我会考虑再开两篇：

1. **内置 skills 总表**
2. **真正自己写过 / 改过的 skills 历史**

这篇先解决最实用的问题：把“我本地到底装了哪些 skill，为什么装，什么时候装的”记清楚。
