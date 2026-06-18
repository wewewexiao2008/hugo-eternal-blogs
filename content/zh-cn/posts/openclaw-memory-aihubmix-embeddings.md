---
title: "OpenClaw 记忆检索：把 Embeddings 单独路由到 AiHubMix"
date: 2026-03-13T19:40:00+08:00
description: "当你的聊天 provider 不支持 embeddings 时，如何让 OpenClaw 的 memory_search 独立指向 AiHubMix——包括排查过程、配置方案和验证方法。"
series: openclaw
tags: ["OpenClaw", "AiHubMix", "Embeddings", "Memory Search", "运维"]
draft: false
---

## 问题现象

某天我发现 `memory_search` 完全失效——任何查询都返回空结果。但聊天功能正常，模型能对话、能写代码。问题出在哪？

## 排查过程

OpenClaw 的记忆检索链路是这样的：

```
memory_search 工具调用
  → OpenClaw 内部 embedding API
  → 把查询文本转成向量
  → 在 MEMORY.md + memory/*.md 的向量索引里做余弦相似度搜索
  → 返回 top-N 匹配片段
```

关键点：**embedding 调用的 API 和聊天 API 可以是不同的端点。** 我当时把整个 OpenClaw 指向了一个 OpenAI-compatible 代理（`codez.zwenooo.link`），它能正常处理 chat completions，但不支持 `/v1/embeddings` 端点。

所以聊天没问题，但 `memory_search` 拿不到向量，检索链路就断了。

## 解决方案：chat 和 embeddings 分离

OpenClaw 的 `agents.defaults.memorySearch` 配置支持独立指定 provider。不需要改聊天 provider，只需把记忆检索单独指到一个支持 embeddings 的服务。

### 为什么选 AiHubMix

AiHubMix 是一个 OpenAI API 兼容的多模型代理，支持 `text-embedding-3-small`（1536 维），价格极低（$0.02/1M tokens），从国内直连速度快。对于记忆检索这种高频低 token 的场景，它是最经济的选择。

### 配置

```json5
agents: {
  defaults: {
    memorySearch: {
      enabled: true,
      provider: "openai",       // 使用 OpenAI-compatible 协议
      model: "text-embedding-3-small",
      fallback: "none",         // 不回退到本地，失败就报错
      remote: {
        baseUrl: "https://aihubmix.com/v1",
        apiKey: "YOUR_AIHUBMIX_KEY"
      }
    }
  }
}
```

只动了 `memorySearch`，chat 继续走原来的 provider，互不影响。

## 验证方法

配置生效后，用一个简单的三步测试确认链路通：

1. **写入唯一内容**：在 `memory/YYYY-MM-DD.md` 写入一条带特殊关键词的记录（比如"测试 embedding 检索标记词 zxcvbn"）
2. **等待索引**：给 OpenClaw 几秒钟索引这条新记录
3. **检索验证**：调用 `memory_search`，查询 "zxcvbn"，确认返回对应片段

如果返回结果且 score > 0.3，说明 embedding → 向量索引 → 相似度检索全链路正常。

## 后续：这个模式的价值

这个配置方式解决了一个常见问题：**国内代理通常只代理 chat，不代理 embeddings。** 有了独立的 `memorySearch.remote` 配置，你可以：

- chat 走自建/第三方代理
- embeddings 走 AiHubMix 或直连 OpenAI
- 两者完全解耦，出问题时排查范围更小

如果你的 OpenClaw 记忆检索突然失效，第一步检查的就是：**你的 chat provider 是否也支持 embeddings？** 如果不是，就是这个问题。

---

*本文基于 2026-03-13 的真实排障记录。后续该配置一直稳定运行至今。*
