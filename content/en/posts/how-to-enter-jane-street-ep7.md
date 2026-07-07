---
title: "How to Enter Jane Street (Ep.7): The Art of Estimation — Fermi Problems & Beyond"
date: 2026-07-08T00:00:00+08:00
description: "How many piano tuners are in Chicago? How much power does Bitcoin consume? Jane Street interviews test your ability to estimate anything under pressure. This episode covers Fermi decomposition, Tetlock's superforecasting principles, Monte Carlo error analysis, and the numbers every quant should memorize."
tags: ["Jane Street", "Fermi Problems", "Estimation", "Superforecasting", "Quant Interview", "Interview Preparation"]
draft: false
series: jane-street
---

"How many piano tuners are in Chicago?"

Enrico Fermi allegedly asked this at the University of Chicago in the 1940s. Most people freeze. Fermi estimated ~70. The actual answer was somewhere around 60–80. He got it right within a factor of two using nothing but decomposition and common sense.

Jane Street asks these questions too. Not because they need to know how many piano tuners exist, but because estimation is the daily work of a trader. When you're deciding whether to provide liquidity on an unfamiliar contract, you don't have time for a literature review. You need to decompose the problem, pull rough numbers from memory, and arrive at an order-of-magnitude answer in thirty seconds.

This episode is about building that muscle.

## The Fermi Method: Decompose, Don't Guess

The core insight is that you almost never need to estimate a big number directly. You decompose it into smaller quantities you *can* estimate, then multiply.

**Piano tuners in Chicago**, worked through:

```
Population of Chicago         ≈ 2,700,000
Households (÷ 2.5 people)     ≈ 1,080,000
Fraction with pianos          ≈ 5%
Pianos needing tuning yearly  ≈ 54,000
Tunings per tuner per year    ≈ 768   (1920 work-hours ÷ 2.5 h/tuning)
Estimated tuners              ≈ 70
```

Each step has uncertainty, maybe a factor of 1.5–2x. But errors partially cancel — you might overestimate households and underestimate piano ownership, and those cancel out. The final answer lands within the right order of magnitude.

I ran a Monte Carlo simulation to check this property. If each of four sub-factors has up to 2x error (random within [0.5x, 2x]), here's what happens:

| Sub-factors | P10 | Median | P90 | Within 10x | Within 3x |
|-------------|-----|--------|-----|-----------|----------|
| 2 | 0.65 | 1.40 | 2.74 | 100% | 93% |
| 3 | 0.65 | 1.64 | 3.72 | 100% | 81% |
| 4 | 0.67 | 1.91 | 4.95 | 99.6% | 70% |
| 5 | 0.70 | 2.24 | 6.49 | 97% | 61% |

With four sub-factors — a typical Fermi chain — virtually every estimate lands within 10x of truth, and 70% land within 3x. That's why the method works. Compounded multiplicative error sounds scary, but the geometric mean is self-correcting.

## Fermi Problems in Quant Trading

Jane Street's interview questions often look like Fermi problems wearing a finance costume. The skill transfers directly.

### How much daily notional trades through E-mini S&P 500 futures?

```
Average daily volume   ≈ 1,750,000 contracts
Index level (2025/26)  ≈ 5,500
Contract multiplier    = $50/point
Contract value         ≈ $275,000
Daily notional         ≈ $481 billion ≈ $0.5T
```

### How many trades per second on NASDAQ?

```
Daily shares traded    ≈ 5 billion
Trading hours          = 6.5 h = 23,400 s
Average trade size     ≈ 300 shares
Average trades/sec     ≈ 712
Peak (open/close)      ≈ 10–50x higher
```

### How much power does the Bitcoin network consume?

```
Hash rate              ≈ 500 EH/s = 5×10²⁰ H/s
Hardware efficiency    ≈ 17.5 J/TH (Antminer S21 class)
Power                  ≈ 8.8 GW
Daily energy           ≈ 210 GWh
Annual energy          ≈ 77 TWh  (UK uses ~300 TWh/year)
```

Each of these problems involves four to five estimation steps. The trick is knowing the anchor numbers — hash rate, contract multiplier, average trade size. That's where memorization meets reasoning.

## Numbers Every Quant Should Know Cold

You can't estimate if your mental database is empty. Here's my cheat sheet, grouped by category:

**Markets:**

| Number | Value | Why it matters |
|--------|-------|---------------|
| S&P 500 market cap | ~$45T | Equity market scale |
| Daily FX volume | ~$7.5T/day | Largest financial market |
| Daily US equity volume | $500–700B/day | Stock trading scale |
| Typical bid-ask spread | 1–5 bps | Transaction cost floor |

**Physical constants:**

| Number | Value | Why it matters |
|--------|-------|---------------|
| Speed of light | 3×10⁸ m/s | Latency floor: NYC→London ≈ 28ms |
| Random close packing | 0.64 | Volume fraction for packed spheres |

**Conversion factors:**

| Number | Value | Useful approximation |
|--------|-------|---------------------|
| 1 year in seconds | 3.15×10⁷ | π×10⁷ — surprisingly accurate |
| 1 day in seconds | 86,400 | Trading day = 23,400 s |
| NASDAQ trading hours | 6.5 hours | Time budget per session |

The π×10⁷ seconds/year approximation is one of my favorites. It's off by less than 1%, and it shows up everywhere in annualization calculations: annualized return = daily return × √(π×10⁷ / 86,400) ≈ daily return × 19.1.

## Tetlock's Superforecasting: Beyond Fermi

