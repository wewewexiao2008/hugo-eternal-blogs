---
title: "OpenClaw Memory Search: Routing Embeddings Separately to AiHubMix"
date: 2026-03-13T19:40:00+08:00
description: "When your chat provider doesn't support embeddings, how to point OpenClaw's memory_search independently to AiHubMix — including diagnosis, configuration, and verification."
series: openclaw
tags: ["OpenClaw", "AiHubMix", "Embeddings", "Memory Search", "Ops"]
draft: false
---

## The Problem

One day I noticed `memory_search` was completely broken — every query returned empty results. But chat worked fine; the model could converse and write code. What was going on?

## Diagnosis

OpenClaw's memory retrieval pipeline works like this:

```
memory_search tool call
  → OpenClaw internal embedding API
  → converts query text to a vector
  → cosine similarity search against vectorized MEMORY.md + memory/*.md
  → returns top-N matching snippets
```

The key insight: **the embedding API and the chat API can be different endpoints.** At the time, I had pointed all of OpenClaw at an OpenAI-compatible proxy (`codez.zwenooo.link`) that handled chat completions fine but didn't support the `/v1/embeddings` endpoint.

So chat worked, but `memory_search` couldn't get vectors, and the retrieval chain broke.

## Solution: Separate Chat and Embeddings

OpenClaw's `agents.defaults.memorySearch` config supports an independent provider. No need to change your chat provider — just point memory search at a service that supports embeddings.

### Why AiHubMix

AiHubMix is an OpenAI-compatible multi-model proxy that supports `text-embedding-3-small` (1536 dimensions), costs almost nothing ($0.02/1M tokens), and is fast from within China. For high-frequency, low-token scenarios like memory retrieval, it's the most economical choice.

### Configuration

```json5
agents: {
  defaults: {
    memorySearch: {
      enabled: true,
      provider: "openai",       // OpenAI-compatible protocol
      model: "text-embedding-3-small",
      fallback: "none",         // don't fall back to local; fail loudly
      remote: {
        baseUrl: "https://aihubmix.com/v1",
        apiKey: "YOUR_AIHUBMIX_KEY"
      }
    }
  }
}
```

Only `memorySearch` changed. Chat still goes through the original provider. Zero interference.

## Verification

After applying the config, use a simple three-step test:

1. **Write unique content**: Add a record to `memory/YYYY-MM-DD.md` with a unique keyword (e.g., "test embedding marker zxcvbn")
2. **Wait for indexing**: Give OpenClaw a few seconds to index the new record
3. **Search**: Call `memory_search` with "zxcvbn" and confirm the snippet is returned

If the result comes back with a score > 0.3, the full chain — embedding → vector index → similarity search — is working.

## The Bigger Picture

This pattern solves a common problem: **proxies in China usually only proxy chat, not embeddings.** With the independent `memorySearch.remote` config, you can:

- Route chat through a self-hosted or third-party proxy
- Route embeddings through AiHubMix or direct OpenAI
- Keep the two fully decoupled for easier debugging

If your OpenClaw memory search suddenly stops working, the first thing to check: **does your chat provider also support embeddings?** If not, this is your fix.

---

*Based on a real debugging session on 2026-03-13. The configuration has been running stably ever since.*
