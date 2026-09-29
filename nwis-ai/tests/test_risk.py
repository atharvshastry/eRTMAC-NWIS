import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.calibrate import calibrate_thresholds  # noqa: E402
from app.data import get_store, haversine_km  # noqa: E402
from app.backtest import evaluate_with_control, replay_timeline  # noqa: E402
from app.risk import AlertTracker, assess, set_thresholds  # noqa: E402


@pytest.fixture(scope="session")
def store():
    return get_store()


@pytest.fixture(scope="session", autouse=True)
def calibrated(store):
    set_thresholds(calibrate_thresholds(store, n_shuffles=5))  # fast, small n for tests


def test_dataset_loads():
    s = get_store()
    assert len(s.wells) == 19
    assert len(s.historical_ids()) == 18
    assert s.active_ids() == ["OIL-SYN-ACTIVE-01"]
    assert len(s.events) == 54
    assert len(s.mud_reports) == 95
    assert len(s.casing_cement) == 57
    assert len(s.bha_bit) == 39


def test_records_near_filters_by_depth_window_and_well(store):
    r = store.records_near("OIL-SYN-ACTIVE-01", depth_md_m=2200, window_m=200, radius_km=30)
    assert set(r) == {"mud_reports", "casing_cement", "bha_bit"}
    for row in r["mud_reports"]:
        assert 2000 <= row["depth_md_m"] <= 2400
    for row in r["casing_cement"]:
        assert 2000 <= row["set_depth_m"] <= 2400
    for row in r["bha_bit"]:
        assert 2000 <= row["start_depth_m"] <= 2400


def test_records_near_unknown_well_raises(store):
    with pytest.raises(KeyError):
        store.records_near("NOPE", 2000)


def test_haversine_known_distance():
    # Delhi to Mumbai, ~1150 km great-circle
    d = haversine_km(28.6139, 77.2090, 19.0760, 72.8777)
    assert 1100 < d < 1200


def test_formation_at_depth_uses_intervals(store):
    assert store.formation_at("OIL-SYN-001", 1000) == "Barail"
    assert store.formation_at("OIL-SYN-001", 3700) == "Nahorkatiya Sand"
    assert store.formation_at("UNKNOWN-WELL", 1000) is None


def test_nearby_respects_radius_and_exclude_param(store):
    w = store.wells["OIL-SYN-001"]
    # nearby() itself does not auto-exclude the query point (distance 0 is still "within radius");
    # assess() is what passes exclude=(well_id,) to keep a well from citing its own location.
    close = store.nearby(w["surface_lat"], w["surface_lon"], radius_km=1)
    assert any(c["well_id"] == "OIL-SYN-001" for c in close)
    excluded = store.nearby(w["surface_lat"], w["surface_lon"], radius_km=1, exclude=("OIL-SYN-001",))
    assert all(c["well_id"] != "OIL-SYN-001" for c in excluded)
    far = store.nearby(w["surface_lat"], w["surface_lon"], radius_km=200)
    assert len(far) >= len(close)


def test_assess_excludes_queried_well_own_events(store):
    # OIL-SYN-001 has its own MUD_LOSS event at 1637m; assessing AT that well must not cite itself.
    res = assess(store, depth_md=1630, well_id="OIL-SYN-001", lookahead_m=150, radius_km=30, min_band="LOW")
    for a in res["alerts"]:
        assert all(ev["well_id"] != "OIL-SYN-001" for ev in a["evidence"])


def test_assess_unknown_well_raises(store):
    with pytest.raises(KeyError):
        assess(store, depth_md=2000, well_id="NOPE")


def test_assess_requires_location(store):
    with pytest.raises(ValueError):
        assess(store, depth_md=2000)


def test_alert_message_cites_evidence_count(store):
    res = assess(store, depth_md=2200, well_id="OIL-SYN-ACTIVE-01", min_band="LOW")
    for a in res["alerts"]:
        assert a["wells_with_event"] == len(a["evidence"])
        assert a["wells_with_event"] <= a["wells_considered"]
        assert str(a["wells_with_event"]) in a["message"]


def test_alert_tracker_dedupes_and_reescalates():
    tracker = AlertTracker(zone_shift_m=50)
    base = {"event_type": "MUD_LOSS", "band": "LOW", "zone_from_m": 2000, "zone_to_m": 2100}
    r1 = {"alerts": [base]}
    r2 = {"alerts": [base]}  # identical: no new alert
    r3 = {"alerts": [{**base, "band": "MEDIUM"}]}  # escalation: new alert
    r4 = {"alerts": [{**base, "band": "MEDIUM", "zone_from_m": 2300}]}  # zone jumped: new alert
    assert len(tracker.update(r1)) == 1
    assert len(tracker.update(r2)) == 0
    assert len(tracker.update(r3)) == 1
    assert len(tracker.update(r4)) == 1


def test_replay_timeline_runs_for_a_real_well(store):
    events = replay_timeline(store, "OIL-SYN-001", min_band="LOW")
    assert isinstance(events, list)  # may be empty depending on band; must not crash
    for e in events:
        assert e["well_id" if "well_id" in e else "event_type"]


def test_calibration_low_band_beats_random_control(store):
    """Locks in the honest finding from app/calibrate.py: only the loosest tier clears a shuffled-depth
    control on this ~54-event dataset. If this regresses, the calibration or scoring changed."""
    r = evaluate_with_control(store, n_shuffles=8, min_band="LOW", step_m=25, lookahead_m=150, radius_km=30)
    assert r["real"]["recall"] > r["control_mean"]["recall"]


def test_calibration_thresholds_increase_with_band(store):
    thr = calibrate_thresholds(store, n_shuffles=5)
    for etype, bands in thr.items():
        assert bands["LOW"][0] <= bands["MEDIUM"][0] <= bands["HIGH"][0]