Philip Tetlock's *Superforecasting* (2015) studied people who are unusually good at estimating probabilities and quantities. His Good Judgment Project ran from 2011–2015, recruiting thousands of volunteers to forecast geopolitical events. The best forecasters — "superforecasters" — systematically outperformed intelligence analysts with classified access.

Five principles that translate directly to quant interviews and trading:

### 1. Decompose the problem

Same as Fermi. "Will this merger close?" becomes: Has it cleared antitrust? (base rate ~90%) × Is financing secured? × Are there shareholder votes against? Multiply conditional probabilities.

### 2. Start with the outside view (base rates)

Most people jump straight to the specifics of *this* case. Superforecasters start with the reference class. If you're estimating the probability that a tech IPO pops 50% on day one, first look at what percentage of tech IPOs do that historically. Then adjust for specifics.

This is also how Jane Street thinks about markets. The base rate of "2% daily move in S&P 500" is well documented. Before you have a view on *why* today might be different, know the base rate.

### 3. Balance inside and outside views

The outside view says "mergers with antitrust scrutiny close 70% of the time." The inside view says "this is a horizontal merger in a concentrated industry with an aggressive FTC." You need both. Tetlock found that most people — including experts — overweight the inside view. They get absorbed in the narrative and forget the base rate.

### 4. Update Bayesianly

A good forecaster doesn't think in terms of "right" and "wrong." They think: "Given what I knew then, was my probability reasonable? When new information arrived, did I update fast enough?"

This maps perfectly to trading. You took a position based on a 60% conviction. New data comes in. Do you update? By how much? Bayesian updating — P(H|E) = P(E|H)×P(H)/P(E) — is the formal version, but in practice traders develop intuition for "how much should this move my estimate."

### 5. Avoid cognitive traps

Tetlock identified several systematic biases:

- **Overconfidence**: People give narrow confidence intervals. Force yourself to widen them.
- **Anchoring**: The first number you hear pulls your estimate toward it. Jane Street interviewers may plant an anchor to test if you can resist.
- **Representativeness**: Judging probability by how similar something feels to a stereotype, ignoring base rates.
- **Availability**: Recent or vivid examples distort judgment. A recent market crash makes you overestimate crash probability.

## How Jane Street Tests Estimation

From publicly available interview reports and Jane Street's own interviewing page, estimation questions typically show up in two forms:

**Form 1: Pure Fermi.** "How many tennis balls fit in this room?" "Estimate the daily volume of the options market." They want to see you decompose, state assumptions, and compute quickly.

**Form 2: Estimation + probability.** "A market maker's spread is 2 cents, averaging 10 fills per second. 5% of trades are toxic (adverse selection), each losing an average of 10 cents. What's the daily PnL?"

Quick math: Normal trades earn 2 cents × 9.5 fills = 19 cents/second. Toxic trades lose 10 cents × 0.5 fills = 5 cents/second. Net: 14 cents/second ≈ $12,096 over an 8-hour day.

This second form is more realistic. It tests whether you can hold multiple quantities in your head simultaneously and combine them under time pressure — exactly what a trader does when evaluating a new market or strategy.

## Practical Exercises

**Exercise 1: Daily anchor memorization.** Write down five market numbers from the cheat sheet above. Test yourself tomorrow. Repeat until you can recall them in under 3 seconds each.

**Exercise 2: Fermi decomposition under timer.** Pick a random estimation question — "How many cups of coffee are consumed in Shanghai daily?" Set a 2-minute timer. Decompose, estimate, state your answer. Then check against real data.

```
Shanghai population     ≈ 25 million
Coffee drinkers         ≈ 40% → 10 million
Cups per drinker/day    ≈ 1.5
Total                   ≈ 15 million cups
```

(Actual: Starbucks alone serves ~2M cups/day in China; total market likely 10–20M. Within range.)

**Exercise 3: Sensitivity analysis.** Take any Fermi estimate and ask: "Which sub-factor contributes the most uncertainty?" If you could look up one number to improve the estimate, which one matters most? This trains you to prioritize information gathering — a core quant research skill.

**Exercise 4: Superforecasting practice.** Pick an upcoming event (earnings release, economic data print). Write down your probability estimate and 80% confidence interval. After the event, review: Was your interval calibrated? Did you update when new information arrived?

## Python Simulations

All the estimates and Monte Carlo error analysis in this episode are verified in `fermi_estimation_ep7.py` ([github.com/shizhuocheng/quant-learning](https://github.com/shizhuocheng/quant-learning)). The script covers:

1. Classic Fermi problems (piano tuners, ping pong balls, hair count)
2. Quant estimation (ES futures volume, NASDAQ trade rate, Bitcoin energy)
3. Monte Carlo error compounding analysis (2–6 sub-factors)
4. Superforecasting principles summary
5. Constants cheat sheet with trading context

## Further Reading

- **Philip Tetlock, *Superforecasting*** (Crown, 2015) — the definitive work on structured estimation
- **Enrico Fermi's original problem set** — documented in various physics pedagogy collections
- **Guesstimation** (Weinstein & Adam) — accessible Fermi problem collection
- **Douglas Hubbard, *How to Measure Anything*** — applied estimation in business
- Jane Street's [interviewing page](https://www.janestreet.com/join-jane-street/interviewing/) — official guidance on what they test
- Daniel Kahneman, *Thinking, Fast and Slow* — anchoring, availability, and overconfidence biases

---

This is Episode 7 of the Jane Street series. Last time we dove into market microstructure. Next up: OCaml in practice — building real systems with Jane Street's open-source libraries.

If you found this useful, [let me know](https://github.com/shizhuocheng/hugo-eternal-blogs). The best way to practice estimation is to do it — pick something you don't know, decompose it, estimate, then check. The muscle builds fast.
