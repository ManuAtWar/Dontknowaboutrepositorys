#!/usr/bin/env python3
"""Project a monthly savings plan (Sparplan) over many years.

Runs a Monte Carlo simulation of monthly returns and prints percentile outcomes,
so you see a realistic range, not just a single straight-line number.

Examples
--------
    python tools/projection.py --monthly 200 --years 20
    python tools/projection.py --monthly 100 --years 30 --raise 3 --start 1000
"""
from __future__ import annotations

import argparse

import numpy as np


def simulate(monthly: float, years: int, start: float, raise_pct: float, ret: float,
             vol: float, ter: float, inflation: float, runs: int, seed: int):
    months = years * 12
    rng = np.random.default_rng(seed)
    # lognormal monthly returns with the given annual arithmetic mean and volatility, net of TER
    mu_m = np.log(1 + ret - ter) / 12 - (vol ** 2) / 24
    sig_m = vol / np.sqrt(12)
    r = np.exp(rng.normal(mu_m, sig_m, (runs, months))) - 1

    contrib = monthly * (1 + raise_pct) ** (np.arange(months) // 12)
    value = np.full(runs, float(start))
    for m in range(months):
        value = (value + contrib[m]) * (1 + r[:, m])
    paid = start + contrib.sum()
    real = value / (1 + inflation) ** years
    return value, real, paid


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--monthly", type=float, default=200, help="savings-plan amount per month (EUR)")
    ap.add_argument("--years", type=int, default=20)
    ap.add_argument("--start", type=float, default=0, help="lump sum at the start (EUR)")
    ap.add_argument("--raise", dest="raise_pct", type=float, default=0, help="raise monthly amount by X%% each year")
    ap.add_argument("--ret", type=float, default=7.0, help="expected annual return %% (global equities ~6-8)")
    ap.add_argument("--vol", type=float, default=16.0, help="annual volatility %%")
    ap.add_argument("--ter", type=float, default=0.23, help="weighted fund cost %%")
    ap.add_argument("--inflation", type=float, default=2.0, help="for today's-euros figure %%")
    ap.add_argument("--runs", type=int, default=20_000)
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()

    v, real, paid = simulate(a.monthly, a.years, a.start, a.raise_pct / 100, a.ret / 100,
                             a.vol / 100, a.ter / 100, a.inflation / 100, a.runs, a.seed)
    print(f"Savings plan: {a.monthly:,.0f} EUR/month for {a.years} years"
          + (f", +{a.raise_pct:g}%/yr" if a.raise_pct else "")
          + (f", {a.start:,.0f} EUR start" if a.start else ""))
    print(f"Assumed: {a.ret:g}% return, {a.vol:g}% volatility, {a.ter:g}% costs, {a.inflation:g}% inflation\n")
    print(f"You pay in:            {paid:>12,.0f} EUR")
    print(f"{'Outcome':<22}{'Nominal':>12}{'In today EUR':>15}")
    for label, p in [("Bad (10th pct)", 10), ("Median", 50), ("Good (90th pct)", 90)]:
        print(f"{label:<22}{np.percentile(v, p):>12,.0f}{np.percentile(real, p):>15,.0f}")
    print(f"\nChance of ending below what you paid in: {(v < paid).mean():.1%}")


if __name__ == "__main__":
    main()
