#!/usr/bin/env python3
"""Backtest and screen the challenge portfolio against a market benchmark.

Modes
-----
static    Hold the weights in portfolio/holdings.csv, rebalanced on a schedule.
momentum  Each month, buy the top-N names of a universe ranked by 12-1 month
          momentum (equal weight). No hindsight in the picks: rankings only
          use prices available at the rebalance date.
screen    Print today's momentum ranking of the universe (what to buy now).

Prices come from Yahoo Finance via yfinance, or from a local CSV
(--prices-csv, wide format: Date column + one adjusted-close column per ticker).

Examples
--------
    python tools/backtest.py static --start 2021-01-01
    python tools/backtest.py momentum --top 10 --start 2019-01-01
    python tools/backtest.py screen --top 10
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
TRADING_DAYS = 252


# --------------------------------------------------------------------------- data
def load_holdings(path: Path) -> pd.Series:
    df = pd.read_csv(path)
    w = df.set_index("ticker")["weight"].astype(float)
    if not np.isclose(w.sum(), 1.0, atol=1e-6):
        sys.exit(f"Weights in {path} sum to {w.sum():.4f}, expected 1.0")
    return w


def load_universe(path: Path) -> list[str]:
    lines = path.read_text().splitlines()
    return [s.strip().upper() for s in lines if s.strip() and not s.startswith("#")]


def load_prices(tickers: list[str], start: str, end: str | None, csv: Path | None) -> pd.DataFrame:
    if csv is not None:
        px = pd.read_csv(csv, parse_dates=["Date"]).set_index("Date").sort_index()
        missing = [t for t in tickers if t not in px.columns]
        if missing:
            sys.exit(f"Price CSV is missing columns: {missing}")
        px = px.loc[start:end, tickers]
    else:
        import yfinance as yf

        raw = yf.download(tickers, start=start, end=end, auto_adjust=True, progress=False)
        px = raw["Close"] if isinstance(raw.columns, pd.MultiIndex) else raw[["Close"]]
        if isinstance(px, pd.Series):
            px = px.to_frame(tickers[0])
        failed = [t for t in tickers if t not in px.columns or px[t].isna().all()]
        if failed:
            sys.exit(f"No price data for {failed} (check network / ticker symbols)")
    return px.ffill().dropna(how="all")


# ------------------------------------------------------------------- simulation
def rebalance_dates(index: pd.DatetimeIndex, freq: str) -> pd.DatetimeIndex:
    """First trading day of each period."""
    s = pd.Series(index, index=index)
    return pd.DatetimeIndex(s.groupby(index.to_period(freq)).first().values)


def simulate(px: pd.DataFrame, targets: dict[pd.Timestamp, pd.Series], cost_bps: float) -> pd.Series:
    """Daily portfolio returns given target weights set on rebalance dates.

    Weights drift with prices between rebalances; turnover pays cost_bps.
    """
    rets = px.pct_change().fillna(0.0)
    w = pd.Series(0.0, index=px.columns)
    out = []
    for dt in px.index:
        if dt in targets:
            new = targets[dt].reindex(px.columns).fillna(0.0)
            turnover = (new - w).abs().sum()
            cost = turnover * cost_bps / 1e4
            w = new
        else:
            cost = 0.0
        r = float((w * rets.loc[dt]).sum()) - cost
        out.append(r)
        gross = w * (1 + rets.loc[dt])
        w = gross / gross.sum() if gross.sum() > 0 else w
    return pd.Series(out, index=px.index)


def momentum_scores(px: pd.DataFrame, asof: pd.Timestamp) -> pd.Series:
    """12-1 momentum: return from ~12 months ago to ~1 month ago."""
    hist = px.loc[:asof]
    if len(hist) < TRADING_DAYS:
        return pd.Series(dtype=float)
    p_1m = hist.iloc[-21]
    p_12m = hist.iloc[-TRADING_DAYS]
    return (p_1m / p_12m - 1).dropna().sort_values(ascending=False)


# ---------------------------------------------------------------------- metrics
def metrics(r: pd.Series, bench: pd.Series, rf: float) -> dict[str, float]:
    years = len(r) / TRADING_DAYS
    eq = (1 + r).cumprod()
    cagr = eq.iloc[-1] ** (1 / years) - 1 if years > 0 else np.nan
    vol = r.std() * np.sqrt(TRADING_DAYS)
    ex = r - rf / TRADING_DAYS
    sharpe = ex.mean() / r.std() * np.sqrt(TRADING_DAYS) if r.std() > 0 else np.nan
    dd = (eq / eq.cummax() - 1).min()
    beta = np.cov(r, bench)[0, 1] / bench.var() if bench.var() > 0 else np.nan
    alpha = (r.mean() - beta * bench.mean()) * TRADING_DAYS
    active = r - bench
    te = active.std() * np.sqrt(TRADING_DAYS)
    ir = active.mean() * TRADING_DAYS / te if te > 0 else np.nan
    return {
        "Total return": eq.iloc[-1] - 1,
        "CAGR": cagr,
        "Volatility": vol,
        "Sharpe": sharpe,
        "Max drawdown": dd,
        "Beta": beta,
        "Alpha (ann.)": alpha,
        "Info ratio": ir,
    }


def report(port: pd.Series, bench: pd.Series, bench_name: str, rf: float, capital: float) -> None:
    common = port.index.intersection(bench.index)[1:]
    port, bench = port.loc[common], bench.loc[common]
    mp, mb = metrics(port, bench, rf), metrics(bench, bench, rf)
    pct = {"Total return", "CAGR", "Volatility", "Max drawdown", "Alpha (ann.)"}
    print(f"\nPeriod: {common[0].date()} -> {common[-1].date()}  ({len(common)} trading days)")
    print(f"{'Metric':<16}{'Portfolio':>12}{bench_name:>12}")
    for k in mp:
        f = (lambda x: f"{x:>11.1%} ") if k in pct else (lambda x: f"{x:>11.2f} ")
        print(f"{k:<16}{f(mp[k])}{f(mb[k])}")
    end_p = capital * (1 + port).prod()
    end_b = capital * (1 + bench).prod()
    print(f"\n${capital:,.0f} grows to ${end_p:,.0f} vs ${end_b:,.0f} in {bench_name} "
          f"({'+' if end_p >= end_b else ''}{end_p - end_b:,.0f})")
    monthly = pd.DataFrame({"port": port, "bench": bench}).resample("ME").apply(lambda x: (1 + x).prod() - 1)
    print(f"Months beating {bench_name}: {(monthly.port > monthly.bench).sum()}/{len(monthly)}")


# ------------------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mode", choices=["static", "momentum", "screen"])
    ap.add_argument("--holdings", type=Path, default=ROOT / "portfolio" / "holdings.csv")
    ap.add_argument("--universe", type=Path, default=ROOT / "portfolio" / "universe.txt")
    ap.add_argument("--benchmark", default="SPY")
    ap.add_argument("--start", default="2021-01-01")
    ap.add_argument("--end", default=None)
    ap.add_argument("--rebalance", default="Q", choices=["M", "Q", "Y"], help="static mode rebalance freq")
    ap.add_argument("--top", type=int, default=10, help="names held in momentum mode")
    ap.add_argument("--cost-bps", type=float, default=5.0, help="trading cost per unit turnover")
    ap.add_argument("--rf", type=float, default=0.04, help="risk-free rate for Sharpe")
    ap.add_argument("--capital", type=float, default=100_000)
    ap.add_argument("--prices-csv", type=Path, default=None)
    a = ap.parse_args()

    if a.mode == "static":
        w = load_holdings(a.holdings)
        tickers = list(dict.fromkeys([*w.index, a.benchmark]))
        px = load_prices(tickers, a.start, a.end, a.prices_csv)
        assets = px[list(w.index)].dropna()
        targets = {d: w for d in rebalance_dates(assets.index, a.rebalance)}
        port = simulate(assets, targets, a.cost_bps)
        print(f"Static portfolio ({len(w)} positions, rebalanced {a.rebalance})")
        report(port, px[a.benchmark].pct_change(), a.benchmark, a.rf, a.capital)
        return

    uni = load_universe(a.universe)
    # load one extra year so the first rebalance has a 12-month lookback
    load_start = (pd.Timestamp(a.start) - pd.DateOffset(years=1, days=10)).strftime("%Y-%m-%d")
    px = load_prices(list(dict.fromkeys([*uni, a.benchmark])), load_start, a.end, a.prices_csv)

    if a.mode == "screen":
        s = momentum_scores(px[uni], px.index[-1])
        print(f"12-1 momentum ranking as of {px.index[-1].date()} (top {a.top} = buy list):")
        for i, (t, v) in enumerate(s.items(), 1):
            print(f"{'*' if i <= a.top else ' '} {i:>2}. {t:<6} {v:>8.1%}")
        return

    trade_px = px.loc[a.start:, uni]
    targets = {}
    for d in rebalance_dates(trade_px.index, "M"):
        top = momentum_scores(px[uni], d).head(a.top)
        if len(top):
            targets[d] = pd.Series(1 / len(top), index=top.index)
    port = simulate(trade_px, targets, a.cost_bps)
    last = list(targets.values())[-1].index.tolist() if targets else []
    print(f"Momentum top-{a.top} of {len(uni)} names, rebalanced monthly. Current holdings: {', '.join(last)}")
    report(port, px.loc[a.start:, a.benchmark].pct_change(), a.benchmark, a.rf, a.capital)


if __name__ == "__main__":
    main()
