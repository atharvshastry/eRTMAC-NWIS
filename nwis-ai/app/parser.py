"""PDF -> per-page text + tables. Digital pages use PyMuPDF/pdfplumber; pages with no usable text
layer are rasterised and sent to OCR."""
from __future__ import annotations

import io
import re
from pathlib import Path
from typing import Literal, Union

import pdfplumber
from PIL import Image

try:
    import pymupdf as fitz  # PyMuPDF >= 1.24.3
except ImportError:  # pragma: no cover
    import fitz  # type: ignore

from .ocr import get_engine, items_to_text
from .schemas import ParsedPage, ParseResponse

OcrMode = Literal["auto", "force", "off"]

# (keyword, weight). A title match is a strong signal; other keywords add up.
_DDR_KEYS = [
    ("daily drilling report", 3), ("ddr", 1), ("24 hr", 1), ("24-hour", 1), ("operations summary", 1),
    ("bit no", 1), ("mud weight", 1), ("rop", 1), ("hrs", 1), ("rig no", 1),
]
_WCR_KEYS = [
    ("well completion report", 3), ("wcr", 1), ("completion summary", 1), ("casing program", 1),
    ("casing record", 1), ("formation tops", 1), ("lessons learned", 1), ("final well", 1),
    ("completion date", 1), ("perforation", 1),
]


def _clean_cell(c):
    if c is None:
        return None
    c = re.sub(r"\s+", " ", str(c)).strip()
    return c or None


def _clean_tables(raw) -> list:
    tables = []
    for t in raw or []:
        rows = [[_clean_cell(c) for c in row] for row in t]
        rows = [r for r in rows if any(c for c in r)]
        if len(rows) >= 2:  # a real table has at least a header and one row
            tables.append(rows)
    return tables


def _clean_text(t: str) -> str:
    t = "\n".join(line.rstrip() for line in t.splitlines())
    return re.sub(r"\n{3,}", "\n\n", t).strip()


def guess_doc_type(text: str) -> tuple[str, dict[str, int]]:
    low = text.lower()
    scores = {
        "DDR": sum(w for k, w in _DDR_KEYS if k in low),
        "WCR": sum(w for k, w in _WCR_KEYS if k in low),
    }
    best = max(scores, key=scores.get)
    if scores[best] < 3 or scores["DDR"] == scores["WCR"]:
        return "UNKNOWN", scores
    return best, scores


def parse_pdf(
    source: Union[bytes, str, Path],
    filename: str | None = None,
    ocr: OcrMode = "auto",
    min_chars: int = 40,
    dpi: int = 200,
    tables: bool = True,
) -> ParseResponse:
    if isinstance(source, (str, Path)):
        filename = filename or Path(source).name
        data = Path(source).read_bytes()
    else:
        data = source
        filename = filename or "upload.pdf"

    doc = fitz.open(stream=data, filetype="pdf")
    plumber = pdfplumber.open(io.BytesIO(data)) if tables else None

    engine, engine_reason = (None, "")
    engine_loaded = False
    global_warnings: list[str] = []
    pages: list[ParsedPage] = []

    for i, page in enumerate(doc):
        warnings: list[str] = []
        text = page.get_text("text", sort=True) or ""
        needs_ocr = ocr == "force" or (ocr == "auto" and len(text.strip()) < min_chars)

        page_tables: list = []
        ocr_used = False
        conf = None

        if needs_ocr:
            if not engine_loaded:
                engine, engine_reason = get_engine()
                engine_loaded = True
            if engine is None:
                warnings.append(f"Page needs OCR but no engine is available. {engine_reason}")
                text = _clean_text(text)  # keep whatever little text exists
            else:
                pix = page.get_pixmap(dpi=dpi)
                img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                items = engine.recognize(img)
                text = _clean_text(items_to_text(items))
                ocr_used = True
                conf = round(sum(it.score for it in items) / len(items), 3) if items else 0.0
                if not items:
                    warnings.append("OCR ran but found no text (blank page?)")
                elif conf < 0.6:
                    warnings.append(f"Low OCR confidence ({conf}); consider human review")
        else:
            text = _clean_text(text)
            if plumber is not None:
                try:
                    page_tables = _clean_tables(plumber.pages[i].extract_tables())
                except Exception as e:  # noqa: BLE001 (a bad table must not kill the whole file)
                    warnings.append(f"Table extraction failed: {e}")

        pages.append(ParsedPage(
            page=i + 1, text=text, tables=page_tables, ocr_used=ocr_used, confidence=conf, warnings=warnings,
        ))

    n_pages = len(pages)
    doc.close()
    if plumber is not None:
        plumber.close()

    # Classify from the first few pages (title pages carry the signal; keeps it fast on long WCRs).
    head_text = "\n".join(p.text for p in pages[:3])
    doc_type, scores = guess_doc_type(head_text)

    if n_pages == 0:
        global_warnings.append("PDF has no pages")
    if any(p.ocr_used for p in pages) and engine is not None:
        ocr_engine = engine.name
    else:
        ocr_engine = None

    return ParseResponse(
        filename=filename, n_pages=n_pages, doc_type_guess=doc_type, doc_type_scores=scores,
        ocr_engine=ocr_engine, pages=pages, warnings=global_warnings,
    )
