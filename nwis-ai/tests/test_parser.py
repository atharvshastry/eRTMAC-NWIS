import shutil
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

from app.main import app  # noqa: E402
from app.ocr import OcrItem, items_to_text  # noqa: E402
from app.parser import guess_doc_type, parse_pdf  # noqa: E402
from make_sample_ddr import OUT, build_digital, degrade  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def samples():
    OUT.mkdir(exist_ok=True)
    build_digital(OUT / "ddr_digital.pdf")
    degrade(OUT / "ddr_digital.pdf", OUT / "ddr_scanned.pdf")


def test_digital_pdf_text_tables_and_type():
    r = parse_pdf(OUT / "ddr_digital.pdf")
    assert r.n_pages >= 1
    assert r.doc_type_guess == "DDR"
    assert not any(p.ocr_used for p in r.pages)
    text = "\n".join(p.text for p in r.pages)
    assert "2810 m" in text and "mud loss" in text.lower()
    assert sum(len(p.tables) for p in r.pages) >= 2  # header block + time distribution


def test_scanned_pdf_without_ocr_warns_instead_of_crashing():
    r = parse_pdf(OUT / "ddr_scanned.pdf", ocr="off")
    assert all(p.text == "" for p in r.pages)
    assert r.ocr_engine is None


@pytest.mark.skipif(shutil.which("tesseract") is None, reason="tesseract binary not installed")
def test_scanned_pdf_uses_ocr_and_recovers_key_facts(monkeypatch):
    monkeypatch.setenv("NWIS_OCR", "tesseract")
    r = parse_pdf(OUT / "ddr_scanned.pdf")
    assert any(p.ocr_used for p in r.pages)
    text = "\n".join(p.text for p in r.pages).lower()
    assert "drilling report" in text
    assert "2845" in text
    assert r.doc_type_guess == "DDR"


def test_items_to_text_orders_lines_and_marks_column_gaps():
    items = [
        OcrItem(200, 10, 260, 30, "2845", 0.9), OcrItem(10, 10, 80, 30, "Depth", 0.9),
        OcrItem(10, 60, 90, 80, "Mud", 0.9), OcrItem(95, 60, 130, 80, "loss", 0.9),
    ]
    assert items_to_text(items) == "Depth   2845\nMud loss"


def test_doc_type_needs_evidence():
    assert guess_doc_type("hello world")[0] == "UNKNOWN"
    assert guess_doc_type("WELL COMPLETION REPORT casing program formation tops")[0] == "WCR"


def test_api_parse_and_validation():
    c = TestClient(app)
    assert c.get("/health").status_code == 200
    with open(OUT / "ddr_digital.pdf", "rb") as f:
        res = c.post("/parse?ocr=off", files={"file": ("d.pdf", f, "application/pdf")})
    assert res.status_code == 200 and res.json()["doc_type_guess"] == "DDR"
    bad = c.post("/parse", files={"file": ("x.pdf", b"not a pdf", "application/pdf")})
    assert bad.status_code == 400
