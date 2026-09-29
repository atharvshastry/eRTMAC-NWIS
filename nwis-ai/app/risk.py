"""Explainable offset-well risk engine (the headline NWIS feature).

For an active well at measured depth D it looks at the next `lookahead_m` metres and asks, for each
incident type: of the nearby historical wells that were drilled that deep, how many hit this incident
in that depth window? Closer wells (and wells in the same field) count more. Every alert carries the
offset-well events behind it, so an engineer can see WHY, not just a score.

Tunable constants are at the top; `app/backtest.py` measures how they perform on held-out wells.
"""
from __future__ import annotations

import math
from collections import Counter, defaultdict
from typing import Iterable, Optional

from .data import Store

LOOKBACK_M = 20            # events slightly above the bit still count (we may be inside the zone)
WEIGHT_SCALE_KM = 15.0     # weight = exp(-distance / scale)
SAME_FIELD_BONUS = 1.25
BAND_ORDER = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}

# Fallback thresholds used only until per-type calibration is loaded. On this dataset a single
# fixed cutoff for all 6 event types is NOT well calibrated -- see app/calibrate.py and README.
DEFAULT_BANDS = {"HIGH": (0.35, 2), "MEDIUM": (0.20, 2), "LOW": (0.0, 1)}
_THRESHOLDS: dict[str, dict[str, tuple[float, int]]] = {}  # event_type -> {band: (min_freq, min_wells)}


def set_thresholds(thresholds: dict[str, dict[str, tuple[float, int]]]) -> None:
    """Install per-event-type band thresholds, as produced by app.calibrate.calibrate_thresholds."""
    global _THRESHOLDS
    _THRESHOLDS = thresholds


def _bands_for(event_type: str) -> dict[str, tuple[float, int]]:
    return _THRESHOLDS.get(event_type, DEFAULT_BANDS)

LABELS = {
    "MUD_LOSS": "Mud loss", "STUCK_PIPE": "Stuck pipe", "KICK": "Kick / influx",
    "TORQUE_SPIKE": "Torque spike", "CEMENTING_ISSUE": "Cementing issue", "NPT": "Non-productive time",
}


def _band(event_type: str, freq: float, n_wells: int) -> Optional[str]:
    bands = _bands_for(event_type)
    for name in ("HIGH", "MEDIUM", "LOW"):
        min_f, min_n = bands[name]
        if freq >= min_f and n_wells >= min_n:
            return name
    return None


