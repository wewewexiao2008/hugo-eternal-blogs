---
title: "How to Enter Jane Street (Ep.12): Building a Trading Simulator — and the Three Bugs That Taught Me More Than the Build"
date: 2026-08-19T00:00:00+08:00
description: "The capstone of the series: wiring market data, signals, risk sizing, execution, and analytics into one working simulator. The build taught me the pipeline. Debugging it taught me the rest — three position-accounting bugs that made every equity curve a fiction, found only by unit-probing a single function by hand. Post-fix, the numbers tell an honest story: zero alpha means your P&L is transaction costs, to the cent."
tags: ["Jane Street", "Trading Simulator", "Backtesting", "Kelly Criterion", "Market Impact", "Risk Management", "Quant"]
draft: false
series: jane-street
---

Eleven episodes in, I've collected the pieces: order books and microstructure ([Ep.6](how-to-enter-jane-street-ep6.md)), probability and Kelly-style thinking ([Ep.2](how-to-enter-jane-street-ep2.md)), systems thinking ([Ep.4](how-to-enter-jane-street-ep4.md)), ML hazards at trading scale ([Ep.8](how-to-enter-jane-street-ep8.md)), coding patterns with a quant twist ([Ep.9](how-to-enter-jane-street-ep9.md)).

This episode is the exam. I built a complete trading simulator — the full pipeline a quantitative firm runs, from synthetic market data to a performance report — and then spent longer debugging it than building it. The bugs are the best part of this story, so I'll keep none of them hidden.

One note on numbering: the ML and Kaggle deep-dives ended up folded into Ep.8, so the published series runs Ep.1–9 and now jumps to 12. The final episode, 13, will be the complete application playbook.

## Why Build a Simulator at All

A trading simulator is the final exam of quantitative understanding because it forces every concept to coexist. A backtest that ignores slippage will love your momentum strategy. A sizing model that ignores drawdown will look brilliant until it doesn't. An analytics layer with the wrong annualization will tell you a Sharpe of 3 when you have a Sharpe of 0.3. The simulator holds a mirror up to every shortcut.

There's a Jane Street angle here too. Their internship programs include mock trading sessions — trading against simulated markets, in real time, with instructors playing the other side. And their traders live inside tools all day. The Signals & Threads episode "Building Tools for Traders with Ian Henry" describes writing software for options traders who "measure time in microseconds"; "From the Lab to the Trading Floor with Erin Murphy" covers the journey of research reaching production. A firm like this doesn't regard "simulate it first" as an academic exercise. It's the culture.

So I built one. Python, ~800 lines, zero dependencies beyond NumPy.

## The Architecture

```
MarketData → SignalEngine → RiskManager → ExecutionEngine → PortfolioTracker
                                                              ↓
                                                    PerformanceAnalyzer
```

Each stage owns one decision, and the interfaces between them are the actual decisions of a trading operation:

- **MarketData**: what the world does (prices, spreads, depth, volume)
- **SignalEngine**: what we believe (directional opinion in [-1, 1])
- **RiskManager**: how much to bet (position size, given signal, equity, vol, drawdown)
- **ExecutionEngine**: what it costs to act (fills, slippage, commissions, impact)
- **PortfolioTracker**: what we own (cash, positions, mark-to-market equity)
- **PerformanceAnalyzer**: what it all meant (risk-adjusted returns, drawdowns, tails)

Separating these matters. When signal generation, sizing, and execution live in one function, you can't ask "did we lose money because the signal was wrong, the size was wrong, or the fill was expensive?" The pipeline makes the question askable.

## Market Data: Synthetic but Not Naive

The generator evolves a mid-price with geometric Brownian motion plus stochastic volatility (vol itself gets shocked, clamped to [5%, 80%]), rounds to a tick, and quotes a bid/ask around it with a 5 basis-point spread. Depth is five levels per side with exponentially distributed sizes. Intraday volume follows the U-shape you see in real session data — roughly double at the open and close.

Execution cost gets a square-root market impact model: impact proportional to σ·√(size/ADV). This is the empirical "square-root law" documented in the market microstructure literature — Almgren et al.'s *Direct Estimation of Equity Market Impact* (2005) is the standard reference, and the optimal execution problem itself goes back to Almgren and Chriss (2000). Harris's *Trading and Exchanges* (from [Ep.6](how-to-enter-jane-street-ep6.md)) covers the microstructure background.

```python
def get_market_impact(self, order_size: float) -> float:
    adv = np.mean(self.volume_history[-20:])
    impact_bps = self.sigma * np.sqrt(order_size / adv) * 10000
    return impact_bps / 10000
```

## Signals: Three Toys and a Combination Problem

I registered three deliberately simple strategies: 20-period momentum, 50-period mean reversion, and a Bollinger-style volatility breakout. Each returns a signal in [-1, 1]. The engine combines them with weights (0.40 / 0.35 / 0.25).

