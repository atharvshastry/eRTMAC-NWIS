/**
 * Knowledge search + AI query, proxying the Python AI service's hybrid TF-IDF/exact-match
 * search (see app/search.py) and its optional Ollama-backed synthesized answer. Every result
 * cites its real source record (an operational_events row, or an extracted report excerpt) --
 * consistent with this project's rule of never inventing plausible-sounding source filenames:
 * where the frontend's mock data expects something like "DDR-DEMO-003.pdf", we cite the real
 * record instead ("event EVT-00123, well OIL-SYN-003").
 */
const { aiGet } = require("../config/aiService");
const { toDemoId, toRealId } = require("../data/wellIdMap");
const { eventTypeToTitle, eventTypeToEnum } = require("../data/eventLabels");

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// search.py's indexed hit text is built as "{event-type label}. {formation}. {description}.
// {mitigation}" (see nwis-ai/app/search.py's _event_text) so the formation name is baked into
// hit.text itself. The chatbot's fallback bullet also prints the formation separately
// ("@ 2069m, Girujan: ..."), which without this produced doubled-up text like
// "@ 2069m, Girujan: Stuck pipe. Girujan. Differential/pack-off tendency." Strip that one repeat.
function dedupeFormationMention(text, formation) {
  if (!text || !formation) return text;
  const esc = escapeRegExp(formation);
  return text.replace(new RegExp(`(^|\\.\\s+)${esc}\\.\\s+`), "$1").trim();
}

function hitToKnowledgeResult(hit) {
  return {
    id: `KNOW-${hit.source_type.toUpperCase()}-${hit.source_id}`,
    wellId: toDemoId(hit.well_id),
    documentName:
      hit.source_type === "event"
        ? `Operational event ${hit.source_id} — ${hit.well_name}`
        : `Report excerpt ${hit.source_id} — ${hit.well_name}`,
    documentType: hit.source_type === "event" ? "Incident Report" : "Drilling Report",
    formation: hit.formation,
    depth: hit.depth_m,
    event: hit.event_type ? eventTypeToTitle(hit.event_type) : null,
    severity: null,
    shortDescription: hit.text,
    historicalObservation: hit.text,
    historicalMitigation: null,
    sourceDocument: `${hit.source_type} ${hit.source_id} (well ${hit.well_id})`,
    nptHours: null,
    date: null,
    engineer: null,
    score: hit.score,
  };
}

async function searchRoutes(app) {
  app.get("/api/knowledge/search", async (request, reply) => {
    const { q, well, formation, eventType } = request.query;
    if (!q || !q.trim()) return [];
    try {
      const result = await aiGet("/search", {
        q,
        well_id: well ? toRealId(well) : undefined,
        formation,
        event_type: eventType ? eventTypeToEnum(eventType) : undefined,
        top_k: 20,
      });
      return result.hits.map(hitToKnowledgeResult);
    } catch (err) {
      return reply.code(502).send({ success: false, message: "Search service unreachable", detail: err.message });
    }
  });

  app.post("/api/ai/query", async (request, reply) => {
    const { prompt, wellId } = request.body || {};
    if (!prompt || !prompt.trim()) return reply.code(400).send({ success: false, message: "prompt is required" });
    try {
      // wellId lets the floating chatbot scope an answer to whichever well the person is
      // currently looking at (e.g. asked from the Well Intelligence page); toRealId()
      // converts the demo well id the frontend uses into the real well_id the Python
      // service's corpus is keyed on. Falls back to an unscoped search when omitted.
      const params = { q: prompt, top_k: 5 };
      if (wellId) {
        try {
          params.well_id = toRealId(wellId);
        } catch {
          // unknown wellId -- ignore the filter rather than failing the whole query
        }
      }
      // /search/answer always tries Ollama now, even with zero dataset hits (general-knowledge
      // fallback -- see app/search.py's answer()), giving it up to 35s before it degrades to
      // plain search results or a not-found note. Sized (see search.py's answer() for the full
      // measurement) to clear this machine's WORST case for a well-context answer -- a maximally
      // long one at the num_predict cap, ~29s of real decode+prefill work at this hardware's
      // measured ~4.4 tokens/sec -- not just a typical-case answer, so an unusually chatty response
      // doesn't needlessly fall back when it would have finished a few seconds later. Kept with
      // real margin under the frontend's own client timeout (aiApi.js) so a live demo never looks
      // hung -- a prior, longer timeout chain (45s/50s/55s) made the chat feel broken by making
      // people wait through a near-minute of silence before it gave up; this one is deliberately
      // tighter, with just enough margin over the measured worst case above it.
      const result = await aiGet("/search/answer", params, 36000);
      // When a real synthesized answer comes back, it's either grounded (the LLM was given every
      // retrieved hit and may cite any of them by number -- see search.py's _GROUNDED_SYSTEM_PROMPT)
      // or a general-knowledge answer with no dataset hits behind it (result.grounded === false).
      // Sources are only ever built from real hits, so an ungrounded answer naturally gets none --
      // the UI uses `grounded` to label the two cases honestly instead of implying every answer
      // traces back to an eRTMAC drilling record.
      if (result.answer) {
        const sources = (result.hits || []).map((h) => `${h.source_type} ${h.source_id} (well ${h.well_id})`);
        return { answer: result.answer, sources, grounded: !!result.grounded };
      }
      // No LLM synthesis: only the top 3 hits are actually shown in the bulleted answer below, so
      // "sources" must be built from that SAME slice -- previously it listed every retrieved hit
      // (up to top_k=5), which meant the widget showed sources for records the answer never
      // mentioned. Deduped defensively in case a well contributes more than one matching record.
      if (result.hits && result.hits.length) {
        const topHits = result.hits.slice(0, 3);
        const bullet = topHits
          .map((h) => `• ${h.well_name} (${h.well_id}) @ ${h.depth_m}m, ${h.formation || "formation n/a"}: ${dedupeFormationMention(h.text, h.formation)}`)
          .join("\n");
        const sources = [...new Set(topHits.map((h) => `${h.source_type} ${h.source_id} (well ${h.well_id})`))];
        return {
          answer: `${result.note ? `${result.note}\n\n` : ""}Closest matching records:\n${bullet}`,
          sources,
        };
      }
      return { answer: result.note || "No matching historical records found for this question.", sources: [] };
    } catch (err) {
      return reply.code(502).send({ success: false, message: "AI query service unreachable", detail: err.message });
    }
  });
}

module.exports = searchRoutes;
