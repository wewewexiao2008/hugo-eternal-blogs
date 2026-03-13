---
title: "Using AiHubMix Embeddings for OpenClaw Memory Search"
date: 2026-03-13T19:40:00+08:00
description: "Configure OpenClaw memorySearch to use AiHubMix embeddings while keeping the chat provider unchanged, then verify memory write/read works."
tags: ["OpenClaw", "AiHubMix", "Embeddings", "Memory Search"]
---

## Problem

Chat worked, but semantic memory search stopped working.

## Cause

`memory_search` depends on an embedding endpoint, not the chat endpoint.
The existing OpenAI-compatible chat provider could handle chat requests, but did not provide usable embeddings.

## Fix

Only change `agents.defaults.memorySearch` and keep chat untouched:

- provider: `openai`
- model: `text-embedding-3-small`
- baseUrl: `https://aihubmix.com/v1`
- fallback: `none`

This keeps chat on the original provider while routing memory embeddings to AiHubMix.

## Verification

The setup was verified successfully:

- `text-embedding-3-small` returned a valid vector (1536 dims)
- A new note written to `memory/2026-03-13.md` was retrievable via `memory_search`
- `MEMORY.md` was updated as well

## Takeaway

If your chat provider is an OpenAI-compatible proxy, the safest approach is:

- configure chat and embeddings separately
- do not assume the chat endpoint also supports embeddings

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

Validation steps:
1. Write a memory note with a unique phrase
2. Call `memory_search`
3. Confirm the corresponding snippet is returned

</details>
