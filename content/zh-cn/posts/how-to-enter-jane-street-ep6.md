---
title: "如何进入 Jane Street（第6期）：市场微结构入门"
date: 2026-06-24T00:00:00+08:00
description: "一个回测 Sharpe 3.0 的策略，实盘可能只剩 0.5——因为市场微结构。本期拆解订单簿、做市商机制、流动性度量、滑点分解、Jane Street 的做市帝国，以及 A 股与美股微结构的关键差异。"
tags: ["Jane Street", "市场微结构", "做市商", "流动性", "订单簿", "面试准备"]
draft: false
series: jane-street
---

我在 Ep.2 学了概率论，Ep.3 写了 OCaml，Ep.4 啃了系统设计。但直到这期，我才碰到那个最让人清醒的问题：为什么一个回测 Sharpe 3.0 的策略，实盘能缩水到 0.5？

答案藏在**市场微结构**里——你的订单怎么跟真实世界交互。概率教你算期望值，OCaml 教你写正确代码，微结构教你的则是：你以为你能以中间价成交，实际上你要付半个 spread；你的大单本身会推动价格；你的限价单排在 500 人后面，可能永远轮不到。

Jane Street 的核心业务就是微结构。他们是全球最大的做市商之一，在 200+ 电子交易所提供流动性。理解微结构，就是理解 Jane Street 怎么赚钱。

## 订单簿：市场的地基层

订单簿（Limit Order Book, LOB）是所有电子交易所的核心数据结构。它长这样：

```
      BIDS                    ASKS
Price  Size    Total    Price  Size    Total
103.00  500     500     103.10  200     200
102.90 1,200   1,700    103.20  800   1,000
102.80 2,000   3,700    103.30 1,500   2,500
102.70 3,000   6,700    103.40 3,000   5,500
```

几个关键术语：

- **Bid**：买方报价，最高买价是 103.00
- **Ask/Offer**：卖方报价，最低卖价是 103.10
- **Spread**：Ask - Bid = 0.10（10 cents）
- **Mid price**：(103.00 + 103.10) / 2 = 103.05
- **BBO (Best Bid/Offer)**：最优买卖报价，就是簿的顶部
- **Depth**：每个价位的订单量

### 撮合规则：价格-时间优先

交易所按两条规则撮合订单：价格优先（买价高的先成交，卖价低的后成交），时间优先（同价位先到的先成交，FIFO）。

这意味着如果你在 BBO 后面排队，你的单要等前面所有同等价位的单成交后才轮到。**队列位置**是高频交易的核心竞争点——同样挂 103.00 买 100 股，比对手晚 1 毫秒下单，可能一整天都成交不了。

### 订单类型全解

| 类型 | 行为 | 场景 |
|------|------|------|
| Market Order | 立即按最优价格成交 | 确定性优先 |
| Limit Order | 只按指定价格或更好成交 | 价格优先 |
| Stop Order | 到达触发价后变成 market/limit | 风险管理 |
| IOC | 立即成交剩余取消 | 不想排队 |
| FOK | 要么全成交要么取消 | 必须完整执行 |
| Iceberg | 只显示部分数量 | 隐藏意图 |
| Post-Only | 必须挂在簿上 | 纯做市（赚 maker rebate）|

## 做市商：流动性的批发商

做市商同时在 bid 和 ask 挂限价单。买入价低，卖出价高，赚取 spread。核心循环很简单：双边报价 → 撮合赚价差 → 管理库存风险。

这跟"低买高卖"的投机有本质区别。做市商提供的是**流动性服务**——别人想买的时候有卖方，想卖的时候有买方。

### 三大风险

**库存风险。** 你买入了很多，价格在跌，库存贬值。解决方案是动态调整报价：库存多了就降低 bid 和 ask，鼓励别人从你这买走。Jane Street 的优势在于全球风险账本可以跨市场对冲。

**逆向选择。** 这是做市商最头疼的问题。你挂在 bid 等着买入，有人主动卖给你——问题是：他为什么卖？如果他知道你不知道的信息，你的每次成交都在被收割。这叫 **toxic flow**（毒性订单流）。来自散户和基金调仓的 non-toxic flow 才是做市商的利润来源。Jane Street 的核心竞争力之一就是区分这两类订单流——这正是 ML 发挥作用的地方。

**操作风险。** 软件 bug 可以在一瞬间摧毁一家公司。2012 年 Knight Capital 因为部署错误，45 分钟内亏损约 $4.4 亿，公司随后被收购。Jane Street 对这类风险的防线是严格的代码审查、多层风控检查和 kill switch。

