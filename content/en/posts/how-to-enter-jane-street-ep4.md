---
title: "How to Enter Jane Street (Ep.4): Systems Thinking for Traders"
date: 2026-06-10T00:00:00+08:00
description: "Why understanding latency hierarchies, concurrency models, cache-friendly data structures, and DDIA principles matters for quant trading — and how Jane Street's OCaml stack ties it all together."
tags: ["Jane Street", "Systems Design", "Low Latency", "Concurrency", "Data Structures", "Interview Preparation"]
draft: false
series: jane-street
---

Last episode I went deep on OCaml. This time the lens widens: even if you write perfect OCaml, your strategy is worthless if the system around it can't deliver trades fast enough, reliably enough, or at all. Jane Street expects *everyone* — not just the engineers — to reason about systems. Their interviews reflect this. So let's talk about systems thinking for traders.

## Why Traders Need Systems Thinking

A classic quant interview might ask: "What's the expected value of this bet?" Jane Street goes further: "Your strategy signals a buy. It takes 50 microseconds from signal to order. Is that fast enough? What dominates the latency? How would you find out?"

You can't answer without understanding the system underneath your strategy. The network stack. The serialization format. The data structures holding the order book. The concurrency model orchestrating everything. Jane Street's philosophy: **everyone should be able to read and reason about the whole system**, from market data handler to risk check to order submission.

## The Latency Hierarchy

Latency in a trading system is a stack of layers, each contributing its own tax:

| Layer | Typical latency | Example | Key optimization |
|-------|----------------|---------|------------------|
| Speed of light | ~3 ns/m | Chicago↔NYC fiber ≈ 12 ms | Co-location |
| Kernel network stack | 1–10 μs | NIC → kernel TCP → app | Kernel bypass (DPDK, Solarflare) |
| Serialization | 0.1–1 μs | Protobuf, FlatBuffers, SBE | Zero-copy, fixed-width formats |
| Memory access | 1–100 ns | L1 ≈ 1 ns, L2 ≈ 4 ns, L3 ≈ 10 ns, DRAM ≈ 100 ns | Cache-friendly layout |
| Locking/synchronization | 10–1000 ns | Mutex, CAS, spinlock | Lock-free structures |
| Application logic | 100 ns–10 μs | Pricing, risk checks | Algorithm choice, SIMD |

The physics is immutable: Chicago to New York at the speed of light in fiber is about 12 milliseconds, and no amount of software optimization changes that. What software *can* change is everything above that floor. The game is deciding which layers are worth optimizing and which are already fast enough.

A practical exercise: draw a latency budget for your system. From the moment a market data packet arrives at the NIC to the moment your order leaves. Where does the time go? You'll often find that the bottleneck isn't where you assumed.

## Concurrency Models: How Jane Street Does It

There are four major approaches to concurrent programming. Jane Street picked one deliberately.

**Shared state + locks** (pthreads, Java synchronized) is the default in most systems. It's also the one with the most foot-guns: deadlocks, priority inversion, race conditions that only manifest under specific interleavings. Jane Street avoids this pattern almost entirely.

**Actor model** (Erlang, Akka) gives each entity an isolated mailbox. Fault tolerance is excellent (supervisor trees). Erlang powers telecom and payment systems at massive scale. But Erlang's type system is dynamic, which is a non-starter for Jane Street.

**CSP** (Go channels) is clean: "Don't communicate by sharing memory; share memory by communicating." Goroutines are lightweight and the model is easy to learn. But Go's type system doesn't give you the exhaustiveness guarantees OCaml does.

**Async/event-driven** is Jane Street's choice. OCaml's `Async` library provides deferred computations — essentially promises — with explicit bind points (`>>=` or `let%bind`). Before OCaml 5, the runtime was single-threaded, which meant zero data races by construction. OCaml 5 added `Domain` for true parallelism, but the `Deferred` idiom remains.

Why this matters for interviews: if someone asks "how would you handle concurrent order submissions?", the OCaml-fluent answer involves `Deferred.t` values composed through `let%bind`, with the type system ensuring you handle both success and failure at every stage. You get composability, predictability, and the compiler watching your back.

