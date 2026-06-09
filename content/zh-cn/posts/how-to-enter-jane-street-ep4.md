---
title: "如何进入 Jane Street（第4期）：交易员的系统思维"
date: 2026-06-10T00:00:00+08:00
description: "为什么理解延迟层次、并发模型、缓存友好的数据结构和 DDIA 原则对量化交易至关重要——以及 Jane Street 的 OCaml 技术栈如何把它们串起来。"
tags: ["Jane Street", "系统设计", "低延迟", "并发", "数据结构", "面试准备"]
draft: false
series: jane-street
---

上一期我深入聊了 OCaml。这次把视野放大：即使你写出了完美的 OCaml 代码，如果它底下的系统不够快、不够稳、不够可靠，策略照样一文不值。Jane Street 对每个人都有这个要求——不光是工程师——你得能对整个系统做推理。他们的面试也反映了这一点。所以这次聊交易员的系统思维。

## 为什么 Trader 需要系统思维

传统量化面试可能会问："这个赌注的期望值是多少？"Jane Street 会继续追问："你的策略发出买入信号，从信号到下单需要 50 微秒。这够快吗？延迟主要卡在哪里？你怎么发现瓶颈？"

回答不了这些问题，意味着你不了解策略之下那个系统。网络栈、序列化格式、存储订单簿的数据结构、编排一切的并发模型——Jane Street 的哲学是：**每个人都应该能读懂并推理整个系统**，从行情处理器到风控检查到下单模块。

## 延迟的层次

交易系统的延迟是一层层叠加的，每一层都在收税：

| 层级 | 典型延迟 | 例子 | 关键优化 |
|------|---------|------|---------|
| 光速物理极限 | ~3 ns/m | 芝加哥↔纽约光纤 ≈ 12 ms | 共置机房 |
| 内核网络栈 | 1–10 μs | NIC → 内核 TCP → 应用 | 内核旁路 (DPDK, Solarflare) |
| 序列化 | 0.1–1 μs | Protobuf, FlatBuffers, SBE | 零拷贝, 固定宽度格式 |
| 内存访问 | 1–100 ns | L1 ≈ 1 ns, L2 ≈ 4 ns, L3 ≈ 10 ns, DRAM ≈ 100 ns | 缓存友好布局 |
| 锁/同步 | 10–1000 ns | Mutex, CAS, Spinlock | 无锁数据结构 |
| 应用逻辑 | 100 ns–10 μs | 定价计算、风控检查 | 算法选择, SIMD |

物理规律不可改变：芝加哥到纽约在光纤中的光速传播大约 12 毫秒，再多软件优化也改不了这个数字。软件能改的，是这个底线上面的所有东西。关键决策是：哪些层值得优化，哪些已经够快了。

一个实用的练习：给你的系统画一张延迟预算图。从行情数据包到达网卡那一刻起，到你的订单发出去那一刻止，时间都花在了哪里？你经常会发现瓶颈不在你以为的地方。

## 并发模型：Jane Street 的选择

并发编程有四大主流方案。Jane Street 是有意选了其中一种。

**共享状态 + 锁**（pthreads, Java synchronized）是大多数系统的默认选择，也是坑最多的方案：死锁、优先级反转、只在高并发特定交织下才暴露的竞态条件。Jane Street 几乎不用这种模式。

**Actor 模型**（Erlang, Akka）给每个实体一个隔离的邮箱。容错做得很好（supervisor tree）。Erlang 在电信和支付系统中被大规模使用。但 Erlang 的类型系统是动态的，这对 Jane Street 来说不可接受。

**CSP**（Go channels）很干净："不要通过共享内存来通信，而要通过通信来共享内存。"Goroutine 轻量，模型容易学。但 Go 的类型系统给不了 OCaml 那种穷尽性检查的保证。

**Async/事件驱动**是 Jane Street 的选择。OCaml 的 `Async` 库提供延迟计算（deferred）——本质上是 Promise——通过显式的绑定点（`>>=` 或 `let%bind`）来串联。OCaml 5 之前，运行时是单线程的，这意味着**数据竞争在构造上就不可能存在**。OCaml 5 加了 `Domain` 实现真正的并行，但 `Deferred` 的惯用写法保留了下来。

这对面试意味着什么：如果有人问"你怎么处理并发的订单提交？"，OCaml 流畅的回答涉及用 `Deferred.t` 值通过 `let%bind` 组合，类型系统确保你在每个阶段都处理了成功和失败两种情况。你获得了可组合性、可预测性，以及编译器在背后盯着你。