This mirrors a real desk's actual hardest problem: alpha combination. Signals that individually know almost nothing must be aggregated into one position recommendation, and the aggregation weights are themselves a modeling decision.

## Risk: Quarter-Kelly, Vol Targeting, a Drawdown Throttle

The risk manager converts signal to size with four layers:

1. **Volatility targeting**: scale exposure so the position's annualized vol targets 15%, using the *asset's* realized vol. (Why the italics comes later.)
2. **Kelly-style sizing**: notional ∝ equity × |signal| × 0.25. Quarter-Kelly, because full Kelly is only optimal if your edge estimate is right, and it never is. Kelly's 1956 paper and its betting lineage are the canonical reference; the practical lesson is that fractional Kelly trades growth for survival.
3. **Drawdown throttle**: sizing scales down linearly from half the drawdown limit to zero at the limit (10% here). Bleeding? Trade smaller. At the limit? Flat.
4. **Hard position caps**: ±1,000 shares, no exceptions.

## Execution and Analytics: Where Honesty Lives

Market orders cross the spread and pay 2 basis points of slippage plus $0.005/share commission. Fills are capped at 10% of available volume — a participation-rate limit, so you can't pretend to buy a million shares in one minute.

The analytics layer computes Sharpe, Sortino, Calmar, max drawdown and duration, win rate, profit factor, and VaR at 95/99. One convention matters enormously: the simulator steps in minutes (252 days × 390 minutes/year), so every annualization must use 252 × 390 periods per year. Mixing a per-minute return stream with a per-day annualization factor quietly corrupts every scaled metric.

## Then I Found the Bugs

The first full run looked plausible. Baseline: -0.77% over 5,000 periods, MaxDD -9.61%, 359 fills. The scenario analysis even had a story: the flash-crash regime printed +26.55%, "mean reversion pays in panics." I nearly wrote that sentence in this post.

Instead I probed one function. The scenario table said the normal-market run had a win rate of 0.0% — every single period non-positive — while total return (-15.33%) equaled max drawdown to the basis point. Monotone bleed with zero winning minutes is a very specific signature. So I unit-tested `Position.update_fill` by hand:

```python
pos.update_fill(Side.BUY, 10, 100.0)
# quantity == 0.0  <-- still flat after buying 10 shares
```

**Bug 1, the big one.** The opening branch of `update_fill` was:

```python
if self.quantity == 0:
    self.avg_price = price
elif ...  # adding
else:     # reducing
```

The `if` branch set `avg_price` and fell out of the chain — it never assigned `quantity`. Python's `if/elif/else` is one statement; matching the first branch skips the rest. Since quantity started at zero and nothing ever made it nonzero, **the book was permanently flat**. Every "position" was imaginary. Every fill just moved cash: buys subtracted money, sells added it back at whatever price prevailed. The +26.55% flash-crash "profit" was an artifact of selling into a crash without ever owning anything you sold. The equity curve was fiction.

**Bug 2.** The flip-detection at the end of the reducing branch keyed on the incoming order's sign:

```python
elif (self.quantity > 0 and signed_qty < 0) or ...:
    self.avg_price = price   # intended only for sign flips
```

After any partial reduction — long 20, sell 15, still long 5 — this fired and clobbered `avg_price` to the trade price. Meanwhile a true flip to net short matched neither condition, leaving a stale average. Realized P&L drifted on every partial close. The correct check compares the position's sign before and after the fill.

**Bug 3, latent.** The equity formula was `cash + quantity × mark + realized_pnl`. Cash already contains every fill's cash flow — including the proceeds that realized past P&L — so adding `realized_pnl` counts closed-trade results twice. Bug 1 had masked this completely: with quantity permanently zero, realized P&L was permanently zero (which is also why it read exactly `0.0` after 359 fills — the tell I should have noticed first).

Three more smaller defects surfaced in the same audit: the vol-targeting input used *portfolio* returns, which collapse toward zero whenever the (supposedly open) book was flat, decoupling sizing from market risk — it now references asset returns; the Sortino denominator could degenerate to near-zero and print ratios like -22,090,55.249 (real output, seed 42); and the analytics annualization mismatch described above. All fixed, all committed.

### Same Seed, Before and After

Seed 7, identical in every other respect:

| Run | Baseline (5,000 min) | Bull 15% vol | Normal 20% vol | Bear 40% vol | Crash 60% vol | Flash 80% vol |
|-----|--------------------|--------------|----------------|--------------|---------------|---------------|
| Before | -0.77% | +16.64% | -15.33% | -27.62% | +10.47% | +26.55% |
| After | -0.47% | -0.26% | -0.31% | -0.18% | +0.04% | -0.17% |

Every number changed character. The before-row "profits in crashes" evaporated — they were manufactured by selling shares that didn't exist. The after-row shows four small losses and one coin-flip, which is exactly what toy signals with no edge should produce.

## The Economics: Costs to the Cent

Post-fix, seed 7 baseline: 484 fills, $930,813 traded notional, final P&L **-$465.60**.

