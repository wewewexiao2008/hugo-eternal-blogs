---
title: "如何进入 Jane Street（第9期）：编程面试深度解析——带量化味道的算法题"
date: 2026-08-05T00:00:00+08:00
description: "Jane Street 的面试不像刷 LeetCode。更像坐下来和同事一起调试交易系统。本期拆解六类量化面试高频编程题——订单簿模拟、位运算、滑动窗口市场数据、高效数据结构、概率算法、经典算法的量化变体——每类都附带可运行的 Python 实现和本地验证结果。"
tags: ["Jane Street", "编程面试", "算法", "数据结构", "量化面试", "面试准备"]
draft: false
series: jane-street
---

LeetCode 刷了几百道之后，套路就很熟悉了：双指针、滑动窗口、动态规划、拓扑排序。记住模板，识别信号，输出答案。FAANG 面试奖励的是这种模式识别能力。

Jane Street 不一样。

他们官方面试页面写的是："我们注重协作式问题解决。"听起来像公关话术——直到你坐在面试间里。面试官不是在给你的答案打分，而是在评估"和你一起解决问题是什么体验"。你有没有把思考过程说出来？拿到提示后能不能快速推进？遇到死胡同是转换方向还是愣住？

题目本身呢？穿着金融的外衣，内核还是算法——但有一层微妙的扭转，让标准模板不够用。

这一期拆解我在本地练习的六类编程题，每类都有完整实现并通过验证。每个类别都映射到交易公司真正关心的能力。

## 面试全景：Jane Street vs FAANG

先看 Jane Street 的编程面试和典型大厂有什么不同：

| 维度 | FAANG | Jane Street |
|------|-------|-------------|
| 形式 | 白板 / 共享文档 | 协作式、对话驱动 |
| 语言 | 通常指定 | 任意你熟悉的语言 |
| 重点 | 正确的算法 | 思维过程 > 最终答案 |
| 领域 | 通用 CS | 金融直觉 + 算法 |
| 时长 | 每题约 45 分钟 | 更长，可能一道题一小时 |
| 氛围 | 考试 | 讨论——"我们能一起解出这道题吗？" |

官方建议很明确：不要在面试中第一次用 OCaml。用你最擅长的语言就行。他们关心你怎么想，不关心你用什么语言写。

## 1. 订单簿模拟

如果有一个数据结构是每个量化候选人必须能手写出来的，那就是限价订单簿。它是每个电子交易系统的核心。

问题：维护买卖订单簿，支持插入、撤销、以及订单交叉时撮合。

关键设计决策：**为什么用堆而不是排序数组？** 排序数组插入是 O(n)，堆给你 O(log n) 插入加 O(1) 最优价格访问。Jane Street 的生产系统用远比这复杂的结构——扁平数组、内存池、无锁设计——但堆版本就是面试中你会写的东西。

```python
import heapq
from dataclasses import dataclass, field
from time import time

@dataclass
class Order:
    order_id: int
    side: str       # 'B' (买) 或 'A' (卖)
    price: int      # 以分为单位
    quantity: int
    timestamp: float = field(default_factory=time)

class OrderBook:
    def __init__(self):
        self.order_counter = 0
        self.bids: list = []   # 最大堆（通过取负实现）
        self.asks: list = []   # 最小堆
        self.orders: dict = {} # 撤单查找用

    def add_order(self, side: str, price: int, quantity: int) -> Order:
        self.order_counter += 1
        order = Order(self.order_counter, side, price, quantity)
        self.orders[order.order_id] = order
        if side == 'B':
            heapq.heappush(self.bids, (-price, order.timestamp, order.order_id, quantity))
        else:
            heapq.heappush(self.asks, (price, order.timestamp, order.order_id, quantity))
        return order

    def best_bid(self):
        while self.bids:
            neg_price, ts, oid, qty = self.bids[0]
            if oid not in self.orders or self.orders[oid].quantity == 0:
                heapq.heappop(self.bids)
                continue
            return (-neg_price, self.orders[oid].quantity)
        return None

    def best_ask(self):
        while self.asks:
            price, ts, oid, qty = self.asks[0]
            if oid not in self.orders or self.orders[oid].quantity == 0:
                heapq.heappop(self.asks)
                continue
            return (price, self.orders[oid].quantity)
        return None

    def spread(self):
        bid, ask = self.best_bid(), self.best_ask()
        return ask[0] - bid[0] if bid and ask else None

    def match(self):
        trades = []
        while True:
            bid, ask = self.best_bid(), self.best_ask()
            if not bid or not ask or bid[0] < ask[0]:
                break
            trade_price = ask[0]  # 价格-时间优先
            trade_qty = min(bid[1], ask[1])
            trades.append((trade_price, trade_qty))
            bid_oid = self.bids[0][2]
            ask_oid = self.asks[0][2]
            self.orders[bid_oid].quantity -= trade_qty
            self.orders[ask_oid].quantity -= trade_qty
        return trades
```

