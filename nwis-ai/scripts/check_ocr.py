"""Smoke-test which OCR engine works on THIS machine:  python scripts/check_ocr.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from PIL import Image, ImageDraw  # noqa: E402

from app.ocr import get_engine, items_to_text  # noqa: E402

img = Image.new("RGB", (900, 200), "white")
d = ImageDraw.Draw(img)
d.text((30, 40), "DAILY DRILLING REPORT", fill="black")
d.text((30, 100), "Depth 2845 m    Mud weight 1.32 SG", fill="black")

engine, reason = get_engine()
if engine is None:
    print("NO OCR ENGINE:", reason)
    sys.exit(1)
print("engine:", engine.name)
print(items_to_text(engine.recognize(img)))
