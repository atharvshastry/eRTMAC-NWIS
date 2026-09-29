"""OCR adapters. PaddleOCR is preferred; Tesseract is a fallback. Both are imported lazily so the
service still starts (and parses digital PDFs) when neither is installed.

Select with env var NWIS_OCR = paddle | tesseract | none  (default: try paddle, then tesseract).
"""
from __future__ import annotations

import os
import shutil
from dataclasses import dataclass
from typing import Optional


@dataclass
class OcrItem:
    x0: float
    y0: float
    x1: float
    y1: float
    text: str
    score: float  # 0-1


class OcrEngine:
    name = "base"

    def recognize(self, image) -> list[OcrItem]:  # image: PIL.Image
        raise NotImplementedError


class PaddleEngine(OcrEngine):
    name = "paddleocr"

    def __init__(self, lang: str = "en"):
        # Works around a known PaddlePaddle 3.3.x regression: the oneDNN/MKLDNN CPU backend's new
        # PIR executor can't convert certain array attributes ("NotImplementedError:
        # ConvertPirAttribute2RuntimeAttribute not support [pir::ArrayAttribute<pir::DoubleAttribute>]"),
        # which crashes OCR on real (non-trivial) scanned pages. Fixed upstream, not yet released to
        # PyPI -- see PaddlePaddle/Paddle#77340. Must be set before paddle's C++ backend is first
        # touched, i.e. before this lazy `import paddleocr`.
        os.environ.setdefault("FLAGS_use_mkldnn", "0")
        from paddleocr import PaddleOCR  # lazy import on purpose

        # Constructor arguments differ between PaddleOCR 2.x and 3.x, so try newest first.
        # enable_mkldnn=False belt-and-braces disables the same broken path at the PaddleOCR level.
        attempts = (
            dict(lang=lang, use_doc_orientation_classify=False, use_doc_unwarping=False,
                 use_textline_orientation=False, enable_mkldnn=False),  # 3.x
            dict(lang=lang, use_angle_cls=True, show_log=False, enable_mkldnn=False),  # 2.x
            dict(lang=lang),
        )
        last_err: Exception | None = None
        self._ocr = None
        for kwargs in attempts:
            try:
                self._ocr = PaddleOCR(**kwargs)
                break
            except Exception as e:  # noqa: BLE001
                last_err = e
        if self._ocr is None:
            raise RuntimeError(f"Could not initialise PaddleOCR: {last_err}")

    def recognize(self, image) -> list[OcrItem]:
        import numpy as np

        arr = np.array(image.convert("RGB"))
        items: list[OcrItem] = []

        if hasattr(self._ocr, "predict"):  # PaddleOCR 3.x
            for res in self._ocr.predict(arr):
                data = res if isinstance(res, dict) else getattr(res, "res", {}) or {}
                texts = data.get("rec_texts") or []
                scores = data.get("rec_scores") or []
                boxes = data.get("rec_boxes")
                polys = data.get("rec_polys") if data.get("rec_polys") is not None else data.get("dt_polys")
                for i, text in enumerate(texts):
                    if boxes is not None and len(boxes) > i:
                        x0, y0, x1, y1 = (float(v) for v in boxes[i][:4])
                    elif polys is not None and len(polys) > i:
                        xs = [float(p[0]) for p in polys[i]]
                        ys = [float(p[1]) for p in polys[i]]
                        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
                    else:
                        continue
                    score = float(scores[i]) if i < len(scores) else 0.0
                    items.append(OcrItem(x0, y0, x1, y1, str(text), score))
        else:  # PaddleOCR 2.x
            result = self._ocr.ocr(arr, cls=True)
            for line in (result[0] or []) if result else []:
                poly, (text, score) = line
                xs = [float(p[0]) for p in poly]
                ys = [float(p[1]) for p in poly]
                items.append(OcrItem(min(xs), min(ys), max(xs), max(ys), str(text), float(score)))
        return items


_WINDOWS_DEFAULT_PATHS = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
)


