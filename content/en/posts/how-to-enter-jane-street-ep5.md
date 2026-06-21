---
title: "How to Enter Jane Street (Ep.5): Puzzles Deep Dive"
date: 2026-06-21T00:00:00+08:00
description: "Jane Street's monthly puzzles are legendary. This episode breaks down six classic puzzle categories, solves each from first principles, verifies with Python simulations, and extracts the reusable methodology that connects puzzle-solving to real quant trading thinking."
tags: ["Jane Street", "Puzzles", "Probability", "Information Theory", "Hamming Codes", "Interview Preparation"]
draft: false
series: jane-street
---

If you've spent any time on Jane Street's website, you've probably found their [puzzles page](https://www.janestreet.com/puzzles/). Every month or two, they post a new problem. Sometimes it's a number theory question. Sometimes it's a combinatorial game. Sometimes it doesn't even have clearly defined rules — and *that's* the point.

Jane Street's own description says it best: "The act of solving puzzles, though it might seem abstract, is intrinsic to the work we do." Identifying new problems in financial markets and figuring out novel ways to solve them is literally the job. So they use puzzles as both a recruiting filter and a cultural signal.

This episode breaks down six categories of puzzles that appear repeatedly in Jane Street's interviews and monthly challenges. Each one comes with a full solution, a Python simulation to verify the math, and — most importantly — the *transferable insight* that connects it back to quantitative trading.

## Why Puzzles Matter at Jane Street

Most quant firms test your ability to do mental math and recall formulas. Jane Street tests something different: **can you think clearly when the problem is unfamiliar?**

Their puzzles share a few DNA markers:

- **Small cases hide the pattern.** The n=2 or n=3 case is always tractable by hand. The insight usually generalizes.
- **Information is the currency.** Many puzzles boil down to: what do you *know* vs. what you *assume*?
- **There's always a twist.** The obvious answer is usually wrong, or at least incomplete.
- **Connections to real math.** The "hat game" is literally error-correcting codes. The "biased coin" problem is von Neumann's trick. These aren't toys — they're the same structures used in market microstructure and signal processing.

## Puzzle Taxonomy

| Category | Core skill | JS frequency | Classic example |
|----------|-----------|-------------|-----------------|
| Counting / Parity | Modular arithmetic | ★★★★★ | 100 Lockers |
| Expected Value | Linearity of expectation | ★★★★★ | E[max of n dice] |
| Information Theory | Shannon entropy | ★★★★☆ | 12 Coins |
| Collaborative Games | Coding theory | ★★★★☆ | Hat Game |
| Random Walks | Absorbing Markov chains | ★★★☆☆ | Gambler's Ruin |
| Coupon Collector | Harmonic series | ★★★☆☆ | Collect all N |

Let's dive into each one.

## 1. The 100 Lockers (Counting & Parity)

**Problem:** 100 students walk past 100 closed lockers. Student 1 opens every locker. Student 2 toggles every 2nd locker. Student 3 toggles every 3rd. ... Student 100 toggles locker 100. Which lockers end up open?

**Solution:** Locker *k* is toggled once for each divisor of *k*. Most numbers have divisors that come in pairs (d, k/d), so they get toggled an even number of times and end up closed. The exception: **perfect squares**, where √k pairs with itself, giving an odd number of divisors.

Open lockers: 1, 4, 9, 16, 25, 36, 49, 64, 81, 100 — exactly 10 lockers.

**The deeper insight:** This is a *parity argument*. You don't need to simulate 100 students. You just need to ask: "when does the count of divisors come out odd?" Parity arguments show up everywhere in Jane Street puzzles — and in trading (e.g., is the number of filled orders at a price level even or odd? That can matter for inventory management).

```python
# Verification
lockers = [False] * 101  # 1-indexed
for student in range(1, 101):
    for locker in range(student, 101, student):
        lockers[locker] = not lockers[locker]
open_lockers = [i for i in range(1, 101) if lockers[i]]
print(open_lockers)  # [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]
print(f"Count: {len(open_lockers)}")  # 10
```

## 2. Expected Maximum of n Dice (Linearity of Expectation)

**Problem:** Roll n fair six-sided dice. What's the expected value of the maximum?

**Solution:** The key formula:

$$E[\max] = \sum_{k=1}^{6} k \cdot P(\max = k) = \sum_{k=1}^{6} k \cdot \left[\left(\frac{k}{6}\right)^n - \left(\frac{k-1}{6}\right)^n\right]$$

The probability that the max equals *k* is the probability all dice show ≤ k, minus the probability all show ≤ k−1.

