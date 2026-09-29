"""Generate a FAKE Daily Drilling Report (digital + degraded 'scanned' copy) to test the pipeline
before real data arrives. All values are invented (well 'DEMO-01', not real OIL data).

    python scripts/make_sample_ddr.py        -> samples/ddr_digital.pdf, samples/ddr_scanned.pdf
"""
import io
import random
from pathlib import Path

import pymupdf as fitz
from PIL import Image, ImageFilter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

OUT = Path(__file__).resolve().parent.parent / "samples"
OUT.mkdir(exist_ok=True)
styles = getSampleStyleSheet()


def build_digital(path: Path):
    doc = SimpleDocTemplate(str(path), pagesize=A4)
    s = [Paragraph("DAILY DRILLING REPORT", styles["Title"])]
    hdr = [
        ["Well Name", "DEMO-01", "Report Date", "12-03-2019"],
        ["Rig No", "RIG-7", "Report No", "48"],
        ["Depth (m)", "2845", "Mud Weight (SG)", "1.32"],
        ["Bit No", "6", "24 Hr Progress (m)", "112"],
    ]
    t = Table(hdr, colWidths=[90, 120, 110, 120])
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.6, colors.black)]))
    s += [t, Spacer(1, 14), Paragraph("Operations Summary", styles["Heading2"])]
    s.append(Paragraph(
        "Drilled 8.5 in hole from 2733 m to 2845 m. At 2810 m observed partial mud loss of 18 bbl/hr. "
        "Pumped LCM pill and reduced pump rate; losses cured after 4 hrs. Total NPT 4.0 hrs. "
        "Torque increased from 9 to 14 kNm at 2830 m, worked pipe and circulated bottoms up. "
        "Lesson: expect losses in the sandy interval near 2800 m, keep LCM ready.", styles["Normal"]))
    s += [Spacer(1, 14), Paragraph("Time Distribution", styles["Heading2"])]
    rows = [["From", "To", "Hrs", "Activity"],
            ["00:00", "08:00", "8.0", "Drilling 8.5 in hole"],
            ["08:00", "12:00", "4.0", "Mud loss - LCM pill, circulation"],
            ["12:00", "24:00", "12.0", "Drilling / connections"]]
    t2 = Table(rows, colWidths=[60, 60, 50, 250])
    t2.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.6, colors.black),
                            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey)]))
    s.append(t2)
    doc.build(s)


def degrade(pdf_in: Path, pdf_out: Path):
    """Rasterise to image-only pages with blur, noise and slight rotation (like a bad scan)."""
    random.seed(1)
    imgs = []
    for page in fitz.open(pdf_in):
        pix = page.get_pixmap(dpi=200)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        img = img.rotate(random.uniform(-0.8, 0.8), expand=True, fillcolor="white")
        img = img.filter(ImageFilter.GaussianBlur(0.7))
        noise = Image.effect_noise(img.size, 14).convert("RGB")
        imgs.append(Image.blend(img, noise, 0.05))
    imgs[0].save(pdf_out, save_all=True, append_images=imgs[1:], resolution=200)


if __name__ == "__main__":
    build_digital(OUT / "ddr_digital.pdf")
    degrade(OUT / "ddr_digital.pdf", OUT / "ddr_scanned.pdf")
    print("wrote", OUT / "ddr_digital.pdf", "and", OUT / "ddr_scanned.pdf")
