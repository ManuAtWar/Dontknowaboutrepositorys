# My Plan: Austria, Trade Republic, 500 €/month

> Educational material, not tax or financial advice. Tax rules change, so check the details with
> the OeKB, your Finanzamt or a Steuerberater.

**Starting point:** 100 € already in Vanguard FTSE All-World, plus 500 €/month going forward, for 15+ years.

## 1. Keep the FTSE All-World as the core

You already own the right core. FTSE All-World covers about 3,700 companies in developed and emerging
markets, so it **replaces** both the MSCI World and EM ETFs in `PLAN.md`. Don't sell the 100 €, because
selling triggers tax and gains nothing.

## 2. Savings plan: 500 €/month

| ETF | ISIN | TER | Share | €/month |
|---|---|---:|---:|---:|
| Vanguard FTSE All-World (Acc), **already owned** | IE00BK5BQT80 | 0.19% | 70% | **350** |
| Avantis Global Small Cap Value (Acc) | IE0003R87OG3 | 0.39% | 10% | **50** |
| Xtrackers MSCI World Momentum 1C | IE00BL25JP72 | 0.25% | 10% | **50** |
| iShares Edge MSCI World Quality Factor (Acc) | IE00BP3QZ601 | 0.30% | 10% | **50** |

Weighted cost is about 0.23%/year. If you hold the *distributing* All-World (IE00B3RBWM25) instead,
that's fine. You can keep it, or point new money to the Acc version.

**Plan B (zero effort):** 500 € into FTSE All-World only. You match the market, never trail it, and file
the least paperwork.

## 3. Austria-specific rules: important

1. **Only buy Meldefonds (reporting funds).** For a fund that doesn't report its tax data to the
   OeKB, Austria applies a *punitive lump-sum tax*. That can mean paying tax on gains you never made.
   Before setting up each savings plan, check the ISIN at
   **my.oekb.at → Kapitalmarkt-Services → Fonds-Daten**. The Vanguard, Xtrackers and iShares funds above
   are long-established reporting funds. **The Avantis fund launched in 2024, so check it carefully.** If it isn't
   listed, use the *iShares Edge MSCI World Value Factor (IE00BP3QZB59)* for that 10% instead, after checking it too.
2. **Tax is 27.5% KESt** on dividends, gains when you sell, and the yearly *ausschüttungsgleiche Erträge*
   (AGE) of accumulating funds. Austria has **no tax-free allowance**.
3. **Steuereinfach or not?** Check in the app and on Trade Republic's website whether your account
   withholds Austrian KESt for you (*steuereinfach*).
   - **If yes:** nothing to do.
   - **If no:** each year you declare dividends/AGE and any sales in your tax return (**E1kv**, via
     FinanzOnline), using the OeKB figures for each fund. Fewer funds means less work, which is another
     reason to keep the plan to four ETFs, or go with Plan B.
4. Losses offset gains **only within the same year**; there's no carry-forward. That's another reason not to trade.
5. Interest on the Trade Republic cash account is taxable too (25% KESt on bank interest).

## 4. Order of steps

1. **Emergency fund first:** 3–6 months of expenses in the cash account. If you don't have it yet,
   send part of the 500 € there until you do.
2. Check the Meldefonds status of the four ISINs (see above).
3. Set up the four savings plans on the same execution date. Turn on **Saveback** and **round-up**,
   sent to the FTSE All-World.
4. Raise the plan each year, for example **+3%** (500 → 515 → 530 …).
5. Once a year (January), compare the actual weights with 70/10/10/10. If one is off by more than 5 points, shift
   the **monthly amounts**. Don't sell.
6. 5–7 years before you need the money, start sending new money to safer assets.

## 5. What 500 €/month can become

From `python tools/projection.py --monthly 500 --start 100` (7% expected return, 16% volatility, 20,000 simulations):

| Years | Paid in | Bad case (10%) | **Median** | Good case (90%) | Median in today's € |
|---:|---:|---:|---:|---:|---:|
| 15 | 90,100 € | 86,000 € | **140,000 €** | 238,000 € | 104,000 € |
| 20 | 120,100 € | 124,000 € | **220,000 €** | 409,000 € | 148,000 € |
| 30 | 180,100 € | 219,000 € | **459,000 €** | 1,028,000 € | 253,000 € |

**Raising the plan 3% per year** (`--raise 3`):

| Years | Paid in | Bad case (10%) | **Median** | Good case (90%) |
|---:|---:|---:|---:|---:|
| 15 | 111,700 € | 106,000 € | **169,000 €** | 280,000 € |
| 20 | 161,300 € | 164,000 € | **280,000 €** | 505,000 € |
| 30 | 285,600 € | 332,000 € | **649,000 €** | 1,368,000 € |

The results are before the 27.5% tax on the gains when you sell. Real results will differ: markets can
fall 30–50% along the way. The plan works only if you keep buying through those falls.

## 6. Paying out later: the 27.5% tax

There is **no legal way to sell and avoid the 27.5% KESt** as an Austrian tax resident. It's a flat rate
with no allowance, so spreading sales over years doesn't lower the rate. What you *can* do:

- **You're only taxed on the gain, not the whole amount.** Paid-in money and the yearly AGE already taxed
  raise your cost basis. Example: 1,000,000 € value, 350,000 € paid in, 50,000 € AGE already taxed:
  taxable gain 600,000 € × 27.5% = 165,000 €, so **835,000 € net (16.5% effective)**.
  **Keep records of the yearly AGE** (OeKB data) if the account isn't steuereinfach, or you pay twice.
- **Don't sell everything at once; sell what you spend.** Whatever stays invested isn't taxed yet and keeps
  growing. Selling about 3–4% a year to live on defers most of the tax for decades. Cash also loses to inflation,
  and its interest is taxed at 25%.
- **Offset losses within the same calendar year** if you have any (no carry-forward).
- **Unit-linked life insurance (fondsgebundene Lebensversicherung)** held 15+ years: payouts are free of KESt
  (4% insurance tax on premiums instead). Fees often eat the advantage, so only consider very low-cost
  contracts, and get a written cost comparison. Not available at Trade Republic.
- **Gifting or inheritance** doesn't remove the tax. There's no gift or inheritance tax in Austria, but the
  recipient takes over your cost basis and pays KESt when they sell.
- **Moving abroad** triggers Austria's exit tax (*Wegzugsbesteuerung*) on unrealised gains. Get advice
  from a Steuerberater first.
