/**
 * Real document processing: forwards an uploaded PDF to the Python AI service's /parse (real
 * PyMuPDF/pdfplumber text extraction + OCR fallback for scanned pages -- see app/parser.py),
 * then runs the extracted text through /extract (regex-based event/depth/formation/mitigation
 * extraction with char spans -- see app/extract.py) to build a genuine, evidence-based entity
 * breakdown, chunk by chunk, rather than a single whole-document call (extract() only returns
 * ONE event per call, so scanning the doc in pieces is what surfaces more than one incident).
 *
 * Honesty note: app/extract.py only ever returns event_type/depth_m/formation/mitigation --
 * it has no concept of "casing programs" or "drilling parameters" as a document-wide entity
 * schema. So WELL/DEPTH/FORMATION/OPERATIONAL_EVENTS/MITIGATION are built from real extracted
 * values; LOCATION/DRILLING_PARAMETERS/CASING_AND_CEMENTING/LESSONS_LEARNED are left as empty
 * arrays with a note explaining why, rather than inventing plausible-looking values for them.
 *
 * Non-PDF uploads (.docx/.png/.jpg/.jpeg): the Python service's /parse only accepts PDF bytes
 * (see app/main.py's `%PDF` magic-byte check) -- there's no parser for these in this build, so
 * they're stored as metadata-only with an honest note instead of a fabricated OCR result.
 */
const { aiPostFile, aiPost } = require("../config/aiService");
const { eventTypeToTitle } = require("../data/eventLabels");

const REAL_FORMATIONS = ["Barail", "Girujan", "Lakwa", "Nahorkatiya Sand", "Tipam"];
const WELL_ID_RE = /\bOIL-(?:SYN|DEMO)-(?:ACTIVE-)?\d+\b/i;
const MAX_CHUNKS = 24; // cap /extract calls per document so one huge PDF can't stall the upload

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function chunkText(text) {
  // Split on blank lines / numbered section headers -- a reasonable proxy for "one incident or
  // topic per chunk" against this dataset's report style (see mockDocuments.js's own samples).
  const parts = text
    .split(/\n\s*\n|\n(?=\d+\.\s)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 25); // skip near-empty fragments
  return parts.slice(0, MAX_CHUNKS);
}

function findWellId(text) {
  const m = text.match(WELL_ID_RE);
  return m ? m[0].toUpperCase() : null;
}

function findFormation(text) {
  for (const f of REAL_FORMATIONS) {
    if (new RegExp(`\\b${f}\\b`, "i").test(text)) return f;
  }
  return null;
}

async function extractEntities(fullText) {
  const chunks = chunkText(fullText);
  const extractions = [];
  for (const chunk of chunks) {
    try {
      const result = await aiPost("/extract", { text: chunk, use_llm_fallback: false });
      if (result.event_type || result.depth_m || result.formation || result.mitigation) {
        extractions.push(result);
      }
    } catch {
      // Extraction service hiccup on one chunk shouldn't fail the whole document.
    }
  }

  const events = extractions
    .filter((e) => e.event_type)
    .map((e, i) => ({
      label: eventTypeToTitle(e.event_type),
      value: e.source_snippet,
      confidence: Math.round(e.confidence * 100),
      source: `Extracted span, chunk ${i + 1} (${e.method})`,
    }));

  const depths = [...new Set(extractions.filter((e) => e.depth_m != null).map((e) => e.depth_m))].map((d) => ({
    label: "Depth mention",
    value: `${d} m`,
    confidence: null,
    source: "Regex depth match",
  }));

  const formations = [...new Set(extractions.filter((e) => e.formation).map((e) => e.formation))].map((f) => ({
    label: "Formation mention",
    value: f,
    confidence: null,
    source: "Regex formation match",
  }));

  const mitigations = extractions
    .filter((e) => e.mitigation)
    .map((e) => ({ label: "Mitigation", value: e.mitigation, confidence: Math.round(e.confidence * 100), source: `Extracted span (${e.method})` }));

  const wellId = findWellId(fullText);

  const totalEntities = events.length + depths.length + formations.length + mitigations.length + (wellId ? 1 : 0);
  const confidences = extractions.map((e) => e.confidence).filter((c) => c != null);
  const averageConfidence = confidences.length
    ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 1000) / 10
    : 0;

  return {
    totalEntities,
    averageConfidence,
    categories: {
      WELL: wellId ? [{ label: "Well ID", value: wellId, confidence: 95, source: "Regex match in document text" }] : [],
      DEPTH: depths,
      FORMATION: formations,
      OPERATIONAL_EVENTS: events,
      MITIGATION: mitigations,
      // Genuinely not extracted by app/extract.py's regex extractor in this build -- left empty
      // rather than fabricated. See app/extract.py's extract_llm() for the documented (but
      // untested-in-this-sandbox) upgrade path that could fill these in from freeform text.
      LOCATION: [],
      DRILLING_PARAMETERS: [],
      CASING_AND_CEMENTING: [],
      LESSONS_LEARNED: [],
    },
    note:
      extractions.length === 0
        ? "No event/depth/formation/mitigation patterns matched this document's text."
        : "LOCATION, DRILLING_PARAMETERS, CASING_AND_CEMENTING and LESSONS_LEARNED aren't produced by this build's regex extractor (app/extract.py) -- shown empty rather than invented.",
  };
}