| n | E[max] |
|---|--------|
| 1 | 3.500 |
| 2 | 4.472 |
| 3 | 4.958 |
| 10 | 5.824 |

**The deeper insight:** "Expected value" doesn't mean "most likely value." For n=10, the expected max is 5.82 but the *mode* is 6. Jane Street probes whether you confuse expectations with modes, medians, or most-likely outcomes. In trading, your P&L distribution is rarely symmetric — knowing the *shape* matters as much as the mean.

## 3. Von Neumann's Fair Coin (Information Theory)

**Problem:** You have a biased coin with unknown probability *p* of heads (p ≠ 0.5). Generate a fair coin flip.

**Solution (von Neumann, 1951):** Flip twice:
- **HT** → output "Heads"
- **TH** → output "Tails"
- **HH or TT** → discard and retry

This works because P(HT) = P(TH) = p(1−p), regardless of *p*. The two sequences are equally likely, so mapping them to Heads/Tails gives a perfectly fair coin.

Expected flips per fair bit: 1 / (2p(1−p)). For p=0.9, that's ~5.6 flips per fair outcome.

**The deeper insight:** You can extract fair randomness from any biased source, even one with *unknown* bias. This is the foundation of **entropy extraction** — a concept directly relevant to signal processing, market microstructure (extracting signal from noisy order flow), and cryptography.

```python
import random
def von_neumann(p=0.7):
    while True:
        a, b = random.random() < p, random.random() < p
        if a and not b: return 'H'
        if b and not a: return 'T'
        # HH or TT: retry

# Verify: 100k fair flips from p=0.9 coin
results = [von_neumann(0.9) for _ in range(100000)]
print(f"Heads: {results.count('H') / len(results):.4f}")  # ~0.5000
```

## 4. The Hat Game (Collaborative Games & Coding Theory)

This is the crown jewel of Jane Street puzzles. It connects directly to the math they use every day.

**Problem:** *n* players each wear a red or blue hat (assigned uniformly at random). Each player can see everyone else's hat but not their own. They simultaneously either guess their own color or pass. The team *wins* if at least one player guesses correctly AND no one guesses incorrectly. They *lose* if anyone guesses incorrectly, or if everyone passes.

What's the maximum win probability, and what's the strategy?

**The naive approach (n=3):** One designated player always guesses "Red." Win probability: 50% (they're right half the time, but whenever they're wrong, the team loses). Not great.

**The Hamming code strategy (for n = 2^k − 1):** Win probability = n/(n+1).

For n=3: **75%**. For n=7: **87.5%**. For n=15: **93.75%**.

How? The strategy leverages the same math as **error-correcting codes**:

1. Think of each hat assignment as a binary vector **h** ∈ {0,1}ⁿ.
2. Construct the parity-check matrix **H** from a Hamming code: column *j* = binary representation of *j*.
3. Player *i* computes the "syndrome" they observe: **v**_i = XOR of column(*j*) for all visible red hats.
4. Decision rule:
   - If **v**_i = 0 → guess "Red" (your hat is the missing bit to complete the syndrome)
   - If **v**_i = column(*i*) → guess "Blue"
   - Otherwise → **pass**

**Why it works:** The true syndrome **s** = **H** · **h**. When **s** ≠ 0, it points to exactly one bit position — exactly one player has **v**_i matching a trigger condition, and they guess correctly. When **s** = 0 (all zeros vector), *every* player triggers the "guess Red" rule — and they're all wrong. But **s** = 0 happens with probability only 1/(n+1).

**The deeper insight:** This is *literally* how error-correcting codes work. A Hamming code detects and corrects single-bit errors by computing a syndrome. Jane Street uses similar redundancy and error-detection logic in their trading systems — ensuring that a single corrupted data point doesn't cascade into a wrong trade. The puzzle isn't a toy; it's the same mathematical structure applied to hats instead of data packets.

```python
import numpy as np
from itertools import product

def hat_game_sim(n, trials=100000):
    """Simulate the Hamming code strategy for n = 2^k - 1."""
    # Build parity-check matrix H (k x n), column j = binary of j+1
    k = n.bit_length()  # n = 2^k - 1
    H = []
    for j in range(1, n + 1):
        H.append([(j >> bit) & 1 for bit in range(k)])
    H = np.array(H).T  # k x n

    wins = 0
    for _ in range(trials):
        hats = np.random.randint(0, 2, n)
        any_guess = False
        all_correct = True
        for i in range(n):
            # Player i sees all hats except i
            visible = hats.copy()
            visible[i] = 0  # pretend own hat is 0 for syndrome calc
            syndrome = (H @ visible) % 2
            if np.array_equal(syndrome, np.zeros(k, dtype=int)):
                any_guess = True
                if hats[i] != 1:  # guessed Red (1), actual is 0
                    all_correct = False
            elif np.array_equal(syndrome, H[:, i]):
                any_guess = True
                if hats[i] != 0:  # guessed Blue (0), actual is 1
                    all_correct = False
            # else: pass
        if any_guess and all_correct:
            wins += 1
    return wins / trials

print(f"n=3:  {hat_game_sim(3):.4f}  (theory: 0.7500)")
print(f"n=7:  {hat_game_sim(7):.4f}  (theory: 0.8750)")
print(f"n=15: {hat_game_sim(15):.4f}  (theory: 0.9375)")
```

