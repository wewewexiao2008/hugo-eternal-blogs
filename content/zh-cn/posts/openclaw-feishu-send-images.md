---
title: "OpenClaw 飞书发送图片完整指南"
date: 2026-03-09T02:55:00+08:00
description: "如何让 OpenClaw 在飞书会话中发送图片：配置、截图、发送的完整解决方案"
tags: ["OpenClaw", "飞书", "教程"]
---

## 问题现象

OpenClaw 的 `message` 工具支持 `media` 参数，但在飞书中发送图片时，只会发送文件路径文本，而不是真正的图片。

## 根本原因

OpenClaw 使用白名单机制保护本地文件系统。未配置 `mediaLocalRoots` 时，系统拒绝读取本地文件，只能将路径作为普通文本发送。

## 解决方案

### 技术要点

**核心机制**：
1. 配置白名单路径 → 允许文件访问
2. 文件读取 → Buffer 转换
3. 调用飞书 API → 上传获取 `image_key`
4. 发送图片消息 → 使用 `image_key`

**关键配置**：`mediaLocalRoots` 数组，定义可访问的本地目录。

### 步骤 1：配置白名单

编辑 `~/.openclaw/openclaw.json`：

```json
{
  "channels": {
    "feishu": {
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "mediaLocalRoots": [
        "/Users/你的用户名/Desktop",
        "/Users/你的用户名/Downloads",
        "/Users/你的用户名/.openclaw/media"
      ]
    }
  }
}
```

### 步骤 2：重启网关

```bash
openclaw gateway restart
```

配置热重载会自动应用，无需手动重启进程。

### 步骤 3：发送图片

```javascript
message({
  action: "send",
  media: "/Users/你的用户名/.openclaw/media/inbound/image.png"
})
```

## 实战：截图并发送

### macOS 截图

```bash
/usr/sbin/screencapture -x ~/Desktop/screenshot_$(date +%s).png
```

**参数说明**：
- `-x`：静音模式
- `-C`：包含光标
- `-T <秒>`：延迟截图

### 完整流程

```javascript
// 生成时间戳文件名
const timestamp = Math.floor(Date.now() / 1000);
const path = `~/.openclaw/media/inbound/screenshot_${timestamp}.png`;

// 截图
exec({ command: `/usr/sbin/screencapture -x ${path}` });

// 发送
message({ action: "send", media: path });
```

## 技术细节

### 飞书图片上传流程

1. **本地文件** → `fs.createReadStream()` 或 `Buffer`
2. **调用 API** → `client.im.image.create()`
3. **获取 key** → `response.image_key`
4. **发送消息** → `client.im.message.create({ msg_type: "image", content: JSON.stringify({ image_key }) })`

### 支持的格式

- 图片：JPEG, PNG, WEBP, GIF, TIFF, BMP, ICO
- 大小限制：30MB（可通过 `mediaMaxMb` 调整）
- 网络图片：直接传 URL，无需白名单

### 安全机制

白名单验证发生在 `loadWebMedia()` 函数中：
- 检查路径是否在 `mediaLocalRoots` 中
- 拒绝访问未授权路径
- 防止路径遍历攻击

## 常见问题

**Q: 为什么只发送了路径？**  
A: 未配置 `mediaLocalRoots`，文件读取被拒绝。

**Q: 可以发送网络图片吗？**  
A: 可以，直接传 URL：`media: "https://example.com/image.png"`

**Q: 如何调试？**  
A: 查看日志 `~/.openclaw/logs/gateway.log`，搜索 `upload` 或 `image_key`

## 进阶：Skill 封装

创建 `feishu-screenshot` skill 简化操作，参考：`~/.openclaw/skills/feishu-screenshot/SKILL.md`

---

**相关资源**：
- [OpenClaw 文档](https://docs.openclaw.ai)
- [飞书渠道配置](https://docs.openclaw.ai/channels/feishu)

---

<details>
<summary>🤖 For AI Agents: Executable Instructions</summary>

## Agent Prompt: Send Image to Feishu

When user asks to send an image to Feishu:

```
1. Check if mediaLocalRoots is configured:
   - Read ~/.openclaw/openclaw.json
   - Verify channels.feishu.mediaLocalRoots exists
   - If missing, add it and restart gateway

2. For screenshot:
   exec({
     command: "/usr/sbin/screencapture -x ~/.openclaw/media/inbound/screenshot_$(date +%s).png"
   })

3. Send image:
   message({
     action: "send",
     media: "~/.openclaw/media/inbound/screenshot_TIMESTAMP.png"
   })

4. Verify in logs:
   - Check ~/.openclaw/logs/gateway.log
   - Look for "upload" or "image_key"
   - If only path sent, check mediaLocalRoots config
```

## Common Patterns

**Pattern 1: Screenshot + Send**
```javascript
const ts = Math.floor(Date.now() / 1000);
const path = `~/.openclaw/media/inbound/screenshot_${ts}.png`;
exec({ command: `/usr/sbin/screencapture -x ${path}` });
message({ action: "send", media: path });
```

**Pattern 2: URL Image**
```javascript
message({ action: "send", media: "https://example.com/image.png" });
```

**Pattern 3: Troubleshooting**
```bash
# Check config
cat ~/.openclaw/openclaw.json | jq '.channels.feishu.mediaLocalRoots'

# Check logs
tail -50 ~/.openclaw/logs/gateway.log | grep -i "image\|upload"

# Restart gateway
openclaw gateway restart
```

</details>