### Spread 的三要素

经典微结构理论把 spread 拆成三部分：

| 组成 | 含义 |
|------|------|
| Order processing cost | 技术/运营成本，相对固定 |
| Inventory cost | 持有库存的价格风险溢价 |
| Adverse selection cost | 被知情交易者收割的预期损失 |

**Spread = 交易成本 + 库存成本 + 逆向选择成本**

做市商的利润 = 收到的 spread - 实际逆向选择损失 - 库存对冲成本。如果 adverse selection 太高，做市商要么加宽 spread，要么干脆撤单。

## 流动性的四个维度

流动性是一个多维概念，不能只用一个数字概括：

1. **宽度**：bid-ask spread 越窄，流动性越好
2. **深度**：BBO 附近的订单量越大，流动性越好
3. **弹性**：大宗交易后价格恢复的速度
4. **即时性**：多快能以合理价格成交

### 度量指标

| 指标 | 计算 | 用途 |
|------|------|------|
| Quoted Spread | Ask - Bid | 最简单的度量 |
| Effective Spread | 2\|P_exec - Mid\| / Mid | 实际成交成本 |
| Realized Spread | 2\|P_exec - Mid_{t+k}\| / Mid | 扣除永久性影响 |
| Amihud Illiquidity | \|return\| / volume | 价格影响 |
| Kyle's Lambda | ΔP = λ × Q + ε | 市场冲击系数 |

### Kyle 模型：做市商的推理难题

Kyle (1985) 提出了一个优雅的模型。做市商观察到净订单流 Q（买-卖），据此推断是否有知情交易者：

$$\Delta P = \lambda \cdot Q + \epsilon$$

λ 越小说明市场流动性越好。做市商通过调整 λ 来保护自己——当订单流看起来"有毒"时，加宽 spread；当订单流看起来正常时，收紧 spread。

这解释了一个反直觉现象：大额订单面临更大滑点。做市商假设大单可能携带信息，所以报更差的价格。

### Almgren-Chriss：最优执行

如果你要买 100 万股，一次性 market order 会推动价格暴涨。Almgren-Chriss (2001) 模型给出了最优拆单方案：把大单分成小块，在**市场冲击**和**时间风险**之间找平衡。拆得太细，市场冲击小但价格可能漂移；拆得太粗，市场冲击大但时间风险小。这就是 TWAP/VWAP 等执行算法的数学基础。

## 交易场所：不只是交易所

### 美国市场结构

| 类型 | 说明 | 例子 |
|------|------|------|
| Lit Exchange | 公开订单簿 | NYSE, Nasdaq, CBOE |
| Dark Pool | 私下撮合，不显示订单 | Goldman Sigma X, Morgan Stanley MS Pool |
| ATS | 替代交易系统 | 各种 dark pool |
| Wholesaler | 从经纪商接收散户订单 | Citadel Securities, Virtu, Jane Street |

### Maker-Taker 定价模型

美国股票市场有一个独特的收费结构：

- **Maker（提供流动性）**：挂限价单，交易所可能给 rebate（如 -$0.002/share）
- **Taker（消耗流动性）**：吃单，交易所收 fee（如 +$0.003/share）

这导致了一个有趣的现象：做市商可以靠 rebate 盈利，即使 spread 接近零。一些高频做市商在 Rebate 模型下会报极窄甚至"负 spread"。

### Payment for Order Flow (PFOF)

经纪商（如 Robinhood）把散户订单发给特定做市商，做市商付钱获得这些订单。争议的核心是：散户是否获得了最优执行价格？Jane Street 也在美国参与 wholesaling 业务。

## Jane Street 的做市帝国

