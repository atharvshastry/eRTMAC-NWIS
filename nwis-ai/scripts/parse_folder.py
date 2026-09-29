"""Batch-parse PDFs to JSON.  Usage:
    python scripts/parse_folder.py <pdf-or-folder> [--out out_dir] [--ocr auto|force|off]
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.parser import parse_pdf  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--out", default="parsed")
    ap.add_argument("--ocr", default="auto", choices=["auto", "force", "off"])
    args = ap.parse_args()

    p = Path(args.path)
    files = sorted(p.rglob("*.pdf")) if p.is_dir() else [p]
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    for f in files:
        try:
            res = parse_pdf(f, ocr=args.ocr)
        except Exception as e:  # noqa: BLE001
            print(f"FAIL  {f.name}: {e}")
            continue
        (out / f"{f.stem}.json").write_text(res.model_dump_json(indent=2), encoding="utf-8")
        n_ocr = sum(p.ocr_used for p in res.pages)
        n_tab = sum(len(p.tables) for p in res.pages)
        warns = sum(len(p.warnings) for p in res.pages) + len(res.warnings)
        print(f"OK    {f.name}: {res.n_pages}p type={res.doc_type_guess} ocr_pages={n_ocr} tables={n_tab} warnings={warns}")


if __name__ == "__main__":
    main()
