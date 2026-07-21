---
title: "How to Enter Jane Street (Ep.8): Machine Learning at Trading Scale — Why ML in Finance Is Fundamentally Hard"
date: 2026-07-22T00:00:00+08:00
description: "Image classification hits 99% accuracy easily. Financial prediction struggles to reach 51%. This episode dives into the fundamental difficulty of ML in quantitative trading: extreme low signal-to-noise ratio, non-stationarity, overfitting traps, Jane Street's 2020 Kaggle competition breakdown, de Prado's financial ML toolkit, and how to approach ML questions in interviews."
tags: ["Jane Street", "Machine Learning", "Quantitative Trading", "Kaggle", "Overfitting", "Interview Preparation"]
draft: false
series: jane-street
---

Training a ResNet to classify cats and dogs casually gets you above 95% accuracy. Apply the same methodology to financial prediction, and 51% starts feeling like climbing a mountain.

This gap can't be bridged by hyperparameter tuning. It stems from the fundamental nature of financial data: extremely low signal-to-noise ratio, continuously shifting distributions, and backtests that lie. In 2020, Jane Street ran a Kaggle competition that let the world try its hand at predicting trade directions using anonymized financial data. That competition is a perfect case study in why ML in finance is hard.

This episode begins the advanced phase of my Jane Street preparation. The first seven episodes covered probability, OCaml, systems design, puzzles, market microstructure, and Fermi estimation — those are foundational tools. Now the question is: what happens when you apply ML to financial markets?

## Why Financial Data Is So Hard

### Signal-to-Noise: You're Basically Listening to White Noise

In ImageNet, the signal is clear — a cat is a cat. In financial time series, approximately 99% of price movement is noise. The predictive signal (alpha) you're trying to capture is buried in a soup of volatility, sentiment, macro events, and algorithmic trading behavior.

Concretely: daily return standard deviation might be 1-2%, while the predictive signal you're chasing could be a few basis points (0.01-0.05%). This means statistical power is extremely low — you need very long historical data to distinguish "real signal" from "dumb luck."

### Non-Stationarity: The Ground Is Moving

Training ImageNet images from ten years ago? A cat still looks like a cat. Financial market structure changes continuously: regulations shift, participants rotate, macro environments turn, new trading instruments appear. Market behavior during the March 2020 COVID crash was a fundamentally different world from the 2021 bull run.

A model trained on 2018-2019 data could completely fall apart in March 2020. This directly contradicts the iid assumption underlying most ML frameworks.

### Regime Change: Distribution Switching

Markets have different "states" (regimes): bull, bear, high-volatility, low-volatility, liquidity drought. A factor with positive predictive power in a bull market might reverse completely in a bear market. If your model doesn't explicitly handle regimes, it's effectively mixing distributions — and performing poorly across all of them.

### Survivorship Bias and Look-Ahead Bias

Backtesting only on currently listed stocks? Delisted bankrupt companies are silently excluded, inflating your results. Used information only available in the future (like full-sample normalization)? You've leaked tomorrow into yesterday. These traps barely exist in traditional ML but are everywhere in financial backtesting.

## Jane Street's Kaggle Competition: A Perfect Case Study

