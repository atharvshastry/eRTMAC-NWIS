"""Replay a well through the risk engine, and measure it with leave-one-well-out backtesting.

Leave-one-well-out: when a historical well is replayed, its own events are excluded, so the engine only
sees what the OTHER wells knew. A shuffled-depth control (same events, random depths) shows how much of
the performance is real depth structure rather than chance.
"""
from __future__ import annotations

import random
import statistics
from collections import defaultdict

from .data import Store
from .risk import LOOKBACK_M, AlertTracker, assess

START_DEPTH_M = 1000  # the dataset's telemetry starts at 1000 m MD


def replay_timeline(store: Store, well_id: str, lookahead_m: float = 150, radius_km: float = 30,
                    min_band: str = "MEDIUM") -> list[dict]:
    """Walk the well's telemetry in time order and emit discrete alert events (what the live demo shows)."""
    tel = store.telemetry(well_id)
    tracker = AlertTracker()
    out = []
    for row in tel.itertuples():
        res = assess(store, depth_md=float(row.md_m), well_id=well_id, lookahead_m=lookahead_m,
                     radius_km=radius_km, min_band=min_band)
        for a in tracker.update(res):
            out.append({"timestamp": row.timestamp, "depth_md_m": float(row.md_m),
                        "formation": row.formation, **a})
    return out


def shuffled_events(store: Store, rng: random.Random) -> list[dict]:
    depths = [e["depth_md_m"] for e in store.events]
    rng.shuffle(depths)
    return [{**e, "depth_md_m": d} for e, d in zip(store.events, depths)]


def _runs(depths: list[int], step: int) -> list[list[int]]:
    runs: list[list[int]] = []
    for d in depths:
        if runs and d - runs[-1][-1] <= step:
            runs[-1].append(d)
        else:
            runs.append([d])
    return runs


def evaluate(store: Store, min_band: str = "MEDIUM", step_m: int = 25, lookahead_m: float = 150,
             radius_km: float = 30, events: list[dict] | None = None) -> dict:
    """Event-level recall (was each real incident warned about before the bit got there?), episode-level
    precision (did an alert run correspond to a real incident of that type?), and alert density."""
    n_events = warned = episodes = tp = steps = alert_steps = 0
    leads: list[float] = []

    for wid in store.historical_ids():
        truth = [e for e in store.events if e["well_id"] == wid]
        td = int(store.wells[wid]["actual_td_m"])
        fired: dict[str, list[int]] = defaultdict(list)
        for d in range(START_DEPTH_M, td + 1, step_m):
            res = assess(store, depth_md=d, well_id=wid, lookahead_m=lookahead_m, radius_km=radius_km,
                         min_band=min_band, events=events)
            steps += 1
            alert_steps += bool(res["alerts"])
            for a in res["alerts"]:
                fired[a["event_type"]].append(d)

        for e in truth:
            n_events += 1
            ahead = [d for d in fired[e["event_type"]] if d < e["depth_md_m"] <= d + lookahead_m]
            if ahead:
                warned += 1
                leads.append(e["depth_md_m"] - min(ahead))

        for etype, ds in fired.items():
            for run in _runs(ds, step_m):
                episodes += 1
                lo, hi = run[0] - LOOKBACK_M, run[-1] + lookahead_m
                tp += any(e["event_type"] == etype and lo <= e["depth_md_m"] <= hi for e in truth)

    return {
        "events": n_events,
        "recall": round(warned / n_events, 3) if n_events else 0.0,
        "median_lead_m": round(statistics.median(leads), 0) if leads else None,
        "alert_episodes": episodes,
        "precision": round(tp / episodes, 3) if episodes else 0.0,
        "alert_density": round(alert_steps / steps, 3) if steps else 0.0,
    }


def evaluate_with_control(store: Store, n_shuffles: int = 10, seed: int = 0, **kw) -> dict:
    real = evaluate(store, **kw)
    rng = random.Random(seed)
    runs = [evaluate(store, events=shuffled_events(store, rng), **kw) for _ in range(n_shuffles)]
    ctrl = {k: round(statistics.mean(r[k] for r in runs), 3) for k in ("recall", "precision", "alert_density")}
    ctrl_sd = {k: round(statistics.pstdev(r[k] for r in runs), 3) for k in ("recall", "precision")}
    return {"real": real, "control_mean": ctrl, "control_sd": ctrl_sd, "n_shuffles": n_shuffles, "settings": kw}


def _lessons_text(well_id: str, w: dict, caught: list[dict], missed: list[dict], false_alarms: list[dict]) -> str:
    """Plain-language summary built only from the counts/records actually computed below -- nothing
    here is generated freeform, so it can be safely appended to the search corpus as a grounded record
    (see app/search.py). This is the "capture lessons learned" half of the teammate-suggested
    after-action feature; the model itself is never retrained from this."""
    parts = [f"After-action replay of {w['well_name']} ({well_id}), {w['field']}."]
    total = len(caught) + len(missed)
    if caught:
        best = max(caught, key=lambda c: c["lead_m"])
        parts.append(
            f"{len(caught)} of {total} recorded event(s) had a matching risk-engine alert ahead of the "
            f"actual depth (best case: {best['label']} at {best['actual_depth_m']:.0f} m MD, flagged "
            f"{best['lead_m']:.0f} m earlier at {best['first_alert_depth_m']:.0f} m)."
        )
    if missed:
        m = missed[0]
        parts.append(
            f"{len(missed)} event(s) had no matching alert before they occurred, including "
            f"{m['event_type']} at {m['actual_depth_m']:.0f} m MD -- offset-well evidence in this "
            f"radius did not surface it in time; consider widening the search radius or lookahead for "
            f"this event type on similar wells."
        )
    if false_alarms:
        parts.append(
            f"{len(false_alarms)} alert episode(s) did not correspond to any recorded event on this "
            f"well and would read as false alarms in hindsight."
        )
    if total == 0:
        parts.append("This well recorded no operational events, so there is nothing to compare the engine's alerts against.")
    return " ".join(parts)


