---
title: "Complete Guide to Sending Images in OpenClaw Feishu"
date: 2026-03-09T02:55:00+08:00
description: "How to send images in Feishu with OpenClaw: configuration, screenshots, and complete solution"
tags: ["OpenClaw", "Feishu", "Tutorial"]
---

## Problem

OpenClaw's `message` tool supports the `media` parameter, but when sending images in Feishu, it only sends the file path as text instead of the actual image.

## Root Cause

OpenClaw uses a whitelist mechanism to protect the local filesystem. Without `mediaLocalRoots` configured, the system refuses to read local files and can only send the path as plain text.

## Solution

### Technical Overview

**Core Mechanism**:
1. Configure whitelist paths → Allow file access
2. File reading → Buffer conversion
3. Call Feishu API → Upload and get `image_key`
4. Send image message → Use `image_key`

**Key Configuration**: `mediaLocalRoots` array defines accessible local directories.

### Step 1: Configure Whitelist

Edit `~/.openclaw/openclaw.json`:

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

### Step 2: Restart Gateway

```bash
openclaw gateway restart
```

Hot reload applies configuration automatically without manual process restart.

### Step 3: Send Image

```javascript
message({
  action: "send",
  media: "/Users/your-username/.openclaw/media/inbound/image.png"
})
```

## Practical Example: Screenshot and Send

### macOS Screenshot

```bash
/usr/sbin/screencapture -x ~/Desktop/screenshot_$(date +%s).png
```

**Parameters**:
- `-x`: Silent mode
- `-C`: Include cursor
- `-T <seconds>`: Delay screenshot

### Complete Workflow

```javascript
// Generate timestamp filename
const timestamp = Math.floor(Date.now() / 1000);
const path = `~/.openclaw/media/inbound/screenshot_${timestamp}.png`;

// Take screenshot
exec({ command: `/usr/sbin/screencapture -x ${path}` });

// Send
message({ action: "send", media: path });
```

## Technical Details

### Feishu Image Upload Flow

1. **Local file** → `fs.createReadStream()` or `Buffer`
2. **Call API** → `client.im.image.create()`
3. **Get key** → `response.image_key`
4. **Send message** → `client.im.message.create({ msg_type: "image", content: JSON.stringify({ image_key }) })`

### Supported Formats

- Images: JPEG, PNG, WEBP, GIF, TIFF, BMP, ICO
- Size limit: 30MB (adjustable via `mediaMaxMb`)
- Network images: Pass URL directly, no whitelist needed

### Security Mechanism

Whitelist validation occurs in `loadWebMedia()`:
- Check if path is in `mediaLocalRoots`
- Reject unauthorized path access
- Prevent path traversal attacks

## FAQ

**Q: Why only path was sent?**  
A: `mediaLocalRoots` not configured, file reading rejected.

**Q: Can I send network images?**  
A: Yes, pass URL directly: `media: "https://example.com/image.png"`

**Q: How to debug?**  
A: Check logs `~/.openclaw/logs/gateway.log`, search for `upload` or `image_key`

## Advanced: Skill Wrapper

Create `feishu-screenshot` skill to simplify operations. See: `~/.openclaw/skills/feishu-screenshot/SKILL.md`

---

**Related Resources**:
- [OpenClaw Documentation](https://docs.openclaw.ai)
- [Feishu Channel Configuration](https://docs.openclaw.ai/channels/feishu)

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