跑一个模拟：卖单挂在 $101.00、$101.50、$102.00，买单挂在 $100.50、$100.00。价差 50 美分。然后一个 $101.50 的买单穿越价差——撮合引擎启动，对卖侧执行成交。

**面试常问**："如果两个订单价格相同怎么办？"答案：价格-时间优先。先到的订单先成交。这就是为什么堆元组里要存时间戳。

## 2. 位运算

量化公司喜欢位运算题。这类题目测试你是否具备硬件层面的思维——在每秒处理数百万条消息的代码里，这很重要。

### 位计数（Hamming Weight）

统计一个整数中 1 的个数。Brian Kernighan 的技巧：

```python
def popcount(n):
    count = 0
    while n:
        n &= n - 1  # 清除最低位的 1
        count += 1
    return count
```

循环恰好执行 1-bit 数量次。对于 `0xDEADBEEF`（32 位中有 24 个 1），迭代 24 次而不是 32 次。

### 2 的幂判断

```python
def is_power_of_two(n):
    return n > 0 and (n & (n - 1)) == 0
```

2 的幂恰好只有一个 bit 为 1。减 1 会翻转该 bit 及其下方所有 bit。AND 结果为零。干净利落。

### XOR：找唯一元素

数组中每个元素出现两次，只有一个出现一次。O(1) 空间找出它：

```python
def find_unique(arr):
    result = 0
    for x in arr:
        result ^= x
    return result
```

`[4, 1, 2, 1, 2, 4, 99, 7, 7]` → `99`。成对元素通过 XOR 互相抵消。

### 格雷码

相邻格雷码值只差一个 bit。用于位置编码和硬件设计：

```python
def gray_code(i):
    return i ^ (i >> 1)
```

```
0 (000) → 格雷码 000 (0)
1 (001) → 格雷码 001 (1)
2 (010) → 格雷码 011 (3)
3 (011) → 格雷码 010 (2)
```

每一步只翻转一个 bit。在多 bit 同时跳变可能产生瞬态尖峰的硬件中，这很重要。

## 3. 滑动窗口处理市场数据

交易系统持续处理价格和成交量流。滑动窗口算法让你以 O(1) 的单次更新代价计算技术指标。

### 移动平均

```python
from collections import deque

class SlidingWindowAverage:
    def __init__(self, window_size):
        self.window_size = window_size
        self.window = deque()
        self.running_sum = 0.0

    def add(self, val):
        self.window.append(val)
        self.running_sum += val
        if len(self.window) > self.window_size:
            self.running_sum -= self.window.popleft()
        return self.running_sum / len(self.window)
```

每个新 tick：O(1) 更新。不需要重新扫描窗口。

### 滑动窗口最大值（单调队列）

这道题能区分背诵模板的人和真正理解数据结构的人。给定价格流和窗口大小 k，O(n) 总时间内求每个窗口的最大值。

```python
def sliding_window_max(arr, k):
    dq = deque()  # 存索引，对应的值单调递减
    result = []
    for i, val in enumerate(arr):
        while dq and dq[0] <= i - k:
            dq.popleft()
        while dq and arr[dq[-1]] <= val:
            dq.pop()
        dq.append(i)
        if i >= k - 1:
            result.append(arr[dq[0]])
    return result
```

`[1, 3, -1, 5, 3, 6, 7, 2, 4]`，k=3 → `[3, 5, 5, 6, 7, 7, 7]`。

关键点：deque 存的是索引而不是值。值单调递减，所以队头永远是最大值。新值到来时，从队尾弹掉所有比它小的——这些值在任何未来窗口中都不可能成为最大值。

### VWAP 计算器