def after_action_report(
    store: Store, well_id: str, lookahead_m: float = 150, radius_km: float = 30,
    min_band: str = "MEDIUM", step_m: int = 25,
) -> dict:
    """Retroactively replays a COMPLETED well through the same leave-one-well-out risk engine used by
    evaluate() above, at fixed depth steps, then diffs the resulting alert timeline against what the
    well's own recorded events say actually happened -- classifying each real event as caught (an
    alert fired ahead of it) or missed, and each alert episode as a real match or a false alarm.
    This is the "compare predicted vs. actual, capture lessons learned" half of the teammate-suggested
    after-action feature (PS 26121). It is a genuine replay against real recorded data, not a live
    prediction, and it never retrains or otherwise changes the risk model -- see module docstring."""
    w = store.wells.get(well_id)
    if w is None:
        raise KeyError(f"Unknown well_id {well_id}")
    td = int(w["actual_td_m"])
    truth = sorted((e for e in store.events if e["well_id"] == well_id), key=lambda e: e["depth_md_m"])

    fired: dict[str, list[int]] = defaultdict(list)
    fired_alerts: dict[tuple[str, int], dict] = {}
    for d in range(START_DEPTH_M, td + 1, step_m):
        res = assess(store, depth_md=d, well_id=well_id, lookahead_m=lookahead_m, radius_km=radius_km,
                     min_band=min_band)
        for a in res["alerts"]:
            fired[a["event_type"]].append(d)
            fired_alerts[(a["event_type"], d)] = a

    caught, missed = [], []
    for e in truth:
        ds = fired.get(e["event_type"], [])
        ahead = [d for d in ds if d < e["depth_md_m"] <= d + lookahead_m]
        if ahead:
            fire_d = min(ahead)
            a = fired_alerts[(e["event_type"], fire_d)]
            caught.append({
                "event_id": e["event_id"], "event_type": e["event_type"], "label": a["label"],
                "actual_depth_m": e["depth_md_m"], "first_alert_depth_m": float(fire_d),
                "lead_m": round(e["depth_md_m"] - fire_d, 1), "band_at_alert": a["band"],
                "description": e["description"], "mitigation_on_file": e["mitigation"],
                "npt_hours": e["npt_hours"],
            })
        else:
            missed.append({
                "event_id": e["event_id"], "event_type": e["event_type"],
                "actual_depth_m": e["depth_md_m"], "description": e["description"],
                "npt_hours": e["npt_hours"], "severity": e["severity"],
            })

    false_alarms = []
    for etype, ds in fired.items():
        for run in _runs(sorted(ds), step_m):
            lo, hi = run[0] - LOOKBACK_M, run[-1] + lookahead_m
            matched = any(e["event_type"] == etype and lo <= e["depth_md_m"] <= hi for e in truth)
            if not matched:
                a = fired_alerts[(etype, run[0])]
                false_alarms.append({
                    "event_type": etype, "label": a["label"], "zone_from_m": float(run[0]),
                    "zone_to_m": float(run[-1]), "band": a["band"], "message": a["message"],
                })

    n_events = len(truth)
    lessons = _lessons_text(well_id, w, caught, missed, false_alarms)

    return {
        "well_id": well_id, "well_name": w["well_name"], "field": w["field"], "actual_td_m": td,
        "well_status": w.get("well_status"),
        "settings": {"lookahead_m": lookahead_m, "radius_km": radius_km, "min_band": min_band, "step_m": step_m},
        "summary": {
            "real_events": n_events, "caught": len(caught), "missed": len(missed),
            "false_alarms": len(false_alarms),
            "recall": round(len(caught) / n_events, 3) if n_events else None,
            "median_lead_m": round(statistics.median([c["lead_m"] for c in caught]), 1) if caught else None,
        },
        "caught": caught, "missed": missed, "false_alarms": false_alarms,
        "lessons_learned": lessons,
        "caveat": (
            "This is a leave-one-well-out replay of the calibrated risk engine against this well's own "
            "recorded events, not a live prediction -- it shows what the engine would have alerted on "
            "using only the OTHER wells' data at the time. Dataset-wide backtesting (see "
            "app/calibrate.py) found only the LOW band beats a random-depth control on this ~54-event "
            "synthetic dataset; treat any MEDIUM/HIGH-band result here as indicative, not validated. "
            "Publishing this report adds its lessons-learned summary to the searchable knowledge base "
            "(app/search.py) -- it does NOT retrain or otherwise change the risk model."
        ),
    }
