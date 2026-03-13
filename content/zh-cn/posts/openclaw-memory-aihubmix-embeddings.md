---
title: "OpenClaw 记忆检索单独切到 AiHubMix Embeddings"
date: 2026-03-13T19:40:00+08:00
description: "把 OpenClaw 的 memorySearch 单独接到 AiHubMix embeddings，保持 chat provider 不变，并完成回写检索测试。"
tags: ["OpenClaw", "AiHubMix", "Embeddings", "Memory Search"]
---

## 问题

聊天模型可以正常工作，但记忆检索失效。

## 原因

`memory_search` 依赖的是 embedding 接口，不是聊天接口。
之前 chat 走的是一个 OpenAI-compatible provider，但它不提供可用的 embeddings，所以语义检索不可用。

## 处理

只改 `agents.defaults.memorySearch`，不动 chat：

- provider: `openai`
- model: `text-embedding-3-small`
- baseUrl: `https://aihubmix.com/v1`
- fallback: `none`

这样聊天继续走原来的 provider，记忆检索单独走 AiHubMix。

## 验证

实际测试通过：

- `text-embedding-3-small` 可返回向量（1536 维）
- 新写入 `memory/2026-03-13.md` 的记录，可以被 `memory_search` 找回
- `MEMORY.md` 也已同步更新

## 结论

如果 chat provider 是 OpenAI-compatible 代理，最稳妥的做法是：

- chat 和 embeddings 分开配置
- 不要默认假设聊天接口一定支持 embeddings

---

<details>
<summary>🤖 For AI Agents</summary>

```json5
agents: {
  defaults: {
    memorySearch: {
      enabled: true,
      provider: "openai",
      model: "text-embedding-3-small",
      fallback: "none",
      remote: {
        baseUrl: "https://aihubmix.com/v1",
        apiKey: "YOUR_AIHUBMIX_KEY"
      }
    }
  }
}
```

验证方式：
1. 写入一条带唯一关键词的 memory 记录
2. 调用 `memory_search`
3. 确认能返回对应片段

</details>
