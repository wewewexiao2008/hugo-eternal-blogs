---
title: "如何进入 Jane Street（第8期）：交易规模的机器学习——为什么 ML 在金融中特别难"
date: 2026-07-22T00:00:00+08:00
description: "图像分类能做到 99% 准确率，为什么金融预测连 51% 都费劲？本期深入机器学习在量化交易中的根本困难：极低信噪比、非平稳性、过拟合陷阱，Jane Street 2020 Kaggle 竞赛复盘，de Prado 的金融 ML 工具箱，以及面试中 ML 问题的答题思路。"
tags: ["Jane Street", "机器学习", "量化交易", "Kaggle", "过拟合", "面试准备"]
draft: false
series: jane-street
---

训练一个 ResNet 分类猫狗，随便跑跑就能到 95% 以上准确率。拿同样的方法论去做金融预测，你会发现 51% 的准确率都像在爬山。

这个差距不是调参能弥补的。它来自金融数据的根本特性：信噪比极低、分布持续漂移、回测容易骗人。Jane Street 在 2020 年办了一场 Kaggle 竞赛，用匿名金融数据让全世界选手预测交易方向——这场比赛完美揭示了 ML 在金融中的真实困境。

我从这期开始进入 Jane Street 学习路线的进阶阶段。前七期覆盖了概率、OCaml、系统设计、puzzles、市场微结构、费米估算——这些都是基础工具。现在要面对的问题是：当你把 ML 这把锤子用到金融市场这颗钉子上，会发生什么？

## 为什么金融数据这么难搞

### 信噪比：你几乎在听白噪声

ImageNet 的图片，信号明确——一只猫就是一只猫。金融时间序列里，价格变动中大约 99% 是噪声。你试图预测的那 1% 信号，埋在波动、情绪、宏观事件、算法交易行为交织而成的混沌里。

具体来说：日度收益率的标准差可能在 1-2%，而你试图捕捉的预测信号（alpha）可能只有几个基点（0.01-0.05%）。这意味着统计检验力极低——你需要非常长的历史数据才能区分"真有信号"和"纯属运气"。

### 非平稳性：地面一直在动

训练 ImageNet 的图片，十年前的猫和今天的猫长得差不多。金融市场的结构却在持续变化：监管规则改了、参与者换了、宏观环境转了、新的交易工具出现了。2020 年 3 月疫情熔断时的市场行为，和 2021 年牛市时的市场行为，几乎是两个不同的世界。

这意味着你用 2018-2019 年数据训练的模型，在 2020 年 3 月可能完全失效。这跟传统 ML 的 iid 假设根本矛盾。

### Regime Change：分布切换

市场有不同的"状态"（regime）：牛市、熊市、高波动、低波动、流动性枯竭。同一个因子在牛市可能有正向预测力，在熊市完全反转。如果你的模型没有显式地处理 regime，它本质上是在对不同分布的数据做混合拟合——结果就是在所有状态下都不靠谱。

### Survivorship Bias 和 Look-Ahead Bias

回测时只看现存股票？那些退市破产的公司被你忽略了，回测结果会偏乐观。用了未来才知道的信息（比如用全样本归一化）？你已经把未来泄露给了过去。这两个陷阱在传统 ML 里几乎不存在，在金融回测里无处不在。

## Jane Street Kaggle 竞赛：一个完美的案例研究