In 2020, Jane Street hosted a Kaggle competition: [Jane Street Market Prediction](https://www.kaggle.com/competitions/jane-street-market-prediction). It's an excellent vehicle for understanding financial ML difficulties.

### Competition Setup

- Anonymized financial data: 130 features (feature_0 through feature_129), target variable `action` (0 or 1)
- Each row carries a `weight` and a `resp` (return signal)
- Evaluation: `Utility = min(max(Σ(weight × action × resp) / sqrt(Σ(weight²)), 0), 4.5)`
- Public Leaderboard scored on earlier data; Private Leaderboard used a hidden 4-month window

Notice the evaluation metric. It's not accuracy, not F1, not AUC. It's a PnL-like utility score.

### What Utility ≠ Accuracy Really Means

A 51% accuracy model that correctly identifies high `weight × resp` samples can beat a 60% accuracy model that's more accurate on low-weight samples. This almost never happens in traditional ML competitions.

This has direct interview implications: Jane Street never cares about your model's accuracy. They care whether your model makes money. Sounds obvious, yet many candidates instinctively say "my model achieved XX% accuracy" — to Jane Street, that number conveys almost zero information.

### Key Findings from the Competition

**MLP beat tree models.** The top of the leaderboard was dominated by ensembles of multi-layer perceptrons (MLPs). Under anonymized features + extremely low SNR, tree-based split decisions tend to overfit noise. MLP's smoother decision boundaries are more robust.

**Pseudo-labeling worked.** About 60% of training rows had `weight = 0`, meaning they didn't count toward scoring but were still real market data. High-confidence pseudo-labels enabled semi-supervised learning on this extra data.

**`feature_0` was special.** It was the only feature with discrete ±1 values, widely believed to represent trade direction (buy/sell). Nearly every top solution conditioned on it.

**Public → Private shake-up.** Many teams ranked highly on the Public Leaderboard but dropped 1000+ positions on the Private Leaderboard. The final 4 months of data had a different distribution — the core difficulty of financial ML.

### First Place Strategy Summary

Based on public competition discussions and solution sharing:

- An ensemble of ~20 MLPs (different seeds, architectures, feature subsets)
- Diversity mattered more than individual model strength — ensemble gains came from model disagreement
- Utility-aware training: directly optimizing weighted return rather than cross-entropy
- Threshold optimization: the `prob → action` decision threshold was 0.45-0.48, not 0.5, due to the asymmetric payoff structure

## de Prado's Financial ML Toolkit

Marcos López de Prado's *Advances in Financial Machine Learning* is the canonical reference for quant ML. He developed a series of techniques specifically designed for financial data properties. Here are the most important ones.

### 1. Fractional Differentiation

The traditional approach differenced price series once (`diff`) to achieve stationarity. The problem: first-order differencing erases memory — you lose the information that "prices are at historic highs." No differencing? The series isn't stationary, violating ML assumptions.

de Prado's solution: apply fractional differencing of order d ∈ (0, 1). At d ≈ 0.4, the series achieves stationarity while retaining most of its memory. This is far more nuanced than the "difference or don't" binary.

### 2. Triple Barrier Method — Labels That Reflect Trading Logic

Traditional ML classification labels samples by whether returns are positive or negative over a fixed window. But real trading has take-profit, stop-loss, and time limits. de Prado's Triple Barrier Method sets three barriers:

- **Take Profit**: return hits +2%, label as positive
- **Stop Loss**: return drops to -1%, label as negative
- **Time Limit**: if neither TP nor SL triggered within N periods, label by final return

These labels are much closer to real trading logic. A sample where stop-loss was triggered should be labeled negative even if the price recovered by the window's end.

### 3. Meta-Labeling — Separating Direction from Sizing

A two-stage approach:

- **Primary model** decides direction (long/short/flat)
- **Secondary model** decides confidence (how strong is this signal, what position size)

This separation lets you use a long-horizon model for direction and a short-horizon model for execution, or a fundamental model for direction and a technical model for entry timing.

### 4. CPCV — Leakage-Resistant Cross-Validation

Random K-fold on financial data almost certainly leaks information — temporally adjacent samples are correlated, and training-set signal bleeds through correlated samples into validation.

de Prado's Combinatorial Purged Cross-Validation (CPCV):

- Walk-forward splitting: training data precedes validation data
- Purge: remove training samples whose time window overlaps with validation
- Embargo: add buffer zones before and after validation to further reduce leakage

### 5. PBO — Probability of Backtest Overfitting

PBO measures how consistently your backtest performance holds across IS/OOS pairs. If the optimal parameters selected on IS data frequently rank in the bottom half on OOS data, PBO will be high, signaling overfitting.

PBO < 0.25 is a common safety threshold. Above that, your strategy likely won't survive live trading.

## Online vs Batch Learning

| Dimension | Batch Learning | Online Learning |
|-----------|---------------|----------------|
| Update frequency | Daily/weekly/monthly | Per trade/tick |
| Training data | Historical window | Streaming incremental |
| Advantage | Thorough training, rigorous validation | Fast adaptation |
| Risk | Model staleness | Chasing noise |

Most quantitative funds use daily or weekly batch retraining. The reason is straightforward: financial data SNR is too low for online updates to distinguish genuine regime change from random fluctuation.

Jane Street's departments page mentions research that "tackles problems ranging from sub-microsecond trading to uncovering long-term market inefficiencies across trillions of historic events." This range suggests they likely run multiple strategies across time scales — ultra-low-latency rules and microstructure signals for the short end, ML models for the medium and low frequency end.

## Overfitting Detection Toolkit

Showing you understand overfitting in an interview is far more impressive than showing a high-Sharpe backtest. Jane Street interviewers have seen too many strategies that look great in backtest and collapse in production.

My checklist:

1. **Multi-window OOS validation**: not just one test window, multiple periods
2. **Walk-Forward Analysis**: simulate real deployment — train on first N months, predict month N+1, roll forward
3. **Deflated Sharpe Ratio**: multiple-testing correction after running many experiments (similar to Bonferroni correction)
4. **PBO**: de Prado's CPCV framework for overfitting probability
5. **Cross-asset generalization**: does your alpha work on other markets/instruments?
6. **Noise injection**: add noise to features and check if model performance collapses
7. **Feature stability**: is feature importance consistent across time periods?

Only if a strategy passes all of these checks do you have reason to believe it contains real alpha.

## How Jane Street Interviews ML Candidates

Jane Street's interviewing page states plainly:

> "Our ML researchers and ML engineers develop models that inform our trading. In your interviews, we'll work together on realistic modeling problems that give a flavor for the kinds of work we do every day."

The key phrase is **realistic modeling problems**. They won't ask you to derive backpropagation math (that's homework-level), and they won't make you recite XGBoost vs LightGBM differences. They'll more likely give you a scenario:

