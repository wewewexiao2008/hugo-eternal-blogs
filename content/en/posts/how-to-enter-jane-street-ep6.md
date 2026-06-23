---
title: "How to Enter Jane Street (Ep.6): Market Microstructure 101"
date: 2026-06-24T00:00:00+08:00
description: "A strategy with backtest Sharpe 3.0 can shrink to 0.5 in live trading — because of market microstructure. This episode breaks down order books, market making, liquidity measurement, slippage decomposition, Jane Street's market-making empire, and the key differences between US and Chinese market structure."
tags: ["Jane Street", "Market Microstructure", "Market Making", "Liquidity", "Order Book", "Interview Preparation"]
draft: false
series: jane-street
---

I covered probability in Ep.2, OCaml in Ep.3, systems thinking in Ep.4. But none of that prepared me for the most sobering question in quantitative trading: why does a strategy with backtest Sharpe 3.0 shrink to 0.5 in live trading?

The answer lives in **market microstructure** — how your orders interact with the real world. Probability teaches you to compute expected values. OCaml teaches you to write correct code. Microstructure teaches you that the mid price you assumed you'd get is a fiction; you'll pay half the spread. Your large order itself moves the market. Your limit order sits behind 500 others and might never fill.

Jane Street's core business *is* microstructure. They're one of the world's largest market makers, providing liquidity on 200+ electronic exchanges. Understanding microstructure means understanding how Jane Street makes money.

## The Order Book: Foundation of Everything

The Limit Order Book (LOB) is the core data structure of every electronic exchange. It looks like this:

```
      BIDS                    ASKS
Price  Size    Total    Price  Size    Total
103.00  500     500     103.10  200     200
102.90 1,200   1,700    103.20  800   1,000
102.80 2,000   3,700    103.30 1,500   2,500
102.70 3,000   6,700    103.40 3,000   5,500
```

Key terms:

- **Bid**: buy-side quotes; highest bid is 103.00
- **Ask/Offer**: sell-side quotes; lowest ask is 103.10
- **Spread**: Ask - Bid = 0.10 (10 cents)
- **Mid price**: (103.00 + 103.10) / 2 = 103.05
- **BBO (Best Bid/Offer)**: the top of the book
- **Depth**: order volume at each price level

### Price-Time Priority

Exchanges match orders by two rules: price priority (higher bids fill first, lower asks fill first) and time priority (at the same price, earlier orders fill first — FIFO).

This means if you're behind the BBO, you wait for every order at your price level to fill before you. **Queue position** is the core competitive metric in high-frequency trading — submit your limit order at 103.00 one millisecond after a competitor, and you might not fill all day.

### Order Types

| Type | Behavior | Use case |
|------|----------|----------|
| Market Order | Fill immediately at best available price | When certainty matters more than price |
| Limit Order | Fill only at specified price or better | When price matters more than certainty |
| Stop Order | Triggers market/limit when threshold hit | Risk management |
| IOC | Fill what you can, cancel the rest | Don't want to queue |
| FOK | Fill everything or nothing | Must execute completely |
| Iceberg | Display only part of your size | Hide true intent |
| Post-Only | Must rest on the book, never cross | Pure market making |

## Market Makers: Wholesale Liquidity Providers

A market maker posts limit orders on both sides — bidding lower, asking higher — and collects the spread. The core loop: quote both sides → get filled → collect spread → manage inventory risk.

This is fundamentally different from directional speculation. Market makers provide **liquidity as a service** — when someone wants to buy, there's a seller; when someone wants to sell, there's a buyer.

### Three Risks Every Market Maker Faces

**Inventory risk.** You bought a lot, and the price is dropping. Your inventory is losing value. The solution is dynamic quoting: when inventory grows, lower both your bid and ask to encourage people to buy from you. Jane Street's edge here is their global risk book — they can hedge across markets and asset classes in real time.

**Adverse selection.** The market maker's headache. You're resting on the bid waiting to buy. Someone hits you with a sell order. The question is: *why are they selling?* If they know something you don't, every fill you get is you being "harvested." This is **toxic flow**. Flow from retail investors and fund rebalancing — non-toxic flow — is where market makers make their money. Jane Street's competitive moat includes the ability to distinguish toxic from non-toxic flow, and that's exactly where machine learning comes in.

