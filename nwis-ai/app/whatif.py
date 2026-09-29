"""What-If Drilling Simulator (PS 26121 teammate feature #1).

Answers: "if I plan to drill this next stretch with mud weight X / set casing at depth Y, what does
the risk picture look like compared to today's baseline?" This does NOT run any physics -- there is no
hydraulics or geomechanics model in this codebase to drive. Instead it reweights the SAME offset-well
evidence app/risk.py already uses, restricted to the nearby wells whose own recorded mud reports /
casing jobs (app/data.py::Store.records_near) resemble the proposed parameters, and reruns the
identical frequency/threshold logic (app/risk.py::assess, via its `candidate_ids` filter) on that
narrower, more comparable set of wells. The honest framing is "here is what happened under similar
recorded conditions nearby", not a prediction from first principles -- and it inherits the base
engine's own calibration caveat (see app/calibrate.py): only the LOW band is backtested to beat a
random-depth control on this dataset.
"""
from __future__ import annotations

from .data import Store
from .risk import LOOKBACK_M, assess

# How close a nearby well's OWN recorded value has to be to the proposed one to count as "similar
# conditions". Mud weight in specific gravity (0.05 SG ~= 0.4 ppg, a normal mud-program increment).
# Casing depth in metres (100m ~= one casing string's worth of planning slack on this dataset's wells).
MUD_WEIGHT_TOL_SG = 0.05
CASING_DEPTH_TOL_M = 100.0


def _closest(records: list[dict], well_id: str, depth_key: str, around_m: float) -> dict | None:
    rows = [r for r in records if r["well_id"] == well_id]
    if not rows:
        return None
    return min(rows, key=lambda r: abs((r.get(depth_key) or around_m) - around_m))


def assess_whatif(
    store: Store,
    well_id: str,
    depth_md: float,
    mud_weight_sg: float | None = None,
    casing_setting_depth_m: float | None = None,
    bit_type: str | None = None,
    lookahead_m: float = 150.0,
    radius_km: float = 30.0,
    min_band: str = "LOW",
) -> dict:
    """Baseline vs. what-if risk comparison for the next `lookahead_m` metres below `depth_md`.
    `mud_weight_sg` / `casing_setting_depth_m` / `bit_type` are the engineer's PROPOSED plan for this
    stretch; any left as None are simply not used to filter evidence. Raises KeyError for an unknown
    well_id (same contract as assess())."""
    baseline = assess(store, depth_md=depth_md, well_id=well_id, lookahead_m=lookahead_m,
                      radius_km=radius_km, min_band=min_band)

    proposed = {
        "mud_weight_sg": mud_weight_sg,
        "casing_setting_depth_m": casing_setting_depth_m,
        "bit_type": bit_type,
    }
    params_specified = any(v is not None for v in proposed.values())

    if not params_specified:
        return {
            "well_id": well_id, "depth_md_m": depth_md, "lookahead_m": lookahead_m, "radius_km": radius_km,
            "proposed_params": proposed, "params_specified": False,
            "baseline": baseline, "whatif": baseline,
            "matched_wells": [], "unmatched_wells": [],
            "note": "No what-if parameters were changed, so this shows today's baseline risk twice.",
            "caveat": _CAVEAT,
        }

    window_m = lookahead_m + LOOKBACK_M
    # Mud weight and BHA/bit describe conditions AT the current bit depth; casing is normally set much
    # shallower than the current depth, so its evidence window is centred on the PROPOSED casing depth
    # instead -- centring everything on depth_md would silently miss every casing record on wells where
    # the proposed setting depth is far from where the bit is now (see test that caught this).
    records = store.records_near(well_id, depth_md, window_m=window_m, radius_km=radius_km)
    casing_anchor = casing_setting_depth_m if casing_setting_depth_m is not None else depth_md
    casing_records = (
        records if casing_anchor == depth_md
        else store.records_near(well_id, casing_anchor, window_m=CASING_DEPTH_TOL_M * 2, radius_km=radius_km)
    )
    offset_ids = {c["well_id"] for c in store.nearby(
        store.wells[well_id]["surface_lat"], store.wells[well_id]["surface_lon"], radius_km, exclude=(well_id,)
    )}

    matched: list[dict] = []
    unmatched: list[dict] = []
    for wid in sorted(offset_ids):
        mud = _closest(records["mud_reports"], wid, "depth_md_m", depth_md)
        casing = _closest(casing_records["casing_cement"], wid, "set_depth_m", casing_anchor)
        bhas = [r for r in records["bha_bit"] if r["well_id"] == wid]

        checks = []
        if mud_weight_sg is not None:
            checks.append(mud is not None and abs(mud["mud_weight_sg"] - mud_weight_sg) <= MUD_WEIGHT_TOL_SG)
        if casing_setting_depth_m is not None:
            checks.append(casing is not None and abs(casing["set_depth_m"] - casing_setting_depth_m) <= CASING_DEPTH_TOL_M)
        if bit_type is not None:
            checks.append(any(bit_type.strip().lower() in (b.get("bit_type") or "").lower() for b in bhas))

        has_data = (mud_weight_sg is None or mud is not None) and \
                   (casing_setting_depth_m is None or casing is not None) and \
                   (bit_type is None or bhas)
        row = {
            "well_id": wid, "well_name": store.wells[wid]["well_name"],
            "recorded_mud_weight_sg": mud["mud_weight_sg"] if mud else None,
            "recorded_casing_depth_m": casing["set_depth_m"] if casing else None,
            "recorded_bit_types": sorted({b["bit_type"] for b in bhas if b.get("bit_type")}) or None,
        }
        if not has_data:
            unmatched.append(row)
        elif checks and all(checks):
            matched.append(row)

    matched_ids = {r["well_id"] for r in matched}
    if matched_ids:
        whatif = assess(store, depth_md=depth_md, well_id=well_id, lookahead_m=lookahead_m,
                        radius_km=radius_km, min_band=min_band, candidate_ids=matched_ids)
        note = (f"{len(matched_ids)} of {len(offset_ids)} nearby wells recorded conditions within "
                f"tolerance of your proposed parameters ({len(unmatched)} had no recorded data to compare).")
    else:
        whatif = {**baseline, "alerts": [], "offsets_considered": 0}
        note = (f"No nearby well recorded conditions close to your proposed parameters "
                f"({len(unmatched)} of {len(offset_ids)} had no comparable data at all) -- "
                f"there isn't enough offset evidence to assess this specific plan, so no what-if "
                f"alerts are shown. Baseline risk (using all nearby wells) is still below for reference.")

    return {
        "well_id": well_id, "depth_md_m": depth_md, "lookahead_m": lookahead_m, "radius_km": radius_km,
        "proposed_params": proposed, "params_specified": True,
        "baseline": baseline, "whatif": whatif,
        "matched_wells": matched, "unmatched_wells": unmatched,
        "note": note, "caveat": _CAVEAT,
    }


_CAVEAT = (
    "This compares your proposed parameters against what nearby wells recorded under similar mud "
    "weight / casing depth / bit choices -- it is not a physics-based drilling simulation, and it can "
    "only be as good as the offset wells available nearby. Per app/calibrate.py's dataset-wide "
    "backtest, only LOW-band risk has been shown to beat a random-depth control on this ~54-event "
    "synthetic dataset; treat MEDIUM/HIGH-band differences here as indicative, not validated."
)
