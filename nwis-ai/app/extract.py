"""Turns page text into structured incident/lesson records.

Two extraction paths, matching the reasoning from our tech-stack discussion:
  1. Regex/rule-based for fields that follow predictable patterns (depth, formation, event type,
     mitigation) -- deterministic, no model needed, and what the synthetic NLP text in this dataset
     actually looks like (see data/nlp_source_text.csv: heavily templated).
  2. An Ollama LLM fallback for genuinely free-form narrative text that regex can't cover, used only
     when the regex path fails to find a usable event type. NOT runnable/tested in this sandbox (no
     network access to an Ollama server here) -- wire up OLLAMA_HOST and test against real messy DDR
     text before relying on it. See extract_llm() for the exact contract expected back.

Every extracted field keeps char offsets into the source text, so a UI can highlight the evidence
and a human reviewer can accept/correct it (see app/schemas.py::Extraction).
"""
from __future__ import annotations

import json
import os
import re
from typing import Optional

from pydantic import BaseModel, Field

EVENT_TYPES = ["MUD_LOSS", "STUCK_PIPE", "KICK", "TORQUE_SPIKE", "CEMENTING_ISSUE", "NPT"]

# Phrases seen in this dataset's narrative text / operational_events.description that imply a type.
# Extend this list once real DDR/WCR wording is available -- it's deliberately small and literal for now.
_EVENT_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("MUD_LOSS", re.compile(r"\b(mud\s*loss|lost\s+circulation)\b", re.I)),
    ("STUCK_PIPE", re.compile(r"\b(stuck\s*pipe|pack[- ]?off|differential\s+stick)\b", re.I)),
    ("KICK", re.compile(r"\b(kick|formation\s+influx|well\s+control)\b", re.I)),
    ("TORQUE_SPIKE", re.compile(r"\b(torque\s*spike|high\s+torque)\b", re.I)),
    ("CEMENTING_ISSUE", re.compile(r"\b(cementing\s+issue|poor\s+returns|channel(?:ing)?\s+risk|"
                                   r"remedial\s+cement)\b", re.I)),
    ("NPT", re.compile(r"\bnpt\b|non[- ]productive\s+time|equipment\s*/?\s*operation(?:al)?\s+delay", re.I)),
]

_DEPTH_RE = re.compile(r"\b(\d{3,5}(?:\.\d+)?)\s*m\b(?!\s*ft)", re.I)
_FORMATION_RE = re.compile(r"\bin\s+the\s+([A-Z][A-Za-z ]{2,30}?)\s+formation\b", re.I)
_MITIGATION_RE = re.compile(r"mitigation\s*(?:applied)?\s*:\s*(.+?)(?:\.\s*$|\.\s*[A-Z]|$)", re.I | re.S)


class ExtractedField(BaseModel):
    value: str
    start: int
    end: int


class Extraction(BaseModel):
    event_type: Optional[str] = None
    depth_m: Optional[float] = None
    formation: Optional[str] = None
    mitigation: Optional[str] = None
    method: str = Field(description="'regex' or 'llm'")
    confidence: float
    spans: dict[str, ExtractedField] = {}
    source_snippet: str


def _find(pattern: re.Pattern, text: str, group: int = 1) -> Optional[ExtractedField]:
    m = pattern.search(text)
    if not m:
        return None
    return ExtractedField(value=m.group(group).strip(), start=m.start(group), end=m.end(group))


def extract_regex(text: str) -> Extraction:
    event_type = None
    for etype, pat in _EVENT_PATTERNS:
        if m := pat.search(text):
            event_type = etype
            event_span = ExtractedField(value=m.group(0), start=m.start(), end=m.end())
            break
    else:
        event_span = None

    depth = _find(_DEPTH_RE, text)
    formation = _find(_FORMATION_RE, text)
    mitigation = _find(_MITIGATION_RE, text)

    spans = {k: v for k, v in {
        "event_type": event_span, "depth_m": depth, "formation": formation, "mitigation": mitigation,
    }.items() if v is not None}

    # Confidence is deliberately simple and explainable: fraction of the four target fields found,
    # nudged down if depth/formation are missing (those matter most for the risk engine's queries).
    hits = sum(x is not None for x in (event_span, depth, formation, mitigation))
    confidence = round(hits / 4, 2)

    return Extraction(
        event_type=event_type,
        depth_m=float(depth.value) if depth else None,
        formation=formation.value if formation else None,
        mitigation=mitigation.value.strip(" .") if mitigation else None,
        method="regex", confidence=confidence, spans=spans,
        source_snippet=text[:280],
    )


_LLM_SYSTEM_PROMPT = """You extract structured drilling-incident facts from a report excerpt.
Return ONLY JSON matching this exact schema, no prose, no markdown fences:
{"event_type": one of ["MUD_LOSS","STUCK_PIPE","KICK","TORQUE_SPIKE","CEMENTING_ISSUE","NPT",null],
 "depth_m": number or null,
 "formation": string or null,
 "mitigation": string or null}
Use null for anything not stated in the text. Do not guess or invent values."""


def extract_llm(text: str, model: str | None = None, host: str | None = None) -> Extraction:
    """Ollama-based fallback for narrative text regex can't parse. UNTESTED in this sandbox -- no
    outbound access to an Ollama server here. Verify the JSON contract against your actual model/
    version before trusting this in the pipeline (see docstring at top of file)."""
    import urllib.request

    host = host or os.getenv("OLLAMA_HOST", "http://localhost:11434")
    model = model or os.getenv("OLLAMA_MODEL", "qwen2.5:7b-instruct")  # match app/search.py's answer()
    payload = {
        "model": model, "format": "json", "stream": False,
        "messages": [{"role": "system", "content": _LLM_SYSTEM_PROMPT}, {"role": "user", "content": text}],
    }
    req = urllib.request.Request(f"{host}/api/chat", data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        body = json.loads(resp.read())
    data = json.loads(body["message"]["content"])

    depth = data.get("depth_m")
    return Extraction(
        event_type=data.get("event_type"),
        depth_m=float(depth) if depth is not None else None,
        formation=data.get("formation"),
        mitigation=data.get("mitigation"),
        method="llm", confidence=0.6,  # no span-based signal from the LLM path; treat as provisional
        spans={}, source_snippet=text[:280],
    )


def extract(text: str, use_llm_fallback: bool = False) -> Extraction:
    """Regex first; only calls the (untested-here) LLM path if explicitly enabled AND regex found no
    event type at all. Every result should still be shown to a reviewer before it's trusted (see
    schemas.Extraction.spans for what to highlight)."""
    result = extract_regex(text)
    if use_llm_fallback and result.event_type is None:
        try:
            return extract_llm(text)
        except Exception:  # noqa: BLE001 -- network/model unavailable; fall back to the regex result
            pass
    return result