/** Process an uploaded file buffer into a full document record (metadata + OCR text + entities). */
async function processUpload({ buffer, filename, sizeBytes }) {
  const extension = `.${filename.split(".").pop().toLowerCase()}`;
  const docType = extension.replace(".", "").toUpperCase();
  const id = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const uploadDate = new Date().toISOString().slice(0, 16).replace("T", " ");

  const base = {
    id,
    name: filename,
    type: docType,
    size: formatFileSize(sizeBytes),
    sizeBytes,
    uploadDate,
  };

  if (extension !== ".pdf") {
    return {
      ...base,
      pageCount: 1,
      status: "Uploaded",
      ocrStatus: "Uploaded",
      pipelineStage: 1,
      stageName: "Uploaded",
      progress: 25,
      wellId: null,
      formation: null,
      ocrQuality: { confidence: 0, pagesProcessed: 0, textBlocks: 0, tablesDetected: 0, warnings: 0 },
      ocrExtractedText: `${filename} was uploaded, but this build's AI service only parses PDFs (app/parser.py) -- ${extension} OCR isn't wired up. Showing file metadata only.`,
      entities: { totalEntities: 0, averageConfidence: 0, categories: {}, note: `${extension} files aren't parsed in this build.` },
      _buffer: buffer,
    };
  }

  try {
    const parsed = await aiPostFile(
      "/parse",
      buffer,
      filename,
      { ocr: "auto", tables: true },
      // The AI service now warms up its OCR engine at startup (see app/main.py's lifespan), so
      // this budget is normally not needed in full -- kept generous as a margin for a large
      // multi-page scan, or a request landing right as the service is still restarting.
      90000
    );
    const fullText = parsed.pages.map((p) => p.text).join("\n\n");
    const tablesDetected = parsed.pages.reduce((sum, p) => sum + (p.tables ? p.tables.length : 0), 0);
    const warnings = parsed.warnings.length + parsed.pages.reduce((sum, p) => sum + (p.warnings ? p.warnings.length : 0), 0);
    const ocrPages = parsed.pages.filter((p) => p.ocr_used);
    const ocrConfidences = ocrPages.map((p) => p.confidence).filter((c) => c != null);
    const confidencePct = ocrConfidences.length
      ? Math.round((ocrConfidences.reduce((a, b) => a + b, 0) / ocrConfidences.length) * 100)
      : parsed.pages.length
        ? 100 // real text layer, no OCR needed -- high confidence by construction
        : 0;

    const entities = await extractEntities(fullText || "");
    const wellId = entities.categories.WELL[0] ? entities.categories.WELL[0].value : null;
    const formation = entities.categories.FORMATION[0] ? entities.categories.FORMATION[0].value : findFormation(fullText || "");

    return {
      ...base,
      pageCount: parsed.n_pages,
      status: "Completed",
      ocrStatus: "Completed",
      pipelineStage: 4,
      stageName: "Ready for Analysis",
      progress: 100,
      wellId,
      formation,
      docTypeGuess: parsed.doc_type_guess,
      ocrEngine: parsed.ocr_engine,
      ocrQuality: {
        confidence: confidencePct,
        pagesProcessed: parsed.n_pages,
        textBlocks: fullText ? fullText.split(/\n\s*\n/).filter(Boolean).length : 0,
        tablesDetected,
        warnings,
      },
      ocrExtractedText: fullText || "(No extractable text found on any page.)",
      entities,
      _buffer: buffer,
    };
  } catch (err) {
    return {
      ...base,
      pageCount: 1,
      status: "Failed",
      ocrStatus: "Failed",
      pipelineStage: 1,
      stageName: "Uploaded",
      progress: 25,
      wellId: null,
      formation: null,
      ocrQuality: { confidence: 0, pagesProcessed: 0, textBlocks: 0, tablesDetected: 0, warnings: 1 },
      ocrExtractedText: `OCR/parsing failed: ${err.message}. Is the Python AI service running (uvicorn app.main:app --port 8001)?`,
      entities: { totalEntities: 0, averageConfidence: 0, categories: {}, note: err.message },
      _buffer: buffer,
    };
  }
}

module.exports = { processUpload, extractEntities };