def _find_tesseract_binary() -> Optional[str]:
    """PATH first; then TESSERACT_CMD (set this if you don't want to touch system PATH); then the
    Windows installer's default locations, since the UB-Mannheim installer doesn't always add itself
    to PATH and a freshly-opened PowerShell won't see a PATH change made after it started anyway."""
    found = shutil.which("tesseract")
    if found:
        return found
    env_path = os.getenv("TESSERACT_CMD")
    if env_path and os.path.isfile(env_path):
        return env_path
    for p in _WINDOWS_DEFAULT_PATHS:
        if os.path.isfile(p):
            return p
    return None


class TesseractEngine(OcrEngine):
    name = "tesseract"

    def __init__(self, lang: str = "eng"):
        import pytesseract

        binary = _find_tesseract_binary()
        if binary is None:
            raise RuntimeError(
                "Tesseract binary not found (checked PATH, $TESSERACT_CMD, and the default Windows "
                "install locations). If you just installed it, close and reopen your terminal (PATH "
                "changes don't apply to an already-open shell) -- or set TESSERACT_CMD to the full "
                "path of tesseract.exe."
            )
        pytesseract.pytesseract.tesseract_cmd = binary
        self._pt = pytesseract
        self._lang = lang

    def recognize(self, image) -> list[OcrItem]:
        d = self._pt.image_to_data(image, lang=self._lang, output_type=self._pt.Output.DICT)
        items = []
        for i, text in enumerate(d["text"]):
            text = (text or "").strip()
            try:
                conf = float(d["conf"][i])
            except (TypeError, ValueError):
                conf = -1.0
            if not text or conf < 0:
                continue
            x, y, w, h = d["left"][i], d["top"][i], d["width"][i], d["height"][i]
            items.append(OcrItem(x, y, x + w, y + h, text, conf / 100.0))
        return items


def items_to_text(items: list[OcrItem]) -> str:
    """Rebuild reading-order lines from positioned OCR fragments. Wide gaps become 3 spaces so
    columns like 'Depth    2845 m' stay separable for regex extraction."""
    if not items:
        return ""
    items = sorted(items, key=lambda i: ((i.y0 + i.y1) / 2, i.x0))
    heights = sorted(max(i.y1 - i.y0, 1.0) for i in items)
    med = heights[len(heights) // 2]

    lines: list[list[OcrItem]] = []
    cur = [items[0]]
    cur_y = (items[0].y0 + items[0].y1) / 2
    for it in items[1:]:
        cy = (it.y0 + it.y1) / 2
        if abs(cy - cur_y) > 0.6 * med:
            lines.append(cur)
            cur, cur_y = [it], cy
        else:
            cur.append(it)
            cur_y = (cur_y * (len(cur) - 1) + cy) / len(cur)
    lines.append(cur)

    out = []
    for line in lines:
        line = sorted(line, key=lambda i: i.x0)
        parts = [line[0].text]
        for prev, nxt in zip(line, line[1:]):
            gap = nxt.x0 - prev.x1
            parts.append(("   " if gap > med * 1.5 else " ") + nxt.text)
        out.append("".join(parts))
    return "\n".join(out)


_cache: dict[str, Optional[OcrEngine]] = {}
_reasons: dict[str, str] = {}


def get_engine() -> tuple[Optional[OcrEngine], str]:
    """Return (engine or None, human-readable reason if None)."""
    pref = os.getenv("NWIS_OCR", "").strip().lower()
    if pref == "none":
        return None, "OCR disabled via NWIS_OCR=none"
    order = [pref] if pref in ("paddle", "tesseract") else ["paddle", "tesseract"]
    for name in order:
        if name in _cache:
            if _cache[name]:
                return _cache[name], ""
            continue
        try:
            eng = PaddleEngine() if name == "paddle" else TesseractEngine()
            _cache[name] = eng
            return eng, ""
        except Exception as e:  # noqa: BLE001
            _cache[name] = None
            _reasons[name] = f"{name}: {e}"
    return None, "No OCR engine available (" + "; ".join(_reasons.values()) + ")"
