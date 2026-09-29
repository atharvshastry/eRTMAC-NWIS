/**
 * Team roster + engineer notes for a well. New routes (no teammate-backend equivalent existed).
 * Personnel is read-only (well_personnel.csv, generated once -- see its header comment in
 * store.js). Notes are the app's first write-capable data: POST appends to well_notes.csv on
 * disk via store.js's addNote(), so a note survives a server restart, not just this process.
 */
const { toRealId, activeRecord, ACTIVE_DEMO_ID } = require("../data/wellIdMap");
const { getStore } = require("../data/store");

function resolveRealId(wellId) {
  if (wellId === ACTIVE_DEMO_ID) return activeRecord().realId;
  return toRealId(wellId);
}

async function personnelRoutes(app) {
  // GET /api/wells/:wellId/personnel -- { crew: [...], keyOfficers: [...] }
  app.get("/api/wells/:wellId/personnel", async (request, reply) => {
    const { wellId } = request.params;
    const realId = resolveRealId(wellId);
    const store = getStore();
    if (!store.getWell(realId)) {
      return reply.code(404).send({ success: false, message: `Unknown well ${wellId}` });
    }
    const all = store.personnelFor(realId);
    return {
      wellId,
      realId,
      crew: all.filter((p) => !p.is_key_officer),
      keyOfficers: all.filter((p) => p.is_key_officer),
    };
  });

  // GET /api/wells/:wellId/notes -- [{ note_id, author, timestamp, text }], newest first
  app.get("/api/wells/:wellId/notes", async (request, reply) => {
    const { wellId } = request.params;
    const realId = resolveRealId(wellId);
    const store = getStore();
    if (!store.getWell(realId)) {
      return reply.code(404).send({ success: false, message: `Unknown well ${wellId}` });
    }
    return { wellId, realId, notes: store.notesFor(realId) };
  });

  // POST /api/wells/:wellId/notes -- body: { author?, text }
  app.post("/api/wells/:wellId/notes", async (request, reply) => {
    const { wellId } = request.params;
    const realId = resolveRealId(wellId);
    const store = getStore();
    if (!store.getWell(realId)) {
      return reply.code(404).send({ success: false, message: `Unknown well ${wellId}` });
    }
    const { author, text } = request.body || {};
    if (!text || !String(text).trim()) {
      return reply.code(422).send({ success: false, message: "Note text is required." });
    }
    if (String(text).length > 4000) {
      return reply.code(422).send({ success: false, message: "Note text is too long (max 4000 characters)." });
    }
    const note = store.addNote(realId, { author, text: String(text) });
    return reply.code(201).send({ success: true, note });
  });
}

module.exports = personnelRoutes;