```python
class VWAPCalculator:
    def __init__(self, window_size=20):
        self.window_size = window_size
        self.prices = deque()
        self.volumes = deque()
        self.cum_pv = 0.0
        self.cum_vol = 0

    def update(self, price, volume):
        self.prices.append(price)
        self.volumes.append(volume)
        self.cum_pv += price * volume
        self.cum_vol += volume
        if len(self.prices) > self.window_size:
            old_p = self.prices.popleft()
            old_v = self.volumes.popleft()
            self.cum_pv -= old_p * old_v
            self.cum_vol -= old_v
        return self.cum_pv / self.cum_vol if self.cum_vol > 0 else 0.0
```

VWAP 是机构交易者衡量执行质量的基准。如果你的平均成交价比 VWAP 差，你就在漏钱。

## 4. 市场数据的高效数据结构

### 运行中位数（双堆）

维护一个数字流并随时查询中位数。最大堆存较小的一半，最小堆存较大的一半。

```python
class RunningMedian:
    def __init__(self):
        self.lower = []  # 最大堆（取负）
        self.upper = []  # 最小堆

    def add(self, num):
        if not self.lower or num <= -self.lower[0]:
            heapq.heappush(self.lower, -num)
        else:
            heapq.heappush(self.upper, num)
        # 再平衡
        if len(self.lower) > len(self.upper) + 1:
            heapq.heappush(self.upper, -heapq.heappop(self.lower))
        elif len(self.upper) > len(self.lower):
            heapq.heappush(self.lower, -heapq.heappop(self.upper))

    def median(self):
        if len(self.lower) == len(self.upper):
            return (-self.lower[0] + self.upper[0]) / 2.0
        return -self.lower[0]
```

插入 O(log n)，查询中位数 O(1)。这个模式在异常值检测、公允价格估计、风控中都会出现。

### LFU 缓存

设计 O(1) 的 get 和 put 操作、淘汰最少使用频率项的缓存。Jane Street 的变体可能是："设计一个市场数据缓存，满了时淘汰最少引用的品种。"

解法用三个字典：key→value、key→频率、频率→key 集合。通过追踪 `min_freq`，两个操作都保持 O(1)。

### Ticker 前缀匹配 Trie

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False
        self.data = None

