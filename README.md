# Investing Challenge Portfolio

A portfolio built to outperform the S&P 500, plus a tool to backtest and maintain it.

- [`portfolio/STRATEGY.md`](portfolio/STRATEGY.md): thesis, allocation, trading rules, caveats
- [`portfolio/holdings.csv`](portfolio/holdings.csv): target weights (edit to change the portfolio)
- [`portfolio/universe.txt`](portfolio/universe.txt): candidate names for the momentum screen
- [`tools/backtest.py`](tools/backtest.py): backtest and screener

## Usage

```bash
pip install -r requirements.txt

# Backtest the static portfolio against SPY, rebalanced quarterly
python tools/backtest.py static --start 2021-01-01

# Backtest the systematic strategy (top-10 by 12-1 momentum, monthly)
python tools/backtest.py momentum --top 10 --start 2019-01-01

# Today's momentum ranking: what to hold this month
python tools/backtest.py screen

# Run offline from your own price file (Date column + one column per ticker)
python tools/backtest.py static --prices-csv prices.csv
```

Reports include total return, CAGR, volatility, Sharpe, max drawdown, beta, alpha, information ratio,
end value of $100k vs. the benchmark, and the number of months the portfolio beat it.
