# Investing Portfolio

## Long-term plan (main): Trade Republic, starting from 0 €, 15+ years

- [`plan/PLAN.md`](plan/PLAN.md): step-by-step plan, ETF savings plan, rules, projections
- [`plan/savings_plan.csv`](plan/savings_plan.csv): ETFs, ISINs, weights
- [`tools/projection.py`](tools/projection.py): Monte Carlo projection of a monthly savings plan

```bash
pip install -r requirements.txt
python tools/projection.py --monthly 200 --years 20 --raise 3
```

## Short-term challenge portfolio (US stocks/ETFs)

- [`challenge/STRATEGY.md`](challenge/STRATEGY.md): concentrated portfolio for a short investing challenge
- [`tools/backtest.py`](tools/backtest.py): backtest/screener (`static`, `momentum`, `screen` modes)

US-listed ETFs such as SPY or SMH usually **can't be bought** by EU retail investors (no KID document), so
use the UCITS plan above for real money.
