# Investing Challenge: "Tilted Growth" Portfolio

**Goal:** beat the S&P 500 (benchmark: `SPY`) over the challenge period.
**Assumptions:** $100,000 virtual capital, US-listed stocks and ETFs, long-only, no leverage or options.
Change these in `holdings.csv` if your challenge has different rules.

> This is a strategy for a simulated challenge. It is not personal financial advice.
> No portfolio is guaranteed to beat the market, and most active portfolios don't over long horizons.

## The idea in one paragraph

An index fund holds the market. To beat it you have to be **different** from it, and different in ways that
have historically been paid. This portfolio does that in three ways:

1. It **overweights the main driver of current earnings growth**: AI compute and infrastructure.
2. It **tilts toward the momentum and quality factors**, which have long, documented records of beating
   the market.
3. It **adds low-correlation diversifiers and a gold hedge**, so one sector selloff doesn't sink the challenge.

## Allocation ($100,000)

| Sleeve | Ticker | Weight | $ | Why |
|---|---|---:|---:|---|
| **Core factor ETFs (30%)** | SMH | 10% | 10,000 | Semiconductor basket. Diversified exposure to AI capex |
| | MTUM | 10% | 10,000 | Momentum factor. Systematically owns the trend |
| | QUAL | 10% | 10,000 | Quality factor. Holds up better in drawdowns |
| **AI compute (22%)** | NVDA | 7% | 7,000 | Dominant accelerator franchise |
| | AVGO | 6% | 6,000 | Custom AI chips and networking |
| | TSM | 5% | 5,000 | Only foundry at the leading edge |
| | ANET | 4% | 4,000 | Ethernet switching for data centers |
| | VRT | 4% | 4,000 | Data-center power and cooling |
| **Platforms (24%)** | MSFT | 6% | 6,000 | Azure and Copilot |
| | GOOGL | 6% | 6,000 | Search cash flows fund Cloud and Gemini |
| | META | 6% | 6,000 | AI-driven ad engine, strong buybacks |
| | AMZN | 6% | 6,000 | AWS and retail margins |
| **Diversifiers (14%)** | LLY | 5% | 5,000 | GLP-1 drugs. Growth not tied to tech |
| | JPM | 4% | 4,000 | Best-run bank, gains from capital markets |
| | COST | 5% | 5,000 | Defensive compounder |
| **Hedge (6%)** | GLD | 6% | 6,000 | Gold. Helps in inflation shocks and selloffs |

Sector mix: about 55% tech/AI and 45% other (factor ETFs, health care, financials, staples, gold).
The expected beta is about 1.1–1.2. In a rising market this portfolio should beat SPY. In a tech-led selloff
it will trail SPY, and the diversifiers and gold are there to limit that damage.

## Rules (the part that actually matters)

1. **Position caps:** no single stock above 10% and no sleeve above 35%. Trim back to target whenever a cap is broken.
2. **Rebalance monthly** back to target weights. Run `python tools/backtest.py screen` each month.
3. **Momentum swap:** if a stock drops out of the **bottom half** of the universe momentum ranking,
   replace it with the highest-ranked name you don't already hold, at the same weight.
4. **Stop-loss:** if a stock falls **20% below its high since purchase**, sell it and put the money into MTUM
   until the next monthly rebalance.
5. **Earnings discipline:** don't add to a position in the week before its earnings report.
6. **Don't chase:** never buy a name after a single-day gain of more than 10%. Wait for the next rebalance.

## Adjusting for the challenge length

- **Short challenge (1–3 months), winner-takes-all:** rankings reward variance. Fold QUAL, JPM and COST
  into NVDA/AVGO/VRT and the top-5 momentum names. You give up safety for a better chance of finishing first.
- **Long challenge (6–12+ months) or risk-adjusted scoring (Sharpe):** keep the allocation as written,
  or raise QUAL and GLD to 15% each and cut the single stocks.

## Fully systematic alternative

`python tools/backtest.py momentum --top 10` runs a rules-only strategy. Each month it ranks
`universe.txt` by 12-1 month momentum and holds the top 10 names in equal weights. The backtest is free of
hindsight bias because each pick uses only prices available on that date. Compare its numbers with the
static portfolio and use whichever has the better risk-adjusted record.

## Caveats

- **The static backtest has hindsight bias.** Today's winners were chosen knowing they had already won,
  so its past performance is flattering. The momentum backtest doesn't have this problem.
- Stock picks reflect information up to mid-2026. Before you buy, check prices, valuations and recent news,
  and run `screen` so the momentum ranking is current.
- Concentration cuts both ways. The same tilts that help you beat SPY can make you trail it badly.
