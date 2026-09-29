"""Loads the NWIS dataset (CSV) into plain-Python structures for the risk engine.

Swap point: when the Postgres/PostGIS backend is ready, replace `Store.__init__` with DB queries that
build the same `wells`, `events`, `formations` and `rt` structures; nothing else needs to change.
"""
from __future__ import annotations

import math
import os
from functools import lru_cache
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("NWIS_DATA_DIR", ROOT / "data"))


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi, dlmb = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _none_if_nan(v):
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else v


class Store:
    def __init__(self, data_dir: Path | str = DATA_DIR):
        d = Path(data_dir)
        rd = lambda name: pd.read_csv(d / f"{name}.csv")  # noqa: E731

        wells = rd("wells")
        self.wells: dict[str, dict] = {
            r["well_id"]: {k: _none_if_nan(v) for k, v in r.items()} for r in wells.to_dict("records")
        }

        fm = rd("formation_log")
        self._intervals: dict[str, list[tuple[float, float, str]]] = {}
        for r in fm.to_dict("records"):
            self._intervals.setdefault(r["well_id"], []).append((r["top_md_m"], r["base_md_m"], r["formation"]))
        for v in self._intervals.values():
            v.sort()
        self.formation_log = fm

        ev = rd("operational_events")
        self.events: list[dict] = []
        for r in ev.to_dict("records"):
            e = {k: _none_if_nan(v) for k, v in r.items()}
            e["depth_md_m"] = float(e["depth_md_m"])
            e["npt_hours"] = None if e["npt_hours"] is None else float(e["npt_hours"])
            # The dataset's own 'formation' label often disagrees with formation_log at that depth,
            # so risk logic uses the depth-derived formation and keeps the logged one for reference.
            e["formation_logged"] = e.get("formation")
            e["formation"] = self.formation_at(e["well_id"], e["depth_md_m"])
            self.events.append(e)

        self.rt = rd("ertmac_realtime")
        self.relations = rd("offset_relations")
        self.trajectory = rd("trajectory")

        # Mud/casing/BHA records -- loaded but, until records_near() below, never surfaced by any
        # endpoint. PS 26121 explicitly asks to correlate "casing programs, cementing practices" and
        # mud behaviour across offset wells (requirement iii), not just the incident log, so these
        # need to be queryable the same way operational_events is.
        self.mud_reports: list[dict] = [
            {k: _none_if_nan(v) for k, v in r.items()} for r in rd("mud_report").to_dict("records")
        ]
        self.casing_cement: list[dict] = [
            {k: _none_if_nan(v) for k, v in r.items()} for r in rd("casing_cement").to_dict("records")
        ]
        self.bha_bit: list[dict] = [
            {k: _none_if_nan(v) for k, v in r.items()} for r in rd("bha_bit").to_dict("records")
        ]

    # ---- wells -------------------------------------------------------------------------------
    def historical_ids(self) -> list[str]:
        return [w for w, r in self.wells.items() if r.get("data_status") == "HISTORICAL"]

    def active_ids(self) -> list[str]:
        return [w for w, r in self.wells.items() if r.get("data_status") == "ACTIVE"]

    def formation_at(self, well_id: str, md: float) -> str | None:
        """Formation at a measured depth. Intervals in the data overlap in places and leave small gaps
        in others: overlaps resolve to the deeper formation, gaps to the nearest interval."""
        ivs = self._intervals.get(well_id)
        if not ivs:
            return None
        inside = [iv for iv in ivs if iv[0] <= md <= iv[1]]
        if inside:
            return max(inside, key=lambda iv: iv[0])[2]
        nearest = min(ivs, key=lambda iv: min(abs(md - iv[0]), abs(md - iv[1])))
        if min(abs(md - nearest[0]), abs(md - nearest[1])) <= 150:
            return nearest[2]
        return None

    @lru_cache(maxsize=4096)
    def nearby(self, lat: float, lon: float, radius_km: float, exclude: tuple = ()) -> tuple:
        """Historical wells within radius_km of a surface point, nearest first."""
        out = []
        for wid in self.historical_ids():
            if wid in exclude:
                continue
            w = self.wells[wid]
            dist = haversine_km(lat, lon, w["surface_lat"], w["surface_lon"])
            if dist <= radius_km:
                out.append({
                    "well_id": wid, "well_name": w["well_name"], "field": w["field"],
                    "distance_km": round(dist, 3), "actual_td_m": w["actual_td_m"],
                    "surface_lat": w["surface_lat"], "surface_lon": w["surface_lon"],
                })
        return tuple(sorted(out, key=lambda x: x["distance_km"]))

    def telemetry(self, well_id: str) -> pd.DataFrame:
        return self.rt[self.rt.well_id == well_id].sort_values("timestamp").reset_index(drop=True)

    def records_near(
        self, well_id: str, depth_md_m: float, window_m: float = 200.0, radius_km: float = 30.0,
    ) -> dict[str, list[dict]]:
        """Mud/casing/BHA records within `window_m` of `depth_md_m`, across the queried well AND its
        nearby offset wells (reuses `nearby()`) -- this is the "correlate ... casing programs,
        cementing practices" half of PS 26121's requirement iii, which the incident-only risk engine
        in app/risk.py doesn't cover on its own."""
        w = self.wells.get(well_id)
        if w is None:
            raise KeyError(f"Unknown well_id {well_id}")
        candidates = {c["well_id"] for c in self.nearby(w["surface_lat"], w["surface_lon"], radius_km)}
        candidates.add(well_id)
        lo, hi = depth_md_m - window_m, depth_md_m + window_m

        def _filter(rows: list[dict], depth_key: str) -> list[dict]:
            return [
                r for r in rows
                if r["well_id"] in candidates and r.get(depth_key) is not None and lo <= r[depth_key] <= hi
            ]

        return {
            "mud_reports": _filter(self.mud_reports, "depth_md_m"),
            "casing_cement": _filter(self.casing_cement, "set_depth_m"),
            "bha_bit": _filter(self.bha_bit, "start_depth_m"),
        }


@lru_cache(maxsize=1)
def get_store() -> Store:
    return Store()