```ocaml
(* 伪代码：带风控检查的下单流程 *)
let submit_order order =
  let open Deferred.Let_syntax in
  let%bind risk_ok = Risk.check order in
  if risk_ok then
    let%bind confirmation = Exchange.send order in
    return (Ok confirmation)
  else
    return (Error "风控检查未通过")
```

`let%bind` 让异步序列显式化。没有隐藏的回调。没有回调地狱。`submit_order` 的类型是 `order -> (confirmation, string) result Deferred.t`——光看签名就能读出合约。

## 交易系统的数据结构选型

交易系统的不同部分需要不同的数据结构。核心问题：**你的负载是读多还是写多？是延迟敏感还是吞吐敏感？**

| 组件 | 结构 | 原因 |
|------|------|------|
| 订单簿 | 红黑树或 B-tree（按价格排序）| O(log n) 插入删除，有序遍历用于撮合 |
| 最近成交 | Ring buffer（固定大小）| O(1) 写入，无 GC 压力，旧数据自然丢弃 |
| 持仓查询 | Hash map（ticker → position）| O(1) 查询"我持有多少 AAPL？" |
| 价格级别聚合 | 分层 hash map（价格 → 该价位所有订单）| 快速访问某一价格上的全部订单 |
| 时间序列 | 分段数组 + 滚动窗口 | 缓存友好的顺序访问，计算指标方便 |
| 事件队列 | 无锁 MPSC（多生产者单消费者）| 低延迟摄入来自多个数据源的事件 |

Ring buffer 存储最近成交值得展开说一下。在 OCaml 这种有 GC 的语言里，每来一个 tick 就分配一个对象，会产生大量垃圾，最终触发 GC 暂停。预分配的 ring buffer 用固定大小记录，写入是 O(1)，旧数据直接被覆盖，GC 没事可做。

### 无锁编程基础

无锁编程的基础构件是 **CAS**（Compare-And-Swap）：一条原子 CPU 指令，只在当前值等于期望值时才写入新值。

```
CAS(地址, 期望值, 新值) → 布尔
  原子操作：
    如果 *地址 == 期望值：*地址 = 新值；返回 true
    否则：返回 false
```

两个值得了解的陷阱：

- **ABA 问题**：线程 1 读到值 A，被抢占。线程 2 把它改成 B，又改回 A。线程 1 的 CAS 成功了——但中间的世界已经变了。解决方案：用带版本号的指针，A→B→A 实际是 A₁→B₂→A₃，CAS 会失败。
- **False sharing**：两个不相关的变量落在同一个 64 字节的 cache line 上。一个线程写其中一个变量时，会使另一个线程的变量所在 cache line 失效——看不见的竞争。解决方案：用 `alignas(64)` 填充，强制分到不同的 cache line。

## 缓存友好的内存布局

CPU 不会逐字节读内存。它按 **cache line**——64 字节的块——来读。当你的数据在内存中顺序排列时，CPU 可以在你处理当前行时预取下一行。这就是为什么数组顺序访问比链表快 10–50 倍。

两种布局模式值得关注：

**结构数组（AoS）**——适合"一次处理一条交易"：
```c
struct Trade { double price; int size; int side; };
Trade trades[N];
```

**数组结构（SoA）**——适合"对所有交易计算 VWAP"：
```c
double prices[N]; int sizes[N]; int sides[N];
```

交易系统倾向于用 SoA，因为常见操作都是批量的：计算最近所有成交的成交量加权均价、按板块汇总持仓、计算全组合 P&L。SoA 让你只碰需要的字段，访问模式是顺序的——预取器的天堂。

对齐也很重要：
```c
// 差：12 字节，可能跨越 cache line
struct Bad  { char flag; int price; double qty; };

// 好：16 字节，自然对齐
struct Good { double qty; int price; char flag; char _pad[3]; };
```

重排后的结构体让 `qty` 对齐到 8 字节边界，整个结构体落在一个 cache line 里。这些微优化听起来学术味很浓，但 Jane Street 每秒处理数百万条消息，10% 的 cache miss 减少累加起来就是真金白银。

## DDIA 原则在交易中的映射

Martin Kleppmann 的《Designing Data-Intensive Applications》是分布式系统的标准教材。它的核心概念可以一一映射到交易场景：