## 5. Random Walk to Absorption (Markov Chains)

**Problem:** A drunk starts at position *k* on a number line {0, 1, ..., N}. At each step, they move left or right with equal probability. They stop when they hit 0 or N (absorbing barriers). What's the expected number of steps?

**Solution:** E[steps from position *k*] = *k*(N − *k*).

This elegant result comes from solving the recurrence: E_k = 1 + (E_{k−1} + E_{k+1})/2, with boundary conditions E_0 = E_N = 0.

For N=10, k=5: E = 25 steps. For N=100, k=50: E = 2500 steps.

**The deeper insight:** This is the **gambler's ruin** problem — the mathematical reason why a trader with finite capital and no edge *must* eventually go broke. Jane Street's entire business model is built on having a positive edge; without one, the random walk math is unforgiving. The formula k(N−k) also tells you that the expected duration scales quadratically with the "distance" between barriers, which is why position sizing matters: larger positions relative to your capital make the "barriers" closer.

## 6. Coupon Collector (Harmonic Series)

**Problem:** Each cereal box contains one of *n* different coupons (uniformly random). How many boxes do you expect to buy to collect all *n*?

**Solution:** E[boxes] = *n* · H_n = *n* · Σ(1/k, k=1..n), where H_n is the *n*-th harmonic number.

The intuition: after collecting *k* distinct coupons, the probability of getting a new one is (n−k)/n, so the expected boxes for the next new coupon is n/(n−k). Sum over k = 0, 1, ..., n−1.

| n | E[boxes] |
|---|----------|
| 10 | 29.3 |
| 26 | 100.2 |
| 52 | 235.98 |

**The deeper insight:** The last few coupons are exponentially expensive. Going from 1 missing to 0 missing costs *n* boxes on average. This "last mile" problem appears everywhere: in market-making (the last contracts to fill a large order are the most expensive), in portfolio optimization (diminishing returns from adding more assets), and in sampling (coverage of rare events).

## The Six-Step Methodology

After working through dozens of Jane Street puzzles, I've distilled a reusable approach:

1. **Read carefully.** JS puzzles always have a twist in the wording. What's *actually* being asked?
2. **Small cases first.** Compute n=2, n=3 by hand. The pattern usually emerges quickly.
3. **Information bounds.** Ask: how many bits of information are available? What's the theoretical best outcome? This constrains your search.
4. **Symmetry.** Look for invariants, symmetric structures, or parity arguments. They often collapse a hard problem into a trivial one.
5. **Simulate.** Write a quick Python simulation. If the simulation disagrees with your formula, one of them is wrong.
6. **Prove, then extend.** Once you have the answer, ask: "What if we change X?" JS interviews love follow-up questions that stress-test your understanding.

## From Puzzles to Trading

The connection between puzzles and Jane Street's actual work is not metaphorical — it's literal:

- **Linearity of expectation** → pricing derivatives, computing portfolio Greeks
- **Parity arguments** → inventory checks, order validation
- **Error-correcting codes** → ensuring data integrity in market feeds
- **Random walks** → modeling price paths, risk management
- **Harmonic series** → understanding fill rates and market impact
- **Information theory** → signal extraction from noisy order flow

When Jane Street says "solving puzzles feels great," they're not being cute. Puzzles are the distilled essence of the quantitative problems they face every day, stripped of financial jargon and reduced to their mathematical core.

## Practice Resources

- [Jane Street Puzzles](https://www.janestreet.com/puzzles/) — the source itself
- *Heard on the Street* (Tiantong) — classic quant interview prep
- *A Practical Guide to Quantitative Finance Interviews* (Xinfeng Zhou)
- Code: All simulations in this post are collected in [my quant learning repo](https://github.com/wewewexiao2008/quant-learning)

---

**Next episode:** Market Microstructure 101 — order books, market makers, liquidity, and slippage. We'll connect the probability theory from earlier episodes to how markets actually operate at the micro level.

*This is Episode 5 of the "How to Enter Jane Street" series. New episodes every two weeks.*