Now the arithmetic. Each side of a round trip pays half the 5bps spread plus 2bps slippage — call it 4.5bps per side, plus commission:

- Spread + slippage: $930,813 × 4.5bps ≈ **$418.87**
- Commission: **$47.01**
- Estimated total cost: **$465.88**

Estimated cost $465.88 against realized -$465.60. Agreement to twenty-eight cents. The strategies' combined gross edge, over five thousand minutes, rounds to zero — so the P&L *is* the cost structure. That's the cleanest demonstration of transaction-cost economics I've ever produced: zero alpha doesn't mean zero P&L. It means your P&L equals your trading costs, with mathematical reliability.

Four seeds tell the same story — this is not luck:

| Seed | Total Return | Max DD | Win Rate | Profit Factor | Fills | Commission |
|------|-------------|--------|----------|---------------|-------|------------|
| 7 | -0.47% | -0.48% | 46.9% | 0.81 | 484 | $47.01 |
| 21 | -0.49% | -0.49% | 47.1% | 0.80 | 484 | $46.99 |
| 42 | -0.57% | -0.59% | 46.5% | 0.79 | 485 | $50.99 |
| 2026 | -0.46% | -0.49% | 46.7% | 0.84 | 482 | $48.64 |

Low variance, persistent small loss. A cost-bleed signature.

## Stress Tests: The Robustness Bar

The post-fix scenario analysis (2,000 minutes each):

| Scenario | Vol / Drift | Sharpe | Return | Max DD | Win Rate |
|----------|-------------|--------|--------|--------|----------|
| Low-vol bull | 15% / +10% | -32.7 | -0.26% | -0.29% | 45.2% |
| Normal | 20% / +5% | -35.0 | -0.31% | -0.33% | 46.0% |
| High-vol bear | 40% / -15% | -13.0 | -0.18% | -0.24% | 49.9% |
| Crash | 60% / -30% | +0.09 | +0.04% | -0.18% | 48.9% |
| Flash crash | 80% / -10% | -8.1 | -0.17% | -0.27% | 48.2% |

Two readings. First, the vol targeting does its job: the sizing scalar is 0.15/σ, so as regime volatility doubles, exposure halves — which is why the high-vol scenarios bleed *less* in absolute terms, and why max drawdowns stay pinned under the 10% throttle line everywhere.

Second, the Sharpe column looks bizarre (-32 in a calm market?) until you realize what it's measuring: a nearly deterministic cost bleed has almost zero variance, and Sharpe divides by that near-zero number. The metric is telling the truth about the shape of the return stream — a slow drip — even though "Sharpe -32" reads like catastrophe while the actual loss is 26 basis points. Annualized figures here also extrapolate a 2,000-minute run across a year, which is its own caveat. When a metric and a magnitude disagree, the first move is to understand why, and the second is to report both.

And the verdict by the simulator's own bar — positive risk-adjusted returns in *all* regimes — is four failures out of five. These signals are not tradable. The simulator says so, and now I believe it, because I audited the accounting that produces the numbers.

## What This Has to Do with Jane Street

Everything, I'd argue. The firm's interviews are built on "what happens if…" — what happens if two orders arrive at the same price, if the book crosses, if your model's input goes stale. Those questions are unit tests for mental models, and the candidates who do well are the ones who maintain invariants: conservation of cash, consistency between books, sign conventions that survive edge cases. My simulator passed every eyeball test — plausible curves, sensible scenario stories — while its position book was structurally empty. What caught it was a hand-computed unit probe and a tell (realized P&L of exactly 0.0) that contradicted an assumption.

Jane Street's engineering culture obsesses over exactly this class of failure. The Signals & Threads episode "Why Testing is Hard and How to Fix it with Will Wilson" is about making tests strong enough to catch what review misses; their blog post "The Joy of Expect Tests" argues for tests that show you the full behavior of your code, not just pass/fail. Building this simulator turned those from abstract appreciation into scar tissue. A backtest you haven't audited is a story you're telling yourself. The audit — reconciling cash against positions against equity, checking invariants, unit-probing the state transitions — is the actual work.

## What's Next

The final episode: the complete application playbook — CV strategy, timeline, interview rounds, and the mindset going in. All the material is studied; it just needs writing.

Everything in this post was run and verified on my machine: the unit probes, the four-seed sweep, the cost reconciliation. The fixed simulator lives in my local quant-learning workspace, and the before/after tables above are from identical seeds across the fix, so every difference you see is a bug, accounted for.

---

*This is Episode 12 in my Jane Street preparation series. [Episode 1](how-to-enter-jane-street-ep1.md) covers why Jane Street runs on OCaml. [Episode 6](how-to-enter-jane-street-ep6.md) builds the microstructure vocabulary this simulator assumes. [Episode 8](how-to-enter-jane-street-ep8.md) covers why ML at trading scale is mostly about not fooling yourself — a theme this episode just relearned the hard way.*