```ocaml
(* Pseudocode: submit order with risk check *)
let submit_order order =
  let open Deferred.Let_syntax in
  let%bind risk_ok = Risk.check order in
  if risk_ok then
    let%bind confirmation = Exchange.send order in
    return (Ok confirmation)
  else
    return (Error "Risk check failed")
```

The `let%bind` makes the async sequence explicit. No hidden callbacks. No callback hell. The type of `submit_order` is `order -> (confirmation, string) result Deferred.t` — you can read the contract from the signature alone.

## Data Structures for Trading

Different parts of a trading system need different structures. The key question: **is your workload read-heavy or write-heavy? Latency-sensitive or throughput-sensitive?**

| Component | Structure | Why |
|-----------|-----------|-----|
| Order book | Red-black tree or B-tree (price-ordered) | O(log n) insert/delete, ordered traversal for matching |
| Recent ticks | Ring buffer (fixed-size) | O(1) writes, no GC pressure, oldest data drops off naturally |
| Position lookup | Hash map (ticker → position) | O(1) lookup for "how many AAPL do I hold?" |
| Price-level aggregation | Tiered hash map (price → orders at that level) | Fast access to all orders at a given price |
| Time series | Segmented arrays + rolling window | Cache-friendly sequential access for indicator computation |
| Event queue | Lock-free MPSC (multi-producer, single-consumer) | Low-latency ingestion from multiple data feeds |

A ring buffer for ticks is worth explaining. In a GC'd language like OCaml, allocating objects for every incoming tick creates garbage that eventually triggers a collection pause. A pre-allocated ring buffer of fixed-size records avoids this: writes are O(1), old data is simply overwritten, and the GC has nothing to do.

### Lock-Free Fundamentals

The building block of lock-free programming is **CAS** (Compare-And-Swap): an atomic CPU instruction that writes a new value only if the current value matches what you expect.

```
CAS(addr, expected, new) → bool
  atomically:
    if *addr == expected: *addr = new; return true
    else: return false
```

Two pitfalls worth knowing:

- **ABA problem**: Thread 1 reads value A, gets preempted. Thread 2 changes it to B, then back to A. Thread 1's CAS succeeds — but the world changed in between. Fix: use a versioned pointer so A→B→A is actually A₁→B₂→A₃, and the CAS fails.
- **False sharing**: Two unrelated variables land on the same 64-byte cache line. When one thread writes one variable, it invalidates the cache line for the other thread's variable — invisible contention. Fix: pad with `alignas(64)` to force separate cache lines.

## Cache-Friendly Memory Layout

CPUs don't read memory byte-by-byte. They read in **cache lines** — 64-byte chunks. When your data is laid out sequentially in memory, the CPU can prefetch the next line while you process the current one. This is why arrays can be 10–50× faster than linked lists for sequential access.

Two layout patterns matter:

**Array of Structures (AoS)** — natural for "process one trade at a time":
```c
struct Trade { double price; int size; int side; };
Trade trades[N];
```

**Structure of Arrays (SoA)** — natural for "compute VWAP across all trades":
```c
double prices[N]; int sizes[N]; int sides[N];
```

Trading systems tend to favor SoA because the common operations are batch-oriented: compute volume-weighted average price across all recent fills, sum positions by sector, calculate P&L across the portfolio. SoA lets you touch only the field you need, and the access pattern is sequential — prefetcher heaven.

Alignment matters too:
```c
// Bad: 12 bytes, may straddle a cache line
struct Bad  { char flag; int price; double qty; };

// Good: 16 bytes, naturally aligned
struct Good { double qty; int price; char flag; char _pad[3]; };
```

The reordered struct keeps `qty` aligned to an 8-byte boundary and the whole struct within a single cache line. These micro-optimizations sound academic until you realize Jane Street processes millions of messages per second and a 10% cache miss reduction compounds into real money.

## DDIA Principles in Trading

Martin Kleppmann's *Designing Data-Intensive Applications* is the standard text for distributed systems. Its core ideas map directly to trading:

| DDIA concept | Trading analog |
|--------------|---------------|
| Latency vs. throughput | Order latency vs. messages processed per second |
| Exactly-once semantics | A duplicated network packet must not produce a duplicate order |
| Replication | Multi-datacenter redundancy for disaster recovery |
| Partitioning | Route orders by symbol to different processing shards |
| Stream processing | Market data → strategy → risk check → order submission pipeline |
| Linearizable reads | Risk system must see the latest position, not a stale cache |
| Idempotence | Retransmitted FIX messages must not cause double-execution |
| Immutable event log | Every state transition (NEW → PARTIAL_FILL → FILLED) recorded as an event |