def assess(
    store: Store,
    depth_md: float,
    well_id: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    field: str | None = None,
    lookahead_m: float = 150.0,
    radius_km: float = 30.0,
    exclude: Iterable[str] = (),
    events: list[dict] | None = None,
    min_band: str = "LOW",
    candidate_ids: Optional[set[str]] = None,
) -> dict:
    """Risk assessment for the next `lookahead_m` metres below `depth_md`.

    Pass `well_id` (an active or historical well in the dataset) or a raw `lat`/`lon`. The well's own
    events are always excluded, so replaying a historical well never leaks its own future.
    `events` lets tests/backtests inject a different event list. `candidate_ids`, when given, further
    restricts the offset wells considered to this set (on top of the usual radius search) -- used by
    app/whatif.py to reweight evidence toward wells that recorded similar drilling parameters, without
    duplicating this function's frequency/threshold logic.
    """
    excl = set(exclude)
    if well_id:
        w = store.wells.get(well_id)
        if w is None:
            raise KeyError(f"Unknown well_id {well_id}")
        lat, lon, field = w["surface_lat"], w["surface_lon"], w["field"]
        excl.add(well_id)
    if lat is None or lon is None:
        raise ValueError("Provide well_id or lat/lon")

    events = store.events if events is None else events
    cands = store.nearby(float(lat), float(lon), float(radius_km), tuple(sorted(excl)))
    if candidate_ids is not None:
        cands = tuple(c for c in cands if c["well_id"] in candidate_ids)

    weight: dict[str, float] = {}
    dist: dict[str, float] = {}
    for c in cands:
        wt = math.exp(-c["distance_km"] / WEIGHT_SCALE_KM)
        if field and c["field"] == field:
            wt *= SAME_FIELD_BONUS
        weight[c["well_id"]] = wt
        dist[c["well_id"]] = c["distance_km"]

    # Only wells drilled at least this deep can say anything about the window ahead.
    considered = [c["well_id"] for c in cands if (c["actual_td_m"] or 0) >= depth_md]
    denom = sum(weight[w] for w in considered)

    lo, hi = depth_md - LOOKBACK_M, depth_md + lookahead_m
    by_type: dict[str, list[dict]] = defaultdict(list)
    for e in events:
        if e["well_id"] in weight and lo <= e["depth_md_m"] <= hi:
            by_type[e["event_type"]].append(e)

    alerts = []
    for etype, evs in by_type.items():
        hit_wells = {e["well_id"] for e in evs}
        freq = (sum(weight[w] for w in hit_wells) / denom) if denom else 0.0
        band = _band(etype, min(freq, 1.0), len(hit_wells))
        if band is None or BAND_ORDER[band] < BAND_ORDER[min_band]:
            continue

        evs = sorted(evs, key=lambda e: dist[e["well_id"]])
        depths = [e["depth_md_m"] for e in evs]
        zone_from, zone_to = min(depths), max(depths)
        npts = [e["npt_hours"] for e in evs if e["npt_hours"] is not None]
        mit = [m for m, _ in Counter(e["mitigation"] for e in evs if e.get("mitigation")).most_common(3)]
        label = LABELS.get(etype, etype)
        to_zone = max(zone_from - depth_md, 0)
        where = "you are inside this zone" if depth_md >= zone_from else f"zone starts {to_zone:.0f} m ahead"
        msg = (
            f"{label} risk: {len(hit_wells)} of {len(considered)} nearby wells (within {radius_km:.0f} km) "
            f"had {label.lower()} between {zone_from:.0f}-{zone_to:.0f} m MD ({where})."
        )
        if npts:
            msg += f" Typical NPT {sum(npts) / len(npts):.1f} h."
        if mit:
            msg += f" Suggested: {mit[0]}."

        alerts.append({
            "event_type": etype,
            "label": label,
            "band": band,
            "score": round(min(freq, 1.0), 3),
            "wells_with_event": len(hit_wells),
            "wells_considered": len(considered),
            "zone_from_m": zone_from,
            "zone_to_m": zone_to,
            "distance_to_zone_m": round(to_zone, 1),
            "expected_npt_h": round(sum(npts) / len(npts), 1) if npts else None,
            "recommended_actions": mit,
            "message": msg,
            "evidence": [{
                "event_id": e["event_id"], "well_id": e["well_id"],
                "well_name": store.wells[e["well_id"]]["well_name"],
                "distance_km": dist[e["well_id"]], "depth_md_m": e["depth_md_m"],
                "depth_delta_m": round(e["depth_md_m"] - depth_md, 1),
                "formation": e["formation"], "severity": e["severity"], "npt_hours": e["npt_hours"],
                "description": e["description"], "mitigation": e["mitigation"],
                "record_status": e["record_status"],
            } for e in evs],
        })

    alerts.sort(key=lambda a: (-BAND_ORDER[a["band"]], -a["score"], a["distance_to_zone_m"]))
    return {
        "well_id": well_id,
        "depth_md_m": depth_md,
        "lookahead_m": lookahead_m,
        "radius_km": radius_km,
        "formation": store.formation_at(well_id, depth_md) if well_id else None,
        "offsets_in_radius": len(cands),
        "offsets_considered": len(considered),
        "alerts": alerts,
    }


class AlertTracker:
    """Turns a stream of assessments into discrete alert *events* (so the UI isn't spammed with the same
    alert at every tick). Emits when a type appears, its band escalates, or it points at a new zone."""

    def __init__(self, zone_shift_m: float = 100.0):
        self.zone_shift_m = zone_shift_m
        self._state: dict[str, dict] = {}

    def update(self, result: dict) -> list[dict]:
        new = []
        active = set()
        for a in result["alerts"]:
            t = a["event_type"]
            active.add(t)
            prev = self._state.get(t)
            escalated = prev and BAND_ORDER[a["band"]] > BAND_ORDER[prev["band"]]
            new_zone = prev and abs(a["zone_from_m"] - prev["zone_from_m"]) > self.zone_shift_m
            if prev is None or escalated or new_zone:
                new.append(a)
            self._state[t] = {"band": a["band"], "zone_from_m": a["zone_from_m"]}
        for t in list(self._state):
            if t not in active:
                del self._state[t]  # alert cleared: a later re-appearance is a fresh alert
        return new