**Operational risk.** A software bug can destroy a firm in minutes. In 2012, Knight Capital lost approximately $440 million in 45 minutes due to a deployment error, leading to the firm's acquisition. Jane Street guards against this with strict code review, multi-layered risk checks, and kill switches.

### Decomposing the Spread

Classical microstructure theory (Ho-Stoll, Demsetz) breaks the spread into three components:

| Component | Meaning |
|-----------|---------|
| Order processing cost | Technology/operations overhead, relatively fixed |
| Inventory cost | Price risk premium for holding inventory |
| Adverse selection cost | Expected loss from being "adversarially selected" |

**Spread = OP + INV + AS**

Market maker profit = received spread − actual adverse selection losses − inventory hedging costs. When adverse selection gets too high, market makers either widen their spread or pull their quotes entirely.

## The Four Dimensions of Liquidity

Liquidity is multi-dimensional. You can't capture it with a single number:

1. **Tightness**: bid-ask spread — narrower means more liquid
2. **Depth**: order volume near the BBO — larger means more liquid
3. **Resiliency**: how fast prices recover after a large trade
4. **Immediacy**: how quickly you can trade at a reasonable price

### Measurement Metrics

| Metric | Formula | Use |
|--------|---------|-----|
| Quoted Spread | Ask - Bid | Simplest measure |
| Effective Spread | 2\|P_exec - Mid\| / Mid | Actual execution cost |
| Realized Spread | 2\|P_exec - Mid_{t+k}\| / Mid | Cost net of permanent impact |
| Amihud Illiquidity | \|return\| / volume | Price impact per unit volume |
| Kyle's Lambda | ΔP = λ × Q + ε | Market impact coefficient |

### The Kyle Model: The Market Maker's Inference Problem

Kyle (1985) proposed an elegant model. The market maker observes net order flow Q (buys minus sells) and infers whether informed traders are active:

$$\Delta P = \lambda \cdot Q + \epsilon$$

A smaller λ means a more liquid market. The market maker adjusts λ to protect themselves — when order flow looks toxic, they widen the spread; when it looks normal, they tighten it.

This explains a counterintuitive phenomenon: large orders face larger slippage. The market maker assumes big orders might carry information, so they quote worse prices.

### Almgren-Chriss: Optimal Execution

If you need to buy 1 million shares, a single market order would push the price skyrocketing. The Almgren-Chriss (2001) model gives the optimal splitting strategy: break the large order into smaller pieces, balancing **market impact** against **timing risk**. Too many small pieces → low impact but price may drift. Too few → high impact but low timing risk. This is the mathematical foundation of TWAP/VWAP execution algorithms.

## Trading Venues: More Than Just Exchanges

### US Market Structure

| Type | Description | Examples |
|------|-------------|---------|
| Lit Exchange | Public order book | NYSE, Nasdaq, CBOE |
| Dark Pool | Private matching, no visible orders | Goldman Sigma X, Morgan Stanley MS Pool |
| ATS | Alternative Trading Systems | Various dark pools |
| Wholesaler | Receives retail flow from brokers | Citadel Securities, Virtu, Jane Street |

### Maker-Taker Pricing

US equity markets have a unique fee structure:

- **Maker (provides liquidity)**: posts a limit order, exchange may pay a rebate (e.g., -$0.002/share)
- **Taker (takes liquidity)**: crosses the spread, exchange charges a fee (e.g., +$0.003/share)

This leads to an interesting outcome: market makers can profit from rebates alone, even when the spread is near zero. Some HFT firms quote extremely tight — even "negative" — spreads because they earn from the rebate structure.

### Payment for Order Flow (PFOF)

Brokers (like Robinhood) send retail orders to specific market makers, who pay for the privilege. The controversy: do retail investors get the best execution price? Jane Street participates in US wholesaling.

## Jane Street's Market-Making Empire

