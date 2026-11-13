# Long-Term Plan: from 0 € with Trade Republic (15+ years)

> Educational material, not personal financial advice. Check every product in the Trade Republic app
> (ISIN, savings-plan availability, costs) before you set it up.

## The honest starting point

Over 15+ years, **about 85–90% of professional funds fail to beat a simple global index fund**
(SPIVA studies), mostly because of fees and bad timing. Concentrated stock picking is a short-challenge
strategy. Over decades, the ways that have actually paid are:

1. **Low costs.** Every 0.5% in fees costs you roughly 7–8% of your final wealth over 15 years.
2. **Factor tilts** with decades of evidence: small-cap value, momentum, quality.
3. **Behaviour.** Keep paying in every month, especially in crashes, and never sell in a panic.

So the plan is a **cheap global core plus 30% factor tilts**. That gives you a real chance to beat
the world market (benchmark: MSCI ACWI IMI / FTSE All-World), while making sure you never fall
far behind it.

## Step 0: before investing (month 1–6)

- Build an **emergency fund of 3–6 months of expenses** in the Trade Republic cash account (it pays interest).
  Never invest money you might need within 5 years.
- Pay off any expensive debt first (credit cards, consumer loans). Paying off 10% interest beats the market for sure.
- **Germany:** set the *Freistellungsauftrag* in the app (1,000 €/year of tax-free gains, 2,000 € for couples).
  In other countries, check how ETFs are taxed (for example, a PEA in France if your broker offers one).

## Step 1: the savings plan (Sparplan)

Savings plans on Trade Republic are **free of fees** and start from 1 €, so you can start small.
Example with **200 €/month**:

| Role | ETF | ISIN | TER | Weight | €/month |
|---|---|---|---:|---:|---:|
| Core: developed world | iShares Core MSCI World (Acc) | IE00B4L5Y983 | 0.20% | 60% | 120 |
| Core: emerging markets | iShares Core MSCI EM IMI (Acc) | IE00BKM4GZ66 | 0.18% | 10% | 20 |
| Tilt: small-cap value | Avantis Global Small Cap Value (Acc) | IE0003R87OG3 | 0.39% | 10% | 20 |
| Tilt: momentum | Xtrackers MSCI World Momentum 1C | IE00BL25JP72 | 0.25% | 10% | 20 |
| Tilt: quality | iShares Edge MSCI World Quality Factor (Acc) | IE00BP3QZ601 | 0.30% | 10% | 20 |

**Weighted cost: about 0.23% per year.** All five are **accumulating** ETFs, so dividends are reinvested
automatically. In Germany that also keeps taxes low until you sell.

Whatever the amount (50 €, 500 €), keep the **same percentages**. Under about 50 €/month, start with only the
two core ETFs (85% / 15%) and add the tilts once you pay in more.

**Even simpler option:** one ETF, *Vanguard FTSE All-World (Acc)*, IE00BK5BQT80. This matches the market
rather than trying to beat it, and it's a perfectly good choice.

## Step 2: grow the money going in

The amount you pay in matters far more than the ETFs you pick:

- **Raise the savings plan every year** (each raise, or +3–5%/year).
- Turn on **Saveback** and **round-up** so they feed the savings plan automatically.
- Put bonuses and windfalls in too, using the same percentages.

## Step 3: rules for the next 15+ years

1. **Once a year**, check the weights. If one ETF has drifted more than 5 points from its target,
   **change the savings-plan amounts** to bring it back. Don't sell, because selling costs fees and taxes.
2. **Never stop the plan during a crash.** A 30–50% fall will probably happen at least once in 15 years.
   That's when your monthly euros buy the most.
3. **Optional play money:** at most 10% of the portfolio, for single stocks (for example the AI names in
   `challenge/`). Keep the core untouched.
4. **5–7 years before you need the money**, start moving new contributions (and slowly some holdings) into
   safer assets: a global government bond ETF or the cash account.

## What it can grow to

From `python tools/projection.py`: 200 €/month, 7% expected return, 16% volatility, 0.23% costs,
20,000 simulations.

| Years | You pay in | Bad case (10%) | Median | Good case (90%) | Median in today's € |
|---:|---:|---:|---:|---:|---:|
| 15 | 36,000 € | 34,000 € | 56,000 € | 95,000 € | 42,000 € |
| 20 | 48,000 € | 50,000 € | 88,000 € | 164,000 € | 59,000 € |
| 30 | 72,000 € | 88,000 € | 184,000 € | 412,000 € | 102,000 € |

Time is the strongest lever. The chance of ending below what you paid in falls from about 12% at
15 years to about 5% at 30 years. Run the tool with your own numbers:

```bash
python tools/projection.py --monthly 150 --years 25 --raise 3
```

## Why these tilts, and the risk

- **Small-cap value** has earned a premium over the market since the 1920s, across countries,
  but it can lag for 10+ years (it did in 2010–2020).
- **Momentum** has the strongest record of any factor but can crash sharply when markets reverse.
- **Quality** (profitable, low-debt companies) tends to lose less in downturns.

These three don't move in step, so together they smooth each other out. Expect the portfolio to beat
the world index by perhaps **0.5–1.5% per year on average**, with no guarantee. Over 15 years, 1% more per year
means roughly 7% more money at the end. If the tilts disappoint, 70% of the portfolio is still the market,
so you can't fall far behind.
