---
title: "Complete Guide to Sending Images in OpenClaw Feishu"
date: 2026-03-09T02:55:00+08:00
description: "How to send images in Feishu with OpenClaw: configuration, screenshots, and complete solution"
tags: ["OpenClaw", "Feishu", "Tutorial"]
---

## Problem

Although OpenClaw's `message` tool supports the `media` parameter, by default when sending images in Feishu, it only sends the file path as text instead of the actual image.

## Solution

### 1. Configure mediaLocalRoots

Edit `~/.openclaw/openclaw.json` and add `mediaLocalRoots` to the Feishu channel configuration:

```json
{
  "channels": {
    "feishu": {
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "mediaLocalRoots": [
        "/Users/your-username/Desktop",
        "/Users/your-username/Downloads",
        "/Users/your-username/.openclaw/media"
      ]
    }
  }
}
```

**Purpose**: This configuration tells OpenClaw which directories can be accessed for file uploads to Feishu. For security reasons, only paths in the whitelist can be accessed.

### 2. Restart Gateway

After modifying the configuration, restart the gateway:

```bash
openclaw gateway restart
```

Or use the gateway tool:

```javascript
gateway({ action: "restart", note: "Apply mediaLocalRoots configuration" })
```

### 3. Send Images

Now you can send images using the `message` tool:

```javascript
message({
  action: "send",
  media: "/Users/your-username/.openclaw/media/inbound/image.png"
})
```

## Complete Example: Screenshot and Send

### macOS Screenshot Command

```bash
/usr/sbin/screencapture -x /Users/your-username/.openclaw/media/inbound/screenshot.png
```

Parameter explanation:
- `-x`: Silent mode (no shutter sound)
- Path must be in a `mediaLocalRoots` configured directory

### Combined Usage

```javascript
// 1. Take screenshot
exec({
  command: "/usr/sbin/screencapture -x /Users/your-username/.openclaw/media/inbound/screenshot_$(date +%s).png"
})

// 2. Send
message({
  action: "send",
  media: "/Users/your-username/.openclaw/media/inbound/screenshot_1234567890.png"
})
```

## How It Works

1. `message` tool detects the `media` parameter
2. Verifies the file path is in the `mediaLocalRoots` whitelist
3. Reads the file and calls Feishu's `uploadImageFeishu` API
4. After obtaining `image_key`, calls `sendImageFeishu` to send the image message

## FAQ

### Q: Why did it only send the path text before?

A: Because `mediaLocalRoots` wasn't configured. For security, OpenClaw refuses to read local files and can only send the path as text.

### Q: Can I send images from URLs?

A: Yes! Just pass the URL directly:

```javascript
message({
  action: "send",
  media: "https://example.com/image.png"
})
```

### Q: What image formats are supported?

A: Feishu supports: JPEG, PNG, WEBP, GIF, TIFF, BMP, ICO

### Q: What's the image size limit?

A: Default 30MB (adjustable via `mediaMaxMb` configuration)

## Advanced: Create a Skill

For easier use, you can create a skill to encapsulate screenshot + send functionality. See the next article.

---

**Related Resources**:
- [OpenClaw Documentation](https://docs.openclaw.ai)
- [Feishu Channel Configuration](https://docs.openclaw.ai/channels/feishu)
