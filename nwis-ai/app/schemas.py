"""Contract for the doc-worker. The Node backend depends on this shape, so change it deliberately."""
from typing import Literal, Optional

from pydantic import BaseModel, Field

# A table is a list of rows; a row is a list of cell strings (None = empty cell).
Table = list[list[Optional[str]]]


class ParsedPage(BaseModel):
    page: int = Field(description="1-based page number")
    text: str
    tables: list[Table] = []
    ocr_used: bool = False
    confidence: Optional[float] = Field(
        default=None, description="Mean OCR confidence 0-1. None for pages with a real text layer."
    )
    warnings: list[str] = []


class ParseResponse(BaseModel):
    filename: str
    n_pages: int
    doc_type_guess: Literal["WCR", "DDR", "UNKNOWN"]
    doc_type_scores: dict[str, int]
    ocr_engine: Optional[str] = Field(default=None, description="Engine used for OCR pages, if any")
    pages: list[ParsedPage]
    warnings: list[str] = []