2020 年，Jane Street 在 Kaggle 上举办了一场竞赛：[Jane Street Market Prediction](https://www.kaggle.com/competitions/jane-street-market-prediction)。这是理解金融 ML 困境的绝佳素材。

### 竞赛设定

- 匿名化金融数据：130 个特征（feature_0 到 feature_129），目标变量 `action`（0 或 1）
- 每行带一个 `weight` 和一个 `resp`（return signal）
- 评估指标：`Utility = min(max(Σ(weight × action × resp) / sqrt(Σ(weight²)), 0), 4.5)`
- Public Leaderboard 用前段数据评估，Private Leaderboard 用最后 4 个月的隐藏数据

注意这个评估指标——它不是 accuracy，不是 F1，不是 AUC。它是一个类 PnL（Profit and Loss）的 utility score。

### Utility ≠ Accuracy 的深刻含义

一个 51% 准确率的模型如果正确识别了高 `weight × resp` 的样本，可以击败一个 60% 准确率但在低权重样本上更准的模型。这在传统 ML 竞赛中几乎不会发生。

这对面试有直接启示：Jane Street 关心的从来不是你的模型 accuracy 多高。他们关心你的模型能不能赚钱。听起来像废话，但很多候选人在面试中会本能地说"我的模型准确率达到了 XX%"——在 Jane Street 看来，这个数字本身几乎不传递信息。

### 竞赛中的关键发现

**MLP 胜过树模型**。排行榜前列几乎全是多层感知机（MLP）的集成。原因在于：匿名特征 + 极低信噪比下，树模型的 split-based 决策容易在噪声上过拟合。MLP 的平滑决策边界对噪声更鲁棒。

**Pseudo-labeling 有效**。训练数据中约 60% 的行 `weight = 0`，意味着它们不参与评分但仍是真实市场数据。高置信度的 pseudo-label 可以用这些数据做半监督学习。

**`feature_0` 是特殊信号**。它是唯一的 ±1 离散值特征，广泛被认为代表交易方向（买/卖）。几乎所有 top solution 都用它做条件化。

**Public → Private 巨变**。很多队伍在 Public Leaderboard 排名很高，在 Private Leaderboard 上掉了 1000+ 名次。最后 4 个月的市场行为和训练数据分布不同——这正是金融 ML 的核心困难。

### 竞赛第一名的策略概要

基于公开的竞赛讨论和方案分享：

- 约 20 个 MLP 的集成（不同 seed、不同 architecture、不同 feature subset）
- 多样性比单模型强度更重要——集成的收益来自模型间的差异性
- Utility-aware training：直接优化加权收益而非交叉熵
- 阈值优化：`prob → action` 的决策阈值在 0.45-0.48 而非 0.5，因为不对称的 payoff 结构

## de Prado 的金融 ML 工具箱

Marcos López de Prado 的 *Advances in Financial Machine Learning* 是量化 ML 领域的标杆教材。他提出了一系列专门针对金融数据特性的技术。我挑最核心的几个讲。

### 1. 分数阶差分（Fractional Differentiation）

传统做法是对价格序列做一阶差分（`diff`）来获得平稳性。问题是一阶差分会抹掉记忆——你失去了"价格在历史高位"这个信息。不差分呢？序列不平稳，ML 模型假设被违反。

de Prado 的方案：做 d ∈ (0, 1) 阶的分数阶差分。当 d ≈ 0.4 时，序列达到平稳同时保留了大部分记忆。这比"差分 or 不差分"的二选一要精细得多。

### 2. Triple Barrier Method——交易逻辑的标签

传统 ML 分类用固定窗口的收益正负来打标签。但真实交易有止盈、止损、时间限制。de Prado 的 Triple Barrier Method 设置三个屏障：

- **Take Profit**：收益达到 +2%，标记为正类
- **Stop Loss**：亏损达到 -1%，标记为负类
- **Time Limit**：在 N 个周期内没触发 TP 或 SL，按最终收益标记

这样打出来的标签更贴近真实交易逻辑。一个止损被触发的样本，即使窗口结束时价格回正了，也应该被标记为负类。

### 3. Meta-Labeling——方向和仓位分离

两阶段建模：

- **Primary model** 决定方向（做多/做空/不动）
- **Secondary model** 决定置信度（这个信号有多强，下多大仓位）

这种分离让你可以：用长周期模型定方向，用短周期模型定执行；或者用基本面模型定方向，用技术面模型定入场时机。

### 4. CPCV——防泄漏的交叉验证

随机 K-fold 在金融数据上几乎一定泄漏信息——时间相近的样本高度相关，训练集的信号通过相关样本泄到验证集。

de Prado 的 Combinatorial Purged Cross-Validation（CPCV）：

- Walk-forward 分割：训练集在验证集之前
- Purge：训练集中与验证集时间窗口重叠的样本删除
- Embargo：验证集前后各加一段缓冲区，进一步降低泄漏

### 5. PBO——回测过拟合概率

Probability of Backtest Overfitting（PBO）衡量的是：你的回测表现在多少 IS/OOS 对中一致。如果 IS 上选出的最优参数在 OOS 上经常排在后半段，PBO 就会很高，说明你过拟合了。

PBO < 0.25 是一个常用的安全阈值。超过这个值，你的策略大概率在实盘中会表现不佳。

## 在线学习 vs 批量学习

| 维度 | 批量学习 | 在线学习 |
|------|---------|---------|
| 更新频率 | 日/周/月 | 每笔/tick |
| 训练数据 | 历史窗口 | 流式增量 |
| 优点 | 训练充分，可严格验证 | 适应快 |
| 风险 | 模型老化 | 追逐噪声 |

主流量化基金大多用日度或周度批量重训练。原因很简单：金融数据的信噪比太低，在线更新容易追逐噪声——你以为市场在变化，其实只是随机波动。

Jane Street 官方在 departments 页面提到他们的研究"tackles problems ranging from sub-microsecond trading to uncovering long-term market inefficiencies across trillions of historic events"。这个跨度意味着他们可能同时运行多条时间尺度的策略——超短延迟靠规则和微结构信号，中低频靠 ML 模型。

## 过拟合检测工具箱

在面试中展示你理解过拟合——这比展示一个高 Sharpe 比率的回测要有说服力得多。Jane Street 的面试官见过太多"回测好看但实盘崩盘"的策略。

我的 checklist：

1. **多窗口 OOS 验证**：不只用一个测试窗口，用多个不同时期验证
2. **Walk-Forward Analysis**：模拟真实部署——用前 N 个月训练，预测第 N+1 个月，滚动推进
3. **Deflated Sharpe Ratio**：做了多次实验后的多重检验校正（类似 Bonferroni correction）
4. **PBO**：de Prado 的 CPCV 框架计算过拟合概率
5. **跨资产泛化**：你的 alpha 在其他市场/品种上也有效吗？
6. **Noise injection**：给特征加噪声看模型表现是否骤降
7. **特征稳定性**：特征的 importance 在不同时段一致吗？

如果一条策略通过了以上所有检查，你才有一点理由相信它包含真实 alpha。

## Jane Street 的 ML 方向怎么面试

Jane Street 的 interviewing 页面说得很清楚：

> "Our ML researchers and ML engineers develop models that inform our trading. In your interviews, we'll work together on realistic modeling problems that give a flavor for the kinds of work we do every day."

关键词是 **realistic modeling problems**。他们不会问你反向传播的数学推导（那是 homework 级别的），也不会让你背 XGBoost vs LightGBM 的区别。他们更可能给你一个场景：

"你有某合约的历史交易数据，特征已经被匿名化。你怎么设计一个模型来预测下一步的价格方向？"

面试官想听到的是你如何思考——你会先探索数据什么特性？怎么切训练/验证集？为什么选这个模型？怎么防止过拟合？怎么评估实盘表现？

一个好的回答框架：

1. **先理解数据**：平稳性检验、信噪比粗估、特征相关性
2. **合理切分**：Walk-forward，不用随机 K-fold
3. **从简单开始**：线性模型 baseline，然后才考虑复杂模型
4. **过拟合意识**：每一步都问"这个结果会不会是噪声"
5. **Utility-aware**：优化 PnL 相关指标，不要只看 accuracy

## Jane Street 的 ML 规模

根据 Jane Street 官方 departments 页面，他们的研究涵盖"from optimizing hardware for high-performance computing to building robust platforms that enable others to develop and deploy new strategies efficiently"。

他们的数据工程团队提到处理的数据源包括"world news, decades of weather patterns, deidentified credit card spending, or packet captures of stock exchange market data feeds"。这个数据多样性说明：Jane Street 的 ML 不仅限于量价数据——他们在寻找所有可能包含 alpha 的信号源。

而他们的实习生项目明确提供三个方向中的 **Modeling** 方向——"统计/ML 技术应用到真实数据"。这意味着即使作为实习生，你也有机会接触到真实的 ML 研究工作。

## 实操建议

1. **跑一遍 Kaggle 2020 竞赛**：哪怕只用到 10% 的数据，亲手体验一下 utility-based evaluation
2. **实现 de Prado 的核心工具**：分数阶差分、Triple Barrier、Meta-Labeling 各写一遍
3. **做一个 walk-forward 回测**：用任何公开金融数据，模拟真实部署流程
4. **读 Kaggle top solutions 的讨论帖**：理解 top 选手的建模选择和工程决策

## 延伸阅读

- de Prado, *Advances in Financial Machine Learning* (Wiley, 2018)
- Kaggle Jane Street Market Prediction 竞赛页面及讨论区
- Jane Street 官方 departments 页面——ML 方向描述
- Jane Street 官方 interviewing 页面——ML 面试格式
- *The Elements of Statistical Learning* (Hastie et al.)——第 7 章关于模型评估和选择

## 下期预告

下一期：Coding Interview Deep Dive——Jane Street 面试中的编码环节。白板编程策略、高频算法模式、以及为什么 Jane Street 的 coding interview 和 FAANG 完全不同。

---

*这是 "How to Enter Jane Street" 系列的第 8 期。完整路线图见 [Ep.1](../how-to-enter-jane-street-ep1)。*