The **end-to-end argument** is especially relevant: TCP guarantees reliable transport, but your application still needs to handle timeouts and retries because the *end-to-end* correctness (did my order actually execute?) is an application-level concern. A common interview scenario: "You sent an order but didn't receive an acknowledgment. What do you do?" The systems-thinking answer involves considering whether the order might have been executed (so resending is dangerous), implementing idempotent order IDs, and having a reconciliation process.

## Jane Street's Engineering Practices (From Public Sources)

Jane Street is unusually transparent about how they build software. Here's what's publicly known:

- **OCaml everywhere**: Trading systems, risk management, monitoring, backtesting, FPGA tooling (via [Hardcaml](https://github.com/janestreet/hardcaml)). Millions of lines of OCaml, maintained since 2002.
- **Incremental computation**: Only recompute what changed. Think React's virtual DOM diff, but for pricing models and risk calculations. When a single tick arrives, the system propagates only the affected computations.
- **Dune**: Jane Street developed and open-sourced the build system that the entire OCaml community now uses.
- **magic-trace**: An open-source tool ([6k+ GitHub stars](https://github.com/janestreet/magic-trace)) that uses Intel Processor Trace to show exactly what a process did, instruction by instruction. Built because they needed to understand latency spikes in production.
- **Code review + feature flags**: All trading-related code is reviewed before deployment. New strategies run in shadow mode first — processing real market data but sending orders to a simulated exchange — before touching real capital.
- **[Signals & Threads podcast](https://signalsandthreads.com/)**: Ron Minsky hosts conversations with Jane Street engineers on topics like clock synchronization, reliable multicast, build systems, and reconfigurable hardware. It's a window into the engineering culture.

## What I Practiced

To internalize these concepts, I worked through three exercises:

1. **Latency budget diagram**: Mapped every step from NIC to strategy for a hypothetical trading system. Identified that serialization was the biggest surprise contributor (SBE vs. JSON: a 5× difference in encode time).

2. **Order book in OCaml**: Used `Map.Make(String)` for price-level lookup, a ring buffer for recent ticks, and `Deferred` for async market-data processing. The type system caught two bugs during development: an unhandled `None` in the price lookup and a missing error case in the fill logic.

3. **AoS vs. SoA benchmark** (in C): Measured the difference between array-of-struct and struct-of-array layouts for computing VWAP across 10 million simulated trades. SoA was 3.2× faster due to fewer cache misses. The lesson: data layout is a performance feature, not a cosmetic choice.

## Recommended Reading

| Resource | Why |
|----------|-----|
| Kleppmann, *Designing Data-Intensive Applications* | Chapters 1–3 for data models, storage, encoding; Chapter 5 for replication |
| Bryant & O'Hallaron, *Computer Systems: A Programmer's Perspective* | Chapters 6 and 9 for cache hierarchy and virtual memory |
| Martin Thompson's [mechanical-sympathy blog](https://mechanical-sympathy.blogspot.com/) | Practical low-latency tuning from the LMAX Disruptor author |
| Jane Street's [Signals & Threads podcast](https://signalsandthreads.com/) | Engineering culture and decision-making in their own words |
| Jane Street's [GitHub](https://github.com/janestreet) | Read the source: Core, Async, Bignum, Hardcaml, magic-trace |

## What's Next

Episode 5 will dive into **Jane Street's monthly puzzles** — the brain teasers they publish at janestreet.com/puzzles, and the problem-solving methodology behind them. Puzzles are how Jane Street signals the kind of thinking they value, and solving them is surprisingly good interview prep.

---

*This is part of a 13-episode series on preparing for Jane Street. [Ep.1](/en/posts/how-to-enter-jane-street-ep1/) covered the company. [Ep.2](/en/posts/how-to-enter-jane-street-ep2/) was a probability bootcamp. [Ep.3](/en/posts/how-to-enter-jane-street-ep3/) introduced OCaml. Next: puzzles.*