From [Jane Street's website](https://www.janestreet.com/what-we-do/client-offering/), here's the public scale of their market making:

| Business | Scale |
|----------|-------|
| ETFs | 10,000+ ETFs priced and traded globally |
| Equities | 45+ countries |
| Bonds | >$900B traded with clients globally in 2025 |
| Options | 3,800+ unique tickers actively priced |
| Exchanges | 200+ electronic exchanges and other venues |

Founded in 2000, Jane Street started with ETF market making and has since expanded into equities, bonds, options, and commodities. Their core loop looks roughly like this:

```
Client wants to buy 1M shares of an ETF
    ↓
Jane Street quotes (ask): 2-5 cents above mid
    ↓
Client accepts → JS sells from inventory / or hedges in the market
    ↓
JS earns: spread + potential rebates
    ↓
Inventory skews → adjust subsequent quotes
    ↓
Loop continues
```

Their competitive advantages stack across several dimensions: OCaml technology stack with FPGA acceleration; a global risk book that hedges across markets and assets in real time; hiring puzzle solvers rather than finance specialists; connectivity to 200+ exchanges; and a no-silos culture where trader, researcher, and tech roles blend together.

## Slippage: The Gap Between Backtest and Live

Back to the opening question. The slippage decomposition formula explains the gap:

$$\text{Slippage} = \frac{\text{Spread}}{2} + \text{Market Impact} + \text{Timing Risk}$$

- **Half-spread**: you assumed you'd fill at mid; you actually pay half the spread
- **Market impact**: your order itself pushes the price against you
- **Timing risk**: the price moves while you wait for your fill

Common strategies to reduce slippage: limit orders (cap your worst price), TWAP (split evenly across time), VWAP (split according to historical volume curves), dark pool routing (hide intent), and smart order routing (pick the best venue).

## Chinese A-Share Market: Structural Differences

| Dimension | US | China (A-Share) |
|-----------|-----|---------|
| Matching | Continuous + open/close auctions | Continuous + call auction (9:15-9:25) |
| Price limits | None (circuit breakers only) | ±10% (ChiNext ±20%) |
| Settlement | T+0 | T+1 |
| Short selling | Widely available | Restricted (securities lending) |
| Market makers | Core role | Limited (liquidity providers) |
| Tick size | $0.01 | ¥0.01 |

Market making in A-shares is still developing. Since 2015, some ETFs and options have introduced market maker systems, and the STAR Market and Beijing Stock Exchange are experimenting with designated market makers. But compared to US markets, A-share liquidity still depends more heavily on natural traders.

## Practice Exercises

**Exercise 1: Observe A-share liquidity with AKShare.** Pull real-time quotes for individual stocks. Compute (high - low) / previous close as a daily volatility proxy, and turnover as a liquidity proxy. Compare large-cap vs. small-cap stocks.

**Exercise 2: Simulate market making.** Write a Python script that simulates a market maker — given a mid price and volatility, post limit orders at ±spread/2, simulate random fills, track inventory and PnL. Then add adverse selection (assume 5% of orders come from informed traders) and observe how PnL changes.

**Exercise 3: Compute effective spread.** If you can access tick-level data: effective_spread = 2 × |execution_price - mid| / mid. Compare across stocks and time of day.

## How Interviews Test This

Jane Street interviews rarely ask you to recite microstructure facts. They frame it as estimation problems:

> "A market maker's spread is 2 cents, averaging 10 fills per second. 5% of trades are toxic, each losing an average of 10 cents. What's the daily PnL?"

Quick math: Normal trades earn 2 cents × 9.5 = 19 cents/second. Toxic trades lose 10 cents × 0.5 = 5 cents/second. Net: 14 cents/second, roughly $12,096 over an 8-hour day. This kind of question tests whether you can do reasonable order-of-magnitude estimates under time pressure.

> "Why might a limit order placed inside the spread but not at the BBO never fill?"

Price-time priority. If the BBO has sufficient volume, your order waits in queue. Market orders keep eating the BBO, and new limit orders at better prices jump ahead of you. You might sit there indefinitely.

## Further Reading

- **Larry Harris, *Trading and Exchanges*** — the microstructure bible, recommended by Jane Street
- **Kyle (1985)**, "Continuous Auctions and Insider Trading" — the original λ model
- **Almgren & Chriss (2001)** — optimal execution
- **Easley & O'Hara** — adverse selection and information decomposition
- Jane Street's [what-we-do](https://www.janestreet.com/what-we-do/) page for public scale data
- [Signals & Threads](https://signalsandthreads.com) podcast for engineering perspectives on trading systems

---

This is Episode 6 of the Jane Street series. Last time we broke down puzzle methodology. Next up: Fermi problems and the art of estimation.

If you found this useful, [let me know](https://github.com/shizhuocheng/hugo-eternal-blogs). If you're preparing for Jane Street interviews, start by understanding the market from the order book up — it matters more than any formula you can memorize.