"You have historical trading data for a contract, features anonymized. How would you design a model to predict price direction?"

The interviewer wants to hear how you think — what data properties would you explore first? How do you split train/validation? Why this model? How do you prevent overfitting? How do you evaluate live performance?

A good response framework:

1. **Understand the data first**: stationarity tests, rough SNR estimation, feature correlations
2. **Split sensibly**: walk-forward, not random K-fold
3. **Start simple**: linear model baseline, then consider complexity
4. **Overfitting awareness**: at every step ask "could this result be noise?"
5. **Utility-aware**: optimize PnL-correlated metrics, not just accuracy

## Jane Street's ML Scale

According to Jane Street's official departments page, their research covers "everything from optimizing hardware for high-performance computing to building robust platforms that enable others to develop and deploy new strategies efficiently."

Their data engineering team mentions handling data sources including "world news, decades of weather patterns, deidentified credit card spending, or packet captures of stock exchange market data feeds." This data diversity signals that Jane Street's ML extends well beyond price-volume data — they hunt for alpha in every conceivable signal source.

Their internship program explicitly offers a **Modeling** track — "applying statistical/ML techniques to real data." Even as an intern, you can touch real ML research work.

## Practical Recommendations

1. **Run through the Kaggle 2020 competition**: even with 10% of the data, experience utility-based evaluation firsthand
2. **Implement de Prado's core tools**: fractional differencing, Triple Barrier, Meta-Labeling — code each one
3. **Do a walk-forward backtest**: use any public financial data, simulate the real deployment flow
4. **Read Kaggle top solution discussions**: understand the modeling choices and engineering decisions of top competitors

## Further Reading

- de Prado, *Advances in Financial Machine Learning* (Wiley, 2018)
- Kaggle Jane Street Market Prediction competition page and discussion forum
- Jane Street official departments page — ML role description
- Jane Street official interviewing page — ML interview format
- *The Elements of Statistical Learning* (Hastie et al.) — Chapter 7 on model assessment and selection

## Next Episode

Next: Coding Interview Deep Dive — the coding component of Jane Street interviews. Whiteboard strategies, common algorithm patterns, and why Jane Street's coding interview is fundamentally different from FAANG.

---

*This is Episode 8 of the "How to Enter Jane Street" series. Full roadmap at [Ep.1](../how-to-enter-jane-street-ep1).*
