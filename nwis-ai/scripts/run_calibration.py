"""Calibrate per-event-type risk thresholds and print a backtest report.
    python scripts/run_calibration.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.backtest import evaluate_with_control  # noqa: E402
from app.calibrate import calibrate_thresholds, summarize  # noqa: E402
from app.data import get_store  # noqa: E402
from app.risk import set_thresholds  # noqa: E402

if __name__ == "__main__":
    store = get_store()
    thr = calibrate_thresholds(store, n_shuffles=20)
    print("Per-event-type thresholds (score needed to clear each band):\n")
    print(summarize(thr))
    set_thresholds(thr)

    print("\nBacktest vs shuffled-depth control (leave-one-well-out):\n")
    for band in ("LOW", "MEDIUM", "HIGH"):
        r = evaluate_with_control(store, n_shuffles=15, min_band=band)
        beats = r["real"]["recall"] > r["control_mean"]["recall"]
        print(f"{band:<7} real={r['real']}  control_mean={r['control_mean']}  "
              f"{'[beats control]' if beats else '[does NOT clearly beat control]'}")
