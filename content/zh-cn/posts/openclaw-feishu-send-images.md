---
title: "OpenClaw 飞书发送图片完整指南"
date: 2026-03-09T02:55:00+08:00
description: "如何让 OpenClaw 在飞书会话中发送图片：配置、截图、发送的完整解决方案"
tags: ["OpenClaw", "飞书", "教程"]
---

## 问题

OpenClaw 的 `message` 工具虽然支持 `media` 参数，但默认情况下在飞书中发送图片时，只会发送文件路径文本，而不是真正的图片。

## 解决方案

### 1. 配置 mediaLocalRoots

编辑 `~/.openclaw/openclaw.json`，在飞书渠道配置中添加 `mediaLocalRoots`：

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

**作用**：这个配置告诉 OpenClaw 哪些目录下的文件可以被读取并上传到飞书。出于安全考虑，只有在白名单中的路径才能被访问。

### 2. 重启网关

配置修改后需要重启网关：

```bash
openclaw gateway restart
```

或者使用 gateway 工具：

```javascript
gateway({ action: "restart", note: "应用 mediaLocalRoots 配置" })
```

### 3. 发送图片

现在可以通过 `message` 工具发送图片了：

```javascript
message({
  action: "send",
  media: "/Users/你的用户名/.openclaw/media/inbound/image.png"
})
```

## 完整示例：截图并发送

### macOS 截图命令

```bash
/usr/sbin/screencapture -x /Users/你的用户名/.openclaw/media/inbound/screenshot.png
```

参数说明：
- `-x`：不播放截图声音
- 路径必须在 `mediaLocalRoots` 配置的目录中

### 组合使用

```javascript
// 1. 截图
exec({
  command: "/usr/sbin/screencapture -x /Users/你的用户名/.openclaw/media/inbound/screenshot_$(date +%s).png"
})

// 2. 发送
message({
  action: "send",
  media: "/Users/你的用户名/.openclaw/media/inbound/screenshot_1234567890.png"
})
```

## 工作原理

1. `message` 工具检测到 `media` 参数
2. 验证文件路径是否在 `mediaLocalRoots` 白名单中
3. 读取文件并调用飞书的 `uploadImageFeishu` API
4. 获得 `image_key` 后调用 `sendImageFeishu` 发送图片消息

## 常见问题

### Q: 为什么之前只发送了路径文本？

A: 因为没有配置 `mediaLocalRoots`，OpenClaw 出于安全考虑拒绝读取本地文件，只能把路径当文本发送。

### Q: 可以发送网络图片吗？

A: 可以！直接传 URL：

```javascript
message({
  action: "send",
  media: "https://example.com/image.png"
})
```

### Q: 支持哪些图片格式？

A: 飞书支持：JPEG, PNG, WEBP, GIF, TIFF, BMP, ICO

### Q: 图片大小限制？

A: 默认 30MB（可通过 `mediaMaxMb` 配置调整）

## 进阶：创建 Skill

为了更方便使用，可以创建一个 skill 封装截图+发送功能。参考下一篇文章。

---

**相关资源**：
- [OpenClaw 文档](https://docs.openclaw.ai)
- [飞书渠道配置](https://docs.openclaw.ai/channels/feishu)
