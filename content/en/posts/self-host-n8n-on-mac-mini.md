---
title: "Self-Hosting n8n on a Mac Mini: A Practical Workflow Automation Setup"
date: 2026-04-19T13:30:00+08:00
description: "From zero to running: deploying n8n on macOS, exploring its workflow editor, node system, and AI integration capabilities hands-on."
tags: ["n8n", "automation", "self-hosted", "macOS"]
draft: false
---

I have a Mac mini M4 running at home as a always-on server. Recently I set up [n8n](https://n8n.io) on it — an open-source workflow automation platform. This post documents the full process from deployment to hands-on exploration.

## Why n8n

I've used Zapier and Make before, but self-hosting has two clear advantages:

1. **Data never leaves your machine.** All workflow configs, credentials, and execution history live in a local SQLite database — no third-party servers involved.
2. **No execution limits.** SaaS plans charge per execution. Self-hosted has no such ceiling.

n8n uses a [fair-code](https://faircode.io) license: source-available, freely deployable. 184k GitHub stars, active community. Key selling points: 400+ built-in integrations, native AI capabilities (LangChain-based), visual editor + custom code nodes.

## Deployment

### Prerequisites

n8n is a Node.js app requiring version 20.19–24.x. On macOS, the easiest path:

```bash
brew install n8n
```

Or via npm:

```bash
npm install n8n -g
```

### Startup Script with External Storage

By default, n8n stores data in `~/.n8n`. Since my Mac mini has an external drive, I redirect everything there:

```bash
#!/bin/bash
# ~/.local/bin/start-n8n.sh
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export HOME="/Users/shizhuocheng"
export N8N_USER_FOLDER="/Volumes/My Book/n8n-data"
exec /opt/homebrew/bin/n8n start --port=5678
```

The `N8N_USER_FOLDER` environment variable points all data (SQLite DB, config, encryption key) to the external drive.

> ⚠️ The startup script itself must live on the internal drive. macOS SIP blocks LaunchAgents from loading scripts on unprotected volumes.

### LaunchAgent for Process Management

To get auto-start on boot and crash recovery:

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

Save to `~/Library/LaunchAgents/local.n8n.plist`, then:

```bash
launchctl load ~/Library/LaunchAgents/local.n8n.plist
```

`KeepAlive` auto-restarts on crash. `AbandonProcessGroup` prevents launchd from killing child processes on unload.

### Verify

```bash
curl -s -o /dev/null -w '%{http_code}' http://localhost:5678/
# 200
```

## Initial Setup

First visit to `http://localhost:5678` walks through a setup wizard:

1. **Create admin account.** Email, name, password (8+ chars, at least 1 number and 1 uppercase).
2. **Optional survey.** Company size, role, use case. Skippable.
3. **Free license key.** n8n offers a perpetual free community edition key that unlocks advanced debugging, execution search, and folders.

Under a minute from start to editor.

## The Workflow Editor

The core interface is a **visual canvas**. When creating your first workflow, the first choice is the trigger type:

| Trigger | Description |
|---------|-------------|
| Manual | Click a button — good for testing |
| App event | Webhooks from Telegram, Notion, Airtable, etc. |
| Schedule | Like cron — minutes/hours/days/weeks/months |
| Webhook | On incoming HTTP request |
| Form submission | n8n's built-in form builder |
| Called by another workflow | Sub-workflow pattern |
| Chat message | Purpose-built for AI agents |
| Other | File changes, workflow errors, etc. |

I tried the **Schedule Trigger** — the config panel is intuitive: pick an interval, set the time. Each field supports an **Expression mode** using JavaScript for dynamic values.

Nodes connect via drag-and-drop. The canvas supports zoom, auto-tidy, and sticky notes.

## Core Capabilities

### 400+ Integration Nodes

Built-in nodes cover the mainstream services: Google Sheets, Telegram, Slack, Discord, GitHub, Notion, MySQL, PostgreSQL... If something's missing, the **HTTP Request** node calls any API directly.

### Code Nodes

Insert JavaScript or Python blocks mid-workflow for logic that built-in nodes can't handle. This is a critical advantage over pure low-code platforms — you're not boxed in.

### AI-Native Support

n8n has built-in LangChain-based AI capabilities:

- **AI Agent node**: Build conversational AI with OpenAI, Anthropic, Google Gemini, etc.
- **Chat Trigger**: Trigger designed for AI conversations
- **MCP integration** (Preview): Let Claude, Lovable, and other AI tools discover and execute your n8n workflows

The Instance-level MCP setting is visible under Settings (currently Preview).

### Template Library

n8n ships a library of **9,167 ready-to-use templates**. Browsable and importable from within the app, categorized by AI, Sales, IT Ops, Marketing, Document Ops, etc.

A few noteworthy starter templates:

- "Build your first AI agent" — AI Agent + Simple Memory
- "Personal life manager with Telegram" — Telegram + Google Services + voice AI
- "Talk to your Google Sheets using ChatGPT-5" — Query spreadsheets with natural language
- "Scrape and summarize webpages with AI"

### Security & Data

Everything lives in a single SQLite file at `$N8N_USER_FOLDER/.n8n/database.sqlite`. Credentials are encrypted (key in the `config` file).

Self-hosted also supports:
- **SSO / LDAP / OIDC / SAML** for enterprise auth
- **API Key** for programmatic workflow management
- **Community Nodes** to install third-party node packages
- **Log Streaming** to external systems

## CLI Management

Useful commands:

```bash
# Export all workflows
N8N_USER_FOLDER=/path/to/data n8n export:workflow --all --output=backups/

# Export single workflow
n8n export:workflow --id=5 --output=file.json --pretty

# Security audit
n8n audit

# Database rollback
n8n db:revert
```

## Comparison

| Dimension | n8n Self-hosted | Zapier | Make |
|-----------|----------------|--------|------|
| Executions | Unlimited | Plan-limited | Plan-limited |
| Data location | Local | Cloud | Cloud |
| Code support | JS/Python nodes | Limited | Limited |
| AI capabilities | LangChain native | Requires integration | Requires integration |
| Pricing | Free (self-hosted) | $19.99+/mo | $9+/mo |

## Impressions

After a few hours of hands-on use:

1. **The editor is excellent.** Clean UI, inline documentation for parameters, flexible Expression mode.
2. **Templates save enormous time.** Find something close, customize, ship.
3. **No feature gatekeeping.** SSO, LDAP, MCP — all available in the community edition.
4. **macOS LaunchAgent deployment is solid.** KeepAlive for reliability, standard log paths for debugging.

Next directions to explore:
- Telegram bot as a personal assistant
- AI Agent node + local Ollama models
- Webhook node to bridge OpenClaw automations
- MCP integration for Claude-driven workflow execution

## References

- [n8n Documentation](https://docs.n8n.io)
- [n8n GitHub](https://github.com/n8n-io/n8n) — 184k+ stars
- [n8n AI Documentation](https://docs.n8n.io/advanced-ai/)
- [n8n Template Library](https://n8n.io/workflows) — 9,000+ templates