| DDIA 概念 | 交易类比 |
|-----------|---------|
| 延迟 vs. 吞吐 | 下单延迟 vs. 每秒处理消息数 |
| Exactly-once 语义 | 一个重复的网络包绝不能产生一笔重复的订单 |
| 复制 | 多机房冗余，灾难恢复 |
| 分片 | 按标的物把订单路由到不同处理单元 |
| 流处理 | 行情数据 → 策略 → 风控 → 下单的管道 |
| 线性一致性读取 | 风控系统必须看到最新持仓，不能是过期的缓存 |
| 幂等性 | 重传的 FIX 消息不能导致重复成交 |
| 不可变事件日志 | 每个状态转换（NEW → PARTIAL_FILL → FILLED）都记录为一条事件 |

**端到端论证**（end-to-end argument）特别相关：TCP 保证了传输可靠，但你的应用仍然需要处理超时和重试，因为端到端的正确性（我的订单到底成没成交？）是应用层的责任。一个常见的面试场景："你发了一笔订单但没有收到确认。怎么办？"系统思维的回答涉及：考虑订单可能已经成交（所以重发是危险的），实现幂等的订单 ID，以及有对账流程兜底。

## Jane Street 的工程实践（公开信息）

Jane Street 在软件构建方面出奇地透明。以下是公开已知的内容：

- **OCaml 全栈**：交易系统、风控、监控、回测、FPGA 工具链（通过 [Hardcaml](https://github.com/janestreet/hardcaml)）。数百万行 OCaml 代码，从 2002 年维护至今。
- **增量计算**：只重新计算变化的部分。类似 React 的 virtual DOM diff，但用于定价模型和风控计算。当一个 tick 到达时，系统只传播受影响的计算。
- **Dune**：Jane Street 开发并开源了这套构建系统，现在整个 OCaml 社区都在用。
- **magic-trace**：一个开源工具（[GitHub 6k+ stars](https://github.com/janestreet/magic-trace)），利用 Intel Processor Trace 展示进程执行的每一条指令。做出来是因为他们需要理解生产环境中的延迟尖刺。
- **代码审查 + Feature flag**：所有交易相关代码必须经过审查才能部署。新策略先跑 shadow mode——处理真实行情数据，但订单发到模拟交易所——验证之后才接触真实资金。
- **[Signals & Threads 播客](https://signalsandthreads.com/)**：Ron Minsky 主持，与 Jane Street 工程师讨论时钟同步、可靠组播、构建系统、可重配置硬件等话题。这是了解他们工程文化的一扇窗。

## 我的实操练习

为了内化这些概念，我做了三个练习：

1. **延迟预算图**：为一个假想的交易系统画出了从网卡到策略的每一步延迟。发现序列化是贡献最大的意外因素（SBE vs. JSON：编码时间差 5 倍）。

2. **用 OCaml 写订单簿**：用 `Map.Make(String)` 做价格级别查找，ring buffer 存最近成交，`Deferred` 做异步行情处理。类型系统在开发过程中抓了两个 bug：价格查找中一个未处理的 `None`，以及成交逻辑中一个缺失的错误分支。

3. **AoS vs. SoA 基准测试**（C 语言）：对比了结构数组和数组结构在 1000 万条模拟交易上计算 VWAP 的性能差异。SoA 因为 cache miss 更少快了 3.2 倍。结论：数据布局是性能特性，不是审美选择。

## 推荐阅读

| 资源 | 原因 |
|------|------|
| Kleppmann, *Designing Data-Intensive Applications* | 前 3 章讲数据模型、存储引擎和编码，第 5 章讲复制 |
| Bryant & O'Hallaron, *Computer Systems: A Programmer's Perspective* | 第 6 章和第 9 章讲 cache 层次结构和虚拟内存 |
| Martin Thompson 的 [mechanical-sympathy 博客](https://mechanical-sympathy.blogspot.com/) | LMAX Disruptor 作者的实战低延迟调优经验 |
| Jane Street 的 [Signals & Threads 播客](https://signalsandthreads.com/) | 以他们自己的话讲述工程文化和决策过程 |
| Jane Street 的 [GitHub](https://github.com/janestreet) | 读源码：Core, Async, Bignum, Hardcaml, magic-trace |

## 下期预告

第 5 期将深入 **Jane Street 的月度 Puzzles**——他们在 janestreet.com/puzzles 上发布的智力题，以及背后的解题方法论。Puzzles 是 Jane Street 传递"我们看重什么样的思维"的方式，解它们出人意料地是很好的面试准备。

---

*这是"如何进入 Jane Street"13 期系列的第 4 期。[第 1 期](/zh-cn/posts/how-to-enter-jane-street-ep1/)介绍了公司本身。[第 2 期](/zh-cn/posts/how-to-enter-jane-street-ep2/)是概率基础训练营。[第 3 期](/zh-cn/posts/how-to-enter-jane-street-ep3/)介绍了 OCaml。下期：Puzzles。*