从 [Jane Street 官网](https://www.janestreet.com/what-we-do/client-offering/)可以读到他们做市规模的公开数据：

| 业务 | 规模 |
|------|------|
| ETF | 10,000+ 只 ETF 全球定价和交易 |
| 股票 | 45+ 个国家 |
| 债券 | 2025 年与客户全球交易超 $900B |
| 期权 | 3,800+ 个活跃期权类别 |
| 交易所 | 200+ 电子交易所和其他场所 |

Jane Street 2000 年成立时以 ETF 做市起家，现在覆盖股票、债券、期权、大宗商品。他们的核心循环大概是这样：

```
客户想买 1M 股 ETF
    ↓
Jane Street 报价 (ask)：比 mid 高 2-5 cents
    ↓
客户接受 → JS 从库存卖出 / 或在对冲市场买入
    ↓
JS 赚取 spread + 可能的 rebates
    ↓
库存偏斜 → 调整后续报价
    ↓
循环继续
```

他们的竞争优势来源于几个维度：OCaml 全栈技术栈和 FPGA 加速；跨市场、跨资产的全球风险账本可以实时对冲；不招金融背景的人，招 puzzle solver；200+ 交易所的连接和关系；无 silos 的文化，trader/researcher/tech 角色融合。

## 滑点：回测和实盘的鸿沟

回到开头的问题：为什么回测和实盘差这么多？滑点的分解公式能给出答案：

$$\text{Slippage} = \frac{\text{Spread}}{2} + \text{Market Impact} + \text{Timing Risk}$$

- **Half-spread**：你假设能以 mid 成交，实际要付半个 spread
- **Market impact**：你的订单本身推动价格朝不利方向移动
- **Timing risk**：等待成交期间价格变动

减少滑点的常见策略包括：限价单（设定最差价格）、TWAP（均匀拆单）、VWAP（按成交量分布拆单）、Dark pool routing（隐藏意图）、Smart order routing（选最优场所）。

## A 股 vs 美股微结构

| 维度 | 美股 | A 股 |
|------|------|------|
| 撮合 | 连续竞价 + 开/收盘拍卖 | 连续竞价 + 集合竞价 (9:15-9:25) |
| 涨跌停 | 无（有 circuit breaker）| ±10%（创业板 ±20%）|
| T+N | T+0 | T+1 |
| 做空 | 广泛可用 | 融券受限 |
| 做市商 | 核心角色 | 有限（流动性服务商）|
| 最小变动 | $0.01 | ¥0.01 |

A 股的做市商角色仍然有限。2015 年起部分 ETF/期权引入做市商制度，科创板和北交所也在尝试。这意味着 A 股的流动性更多依赖自然交易者。

## 实操练习

**练习 1：用 AKShare 观察 A 股流动性。** 获取个股实时行情，计算日内最高价-最低价/昨收作为波动代理，成交额作为流动性代理。比较大盘股和小盘股的差异。

**练习 2：模拟做市。** 用 Python 模拟一个做市商——给定 mid price 和波动率，在 ±spread/2 处挂限价单，模拟随机成交，追踪库存和 PnL。然后加入 adverse selection（假设 5% 的订单来自知情者），观察 PnL 变化。

**练习 3：计算有效 spread。** 如果能获取逐笔数据：effective_spread = 2 × |执行价 - mid| / mid。比较不同股票、不同时段的有效 spread。

## 面试会怎么考

Jane Street 面试中微结构相关问题的典型形态：

> "一个做市商的 spread 是 2 cents，每秒平均成交 10 次。其中 5% 的交易是 toxic flow，每次平均亏 10 cents。他的日 PnL 是多少？"

快速估算：正常交易每秒赚 2 cents × 9.5 次 = 19 cents。Toxic 交易每秒亏 10 cents × 0.5 次 = 5 cents。净赚 14 cents/秒，一天约 $12,096（假设 8 小时）。这类题考的是你能否在时间压力下做合理的数量级估算。

> "为什么限价单在 spread 内但不在 BBO 可能永远不成交？"

因为价格-时间优先。如果 BBO 的订单量足够大，你的单排队等着，但不断有人用 market order 吃掉 BBO，然后新的 limit order 又排到你前面（如果价格更优）。你可能一直排在后面。

## 延伸阅读

- **Larry Harris, *Trading and Exchanges*** — 市场微结构圣经，Jane Street 面试推荐书目
- **Kyle (1985)**, "Continuous Auctions and Insider Trading" — λ 模型的原始论文
- **Almgren & Chriss (2001)** — 最优执行模型
- **Easley & O'Hara** — 逆向选择与信息分解的系列论文
- Jane Street 官网 [what-we-do](https://www.janestreet.com/what-we-do/) 页面：做市规模数据
- [Signals & Threads](https://signalsandthreads.com) 播客：工程视角看交易系统

---

这是 Jane Street 系列的第 6 期。上一期我们拆解了谜题方法论，下一期我们要聊费米问题与数量级估算。

如果你觉得有用，[告诉我](https://github.com/shizhuocheng/hugo-eternal-blogs)。如果你想准备 Jane Street 面试，从订单簿开始理解市场——这比背任何公式都重要。
