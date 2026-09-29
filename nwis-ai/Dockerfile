# NWIS AI service (doc-worker): PDF parsing/OCR, extraction, risk engine, search -- see README.md.
# NOT buildable in the sandbox this was written in (no Docker daemon there); build/run on a normal
# machine with `docker compose up doc-worker`.
FROM python:3.11-slim

# libgl1/libglib2.0-0: needed by some OCR/image stacks (PaddleOCR's OpenCV dependency) even headless.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY requirements.txt .
# PaddleOCR is optional/preferred per README; Tesseract (installed above) is the container's
# built-in fallback so /parse works out of the box. Add `paddlepaddle paddleocr` here too if wanted.
RUN pip install --no-cache-dir -r requirements.txt pytesseract

COPY app/ app/
COPY scripts/ scripts/
COPY data/ data/

ENV NWIS_OCR=tesseract
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