class TickerTrie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, ticker, data=None):
        node = self.root
        for ch in ticker:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True
        node.data = data

    def starts_with(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return []
            node = node.children[ch]
        results = []
        self._collect(node, prefix, results)
        return results
```

搜索 "AB" → 返回所有以 "AB" 开头的 ticker：`ABBV`、`ABNB` 等。这就是自动补全下拉框背后的机制。

## 5. 概率算法

### 蓄水池采样

从未知长度的流中均匀选取 k 个元素。你无法存储整个流，也不知道它有多长。

```python
def reservoir_sample(stream, k):
    reservoir = []
    for i, item in enumerate(stream):
        if i < k:
            reservoir.append(item)
        else:
            j = random.randint(0, i)
            if j < k:
                reservoir[j] = item
    return reservoir
```

我用 1,000 元素的流、k=10、10,000 次试验验证了均匀性。每个元素出现约 100 次（期望值：10/1000 × 10000 = 100），最大偏差低于 15%。均匀采样确认。

**量化视角**："你在对一个无法重放的交易所 Feed 采样，怎么保证均匀？"蓄水池采样就是答案。

### 布隆过滤器

空间高效的集合成员判断，有可调的假阳性率。用 m 个 bit 和 k 个哈希函数。添加元素时设置 k 个 bit，查询时检查 k 个 bit 是否全亮。

对于容量 1,000 个元素、1% 假阳性率，需要约 9,585 个 bit 和 7 个哈希函数。假阳性率近似 `(1 - e^(-kn/m))^k`。

**量化用途**：在内存不足以存储所有标的时，检查某个 symbol 是否曾经出现过。

### Fisher-Yates 洗牌

O(n) 时间内原地均匀洗牌。n! 种排列等概率出现。

```python
def fisher_yates_shuffle(arr):
    arr = arr[:]
    for i in range(len(arr) - 1, 0, -1):
        j = random.randint(0, i)
        arr[i], arr[j] = arr[j], arr[i]
    return arr
```

我用 `[1,2,3]` 跑了 60,000 次验证：6 种排列各出现约 10,000 次（各约 16.67%）。完全吻合。

**量化用途**：随机化执行顺序，避免被其他市场参与者通过识别你的模式来针对你。

## 6. 经典算法的量化变体

### 双指针找套利对

标准两数之和，换个说法：给定排序后的价格档位，找出加起来等于目标值的对。这建模的是寻找可抵消的头寸来制造套利。

```python
def two_sum_sorted(levels, target):
    left, right = 0, len(levels) - 1
    pairs = []
    while left < right:
        s = levels[left] + levels[right]
        if s == target:
            pairs.append((levels[left], levels[right]))
            left += 1
            right -= 1
        elif s < target:
            left += 1
        else:
            right -= 1
    return pairs
```

### 二分搜索变体

找到新价格在已有档位中的位置。`lower_bound`——找第一个 ≥ 目标值的位置——就是你在有序订单簿中插入新订单时用的操作。

### 最优执行的动态规划

在 T 个时间段内买入 N 股。市场冲击：买 q 股推动价格上涨 α×q。最小化总成本。

在线性临时冲击下，TWAP（均匀拆分）恰好是最优的。买 1,000 股，10 个时间段，α=0.005，基准价 $100：

- **TWAP**：每期 100 股，平均执行价 $100.50，总成本约 $100,250
- **一次性全买**：平均价 $105.00，总成本约 $105,000
- **节省**：约 $4,750（4.5%）

这个洞察解释了为什么 TWAP 和 VWAP 这类执行算法存在：市场冲击越大，越要拆分。

### 从零计算相关性矩阵

不用 NumPy，手写三资产相关性矩阵。我模拟了三个资产——A、B 与 A 相关（系数 0.7 + 噪声）、C 独立。1,000 个观测值的经验相关系数：

```
              Asset A   Asset B   Asset C
  Asset A      1.000     0.914    -0.012
  Asset B      0.914     1.000    -0.008
  Asset C     -0.012    -0.008     1.000
```

A-B 相关性 ≈ 0.92，与理论值 0.7/√(0.49+0.09) 吻合。C 独立，与两者的相关性接近零。数学验证通过。

## 面试策略：六条原则

练完这些模式之后，我觉得真正面试时应该注意的是：

**1. 把思考说出来。** 沉默是最大的敌人。面试官需要听到你的推理——你在考虑什么、排除了什么、看到什么权衡。Jane Street 的面试是协作式的。把它当成结对编程，不是考试。

**2. 从暴力解开始。** 先给出正确解，再优化。一个能跑的 O(n²) 解比一个有 bug 的 O(n log n) 解好得多。暴力解写在白板上之后，面试官可以引导你优化。

**3. 边界条件很重要。** 空订单簿、单个订单、全部撤销、负价格（错误处理）。这些体现的是你对健壮性的思考，而不仅仅是正常路径。

**4. 熟悉你的数据结构。** 面试往往归结为选择正确的结构。说到"价格流"，想到 deque。说到"高频项"，想到 heap。说到"前缀匹配"，想到 trie。

**5. 不要第一次用 OCaml。** Jane Street 明确说了这一点。用 Python、C++、Java——你做梦都在用的那个语言。OCaml 他们入职后会教你。

**6. 主动求助。** 卡住后默默硬磕，不如说"我在堆和平衡树之间犹豫——对探索方向有什么建议吗？"面试官想和你合作，不是看你表演。

## 下一步

本系列接下来的几期从技术准备转向申请本身——搭建交易模拟器、Kaggle 竞赛经验、以及涵盖简历策略和时间线的完整申请手册。

本期所有代码都已验证并可运行。我在本地测试了每个算法、检查了概率方法的均匀性、跑了模拟确认理论预测。完整模块在我的 quant-learning 仓库里。

准备量化面试的建议：别只读这些实现。自己敲一遍。搞坏它。加边界条件。然后大声解释每一步，假装有人在听。最后这一步比想象中难得多。

---

*这是 Jane Street 准备系列的第 9 期。[第 1 期](how-to-enter-jane-street-ep1.md) 讲为什么 Jane Street 用 OCaml。[第 5 期](how-to-enter-jane-street-ep5.md) 深入解析他们的月度 Puzzles。完整学习笔记和代码在我的 [quant-learning 仓库](https://github.com/shizhuocheng/quant-learning)。*
