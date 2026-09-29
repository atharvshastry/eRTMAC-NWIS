"""Calibrates alert thresholds PER EVENT TYPE from data, instead of one guessed number for all six
types. Different incident types have very different base rates and depth spreads in this dataset, so a
single fixed score cutoff (e.g. 0.35) fires constantly for common types and never for rare ones.

Method: for each event type, run many depth-shuffled ("null") backtests (same events, randomised
depths -- see app/backtest.shuffled_events) and take percentiles of the score it produces on cases
where NO real match exists. A real score has to clear that type's own noise floor to count as an alert.
This is intentionally conservative for a ~54-event synthetic set: it tells you what is distinguishable
from chance on THIS data, not a claim of production-grade accuracy. Re-run when real data arrives.
"""
from __future__ import annotations

import random
import statistics
from collections import defaultdict

from .backtest import shuffled_events
from .data import Store
from .risk import LOOKBACK_M, assess

STEP_M = 25


def _null_scores(store: Store, events: list[dict], lookahead_m: float, radius_km: float) -> dict[str, list[float]]:
    scores: dict[str, list[float]] = defaultdict(list)
    for wid in store.historical_ids():
        td = int(store.wells[wid]["actual_td_m"])
        for d in range(1000, td + 1, STEP_M):
            res = assess(store, depth_md=d, well_id=wid, lookahead_m=lookahead_m, radius_km=radius_km,
                         min_band="LOW", events=events)
            for a in res["alerts"]:
                scores[a["event_type"]].append(a["score"])
    return scores


def calibrate_thresholds(
    store: Store, lookahead_m: float = 150, radius_km: float = 30, n_shuffles: int = 20, seed: int = 0,
    pct: dict[str, float] | None = None,
) -> dict[str, dict[str, tuple[float, int]]]:
    """Returns {event_type: {"HIGH": (thr, min_wells), "MEDIUM": (thr, min_wells), "LOW": (thr, min_wells)}}.
    Thresholds are percentiles of that type's own null-score distribution (higher percentile = rarer
    = stronger claim), floored at a small positive number so a type with an almost-empty null
    distribution doesn't get a threshold of 0 (which would fire on everything)."""
    # NOTE (measured on this synthetic set, see app/backtest.py + tests/test_backtest.py): only the
    # loosest tier clears the shuffled-depth control with 54 events spread over 18 wells (recall 0.63
    # vs a ~0.23 random baseline). MEDIUM/HIGH do NOT beat the control here -- too few incidents per
    # type to support a high-confidence claim. Kept as three tiers for the UI/demo, but be upfront
    # that only the loosest tier is backtested-validated on this dataset; re-run this calibration
    # (and the backtest) once real or larger data arrives, since the picture can change.
    pct = pct or {"HIGH": 97, "MEDIUM": 90, "LOW": 75}
    rng = random.Random(seed)
    pooled: dict[str, list[float]] = defaultdict(list)
    for _ in range(n_shuffles):
        for etype, scores in _null_scores(store, shuffled_events(store, rng), lookahead_m, radius_km).items():
            pooled[etype].extend(scores)

    out: dict[str, dict[str, tuple[float, int]]] = {}
    for etype in {e["event_type"] for e in store.events}:
        vals = sorted(pooled.get(etype, []))
        thr = {}
        for band, p in pct.items():
            v = vals[min(int(len(vals) * p / 100), len(vals) - 1)] if vals else 0.05
            thr[band] = (max(v, 0.05), 2 if band != "LOW" else 1)
        out[etype] = thr
    return out


def summarize(thresholds: dict[str, dict[str, tuple[float, int]]]) -> str:
    lines = ["event_type       LOW     MEDIUM  HIGH"]
    for etype, bands in sorted(thresholds.items()):
        lines.append(f"{etype:<16} {bands['LOW'][0]:.3f}   {bands['MEDIUM'][0]:.3f}   {bands['HIGH'][0]:.3f}")
    return "\n".join(lines)
